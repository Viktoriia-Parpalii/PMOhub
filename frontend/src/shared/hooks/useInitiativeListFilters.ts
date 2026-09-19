import { useCallback, useEffect, useMemo, useState } from "react";
import type { InitiativeListFilters } from "../types";

export const useInitiativeListFilters = (delay = 350) => {
  const [name, setName] = useState("");
  const [strategicGoal, setStrategicGoal] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [appliedStrategicGoal, setAppliedStrategicGoal] = useState("");
  const [managerId, setManagerId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [statusId, setStatusId] = useState("");

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
  }, []);

  const filters = useMemo<InitiativeListFilters>(
    () => ({
      name: appliedName || undefined,
      strategic_goal: appliedStrategicGoal || undefined,
      manager_id: managerId || undefined,
      priority_id: priorityId || undefined,
      status_id: statusId || undefined,
    }),
    [appliedName, appliedStrategicGoal, managerId, priorityId, statusId],
  );

  return {
    name,
    strategicGoal,
    managerId,
    priorityId,
    statusId,
    filters,
    hasFilters: Boolean(
      name || strategicGoal || managerId || priorityId || statusId,
    ),
    setName,
    setStrategicGoal,
    setManagerId,
    setPriorityId,
    setStatusId,
    reset,
  };
};
