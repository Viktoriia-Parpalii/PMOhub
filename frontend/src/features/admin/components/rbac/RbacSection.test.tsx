import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RbacSection } from "./RbacSection";

const { resetUserPassword } = vi.hoisted(() => ({
  resetUserPassword: vi.fn(),
}));

vi.mock("../../../../app/store", () => ({
  useAppContext: () => ({
    rolePermissions: [],
    updateRolePermission: vi.fn(),
    users: [
      {
        id: "current-user",
        name: "Поточний користувач",
        email: " Current@Example.com ",
        role: "SUPER_ADMIN",
      },
      {
        id: "other-user",
        name: "Інший користувач",
        email: "other@example.com",
        role: "USER",
      },
    ],
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    departments: [],
    addUser: vi.fn(),
    resetUserPassword,
    currentUser: {
      id: "different-session-id",
      name: "Поточний користувач",
      email: "current@example.com",
      role: "SUPER_ADMIN",
    },
    enableAdminData: vi.fn(),
    disableAdminData: vi.fn(),
  }),
}));

describe("RbacSection temporary password flow", () => {
  beforeEach(() => {
    resetUserPassword.mockReset();
    resetUserPassword.mockResolvedValue({
      success: true,
      message: "Пароль створено",
      data: { temporary_password: "OneTime-Password-123" },
    });
  });

  it("disables reset for the current email and shows the password for another user", async () => {
    render(<RbacSection />);

    const currentRow = screen.getByText("Поточний користувач").closest("tr");
    const otherRow = screen.getByText("Інший користувач").closest("tr");
    expect(currentRow).not.toBeNull();
    expect(otherRow).not.toBeNull();

    expect(
      within(currentRow!).getByRole("button", { name: "Тимчасовий пароль" }),
    ).toBeDisabled();

    fireEvent.click(
      within(otherRow!).getByRole("button", { name: "Тимчасовий пароль" }),
    );

    await waitFor(() => expect(resetUserPassword).toHaveBeenCalledWith("other-user"));
    expect(await screen.findByText("OneTime-Password-123")).toBeVisible();
    expect(screen.getByTitle("Скопіювати пароль")).toBeVisible();
  });
});
