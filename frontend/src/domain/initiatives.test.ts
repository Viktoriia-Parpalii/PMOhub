import { describe, expect, it } from "vitest";
import { isCompletedItem } from "./initiatives";

describe("initiative scope rules", () => {
  it("recognizes every completed-state representation returned by the API", () => {
    expect(
      isCompletedItem({ id: "1", text: "A", is_completed: true }),
    ).toBe(true);
    expect(
      isCompletedItem({
        id: "2",
        text: "B",
        is_completed: false,
        color: "GREEN",
      }),
    ).toBe(true);
    expect(
      isCompletedItem({
        id: "3",
        text: "C",
        is_completed: false,
        status_code: "GREEN",
      }),
    ).toBe(true);
    expect(
      isCompletedItem({
        id: "4",
        text: "D",
        is_completed: false,
        status_code: "YELLOW",
      }),
    ).toBe(false);
  });
});
