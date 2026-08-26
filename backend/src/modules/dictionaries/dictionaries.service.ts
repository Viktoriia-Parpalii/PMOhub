import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { DictionaryDto } from './dictionary.dto';
import { isPeriodLocked } from '../initiatives/domain/period.policy';
import { makeSizeSnapshot } from '../initiatives/domain/capacity.service';

export type DictionaryType = 'departments' | 'managers' | 'priorities' | 'statuses' | 'weights' | 'sizes';
const normalize = (value: string) => value.trim().toLocaleLowerCase('uk-UA');

@Injectable()
export class DictionariesService {
  private readonly zone: string;
  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    this.zone = config.get<string>('BUSINESS_TIME_ZONE') ?? 'Europe/Kyiv';
  }

  async list(type: DictionaryType) {
    switch (type) {
      case 'departments': return (await this.prisma.department.findMany({ orderBy: { name: 'asc' } })).map((x) => ({ id: x.id, name: x.name, capacity_limit_points: x.capacityLimitPoints.toNumber(), is_active: x.isActive }));
      case 'managers': return (await this.prisma.manager.findMany({ orderBy: { name: 'asc' } })).map((x) => ({ id: x.id, name: x.name, department_id: x.departmentId ?? undefined, is_active: x.isActive }));
      case 'priorities': return (await this.prisma.priority.findMany({ orderBy: { name: 'asc' } })).map((x) => ({ id: x.id, name: x.name, color: x.color ?? undefined, is_active: x.isActive }));
      case 'statuses': return (await this.prisma.initiativeStatus.findMany({ orderBy: { name: 'asc' } })).map((x) => ({ id: x.id, code: x.code, name: x.name, color: x.color, is_active: x.isActive }));
      case 'weights': return (await this.prisma.taskWeight.findMany({ orderBy: { weight: 'asc' } })).map((x) => ({ id: x.id, name: x.name, weight: x.weight.toNumber(), is_active: x.isActive }));
      case 'sizes': return (await this.prisma.initiativeSize.findMany({ orderBy: { minScore: 'asc' } })).map((x) => ({ id: x.id, name: x.name, min_score: x.minScore.toNumber(), max_score: x.maxScore.toNumber(), is_active: x.isActive }));
    }
  }

  async create(type: DictionaryType, dto: DictionaryDto) {
    this.requireName(dto);
    try {
      const data = await this.prisma.$transaction(async (tx) => {
        switch (type) {
          case 'departments': return tx.department.create({ data: { name: dto.name!, normalizedName: normalize(dto.name!), capacityLimitPoints: dto.capacity_limit_points ?? 0, isActive: dto.is_active ?? true } });
          case 'managers': return tx.manager.create({ data: { name: dto.name!, normalizedName: normalize(dto.name!), departmentId: dto.department_id, isActive: dto.is_active ?? true } });
          case 'priorities': return tx.priority.create({ data: { name: dto.name!, normalizedName: normalize(dto.name!), color: dto.color, isActive: dto.is_active ?? true } });
          case 'statuses': return tx.initiativeStatus.create({ data: { code: dto.code?.trim() || crypto.randomUUID(), name: dto.name!, normalizedName: normalize(dto.name!), color: dto.color ?? '#94a3b8', isActive: dto.is_active ?? true } });
          case 'weights': return tx.taskWeight.create({ data: { name: dto.name!, normalizedName: normalize(dto.name!), weight: dto.weight ?? 0, isActive: dto.is_active ?? true } });
          case 'sizes': await this.assertSizeRange(tx, dto); return tx.initiativeSize.create({ data: { name: dto.name!, normalizedName: normalize(dto.name!), minScore: dto.min_score ?? 0, maxScore: dto.max_score ?? 0, isActive: dto.is_active ?? true } });
        }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return { success: true, message: 'Запис додано', data };
    } catch (error) { this.rethrow(error); }
  }

  async update(type: DictionaryType, id: string, dto: DictionaryDto) {
    try {
      await this.prisma.$transaction(async (tx) => {
        if (type === 'sizes') await this.assertSizeRange(tx, dto, id);
        const common = dto.name ? { name: dto.name.trim(), normalizedName: normalize(dto.name) } : {};
        switch (type) {
          case 'departments': await tx.department.update({ where: { id }, data: { ...common, capacityLimitPoints: dto.capacity_limit_points, isActive: dto.is_active } }); break;
          case 'managers': await tx.manager.update({ where: { id }, data: { ...common, departmentId: dto.department_id, isActive: dto.is_active } }); break;
          case 'priorities': await tx.priority.update({ where: { id }, data: { ...common, color: dto.color, isActive: dto.is_active } }); break;
          case 'statuses': await tx.initiativeStatus.update({ where: { id }, data: { ...common, code: dto.code, color: dto.color, isActive: dto.is_active } }); break;
          case 'weights': await tx.taskWeight.update({ where: { id }, data: { ...common, weight: dto.weight, isActive: dto.is_active } }); break;
          case 'sizes': await tx.initiativeSize.update({ where: { id }, data: { ...common, minScore: dto.min_score, maxScore: dto.max_score, isActive: dto.is_active } }); break;
        }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return { success: true, message: 'Запис оновлено' };
    } catch (error) { this.rethrow(error); }
  }

  async remove(type: DictionaryType, id: string) {
    const usage = await this.usage(type, id);
    if (usage.length) throw new AppError('DICTIONARY_IN_USE', `Неможливо видалити запис: значення використовується у ${usage.join(', ')}`, HttpStatus.CONFLICT);
    switch (type) {
      case 'departments': await this.prisma.department.delete({ where: { id } }); break;
      case 'managers': await this.prisma.manager.delete({ where: { id } }); break;
      case 'priorities': await this.prisma.priority.delete({ where: { id } }); break;
      case 'statuses': await this.prisma.initiativeStatus.delete({ where: { id } }); break;
      case 'weights': await this.prisma.taskWeight.delete({ where: { id } }); break;
      case 'sizes': await this.prisma.initiativeSize.delete({ where: { id } }); break;
    }
    return { success: true, message: type === 'weights' ? 'Вагу видалено. Знімки у картках збережено' : 'Запис видалено' };
  }

  async applyWeightToOpenCards(id: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const definition = await tx.taskWeight.findUnique({ where: { id } });
      if (!definition) throw new AppError('NOT_FOUND', 'Вагу не знайдено', HttpStatus.NOT_FOUND);
      const cards = await tx.quarterCard.findMany({
        where: { checklistItems: { some: { weightDefinitionId: id } } },
        include: { initiativeYear: true, checklistItems: true },
      });
      const sizes = await this.sizeDefinitions(tx);
      let changedCards = 0;
      let changedTasks = 0;
      for (const card of cards) {
        if (isPeriodLocked(card.initiativeYear.year, card.quarter as any, this.zone)) continue;
        const affected = card.checklistItems.filter((item) => item.weightDefinitionId === id);
        if (!affected.length) continue;
        await tx.checklistItem.updateMany({
          where: { id: { in: affected.map((item) => item.id) } },
          data: { weightSnapshotName: definition.name, weightSnapshotValue: definition.weight, revision: { increment: 1 } },
        });
        const total = card.checklistItems.reduce(
          (sum, item) => sum + (item.weightDefinitionId === id ? definition.weight.toNumber() : item.weightSnapshotValue.toNumber()),
          0,
        );
        const size = makeSizeSnapshot(total, sizes);
        await tx.quarterCard.update({
          where: { id: card.id },
          data: { sizeDefinitionId: size.definitionId ?? null, sizeSnapshotName: size.name, sizeSnapshotWeight: size.totalWeight, revision: { increment: 1 } },
        });
        changedCards += 1;
        changedTasks += affected.length;
      }
      return { cards: changedCards, tasks: changedTasks };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { success: true, message: `Оновлено задач: ${result.tasks}`, data: result };
  }

  async recalculateOpenCardSizes() {
    const result = await this.prisma.$transaction(async (tx) => {
      const cards = await tx.quarterCard.findMany({ include: { initiativeYear: true, checklistItems: true } });
      const sizes = await this.sizeDefinitions(tx);
      let changedCards = 0;
      for (const card of cards) {
        if (isPeriodLocked(card.initiativeYear.year, card.quarter as any, this.zone)) continue;
        const total = card.checklistItems.reduce((sum, item) => sum + item.weightSnapshotValue.toNumber(), 0);
        const size = makeSizeSnapshot(total, sizes);
        await tx.quarterCard.update({
          where: { id: card.id },
          data: { sizeDefinitionId: size.definitionId ?? null, sizeSnapshotName: size.name, sizeSnapshotWeight: size.totalWeight, revision: { increment: 1 } },
        });
        changedCards += 1;
      }
      return { cards: changedCards };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { success: true, message: `Розмір оновлено в картках: ${result.cards}`, data: result };
  }

  private async sizeDefinitions(tx: Prisma.TransactionClient) {
    return (await tx.initiativeSize.findMany()).map((item) => ({
      id: item.id,
      name: item.name,
      minScore: item.minScore.toNumber(),
      maxScore: item.maxScore.toNumber(),
      isActive: item.isActive,
    }));
  }

  private requireName(dto: DictionaryDto) { if (!dto.name?.trim()) throw new AppError('VALIDATION_ERROR', 'Вкажіть назву'); }
  private async assertSizeRange(tx: Prisma.TransactionClient, dto: DictionaryDto, ignoredId?: string) {
    const min = dto.min_score ?? 0, max = dto.max_score ?? 0;
    if (max < min) throw new AppError('INVALID_SIZE_RANGE', 'Некоректний діапазон розміру');
    if (dto.is_active !== false && await tx.initiativeSize.findFirst({ where: { id: ignoredId ? { not: ignoredId } : undefined, isActive: true, minScore: { lte: max }, maxScore: { gte: min } } })) throw new AppError('OVERLAPPING_SIZE_RANGE', 'Діапазон перетинається з іншим активним розміром');
  }
  private async usage(type: DictionaryType, id: string) {
    const result: string[] = [];
    if (type === 'departments') {
      if (await this.prisma.passportDepartment.count({ where: { departmentId: id } })) result.push('паспортах');
      if (await this.prisma.checklistDepartment.count({ where: { departmentId: id } })) result.push('завданнях');
      if (await this.prisma.manager.count({ where: { departmentId: id } })) result.push('менеджерах');
      if (await this.prisma.user.count({ where: { departmentId: id } })) result.push('користувачах');
    }
    if (type === 'managers' && await this.prisma.passport.count({ where: { managerId: id } })) result.push('паспортах');
    if (type === 'priorities' && await this.prisma.passport.count({ where: { priorityId: id } })) result.push('паспортах');
    if (type === 'statuses' && (await this.prisma.quarterCard.count({ where: { statusId: id } }) || await this.prisma.checklistItem.count({ where: { statusId: id } }))) result.push('картках або завданнях');
    if (type === 'sizes' && await this.prisma.quarterCard.count({ where: { sizeDefinitionId: id } })) result.push('картках');
    return result;
  }
  private rethrow(error: unknown): never {
    if (error instanceof AppError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError('DUPLICATE_DICTIONARY_VALUE', 'Назва або код має бути унікальним', HttpStatus.CONFLICT);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new AppError('NOT_FOUND', 'Запис не знайдено', HttpStatus.NOT_FOUND);
    throw error;
  }
}
