import { describe, expect, it } from "vitest";
import { filterDictionaryOptions, hasDictionaryOption } from "./filterDictionaryOptions";

const items = [
  { id: "active", is_active: true },
  { id: "inactive", is_active: false },
];

describe("filter dictionary options", () => {
  it("keeps only active options in ACTIVE_ONLY mode", () => {
    expect(filterDictionaryOptions(items, "ACTIVE_ONLY").map((item) => item.id)).toEqual(["active"]);
  });

  it("preserves every option and its order in ALL mode", () => {
    expect(filterDictionaryOptions(items, "ALL").map((item) => item.id)).toEqual(["active", "inactive"]);
  });

  it("detects when a selected inactive option is no longer available", () => {
    const visible = filterDictionaryOptions(items, "ACTIVE_ONLY");
    expect(hasDictionaryOption(visible, "inactive")).toBe(false);
    expect(hasDictionaryOption(visible, "")).toBe(true);
  });
});
