export const getPriorityBadgeClass = (priorityId?: string): string => {
  switch (priorityId?.toLowerCase()) {
    case 'critical': return 'border-rose-200 bg-rose-100 text-rose-700';
    case 'high': return 'border-orange-200 bg-orange-100 text-orange-700';
    case 'medium': return 'border-amber-200 bg-amber-100 text-amber-800';
    case 'low': return 'border-emerald-200 bg-emerald-100 text-emerald-700';
    default: return 'border-slate-200 bg-slate-100 text-slate-700';
  }
};
