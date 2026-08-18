import {
  CustomFieldDef,
  Department,
  InitiativeSizeDef,
  InitiativeYearSnapshot,
  Manager,
  OperationalTask,
  PriorityDef,
  Project,
  RolePermissions,
  TaskWeightDef,
  User,
} from './types';

export const initialRolePermissions: RolePermissions[] = [
  { role: 'SUPER_ADMIN', canCreateEditProjects: true, canDeleteProjects: true, canAccessAdmin: true, isReadOnly: false, canEditArchive: true },
  { role: 'ADMIN', canCreateEditProjects: true, canDeleteProjects: true, canAccessAdmin: true, isReadOnly: false, canEditArchive: false },
  { role: 'USER', canCreateEditProjects: false, canDeleteProjects: false, canAccessAdmin: false, isReadOnly: true, canEditArchive: false },
];

export const initialUsers: User[] = [
  { id: 'U1', name: 'Вікторія Парпалій', email: 'parpalijviktoria@gmail.com', role: 'SUPER_ADMIN', password: 'password123' },
  { id: 'U2', name: 'Олексій Шевченко', email: 'alex@example.com', role: 'ADMIN', departmentId: 'D1', password: 'password123' },
  { id: 'U3', name: 'Марина Коваленко', email: 'maryna@example.com', role: 'USER', departmentId: 'D2', password: 'password123' },
  { id: 'U4', name: 'Дмитро Ткаченко', email: 'dmytro@example.com', role: 'USER', departmentId: 'D5', password: 'password123' },
  { id: 'U5', name: 'Олена Романюк', email: 'olena@example.com', role: 'USER', departmentId: 'D7', password: 'password123' },
];

export const initialDepartments: Department[] = [
  { id: 'D1', name: 'IT & Development', capacity_limit_points: 12, is_active: true },
  { id: 'D2', name: 'Marketing & PR', capacity_limit_points: 8, is_active: true },
  { id: 'D3', name: 'Sales & B2B', capacity_limit_points: 10, is_active: true },
  { id: 'D4', name: 'HR & Recruiting', capacity_limit_points: 6, is_active: true },
  { id: 'D5', name: 'Finance & Legal', capacity_limit_points: 7, is_active: true },
  { id: 'D6', name: 'Customer Support', capacity_limit_points: 8, is_active: true },
  { id: 'D7', name: 'Data & Analytics', capacity_limit_points: 9, is_active: true },
  { id: 'D8', name: 'Operations Excellence', capacity_limit_points: 8, is_active: true },
];

export const initialManagers: Manager[] = [
  { id: 'M1', name: 'Олексій Шевченко (CTO)', department_id: 'D1', is_active: true },
  { id: 'M2', name: 'Марина Коваленко (CMO)', department_id: 'D2', is_active: true },
  { id: 'M3', name: 'Сергій Мельник (Head of Sales)', department_id: 'D3', is_active: true },
  { id: 'M4', name: 'Ірина Бойко (HR Director)', department_id: 'D4', is_active: true },
  { id: 'M5', name: 'Дмитро Ткаченко (CFO)', department_id: 'D5', is_active: true },
  { id: 'M6', name: 'Анна Савенко (Head of Support)', department_id: 'D6', is_active: true },
  { id: 'M7', name: 'Олена Романюк (Head of Data)', department_id: 'D7', is_active: true },
  { id: 'M8', name: 'Роман Левченко (COO)', department_id: 'D8', is_active: true },
];

export const initialPriorities: PriorityDef[] = [
  { id: 'Critical', name: 'Критичний', is_active: true },
  { id: 'High', name: 'Високий', is_active: true },
  { id: 'Medium', name: 'Середній', is_active: true },
  { id: 'Low', name: 'Низький', is_active: true },
];

export const initialTaskWeights: TaskWeightDef[] = [
  { id: 'TW-XS', name: 'XS', weight: 0.5, is_active: true },
  { id: 'TW-S', name: 'S', weight: 1, is_active: true },
  { id: 'TW-M', name: 'M', weight: 2, is_active: true },
  { id: 'TW-L', name: 'L', weight: 3, is_active: true },
  { id: 'TW-XL', name: 'XL', weight: 5, is_active: true },
];

