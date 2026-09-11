import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Login } from "./Login";

vi.mock("../../app/store", () => ({
  useAppContext: () => ({
    users: [],
    authenticate: vi.fn(),
    departments: [],
    backendEnabled: true,
  }),
}));

describe("Login password visibility", () => {
  it("renders only the application-owned password visibility control", () => {
    render(<Login />);

    expect(screen.getAllByRole("button", { name: "Показати пароль" })).toHaveLength(1);
  });
});
