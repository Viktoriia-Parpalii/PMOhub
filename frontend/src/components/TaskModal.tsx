import React from 'react';
import { OperationalTask, Quarter } from '../types';
import { InitiativeCardModal } from './InitiativeCardModal';

interface Props {
  task: OperationalTask | null;
  onClose: () => void;
  onSave: (task: OperationalTask, syncTargets?: string[], initialQuarters?: Quarter[]) => void;
  isReadOnly?: boolean;
  onDelete?: (id: string) => void;
  defaultYear?: number;
  defaultQuarter?: Quarter;
  defaultIsBacklog?: boolean;
}

export const TaskModal = (props: Props) => <InitiativeCardModal kind="task" item={props.task} onClose={props.onClose} onSave={(item, targets) => props.onSave(item as OperationalTask, targets)} onDelete={props.onDelete} isReadOnly={props.isReadOnly} defaultYear={props.defaultYear} defaultQuarter={props.defaultQuarter} />;
