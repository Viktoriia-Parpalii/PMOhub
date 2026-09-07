import { describe, expect, it } from "vitest";
import { CustomFieldDef } from "../shared/types";
import {
  customFieldDisplayValue,
  shouldDisplayCustomField,
} from "./customFields";

const field = (patch: Partial<CustomFieldDef> = {}): CustomFieldDef => ({
  id: "field-1",
  entityType: "project",
  name: "Додаткове поле",
  type: "TEXT",
  isRequired: false,
  isActive: true,
  ...patch,
});

describe("custom field historical visibility", () => {
  it("hides an inactive field when no displayed card owns a value", () => {
    expect(
      shouldDisplayCustomField(field({ isActive: false }), [
        { custom_fields: {} },
      ]),
    ).toBe(false);
  });

  it("shows an inactive field only for a stored historical value", () => {
    expect(
      shouldDisplayCustomField(field({ isActive: false }), [
        { custom_fields: { "field-1": false } },
      ]),
    ).toBe(true);
  });

  it("distinguishes false and zero from a missing value", () => {
    expect(customFieldDisplayValue(field({ type: "CHECKBOX" }), false)).toBe(
      "Ні",
    );
    expect(
      customFieldDisplayValue(field({ type: "CHECKBOX" }), undefined),
    ).toBe("—");
    expect(customFieldDisplayValue(field({ type: "NUMBER" }), 0)).toBe("0");
  });
});
