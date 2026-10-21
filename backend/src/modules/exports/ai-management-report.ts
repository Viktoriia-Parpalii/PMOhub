export type AiBreakdownItem = { name: string; count: number; share_pct: number };

export type AiScopeSummary = {
  total: number;
  completed: number;
  in_progress: number;
  blocked: number;
  without_status: number;
  completion_rate_pct: number;
  total_weight: number;
};

export type AiManagementInitiative = {
  record_type: "BACKLOG" | "QUARTER_CARD";
  initiative_type: "PROJECT" | "OPERATIONAL_TASK";
  name: string;
  year: number;
  quarter: string | null;
  status: string | null;
  priority: string | null;
  size: string | null;
  total_weight: number;
  progress_pct: number;
  scope: AiScopeSummary;
  manager?: string | null;
  departments?: string[];
  notes?: string | null;
  custom_fields?: Array<{ name: string; field_type: string; value: unknown }>;
};

export interface AiManagementReportV2 {
  schema_version: "2.0";
  report_context: {
    data_as_of: string;
    period: { years: number[]; quarters: string[] };
    initiative_types: Array<"PROJECT" | "OPERATIONAL_TASK">;
    coverage: string[];
    scope_confidentiality: "AGGREGATED_ONLY";
  };
  executive_metrics: {
    initiatives_total: number;
    completion_rate_pct: number;
    scope_items_total: number;
    scope_completion_rate_pct: number;
    total_weight: number;
    capacity_limit: number;
    capacity_load: number;
    capacity_reserve: number;
    overloaded_departments: number;
  };
  breakdowns: {
    by_status: AiBreakdownItem[];
    by_priority: AiBreakdownItem[];
    by_size: AiBreakdownItem[];
    quarterly_trend: Array<{
      year: number;
      quarter: string;
      initiatives_total: number;
      completion_rate_pct: number;
      scope_items_total: number;
      scope_completion_rate_pct: number;
      total_weight: number;
      capacity_limit: number;
      capacity_load: number;
      capacity_reserve: number;
      overloaded_departments: number;
    }>;
    department_capacity: Array<{
      name: string;
      limit: number;
      load: number;
      reserve: number;
      is_over_capacity: boolean;
    }>;
  };
  initiatives: AiManagementInitiative[];
  data_quality: {
    without_status: number;
    without_priority: number;
    without_manager: number;
    without_size: number;
  };
  analysis_brief: {
    language: "uk-UA";
    audience: "EXECUTIVE_MANAGEMENT";
    sections: Array<"EXECUTIVE_SUMMARY" | "KEY_RESULTS" | "RISKS_AND_BLOCKERS" | "CAPACITY_AND_RESERVE" | "RECOMMENDED_DECISIONS">;
    instruction: string;
  };
}
