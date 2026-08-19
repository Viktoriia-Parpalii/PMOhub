
export interface HistoryEvent {
  id: string;
  date: string;
  author: string;
  action: string;
}

export type CapacityWeight = string;
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type HealthStatus = string;
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export interface User {
  password?: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
}

export interface RolePermissions {
  role: UserRole;
  canCreateEditProjects: boolean;
  canDeleteProjects: boolean;
  canAccessAdmin: boolean;
  isReadOnly: boolean;
  canEditArchive: boolean;
}

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'SELECT' | 'CHECKBOX' | 'RICHTEXT';

export interface CustomFieldDef {
  id: string;
  entityType: 'project' | 'task';
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
  text: string;
  is_completed: boolean;
  color?: 'GREEN' | 'YELLOW' | 'RED' | 'GRAY' | 'DEFAULT';
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
  requiresConfirmation?: ScopeMergePreview;
}

export type Priority = string;
export interface InitiativePassport {
  name: string;
  strategic_goal?: string;
  implementer_dept_ids: string[];
  manager_id?: string;
  priority?: Priority;
  notes?: string;
  cross_functional_dept_ids: string[];
  custom_fields?: Record<string, unknown>;
}

export interface InitiativeYearSnapshot extends InitiativePassport {
  year: number;
  history: HistoryEvent[];
  preparationStage?: PreparationStage;
}

/** Дані «нульового кварталу». Вони існують лише у річному записі беклогу. */
export interface PreparationStage {
  manager_id?: string;
  priority?: Priority;
  cross_functional_dept_ids: string[];
  notes?: string;
  custom_fields?: Record<string, unknown>;
  history: HistoryEvent[];
}

export interface Project extends InitiativePassport {
  id: string;
  /** Незмінний ідентифікатор ланцюжка річних backlog-записів. */
  initiative_chain_id?: string;
  year: number;
  yearSnapshots?: Record<string, InitiativeYearSnapshot>;
  quarter: Quarter;
  health_status: HealthStatus;
  checklist: ChecklistItem[];
  is_backlog: boolean;
  backlog_id?: string;
  moved_from?: string;
  history?: HistoryEvent[];
  sizeSnapshot?: InitiativeSizeSnapshot;
}
export interface OperationalTask extends InitiativePassport {
  id: string;
  /** Незмінний ідентифікатор ланцюжка річних backlog-записів. */
  initiative_chain_id?: string;
  year: number;
  yearSnapshots?: Record<string, InitiativeYearSnapshot>;
  quarter: Quarter;
  health_status: HealthStatus;
  checklist: ChecklistItem[];
  is_backlog: boolean;
  backlog_id?: string;
  moved_from?: string;
  history?: HistoryEvent[];
  sizeSnapshot?: InitiativeSizeSnapshot;
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

export interface SavePropagationTargets {
  backlogYears: number[];
  cardIds: string[];
}

export interface SavePassportCommand {
  kind: 'project' | 'task';
  source: { type: 'backlog'; masterId: string; year: number }
    | { type: 'card'; cardId: string };
  passportPatch: Partial<InitiativePassport>;
  sourceCardPatch?: Pick<Project, 'checklist' | 'health_status'>;
  targets: SavePropagationTargets;
}

export interface PriorityDef {
  id: string;
  name: string;
  color?: string;
  is_active: boolean;
}

export interface InitiativeStatusDef {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
}

export interface TaskWeightDef {
  id: string;
  name: string;
  weight: number;
  is_active: boolean;
}

export interface InitiativeSizeDef {
  id: string;
  name: string;
  min_score: number;
  max_score: number;
  is_active: boolean;
}

export interface FullExportData {
  version: '5.0';
  exportedAt: string;
  exportedBy?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  departments: Department[];
  priorities: PriorityDef[];
  initiativeStatuses: InitiativeStatusDef[];
  taskWeights: TaskWeightDef[];
  initiativeSizes: InitiativeSizeDef[];
  managers: Manager[];
  projects: Project[];
  tasks: OperationalTask[];
  users: User[];
  rolePermissions: RolePermissions[];
  customFields: CustomFieldDef[];
}

export interface AppDataState {
  departments: Department[];
  priorities: PriorityDef[];
  initiativeStatuses: InitiativeStatusDef[];
  taskWeights: TaskWeightDef[];
  initiativeSizes: InitiativeSizeDef[];
  managers: Manager[];
  projects: Project[];
  tasks: OperationalTask[];
  users: User[];
  rolePermissions: RolePermissions[];
  customFields: CustomFieldDef[];
  currentUser: User | null;
}
