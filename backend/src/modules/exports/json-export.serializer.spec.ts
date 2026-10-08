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

  it("builds a management report without technical IDs or scope text", () => {
    const dataset = {
      years: [],
      departments: [],
      departmentCapacityHistory: [],
      customFields: [
        { id: "11111111-1111-4111-8111-111111111111", name: "Бюджет", fieldType: "NUMBER", entityType: "project", isActive: true, options: [] },
        { id: "22222222-2222-4222-8222-222222222222", name: "Таємне поле", fieldType: "TEXT", entityType: "project", isActive: true, options: [] },
      ],
      cards: [
        {
          id: "card",
          initiativeYear: { year: 2026, strategicGoal: "Ціль", initiative: { id: "initiative-secret-id", kind: "PROJECT", name: "Проєкт" } },
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
          include_manager: false,
          include_departments: false,
          include_notes: false,
          selected_custom_field_ids: ["11111111-1111-4111-8111-111111111111"],
        },
      },
    );
    const json = JSON.stringify(result);
    expect(result.schema_version).toBe("2.0");
    expect(result.report_context.scope_confidentiality).toBe("AGGREGATED_ONLY");
    expect(result.initiatives[0]).toMatchObject({
      name: "Проєкт",
      scope: { total: 1, in_progress: 1, completion_rate_pct: 50 },
    });
    expect(json).not.toContain("Секретний текст завдання");
    expect(json).not.toContain("Таємне поле");
    expect(json).not.toContain("Примітка");
    expect(json).not.toContain("Ціль");
    expect(json).not.toContain("strategic_goal");
    expect(result.initiatives[0]).not.toHaveProperty("manager");
    expect(json).not.toContain("initiative-secret-id");
    expect(json).not.toContain('"record_ref"');
    expect(json).not.toContain('"generated_by"');
    expect(json).not.toContain('"filters"');
    expect(json).toContain("Бюджет");
    expect(json).not.toContain("11111111-1111-4111-8111-111111111111");
  });

  it("keeps department capacity anonymous when department privacy is disabled", () => {
    const dataset = {
      years: [],
      customFields: [],
      departments: [{ id: "department-id", name: "Секретний відділ", capacityLimitPoints: decimal(999) }],
      departmentCapacityHistory: [
        { departmentId: "department-id", limitPoints: decimal(20), effectiveYear: 2026, effectiveQuarter: 1, changedAt: new Date("2026-01-01Z") },
      ],
      cards: [],
    };
    const result = serializer.ai(dataset as never, {
      years: { from: 2026, to: 2026 },
      periods: ["Q1"],
      kinds: ["PROJECT"],
      privacy: {
        include_manager: false,
        include_departments: false,
        include_notes: false,
        selected_custom_field_ids: [],
      },
    });
    expect(result.executive_metrics.capacity_limit).toBe(20);
    expect(result.breakdowns.department_capacity).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("Секретний відділ");
  });

  it("documents auth redactions in full snapshot", () => {
    const data = {
      users: [{ id: "user", email: "user@example.com", normalizedEmail: "user@example.com" }],
      roles: [], role_permissions: [], departments: [], department_capacity_history: [], managers: [], priorities: [],
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
