import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ReferenceDataState,
  CustomFieldDef,
  Department,
  InitiativeMetadata,
  InitiativeYearReadModel,
  QuarterCardReadModel,
  InitiativeSizeDef,
  InitiativeStatusDef,
  InitiativeViewModel,
  Manager,
  MutationResult,
  PriorityDef,
  Quarter,
  RolePermissions,
  TaskWeightDef,
  User,
} from "../../shared/types";
import {
  ApiError,
  changePassword as changeApiPassword,
  loadBootstrap,
  loadInitiativeCardModel,
  loadPermissions,
  loadQuarterCards,
  loadUsers,
  loginSession,
  logoutSession,
  refreshSession,
  setAuthFailureHandler,
  toInitiativeYearViewModel,
  toInitiativeYearCardViewModels,
  toQuarterCardViewModel,
} from "../../api/apiClient";
import { queryKeys } from "../../api/queryClient";
import { invalidateInitiativeCaches } from "../../api/cacheInvalidation";
import {
  useBootstrapQuery,
  useInitiativeYearsQuery,
  usePermissionsQuery,
  useQuarterCardsQuery,
  useUsersQuery,
} from "../../api/hooks";
import {
  getChainId,
  getYearSnapshot,
  preparationMetadataFrom,
} from "../../domain/initiatives";
import { getPermissions } from "../../domain/permissions";
import { executeBackendMutation } from "./backend-mutation";
import {
  dictionaryApiType,
  dictionaryPayload,
  DictionaryItem,
  DictionaryStateKey,
} from "./dictionary-api";
import { fail, ok } from "./helpers";
import { serverCommands } from "./server-commands";
import { activeReferenceId, uuidOrUndefined } from "./api-contract-mappers";
import { SYSTEM_MESSAGES } from "../../shared/constants/systemMessages";
import { notify } from "../../components/ui/ToastNotifications";
import { NOTIFICATION_KINDS } from "../../shared/constants/notificationConstants";
import { getCurrentPeriod, isPeriodLocked } from "../../shared/utils";

type Initiative = InitiativeViewModel;
type InitiativeKind = "project" | "task";
export type InitiativeDataScope =
  | { mode: "dashboard" }
  | { mode: "none" }
  | { mode: "projects" | "tasks"; year: number; quarter: Quarter }
  | { mode: "backlog"; kind: InitiativeKind; year: number };

const initialDataScope = (): InitiativeDataScope => {
  const tab =
    typeof window === "undefined"
      ? "dashboard"
      : window.sessionStorage.getItem("pmohub-active-tab");
  const now = new Date();
  const year = now.getFullYear();
  const quarter = `Q${Math.floor(now.getMonth() / 3) + 1}` as Quarter;
  if (tab === "projects" || tab === "tasks")
    return { mode: tab, year, quarter };
  if (tab === "backlog") return { mode: "backlog", kind: "project", year };
  if (tab === "admin") return { mode: "none" };
  return { mode: "dashboard" };
};

