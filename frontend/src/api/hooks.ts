import { useQuery } from "@tanstack/react-query";
import {
  ApiResponse,
  apiRequest,
  loadAnalyticsDrilldown,
  loadBootstrap,
  loadInitiativeCardModel,
  loadInitiativeYearCounts,
  loadInitiativeYearModel,
  loadInitiativeYears,
  loadPermissions,
  loadQuarterCards,
  loadUsers,
} from "./apiClient";
import { queryKeys } from "./queryClient";
import { loadAnalytics } from "./apiClient";
import { AnalyticsMode } from "../features/analytics/analyticsTypes";

export const useBootstrapQuery = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.bootstrap,
    queryFn: ({ signal }) => loadBootstrap(signal),
    enabled,
    staleTime: 30_000,
  });

export const useInitiativeYearsQuery = (
  kind: "project" | "task",
  enabled = true,
  year?: number,
) =>
  useQuery({
    queryKey: queryKeys.initiativeYears(kind, year),
    queryFn: ({ signal }) => loadInitiativeYears(kind, signal, year),
    enabled,
  });
export const useInitiativeYearCountsQuery = (year: number, enabled = true) =>
  useQuery({
    queryKey: queryKeys.initiativeYearCounts(year),
    queryFn: ({ signal }) => loadInitiativeYearCounts(year, signal),
    enabled,
  });
export const useQuarterCardsQuery = (
  kind: "project" | "task",
  enabled = true,
  year?: number,
  quarter?: string,
) =>
  useQuery({
    queryKey: queryKeys.portfolioCards(kind, year, quarter),
    queryFn: ({ signal }) => loadQuarterCards(kind, signal, year, quarter),
    enabled,
  });
export const useQuarterCardDetailQuery = (id?: string) =>
  useQuery({
    queryKey: queryKeys.initiativeCard(id ?? ""),
    queryFn: ({ signal }) =>
      loadInitiativeCardModel(id!, signal).then((response) => response.data),
    enabled: Boolean(id),
  });
export const useInitiativeYearQuery = (id?: string) =>
  useQuery({
    queryKey: queryKeys.initiativeYear(id ?? ""),
    queryFn: ({ signal }) =>
      loadInitiativeYearModel(id!, signal).then((response) => response.data),
    enabled: Boolean(id),
  });
export const useAuditQuery = (aggregateType?: string, aggregateId?: string) =>
  useQuery({
    queryKey: queryKeys.audit(aggregateType ?? "", aggregateId ?? ""),
    queryFn: ({ signal }) =>
      apiRequest<
        ApiResponse<
          Array<{
            id: string;
            date: string;
            author: string;
            action: string;
            code: string;
          }>
        >
      >(`/audit/${aggregateType}/${aggregateId}`, { signal }).then(
        (response) => response.data,
      ),
    enabled: Boolean(aggregateType && aggregateId),
  });
export const useUsersQuery = (enabled = false) =>
  useQuery({
    queryKey: queryKeys.users,
    queryFn: ({ signal }) => loadUsers(signal),
    enabled,
  });
export const usePermissionsQuery = (enabled = false) =>
  useQuery({
    queryKey: queryKeys.permissions,
    queryFn: ({ signal }) => loadPermissions(signal),
    enabled,
  });
export const useAnalyticsQuery = (
  mode: AnalyticsMode,
  params: URLSearchParams,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.analytics(mode, params.toString()),
    queryFn: ({ signal }) => loadAnalytics(mode, params, signal),
    enabled,
    placeholderData: (previous) => previous,
  });
export const useAnalyticsDrilldownQuery = (
  params: URLSearchParams,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.analyticsDrilldown(params.toString()),
    queryFn: ({ signal }) => loadAnalyticsDrilldown(params, signal),
    enabled,
  });
