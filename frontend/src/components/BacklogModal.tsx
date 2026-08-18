import React, { useState } from 'react';
import { useAppContext } from '../store';
import { InitiativeYearSnapshot, OperationalTask, Priority, Project, Quarter } from '../types';
import { getCurrentPeriod, getValidQuarters, isBacklogLocked, isPeriodLocked, truncateText } from '../utils';

interface BacklogModalProps {
  onClose: () => void;
  type: 'PROJECTS' | 'TASKS';
  editItem: Project | OperationalTask | null;
  selectedYear: number;
  isReadOnly?: boolean;
}

export const BacklogModal = ({ onClose, type, editItem, selectedYear, isReadOnly = false }: BacklogModalProps) => {
  const {
    departments, managers, priorities, projects, tasks, customFields,
    savePassport, createBacklogWithCards,
  } = useAppContext();
  const sourceRecords = type === 'PROJECTS' ? projects : tasks;
  const master = editItem ? sourceRecords.find(item => item.is_backlog && item.id === editItem.id) : undefined;
  const [name, setName] = useState(editItem?.name ?? '');
  const [strategicGoal, setStrategicGoal] = useState(editItem?.strategic_goal ?? '');
  const [notes, setNotes] = useState('');
  const [managerId, setManagerId] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  // Виконавці належать scope-завданням квартальної картки. Backlog лише зберігає
  // синхронізований паспортний знімок, тому тут їх не можна редагувати.
  const syncedImplementerIds = editItem?.implementer_dept_ids ?? [];
  const [crossFunctional, setCrossFunctional] = useState<string[]>(editItem?.cross_functional_dept_ids ?? []);
  const [fieldVals, setFieldVals] = useState<Record<string, unknown>>(editItem?.custom_fields ?? {});
  const [selectedQuarters, setSelectedQuarters] = useState<Quarter[]>([]);
  const [targetYears, setTargetYears] = useState<number[]>([]);
  const [targetCardIds, setTargetCardIds] = useState<string[]>([]);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [error, setError] = useState('');

  const modalCustomFields = customFields.filter(field => field.entityType === 'backlog' && (field.isActive !== false || fieldVals[field.id] !== undefined));
  const availableFutureYears = Object.keys(master?.yearSnapshots ?? {}).map(Number)
    .filter(year => year > selectedYear && !isBacklogLocked(year)).sort((a, b) => a - b);
  const current = getCurrentPeriod();
  const periodNumber = (year: number, quarter: Quarter) => year * 10 + Number(quarter.slice(1));
  const availableCards = sourceRecords.filter(card => !card.is_backlog && card.backlog_id === master?.id && !isPeriodLocked(card.year, card.quarter));
  const currentCards = selectedYear === current.year
    ? availableCards.filter(card => card.year === current.year && card.quarter === current.quarter)
    : [];
  const futureCards = availableCards.filter(card => card.year >= selectedYear && periodNumber(card.year, card.quarter) > periodNumber(current.year, current.quarter));

  const toggle = <T,>(value: T, values: T[], setter: React.Dispatch<React.SetStateAction<T[]>>) =>
    setter(values.includes(value) ? values.filter(item => item !== value) : [...values, value]);
  const passport = () => ({
    name: name.trim(), strategic_goal: strategicGoal, implementer_dept_ids: [], cross_functional_dept_ids: [],
  });
  const handleSave = () => {
    if (!name.trim()) { setError('Вкажіть назву ініціативи'); return; }
    if (editItem && master) {
      const result = savePassport({
        kind: type === 'PROJECTS' ? 'project' : 'task',
        source: { type: 'backlog', masterId: master.id, year: selectedYear },
        passportPatch: passport(), targets: { backlogYears: targetYears, cardIds: targetCardIds },
      });
      if (!result.success) { setError(result.message); return; }
    } else {
      const id = `${type === 'PROJECTS' ? 'PRJ' : 'TSK'}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const yearSnapshot: InitiativeYearSnapshot = { ...passport(), year: selectedYear, history: [] };
      const base = {
        id, ...passport(), year: selectedYear, quarter: 'Q1' as Quarter,
        health_status: 'DEFAULT' as const, checklist: [], is_backlog: true,
        yearSnapshots: { [String(selectedYear)]: yearSnapshot }, history: [],
      };
      const result = createBacklogWithCards(type === 'PROJECTS' ? 'project' : 'task', base as Project | OperationalTask, []);
      if (!result.success) { setError(result.message); return; }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-[780px] max-h-[96vh] shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
        <div className="flex justify-between items-center gap-4 px-6 py-5 border-b border-slate-100">
          <h2 className="text-[20px] font-extrabold text-slate-800">{editItem ? `Редагувати ${type === 'PROJECTS' ? 'проєкт' : 'операційну задачу'} в ${selectedYear}` : `Створити ${type === 'PROJECTS' ? 'проєкт' : 'операційну задачу'} в ${selectedYear}`}</h2>
          <button onClick={onClose} aria-label="Закрити" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 text-2xl">×</button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto">
          {error && <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm font-semibold text-rose-700">{error}</div>}
          <div><label className="block text-sm font-bold text-slate-700 mb-1">Назва <span className="text-rose-500">*</span></label><input disabled={isReadOnly} value={name} onChange={event => setName(event.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-3 text-[18px] font-semibold leading-6 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
          <div><label className="block text-sm font-bold text-slate-700 mb-1">Стратегічна задача</label><textarea disabled={isReadOnly} value={strategicGoal} onChange={event => setStrategicGoal(event.target.value)} rows={5} className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none resize-y" placeholder="Введіть назву стратегічної задачі за наявності" /></div>
          {false && <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-bold text-slate-700 mb-1">Менеджер</label><select disabled={isReadOnly} value={managerId} onChange={event => setManagerId(event.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-2.5"><option value="">Не обрано</option>{managers.map(manager => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select></div>
            <div><label className="block text-sm font-bold text-slate-700 mb-1">Пріоритет</label><select disabled={isReadOnly} value={priority} onChange={event => setPriority(event.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-2.5"><option value="">Не обрано</option>{priorities.filter(item => item.is_active !== false || item.id === priority).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          </div>}
          <p className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-800">Після збереження заповніть менеджера, пріоритет і залучені підрозділи у картці <b>«Підготовчий етап»</b>. Виконавців можна налаштувати лише в квартальних картках.</p>
          {false && <div className="border-t pt-5 grid sm:grid-cols-2 gap-4" />}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <button onClick={onClose} className="h-10 px-3 text-sm font-extrabold text-slate-600">{isReadOnly ? 'Закрити' : 'Скасувати'}</button>
          {!isReadOnly && <button onClick={handleSave} className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-extrabold text-white shadow-[0_2px_5px_rgba(79,57,244,.25)] hover:bg-indigo-700">Зберегти</button>}
        </div>
      </div>
    </div>
  );
};
