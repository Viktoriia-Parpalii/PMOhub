import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { InitiativeViewModel } from "../../../../shared/types";
import { PortfolioTable } from "./PortfolioTable";

vi.mock("../../../../app/store", () => ({
  useAppContext: () => ({
    departments: [],
    managers: [],
    priorities: [],
    initiativeStatuses: [],
    updateProject: vi.fn(),
    updateTask: vi.fn(),
  }),
}));

const initiative = (id: string, tasks: string[]): InitiativeViewModel =>
  ({
    id,
    initiative_id: `initiative-${id}`,
    name: `Ініціатива ${id}`,
    strategic_goal: "Стратегічна задача",
    implementer_dept_ids: [],
    cross_functional_dept_ids: [],
    year: 2026,
    quarter: "Q1",
    health_status: "DEFAULT",
    record_type: "CARD",
    checklist: tasks.map((text, index) => ({
      id: `${id}-scope-${index}`,
      text,
      is_completed: false,
      color: "DEFAULT",
      implementer_dept_ids: [],
    })),
  }) as InitiativeViewModel;

describe("PortfolioTable", () => {
  it("numbers scope items from one for every quarter card", () => {
    render(
      <PortfolioTable
        kind="project"
        initiatives={[
          initiative("one", ["Перше завдання", "Друге завдання"]),
          initiative("two", ["Інше завдання"]),
        ]}
        customFields={[]}
        canEdit={false}
        onOpen={vi.fn()}
      />,
    );

    expect(within(screen.getByText("Перше завдання").closest("li")!).getByText("1.")).toBeInTheDocument();
    expect(within(screen.getByText("Друге завдання").closest("li")!).getByText("2.")).toBeInTheDocument();
    expect(within(screen.getByText("Інше завдання").closest("li")!).getByText("1.")).toBeInTheDocument();
  });

  it("shows the full scope group title as a tooltip", () => {
    const grouped = initiative("grouped", ["Завдання у групі"]);
    const longTitle = "Дуже довгий заголовок групи для перевірки повного тексту";
    grouped.scopeGroups = [{
      id: "group-1",
      lineage_id: "group-lineage-1",
      title: longTitle,
    }];
    grouped.checklist[0].groupId = "group-1";

    render(
      <PortfolioTable
        kind="project"
        initiatives={[grouped]}
        customFields={[]}
        canEdit={false}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText(longTitle)).toHaveAttribute("title", longTitle);
  });
});
