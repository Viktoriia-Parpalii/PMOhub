import { Layers3 } from "lucide-react";
import styles from "./PortfolioTab.module.css";

const projectLabel = (count: number) => {
  const last = count % 10;
  const lastTwo = count % 100;
  if (last === 1 && lastTwo !== 11) return "проєкт";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "проєкти";
  return "проєктів";
};

const taskLabel = (count: number) => {
  const last = count % 10;
  const lastTwo = count % 100;
  if (last === 1 && lastTwo !== 11) return "операційну задачу";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "операційні задачі";
  return "операційних задач";
};

export const PortfolioResultSummary = ({
  count,
  kind,
}: {
  count: number;
  kind: "PROJECT" | "OPERATIONAL_TASK";
}) => (
  <div className={styles.resultSummary} aria-live="polite">
    <Layers3 size={15} strokeWidth={2.2} aria-hidden="true" />
    <strong>
      Знайдено {count} {kind === "PROJECT" ? projectLabel(count) : taskLabel(count)}
    </strong>
  </div>
);
