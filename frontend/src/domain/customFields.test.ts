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

  it("hides an active field created after an archived period locked", () => {
    expect(
      shouldDisplayCustomField(
        field({ createdAt: "2026-05-01T00:00:00.000Z" }),
        [
          {
            custom_fields: {},
            is_locked: true,
            locked_at: "2026-04-15T00:00:00.000Z",
          },
        ],
      ),
    ).toBe(false);
  });

  it("shows an active field that existed before archive locking", () => {
    expect(
      shouldDisplayCustomField(
        field({ createdAt: "2026-03-01T00:00:00.000Z" }),
        [
          {
            custom_fields: {},
            is_locked: true,
            locked_at: "2026-04-15T00:00:00.000Z",
          },
        ],
      ),
    ).toBe(true);
  });

  it("keeps a stored archived value even if the definition was created later", () => {
    expect(
      shouldDisplayCustomField(
        field({
          isActive: false,
          createdAt: "2026-05-01T00:00:00.000Z",
        }),
        [
          {
            custom_fields: { "field-1": "Історичне значення" },
            is_locked: true,
            locked_at: "2026-04-15T00:00:00.000Z",
          },
        ],
      ),
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
