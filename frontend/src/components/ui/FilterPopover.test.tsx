import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilterPopover } from "./FilterPopover";

describe("FilterPopover", () => {
  it("shows the active count and closes with the done button", () => {
    render(
      <FilterPopover activeCount={2} onReset={vi.fn()}>
        <label>
          Менеджер
          <select aria-label="Менеджер"><option>Всі менеджери</option></select>
        </label>
      </FilterPopover>,
    );

    const trigger = screen.getByRole("button", { name: "Фільтри" });
    expect(screen.getByLabelText("Активних фільтрів: 2")).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Налаштування фільтрів" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Готово" }));
    expect(screen.queryByRole("dialog", { name: "Налаштування фільтрів" })).not.toBeInTheDocument();
  });

  it("resets filters and closes on Escape", () => {
    const onReset = vi.fn();
    render(
      <FilterPopover activeCount={1} onReset={onReset}>
        <span>Вміст</span>
      </FilterPopover>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Фільтри" }));
    fireEvent.click(screen.getByRole("button", { name: "Скинути" }));
    expect(onReset).toHaveBeenCalledOnce();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
