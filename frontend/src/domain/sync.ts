import { OperationalTask, Project } from '../types';

type Initiative = Project | OperationalTask;

const PASSPORT_FIELDS = [
  'name',
  'manager_id',
  'priority',
  'strategic_goal',
  'implementer_dept_ids',
  'cross_functional_dept_ids',
  'custom_fields',
] as const;

export const pickPassportPatch = <T extends Initiative>(source: T): Partial<T> => {
  const patch: Partial<Initiative> = {};
  PASSPORT_FIELDS.forEach(field => Object.assign(patch, { [field]: source[field] }));
  return patch as Partial<T>;
};
