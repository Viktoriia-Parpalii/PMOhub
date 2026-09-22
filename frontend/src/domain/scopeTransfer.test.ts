import { describe, expect, it } from "vitest";
import { ChecklistItem, ScopeItemReadModel } from "../shared/types";
import { findSimilarScopeItem } from "./scopeTransfer";

const source: ChecklistItem = {
  id: "source",
  text: "  Підготувати   звіт ",
  is_completed: false,
  weightSnapshot: { name: "Висока", value: 5 },
  implementer_dept_ids: ["dept-b", "dept-a"],
};
const target: ScopeItemReadModel = {
  id: "target",
  text: "підготувати звіт",
  status_code: "DEFAULT",
  executor_department_ids: ["dept-a", "dept-b"],
  weight_snapshot: { name: "Інша назва", value: 5 },
};

describe("findSimilarScopeItem", () => {
  it("matches normalized text, numeric weight and unordered executor set", () => {
    expect(findSimilarScopeItem(source, [target], 5)).toBe(target);
  });

  it("does not warn when weight or executor set differs", () => {
    expect(findSimilarScopeItem(source, [target], 0)).toBeUndefined();
    expect(findSimilarScopeItem(source, [{ ...target, executor_department_ids: ["dept-a"] }], 5)).toBeUndefined();
  });

  it("does not warn for a different title", () => {
    expect(findSimilarScopeItem(source, [{ ...target, text: "Інший звіт" }], 5)).toBeUndefined();
  });
});
