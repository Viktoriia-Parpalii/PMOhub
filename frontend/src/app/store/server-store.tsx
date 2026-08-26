import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AppDataState, CustomFieldDef, Department, FullExportData, InitiativePassport,
  InitiativeSizeDef, InitiativeStatusDef, Manager, MutationResult, OperationalTask,
  PriorityDef, Project, Quarter, RolePermissions, SavePassportCommand,
  ScopeMergePreview, TaskWeightDef, User,
} from "../../shared/types";
import {
  ApiError, changePassword as changeApiPassword, importBackup, loadBootstrap, loadInitiativeCard, loadInitiatives,
  loginSession, logoutSession, refreshSession, setAuthFailureHandler, validateBackup,
} from "../../api/apiClient";
import { queryKeys } from "../../api/queryClient";
import { useBootstrapQuery, useProjectsQuery, useTasksQuery } from "../../api/hooks";
import { getChainId, getYearSnapshot, preparationFrom } from "../../domain/initiatives";
import { getPermissions } from "../../domain/permissions";
import { executeBackendMutation } from "./backend-mutation";
import { dictionaryApiType, dictionaryPayload, DictionaryItem, DictionaryStateKey } from "./dictionary-api";
import { emptyAppState } from "./initial-state";
import { fail, ok } from "./helpers";
import { serverCommands } from "./server-commands";
import { Initiative, InitiativeKind } from "./types";
import { toChecklistDto, toPassportDto, uuidOrUndefined } from "./api-contract-mappers";

export interface AppContextType extends AppDataState {
  isHydrating: boolean;
  isMutating: boolean;
  backendEnabled: true;
  authenticate: (email: string, password: string) => Promise<MutationResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<MutationResult>;
  login: (user: User) => MutationResult;
  logout: () => void;
  addUser: (user: User) => Promise<MutationResult<{ temporary_password: string }>>;
  updateUser: (id: string, patch: Partial<User>) => Promise<MutationResult>;
  deleteUser: (id: string) => Promise<MutationResult>;
  resetUserPassword: (id: string) => Promise<MutationResult<{ temporary_password: string }>>;
  addProject: (item: Project) => Promise<MutationResult>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<MutationResult>;
  deleteProject: (id: string) => Promise<MutationResult>;
  addTask: (item: OperationalTask) => Promise<MutationResult>;
  updateTask: (id: string, patch: Partial<OperationalTask>) => Promise<MutationResult>;
  deleteTask: (id: string) => Promise<MutationResult>;
  moveInitiative: (backlogId: string, fromYear: number, fromQuarter: Quarter, toYear: number, toQuarter: Quarter, reason: string, isProject: boolean, confirmation?: ScopeMergePreview) => Promise<MutationResult>;
  moveCard: (cardId: string, toYear: number, toQuarter: Quarter, isProject: boolean, reason?: string, confirmation?: ScopeMergePreview) => Promise<MutationResult>;
  continueCard: (cardId: string, toYear: number, toQuarter: Quarter, isProject: boolean) => Promise<MutationResult>;
  moveScopeItem: (cardId: string, itemId: string, toYear: number, toQuarter: Quarter, isProject: boolean, reason?: string, confirmation?: ScopeMergePreview) => Promise<MutationResult>;
  savePassport: (command: SavePassportCommand) => Promise<MutationResult<{ snapshots: number; cards: number }>>;
  createBacklogSnapshot: (kind: InitiativeKind, masterId: string, sourceYear: number, targetYear: number) => Promise<MutationResult>;
  createBacklogSnapshots: (kind: InitiativeKind, masterIds: string[], sourceYear: number, targetYear: number) => Promise<MutationResult<{ created: number }>>;
  createBacklogWithCards: (kind: InitiativeKind, master: Project | OperationalTask, quarters: Quarter[], initialScope?: Project["checklist"]) => Promise<MutationResult>;
  updatePreparationStage: (kind: InitiativeKind, masterId: string, patch: Partial<InitiativePassport>) => Promise<MutationResult>;
  addPriority: (item: PriorityDef) => Promise<MutationResult>;
  updatePriority: (id: string, patch: Partial<PriorityDef>) => Promise<MutationResult>;
  deletePriority: (id: string) => Promise<MutationResult>;
  addInitiativeStatus: (item: InitiativeStatusDef) => Promise<MutationResult>;
  updateInitiativeStatus: (id: string, patch: Partial<InitiativeStatusDef>) => Promise<MutationResult>;
  deleteInitiativeStatus: (id: string) => Promise<MutationResult>;
  addTaskWeight: (item: TaskWeightDef) => Promise<MutationResult>;
  updateTaskWeight: (id: string, patch: Partial<TaskWeightDef>) => Promise<MutationResult>;
  deleteTaskWeight: (id: string) => Promise<MutationResult>;
  addInitiativeSize: (item: InitiativeSizeDef) => Promise<MutationResult>;
  updateInitiativeSize: (id: string, patch: Partial<InitiativeSizeDef>) => Promise<MutationResult>;
  deleteInitiativeSize: (id: string) => Promise<MutationResult>;
  addDepartment: (item: Department) => Promise<MutationResult>;
  updateDepartment: (id: string, patch: Partial<Department>) => Promise<MutationResult>;
  deleteDepartment: (id: string) => Promise<MutationResult>;
  addManager: (item: Manager) => Promise<MutationResult>;
  updateManager: (id: string, patch: Partial<Manager>) => Promise<MutationResult>;
  deleteManager: (id: string) => Promise<MutationResult>;
  checkDepartmentDeletion: (id: string) => MutationResult;
  checkManagerDeletion: (id: string) => MutationResult;
  checkPriorityDeletion: (id: string) => MutationResult;
  checkInitiativeStatusDeletion: (id: string) => MutationResult;
  updateRolePermission: (role: string, patch: Partial<RolePermissions>) => Promise<MutationResult>;
  applyTaskWeightToOpenCards: (id: string) => Promise<MutationResult<{ cards: number; tasks: number }>>;
  refreshOpenInitiativeSizes: () => Promise<MutationResult<{ cards: number }>>;
  addCustomField: (item: CustomFieldDef) => Promise<MutationResult>;
  updateCustomField: (id: string, patch: Partial<CustomFieldDef>) => Promise<MutationResult>;
  deleteCustomField: (id: string) => Promise<MutationResult>;
  importFullData: (data: FullExportData, mode: "replace" | "merge") => Promise<MutationResult<{ projects: number; tasks: number }> & { counts: { projects: number; tasks: number } }>;
}