export interface AppContextType extends ReferenceDataState {
  isHydrating: boolean;
  backendEnabled: true;
  enableAdminData: () => void;
  disableAdminData: () => void;
  setInitiativeDataScope: (scope: InitiativeDataScope) => void;
  authenticate: (email: string, password: string) => Promise<MutationResult>;
  changePassword: (
    currentPassword: string | undefined,
    newPassword: string,
  ) => Promise<MutationResult>;
  login: (user: User) => MutationResult;
  logout: () => void;
  addUser: (
    user: User,
  ) => Promise<MutationResult<{ temporary_password: string }>>;
  updateUser: (id: string, patch: Partial<User>) => Promise<MutationResult>;
  deleteUser: (id: string) => Promise<MutationResult>;
  resetUserPassword: (
    id: string,
  ) => Promise<MutationResult<{ temporary_password: string }>>;
  addProject: (item: InitiativeViewModel) => Promise<MutationResult>;
  updateProject: (
    id: string,
    patch: Partial<InitiativeViewModel>,
  ) => Promise<MutationResult>;
  deleteProject: (id: string) => Promise<MutationResult>;
  addTask: (item: InitiativeViewModel) => Promise<MutationResult>;
  updateTask: (
    id: string,
    patch: Partial<InitiativeViewModel>,
  ) => Promise<MutationResult>;
  deleteTask: (id: string) => Promise<MutationResult>;
  moveCard: (
    cardId: string,
    toYear: number,
    toQuarter: Quarter,
    isProject: boolean,
  ) => Promise<MutationResult>;
  continueCard: (
    cardId: string,
    toYear: number,
    toQuarter: Quarter,
    isProject: boolean,
  ) => Promise<MutationResult>;
  moveScopeItem: (
    cardId: string,
    itemId: string,
    toYear: number,
    toQuarter: Quarter,
    isProject: boolean,
  ) => Promise<MutationResult>;
  copyScopeItem: (
    cardId: string,
    itemId: string,
    toYear: number,
    toQuarter: Quarter,
    isProject: boolean,
  ) => Promise<MutationResult>;
  createBacklogSnapshot: (
    kind: InitiativeKind,
    masterId: string,
    sourceYear: number,
    targetYear: number,
  ) => Promise<MutationResult>;
  createBacklogSnapshots: (
    kind: InitiativeKind,
    masterIds: string[],
    sourceYear: number,
    targetYear: number,
  ) => Promise<MutationResult<{ created: number }>>;
  createBacklogWithCards: (
    kind: InitiativeKind,
    master: InitiativeViewModel,
    quarters: Quarter[],
    initialScope?: InitiativeViewModel["checklist"],
  ) => Promise<MutationResult>;
  updatePreparationStage: (
    kind: InitiativeKind,
    masterId: string,
    patch: Partial<InitiativeMetadata>,
  ) => Promise<MutationResult>;
  addPriority: (item: PriorityDef) => Promise<MutationResult>;
  updatePriority: (
    id: string,
    patch: Partial<PriorityDef>,
  ) => Promise<MutationResult>;
  deletePriority: (id: string) => Promise<MutationResult>;
  addInitiativeStatus: (item: InitiativeStatusDef) => Promise<MutationResult>;
  updateInitiativeStatus: (
    id: string,
    patch: Partial<InitiativeStatusDef>,
  ) => Promise<MutationResult>;
  deleteInitiativeStatus: (id: string) => Promise<MutationResult>;
  addTaskWeight: (item: TaskWeightDef) => Promise<MutationResult>;
  updateTaskWeight: (
    id: string,
    patch: Partial<TaskWeightDef>,
  ) => Promise<MutationResult>;
  deleteTaskWeight: (id: string) => Promise<MutationResult>;
  addInitiativeSize: (item: InitiativeSizeDef) => Promise<MutationResult>;
  updateInitiativeSize: (
    id: string,
    patch: Partial<InitiativeSizeDef>,
  ) => Promise<MutationResult>;
  deleteInitiativeSize: (id: string) => Promise<MutationResult>;
  addDepartment: (item: Department) => Promise<MutationResult>;
  updateDepartment: (
    id: string,
    patch: Partial<Department>,
  ) => Promise<MutationResult>;
  deleteDepartment: (id: string) => Promise<MutationResult>;
  addManager: (item: Manager) => Promise<MutationResult>;
  updateManager: (
    id: string,
    patch: Partial<Manager>,
  ) => Promise<MutationResult>;
  deleteManager: (id: string) => Promise<MutationResult>;
  checkDepartmentDeletion: (id: string) => MutationResult;
  checkManagerDeletion: (id: string) => MutationResult;
  checkPriorityDeletion: (id: string) => MutationResult;
  checkInitiativeStatusDeletion: (id: string) => MutationResult;
  updateRolePermission: (
    role: string,
    patch: Partial<RolePermissions>,
  ) => Promise<MutationResult>;
  applyTaskWeightToOpenCards: (
    id: string,
  ) => Promise<MutationResult<{ cards: number; tasks: number }>>;
  refreshOpenInitiativeSizes: () => Promise<MutationResult<{ cards: number }>>;
  addCustomField: (item: CustomFieldDef) => Promise<MutationResult>;
  updateCustomField: (
    id: string,
    patch: Partial<CustomFieldDef>,
  ) => Promise<MutationResult>;
  deleteCustomField: (id: string) => Promise<MutationResult>;
}

