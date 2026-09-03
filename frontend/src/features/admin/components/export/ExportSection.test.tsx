import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExportSection } from "./ExportSection";

const api = vi.hoisted(() => ({
  availability: vi.fn(),
  preview: vi.fn(),
  excel: vi.fn(),
  ai: vi.fn(),
  full: vi.fn(),
}));

vi.mock("../../../../app/store", () => ({
  useAppContext: () => ({
    currentUser: { id: "user", role: "SUPER_ADMIN" },
    businessPeriod: {
      year: 2026,
      quarter: "Q3",
      business_date: "2026-09-03",
      time_zone: "Europe/Kyiv",
    },
  }),
}));
vi.mock("./exportApi", () => ({
  loadExportAvailability: api.availability,
  loadExportPreview: api.preview,
  downloadExcel: api.excel,
  downloadAiJson: api.ai,
  downloadFullJson: api.full,
  saveDownloadedFile: vi.fn(),
}));

describe("ExportSection", () => {
  beforeEach(() => {
    api.availability.mockImplementation(
      (_signal: AbortSignal, includeFields: boolean) =>
        Promise.resolve({
          years: [2026],
          counts: {},
          custom_fields: includeFields
            ? [
                {
                  id: "11111111-1111-4111-8111-111111111111",
                  name: "Конфіденційний коментар",
                  entity_type: "project",
                  field_type: "RICHTEXT",
                  is_active: true,
                },
              ]
            : [],
        }),
    );
    api.preview.mockResolvedValue({
      total: 2,
      backlog_records: 1,
      quarter_cards: 1,
      by_year: { 2026: 2 },
      by_period: { BACKLOG: 1, Q1: 1 },
      by_kind: { PROJECT: 2 },
      matrix: [],
    });
  });

  const renderSection = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <ExportSection />
      </QueryClientProvider>,
    );
  };

  it("loads custom fields only after opening AI privacy settings", async () => {
    renderSection();
    await waitFor(() => expect(api.availability).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Конфіденційний коментар")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Налаштувати приватність/i }));
    expect(await screen.findByText("Конфіденційний коментар")).toBeInTheDocument();
    expect(api.availability).toHaveBeenCalledTimes(2);
  });

  it("requires explicit text confirmation for full snapshot", async () => {
    renderSection();
    fireEvent.click(screen.getByRole("button", { name: /Створити повний snapshot/i }));
    const confirm = screen.getByRole("button", { name: /Завантажити snapshot/i });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("ЕКСПОРТУВАТИ"), {
      target: { value: "ЕКСПОРТУВАТИ" },
    });
    expect(confirm).toBeEnabled();
  });
});
