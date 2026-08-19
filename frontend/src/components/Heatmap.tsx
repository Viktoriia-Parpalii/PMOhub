import React from 'react';
import { useAppContext } from '../store';
import { Quarter, Department } from '../types';
import { calculateDepartmentLoads } from '../domain/capacity';

interface HeatmapProps {
  year: number;
  quarter: Quarter;
}

export const Heatmap = ({ year, quarter }: HeatmapProps) => {
  const { departments, projects, tasks, currentUser, taskWeights } = useAppContext();

  const visibleDepartments = (currentUser?.role === 'USER' && currentUser.departmentId)
    ? ((departments || [])).filter(d => d.id === currentUser.departmentId)
    : departments;

  const periodCards = [...projects, ...tasks].filter(item => !item.is_backlog && item.year === year && item.quarter === quarter);
  const loads = new Map(calculateDepartmentLoads(periodCards, departments, taskWeights).map(item => [item.departmentId, item]));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 flex-1 overflow-y-auto pr-2">
      {visibleDepartments.map(dept => {
        const metric = loads.get(dept.id);
        const load = metric?.load ?? 0;
        const isOverloaded = metric?.isOverCapacity ?? false;

        return (
          <div key={dept.id} className={`p-4 rounded-xl border transition-colors ${isOverloaded ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
            <h4 className={`text-xs font-bold mb-2 uppercase ${isOverloaded ? 'text-rose-900' : 'text-slate-700'}`}>{dept.name}</h4>
            <div className="flex items-end justify-between">
              <div>
                <div className={`text-2xl font-bold ${isOverloaded ? 'text-rose-600' : 'text-slate-900'}`}>{load}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1 font-bold">Навант.</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 font-bold">Ліміт</div>
                <div className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">{dept.capacity_limit_points}</div>
              </div>
            </div>
            {isOverloaded && (
              <div className="mt-3 text-[10px] font-bold text-rose-700 bg-rose-100 inline-block px-2 py-0.5 rounded-full uppercase">
                Over Capacity
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
