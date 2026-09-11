import { Manager, PriorityDef } from "../../../shared/types";
import styles from "../BacklogTab.module.css";

interface BacklogFiltersProps {
  nameSearch: string;
  goalSearch: string;
  managerFilter: string;
  priorityFilter: string;
  managers: Manager[];
  priorities: PriorityDef[];
  onNameSearch: (value: string) => void;
  onGoalSearch: (value: string) => void;
  onManagerFilter: (value: string) => void;
  onPriorityFilter: (value: string) => void;
  onReset: () => void;
  hasFilters: boolean;
}

export const BacklogFilters = (props: BacklogFiltersProps) => (
  <div
    className={`${styles.filters} ${props.hasFilters ? styles.filtersWithReset : ""}`}
  >
    <input
      value={props.nameSearch}
      onChange={(event) => props.onNameSearch(event.target.value)}
      placeholder="Пошук за назвою..."
      aria-label="Пошук за назвою"
      className={styles.filterControl}
    />
    <input
      value={props.goalSearch}
      onChange={(event) => props.onGoalSearch(event.target.value)}
      placeholder="Пошук за стратегічною задачею..."
      aria-label="Пошук за стратегічною задачею"
      className={styles.filterControl}
    />
    <select
      value={props.managerFilter}
      onChange={(event) => props.onManagerFilter(event.target.value)}
      aria-label="Фільтр менеджера"
      className={styles.filterControl}
    >
      <option value="">Всі менеджери</option>
      {props.managers.map((manager) => (
        <option key={manager.id} value={manager.id}>
          {manager.name}
        </option>
      ))}
    </select>
    <select
      value={props.priorityFilter}
      onChange={(event) => props.onPriorityFilter(event.target.value)}
      aria-label="Фільтр пріоритету"
      className={styles.filterControl}
    >
      <option value="">Всі пріоритети</option>
      {props.priorities.map((priority) => (
        <option key={priority.id} value={priority.id}>
          {priority.name}
        </option>
      ))}
    </select>
    {props.hasFilters && (
      <button
        type="button"
        className={styles.resetFiltersButton}
        onClick={props.onReset}
      >
        Скинути
      </button>
    )}
  </div>
);
