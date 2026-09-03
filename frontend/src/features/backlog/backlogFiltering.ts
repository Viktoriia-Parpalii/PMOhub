import { Quarter } from "../../shared/types";
import { BacklogInitiative, QuarterFilter } from "./backlogTypes";

export interface BacklogCardFilters {
  quarter: QuarterFilter;
  managerId: string;
  priorityId: string;
}

export const filterBacklogCards = (
  cards: BacklogInitiative[],
  filters: BacklogCardFilters,
) =>
  cards.filter(
    (card) =>
      (filters.quarter === "ALL" ||
        card.quarter === (filters.quarter as Quarter)) &&
      (!filters.managerId || card.manager_id === filters.managerId) &&
      (!filters.priorityId || card.priority === filters.priorityId),
  );

export const matchesBacklogDimensions = (
  master: BacklogInitiative,
  cards: BacklogInitiative[],
  filters: BacklogCardFilters,
) => {
  const hasDimensionFilter =
    filters.quarter !== "ALL" || filters.managerId || filters.priorityId;
  if (!hasDimensionFilter) return true;

  if (filterBacklogCards(cards, filters).length) return true;

  // A preparation stage has no quarter. It remains searchable by its own
  // manager/priority only while no quarterly cards exist and "All" is selected.
  return (
    cards.length === 0 &&
    filters.quarter === "ALL" &&
    (!filters.managerId || master.manager_id === filters.managerId) &&
    (!filters.priorityId || master.priority === filters.priorityId)
  );
};
