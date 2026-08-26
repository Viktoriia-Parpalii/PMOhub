import { AppDataState, OperationalTask, Project } from "../../shared/types";

export type InitiativeKind = "project" | "task";
export type Initiative = Project | OperationalTask;
export type StateUpdater = (state: AppDataState) => AppDataState;
export type StoreAction = { type: "APPLY"; update: StateUpdater };
