import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DictionariesSection } from "./DictionariesSection";

vi.mock("../../../../app/store", () => ({
  useAppContext: () => ({
    departments: [],
    managers: [],
    priorities: [],
    initiativeStatuses: [],
    taskWeights: [],
    initiativeSizes: [],
    addDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    deleteDepartment: vi.fn(),
    checkDepartmentDeletion: vi.fn(),
    addManager: vi.fn(),
    updateManager: vi.fn(),
    deleteManager: vi.fn(),
    checkManagerDeletion: vi.fn(),
    addPriority: vi.fn(),
    updatePriority: vi.fn(),
    deletePriority: vi.fn(),
    checkPriorityDeletion: vi.fn(),
    addInitiativeStatus: vi.fn(),
    updateInitiativeStatus: vi.fn(),
    deleteInitiativeStatus: vi.fn(),
    checkInitiativeStatusDeletion: vi.fn(),
    addTaskWeight: vi.fn(),
    updateTaskWeight: vi.fn(),
    deleteTaskWeight: vi.fn(),
    applyTaskWeightToOpenCards: vi.fn(),
    addInitiativeSize: vi.fn(),
    updateInitiativeSize: vi.fn(),
    deleteInitiativeSize: vi.fn(),
    refreshOpenInitiativeSizes: vi.fn(),
  }),
}));

describe("DictionariesSection table grid", () => {
  it("uses the same four columns for every dictionary", () => {
    const { container } = render(<DictionariesSection />);
    const tables = Array.from(container.querySelectorAll("table"));

    expect(tables).toHaveLength(6);
    expect(
      tables.map((table) =>
        Array.from(table.tHead!.rows[0].cells).map((cell) =>
          cell.textContent?.trim(),
        ),
      ),
    ).toEqual([
      ["Назва", "Ліміт", "Статус", ""],
      ["Назва", "Департамент", "Статус", ""],
      ["Назва", "", "Статус", ""],
      ["Назва", "", "Статус", ""],
      ["Назва", "Вага", "Статус", ""],
      ["Назва", "Діапазон", "Статус", ""],
    ]);

    for (const table of tables) {
      expect(table.querySelectorAll("colgroup col")).toHaveLength(4);
    }
  });
});
