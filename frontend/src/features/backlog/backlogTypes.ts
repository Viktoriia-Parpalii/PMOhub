import { InitiativeViewModel, Quarter } from "../../shared/types";

export type BacklogTabKind = "PROJECTS" | "TASKS";
export type QuarterFilter = "ALL" | Quarter;
export type BacklogInitiative = InitiativeViewModel;
export interface BacklogCardFilters {
  quarter: QuarterFilter;
  managerId: string;
  priorityId: string;
}
