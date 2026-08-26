import type { components } from "../../api/generated/schema";
import { InitiativePassport } from "../../shared/types";

type Schemas = components["schemas"];
type ChecklistWriteInput = Omit<Schemas["ChecklistItemDto"], "implementer_dept_ids"> & {
  implementer_dept_ids?: string[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const uuidOrUndefined = (value: string | undefined): string | undefined =>
  value && UUID_PATTERN.test(value) ? value : undefined;

const uuidList = (values: string[] | undefined): string[] =>
  [...new Set((values ?? []).filter((value) => UUID_PATTERN.test(value)))];

/**
 * Maps a frontend domain/read model to the exact passport write contract.
 * Never spread an Initiative into an API request: it also contains aggregate,
 * period, history and calculated fields that are forbidden by ValidationPipe.
 */
export const toPassportDto = (
  input: Pick<InitiativePassport, "name"> & Partial<InitiativePassport>,
): Schemas["PassportDto"] => ({
  name: input.name.trim(),
  ...(input.strategic_goal !== undefined
    ? { strategic_goal: input.strategic_goal }
    : {}),
  ...(uuidOrUndefined(input.manager_id)
    ? { manager_id: uuidOrUndefined(input.manager_id) }
    : {}),
  ...(uuidOrUndefined(input.priority)
    ? { priority: uuidOrUndefined(input.priority) }
    : {}),
  ...(input.notes !== undefined ? { notes: input.notes } : {}),
  implementer_dept_ids: uuidList(input.implementer_dept_ids),
  cross_functional_dept_ids: uuidList(input.cross_functional_dept_ids),
  ...(input.custom_fields !== undefined
    ? { custom_fields: { ...input.custom_fields } }
    : {}),
});

/** Existing UUIDs are preserved for transactional diff; temporary UI IDs are omitted. */
export const toChecklistItemDto = (
  item: ChecklistWriteInput,
): Schemas["ChecklistItemDto"] => {
  const id = uuidOrUndefined(item.id);
  const weightId = uuidOrUndefined(item.weightId);
  const definitionId = uuidOrUndefined(item.weightSnapshot?.definitionId);
  return {
    ...(id ? { id } : {}),
    text: item.text,
    is_completed: item.is_completed,
    ...(item.color !== undefined ? { color: item.color } : {}),
    ...(weightId ? { weightId } : {}),
    ...(item.weightSnapshot
      ? {
          weightSnapshot: {
            ...(definitionId ? { definitionId } : {}),
            name: item.weightSnapshot.name,
            value: item.weightSnapshot.value,
          },
        }
      : {}),
    ...(item.assigneeIds !== undefined
      ? { assigneeIds: uuidList(item.assigneeIds) }
      : {}),
    implementer_dept_ids: uuidList(item.implementer_dept_ids),
  };
};

export const toChecklistDto = (
  items: ChecklistWriteInput[] | undefined,
): Schemas["ChecklistItemDto"][] => (items ?? []).map(toChecklistItemDto);
