import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NOTIFICATION_CONFIG, NOTIFICATION_KINDS } from "../../shared/constants/notificationConstants";
import { notify, ToastNotifications } from "./ToastNotifications";

describe("ToastNotifications", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows notifications and keeps an error visible longer than a success", () => {
    vi.useFakeTimers();
    render(<ToastNotifications />);

    act(() => {
      notify(NOTIFICATION_KINDS.success, "toast-success-duration-test");
      notify(NOTIFICATION_KINDS.error, "toast-error-duration-test");
    });

    expect(screen.getByText("toast-success-duration-test")).toBeInTheDocument();
    expect(screen.getByText("toast-error-duration-test")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(NOTIFICATION_CONFIG.durationMs.success));
    expect(screen.queryByText("toast-success-duration-test")).not.toBeInTheDocument();
    expect(screen.getByText("toast-error-duration-test")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(
      NOTIFICATION_CONFIG.durationMs.error - NOTIFICATION_CONFIG.durationMs.success,
    ));
    expect(screen.queryByText("toast-error-duration-test")).not.toBeInTheDocument();
  });
});

