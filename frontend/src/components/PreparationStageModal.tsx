import React, { useState } from 'react';
import { useAppContext } from '../store';
import { OperationalTask, Project } from '../types';
import { getYearSnapshot } from '../domain/initiatives';

export const PreparationStageModal = ({ item, type, onClose }: { item: Project | OperationalTask; type: 'project' | 'task'; onClose: () => void }) => {
  const { departments, managers, priorities, updatePreparationStage } = useAppContext();
  const stage = getYearSnapshot(item, item.year)?.preparationStage;
  const [managerId, setManagerId] = useState(stage?.manager_id ?? '');
  const [priority, setPriority] = useState(stage?.priority ?? '');
  const [departmentIds, setDepartmentIds] = useState(stage?.cross_functional_dept_ids ?? []);
  const [error, setError] = useState('');
  const toggle = (id: string) => setDepartmentIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const save = () => {
    const result = updatePreparationStage(type, item.id, { manager_id: managerId || undefined, priority: priority || undefined, cross_functional_dept_ids: departmentIds });
    if (!result.success) { setError(result.message); return; }
    onClose();
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-100 p-6"><div><h2 className="text-xl font-extrabold text-slate-800">Підготовчий етап · {item.year}</h2><p className="mt-1 text-sm text-slate-500">Нульовий квартал: дані використаються для першої картки року.</p></div><button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-700">×</button></div>
      <div className="space-y-5 p-6">{error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">Менеджер<select value={managerId} onChange={event => setManagerId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-indigo-500"><option value="">Не обрано</option>{managers.map(manager => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select></label><label className="text-sm font-bold text-slate-700">Пріоритет<select value={priority} onChange={event => setPriority(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-indigo-500"><option value="">Не обрано</option>{priorities.filter(value => value.is_active !== false || value.id === priority).map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label></div>
        <div><p className="mb-2 text-sm font-bold text-slate-700">Залучені підрозділи</p><div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">{departments.filter(department => department.is_active).map(department => <button type="button" key={department.id} onClick={() => toggle(department.id)} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${departmentIds.includes(department.id) ? 'border-amber-400 bg-amber-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'}`}>{departmentIds.includes(department.id) ? '✓ ' : ''}{department.name}</button>)}</div></div>
      </div><div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-5"><button onClick={onClose} className="rounded-xl px-5 py-2.5 font-bold text-slate-600">Скасувати</button><button onClick={save} className="rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white shadow-sm hover:bg-indigo-700">Зберегти</button></div>
    </div>
  </div>;
};
