import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsSection } from "./SettingsSection";

const { updateFilterOptionVisibility } = vi.hoisted(() => ({
  updateFilterOptionVisibility: vi.fn(),
}));

vi.mock("../../../../app/store", () => ({
  useAppContext: () => ({
    currentUser: { id: "admin", role: "ADMIN" },
    rolePermissions: [
      { role: "ADMIN", canAccessAdmin: true, isReadOnly: false },
    ],
    systemSettings: {
      filterOptionVisibility: {
        revision: 4,
        analytics: "ACTIVE_ONLY",
        portfolio: "ACTIVE_ONLY",
        backlog: "ACTIVE_ONLY",
      },
    },
    updateFilterOptionVisibility,
  }),
}));

describe("SettingsSection", () => {
  beforeEach(() => {
    updateFilterOptionVisibility.mockReset();
    updateFilterOptionVisibility.mockResolvedValue({
      success: true,
      message: "Збережено",
      data: {
        revision: 5,
        analytics: "ALL",
        portfolio: "ACTIVE_ONLY",
        backlog: "ACTIVE_ONLY",
      },
    });
  });

  it("enables save only after a change and submits the complete settings document", async () => {
    render(<SettingsSection />);
    const save = screen.getByRole("button", { name: "Зберегти зміни" });
    expect(save).toBeDisabled();

    const analytics = screen.getByRole("radiogroup", {
      name: "Відображення записів: Аналітика",
    });
    fireEvent.click(within(analytics).getByRole("radio", { name: "Усі записи" }));
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() =>
      expect(updateFilterOptionVisibility).toHaveBeenCalledWith({
        revision: 4,
        analytics: "ALL",
        portfolio: "ACTIVE_ONLY",
        backlog: "ACTIVE_ONLY",
      }),
    );
  });
});
