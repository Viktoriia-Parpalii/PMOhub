import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  Project, 
  OperationalTask, 
  Department, 
  Manager, 
  PriorityDef, 
  TaskWeightDef, InitiativeSizeDef, 
  CustomFieldDef, 
  Quarter, 
  HealthStatus,
  ChecklistItem
} from '../types';
import { stripHtml, calculateProgress, getComputedTotalWeight } from '../utils';
import { materializeBacklogYear } from '../domain/initiatives';

interface ExcelExportParams {
  projects: Project[];
  tasks: OperationalTask[];
  departments: Department[];
  managers: Manager[];
  priorities: PriorityDef[];
  taskWeights: TaskWeightDef[];
  initiativeSizes: InitiativeSizeDef[];
  customFields: CustomFieldDef[];
  selectedYear?: number | 'ALL';
}

interface ItemMetadata {
  health_status?: HealthStatus;
  checklist?: ChecklistItem[];
}

const getHealthStatusText = (status?: HealthStatus): string => {
  switch (status) {
    case 'GREEN': return 'Виконано';
    case 'YELLOW': return 'В процесі';
    case 'RED': return 'Блокер / На паузі';
    case 'DEFAULT':
    default:
      return 'Без статусу';
  }
};

/**
 * Builds ExcelJS rich text runs so each task line in scope has its own exact font color
 */
const buildScopeRichText = (checklist?: ChecklistItem[]): ExcelJS.RichText[] | string => {
  if (!checklist || checklist.length === 0) return '—';

  const richRuns: ExcelJS.RichText[] = [];

  checklist.forEach((item, idx) => {
    let argbColor = 'FF475569'; // default slate gray
    let statusLabel = '[⚪ Очікує]';
    let isBold = false;

    if (item.color === 'GREEN' || (item.is_completed && (!item.color || item.color === 'DEFAULT'))) {
      argbColor = 'FF15803D'; // Emerald green
      statusLabel = '[🟢 Виконано]';
      isBold = true;
    } else if (item.color === 'YELLOW') {
      argbColor = 'FFB45309'; // Amber
      statusLabel = '[🟡 В процесі]';
      isBold = true;
    } else if (item.color === 'RED') {
      argbColor = 'FFBE123C'; // Rose/Red
      statusLabel = '[🔴 Блокер]';
      isBold = true;
    }

    const isLast = idx === checklist.length - 1;
    const taskLineText = `${idx + 1}. ${statusLabel} ${item.text}${isLast ? '' : '\n'}`;

    richRuns.push({
      text: taskLineText,
      font: {
        name: 'Calibri',
        size: 10,
        color: { argb: argbColor },
        bold: isBold
      }
    });
  });

  return richRuns;
};

const formatChecklistSummary = (checklist?: { is_completed: boolean }[]): string => {
  if (!checklist || checklist.length === 0) return '—';
  const done = checklist.filter(c => c.is_completed).length;
  return `${done}/${checklist.length}`;
};

const formatCustomFieldValue = (val: unknown, cf: CustomFieldDef): string => {
  if (val === undefined || val === null || val === '') return '—';
  if (cf.type === 'CHECKBOX') {
    return val ? 'Так' : 'Ні';
  }
  if (cf.type === 'RICHTEXT') {
    return stripHtml(String(val));
  }
  if (Array.isArray(val)) {
    return val.join(', ');
  }
  return String(val);
};

// Styling helper constants
const borderThin: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
};

