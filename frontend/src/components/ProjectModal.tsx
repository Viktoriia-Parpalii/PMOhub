import React from 'react';
import { Project, Quarter } from '../types';
import { InitiativeCardModal } from './InitiativeCardModal';

interface Props {
  project: Project | null;
  onClose: () => void;
  onSave: (project: Project, syncTargets?: string[], initialQuarters?: Quarter[]) => void;
  isReadOnly?: boolean;
  onDelete?: (id: string) => void;
  defaultYear?: number;
  defaultQuarter?: Quarter;
  defaultIsBacklog?: boolean;
}

export const ProjectModal = (props: Props) => <InitiativeCardModal kind="project" item={props.project} onClose={props.onClose} onSave={(item, targets) => props.onSave(item as Project, targets)} onDelete={props.onDelete} isReadOnly={props.isReadOnly} defaultYear={props.defaultYear} defaultQuarter={props.defaultQuarter} />;
