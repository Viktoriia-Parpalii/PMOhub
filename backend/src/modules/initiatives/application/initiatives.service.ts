import { createHmac, timingSafeEqual } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuthUser } from '../../../common/auth/auth-user';
import { AppError } from '../../../common/errors/app-error';
import { CreateInitiativeDto, CreateQuarterCardDto, ExtendYearsDto, PassportDto, PeriodCommandDto, SavePassportDto, UpdateCardDto, UpdatePreparationDto } from '../api/initiative.dto';
import { ChecklistItemInput, InitiativeKind, PassportInput, Quarter, ScopeMergePreview } from '../domain/types';
import { currentPeriod, isBacklogLocked, isFuturePeriod, isPeriodLocked } from '../domain/period.policy';
import { makeSizeSnapshot, makeWeightSnapshot, totalWeight, validateChecklist, WeightDefinition } from '../domain/capacity.service';
import { cardInclude, mapChecklist, mapPassport, passportInclude } from '../infrastructure/initiative.mapper';

type Tx = Prisma.TransactionClient;
const ok = <T>(message: string, data?: T) => ({ success: true, message, data });

@Injectable()
export class InitiativesService {
  private readonly zone: string;
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {
    this.zone = config.get<string>('BUSINESS_TIME_ZONE') ?? 'Europe/Kyiv';
  }