export const initialInitiativeSizes: InitiativeSizeDef[] = [
  { id: 'IS-XS', name: 'XS', min_score: 0, max_score: 0.99, is_active: true },
  { id: 'IS-S', name: 'S', min_score: 1, max_score: 2.99, is_active: true },
  { id: 'IS-M', name: 'M', min_score: 3, max_score: 5.99, is_active: true },
  { id: 'IS-L', name: 'L', min_score: 6, max_score: 9.99, is_active: true },
  { id: 'IS-XL', name: 'XL', min_score: 10, max_score: 999, is_active: true },
];

export const initialCustomFields: CustomFieldDef[] = [
  { id: 'cf_budget', entityType: 'project', name: 'Бюджет ($)', type: 'NUMBER', isRequired: false, showInTable: true, isActive: true },
  { id: 'cf_kpi', entityType: 'project', name: 'Ключовий KPI', type: 'TEXT', isRequired: false, showInCards: true, isActive: true },
  { id: 'cf_project_context', entityType: 'project', name: 'Контекст ініціативи', type: 'RICHTEXT', isRequired: false, showInCards: true, isActive: true },
  { id: 'cf_risk', entityType: 'project', name: 'Рівень ризику', type: 'SELECT', isRequired: false, options: ['Низький', 'Середній', 'Високий'], showInTable: true, isActive: true },
  { id: 'cf_frequency', entityType: 'task', name: 'Регулярність', type: 'SELECT', isRequired: false, options: ['Щотижня', 'Щомісяця', 'Щокварталу'], isActive: true },
  { id: 'cf_task_result', entityType: 'task', name: 'Результат виконання', type: 'RICHTEXT', isRequired: false, showInCards: true, isActive: true },
  { id: 'cf_automated', entityType: 'task', name: 'Автоматизовано', type: 'CHECKBOX', isRequired: false, showInTable: true, isActive: true },
];

const snapshot = (year: number, passport: Omit<InitiativeYearSnapshot, 'year' | 'history'>): InitiativeYearSnapshot => ({ ...passport, year, history: [] });
const prep = (manager_id: string | undefined, priority: string | undefined, cross_functional_dept_ids: string[], custom_fields?: Record<string, unknown>) => ({ manager_id, priority, cross_functional_dept_ids, custom_fields, history: [] });

const projectMaster: Project = {
  id: 'PRJ-B-PLATFORM', name: 'Нова клієнтська платформа', strategic_goal: 'Масштабувати цифровий продукт і збільшити частку активних клієнтів.',
  implementer_dept_ids: [], cross_functional_dept_ids: ['D6'], manager_id: 'M1', priority: 'Critical',
  year: 2026, quarter: 'Q1', health_status: 'DEFAULT', checklist: [], is_backlog: true,
  custom_fields: { cf_budget: 180000, cf_kpi: '25% активних клієнтів' }, history: [],
  yearSnapshots: {
    '2025': snapshot(2025, { name: 'Портал самообслуговування клієнтів', strategic_goal: 'Запустити базовий цифровий канал.', implementer_dept_ids: [], cross_functional_dept_ids: ['D6'], manager_id: 'M1', priority: 'High', custom_fields: { cf_budget: 120000, cf_kpi: '10% активних клієнтів' }, preparationStage: prep('M1', 'High', ['D6'], { cf_budget: 120000 }) }),
    '2026': snapshot(2026, { name: 'Нова клієнтська платформа', strategic_goal: 'Масштабувати цифровий продукт і збільшити частку активних клієнтів.', implementer_dept_ids: [], cross_functional_dept_ids: ['D6'], manager_id: 'M1', priority: 'Critical', custom_fields: { cf_budget: 180000, cf_kpi: '25% активних клієнтів', cf_project_context: '<p><strong>Фокус року:</strong> зростання цифрового каналу та самообслуговування.</p>', cf_risk: 'Високий' }, preparationStage: prep('M1', 'Critical', ['D2', 'D6'], { cf_budget: 180000, cf_risk: 'Високий' }) }),
  },
};

