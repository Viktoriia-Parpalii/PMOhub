import React, { createContext, ReactNode, useContext, useReducer } from 'react';
import {
  AppDataState, CustomFieldDef, Department, FullExportData, InitiativePassport,
  InitiativeSizeDef, InitiativeStatusDef, InitiativeYearSnapshot, Manager, MutationResult, OperationalTask,
  PriorityDef, Project, Quarter, RolePermissions, SavePassportCommand, ScopeMergePreview,
  TaskWeightDef, User,
} from './types';
import {
  initialCustomFields, initialDepartments, initialInitiativeSizes, initialManagers,
  initialPriorities, initialInitiativeStatuses, initialProjects, initialRolePermissions, initialTaskWeights,
  initialTasks, initialUsers,
} from './demoData';
import { getInitiativeWeight, makeSizeSnapshot, makeWeightSnapshot, validateChecklistCapacity } from './domain/capacity';
import {
  deleteInitiative as deleteInitiativeRecord, getChainId, getYearSnapshot, makeHistory, preparationFrom,
  continueCard as continueCardRecord, moveCard as moveCardRecord, moveChecklistItem as moveChecklistItemRecord,
  passportFrom, reconcileBacklogYears,
} from './domain/initiatives';
import { canDeleteInitiative, canEditInitiative, getPermissions } from './domain/permissions';
import { getCurrentPeriod, isBacklogLocked, isPeriodLocked, qToNum } from './utils';

type InitiativeKind = 'project' | 'task';
type Initiative = Project | OperationalTask;
type StateUpdater = (state: AppDataState) => AppDataState;
type Action = { type: 'APPLY'; update: StateUpdater };

const withMetricSnapshots = <T extends Initiative>(raw: T, taskWeights: TaskWeightDef[], initiativeSizes: InitiativeSizeDef[], refreshSize = false): T => {
  if (raw.is_backlog) return raw;
  const checklist = (raw.checklist ?? []).map(item => {
    if (item.weightSnapshot) return item;
    const definition = taskWeights.find(weight => weight.id === item.weightId);
    return definition ? { ...item, weightSnapshot: makeWeightSnapshot(definition) } : item;
  });
  const totalWeight = getInitiativeWeight(checklist, taskWeights);
  return {
    ...raw,
    checklist,
    sizeSnapshot: refreshSize || !raw.sizeSnapshot ? makeSizeSnapshot(totalWeight, initiativeSizes) : raw.sizeSnapshot,
  } as T;
};

const initialState: AppDataState = {
  departments: initialDepartments, priorities: initialPriorities, initiativeStatuses: initialInitiativeStatuses, taskWeights: initialTaskWeights,
  initiativeSizes: initialInitiativeSizes, managers: initialManagers,
  projects: reconcileBacklogYears(initialProjects.map(item => withMetricSnapshots(item, initialTaskWeights, initialInitiativeSizes))),
  tasks: reconcileBacklogYears(initialTasks.map(item => withMetricSnapshots(item, initialTaskWeights, initialInitiativeSizes))),
  users: initialUsers, rolePermissions: initialRolePermissions, customFields: initialCustomFields,
  currentUser: null,
};

export const appReducer = (state: AppDataState, action: Action): AppDataState => action.type === 'APPLY' ? action.update(state) : state;
const ok = <T = undefined>(message: string, data?: T): MutationResult<T> => ({ success: true, message, data });
const fail = <T = undefined>(message: string, requiresConfirmation?: ScopeMergePreview): MutationResult<T> => ({ success: false, message, requiresConfirmation });
const mergeById = <T extends { id: string }>(current: T[], incoming: T[]): T[] => {
  const map = new Map(current.map(item => [item.id, item])); incoming.forEach(item => map.set(item.id, item)); return Array.from(map.values());
};
const toSnapshot = (initiative: Initiative, year = initiative.year): InitiativeYearSnapshot => ({
  ...passportFrom(initiative), year, history: [...(initiative.history ?? [])],
});
const sanitizeInitiative = <T extends Initiative>(raw: T): T => {
  const initiative = {
    ...raw,
    implementer_dept_ids: Array.from(new Set(raw.implementer_dept_ids ?? [])),
    cross_functional_dept_ids: Array.from(new Set(raw.cross_functional_dept_ids ?? [])).filter(id => !(raw.implementer_dept_ids ?? []).includes(id)),
  } as T;
  if (initiative.is_backlog) {
    const snapshots = initiative.yearSnapshots && Object.keys(initiative.yearSnapshots).length
      ? initiative.yearSnapshots
      : { [String(initiative.year)]: toSnapshot(initiative) };
    return { ...initiative, checklist: [], yearSnapshots: snapshots } as T;
  }
  return {
    ...initiative, yearSnapshots: undefined,
    checklist: (initiative.checklist ?? []).map(item => ({ ...item, implementer_dept_ids: Array.from(new Set(item.implementer_dept_ids ?? [])) })),
  } as T;
};

