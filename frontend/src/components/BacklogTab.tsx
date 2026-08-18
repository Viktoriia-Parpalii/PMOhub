import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, ClipboardList, Edit2, Eye, FolderOpen, Plus, Trash2, X } from 'lucide-react';
import { useAppContext } from '../store';
import { OperationalTask, Project, Quarter } from '../types';
import { canViewInitiative, getPermissions } from '../domain/permissions';
import { getChainId, getYearSnapshot, isCompletedItem, materializeBacklogYear, passportFrom } from '../domain/initiatives';
import { getHealthStatusPresentation } from '../domain/health';
import { getPriorityBadgeClass } from '../domain/priority';
import { getAvailableYears, getCurrentPeriod, isBacklogLocked } from '../utils';
import { BacklogModal } from './BacklogModal';
import { PreparationStageModal } from './PreparationStageModal';
import { InitiativeCardModal } from './InitiativeCardModal';

type Tab = 'PROJECTS' | 'TASKS';
type Initiative = Project | OperationalTask;
type QuarterFilter = 'ALL' | Quarter;
const quarters: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const getScopeProgress = (card: Initiative) => {
  const total = card.checklist.length;
  const completed = card.checklist.filter(isCompletedItem).length;
  return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
};

const taskCountLabel = (count: number) => {
  const remainder = count % 10;
  const remainderHundred = count % 100;
  if (remainder === 1 && remainderHundred !== 11) return `${count} завдання`;
  if (remainder >= 2 && remainder <= 4 && (remainderHundred < 12 || remainderHundred > 14)) return `${count} завдання`;
  return `${count} завдань`;
};

