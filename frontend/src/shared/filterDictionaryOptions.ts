import type { FilterOptionVisibilityMode } from "./types";

export const filterDictionaryOptions = <T extends { is_active: boolean }>(
  items: readonly T[],
  visibility: FilterOptionVisibilityMode,
): T[] =>
  visibility === "ALL"
    ? [...items]
    : items.filter((item) => item.is_active !== false);

export const hasDictionaryOption = (
  options: readonly { id: string }[],
  selectedId: string,
) => !selectedId || options.some((item) => item.id === selectedId);
