import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppContent } from "./AppContent";

vi.mock("./store", () => ({
  useAppContext: () => ({
    currentUser: {
      id: "temporary-user",
      name: "Тимчасовий користувач",
      email: "temporary@example.com",
      role: "USER",
      must_change_password: true,
    },
    changePassword: vi.fn(),
    logout: vi.fn(),
    departments: [],
    rolePermissions: [],
    isHydrating: false,
    setInitiativeDataScope: vi.fn(),
  }),
}));

describe("AppContent forced password flow", () => {
  it("renders a standalone password page before mounting application analytics", () => {
    render(<AppContent />);

    expect(
      screen.getByRole("heading", { name: "Створіть новий пароль" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Після зміни пароля ви автоматично перейдете до аналітики.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("Тимчасовий пароль")).not.toBeInTheDocument();
    expect(screen.getByText("Новий пароль")).toBeVisible();
    expect(screen.getByText("Підтвердження пароля")).toBeVisible();
    expect(screen.queryByText("Аналітика")).not.toBeInTheDocument();
    expect(screen.queryByText("Не вдалося завантажити аналітику.")).not.toBeInTheDocument();
  });
});
