import { ChecklistItem, HistoryEvent, InitiativePassport, InitiativeYearSnapshot, MutationResult, OperationalTask, PreparationStage, Project, Quarter, ScopeMergePreview } from '../types';

export type InitiativeRecord = Project | OperationalTask;
export const isCompletedItem = (item: ChecklistItem) => item.is_completed || item.color === 'GREEN';
export const makeHistory = (author: string, action: string): HistoryEvent => ({ id: `H-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: new Date().toISOString(), author, action });
export const passportFrom = (record: InitiativePassport): InitiativePassport => ({ name: record.name, strategic_goal: record.strategic_goal, manager_id: record.manager_id, priority: record.priority, notes: record.notes, implementer_dept_ids: [...(record.implementer_dept_ids ?? [])], cross_functional_dept_ids: [...(record.cross_functional_dept_ids ?? [])], custom_fields: record.custom_fields ? { ...record.custom_fields } : undefined });
export const preparationFrom = (record: InitiativePassport): PreparationStage => ({ manager_id: record.manager_id, priority: record.priority, cross_functional_dept_ids: [...(record.cross_functional_dept_ids ?? [])], notes: record.notes, custom_fields: record.custom_fields ? { ...record.custom_fields } : undefined, history: [] });
export const getYearSnapshot = (master: InitiativeRecord, year: number): InitiativeYearSnapshot | undefined => master.yearSnapshots?.[String(year)];
export const getChainId = (record: InitiativeRecord): string => record.initiative_chain_id ?? record.backlog_id ?? record.id;
export const materializeBacklogYear = <T extends InitiativeRecord>(master: T, year: number): T | undefined => { const snapshot = getYearSnapshot(master, year); return snapshot ? { ...master, ...passportFrom(snapshot), year, checklist: [] } : undefined; };

/** Normalize legacy multi-year masters into annual masters with a stable chain id. */
export const reconcileBacklogYears = <T extends InitiativeRecord>(records: T[]): T[] => {
  const links = new Map<string, string>(); const masters: T[] = [];
  records.filter(record => record.is_backlog).forEach(master => {
    const snapshots = master.yearSnapshots && Object.keys(master.yearSnapshots).length ? master.yearSnapshots : { [String(master.year)]: { ...passportFrom(master), year: master.year, history: [] } };
    const chain = getChainId(master);
    Object.entries(snapshots).forEach(([rawYear, snapshot]) => {
      const year = Number(rawYear); const id = year === master.year ? master.id : `${master.id}-Y${year}`;
      links.set(`${master.id}:${year}`, id);
      masters.push({ ...master, ...passportFrom(snapshot), id, initiative_chain_id: chain, year, checklist: [], yearSnapshots: { [String(year)]: { ...snapshot, year, preparationStage: snapshot.preparationStage ?? preparationFrom(snapshot) } } } as T);
    });
  });
  return [...masters, ...records.filter(record => !record.is_backlog).map(card => ({ ...card, backlog_id: card.backlog_id ? (links.get(`${card.backlog_id}:${card.year}`) ?? card.backlog_id) : undefined, initiative_chain_id: card.initiative_chain_id ?? getChainId(card) } as T))];
};

const annualMaster = <T extends InitiativeRecord>(records: T[], chain: string, year: number) => records.find(record => record.is_backlog && getChainId(record) === chain && record.year === year);
const createAnnualMaster = <T extends InitiativeRecord>(source: T, targetYear: number, author: string): T => {
  const chain = getChainId(source); const snapshot = source.is_backlog ? (getYearSnapshot(source, source.year) ?? { ...passportFrom(source), year: source.year, history: [] }) : { ...passportFrom(source), year: source.year, history: [] };
  const stage = source.is_backlog ? (snapshot.preparationStage ?? preparationFrom(source)) : preparationFrom(source);
  const event = makeHistory(author, `Створено річний запис беклогу на ${targetYear} рік`);
  const targetSnapshot: InitiativeYearSnapshot = { ...passportFrom(snapshot), year: targetYear, history: [event], preparationStage: { ...stage, history: [event, ...(stage.history ?? [])] } };
  return { ...source, ...passportFrom(targetSnapshot), id: `${chain}-Y${targetYear}`, initiative_chain_id: chain, year: targetYear, quarter: 'Q1', health_status: 'DEFAULT', checklist: [], is_backlog: true, backlog_id: undefined, yearSnapshots: { [String(targetYear)]: targetSnapshot }, history: [event, ...(source.history ?? [])] } as T;
};
const ensureAnnualMaster = <T extends InitiativeRecord>(records: T[], source: T, targetYear: number, author: string) => {
  const current = annualMaster(records, getChainId(source), targetYear);
  if (current) return { records, master: current };
  const master = createAnnualMaster(source, targetYear, author);
  return { records: [...records, master], master };
};
const token = (source: InitiativeRecord, target: InitiativeRecord, itemIds: string[]) => JSON.stringify({ source: [source.id, source.checklist], target: [target.id, target.checklist], itemIds });

export const previewScopeMerge = <T extends InitiativeRecord>(records: T[], sourceCardId: string, targetCardId: string, itemIds?: string[]): MutationResult<ScopeMergePreview> => {
  const source = records.find(record => !record.is_backlog && record.id === sourceCardId); const target = records.find(record => !record.is_backlog && record.id === targetCardId);
  if (!source || !target) return { success: false, message: 'Вихідну або цільову картку не знайдено' };
  if (getChainId(source) !== getChainId(target)) return { success: false, message: 'Завдання можна об’єднати лише в межах однієї ініціативи' };
  const ids = itemIds ?? source.checklist.map(item => item.id); const incoming = source.checklist.filter(item => ids.includes(item.id));
  if (incoming.length !== ids.length) return { success: false, message: 'Частина завдань більше не існує у вихідній картці' };
  if (incoming.some(isCompletedItem)) return { success: false, message: 'Виконане або зелене завдання переносити не можна' };
  const duplicateItemIds = incoming.filter(item => target.checklist.some(candidate => candidate.id === item.id)).map(item => item.id);
  const preview: ScopeMergePreview = { token: token(source, target, ids), sourceCardId, targetCardId, sourcePeriod: `${source.quarter} ${source.year}`, targetPeriod: `${target.quarter} ${target.year}`, incomingCount: incoming.length, addedCount: incoming.length - duplicateItemIds.length, duplicateItemIds, deletesSource: source.checklist.length === ids.length };
  return { success: true, message: 'Потрібне підтвердження об’єднання завдань', data: preview, requiresConfirmation: preview };
};
export interface CommitScopeMergeInput { preview: ScopeMergePreview; itemIds?: string[]; author: string; reason?: string }
export const commitScopeMerge = <T extends InitiativeRecord>(records: T[], input: CommitScopeMergeInput): MutationResult<T[]> => {
  const check = previewScopeMerge(records, input.preview.sourceCardId, input.preview.targetCardId, input.itemIds);
  if (!check.success || !check.data) return { success: false, message: check.message };
  if (check.data.token !== input.preview.token) return { success: false, message: 'Дані змінилися після перегляду. Повторіть об’єднання' };
  const source = records.find(record => record.id === input.preview.sourceCardId)!; const target = records.find(record => record.id === input.preview.targetCardId)!; const ids = input.itemIds ?? source.checklist.map(item => item.id); const targetIds = new Set(target.checklist.map(item => item.id)); const incoming = source.checklist.filter(item => ids.includes(item.id) && !targetIds.has(item.id)); const remaining = source.checklist.filter(item => !ids.includes(item.id));
  const event = makeHistory(input.author, `Завдання об’єднано з ${check.data.sourcePeriod} у ${check.data.targetPeriod}.${input.reason?.trim() ? ` Причина: ${input.reason.trim()}` : ''}`);
  return { success: true, message: 'Завдання об’єднано', data: records.filter(record => record.id !== source.id || remaining.length > 0).map(record => record.id === source.id ? { ...record, checklist: remaining } : record.id === target.id ? { ...record, checklist: [...record.checklist, ...incoming.map(item => ({ ...item, moved_from: check.data!.sourcePeriod }))], history: [event, ...(record.history ?? []), ...(source.history ?? [])] } : record) as T[] };
};

export interface MoveCardInput { cardId: string; toYear: number; toQuarter: Quarter; reason?: string; author: string; confirmation?: ScopeMergePreview }
export const moveCard = <T extends InitiativeRecord>(records: T[], input: MoveCardInput): MutationResult<T[]> => {
  const card = records.find(record => record.id === input.cardId && !record.is_backlog);
  if (!card || !card.backlog_id) return { success: false, message: 'Квартальну картку не знайдено або вона не пов’язана з беклогом' };
  if (card.checklist.some(isCompletedItem)) return { success: false, message: 'Картку з виконаними або зеленими завданнями переносити не можна' };
  if (card.year === input.toYear && card.quarter === input.toQuarter) return { success: false, message: 'Оберіть інший квартал або рік' };
  const chain = getChainId(card); if (records.some(record => !record.is_backlog && record.id !== card.id && getChainId(record) === chain && record.year === input.toYear && record.quarter === input.toQuarter)) return { success: false, message: `У ${input.toQuarter} ${input.toYear} вже є картка цієї ініціативи. Повне перенесення неможливе; переносьте окремі завдання.` };
  const prepared = ensureAnnualMaster(records, card, input.toYear, input.author); const event = makeHistory(input.author, `Картку перенесено з ${card.quarter} ${card.year} до ${input.toQuarter} ${input.toYear}`);
  return { success: true, message: 'Картку перенесено', data: prepared.records.map(record => record.id === card.id ? { ...record, backlog_id: prepared.master.id, initiative_chain_id: chain, year: input.toYear, quarter: input.toQuarter, health_status: 'DEFAULT', moved_from: `${card.quarter} ${card.year}`, history: [event, ...(record.history ?? [])] } : record) as T[] };
};

/** Creates a new empty quarterly card while preserving the source card and its annual backlog chain. */
export const continueCard = <T extends InitiativeRecord>(records: T[], input: Omit<MoveCardInput, 'confirmation'> & { newCardId: string }): MutationResult<T[]> => {
  const source = records.find(record => record.id === input.cardId && !record.is_backlog);
  if (!source || !source.backlog_id) return { success: false, message: 'Квартальну картку не знайдено або вона не пов’язана з беклогом' };
  if (source.year === input.toYear && source.quarter === input.toQuarter) return { success: false, message: 'Для продовження оберіть інший квартал або рік' };
  const chain = getChainId(source);
  if (records.some(record => !record.is_backlog && getChainId(record) === chain && record.year === input.toYear && record.quarter === input.toQuarter)) {
    return { success: false, message: `У ${input.toQuarter} ${input.toYear} вже є картка цієї ініціативи. Продовження неможливе.` };
  }
  const prepared = ensureAnnualMaster(records, source, input.toYear, input.author);
  const event = makeHistory(input.author, `Ініціативу продовжено з ${source.quarter} ${source.year} до ${input.toQuarter} ${input.toYear}`);
  const copy = {
    ...source,
    id: input.newCardId,
    backlog_id: prepared.master.id,
    initiative_chain_id: chain,
    year: input.toYear,
    quarter: input.toQuarter,
    health_status: 'DEFAULT',
    checklist: [],
    yearSnapshots: undefined,
    moved_from: undefined,
    history: [event],
  } as T;
  return { success: true, message: 'Створено нову картку без завдань обсягу робіт', data: [...prepared.records, copy] };
};
export interface MoveChecklistItemInput extends Omit<MoveCardInput, 'confirmation'> { itemId: string; newCardId: string; confirmation?: ScopeMergePreview }
export const moveChecklistItem = <T extends InitiativeRecord>(records: T[], input: MoveChecklistItemInput): MutationResult<T[]> => {
  const source = records.find(record => record.id === input.cardId && !record.is_backlog); if (!source || !source.backlog_id) return { success: false, message: 'Вихідну картку не знайдено' }; const item = source.checklist.find(candidate => candidate.id === input.itemId); if (!item) return { success: false, message: 'Завдання не знайдено' }; if (isCompletedItem(item)) return { success: false, message: 'Виконане або зелене завдання переносити не можна' };
  const chain = getChainId(source); const existing = records.find(record => !record.is_backlog && getChainId(record) === chain && record.year === input.toYear && record.quarter === input.toQuarter);
  if (existing) { const preview = previewScopeMerge(records, source.id, existing.id, [item.id]); if (!preview.success || !preview.data) return { success: false, message: preview.message }; return input.confirmation ? commitScopeMerge(records, { preview: input.confirmation, itemIds: [item.id], author: input.author, reason: input.reason }) : { success: false, message: preview.message, requiresConfirmation: preview.data }; }
  const prepared = ensureAnnualMaster(records, source, input.toYear, input.author); const snapshot = getYearSnapshot(prepared.master, input.toYear)!; const stage = snapshot.preparationStage ?? preparationFrom(prepared.master); const event = makeHistory(input.author, `Завдання «${item.text}» перенесено з ${source.quarter} ${source.year} до ${input.toQuarter} ${input.toYear}`); const remaining = source.checklist.filter(candidate => candidate.id !== item.id);
  const next = prepared.records.filter(record => record.id !== source.id || remaining.length > 0).map(record => record.id === source.id ? { ...record, checklist: remaining } : record) as T[];
  next.push({ ...prepared.master, ...passportFrom(snapshot), ...stage, implementer_dept_ids: [], id: input.newCardId, is_backlog: false, backlog_id: prepared.master.id, initiative_chain_id: chain, year: input.toYear, quarter: input.toQuarter, health_status: 'DEFAULT', checklist: [{ ...item, moved_from: `${source.quarter} ${source.year}` }], yearSnapshots: undefined, moved_from: `${source.quarter} ${source.year}`, history: [event] } as T); return { success: true, message: 'Завдання перенесено', data: next };
};
export const deleteInitiative = <T extends InitiativeRecord>(records: T[], id: string): MutationResult<T[]> => { const record = records.find(item => item.id === id); if (!record) return { success: false, message: 'Запис не знайдено' }; if (record.is_backlog && records.some(item => !item.is_backlog && item.backlog_id === id)) return { success: false, message: 'Річний запис беклогу має пов’язані квартальні картки' }; if (!record.is_backlog && record.checklist.some(isCompletedItem)) return { success: false, message: 'Картку з виконаними завданнями видалити не можна' }; return { success: true, message: 'Запис видалено', data: records.filter(item => item.id !== id) }; };
