import { Quarter } from "../../shared/types";

export type AnalyticsMode = "quarterly" | "annual";
export type AnalyticsSection =
  | "overview"
  | "workload"
  | "trends"
  | "planning-health";
export type AnalyticsKind = "ALL" | "PROJECT" | "OPERATIONAL_TASK";
export type StatusCounts = Record<
  "GREEN" | "YELLOW" | "RED" | "DEFAULT",
  number
>;

export interface CardStatusMetric {
  status_id: string;
  name: string;
  color: string;
  count: number;
}

export interface AnalyticsFilters {
  year: number;
  quarter: Quarter;
  kind: AnalyticsKind;
  departmentId: string;
  managerId: string;
}

export interface AnalyticsRecord {
  id: string;
  initiative_id: string;
  kind: "PROJECT" | "OPERATIONAL_TASK";
  name: string;
  year: number;
  quarter: Quarter;
  manager_id: string | null;
  manager_name: string | null;
  priority_id: string | null;
  priority_name: string | null;
  department_ids: string[];
  status_id: string;
  status_name: string;
  status_color: string;
  total_weight: number;
  size_name: string;
  progress: number;
  scope_items: number;
  risks: string[];
}

export interface AnalyticsOverviewResponse {
  generated_at: string;
  mode: "QUARTERLY" | "ANNUAL";
  available_years: number[];
  summary: {
    cards: number;
    initiatives: number;
    total_weight: number;
    average_progress: number;
    average_duration: number;
  };
  status_distribution: CardStatusMetric[];
  scope_status_counts?: StatusCounts;
  size_breakdown: Array<{ name: string; count: number }>;
  priority_status_breakdown: Array<{
    priority_id: string | null;
    name: string;
    count: number;
    status_counts: Record<string, number>;
  }>;
}

export interface AnalyticsWorkloadResponse {
  generated_at: string;
  overloaded_departments: number;
  departments: Array<{
    id: string;
    name: string;
    load: number;
    limit: number;
    reserve: number;
    is_over_capacity: boolean;
    quarters?: Array<{ quarter: Quarter; load: number; limit: number }>;
  }>;
  managers: Array<{
    manager_id: string;
    name: string;
    load: number;
    cards: number;
  }>;
}

export interface AnalyticsTrendsResponse {
  generated_at: string;
  period_comparison?: Array<{ label: string; cards: number }>;
  volume_trend?: Array<{ quarter: Quarter; current: number; previous: number }>;
  history?: Array<{
    year: number;
    cards: number;
    initiatives: number;
    status_distribution: CardStatusMetric[];
  }>;
}

export interface AnalyticsPlanningHealthResponse {
  generated_at: string;
  preparation?: { total: number; ready: number; incomplete: number };
  risks?: {
    total: number;
    by_type: Array<{ type: string; count: number }>;
    preview: Array<{ id: string; name: string; risks: string[] }>;
  };
}

export type AnalyticsSectionResponse =
  | AnalyticsOverviewResponse
  | AnalyticsWorkloadResponse
  | AnalyticsTrendsResponse
  | AnalyticsPlanningHealthResponse;

/** View model composed from the independently cached analytics sections. */
export interface AnalyticsResponse {
  mode: "QUARTERLY" | "ANNUAL";
  available_years: number[];
  summary: AnalyticsOverviewResponse["summary"] & {
    overloaded_departments: number;
  };
  status_distribution: CardStatusMetric[];
  scope_status_counts: StatusCounts;
  size_breakdown: AnalyticsOverviewResponse["size_breakdown"];
  priority_status_breakdown: AnalyticsOverviewResponse["priority_status_breakdown"];
  department_capacity: Array<{
    department_id: string;
    name: string;
    load: number;
    limit: number;
    reserve: number;
    is_over_capacity: boolean;
  }>;
  capacity_by_quarter: Array<{
    quarter: Quarter;
    departments: Array<{
      department_id: string;
      name: string;
      load: number;
      limit: number;
    }>;
  }>;
  manager_loads: AnalyticsWorkloadResponse["managers"];
  risks: Array<{ id: string; name: string; risks: string[] }>;
  volume_trend: Array<{ quarter: Quarter; current: number; previous: number }>;
  period_comparison: Array<{ label: string; cards: number }>;
  history: NonNullable<AnalyticsTrendsResponse["history"]>;
  preparation: { total: number; ready: number; incomplete: number };
}

export interface AnalyticsDrilldownResponse {
  records: AnalyticsRecord[];
  page: number;
  page_size: number;
  total: number;
}

export interface AnalyticsDrilldownCriteria {
  status_id?: string;
  card_id?: string;
  size_name?: string;
  priority_key?: string;
  manager_id?: string;
  risk?: "NO_MANAGER" | "NO_PRIORITY" | "NO_SCOPE" | "NO_EXECUTOR";
  view?: "cards" | "preparation";
}
