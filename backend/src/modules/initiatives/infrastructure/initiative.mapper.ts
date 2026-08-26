const customValue = (item: { textValue: string | null; numberValue: { toNumber(): number } | null; booleanValue: boolean | null }) =>
  item.numberValue?.toNumber() ?? item.booleanValue ?? item.textValue;

export const mapPassport = (passport: any) => ({
  name: passport.name,
  strategic_goal: passport.strategicGoal ?? undefined,
  manager_id: passport.managerId ?? undefined,
  priority: passport.priorityId ?? undefined,
  notes: passport.notes ?? undefined,
  implementer_dept_ids: passport.departments.filter((item: any) => item.involvement === 'IMPLEMENTER').map((item: any) => item.departmentId),
  cross_functional_dept_ids: passport.departments.filter((item: any) => item.involvement === 'CROSS_FUNCTIONAL').map((item: any) => item.departmentId),
  custom_fields: Object.fromEntries(passport.customValues.map((item: any) => [item.definitionId, customValue(item)])),
});

export const mapChecklist = (item: any) => ({
  id: item.id,
  text: item.text,
  is_completed: item.isCompleted,
  color: item.status?.code ?? 'DEFAULT',
  status_id: item.status?.id ?? undefined,
  status_code: item.status?.code ?? 'DEFAULT',
  weightId: item.weightDefinitionId ?? undefined,
  weightSnapshot: { definitionId: item.weightDefinitionId ?? undefined, name: item.weightSnapshotName, value: item.weightSnapshotValue.toNumber() },
  assigneeIds: item.assignees.map((link: any) => link.userId),
  implementer_dept_ids: item.departments.map((link: any) => link.departmentId),
  moved_from: item.movedFromYear ? `${item.movedFromQuarter} ${item.movedFromYear}` : undefined,
});

export const passportInclude = {
  departments: true,
  customValues: true,
} as const;

export const cardInclude = {
  initiativeYear: { include: { initiative: true } },
  passport: { include: passportInclude },
  status: true,
  checklistItems: { include: { status: true, departments: true, assignees: true } },
} as const;
