export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type InitiativeKind = 'PROJECT' | 'TASK';

export interface WeightSnapshot { definitionId?: string; name: string; value: number }
export interface SizeSnapshot { definitionId?: string; name: string; totalWeight: number }
export interface ChecklistItemInput {
  id?: string;
  text: string;
  is_completed?: boolean;
  color?: string;
  weightId?: string;
  weightSnapshot?: WeightSnapshot;
  assigneeIds?: string[];
  implementer_dept_ids?: string[];
  moved_from?: string;
}

export interface PassportInput {
  name: string;
  strategic_goal?: string;
  manager_id?: string;
  priority?: string;
  notes?: string;
  implementer_dept_ids?: string[];
  cross_functional_dept_ids?: string[];
  custom_fields?: Record<string, unknown>;
}

export interface ScopeMergePreview {
  token: string;
  sourceCardId: string;
  targetCardId: string;
  sourcePeriod: string;
  targetPeriod: string;
  incomingCount: number;
  addedCount: number;
  duplicateItemIds: string[];
  deletesSource: boolean;
}

export interface CommandResult<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  requiresConfirmation?: ScopeMergePreview;
}
