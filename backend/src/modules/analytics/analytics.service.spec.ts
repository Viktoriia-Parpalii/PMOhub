import { describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from './analytics.service';

const decimal = (value: number) => ({ toNumber: () => value });
const card = (quarter: number, status: string, id = `card-${quarter}`, scopeStatus = 'YELLOW') => ({
  id, quarter, statusId: `status-${status}`, managerId: 'manager', priorityId: 'priority', totalWeight: decimal(4), sizeSnapshotName: 'M', createdAt: new Date(),
  manager: { name: 'Manager' }, priority: { name: 'Priority' }, status: { code: status, name: `Status ${status}`, color: '#123456' }, departments: [{ departmentId: 'department' }],
  initiativeYear: { year: 2027, initiativeId: 'initiative', initiative: { id: 'initiative', kind: 'PROJECT', name: 'Project' } },
  scopeItems: [{ statusCode: scopeStatus, weightSnapshotValue: decimal(4), executors: [{ departmentId: 'department' }] }],
});

describe('AnalyticsService aggregation contracts', () => {
  it('applies kind, year, quarter, department and manager to the quarterly query', async () => {
    const prisma: any = { quarterCard: { findMany: vi.fn(async () => []) }, department: { findMany: vi.fn(async () => []) }, initiativeYear: { findMany: vi.fn(async () => []) } };
    const result = await new AnalyticsService(prisma).quarterly({ year: 2027, quarter: 'Q2', kind: 'PROJECT', department_id: 'department', manager_id: 'manager' });
    expect(prisma.quarterCard.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      quarter: 2, managerId: 'manager', departments: { some: { departmentId: 'department' } }, initiativeYear: { year: 2027, initiative: { kind: 'PROJECT' } },
    } }));
    expect(prisma.department.findMany).toHaveBeenCalledWith({ where: { id: 'department' } });
    expect(result.period_comparison).toEqual([{ label: 'Q1 2027', cards: 0 }, { label: 'Q2 2027', cards: 0 }]);
  });

  it('aggregates annual status, size, progress and priority matrix from every quarterly card', async () => {
    const cards = [card(1, 'YELLOW', 'card-1', 'RED'), card(2, 'GREEN', 'card-2', 'GREEN')];
    cards[0].managerId = null as unknown as string;
    const previousCards = [card(4, 'DEFAULT', 'previous-card', 'DEFAULT')];
    const prisma: any = {
      quarterCard: { findMany: vi.fn(async ({ where }: any) => where.initiativeYear.year === 2026 ? previousCards : cards) },
      initiativeYear: { findMany: vi.fn(async () => []) },
      department: { findMany: vi.fn(async () => [{ id: 'department', name: 'Department', capacityLimitPoints: decimal(10) }]) },
    };
    const result = await new AnalyticsService(prisma).annual({ year: 2027 });
    expect(result.summary).toMatchObject({ cards: 2, initiatives: 1, average_duration: 2, average_progress: 50, total_weight: 8 });
    expect(result.status_distribution).toEqual(expect.arrayContaining([
      expect.objectContaining({ status_id: 'status-GREEN', code: 'GREEN', count: 1, card_ids: ['card-2'] }),
      expect.objectContaining({ status_id: 'status-YELLOW', code: 'YELLOW', count: 1, card_ids: ['card-1'] }),
    ]));
    expect(result.size_breakdown).toEqual([{ name: 'M', count: 2, card_ids: ['card-1', 'card-2'] }]);
    expect(result.scope_status_counts).toMatchObject({ GREEN: 1, RED: 1 });
    expect(result.quarter_trend.find((item) => item.quarter === 'Q1')).toMatchObject({ cards: 1, initiatives: 1 });
    expect(result.volume_trend.find((item) => item.quarter === 'Q4')).toMatchObject({ current: 0, previous: 1 });
    expect(result.priority_status_breakdown[0]).toMatchObject({ name: 'Priority', status_counts: { 'status-GREEN': 1, 'status-YELLOW': 1 } });
    expect(result.history[0].status_distribution).toEqual(expect.arrayContaining([expect.objectContaining({ status_id: 'status-GREEN', count: 1 })]));
    expect(result.risks).toEqual([]);
    expect(result).not.toHaveProperty('records');
  });

  it('loads drill-down records separately by dynamic status id and pagination', async () => {
    const cards = [card(1, 'custom', 'card-1'), card(2, 'custom', 'card-2')];
    cards[0].statusId = 'status-risk';
    cards[1].statusId = 'status-plan';
    const prisma: any = { quarterCard: { findMany: vi.fn(async () => cards) } };
    const result = await new AnalyticsService(prisma).drilldown({ year: 2027, mode: 'annual', status_id: 'status-risk', page: 1, page_size: 1 });
    expect(result).toMatchObject({ total: 1, page: 1, page_size: 1 });
    expect(result.records.map((item) => item.id)).toEqual(['card-1']);
  });
});
