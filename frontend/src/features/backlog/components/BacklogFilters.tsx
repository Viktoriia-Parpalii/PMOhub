import { Search } from "lucide-react";
import { FilterPopover } from "../../../components/ui/FilterPopover";
import { Department, Manager, PriorityDef } from "../../../shared/types";
import styles from "../BacklogTab.module.css";

interface BacklogFiltersProps {
  nameSearch: string;
  goalSearch: string;
  managerFilter: string;
  priorityFilter: string;
  departmentFilter: string;
  managers: Manager[];
  priorities: PriorityDef[];
  departments: Department[];
  onNameSearch: (value: string) => void;
  onGoalSearch: (value: string) => void;
  onManagerFilter: (value: string) => void;
  onPriorityFilter: (value: string) => void;
  onDepartmentFilter: (value: string) => void;
  onReset: () => void;
  hasFilters: boolean;
}

export const BacklogFilters = (props: BacklogFiltersProps) => {
  const activeCount = [
    props.managerFilter,
    props.departmentFilter,
    props.priorityFilter,
  ].filter(Boolean).length;

  return (
    <div className={styles.filters}>
      <label className={styles.searchControl}>
        <Search size={16} aria-hidden="true" />
        <input
          value={props.nameSearch}
          onChange={(event) => props.onNameSearch(event.target.value)}
          placeholder="Пошук за назвою..."
          aria-label="Пошук за назвою"
        />
      </label>
      <label className={styles.searchControl}>
        <Search size={16} aria-hidden="true" />
        <input
          value={props.goalSearch}
          onChange={(event) => props.onGoalSearch(event.target.value)}
          placeholder="Пошук за стратегічною задачею..."
          aria-label="Пошук за стратегічною задачею"
        />
      </label>
      <FilterPopover activeCount={activeCount} onReset={props.onReset}>
        <div className={styles.filterPopoverGrid}>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Менеджер</span>
            <select value={props.managerFilter} onChange={(event) => props.onManagerFilter(event.target.value)}>
              <option value="">Всі менеджери</option>
              {props.managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
            </select>
          </label>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Підрозділ</span>
            <select value={props.departmentFilter} onChange={(event) => props.onDepartmentFilter(event.target.value)}>
              <option value="">Всі підрозділи</option>
              {props.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Пріоритет</span>
            <select value={props.priorityFilter} onChange={(event) => props.onPriorityFilter(event.target.value)}>
              <option value="">Всі пріоритети</option>
              {props.priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
            </select>
          </label>
        </div>
      </FilterPopover>
    </div>
  );
};
