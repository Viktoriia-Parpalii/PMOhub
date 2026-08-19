import { Edit2, Eye } from 'lucide-react';
import { ProjectModal } from "./ProjectModal";
import React, { useState } from 'react';
import { getAvailableYears , truncateText, isPeriodLocked, stripHtml } from '../utils';
import { useAppContext } from '../store';
import { ProjectCard } from './ProjectCard';
import { Project } from '../types';
import { passportFrom } from '../domain/initiatives';
import { getHealthLabel, getHealthStatusPresentation, getInitiativeStatus, getInitiativeStatusStyle } from '../domain/health';
import { getPriorityBadgeStyle, colorWithAlpha } from '../domain/priority';
import { RichTextPreview } from './RichTextEditor';

export const ProjectsTab = () => {
  const { projects, updateProject, currentUser, customFields, departments, managers, priorities, initiativeStatuses, deleteProject, rolePermissions, savePassport, createBacklogWithCards } = useAppContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = (currentMonth < 3 ? 'Q1' : currentMonth < 6 ? 'Q2' : currentMonth < 9 ? 'Q3' : 'Q4') as import('../types').Quarter;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState<import('../types').Quarter>(currentQuarter);
  const isArchive = isPeriodLocked(selectedYear, selectedQuarter);
  const [isReadOnlyModal, setIsReadOnlyModal] = useState(false);

  const [filterManager, setFilterManager] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchGoal, setSearchGoal] = useState<string>('');
  

  let portfolioProjects = projects.filter(p => !p.is_backlog && p.year === selectedYear && p.quarter === selectedQuarter);
  if (filterManager) {
    portfolioProjects = portfolioProjects.filter(p => p.manager_id === filterManager);
  }
  if (filterPriority) {
    portfolioProjects = portfolioProjects.filter(p => p.priority === filterPriority);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    portfolioProjects = portfolioProjects.filter(p => p.name.toLowerCase().includes(q));
  }
  if (searchGoal) {
    const q = searchGoal.toLowerCase();
    portfolioProjects = portfolioProjects.filter(p => {
      return (p.strategic_goal ?? '').toLowerCase().includes(q);
    });
  }
  
  const userRolePerm = rolePermissions?.find(rp => rp.role === currentUser?.role);
  const canEditArchive = userRolePerm?.canEditArchive ?? (currentUser?.role === 'SUPER_ADMIN');
  const canEditNormal = userRolePerm ? (userRolePerm.canCreateEditProjects && !userRolePerm.isReadOnly) : (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN');
  const canEdit = isArchive ? canEditArchive : canEditNormal;

  const projCustomFields = (customFields || []).filter(cf => cf.entityType === 'project' && cf.showInTable);

  const getRowBgClass = (status?: string) => {
    switch (status) {
      case 'GREEN': return 'bg-emerald-50/70 hover:bg-emerald-100/80 text-slate-800';
      case 'YELLOW': return 'bg-amber-50/70 hover:bg-amber-100/80 text-slate-800';
      case 'RED': return 'bg-rose-50/70 hover:bg-rose-100/80 text-slate-800';
      case 'DEFAULT':
      default:
        return 'bg-white hover:bg-slate-50 text-slate-800';
    }
  };

  const getStickyBgClass = (status?: string) => {
    switch (status) {
      case 'GREEN': return 'bg-emerald-50/90';
      case 'YELLOW': return 'bg-amber-50/90';
      case 'RED': return 'bg-rose-50/90';
      case 'DEFAULT':
      default:
        return 'bg-white';
    }
  };

  const openEditModal = (proj: Project) => {
    setEditingProject(proj);
    setIsReadOnlyModal(!canEdit);
    setIsModalOpen(true);
  };
  const openCreateModal = () => {
    setEditingProject(null);
    setIsReadOnlyModal(false);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm min-h-[400px]">
      
      {isArchive && (
        <div className="bg-amber-50 text-amber-800 px-5 py-3 rounded-xl font-medium text-sm mb-5 border border-amber-200/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">📁</span>
            <div>
              <strong className="block text-amber-900">
                Архівний період ({selectedYear} {selectedQuarter})
                {canEditArchive && <span className="ml-2 text-xs bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-md uppercase">Доступне редагування</span>}
              </strong>
              <span className="text-amber-700/80">
                {canEditArchive ? 'Ви маєте права супер адміна на редагування в архіві.' : 'Тільки для перегляду'}
              </span>
            </div>
          </div>
          <button onClick={() => { setSelectedYear(currentYear); setSelectedQuarter(currentQuarter); }} className="bg-white/80 hover:bg-white text-amber-700 border border-amber-300 hover:border-amber-400 px-5 py-2 rounded-xl font-bold transition-all shadow-sm hover:shadow flex items-center gap-2 whitespace-nowrap group">
            <span className="group-hover:-translate-x-1 transition-transform">←</span> Повернутись на поточний період
          </button>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Портфель Проєктів</h2>
          <p className="text-slate-500 mt-1 text-sm">Всі проєкти обраного періоду.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex gap-2">
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="border border-slate-300 rounded-lg px-2 py-1 text-sm bg-white focus:ring-indigo-500 outline-none truncate">
              {getAvailableYears().map(y => <option key={y} value={y} title={String(y)}>{truncateText(y, 70)}</option>)}
            </select>
            <select value={selectedQuarter} onChange={e => setSelectedQuarter(e.target.value as any)} className="border border-slate-300 rounded-lg px-2 py-1 text-sm bg-white focus:ring-indigo-500 outline-none truncate">
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1 text-sm font-bold rounded-md ${viewMode === 'grid' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Картки</button>
            <button onClick={() => setViewMode('table')} className={`px-3 py-1 text-sm font-bold rounded-md ${viewMode === 'table' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Таблиця</button>
          </div>
          {canEdit && (
            <button onClick={openCreateModal} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm whitespace-nowrap">
              + Додати проєкт
            </button>
          )}
        </div>
      </div>
      
      <div className="flex flex-col gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="text" 
            placeholder="Пошук за назвою..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500 outline-none flex-1 min-w-[200px]"
          />
          <input 
            type="text" 
            placeholder="Пошук за стратегічною задачею..." 
            value={searchGoal} 
            onChange={e => setSearchGoal(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500 outline-none flex-1 min-w-[200px]"
          />
          <select 
            value={filterManager} 
            onChange={e => setFilterManager(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500 outline-none min-w-[150px]"
          >
            <option value="">Всі менеджери</option>
            {((managers || [])).map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <select 
            value={filterPriority} 
            onChange={e => setFilterPriority(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500 outline-none min-w-[120px]"
          >
            <option value="">Всі пріоритети</option>
            <option value="High">Високий</option>
            <option value="Medium">Середній</option>
            <option value="Low">Низький</option>
          </select>
          {(filterManager || filterPriority || searchQuery || searchGoal) && (
            <button 
              onClick={() => { setFilterManager(''); setFilterPriority(''); setSearchQuery(''); setSearchGoal(''); }}
              className="text-slate-500 hover:text-slate-700 text-sm font-medium px-2"
            >
              Скинути
            </button>
          )}
        </div>
      </div>
  {portfolioProjects.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-slate-400 font-bold text-sm">Портфель порожній.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {portfolioProjects.map(p => (
            <div key={p.id} className="relative group h-fit">
              <ProjectCard project={p} onClick={() => openEditModal(p)} hideColorPicker={!canEdit} />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto w-full max-w-full min-w-0">
          <table className="min-w-max divide-y divide-slate-200 text-sm w-full table-fixed">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-36">Менеджер</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-80 min-w-[260px]">Назва проєкту</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-48">Статус проєкту</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-52">Стратегічна задача</th>
                <th className="portfolio-header-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest w-40 min-w-[10rem]">Пріоритет</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-48">Виконавці</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-48">Залучені</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-72">Скоуп зі статусами</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-52">Примітки</th>
                {projCustomFields.map(cf => (
                  <th key={cf.id} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-40 truncate" title={cf.name}>{cf.name}</th>
                ))}
                <th className="px-4 py-3 text-right sticky right-0 bg-slate-50 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {portfolioProjects.map(p => {
                const status = p.health_status || 'DEFAULT';
                const statusPresentation = getInitiativeStatus(status, initiativeStatuses);
                const managerName = managers?.find(m => m.id === p.manager_id)?.name || '—';
                const goalName = p.strategic_goal || '—';
                const priority = priorities?.find(item => item.id === p.priority);
                return (
                <tr key={p.id} className="transition-colors border-b border-slate-100/80" style={{ backgroundColor: colorWithAlpha(statusPresentation.color, .07) }}>
                  <td className="px-4 py-3 min-w-0 font-medium text-slate-700">
                    <span className="block break-words line-clamp-2 hover:line-clamp-none transition-all" title={managerName}>
                      {managerName}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-0">
                    <div className="min-w-0">
                      <span 
                        className="block font-bold text-slate-800 break-words line-clamp-2 hover:line-clamp-none transition-all cursor-pointer hover:text-indigo-600 leading-snug"
                        title={p.name}
                        onClick={() => openEditModal(p)}
                      >
                        {p.name}
                      </span>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{p.id}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 min-w-0">
                    <div className="flex flex-col items-start gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap shadow-2xs" style={getInitiativeStatusStyle(status, initiativeStatuses)}>
                        {statusPresentation.name}
                      </span>

                      {canEdit && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/90 p-1 backdrop-blur shadow-2xs" aria-label="Обрати статус ініціативи">{initiativeStatuses.filter(item => item.is_active || item.id === status).map(item => <button key={item.id} onClick={(e) => { e.stopPropagation(); updateProject(p.id, { health_status: item.id }); }} className={`w-3.5 h-3.5 rounded-full border transition-all ${status === item.id ? 'ring-2 ring-offset-1 scale-110' : 'hover:scale-125'}`} style={{ backgroundColor: item.color, borderColor: colorWithAlpha(item.color, .8), outlineColor: item.color }} title={item.name} />)}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 min-w-0">
                    <span className="block break-words line-clamp-3 hover:line-clamp-none transition-all" title={goalName}>
                      {goalName}
                    </span>
                  </td>
                  <td className="min-w-[10rem] px-4 py-3 text-center whitespace-nowrap">
                    <span className="inline-flex w-32 justify-center truncate rounded-full border px-2.5 py-1 text-xs font-bold" style={getPriorityBadgeStyle(priority?.id ?? p.priority, priorities)} title={priority?.name ?? p.priority ?? 'Не обрано'}>
                      {priority?.name ?? p.priority ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-0">
                    <div className="flex flex-wrap gap-1 max-w-full">
                      {Array.from(new Set((p.checklist ?? []).flatMap(item => item.implementer_dept_ids ?? []))).map(id => {
                        const d = departments.find(dep => dep.id === id);
                        if (!d) return null;
                        return (
                          <span key={id} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-medium break-words max-w-full" title={d.name}>
                            {d.name}
                          </span>
                        );
                      })}
                      {!(p.checklist ?? []).some(item => item.implementer_dept_ids?.length) && <span className="text-slate-400 text-xs">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 min-w-0">
                    <div className="flex flex-wrap gap-1 max-w-full">
                      {(p.cross_functional_dept_ids || []).map(id => {
                        const d = departments.find(dep => dep.id === id);
                        if (!d) return null;
                        return (
                          <span key={id} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 break-words max-w-full" title={d.name}>
                            {d.name}
                          </span>
                        );
                      })}
                      {(!p.cross_functional_dept_ids || p.cross_functional_dept_ids.length === 0) && <span className="text-slate-400 text-xs">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 min-w-0">
                    {p.checklist && p.checklist.length > 0 ? (
                      <ul className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
                        {p.checklist.map(c => (
                          <li key={c.id} className="text-xs flex items-start gap-1.5 text-slate-700">
                            <span className={'mt-1 shrink-0 w-2 h-2 rounded-full ' + (c.color === 'GREEN' ? 'bg-emerald-500' : c.color === 'YELLOW' ? 'bg-amber-500' : c.color === 'RED' ? 'bg-rose-500' : 'bg-slate-300')} />
                            <span className={`leading-snug break-words ${c.color === 'GREEN' ? 'text-emerald-700' : c.color === 'YELLOW' ? 'text-amber-700' : c.color === 'RED' ? 'text-rose-700' : 'text-slate-600'}`} title={c.text}>{c.text}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 min-w-0">
                    {p.notes ? <RichTextPreview value={p.notes} title={stripHtml(p.notes)} className="rich-text-card-preview transition-all" /> : '—'}
                  </td>
                  {projCustomFields.map(cf => (
                    <td key={cf.id} className="px-4 py-3 text-xs text-slate-700 min-w-0">
                      <span className="block break-words line-clamp-2 hover:line-clamp-none transition-all" title={String(p.custom_fields?.[cf.id] ?? '')}>
                        {p.custom_fields?.[cf.id] !== undefined && p.custom_fields?.[cf.id] !== null && p.custom_fields?.[cf.id] !== '' ? String(p.custom_fields[cf.id]) : '—'}
                      </span>
                    </td>
                  ))}
                  <td className={`px-4 py-3 whitespace-nowrap text-right sticky right-0 ${getStickyBgClass(status)} shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]`}>
                    <button onClick={() => openEditModal(p)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors bg-white rounded shadow-sm border border-slate-200" title={!canEdit ? 'Переглянути' : 'Редагувати'}>
                      {!canEdit ? <Eye size={18} /> : <Edit2 size={18} />}
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <ProjectModal 
          project={editingProject}
          defaultYear={selectedYear}
          defaultQuarter={selectedQuarter}
          isReadOnly={isReadOnlyModal}
          onClose={() => setIsModalOpen(false)} 
          onSave={(proj, syncTargets) => { 
            if (editingProject) {
              const backlogYears = (syncTargets ?? []).filter(id => id.startsWith('BACKLOG_YEAR:')).map(id => Number(id.split(':')[1]));
              if ((syncTargets ?? []).includes(editingProject.backlog_id ?? '')) backlogYears.push(editingProject.year);
              const cardIds = (syncTargets ?? []).filter(id => projects.some(card => !card.is_backlog && card.id === id));
              const result = savePassport({ kind: 'project', source: { type: 'card', cardId: editingProject.id }, passportPatch: passportFrom(proj), sourceCardPatch: { checklist: proj.checklist, health_status: proj.health_status }, targets: { backlogYears, cardIds } });
              if (!result.success) { alert(result.message); return; }
            } else {
              const master = { ...proj, is_backlog: true, backlog_id: undefined, checklist: [], quarter: 'Q1' as const, yearSnapshots: { [String(proj.year)]: { ...passportFrom(proj), year: proj.year, history: [] } } };
              const result = createBacklogWithCards('project', master, [proj.quarter], proj.checklist);
              if (!result.success) { alert(result.message); return; }
            }
            setIsModalOpen(false); 
          }} 
          onDelete={(id) => {
            const result = deleteProject(id);
            if (!result.success) { alert(result.message); return; }
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
