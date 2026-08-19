const fs = require('fs');

function processFile(filename) {
  let content = fs.readFileSync(filename, 'utf-8');
  
  const isProject = filename.includes('ProjectCard');
  const entity = isProject ? 'project' : 'task';

  // 1. Replace the whole block of the grid and the "Стратегічна ціль" below it
  // I will just use regex to match the whole grid block until `</div>` that closes it.
  
  // It's easier to use a manual string replacement since we know the exact content.
  // Wait, `getPriorityColor(project.priority)` is there in ProjectCard, and `task.priority` in TaskCard.
  
  const oldGrid = `
      <div className="ml-2 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mb-4 flex-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Менеджер:</span>
          <span className="font-bold text-slate-800 truncate pl-2">{manager?.name || '—'}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Пріоритет:</span>
          <span className={\`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase \${getPriorityColor(${entity}.priority)}\`}>
            {getPriorityLabel(${entity}.priority)}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Залучені:</span>
          <span className="font-bold text-slate-800 truncate pl-2" title={crossFuncNames}>{crossFuncNames || '—'}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Розмір/Період:</span>
          <span className="font-bold text-slate-800 pl-2">
            {${entity}.capacity_weight${isProject ? '' : " || '—'"} || '—'} • {${entity}.year} {${entity}.quarter}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs col-span-1 sm:col-span-2">
            <span className="text-slate-500">Стратегічна ціль:</span>
            <span className="font-bold text-slate-800 flex items-center gap-1 text-right pl-2 truncate" title={goal ? goal.name : 'Відсутня'}>
              {goal ? '✓' : '—'}
            </span>
          </div>
      </div>
  `.trim();

  // Oh, wait, in ProjectCard.tsx it's `{project.capacity_weight} • {project.year} {project.quarter}` without `|| '—'`.
  // In TaskCard.tsx it's `{task.capacity_weight || '—'} • {task.year} {task.quarter}`.
  // I will just use regex to replace from `<div className="ml-2 grid` to the closing `</div>` of that grid.
  
  const gridRegex = /<div className="ml-2 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mb-4 flex-1">[\s\S]*?<\/div>\s*<\/div>/;

  const newGrid = `      <div className="ml-2 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mb-3 flex-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Менеджер:</span>
          <span className="font-bold text-slate-800 truncate pl-2">{manager?.name || '—'}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Пріоритет:</span>
          <span className={\`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase \${getPriorityColor(${entity}.priority)}\`}>
            {getPriorityLabel(${entity}.priority)}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Стратегічна ціль:</span>
          <span className="font-bold text-slate-800 flex items-center gap-1 text-right pl-2 truncate" title={goal ? goal.name : 'Відсутня'}>
            {goal ? '✓' : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Розмір/Період:</span>
          <span className="font-bold text-slate-800 pl-2">
            {${entity}.capacity_weight${isProject ? '' : " || '—'"}} • {${entity}.year} {${entity}.quarter}
          </span>
        </div>
      </div>

      <div className="ml-2 flex flex-col gap-1.5 mb-4">
        <div className="flex justify-between items-start text-xs">
          <span className="text-slate-500 shrink-0">Виконавці:</span>
          <span className="font-bold text-slate-800 text-right pl-2 break-words" title={implementerNames}>{implementerNames || '—'}</span>
        </div>
        <div className="flex justify-between items-start text-xs">
          <span className="text-slate-500 shrink-0">Залучені:</span>
          <span className="font-bold text-slate-800 text-right pl-2 break-words" title={crossFuncNames}>{crossFuncNames || '—'}</span>
        </div>
      </div>`;

  content = content.replace(gridRegex, newGrid);
  fs.writeFileSync(filename, content);
}

processFile('src/components/ProjectCard.tsx');
processFile('src/components/TaskCard.tsx');

console.log("Updated!");