export const validateExportData = (input: unknown): MutationResult<FullExportData> => {
  if (!input || typeof input !== 'object') return fail('JSON має містити об’єкт');
  const data = input as Partial<FullExportData> & { version?: string };
  if (data.version !== '5.0') return fail('Підтримується лише формат PMO Hub 5.0');
  const allowedKeys = new Set<keyof FullExportData>([
    'version', 'exportedAt', 'exportedBy', 'departments', 'priorities', 'initiativeStatuses', 'taskWeights',
    'initiativeSizes', 'managers', 'projects', 'tasks', 'users', 'rolePermissions', 'customFields',
  ]);
  const unexpectedKey = Object.keys(data).find(key => !allowedKeys.has(key as keyof FullExportData));
  if (unexpectedKey) return fail(`Некоректний backup: невідоме поле ${unexpectedKey}`);
  const requiredArrays: Array<keyof FullExportData> = [
    'departments', 'priorities', 'initiativeStatuses', 'taskWeights', 'initiativeSizes', 'managers',
    'projects', 'tasks', 'users', 'rolePermissions', 'customFields',
  ];
  const missing = requiredArrays.find(key => !Array.isArray(data[key]));
  if (missing) return fail(`Некоректний backup: поле ${missing} має бути масивом`);
  const normalized = data as FullExportData;
  const all = [...normalized.projects, ...normalized.tasks];
  const invalidMaster = all.find(record => record.is_backlog && (!record.yearSnapshots || Object.keys(record.yearSnapshots).length === 0 || record.checklist.length > 0));
  if (invalidMaster) return fail(`Некоректний master-record «${invalidMaster.name}»`);
  const invalidCard = all.find(record => !record.is_backlog && (validateChecklistCapacity(record.checklist, normalized.taskWeights).length > 0 || !record.sizeSnapshot || record.checklist.some(item => !item.weightSnapshot)));
  if (invalidCard) return fail(`Некоректний scope у картці «${invalidCard.name}»`);
  const validateLinks = (records: Initiative[]) => records.find(record => !record.is_backlog && (!record.backlog_id || !records.some(master => master.is_backlog && master.id === record.backlog_id)));
  if (validateLinks(normalized.projects) || validateLinks(normalized.tasks)) return fail('Квартальна картка має невалідний backlog_id');
  const keys = new Set<string>();
  for (const record of all.filter(item => !item.is_backlog)) {
    const kind = normalized.projects.includes(record as Project) ? 'project' : 'task';
    const key = `${kind}:${record.backlog_id}:${record.year}:${record.quarter}`;
    if (keys.has(key)) return fail(`Дублікат квартальної картки: ${key}`); keys.add(key);
  }
  return { success: true, message: 'Backup валідний', data: normalized };
};

export interface AppContextType extends AppDataState {
  login: (user: User) => MutationResult; logout: () => void;
  addUser: (user: User) => MutationResult; updateUser: (id: string, patch: Partial<User>) => MutationResult; deleteUser: (id: string) => MutationResult;
  addProject: (project: Project) => MutationResult; updateProject: (id: string, patch: Partial<Project>) => MutationResult; deleteProject: (id: string) => MutationResult;
  addTask: (task: OperationalTask) => MutationResult; updateTask: (id: string, patch: Partial<OperationalTask>) => MutationResult; deleteTask: (id: string) => MutationResult;
  moveInitiative: (backlogId: string, fromYear: number, fromQuarter: Quarter, toYear: number, toQuarter: Quarter, reason: string, isProject: boolean, confirmation?: ScopeMergePreview) => MutationResult;
  moveCard: (cardId: string, toYear: number, toQuarter: Quarter, isProject: boolean, reason?: string, confirmation?: ScopeMergePreview) => MutationResult;
  continueCard: (cardId: string, toYear: number, toQuarter: Quarter, isProject: boolean) => MutationResult;
  moveScopeItem: (cardId: string, itemId: string, toYear: number, toQuarter: Quarter, isProject: boolean, reason?: string, confirmation?: ScopeMergePreview) => MutationResult;
  savePassport: (command: SavePassportCommand) => MutationResult<{ snapshots: number; cards: number }>;
  createBacklogSnapshot: (kind: 'project' | 'task', masterId: string, sourceYear: number, targetYear: number) => MutationResult;
  createBacklogSnapshots: (kind: 'project' | 'task', masterIds: string[], sourceYear: number, targetYear: number) => MutationResult<{ created: number }>;
  createBacklogWithCards: (kind: 'project' | 'task', master: Project | OperationalTask, quarters: Quarter[], initialScope?: Project['checklist']) => MutationResult;
  updatePreparationStage: (kind: 'project' | 'task', masterId: string, patch: Partial<InitiativePassport>) => MutationResult;
  addPriority: (item: PriorityDef) => MutationResult; updatePriority: (id: string, patch: Partial<PriorityDef>) => MutationResult; deletePriority: (id: string) => MutationResult;
  addInitiativeStatus: (item: InitiativeStatusDef) => MutationResult; updateInitiativeStatus: (id: string, patch: Partial<InitiativeStatusDef>) => MutationResult; deleteInitiativeStatus: (id: string) => MutationResult;
  addTaskWeight: (item: TaskWeightDef) => MutationResult; updateTaskWeight: (id: string, patch: Partial<TaskWeightDef>) => MutationResult; deleteTaskWeight: (id: string) => MutationResult;
  addInitiativeSize: (item: InitiativeSizeDef) => MutationResult; updateInitiativeSize: (id: string, patch: Partial<InitiativeSizeDef>) => MutationResult; deleteInitiativeSize: (id: string) => MutationResult;
  addDepartment: (item: Department) => MutationResult; updateDepartment: (id: string, patch: Partial<Department>) => MutationResult; deleteDepartment: (id: string) => MutationResult;
  addManager: (item: Manager) => MutationResult; updateManager: (id: string, patch: Partial<Manager>) => MutationResult; deleteManager: (id: string) => MutationResult;
  checkDepartmentDeletion: (id: string) => MutationResult; checkManagerDeletion: (id: string) => MutationResult; checkPriorityDeletion: (id: string) => MutationResult; checkInitiativeStatusDeletion: (id: string) => MutationResult;
  updateRolePermission: (role: string, patch: Partial<RolePermissions>) => MutationResult;
  applyTaskWeightToOpenCards: (id: string) => MutationResult<{ cards: number; tasks: number }>;
  refreshOpenInitiativeSizes: () => MutationResult<{ cards: number }>;
  addCustomField: (item: CustomFieldDef) => MutationResult; updateCustomField: (id: string, patch: Partial<CustomFieldDef>) => MutationResult; deleteCustomField: (id: string) => MutationResult;
  getFullDataSnapshot: () => FullExportData;
  importFullData: (data: FullExportData, mode: 'replace' | 'merge') => MutationResult<{ projects: number; tasks: number }> & { counts: { projects: number; tasks: number } };
}