const projectMaster2: Project = {
  id: 'PRJ-B-ERP', name: 'Автоматизація фінансової звітності', strategic_goal: 'Зменшити час підготовки управлінської звітності.',
  implementer_dept_ids: [], cross_functional_dept_ids: ['D5'], manager_id: 'M5', priority: 'High',
  year: 2026, quarter: 'Q1', health_status: 'DEFAULT', checklist: [], is_backlog: true,
  custom_fields: { cf_budget: 50000 }, history: [],
  yearSnapshots: {
    '2026': snapshot(2026, { name: 'Автоматизація фінансової звітності', strategic_goal: 'Зменшити час підготовки управлінської звітності.', implementer_dept_ids: [], cross_functional_dept_ids: ['D5'], manager_id: 'M5', priority: 'High', custom_fields: { cf_budget: 50000, cf_risk: 'Високий' }, preparationStage: prep('M5', 'High', ['D5'], { cf_budget: 50000 }) }),
  },
};

const projectMaster3: Project = {
  id: 'PRJ-B-DATA', initiative_chain_id: 'CHAIN-DATA-PLATFORM', name: 'Платформа даних для управлінської аналітики',
  strategic_goal: 'Прискорити прийняття рішень на основі достовірних даних.', implementer_dept_ids: [], cross_functional_dept_ids: ['D5', 'D8'], manager_id: 'M7', priority: 'High',
  year: 2026, quarter: 'Q1', health_status: 'DEFAULT', checklist: [], is_backlog: true, history: [],
  custom_fields: { cf_budget: 90000, cf_kpi: '90% звітів з єдиного джерела', cf_risk: 'Середній' },
  yearSnapshots: {
    '2026': snapshot(2026, { name: 'Платформа даних для управлінської аналітики', strategic_goal: 'Прискорити прийняття рішень на основі достовірних даних.', implementer_dept_ids: [], cross_functional_dept_ids: ['D5', 'D8'], manager_id: 'M7', priority: 'High', custom_fields: { cf_budget: 90000, cf_kpi: '90% звітів з єдиного джерела', cf_risk: 'Середній' }, preparationStage: prep('M7', 'High', ['D5', 'D8'], { cf_budget: 90000 }) }),
  },
};

const projectMaster4: Project = {
  id: 'PRJ-B-OPS', initiative_chain_id: 'CHAIN-OPS-EXCELLENCE', name: 'Оптимізація наскрізних операцій',
  strategic_goal: 'Зменшити час проходження ключових клієнтських процесів.', implementer_dept_ids: [], cross_functional_dept_ids: ['D3', 'D6'], manager_id: 'M8', priority: 'Medium',
  year: 2026, quarter: 'Q1', health_status: 'DEFAULT', checklist: [], is_backlog: true, history: [],
  custom_fields: { cf_budget: 40000, cf_risk: 'Низький' },
  yearSnapshots: {
    '2026': snapshot(2026, { name: 'Оптимізація наскрізних операцій', strategic_goal: 'Зменшити час проходження ключових клієнтських процесів.', implementer_dept_ids: [], cross_functional_dept_ids: ['D3', 'D6'], manager_id: 'M8', priority: 'Medium', custom_fields: { cf_budget: 40000, cf_risk: 'Низький' }, preparationStage: prep('M8', 'Medium', ['D3', 'D6'], { cf_budget: 40000 }) }),
  },
};