export const BacklogTab = () => {
  const {
    projects, tasks, managers, priorities, departments, currentUser, rolePermissions,
    addProject, addTask, updateProject, updateTask, deleteProject, deleteTask, createBacklogSnapshots,
  } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('PROJECTS');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilter>('ALL');
  const [nameSearch, setNameSearch] = useState('');
  const [goalSearch, setGoalSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [editingItem, setEditingItem] = useState<Initiative | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSelectingForExtension, setIsSelectingForExtension] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [preparationItem, setPreparationItem] = useState<Initiative | null>(null);
  const [editingCard, setEditingCard] = useState<Initiative | null>(null);
  const [masterToDelete, setMasterToDelete] = useState<Initiative | null>(null);

  const records: Initiative[] = activeTab === 'PROJECTS' ? projects : tasks;
  const permission = getPermissions(currentUser, rolePermissions);
  const archive = isBacklogLocked(selectedYear);
  const canEdit = Boolean(permission?.canCreateEditProjects && !permission.isReadOnly && !archive);
  const targetYear = selectedYear + 1;
  const visibleQuarters = quarterFilter === 'ALL' ? quarters : [quarterFilter];
  const currentPeriod = getCurrentPeriod();
  const periodIndex = (year: number, quarter: Quarter) => year * 10 + Number(quarter.slice(1));
  const isPastQuarter = (quarter: Quarter) => periodIndex(selectedYear, quarter) < periodIndex(currentPeriod.year, currentPeriod.quarter);

  const materializeVisibleMasters = (source: Initiative[]) => source
    .filter(record => record.is_backlog && record.year === selectedYear && record.yearSnapshots?.[String(selectedYear)])
    .map(record => materializeBacklogYear(record, selectedYear)!)
    .filter(record => canViewInitiative(record, currentUser));

  const allMasters = useMemo(
    () => materializeVisibleMasters(records),
    [records, selectedYear, currentUser],
  );
  const projectCount = useMemo(() => materializeVisibleMasters(projects).length, [projects, selectedYear, currentUser]);
  const taskCount = useMemo(() => materializeVisibleMasters(tasks).length, [tasks, selectedYear, currentUser]);

  const masters = useMemo(() => allMasters.filter(record => {
    const nameQuery = nameSearch.trim().toLowerCase();
    const goalQuery = goalSearch.trim().toLowerCase();
    return (!nameQuery || record.name.toLowerCase().includes(nameQuery))
      && (!goalQuery || (record.strategic_goal ?? '').toLowerCase().includes(goalQuery))
      && (!managerFilter || record.manager_id === managerFilter)
      && (!priorityFilter || record.priority === priorityFilter);
  }), [allMasters, nameSearch, goalSearch, managerFilter, priorityFilter]);

  const eligibleIds = useMemo(
    () => new Set(allMasters.filter(master => !records.some(record => record.is_backlog && record.year === targetYear && getChainId(record) === getChainId(master))).map(master => master.id)),
    [allMasters, records, targetYear],
  );
  const selectableMasterIds = masters.filter(master => eligibleIds.has(master.id)).map(master => master.id);
  const allVisibleSelected = selectableMasterIds.length > 0 && selectableMasterIds.every(id => selectedIds.includes(id));
  const cardsFor = (masterId: string) => records.filter(record => !record.is_backlog && record.backlog_id === masterId);
  const cancelExtensionSelection = () => { setIsSelectingForExtension(false); setSelectedIds([]); };
  const changeTab = (tab: Tab) => { setActiveTab(tab); setExpandedId(null); cancelExtensionSelection(); setNotice(null); };
  const changeYear = (year: number) => { setSelectedYear(year); setExpandedId(null); cancelExtensionSelection(); setNotice(null); };
  const toggleSelected = (id: string) => setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const toggleSelectAll = () => setSelectedIds(current => allVisibleSelected
    ? current.filter(id => !selectableMasterIds.includes(id))
    : Array.from(new Set([...current, ...selectableMasterIds])));

  const confirmExtension = () => {
    const result = createBacklogSnapshots(activeTab === 'PROJECTS' ? 'project' : 'task', selectedIds, selectedYear, targetYear);
    if (!result.success) { setNotice({ type: 'error', message: result.message }); return; }
    setNotice({ type: 'success', message: `${result.data?.created ?? selectedIds.length} ініціатив продовжено на ${targetYear} рік.` });
    cancelExtensionSelection();
  };

  const toggleQuarter = (master: Initiative, quarter: Quarter) => {
    if (isPastQuarter(quarter)) {
      setNotice({ type: 'error', message: 'Картки можна створювати лише для поточного або майбутніх кварталів' });
      return;
    }
    const existing = cardsFor(master.id).find(card => card.year === selectedYear && card.quarter === quarter);
    if (existing) {
      const result = activeTab === 'PROJECTS' ? deleteProject(existing.id) : deleteTask(existing.id);
      if (!result.success) setNotice({ type: 'error', message: result.message });
      return;
    }
    const previousCard = cardsFor(master.id).sort((a, b) => b.quarter.localeCompare(a.quarter))[0];
    const preparation = getYearSnapshot(master, selectedYear)?.preparationStage;
    const source = previousCard ?? preparation ?? master;
    const card = {
      ...master, ...passportFrom(master), ...(previousCard ? passportFrom(previousCard) : preparation ?? {}), implementer_dept_ids: [], id: `${master.id}-${selectedYear}-${quarter}`,
      is_backlog: false, backlog_id: master.id, initiative_chain_id: getChainId(master), yearSnapshots: undefined,
      year: selectedYear, quarter, health_status: 'DEFAULT' as const, checklist: [], history: [],
    };
    const result = activeTab === 'PROJECTS' ? addProject(card as Project) : addTask(card as OperationalTask);
    if (!result.success) setNotice({ type: 'error', message: result.message });
  };

  const removeMaster = () => {
    if (!masterToDelete) return;
    const result = activeTab === 'PROJECTS' ? deleteProject(masterToDelete.id) : deleteTask(masterToDelete.id);
    if (!result.success) setNotice({ type: 'error', message: result.message });
    setMasterToDelete(null);
  };

  const columnCount = 3 + visibleQuarters.length + (isSelectingForExtension ? 1 : 0);

  return (
    <div className="backlog-page space-y-9 pt-2.5 text-slate-900">
      <section className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_2px_5px_rgba(15,23,42,0.10)] sm:px-7 sm:py-5 lg:px-8">
        <div className="grid gap-4 2xl:grid-cols-[auto_minmax(0,1fr)] 2xl:items-center">
          <h1 className="min-w-fit text-[30px] font-extrabold tracking-[-0.02em] text-slate-900 sm:text-[36px]">Беклог</h1>

          <div className={`grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(150px,0.8fr)_minmax(260px,1.7fr)] 2xl:ml-10 ${isSelectingForExtension ? '2xl:grid-cols-[160px_minmax(270px,1fr)_minmax(440px,1.5fr)]' : '2xl:grid-cols-[160px_minmax(270px,1fr)_minmax(300px,1.12fr)_174px]'}`}>
            <select aria-label="Рік беклогу" value={selectedYear} onChange={event => changeYear(Number(event.target.value))} className="h-[52px] min-w-0 rounded-2xl border border-slate-300 bg-white px-4 text-[16px] font-bold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">
              {getAvailableYears().map(year => <option key={year} value={year}>{year} рік</option>)}
            </select>

            <div className="flex h-[52px] min-w-0 items-center justify-between rounded-2xl bg-slate-100 p-1.5" aria-label="Фільтр кварталу">
              {(['ALL', ...quarters] as QuarterFilter[]).map(item => (
                <button type="button" key={item} onClick={() => setQuarterFilter(item)} className={`h-10 whitespace-nowrap rounded-xl px-2 text-[13px] font-extrabold transition sm:px-4 sm:text-[16px] ${quarterFilter === item ? 'bg-white text-slate-900 shadow-[0_2px_6px_rgba(15,23,42,0.13)]' : 'text-slate-500 hover:text-slate-800'}`}>
                  {item === 'ALL' ? 'Всі квартали' : item}
                </button>
              ))}
            </div>

            {canEdit && !isSelectingForExtension && (
              <button type="button" disabled={eligibleIds.size === 0} onClick={() => { setIsSelectingForExtension(true); setSelectedIds([]); setNotice(null); }} className="flex h-[52px] min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-indigo-200 bg-white px-3 text-[14px] font-extrabold text-indigo-600 shadow-[0_2px_5px_rgba(15,23,42,0.10)] transition hover:border-indigo-400 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:shadow-none lg:px-4 lg:text-[16px]" title={eligibleIds.size === 0 ? `Усі ініціативи вже продовжено на ${targetYear} рік` : undefined}>
                Продовжити на наступний період
              </button>
            )}

            {canEdit && isSelectingForExtension && (
              <div className="flex h-[52px] min-w-0 items-center justify-between gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 p-1.5 pl-3 sm:col-span-2 2xl:col-span-1" aria-label="Підтвердження продовження">
                <span className="min-w-0 whitespace-nowrap text-[14px] font-extrabold text-indigo-800 lg:text-[16px]">Вибрано: {selectedIds.length}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" disabled={selectedIds.length === 0} onClick={confirmExtension} className="flex h-10 items-center rounded-xl bg-indigo-600 px-3 text-[13px] font-extrabold text-white shadow-[0_2px_5px_rgba(79,70,229,0.28)] transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 disabled:shadow-none lg:px-4 lg:text-[14px]">Підтвердити</button>
                  <button type="button" onClick={cancelExtensionSelection} className="flex h-10 items-center rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-extrabold text-slate-700 shadow-[0_2px_5px_rgba(15,23,42,0.10)] transition hover:bg-slate-50 lg:px-4 lg:text-[14px]">Скасувати</button>
                </div>
              </div>
            )}

            {canEdit && !isSelectingForExtension && (
              <button type="button" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="flex h-[52px] min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-indigo-600 px-2 text-[14px] font-extrabold text-white shadow-[0_3px_7px_rgba(79,70,229,0.28)] transition hover:bg-indigo-700 lg:px-3">
                <Plus size={18} strokeWidth={2.6} /> Додати в беклог
              </button>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end gap-5 border-b border-slate-200">
          <button type="button" onClick={() => changeTab('PROJECTS')} className={`flex h-[68px] items-center gap-3 border-b-[3px] px-5 text-[20px] font-extrabold transition ${activeTab === 'PROJECTS' ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><FolderOpen size={24} className={activeTab === 'PROJECTS' ? 'fill-amber-300 text-amber-500' : 'text-slate-400'} /> Проєкти ({projectCount})</button>
          <button type="button" onClick={() => changeTab('TASKS')} className={`flex h-[68px] items-center gap-3 border-b-[3px] px-5 text-[20px] font-extrabold transition ${activeTab === 'TASKS' ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><ClipboardList size={23} className={activeTab === 'TASKS' ? 'text-indigo-500' : 'text-slate-400'} /> Операційні задачі ({taskCount})</button>
        </div>
      </section>

      {notice && <div role="status" className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}><span>{notice.message}</span><button type="button" onClick={() => setNotice(null)} aria-label="Закрити повідомлення" className="rounded-lg p-1 hover:bg-black/5"><X size={16} /></button></div>}
      {archive && (
        <section aria-label="Архівний період" className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800 shadow-sm sm:flex-row sm:items-center sm:px-8">
          <div className="flex items-center gap-4">
            <FolderOpen size={32} className="shrink-0 fill-amber-300 text-amber-500" aria-hidden="true" />
            <div>
              <h2 className="text-[22px] font-extrabold leading-7 text-amber-900">Архівний період ({selectedYear})</h2>
              <p className="text-[18px] font-semibold leading-6 text-amber-700">Тільки для перегляду</p>
            </div>
          </div>
          <button type="button" onClick={() => changeYear(currentPeriod.year)} className="inline-flex h-14 items-center gap-3 whitespace-nowrap rounded-2xl border border-amber-400 bg-white px-7 text-[18px] font-extrabold text-amber-700 shadow-sm transition hover:bg-amber-50 focus:outline-none focus:ring-4 focus:ring-amber-200">
            <span aria-hidden="true">←</span>
            Повернутись на поточний рік
          </button>
        </section>
      )}

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2 xl:grid-cols-[1.3fr_1.3fr_1fr_0.8fr] xl:p-5">
          <input value={nameSearch} onChange={event => setNameSearch(event.target.value)} placeholder="Пошук за назвою..." aria-label="Пошук за назвою" className="h-14 rounded-2xl border border-slate-300 bg-white px-5 text-[17px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
          <input value={goalSearch} onChange={event => setGoalSearch(event.target.value)} placeholder="Пошук за стратегічною задачею..." aria-label="Пошук за стратегічною задачею" className="h-14 rounded-2xl border border-slate-300 bg-white px-5 text-[17px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
          <select value={managerFilter} onChange={event => setManagerFilter(event.target.value)} aria-label="Фільтр менеджера" className="h-14 rounded-2xl border border-slate-300 bg-white px-5 text-[17px] text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"><option value="">Всі менеджери</option>{managers.map(manager => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select>
          <select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)} aria-label="Фільтр пріоритету" className="h-14 rounded-2xl border border-slate-300 bg-white px-5 text-[17px] text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"><option value="">Всі пріоритети</option>{priorities.map(priority => <option key={priority.id} value={priority.id}>{priority.name}</option>)}</select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px]">
            <thead className="bg-white text-[11px] uppercase tracking-[0.08em] text-slate-500"><tr className="border-b border-slate-200">{isSelectingForExtension && <th className="w-16 px-4 py-4 text-center"><input type="checkbox" aria-label="Вибрати всі" title="Вибрати всі" checked={allVisibleSelected} disabled={selectableMasterIds.length === 0} onChange={toggleSelectAll} className="h-5 w-5 cursor-pointer rounded-md border-slate-300 accent-indigo-600 disabled:cursor-not-allowed" /></th>}<th className="px-4 py-4 text-left">{activeTab === 'PROJECTS' ? 'Назва проєкту' : 'Назва задачі'}</th><th className="px-4 py-4 text-left">Стратегічна задача</th>{visibleQuarters.map(quarter => <th key={quarter} className="w-[4.5rem] px-0 py-4"><span className="block w-full text-center">{quarter}</span></th>)}<th aria-label="Дії" className="w-24 py-4 pl-2 pr-3" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {masters.map(master => {
                const cards = cardsFor(master.id);
                const manager = managers.find(item => item.id === master.manager_id);
                const priority = priorities.find(item => item.id === master.priority);
                const isEligible = eligibleIds.has(master.id);
                const isSelected = selectedIds.includes(master.id);
                return <React.Fragment key={master.id}>
                  <tr className={`transition hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                    {isSelectingForExtension && <td className="px-4 py-4 text-center">{isEligible ? <input type="checkbox" aria-label={`Вибрати ${master.name}`} checked={isSelected} onChange={() => toggleSelected(master.id)} className="h-5 w-5 cursor-pointer rounded-md border-slate-300 accent-indigo-600" /> : <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700" title={`Snapshot ${targetYear} вже існує`}>Продовжено</span>}</td>}
                    <td className="px-4 py-4"><button type="button" onClick={() => setExpandedId(expandedId === master.id ? null : master.id)} className="text-left text-[17px] font-extrabold leading-6 text-slate-900 hover:text-indigo-700">{master.name}</button><div className="mt-1 text-xs font-medium text-slate-400">{master.id} · snapshot {selectedYear}</div></td>
                    <td className="max-w-xs px-4 py-4"><div className="line-clamp-3 whitespace-pre-line text-[15px] leading-6 text-slate-600" title={master.strategic_goal ?? ''}>{master.strategic_goal || '—'}</div></td>
                    {visibleQuarters.map(quarter => { const card = cards.find(item => item.year === selectedYear && item.quarter === quarter); const isLockedQuarter = isPastQuarter(quarter); const disabled = !canEdit || isLockedQuarter; return <td key={quarter} className="w-[4.5rem] px-2 py-4 text-center"><button type="button" disabled={disabled} onClick={() => toggleQuarter(master, quarter)} title={isLockedQuarter ? 'Минулий квартал: створення картки недоступне' : card ? 'Прибрати картку' : 'Створити картку'} aria-label={`${card ? 'Прибрати' : 'Створити'} картку ${quarter}`} className={`inline-flex h-9 w-9 items-center justify-center rounded-xl font-bold transition ${isLockedQuarter ? 'bg-slate-100 text-slate-300' : card ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'} disabled:cursor-not-allowed disabled:hover:bg-slate-100 disabled:hover:text-slate-300`}>{card ? <Check size={17} strokeWidth={2.7} /> : <Plus size={17} strokeWidth={2.5} />}</button></td>; })}
                    <td className="px-4 py-4"><div className="flex justify-end gap-1"><button type="button" onClick={() => { setEditingItem(master); setIsModalOpen(true); }} title={canEdit ? 'Редагувати' : 'Переглянути'} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600">{canEdit ? <Edit2 size={17} /> : <Eye size={17} />}</button>{canEdit && <button type="button" onClick={() => setMasterToDelete(master)} title="Видалити" className="rounded-xl p-2 text-rose-500 transition hover:bg-rose-50"><Trash2 size={17} /></button>}</div></td>
                  </tr>
                  {expandedId === master.id && <tr><td colSpan={columnCount} className="bg-slate-50 px-6 py-4"><div className="flex flex-wrap gap-3">{cards.length ? [...cards].sort((a, b) => a.year - b.year || a.quarter.localeCompare(b.quarter)).map(card => {
                    const status = getHealthStatusPresentation(card.health_status);
                    const scope = getScopeProgress(card);
                    const cardManager = managers.find(item => item.id === card.manager_id);
                    const cardPriority = priorities.find(item => item.id === card.priority);
                    const involved = card.cross_functional_dept_ids.map(id => departments.find(department => department.id === id)?.name ?? id);
                    return <button type="button" key={card.id} onClick={() => setEditingCard(card)} className="min-w-[292px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md" aria-label={`Редагувати ${card.quarter} ${card.year}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-extrabold text-slate-800">{card.quarter} {card.year}</span>
                        <span className={`inline-flex min-w-24 justify-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.badgeClass}`}>{status.label}</span>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs leading-5 text-slate-600"><p><span className="font-bold text-slate-700">Менеджер:</span> {cardManager?.name ?? '—'}</p><p className="flex items-center gap-2"><span className="font-bold text-slate-700">Пріоритет:</span><span className={`inline-flex w-24 justify-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${getPriorityBadgeClass(cardPriority?.id ?? card.priority)}`}>{cardPriority?.name ?? '—'}</span></p><p title={involved.join(', ')} className="line-clamp-2"><span className="font-bold text-slate-700">Залучені:</span> {involved.length ? involved.join(', ') : '—'}</p></div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-medium text-slate-500">
                        <span>{taskCountLabel(scope.total)}</span>
                        <span className="font-bold text-slate-700">{scope.completed}/{scope.total} · {scope.percent}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`Прогрес scope ${card.quarter} ${card.year}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={scope.percent}>
                        <div className={`h-full rounded-full transition-[width] ${status.progressClass}`} style={{ width: `${scope.percent}%` }} />
                      </div>
                    </button>;
                  }) : (() => { const stage = getYearSnapshot(master, selectedYear)?.preparationStage; const stageManager = managers.find(item => item.id === stage?.manager_id); const stagePriority = priorities.find(item => item.id === stage?.priority); const involved = (stage?.cross_functional_dept_ids ?? []).map(id => departments.find(department => department.id === id)?.name ?? id); return <button type="button" onClick={() => setPreparationItem(master)} className="min-w-[292px] rounded-2xl border border-dashed border-indigo-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50" aria-label="Відкрити підготовчий етап"><div className="flex items-center justify-between gap-3"><span className="text-sm font-extrabold text-slate-800">Підготовчий етап</span><span className="inline-flex min-w-24 justify-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">Без статусу</span></div><div className="mt-3 space-y-1.5 text-xs leading-5 text-slate-600"><p><span className="font-bold text-slate-700">Менеджер:</span> {stageManager?.name ?? '—'}</p><p className="flex items-center gap-2"><span className="font-bold text-slate-700">Пріоритет:</span><span className={`inline-flex w-24 justify-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${getPriorityBadgeClass(stagePriority?.id ?? stage?.priority)}`}>{stagePriority?.name ?? '—'}</span></p><p title={involved.join(', ')} className="line-clamp-2"><span className="font-bold text-slate-700">Залучені:</span> {involved.length ? involved.join(', ') : '—'}</p></div></button>; })()}</div></td></tr>}
                </React.Fragment>;
              })}
              {masters.length === 0 && <tr><td colSpan={columnCount} className="py-14 text-center text-slate-500">За заданими фільтрами ініціатив не знайдено.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && <BacklogModal type={activeTab} editItem={editingItem} selectedYear={selectedYear} isReadOnly={!canEdit} onClose={() => setIsModalOpen(false)} />}
      {preparationItem && <PreparationStageModal item={preparationItem} type={activeTab === 'PROJECTS' ? 'project' : 'task'} onClose={() => setPreparationItem(null)} />}
      {editingCard && <InitiativeCardModal kind={activeTab === 'PROJECTS' ? 'project' : 'task'} item={editingCard} isReadOnly={!canEdit} openInViewMode={canEdit} onClose={() => setEditingCard(null)} onSave={item => { const result = activeTab === 'PROJECTS' ? updateProject(item.id, item as Project) : updateTask(item.id, item as OperationalTask); if (!result.success) { setNotice({ type: 'error', message: result.message }); return; } setEditingCard(null); }} onDelete={id => { const result = activeTab === 'PROJECTS' ? deleteProject(id) : deleteTask(id); if (!result.success) { setNotice({ type: 'error', message: result.message }); return; } setEditingCard(null); }} />}
      {masterToDelete && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="delete-backlog-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-2xl"><div className="flex gap-3 border-b border-rose-200 bg-rose-50 p-5"><AlertTriangle className="shrink-0 text-rose-600" /><div><h3 id="delete-backlog-title" className="font-extrabold text-slate-900">Видалити запис із беклогу?</h3><p className="mt-1 text-sm text-slate-600">Цю дію не можна скасувати.</p></div></div><div className="p-5 text-sm leading-6 text-slate-700">Ви дійсно бажаєте видалити <strong>«{masterToDelete.name}»</strong>? Якщо існують квартальні картки, система не дозволить видалення.</div><div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4"><button type="button" onClick={() => setMasterToDelete(null)} className="rounded-xl px-4 py-2 font-bold text-slate-600 hover:bg-slate-200">Скасувати</button><button type="button" onClick={removeMaster} className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-rose-700">Видалити</button></div></div></div>}
    </div>
  );
};
