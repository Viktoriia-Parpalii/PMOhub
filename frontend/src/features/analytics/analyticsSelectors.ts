import {
  AnalyticsFilters,
  AnalyticsKind,
  AnalyticsRecord,
  AnalyticsResponse,
} from "./analyticsTypes";
import { Quarter } from "../../shared/types";
import { getHealthLabel } from "../../domain/health";

export const analyticsQueryParams = (filters: AnalyticsFilters) => {
  const params = new URLSearchParams({ year: String(filters.year) });
  if (filters.kind !== "ALL") params.set("kind", filters.kind);
  if (filters.departmentId) params.set("department_id", filters.departmentId);
  if (filters.managerId) params.set("manager_id", filters.managerId);
  return params;
};

export const recordsByIds = (
  data: AnalyticsResponse | undefined,
  ids?: string[],
): AnalyticsRecord[] => {
  if (!data) return [];
  if (!ids) return data.records ?? [];
  const wanted = new Set(ids);
  return (data.records ?? []).filter((record) => wanted.has(record.id));
};

export const statusCardIds = (
  data: AnalyticsResponse | undefined,
  statusId: string,
) =>
  data?.status_distribution?.find((status) => status.status_id === statusId)
    ?.card_ids ?? [];

export const latestInitiativeRecords = (
  data: AnalyticsResponse | undefined,
): AnalyticsRecord[] => {
  if (!data) return [];
  if (data.mode === "QUARTERLY") return data.records ?? [];
  const latest = new Map<string, AnalyticsRecord>();
  (data.records ?? []).forEach((record) => {
    const key = `${record.kind}:${record.initiative_id}`;
    if (!latest.has(key) || latest.get(key)!.quarter < record.quarter)
      latest.set(key, record);
  });
  return [...latest.values()];
};

/** Відмінювані назви типу для заголовків, легенд і підписів графіків. */
export const analyticsKindLabels = (kind: AnalyticsKind) => {
  if (kind === "PROJECT")
    return {
      nominative: "проєкти",
      nominativeTitle: "Проєкти",
      genitive: "проєктів",
      genitiveTitle: "Проєктів",
    } as const;
  if (kind === "OPERATIONAL_TASK")
    return {
      nominative: "операційні задачі",
      nominativeTitle: "Операційні задачі",
      genitive: "операційних задач",
      genitiveTitle: "Операційних задач",
    } as const;
  return {
    nominative: "ініціативи",
    nominativeTitle: "Ініціативи",
    genitive: "ініціатив",
    genitiveTitle: "Ініціатив",
  } as const;
};

/** Українська назва системного статусу для віджетів, легенд і tooltip. */
export const analyticsStatusLabel = (
  status: "GREEN" | "YELLOW" | "RED" | "DEFAULT",
) => getHealthLabel(status);

export const quarterlyDepartmentReserve = (
  data: AnalyticsResponse,
  quarter: Quarter,
  departments: Array<{ id: string; name: string }>,
) => {
  const period = data.capacity_by_quarter.find(
    (item) => item.quarter === quarter,
  );
  return departments.map((department) => {
    const metric = period?.departments.find(
      (item) => item.department_id === department.id,
    );
    const load = metric?.load ?? 0;
    const limit = metric?.limit ?? 0;
    return {
      ...department,
      load,
      limit,
      reserve: limit - load,
      isOverCapacity: load > limit,
    };
  });
};