type CommandResponse<T = undefined> = { success?: boolean; message?: string; data?: T };
const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [sessionReady, setSessionReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const bootstrapQuery = useBootstrapQuery(authenticated);
  const projectsQuery = useProjectsQuery(authenticated);
  const tasksQuery = useTasksQuery(authenticated);
  const commandMutation = useMutation<any, unknown, () => Promise<any>>({ mutationFn: (request) => request() });
  const reload = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap }),
      queryClient.invalidateQueries({ queryKey: queryKeys.initiatives("project") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.initiatives("task") }),
    ]);
    await Promise.all([
      queryClient.fetchQuery({ queryKey: queryKeys.bootstrap, queryFn: ({ signal }) => loadBootstrap(signal), staleTime: 0 }),
      queryClient.fetchQuery({ queryKey: queryKeys.initiatives("project"), queryFn: ({ signal }) => loadInitiatives<Project>("project", signal), staleTime: 0 }),
      queryClient.fetchQuery({ queryKey: queryKeys.initiatives("task"), queryFn: ({ signal }) => loadInitiatives<OperationalTask>("task", signal), staleTime: 0 }),
    ]);
  }, [queryClient]);
  const executeRemote = useCallback(<T,>(request: () => Promise<CommandResponse<T>>, refresh: () => Promise<void> = async () => { await reload(); }) =>
    executeBackendMutation<T>(() => commandMutation.mutateAsync(request) as Promise<CommandResponse<T>>, refresh),
  [commandMutation, reload]);

  useEffect(() => {
    setAuthFailureHandler(() => { setAuthenticated(false); queryClient.clear(); });
    refreshSession().then(async () => { setAuthenticated(true); await reload(); })
      .catch(() => setAuthenticated(false)).finally(() => setSessionReady(true));
    return () => setAuthFailureHandler(null);
  }, [reload]);

  const state = {
    ...emptyAppState,
    ...(bootstrapQuery.data ?? queryClient.getQueryData(queryKeys.bootstrap) ?? {}),
    projects: projectsQuery.data ?? queryClient.getQueryData<Project[]>(queryKeys.initiatives("project")) ?? [],
    tasks: tasksQuery.data ?? queryClient.getQueryData<OperationalTask[]>(queryKeys.initiatives("task")) ?? [],
  } as AppDataState;
  const recordsFor = (kind: InitiativeKind): Initiative[] => kind === "project" ? state.projects : state.tasks;
  const wireChecklist = (items: Initiative["checklist"]) => toChecklistDto(items);
  const healthStatusId = (value: string | undefined, record?: Initiative) =>
    uuidOrUndefined(value)
    ?? state.initiativeStatuses.find((status) => status.code === value)?.id
    ?? uuidOrUndefined(record?.health_status_id);
  const hasRevision = (item: Initiative | undefined): item is Initiative & { revision: number } => typeof item?.revision === "number";
  const adminAllowed = () => Boolean(getPermissions(state.currentUser, state.rolePermissions)?.canAccessAdmin);
  const authenticate = async (email: string, password: string): Promise<MutationResult> => {
    try { await loginSession(email, password); setAuthenticated(true); await reload(); return ok("Вхід виконано"); }
    catch (error) { return fail(error instanceof ApiError ? error.message : "Не вдалося підключитися до сервера"); }
  };
  const logout = () => { setAuthenticated(false); void logoutSession().finally(() => queryClient.clear()); };
  const changePassword = async (currentPassword: string, newPassword: string): Promise<MutationResult> => {
    try { await changeApiPassword(currentPassword, newPassword); await reload(); return ok("Пароль успішно змінено"); }
    catch (error) { return fail(error instanceof ApiError ? error.message : "Не вдалося змінити пароль"); }
  };

  const addUser = async (user: User): Promise<MutationResult<{ temporary_password: string }>> => {
    if (!adminAllowed()) return fail("Недостатньо прав");
    const result = await executeRemote<{ user: User; temporary_password: string }>(() => serverCommands.user("POST", undefined, { name: user.name, email: user.email, role: user.role, department_id: user.departmentId }));
    return result.success && result.data ? ok(result.message, { temporary_password: result.data.temporary_password }) : fail(result.message);
  };
  const updateUser = (id: string, patch: Partial<User>) => executeRemote(() => serverCommands.user("PATCH", id, {
    ...(patch.name !== undefined ? { name: patch.name } : {}), ...(patch.email !== undefined ? { email: patch.email } : {}),
    ...(patch.role !== undefined ? { role: patch.role } : {}), ...(patch.departmentId !== undefined ? { department_id: patch.departmentId } : {}),
  }));
  const deleteUser = (id: string) => state.currentUser?.id === id ? Promise.resolve(fail("Не можна видалити активного користувача")) : executeRemote(() => serverCommands.user("DELETE", id));
  const resetUserPassword = async (id: string): Promise<MutationResult<{ temporary_password: string }>> => {
    const result = await executeRemote<{ user: unknown; temporary_password: string }>(() => serverCommands.resetUserPassword(id));
    return result.success && result.data ? ok(result.message, { temporary_password: result.data.temporary_password }) : fail(result.message);
  };

  const addInitiative = (kind: InitiativeKind, raw: Initiative): Promise<MutationResult> => raw.is_backlog
    ? executeRemote(() => serverCommands.createInitiative({ kind, year: raw.year, passport: toPassportDto(raw), quarters: [], initial_scope: [] }))
    : raw.backlog_id ? executeRemote(() => serverCommands.createCard(raw.backlog_id!, { quarter: raw.quarter, passport: toPassportDto(raw), initial_scope: wireChecklist(raw.checklist) }))
    : Promise.resolve(fail("Потрібен валідний master backlog_id"));
  const updateInitiative = <T extends Initiative>(kind: InitiativeKind, id: string, patch: Partial<T>): Promise<MutationResult> => {
    const record = recordsFor(kind).find((item) => item.id === id);
    if (!hasRevision(record) || record.is_backlog) return Promise.resolve(fail("Запис не знайдено або недоступний для цієї команди"));
    const passportKeys = ["name", "strategic_goal", "manager_id", "priority", "notes", "implementer_dept_ids", "cross_functional_dept_ids", "custom_fields"];
    const refreshCard = async () => {
      const response = await loadInitiativeCard(id);
      if (!response.data) throw new Error("Канонічну картку не отримано");
      queryClient.setQueryData<Initiative[]>(queryKeys.initiatives(kind), (current) => current?.map((item) => item.id === id ? response.data! : item));
      queryClient.setQueryData(queryKeys.initiativeCard(id), response.data);
    };
    const updatedRecord = { ...record, ...patch };
    const statusId = patch.health_status !== undefined ? healthStatusId(patch.health_status, record) : undefined;
    return executeRemote(() => serverCommands.updateCard(id, { revision: record.revision,
      ...(statusId ? { health_status: statusId } : {}),
      ...(patch.checklist !== undefined ? { checklist: wireChecklist(patch.checklist) } : {}),
      ...(Object.keys(patch).some((key) => passportKeys.includes(key)) ? { passport: toPassportDto(updatedRecord) } : {}),
    }), refreshCard);
  };
  const removeInitiative = (kind: InitiativeKind, id: string): Promise<MutationResult> => {
    const record = recordsFor(kind).find((item) => item.id === id);
    return hasRevision(record) ? executeRemote(() => record.is_backlog ? serverCommands.deleteYear(id, record.revision) : serverCommands.deleteCard(id, record.revision)) : Promise.resolve(fail("Запис не знайдено або відсутня revision"));
  };
  const moveCard = (cardId: string, toYear: number, toQuarter: Quarter, isProject: boolean, reason?: string, _confirmation?: ScopeMergePreview) => { const card = recordsFor(isProject ? "project" : "task").find((item) => item.id === cardId); return card?.revision ? executeRemote(() => serverCommands.moveCard(cardId, card.revision!, toYear, toQuarter, reason)) : Promise.resolve(fail("Картку не знайдено або відсутня revision")); };
  const continueCard = (cardId: string, toYear: number, toQuarter: Quarter, isProject: boolean) => { const card = recordsFor(isProject ? "project" : "task").find((item) => item.id === cardId); return card?.revision ? executeRemote(() => serverCommands.continueCard(cardId, card.revision!, toYear, toQuarter)) : Promise.resolve(fail("Картку не знайдено або відсутня revision")); };
  const moveScopeItem = (cardId: string, itemId: string, toYear: number, toQuarter: Quarter, isProject: boolean, reason?: string, confirmation?: ScopeMergePreview) => { const card = recordsFor(isProject ? "project" : "task").find((item) => item.id === cardId); return card?.revision ? executeRemote(() => serverCommands.moveScope(cardId, itemId, card.revision!, toYear, toQuarter, reason, confirmation?.token)) : Promise.resolve(fail("Картку не знайдено або відсутня revision")); };
  const moveInitiative = (backlogId: string, fromYear: number, fromQuarter: Quarter, toYear: number, toQuarter: Quarter, reason: string, isProject: boolean, confirmation?: ScopeMergePreview) => {
    const card = recordsFor(isProject ? "project" : "task").find((item) => !item.is_backlog && item.backlog_id === backlogId && item.year === fromYear && item.quarter === fromQuarter);
    return card ? moveCard(card.id, toYear, toQuarter, isProject, reason, confirmation) : Promise.resolve(fail("Картку не знайдено"));
  };
  const savePassport = (command: SavePassportCommand): Promise<MutationResult<{ snapshots: number; cards: number }>> => {
    const records = recordsFor(command.kind);
    const sourceId = command.source.type === "card" ? command.source.cardId : command.source.masterId;
    const source = records.find((item) => item.id === sourceId && item.is_backlog === (command.source.type === "backlog"));
    if (!hasRevision(source)) return Promise.resolve(fail("Запис не знайдено або відсутня revision"));
    const owner = command.source.type === "card" ? "cards" : "years";
    const ownerId = command.source.type === "card" ? command.source.cardId : command.source.masterId;
    const sourceHealthStatusId = command.sourceCardPatch
      ? healthStatusId(command.sourceCardPatch.health_status, source)
      : undefined;
    return executeRemote<{ snapshots: number; cards: number }>(() => serverCommands.savePassport(owner, ownerId, {
      revision: source.revision, passport: toPassportDto({ ...source, ...command.passportPatch }),
      target_years: command.targets.backlogYears.map((year) => records.find((item) => item.is_backlog && item.year === year && getChainId(item) === getChainId(source))).filter(hasRevision).map((item) => ({ id: item.id, revision: item.revision })),
      target_cards: command.targets.cardIds.map((id) => records.find((item) => !item.is_backlog && item.id === id)).filter(hasRevision).map((item) => ({ id: item.id, revision: item.revision })), ...(command.sourceCardPatch ? { source_card_patch: {
        ...(sourceHealthStatusId ? { health_status: sourceHealthStatusId } : {}),
        ...(command.sourceCardPatch.checklist ? { checklist: wireChecklist(command.sourceCardPatch.checklist) } : {}),
      } } : {}),
    }));
  };
  const createBacklogSnapshots = (kind: InitiativeKind, masterIds: string[], _sourceYear: number, targetYear: number) => executeRemote<{ created: number }>(() => serverCommands.extendYears([...new Set(masterIds)], targetYear));
  const createBacklogSnapshot = async (kind: InitiativeKind, masterId: string, sourceYear: number, targetYear: number): Promise<MutationResult> => {
    const result = await createBacklogSnapshots(kind, [masterId], sourceYear, targetYear); return result.success ? ok("Snapshot створено") : fail(result.message);
  };
  const createBacklogWithCards = (kind: InitiativeKind, raw: Initiative, quarters: Quarter[], initialScope: Initiative["checklist"] = []) => executeRemote(() => serverCommands.createInitiative({ kind, year: raw.year, passport: toPassportDto(raw), quarters, initial_scope: wireChecklist(initialScope) }));
  const updatePreparationStage = (kind: InitiativeKind, masterId: string, patch: Partial<InitiativePassport>) => {
    const master = recordsFor(kind).find((item) => item.is_backlog && item.id === masterId); if (!hasRevision(master)) return Promise.resolve(fail("Річний запис не знайдено або відсутня revision"));
    const stage = getYearSnapshot(master, master.year)?.preparationStage ?? preparationFrom(master);
    const updatedStage = { ...stage, ...patch };
    return executeRemote(() => serverCommands.updatePreparation(masterId, {
      revision: master.revision,
      name: master.name,
      strategic_goal: master.strategic_goal,
      manager_id: updatedStage.manager_id,
      priority: updatedStage.priority,
      notes: updatedStage.notes,
      implementer_dept_ids: [],
      cross_functional_dept_ids: updatedStage.cross_functional_dept_ids ?? [],
      custom_fields: updatedStage.custom_fields,
    }));
  };

  const dictionaryOps = <T extends DictionaryItem>(key: DictionaryStateKey) => ({
    add: (item: T) => executeRemote(() => serverCommands.dictionary(dictionaryApiType(key), "POST", undefined, dictionaryPayload(item))),
    update: (id: string, patch: Partial<T>) => { const current = (state[key] as unknown as T[]).find((item) => item.id === id); return current ? executeRemote(() => serverCommands.dictionary(dictionaryApiType(key), "PATCH", id, dictionaryPayload({ ...current, ...patch } as T))) : Promise.resolve(fail("Запис не знайдено")); },
    remove: (id: string) => executeRemote(() => serverCommands.dictionary(dictionaryApiType(key), "DELETE", id)),
  });
  const departments = dictionaryOps<Department>("departments"), managers = dictionaryOps<Manager>("managers"), priorities = dictionaryOps<PriorityDef>("priorities"), statuses = dictionaryOps<InitiativeStatusDef>("initiativeStatuses"), weights = dictionaryOps<TaskWeightDef>("taskWeights"), sizes = dictionaryOps<InitiativeSizeDef>("initiativeSizes");
  const checkDictionary = (key: DictionaryStateKey, id: string): MutationResult => !adminAllowed() ? fail("Недостатньо прав адміністратора") : (state[key] as unknown as Array<{ id: string }>).some((item) => item.id === id) ? ok("Видалення дозволено") : fail("Запис не знайдено");
  const addCustomField = (item: CustomFieldDef) => { const { id: _id, ...body } = item; return executeRemote(() => serverCommands.customField("POST", undefined, body)); };
  const updateCustomField = (id: string, patch: Partial<CustomFieldDef>) => { const current = state.customFields.find((item) => item.id === id); if (!current) return Promise.resolve(fail("Поле не знайдено")); const { id: _id, ...body } = { ...current, ...patch }; return executeRemote(() => serverCommands.customField("PATCH", id, body)); };
  const deleteCustomField = (id: string) => executeRemote(() => serverCommands.customField("DELETE", id));
  const importFullData = async (raw: FullExportData, mode: "replace" | "merge") => {
    const counts = { projects: raw.projects?.length ?? 0, tasks: raw.tasks?.length ?? 0 };
    try {
      const validation = await validateBackup(raw, mode);
      const token = validation.data?.validation_token;
      if (!token) return { ...fail("Сервер не повернув токен перевірки backup"), counts };
      const result = await executeRemote(() => importBackup(raw, mode, token));
      return { ...result, data: result.success ? counts : undefined, counts };
    } catch (error) {
      return { ...fail(error instanceof ApiError ? error.message : "Не вдалося перевірити backup"), counts };
    }
  };

  const value: AppContextType = {
    ...state, isHydrating: !sessionReady || (authenticated && (bootstrapQuery.isPending || projectsQuery.isPending || tasksQuery.isPending)), isMutating: commandMutation.isPending, backendEnabled: true,
    authenticate, changePassword, login: () => fail("Локальний вхід вимкнено"), logout,
    addUser, updateUser, deleteUser, resetUserPassword,
    addProject: (item) => addInitiative("project", item), updateProject: (id, patch) => updateInitiative("project", id, patch), deleteProject: (id) => removeInitiative("project", id),
    addTask: (item) => addInitiative("task", item), updateTask: (id, patch) => updateInitiative("task", id, patch), deleteTask: (id) => removeInitiative("task", id),
    moveInitiative, moveCard, continueCard, moveScopeItem, savePassport, createBacklogSnapshot, createBacklogSnapshots, createBacklogWithCards, updatePreparationStage,
    addPriority: priorities.add, updatePriority: priorities.update, deletePriority: priorities.remove,
    addInitiativeStatus: statuses.add, updateInitiativeStatus: statuses.update, deleteInitiativeStatus: statuses.remove,
    addTaskWeight: weights.add, updateTaskWeight: weights.update, deleteTaskWeight: weights.remove,
    addInitiativeSize: sizes.add, updateInitiativeSize: sizes.update, deleteInitiativeSize: sizes.remove,
    addDepartment: departments.add, updateDepartment: departments.update, deleteDepartment: departments.remove,
    addManager: managers.add, updateManager: managers.update, deleteManager: managers.remove,
    checkDepartmentDeletion: (id) => checkDictionary("departments", id), checkManagerDeletion: (id) => checkDictionary("managers", id), checkPriorityDeletion: (id) => checkDictionary("priorities", id), checkInitiativeStatusDeletion: (id) => checkDictionary("initiativeStatuses", id),
    updateRolePermission: (role, patch) => executeRemote(() => serverCommands.updatePermission(role, patch)),
    applyTaskWeightToOpenCards: (id) => executeRemote<{ cards: number; tasks: number }>(() => serverCommands.applyWeight(id)),
    refreshOpenInitiativeSizes: () => executeRemote<{ cards: number }>(() => serverCommands.recalculateSizes()),
    addCustomField, updateCustomField, deleteCustomField, importFullData,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => { const context = useContext(AppContext); if (!context) throw new Error("useAppContext must be used within AppProvider"); return context; };