const getNameStyles = (status?: HealthStatus | string) => {
  switch (status) {
    case 'GREEN':
    case 'Виконано':
      return {
        fill: {
          type: 'pattern' as const,
          pattern: 'solid' as const,
          fgColor: { argb: 'FFD1E7DD' } // Soft Mint green fill
        },
        font: {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: { argb: 'FF0F5132' }
        },
        border: {
          top: { style: 'thin' as const, color: { argb: 'FFA3D9B1' } },
          bottom: { style: 'thin' as const, color: { argb: 'FFA3D9B1' } },
          left: { style: 'thin' as const, color: { argb: 'FFA3D9B1' } },
          right: { style: 'thin' as const, color: { argb: 'FFA3D9B1' } }
        }
      };
    case 'YELLOW':
    case 'В процесі':
      return {
        fill: {
          type: 'pattern' as const,
          pattern: 'solid' as const,
          fgColor: { argb: 'FFFFF3CD' } // Warm yellow/amber fill
        },
        font: {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: { argb: 'FF78350F' }
        },
        border: {
          top: { style: 'thin' as const, color: { argb: 'FFFDE68A' } },
          bottom: { style: 'thin' as const, color: { argb: 'FFFDE68A' } },
          left: { style: 'thin' as const, color: { argb: 'FFFDE68A' } },
          right: { style: 'thin' as const, color: { argb: 'FFFDE68A' } }
        }
      };
    case 'RED':
    case 'Блокер / На паузі':
    case 'Блокер':
      return {
        fill: {
          type: 'pattern' as const,
          pattern: 'solid' as const,
          fgColor: { argb: 'FFF8D7DA' } // Soft rose/red fill
        },
        font: {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: { argb: 'FF842029' }
        },
        border: {
          top: { style: 'thin' as const, color: { argb: 'FFFCA5A5' } },
          bottom: { style: 'thin' as const, color: { argb: 'FFFCA5A5' } },
          left: { style: 'thin' as const, color: { argb: 'FFFCA5A5' } },
          right: { style: 'thin' as const, color: { argb: 'FFFCA5A5' } }
        }
      };
    case 'DEFAULT':
    case 'Без статусу':
    default:
      return {
        fill: {
          type: 'pattern' as const,
          pattern: 'solid' as const,
          fgColor: { argb: 'FFF1F5F9' } // Light slate fill
        },
        font: {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: { argb: 'FF334155' }
        },
        border: {
          top: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } }
        }
      };
  }
};

const getStatusBadgeStyles = (statusVal?: string) => {
  if (statusVal === 'Виконано') {
    return {
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFDCFCE7' }
      },
      font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } }
    };
  }
  if (statusVal === 'В процесі') {
    return {
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFFEF3C7' }
      },
      font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB45309' } }
    };
  }
  if (statusVal === 'Блокер / На паузі' || statusVal === 'Блокер') {
    return {
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFFEE2E2' }
      },
      font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } }
    };
  }
  return {
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFF8FAFC' }
    },
    font: { name: 'Calibri', size: 10, bold: false, color: { argb: 'FF64748B' } }
  };
};

/**
 * Applies custom headers, cell formats, rich text, fills, and column widths to an ExcelJS worksheet
 */
const formatWorksheet = (
  ws: ExcelJS.Worksheet, 
  headers: string[], 
  rows: Array<Record<string, ExcelJS.CellValue>>, 
  metaList?: ItemMetadata[]
) => {
  // Set Columns
  ws.columns = headers.map(h => ({
    header: h,
    key: h,
    width: Math.max(h.length + 4, 15)
  }));

  // Format Header Row (Row 1)
  const headerRow = ws.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FF0F2942' }
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' } // Light blue fill
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF8EA9DB' } },
      bottom: { style: 'medium', color: { argb: 'FF41719C' } },
      left: { style: 'thin', color: { argb: 'FFB4C6E7' } },
      right: { style: 'thin', color: { argb: 'FFB4C6E7' } }
    };
  });

  const nameColumnKeys = new Set(['Назва', 'Назва проєкту', 'Назва задачі', 'Показник']);

  // Add Data Rows
  rows.forEach((rowData, idx) => {
    const row = ws.addRow(rowData);
    const meta = metaList ? metaList[idx] : undefined;
    const isEvenRow = (idx + 2) % 2 === 0;

    // Calculate row height based on content
    let lineCount = 1;
    headers.forEach(h => {
      const val = rowData[h];
      if (typeof val === 'string') {
        const lines = val.split('\n').length;
        if (lines > lineCount) lineCount = lines;
      }
    });
    if (meta?.checklist && meta.checklist.length > lineCount) {
      lineCount = meta.checklist.length;
    }
    row.height = Math.max(24, Math.min(lineCount * 18, 180));

    headers.forEach(headerKey => {
      const cell = row.getCell(headerKey);
      const isNameCol = nameColumnKeys.has(headerKey);
      const isStatusCol = headerKey === 'Статус ініціативи' || headerKey === 'Статус у беклозі';
      const isScopeCol = headerKey === 'Деталі скоупу (чекліст)';
      
      const isCenterCol = 
        headerKey === 'ID' || 
        headerKey === 'Рік' || 
        headerKey === 'Квартал' || 
        headerKey === 'Пріоритет' || 
        isStatusCol || 
        headerKey.includes('(%)') || 
        headerKey.includes('Квартали') || 
        headerKey.includes('(виконано/всього)') || 
        headerKey === 'ID у беклозі';

      if (isNameCol && meta && meta.health_status) {
        // 1. Name Column -> Status background fill & colored bold text
        const nameSt = getNameStyles(meta.health_status);
        cell.fill = nameSt.fill;
        cell.font = nameSt.font;
        cell.border = nameSt.border;
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      } else if (isStatusCol) {
        // 2. Status Badge Column
        const valStr = String(cell.value || '');
        const badgeSt = getStatusBadgeStyles(valStr);
        cell.fill = badgeSt.fill;
        cell.font = badgeSt.font;
        cell.border = borderThin;
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      } else if (isScopeCol) {
        // 3. Scope Details (Checklist) Column -> Rich Text with individual colored task text
        if (meta && meta.checklist && meta.checklist.length > 0) {
          const richValue = buildScopeRichText(meta.checklist);
          if (Array.isArray(richValue)) {
            cell.value = { richText: richValue };
          }
        }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEvenRow ? 'FFF8FAFC' : 'FFFFFFFF' }
        };
        cell.border = borderThin;
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      } else {
        // 4. Default Data Column
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEvenRow ? 'FFF8FAFC' : 'FFFFFFFF' }
        };
        cell.font = {
          name: 'Calibri',
          size: 10,
          bold: isNameCol,
          color: { argb: isNameCol ? 'FF0F172A' : 'FF334155' }
        };
        cell.border = borderThin;
        cell.alignment = { 
          vertical: 'middle', 
          horizontal: isCenterCol ? 'center' : 'left', 
          wrapText: true 
        };
      }
    });
  });

  // Optimize Column Widths
  headers.forEach((h, colIdx) => {
    let maxLen = h.length;
    rows.forEach(r => {
      const val = r[h];
      if (val !== undefined && val !== null) {
        const lines = String(val).split('\n');
        for (const line of lines) {
          if (line.length > maxLen) maxLen = line.length;
        }
      }
    });
    const col = ws.getColumn(colIdx + 1);
    col.width = Math.min(Math.max(maxLen + 4, 15), 65);
  });
};

