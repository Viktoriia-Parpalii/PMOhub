import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnalyticsResponse } from "./analyticsTypes";
import { RiskList } from "./Dashboard";

describe("RiskList", () => {
  it("opens the complete planning-control drilldown from an individual preview row", () => {
    const onOpen = vi.fn();
    const data = {
      risks: [
        {
          id: "card-1",
          name: "Картка без скоупу",
          risks: ["NO_SCOPE"],
        },
      ],
    } as AnalyticsResponse;

    render(<RiskList data={data} total={3} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: /Картка без скоупу/i }));

    expect(onOpen).toHaveBeenCalledWith("Контроль плану", { risk: "ANY" });
    expect(screen.getByRole("button", { name: "Переглянути всі записи (3)" })).toBeInTheDocument();
  });
});
