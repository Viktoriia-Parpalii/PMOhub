import type { ChecklistItem, ScopeGroup } from "../shared/types";

export type ScopeBlock =
  | { kind: "GROUP"; key: string; number: string; group: ScopeGroup; items: Array<{ item: ChecklistItem; number: string }>; color: ChecklistItem["color"] | null }
  | { kind: "ITEM"; key: string; number: string; item: ChecklistItem };

const statusColor = (items: ChecklistItem[]): ChecklistItem["color"] | null => {
  if (!items.length || items.some((item) => !item.color || item.color === "DEFAULT" || item.color === "GRAY")) return null;
  const first = items[0].color;
  return items.every((item) => item.color === first) ? first : null;
};

export const buildScopeBlocks = (items: ChecklistItem[], groups: ScopeGroup[] = []): ScopeBlock[] => {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const emitted = new Set<string>();
  const blocks: ScopeBlock[] = [];
  for (const item of items) {
    const group = item.groupId ? groupById.get(item.groupId) : undefined;
    if (!group) {
      blocks.push({ kind: "ITEM", key: item.id, number: "", item });
      continue;
    }
    if (emitted.has(group.id)) continue;
    emitted.add(group.id);
    const groupedItems = items.filter((candidate) => candidate.groupId === group.id);
    blocks.push({
      kind: "GROUP", key: group.id, number: "", group,
      items: groupedItems.map((candidate) => ({ item: candidate, number: "" })),
      color: statusColor(groupedItems),
    });
  }
  return blocks.map((block, index) => {
    const top = String(index + 1);
    return block.kind === "ITEM"
      ? { ...block, number: `${top}.` }
      : { ...block, number: `${top}.`, items: block.items.map((entry, childIndex) => ({ ...entry, number: `${top}.${childIndex + 1}` })) };
  });
};

export const scopeNumberMap = (items: ChecklistItem[], groups: ScopeGroup[] = []) => {
  const result = new Map<string, string>();
  for (const block of buildScopeBlocks(items, groups)) {
    if (block.kind === "ITEM") result.set(block.item.id, block.number);
    else block.items.forEach(({ item, number }) => result.set(item.id, number));
  }
  return result;
};

export const cleanScopeGroups = (items: ChecklistItem[], groups: ScopeGroup[]) => {
  const used = new Set(items.map((item) => item.groupId).filter(Boolean));
  return groups.filter((group) => used.has(group.id));
};
export const moveScopeEntry = (
  items: ChecklistItem[],
  groups: ScopeGroup[],
  itemId: string,
  direction: -1 | 1,
): ChecklistItem[] => {
  const item = items.find((candidate) => candidate.id === itemId);
  if (!item) return items;
  if (item.groupId) {
    const positions = items
      .map((candidate, index) => ({ candidate, index }))
      .filter(({ candidate }) => candidate.groupId === item.groupId);
    const localIndex = positions.findIndex(({ candidate }) => candidate.id === itemId);
    const target = positions[localIndex + direction];
    if (!target) return items;
    const next = [...items];
    const currentIndex = items.findIndex((candidate) => candidate.id === itemId);
    [next[currentIndex], next[target.index]] = [next[target.index], next[currentIndex]];
    return next;
  }
  const blocks = buildScopeBlocks(items, groups);
  const blockIndex = blocks.findIndex((block) => block.kind === "ITEM" && block.item.id === itemId);
  const targetIndex = blockIndex + direction;
  if (blockIndex < 0 || targetIndex < 0 || targetIndex >= blocks.length) return items;
  const reordered = [...blocks];
  [reordered[blockIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[blockIndex]];
  return reordered.flatMap((block) => block.kind === "ITEM" ? [block.item] : block.items.map(({ item: child }) => child));
};

export const moveScopeGroup = (
  items: ChecklistItem[],
  groups: ScopeGroup[],
  groupId: string,
  direction: -1 | 1,
): ChecklistItem[] => {
  const blocks = buildScopeBlocks(items, groups);
  const blockIndex = blocks.findIndex((block) => block.kind === "GROUP" && block.group.id === groupId);
  const targetIndex = blockIndex + direction;
  if (blockIndex < 0 || targetIndex < 0 || targetIndex >= blocks.length) return items;
  const reordered = [...blocks];
  [reordered[blockIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[blockIndex]];
  return reordered.flatMap((block) => block.kind === "ITEM" ? [block.item] : block.items.map(({ item }) => item));
};
export const assignScopeGroup = (
  items: ChecklistItem[],
  itemId: string,
  nextGroupId: string | null,
): ChecklistItem[] => {
  const source = items.find((item) => item.id === itemId);
  if (!source || source.groupId === nextGroupId) return items;
  const sourceIndex = items.findIndex((item) => item.id === itemId);
  const without = items.filter((item) => item.id !== itemId);
  const updated = { ...source, groupId: nextGroupId };
  if (nextGroupId) {
    const lastTargetIndex = without.reduce(
      (last, item, index) => item.groupId === nextGroupId ? index : last,
      -1,
    );
    const insertAt = lastTargetIndex >= 0 ? lastTargetIndex + 1 : without.length;
    return [...without.slice(0, insertAt), updated, ...without.slice(insertAt)];
  }
  const lastOldGroupIndex = source.groupId
    ? without.reduce((last, item, index) => item.groupId === source.groupId ? index : last, -1)
    : -1;
  const insertAt = lastOldGroupIndex >= 0 ? lastOldGroupIndex + 1 : Math.min(sourceIndex, without.length);
  return [...without.slice(0, insertAt), updated, ...without.slice(insertAt)];
};
