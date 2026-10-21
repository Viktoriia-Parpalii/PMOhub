import React from "react";
import { InitiativeViewModel } from "../../../shared/types";
import { InitiativeCard } from "../components/shared/InitiativeCard";

/** Backwards-compatible task-specific entry point for existing portfolio views. */
export const TaskCard: React.FC<{
  task: InitiativeViewModel;
  onClick?: () => void;
  hideColorPicker?: boolean;
  isBacklogView?: boolean;
}> = ({ task, onClick, hideColorPicker, isBacklogView }) => (
  <InitiativeCard
    initiative={task}
    kind="task"
    onClick={onClick}
    hideColorPicker={hideColorPicker}
    isBacklogView={isBacklogView}
  />
);
