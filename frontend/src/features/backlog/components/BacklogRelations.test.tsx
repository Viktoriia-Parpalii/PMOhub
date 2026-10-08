import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InitiativeViewModel } from "../../../shared/types";
import { BacklogModal } from "./BacklogModal";
import { InitiativeRelationsModal } from "./InitiativeRelationsModal";

const master: InitiativeViewModel = {
  id: "year-1",
  initiative_id: "initiative-1",
  initiative_revision: 2,
  revision: 4,
  name: "Основна ініціатива",
  year: 2027,
  quarter: "Q1",
  record_type: "YEAR",
  health_status: "DEFAULT",
  strategic_goal: "",
  implementer_dept_ids: [],
  cross_functional_dept_ids: [],
  checklist: [],
  relations: [
    {
      id: "relation-1",
      relation_type: "RELATED_INITIATIVE",
      revision: 3,
      related_initiative_id: "initiative-2",
      related_kind: "PROJECT",
      related_name: "Пов’язаний проєкт",
      available_years: [2028, 2027],
    },
  ],
};

const context = vi.hoisted(() => ({
  projects: [] as InitiativeViewModel[],
  tasks: [] as InitiativeViewModel[],
  updateProject: vi.fn(),
  updateTask: vi.fn(),
  createBacklogWithCards: vi.fn(),
}));

vi.mock("../../../app/store", () => ({ useAppContext: () => context }));
vi.mock("../../../api/apiClient", () => ({
  loadInitiativeRelationCandidates: vi.fn(async () => []),
}));

describe("backlog initiative relations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    context.projects = [master];
    context.tasks = [];
    context.updateProject.mockResolvedValue({ success: true, message: "Збережено" });
  });

  it("sends a revision-safe removal delta when an existing link is removed", async () => {
    render(
      <BacklogModal
        type="PROJECTS"
        editItem={master}
        selectedYear={2027}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Прибрати зв’язок з Пов’язаний проєкт",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    await waitFor(() =>
      expect(context.updateProject).toHaveBeenCalledWith(
        "year-1",
        expect.objectContaining({
          relation_changes: {
            add_initiative_ids: [],
            remove_relations: [{ relation_id: "relation-1", revision: 3 }],
          },
        }),
      ),
    );
  });

  it("renders every relation as a deep link that opens in a new tab", () => {
    const onClose = vi.fn();
    const getHref = vi.fn(() => "/backlog?kind=PROJECT&year=2027");
    render(
      <InitiativeRelationsModal
        initiativeName="Основна ініціатива"
        relations={master.relations!}
        onClose={onClose}
        getHref={getHref}
      />,
    );

    const link = screen.getByRole("link", {
      name: /Відкрити пов’язану ініціативу Пов’язаний проєкт у новій вкладці/,
    });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute(
      "href",
      "/backlog?kind=PROJECT&year=2027",
    );
    fireEvent.click(link);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
