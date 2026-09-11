import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BacklogTabs } from "./BacklogTabs";

describe("BacklogTabs", () => {
  it("shows filtered and total counts separated by a slash", () => {
    render(
      <BacklogTabs
        activeTab="PROJECTS"
        projectCount={{ filtered: 12, total: 148 }}
        taskCount={{ filtered: 7, total: 80 }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Проєкти \(12 \/ 148\)/)).toBeInTheDocument();
    expect(
      screen.getByText(/Операційні задачі \(7 \/ 80\)/),
    ).toBeInTheDocument();
  });
});