export const exportPortfolioToExcel = async ({
  projects,
  tasks,
  departments,
  managers,
  priorities: _priorities,
  taskWeights, initiativeSizes,
  customFields,
  selectedYear = 'ALL'
}: ExcelExportParams): Promise<string> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PMO Hub';
  wb.lastModifiedBy = 'PMO Hub';
  wb.created = new Date();
  wb.modified = new Date();

  // Helper resolvers
  const resolveManager = (id?: string) => ((managers || [])).find(m => m.id === id)?.name || '—';
  const resolveDepts = (ids?: string[]) => (ids || []).map(id => ((departments || [])).find(d => d.id === id)?.name).filter(Boolean).join(', ') || '—';
  
  // Import getComputedTotalWeight is at the top, but we need to pass year/quarter
  // Let's change getComputedSizeName signature to include year and quarter
  const getComputedSizeName = (checklist: ChecklistItem[]) => {
    const total = getComputedTotalWeight(checklist, taskWeights || []);
    if (total === 0) return '—';
    const s = ((initiativeSizes || [])).find(sz => total >= sz.min_score && total <= sz.max_score);
    return s ? `${s.name} (${total} б.)` : '—';
  };


  // Collect all available years
  const allYearsSet = new Set<number>();
  projects.forEach(p => p.year && allYearsSet.add(p.year));
  tasks.forEach(t => t.year && allYearsSet.add(t.year));
  projects.filter(item => item.is_backlog).forEach(item => Object.keys(item.yearSnapshots ?? {}).forEach(year => allYearsSet.add(Number(year))));
  tasks.filter(item => item.is_backlog).forEach(item => Object.keys(item.yearSnapshots ?? {}).forEach(year => allYearsSet.add(Number(year))));
  
  if (allYearsSet.size === 0) {
    allYearsSet.add(new Date().getFullYear());
  }

  let years = Array.from(allYearsSet).sort((a, b) => a - b);
  if (selectedYear !== 'ALL') {
    years = years.filter(y => y === selectedYear);
    if (years.length === 0) years = [selectedYear];
  }

  // -------------------------------------------------------------
  // 1. SHEET: АНАЛІТИКА (Analytics)
  // -------------------------------------------------------------
  const quarters: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  const periodStatsRows: Array<Record<string, ExcelJS.CellValue>> = [];

  years.forEach(year => {
    quarters.forEach(q => {
      const qProjects = ((projects || [])).filter(p => !p.is_backlog && p.year === year && p.quarter === q);
      const qTasks = ((tasks || [])).filter(t => !t.is_backlog && t.year === year && t.quarter === q);
      const totalCount = qProjects.length + qTasks.length;

      let totalCapacity = 0;
      qProjects.forEach(p => totalCapacity += getComputedTotalWeight(p.checklist || [], taskWeights || []));
      qTasks.forEach(t => totalCapacity += getComputedTotalWeight(t.checklist || [], taskWeights || []));

      const greenCount = [...qProjects, ...qTasks].filter(item => item.health_status === 'GREEN').length;
      const yellowCount = [...qProjects, ...qTasks].filter(item => item.health_status === 'YELLOW').length;
      const redCount = [...qProjects, ...qTasks].filter(item => item.health_status === 'RED').length;
      const defaultCount = [...qProjects, ...qTasks].filter(item => !item.health_status || item.health_status === 'DEFAULT').length;

      const completionRate = totalCount > 0 ? Math.round((greenCount / totalCount) * 100) : 0;

      periodStatsRows.push({
        'Рік': year,
        'Квартал': q,
        'Проєкти (кількість)': qProjects.length,
        'Операційні задачі': qTasks.length,
        'Всього ініціатив': totalCount,
        'Сумарна місткість (Capacity)': totalCapacity,
        'Виконано (Green)': greenCount,
        'В процесі (Yellow)': yellowCount,
        'Блокер/На паузі (Red)': redCount,
        'Без статусу (Default)': defaultCount,
        'Відсоток виконання (%)': `${completionRate}%`
      });
    });
  });

  const wsAnalytics = wb.addWorksheet('Аналітика');
  const analyticsHeaders = Object.keys(periodStatsRows[0] || {});
  formatWorksheet(wsAnalytics, analyticsHeaders, periodStatsRows);

  // -------------------------------------------------------------
  // 2. SHEETS FOR EACH YEAR: 
  //    - Беклог_{year}_Проєкти
  //    - Беклог_{year}_Задачі
  //    - Q1..Q4_{year}_Проєкти та Q1..Q4_{year}_Задачі
  // -------------------------------------------------------------
  const projCustomFields = (customFields || []).filter(cf => cf.entityType === 'project');
  const taskCustomFields = (customFields || []).filter(cf => cf.entityType === 'task');
  const backlogCustomFields = (customFields || []).filter(cf => cf.entityType === 'backlog');

  years.forEach(year => {
    // --- 2.1 SHEET: Беклог_{year}_Проєкти ---
    const backlogProjects = ((projects || [])).filter(p => p.is_backlog && p.yearSnapshots?.[String(year)]).map(p => materializeBacklogYear(p, year)!);
    const backlogProjMetadata: ItemMetadata[] = backlogProjects.map(p => ({
      health_status: p.health_status,
      checklist: p.checklist
    }));

    const backlogProjRows = backlogProjects.map(item => {
      const activeQuarterItems = ((projects || [])).filter(p => !p.is_backlog && p.backlog_id === item.id && p.year === year);
      const activeQuarters = activeQuarterItems.map(c => c.quarter).sort().join(', ') || 'Не призначено';

      const getQuarterDetails = (q: Quarter) => {
        const card = activeQuarterItems.find(c => c.quarter === q);
        if (!card) return '—';
        const prog = calculateProgress(card.checklist);
        const progStr = prog !== null ? `, Прогрес: ${prog}%` : '';
        return `В роботі [${getHealthStatusText(card.health_status)}${progStr}]`;
      };

      const row: Record<string, ExcelJS.CellValue> = {
        'ID': item.id,
        'Назва проєкту': item.name,
        'Менеджер проєкту': resolveManager(item.manager_id),
        'Стратегічна задача': item.strategic_goal || '—',
        'Пріоритет': item.priority || '—',
        'Виконавці підрозділи': resolveDepts(item.implementer_dept_ids),
        'Крос-функціональні підрозділи': resolveDepts(item.cross_functional_dept_ids),
        'Оцінка місткості': getComputedSizeName(item.checklist || []),
        'Статус у беклозі': getHealthStatusText(item.health_status),
        'Квартали реалізації': activeQuarters,
        'Реалізація в Q1': getQuarterDetails('Q1'),
        'Реалізація в Q2': getQuarterDetails('Q2'),
        'Реалізація в Q3': getQuarterDetails('Q3'),
        'Реалізація в Q4': getQuarterDetails('Q4'),
        'Чекліст (виконано/всього)': formatChecklistSummary(item.checklist),
        'Деталі скоупу (чекліст)': item.checklist && item.checklist.length > 0 ? '' : '—',
        'Примітки / Опис': stripHtml(item.notes || '') || '—'
      };

      backlogCustomFields.forEach(cf => {
        row[`[Поле] ${cf.name}`] = formatCustomFieldValue(item.custom_fields?.[cf.id], cf);
      });

      return row;
    });

    const backlogProjSheetName = `Беклог_${year}_Проєкти`.slice(0, 31);
    const wsBacklogProj = wb.addWorksheet(backlogProjSheetName);
    const backlogProjHeaders = backlogProjRows.length > 0 
      ? Object.keys(backlogProjRows[0]) 
      : ['Повідомлення'];
    formatWorksheet(
      wsBacklogProj, 
      backlogProjHeaders, 
      backlogProjRows.length > 0 ? backlogProjRows : [{ 'Повідомлення': 'Немає проєктів у беклозі за цей рік' }], 
      backlogProjMetadata
    );

    // --- 2.2 SHEET: Беклог_{year}_Задачі ---
    const backlogTasks = ((tasks || [])).filter(t => t.is_backlog && t.yearSnapshots?.[String(year)]).map(t => materializeBacklogYear(t, year)!);
    const backlogTaskMetadata: ItemMetadata[] = backlogTasks.map(t => ({
      health_status: t.health_status,
      checklist: t.checklist
    }));

    const backlogTaskRows = backlogTasks.map(item => {
      const activeQuarterItems = ((tasks || [])).filter(t => !t.is_backlog && t.backlog_id === item.id && t.year === year);
      const activeQuarters = activeQuarterItems.map(c => c.quarter).sort().join(', ') || 'Не призначено';

      const getQuarterDetails = (q: Quarter) => {
        const card = activeQuarterItems.find(c => c.quarter === q);
        if (!card) return '—';
        const prog = calculateProgress(card.checklist);
        const progStr = prog !== null ? `, Прогрес: ${prog}%` : '';
        return `В роботі [${getHealthStatusText(card.health_status)}${progStr}]`;
      };

      const row: Record<string, ExcelJS.CellValue> = {
        'ID': item.id,
        'Назва задачі': item.name,
        'Менеджер задачі': resolveManager(item.manager_id),
        'Стратегічна задача': item.strategic_goal || '—',
        'Пріоритет': item.priority || '—',
        'Виконавці підрозділи': resolveDepts(item.implementer_dept_ids),
        'Крос-функціональні підрозділи': resolveDepts(item.cross_functional_dept_ids),
        'Оцінка місткості': getComputedSizeName(item.checklist || []),
        'Статус у беклозі': getHealthStatusText(item.health_status),
        'Квартали реалізації': activeQuarters,
        'Реалізація в Q1': getQuarterDetails('Q1'),
        'Реалізація в Q2': getQuarterDetails('Q2'),
        'Реалізація в Q3': getQuarterDetails('Q3'),
        'Реалізація в Q4': getQuarterDetails('Q4'),
        'Чекліст (виконано/всього)': formatChecklistSummary(item.checklist),
        'Деталі скоупу (чекліст)': item.checklist && item.checklist.length > 0 ? '' : '—',
        'Примітки / Опис': stripHtml(item.notes || '') || '—'
      };

      backlogCustomFields.forEach(cf => {
        row[`[Поле] ${cf.name}`] = formatCustomFieldValue(item.custom_fields?.[cf.id], cf);
      });

      return row;
    });

    const backlogTaskSheetName = `Беклог_${year}_Задачі`.slice(0, 31);
    const wsBacklogTask = wb.addWorksheet(backlogTaskSheetName);
    const backlogTaskHeaders = backlogTaskRows.length > 0 
      ? Object.keys(backlogTaskRows[0]) 
      : ['Повідомлення'];
    formatWorksheet(
      wsBacklogTask, 
      backlogTaskHeaders, 
      backlogTaskRows.length > 0 ? backlogTaskRows : [{ 'Повідомлення': 'Немає операційних задач у беклозі за цей рік' }], 
      backlogTaskMetadata
    );

    // --- 2.3 SHEETS: Q1..Q4_{year}_Проєкти та Q1..Q4_{year}_Задачі ---
    quarters.forEach(q => {
      // Projects Sheet
      const qProjects = ((projects || [])).filter(p => !p.is_backlog && p.year === year && p.quarter === q);
      const qProjMetadata: ItemMetadata[] = qProjects.map(p => ({
        health_status: p.health_status,
        checklist: p.checklist
      }));

      const projRows = qProjects.map(p => {
        const prog = calculateProgress(p.checklist);
        const row: Record<string, ExcelJS.CellValue> = {
          'ID': p.id,
          'Назва проєкту': p.name,
          'Менеджер проєкту': resolveManager(p.manager_id),
          'Статус ініціативи': getHealthStatusText(p.health_status),
          'Стратегічна задача': p.strategic_goal || '—',
          'Пріоритет': p.priority || '—',
          'Виконавці підрозділи': resolveDepts(p.implementer_dept_ids),
          'Крос-функціональні підрозділи': resolveDepts(p.cross_functional_dept_ids),
          'Оцінка місткості': getComputedSizeName(p.checklist || []),
          'Прогрес виконання (%)': prog !== null ? `${prog}%` : '—',
          'Чекліст (виконано/всього)': formatChecklistSummary(p.checklist),
          'Деталі скоупу (чекліст)': p.checklist && p.checklist.length > 0 ? '' : '—',
          'ID у беклозі': p.backlog_id || '—',
          'Примітки / Опис': stripHtml(p.notes || '') || '—'
        };

        projCustomFields.forEach(cf => {
          row[`[Поле] ${cf.name}`] = formatCustomFieldValue(p.custom_fields?.[cf.id], cf);
        });

        return row;
      });

      const projSheetName = `${q}_${year}_Проєкти`.slice(0, 31);
      const wsProj = wb.addWorksheet(projSheetName);
      const projHeaders = projRows.length > 0 ? Object.keys(projRows[0]) : ['Повідомлення'];
      formatWorksheet(
        wsProj, 
        projHeaders, 
        projRows.length > 0 ? projRows : [{ 'Повідомлення': `Немає проєктів у ${q} ${year}` }], 
        qProjMetadata
      );

      // Tasks Sheet
      const qTasks = ((tasks || [])).filter(t => !t.is_backlog && t.year === year && t.quarter === q);
      const qTaskMetadata: ItemMetadata[] = qTasks.map(t => ({
        health_status: t.health_status,
        checklist: t.checklist
      }));

      const taskRows = qTasks.map(t => {
        const prog = calculateProgress(t.checklist);
        const row: Record<string, ExcelJS.CellValue> = {
          'ID': t.id,
          'Назва задачі': t.name,
          'Менеджер задачі': resolveManager(t.manager_id),
          'Статус ініціативи': getHealthStatusText(t.health_status),
          'Стратегічна задача': t.strategic_goal || '—',
          'Пріоритет': t.priority || '—',
          'Виконавці підрозділи': resolveDepts(t.implementer_dept_ids),
          'Крос-функціональні підрозділи': resolveDepts(t.cross_functional_dept_ids),
          'Оцінка місткості': getComputedSizeName(t.checklist || []),
          'Прогрес виконання (%)': prog !== null ? `${prog}%` : '—',
          'Чекліст (виконано/всього)': formatChecklistSummary(t.checklist),
          'Деталі скоупу (чекліст)': t.checklist && t.checklist.length > 0 ? '' : '—',
          'ID у беклозі': t.backlog_id || '—',
          'Примітки / Опис': stripHtml(t.notes || '') || '—'
        };

        taskCustomFields.forEach(cf => {
          row[`[Поле] ${cf.name}`] = formatCustomFieldValue(t.custom_fields?.[cf.id], cf);
        });

        return row;
      });

      const taskSheetName = `${q}_${year}_Задачі`.slice(0, 31);
      const wsTask = wb.addWorksheet(taskSheetName);
      const taskHeaders = taskRows.length > 0 ? Object.keys(taskRows[0]) : ['Повідомлення'];
      formatWorksheet(
        wsTask, 
        taskHeaders, 
        taskRows.length > 0 ? taskRows : [{ 'Повідомлення': `Немає операційних задач у ${q} ${year}` }], 
        qTaskMetadata
      );
    });
  });

  // Generate file name with current date
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `PMO_Hub_Portfolio_Report_${dateStr}.xlsx`;

  // Write to buffer and trigger download in browser
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, fileName);

  return fileName;
};
