import { Search } from "lucide-react";
import { FilterPopover } from "../../../../components/ui/FilterPopover";
import type {
  Department,
  DepartmentRelation,
  InitiativeStatusDef,
  Manager,
  PriorityDef,
} from "../../../../shared/types";
import { DepartmentRoleFilter } from "./DepartmentRoleFilter";
import styles from "./PortfolioTab.module.css";

interface PortfolioFiltersProps {
  name: string;
  strategicGoal: string;
  managerId: string;
  priorityId: string;
  statusId: string;
  departmentId: string;
  departmentRelation: DepartmentRelation;
  managers: Manager[];
  priorities: PriorityDef[];
  statuses: InitiativeStatusDef[];
  departments: Department[];
  onNameChange: (value: string) => void;
  onStrategicGoalChange: (value: string) => void;
  onManagerChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onDepartmentRelationChange: (value: DepartmentRelation) => void;
  onReset: () => void;
}

export const PortfolioFilters = (props: PortfolioFiltersProps) => {
  const activeCount = [
    props.managerId,
    props.priorityId,
    props.statusId,
    props.departmentId,
  ].filter(Boolean).length;

  return (
    <div className={styles.filters}>
      <div className={styles.filterControls}>
        <label className={styles.searchControl}>
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            placeholder="Пошук за назвою..."
            aria-label="Пошук за назвою"
            value={props.name}
            onChange={(event) => props.onNameChange(event.target.value)}
          />
        </label>
        <label className={styles.searchControl}>
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            placeholder="Пошук за стратегічною задачею..."
            aria-label="Пошук за стратегічною задачею"
            value={props.strategicGoal}
            onChange={(event) => props.onStrategicGoalChange(event.target.value)}
          />
        </label>

        <FilterPopover
          activeCount={activeCount}
          onReset={props.onReset}
          panelClassName={styles.portfolioFilterPanel}
        >
          <div className={styles.filterPopoverGrid}>
            <label className={styles.filterField}>
              <span className={styles.filterLabel}>Менеджер</span>
              <select value={props.managerId} onChange={(event) => props.onManagerChange(event.target.value)}>
                <option value="">Всі менеджери</option>
                {props.managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
              </select>
            </label>
            <label className={styles.filterField}>
              <span className={styles.filterLabel}>Пріоритет</span>
              <select value={props.priorityId} onChange={(event) => props.onPriorityChange(event.target.value)}>
                <option value="">Всі пріоритети</option>
                {props.priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
              </select>
            </label>
            <label className={styles.filterField}>
              <span className={styles.filterLabel}>Підрозділ</span>
              <select value={props.departmentId} onChange={(event) => props.onDepartmentChange(event.target.value)}>
                <option value="">Всі підрозділи</option>
                {props.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </label>
            <DepartmentRoleFilter
              value={props.departmentRelation}
              disabled={!props.departmentId}
              onChange={props.onDepartmentRelationChange}
            />
            <label className={styles.filterField}>
              <span className={styles.filterLabel}>Статус ініціативи</span>
              <select value={props.statusId} onChange={(event) => props.onStatusChange(event.target.value)}>
                <option value="">Всі статуси</option>
                {props.statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
              </select>
            </label>
          </div>
        </FilterPopover>
      </div>
    </div>
  );
};
