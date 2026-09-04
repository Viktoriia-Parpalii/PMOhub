import { useQuery } from "@tanstack/react-query";
import {
  ApiResponse,
  apiRequest,
  loadAnalyticsDrilldown,
  loadBootstrap,
  loadBacklogQuarterCardSummaries,
  loadInitiativeCardModel,
  loadInitiativeAvailableYears,
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
import type { InitiativeListFilters } from "../shared/types";

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
  filters: InitiativeListFilters = {},
) =>
  useQuery({
    queryKey: queryKeys.initiativeYears(kind, year, filters),
    queryFn: () => loadInitiativeYears(kind, undefined, year, filters),
    enabled,
    staleTime: 0,
  });
export const useInitiativeAvailableYearsQuery = () =>
  useQuery({
    queryKey: queryKeys.initiativeAvailableYears,
    queryFn: ({ signal }) => loadInitiativeAvailableYears(signal),
    staleTime: 30_000,
  });
export const useInitiativeYearCountsQuery = (
  year: number,
  enabled = true,
  filters: InitiativeListFilters = {},
) =>
  useQuery({
    queryKey: queryKeys.initiativeYearCounts(year, filters),
    queryFn: () => loadInitiativeYearCounts(year, undefined, filters),
    enabled,
    staleTime: 0,
  });
export const useQuarterCardsQuery = (
  kind: "project" | "task",
  enabled = true,
  year?: number,
  quarter?: string,
  filters: InitiativeListFilters = {},
) =>
  useQuery({
    queryKey: queryKeys.portfolioCards(kind, year, quarter, filters),
    queryFn: () => loadQuarterCards(kind, undefined, year, quarter, filters),
    enabled,
    staleTime: 0,
  });
export const useBacklogQuarterCardSummariesQuery = (
  initiativeYearId: string,
  enabled = true,
  filters: Pick<InitiativeListFilters, "manager_id" | "priority_id"> = {},
) =>
  useQuery({
    queryKey: queryKeys.backlogCardSummaries(initiativeYearId, filters),
    // Keep this small lazy request alive if the accordion is briefly remounted
    // (for example by React StrictMode), so the first request can populate cache
    // instead of appearing as a cancelled duplicate in DevTools.
    queryFn: () =>
      loadBacklogQuarterCardSummaries(
        initiativeYearId,
        undefined,
        filters,
      ),
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
