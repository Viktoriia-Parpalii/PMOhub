import { describe, expect, it } from 'vitest';
import { analyticsKindLabels, analyticsQueryParams, analyticsStatusLabel, quarterlyDepartmentReserve } from './analyticsSelectors';
import { AnalyticsResponse } from './analyticsTypes';

const filters = { year: 2027, quarter: 'Q2' as const, kind: 'ALL' as const, departmentId: '', managerId: '' };

describe('analytics filter matrix', () => {
  it.each([
    ['GREEN', 'Виконано'],
    ['YELLOW', 'В процесі'],
    ['RED', 'На паузі / блоковано'],
    ['DEFAULT', 'Без статусу'],
  ] as const)('uses a Ukrainian label for status=%s', (status, label) => {
    expect(analyticsStatusLabel(status)).toBe(label);
  });

  it.each([
    ['ALL', 'ініціативи', 'ініціатив'],
    ['PROJECT', 'проєкти', 'проєктів'],
    ['OPERATIONAL_TASK', 'операційні задачі', 'операційних задач'],
  ] as const)('uses the correct Ukrainian entity label for kind=%s', (kind, nominative, genitive) => {
    expect(analyticsKindLabels(kind)).toMatchObject({ nominative, genitive });
  });

  it.each([
    ['ALL', '', '', 'year=2027'],
    ['PROJECT', '', '', 'year=2027&kind=PROJECT'],
    ['OPERATIONAL_TASK', '00000000-0000-4000-8000-000000000001', '', 'year=2027&kind=OPERATIONAL_TASK&department_id=00000000-0000-4000-8000-000000000001'],
    ['PROJECT', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'year=2027&kind=PROJECT&department_id=00000000-0000-4000-8000-000000000001&manager_id=00000000-0000-4000-8000-000000000002'],
  ])('serializes kind=%s, department and manager as an AND filter', (kind, departmentId, managerId, expected) => {
    expect(analyticsQueryParams({ ...filters, kind: kind as any, departmentId, managerId }).toString()).toBe(expected);
  });

  it('returns every active department with its quarterly reserve, including zero-load departments', () => {
    const data = { capacity_by_quarter: [{ quarter: 'Q2', departments: [{ department_id: 'D1', name: 'One', load: 7, limit: 10 }] }] } as AnalyticsResponse;
    expect(quarterlyDepartmentReserve(data, 'Q2', [{ id: 'D1', name: 'One' }, { id: 'D2', name: 'Two' }])).toEqual([
      { id: 'D1', name: 'One', load: 7, limit: 10, reserve: 3, isOverCapacity: false },
      { id: 'D2', name: 'Two', load: 0, limit: 0, reserve: 0, isOverCapacity: false },
    ]);
  });
});
