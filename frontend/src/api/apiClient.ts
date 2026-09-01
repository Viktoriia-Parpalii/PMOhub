import { notify } from "../components/ui/ToastNotifications";
import {
  ReferenceDataState,
  InitiativeYearReadModel,
  InitiativeViewModel,
  QuarterCardReadModel,
  User,
} from "../shared/types";
import type {
  AnalyticsDrilldownResponse,
  AnalyticsMode,
  AnalyticsResponse,
} from "../features/analytics/analyticsTypes";
import { SYSTEM_MESSAGES } from "../shared/constants/systemMessages";
import {
  NOTIFICATION_KINDS,
  NOTIFICATION_MESSAGES,
} from "../shared/constants/notificationConstants";

const configuredBase = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
export const backendEnabled = true;
const baseUrl = configuredBase ?? "http://localhost:4000/api/v1";

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

let refreshPromise: Promise<SessionResponse> | null = null;
let authFailureHandler: (() => void) | null = null;
export const setAuthFailureHandler = (handler: (() => void) | null) => {
  authFailureHandler = handler;
};

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

type RequestOptions = RequestInit & { retryAuth?: boolean; notify?: boolean };
const apiMessage = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    const messages = value.filter(
      (item): item is string =>
        typeof item === "string" && Boolean(item.trim()),
    );
    if (messages.length) return messages.join(". ");
  }
  return fallback;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (
    response.status === 401 &&
    options.retryAuth !== false &&
    path !== "/auth/refresh"
  ) {
    try {
      await refreshSession();
      return apiRequest<T>(path, { ...options, retryAuth: false });
    } catch {
      setAccessToken(null);
      authFailureHandler?.();
    }
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new ApiError(
      body.code ?? "HTTP_ERROR",
      apiMessage(body.message, SYSTEM_MESSAGES.api.genericError),
      response.status,
      body.details,
    );
    if (options.notify) notify(NOTIFICATION_KINDS.error, error.message);
    throw error;
  }
  if (options.notify)
    notify(
      NOTIFICATION_KINDS.success,
      body.message ?? NOTIFICATION_MESSAGES.changesSaved,
    );
  return body as T;
}

export interface DownloadedFile {
  blob: Blob;
  filename: string;
}

const filenameFromDisposition = (header: string | null, fallback: string) => {
  if (!header) return fallback;
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return fallback;
    }
  }
  return header.match(/filename="?([^";]+)"?/i)?.[1] ?? fallback;
};

/** Binary counterpart of apiRequest with the same single-flight auth refresh. */
export async function apiDownload(
  path: string,
  body: unknown,
  fallbackFilename: string,
  signal?: AbortSignal,
  retryAuth = true,
): Promise<DownloadedFile> {
  const headers = new Headers({ "content-type": "application/json" });
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers,
    credentials: "include",
    signal,
  });
  if (response.status === 401 && retryAuth) {
    try {
      await refreshSession();
      return apiDownload(path, body, fallbackFilename, signal, false);
    } catch {
      setAccessToken(null);
      authFailureHandler?.();
    }
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new ApiError(
      payload.code ?? "HTTP_ERROR",
      apiMessage(payload.message, SYSTEM_MESSAGES.api.genericError),
      response.status,
      payload.details,
    );
  }
  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(
      response.headers.get("content-disposition"),
      fallbackFilename,
    ),
  };
}

export interface SessionResponse {
  access_token: string;
  expires_in: number;
  user: User;
}
type WireUser = Omit<User, "departmentId"> & {
  department_id?: string;
  is_active?: boolean;
};
type BootstrapResponse = Omit<
  ReferenceDataState,
  "projects" | "tasks" | "users" | "currentUser"
> & {
  currentUser: WireUser;
};
export async function loginSession(email: string, password: string) {
  const session = await apiRequest<SessionResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    retryAuth: false,
  });
  setAccessToken(session.access_token);
  return session;
}
export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = apiRequest<SessionResponse>("/auth/refresh", {
      method: "POST",
      retryAuth: false,
    })
      .then((session) => {
        setAccessToken(session.access_token);
        return session;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}
export async function logoutSession() {
  // The UI must become unauthenticated immediately; the cookie revocation is
  // a best-effort server cleanup and must never hold the login screen hostage.
  setAccessToken(null);
  try {
    await apiRequest("/auth/logout", { method: "POST", retryAuth: false });
  } finally {
    /* access token was cleared synchronously above */
  }
}
export const changePassword = (
  current_password: string | undefined,
  new_password: string,
) =>
  apiRequest<SessionResponse>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      ...(current_password ? { current_password } : {}),
      new_password,
    }),
    notify: false,
  }).then((session) => {
    setAccessToken(session.access_token);
    return session;
  });

export async function loadBootstrap(signal?: AbortSignal) {
  const bootstrap = await apiRequest<ApiResponse<BootstrapResponse>>(
    "/bootstrap",
    { signal },
  );
  const normalizeUser = (user: WireUser): User => ({
    ...user,
    departmentId: user.department_id,
  });
  return {
    ...bootstrap.data!,
    currentUser: normalizeUser(bootstrap.data!.currentUser),
    users: [],
  };
}
export const loadUsers = (signal?: AbortSignal) =>
  apiRequest<ApiResponse<WireUser[]>>("/users", { signal }).then((response) =>
    response.data
      .filter((user) => user.is_active !== false)
      .map((user) => ({ ...user, departmentId: user.department_id })),
  );
