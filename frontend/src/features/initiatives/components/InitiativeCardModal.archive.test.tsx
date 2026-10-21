import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InitiativeViewModel, QuarterCardReadModel } from "../../../shared/types";
import * as apiClient from "../../../api/apiClient";

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
    { id: "weight-1", name: "Стандартна", weight: 10, is_active: true, is_default: true, is_system: true },
  ],
  projects: [],
  tasks: [],
  moveCard: vi.fn(),
  continueCard: vi.fn(),
  moveScopeItem: vi.fn(),
  copyScopeItem: vi.fn(),
  transferScopeItems: vi.fn(),
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
      lineage_id: "lineage-current",
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
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    appContext.businessPeriod.year = 2026;
    appContext.businessPeriod.quarter = "Q3";
    appContext.businessPeriod.business_date = "2026-09-07";
  });

  const targetCard = (changes: Record<string, unknown> = {}) => ({
    id: "target-card",
    initiative_id: currentCard.initiative_id,
    revision: 4,
    scope: [{
      id: "target-scope",
      lineage_id: "other-lineage",
      text: "Історичне завдання",
      status_code: "DEFAULT",
      weight_snapshot: { name: "Стандартна", value: 10 },
      executor_department_ids: ["department-1"],
    }],
    ...changes,
  }) as unknown as QuarterCardReadModel;

  const mockTarget = (card = targetCard()) => {
    // The list endpoint only returns scope preview fields, without weight or lineage.
    vi.spyOn(apiClient, "loadQuarterCards").mockResolvedValue([{
      id: card.id,
      initiative_id: card.initiative_id,
      revision: card.revision,
      scope: card.scope.map(({ id, text, status_code, executor_department_ids }) => ({
        id, text, status_code, executor_department_ids,
      })),
    } as unknown as QuarterCardReadModel]);
    vi.spyOn(apiClient, "loadInitiativeCardModel").mockResolvedValue({ success: true, data: card });
  };

  const openTransfer = (action: "Перенести завдання" | "Копіювати завдання") => {
    const copying = action === "Копіювати завдання";
    fireEvent.click(screen.getByRole("button", {
      name: copying ? "Режим копіювання завдань" : "Режим перенесення завдань",
    }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Вибрати завдання/ }));
    fireEvent.click(screen.getByRole("button", { name: copying ? "Копіювати (1)" : "Перенести (1)" }));
  };

  it("blocks an identical selected task and offers cancellation when nothing is eligible", async () => {
    mockTarget();
    appContext.transferScopeItems.mockResolvedValue({ success: true, message: "Завдання перенесено" });
    renderModal(currentCard);
    openTransfer("Перенести завдання");

    const conflictDialog = await screen.findByRole("dialog", { name: /Частина завдань уже є/ });
    expect(apiClient.loadInitiativeCardModel).toHaveBeenCalledWith("target-card");
    expect(appContext.transferScopeItems).not.toHaveBeenCalled();
    expect(within(conflictDialog).getByText("Історичне завдання")).toBeInTheDocument();
    expect(within(conflictDialog).getByText(/Доступно для операції: 0/)).toBeInTheDocument();
    expect(within(conflictDialog).queryByRole("button", { name: /лише відсутні/ })).not.toBeInTheDocument();
    fireEvent.click(within(conflictDialog).getByRole("button", { name: "Скасувати операцію" }));
    expect(appContext.transferScopeItems).not.toHaveBeenCalled();
  });

  it("uses the copied source weight when identifying duplicates", async () => {
    mockTarget();
    renderModal(currentCard);
    openTransfer("Копіювати завдання");
    expect(await screen.findByRole("dialog", { name: /Частина завдань уже є/ })).toBeInTheDocument();
  });

  it("does not warn for a copy when the source weight differs from the target", async () => {
    mockTarget();
    appContext.transferScopeItems.mockResolvedValue({ success: true, message: "Завдання скопійовано" });
    renderModal({ ...currentCard, checklist: [{ ...currentCard.checklist[0], weightSnapshot: { name: "Інша", value: 5 } }] });
    openTransfer("Копіювати завдання");

    await waitFor(() => expect(appContext.transferScopeItems).toHaveBeenCalled());
    expect(screen.queryByRole("dialog", { name: "Схоже завдання вже є" })).not.toBeInTheDocument();
  });

  it("skips the warning when the target has a different weight", async () => {
    mockTarget(targetCard({
      scope: [{ ...targetCard().scope[0], weight_snapshot: { name: "Інша", value: 7 } }],
    }));
    appContext.transferScopeItems.mockResolvedValue({ success: true, message: "Завдання перенесено" });
    renderModal(currentCard);
    openTransfer("Перенести завдання");
    await waitFor(() => expect(appContext.transferScopeItems).toHaveBeenCalled());
    expect(screen.queryByRole("dialog", { name: "Схоже завдання вже є" })).not.toBeInTheDocument();
  });

  it("skips the warning when the executor set differs", async () => {
    mockTarget(targetCard({
      scope: [{ ...targetCard().scope[0], executor_department_ids: [] }],
    }));
    appContext.transferScopeItems.mockResolvedValue({ success: true, message: "Завдання перенесено" });
    renderModal(currentCard);
    openTransfer("Перенести завдання");
    await waitFor(() => expect(appContext.transferScopeItems).toHaveBeenCalled());
    expect(screen.queryByRole("dialog", { name: "Схоже завдання вже є" })).not.toBeInTheDocument();
  });

  it("keeps the lineage conflict blocked without a duplicate override", async () => {
    mockTarget(targetCard({
      scope: [{ ...targetCard().scope[0], lineage_id: "lineage-current" }],
    }));
    renderModal(currentCard);
    openTransfer("Перенести завдання");
    await waitFor(() => expect(apiClient.loadQuarterCards).toHaveBeenCalled());
    expect(appContext.transferScopeItems).not.toHaveBeenCalled();
    expect(await screen.findByRole("dialog", { name: /Частина завдань уже є/ })).toBeInTheDocument();
  });

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
      screen.getByRole("button", { name: "Режим перенесення завдань" }),
    );

    expect(
      screen.getByText("Перенесення вибраних завдань (0)"),
    ).toBeInTheDocument();
  });

  it("opens the copy panel from the actions menu", () => {
    renderModal(currentCard);

    fireEvent.click(
      screen.getByRole("button", { name: "Режим копіювання завдань" }),
    );

    expect(
      screen.getByText("Копіювання вибраних завдань (0)"),
    ).toBeInTheDocument();
  });

  it("disables bulk transfer actions when every scope task is completed", () => {
    renderModal({
      ...currentCard,
      checklist: currentCard.checklist.map((scope) => ({
        ...scope,
        color: "GREEN",
        is_completed: true,
      })),
    });

    expect(screen.getByRole("button", { name: "Режим перенесення завдань" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Режим копіювання завдань" })).toBeDisabled();
  });

  it("selects every transferable task in a group and copies them together", async () => {
    const groupedCard = {
      ...currentCard,
      checklist: [
        { ...currentCard.checklist[0], id: "scope-a", text: "Завдання A", groupId: "group-1" },
        { ...currentCard.checklist[0], id: "scope-b", text: "Завдання B", lineage_id: "lineage-b", groupId: "group-1" },
      ],
    };
    mockTarget();
    appContext.transferScopeItems.mockResolvedValue({ success: true, message: "Завдання скопійовано" });
    renderModal(groupedCard);

    fireEvent.click(screen.getByRole("button", { name: "Режим копіювання завдань" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Вибрати групу Група один" }));
    fireEvent.click(screen.getByRole("button", { name: "Копіювати (2)" }));

    await waitFor(() => expect(appContext.transferScopeItems).toHaveBeenCalledWith(
      "COPY", currentCard.id, ["scope-a", "scope-b"], 2026, "Q4", true, 4,
    ));
  });

  it("lists duplicates and copies only selected tasks absent from the target quarter", async () => {
    const groupedCard = {
      ...currentCard,
      checklist: [
        { ...currentCard.checklist[0], id: "scope-a", text: "Завдання A", groupId: "group-1" },
        { ...currentCard.checklist[0], id: "scope-b", text: "Завдання B", lineage_id: "lineage-b", groupId: "group-1" },
      ],
    };
    mockTarget(targetCard({
      scope: [{
        ...targetCard().scope[0],
        text: "Завдання A у цілі",
        lineage_id: "lineage-current",
        weight_snapshot: { name: "Інша", value: 99 },
      }],
    }));
    appContext.transferScopeItems.mockResolvedValue({ success: true, message: "Завдання скопійовано" });
    renderModal(groupedCard);

    fireEvent.click(screen.getByRole("button", { name: "Режим копіювання завдань" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Вибрати групу Група один" }));
    fireEvent.click(screen.getByRole("button", { name: "Копіювати (2)" }));

    const dialog = await screen.findByRole("dialog", { name: /Частина завдань уже є/ });
    expect(within(dialog).getByText("Завдання A")).toBeInTheDocument();
    expect(within(dialog).getByText(/Дублів: 1.*Доступно для операції: 1/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Скопіювати лише відсутні (1)" }));

    await waitFor(() => expect(appContext.transferScopeItems).toHaveBeenCalledWith(
      "COPY", currentCard.id, ["scope-b"], 2026, "Q4", true, 4,
    ));
  });

  it("allows the card move button to target Q3 during its October grace window", async () => {
    appContext.businessPeriod.quarter = "Q4";
    appContext.businessPeriod.business_date = "2026-10-05";
    appContext.moveCard.mockResolvedValue({ success: true, message: "Картку перенесено" });
    renderModal({ ...currentCard, quarter: "Q4" });

    fireEvent.click(screen.getByRole("button", { name: "Продовжити / Перенести" }));
    fireEvent.change(screen.getByLabelText("Цільовий рік"), { target: { value: "2026" } });
    fireEvent.change(screen.getByLabelText("Квартал"), { target: { value: "Q3" } });
    fireEvent.click(screen.getAllByRole("button", { name: /^Перенести$/ })[0]);

    await waitFor(() => expect(appContext.moveCard).toHaveBeenCalledWith(
      "card-current", 2026, "Q3", true,
    ));
  });

  it("keeps the continuation button working for a later open quarter", async () => {
    appContext.businessPeriod.quarter = "Q4";
    appContext.businessPeriod.business_date = "2026-10-05";
    appContext.continueCard.mockResolvedValue({ success: true, message: "Картку продовжено" });
    renderModal(currentCard);

    fireEvent.click(screen.getByRole("button", { name: "Продовжити / Перенести" }));
    fireEvent.change(screen.getByLabelText("Квартал"), { target: { value: "Q4" } });
    fireEvent.click(screen.getAllByRole("button", { name: /^Продовжити$/ })[0]);

    await waitFor(() => expect(appContext.continueCard).toHaveBeenCalledWith(
      "card-current", 2026, "Q4", true,
    ));
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
