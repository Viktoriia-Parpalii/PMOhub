import React from "react";
import {
  InitiativeViewModel,
  MutationResult,
  Quarter,
} from "../../../shared/types";
import { InitiativeCardModal } from "../../initiatives/components/InitiativeCardModal";

interface Props {
  project: InitiativeViewModel | null;
  onClose: () => void;
  onSave: (
    project: InitiativeViewModel,
  ) => void | MutationResult | Promise<void | MutationResult>;
  isReadOnly?: boolean;
  onDelete?: (id: string) => void | Promise<void>;
  defaultYear?: number;
  defaultQuarter?: Quarter;
  defaultIsBacklog?: boolean;
}

export const ProjectModal = (props: Props) => (
  <InitiativeCardModal
    kind="project"
    item={props.project}
    onClose={props.onClose}
    onSave={props.onSave}
    onDelete={props.onDelete}
    isReadOnly={props.isReadOnly}
    defaultYear={props.defaultYear}
    defaultQuarter={props.defaultQuarter}
  />
);
