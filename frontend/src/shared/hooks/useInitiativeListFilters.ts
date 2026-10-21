import { useCallback, useEffect, useMemo, useState } from "react";
import type { DepartmentRelation, InitiativeListFilters } from "../types";

export const useInitiativeListFilters = (
  delay = 350,
  includeDepartmentRelation = false,
) => {
  const [name, setName] = useState("");
  const [strategicGoal, setStrategicGoal] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [appliedStrategicGoal, setAppliedStrategicGoal] = useState("");
  const [managerId, setManagerId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departmentRelation, setDepartmentRelation] =
    useState<DepartmentRelation>("ANY");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAppliedName(name.trim());
      setAppliedStrategicGoal(strategicGoal.trim());
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [delay, name, strategicGoal]);

  const reset = useCallback(() => {
    setName("");
    setStrategicGoal("");
    setAppliedName("");
    setAppliedStrategicGoal("");
    setManagerId("");
    setPriorityId("");
    setStatusId("");
    setDepartmentId("");
    setDepartmentRelation("ANY");
  }, []);

  const filters = useMemo<InitiativeListFilters>(
    () => ({
      name: appliedName || undefined,
      strategic_goal: appliedStrategicGoal || undefined,
      manager_id: managerId || undefined,
      priority_id: priorityId || undefined,
      status_id: statusId || undefined,
      department_id: departmentId || undefined,
      department_relation:
        includeDepartmentRelation && departmentId
          ? departmentRelation
          : undefined,
    }),
    [
      appliedName,
      appliedStrategicGoal,
      departmentId,
      departmentRelation,
      includeDepartmentRelation,
      managerId,
      priorityId,
      statusId,
    ],
  );

  return {
    name,
    strategicGoal,
    managerId,
    priorityId,
    statusId,
    departmentId,
    departmentRelation,
    filters,
    hasFilters: Boolean(
      name ||
        strategicGoal ||
        managerId ||
        priorityId ||
        statusId ||
        departmentId,
    ),
    setName,
    setStrategicGoal,
    setManagerId,
    setPriorityId,
    setStatusId,
    setDepartmentId,
    setDepartmentRelation,
    reset,
  };
};
