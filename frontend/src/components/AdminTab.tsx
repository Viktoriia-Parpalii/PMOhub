import React, { useState } from 'react';
import { useAppContext } from '../store';
import { CustomFieldType, UserRole } from '../types';
import { Trash2, Copy, Check, Power, PowerOff, FileSpreadsheet, BookOpen, ShieldCheck, Sliders, Pencil, X } from 'lucide-react';
import { generatePassword, truncateText } from '../utils';
const DataManagementSection = React.lazy(() => import('./DataManagementSection').then(module => ({ default: module.DataManagementSection })));

export const AdminTab = () => {
  const [activeSubTab, setActiveSubTab] = useState<'dicts' | 'rbac' | 'fields' | 'data'>('dicts');

    return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm min-h-[500px] flex flex-col">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Адміністрування</h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveSubTab('dicts')} 
            className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'dicts' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen size={16} />
            <span>Довідники</span>
          </button>

          <button 
            onClick={() => setActiveSubTab('rbac')} 
            className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'rbac' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Права та Ролі</span>
          </button>

          <button 
            onClick={() => setActiveSubTab('fields')} 
            className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'fields' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sliders size={16} />
            <span>Конструктор полів</span>
          </button>

          <button 
            onClick={() => setActiveSubTab('data')} 
            className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'data' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet size={16} />
            <span>Експорт / Імпорт</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {activeSubTab === 'dicts' && <DictionariesSection />}
        {activeSubTab === 'rbac' && <RbacSection />}
        {activeSubTab === 'fields' && <CustomFieldsSection />}
        {activeSubTab === 'data' && <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Завантаження модуля даних…</div>}><DataManagementSection /></React.Suspense>}
      </div>
    </div>
  );
};

