// MSSQL UNIQUEIDENTIFIER also permits deterministic identifiers that do not
// encode an RFC version (the immutable system records use such IDs).
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Keeps temporary UI identifiers out of write DTOs. */
export const uuidOrUndefined = (
  value: string | undefined,
): string | undefined =>
  value && UUID_PATTERN.test(value) ? value : undefined;

/** Resolves a write ID only from the currently active server dictionary. */
export const activeReferenceId = (
  selectedId: string | undefined,
  definitions: Array<{ id: string; is_active: boolean }>,
  fallbackId?: string,
): string | undefined => {
  const candidate = selectedId ?? fallbackId;
  return candidate &&
    definitions.some((item) => item.id === candidate && item.is_active)
    ? candidate
    : undefined;
};