type CommandResponse<T = undefined> = {
  success?: boolean;
  message?: string;
  data?: T;
};
const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [sessionReady, setSessionReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [adminDataEnabled, setAdminDataEnabled] = useState(false);
  const enableAdminData = useCallback(() => setAdminDataEnabled(true), []);
  const disableAdminData = useCallback(() => setAdminDataEnabled(false), []);
  const [dataScope, setInitiativeDataScope] =
    useState<InitiativeDataScope>(initialDataScope);
  const [businessScopeReady, setBusinessScopeReady] = useState(false);
  const bootstrapQuery = useBootstrapQuery(
    authenticated && !sessionUser?.must_change_password,
  );
  useEffect(() => {
    const period = bootstrapQuery.data?.businessPeriod;
    if (!authenticated || !period) {
      setBusinessScopeReady(false);
      return;
    }
    if (businessScopeReady) return;
    setInitiativeDataScope((scope) => {
      if (scope.mode === "projects" || scope.mode === "tasks")
        return { ...scope, year: period.year, quarter: period.quarter };
      if (scope.mode === "backlog") return { ...scope, year: period.year };
      return scope;
    });
    setBusinessScopeReady(true);
  }, [authenticated, bootstrapQuery.data?.businessPeriod, businessScopeReady]);
  const projectMode = dataScope.mode === "projects";
  const taskMode = dataScope.mode === "tasks";
  const projectBacklogMode =
    dataScope.mode === "backlog" && dataScope.kind === "project";
  const taskBacklogMode =
    dataScope.mode === "backlog" && dataScope.kind === "task";
  const projectYear =
    projectMode || projectBacklogMode ? dataScope.year : undefined;
  const taskYear = taskMode || taskBacklogMode ? dataScope.year : undefined;
  const projectQuarter = projectMode ? dataScope.quarter : undefined;
  const taskQuarter = taskMode ? dataScope.quarter : undefined;
  const projectYearsQuery = useInitiativeYearsQuery(
    "project",
    authenticated && businessScopeReady && projectBacklogMode,
    projectYear,
  );
  const taskYearsQuery = useInitiativeYearsQuery(
    "task",
    authenticated && businessScopeReady && taskBacklogMode,
    taskYear,
  );
  const projectNextYearsQuery = useInitiativeYearsQuery(
    "project",
    authenticated && businessScopeReady && projectBacklogMode,
    projectBacklogMode ? dataScope.year + 1 : undefined,
  );
  const taskNextYearsQuery = useInitiativeYearsQuery(
    "task",
    authenticated && businessScopeReady && taskBacklogMode,
    taskBacklogMode ? dataScope.year + 1 : undefined,
  );
  const projectCardsQuery = useQuarterCardsQuery(
    "project",
    authenticated && businessScopeReady && projectMode,
    projectYear,
    projectQuarter,
  );
  const taskCardsQuery = useQuarterCardsQuery(
    "task",
    authenticated && businessScopeReady && taskMode,
    taskYear,
    taskQuarter,
  );
  const usersQuery = useUsersQuery(authenticated && adminDataEnabled);
  const permissionsQuery = usePermissionsQuery(
    authenticated && adminDataEnabled,
  );
  const refreshBootstrap = useCallback(async () => {
    await queryClient.fetchQuery({
      queryKey: queryKeys.bootstrap,
      queryFn: ({ signal }) => loadBootstrap(signal),
      staleTime: 0,
    });
  }, [queryClient]);
  const refreshKind = useCallback(
    async (kind: InitiativeKind) => {
      await invalidateInitiativeCaches(queryClient, kind);
    },
    [queryClient],
  );
  const refreshAllInitiatives = useCallback(async () => {
    await Promise.all([refreshKind("project"), refreshKind("task")]);
  }, [refreshKind]);
  const refreshInitialData = useCallback(async () => {
    // Feature queries are enabled only after bootstrap supplies the canonical
    // business period, so an incorrect browser clock cannot start stale-period
    // requests during session restoration.
    await refreshBootstrap();
  }, [refreshBootstrap]);
  const refreshUsers = useCallback(async () => {
    if (!adminDataEnabled) return;
    await queryClient.fetchQuery({
      queryKey: queryKeys.users,
      queryFn: ({ signal }) => loadUsers(signal),
      staleTime: 0,
    });
  }, [adminDataEnabled, queryClient]);
  const refreshPermissions = useCallback(async () => {
    if (adminDataEnabled) {
      await queryClient.fetchQuery({
        queryKey: queryKeys.permissions,
        queryFn: ({ signal }) => loadPermissions(signal),
        staleTime: 0,
      });
    }
    await refreshBootstrap();
  }, [adminDataEnabled, queryClient, refreshBootstrap]);
  const executeRemote = useCallback(
    <T,>(
      request: () => Promise<CommandResponse<T>>,
      refresh: () => Promise<void> = refreshInitialData,
    ) => executeBackendMutation<T>(request, refresh),
    [refreshInitialData],
  );

  useEffect(() => {
    setAuthFailureHandler(() => {
      setAuthenticated(false);
      setSessionUser(null);
      queryClient.clear();
    });
    refreshSession()
      .then(async (session) => {
        setSessionUser(session.user);
        setAuthenticated(true);
        if (!session.user.must_change_password) await refreshInitialData();
      })
      .catch(() => setAuthenticated(false))
      .finally(() => setSessionReady(true));
    return () => setAuthFailureHandler(null);
    // Session restoration runs once. Feature scope changes are handled by the
    // enabled TanStack Query hooks and must never trigger another refresh login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const bootstrap = authenticated
    ? (bootstrapQuery.data ??
      queryClient.getQueryData<Partial<ReferenceDataState>>(
        queryKeys.bootstrap,
      ))
    : undefined;
  const state: ReferenceDataState = {
    businessPeriod: bootstrap?.businessPeriod ?? {
      ...getCurrentPeriod(),
      business_date: new Date().toISOString().slice(0, 10),
      time_zone: "Europe/Kyiv",
    },
    departments: bootstrap?.departments ?? [],
    priorities: bootstrap?.priorities ?? [],
    initiativeStatuses: bootstrap?.initiativeStatuses ?? [],
    taskWeights: bootstrap?.taskWeights ?? [],
    initiativeSizes: bootstrap?.initiativeSizes ?? [],
    managers: bootstrap?.managers ?? [],
    users: usersQuery.data ?? [],
    rolePermissions: permissionsQuery.data ?? bootstrap?.rolePermissions ?? [],
    customFields: bootstrap?.customFields ?? [],
    currentUser: bootstrap?.currentUser ?? sessionUser,
    projects: [
      ...(projectYearsQuery.data ?? []).map(toInitiativeYearViewModel),
      ...(projectBacklogMode
        ? (projectNextYearsQuery.data ?? []).map(toInitiativeYearViewModel)
        : []),
      ...(projectMode
        ? (projectCardsQuery.data ?? []).map(toQuarterCardViewModel)
        : [
            ...(projectYearsQuery.data ?? []),
            ...(projectBacklogMode ? (projectNextYearsQuery.data ?? []) : []),
          ].flatMap(toInitiativeYearCardViewModels)),
    ],
    tasks: [
      ...(taskYearsQuery.data ?? []).map(toInitiativeYearViewModel),
      ...(taskBacklogMode
        ? (taskNextYearsQuery.data ?? []).map(toInitiativeYearViewModel)
        : []),
      ...(taskMode
        ? (taskCardsQuery.data ?? []).map(toQuarterCardViewModel)
        : [
            ...(taskYearsQuery.data ?? []),
            ...(taskBacklogMode ? (taskNextYearsQuery.data ?? []) : []),
          ].flatMap(toInitiativeYearCardViewModels)),
    ],
  };
  const recordsFor = (kind: InitiativeKind): Initiative[] =>
    kind === "project" ? state.projects : state.tasks;
  const wireKind = (kind: InitiativeKind) =>
    kind === "project" ? ("PROJECT" as const) : ("OPERATIONAL_TASK" as const);
  const createBody = (kind: InitiativeKind, raw: Initiative) => ({
    kind: wireKind(kind),
    name: raw.name.trim(),
    year: raw.year,
    strategic_goal: raw.strategic_goal,
    preparation: {
      manager_id: uuidOrUndefined(raw.manager_id),
      priority_id: uuidOrUndefined(raw.priority),
      department_ids: raw.cross_functional_dept_ids.filter((id) =>
        uuidOrUndefined(id),
      ),
    },
  });
  const activeWeightId = (
    item: Initiative["checklist"][number],
    fallbackWeightId?: string,
  ) => {
    const selectedId = item.weightId ?? item.weightSnapshot?.definitionId;
    return (
      activeReferenceId(selectedId, state.taskWeights, fallbackWeightId) ?? ""
    );
  };
  const initialCardBody = (record: Initiative) => {
    const statusId = healthStatusId(record.health_status, record);
    const fallbackWeightId = state.taskWeights.find(
      (weight) => weight.is_active && weight.is_default,
    )?.id;
    const scope = record.checklist.map((item) => ({
      text: item.text,
      status_code: (item.color === "GRAY"
        ? "DEFAULT"
        : (item.color ?? (item.is_completed ? "GREEN" : "DEFAULT"))) as
        | "DEFAULT"
        | "GREEN"
        | "YELLOW"
        | "RED",
      weight_definition_id: activeWeightId(item, fallbackWeightId),
      executor_department_ids: (item.implementer_dept_ids ?? []).filter((id) =>
        uuidOrUndefined(id),
      ),
    }));
    if (!statusId || scope.some((item) => !item.weight_definition_id))
      return null;
    return {
      quarter: record.quarter,
      manager_id: uuidOrUndefined(record.manager_id),
      priority_id: uuidOrUndefined(record.priority),
      department_ids: record.cross_functional_dept_ids.filter((id) =>
        uuidOrUndefined(id),
      ),
      status_id: statusId,
      notes: record.notes,
      custom_fields: record.custom_fields ?? {},
      scope,
    };
  };
  const cardBody = (record: Initiative, revision = record.revision) => {
    const statusId = healthStatusId(record.health_status, record);
    if (!revision || !statusId) return null;
    const fallbackWeightId = state.taskWeights.find(
      (weight) => weight.is_active && weight.is_default,
    )?.id;
    const scope = record.checklist.map((item) => ({
      ...(uuidOrUndefined(item.id) ? { id: uuidOrUndefined(item.id) } : {}),
      ...(uuidOrUndefined(item.id) && item.revision
        ? { revision: item.revision }
        : {}),
      text: item.text,
      status_code: (item.color === "GRAY"
        ? "DEFAULT"
        : (item.color ?? (item.is_completed ? "GREEN" : "DEFAULT"))) as
        | "DEFAULT"
        | "GREEN"
        | "YELLOW"
        | "RED",
      weight_definition_id: activeWeightId(item, fallbackWeightId),
      executor_department_ids: (item.implementer_dept_ids ?? []).filter((id) =>
        uuidOrUndefined(id),
      ),
    }));
    return {
      revision,
      manager_id: uuidOrUndefined(record.manager_id),
      priority_id: uuidOrUndefined(record.priority),
      department_ids: record.cross_functional_dept_ids.filter((id) =>
        uuidOrUndefined(id),
      ),
      status_id: statusId,
      notes: record.notes,
      custom_fields: record.custom_fields ?? {},
      scope,
    };
  };
  const healthStatusId = (value: string | undefined, record?: Initiative) =>
    uuidOrUndefined(value) ??
    state.initiativeStatuses.find((status) => status.code === value)?.id ??
    uuidOrUndefined(record?.health_status_id);
  const hasRevision = (
    item: Initiative | undefined,
  ): item is Initiative & { revision: number } =>
    typeof item?.revision === "number";
  const adminAllowed = () =>
    Boolean(
      getPermissions(state.currentUser, state.rolePermissions)?.canAccessAdmin &&
        !getPermissions(state.currentUser, state.rolePermissions)?.isReadOnly,
    );
  const authenticate = async (
    email: string,
    password: string,
  ): Promise<MutationResult> => {
    try {
      const session = await loginSession(email, password);
      setSessionUser(session.user);
      setAuthenticated(true);
      if (!session.user.must_change_password) await refreshInitialData();
      notify(NOTIFICATION_KINDS.success, SYSTEM_MESSAGES.auth.loginSuccess);
      return ok(SYSTEM_MESSAGES.auth.loginSuccess);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : SYSTEM_MESSAGES.auth.connectionFailed;
      notify(NOTIFICATION_KINDS.error, message);
      return fail(message);
    }
  };
  const logout = () => {
    setAuthenticated(false);
    setSessionUser(null);
    setAdminDataEnabled(false);
    queryClient.clear();
    notify(NOTIFICATION_KINDS.success, SYSTEM_MESSAGES.auth.logoutSuccess);
    void logoutSession();
  };
  const changePassword = async (
    currentPassword: string | undefined,
    newPassword: string,
  ): Promise<MutationResult> => {
    try {
      const session = await changeApiPassword(currentPassword, newPassword);
      setSessionUser(session.user);
      await refreshInitialData();
      notify(NOTIFICATION_KINDS.success, SYSTEM_MESSAGES.auth.passwordChanged);
      return ok(SYSTEM_MESSAGES.auth.passwordChanged);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : SYSTEM_MESSAGES.auth.passwordChangeFailed;
      notify(NOTIFICATION_KINDS.error, message);
      return fail(message);
    }
  };

  const addUser = async (
    user: User,
  ): Promise<MutationResult<{ temporary_password: string }>> => {
    if (!adminAllowed()) return fail(SYSTEM_MESSAGES.access.denied);
    const result = await executeRemote<{
      user: User;
      temporary_password: string;
    }>(
      () =>
        serverCommands.user("POST", undefined, {
          name: user.name,
          email: user.email,
          role: user.role,
          department_id: user.departmentId,
        }),
      refreshUsers,
    );
    return result.success && result.data
      ? ok(result.message, {
          temporary_password: result.data.temporary_password,
        })
      : fail(result.message);
  };
  const updateUser = (id: string, patch: Partial<User>) =>
    executeRemote(
      () =>
        serverCommands.user("PATCH", id, {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.email !== undefined ? { email: patch.email } : {}),
          ...(patch.role !== undefined ? { role: patch.role } : {}),
          ...(patch.departmentId !== undefined
            ? { department_id: patch.departmentId }
            : {}),
        }),
      refreshUsers,
    );
  const deleteUser = (id: string) =>
    state.currentUser?.id === id
      ? Promise.resolve(fail(SYSTEM_MESSAGES.access.activeUserDeleteDenied))
      : executeRemote(() => serverCommands.user("DELETE", id), refreshUsers);
  const resetUserPassword = async (
    id: string,
  ): Promise<MutationResult<{ temporary_password: string }>> => {
    const result = await executeRemote<{
      user: unknown;
      temporary_password: string;
    }>(() => serverCommands.resetUserPassword(id), refreshUsers);
    return result.data?.temporary_password
      ? {
          ...result,
          data: { temporary_password: result.data.temporary_password },
        }
      : fail(result.message);
  };

  const addInitiative = (
    kind: InitiativeKind,
    raw: Initiative,
  ): Promise<MutationResult> =>
    raw.record_type === "YEAR"
      ? executeRemote(
          () => serverCommands.createInitiative(createBody(kind, raw)),
          () => refreshKind(kind),
        )
      : raw.initiative_year_id
        ? executeRemote(
            () =>
              serverCommands.createCard(raw.initiative_year_id!, {
                quarter: raw.quarter,
              }),
            () => refreshKind(kind),
          )
        : Promise.resolve(
            fail(SYSTEM_MESSAGES.initiatives.validYearIdRequired),
          );
  const updateInitiative = <T extends Initiative>(
    kind: InitiativeKind,
    id: string,
    patch: Partial<T>,
  ): Promise<MutationResult> => {
    const record = recordsFor(kind).find((item) => item.id === id);
    if (!hasRevision(record))
      return Promise.resolve(
        fail(SYSTEM_MESSAGES.initiatives.recordUnavailable),
      );
    if (record.record_type === "YEAR") {
      if (!record.initiative_revision)
        return Promise.resolve(
          fail(SYSTEM_MESSAGES.initiatives.initiativeRevisionMissing),
        );
      return executeRemote(
        () =>
          serverCommands.updateBacklog(record.id, {
            initiative_revision: record.initiative_revision!,
            year_revision: record.revision!,
            name: patch.name ?? record.name,
            strategic_goal: patch.strategic_goal ?? record.strategic_goal,
          }),
        () => refreshKind(kind),
      );
    }
    const patchKeys = Object.keys(patch);
    if (patchKeys.length === 1 && patchKeys[0] === "health_status") {
      const statusId = healthStatusId(patch.health_status, record);
      if (!statusId)
        return Promise.resolve(fail("Не вдалося визначити обраний статус."));
      let updatedCard: QuarterCardReadModel | undefined;
      return executeRemote<QuarterCardReadModel>(
        () =>
          serverCommands
            .updateCardStatus(id, record.revision!, statusId)
            .then((response) => {
              updatedCard = response.data;
              return response;
            }),
        async () => {
          if (!updatedCard)
            throw new Error(SYSTEM_MESSAGES.api.canonicalCardMissing);
          queryClient.setQueriesData<QuarterCardReadModel[]>(
            { queryKey: ["quarter-cards", kind] },
            (current) =>
              current?.map((item) => (item.id === id ? updatedCard! : item)),
          );
          queryClient.setQueryData(queryKeys.initiativeCard(id), updatedCard);
          queryClient.setQueriesData<InitiativeYearReadModel[]>(
            { queryKey: ["initiative-years", kind] },
            (years) =>
              years?.map((year) => ({
                ...year,
                cards: year.cards.map((card) =>
                  card.id === id
                    ? {
                        ...card,
                        status_id: updatedCard!.status_id,
                        status_code: updatedCard!.status_code,
                        revision: updatedCard!.revision,
                      }
                    : card,
                ),
              })),
          );
          await queryClient.invalidateQueries({
            queryKey: ["analytics"],
            refetchType: "none",
          });
        },
      ).then(({ data: _data, ...result }) => result);
    }
    const refreshCard = async () => {
      const response = await loadInitiativeCardModel(id);
      if (!response.data)
        throw new Error(SYSTEM_MESSAGES.api.canonicalCardMissing);
      queryClient.setQueriesData<QuarterCardReadModel[]>(
        { queryKey: ["quarter-cards", kind] },
        (current) =>
          current?.map((item) => (item.id === id ? response.data : item)),
      );
      queryClient.setQueryData(queryKeys.initiativeCard(id), response.data);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["quarter-cards", kind],
          refetchType: "none",
        }),
        queryClient.invalidateQueries({
          queryKey: ["analytics"],
          refetchType: "none",
        }),
      ]);
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ["initiative-years", kind],
          type: "active",
        }),
        queryClient.refetchQueries({
          queryKey: ["quarter-cards", kind],
          type: "active",
        }),
        queryClient.refetchQueries({ queryKey: ["analytics"], type: "active" }),
      ]);
    };
    const updatedRecord = { ...record, ...patch };
    const body = cardBody(updatedRecord, record.revision);
    if (!body || body.scope.some((item) => !item.weight_definition_id))
      return Promise.resolve(
        fail(SYSTEM_MESSAGES.initiatives.activeWeightRequired),
      );
    if (
      record.record_type === "CARD" &&
      (record.is_locked ?? isPeriodLocked(record.year, record.quarter))
    ) {
      return executeRemote(
        () =>
          serverCommands.updateArchivedCard(id, {
            revision: record.revision!,
            notes: updatedRecord.notes,
            status_id: body.status_id,
            scope_status_updates: body.scope
              .filter((item) => item.id && item.revision)
              .map((item) => ({
                id: item.id!,
                revision: item.revision!,
                status_code: item.status_code,
              })),
          }),
        refreshCard,
      );
    }
    return executeRemote(
      () => serverCommands.updateCard(id, body),
      refreshCard,
    );
  };
  const removeInitiative = (
    kind: InitiativeKind,
    id: string,
  ): Promise<MutationResult> => {
    const record = recordsFor(kind).find((item) => item.id === id);
    return hasRevision(record)
      ? executeRemote(
          () =>
            record.record_type === "YEAR"
              ? serverCommands.deleteYear(id, record.revision)
              : serverCommands.deleteCard(id, record.revision),
          () => refreshKind(kind),
        )
      : Promise.resolve(
          fail(SYSTEM_MESSAGES.initiatives.recordRevisionMissing),
        );
  };
  const moveCard = (
    cardId: string,
    toYear: number,
    toQuarter: Quarter,
    isProject: boolean,
  ) => {
    const kind = isProject ? "project" : "task";
    const card = recordsFor(kind).find((item) => item.id === cardId);
    return card?.revision
      ? executeRemote(
          () =>
            serverCommands.moveCard(cardId, card.revision!, toYear, toQuarter),
          () => refreshKind(kind),
        )
      : Promise.resolve(fail(SYSTEM_MESSAGES.initiatives.cardRevisionMissing));
  };
  const continueCard = (
    cardId: string,
    toYear: number,
    toQuarter: Quarter,
    isProject: boolean,
  ) => {
    const kind = isProject ? "project" : "task";
    const card = recordsFor(kind).find((item) => item.id === cardId);
    return card?.revision
      ? executeRemote(
          () =>
            serverCommands.continueCard(
              cardId,
              card.revision!,
              toYear,
              toQuarter,
            ),
          () => refreshKind(kind),
        )
      : Promise.resolve(fail(SYSTEM_MESSAGES.initiatives.cardRevisionMissing));
  };
  const scopeTransfer = async (
    mode: "MOVE" | "COPY",
    cardId: string,
    itemId: string,
    toYear: number,
    toQuarter: Quarter,
    isProject: boolean,
  ) => {
    const kind = isProject ? "project" : "task";
    const records = recordsFor(kind);
    const card = records.find((item) => item.id === cardId);
    if (!card?.revision)
      return fail(SYSTEM_MESSAGES.initiatives.cardRevisionMissing);
    let target = records.find(
      (item) =>
        item.record_type === "CARD" &&
        getChainId(item) === getChainId(card) &&
        item.year === toYear &&
        item.quarter === toQuarter,
    );
    if (!target) {
      try {
        const targetCards = await loadQuarterCards(
          kind,
          undefined,
          toYear,
          toQuarter,
        );
        const targetModel = targetCards.find(
          (item) => item.initiative_id === getChainId(card),
        );
        if (targetModel) target = toQuarterCardViewModel(targetModel);
      } catch (error) {
        return fail(
          error instanceof ApiError
            ? error.message
            : SYSTEM_MESSAGES.api.targetQuarterCheckFailed,
        );
      }
    }
    return executeRemote(
      () =>
        mode === "MOVE"
          ? serverCommands.moveScope(
              cardId,
              itemId,
              card.revision!,
              toYear,
              toQuarter,
              target?.revision,
            )
          : serverCommands.copyScope(
              cardId,
              itemId,
              card.revision!,
              toYear,
              toQuarter,
              target?.revision,
            ),
      () => refreshKind(kind),
    );
  };
  const moveScopeItem = (
    cardId: string,
    itemId: string,
    toYear: number,
    toQuarter: Quarter,
    isProject: boolean,
  ) => scopeTransfer("MOVE", cardId, itemId, toYear, toQuarter, isProject);
  const copyScopeItem = (
    cardId: string,
    itemId: string,
    toYear: number,
    toQuarter: Quarter,
    isProject: boolean,
  ) => scopeTransfer("COPY", cardId, itemId, toYear, toQuarter, isProject);
  const createBacklogSnapshots = (
    kind: InitiativeKind,
    masterIds: string[],
    _sourceYear: number,
    targetYear: number,
  ) => {
    const sources = [...new Set(masterIds)]
      .map((id) =>
        recordsFor(kind).find(
          (item) => item.id === id && item.record_type === "YEAR",
        ),
      )
      .filter(hasRevision)
      .map(({ id, revision }) => ({ id, revision }));
    return executeRemote<{ years: unknown[] }>(
      () => serverCommands.extendYears(sources, targetYear),
      () => refreshKind(kind),
    ).then((result) =>
      result.success
        ? ok(result.message, { created: result.data?.years.length ?? 0 })
        : fail<{ created: number }>(result.message),
    );
  };
  const createBacklogSnapshot = async (
    kind: InitiativeKind,
    masterId: string,
    sourceYear: number,
    targetYear: number,
  ): Promise<MutationResult> => {
    const result = await createBacklogSnapshots(
      kind,
      [masterId],
      sourceYear,
      targetYear,
    );
    return result.success
      ? ok(SYSTEM_MESSAGES.initiatives.snapshotCreated)
      : fail(result.message);
  };
  const createBacklogWithCards = async (
    kind: InitiativeKind,
    raw: Initiative,
    quarters: Quarter[],
    _initialScope: Initiative["checklist"] = [],
  ) => {
    if (quarters.length > 1)
      return fail(SYSTEM_MESSAGES.initiatives.onlyOneInitialCard);
    const initialCard = quarters.length
      ? initialCardBody({
          ...raw,
          quarter: quarters[0],
          checklist: _initialScope,
        })
      : undefined;
    if (quarters.length && !initialCard)
      return fail(SYSTEM_MESSAGES.initiatives.initialCardDataInvalid);
    return executeRemote(
      () =>
        serverCommands.createInitiative({
          ...createBody(kind, raw),
          ...(initialCard ? { initial_card: initialCard } : {}),
        }),
      () => refreshKind(kind),
    );
  };
  const updatePreparationStage = (
    kind: InitiativeKind,
    masterId: string,
    patch: Partial<InitiativeMetadata>,
  ) => {
    const master = recordsFor(kind).find(
      (item) => item.record_type === "YEAR" && item.id === masterId,
    );
    if (!hasRevision(master))
      return Promise.resolve(
        fail(SYSTEM_MESSAGES.initiatives.yearRevisionMissing),
      );
    const stage =
      getYearSnapshot(master, master.year)?.preparationStage ??
      preparationMetadataFrom(master);
    const updatedStage = { ...stage, ...patch };
    return executeRemote(
      () =>
        serverCommands.updatePreparation(masterId, {
          revision: stage.revision ?? master.revision,
          manager_id: updatedStage.manager_id,
          priority_id: updatedStage.priority,
          department_ids: updatedStage.cross_functional_dept_ids ?? [],
        }),
      () => refreshKind(kind),
    );
  };

  const dictionaryOps = <T extends DictionaryItem>(
    key: DictionaryStateKey,
  ) => ({
    add: (item: T) =>
      executeRemote(
        () =>
          serverCommands.dictionary(
            dictionaryApiType(key),
            "POST",
            undefined,
            dictionaryPayload(item),
          ),
        refreshBootstrap,
      ),
    update: (id: string, patch: Partial<T>) => {
      const current = (state[key] as unknown as T[]).find(
        (item) => item.id === id,
      );
      return current
        ? executeRemote(
            () =>
              serverCommands.dictionary(
                dictionaryApiType(key),
                "PATCH",
                id,
                dictionaryPayload({ ...current, ...patch } as T),
              ),
            refreshBootstrap,
          )
        : Promise.resolve(fail(SYSTEM_MESSAGES.entities.recordNotFound));
    },
    remove: (id: string) =>
      executeRemote(
        () => serverCommands.dictionary(dictionaryApiType(key), "DELETE", id),
        refreshBootstrap,
      ),
  });
  const departments = dictionaryOps<Department>("departments"),
    managers = dictionaryOps<Manager>("managers"),
    priorities = dictionaryOps<PriorityDef>("priorities"),
    statuses = dictionaryOps<InitiativeStatusDef>("initiativeStatuses"),
    weights = dictionaryOps<TaskWeightDef>("taskWeights"),
    sizes = dictionaryOps<InitiativeSizeDef>("initiativeSizes");
  const checkDictionary = (
    key: DictionaryStateKey,
    id: string,
  ): MutationResult =>
    !adminAllowed()
      ? fail(SYSTEM_MESSAGES.access.adminDenied)
      : (state[key] as unknown as Array<{ id: string }>).some(
            (item) => item.id === id,
          )
        ? ok(SYSTEM_MESSAGES.entities.deletionAllowed)
        : fail(SYSTEM_MESSAGES.entities.recordNotFound);
  const addCustomField = (item: CustomFieldDef) => {
    const { id: _id, ...body } = item;
    return executeRemote(
      () => serverCommands.customField("POST", undefined, body),
      refreshBootstrap,
    );
  };
  const updateCustomField = (id: string, patch: Partial<CustomFieldDef>) => {
    const current = state.customFields.find((item) => item.id === id);
    if (!current)
      return Promise.resolve(fail(SYSTEM_MESSAGES.entities.fieldNotFound));
    const { id: _id, ...body } = { ...current, ...patch };
    return executeRemote(
      () => serverCommands.customField("PATCH", id, body),
      refreshBootstrap,
    );
  };
  const deleteCustomField = (id: string) =>
    executeRemote(
      () => serverCommands.customField("DELETE", id),
      refreshBootstrap,
    );
  const value: AppContextType = {
    ...state,
    isHydrating:
      !sessionReady ||
      (authenticated &&
        !sessionUser?.must_change_password &&
        bootstrapQuery.isPending),
    backendEnabled: true,
    enableAdminData,
    disableAdminData,
    setInitiativeDataScope,
    authenticate,
    changePassword,
    login: () => fail(SYSTEM_MESSAGES.auth.localLoginDisabled),
    logout,
    addUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    addProject: (item) => addInitiative("project", item),
    updateProject: (id, patch) => updateInitiative("project", id, patch),
    deleteProject: (id) => removeInitiative("project", id),
    addTask: (item) => addInitiative("task", item),
    updateTask: (id, patch) => updateInitiative("task", id, patch),
    deleteTask: (id) => removeInitiative("task", id),
    moveCard,
    continueCard,
    moveScopeItem,
    copyScopeItem,
    createBacklogSnapshot,
    createBacklogSnapshots,
    createBacklogWithCards,
    updatePreparationStage,
    addPriority: priorities.add,
    updatePriority: priorities.update,
    deletePriority: priorities.remove,
    addInitiativeStatus: statuses.add,
    updateInitiativeStatus: statuses.update,
    deleteInitiativeStatus: statuses.remove,
    addTaskWeight: weights.add,
    updateTaskWeight: weights.update,
    deleteTaskWeight: weights.remove,
    addInitiativeSize: sizes.add,
    updateInitiativeSize: sizes.update,
    deleteInitiativeSize: sizes.remove,
    addDepartment: departments.add,
    updateDepartment: departments.update,
    deleteDepartment: departments.remove,
    addManager: managers.add,
    updateManager: managers.update,
    deleteManager: managers.remove,
    checkDepartmentDeletion: (id) => checkDictionary("departments", id),
    checkManagerDeletion: (id) => checkDictionary("managers", id),
    checkPriorityDeletion: (id) => checkDictionary("priorities", id),
    checkInitiativeStatusDeletion: (id) =>
      checkDictionary("initiativeStatuses", id),
    updateRolePermission: (role, patch) =>
      executeRemote(
        () => serverCommands.updatePermission(role, patch),
        refreshPermissions,
      ),
    applyTaskWeightToOpenCards: (id) =>
      executeRemote<{ cards: number; tasks: number }>(
        () => serverCommands.applyWeight(id),
        refreshAllInitiatives,
      ),
    refreshOpenInitiativeSizes: () =>
      executeRemote<{ cards: number }>(
        () => serverCommands.recalculateSizes(),
        refreshAllInitiatives,
      ),
    addCustomField,
    updateCustomField,
    deleteCustomField,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used within AppProvider");
  return context;
};