const DictionariesSection = () => {
  const { departments, addDepartment, updateDepartment, deleteDepartment, managers, addManager, updateManager, deleteManager, priorities, addPriority, updatePriority, deletePriority, taskWeights, addTaskWeight, updateTaskWeight, deleteTaskWeight, initiativeSizes, addInitiativeSize, updateInitiativeSize, deleteInitiativeSize } = useAppContext();
  const [deleteConfirm, setDeleteConfirm] = useState<{ title: string; name: string; onConfirm: () => void } | null>(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptLimit, setNewDeptLimit] = useState(10);
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerDept, setNewManagerDept] = useState('');
  const [newPriorityName, setNewPriorityName] = useState('');
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizeWeight, setNewSizeWeight] = useState(1);
  const [newInitSizeName, setNewInitSizeName] = useState('');
  const [newInitSizeMin, setNewInitSizeMin] = useState(0);
  const [newInitSizeMax, setNewInitSizeMax] = useState(1);

  const handleAddDept = () => {
    if (newDeptName.trim()) {
      addDepartment({ id: (Math.random().toString(36).substring(2, 10)), name: newDeptName, capacity_limit_points: newDeptLimit, is_active: true });
      setNewDeptName('');
    }
  };

  const handleAddManager = () => {
    if (newManagerName.trim() && newManagerDept) {
      addManager({ id: (Math.random().toString(36).substring(2, 10)), name: newManagerName, department_id: newManagerDept, is_active: true });
      setNewManagerName('');
      setNewManagerDept('');
    }
  };

  const handleAddPriority = () => {
    if (newPriorityName.trim()) {
      addPriority({ id: (Math.random().toString(36).substring(2, 10)), name: newPriorityName, is_active: true });
      setNewPriorityName('');
    }
  };
  const handleAddTaskWeight = () => {
    if (newSizeName.trim()) {
      const result = addTaskWeight({ id: (Math.random().toString(36).substring(2, 10)), name: newSizeName, weight: newSizeWeight, is_active: true });
      if (!result.success) { alert(result.message); return; }
      setNewSizeName(''); setNewSizeWeight(1);
    }
  };

  const handleAddInitSize = () => {
    if (newInitSizeName.trim()) {
      const result = addInitiativeSize({ id: (Math.random().toString(36).substring(2, 10)), name: newInitSizeName, min_score: newInitSizeMin, max_score: newInitSizeMax, is_active: true });
      if (!result.success) { alert(result.message); return; }
      setNewInitSizeName(''); setNewInitSizeMin(0); setNewInitSizeMax(1);
    }
  };

  return (
    <div className="space-y-8">
      {/* Департаменти */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">Відділи</h3>
          <div className="flex gap-2">
            <input type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="Назва відділу" className="border border-slate-300 rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" value={newDeptLimit} onChange={e => setNewDeptLimit(Number(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-20" min="1" />
            <button onClick={handleAddDept} className="bg-indigo-500 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-indigo-600 transition-colors">Додати</button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-w-full min-w-0">
          <table className="min-w-full divide-y divide-slate-200 table-fixed w-full min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Відділ</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-32">Ліміт capacity</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-32">Статус</th>
                <th aria-label="Дії" className="w-28 py-4 pl-2 pr-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {((departments || [])).map(dept => (
                <tr key={dept.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-sm font-bold text-slate-800">{dept.name}</td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-sm text-slate-500">{dept.capacity_limit_points}</td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${dept.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {dept.is_active !== false ? 'Активно' : 'Деактивовано'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-right text-sm">
                    <button onClick={() => updateDepartment(dept.id, { is_active: dept.is_active === false ? true : false })} className={`text-slate-400 transition-colors mr-3 ${dept.is_active !== false ? 'hover:text-amber-500' : 'hover:text-emerald-500'}`} title={dept.is_active !== false ? "Деактивувати" : "Активувати"}>
                      {dept.is_active !== false ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                    <button onClick={() => setDeleteConfirm({ title: 'відділ', name: dept.name, onConfirm: () => deleteDepartment(dept.id) })} className="text-slate-400 hover:text-rose-500 transition-colors" title="Видалити"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Менеджери */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">Менеджери</h3>
          <div className="flex gap-2">
            <input type="text" value={newManagerName} onChange={e => setNewManagerName(e.target.value)} placeholder="Ім'я менеджера" className="border border-slate-300 rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            <select value={newManagerDept} onChange={e => setNewManagerDept(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500 truncate">
              <option value="">Оберіть відділ</option>
              {((departments || [])).map(d => <option key={d.id} value={d.id} title={d.name}>{truncateText(d.name, 70)}</option>)}
            </select>
            <button onClick={handleAddManager} className="bg-indigo-500 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-indigo-600 transition-colors">Додати</button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-w-full min-w-0">
          <table className="min-w-full divide-y divide-slate-200 table-fixed w-full min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Менеджер</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Департамент</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-32">Статус</th>
                <th aria-label="Дії" className="w-28 py-4 pl-2 pr-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {((managers || [])).map(m => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-sm font-bold text-slate-800">{m.name}</td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-sm text-slate-500">{m.department_id ? departments.find(d => d.id === m.department_id)?.name : '—'}</td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${m.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {m.is_active !== false ? 'Активно' : 'Деактивовано'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-right text-sm">
                    <button onClick={() => updateManager(m.id, { is_active: m.is_active === false ? true : false })} className={`text-slate-400 transition-colors mr-3 ${m.is_active !== false ? 'hover:text-amber-500' : 'hover:text-emerald-500'}`} title={m.is_active !== false ? "Деактивувати" : "Активувати"}>
                      {m.is_active !== false ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                    <button onClick={() => setDeleteConfirm({ title: 'менеджера', name: m.name, onConfirm: () => deleteManager(m.id) })} className="text-slate-400 hover:text-rose-500 transition-colors" title="Видалити"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Пріоритети */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">Пріоритети</h3>
          <div className="flex gap-2">
            <input type="text" value={newPriorityName} onChange={e => setNewPriorityName(e.target.value)} placeholder="Назва пріоритету" className="border border-slate-300 rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={handleAddPriority} className="bg-indigo-500 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-indigo-600 transition-colors">Додати</button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-w-full min-w-0">
          <table className="min-w-full divide-y divide-slate-200 table-fixed w-full min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Пріоритет</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-32">Статус</th>
                <th aria-label="Дії" className="w-28 py-4 pl-2 pr-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {((priorities || [])).map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-sm font-bold text-slate-800">{p.name}</td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${p.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {p.is_active !== false ? 'Активно' : 'Деактивовано'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-right text-sm">
                    <button onClick={() => updatePriority(p.id, { is_active: p.is_active === false ? true : false })} className={`text-slate-400 transition-colors mr-3 ${p.is_active !== false ? 'hover:text-amber-500' : 'hover:text-emerald-500'}`} title={p.is_active !== false ? "Деактивувати" : "Активувати"}>
                      {p.is_active !== false ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                    <button onClick={() => setDeleteConfirm({ title: 'пріоритет', name: p.name, onConfirm: () => deletePriority(p.id) })} className="text-slate-400 hover:text-rose-500 transition-colors" title="Видалити"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Розміри (вага) */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">Розмір (вага)</h3>
          <div className="flex gap-2">
            <input type="number" value={newSizeWeight} onChange={e => setNewSizeWeight(Number(e.target.value))} placeholder="Вага (бали)" className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-24 mr-2" />
            <input type="text" value={newSizeName} onChange={e => setNewSizeName(e.target.value)} placeholder="Назва розміру" className="border border-slate-300 rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={handleAddTaskWeight} className="bg-indigo-500 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-indigo-600 transition-colors">Додати</button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-w-full min-w-0">
          <table className="min-w-full divide-y divide-slate-200 table-fixed w-full min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Розмір</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-32">Вага</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-32">Статус</th>
                <th aria-label="Дії" className="w-28 py-4 pl-2 pr-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {(taskWeights || []).map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-sm font-bold text-slate-800">{s.name}</td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-sm font-bold text-slate-800">{s.weight}</td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${s.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {s.is_active !== false ? 'Активно' : 'Деактивовано'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-right text-sm">
                    <button onClick={() => { const result = updateTaskWeight(s.id, { is_active: s.is_active === false ? true : false }); if (!result.success) alert(result.message); }} className={`text-slate-400 transition-colors mr-3 ${s.is_active !== false ? 'hover:text-amber-500' : 'hover:text-emerald-500'}`} title={s.is_active !== false ? "Деактивувати" : "Активувати"}>
                      {s.is_active !== false ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                    <button onClick={() => setDeleteConfirm({ title: 'розмір', name: s.name, onConfirm: () => { const result = deleteTaskWeight(s.id); if (!result.success) alert(result.message); } })} className="text-slate-400 hover:text-rose-500 transition-colors" title="Видалити"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-800">Розмір (вага) ініціативи</h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-500 mb-1">Назва розміру (напр. XS, M, XL)</label>
              <input type="text" value={newInitSizeName} onChange={e => setNewInitSizeName(e.target.value)} placeholder="Новий розмір" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="w-full sm:w-32">
              <label className="block text-xs font-bold text-slate-500 mb-1">Мін. балів</label>
              <input type="number" step="0.1" value={newInitSizeMin} onChange={e => setNewInitSizeMin(Number(e.target.value))} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="w-full sm:w-32">
              <label className="block text-xs font-bold text-slate-500 mb-1">Макс. балів</label>
              <input type="number" step="0.1" value={newInitSizeMax} onChange={e => setNewInitSizeMax(Number(e.target.value))} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button onClick={handleAddInitSize} className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-600 transition-colors w-full sm:w-auto">Додати</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-1/3">Назва</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-1/3">Діапазон</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-32">Статус</th>
                <th aria-label="Дії" className="w-28 py-4 pl-2 pr-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {(initiativeSizes || []).map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-sm font-bold text-slate-800">{s.name}</td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-sm font-bold text-slate-800">{s.min_score} - {s.max_score}</td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${s.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {s.is_active !== false ? 'Активно' : 'Деактивовано'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-right text-sm">
                    <button onClick={() => { const result = updateInitiativeSize(s.id, { is_active: s.is_active === false ? true : false }); if (!result.success) alert(result.message); }} className={`text-slate-400 transition-colors mr-3 ${s.is_active !== false ? 'hover:text-amber-500' : 'hover:text-emerald-500'}`} title={s.is_active !== false ? "Деактивувати" : "Активувати"}>
                      {s.is_active !== false ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                    <button onClick={() => setDeleteConfirm({ title: 'розмір ініціативи', name: s.name, onConfirm: () => { const result = deleteInitiativeSize(s.id); if (!result.success) alert(result.message); } })} className="text-slate-400 hover:text-rose-500 transition-colors" title="Видалити"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md my-auto shadow-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Підтвердження видалення</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Ви дійсно бажаєте видалити {deleteConfirm.title} <span className="font-bold text-slate-800">«{deleteConfirm.name}»</span>? Цю дію неможливо скасувати.
            </p>
            <div className="flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
              >
                Скасувати
              </button>
              <button
                onClick={() => {
                  deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-lg font-bold transition-colors shadow-sm"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RbacSection = () => {
  const { rolePermissions, updateRolePermission, users, updateUser, deleteUser, departments, addUser } = useAppContext();
  const [deleteConfirm, setDeleteConfirm] = useState<{ title: string; name: string; onConfirm: () => void } | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserDept, setNewUserDept] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('USER');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleAddUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserDept) {
      setError('Заповніть всі поля');
      return;
    }
    if (users.some(u => u.email.toLowerCase() === newUserEmail.toLowerCase())) {
      setError('Користувач з таким email вже існує');
      return;
    }
    
    const pwd = generatePassword();
    setGeneratedPassword(pwd);
    setCopied(false);
    
    addUser({
      id: 'USR-' + Math.random().toString(36).substring(2, 8),
      name: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      role: newUserRole,
      departmentId: newUserDept || undefined,
      password: pwd
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-bold text-slate-800 mb-4">Матриця прав доступу</h3>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-w-full min-w-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm table-fixed w-full min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Роль</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Read-Only</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Створення/Редагування</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Видалення</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Доступ до Адмін</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Редагування архіву</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {rolePermissions.map(rp => (
                <tr key={rp.role} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 font-bold text-slate-800">
                    {rp.role === 'SUPER_ADMIN' ? 'Супер адмін (SUPER_ADMIN)' : rp.role === 'ADMIN' ? 'Адміністратор (ADMIN)' : 'Користувач (USER)'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input type="checkbox" checked={rp.isReadOnly} onChange={e => updateRolePermission(rp.role, { isReadOnly: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input type="checkbox" checked={rp.canCreateEditProjects} onChange={e => updateRolePermission(rp.role, { canCreateEditProjects: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input type="checkbox" checked={rp.canDeleteProjects} onChange={e => updateRolePermission(rp.role, { canDeleteProjects: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input type="checkbox" checked={rp.canAccessAdmin} onChange={e => updateRolePermission(rp.role, { canAccessAdmin: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input type="checkbox" checked={rp.canEditArchive ?? false} onChange={e => updateRolePermission(rp.role, { canEditArchive: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">Користувачі системи</h3>
          <button onClick={() => setIsAddUserModalOpen(true)} className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors shadow-sm">
            + Додати користувача
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-w-full min-w-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm table-fixed w-full min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">ПІБ</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Ел. пошта</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Департамент</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Роль</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {((users || [])).map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 font-bold text-slate-800">{user.name}</td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-slate-600">{user.email}</td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-slate-600">{departments.find(d => d.id === user.departmentId)?.name || '—'}</td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0">
                    <select 
                      value={user.role} 
                      onChange={e => updateUser(user.id, { role: e.target.value as UserRole })}
                      className="border border-slate-300 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold truncate"
                    >
                      <option value="SUPER_ADMIN">Супер адмін (SUPER_ADMIN)</option>
                      <option value="ADMIN">Адміністратор (ADMIN)</option>
                      <option value="USER">Користувач (USER)</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-right">
                    <button onClick={() => setDeleteConfirm({ title: 'користувача', name: user.name, onConfirm: () => deleteUser(user.id) })} className="text-slate-400 hover:text-rose-500 transition-colors" title="Видалити"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md my-auto shadow-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Підтвердження видалення</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Ви дійсно бажаєте видалити користувача <span className="font-bold text-slate-800">«{deleteConfirm.name}»</span>? Цю дію неможливо скасувати.
            </p>
            <div className="flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
              >
                Скасувати
              </button>
              <button
                onClick={() => {
                  deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-lg font-bold transition-colors shadow-sm"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] my-auto shadow-xl border border-slate-200 flex flex-col p-6 overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-6">{generatedPassword ? 'Користувача створено' : 'Новий користувач'}</h3>
            
            {generatedPassword ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-sm">
                  Користувач <strong className="font-bold">{newUserName}</strong> успішно доданий до системи. Передайте йому ці дані для входу:
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ел. пошта</label>
                  <div className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 font-medium">{newUserEmail}</div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Тимчасовий пароль</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-900 font-mono tracking-wider font-bold">{generatedPassword}</div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPassword);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                      title="Скопіювати пароль"
                    >
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <button onClick={() => { 
                    setIsAddUserModalOpen(false); 
                    setNewUserName('');
                    setNewUserEmail('');
                    setNewUserDept('');
                    setGeneratedPassword('');
                  }} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold transition-colors w-full shadow-sm">
                    Закрити
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ім'я та Прізвище</label>
                    <input type="text" value={newUserName} onChange={e => {setNewUserName(e.target.value); setError('');}} className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ел. пошта</label>
                    <input type="email" value={newUserEmail} onChange={e => {setNewUserEmail(e.target.value); setError('');}} className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Департамент</label>
                    <select value={newUserDept} onChange={e => {setNewUserDept(e.target.value); setError('');}} className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none truncate">
                      <option value="">Оберіть департамент</option>
                      {((departments || [])).map(d => <option key={d.id} value={d.id} title={d.name}>{truncateText(d.name, 70)}</option>)}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Роль</label>
                    <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as UserRole)} className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none truncate">
                      <option value="SUPER_ADMIN">Супер адмін (SUPER_ADMIN)</option>
                      <option value="ADMIN">Адміністратор (ADMIN)</option>
                      <option value="USER">Користувач (USER)</option>
                    </select>
                  </div>
                </div>
                
                {error && <p className="text-rose-600 text-sm mt-4 font-medium">{error}</p>}
                
                <div className="mt-8 flex justify-end gap-3">
                  <button onClick={() => { setIsAddUserModalOpen(false); setError(''); setNewUserName(''); setNewUserEmail(''); setNewUserDept(''); setGeneratedPassword(''); }} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">Скасувати</button>
                  <button onClick={handleAddUser} className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-sm">Додати</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};const CustomFieldsSection = () => {
  const { customFields, addCustomField, deleteCustomField, updateCustomField } = useAppContext();
  const [deleteConfirm, setDeleteConfirm] = useState<{ title: string; name: string; onConfirm: () => void } | null>(null);
  const [editingField, setEditingField] = useState<(typeof customFields)[number] | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<CustomFieldType>('TEXT');
  const [editEntityType, setEditEntityType] = useState<'project' | 'task' | 'backlog'>('project');
  const [editRequired, setEditRequired] = useState(false);
  const [editOptions, setEditOptions] = useState('');
  const [editShowInTable, setEditShowInTable] = useState(false);
  const [editShowInCards, setEditShowInCards] = useState(false);
  
  const [name, setName] = useState('');
  const [type, setType] = useState<CustomFieldType>('TEXT');
  const [entityType, setEntityType] = useState<'project'|'task'|'backlog'>('project');
  const [isRequired, setIsRequired] = useState(false);
  const [optionsStr, setOptionsStr] = useState('');
  const [showInTable, setShowInTable] = useState(false);
  const [showInCards, setShowInCards] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) return;
    const newField = {
      id: ('cf_' + Math.random().toString(36).substring(2, 10)),
      name,
      type,
      entityType,
      isRequired,
      showInTable,
      showInCards: entityType === 'backlog' ? false : showInCards,
      options: type === 'SELECT' ? optionsStr.split(',').map(s => s.trim()).filter(Boolean) : undefined
    };
    addCustomField(newField);
    setName('');
    setOptionsStr('');
    setShowInTable(false);
    setShowInCards(false);
  };

  const openEdit = (field: (typeof customFields)[number]) => {
    setEditingField(field);
    setEditName(field.name);
    setEditType(field.type);
    setEditEntityType(field.entityType);
    setEditRequired(field.isRequired);
    setEditOptions(field.options?.join(', ') ?? '');
    setEditShowInTable(Boolean(field.showInTable));
    setEditShowInCards(Boolean(field.showInCards));
  };

  const saveEdit = () => {
    if (!editingField || !editName.trim()) return;
    updateCustomField(editingField.id, {
      name: editName.trim(),
      type: editType,
      entityType: editEntityType,
      isRequired: editRequired,
      showInTable: editShowInTable,
      showInCards: editEntityType === 'backlog' ? false : editShowInCards,
      options: editType === 'SELECT' ? editOptions.split(',').map(value => value.trim()).filter(Boolean) : undefined,
    });
    setEditingField(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4">Створити нове поле</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Назва поля</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="напр. Бюджет" />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Тип сутності</label>
            <select value={entityType} onChange={e => setEntityType(e.target.value as any)} className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none truncate">
              <option value="project">Проєкт</option>
              <option value="task">Операційна задача</option>
              <option value="backlog">Беклог</option>
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Тип даних</label>
            <select value={type} onChange={e => setType(e.target.value as any)} className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none truncate">
              <option value="TEXT">Текст</option>
              <option value="NUMBER">Число</option>
              <option value="SELECT">Випадаючий список (Select)</option>
              <option value="CHECKBOX">Прапорець (Checkbox)</option>
              <option value="RICHTEXT">Текст з форматуванням (Примітки)</option>
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer mb-2">
              <input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
              Обов'язкове поле
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer mb-2">
              <input type="checkbox" checked={showInTable} onChange={e => setShowInTable(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
              Показувати в таблиці
            </label>
            {entityType !== 'backlog' && (
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer mb-2">
                <input type="checkbox" checked={showInCards} onChange={e => setShowInCards(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                Показувати в картках
              </label>
            )}
          </div>
        </div>
        {type === 'SELECT' && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Варіанти (через кому)</label>
            <input type="text" value={optionsStr} onChange={e => setOptionsStr(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Option 1, Option 2" />
          </div>
        )}
        <button onClick={handleAdd} className="bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors">
          Додати поле
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-w-full min-w-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm table-fixed w-full min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Назва</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Сутність</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Тип</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Обов'язкове</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Відображення</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Статус</th>
              <th aria-label="Дії" className="w-32 py-4 pl-2 pr-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {customFields.map(cf => (
              <tr key={cf.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-normal break-words min-w-0 font-bold text-slate-800">{cf.name}</td>
                <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-slate-500">{cf.entityType === 'project' ? 'Проєкт' : cf.entityType === 'task' ? 'Задача' : 'Беклог'}</td>
                <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-slate-500">{cf.type} {cf.type === 'SELECT' && <span className="text-xs">({cf.options?.join(', ')})</span>}</td>
                <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-slate-500">{cf.isRequired ? 'Так' : 'Ні'}</td>
                <td className="px-6 py-4 whitespace-normal break-words min-w-0 text-slate-500 text-xs space-y-1">
                  {cf.showInTable && <div><span className="font-bold">Таблиця:</span> Так</div>}
                  {cf.entityType !== 'backlog' && cf.showInCards && <div><span className="font-bold">Картки:</span> Так</div>}
                  {!cf.showInTable && (!cf.showInCards || cf.entityType === 'backlog') && <div className="text-slate-400">Тільки в модалці</div>}
                </td>
                <td className="px-6 py-4 whitespace-normal break-words min-w-0">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${cf.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {cf.isActive !== false ? 'Активно' : 'Деактивовано'}
                  </span>
                </td>
                <td className="w-32 px-3 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => openEdit(cf)} className="text-slate-400 transition-colors hover:text-indigo-600" title="Редагувати поле"><Pencil size={16} /></button>
                    <button onClick={() => updateCustomField(cf.id, { isActive: cf.isActive === false ? true : false })} className={`text-slate-400 transition-colors ${cf.isActive !== false ? 'hover:text-amber-500' : 'hover:text-emerald-500'}`} title={cf.isActive !== false ? "Деактивувати" : "Активувати"}>
                      {cf.isActive !== false ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                    <button onClick={() => setDeleteConfirm({ title: 'кастомне поле', name: cf.name, onConfirm: () => deleteCustomField(cf.id) })} className="text-slate-400 hover:text-rose-500 transition-colors" title="Видалити"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {customFields.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-medium">Немає кастомних полів</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-3 backdrop-blur-sm sm:p-6">
          <div className="my-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4"><div><h3 className="text-xl font-bold text-slate-900">Редагування поля</h3><p className="mt-1 text-sm text-slate-500">Зміни застосуються до нових і наявних форм.</p></div><button onClick={() => setEditingField(null)} aria-label="Закрити" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={22} /></button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-700 sm:col-span-2">Назва поля<input value={editName} onChange={event => setEditName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" /></label>
              <div className="block text-sm font-bold text-slate-700">Тип сутності<div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-500">{editEntityType === 'project' ? 'Проєкт' : editEntityType === 'task' ? 'Операційна задача' : 'Беклог'}</div></div>
              <div className="block text-sm font-bold text-slate-700">Тип даних<div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-500">{editType === 'TEXT' ? 'Текст' : editType === 'NUMBER' ? 'Число' : editType === 'SELECT' ? 'Випадаючий список' : editType === 'CHECKBOX' ? 'Прапорець' : 'Текст з форматуванням'}</div></div>
              {editType === 'SELECT' && <label className="block text-sm font-bold text-slate-700 sm:col-span-2">Значення списку (через кому)<input value={editOptions} onChange={event => setEditOptions(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Варіант 1, Варіант 2" /></label>}
              <div className="space-y-2 text-sm font-bold text-slate-700 sm:col-span-2"><label className="flex items-center gap-2"><input type="checkbox" checked={editRequired} onChange={event => setEditRequired(event.target.checked)} />Обов'язкове поле</label><label className="flex items-center gap-2"><input type="checkbox" checked={editShowInTable} onChange={event => setEditShowInTable(event.target.checked)} />Показувати в таблиці</label>{editEntityType !== 'backlog' && <label className="flex items-center gap-2"><input type="checkbox" checked={editShowInCards} onChange={event => setEditShowInCards(event.target.checked)} />Показувати в картках</label>}</div>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button onClick={() => setEditingField(null)} className="rounded-lg px-4 py-2 font-bold text-slate-600 hover:bg-slate-100">Скасувати</button><button onClick={saveEdit} disabled={!editName.trim()} className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">Зберегти зміни</button></div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md my-auto shadow-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Підтвердження видалення</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Ви дійсно бажаєте видалити кастомне поле <span className="font-bold text-slate-800">«{deleteConfirm.name}»</span>? Цю дію неможливо скасувати.
            </p>
            <div className="flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
              >
                Скасувати
              </button>
              <button
                onClick={() => {
                  deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-lg font-bold transition-colors shadow-sm"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
