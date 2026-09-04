export interface HistoryEvent {
  id: string;
  date: string;
  author: string;
  action: string;
}

export type CapacityWeight = string;
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

export interface InitiativeListFilters {
  name?: string;
  strategic_goal?: string;
  manager_id?: string;
  priority_id?: string;
  quarter?: Quarter;
}

export interface BacklogCounts {
  projects: { filtered: number; total: number };
  operational_tasks: { filtered: number; total: number };
}
export type HealthStatus = string;
/** Stable role code supplied by the backend roles dictionary. */
export type UserRole = string;

export type InitiativeKind = "PROJECT" | "OPERATIONAL_TASK";
export type ScopeStatusCode = "DEFAULT" | "GREEN" | "YELLOW" | "RED";

export interface PreparationStageReadModel {
  initiative_year_id: string;
  manager_id: string | null;
  manager: { id: string; name: string } | null;
  priority_id: string | null;
  priority: { id: string; name: string } | null;
  department_ids: string[];
  departments: Array<{ id: string; name: string }>;
  revision: number;
}

export interface QuarterCardSummary {
  id: string;
  quarter: Quarter;
  status_id: string;
  status_code: string;
  manager_id: string | null;
  priority_id: string | null;
  revision: number;
  total_weight: number;
  is_locked: boolean;
  locked_at: string;
}

export interface InitiativeYearReadModel {
  id: string;
  initiative_id: string;
  kind: InitiativeKind;
  name: string;
  initiative_revision: number;
  year: number;
  strategic_goal: string | null;
  revision: number;
  preparation: PreparationStageReadModel | null;
  cards: QuarterCardSummary[];
  is_locked: boolean;
  locked_at: string;
}

export interface ScopeItemReadModel {
  id: string;
  lineage_id?: string;
  copied_from_item_id?: string | null;
  text: string;
  status_code: ScopeStatusCode;
  weight_definition_id?: string;
  weight_snapshot?: { name: string; value: number };
  executor_department_ids: string[];
  executors?: Array<{ id: string; name: string }>;
  moved_from_card_id?: string | null;
  revision?: number;
}

export interface QuarterCardReadModel {
  id: string;
  initiative_year_id: string;
  initiative_id: string;
  kind: InitiativeKind;
  name: string;
  strategic_goal: string | null;
  year: number;
  quarter: Quarter;
  manager_id: string | null;
  manager: { id: string; name: string } | null;
  priority_id: string | null;
  priority: { id: string; name: string } | null;
  department_ids: string[];
  effective_involved_department_ids: string[];
  status_id: string;
  status_code: string;
  status: { id: string; code: string; name: string; color: string };
  notes: string | null;
  total_weight: number;
  size_snapshot: {
    definition_id: string | null;
    name: string;
    min: number | null;
    max: number | null;
  };
  custom_fields: Record<string, unknown>;
  scope: ScopeItemReadModel[];
  moved_from: { year: number; quarter: Quarter } | null;
  revision: number;
  is_locked: boolean;
  locked_at: string;
}

export interface BacklogQuarterCardSummary {
  id: string;
  initiative_year_id: string;
  initiative_id: string;
  kind: InitiativeKind;
  name: string;
  year: number;
  quarter: Quarter;
  manager_id: string | null;
  priority_id: string | null;
  effective_involved_department_ids: string[];
  status_id: string;
  status_code: string;
  status: { id: string; code: string; name: string; color: string };
  scope_total: number;
  scope_completed: number;
  total_weight: number;
  revision: number;
  is_locked: boolean;
  locked_at: string;
}

export interface User {
  password?: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  must_change_password?: boolean;
}

export interface RolePermissions {
  role: UserRole;
  roleName?: string;
  isSystem?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  canCreateEditInitiatives: boolean;
  canDeleteInitiatives: boolean;
  canAccessAdmin: boolean;
  isReadOnly: boolean;
  canEditArchive: boolean;
}

export type CustomFieldType =
  | "TEXT"
  | "NUMBER"
  | "SELECT"
  | "CHECKBOX"
  | "RICHTEXT";

