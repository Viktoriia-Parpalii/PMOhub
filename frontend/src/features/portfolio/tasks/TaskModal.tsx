import React from "react";
import {
  InitiativeViewModel,
  MutationResult,
  Quarter,
} from "../../../shared/types";
import { InitiativeCardModal } from "../../initiatives/components/InitiativeCardModal";

interface Props {
  task: InitiativeViewModel | null;
  onClose: () => void;
  onSave: (
    task: InitiativeViewModel,
  ) => void | MutationResult | Promise<void | MutationResult>;
  isReadOnly?: boolean;
  onDelete?: (id: string) => void | Promise<void>;
  defaultYear?: number;
  defaultQuarter?: Quarter;
  defaultIsBacklog?: boolean;
}

export const TaskModal = (props: Props) => (
  <InitiativeCardModal
    kind="task"
    item={props.task}
    onClose={props.onClose}
    onSave={props.onSave}
    onDelete={props.onDelete}
    isReadOnly={props.isReadOnly}
    defaultYear={props.defaultYear}
    defaultQuarter={props.defaultQuarter}
  />
);
