import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BacklogModal } from "./BacklogModal";
import { ResumeBacklogModal, type ResumeCandidate } from "./ResumeBacklogModal";

const context = vi.hoisted(() => ({
  projects: [], tasks: [],
  updateProject: vi.fn(), updateTask: vi.fn(),
  createBacklogWithCards: vi.fn(), resumeBacklogYear: vi.fn(),
  businessPeriod: { year: 2029 },
}));
vi.mock("../../../app/store", () => ({ useAppContext: () => context }));
vi.mock("../../../api/apiClient", () => ({
  loadInitiativeRelationCandidates: vi.fn(async () => []),
}));

const candidate: ResumeCandidate = {
  kind: "project", name: "Проєкт А", sourceYearId: "year-2026",
  sourceYear: 2026, sourceRevision: 3, targetYear: 2029,
};

describe("backlog resume flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers resume when a newly entered name already belongs to an older project", async () => {
    context.createBacklogWithCards.mockResolvedValue({
      success: false, message: "Проєкт з такою назвою вже існує.",
      errorCode: "INITIATIVE_NAME_CONFLICT",
      errorDetails: {
        source_year_id: "year-2026", source_year: 2026,
        source_revision: 3, target_year_exists: false,
      },
    });
    const onResumeCandidate = vi.fn();
    render(<BacklogModal type="PROJECTS" editItem={null} selectedYear={2029}
      onClose={vi.fn()} onResumeCandidate={onResumeCandidate} />);
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Проєкт А" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));
    await waitFor(() => expect(onResumeCandidate).toHaveBeenCalledWith({ ...candidate, strategicGoal: "" }));
  });

  it("does not offer resume when that year already exists", async () => {
    context.createBacklogWithCards.mockResolvedValue({
      success: false, message: "Проєкт з такою назвою вже існує.",
      errorCode: "INITIATIVE_NAME_CONFLICT",
      errorDetails: { source_year_id: "year-2026", source_year: 2026,
        source_revision: 3, target_year_exists: true },
    });
    const onResumeCandidate = vi.fn();
    render(<BacklogModal type="PROJECTS" editItem={null} selectedYear={2029}
      onClose={vi.fn()} onResumeCandidate={onResumeCandidate} />);
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Проєкт А" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));
    await waitFor(() => expect(context.createBacklogWithCards).toHaveBeenCalled());
    expect(onResumeCandidate).not.toHaveBeenCalled();
  });

  it("creates only the selected new year after confirmation", async () => {
    context.resumeBacklogYear.mockResolvedValue({ success: true, message: "Відновлено" });
    const onSuccess = vi.fn();
    render(<ResumeBacklogModal candidate={candidate} years={[2026, 2029, 2030]}
      onClose={vi.fn()} onSuccess={onSuccess} />);
    expect(screen.queryByRole("option", { name: "2026" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Стратегічна задача нового року"),
      { target: { value: "Нова ціль" } });
    fireEvent.click(screen.getByRole("button", { name: "Відновити у 2029 році" }));
    await waitFor(() => expect(context.resumeBacklogYear).toHaveBeenCalledWith(
      "project", "year-2026", 3, 2029, "Нова ціль",
    ));
    expect(onSuccess).toHaveBeenCalledWith(2029);
  });
});
