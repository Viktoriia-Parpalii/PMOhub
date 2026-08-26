import { departmentLoads, makeSizeSnapshot, totalWeight, validateChecklist } from './capacity.service';

const weights = [{ id: 'S', name: 'S', weight: 3, isActive: true }, { id: 'L', name: 'L', weight: 5, isActive: true }];
const items = [
  { text: 'One', weightId: 'S', implementer_dept_ids: ['D1'], is_completed: false },
  { text: 'Two', weightId: 'L', implementer_dept_ids: ['D1', 'D2'], is_completed: true },
];

describe('capacity', () => {
  it('keeps the existing weight and department formulas', () => {
    expect(totalWeight(items, weights)).toBe(8);
    expect(departmentLoads(items, ['D3', 'D4'], weights)).toEqual(new Map([['D1', 5.5], ['D2', 2.5], ['D3', 2], ['D4', 2]]));
  });
  it('validates required definition and executor and snapshots size', () => {
    expect(validateChecklist([{ text: 'Invalid' }], weights)).toHaveLength(2);
    expect(makeSizeSnapshot(8, [{ id: 'L', name: 'Large', minScore: 8, maxScore: 10, isActive: true }]).name).toBe('Large');
  });
});
