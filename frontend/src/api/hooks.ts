import { useQuery } from "@tanstack/react-query";
import {
  ApiResponse,
  apiRequest,
  loadAnalyticsDrilldown,
  loadBootstrap,
  loadBacklogQuarterCardSummaries,
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
import {
  AnalyticsMode,
  AnalyticsSection,
  AnalyticsSectionResponse,
} from "../features/analytics/analyticsTypes";

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
export const useBacklogQuarterCardSummariesQuery = (
  initiativeYearId: string,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.backlogCardSummaries(initiativeYearId),
    // Keep this small lazy request alive if the accordion is briefly remounted
    // (for example by React StrictMode), so the first request can populate cache
    // instead of appearing as a cancelled duplicate in DevTools.
    queryFn: () => loadBacklogQuarterCardSummaries(initiativeYearId),
    enabled,
    staleTime: 5 * 60_000,
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
  section: AnalyticsSection,
  params: URLSearchParams,
  enabled = true,
) =>
  useQuery<AnalyticsSectionResponse>({
    queryKey: queryKeys.analytics(mode, section, params.toString()),
    // React StrictMode mounts, unmounts and mounts the dashboard again in
    // development. Keeping this small analytics request alive lets the second
    // observer reuse the same in-flight query instead of aborting and repeating it.
    queryFn: () => loadAnalytics(mode, section, params),
    enabled,
    placeholderData: (previous) => previous,
  });
export const useAnalyticsDrilldownQuery = (
  params: URLSearchParams,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.analyticsDrilldown(params.toString()),
    queryFn: () => loadAnalyticsDrilldown(params),
    enabled,
  });