export const initialProjects: Project[] = [
  projectMaster,
  projectMaster2,
  projectMaster3,
  projectMaster4,
  {
    ...projectMaster, id: 'PRJ-C-PLATFORM-Q4-2025', is_backlog: false, backlog_id: projectMaster.id, yearSnapshots: undefined, year: 2025, quarter: 'Q4', health_status: 'GREEN',
    checklist: [
      { id: 'SCOPE-PORTAL-RELEASE', text: 'Запуск порталу самообслуговування', weightId: 'TW-XL', implementer_dept_ids: ['D1', 'D6'], is_completed: true, color: 'GREEN' },
      { id: 'SCOPE-PORTAL-TRAINING', text: 'Навчання команди підтримки', weightId: 'TW-M', implementer_dept_ids: ['D6'], is_completed: true, color: 'GREEN' },
    ], history: [],
  },
  {
    ...projectMaster, id: 'PRJ-C-PLATFORM-Q3', is_backlog: false, backlog_id: projectMaster.id, yearSnapshots: undefined, year: 2026, quarter: 'Q3',
    health_status: 'YELLOW', checklist: [
      { id: 'SCOPE-UX', text: 'UX та прототип', weightId: 'TW-L', implementer_dept_ids: ['D2'], is_completed: true, color: 'GREEN' },
      { id: 'SCOPE-API', text: 'API платформи', weightId: 'TW-XL', implementer_dept_ids: ['D1'], is_completed: false, color: 'YELLOW' },
      { id: 'SCOPE-WEB', text: 'Клієнтський кабінет', weightId: 'TW-XL', implementer_dept_ids: ['D1', 'D2'], is_completed: false, color: 'DEFAULT' },
    ], history: [],
  },
  {
    ...projectMaster, id: 'PRJ-C-PLATFORM-Q4', is_backlog: false, backlog_id: projectMaster.id, yearSnapshots: undefined, year: 2026, quarter: 'Q4', health_status: 'DEFAULT',
    checklist: [
      { id: 'SCOPE-PERSONALIZATION', text: 'Персоналізація пропозицій', weightId: 'TW-XL', implementer_dept_ids: ['D1', 'D2'], is_completed: false, color: 'DEFAULT' },
      { id: 'SCOPE-SELF-SERVICE', text: 'Розширення сценаріїв самообслуговування', weightId: 'TW-L', implementer_dept_ids: ['D1', 'D6'], is_completed: false, color: 'DEFAULT' },
    ], history: [],
  },
  {
    ...projectMaster2, id: 'PRJ-C-ERP-Q3', is_backlog: false, backlog_id: projectMaster2.id, yearSnapshots: undefined, year: 2026, quarter: 'Q3',
    health_status: 'RED', checklist: [
      { id: 'SCOPE-AUDIT', text: 'Аудит процесів', weightId: 'TW-L', implementer_dept_ids: ['D5'], is_completed: false, color: 'RED' },
      { id: 'SCOPE-INTEGRATION', text: 'Інтеграція ERP', weightId: 'TW-XL', implementer_dept_ids: ['D1', 'D5'], is_completed: false, color: 'YELLOW' },
    ], history: [],
  },
  {
    ...projectMaster2, id: 'PRJ-C-ERP-Q4', is_backlog: false, backlog_id: projectMaster2.id, yearSnapshots: undefined, year: 2026, quarter: 'Q4', health_status: 'YELLOW',
    checklist: [
      { id: 'SCOPE-ERP-UAT', text: 'Приймальне тестування звітів', weightId: 'TW-L', implementer_dept_ids: ['D1', 'D5'], is_completed: false, color: 'YELLOW' },
    ], history: [],
  },
  {
    ...projectMaster3, id: 'PRJ-C-DATA-Q2', is_backlog: false, backlog_id: projectMaster3.id, yearSnapshots: undefined, year: 2026, quarter: 'Q2', health_status: 'YELLOW',
    checklist: [
      { id: 'SCOPE-DATA-MODEL', text: 'Цільова модель даних', weightId: 'TW-XL', implementer_dept_ids: ['D7'], is_completed: true, color: 'GREEN' },
      { id: 'SCOPE-DATA-QUALITY', text: 'Правила якості даних', weightId: 'TW-L', implementer_dept_ids: ['D7', 'D5'], is_completed: false, color: 'YELLOW' },
      { id: 'SCOPE-DATA-ETL', text: 'Побудова завантажень даних', weightId: 'TW-XL', implementer_dept_ids: ['D1', 'D7'], is_completed: false, color: 'YELLOW' },
    ], history: [],
  },
  {
    ...projectMaster3, id: 'PRJ-C-DATA-Q3', is_backlog: false, backlog_id: projectMaster3.id, yearSnapshots: undefined, year: 2026, quarter: 'Q3', health_status: 'RED',
    checklist: [
      { id: 'SCOPE-DATA-BI', text: 'Панелі керівника', weightId: 'TW-L', implementer_dept_ids: ['D7'], is_completed: false, color: 'RED' },
      { id: 'SCOPE-DATA-ACCESS', text: 'Матриця доступів до даних', weightId: 'TW-M', implementer_dept_ids: ['D1', 'D7'], is_completed: false, color: 'RED' },
    ], history: [],
  },
];

