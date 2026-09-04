import { QueryClient } from "@tanstack/react-query";

export const queryKeys = {
  bootstrap: ["bootstrap"] as const,
  initiativeYears: (kind: "project" | "task", year?: number) =>
    ["initiative-years", kind, year ?? "all"] as const,
  initiativeYearCounts: (year: number) =>
    ["initiative-years", "counts", year] as const,
  portfolioCards: (kind: "project" | "task", year?: number, quarter?: string) =>
    ["quarter-cards", kind, year ?? "all", quarter ?? "all"] as const,
  backlogCardSummaries: (initiativeYearId: string) =>
    ["backlog-card-summaries", initiativeYearId] as const,
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
