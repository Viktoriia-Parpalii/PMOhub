import { QueryClient } from "@tanstack/react-query";
import type { InitiativeListFilters } from "../shared/types";

const filterKey = (filters: InitiativeListFilters = {}) => [
  filters.name?.trim() ?? "",
  filters.strategic_goal?.trim() ?? "",
  filters.manager_id ?? "",
  filters.priority_id ?? "",
  filters.quarter ?? "",
] as const;

export const queryKeys = {
  bootstrap: ["bootstrap"] as const,
  initiativeAvailableYears: ["initiative-years", "available-years"] as const,
  initiativeYears: (
    kind: "project" | "task",
    year?: number,
    filters: InitiativeListFilters = {},
  ) => ["initiative-years", kind, year ?? "all", ...filterKey(filters)] as const,
  initiativeYearCounts: (year: number, filters: InitiativeListFilters = {}) =>
    ["initiative-years", "counts", year, ...filterKey(filters)] as const,
  portfolioCards: (
    kind: "project" | "task",
    year?: number,
    quarter?: string,
    filters: InitiativeListFilters = {},
  ) =>
    [
      "quarter-cards",
      kind,
      year ?? "all",
      quarter ?? "all",
      ...filterKey(filters),
    ] as const,
  backlogCardSummaries: (
    initiativeYearId: string,
    filters: InitiativeListFilters = {},
  ) => ["backlog-card-summaries", initiativeYearId, ...filterKey(filters)] as const,
  initiativeCard: (id: string) => ["quarter-cards", "detail", id] as const,
  initiativeYear: (id: string) => ["initiative-years", "detail", id] as const,
  audit: (aggregateType: string, aggregateId: string) =>
    ["audit", aggregateType, aggregateId] as const,
  users: ["reference-data", "users"] as const,
  permissions: ["reference-data", "permissions"] as const,
  customFields: ["reference-data", "custom-fields"] as const,
  analytics: (
    mode: "quarterly" | "annual",
    section: string,
    params: string,
  ) => ["analytics", mode, section, params] as const,
  analyticsDrilldown: (params: string) =>
    ["analytics", "drilldown", params] as const,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
