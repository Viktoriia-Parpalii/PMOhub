import { Quarter } from "../../shared/types";

export type AnalyticsMode = "quarterly" | "annual";
export type AnalyticsKind = "ALL" | "PROJECT" | "OPERATIONAL_TASK";
export type StatusCounts = Record<
  "GREEN" | "YELLOW" | "RED" | "DEFAULT",
  number
>;
export interface CardStatusMetric {
  status_id: string;
  code: string;
  name: string;
  color: string;
  count: number;
  card_ids: string[];
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
  status_code: string;
  status_name: string;
  status_color: string;
  total_weight: number;
  size_name: string;
  progress: number;
  scope_items: number;
  risks: string[];
}

export interface AnalyticsResponse {
  mode: "QUARTERLY" | "ANNUAL";
  available_years: number[];
  summary: {
    cards: number;
    initiatives: number;
    total_weight: number;
    average_progress: number;
    average_duration: number;
    overloaded_departments: number;
  };
  status_distribution: CardStatusMetric[];
  scope_status_counts: StatusCounts;
  size_breakdown: Array<{ name: string; count: number; card_ids: string[] }>;
  priority_breakdown: Array<{
    priority_id: string | null;
    name: string;
    total_weight: number;
    card_ids: string[];
  }>;
  priority_status_breakdown: Array<{
    priority_id: string | null;
    name: string;
    card_ids: string[];
    status_counts: Record<string, number>;
  }>;
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
  manager_loads: Array<{
    manager_id: string;
    name: string;
    load: number;
    card_ids: string[];
  }>;
  risks: Array<{ id: string; name: string; risks: string[] }>;
  records?: AnalyticsRecord[];
  quarter_trend: Array<{
    quarter: Quarter;
    cards: number;
    initiatives: number;
    total_weight: number;
  }>;
  volume_trend: Array<{ quarter: Quarter; current: number; previous: number }>;
  period_comparison: Array<{ label: string; cards: number }>;
  history: Array<{
    year: number;
    cards: number;
    initiatives: number;
    status_distribution: CardStatusMetric[];
  }>;
  preparation: {
    total: number;
    ready: number;
    records: Array<{
      id: string;
      initiative_id: string;
      kind: string;
      name: string;
      year: number;
      manager_id: string | null;
      priority_id: string | null;
      department_ids: string[];
      ready: boolean;
    }>;
  };
}

export interface AnalyticsDrilldownResponse {
  records: AnalyticsRecord[];
  page: number;
  page_size: number;
  total: number;
}
