import {
  ChecklistItem,
  Department,
  InitiativeSizeDef,
  InitiativeSizeSnapshot,
  OperationalTask,
  Project,
  TaskWeightDef,
  TaskWeightSnapshot,
} from '../types';

export type QuarterCard = Project | OperationalTask;

export interface InitiativeMetrics {
  totalWeight: number;
  sizeName: string;
}

export interface DepartmentLoad {
  departmentId: string;
  load: number;
  limit: number;
  isOverCapacity: boolean;
}

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const getTaskWeight = (
  item: ChecklistItem,
  taskWeights: TaskWeightDef[],
): number => {
  if (item.weightSnapshot && Number.isFinite(item.weightSnapshot.value)) return item.weightSnapshot.value;
  if (!item.weightId) return 0;
  const definition = taskWeights.find(weight => weight.id === item.weightId);
  return definition?.weight ?? 0;
};

export const makeWeightSnapshot = (definition: TaskWeightDef): TaskWeightSnapshot => ({
  definitionId: definition.id,
  name: definition.name,
  value: definition.weight,
});

export const getInitiativeWeight = (
  checklist: ChecklistItem[] | undefined,
  taskWeights: TaskWeightDef[],
): number => round((checklist ?? []).reduce((sum, item) => sum + getTaskWeight(item, taskWeights), 0));

export const getInitiativeSize = (
  totalWeight: number,
  initiativeSizes: InitiativeSizeDef[],
): string => initiativeSizes.find(
  size => size.is_active && totalWeight >= size.min_score && totalWeight <= size.max_score,
)?.name ?? 'Не визначено';

export const makeSizeSnapshot = (
  totalWeight: number,
  initiativeSizes: InitiativeSizeDef[],
): InitiativeSizeSnapshot => {
  const definition = initiativeSizes.find(size => size.is_active && totalWeight >= size.min_score && totalWeight <= size.max_score);
  return { definitionId: definition?.id, name: definition?.name ?? 'Не визначено', totalWeight };
};

export const getInitiativeMetrics = (
  card: QuarterCard,
  taskWeights: TaskWeightDef[],
  initiativeSizes: InitiativeSizeDef[],
): InitiativeMetrics => {
  const totalWeight = getInitiativeWeight(card.checklist, taskWeights);
  return { totalWeight, sizeName: card.sizeSnapshot?.name ?? getInitiativeSize(totalWeight, initiativeSizes) };
};

export const validateChecklistCapacity = (
  checklist: ChecklistItem[] | undefined,
  taskWeights: TaskWeightDef[],
): string[] => {
  const errors: string[] = [];
  (checklist ?? []).forEach((item, index) => {
    const label = item.text.trim() || `Завдання ${index + 1}`;
    const hasSnapshot = Boolean(item.weightSnapshot && item.weightSnapshot.name.trim() && Number.isFinite(item.weightSnapshot.value) && item.weightSnapshot.value >= 0);
    if (!hasSnapshot && (!item.weightId || !taskWeights.some(weight => weight.id === item.weightId && weight.is_active))) {
      errors.push(`«${label}»: оберіть активну вагу`);
    }
    if (!item.implementer_dept_ids?.length) {
      errors.push(`«${label}»: оберіть хоча б один підрозділ-виконавець`);
    }
  });
  return errors;
};

export const calculateCardDepartmentLoads = (
  card: QuarterCard,
  taskWeights: TaskWeightDef[],
): Map<string, number> => {
  const result = new Map<string, number>();
  const checklist = card.checklist ?? [];
  const allImplementers = new Set<string>();

  checklist.forEach(item => {
    const implementers = Array.from(new Set(item.implementer_dept_ids ?? []));
    if (!implementers.length) return;
    const share = getTaskWeight(item, taskWeights) / implementers.length;
    implementers.forEach(departmentId => {
      allImplementers.add(departmentId);
      result.set(departmentId, (result.get(departmentId) ?? 0) + share);
    });
  });

  const involved = Array.from(new Set(card.cross_functional_dept_ids ?? []))
    .filter(departmentId => !allImplementers.has(departmentId));
  if (checklist.length > 0 && involved.length > 0) {
    const involvedShare = getInitiativeWeight(checklist, taskWeights) / checklist.length / involved.length;
    involved.forEach(departmentId => {
      result.set(departmentId, (result.get(departmentId) ?? 0) + involvedShare);
    });
  }

  return new Map(Array.from(result, ([id, value]) => [id, round(value)]));
};

export const calculateDepartmentLoads = (
  cards: QuarterCard[],
  departments: Department[],
  taskWeights: TaskWeightDef[],
): DepartmentLoad[] => {
  const totals = new Map<string, number>();
  cards.filter(card => !card.is_backlog).forEach(card => {
    calculateCardDepartmentLoads(card, taskWeights).forEach((load, departmentId) => {
      totals.set(departmentId, (totals.get(departmentId) ?? 0) + load);
    });
  });
  return departments.map(department => {
    const load = round(totals.get(department.id) ?? 0);
    return {
      departmentId: department.id,
      load,
      limit: department.capacity_limit_points,
      isOverCapacity: load > department.capacity_limit_points,
    };
  });
};