export const loadPermissions = (signal?: AbortSignal) =>
  apiRequest<ApiResponse<ReferenceDataState["rolePermissions"]>>(
    "/role-permissions",
    { signal },
  ).then((response) => response.data);
const wireKind = (kind: "project" | "task") =>
  kind === "project" ? "PROJECT" : "OPERATIONAL_TASK";
export const loadInitiativeYears = (
  kind: "project" | "task",
  signal?: AbortSignal,
  year?: number,
) =>
  apiRequest<ApiResponse<InitiativeYearReadModel[]>>(
    `/initiative-years?kind=${wireKind(kind)}${year ? `&year=${year}` : ""}`,
    { signal },
  ).then((response) => response.data);
export const loadInitiativeYearCounts = (year: number, signal?: AbortSignal) =>
  apiRequest<ApiResponse<{ projects: number; operational_tasks: number }>>(
    `/initiative-years/counts?year=${year}`,
    { signal },
  ).then((response) => response.data);
export const loadQuarterCards = (
  kind: "project" | "task",
  signal?: AbortSignal,
  year?: number,
  quarter?: string,
) =>
  apiRequest<ApiResponse<QuarterCardReadModel[]>>(
    `/quarter-cards?kind=${wireKind(kind)}${year ? `&year=${year}` : ""}${quarter ? `&quarter=${quarter}` : ""}`,
    { signal },
  ).then((response) => response.data);
export const loadAnalytics = (
  mode: AnalyticsMode,
  params: URLSearchParams,
  signal?: AbortSignal,
) =>
  apiRequest<ApiResponse<AnalyticsResponse>>(
    `/analytics/${mode}/summary?${params.toString()}`,
    { signal },
  ).then((response) => response.data);
export const loadAnalyticsDrilldown = (
  params: URLSearchParams,
  signal?: AbortSignal,
) =>
  apiRequest<ApiResponse<AnalyticsDrilldownResponse>>(
    `/analytics/drilldown?${params.toString()}`,
    { signal },
  ).then((response) => response.data);

export const toInitiativeYearViewModel = (
  year: InitiativeYearReadModel,
): InitiativeViewModel => ({
  id: year.id,
  initiative_id: year.initiative_id,
  revision: year.revision,
  initiative_revision: year.initiative_revision,
  name: year.name,
  strategic_goal: year.strategic_goal ?? undefined,
  manager_id: year.preparation?.manager_id ?? undefined,
  priority: year.preparation?.priority_id ?? undefined,
  implementer_dept_ids: [],
  cross_functional_dept_ids: year.preparation?.department_ids ?? [],
  year: year.year,
  quarter: "Q1",
  health_status: "DEFAULT",
  health_status_code: "DEFAULT",
  checklist: [],
  record_type: "YEAR",
  history: [],
  preparation_stage: {
    revision: year.preparation?.revision,
    manager_id: year.preparation?.manager_id ?? undefined,
    priority: year.preparation?.priority_id ?? undefined,
    cross_functional_dept_ids: year.preparation?.department_ids ?? [],
    history: [],
  },
});

export const toQuarterCardViewModel = (
  card: QuarterCardReadModel,
): InitiativeViewModel => ({
  id: card.id,
  initiative_id: card.initiative_id,
  initiative_year_id: card.initiative_year_id,
  revision: card.revision,
  name: card.name,
  strategic_goal: card.strategic_goal ?? undefined,
  manager_id: card.manager_id ?? undefined,
  priority: card.priority_id ?? undefined,
  notes: card.notes ?? undefined,
  implementer_dept_ids: [],
  cross_functional_dept_ids: card.effective_involved_department_ids,
  custom_fields: card.custom_fields,
  year: card.year,
  quarter: card.quarter,
  health_status: card.status_id,
  health_status_id: card.status_id,
  health_status_code: card.status_code,
  checklist: card.scope.map((item) => ({
    id: item.id,
    revision: item.revision,
    text: item.text,
    is_completed: item.status_code === "GREEN",
    color: item.status_code,
    status_code: item.status_code,
    weightId: item.weight_definition_id ?? undefined,
    weightSnapshot: {
      definitionId: item.weight_definition_id ?? undefined,
      name: item.weight_snapshot.name,
      value: item.weight_snapshot.value,
    },
    implementer_dept_ids: item.executor_department_ids,
  })),
  record_type: "CARD",
  moved_from: card.moved_from
    ? `${card.moved_from.quarter} ${card.moved_from.year}`
    : undefined,
  history: [],
  sizeSnapshot: {
    definitionId: card.size_snapshot.definition_id ?? undefined,
    name: card.size_snapshot.name,
    totalWeight: card.total_weight,
  },
  is_locked: card.is_locked,
  locked_at: card.locked_at,
});

export const command = <T = ApiResponse<unknown>>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
) =>
  apiRequest<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    notify: false,
  });

export type ApiResponse<T = undefined> = {
  success: true;
  message?: string;
  data: T;
};

export const loadInitiativeCardModel = (id: string, signal?: AbortSignal) =>
  apiRequest<ApiResponse<QuarterCardReadModel>>(`/quarter-cards/${id}`, {
    signal,
  });
export const loadInitiativeYearModel = (id: string, signal?: AbortSignal) =>
  apiRequest<ApiResponse<InitiativeYearReadModel>>(`/initiative-years/${id}`, {
    signal,
  });
