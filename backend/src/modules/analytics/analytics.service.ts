import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { InitiativesService } from '../initiatives/application/initiatives.service';

const progress = (items: any[]) => {
  const active = items.filter((item) => item.color !== 'GRAY');
  if (!active.length) return null;
  const score = active.reduce((sum, item) => sum + (item.color === 'GREEN' || item.is_completed ? 1 : item.color === 'YELLOW' ? 0.5 : 0), 0);
  return Math.round(score / active.length * 100);
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly initiatives: InitiativesService, private readonly prisma: PrismaService) {}
  async get(year?: number, quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4') {
    const response = await this.initiatives.list({ year, quarter, is_backlog: false });
    const cards = response.data as any[];
    const healthCounts: Record<string, number> = {};
    const scopeStatusCounts: Record<string, number> = {};
    const sizes: Record<string, number> = {};
    const duration = new Map<string, number>();
    const progressValues: number[] = [];
    for (const card of cards) {
      const healthCode = card.health_status_code ?? 'DEFAULT';
      healthCounts[healthCode] = (healthCounts[healthCode] ?? 0) + 1;
      sizes[card.sizeSnapshot.name] = (sizes[card.sizeSnapshot.name] ?? 0) + 1;
      duration.set(card.initiative_chain_id, (duration.get(card.initiative_chain_id) ?? 0) + 1);
      const value = progress(card.checklist); if (value !== null) progressValues.push(value);
      card.checklist.forEach((item: any) => { const status = item.color === 'GRAY' ? 'DEFAULT' : item.color; scopeStatusCounts[status] = (scopeStatusCounts[status] ?? 0) + 1; });
    }
    const departments = await this.prisma.department.findMany();
    const loads = new Map<string, number>();
    cards.forEach((card) => card.checklist.forEach((item: any) => {
      const ids = [...new Set<string>(item.implementer_dept_ids)];
      ids.forEach((id) => loads.set(id, (loads.get(id) ?? 0) + item.weightSnapshot.value / ids.length));
    }));
    return {
      cards: cards.length,
      health_counts: healthCounts,
      scope_status_counts: scopeStatusCounts,
      average_scope_progress: progressValues.length ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length) : 0,
      average_initiative_duration: duration.size ? Math.round([...duration.values()].reduce((a, b) => a + b, 0) / duration.size * 10) / 10 : 0,
      size_breakdown: Object.entries(sizes).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      department_capacity: departments.map((department) => ({ departmentId: department.id, load: Math.round((loads.get(department.id) ?? 0) * 100) / 100, limit: department.capacityLimitPoints.toNumber(), isOverCapacity: (loads.get(department.id) ?? 0) > department.capacityLimitPoints.toNumber() })),
    };
  }
}
