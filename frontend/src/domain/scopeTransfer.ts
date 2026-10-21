import { ChecklistItem, ScopeItemReadModel } from "../shared/types";

const normalizedText = (text: string) =>
  text.trim().replace(/\s+/g, " ").toLocaleLowerCase("uk-UA");

const sameExecutors = (left: string[], right: string[]) => {
  const leftIds = [...new Set(left)].sort();
  const rightIds = [...new Set(right)].sort();
  return leftIds.length === rightIds.length &&
    leftIds.every((id, index) => id === rightIds[index]);
};

export const findSimilarScopeItem = (
  source: ChecklistItem,
  candidates: ScopeItemReadModel[],
  effectiveWeight: number,
) => candidates.find((candidate) =>
  normalizedText(candidate.text) === normalizedText(source.text) &&
  Number(candidate.weight_snapshot?.value) === effectiveWeight &&
  sameExecutors(
    candidate.executor_department_ids,
    source.implementer_dept_ids ?? [],
  ),
);
