const numberValue = (value: { toNumber(): number } | null | undefined) =>
  value?.toNumber() ?? null;
import { isPeriodLocked, periodLockAt, Quarter } from "../domain/period.policy";

const mapCustomFields = (values: any[]) =>
  Object.fromEntries(
    values.map((value: any) => [
      value.definitionId,
      value.numberValue?.toNumber() ??
        value.booleanValue ??
        value.dateValue?.toISOString().slice(0, 10) ??
        value.optionValue ??
        value.textValue,
    ]),
  );

export const preparationInclude = {
  manager: true,
  priority: true,
  departments: { include: { department: true } },
} as const;

export const cardInclude = {
  initiativeYear: { include: { initiative: true } },
  manager: true,
  priority: true,
  status: true,
  sizeDefinition: true,
  departments: { include: { department: true } },
  customFieldValues: true,
  scopeItems: {
    include: {
      weightDefinition: true,
      executors: { include: { department: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export const analyticsCardInclude = {
  initiativeYear: { include: { initiative: true } },
  status: true,
  departments: { select: { departmentId: true } },
  scopeItems: {
    select: {
      id: true,
      lineageId: true,
      text: true,
      statusCode: true,
      weightDefinitionId: true,
      weightSnapshotName: true,
      weightSnapshotValue: true,
      revision: true,
      executors: { select: { departmentId: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export const cardSummaryInclude = {
  initiativeYear: { include: { initiative: true } },
  manager: true,
  priority: true,
  status: true,
  departments: { select: { departmentId: true } },
  customFieldValues: {
    select: {
      definitionId: true,
      textValue: true,
      numberValue: true,
      booleanValue: true,
      dateValue: true,
      optionValue: true,
    },
  },
  scopeItems: {
    select: {
      id: true,
      lineageId: true,
      text: true,
      statusCode: true,
      weightDefinitionId: true,
      weightSnapshotName: true,
      weightSnapshotValue: true,
      revision: true,
      executors: { select: { departmentId: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export const yearInclude = {
  initiative: true,
  preparationStage: { include: preparationInclude },
  quarterCards: {
    select: {
      id: true,
      quarter: true,
      statusId: true,
      revision: true,
      totalWeight: true,
      status: { select: { code: true } },
    },
    orderBy: { quarter: "asc" as const },
  },
} as const;

export const mapPreparation = (stage: any) =>
  stage
    ? {
        initiative_year_id: stage.initiativeYearId,
        manager_id: stage.managerId ?? null,
        manager: stage.manager
          ? { id: stage.manager.id, name: stage.manager.name }
          : null,
        priority_id: stage.priorityId ?? null,
        priority: stage.priority
          ? { id: stage.priority.id, name: stage.priority.name }
          : null,
        department_ids: stage.departments.map((link: any) => link.departmentId),
        departments: stage.departments.map((link: any) => ({
          id: link.department.id,
          name: link.department.name,
        })),
        revision: stage.revision,
      }
    : null;

export const mapScopeItem = (item: any) => ({
  id: item.id,
  lineage_id: item.lineageId,
  copied_from_item_id: item.copiedFromItemId ?? null,
  text: item.text,
  status_code: item.statusCode,
  weight_definition_id: item.weightDefinitionId,
  weight_snapshot: {
    name: item.weightSnapshotName,
    value: numberValue(item.weightSnapshotValue) ?? 0,
  },
  executor_department_ids: item.executors.map((link: any) => link.departmentId),
  executors: item.executors.map((link: any) => ({
    id: link.department.id,
    name: link.department.name,
  })),
  moved_from_card_id: item.movedFromCardId ?? null,
  revision: item.revision,
});

export const mapCard = (card: any) => {
  const executorIds = new Set<string>(
    card.scopeItems.flatMap((item: any) =>
      item.executors.map((link: any) => link.departmentId),
    ),
  );
  const departmentIds = card.departments.map((link: any) => link.departmentId);
  return {
    id: card.id,
    initiative_year_id: card.initiativeYearId,
    initiative_id: card.initiativeYear.initiativeId,
    kind: card.initiativeYear.initiative.kind,
    name: card.initiativeYear.initiative.name,
    strategic_goal: card.initiativeYear.strategicGoal ?? null,
    year: card.initiativeYear.year,
    quarter: `Q${card.quarter}`,
    manager_id: card.managerId ?? null,
    manager: card.manager
      ? { id: card.manager.id, name: card.manager.name }
      : null,
    priority_id: card.priorityId ?? null,
    priority: card.priority
      ? { id: card.priority.id, name: card.priority.name }
      : null,
    department_ids: departmentIds,
    effective_involved_department_ids: departmentIds.filter(
      (id: string) => !executorIds.has(id),
    ),
    status_id: card.statusId,
    status_code: card.status.code,
    status: {
      id: card.status.id,
      code: card.status.code,
      name: card.status.name,
      color: card.status.color,
    },
    notes: card.notes ?? null,
    total_weight: numberValue(card.totalWeight) ?? 0,
    size_snapshot: {
      definition_id: card.sizeDefinitionId ?? null,
      name: card.sizeSnapshotName ?? "Не визначено",
      min: numberValue(card.sizeSnapshotMin),
      max: numberValue(card.sizeSnapshotMax),
    },
    custom_fields: mapCustomFields(card.customFieldValues),
    scope: card.scopeItems.map(mapScopeItem),
    moved_from: card.movedFromYear
      ? { year: card.movedFromYear, quarter: `Q${card.movedFromQuarter}` }
      : null,
    revision: card.revision,
    is_locked: isPeriodLocked(
      card.initiativeYear.year,
      `Q${card.quarter}` as Quarter,
    ),
    locked_at: periodLockAt(
      card.initiativeYear.year,
      `Q${card.quarter}` as Quarter,
    ).toISO(),
  };
};

export const mapAnalyticsCard = (card: any) => {
  const executorIds = new Set<string>(
    card.scopeItems.flatMap((item: any) =>
      item.executors.map((link: any) => link.departmentId),
    ),
  );
  const departmentIds = card.departments.map((link: any) => link.departmentId);
  return {
    id: card.id,
    initiative_year_id: card.initiativeYearId,
    initiative_id: card.initiativeYear.initiativeId,
    kind: card.initiativeYear.initiative.kind,
    name: card.initiativeYear.initiative.name,
    strategic_goal: card.initiativeYear.strategicGoal ?? null,
    year: card.initiativeYear.year,
    quarter: `Q${card.quarter}`,
    manager_id: card.managerId ?? null,
    manager: null,
    priority_id: card.priorityId ?? null,
    priority: null,
    department_ids: departmentIds,
    effective_involved_department_ids: departmentIds.filter(
      (id: string) => !executorIds.has(id),
    ),
    status_id: card.statusId,
    status_code: card.status.code,
    status: {
      id: card.status.id,
      code: card.status.code,
      name: card.status.name,
      color: card.status.color,
    },
    notes: null,
    total_weight: numberValue(card.totalWeight) ?? 0,
    size_snapshot: {
      definition_id: card.sizeDefinitionId ?? null,
      name: card.sizeSnapshotName ?? "Не визначено",
      min: numberValue(card.sizeSnapshotMin),
      max: numberValue(card.sizeSnapshotMax),
    },
    custom_fields: {},
    scope: card.scopeItems.map((item: any) => ({
      id: item.id,
      lineage_id: item.lineageId,
      copied_from_item_id: null,
      text: item.text,
      status_code: item.statusCode,
      weight_definition_id: item.weightDefinitionId,
      weight_snapshot: {
        name: item.weightSnapshotName,
        value: numberValue(item.weightSnapshotValue) ?? 0,
      },
      executor_department_ids: item.executors.map(
        (link: any) => link.departmentId,
      ),
      executors: [],
      moved_from_card_id: null,
      revision: item.revision,
    })),
    moved_from: card.movedFromYear
      ? { year: card.movedFromYear, quarter: `Q${card.movedFromQuarter}` }
      : null,
    revision: card.revision,
  };
};

export const mapCardSummary = (card: any) => {
  const executorIds = new Set<string>(
    card.scopeItems.flatMap((item: any) =>
      item.executors.map((link: any) => link.departmentId),
    ),
  );
  const departmentIds = card.departments.map((link: any) => link.departmentId);
  return {
    id: card.id,
    initiative_year_id: card.initiativeYearId,
    initiative_id: card.initiativeYear.initiativeId,
    kind: card.initiativeYear.initiative.kind,
    name: card.initiativeYear.initiative.name,
    strategic_goal: card.initiativeYear.strategicGoal ?? null,
    year: card.initiativeYear.year,
    quarter: `Q${card.quarter}`,
    manager_id: card.managerId ?? null,
    manager: card.manager
      ? { id: card.manager.id, name: card.manager.name }
      : null,
    priority_id: card.priorityId ?? null,
    priority: card.priority
      ? { id: card.priority.id, name: card.priority.name }
      : null,
    department_ids: departmentIds,
    effective_involved_department_ids: departmentIds.filter(
      (id: string) => !executorIds.has(id),
    ),
    status_id: card.statusId,
    status_code: card.status.code,
    status: {
      id: card.status.id,
      code: card.status.code,
      name: card.status.name,
      color: card.status.color,
    },
    notes: card.notes ?? null,
    total_weight: numberValue(card.totalWeight) ?? 0,
    size_snapshot: {
      definition_id: card.sizeDefinitionId ?? null,
      name: card.sizeSnapshotName ?? "Не визначено",
      min: null,
      max: null,
    },
    custom_fields: mapCustomFields(card.customFieldValues),
    scope: card.scopeItems.map((item: any) => ({
      id: item.id,
      lineage_id: item.lineageId,
      copied_from_item_id: null,
      text: item.text,
      status_code: item.statusCode,
      weight_definition_id: item.weightDefinitionId,
      weight_snapshot: {
        name: item.weightSnapshotName,
        value: numberValue(item.weightSnapshotValue) ?? 0,
      },
      executor_department_ids: item.executors.map(
        (link: any) => link.departmentId,
      ),
      executors: [],
      moved_from_card_id: null,
      revision: item.revision,
    })),
    moved_from: card.movedFromYear
      ? { year: card.movedFromYear, quarter: `Q${card.movedFromQuarter}` }
      : null,
    revision: card.revision,
    is_locked: isPeriodLocked(
      card.initiativeYear.year,
      `Q${card.quarter}` as Quarter,
    ),
    locked_at: periodLockAt(
      card.initiativeYear.year,
      `Q${card.quarter}` as Quarter,
    ).toISO(),
  };
};

export const mapYear = (year: any) => ({
  id: year.id,
  initiative_id: year.initiativeId,
  kind: year.initiative.kind,
  name: year.initiative.name,
  initiative_revision: year.initiative.revision,
  year: year.year,
  strategic_goal: year.strategicGoal ?? null,
  revision: year.revision,
  preparation: mapPreparation(year.preparationStage),
  cards: year.quarterCards.map((card: any) => ({
    id: card.id,
    quarter: `Q${card.quarter}`,
    status_id: card.statusId,
    status_code: card.status.code,
    revision: card.revision,
    total_weight: numberValue(card.totalWeight) ?? 0,
    is_locked: isPeriodLocked(year.year, `Q${card.quarter}` as Quarter),
    locked_at: periodLockAt(year.year, `Q${card.quarter}` as Quarter).toISO(),
  })),
  is_locked: isPeriodLocked(year.year, "Q4"),
  locked_at: periodLockAt(year.year, "Q4").toISO(),
});
