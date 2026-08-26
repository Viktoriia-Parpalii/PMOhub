import { notify } from "../components/ui/ToastNotifications";
import { AppDataState, FullExportData, OperationalTask, Project, User } from "../shared/types";

const configuredBase = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
export const backendEnabled = true;
const baseUrl = configuredBase ?? "http://localhost:4000/api/v1";

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

let refreshPromise: Promise<SessionResponse> | null = null;
let authFailureHandler: (() => void) | null = null;
export const setAuthFailureHandler = (handler: (() => void) | null) => { authFailureHandler = handler; };

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
      body.message ?? "Помилка API",
      response.status,
      body.details,
    );
    if (options.notify) notify("error", error.message);
    throw error;
  }
  if (options.notify)
    notify("success", body.message ?? "Зміни успішно збережено");
  return body as T;
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
type BootstrapResponse = Omit<AppDataState, "projects" | "tasks" | "users" | "currentUser"> & {
  users: WireUser[];
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
  try {
    await apiRequest("/auth/logout", { method: "POST", retryAuth: false });
  } finally {
    setAccessToken(null);
  }
}
export const changePassword = (
  current_password: string,
  new_password: string,
) =>
  apiRequest("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
    notify: false,
  });

export async function loadBootstrap(signal?: AbortSignal) {
  const bootstrap = await apiRequest<ApiResponse<BootstrapResponse>>("/bootstrap", { signal });
  const normalizeUser = (user: WireUser): User => ({
    ...user,
    departmentId: user.department_id,
  });
  return {
    ...bootstrap.data!,
    currentUser: normalizeUser(bootstrap.data!.currentUser),
    users: bootstrap.data!.users.filter((user) => user.is_active !== false).map(normalizeUser),
  };
}
export const loadInitiatives = <T extends Project | OperationalTask>(kind: "project" | "task", signal?: AbortSignal) =>
  apiRequest<{ data: T[] }>(`/initiatives?kind=${kind}`, { signal }).then((response) => response.data);
export async function loadAppData(signal?: AbortSignal) {
  const [bootstrap, projects, tasks] = await Promise.all([loadBootstrap(signal), loadInitiatives<Project>("project", signal), loadInitiatives<OperationalTask>("task", signal)]);
  return { ...bootstrap, projects, tasks };
}

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
  success: boolean;
  message?: string;
  data?: T;
};

export type InitiativeRecord = Project | OperationalTask;
export const loadInitiativeCard = (id: string, signal?: AbortSignal) =>
  apiRequest<ApiResponse<InitiativeRecord>>(`/initiatives/cards/${id}`, { signal });
export const loadInitiativeYear = (id: string, signal?: AbortSignal) =>
  apiRequest<ApiResponse<InitiativeRecord>>(`/initiatives/years/${id}`, { signal });

export const exportBackup = () => apiRequest<FullExportData>("/backups/export");
export const validateBackup = (body: unknown, mode: "merge" | "replace" = "merge") =>
  command<ApiResponse<{ validation_token: string }>>(`/backups/validate?mode=${mode}`, "POST", body);
export const importBackup = (body: unknown, mode: "merge" | "replace", validationToken: string) =>
  command<ApiResponse<{ projects: number; tasks: number }>>(
    `/backups/import?mode=${mode}`,
    "POST",
    { backup: body, validation_token: validationToken },
  );