const AppContext = createContext<AppContextType | undefined>(undefined);
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const apply = (update: StateUpdater) => dispatch({ type: 'APPLY', update });
  const actor = state.currentUser?.name ?? 'Система';
  const adminAllowed = () => Boolean(getPermissions(state.currentUser, state.rolePermissions)?.canAccessAdmin);
  const login = (user: User): MutationResult => {
    if (!state.users.some(candidate => candidate.id === user.id)) return fail('Користувача не знайдено');
    apply(current => ({ ...current, currentUser: current.users.find(candidate => candidate.id === user.id) ?? null })); return ok('Вхід виконано');
  };
  const logout = () => apply(current => ({ ...current, currentUser: null }));
  const addUser = (user: User): MutationResult => {
    if (!adminAllowed()) return fail('Недостатньо прав');
    if (state.users.some(item => item.id === user.id || item.email.toLowerCase() === user.email.toLowerCase())) return fail('Користувач уже існує');
    apply(current => ({ ...current, users: [...current.users, user] })); return ok('Користувача додано');
  };
  const updateUser = (id: string, patch: Partial<User>): MutationResult => {
    const onlyPassword = Object.keys(patch).every(key => key === 'password');
    if (!adminAllowed() && !(onlyPassword && (!state.currentUser || state.currentUser.id === id))) return fail('Недостатньо прав');
    apply(current => ({ ...current, users: current.users.map(user => user.id === id ? { ...user, ...patch } : user), currentUser: current.currentUser?.id === id ? { ...current.currentUser, ...patch } : current.currentUser })); return ok('Користувача оновлено');
  };
  const deleteUser = (id: string): MutationResult => {
    if (!adminAllowed()) return fail('Недостатньо прав'); if (state.currentUser?.id === id) return fail('Не можна видалити активного користувача');
    apply(current => ({ ...current, users: current.users.filter(user => user.id !== id) })); return ok('Користувача видалено');
  };

  const recordsFor = (kind: InitiativeKind): Initiative[] => kind === 'project' ? state.projects : state.tasks;
  const setRecords = (current: AppDataState, kind: InitiativeKind, records: Initiative[]): AppDataState => kind === 'project'
    ? { ...current, projects: records as Project[] } : { ...current, tasks: records as OperationalTask[] };
  const addInitiative = <T extends Initiative>(kind: InitiativeKind, raw: T): MutationResult => {
    const initiative = withMetricSnapshots(sanitizeInitiative(raw), state.taskWeights, state.initiativeSizes, true); const records = recordsFor(kind); const permission = getPermissions(state.currentUser, state.rolePermissions);
    if (!permission?.canCreateEditProjects || permission.isReadOnly) return fail('Недостатньо прав');
    if (records.some(record => record.id === initiative.id)) return fail('ID вже використовується');
    if (initiative.is_backlog) {
      if (isBacklogLocked(initiative.year)) return fail('Створення архівного snapshot заборонено');
    } else {
      if (isPeriodLocked(initiative.year, initiative.quarter) && !permission.canEditArchive) return fail('Створення в архівному періоді заборонено');
      if (!initiative.backlog_id || !records.some(record => record.is_backlog && record.id === initiative.backlog_id)) return fail('Потрібен валідний master backlog_id');
      const errors = validateChecklistCapacity(initiative.checklist, state.taskWeights); if (errors.length) return fail(errors.join('\n'));
      if (records.some(record => !record.is_backlog && record.backlog_id === initiative.backlog_id && record.year === initiative.year && record.quarter === initiative.quarter)) return fail('У цьому періоді вже існує картка ініціативи');
    }
    apply(current => setRecords(current, kind, [...(kind === 'project' ? current.projects : current.tasks), initiative])); return ok('Запис додано');
  };
  const updateInitiative = <T extends Initiative>(kind: InitiativeKind, id: string, patch: Partial<T>): MutationResult => {
    const records = recordsFor(kind) as T[]; const record = records.find(item => item.id === id); if (!record) return fail('Запис не знайдено');
    if (!canEditInitiative(record, state.currentUser, state.rolePermissions)) return fail('Редагування заборонено');
    if (record.is_backlog) return fail('Паспорт backlog потрібно оновлювати через команду Save');
    if ((patch.year !== undefined && patch.year !== record.year) || (patch.quarter !== undefined && patch.quarter !== record.quarter)) return fail('Період можна змінити лише командою перенесення');
    if (isPeriodLocked(record.year, record.quarter) && patch.checklist !== undefined) {
      const signature = (items: T['checklist']) => JSON.stringify(items.map(item => ({ id: item.id, weightId: item.weightId, weightSnapshot: item.weightSnapshot })));
      if (signature(record.checklist) !== signature(patch.checklist)) return fail('Зміна ваги або складу scope в архівному періоді заборонена');
    }
    const updated = withMetricSnapshots(sanitizeInitiative({ ...record, ...patch } as T), state.taskWeights, state.initiativeSizes, patch.checklist !== undefined); const errors = validateChecklistCapacity(updated.checklist, state.taskWeights); if (errors.length) return fail(errors.join('\n'));
    apply(current => setRecords(current, kind, (kind === 'project' ? current.projects : current.tasks).map(item => item.id === id ? updated : item))); return ok('Запис оновлено');
  };
  const removeInitiative = (kind: InitiativeKind, id: string): MutationResult => {
    const records = recordsFor(kind); const record = records.find(item => item.id === id); if (!record) return fail('Запис не знайдено');
    if (!canDeleteInitiative(record, state.currentUser, state.rolePermissions)) return fail('Видалення заборонено');
    const result = deleteInitiativeRecord(records, id); if (!result.success || !result.data) return fail(result.message);
    apply(current => setRecords(current, kind, result.data!)); return ok(result.message);
  };

  const runMove = (kind: InitiativeKind, cardId: string, toYear: number, toQuarter: Quarter, reason?: string, confirmation?: ScopeMergePreview): MutationResult => {
    const records = recordsFor(kind); const card = records.find(record => record.id === cardId && !record.is_backlog);
    if (!card || !canEditInitiative(card, state.currentUser, state.rolePermissions)) return fail('Перенесення заборонено');
    if (isPeriodLocked(toYear, toQuarter) && !getPermissions(state.currentUser, state.rolePermissions)?.canEditArchive) return fail('Перенесення в архівний період заборонено');
    const result = moveCardRecord(records, { cardId, toYear, toQuarter, reason, author: actor, confirmation });
    if (!result.success || !result.data) return fail(result.message, result.requiresConfirmation);
    const target = records.find(record => !record.is_backlog && record.backlog_id === card.backlog_id && record.year === toYear && record.quarter === toQuarter);
    const changedIds = new Set([cardId, target?.id, `${card.backlog_id}-${toYear}-${toQuarter}`]);
    apply(current => setRecords(current, kind, result.data!.map(record => !record.is_backlog && changedIds.has(record.id) ? withMetricSnapshots(record, current.taskWeights, current.initiativeSizes, true) : record)));
    return ok(result.message);
  };
  const moveCard = (cardId: string, toYear: number, toQuarter: Quarter, isProject: boolean, reason?: string, confirmation?: ScopeMergePreview) => runMove(isProject ? 'project' : 'task', cardId, toYear, toQuarter, reason, confirmation);
  const continueCard = (cardId: string, toYear: number, toQuarter: Quarter, isProject: boolean): MutationResult => {
    const kind: InitiativeKind = isProject ? 'project' : 'task'; const records = recordsFor(kind); const source = records.find(record => record.id === cardId && !record.is_backlog);
    if (!source || !canEditInitiative(source, state.currentUser, state.rolePermissions)) return fail('Продовження заборонено');
    const current = getCurrentPeriod(); const targetIndex = toYear * 10 + qToNum(toQuarter); const currentIndex = current.year * 10 + qToNum(current.quarter); const sourceIndex = source.year * 10 + qToNum(source.quarter);
    if (targetIndex < currentIndex) return fail('Продовження у минулий квартал неможливе. Оберіть поточний або майбутній період.');
    if (targetIndex <= sourceIndex) return fail('Для продовження оберіть квартал після поточної картки.');
    const result = continueCardRecord(records, { cardId, toYear, toQuarter, author: actor, newCardId: `${source.backlog_id}-${toYear}-${toQuarter}` });
    if (!result.success || !result.data) return fail(result.message);
    apply(currentState => setRecords(currentState, kind, result.data!.map(record => !record.is_backlog && record.id === `${source.backlog_id}-${toYear}-${toQuarter}`
      ? withMetricSnapshots(record, currentState.taskWeights, currentState.initiativeSizes, true)
      : record)));
    return ok(result.message);
  };
  const moveInitiative = (backlogId: string, fromYear: number, fromQuarter: Quarter, toYear: number, toQuarter: Quarter, reason: string, isProject: boolean, confirmation?: ScopeMergePreview): MutationResult => {
    const records = isProject ? state.projects : state.tasks; const card = records.find(record => !record.is_backlog && record.backlog_id === backlogId && record.year === fromYear && record.quarter === fromQuarter);
    return card ? moveCard(card.id, toYear, toQuarter, isProject, reason, confirmation) : fail('Картку не знайдено');
  };
  const moveScopeItem = (cardId: string, itemId: string, toYear: number, toQuarter: Quarter, isProject: boolean, reason?: string, confirmation?: ScopeMergePreview): MutationResult => {
    const kind: InitiativeKind = isProject ? 'project' : 'task'; const records = recordsFor(kind); const card = records.find(record => record.id === cardId && !record.is_backlog);
    if (!card || !canEditInitiative(card, state.currentUser, state.rolePermissions)) return fail('Перенесення заборонено');
    if (isPeriodLocked(toYear, toQuarter) && !getPermissions(state.currentUser, state.rolePermissions)?.canEditArchive) return fail('Перенесення в архівний період заборонено');
    const result = moveChecklistItemRecord(records, { cardId, itemId, toYear, toQuarter, reason, confirmation, author: actor, newCardId: `${card.backlog_id}-${toYear}-${toQuarter}` });
    if (!result.success || !result.data) return fail(result.message, result.requiresConfirmation);
    const target = records.find(record => !record.is_backlog && record.backlog_id === card.backlog_id && record.year === toYear && record.quarter === toQuarter);
    const changedIds = new Set([cardId, target?.id, `${card.backlog_id}-${toYear}-${toQuarter}`]);
    apply(current => setRecords(current, kind, result.data!.map(record => !record.is_backlog && changedIds.has(record.id)
      ? withMetricSnapshots(record, current.taskWeights, current.initiativeSizes, true)
      : record)));
    return ok(result.message);
  };

  const savePassport = (command: SavePassportCommand): MutationResult<{ snapshots: number; cards: number }> => {
    const kind = command.kind; const records = recordsFor(kind); const permission = getPermissions(state.currentUser, state.rolePermissions);
    if (!permission?.canCreateEditProjects || permission.isReadOnly) return { ...fail('Недостатньо прав'), data: undefined };
    const sourceCardId = command.source.type === 'card' ? command.source.cardId : undefined;
    const sourceCard = sourceCardId ? records.find(item => !item.is_backlog && item.id === sourceCardId) : undefined;
    const sourceMaster = records.find(item => item.is_backlog && item.id === (command.source.type === 'backlog' ? command.source.masterId : sourceCard?.backlog_id));
    const sourceYear = command.source.type === 'backlog' ? command.source.year : sourceCard?.year;
    if (!sourceMaster || sourceYear === undefined || isBacklogLocked(sourceYear)) return { ...fail('Річний запис недоступний'), data: undefined };
    if (sourceCard && (!canEditInitiative(sourceCard, state.currentUser, state.rolePermissions) || isPeriodLocked(sourceCard.year, sourceCard.quarter))) return { ...fail('Поточна картка є архівною або недоступною'), data: undefined };
    if (sourceCard && command.sourceCardPatch && validateChecklistCapacity(command.sourceCardPatch.checklist, state.taskWeights).length) return { ...fail('Некоректний scope'), data: undefined };
    const years = new Set(command.targets.backlogYears); if (command.source.type === 'backlog') years.add(sourceYear);
    const targetMasters = records.filter(record => record.is_backlog && years.has(record.year) && getChainId(record) === getChainId(sourceMaster));
    if (targetMasters.length !== years.size || targetMasters.some(record => isBacklogLocked(record.year))) return { ...fail('Серед річних записів є відсутній або архівний target'), data: undefined };
    const cardIds = Array.from(new Set(command.targets.cardIds)); const targetCards = cardIds.map(id => records.find(item => !item.is_backlog && item.id === id));
    if (targetCards.some(card => !card || getChainId(card) !== getChainId(sourceMaster) || isPeriodLocked(card.year, card.quarter))) return { ...fail('Серед карток є невалідний або архівний target'), data: undefined };
    const allowed: Array<keyof InitiativePassport> = ['name', 'strategic_goal', 'manager_id', 'priority', 'notes', 'implementer_dept_ids', 'cross_functional_dept_ids', 'custom_fields']; const patch: Partial<InitiativePassport> = {};
    allowed.forEach(key => { if (key in command.passportPatch) Object.assign(patch, { [key]: command.passportPatch[key] }); });
    const event = makeHistory(actor, 'Паспорт синхронізовано');
    const targetMasterIds = new Set(targetMasters.map(record => record.id));
    const next = records.map(record => {
      if (record.is_backlog && targetMasterIds.has(record.id)) { const snapshot = getYearSnapshot(record, record.year)!; return { ...record, ...patch, yearSnapshots: { [String(record.year)]: { ...snapshot, ...patch, history: [event, ...snapshot.history] } }, history: [event, ...(record.history ?? [])] }; }
      if (sourceCard && record.id === sourceCard.id) return withMetricSnapshots({ ...record, ...patch, ...(command.sourceCardPatch ?? {}), history: [event, ...(record.history ?? [])] }, state.taskWeights, state.initiativeSizes, Boolean(command.sourceCardPatch?.checklist));
      if (cardIds.includes(record.id)) return { ...record, ...patch, history: [event, ...(record.history ?? [])] };
      return record;
    });
    apply(current => setRecords(current, kind, next)); return { success: true, message: 'Зміни збережено атомарно', data: { snapshots: targetMasters.length, cards: cardIds.length + (sourceCard && !cardIds.includes(sourceCard.id) ? 1 : 0) } };
  };

  const createBacklogSnapshots = (kind: InitiativeKind, masterIds: string[], sourceYear: number, targetYear: number): MutationResult<{ created: number }> => {
    const records = recordsFor(kind);
    const permission = getPermissions(state.currentUser, state.rolePermissions);
    if (!permission?.canCreateEditProjects || permission.isReadOnly) return fail('Недостатньо прав');
    if (isBacklogLocked(targetYear)) return fail('Не можна створювати архівний snapshot');
    const uniqueIds = Array.from(new Set(masterIds));
    if (uniqueIds.length === 0) return fail('Оберіть хоча б одну ініціативу');
    const masters = uniqueIds.map(id => records.find(record => record.is_backlog && record.id === id));
    if (masters.some(master => !master)) return fail('Одна з обраних ініціатив більше не існує');
    const missingSource = masters.find(master => master && (master.year !== sourceYear || !getYearSnapshot(master, sourceYear)));
    if (missingSource) return fail(`Вихідний snapshot ${sourceYear} для «${missingSource.name}» не знайдено`);
    const duplicate = masters.find(master => master && records.some(record => record.is_backlog && record.year === targetYear && getChainId(record) === getChainId(master)));
    if (duplicate) return fail(`Ініціативу «${duplicate.name}» вже продовжено на ${targetYear} рік`);

    const next = [...records];
    masters.forEach(master => {
      if (!master) return;
      const annualCards = records.filter(record => !record.is_backlog && record.backlog_id === master.id);
      const source = annualCards.sort((a, b) => b.quarter.localeCompare(a.quarter))[0] ?? master;
      const copiedStage = preparationFrom(source);
      const event = makeHistory(actor, `Створено підготовчий етап ${targetYear} року на основі ${sourceYear} року`);
      const snapshot: InitiativeYearSnapshot = { ...passportFrom(master), year: targetYear, history: [event], preparationStage: { ...copiedStage, history: [event] } };
      next.push({ ...master, ...passportFrom(snapshot), id: `${getChainId(master)}-Y${targetYear}`, initiative_chain_id: getChainId(master), year: targetYear, checklist: [], is_backlog: true, backlog_id: undefined, health_status: 'DEFAULT', yearSnapshots: { [String(targetYear)]: snapshot }, history: [event, ...(master.history ?? [])] });
    });
    apply(current => setRecords(current, kind, next));
    return ok(`Продовжено ініціатив: ${uniqueIds.length}`, { created: uniqueIds.length });
  };

  const createBacklogSnapshot = (kind: InitiativeKind, masterId: string, sourceYear: number, targetYear: number): MutationResult => {
    const result = createBacklogSnapshots(kind, [masterId], sourceYear, targetYear);
    return result.success ? ok('Snapshot створено') : fail(result.message);
  };

  const createBacklogWithCards = (kind: InitiativeKind, raw: Project | OperationalTask, quarters: Quarter[], initialScope: Project['checklist'] = []): MutationResult => {
    const permission = getPermissions(state.currentUser, state.rolePermissions); const records = recordsFor(kind);
    if (!permission?.canCreateEditProjects || permission.isReadOnly) return fail('Недостатньо прав');
    if (isBacklogLocked(raw.year)) return fail('Не можна створювати ініціативу в архівному році');
    if (records.some(record => record.id === raw.id)) return fail('ID вже використовується');
    const chain = raw.initiative_chain_id ?? raw.id;
    const sourceSnapshot = getYearSnapshot(raw, raw.year) ?? toSnapshot(raw);
    const snapshot: InitiativeYearSnapshot = { ...sourceSnapshot, year: raw.year, preparationStage: sourceSnapshot.preparationStage ?? { ...preparationFrom(raw), history: [] } };
    const master = sanitizeInitiative({ ...raw, ...passportFrom(snapshot), initiative_chain_id: chain, is_backlog: true, checklist: [], yearSnapshots: { [String(raw.year)]: snapshot } });
    const uniqueQuarters = Array.from(new Set(quarters));
    if (uniqueQuarters.some(quarter => isPeriodLocked(master.year, quarter))) return fail('Серед вибраних кварталів є архівний');
    const passport = getYearSnapshot(master, master.year) ?? toSnapshot(master);
    const cards = uniqueQuarters.map(quarter => withMetricSnapshots(sanitizeInitiative({
      ...master, ...passportFrom(passport), id: `${master.id}-${master.year}-${quarter}`,
      is_backlog: false, backlog_id: master.id, initiative_chain_id: chain, yearSnapshots: undefined,
      quarter, health_status: 'DEFAULT' as const, checklist: initialScope.map(item => ({ ...item })), history: [],
    }), state.taskWeights, state.initiativeSizes, true));
    apply(current => setRecords(current, kind, [...(kind === 'project' ? current.projects : current.tasks), master, ...cards]));
    return ok('Ініціативу та квартальні картки створено');
  };

  const updatePreparationStage = (kind: InitiativeKind, masterId: string, patch: Partial<InitiativePassport>): MutationResult => {
    const records = recordsFor(kind); const master = records.find(record => record.is_backlog && record.id === masterId);
    const permission = getPermissions(state.currentUser, state.rolePermissions);
    if (!master || !permission?.canCreateEditProjects || permission.isReadOnly || isBacklogLocked(master.year)) return fail('Редагування підготовчого етапу заборонено');
    const snapshot = getYearSnapshot(master, master.year); if (!snapshot) return fail('Річний запис невалідний');
    const event = makeHistory(actor, 'Оновлено підготовчий етап');
    const stage = { ...(snapshot.preparationStage ?? preparationFrom(master)), manager_id: patch.manager_id, priority: patch.priority, cross_functional_dept_ids: [...(patch.cross_functional_dept_ids ?? [])], notes: patch.notes, custom_fields: patch.custom_fields, history: [event, ...(snapshot.preparationStage?.history ?? [])] };
    apply(current => setRecords(current, kind, (kind === 'project' ? current.projects : current.tasks).map(record => record.id === master.id ? { ...record, ...stage, implementer_dept_ids: [], yearSnapshots: { ...record.yearSnapshots, [String(master.year)]: { ...snapshot, preparationStage: stage } }, history: [event, ...(record.history ?? [])] } : record)));
    return ok('Підготовчий етап оновлено');
  };

  const adminMutation = (message: string, update: StateUpdater): MutationResult => { if (!adminAllowed()) return fail('Недостатньо прав адміністратора'); apply(update); return ok(message); };
  const listOps = <T extends { id: string }>(key: keyof AppDataState) => ({
    add: (item: T) => adminMutation('Запис додано', current => ({ ...current, [key]: [...(current[key] as unknown as T[]), item] } as AppDataState)),
    update: (id: string, patch: Partial<T>) => adminMutation('Запис оновлено', current => ({ ...current, [key]: (current[key] as unknown as T[]).map(item => item.id === id ? { ...item, ...patch } : item) } as AppDataState)),
    remove: (id: string) => adminMutation('Запис видалено', current => ({ ...current, [key]: (current[key] as unknown as T[]).filter(item => item.id !== id) } as AppDataState)),
  });
  const priorityOps = listOps<PriorityDef>('priorities'); const initiativeStatusOps = listOps<InitiativeStatusDef>('initiativeStatuses'); const departmentOps = listOps<Department>('departments'); const managerOps = listOps<Manager>('managers'); const customFieldOps = listOps<CustomFieldDef>('customFields');
  type DictionaryEntity = 'department' | 'manager' | 'priority' | 'status';
  const checkDictionaryDeletion = (entity: DictionaryEntity, id: string): MutationResult => {
    const definition = entity === 'department' ? state.departments.find(item => item.id === id)
      : entity === 'manager' ? state.managers.find(item => item.id === id)
        : entity === 'priority' ? state.priorities.find(item => item.id === id) : state.initiativeStatuses.find(item => item.id === id);
    const entityName = entity === 'department' ? 'відділ' : entity === 'manager' ? 'менеджера' : entity === 'priority' ? 'пріоритет' : 'статус ініціативи';
    if (!definition) return fail(`Не вдалося знайти ${entityName}`);
    if (!adminAllowed()) return fail('Недостатньо прав адміністратора');

    const usages = new Set<string>();
    const usesPassport = (passport: Pick<InitiativePassport, 'manager_id' | 'priority' | 'implementer_dept_ids' | 'cross_functional_dept_ids'>, location: string) => {
      const used = entity === 'manager' ? passport.manager_id === id
        : entity === 'priority' ? passport.priority === id
          : entity === 'department' ? passport.implementer_dept_ids.includes(id) || passport.cross_functional_dept_ids.includes(id) : false;
      if (used) usages.add(location);
    };
    const usesStage = (stage: InitiativeYearSnapshot['preparationStage']) => {
      if (!stage) return;
      const used = entity === 'manager' ? stage.manager_id === id
        : entity === 'priority' ? stage.priority === id
          : entity === 'department' ? stage.cross_functional_dept_ids.includes(id) : false;
      if (used) usages.add('підготовчих етапах');
    };
    for (const record of [...state.projects, ...state.tasks]) {
      usesPassport(record, record.is_backlog ? 'річних записах беклогу' : 'квартальних картках');
      if (record.is_backlog) Object.values(record.yearSnapshots ?? {}).forEach(snapshot => {
        usesPassport(snapshot, 'річних записах беклогу');
        usesStage(snapshot.preparationStage);
      });
      if (entity === 'department' && !record.is_backlog && record.checklist.some(item => item.implementer_dept_ids?.includes(id))) usages.add('завданнях обсягу робіт');
      if (entity === 'status' && !record.is_backlog && record.health_status === id) usages.add('квартальних картках');
    }
    if (entity === 'department') {
      if (state.managers.some(manager => manager.department_id === id)) usages.add('налаштуваннях менеджерів');
      if (state.users.some(user => user.departmentId === id)) usages.add('профілях користувачів');
    }
    if (usages.size) return fail(`Неможливо видалити ${entityName}: значення використовується у ${Array.from(usages).join(', ')}. Спочатку приберіть або замініть ці посилання.`);
    return ok('Видалення дозволено');
  };
  const checkDepartmentDeletion = (id: string) => checkDictionaryDeletion('department', id);
  const checkManagerDeletion = (id: string) => checkDictionaryDeletion('manager', id);
  const checkPriorityDeletion = (id: string) => checkDictionaryDeletion('priority', id);
  const checkInitiativeStatusDeletion = (id: string) => checkDictionaryDeletion('status', id);
  const deleteDepartment = (id: string) => { const check = checkDepartmentDeletion(id); return check.success ? departmentOps.remove(id) : check; };
  const deleteManager = (id: string) => { const check = checkManagerDeletion(id); return check.success ? managerOps.remove(id) : check; };
  const deletePriority = (id: string) => { const check = checkPriorityDeletion(id); return check.success ? priorityOps.remove(id) : check; };
  const deleteInitiativeStatus = (id: string) => { const check = checkInitiativeStatusDeletion(id); return check.success ? initiativeStatusOps.remove(id) : check; };
  const normalizedStatusName = (name: string) => name.trim().toLocaleLowerCase('uk-UA');
  const validateInitiativeStatus = (candidate: InitiativeStatusDef, ignoredId?: string): MutationResult => {
    if (!candidate.name.trim()) return fail('Вкажіть назву статусу');
    if (!/^#[0-9a-f]{6}$/i.test(candidate.color)) return fail('Вкажіть коректний колір');
    if (state.initiativeStatuses.some(status => status.id !== ignoredId && normalizedStatusName(status.name) === normalizedStatusName(candidate.name))) return fail('Назва статусу має бути унікальною');
    return ok('Статус валідний');
  };
  const addInitiativeStatus = (item: InitiativeStatusDef): MutationResult => { const candidate = { ...item, name: item.name.trim() }; const check = validateInitiativeStatus(candidate); return check.success ? adminMutation('Статус додано', current => ({ ...current, initiativeStatuses: [...current.initiativeStatuses, candidate] })) : check; };
  const updateInitiativeStatus = (id: string, patch: Partial<InitiativeStatusDef>): MutationResult => { const current = state.initiativeStatuses.find(status => status.id === id); if (!current) return fail('Статус не знайдено'); const candidate = { ...current, ...patch, name: (patch.name ?? current.name).trim() }; const check = validateInitiativeStatus(candidate, id); return check.success ? adminMutation('Статус оновлено', appState => ({ ...appState, initiativeStatuses: appState.initiativeStatuses.map(status => status.id === id ? candidate : status) })) : check; };
  const normalizedWeightName = (name: string) => name.trim().toLocaleLowerCase('uk-UA');
  const validateWeight = (candidate: TaskWeightDef, ignoredId?: string): MutationResult => {
    if (!candidate.name.trim()) return fail('Вкажіть назву ваги');
    if (!Number.isFinite(candidate.weight) || candidate.weight < 0) return fail('Вага не може бути від’ємною');
    if (state.taskWeights.some(weight => weight.id !== ignoredId && normalizedWeightName(weight.name) === normalizedWeightName(candidate.name))) return fail('Назва ваги має бути унікальною');
    return ok('Вага валідна');
  };
  const addTaskWeight = (item: TaskWeightDef): MutationResult => { const check = validateWeight(item); return check.success ? adminMutation('Вагу додано', current => ({ ...current, taskWeights: [...current.taskWeights, { ...item, name: item.name.trim() }] })) : check; };
  const updateTaskWeight = (id: string, patch: Partial<TaskWeightDef>): MutationResult => { const item = state.taskWeights.find(weight => weight.id === id); if (!item) return fail('Вагу не знайдено'); const candidate = { ...item, ...patch, name: (patch.name ?? item.name).trim() }; const check = validateWeight(candidate, id); return check.success ? adminMutation('Вагу оновлено', current => ({ ...current, taskWeights: current.taskWeights.map(weight => weight.id === id ? candidate : weight) })) : check; };
  const deleteTaskWeight = (id: string): MutationResult => adminMutation('Вагу видалено. Знімки у картках збережено', current => ({ ...current, taskWeights: current.taskWeights.filter(item => item.id !== id) }));
  const applyTaskWeightToOpenCards = (id: string): MutationResult<{ cards: number; tasks: number }> => {
    const definition = state.taskWeights.find(weight => weight.id === id); if (!definition) return fail('Вагу не знайдено'); if (!adminAllowed()) return fail('Недостатньо прав адміністратора');
    let cards = 0; let tasksCount = 0;
    const updateRecords = <T extends Initiative>(records: T[]): T[] => records.map(record => {
      if (record.is_backlog || isPeriodLocked(record.year, record.quarter)) return record;
      let changed = false;
      const checklist = record.checklist.map(item => {
        if (item.weightId !== id && item.weightSnapshot?.definitionId !== id) return item;
        changed = true; tasksCount += 1; return { ...item, weightId: id, weightSnapshot: makeWeightSnapshot(definition) };
      });
      if (!changed) return record; cards += 1;
      return withMetricSnapshots({ ...record, checklist }, state.taskWeights, state.initiativeSizes, true);
    });
    apply(current => ({ ...current, projects: updateRecords(current.projects), tasks: updateRecords(current.tasks) }));
    return ok(`Оновлено задач: ${tasksCount}`, { cards, tasks: tasksCount });
  };
  const refreshOpenInitiativeSizes = (): MutationResult<{ cards: number }> => {
    if (!adminAllowed()) return fail('Недостатньо прав адміністратора'); let cards = 0;
    const refresh = <T extends Initiative>(records: T[]): T[] => records.map(record => {
      if (record.is_backlog || isPeriodLocked(record.year, record.quarter)) return record;
      cards += 1; return withMetricSnapshots(record, state.taskWeights, state.initiativeSizes, true);
    });
    apply(current => ({ ...current, projects: refresh(current.projects), tasks: refresh(current.tasks) }));
    return ok(`Розмір оновлено в картках: ${cards}`, { cards });
  };
  const validateSize = (candidate: InitiativeSizeDef, ignoredId?: string): MutationResult => { if (candidate.min_score < 0 || candidate.max_score < candidate.min_score) return fail('Некоректний діапазон розміру'); const overlap = state.initiativeSizes.some(size => size.id !== ignoredId && size.is_active && candidate.is_active && candidate.min_score <= size.max_score && candidate.max_score >= size.min_score); return overlap ? fail('Діапазон перетинається з іншим активним розміром') : ok('Діапазон валідний'); };
  const addInitiativeSize = (item: InitiativeSizeDef): MutationResult => { const check = validateSize(item); return check.success ? adminMutation('Розмір додано', current => ({ ...current, initiativeSizes: [...current.initiativeSizes, item] })) : check; };
  const updateInitiativeSize = (id: string, patch: Partial<InitiativeSizeDef>): MutationResult => { const item = state.initiativeSizes.find(size => size.id === id); if (!item) return fail('Розмір не знайдено'); const check = validateSize({ ...item, ...patch }, id); return check.success ? adminMutation('Розмір оновлено', current => ({ ...current, initiativeSizes: current.initiativeSizes.map(size => size.id === id ? { ...size, ...patch } : size) })) : check; };
  const deleteInitiativeSize = (id: string) => adminMutation('Розмір видалено', current => ({ ...current, initiativeSizes: current.initiativeSizes.filter(item => item.id !== id) }));

  const getFullDataSnapshot = (): FullExportData => ({
    version: '5.0', exportedAt: new Date().toISOString(), exportedBy: state.currentUser ? { id: state.currentUser.id, name: state.currentUser.name, email: state.currentUser.email, role: state.currentUser.role } : undefined,
    departments: state.departments, priorities: state.priorities, initiativeStatuses: state.initiativeStatuses, taskWeights: state.taskWeights, initiativeSizes: state.initiativeSizes,
    managers: state.managers, projects: state.projects, tasks: state.tasks, users: state.users, rolePermissions: state.rolePermissions, customFields: state.customFields,
  });
  const importFullData = (raw: FullExportData, mode: 'replace' | 'merge') => {
    const validation = validateExportData(raw); const counts = { projects: raw?.projects?.length ?? 0, tasks: raw?.tasks?.length ?? 0 };
    if (!validation.success || !validation.data) return { success: false, message: validation.message, counts };
    if (!adminAllowed()) return { success: false, message: 'Недостатньо прав адміністратора', counts };
    const data = validation.data;
    apply(current => { const select = <T extends { id: string }>(existing: T[], incoming: T[]) => mode === 'replace' ? incoming : mergeById(existing, incoming); return {
      ...current, departments: select(current.departments, data.departments), priorities: select(current.priorities, data.priorities), initiativeStatuses: select(current.initiativeStatuses, data.initiativeStatuses), taskWeights: select(current.taskWeights, data.taskWeights), initiativeSizes: select(current.initiativeSizes, data.initiativeSizes), managers: select(current.managers, data.managers),
      projects: select(current.projects, data.projects).map(sanitizeInitiative), tasks: select(current.tasks, data.tasks).map(sanitizeInitiative), users: select(current.users, data.users), rolePermissions: mode === 'replace' ? data.rolePermissions : data.rolePermissions.reduce<RolePermissions[]>((acc, permission) => [...acc.filter(item => item.role !== permission.role), permission], current.rolePermissions), customFields: select(current.customFields, data.customFields),
    }; });
    return { success: true, message: mode === 'replace' ? 'Дані повністю замінено' : 'Дані об’єднано', data: counts, counts };
  };

  const value: AppContextType = {
    ...state, login, logout, addUser, updateUser, deleteUser,
    addProject: project => addInitiative('project', project), updateProject: (id, patch) => updateInitiative<Project>('project', id, patch), deleteProject: id => removeInitiative('project', id),
    addTask: task => addInitiative('task', task), updateTask: (id, patch) => updateInitiative<OperationalTask>('task', id, patch), deleteTask: id => removeInitiative('task', id),
    moveInitiative, moveCard, continueCard, moveScopeItem, savePassport, createBacklogSnapshot, createBacklogSnapshots, createBacklogWithCards, updatePreparationStage,
    addPriority: priorityOps.add, updatePriority: priorityOps.update, deletePriority, addInitiativeStatus, updateInitiativeStatus, deleteInitiativeStatus,
    addTaskWeight, updateTaskWeight, deleteTaskWeight, applyTaskWeightToOpenCards, refreshOpenInitiativeSizes, addInitiativeSize, updateInitiativeSize, deleteInitiativeSize,
    addDepartment: departmentOps.add, updateDepartment: departmentOps.update, deleteDepartment,
    addManager: managerOps.add, updateManager: managerOps.update, deleteManager,
    checkDepartmentDeletion, checkManagerDeletion, checkPriorityDeletion, checkInitiativeStatusDeletion,
    updateRolePermission: (role, patch) => adminMutation('Права оновлено', current => ({ ...current, rolePermissions: current.rolePermissions.map(item => item.role === role ? { ...item, ...patch } : item) })),
    addCustomField: customFieldOps.add, updateCustomField: customFieldOps.update, deleteCustomField: customFieldOps.remove,
    getFullDataSnapshot, importFullData,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
export const useAppContext = (): AppContextType => { const context = useContext(AppContext); if (!context) throw new Error('useAppContext must be used within AppProvider'); return context; };
