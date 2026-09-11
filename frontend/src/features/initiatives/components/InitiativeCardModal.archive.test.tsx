import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
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

describe("InitiativeCardModal archived correction mode", () => {
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
