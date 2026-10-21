import { describe, expect, it } from "vitest";
import { getCardDepartmentPool, isCompletedItem } from "./initiatives";

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

  it("keeps an executor in the card pool so it can return to involved", () => {
    const pool = getCardDepartmentPool({
      id: "card-1",
      initiative_id: "initiative-1",
      record_type: "CARD",
      name: "Картка",
      implementer_dept_ids: [],
      cross_functional_dept_ids: ["involved"],
      department_pool_ids: ["involved", "executor"],
      year: 2026,
      quarter: "Q3",
      health_status: "DEFAULT",
      checklist: [
        {
          id: "scope-1",
          text: "Завдання",
          is_completed: false,
          implementer_dept_ids: ["executor"],
        },
      ],
    });

    expect(pool).toEqual(["involved", "executor"]);
  });

  it("reconstructs the pool from scope executors for older view models", () => {
    const pool = getCardDepartmentPool({
      id: "card-1",
      initiative_id: "initiative-1",
      record_type: "CARD",
      name: "Картка",
      implementer_dept_ids: [],
      cross_functional_dept_ids: ["involved"],
      year: 2026,
      quarter: "Q3",
      health_status: "DEFAULT",
      checklist: [
        {
          id: "scope-1",
          text: "Завдання",
          is_completed: false,
          implementer_dept_ids: ["executor"],
        },
      ],
    });

    expect(pool).toEqual(["involved", "executor"]);
  });
});
