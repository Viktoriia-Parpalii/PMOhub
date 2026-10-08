import { describe, expect, it } from "vitest";
import type { ChecklistItem, ScopeGroup } from "../shared/types";
import {
  assignScopeGroup,
  buildScopeBlocks,
  moveScopeEntry,
  moveScopeGroup,
} from "./scopeGroups";

const item = (id: string, groupId: string | null, color: ChecklistItem["color"] = "YELLOW"): ChecklistItem => ({
  id,
  groupId,
  text: id,
  is_completed: color === "GREEN",
  color,
  implementer_dept_ids: [],
});

const groups: ScopeGroup[] = [{ id: "group-a", lineage_id: "lineage-a", title: "????? A" }];

describe("scopeGroups", () => {
  it("builds hierarchical numbers and derives a shared group color", () => {
    const blocks = buildScopeBlocks([
      item("a-1", "group-a", "GREEN"),
      item("a-2", "group-a", "GREEN"),
      item("single", null, "RED"),
    ], groups);

    expect(blocks[0]).toMatchObject({
      kind: "GROUP",
      number: "1.",
      color: "GREEN",
      items: [{ number: "1.1" }, { number: "1.2" }],
    });
    expect(blocks[1]).toMatchObject({ kind: "ITEM", number: "2." });
  });

  it("keeps a mixed or incomplete group neutral", () => {
    const [block] = buildScopeBlocks([
      item("a-1", "group-a", "GREEN"),
      item("a-2", "group-a", "YELLOW"),
    ], groups);
    expect(block).toMatchObject({ kind: "GROUP", color: null });
  });

  it("moves grouped tasks only inside their group and moves a full group as one block", () => {
    const source = [item("a-1", "group-a"), item("a-2", "group-a"), item("single", null)];
    expect(moveScopeEntry(source, groups, "a-2", -1).map(({ id }) => id)).toEqual([
      "a-2", "a-1", "single",
    ]);
    expect(moveScopeGroup(source, groups, "group-a", 1).map(({ id }) => id)).toEqual([
      "single", "a-1", "a-2",
    ]);
  });

  it("appends an assigned task to the selected group", () => {
    const source = [item("single", null), item("a-1", "group-a")];
    expect(assignScopeGroup(source, "single", "group-a").map(({ id }) => id)).toEqual([
      "a-1", "single",
    ]);
  });
});