const taskMaster: OperationalTask = {
  id: 'TSK-B-SECURITY', name: 'Регулярний аудит безпеки', strategic_goal: 'Підтримувати контрольований рівень кіберризиків.',
  implementer_dept_ids: [], cross_functional_dept_ids: ['D5'], manager_id: 'M1', priority: 'High',
  year: 2026, quarter: 'Q1', health_status: 'DEFAULT', checklist: [], is_backlog: true,
  custom_fields: { cf_frequency: 'Щокварталу' }, history: [],
  yearSnapshots: {
    '2026': snapshot(2026, { name: 'Регулярний аудит безпеки', strategic_goal: 'Підтримувати контрольований рівень кіберризиків.', implementer_dept_ids: [], cross_functional_dept_ids: ['D5'], manager_id: 'M1', priority: 'High', custom_fields: { cf_frequency: 'Щокварталу', cf_automated: false }, preparationStage: prep('M1', 'High', ['D5'], { cf_frequency: 'Щокварталу' }) }),
  },
};

const taskMaster2: OperationalTask = {
  id: 'TSK-B-LEADS', initiative_chain_id: 'CHAIN-LEADS-QUALITY', name: 'Контроль якості лідів', strategic_goal: 'Підвищити конверсію кваліфікованих лідів у продажі.',
  implementer_dept_ids: [], cross_functional_dept_ids: ['D2', 'D3'], manager_id: 'M3', priority: 'Medium', year: 2026, quarter: 'Q1', health_status: 'DEFAULT', checklist: [], is_backlog: true, history: [],
  custom_fields: { cf_frequency: 'Щотижня', cf_automated: false },
  yearSnapshots: {
    '2026': snapshot(2026, { name: 'Контроль якості лідів', strategic_goal: 'Підвищити конверсію кваліфікованих лідів у продажі.', implementer_dept_ids: [], cross_functional_dept_ids: ['D2', 'D3'], manager_id: 'M3', priority: 'Medium', custom_fields: { cf_frequency: 'Щотижня', cf_automated: false }, preparationStage: prep('M3', 'Medium', ['D2', 'D3'], { cf_frequency: 'Щотижня' }) }),
  },
};

const taskMaster3: OperationalTask = {
  id: 'TSK-B-ONBOARDING', initiative_chain_id: 'CHAIN-ONBOARDING', name: 'Адаптація нових працівників', strategic_goal: 'Скоротити час виходу нових працівників на продуктивність.',
  implementer_dept_ids: [], cross_functional_dept_ids: ['D1', 'D4'], manager_id: 'M4', priority: 'Low', year: 2026, quarter: 'Q1', health_status: 'DEFAULT', checklist: [], is_backlog: true, history: [],
  custom_fields: { cf_frequency: 'Щомісяця' },
  yearSnapshots: {
    '2026': snapshot(2026, { name: 'Адаптація нових працівників', strategic_goal: 'Скоротити час виходу нових працівників на продуктивність.', implementer_dept_ids: [], cross_functional_dept_ids: ['D1', 'D4'], manager_id: 'M4', priority: 'Low', custom_fields: { cf_frequency: 'Щомісяця' }, preparationStage: prep(undefined, undefined, [], {}) }),
  },
};

