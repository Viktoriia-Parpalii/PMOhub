import React from "react";
import { Project } from "../../../shared/types";
import { InitiativeCard } from "../components/shared/InitiativeCard";

/** Backwards-compatible project-specific entry point for existing portfolio views. */
export const ProjectCard: React.FC<{
  project: Project;
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
