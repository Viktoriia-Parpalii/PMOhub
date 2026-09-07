import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppSidebar } from "./AppSidebar";

const user = {
  id: "user-1",
  name: "Користувач",
  email: "user@example.com",
  role: "USER",
  must_change_password: false,
};

describe("AppSidebar browser navigation", () => {
  it("uses real links and intercepts only a regular primary click", () => {
    const onSelectTab = vi.fn();
    render(
      <AppSidebar
        currentUser={user}
        departmentName=""
        roleLabel="Користувач"
        tabs={[
          {
            id: "projects",
            label: "Проєкти",
            icon: <span aria-hidden="true">P</span>,
            href: "/projects",
          },
        ]}
        activeTab="projects"
        isMobileMenuOpen={false}
        isProfileMenuOpen={false}
        onSelectTab={onSelectTab}
        onCloseMobileMenu={vi.fn()}
        onToggleProfileMenu={vi.fn()}
        onCloseProfileMenu={vi.fn()}
        onChangePassword={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    const link = screen.getByRole("link", { name: "Проєкти" });
    expect(link).toHaveAttribute("href", "/projects");
    expect(link).toHaveAttribute("aria-current", "page");
    // Keep jsdom from attempting a real browser navigation after the
    // modifier-click while still exercising the component handler.
    link.addEventListener("click", (event) => event.preventDefault());

    fireEvent.click(link, { ctrlKey: true });
    expect(onSelectTab).not.toHaveBeenCalled();

    fireEvent.click(link);
    expect(onSelectTab).toHaveBeenCalledWith("projects");
  });
});
