import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InitiativeViewModel } from "../../../shared/types";

const appContext = vi.hoisted(() => ({
  customFields: [],
  departments: [{ id: "department-1", name: "PMO", is_active: true }],
  managers: [{ id: "manager-1", name: "Менеджер", is_active: true }],
  priorities: [{ id: "priority-1", name: "Високий", is_active: true }],
  initiativeStatuses: [
    {
      id: "status-1",
      code: "IN_PROGRESS",
      name: "В роботі",
      color: "#6366f1",
      is_active: true,
    },
    {
      id: "status-2",
      code: "DONE",
      name: "Завершено",
      color: "#10b981",
      is_active: true,
    },
  ],
  taskWeights: [
    { id: "weight-1", name: "Стандартна", weight: 10, is_active: true },
  ],
  projects: [],
  tasks: [],
  moveCard: vi.fn(),
  continueCard: vi.fn(),
  moveScopeItem: vi.fn(),
  copyScopeItem: vi.fn(),
  currentUser: {
    id: "user-1",
    name: "Супер адміністратор",
    email: "admin@example.com",
    role: "SUPER_ADMIN",
  },
  rolePermissions: [
    {
      role: "SUPER_ADMIN",
      isActive: true,
      canCreateEditInitiatives: true,
      canDeleteInitiatives: true,
      canAccessAdmin: true,
      isReadOnly: false,
      canEditArchive: true,
    },
  ],
  businessPeriod: {
    year: 2026,
    quarter: "Q3",
    business_date: "2026-09-07",
    time_zone: "Europe/Kyiv",
  },
}));

vi.mock("../../../app/store", () => ({ useAppContext: () => appContext }));

import { InitiativeCardModal } from "./InitiativeCardModal";

const archivedCard: InitiativeViewModel = {
  id: "card-1",
  revision: 1,
  initiative_id: "initiative-1",
  initiative_year_id: "year-1",
  record_type: "CARD",
  name: "Архівна ініціатива",
  strategic_goal: "Стратегічна задача",
  manager_id: "manager-1",
  priority: "priority-1",
  implementer_dept_ids: ["department-1"],
  cross_functional_dept_ids: [],
  year: 2025,
  quarter: "Q1",
  health_status: "status-1",
  is_locked: true,
  checklist: [
    {
      id: "scope-1",
      revision: 1,
      text: "Історичне завдання",
      color: "YELLOW",
      is_completed: false,
      weightId: "weight-1",
      weightSnapshot: {
        definitionId: "weight-1",
        name: "Стандартна",
        value: 10,
      },
      implementer_dept_ids: ["department-1"],
    },
  ],
  notes: "Історична примітка",
};

const currentCard: InitiativeViewModel = {
  ...archivedCard,
  id: "card-current",
  year: 2026,
  quarter: "Q3",
  is_locked: false,
  scopeGroups: [
    { id: "group-1", lineage_id: "group-lineage-1", title: "Група один" },
  ],
  checklist: [
    {
      ...archivedCard.checklist[0],
      id: "scope-current",
      color: "YELLOW",
      is_completed: false,
      groupId: null,
    },
  ],
};

const renderModal = (
  card: InitiativeViewModel,
  props: Partial<React.ComponentProps<typeof InitiativeCardModal>> = {},
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <InitiativeCardModal
        kind="project"
        item={card}
        onClose={vi.fn()}
        onSave={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  );
};

describe("InitiativeCardModal archived correction mode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens read-only and unlocks only statuses and notes for correction", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <InitiativeCardModal
          kind="project"
          item={archivedCard}
          isReadOnly
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      </QueryClientProvider>,
    );

    const manager = screen.getByLabelText("Менеджер");
    const initiativeStatus = screen.getByLabelText("Статус проєкту");
    const scopeText = screen.getByPlaceholderText("Назва завдання");
    const scopeStatus = screen.getByTitle("Виконано");
    const notes = document.querySelector<HTMLElement>(
      '[data-placeholder="Коментарі, блокери..."]',
    );

    expect(manager).toBeDisabled();
    expect(initiativeStatus).toBeDisabled();
    expect(scopeText).toBeDisabled();
    expect(scopeStatus).toBeDisabled();
    expect(notes).toHaveAttribute("contenteditable", "false");

    fireEvent.click(screen.getByRole("button", { name: "Внести виправлення" }));

    expect(manager).toBeDisabled();
    expect(scopeText).toBeDisabled();
    expect(initiativeStatus).toBeEnabled();
    expect(scopeStatus).toBeEnabled();
    expect(notes).toHaveAttribute("contenteditable", "true");
    expect(
      screen.getByRole("button", { name: "Зберегти виправлення" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: /продовжити/i }),
    ).not.toBeInTheDocument();
  });
});

describe("InitiativeCardModal scope actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("moves grouping into the actions menu and assigns an existing group", () => {
    renderModal(currentCard);

    expect(screen.queryByLabelText("Група завдання")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Інші дії із завданням" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Змінити групу" }));
    fireEvent.click(
      screen.getByRole("menuitemradio", { name: "Група один" }),
    );

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Назва групи")).toHaveValue("Група один");
  });

  it("opens the transfer panel from the actions menu", () => {
    renderModal(currentCard);

    fireEvent.click(
      screen.getByRole("button", { name: "Інші дії із завданням" }),
    );
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Перенести завдання" }),
    );

    expect(
      screen.getByText("Перенесення завдання в інший період"),
    ).toBeInTheDocument();
  });

  it("opens the copy panel from the actions menu", () => {
    renderModal(currentCard);

    fireEvent.click(
      screen.getByRole("button", { name: "Інші дії із завданням" }),
    );
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Копіювати завдання" }),
    );

    expect(
      screen.getByText("Копіювання завдання в інший період"),
    ).toBeInTheDocument();
  });

  it("creates and assigns a group from the actions submenu", () => {
    renderModal(currentCard);

    fireEvent.click(
      screen.getByRole("button", { name: "Інші дії із завданням" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Змінити групу" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Створити групу" }));

    expect(screen.getByLabelText("Назва групи")).toHaveValue("Нова група");
  });

  it("removes an unfinished scope item from the actions menu", () => {
    renderModal(currentCard);

    fireEvent.click(
      screen.getByRole("button", { name: "Інші дії із завданням" }),
    );
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Видалити завдання" }),
    );

    expect(screen.queryByPlaceholderText("Назва завдання")).not.toBeInTheDocument();
  });

  it("keeps destructive actions blocked for a completed scope item", () => {
    renderModal({
      ...currentCard,
      checklist: currentCard.checklist.map((scope) => ({
        ...scope,
        color: "GREEN",
        is_completed: true,
      })),
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Інші дії із завданням" }),
    );
    const deleteAction = screen.getByRole("menuitem", {
      name: "Видалити завдання",
    });
    expect(deleteAction).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(deleteAction);

    expect(screen.getByPlaceholderText("Назва завдання")).toBeInTheDocument();
  });

  it("closes the actions menu with Escape and returns focus", () => {
    renderModal(currentCard);
    const trigger = screen.getByRole("button", {
      name: "Інші дії із завданням",
    });

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
