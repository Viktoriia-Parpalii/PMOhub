import {
  AnalyticsFilters,
  AnalyticsKind,
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
