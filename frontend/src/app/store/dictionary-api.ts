import {
  Department,
  InitiativeSizeDef,
  InitiativeStatusDef,
  Manager,
  PriorityDef,
  TaskWeightDef,
} from "../../shared/types";

export type DictionaryStateKey =
  | "departments"
  | "managers"
  | "priorities"
  | "initiativeStatuses"
  | "taskWeights"
  | "initiativeSizes";

export type DictionaryApiType =
  | "departments"
  | "managers"
  | "priorities"
  | "statuses"
  | "weights"
  | "sizes";

export type DictionaryItem =
  | Department
  | Manager
  | PriorityDef
  | InitiativeStatusDef
  | TaskWeightDef
  | InitiativeSizeDef;

const routes: Record<DictionaryStateKey, DictionaryApiType> = {
  departments: "departments",
  managers: "managers",
  priorities: "priorities",
  initiativeStatuses: "statuses",
  taskWeights: "weights",
  initiativeSizes: "sizes",
};

/** Maps the frontend state key to the single corresponding REST dictionary. */
export const dictionaryApiType = (key: DictionaryStateKey): DictionaryApiType =>
  routes[key];

/** The API DTO uses the same snake_case fields as the frontend definitions. */
export const dictionaryPayload = <T extends DictionaryItem>(item: T): Omit<T, "id"> => {
  const { id: _id, ...payload } = item;
  return payload;
};
