import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useInitiativeListFilters } from "./useInitiativeListFilters";
import { queryKeys } from "../../api/queryClient";

describe("useInitiativeListFilters", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces text but applies dropdown filters immediately", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useInitiativeListFilters());

    act(() => result.current.setName("  План  "));
    expect(result.current.filters.name).toBeUndefined();

    act(() => result.current.setManagerId("manager-1"));
    expect(result.current.filters.manager_id).toBe("manager-1");

    act(() => vi.advanceTimersByTime(349));
    expect(result.current.filters.name).toBeUndefined();
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.filters.name).toBe("План");
  });

  it("resets applied values immediately without waiting for debounce", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useInitiativeListFilters());
    act(() => {
      result.current.setName("План");
      result.current.setPriorityId("priority-1");
      vi.advanceTimersByTime(350);
    });
    act(() => result.current.reset());

    expect(result.current.filters).toEqual({
      name: undefined,
      strategic_goal: undefined,
      manager_id: undefined,
      priority_id: undefined,
    });
  });

  it("keeps server cache entries separate for different filters", () => {
    expect(
      queryKeys.portfolioCards("project", 2026, "Q2", {
        manager_id: "manager-1",
      }),
    ).not.toEqual(
      queryKeys.portfolioCards("project", 2026, "Q2", {
        manager_id: "manager-2",
      }),
    );
  });
});