  async list(query: { kind?: string; year?: number; quarter?: Quarter; is_backlog?: boolean }) {
    const kind = query.kind ? this.kind(query.kind) : undefined;
    const years = await this.prisma.initiativeYear.findMany({
      where: { year: query.year, initiative: { kind } },
      include: {
        initiative: true,
        annualPassport: { include: passportInclude },
        preparationPassport: { include: passportInclude },
        cards: { where: { quarter: query.quarter }, include: cardInclude },
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'asc' }],
    });
    const aggregateIds = years.flatMap((year) => [year.id, year.preparationPassportId, ...year.cards.map((card) => card.id)]);
    const auditEvents = aggregateIds.length ? await this.prisma.auditEvent.findMany({ where: { aggregateId: { in: aggregateIds } }, orderBy: { occurredAt: 'desc' } }) : [];
    const historyFor = (id: string) => auditEvents.filter((event) => event.aggregateId === id).map((event) => ({ id: event.id, date: event.occurredAt.toISOString(), author: event.actorName, action: event.message, code: event.actionCode }));
    const records = years.flatMap((year) => {
      const master = {
        id: year.id,
        initiative_chain_id: year.initiativeId,
        ...mapPassport(year.annualPassport),
        year: year.year,
        quarter: 'Q1',
        health_status: 'DEFAULT',
        checklist: [],
        is_backlog: true,
        revision: year.revision,
        history: historyFor(year.id),
        yearSnapshots: { [String(year.year)]: { ...mapPassport(year.annualPassport), year: year.year, history: historyFor(year.id), preparationStage: { ...mapPassport(year.preparationPassport), history: historyFor(year.preparationPassportId) } } },
      };
      const cards = year.cards.map((card) => ({
        id: card.id,
        initiative_chain_id: year.initiativeId,
        backlog_id: year.id,
        ...mapPassport(card.passport),
        year: year.year,
        quarter: card.quarter,
        health_status: card.status?.id ?? 'DEFAULT',
        health_status_id: card.status?.id ?? undefined,
        health_status_code: card.status?.code ?? 'DEFAULT',
        checklist: card.checklistItems.map(mapChecklist),
        is_backlog: false,
        revision: card.revision,
        history: historyFor(card.id),
        moved_from: card.movedFromYear ? `${card.movedFromQuarter} ${card.movedFromYear}` : undefined,
        sizeSnapshot: { definitionId: card.sizeDefinitionId ?? undefined, name: card.sizeSnapshotName, totalWeight: card.sizeSnapshotWeight.toNumber() },
      }));
      return query.is_backlog === true ? [master] : query.is_backlog === false ? cards : [master, ...cards];
    });
    return { data: records, meta: { total: records.length } };
  }

  async getYear(id: string) {
    const year = await this.prisma.initiativeYear.findUnique({
      where: { id },
      include: {
        initiative: true,
        annualPassport: { include: passportInclude },
        preparationPassport: { include: passportInclude },
      },
    });
    if (!year) throw new AppError('NOT_FOUND', 'Річний запис не знайдено', HttpStatus.NOT_FOUND);
    const events = await this.prisma.auditEvent.findMany({ where: { aggregateId: { in: [year.id, year.preparationPassportId] } }, orderBy: { occurredAt: 'desc' } });
    return ok('Річний запис отримано', this.mapYear(year, events));
  }

  async getCard(id: string) {
    const card = await this.prisma.quarterCard.findUnique({ where: { id }, include: cardInclude });
    if (!card) throw new AppError('NOT_FOUND', 'Картку не знайдено', HttpStatus.NOT_FOUND);
    const events = await this.prisma.auditEvent.findMany({ where: { aggregateId: id }, orderBy: { occurredAt: 'desc' } });
    return ok('Картку отримано', this.mapCard(card, events));
  }

  async create(dto: CreateInitiativeDto, actor: AuthUser) {
    const kind = this.kind(dto.kind);
    if (isBacklogLocked(dto.year, this.zone)) throw new AppError('ARCHIVED_YEAR', 'Не можна створювати ініціативу в архівному році');
    const quarters = [...new Set(dto.quarters)];
    if (quarters.some((quarter) => isPeriodLocked(dto.year, quarter, this.zone))) throw new AppError('ARCHIVED_PERIOD', 'Серед вибраних кварталів є архівний');
    const scope = dto.initial_scope ?? [];
    return this.prisma.$transaction(async (tx) => {
      const weights = await this.weights(tx);
      const errors = validateChecklist(scope, weights);
      if (errors.length) throw new AppError('INVALID_SCOPE', errors.join('\n'));
      const sizes = await this.sizes(tx);
      const initiative = await tx.initiative.create({ data: { kind } });
      const annualPassport = await this.createPassport(tx, dto.passport, kind);
      const preparationPassport = await this.createPassport(tx, { ...dto.passport, implementer_dept_ids: [] }, kind);
      const year = await tx.initiativeYear.create({ data: { initiativeId: initiative.id, year: dto.year, annualPassportId: annualPassport.id, preparationPassportId: preparationPassport.id } });
      for (const quarter of quarters) await this.createCard(tx, year.id, dto.passport, kind, quarter, scope, weights, sizes);
      await this.audit(tx, 'INITIATIVE_YEAR', year.id, 'INITIATIVE_CREATED', 'Ініціативу та квартальні картки створено', actor);
      return ok('Ініціативу та квартальні картки створено', { id: year.id, initiative_chain_id: initiative.id });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async createQuarterCard(yearId: string, dto: CreateQuarterCardDto, actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const year = await tx.initiativeYear.findUnique({ where: { id: yearId }, include: { initiative: true } });
      if (!year) throw new AppError('NOT_FOUND', 'Річний запис не знайдено', HttpStatus.NOT_FOUND);
      await this.assertEditable(actor, year.year, dto.quarter, false, tx);
      if (await tx.quarterCard.findFirst({ where: { initiativeYearId: yearId, quarter: dto.quarter } })) {
        throw new AppError('DUPLICATE_QUARTER_CARD', 'У цьому кварталі вже існує картка ініціативи', HttpStatus.CONFLICT);
      }
      const scope = dto.initial_scope ?? [];
      const weights = await this.weights(tx);
      const errors = validateChecklist(scope, weights);
      if (errors.length) throw new AppError('INVALID_SCOPE', errors.join('\n'));
      const card = await this.createCard(tx, yearId, dto.passport, year.initiative.kind as InitiativeKind, dto.quarter, scope, weights, await this.sizes(tx));
      await this.audit(tx, 'QUARTER_CARD', card.id, 'CARD_CREATED', 'Квартальну картку створено', actor);
      return ok('Квартальну картку створено', { id: card.id });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async updateCard(cardId: string, dto: UpdateCardDto, actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const card = await tx.quarterCard.findUnique({ where: { id: cardId }, include: cardInclude });
      if (!card) throw new AppError('NOT_FOUND', 'Картку не знайдено', HttpStatus.NOT_FOUND);
      await this.assertEditable(actor, card.initiativeYear.year, card.quarter as Quarter, false, tx);
      if (card.revision !== dto.revision) throw this.conflict(card.revision);
      const weights = await this.weights(tx);
      if (dto.checklist) {
        const errors = validateChecklist(dto.checklist, weights);
        if (errors.length) throw new AppError('INVALID_SCOPE', errors.join('\n'));
        if (isPeriodLocked(card.initiativeYear.year, card.quarter as Quarter, this.zone)) {
          const oldSignature = JSON.stringify(card.checklistItems.map((item) => [item.id, item.weightDefinitionId, item.weightSnapshotValue.toString()]));
          const newSignature = JSON.stringify(dto.checklist.map((item) => [item.id, item.weightId, item.weightSnapshot?.value]));
          if (oldSignature !== newSignature) throw new AppError('ARCHIVED_SCOPE', 'Зміна ваги або складу scope в архівному періоді заборонена');
        }
        await this.syncChecklist(tx, cardId, dto.checklist, weights);
      }
      if (dto.passport) await this.updatePassport(tx, card.passportId, dto.passport, card.initiativeYear.initiative.kind as InitiativeKind);
      const statusId = dto.health_status ?? card.statusId ?? undefined;
      const sizes = await this.sizes(tx);
      const nextItems = dto.checklist ?? card.checklistItems.map(mapChecklist);
      const size = makeSizeSnapshot(totalWeight(nextItems, weights), sizes);
      const updated = await tx.quarterCard.updateMany({ where: { id: cardId, revision: dto.revision }, data: { statusId, sizeDefinitionId: size.definitionId ?? null, sizeSnapshotName: size.name, sizeSnapshotWeight: size.totalWeight, revision: { increment: 1 } } });
      if (updated.count !== 1) {
        const current = await tx.quarterCard.findUnique({ where: { id: cardId }, select: { revision: true } });
        throw this.conflict(current?.revision);
      }
      await this.audit(tx, 'QUARTER_CARD', cardId, 'CARD_UPDATED', 'Квартальну картку оновлено', actor);
      return ok('Запис оновлено', { revision: dto.revision + 1 });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async moveCard(cardId: string, dto: PeriodCommandDto, actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const card = await tx.quarterCard.findUnique({ where: { id: cardId }, include: cardInclude });
      if (!card) throw new AppError('NOT_FOUND', 'Картку не знайдено', HttpStatus.NOT_FOUND);
      if (card.revision !== dto.revision) throw this.conflict(card.revision, 'QUARTER_CARD', card.id);
      await this.assertEditable(actor, card.initiativeYear.year, card.quarter as Quarter, false, tx);
      await this.assertTargetEditable(actor, dto.to_year, dto.to_quarter, tx);
      if (card.checklistItems.some((item) => item.isCompleted || item.status?.code === 'GREEN')) throw new AppError('COMPLETED_SCOPE', 'Картку з виконаними або зеленими завданнями переносити не можна');
      if (card.initiativeYear.year === dto.to_year && card.quarter === dto.to_quarter) throw new AppError('SAME_PERIOD', 'Оберіть інший квартал або рік');
      const occupied = await tx.quarterCard.findFirst({ where: { initiativeYear: { initiativeId: card.initiativeYear.initiativeId, year: dto.to_year }, quarter: dto.to_quarter } });
      if (occupied) throw new AppError('TARGET_OCCUPIED', `У ${dto.to_quarter} ${dto.to_year} вже є картка цієї ініціативи. Повне перенесення неможливе; переносьте окремі завдання.`);
      const targetYear = await this.ensureYear(tx, card, dto.to_year, actor);
      const defaultStatus = await tx.initiativeStatus.findUnique({ where: { code: 'DEFAULT' } });
      const moved = await tx.quarterCard.updateMany({ where: { id: cardId, revision: dto.revision }, data: { initiativeYearId: targetYear.id, quarter: dto.to_quarter, statusId: defaultStatus?.id ?? null, movedFromYear: card.initiativeYear.year, movedFromQuarter: card.quarter, revision: { increment: 1 } } });
      if (moved.count !== 1) throw this.conflict((await tx.quarterCard.findUnique({ where: { id: cardId }, select: { revision: true } }))?.revision, 'QUARTER_CARD', cardId);
      await this.audit(tx, 'QUARTER_CARD', cardId, 'CARD_MOVED', `Картку перенесено з ${card.quarter} ${card.initiativeYear.year} до ${dto.to_quarter} ${dto.to_year}`, actor, card.initiativeYear.year, card.quarter as Quarter, dto.to_year, dto.to_quarter);
      return ok('Картку перенесено');
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async continueCard(cardId: string, dto: PeriodCommandDto, actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const source = await tx.quarterCard.findUnique({ where: { id: cardId }, include: cardInclude });
      if (!source) throw new AppError('NOT_FOUND', 'Картку не знайдено', HttpStatus.NOT_FOUND);
      if (source.revision !== dto.revision) throw this.conflict(source.revision, 'QUARTER_CARD', source.id);
      await this.assertEditable(actor, source.initiativeYear.year, source.quarter as Quarter, false, tx);
      const current = currentPeriod(this.zone);
      if (!isFuturePeriod(source.initiativeYear.year, source.quarter as Quarter, dto.to_year, dto.to_quarter) ||
          dto.to_year * 10 + Number(dto.to_quarter.slice(1)) < current.year * 10 + Number(current.quarter.slice(1))) {
        throw new AppError('INVALID_CONTINUATION_PERIOD', 'Для продовження оберіть поточний або майбутній квартал після поточної картки');
      }
      const occupied = await tx.quarterCard.findFirst({ where: { initiativeYear: { initiativeId: source.initiativeYear.initiativeId, year: dto.to_year }, quarter: dto.to_quarter } });
      if (occupied) throw new AppError('TARGET_OCCUPIED', `У ${dto.to_quarter} ${dto.to_year} вже є картка цієї ініціативи. Продовження неможливе.`);
      const year = await this.ensureYear(tx, source, dto.to_year, actor);
      const passport = mapPassport(source.passport);
      const created = await this.createCard(tx, year.id, passport, source.initiativeYear.initiative.kind as InitiativeKind, dto.to_quarter, [], await this.weights(tx), await this.sizes(tx));
      await this.audit(tx, 'QUARTER_CARD', created.id, 'CARD_CONTINUED', `Ініціативу продовжено з ${source.quarter} ${source.initiativeYear.year} до ${dto.to_quarter} ${dto.to_year}`, actor, source.initiativeYear.year, source.quarter as Quarter, dto.to_year, dto.to_quarter);
      return ok('Створено нову картку без завдань обсягу робіт', { id: created.id });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async moveChecklistItem(cardId: string, itemId: string, dto: PeriodCommandDto, actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const source = await tx.quarterCard.findUnique({ where: { id: cardId }, include: cardInclude });
      if (!source) throw new AppError('NOT_FOUND', 'Вихідну картку не знайдено', HttpStatus.NOT_FOUND);
      if (source.revision !== dto.revision) throw this.conflict(source.revision, 'QUARTER_CARD', source.id);
      const item = source.checklistItems.find((candidate) => candidate.id === itemId);
      if (!item) throw new AppError('NOT_FOUND', 'Завдання не знайдено', HttpStatus.NOT_FOUND);
      if (item.isCompleted || item.status?.code === 'GREEN') throw new AppError('COMPLETED_SCOPE', 'Виконане або зелене завдання переносити не можна');
      await this.assertEditable(actor, source.initiativeYear.year, source.quarter as Quarter, false, tx);
      await this.assertTargetEditable(actor, dto.to_year, dto.to_quarter, tx);
      const target = await tx.quarterCard.findFirst({ where: { initiativeYear: { initiativeId: source.initiativeYear.initiativeId, year: dto.to_year }, quarter: dto.to_quarter }, include: cardInclude });
      if (target) {
        const preview = this.mergePreview(source, target, itemId);
        if (!dto.confirmation_token) return { success: false, message: 'Потрібне підтвердження об’єднання завдань', requiresConfirmation: preview };
        this.verifyMergeToken(dto.confirmation_token, { sourceId: source.id, targetId: target.id, itemId, sourceRevision: source.revision, targetRevision: target.revision });
        if (!target.checklistItems.some((candidate) => candidate.id === item.id)) await tx.checklistItem.update({ where: { id: item.id }, data: { cardId: target.id, movedFromYear: source.initiativeYear.year, movedFromQuarter: source.quarter, revision: { increment: 1 } } });
        else await tx.checklistItem.delete({ where: { id: item.id } });
        if (source.checklistItems.length === 1) await this.deleteCardGraph(tx, source.id);
        else { await this.refreshCardSize(tx, source.id); await tx.quarterCard.update({ where: { id: source.id }, data: { revision: { increment: 1 } } }); }
        await this.refreshCardSize(tx, target.id);
        await tx.quarterCard.update({ where: { id: target.id }, data: { revision: { increment: 1 } } });
      } else {
        const year = await this.ensureYear(tx, source, dto.to_year, actor);
        const created = await this.createCard(tx, year.id, mapPassport(source.passport), source.initiativeYear.initiative.kind as InitiativeKind, dto.to_quarter, [], await this.weights(tx), await this.sizes(tx));
        await tx.checklistItem.update({ where: { id: item.id }, data: { cardId: created.id, movedFromYear: source.initiativeYear.year, movedFromQuarter: source.quarter, revision: { increment: 1 } } });
        if (source.checklistItems.length === 1) await this.deleteCardGraph(tx, source.id);
        else { await this.refreshCardSize(tx, source.id); await tx.quarterCard.update({ where: { id: source.id }, data: { revision: { increment: 1 } } }); }
        await this.refreshCardSize(tx, created.id);
      }
      await this.audit(tx, 'CHECKLIST_ITEM', item.id, 'SCOPE_MOVED', `Завдання «${item.text}» перенесено з ${source.quarter} ${source.initiativeYear.year} до ${dto.to_quarter} ${dto.to_year}`, actor, source.initiativeYear.year, source.quarter as Quarter, dto.to_year, dto.to_quarter);
      return ok('Завдання перенесено');
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async savePassport(ownerType: 'year' | 'card', ownerId: string, dto: SavePassportDto, actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const sourceYear = ownerType === 'year' ? await tx.initiativeYear.findUnique({ where: { id: ownerId }, include: { initiative: true } }) : null;
      const sourceCard = ownerType === 'card' ? await tx.quarterCard.findUnique({ where: { id: ownerId }, include: { initiativeYear: { include: { initiative: true } } } }) : null;
      const initiative = sourceYear?.initiative ?? sourceCard?.initiativeYear.initiative;
      const year = sourceYear?.year ?? sourceCard?.initiativeYear.year;
      const revision = sourceYear?.revision ?? sourceCard?.revision;
      if (!initiative || year === undefined || revision !== dto.revision) throw sourceYear || sourceCard ? this.conflict(revision) : new AppError('NOT_FOUND', 'Запис не знайдено', HttpStatus.NOT_FOUND);
      await this.assertEditable(actor, year, sourceCard?.quarter as Quarter | undefined, ownerType === 'year', tx);
      const targetYears = await tx.initiativeYear.findMany({ where: { id: { in: dto.target_years.map((item) => item.id) }, initiativeId: initiative.id } });
      const targetCards = await tx.quarterCard.findMany({ where: { id: { in: dto.target_cards.map((item) => item.id) }, initiativeYear: { initiativeId: initiative.id } }, include: { initiativeYear: true } });
      if (targetYears.length !== dto.target_years.length || targetCards.length !== dto.target_cards.length) throw new AppError('INVALID_PROPAGATION_TARGET', 'Серед target-записів є відсутній або чужий');
      for (const target of targetYears) { const expected = dto.target_years.find((item) => item.id === target.id)!; if (target.revision !== expected.revision) throw this.conflict(target.revision, 'INITIATIVE_YEAR', target.id); }
      for (const target of targetCards) { const expected = dto.target_cards.find((item) => item.id === target.id)!; if (target.revision !== expected.revision) throw this.conflict(target.revision, 'QUARTER_CARD', target.id); }
      for (const target of targetYears) if (isBacklogLocked(target.year, this.zone)) throw new AppError('ARCHIVED_TARGET', 'Серед річних записів є архівний target');
      for (const target of targetCards) if (isPeriodLocked(target.initiativeYear.year, target.quarter as Quarter, this.zone)) throw new AppError('ARCHIVED_TARGET', 'Серед карток є архівний target');
      const sourceCardUpdate: Prisma.QuarterCardUpdateInput = { revision: { increment: 1 } };
      if (sourceCard && dto.source_card_patch) {
        const patch = dto.source_card_patch;
        const weights = await this.weights(tx);
        if (patch.checklist) {
          const errors = validateChecklist(patch.checklist, weights);
          if (errors.length) throw new AppError('INVALID_SCOPE', errors.join('\n'));
          if (isPeriodLocked(sourceCard.initiativeYear.year, sourceCard.quarter as Quarter, this.zone)) {
            const oldSignature = JSON.stringify((await tx.checklistItem.findMany({ where: { cardId: sourceCard.id } })).map((item) => [item.id, item.weightDefinitionId, item.weightSnapshotValue.toString()]));
            const newSignature = JSON.stringify(patch.checklist.map((item) => [item.id, item.weightId, item.weightSnapshot?.value]));
            if (oldSignature !== newSignature) throw new AppError('ARCHIVED_SCOPE', 'Зміна ваги або складу scope в архівному періоді заборонена');
          }
          await this.syncChecklist(tx, sourceCard.id, patch.checklist, weights);
          const size = makeSizeSnapshot(totalWeight(patch.checklist, weights), await this.sizes(tx));
          Object.assign(sourceCardUpdate, { sizeDefinition: size.definitionId ? { connect: { id: size.definitionId } } : { disconnect: true }, sizeSnapshotName: size.name, sizeSnapshotWeight: size.totalWeight });
        }
        if (patch.health_status !== undefined) Object.assign(sourceCardUpdate, { status: patch.health_status ? { connect: { id: patch.health_status } } : { disconnect: true } });
      }
      if (sourceYear) await this.updatePassport(tx, sourceYear.annualPassportId, dto.passport, initiative.kind as InitiativeKind);
      if (sourceCard) await this.updatePassport(tx, sourceCard.passportId, dto.passport, initiative.kind as InitiativeKind);
      for (const target of targetYears) await this.updatePassport(tx, target.annualPassportId, dto.passport, initiative.kind as InitiativeKind);
      for (const target of targetCards) await this.updatePassport(tx, target.passportId, dto.passport, initiative.kind as InitiativeKind);
      if (sourceYear) await tx.initiativeYear.update({ where: { id: sourceYear.id }, data: { revision: { increment: 1 } } });
      if (sourceCard) await tx.quarterCard.update({ where: { id: sourceCard.id }, data: sourceCardUpdate });
      if (targetYears.length) await tx.initiativeYear.updateMany({ where: { id: { in: targetYears.map((item) => item.id) } }, data: { revision: { increment: 1 } } });
      if (targetCards.length) await tx.quarterCard.updateMany({ where: { id: { in: targetCards.map((item) => item.id) } }, data: { revision: { increment: 1 } } });
      await this.audit(tx, ownerType === 'year' ? 'INITIATIVE_YEAR' : 'QUARTER_CARD', ownerId, 'PASSPORT_SYNCED', 'Паспорт синхронізовано', actor);
      return ok('Зміни збережено атомарно', { snapshots: targetYears.length + (sourceYear ? 1 : 0), cards: targetCards.length + (sourceCard ? 1 : 0) });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async extendYears(dto: ExtendYearsDto, actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      if (isBacklogLocked(dto.target_year, this.zone)) throw new AppError('ARCHIVED_YEAR', 'Не можна створювати архівний snapshot');
      const sources = await tx.initiativeYear.findMany({ where: { id: { in: [...new Set(dto.source_year_ids)] } }, include: { initiative: true, annualPassport: { include: passportInclude }, preparationPassport: { include: passportInclude }, cards: { include: cardInclude } } });
      if (sources.length !== new Set(dto.source_year_ids).size) throw new AppError('NOT_FOUND', 'Одна з обраних ініціатив більше не існує');
      for (const source of sources) {
        if (await tx.initiativeYear.findUnique({ where: { initiativeId_year: { initiativeId: source.initiativeId, year: dto.target_year } } })) throw new AppError('DUPLICATE_YEAR', `Ініціативу «${source.annualPassport.name}» вже продовжено на ${dto.target_year} рік`);
        const latestCard = [...source.cards].sort((a, b) => b.quarter.localeCompare(a.quarter))[0];
        const annual = await this.clonePassport(tx, source.annualPassportId, source.initiative.kind as InitiativeKind);
        const prep = await this.clonePassport(tx, latestCard?.passportId ?? source.preparationPassportId, source.initiative.kind as InitiativeKind, true);
        const target = await tx.initiativeYear.create({ data: { initiativeId: source.initiativeId, year: dto.target_year, annualPassportId: annual.id, preparationPassportId: prep.id } });
        await this.audit(tx, 'INITIATIVE_YEAR', target.id, 'YEAR_EXTENDED', `Створено підготовчий етап ${dto.target_year} року на основі ${source.year} року`, actor);
      }
      return ok(`Продовжено ініціатив: ${sources.length}`, { created: sources.length });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async updatePreparation(yearId: string, dto: UpdatePreparationDto, actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const year = await tx.initiativeYear.findUnique({ where: { id: yearId }, include: { initiative: true } });
      if (!year) throw new AppError('NOT_FOUND', 'Річний запис не знайдено', HttpStatus.NOT_FOUND);
      if (year.revision !== dto.revision) throw this.conflict(year.revision);
      await this.assertEditable(actor, year.year, undefined, true, tx);
      await this.updatePassport(tx, year.preparationPassportId, { ...dto, implementer_dept_ids: [] }, year.initiative.kind as InitiativeKind);
      await tx.initiativeYear.update({ where: { id: yearId }, data: { revision: { increment: 1 } } });
      await this.audit(tx, 'PREPARATION_STAGE', year.preparationPassportId, 'PREPARATION_UPDATED', 'Оновлено підготовчий етап', actor);
      return ok('Підготовчий етап оновлено', { revision: dto.revision + 1 });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async remove(ownerType: 'year' | 'card', id: string, revision: number, actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      if (ownerType === 'card') {
        const card = await tx.quarterCard.findUnique({ where: { id }, include: cardInclude });
        if (!card) throw new AppError('NOT_FOUND', 'Картку не знайдено', HttpStatus.NOT_FOUND);
        if (card.revision !== revision) throw this.conflict(card.revision, 'QUARTER_CARD', card.id);
        await this.assertDeletable(actor, card.initiativeYear.year, card.quarter as Quarter, tx);
        if (card.checklistItems.some((item) => item.isCompleted || item.status?.code === 'GREEN')) throw new AppError('COMPLETED_SCOPE', 'Картку з виконаними завданнями видалити не можна');
        await this.deleteCardGraph(tx, id);
      } else {
        const year = await tx.initiativeYear.findUnique({ where: { id }, include: { cards: true } });
        if (!year) throw new AppError('NOT_FOUND', 'Річний запис не знайдено', HttpStatus.NOT_FOUND);
        if (year.revision !== revision) throw this.conflict(year.revision, 'INITIATIVE_YEAR', year.id);
        await this.assertDeletable(actor, year.year, undefined, tx);
        if (year.cards.length) throw new AppError('HAS_CARDS', 'Річний запис беклогу має пов’язані квартальні картки');
        const initiativeId = year.initiativeId;
        await tx.initiativeYear.delete({ where: { id } });
        await tx.passport.deleteMany({ where: { id: { in: [year.annualPassportId, year.preparationPassportId] } } });
        if (!(await tx.initiativeYear.count({ where: { initiativeId } }))) await tx.initiative.delete({ where: { id: initiativeId } });
      }
      await this.audit(tx, ownerType === 'year' ? 'INITIATIVE_YEAR' : 'QUARTER_CARD', id, 'DELETED', 'Запис видалено', actor);
      return ok('Запис видалено');
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private kind(value: string): InitiativeKind { return value.toUpperCase() === 'PROJECT' ? 'PROJECT' : value.toUpperCase() === 'TASK' ? 'TASK' : (() => { throw new AppError('INVALID_KIND', 'Некоректний тип ініціативи'); })(); }

  private async createPassport(tx: Tx, input: PassportInput, kind: InitiativeKind) {
    const implementers = [...new Set(input.implementer_dept_ids ?? [])];
    const cross = [...new Set(input.cross_functional_dept_ids ?? [])].filter((id) => !implementers.includes(id));
    const passport = await tx.passport.create({ data: { name: input.name.trim(), strategicGoal: input.strategic_goal, managerId: input.manager_id, priorityId: input.priority, notes: input.notes,
      departments: { create: [...implementers.map((departmentId) => ({ departmentId, involvement: 'IMPLEMENTER' })), ...cross.map((departmentId) => ({ departmentId, involvement: 'CROSS_FUNCTIONAL' }))] } } });
    await this.replaceCustomValues(tx, passport.id, input.custom_fields ?? {}, kind);
    return passport;
  }

  private async updatePassport(tx: Tx, id: string, input: PassportInput, kind: InitiativeKind) {
    await tx.passport.update({ where: { id }, data: { name: input.name.trim(), strategicGoal: input.strategic_goal ?? null, managerId: input.manager_id ?? null, priorityId: input.priority ?? null, notes: input.notes ?? null } });
    await tx.passportDepartment.deleteMany({ where: { passportId: id } });
    const implementers = [...new Set(input.implementer_dept_ids ?? [])];
    const links = [...implementers.map((departmentId) => ({ passportId: id, departmentId, involvement: 'IMPLEMENTER' })), ...[...new Set(input.cross_functional_dept_ids ?? [])].filter((departmentId) => !implementers.includes(departmentId)).map((departmentId) => ({ passportId: id, departmentId, involvement: 'CROSS_FUNCTIONAL' }))];
    if (links.length) await tx.passportDepartment.createMany({ data: links });
    await this.replaceCustomValues(tx, id, input.custom_fields ?? {}, kind);
  }

  private async clonePassport(tx: Tx, passportId: string, kind: InitiativeKind, preparation = false) {
    const source = await tx.passport.findUniqueOrThrow({ where: { id: passportId }, include: passportInclude });
    const input = mapPassport(source);
    return this.createPassport(tx, preparation ? { ...input, implementer_dept_ids: [] } : input, kind);
  }

  private async replaceCustomValues(tx: Tx, passportId: string, values: Record<string, unknown>, kind: InitiativeKind) {
    await tx.customFieldValue.deleteMany({ where: { passportId } });
    const definitions = await tx.customFieldDefinition.findMany({ where: { id: { in: Object.keys(values) }, entityType: kind.toLowerCase() } });
    for (const definition of definitions) {
      const value = values[definition.id];
      if (value === undefined || value === null || value === '') continue;
      await tx.customFieldValue.create({ data: { passportId, definitionId: definition.id,
        textValue: definition.fieldType === 'NUMBER' || definition.fieldType === 'CHECKBOX' ? null : String(value),
        numberValue: definition.fieldType === 'NUMBER' ? Number(value) : null,
        booleanValue: definition.fieldType === 'CHECKBOX' ? Boolean(value) : null } });
    }
  }

  private async createCard(tx: Tx, yearId: string, passportInput: PassportInput, kind: InitiativeKind, quarter: Quarter, scope: ChecklistItemInput[], weights: WeightDefinition[], sizes: Awaited<ReturnType<InitiativesService['sizes']>>) {
    const passport = await this.createPassport(tx, passportInput, kind);
    const size = makeSizeSnapshot(totalWeight(scope, weights), sizes);
    const status = await tx.initiativeStatus.findUnique({ where: { code: 'DEFAULT' } });
    const card = await tx.quarterCard.create({ data: { initiativeYearId: yearId, passportId: passport.id, quarter, statusId: status?.id, sizeDefinitionId: size.definitionId, sizeSnapshotName: size.name, sizeSnapshotWeight: size.totalWeight } });
    await this.createChecklist(tx, card.id, scope, weights);
    return card;
  }

  private async createChecklist(tx: Tx, cardId: string, scope: ChecklistItemInput[], weights: WeightDefinition[]) {
    for (const item of scope) {
      const definition = weights.find((weight) => weight.id === item.weightId);
      const snapshot = item.weightSnapshot ?? (definition ? makeWeightSnapshot(definition) : undefined);
      if (!snapshot) throw new AppError('INVALID_WEIGHT', `«${item.text}»: оберіть активну вагу`);
      const status = item.color ? await tx.initiativeStatus.findUnique({ where: { code: item.color } }) : null;
      await tx.checklistItem.create({ data: { id: item.id, cardId, text: item.text, isCompleted: item.is_completed ?? false, statusId: status?.id, weightDefinitionId: definition?.id ?? snapshot.definitionId, weightSnapshotName: snapshot.name, weightSnapshotValue: snapshot.value,
        departments: { create: [...new Set(item.implementer_dept_ids ?? [])].map((departmentId) => ({ departmentId })) },
        assignees: { create: [...new Set(item.assigneeIds ?? [])].map((userId) => ({ userId })) } } });
    }
  }

  private async syncChecklist(tx: Tx, cardId: string, scope: ChecklistItemInput[], weights: WeightDefinition[]) {
    const existing = await tx.checklistItem.findMany({ where: { cardId } });
    const existingIds = new Set(existing.map((item) => item.id));
    const requestedIds = new Set(scope.map((item) => item.id).filter((id): id is string => Boolean(id)));
    const removed = existing.filter((item) => !requestedIds.has(item.id)).map((item) => item.id);
    if (removed.length) await tx.checklistItem.deleteMany({ where: { id: { in: removed } } });
    for (const item of scope) {
      if (!item.id || !existingIds.has(item.id)) { await this.createChecklist(tx, cardId, [item], weights); continue; }
      const definition = weights.find((weight) => weight.id === item.weightId);
      const snapshot = item.weightSnapshot ?? (definition ? makeWeightSnapshot(definition) : undefined);
      if (!snapshot) throw new AppError('INVALID_WEIGHT', `«${item.text}»: оберіть активну вагу`);
      const status = item.color ? await tx.initiativeStatus.findUnique({ where: { code: item.color } }) : null;
      await tx.checklistDepartment.deleteMany({ where: { checklistItemId: item.id } });
      await tx.checklistAssignee.deleteMany({ where: { checklistItemId: item.id } });
      await tx.checklistItem.update({ where: { id: item.id }, data: {
        text: item.text, isCompleted: item.is_completed ?? false, statusId: status?.id ?? null,
        weightDefinitionId: definition?.id ?? snapshot.definitionId ?? null, weightSnapshotName: snapshot.name,
        weightSnapshotValue: snapshot.value, revision: { increment: 1 },
      } });
      const departments = [...new Set(item.implementer_dept_ids ?? [])].map((departmentId) => ({ checklistItemId: item.id!, departmentId }));
      const assignees = [...new Set(item.assigneeIds ?? [])].map((userId) => ({ checklistItemId: item.id!, userId }));
      if (departments.length) await tx.checklistDepartment.createMany({ data: departments });
      if (assignees.length) await tx.checklistAssignee.createMany({ data: assignees });
    }
  }

  private async refreshCardSize(tx: Tx, cardId: string) {
    const items = await tx.checklistItem.findMany({ where: { cardId } });
    const total = items.reduce((sum, item) => sum + item.weightSnapshotValue.toNumber(), 0);
    const size = makeSizeSnapshot(total, await this.sizes(tx));
    await tx.quarterCard.update({ where: { id: cardId }, data: { sizeDefinitionId: size.definitionId ?? null, sizeSnapshotName: size.name, sizeSnapshotWeight: size.totalWeight } });
  }

  private async ensureYear(tx: Tx, card: any, targetYear: number, actor: AuthUser) {
    const existing = await tx.initiativeYear.findUnique({ where: { initiativeId_year: { initiativeId: card.initiativeYear.initiativeId, year: targetYear } } });
    if (existing) return existing;
    const kind = card.initiativeYear.initiative.kind as InitiativeKind;
    const annual = await this.clonePassport(tx, card.passportId, kind);
    const preparation = await this.clonePassport(tx, card.passportId, kind, true);
    const year = await tx.initiativeYear.create({ data: { initiativeId: card.initiativeYear.initiativeId, year: targetYear, annualPassportId: annual.id, preparationPassportId: preparation.id } });
    await this.audit(tx, 'INITIATIVE_YEAR', year.id, 'YEAR_CREATED', `Створено річний запис беклогу на ${targetYear} рік`, actor);
    return year;
  }

  private async deleteCardGraph(tx: Tx, id: string) {
    const card = await tx.quarterCard.findUniqueOrThrow({ where: { id } });
    await tx.quarterCard.delete({ where: { id } });
    await tx.passport.delete({ where: { id: card.passportId } });
  }

  private async weights(tx: Tx) { return (await tx.taskWeight.findMany()).map((item) => ({ id: item.id, name: item.name, weight: item.weight.toNumber(), isActive: item.isActive })); }
  private async sizes(tx: Tx) { return (await tx.initiativeSize.findMany()).map((item) => ({ id: item.id, name: item.name, minScore: item.minScore.toNumber(), maxScore: item.maxScore.toNumber(), isActive: item.isActive })); }

  private mergePreview(source: any, target: any, itemId: string): ScopeMergePreview {
    const duplicate = target.checklistItems.some((item: any) => item.id === itemId);
    const payload = { sourceId: source.id, targetId: target.id, itemId, sourceRevision: source.revision, targetRevision: target.revision, exp: Date.now() + 5 * 60_000 };
    return { token: this.signMergeToken(payload), sourceCardId: source.id, targetCardId: target.id, sourcePeriod: `${source.quarter} ${source.initiativeYear.year}`, targetPeriod: `${target.quarter} ${target.initiativeYear.year}`, incomingCount: 1, addedCount: duplicate ? 0 : 1, duplicateItemIds: duplicate ? [itemId] : [], deletesSource: source.checklistItems.length === 1 };
  }

  private signMergeToken(payload: object) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${encoded}.${createHmac('sha256', this.config.getOrThrow('MERGE_TOKEN_SECRET')).update(encoded).digest('base64url')}`;
  }

  private verifyMergeToken(token: string, expected: object) {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) throw new AppError('STALE_MERGE_PREVIEW', 'Дані змінилися після перегляду. Повторіть об’єднання', HttpStatus.CONFLICT);
    const actual = createHmac('sha256', this.config.getOrThrow('MERGE_TOKEN_SECRET')).update(encoded).digest();
    const provided = Buffer.from(signature, 'base64url');
    if (actual.length !== provided.length || !timingSafeEqual(actual, provided)) throw new AppError('STALE_MERGE_PREVIEW', 'Дані змінилися після перегляду. Повторіть об’єднання', HttpStatus.CONFLICT);
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as Record<string, unknown>;
    if (Number(payload.exp) < Date.now() || Object.entries(expected).some(([key, value]) => payload[key] !== value)) throw new AppError('STALE_MERGE_PREVIEW', 'Дані змінилися після перегляду. Повторіть об’єднання', HttpStatus.CONFLICT);
  }

  private async assertEditable(actor: AuthUser, year: number, quarter: Quarter | undefined, backlog: boolean, tx: Tx) {
    const permissions = await tx.rolePermission.findUnique({ where: { role: actor.role } });
    if (!permissions?.canCreateEditProjects || permissions.isReadOnly) throw new AppError('FORBIDDEN', 'Редагування заборонено', HttpStatus.FORBIDDEN);
    const locked = backlog ? isBacklogLocked(year, this.zone) : quarter ? isPeriodLocked(year, quarter, this.zone) : false;
    if (locked && !permissions.canEditArchive) throw new AppError('ARCHIVED_PERIOD', 'Редагування архівного періоду заборонено', HttpStatus.FORBIDDEN);
  }

  private async assertTargetEditable(actor: AuthUser, year: number, quarter: Quarter, tx: Tx) { await this.assertEditable(actor, year, quarter, false, tx); }
  private async assertDeletable(actor: AuthUser, year: number, quarter: Quarter | undefined, tx: Tx) {
    const permissions = await tx.rolePermission.findUnique({ where: { role: actor.role } });
    const locked = quarter ? isPeriodLocked(year, quarter, this.zone) : isBacklogLocked(year, this.zone);
    if (!permissions?.canDeleteProjects || permissions.isReadOnly || (locked && !permissions.canEditArchive)) throw new AppError('FORBIDDEN', 'Видалення заборонено', HttpStatus.FORBIDDEN);
  }
  private mapYear(year: any, events: any[] = []) {
    const historyFor = (aggregateId: string) => events.filter((event) => event.aggregateId === aggregateId).map((event) => ({ id: event.id, date: event.occurredAt.toISOString(), author: event.actorName, action: event.message, code: event.actionCode }));
    return {
      id: year.id,
      initiative_chain_id: year.initiativeId,
      ...mapPassport(year.annualPassport),
      year: year.year,
      quarter: 'Q1',
      health_status: 'DEFAULT',
      checklist: [],
      is_backlog: true,
      revision: year.revision,
      history: historyFor(year.id),
      yearSnapshots: {
        [String(year.year)]: {
          ...mapPassport(year.annualPassport),
          year: year.year,
          history: historyFor(year.id),
          preparationStage: { ...mapPassport(year.preparationPassport), history: historyFor(year.preparationPassportId) },
        },
      },
    };
  }

  private mapCard(card: any, events: any[] = []) {
    return {
      id: card.id,
      initiative_chain_id: card.initiativeYear.initiativeId,
      backlog_id: card.initiativeYear.id,
      ...mapPassport(card.passport),
      year: card.initiativeYear.year,
      quarter: card.quarter,
      health_status: card.status?.id ?? 'DEFAULT',
      health_status_id: card.status?.id ?? undefined,
      health_status_code: card.status?.code ?? 'DEFAULT',
      checklist: card.checklistItems.map(mapChecklist),
      is_backlog: false,
      revision: card.revision,
      history: events.map((event) => ({ id: event.id, date: event.occurredAt.toISOString(), author: event.actorName, action: event.message, code: event.actionCode })),
      moved_from: card.movedFromYear ? `${card.movedFromQuarter} ${card.movedFromYear}` : undefined,
      sizeSnapshot: {
        definitionId: card.sizeDefinitionId ?? undefined,
        name: card.sizeSnapshotName,
        totalWeight: card.sizeSnapshotWeight.toNumber(),
      },
    };
  }

  private conflict(actualRevision?: number, aggregateType?: string, aggregateId?: string) {
    return new AppError(
      'REVISION_CONFLICT',
      'Запис уже змінено іншим користувачем. Оновіть дані.',
      HttpStatus.CONFLICT,
      actualRevision === undefined ? undefined : { actual_revision: actualRevision, aggregate_type: aggregateType, aggregate_id: aggregateId },
    );
  }

  private async audit(tx: Tx, aggregateType: string, aggregateId: string, actionCode: string, message: string, actor: AuthUser, sourceYear?: number, sourceQuarter?: Quarter, targetYear?: number, targetQuarter?: Quarter) {
    await tx.auditEvent.create({ data: { aggregateType, aggregateId, actionCode, message, actorUserId: actor.id, actorName: actor.name, sourceYear, sourceQuarter, targetYear, targetQuarter } });
  }
}
