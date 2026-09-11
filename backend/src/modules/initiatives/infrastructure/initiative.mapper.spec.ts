import { describe, expect, it } from 'vitest';
import { mapCardSummary } from './initiative.mapper';

describe('mapCardSummary', () => {
  it('keeps preview fields but omits detail-only scope state', () => {
    const result = mapCardSummary({
      id: 'card-1',
      initiativeYearId: 'year-1',
      initiativeYear: {
        initiativeId: 'initiative-1',
        year: 2027,
        strategicGoal: 'Goal',
        initiative: { kind: 'PROJECT', name: 'Initiative' },
      },
      quarter: 2,
      managerId: null,
      manager: null,
      priorityId: null,
      priority: null,
      departments: [{ departmentId: 'department-1' }],
      statusId: 'status-1',
      status: { id: 'status-1', code: 'DEFAULT', name: 'Не визначено', color: '#94a3b8' },
      notes: '<ol><li>Перший пункт</li></ol>',
      customFieldValues: [
        { definitionId: 'checkbox-field', textValue: null, numberValue: null, booleanValue: true, dateValue: null, optionValue: null },
        { definitionId: 'unchecked-field', textValue: null, numberValue: null, booleanValue: false, dateValue: null, optionValue: null },
      ],
      totalWeight: { toNumber: () => 3 },
      sizeDefinitionId: null,
      sizeSnapshotName: 'S',
      movedFromYear: null,
      movedFromQuarter: null,
      revision: 4,
      scopeItems: [{
        id: 'scope-1',
        lineageId: 'lineage-1',
        text: 'Завдання',
        statusCode: 'YELLOW',
        weightDefinitionId: 'weight-1',
        weightSnapshotName: 'Medium',
        weightSnapshotValue: { toNumber: () => 3 },
        revision: 2,
        executors: [{ departmentId: 'department-1' }],
      }],
    });

    expect(result.notes).toBe('<ol><li>Перший пункт</li></ol>');
    expect(result.custom_fields).toEqual({ 'checkbox-field': true, 'unchecked-field': false });
    expect(result.scope).toEqual([{
      id: 'scope-1',
      text: 'Завдання',
      status_code: 'YELLOW',
      executor_department_ids: ['department-1'],
    }]);
    expect(result.scope[0]).not.toHaveProperty('revision');
    expect(result.scope[0]).not.toHaveProperty('weight_definition_id');
  });
});
