import { describe, expect, it } from 'vitest';
import { averageInitiativeDuration, averageScopeProgress, capacityByQuarter, healthCounts, scopeStatusCounts, sizeBreakdown } from './analytics';
import { AnalyticsCard } from './analytics';

const card = (quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4', health: AnalyticsCard['health_status'], color: 'GREEN' | 'YELLOW' | 'RED' | 'GRAY' | 'DEFAULT' = 'DEFAULT'): AnalyticsCard => ({
  id: `${quarter}-${health}`, name: 'Card', strategic_goal: '', implementer_dept_ids: [], cross_functional_dept_ids: [], year: 2026, quarter,
  health_status: health, is_backlog: false, checklist: [{ id: 'S', text: 'Scope', is_completed: false, color, weightId: 'W', implementer_dept_ids: ['D1'] }], type: 'PROJECT',
});

const weights = [{ id: 'W', name: 'W', weight: 2, is_active: true }];
const departments = [{ id: 'D1', name: 'Department', capacity_limit_points: 3, is_active: true }];

describe('analytics selectors', () => {
  it('normalizes legacy gray status to default', () => {
    expect(healthCounts([card('Q1', 'GRAY')])).toMatchObject({ DEFAULT: 1 });
    expect(scopeStatusCounts([card('Q1', 'DEFAULT', 'GRAY')])).toMatchObject({ DEFAULT: 1 });
  });

  it('uses the card progress formula for portfolio progress', () => {
    expect(averageScopeProgress([card('Q1', 'DEFAULT', 'GRAY'), card('Q2', 'DEFAULT', 'GREEN')])).toBe(100);
  });

  it('calculates annual initiative duration from its quarterly cards', () => {
    const initiativeA = { ...card('Q1', 'DEFAULT'), id: 'A-Q1', backlog_id: 'A' };
    const initiativeASecondQuarter = { ...card('Q2', 'DEFAULT'), id: 'A-Q2', backlog_id: 'A' };
    const initiativeB = { ...card('Q3', 'DEFAULT'), id: 'B-Q3', backlog_id: 'B' };

    expect(averageInitiativeDuration([initiativeA, initiativeASecondQuarter, initiativeB])).toBe(1.5);
  });

  it('keeps capacity isolated by quarter', () => {
    const quarters = capacityByQuarter([card('Q1', 'DEFAULT'), card('Q2', 'DEFAULT')], departments, weights);
    expect(quarters.find(item => item.quarter === 'Q1')?.loads[0]).toMatchObject({ load: 2, isOverCapacity: false });
    expect(quarters.find(item => item.quarter === 'Q2')?.loads[0]).toMatchObject({ load: 2, isOverCapacity: false });
  });

  it('uses active size ranges and puts unmatched values into an explicit bucket', () => {
    expect(sizeBreakdown([card('Q1', 'DEFAULT')], weights, [{ id: 'S', name: 'S', min_score: 0, max_score: 3, is_active: true }, { id: 'OLD', name: 'Old', min_score: 0, max_score: 10, is_active: false }])).toEqual([{ name: 'S', count: 1 }]);
  });
});