const taskMaster4: OperationalTask = {
  id: 'TSK-B-SUPPORT', initiative_chain_id: 'CHAIN-SUPPORT-HEALTH', name: 'Моніторинг здоров’я клієнтського сервісу', strategic_goal: undefined,
  implementer_dept_ids: [], cross_functional_dept_ids: ['D6'], manager_id: 'M6', priority: 'Medium', year: 2026, quarter: 'Q1', health_status: 'DEFAULT', checklist: [], is_backlog: true, history: [],
  custom_fields: { cf_frequency: 'Щотижня', cf_automated: true },
  yearSnapshots: {
    '2026': snapshot(2026, { name: 'Моніторинг здоров’я клієнтського сервісу', strategic_goal: undefined, implementer_dept_ids: [], cross_functional_dept_ids: ['D6'], manager_id: 'M6', priority: 'Medium', custom_fields: { cf_frequency: 'Щотижня', cf_automated: true }, preparationStage: prep('M6', 'Medium', ['D6'], { cf_frequency: 'Щотижня' }) }),
  },
};

export const initialTasks: OperationalTask[] = [
  taskMaster,
  taskMaster2,
  taskMaster3,
  taskMaster4,
  {
    ...taskMaster, id: 'TSK-C-SECURITY-Q3', is_backlog: false, backlog_id: taskMaster.id, yearSnapshots: undefined, year: 2026, quarter: 'Q3',
    health_status: 'GREEN', checklist: [
      { id: 'SCOPE-PENTEST', text: 'Пентест', weightId: 'TW-L', implementer_dept_ids: ['D1'], is_completed: true, color: 'GREEN' },
      { id: 'SCOPE-REPORT', text: 'Звіт і remediation plan', weightId: 'TW-M', implementer_dept_ids: ['D1', 'D5'], is_completed: false, color: 'DEFAULT' },
    ], history: [],
  },
  {
    ...taskMaster, id: 'TSK-C-SECURITY-Q4', is_backlog: false, backlog_id: taskMaster.id, yearSnapshots: undefined, year: 2026, quarter: 'Q4', health_status: 'DEFAULT',
    checklist: [{ id: 'SCOPE-VULNERABILITY', text: 'Перевірка критичних вразливостей', weightId: 'TW-L', implementer_dept_ids: ['D1'], is_completed: false, color: 'DEFAULT' }], history: [],
  },
  {
    ...taskMaster2, id: 'TSK-C-LEADS-Q2', is_backlog: false, backlog_id: taskMaster2.id, yearSnapshots: undefined, year: 2026, quarter: 'Q2', health_status: 'YELLOW',
    checklist: [
      { id: 'SCOPE-LEADS-RULES', text: 'Оновлення правил кваліфікації', weightId: 'TW-M', implementer_dept_ids: ['D2', 'D3'], is_completed: true, color: 'GREEN' },
      { id: 'SCOPE-LEADS-SAMPLE', text: 'Щотижнева вибіркова перевірка', weightId: 'TW-S', implementer_dept_ids: ['D3'], is_completed: false, color: 'YELLOW' },
    ], history: [],
  },
  {
    ...taskMaster2, id: 'TSK-C-LEADS-Q3', is_backlog: false, backlog_id: taskMaster2.id, yearSnapshots: undefined, year: 2026, quarter: 'Q3', health_status: 'GREEN',
    checklist: [{ id: 'SCOPE-LEADS-DASHBOARD', text: 'Щомісячний огляд конверсії', weightId: 'TW-M', implementer_dept_ids: ['D3', 'D7'], is_completed: true, color: 'GREEN' }], history: [],
  },
  {
    ...taskMaster4, id: 'TSK-C-SUPPORT-Q3', is_backlog: false, backlog_id: taskMaster4.id, yearSnapshots: undefined, year: 2026, quarter: 'Q3', health_status: 'YELLOW',
    checklist: [
      { id: 'SCOPE-SUPPORT-CSAT', text: 'Аналіз показника задоволеності', weightId: 'TW-S', implementer_dept_ids: ['D6'], is_completed: false, color: 'YELLOW' },
      { id: 'SCOPE-SUPPORT-ESCALATION', text: 'Контроль ескалацій', weightId: 'TW-M', implementer_dept_ids: ['D6', 'D8'], is_completed: false, color: 'YELLOW' },
    ], history: [],
  },
];
