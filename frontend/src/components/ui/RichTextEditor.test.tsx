import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichTextPreview, sanitizeRichText } from "./RichTextEditor";

describe("sanitizeRichText", () => {
  it("preserves ordered and unordered list semantics", () => {
    const value = "<ul><li>Маркер</li></ul><ol><li>Номер</li></ol>";

    expect(sanitizeRichText(value)).toBe(value);
  });

  it("removes unsafe attributes while keeping supported formatting", () => {
    expect(sanitizeRichText('<ol onclick="alert(1)"><li><strong>Текст</strong></li></ol>'))
      .toBe("<ol><li><strong>Текст</strong></li></ol>");
  });

  it("shows the full formatted overflow only while the preview is hovered", () => {
    const { container } = render(
      <RichTextPreview value="<ol><li>Перший</li><li>Останній повний рядок</li></ol>" />,
    );
    const wrapper = container.firstElementChild as HTMLDivElement;
    const preview = wrapper.firstElementChild as HTMLDivElement;
    Object.defineProperty(preview, "scrollHeight", { configurable: true, value: 120 });
    Object.defineProperty(preview, "clientHeight", { configurable: true, value: 20 });

    fireEvent.pointerEnter(wrapper, { clientX: 40, clientY: 40 });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Останній повний рядок");
    expect(screen.getByRole("tooltip").querySelector("ol")).not.toBeNull();

    fireEvent.pointerLeave(wrapper);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("hides the tooltip when the pointer leaves the preview bounds", () => {
    const { container } = render(
      <RichTextPreview value="Довга примітка, яка не поміщається в превʼю" />,
    );
    const wrapper = container.firstElementChild as HTMLDivElement;
    const preview = wrapper.firstElementChild as HTMLDivElement;
    Object.defineProperty(preview, "scrollHeight", {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(preview, "clientHeight", {
      configurable: true,
      value: 20,
    });
    preview.getBoundingClientRect = () =>
      ({
        left: 10,
        right: 210,
        top: 10,
        bottom: 50,
        width: 200,
        height: 40,
        x: 10,
        y: 10,
        toJSON: () => ({}),
      }) as DOMRect;

    fireEvent.pointerEnter(wrapper, { clientX: 40, clientY: 30 });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    const pointerMove = (clientX: number, clientY: number) => {
      const event = new Event("pointermove");
      Object.defineProperties(event, {
        clientX: { value: clientX },
        clientY: { value: clientY },
      });
      fireEvent(window, event);
    };

    pointerMove(120, 30);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    pointerMove(220, 30);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
