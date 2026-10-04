import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DepartmentRoleFilter } from "./DepartmentRoleFilter";

describe("DepartmentRoleFilter", () => {
  it("maps the two checkboxes to the supported relation values", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DepartmentRoleFilter value="ANY" disabled={false} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Виконавці" }));
    expect(onChange).toHaveBeenLastCalledWith("INVOLVED");

    rerender(
      <DepartmentRoleFilter value="INVOLVED" disabled={false} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Виконавці" }));
    expect(onChange).toHaveBeenLastCalledWith("ANY");
  });

  it("does not allow the last selected role to be removed", () => {
    const onChange = vi.fn();
    render(
      <DepartmentRoleFilter
        value="EXECUTOR"
        disabled={false}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Виконавці" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
