import {
  ChecklistItem,
  InitiativeMetadata,
  InitiativeYearContext,
  PreparationStage,
  InitiativeViewModel,
} from "../shared/types";

export type InitiativeRecord = InitiativeViewModel;

export const isCompletedItem = (item: ChecklistItem) =>
  item.is_completed || item.color === "GREEN";

export const metadataFrom = (
  record: InitiativeMetadata,
): InitiativeMetadata => ({
  name: record.name,
  strategic_goal: record.strategic_goal,
  manager_id: record.manager_id,
  priority: record.priority,
  notes: record.notes,
  implementer_dept_ids: [...(record.implementer_dept_ids ?? [])],
  cross_functional_dept_ids: [...(record.cross_functional_dept_ids ?? [])],
  custom_fields: record.custom_fields ? { ...record.custom_fields } : undefined,
});

export const preparationMetadataFrom = (
  record: InitiativeMetadata,
): PreparationStage => ({
  manager_id: record.manager_id,
  priority: record.priority,
  cross_functional_dept_ids: [...(record.cross_functional_dept_ids ?? [])],
  notes: record.notes,
  custom_fields: record.custom_fields ? { ...record.custom_fields } : undefined,
  history: [],
});

export const getYearSnapshot = (
  master: InitiativeRecord,
  year: number,
): InitiativeYearContext | undefined =>
  master.record_type === "YEAR" && master.year === year
    ? {
        ...metadataFrom(master),
        year,
        history: [],
        preparationStage: master.preparation_stage,
      }
    : undefined;

export const getChainId = (record: InitiativeRecord): string =>
  record.initiative_id;

export const materializeBacklogYear = <T extends InitiativeRecord>(
  master: T,
  year: number,
): T | undefined => {
  const snapshot = getYearSnapshot(master, year);
  return snapshot
    ? { ...master, ...metadataFrom(snapshot), year, checklist: [] }
    : undefined;
};
