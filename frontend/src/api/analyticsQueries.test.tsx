import { StrictMode } from "react";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAnalyticsQuery } from "./hooks";

const AnalyticsProbe = () => {
  useAnalyticsQuery(
    "quarterly",
    "overview",
    new URLSearchParams({ year: "2026", quarter: "Q3" }),
  );
  return null;
};

describe("analytics queries in React StrictMode", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reuses the first in-flight request instead of aborting and repeating it", async () => {
    let finishRequest!: (response: Response) => void;
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          finishRequest = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    });

    const view = render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <AnalyticsProbe />
        </QueryClientProvider>
      </StrictMode>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][1]?.signal).toBeUndefined();
    finishRequest(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await waitFor(() => expect(client.isFetching()).toBe(0));
    view.unmount();
    client.clear();
  });
});
