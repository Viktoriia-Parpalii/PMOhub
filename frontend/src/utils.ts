import { TaskWeightDef, InitiativeSizeDef } from './types';
import { getInitiativeWeight } from './domain/capacity';
export { getHealthColors, getHealthLabel } from './domain/health';


export const getComputedTotalWeight = (checklist: any[] | undefined, taskWeights: TaskWeightDef[], targetYear?: number, targetQuarter?: import('./types').Quarter): number => {
  void targetYear;
  void targetQuarter;
  return getInitiativeWeight(checklist, taskWeights);
};


export const calculateProgress = (checklist: any[]): number | null => {
  if (!checklist || checklist.length === 0) return null;
  const activeItems = checklist.filter(item => item.color !== 'GRAY');
  if (activeItems.length === 0) return null;
  const score = activeItems.reduce((acc, item) => {
    if (item.color === 'GREEN' || item.is_completed) return acc + 1;
    if (item.color === 'YELLOW') return acc + 0.5;
    return acc;
  }, 0);
  return Math.round((score / activeItems.length) * 100);
};

export const generateId = (prefix: string = 'ID') => `${prefix}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

export const getAvailableYears = (startOffset = 3, endOffset = 5): number[] => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - startOffset; y <= currentYear + endOffset; y++) {
    years.push(y);
  }
  return years;
};

export const generatePassword = (length = 8): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

export const truncateText = (str: string | number, length = 60): string => {
  if (!str) return '';
  if (typeof str !== 'string') str = String(str);
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};

/** A quarter becomes archived at 00:00 on the 15th day of the next quarter. */
export const isPeriodLocked = (year: number, quarter: string, now = new Date()): boolean => {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  const currentQuarterNum = Math.floor(currentMonth / 3) + 1;
  
  let qNum = 4;
  if (quarter === 'Q1') qNum = 1;
  if (quarter === 'Q2') qNum = 2;
  if (quarter === 'Q3') qNum = 3;
  if (quarter === 'Q4') qNum = 4;
  
  if (year > currentYear) return false;
  if (year === currentYear && qNum >= currentQuarterNum) return false;
  
  let nextQMonth = 0;
  let nextQYear = year;
  if (qNum === 1) nextQMonth = 3;
  if (qNum === 2) nextQMonth = 6;
  if (qNum === 3) nextQMonth = 9;
  if (qNum === 4) { nextQMonth = 0; nextQYear++; }
  
  const gracePeriodStart = new Date(nextQYear, nextQMonth, 1);
  const gracePeriodEnd = new Date(nextQYear, nextQMonth, 14, 23, 59, 59, 999);
  
  if (now >= gracePeriodStart && now <= gracePeriodEnd) {
    return false;
  }
  
  return true;
};

export const stripHtml = (html: string) => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export const qToNum = (q: string) => {
  if (q === 'Q1') return 1;
  if (q === 'Q2') return 2;
  if (q === 'Q3') return 3;
  if (q === 'Q4') return 4;
  return 5;
};

export const getLatestPriorState = <T extends { year: number, quarter: string }>(
  backlogItem: T,
  targetYear: number,
  targetQuarter: string,
  allActiveCards: T[]
): T => {
  const tQNum = qToNum(targetQuarter);
  
  // Filter active cards for this backlog item that are strictly before targetYear/targetQuarter
  const priorCards = allActiveCards.filter(c => {
    if (c.year < targetYear) return true;
    if (c.year === targetYear && qToNum(c.quarter) < tQNum) return true;
    return false;
  });

  if (priorCards.length === 0) return backlogItem;

  // Sort by year ASC, quarter ASC
  priorCards.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return qToNum(a.quarter) - qToNum(b.quarter);
  });

  // Return the last one
  return priorCards[priorCards.length - 1];
};

export const isBacklogLocked = (year: number, now = new Date()): boolean => {
  if (year >= now.getFullYear()) return false;
  return isPeriodLocked(year, 'Q4', now);
};

export const getNextPeriod = (y: number, q: string): { year: number; quarter: import('./types').Quarter } => {
  if (q === 'Q1') return { year: y, quarter: 'Q2' };
  if (q === 'Q2') return { year: y, quarter: 'Q3' };
  if (q === 'Q3') return { year: y, quarter: 'Q4' };
  return { year: y + 1, quarter: 'Q1' };
};

export const getFutureYears = (itemYear: number, itemQuarter: string): number[] => {
  return getAvailableYears().filter(y => {
    if (y < itemYear) return false;
    if (y === itemYear && qToNum(itemQuarter) >= 4) return false;
    return true;
  });
};

export const getFutureQuarters = (selectedYear: number, itemYear: number, itemQuarter: string): import('./types').Quarter[] => {
  const allQ: import('./types').Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  if (selectedYear === itemYear) {
    return allQ.filter(q => qToNum(q) > qToNum(itemQuarter));
  }
  return allQ;
};

export const getCurrentQuarter = (): import('./types').Quarter => {
  const month = new Date().getMonth();
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
};

export const getCurrentPeriod = (): { year: number; quarter: import('./types').Quarter } => {
  return {
    year: new Date().getFullYear(),
    quarter: getCurrentQuarter(),
  };
};

export const getValidYears = (itemYear?: number): number[] => {
  const currentYear = new Date().getFullYear();
  return getAvailableYears().filter(y => y >= currentYear || (itemYear !== undefined && y === itemYear));
};

export const getValidQuarters = (selectedYear: number, itemYear?: number, itemQuarter?: import('./types').Quarter): import('./types').Quarter[] => {
  const { year: curYear, quarter: curQuarter } = getCurrentPeriod();
  const allQuarters: import('./types').Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  
  if (selectedYear > curYear) {
    return allQuarters;
  }
  
  if (selectedYear === curYear) {
    const curNum = qToNum(curQuarter);
    return allQuarters.filter(q => qToNum(q) >= curNum || (itemYear === curYear && itemQuarter === q));
  }
  
  if (itemQuarter) {
    return [itemQuarter];
  }
  return [curQuarter];
};
