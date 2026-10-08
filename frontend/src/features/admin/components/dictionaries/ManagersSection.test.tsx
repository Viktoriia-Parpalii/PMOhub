import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManagersSection } from "./ManagersSection";

const mocks = vi.hoisted(() => ({
  updateManager: vi.fn(async () => ({ success: true, message: "Оновлено" })),
}));

vi.mock("../../../../app/store", () => ({
  useAppContext: () => ({
    departments: [
      { id: "department-1", name: "ІТ", capacity_limit_points: 10, is_active: true },
      { id: "department-2", name: "Фінанси", capacity_limit_points: 10, is_active: true },
    ],
    managers: [
      { id: "manager-1", name: "Ірина Коваль", department_id: "department-1", is_active: true },
    ],
    addManager: vi.fn(),
    updateManager: mocks.updateManager,
    deleteManager: vi.fn(),
    checkManagerDeletion: vi.fn(),
  }),
}));

describe("ManagersSection editing", () => {
  it("updates the manager name and department without a history flow", async () => {
    render(<ManagersSection requestProtectedDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Редагувати менеджера" }));
    fireEvent.change(screen.getByLabelText("Ім’я менеджера"), {
      target: { value: "Ірина Мельник" },
    });
    fireEvent.change(screen.getByLabelText("Відділ"), {
      target: { value: "department-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));
    await waitFor(() =>
      expect(mocks.updateManager).toHaveBeenCalledWith("manager-1", {
        name: "Ірина Мельник",
        department_id: "department-2",
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
