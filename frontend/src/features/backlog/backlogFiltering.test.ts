import { describe, expect, it } from "vitest";
import { BacklogInitiative } from "./backlogTypes";
import {
  filterBacklogCards,
  matchesBacklogDimensions,
} from "./backlogFiltering";

const record = (
  id: string,
  quarter: "Q1" | "Q2",
  managerId: string,
  priorityId: string,
) =>
  ({
    id,
    quarter,
    manager_id: managerId,
    priority: priorityId,
  }) as BacklogInitiative;

describe("backlog card filters", () => {
  const q1 = record("q1", "Q1", "manager-a", "priority-a");
  const q2 = record("q2", "Q2", "manager-b", "priority-b");
  const master = {} as BacklogInitiative;

  it("shows only cards matching quarter, manager and priority together", () => {
    expect(
      filterBacklogCards([q1, q2], {
        quarter: "Q2",
        managerId: "manager-b",
        priorityId: "priority-b",
      }),
    ).toEqual([q2]);
    expect(
      filterBacklogCards([q1, q2], {
        quarter: "Q2",
        managerId: "manager-a",
        priorityId: "",
      }),
    ).toEqual([]);
  });

  it("keeps a master visible only when its accordion has a matching card", () => {
    expect(
      matchesBacklogDimensions(master, [q1, q2], {
        quarter: "Q1",
        managerId: "manager-a",
        priorityId: "priority-a",
      }),
    ).toBe(true);
    expect(
      matchesBacklogDimensions(master, [q1, q2], {
        quarter: "Q1",
        managerId: "manager-b",
        priorityId: "",
      }),
    ).toBe(false);
  });
});
