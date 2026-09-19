import { describe, expect, it } from "vitest";
import { activeReferenceId, uuidOrUndefined } from "./api-contract-mappers";

describe("API mapping boundary", () => {
  it("keeps canonical UUIDs and rejects temporary UI identifiers", () => {
    expect(uuidOrUndefined("00000000-0000-4000-8000-000000000001")).toBe("00000000-0000-4000-8000-000000000001");
    expect(uuidOrUndefined("00000000-0000-4000-8000-000000000002")).toBe("00000000-0000-4000-8000-000000000002");
    expect(uuidOrUndefined("SCOPE-local-id")).toBeUndefined();
  });

  it("resolves deterministic system IDs from an active dictionary", () => {
    const systemId = "00000000-0000-4000-8000-000000000002";
    const definitions = [{ id: systemId, is_active: true }, { id: "inactive", is_active: false }];
    expect(activeReferenceId(systemId, definitions)).toBe(systemId);
    expect(activeReferenceId(undefined, definitions, systemId)).toBe(systemId);
    expect(activeReferenceId("inactive", definitions, systemId)).toBeUndefined();
  });
});
