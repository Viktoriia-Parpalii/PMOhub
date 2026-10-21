export const FILTER_OPTION_VISIBILITY_KEY = "FILTER_OPTION_VISIBILITY";

export const FILTER_OPTION_VISIBILITY_MODES = ["ACTIVE_ONLY", "ALL"] as const;
export type FilterOptionVisibilityMode =
  (typeof FILTER_OPTION_VISIBILITY_MODES)[number];

export interface FilterOptionVisibilityValue {
  analytics: FilterOptionVisibilityMode;
  portfolio: FilterOptionVisibilityMode;
  backlog: FilterOptionVisibilityMode;
}

export interface FilterOptionVisibilitySetting
  extends FilterOptionVisibilityValue {
  revision: number;
}

export const DEFAULT_FILTER_OPTION_VISIBILITY: FilterOptionVisibilityValue = {
  analytics: "ACTIVE_ONLY",
  portfolio: "ACTIVE_ONLY",
  backlog: "ACTIVE_ONLY",
};

const isMode = (value: unknown): value is FilterOptionVisibilityMode =>
  typeof value === "string" &&
  FILTER_OPTION_VISIBILITY_MODES.includes(value as FilterOptionVisibilityMode);

export const parseFilterOptionVisibility = (
  valueJson: string,
): FilterOptionVisibilityValue | null => {
  try {
    const value = JSON.parse(valueJson) as Record<string, unknown>;
    if (
      !value ||
      !isMode(value.analytics) ||
      !isMode(value.portfolio) ||
      !isMode(value.backlog)
    )
      return null;
    return {
      analytics: value.analytics,
      portfolio: value.portfolio,
      backlog: value.backlog,
    };
  } catch {
    return null;
  }
};
