import React from 'react';
import { OperationalTask } from '../types';
import { calculateProgress, getHealthColors, getHealthLabel, stripHtml, getComputedTotalWeight } from '../utils';
import { useAppContext } from '../store';
import { getInitiativeSize, getInitiativeWeight } from '../domain/capacity';
import { getPriorityBadgeClass } from '../domain/priority';
import { RichTextPreview } from './RichTextEditor';

export const TaskCard: React.FC<{ task: OperationalTask; onClick?: () => void; hideColorPicker?: boolean; isBacklogView?: boolean }> = ({ task, onClick, hideColorPicker, isBacklogView }) => {
  const { departments, priorities, taskWeights, initiativeSizes, updateProject, updateTask, currentUser, customFields, managers } = useAppContext();
  
  
  const cardFields = (customFields || []).filter(cf => cf.entityType === 'task' && cf.showInCards);
  const effectiveStatus = task.is_backlog ? 'DEFAULT' : task.health_status;
  const colors = getHealthColors(effectiveStatus);
  const progress = calculateProgress(task.checklist);
  
  const implementerNames = (task.implementer_dept_ids || []).map(id => ((departments || [])).find(d => d.id === id)?.name).filter(Boolean).join(', ');
  const manager = ((managers || [])).find(m => m.id === task.manager_id);
  
  const crossFuncNames = (task.cross_functional_dept_ids || [])
    .map(id => ((departments || [])).find(d => d.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  
  const getSizeName = (checklist: any[]) => {
    return getInitiativeSize(getInitiativeWeight(checklist, taskWeights || []), initiativeSizes || []);
  };
  const getPriorityLabel = (p?: string) => {
    const found = ((priorities || [])).find(pr => pr.id === p);
    return found ? found.name : '—';
  };

  const getSubtaskColor = (color?: string) => {
    switch (color) {
      case 'GREEN': return 'bg-emerald-500';
      case 'YELLOW': return 'bg-amber-500';
      case 'RED': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`group relative overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200 p-5 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-300' : ''} flex flex-col h-fit`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-2 ${colors.main}`}></div>
      
      {!hideColorPicker && !task.is_backlog && (
      <div className="absolute top-2 right-2 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/95 backdrop-blur shadow-lg border border-slate-200 rounded-lg py-1.5 px-2.5">
        <div className="text-[8px] font-bold text-slate-400 text-center tracking-wider mb-1.5">СТАТУС</div>
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); updateTask(task.id, { health_status: 'DEFAULT' as any }) }} 
            className="w-3.5 h-3.5 rounded-full bg-slate-400 border border-slate-500 hover:scale-125 transition-transform" 
            title={getHealthLabel('DEFAULT')}
          />
          <button 
            onClick={(e) => { e.stopPropagation(); updateTask(task.id, { health_status: 'GREEN' as any }) }} 
            className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-600 hover:scale-125 transition-transform" 
            title={getHealthLabel('GREEN')}
          />
          <button 
            onClick={(e) => { e.stopPropagation(); updateTask(task.id, { health_status: 'YELLOW' as any }) }} 
            className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-600 hover:scale-125 transition-transform" 
            title={getHealthLabel('YELLOW')}
          />
          <button 
            onClick={(e) => { e.stopPropagation(); updateTask(task.id, { health_status: 'RED' as any }) }} 
            className="w-3.5 h-3.5 rounded-full bg-red-500 border border-red-600 hover:scale-125 transition-transform" 
            title={getHealthLabel('RED')}
          />
        </div>
      </div>
      )}

      <div className="ml-2 flex justify-between items-start mb-3 gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-800 text-base leading-tight pr-6 line-clamp-2 break-words" title={task.name}>{task.name}</h3>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{task.id}</p>
        </div>
      </div>
      
      <div className="ml-2 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mb-3 flex-1">
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-slate-500">Менеджер:</span>
          <span className="font-bold text-slate-800 truncate pl-2" title={manager?.name || '—'}>{manager?.name || '—'}</span>
        </div>
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-slate-500">Пріоритет:</span>
          <span className={`rounded border px-2 py-0.5 text-xs font-bold ${getPriorityBadgeClass(task.priority)}`}>
            {getPriorityLabel(task.priority)}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-slate-500">Стратегічна задача:</span>
          <span className={`font-bold text-right pl-2 ${task.strategic_goal?.trim() ? 'text-emerald-600' : 'text-slate-500'}`} title={task.strategic_goal?.trim() ? 'Стратегічна задача заповнена' : 'Стратегічна задача відсутня'}>
            {task.strategic_goal?.trim() ? '✓' : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <span className="text-slate-500">Розмір/Період:</span>
          <span className="font-bold text-slate-800 pl-2">
            {getSizeName(task.checklist || [])} • {task.year} {task.quarter}
          </span>
        </div>
      </div>

      <div className="ml-2 flex flex-col gap-1.5 mb-4 border-t border-slate-100 pt-3">
        <div className="flex justify-between items-start text-xs sm:text-sm">
          <span className="text-slate-500 shrink-0">Виконавці:</span>
          <span className="font-bold text-slate-800 text-right pl-2 break-words" title={implementerNames}>{implementerNames || '—'}</span>
        </div>
        <div className="flex justify-between items-start text-xs sm:text-sm">
          <span className="text-slate-500 shrink-0">Залучені:</span>
          <span className="font-bold text-slate-800 text-right pl-2 break-words" title={crossFuncNames}>{crossFuncNames || '—'}</span>
        </div>
      </div>

      {!isBacklogView && (
        <div className="ml-2 mb-4 flex-col gap-3">
          {task.checklist && task.checklist.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Скоуп:</h4>
              <ul className="space-y-1">
                {task.checklist.map((item, idx) => {
                  let textColor = 'text-slate-700';
                  if (item.color === 'GREEN') textColor = 'text-emerald-700';
                  else if (item.color === 'YELLOW') textColor = 'text-amber-700';
                  else if (item.color === 'RED') textColor = 'text-rose-700';
                  return (
                  <li key={item.id} className="flex items-start gap-1.5 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      <span className="text-slate-400 font-bold text-xs w-3 text-right">{idx + 1}.</span>
                      <div className={`w-2 h-2 rounded-full ${getSubtaskColor(item.color)}`} />
                    </div>
                    <span className={`leading-snug break-words line-clamp-2 ${textColor}`} title={item.text}>
                      {item.text}
                    </span>
                  </li>
                  );
                })}
              </ul>
            </div>
          )}
          {task.notes && (
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Примітки:</h4>
              <RichTextPreview value={task.notes} title={stripHtml(task.notes)} className="rich-text-card-preview text-xs italic text-slate-600 sm:text-sm" />
            </div>
          )}
        </div>
      )}

      
      {cardFields.length > 0 && (
        <div className="ml-2 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 border-t border-slate-100 pt-3">
          {cardFields.map(cf => {
            const val = task.custom_fields?.[cf.id];
            let displayVal: string | number | boolean | undefined =
              typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' ? val : undefined;
            if (cf.type === 'CHECKBOX') displayVal = val ? 'Так' : 'Ні';
            else if (cf.type === 'RICHTEXT' && typeof val === 'string') displayVal = val.replace(/<[^>]+>/g, '').substring(0, 50) + (val.length > 50 ? '...' : '');
            return (
              <div key={cf.id} className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-500 truncate" title={cf.name}>{cf.name}:</span>
                <span className="font-bold text-slate-800 pl-2 truncate" title={String(displayVal || '')}>{String(displayVal || '—')}</span>
              </div>
            );
          })}
        </div>
      )}
      {progress !== null && (
        <div className="ml-2 mt-auto">
          <div className="flex justify-between text-xs mb-1 font-bold">
            <span className="text-slate-500">Прогрес</span>
            <span className="text-slate-800">{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div className={`${colors.main} h-full transition-all`} style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
};
