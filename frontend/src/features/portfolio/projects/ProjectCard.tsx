import React from "react";
import { InitiativeViewModel } from "../../../shared/types";
import { InitiativeCard } from "../components/shared/InitiativeCard";

/** Backwards-compatible project-specific entry point for existing portfolio views. */
export const ProjectCard: React.FC<{
  project: InitiativeViewModel;
  onClick?: () => void;
  hideColorPicker?: boolean;
  isBacklogView?: boolean;
}> = ({ project, onClick, hideColorPicker, isBacklogView }) => (
  <InitiativeCard
    initiative={project}
    kind="project"
    onClick={onClick}
    hideColorPicker={hideColorPicker}
    isBacklogView={isBacklogView}
  />
);
