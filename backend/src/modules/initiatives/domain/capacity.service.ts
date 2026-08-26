import { ChecklistItemInput, SizeSnapshot, WeightSnapshot } from './types';

export interface WeightDefinition { id: string; name: string; weight: number; isActive: boolean }
export interface SizeDefinition { id: string; name: string; minScore: number; maxScore: number; isActive: boolean }

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const taskWeight = (item: ChecklistItemInput, weights: WeightDefinition[]) => {
  if (item.weightSnapshot && Number.isFinite(item.weightSnapshot.value)) return item.weightSnapshot.value;
  return weights.find((weight) => weight.id === item.weightId)?.weight ?? 0;
};

export const totalWeight = (items: ChecklistItemInput[] = [], weights: WeightDefinition[] = []) => round(items.reduce((sum, item) => sum + taskWeight(item, weights), 0));

export const makeWeightSnapshot = (definition: WeightDefinition): WeightSnapshot => ({ definitionId: definition.id, name: definition.name, value: definition.weight });

export const makeSizeSnapshot = (weight: number, sizes: SizeDefinition[]): SizeSnapshot => {
  const definition = sizes.find((item) => item.isActive && weight >= item.minScore && weight <= item.maxScore);
  return { definitionId: definition?.id, name: definition?.name ?? 'Не визначено', totalWeight: weight };
};

export const validateChecklist = (items: ChecklistItemInput[], weights: WeightDefinition[]) => items.flatMap((item, index) => {
  const errors: string[] = [];
  const label = item.text.trim() || `Завдання ${index + 1}`;
  const hasSnapshot = Boolean(item.weightSnapshot?.name.trim() && Number.isFinite(item.weightSnapshot?.value) && item.weightSnapshot!.value >= 0);
  if (!hasSnapshot && (!item.weightId || !weights.some((weight) => weight.id === item.weightId && weight.isActive))) errors.push(`«${label}»: оберіть активну вагу`);
  if (!item.implementer_dept_ids?.length) errors.push(`«${label}»: оберіть хоча б один підрозділ-виконавець`);
  return errors;
});

export const departmentLoads = (items: ChecklistItemInput[], crossFunctionalDepartmentIds: string[], weights: WeightDefinition[]) => {
  const loads = new Map<string, number>();
  const executors = new Set<string>();
  for (const item of items) {
    const departments = [...new Set(item.implementer_dept_ids ?? [])];
    if (!departments.length) continue;
    const share = taskWeight(item, weights) / departments.length;
    departments.forEach((id) => { executors.add(id); loads.set(id, (loads.get(id) ?? 0) + share); });
  }
  const involved = [...new Set(crossFunctionalDepartmentIds)].filter((id) => !executors.has(id));
  if (items.length && involved.length) {
    const share = totalWeight(items, weights) / items.length / involved.length;
    involved.forEach((id) => loads.set(id, (loads.get(id) ?? 0) + share));
  }
  return new Map([...loads].map(([id, value]) => [id, round(value)]));
};
