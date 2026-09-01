import { describe, expect, it } from 'vitest';
import { analyticsKindLabels, analyticsQueryParams, analyticsStatusLabel, latestInitiativeRecords, quarterlyDepartmentReserve, recordsByIds, statusCardIds } from './analyticsSelectors';
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

  it('uses exact card IDs for drill-down and status selections', () => {
    const records = [
      { id: 'green', status_code: 'GREEN' },
      { id: 'red', status_code: 'RED' },
    ] as NonNullable<AnalyticsResponse['records']>;
    const data = { records, status_distribution: [
      { status_id: 'green-status', code: 'GREEN', name: 'Виконано', color: '#10b981', count: 1, card_ids: ['green'] },
      { status_id: 'red-status', code: 'RED', name: 'Заблоковано', color: '#f43f5e', count: 1, card_ids: ['red'] },
    ] } as AnalyticsResponse;
    expect(statusCardIds(data, 'green-status')).toEqual(['green']);
    expect(recordsByIds(data, ['red'])).toEqual([records[1]]);
  });

  it('uses every annual card for status drill-down while keeping unique-initiative drill-down deduplicated', () => {
    const records = [
      { id: 'q1', initiative_id: 'initiative', kind: 'PROJECT', quarter: 'Q1', status_code: 'YELLOW' },
      { id: 'q2', initiative_id: 'initiative', kind: 'PROJECT', quarter: 'Q2', status_code: 'GREEN' },
    ] as NonNullable<AnalyticsResponse['records']>;
    const data = { mode: 'ANNUAL', records, status_distribution: [
      { status_id: 'yellow-status', code: 'YELLOW', name: 'В процесі', color: '#f59e0b', count: 1, card_ids: ['q1'] },
      { status_id: 'green-status', code: 'GREEN', name: 'Виконано', color: '#10b981', count: 1, card_ids: ['q2'] },
    ] } as AnalyticsResponse;
    expect(latestInitiativeRecords(data).map((item) => item.id)).toEqual(['q2']);
    expect(statusCardIds(data, 'yellow-status')).toEqual(['q1']);
    expect(statusCardIds(data, 'green-status')).toEqual(['q2']);
  });

  it('returns every active department with its quarterly reserve, including zero-load departments', () => {
    const data = { capacity_by_quarter: [{ quarter: 'Q2', departments: [{ department_id: 'D1', name: 'One', load: 7, limit: 10 }] }] } as AnalyticsResponse;
    expect(quarterlyDepartmentReserve(data, 'Q2', [{ id: 'D1', name: 'One' }, { id: 'D2', name: 'Two' }])).toEqual([
      { id: 'D1', name: 'One', load: 7, limit: 10, reserve: 3, isOverCapacity: false },
      { id: 'D2', name: 'Two', load: 0, limit: 0, reserve: 0, isOverCapacity: false },
    ]);
  });
});
