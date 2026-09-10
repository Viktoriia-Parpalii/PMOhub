import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DictionariesSection } from "./DictionariesSection";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
  const renderSection = () =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DictionariesSection />
      </QueryClientProvider>,
    );
  it("uses the same four columns for every dictionary", () => {
    const { container } = renderSection();
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

  it("provides accessible explanations for every dictionary", () => {
    renderSection();

    expect(screen.getAllByRole("button", { name: /^Пояснення:/ })).toHaveLength(6);
    const explanations = screen
      .getAllByRole("tooltip")
      .map((tooltip) => tooltip.textContent)
      .join(" ");
    expect(explanations).toMatch(/Застосувати.*оновлює назву й бали/s);
    expect(explanations).toMatch(
      /Перерахувати відкриті картки.*повторно визначає розмір/s,
    );
  });
});
