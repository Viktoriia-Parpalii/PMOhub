import { describe, expect, it } from "vitest";
import { JsonExportSerializer } from "./json-export.serializer";
import { ExportSummaryService } from "./export-summary.service";

const decimal = (value: number) => ({ toNumber: () => value, toString: () => String(value) });

describe("JsonExportSerializer", () => {
  const serializer = new JsonExportSerializer(new ExportSummaryService());
  const actor = {
    id: "actor",
    name: "Адміністратор",
    email: "admin@example.com",
    role: "SUPER_ADMIN" as const,
    must_change_password: false,
  };

  it("never exposes scope text and includes only selected custom fields in AI JSON", () => {
    const dataset = {
      years: [],
      departments: [],
      customFields: [
        { id: "11111111-1111-4111-8111-111111111111", name: "Бюджет", fieldType: "NUMBER", entityType: "project", isActive: true, options: [] },
        { id: "22222222-2222-4222-8222-222222222222", name: "Таємне поле", fieldType: "TEXT", entityType: "project", isActive: true, options: [] },
      ],
      cards: [
        {
          id: "card",
          initiativeYear: { year: 2026, strategicGoal: "Ціль", initiative: { kind: "PROJECT", name: "Проєкт" } },
          quarter: 1,
          manager: { name: "Менеджер" },
          priority: { name: "Високий" },
          status: { code: "ACTIVE", name: "Активний" },
          sizeSnapshotName: "M",
          totalWeight: decimal(5),
          departments: [],
          notes: "<p>Примітка</p>",
          customFieldValues: [
            { definitionId: "11111111-1111-4111-8111-111111111111", numberValue: decimal(100), booleanValue: null, dateValue: null, textValue: null, optionValue: null },
            { definitionId: "22222222-2222-4222-8222-222222222222", numberValue: null, booleanValue: null, dateValue: null, textValue: "Не показувати", optionValue: null },
          ],
          scopeItems: [
            { text: "Секретний текст завдання", statusCode: "YELLOW", executors: [], weightSnapshotValue: decimal(5) },
          ],
        },
      ],
    };
    const result = serializer.ai(
      dataset as never,
      {
        years: { from: 2026, to: 2026 },
        periods: ["Q1"],
        kinds: ["PROJECT"],
        privacy: {
          include_name: true,
          include_strategic_goal: false,
          include_manager: false,
          include_departments: false,
          include_notes: false,
          selected_custom_field_ids: ["11111111-1111-4111-8111-111111111111"],
        },
      },
      actor,
    );
    const json = JSON.stringify(result);
    expect(json).not.toContain("Секретний текст завдання");
    expect(json).not.toContain("Таємне поле");
    expect(json).not.toContain("Примітка");
    expect(json).not.toContain("Менеджер");
    expect(json).toContain("Бюджет");
    expect(json).toContain('"YELLOW":1');
  });

  it("documents auth redactions in full snapshot", () => {
    const data = {
      users: [{ id: "user", email: "user@example.com", normalizedEmail: "user@example.com" }],
      roles: [], role_permissions: [], departments: [], managers: [], priorities: [],
      card_status_definitions: [], task_weight_definitions: [], initiative_size_definitions: [],
      custom_field_definitions: [], custom_field_options: [], initiatives: [], initiative_years: [],
      preparation_stages: [], preparation_stage_departments: [], quarter_cards: [],
      quarter_card_departments: [], scope_items: [], scope_item_executors: [],
      quarter_card_custom_field_values: [], audit_events: [],
    };
    const json = JSON.stringify(serializer.full(data as never, actor));
    expect(json).toContain("users.password_hash");
    expect(json).toContain("refresh_tokens");
    expect(json).not.toContain("passwordHash");
    expect(json).toContain("normalized_email");
    expect(json).not.toContain("normalizedEmail");
  });
});
