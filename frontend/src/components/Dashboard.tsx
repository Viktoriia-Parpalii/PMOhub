import React, { useState } from 'react';
import { useAppContext } from '../store';
import { Project, OperationalTask, Quarter } from '../types';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { getComputedTotalWeight, truncateText, getAvailableYears, getCurrentQuarter } from '../utils';
import { getHealthStatusPresentation } from '../domain/health';
import { averageInitiativeDuration, capacityByQuarter, healthCounts, averageScopeProgress, scopeStatusCounts, sizeBreakdown, AnalyticsCard, normalizeHealthStatus } from '../domain/analytics';
import { getYearSnapshot } from '../domain/initiatives';

export const Dashboard = () => {
  const { projects, tasks, departments, managers, priorities, taskWeights, initiativeSizes, currentUser } = useAppContext();
  
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [quarter, setQuarter] = useState<Quarter | 'ALL'>(getCurrentQuarter());
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [managerFilter, setManagerFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PROJECTS' | 'TASKS'>('ALL');

  const isVisibleForUser = (item: Project | OperationalTask, departmentId?: string) => !departmentId
    || (item.implementer_dept_ids || []).includes(departmentId)
    || (item.cross_functional_dept_ids || []).includes(departmentId);

  // One selector for every chart that describes quarterly portfolio cards.
  const getFilteredItems = (targetYear: number, targetQuarter: Quarter | 'ALL'): AnalyticsCard[] => {
    let p = projects
      .filter(proj => !proj.is_backlog && proj.year === targetYear && (targetQuarter === 'ALL' ? true : proj.quarter === targetQuarter))
      .map(proj => ({ ...proj, type: 'PROJECT' as const }));

    let t = tasks
      .filter(task => !task.is_backlog && task.year === targetYear && (targetQuarter === 'ALL' ? true : task.quarter === targetQuarter))
      .map(task => ({ ...task, type: 'TASK' as const }));

    if (typeFilter === 'PROJECTS') t = [];
    if (typeFilter === 'TASKS') p = [];

    if (currentUser?.role === 'USER' && currentUser.departmentId) {
      p = p.filter(proj => (proj.implementer_dept_ids || []).includes(currentUser.departmentId!) || proj.cross_functional_dept_ids.includes(currentUser.departmentId!));
      t = t.filter(task => (task.implementer_dept_ids || []).includes(currentUser.departmentId!) || (task.cross_functional_dept_ids || []).includes(currentUser.departmentId!));
    }

    if (deptFilter !== 'ALL') {
      p = p.filter(proj => (proj.implementer_dept_ids || []).includes(deptFilter) || (proj.cross_functional_dept_ids || []).includes(deptFilter));
      t = t.filter(task => (task.implementer_dept_ids || []).includes(deptFilter) || (task.cross_functional_dept_ids || []).includes(deptFilter));
    }
    if (managerFilter !== 'ALL') {
      p = p.filter(proj => proj.manager_id === managerFilter);
      t = t.filter(task => task.manager_id === managerFilter);
    }
    return [...p, ...t];
  };

  const activeItems = getFilteredItems(year, quarter);
  const getFilteredBacklog = (targetYear: number) => {
    const matches = (record: Project | OperationalTask, type: 'PROJECT' | 'TASK') => {
      if (!record.is_backlog || record.year !== targetYear) return false;
      if (typeFilter === 'PROJECTS' && type !== 'PROJECT') return false;
      if (typeFilter === 'TASKS' && type !== 'TASK') return false;
      const snapshot = getYearSnapshot(record, targetYear);
      const stage = snapshot?.preparationStage;
      const managerId = stage?.manager_id ?? snapshot?.manager_id ?? record.manager_id;
      const involved = stage?.cross_functional_dept_ids ?? snapshot?.cross_functional_dept_ids ?? record.cross_functional_dept_ids;
      const visibleRecord = { ...record, manager_id: managerId, cross_functional_dept_ids: involved, implementer_dept_ids: [] };
      if (currentUser?.role === 'USER' && currentUser.departmentId && !isVisibleForUser(visibleRecord, currentUser.departmentId)) return false;
      if (deptFilter !== 'ALL' && !isVisibleForUser(visibleRecord, deptFilter)) return false;
      return managerFilter === 'ALL' || managerId === managerFilter;
    };
    return [
      ...projects.filter(record => matches(record, 'PROJECT')),
      ...tasks.filter(record => matches(record, 'TASK')),
    ];
  };
  const filteredBacklog = getFilteredBacklog(year);
  const allBacklogCount = filteredBacklog.length;
  const allQuarterCards = [...projects, ...tasks].filter(item => !item.is_backlog);
  const preparationItems = filteredBacklog.filter(record => !allQuarterCards.some(card => card.backlog_id === record.id));
  const preparationReadiness = preparationItems.map(record => {
    const snapshot = getYearSnapshot(record, year);
    const stage = snapshot?.preparationStage;
    const managerId = stage?.manager_id ?? snapshot?.manager_id ?? record.manager_id;
    const priority = stage?.priority ?? snapshot?.priority ?? record.priority;
    const involved = stage?.cross_functional_dept_ids ?? snapshot?.cross_functional_dept_ids ?? record.cross_functional_dept_ids;
    const filled = Number(Boolean(managerId)) + Number(Boolean(priority)) + Number(involved.length > 0);
    return { id: record.id, name: record.name, filled, managerId, priority, involved };
  });
  const readyPreparationCount = preparationReadiness.filter(item => item.filled === 3).length;

  const entityLabelGenitive = typeFilter === 'PROJECTS'
    ? 'проєктів'
    : typeFilter === 'TASKS'
      ? 'операційних задач'
      : 'ініціатив';

  // KPIs
  const avgProgress = averageScopeProgress(activeItems);
  const averageDuration = averageInitiativeDuration(getFilteredItems(year, 'ALL'));
  const cardHealth = healthCounts(activeItems);
  const greenCount = cardHealth.GREEN;
  const yellowCount = cardHealth.YELLOW;
  const redCount = cardHealth.RED;
  const defaultCount = cardHealth.DEFAULT;

  // Scope Statuses
  const scopeHealth = scopeStatusCounts(activeItems);
  const scopeTotal = Object.values(scopeHealth).reduce((sum, value) => sum + value, 0);
  const scopeGreen = scopeHealth.GREEN;
  const scopeYellow = scopeHealth.YELLOW;
  const scopeRed = scopeHealth.RED;
  const scopeDefault = scopeHealth.DEFAULT;
  
  const scopeGreenPct = scopeTotal ? Math.round((scopeGreen / scopeTotal) * 100) : 0;
  const scopeYellowPct = scopeTotal ? Math.round((scopeYellow / scopeTotal) * 100) : 0;
  const scopeRedPct = scopeTotal ? Math.round((scopeRed / scopeTotal) * 100) : 0;
  const scopeDefaultPct = scopeTotal ? Math.round((scopeDefault / scopeTotal) * 100) : 0;

  // Donut Data
  const donutData = [
    { name: getHealthStatusPresentation('GREEN').label, value: greenCount, color: '#10b981' },
    { name: getHealthStatusPresentation('YELLOW').label, value: yellowCount, color: '#f59e0b' },
    { name: getHealthStatusPresentation('RED').label, value: redCount, color: '#f43f5e' },
    { name: getHealthStatusPresentation('DEFAULT').label, value: defaultCount, color: '#94a3b8' },
  ].filter(d => d.value > 0);
  const totalStatusItems = activeItems.length;

  // History Stacked Data (All Years)
  const currentCalendarYear = new Date().getFullYear();
  const allYears = Array.from(new Set([...projects, ...tasks]
    .filter(item => !item.is_backlog && item.year <= currentCalendarYear)
    .map(item => item.year)))
    .sort();
  const historyData = allYears.map(y => {
    const items = getFilteredItems(y, 'ALL');
    const counts = healthCounts(items);
    const green = counts.GREEN;
    const yellow = counts.YELLOW;
    const red = counts.RED;
    const def = counts.DEFAULT;
    const total = green + yellow + red + def;
    return { year: y.toString(), Виконано: green, 'В процесі': yellow, 'На паузі / блоковано': red, 'Без статусу': def, total };
  }).filter(d => d.total > 0);

  const HistoryTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload[0].payload.total;
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-xl text-sm min-w-[180px]">
          <p className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Рік {label}</p>
          {payload.map((entry: any) => {
            const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
            if (entry.value === 0) return null;
            return (
              <div key={entry.dataKey} className="flex justify-between items-center gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="font-medium text-slate-600">{entry.name}</span>
                </div>
                <span className="font-bold text-slate-800">{entry.value} <span className="text-slate-400 font-normal text-xs ml-1">({pct}%)</span></span>
              </div>
            );
          })}
          <div className="border-t border-slate-100 mt-2 pt-2 flex justify-between">
            <span className="text-slate-500 font-medium">Всього карток:</span>
            <span className="font-bold text-slate-800">{total}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const quarterCapacity = capacityByQuarter(activeItems, departments || [], taskWeights);
  // The heatmap is an annual planning view, so it always shows every quarter
  // of the selected year while retaining the initiative, manager and department filters.
  const annualCapacity = capacityByQuarter(getFilteredItems(year, 'ALL'), departments || [], taskWeights);
  const activeQuarterCapacity = quarter === 'ALL' ? quarterCapacity : quarterCapacity.filter(item => item.quarter === quarter);
  const deptWorkloadData = (quarter === 'ALL'
    ? departments.map(department => ({ departmentId: department.id, load: Math.max(...quarterCapacity.map(period => period.loads.find(load => load.departmentId === department.id)?.load ?? 0)), limit: department.capacity_limit_points, isOverCapacity: quarterCapacity.some(period => period.loads.find(load => load.departmentId === department.id)?.isOverCapacity) }))
    : activeQuarterCapacity[0]?.loads ?? []).map(metric => ({
    name: departments.find(department => department.id === metric.departmentId)?.name ?? metric.departmentId,
    load: metric.load,
    limit: metric.limit,
    isOver: metric.isOverCapacity,
  })).filter(d => d.load > 0).sort((a, b) => b.load - a.load);

  const planningRisks = activeItems.flatMap(item => {
    const issues: string[] = [];
    if (!item.manager_id) issues.push('без менеджера');
    if (!item.priority) issues.push('без пріоритету');
    if (!item.checklist.length) issues.push('без завдань');
    if (item.checklist.some(scope => !scope.weightId || !scope.implementer_dept_ids?.length)) issues.push('неповний обсяг робіт');
    return issues.length ? [{ id: item.id, name: item.name, issues }] : [];
  });
  const capacityTone = (load: number, limit: number) => {
    if (load > limit) return 'border-rose-200 bg-rose-50 text-rose-700';
    if (limit > 0 && load / limit >= 0.8) return 'border-amber-200 bg-amber-50 text-amber-800';
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  };
  const capacityDepartments = (departments || []).filter(department => deptFilter === 'ALL' || department.id === deptFilter);
  const capacityReserveData = capacityDepartments
    .map(department => {
      const loads = annualCapacity.map(period => period.loads.find(item => item.departmentId === department.id)?.load ?? 0);
      const isAnnualView = quarter === 'ALL';
      const load = isAnnualView
        ? loads.reduce((sum, value) => sum + value, 0)
        : loads[(['Q1', 'Q2', 'Q3', 'Q4'] as Quarter[]).indexOf(quarter as Quarter)] ?? 0;
      const limit = department.capacity_limit_points * (isAnnualView ? 4 : 1);
      const reserve = limit - load;
      return { id: department.id, name: department.name, load, limit, reserve };
    })
    .sort((left, right) => left.reserve - right.reserve || right.load - left.load)
    .slice(0, 5);
  const overloadedDepartmentCount = capacityReserveData.filter(department => department.reserve < 0).length;

  // New Graph: Size Breakdown Data
  const sizeData = sizeBreakdown(activeItems, taskWeights, initiativeSizes || []);

  // Priority Distribution Data
  const priorityData = ((priorities || [])).map(pr => {
    const items = activeItems.filter(i => i.priority === pr.id);
    const weightsByHealth = items.reduce<Record<'GREEN' | 'YELLOW' | 'RED' | 'DEFAULT', number>>((totals, item) => {
      totals[normalizeHealthStatus(item.health_status)] += getComputedTotalWeight(item.checklist, taskWeights, item.year, item.quarter);
      return totals;
    }, { GREEN: 0, YELLOW: 0, RED: 0, DEFAULT: 0 });
    const green = weightsByHealth.GREEN;
    const yellow = weightsByHealth.YELLOW;
    const red = weightsByHealth.RED;
    const def = weightsByHealth.DEFAULT;
    const total = green + yellow + red + def;
    return { name: pr.name.split(' (')[0], green, yellow, red, default: def, total }; 
  }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

  // Top Loaded Managers
  const managerData = ((managers || [])).map(m => {
    let load = 0;
    const mgrItems = activeItems.filter(i => i.manager_id === m.id);
    mgrItems.forEach(i => load += getComputedTotalWeight(i.checklist, taskWeights, i.year, i.quarter));
    const projects = mgrItems.filter(i => i.type === 'PROJECT');
    const tasks = mgrItems.filter(i => i.type === 'TASK');
    return {
      id: m.id,
      name: m.name,
      load,
      projectCount: projects.length,
      taskCount: tasks.length,
      items: mgrItems,
      projects,
      tasks
    };
  }).filter(m => m.load > 0).sort((a, b) => b.load - a.load).slice(0, 5);

  // YoY Trends Data
  const getCardCountForPeriod = (targetYear: number, q: Quarter) => getFilteredItems(targetYear, q).length;

  const quartersList = ['Q1', 'Q2', 'Q3', 'Q4'];
  const trendData = quartersList.map(q => ({
    name: q,
    [year.toString()]: getCardCountForPeriod(year, q as Quarter),
    [(year - 1).toString()]: getCardCountForPeriod(year - 1, q as Quarter)
  }));

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2.5 sm:gap-4 items-center w-full">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-bold text-slate-700 w-full sm:w-auto truncate">
            <option value="ALL">Всі разом (Проєкти + Задачі)</option>
            <option value="PROJECTS">Тільки Проєкти</option>
            <option value="TASKS">Тільки Операційні задачі</option>
          </select>
          <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1"></div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium flex-1 sm:flex-initial truncate">
              {getAvailableYears().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select value={quarter} onChange={e => setQuarter(e.target.value as any)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium flex-1 sm:flex-initial truncate">
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
              <option value="ALL">Весь рік</option>
            </select>
          </div>
          <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1"></div>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium w-full sm:w-auto sm:max-w-[200px] truncate">
            <option value="ALL">Всі відділи</option>
            {((departments || [])).map(d => <option key={d.id} value={d.id} title={d.name}>{truncateText(d.name, 70)}</option>)}
          </select>
          <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium w-full sm:w-auto sm:max-w-[200px] truncate">
            <option value="ALL">Всі менеджери</option>
            {((managers || [])).map(m => <option key={m.id} value={m.id} title={m.name}>{truncateText(m.name, 70)}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Загальний прогрес {entityLabelGenitive}</div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-indigo-600">{avgProgress}%</div>
              <div className="text-xs text-slate-400 font-medium">середній за обсягом робіт</div>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${avgProgress}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Статус завдань {entityLabelGenitive}</div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-xs text-slate-500 font-medium uppercase">Виконано</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-700">{scopeGreen}</span>
                  <span className="text-xs text-slate-400 font-medium ml-1">({scopeGreenPct}%)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <span className="text-xs text-slate-500 font-medium uppercase">В процесі</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-700">{scopeYellow}</span>
                  <span className="text-xs text-slate-400 font-medium ml-1">({scopeYellowPct}%)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                  <span className="text-xs text-slate-500 font-medium uppercase">На паузі / блоковано</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-700">{scopeRed}</span>
                  <span className="text-xs text-slate-400 font-medium ml-1">({scopeRedPct}%)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <span className="text-xs text-slate-500 font-medium uppercase">Без статусу</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-700">{scopeDefault}</span>
                  <span className="text-xs text-slate-400 font-medium ml-1">({scopeDefaultPct}%)</span>
                </div>
              </div>
            </div>
          </div>
          {scopeTotal > 0 && (
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 flex overflow-hidden">
              {scopeGreenPct > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${scopeGreenPct}%` }} title={`Виконано: ${scopeGreenPct}%`}></div>}
              {scopeYellowPct > 0 && <div className="bg-amber-500 h-full" style={{ width: `${scopeYellowPct}%` }} title={`В процесі: ${scopeYellowPct}%`}></div>}
              {scopeRedPct > 0 && <div className="bg-rose-500 h-full" style={{ width: `${scopeRedPct}%` }} title={`На паузі / блоковано: ${scopeRedPct}%`}></div>}
              {scopeDefaultPct > 0 && <div className="bg-slate-400 h-full" style={{ width: `${scopeDefaultPct}%` }} title={`Без статусу: ${scopeDefaultPct}%`}></div>}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Об'єм {entityLabelGenitive}</div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-slate-800">{activeItems.length}</div>
              <div className="text-xs text-slate-400 font-medium">у вибраному зрізі</div>
            </div>
          </div>
          <div className="text-sm text-slate-500 font-medium border-t border-slate-100 pt-2 flex justify-between">
            <span>В беклозі на {year} рік:</span>
            <span className="font-bold text-slate-700">{allBacklogCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Середня тривалість {entityLabelGenitive}</div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold text-violet-600">{averageDuration}</div>
              <div className="text-xs text-slate-400 font-medium">кварталів</div>
            </div>
          </div>
          <p className="border-t border-slate-100 pt-2 text-xs font-medium text-slate-500">За всіма наявними квартальними картками {year} року</p>
        </div>

      </div>

      {/* Row 3: Status Analysis */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-500 uppercase text-xs tracking-widest mb-4">Статус {entityLabelGenitive}</h3>
          
          <div className="flex-1 flex flex-col items-center justify-center min-h-[220px]">
            {donutData.length === 0 ? (
              <div className="text-slate-400 text-sm font-medium">Немає даних</div>
            ) : (
              <>
                <div className="w-full h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        className="outline-none"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [value, 'Кількість']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full mt-4 space-y-2 px-2">
                  {donutData.map(d => {
                    const pct = totalStatusItems > 0 ? Math.round((d.value / totalStatusItems) * 100) : 0;
                    return (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{backgroundColor: d.color}}></div>
                          <span className="text-slate-600 font-medium">{d.name}</span>
                        </div>
                        <div className="font-bold text-slate-800 text-right min-w-[50px]">{pct}% <span className="text-slate-400 font-normal text-xs ml-1">({d.value})</span></div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-500 uppercase text-xs tracking-widest mb-4">Історична динаміка статусів {entityLabelGenitive}</h3>
          <div className="flex-1 min-h-[250px]">
             {historyData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400 text-sm font-medium">Немає даних</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip content={<HistoryTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar name="Виконано" dataKey="Виконано" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={60} />
                    <Bar name="В процесі" dataKey="В процесі" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} maxBarSize={60} />
                    <Bar name="На паузі / блоковано" dataKey="На паузі / блоковано" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} maxBarSize={60} />
                    <Bar name="Без статусу" dataKey="Без статусу" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
             )}
          </div>
        </div>
      </div>

      <div className="grid w-full self-start gap-6 xl:grid-cols-12">
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Теплова карта завантаження за кварталами</h3>
              <p className="mt-1 text-xs text-slate-500">Зелений — норма, жовтий — від 80%, червоний — перевищення.</p>
            </div>
            <span className="shrink-0 text-xs font-bold text-slate-500">вага / ліміт</span>
          </div>
          <div className="min-w-[470px] max-h-[300px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            <div className="grid grid-cols-[minmax(126px,1fr)_repeat(4,64px)] gap-2 px-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <span className="text-left">Відділ</span>{(['Q1', 'Q2', 'Q3', 'Q4'] as Quarter[]).map(item => <span key={item}>{item}</span>)}
            </div>
            {capacityDepartments.map(department => (
              <div key={department.id} className="grid grid-cols-[minmax(126px,1fr)_repeat(4,64px)] items-center gap-2">
                <span className="truncate px-1 text-sm font-bold text-slate-700" title={department.name}>{department.name}</span>
                {annualCapacity.map(period => {
                  const load = period.loads.find(item => item.departmentId === department.id)?.load ?? 0;
                  return <span key={period.quarter} className={`rounded-lg border px-1 py-2 text-center text-xs font-extrabold ${capacityTone(load, department.capacity_limit_points)}`}>{load}/{department.capacity_limit_points}</span>;
                })}
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Резерв завантаження</h3>
              <p className="mt-1 text-xs text-slate-500">Вільні бали до {quarter === 'ALL' ? 'суми річних лімітів' : `ліміту ${quarter}`}.</p>
            </div>
            <span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${overloadedDepartmentCount ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              Перевантажено: {overloadedDepartmentCount}
            </span>
          </div>
          {capacityReserveData.length === 0 ? (
            <p className="mt-6 text-sm font-medium text-slate-400">Немає даних для розрахунку.</p>
          ) : (
            <div className="mt-5 grid max-h-[300px] gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2 custom-scrollbar">
              {capacityReserveData.map(department => {
                const isOverloaded = department.reserve < 0;
                const reserveLabel = isOverloaded ? `Перевищення ${Math.abs(department.reserve)}` : `Резерв ${department.reserve}`;
                const tone = isOverloaded
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : department.limit > 0 && department.load / department.limit >= 0.8
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700';
                return (
                  <div key={department.id} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-bold text-slate-700" title={department.name}>{department.name}</span>
                      <span className={`shrink-0 rounded-lg border px-2 py-1 text-xs font-extrabold ${tone}`}>{reserveLabel}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className={isOverloaded ? 'h-full bg-rose-500' : 'h-full bg-indigo-500'} style={{ width: `${Math.min((department.load / Math.max(department.limit, 1)) * 100, 100)}%` }} />
                    </div>
                    <p className="mt-1.5 text-right text-[11px] font-medium text-slate-500">{department.load} з {department.limit} балів</p>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>

      {/* Row 4: Workload & Size Breakdown */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-500 uppercase text-xs tracking-widest mb-4">{quarter === 'ALL' ? 'Пікова завантаженість відділів за кварталами' : `Завантаженість відділів за вагою ${entityLabelGenitive}`}</h3>
          <div className="flex-1 min-h-[250px]">
             {deptWorkloadData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400 text-sm font-medium">Немає даних</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptWorkloadData} margin={{ top: 0, right: 0, left: -20, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" height={68} minTickGap={0} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                    <Bar dataKey="load" name="Сумарна вага" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
             )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-500 uppercase text-xs tracking-widest mb-4">Структура {entityLabelGenitive} за розміром</h3>
          <p className="text-xs text-slate-500 mb-4">Розміри визначено діапазоном ваги.</p>
          <div className="flex-1 min-h-[200px]">
             {sizeData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400 text-sm font-medium">Немає даних</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sizeData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={30} tick={{ fontSize: 12, fill: '#475569', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} formatter={(value) => [value, 'Кількість карток']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                    <Bar dataKey="count" name="Кількість карток" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={28}>
                      {sizeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9'][index % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             )}
          </div>
        </div>
      </div>

      {/* Row 5: Priorities & Trends */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-500 uppercase text-xs tracking-widest mb-4">Пріоритети та статус {entityLabelGenitive}</h3>
          <div className="flex-1 min-h-[250px]">
             {priorityData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400 text-sm font-medium">Немає даних</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} layout="vertical" margin={{ top: 0, right: 30, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar name="Виконано" dataKey="green" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={32} />
                    <Bar name="В процесі" dataKey="yellow" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                    <Bar name="На паузі / блоковано" dataKey="red" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
                    <Bar name="Без статусу" dataKey="default" stackId="a" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-500 uppercase text-xs tracking-widest mb-4">Динаміка обсягу {entityLabelGenitive}: {year} порівняно з {year - 1}</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <RechartsTooltip formatter={(value) => [value, 'Кількість карток']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                <Line name={`Рік ${year}`} type="monotone" dataKey={year.toString()} stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                <Line name={`Рік ${year - 1}`} type="monotone" dataKey={(year - 1).toString()} stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#94a3b8', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 6: Top Managers Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-bold text-slate-500 uppercase text-xs tracking-widest mb-4">ТОП-завантажених менеджерів за вагою {entityLabelGenitive}</h3>
        {managerData.length === 0 ? (
          <div className="flex items-center justify-center text-slate-400 text-sm font-medium py-8">Немає даних</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {managerData.map((d, i) => {
              const displayItems = typeFilter === 'PROJECTS' ? d.projects : typeFilter === 'TASKS' ? d.tasks : d.items;
              
              const tooltipPosClass = 
                i === 0 
                  ? 'left-0 translate-x-0' 
                  : i === managerData.length - 1 
                  ? 'right-0 left-auto translate-x-0' 
                  : 'left-1/2 -translate-x-1/2';

              const arrowPosClass = 
                i === 0 
                  ? 'left-6 translate-x-0' 
                  : i === managerData.length - 1 
                  ? 'right-6 left-auto translate-x-0' 
                  : 'left-1/2 -translate-x-1/2';

              return (
                <div 
                  key={d.id || i} 
                  className="group relative flex flex-col items-center p-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-indigo-300 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm mb-3 shadow-sm border border-indigo-200 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    #{i + 1}
                  </div>
                  <div className="font-bold text-slate-800 text-sm mb-1 w-full truncate px-2 group-hover:text-indigo-600 transition-colors text-center">{d.name}</div>
                  <div className="text-lg font-bold text-indigo-600 group-hover:scale-105 transition-transform">{d.load} <span className="text-[10px] text-slate-400 uppercase tracking-wide">бал.</span></div>

                  {/* Rich Floating Tooltip on Hover */}
                  <div className={`absolute bottom-full mb-3 ${tooltipPosClass} w-64 sm:w-72 max-w-[85vw] p-3.5 bg-slate-900/95 backdrop-blur-md text-white text-xs rounded-2xl shadow-2xl border border-slate-700/60 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50 text-left`}>
                    <div className="font-bold text-slate-100 border-b border-slate-700/80 pb-2 mb-2 flex justify-between items-center">
                      <span className="truncate pr-2">{d.name}</span>
                      <span className="text-indigo-300 font-extrabold shrink-0 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-500/30 text-[11px]">{d.load} бал.</span>
                    </div>

                    <div className="text-[11px] text-slate-300 font-medium mb-2 flex items-center justify-between">
                      <span>{typeFilter === 'PROJECTS' ? 'Проєкти' : typeFilter === 'TASKS' ? 'Задачі' : 'Ініціативи'}:</span>
                      <span className="font-bold text-indigo-300">
                        {displayItems.length} шт. {typeFilter === 'ALL' && `(${d.projectCount} пр. / ${d.taskCount} заді.)`}
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {displayItems.length === 0 ? (
                        <div className="text-slate-400 italic text-[11px]">Немає закріплених записів</div>
                      ) : (
                        displayItems.slice(0, 10).map((item, idx) => (
                          <div key={item.id || idx} className="flex items-start gap-1.5 text-[11px] text-slate-200 leading-tight">
                            <span className={`text-[9px] font-bold px-1 py-0.2 rounded shrink-0 mt-0.5 ${item.type === 'PROJECT' ? 'bg-indigo-900 text-indigo-300 border border-indigo-700' : 'bg-emerald-900 text-emerald-300 border border-emerald-700'}`}>
                              {item.type === 'PROJECT' ? 'П' : 'З'}
                            </span>
                            <span className="line-clamp-2 break-words">{item.name}</span>
                          </div>
                        ))
                      )}
                      {displayItems.length > 10 && (
                        <div className="text-[10px] text-indigo-300 font-semibold italic pt-1 text-center">
                          + ще {displayItems.length - 10} {typeFilter === 'PROJECTS' ? 'проєктів' : typeFilter === 'TASKS' ? 'задач' : 'записів'}
                        </div>
                      )}
                    </div>

                    {/* Arrow down */}
                    <div className={`absolute top-full ${arrowPosClass} -mt-1 border-4 border-transparent border-t-slate-900/95`}></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Planning follow-up widgets */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Готовність підготовчого етапу</h3>
              <p className="mt-1 text-xs text-slate-500">Лише річні записи без квартальної картки.</p>
            </div>
            <span className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm font-extrabold text-indigo-700">{readyPreparationCount}/{preparationReadiness.length}</span>
          </div>
          {preparationReadiness.length === 0 ? (
            <p className="mt-5 text-sm text-slate-400">Немає ініціатив на підготовчому етапі.</p>
          ) : (
            <div className="mt-4 max-h-52 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {preparationReadiness.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                  <span className="truncate text-sm font-bold text-slate-700" title={item.name}>{item.name}</span>
                  <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${item.filled === 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{item.filled}/3 полів</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Контроль плану</h3>
              <p className="mt-1 text-xs text-slate-500">Поля, що потребують уточнення у вибраних квартальних картках.</p>
            </div>
            <span className={`rounded-xl px-3 py-1 text-sm font-extrabold ${planningRisks.length ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>{planningRisks.length}</span>
          </div>
          {planningRisks.length === 0 ? <p className="mt-4 text-sm text-emerald-700">Усі картки мають базові дані для планування.</p> : <div className="mt-4 grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 custom-scrollbar">{planningRisks.map(item => <div key={item.id} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5"><p className="truncate text-sm font-bold text-slate-700" title={item.name}>{item.name}</p><p className="mt-1 text-xs text-amber-800">{item.issues.join(' · ')}</p></div>)}</div>}
        </section>
      </div>

    </div>
  );
};
