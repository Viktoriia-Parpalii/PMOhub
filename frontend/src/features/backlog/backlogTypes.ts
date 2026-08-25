import { OperationalTask, Project, Quarter } from "../../shared/types";

export type BacklogTabKind = "PROJECTS" | "TASKS";
export type QuarterFilter = "ALL" | Quarter;
export type BacklogInitiative = Project | OperationalTask;
