import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortfolioResultSummary } from "./PortfolioResultSummary";

describe("PortfolioResultSummary", () => {
  it.each([
    [1, "проєкт"],
    [2, "проєкти"],
    [5, "проєктів"],
    [11, "проєктів"],
  ])("uses the correct project label for %i", (count, label) => {
    render(<PortfolioResultSummary count={count} kind="PROJECT" />);
    expect(screen.getByText(`Знайдено ${count} ${label}`)).toBeInTheDocument();
  });

  it.each([
    [1, "операційну задачу"],
    [3, "операційні задачі"],
    [8, "операційних задач"],
  ])("uses the correct task label for %i", (count, label) => {
    render(<PortfolioResultSummary count={count} kind="OPERATIONAL_TASK" />);
    expect(screen.getByText(`Знайдено ${count} ${label}`)).toBeInTheDocument();
  });
});