export interface CustomFieldDef {
  id: string;
  entityType: "project" | "task";
  name: string;
  type: CustomFieldType;
  isRequired: boolean;
  options?: string[]; // for SELECT
  showInTable?: boolean;
  showInCards?: boolean;
  isActive?: boolean;
}

export interface Department {
  id: string;
  name: string;
  capacity_limit_points: number;
  is_active: boolean;
}

export interface Manager {
  id: string;
  name: string;
  department_id?: string;
  is_active: boolean;
}

export interface ChecklistItem {
  id: string;
  revision?: number;
  text: string;
  is_completed: boolean;
  color?: "GREEN" | "YELLOW" | "RED" | "GRAY" | "DEFAULT";
  status_id?: string;
  status_code?: string;
  weightId?: string;
  /** Незмінний знімок довідникової ваги для історичних розрахунків. */
  weightSnapshot?: TaskWeightSnapshot;
  assigneeIds?: string[];
  implementer_dept_ids?: string[];
  moved_from?: string;
  history?: HistoryEvent[];
}

export interface TaskWeightSnapshot {
  definitionId?: string;
  name: string;
  value: number;
}

/** Розмір фіксується на квартальній картці, а не обчислюється з актуального довідника. */
export interface InitiativeSizeSnapshot {
  definitionId?: string;
  name: string;
  totalWeight: number;
}

export interface MutationResult<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  status?: "COMMIT_FAILED" | "COMMITTED_REFRESH_FAILED" | "SUCCESS";
  committed?: boolean;
  errorCode?: string;
}

export type Priority = string;
export interface InitiativeMetadata {
  name: string;
  strategic_goal?: string;
  implementer_dept_ids: string[];
  manager_id?: string;
  priority?: Priority;
  notes?: string;
  cross_functional_dept_ids: string[];
  custom_fields?: Record<string, unknown>;
}

export interface InitiativeYearContext extends InitiativeMetadata {
  year: number;
  history: HistoryEvent[];
  preparationStage?: PreparationStage;
}

/** Дані «нульового кварталу». Вони існують лише у річному записі беклогу. */
export interface PreparationStage {
  revision?: number;
  manager_id?: string;
  priority?: Priority;
  cross_functional_dept_ids: string[];
  notes?: string;
  custom_fields?: Record<string, unknown>;
  history: HistoryEvent[];
}

export interface InitiativeViewModel extends InitiativeMetadata {
  id: string;
  /** Server optimistic-concurrency version. */
  revision?: number;
  initiative_revision?: number;
  initiative_id: string;
  initiative_year_id?: string;
  year: number;
  preparation_stage?: PreparationStage;
  quarter: Quarter;
  health_status: HealthStatus;
  health_status_id?: string;
  health_status_code?: string;
  checklist: ChecklistItem[];
  scope_summary?: { total: number; completed: number };
  record_type: "YEAR" | "CARD";
  moved_from?: string;
  history?: HistoryEvent[];
  sizeSnapshot?: InitiativeSizeSnapshot;
  is_locked?: boolean;
  locked_at?: string;
}

export interface PriorityDef {
  id: string;
  name: string;
  color?: string;
  is_active: boolean;
}

export interface InitiativeStatusDef {
  id: string;
  code?: string;
  name: string;
  color: string;
  is_active: boolean;
}

export interface TaskWeightDef {
  id: string;
  name: string;
  weight: number;
  is_active: boolean;
  is_default?: boolean;
  is_system?: boolean;
}

export interface InitiativeSizeDef {
  id: string;
  name: string;
  min_score: number;
  max_score: number;
  is_active: boolean;
}

export interface ReferenceDataState {
  businessPeriod: {
    year: number;
    quarter: Quarter;
    business_date: string;
    time_zone: "Europe/Kyiv";
  };
  departments: Department[];
  priorities: PriorityDef[];
  initiativeStatuses: InitiativeStatusDef[];
  taskWeights: TaskWeightDef[];
  initiativeSizes: InitiativeSizeDef[];
  managers: Manager[];
  projects: InitiativeViewModel[];
  tasks: InitiativeViewModel[];
  users: User[];
  rolePermissions: RolePermissions[];
  customFields: CustomFieldDef[];
  currentUser: User | null;
}
