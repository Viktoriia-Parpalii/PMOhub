import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { AuthUser } from '../../common/auth/auth-user';
import { InitiativesService } from '../initiatives/application/initiatives.service';
import { DictionariesService } from '../dictionaries/dictionaries.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { UsersService } from '../users/users.service';

type Tx = Prisma.TransactionClient;
type Backup = Record<string, any>;

const guid = (scope: string, value: unknown) => {
  const raw = String(value ?? randomUUID());
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) return raw;
  const bytes = createHash('sha256').update(`${scope}:${raw}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

@Injectable()
export class DataManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly initiatives: InitiativesService,
    private readonly dictionaries: DictionariesService,
    private readonly fields: CustomFieldsService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async export(actor: AuthUser) {
    const [projects, tasks, departments, managers, priorities, initiativeStatuses, taskWeights, initiativeSizes, customFields, users, rolePermissions] = await Promise.all([
      this.initiatives.list({ kind: 'PROJECT' }), this.initiatives.list({ kind: 'TASK' }), this.dictionaries.list('departments'), this.dictionaries.list('managers'), this.dictionaries.list('priorities'), this.dictionaries.list('statuses'), this.dictionaries.list('weights'), this.dictionaries.list('sizes'), this.fields.list(), this.users.list(), this.prisma.rolePermission.findMany(),
    ]);
    return {
      version: '6.0', exportedAt: new Date().toISOString(), exportedBy: { id: actor.id, name: actor.name, email: actor.email, role: actor.role },
      departments, priorities, initiativeStatuses, taskWeights, initiativeSizes, managers,
      projects: projects.data, tasks: tasks.data, users, rolePermissions, customFields,
    };
  }

  async validate(input: unknown, mode: 'merge' | 'replace', actor: AuthUser) {
    try {
      const data = this.assertValidBackup(input);
      const validationToken = this.signValidationToken(input, mode);
      await this.prisma.auditEvent.create({ data: { aggregateType: 'SYSTEM', aggregateId: actor.id, actionCode: 'BACKUP_VALIDATED', message: `Backup ${data.version} перевірено для режиму ${mode}`, actorUserId: actor.id, actorName: actor.name } });
      return { success: true, message: 'Backup валідний', data: { version: data.version, projects: data.projects.length, tasks: data.tasks.length, users: data.users.length, validation_token: validationToken } };
    } catch (error) {
      await this.prisma.auditEvent.create({ data: { aggregateType: 'SYSTEM', aggregateId: actor.id, actionCode: 'BACKUP_VALIDATION_FAILED', message: error instanceof Error ? error.message : 'Backup validation failed', actorUserId: actor.id, actorName: actor.name } }).catch(() => undefined);
      throw error;
    }
  }

  private assertValidBackup(input: unknown): Backup {
    if (!input || typeof input !== 'object') throw new AppError('INVALID_BACKUP', 'JSON має містити об’єкт');
    const data = input as Backup;
    if (!['5.0', '6.0'].includes(data.version)) throw new AppError('UNSUPPORTED_BACKUP_VERSION', 'Підтримуються формати PMO Hub 5.0 та 6.0');
    const arrays = ['departments', 'priorities', 'initiativeStatuses', 'taskWeights', 'initiativeSizes', 'managers', 'projects', 'tasks', 'users', 'rolePermissions', 'customFields'];
    const missing = arrays.find((key) => !Array.isArray(data[key]));
    if (missing) throw new AppError('INVALID_BACKUP', `Поле ${missing} має бути масивом`);
    const records = [...data.projects, ...data.tasks];
    const roles = new Set(['SUPER_ADMIN', 'ADMIN', 'USER']);
    if (data.users.some((item: any) => !item || typeof item.name !== 'string' || typeof item.email !== 'string' || !roles.has(item.role))) throw new AppError('INVALID_BACKUP', 'Backup містить некоректного користувача');
    if (data.rolePermissions.some((item: any) => !item || !roles.has(item.role))) throw new AppError('INVALID_BACKUP', 'Backup містить некоректну роль');
    const assertUnique = (items: any[], label: string, key: (item: any) => string = (item) => String(item.id)) => {
      const values = items.map(key);
      if (values.some((value) => !value || value === 'undefined') || new Set(values).size !== values.length) throw new AppError('INVALID_BACKUP', `Некоректні або дубльовані значення: ${label}`);
    };
    assertUnique(data.departments, 'departments'); assertUnique(data.managers, 'managers'); assertUnique(data.priorities, 'priorities');
    assertUnique(data.initiativeStatuses, 'initiativeStatuses'); assertUnique(data.taskWeights, 'taskWeights'); assertUnique(data.initiativeSizes, 'initiativeSizes');
    assertUnique(data.customFields, 'customFields'); assertUnique(data.users, 'users'); assertUnique(data.users, 'users.email', (item) => String(item.email).trim().toLocaleLowerCase('uk-UA'));
    const ids = (items: any[]) => new Set(items.map((item) => String(item.id)));
    const departmentIds = ids(data.departments), managerIds = ids(data.managers), priorityIds = ids(data.priorities), statusIds = ids(data.initiativeStatuses), weightIds = ids(data.taskWeights), userIds = ids(data.users);
    data.initiativeStatuses.forEach((item: any) => { if (item.code) statusIds.add(String(item.code)); });
    if (data.managers.some((item: any) => item.department_id && !departmentIds.has(String(item.department_id)))) throw new AppError('INVALID_BACKUP', 'Менеджер посилається на відсутній підрозділ');
    if (data.users.some((item: any) => (item.departmentId ?? item.department_id) && !departmentIds.has(String(item.departmentId ?? item.department_id)))) throw new AppError('INVALID_BACKUP', 'Користувач посилається на відсутній підрозділ');
    const quarters = new Set(['Q1', 'Q2', 'Q3', 'Q4']);
    if (records.some((item: any) => !item || typeof item.name !== 'string' || !Number.isInteger(Number(item.year)) || (!item.is_backlog && !quarters.has(item.quarter)))) throw new AppError('INVALID_BACKUP', 'Backup містить некоректну ініціативу');
    for (const record of records) {
      if (record.manager_id && !managerIds.has(String(record.manager_id))) throw new AppError('INVALID_BACKUP', 'Ініціатива посилається на відсутнього менеджера');
      if (record.priority && !priorityIds.has(String(record.priority))) throw new AppError('INVALID_BACKUP', 'Ініціатива посилається на відсутній пріоритет');
      if ((record.implementer_dept_ids ?? []).some((id: unknown) => !departmentIds.has(String(id))) || (record.cross_functional_dept_ids ?? []).some((id: unknown) => !departmentIds.has(String(id)))) throw new AppError('INVALID_BACKUP', 'Ініціатива посилається на відсутній підрозділ');
      if (record.health_status && record.health_status !== 'DEFAULT' && !statusIds.has(String(record.health_status))) throw new AppError('INVALID_BACKUP', 'Картка посилається на відсутній статус');
      for (const item of record.checklist ?? []) {
        if ((item.implementer_dept_ids ?? []).some((id: unknown) => !departmentIds.has(String(id)))) throw new AppError('INVALID_BACKUP', 'Scope посилається на відсутній підрозділ');
        if ((item.assigneeIds ?? []).some((id: unknown) => !userIds.has(String(id)))) throw new AppError('INVALID_BACKUP', 'Scope посилається на відсутнього користувача');
        const weightId = item.weightId ?? item.weightSnapshot?.definitionId;
        if (weightId && !weightIds.has(String(weightId))) throw new AppError('INVALID_BACKUP', 'Scope посилається на відсутню вагу');
        if (item.color && item.color !== 'DEFAULT' && !statusIds.has(String(item.color))) throw new AppError('INVALID_BACKUP', 'Scope посилається на відсутній статус');
      }
    }
    if (records.some((item) => item.is_backlog && Array.isArray(item.checklist) && item.checklist.length)) throw new AppError('INVALID_BACKUP', 'Master-record не може містити scope');
    const duplicate = new Set<string>();
    for (const card of records.filter((item) => !item.is_backlog)) {
      const key = `${card.initiative_chain_id ?? card.backlog_id}:${card.year}:${card.quarter}`;
      if (duplicate.has(key)) throw new AppError('INVALID_BACKUP', `Дублікат квартальної картки: ${key}`);
      duplicate.add(key);
    }
    const sizes = [...data.initiativeSizes].filter((item: any) => item.is_active !== false).map((item: any) => ({ min: Number(item.min_score), max: Number(item.max_score) }));
    if (sizes.some((item) => !Number.isFinite(item.min) || !Number.isFinite(item.max) || item.min < 0 || item.max < item.min)) throw new AppError('INVALID_BACKUP', 'Некоректні діапазони розмірів');
    for (let index = 0; index < sizes.length; index += 1) if (sizes.some((item, candidate) => candidate !== index && item.min <= sizes[index].max && item.max >= sizes[index].min)) throw new AppError('INVALID_BACKUP', 'Діапазони активних розмірів перетинаються');
    return data;
  }

  async import(input: unknown, mode: 'merge' | 'replace', actor: AuthUser, validationToken: string) {
    if (actor.role !== 'SUPER_ADMIN') throw new AppError('SUPER_ADMIN_REQUIRED', 'Імпорт backup доступний лише SUPER_ADMIN', HttpStatus.FORBIDDEN);
    const backup = this.assertValidBackup(input);
    this.verifyValidationToken(validationToken, input, mode);
    await this.prisma.auditEvent.create({ data: { aggregateType: 'SYSTEM', aggregateId: actor.id, actionCode: 'BACKUP_IMPORT_STARTED', message: `Розпочато імпорт backup у режимі ${mode}`, actorUserId: actor.id, actorName: actor.name } });
    try {
      const result = await this.prisma.$transaction(async (tx) => {
      if (mode === 'replace') await this.clearBusinessData(tx, actor.id);
      const maps = await this.importDictionaries(tx, backup, mode);
      await this.importUsers(tx, backup.users, maps.departments, actor.id, mode);
      await this.importInitiatives(tx, backup.projects, 'PROJECT', maps, mode);
      await this.importInitiatives(tx, backup.tasks, 'TASK', maps, mode);
      for (const permission of backup.rolePermissions) {
        if (!['SUPER_ADMIN', 'ADMIN', 'USER'].includes(permission.role)) continue;
        await tx.rolePermission.upsert({ where: { role: permission.role }, create: {
          role: permission.role, canCreateEditProjects: Boolean(permission.canCreateEditProjects), canDeleteProjects: Boolean(permission.canDeleteProjects), canAccessAdmin: Boolean(permission.canAccessAdmin), isReadOnly: Boolean(permission.isReadOnly), canEditArchive: Boolean(permission.canEditArchive),
        }, update: { canCreateEditProjects: Boolean(permission.canCreateEditProjects), canDeleteProjects: Boolean(permission.canDeleteProjects), canAccessAdmin: Boolean(permission.canAccessAdmin), isReadOnly: Boolean(permission.isReadOnly), canEditArchive: Boolean(permission.canEditArchive) } });
      }
      await tx.rolePermission.upsert({ where: { role: 'SUPER_ADMIN' }, create: { role: 'SUPER_ADMIN', canCreateEditProjects: true, canDeleteProjects: true, canAccessAdmin: true, isReadOnly: false, canEditArchive: true }, update: { canCreateEditProjects: true, canDeleteProjects: true, canAccessAdmin: true, isReadOnly: false, canEditArchive: true } });
      await tx.auditEvent.create({ data: { aggregateType: 'SYSTEM', aggregateId: actor.id, actionCode: 'BACKUP_IMPORTED', message: `Backup ${backup.version} імпортовано в режимі ${mode}`, actorUserId: actor.id, actorName: actor.name } });
      return { projects: backup.projects.length, tasks: backup.tasks.length };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60_000 });
      return { success: true, message: mode === 'replace' ? 'Дані повністю замінено' : 'Дані об’єднано', data: result, counts: result };
    } catch (error) {
      await this.prisma.auditEvent.create({ data: { aggregateType: 'SYSTEM', aggregateId: actor.id, actionCode: 'BACKUP_IMPORT_ROLLED_BACK', message: error instanceof Error ? error.message : 'Backup import rolled back', actorUserId: actor.id, actorName: actor.name } }).catch(() => undefined);
      throw error;
    }
  }

  private async clearBusinessData(tx: Tx, actorId: string) {
    await tx.checklistAssignee.deleteMany(); await tx.checklistDepartment.deleteMany(); await tx.checklistItem.deleteMany();
    await tx.quarterCard.deleteMany(); await tx.initiativeYear.deleteMany();
    await tx.customFieldValue.deleteMany(); await tx.passportDepartment.deleteMany(); await tx.passport.deleteMany(); await tx.initiative.deleteMany();
    await tx.customFieldOption.deleteMany(); await tx.customFieldDefinition.deleteMany();
    await tx.refreshToken.deleteMany({ where: { userId: { not: actorId } } });
    await tx.auditEvent.updateMany({ where: { actorUserId: { not: actorId } }, data: { actorUserId: null } });
    await tx.user.update({ where: { id: actorId }, data: { departmentId: null } }); await tx.user.deleteMany({ where: { id: { not: actorId } } });
    await tx.manager.deleteMany(); await tx.initiativeSize.deleteMany(); await tx.taskWeight.deleteMany(); await tx.initiativeStatus.deleteMany(); await tx.priority.deleteMany(); await tx.department.deleteMany();
  }

  private async importDictionaries(tx: Tx, backup: Backup, mode: string) {
    const departments = new Map<string, string>(), managers = new Map<string, string>(), priorities = new Map<string, string>(), statuses = new Map<string, string>(), weights = new Map<string, string>(), sizes = new Map<string, string>(), fields = new Map<string, string>();
    for (const item of backup.departments) { const id = guid('department', item.id); departments.set(String(item.id), id); await this.createOrSkip(tx.department, id, { id, name: item.name, normalizedName: String(item.name).toLocaleLowerCase('uk-UA'), capacityLimitPoints: Number(item.capacity_limit_points ?? 0), isActive: item.is_active !== false }, mode); }
    for (const item of backup.priorities) { const id = guid('priority', item.id); priorities.set(String(item.id), id); await this.createOrSkip(tx.priority, id, { id, name: item.name, normalizedName: String(item.name).toLocaleLowerCase('uk-UA'), color: item.color, isActive: item.is_active !== false }, mode); }
    for (const item of backup.initiativeStatuses) { const id = guid('status', item.id); statuses.set(String(item.id), id); if (item.code) statuses.set(String(item.code), id); const code = item.code ?? item.id; await this.createOrSkip(tx.initiativeStatus, id, { id, code, name: item.name, normalizedName: String(item.name).toLocaleLowerCase('uk-UA'), color: item.color ?? '#94a3b8', isActive: item.is_active !== false }, mode); }
    for (const item of backup.taskWeights) { const id = guid('weight', item.id); weights.set(String(item.id), id); await this.createOrSkip(tx.taskWeight, id, { id, name: item.name, normalizedName: String(item.name).toLocaleLowerCase('uk-UA'), weight: Number(item.weight ?? 0), isActive: item.is_active !== false }, mode); }
    for (const item of backup.initiativeSizes) { const id = guid('size', item.id); sizes.set(String(item.id), id); await this.createOrSkip(tx.initiativeSize, id, { id, name: item.name, normalizedName: String(item.name).toLocaleLowerCase('uk-UA'), minScore: Number(item.min_score ?? 0), maxScore: Number(item.max_score ?? 0), isActive: item.is_active !== false }, mode); }
    for (const item of backup.managers) { const id = guid('manager', item.id); managers.set(String(item.id), id); await this.createOrSkip(tx.manager, id, { id, name: item.name, normalizedName: String(item.name).toLocaleLowerCase('uk-UA'), departmentId: departments.get(String(item.department_id)), isActive: item.is_active !== false }, mode); }
    for (const item of backup.customFields) { const id = guid('field', item.id); fields.set(String(item.id), id); if (!await tx.customFieldDefinition.findUnique({ where: { id } })) await tx.customFieldDefinition.create({ data: { id, entityType: item.entityType, name: item.name, normalizedName: String(item.name).toLocaleLowerCase('uk-UA'), fieldType: item.type, isRequired: Boolean(item.isRequired), showInTable: Boolean(item.showInTable), showInCards: Boolean(item.showInCards), isActive: item.isActive !== false, options: { create: (item.options ?? []).map((value: string, sortOrder: number) => ({ value, sortOrder })) } } }); }
    return { departments, managers, priorities, statuses, weights, sizes, fields };
  }

  private async importUsers(tx: Tx, users: any[], departments: Map<string, string>, actorId: string, mode: string) {
    for (const item of users) {
      const id = guid('user', item.id); const normalizedEmail = String(item.email).trim().toLocaleLowerCase('uk-UA');
      const existing = await tx.user.findFirst({ where: { OR: [{ id }, { normalizedEmail }] } });
      if (existing?.id === actorId) continue;
      if (existing && mode === 'merge') continue;
      if (!existing) await tx.user.create({ data: { id, name: item.name, email: item.email, normalizedEmail, role: item.role, departmentId: departments.get(String(item.departmentId ?? item.department_id)), isActive: item.is_active !== false, passwordHash: null, mustChangePassword: true } });
    }
  }

  private async importInitiatives(tx: Tx, records: any[], kind: 'PROJECT' | 'TASK', maps: any, mode: string) {
    const masters = records.filter((item) => item.is_backlog);
    const yearMap = new Map<string, string>();
    for (const master of masters) {
      const chainKey = String(master.initiative_chain_id ?? master.id); const initiativeId = guid(`${kind}-initiative`, chainKey);
      if (!await tx.initiative.findUnique({ where: { id: initiativeId } })) await tx.initiative.create({ data: { id: initiativeId, kind } });
      const snapshots = master.yearSnapshots && Object.keys(master.yearSnapshots).length ? master.yearSnapshots : { [String(master.year)]: master };
      for (const [yearText, snapshot] of Object.entries<any>(snapshots)) {
        const year = Number(yearText); const yearId = guid(`${kind}-year`, `${chainKey}:${year}`); yearMap.set(`${chainKey}:${year}`, yearId); yearMap.set(`${master.id}:${year}`, yearId);
        if (await tx.initiativeYear.findUnique({ where: { id: yearId } })) { if (mode === 'merge') continue; else continue; }
        const annual = await this.importPassport(tx, snapshot, kind, maps);
        const prep = await this.importPassport(tx, { ...snapshot, ...(snapshot.preparationStage ?? {}), implementer_dept_ids: [] }, kind, maps);
        await tx.initiativeYear.create({ data: { id: yearId, initiativeId, year, annualPassportId: annual, preparationPassportId: prep } });
      }
    }
    for (const card of records.filter((item) => !item.is_backlog)) {
      const chainKey = String(card.initiative_chain_id ?? card.backlog_id); const initiativeId = guid(`${kind}-initiative`, chainKey);
      let yearId = yearMap.get(`${chainKey}:${card.year}`) ?? yearMap.get(`${card.backlog_id}:${card.year}`) ?? guid(`${kind}-year`, `${chainKey}:${card.year}`);
      if (!await tx.initiative.findUnique({ where: { id: initiativeId } })) await tx.initiative.create({ data: { id: initiativeId, kind } });
      if (!await tx.initiativeYear.findUnique({ where: { id: yearId } })) {
        const annual = await this.importPassport(tx, card, kind, maps), prep = await this.importPassport(tx, { ...card, implementer_dept_ids: [] }, kind, maps);
        await tx.initiativeYear.create({ data: { id: yearId, initiativeId, year: Number(card.year), annualPassportId: annual, preparationPassportId: prep } });
      }
      const cardId = guid(`${kind}-card`, card.id); if (await tx.quarterCard.findUnique({ where: { id: cardId } })) continue;
      const passportId = await this.importPassport(tx, card, kind, maps);
      const statusId = maps.statuses.get(String(card.health_status)); const sizeId = maps.sizes.get(String(card.sizeSnapshot?.definitionId));
      await tx.quarterCard.create({ data: { id: cardId, initiativeYearId: yearId, passportId, quarter: card.quarter, statusId, sizeDefinitionId: sizeId, sizeSnapshotName: card.sizeSnapshot?.name ?? 'Не визначено', sizeSnapshotWeight: Number(card.sizeSnapshot?.totalWeight ?? 0) } });
      for (const item of card.checklist ?? []) {
        const itemId = guid(`${kind}-scope`, item.id); const weightId = maps.weights.get(String(item.weightId ?? item.weightSnapshot?.definitionId));
        await tx.checklistItem.create({ data: { id: itemId, cardId, text: item.text, isCompleted: Boolean(item.is_completed), statusId: maps.statuses.get(String(item.color)), weightDefinitionId: weightId, weightSnapshotName: item.weightSnapshot?.name ?? 'Не визначено', weightSnapshotValue: Number(item.weightSnapshot?.value ?? 0),
          departments: { create: (item.implementer_dept_ids ?? []).map((old: string) => maps.departments.get(String(old))).filter(Boolean).map((departmentId: string) => ({ departmentId })) } } });
      }
    }
  }

  private async importPassport(tx: Tx, item: any, kind: string, maps: any) {
    const id = randomUUID(); const implementers = (item.implementer_dept_ids ?? []).map((old: string) => maps.departments.get(String(old))).filter(Boolean);
    const cross = (item.cross_functional_dept_ids ?? []).map((old: string) => maps.departments.get(String(old))).filter((value: string) => value && !implementers.includes(value));
    await tx.passport.create({ data: { id, name: item.name ?? 'Без назви', strategicGoal: item.strategic_goal, managerId: maps.managers.get(String(item.manager_id)), priorityId: maps.priorities.get(String(item.priority)), notes: item.notes,
      departments: { create: [...implementers.map((departmentId: string) => ({ departmentId, involvement: 'IMPLEMENTER' })), ...cross.map((departmentId: string) => ({ departmentId, involvement: 'CROSS_FUNCTIONAL' }))] } } });
    for (const [oldId, value] of Object.entries(item.custom_fields ?? {})) {
      const definitionId = maps.fields.get(String(oldId)); if (!definitionId || value === null || value === undefined || value === '') continue;
      const definition = await tx.customFieldDefinition.findUnique({ where: { id: definitionId } }); if (!definition || definition.entityType !== kind.toLowerCase()) continue;
      await tx.customFieldValue.create({ data: { passportId: id, definitionId, textValue: ['NUMBER', 'CHECKBOX'].includes(definition.fieldType) ? null : String(value), numberValue: definition.fieldType === 'NUMBER' ? Number(value) : null, booleanValue: definition.fieldType === 'CHECKBOX' ? Boolean(value) : null } });
    }
    return id;
  }

  private async createOrSkip(delegate: any, id: string, data: any, mode: string) {
    const existing = await delegate.findUnique({ where: { id } });
    if (!existing) await delegate.create({ data }); else if (mode === 'replace') await delegate.update({ where: { id }, data });
  }

  private signValidationToken(input: unknown, mode: 'merge' | 'replace') {
    const payload = Buffer.from(JSON.stringify({ hash: this.backupHash(input), mode, exp: Date.now() + 10 * 60_000 })).toString('base64url');
    const signature = createHmac('sha256', this.config.getOrThrow('MERGE_TOKEN_SECRET')).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  private verifyValidationToken(token: string, input: unknown, mode: 'merge' | 'replace') {
    const [payload, signature] = String(token ?? '').split('.');
    if (!payload || !signature) throw new AppError('BACKUP_VALIDATION_REQUIRED', 'Спочатку перевірте backup', HttpStatus.CONFLICT);
    const expected = createHmac('sha256', this.config.getOrThrow('MERGE_TOKEN_SECRET')).update(payload).digest();
    const provided = Buffer.from(signature, 'base64url');
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) throw new AppError('INVALID_BACKUP_TOKEN', 'Токен перевірки backup недійсний', HttpStatus.CONFLICT);
    let decoded: { hash?: string; mode?: string; exp?: number };
    try { decoded = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw new AppError('INVALID_BACKUP_TOKEN', 'Токен перевірки backup недійсний', HttpStatus.CONFLICT); }
    if (decoded.hash !== this.backupHash(input) || decoded.mode !== mode || Number(decoded.exp) < Date.now()) throw new AppError('STALE_BACKUP_TOKEN', 'Backup або режим змінився після перевірки', HttpStatus.CONFLICT);
  }

  private backupHash(input: unknown) { return createHash('sha256').update(JSON.stringify(input)).digest('hex'); }
}
