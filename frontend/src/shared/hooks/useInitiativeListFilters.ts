import { useCallback, useEffect, useMemo, useState } from "react";
import type { InitiativeListFilters } from "../types";

export const useInitiativeListFilters = (delay = 350) => {
  const [name, setName] = useState("");
  const [strategicGoal, setStrategicGoal] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [appliedStrategicGoal, setAppliedStrategicGoal] = useState("");
  const [managerId, setManagerId] = useState("");
  const [priorityId, setPriorityId] = useState("");

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
  }, []);

  const filters = useMemo<InitiativeListFilters>(
    () => ({
      name: appliedName || undefined,
      strategic_goal: appliedStrategicGoal || undefined,
      manager_id: managerId || undefined,
      priority_id: priorityId || undefined,
    }),
    [appliedName, appliedStrategicGoal, managerId, priorityId],
  );

  return {
    name,
    strategicGoal,
    managerId,
    priorityId,
    filters,
    hasFilters: Boolean(name || strategicGoal || managerId || priorityId),
    setName,
    setStrategicGoal,
    setManagerId,
    setPriorityId,
    reset,
  };
};
