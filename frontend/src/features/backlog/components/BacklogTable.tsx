import React from "react";
import { Check, Edit2, Eye, Plus, Trash2 } from "lucide-react";
import {
  Department,
  InitiativeStatusDef,
  Manager,
  PriorityDef,
  Quarter,
} from "../../../shared/types";
import {
  getInitiativeStatus,
  getInitiativeStatusStyle,
} from "../../../domain/health";
import { getPriorityBadgeStyle } from "../../../domain/priority";
import { isCompletedItem } from "../../../domain/initiatives";
import { BacklogInitiative, BacklogTabKind } from "../backlogTypes";
import styles from "../BacklogTab.module.css";

const getScopeProgress = (card: BacklogInitiative) => {
  const total = card.checklist.length;
  const completed = card.checklist.filter(isCompletedItem).length;
  return {
    total,
    completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
};
const taskCountLabel = (count: number) => {
  const r = count % 10;
  const h = count % 100;
  return r === 1 && h !== 11
    ? `${count} завдання`
    : r >= 2 && r <= 4 && (h < 12 || h > 14)
      ? `${count} завдання`
      : `${count} завдань`;
};
interface BacklogTableProps {
  activeTab: BacklogTabKind;
  masters: BacklogInitiative[];
  selectedYear: number;
  visibleQuarters: Quarter[];
  cardsFor: (id: string) => BacklogInitiative[];
  visibleCardsFor: (id: string) => BacklogInitiative[];
  managers: Manager[];
  priorities: PriorityDef[];
  departments: Department[];
  initiativeStatuses: InitiativeStatusDef[];
  canEdit: boolean;
  isSelecting: boolean;
  selectedIds: string[];
  eligibleIds: Set<string>;
  allVisibleSelected: boolean;
  selectableIds: string[];
  expandedId: string | null;
  onToggleExpanded: (id: string) => void;
  onToggleSelected: (id: string) => void;
  onToggleAll: () => void;
  onToggleQuarter: (item: BacklogInitiative, quarter: Quarter) => void;
  isPastQuarter: (quarter: Quarter) => boolean;
  onEditMaster: (item: BacklogInitiative) => void;
  onDeleteMaster: (item: BacklogInitiative) => void;
  onOpenCard: (item: BacklogInitiative) => void;
  onOpenPreparation: (item: BacklogInitiative) => void;
}

export const BacklogTable = (props: BacklogTableProps) => {
  const columns =
    3 + props.visibleQuarters.length + (props.isSelecting ? 1 : 0);
  return (
    <div className={styles.tableScroller}>
      <table className={styles.table}>
        <thead className={styles.tableHead}>
          <tr className={styles.tableHeadRow}>
            {props.isSelecting && (
              <th className={styles.selectionHeader}>
                <input
                  type="checkbox"
                  aria-label="Вибрати всі"
                  title="Вибрати всі"
                  checked={props.allVisibleSelected}
                  disabled={!props.selectableIds.length}
                  onChange={props.onToggleAll}
                  className={styles.selectBox}
                />
              </th>
            )}
            <th className={styles.tableNameHeader}>
              {props.activeTab === "PROJECTS"
                ? "Назва проєкту"
                : "Назва задачі"}
            </th>
            <th className={styles.tableGoalHeader}>Стратегічна задача</th>
            {props.visibleQuarters.map((quarter) => (
              <th key={quarter} className={styles.quarterHeader}>
                {quarter}
              </th>
            ))}
            <th aria-label="Дії" className={styles.actionsHeader} />
          </tr>
        </thead>
        <tbody className={styles.tableBody}>
          {props.masters.map((master) => {
            const cards = props.cardsFor(master.id);
            const visibleCards = props.visibleCardsFor(master.id);
            const eligible = props.eligibleIds.has(master.id);
            const selected = props.selectedIds.includes(master.id);
            return (
              <React.Fragment key={master.id}>
                <tr
                  className={`${styles.tableRow} ${selected ? styles.selectedRow : ""}`}
                >
                  {props.isSelecting && (
                    <td className={styles.selectionCell}>
                      {eligible ? (
                        <input
                          type="checkbox"
                          aria-label={`Вибрати ${master.name}`}
                          checked={selected}
                          onChange={() => props.onToggleSelected(master.id)}
                          className={styles.selectBox}
                        />
                      ) : (
                        <span
                          className={styles.continuedBadge}
                          title={`Запис за ${props.selectedYear + 1} рік уже існує`}
                        >
                          Продовжено
                        </span>
                      )}
                    </td>
                  )}
                  <td className={styles.nameCell}>
                    <button
                      type="button"
                      onClick={() => props.onToggleExpanded(master.id)}
                      className={styles.nameButton}
                    >
                      {master.name}
                    </button>
                    <div className={styles.snapshotId}>
                      {master.id} · запис за {props.selectedYear} рік
                    </div>
                  </td>
                  <td className={styles.goalCell}>
                    <div
                      className={styles.goalText}
                      title={master.strategic_goal ?? ""}
                    >
                      {master.strategic_goal || "—"}
                    </div>
                  </td>
                  {props.visibleQuarters.map((quarter) => {
                    const card = cards.find((item) => item.quarter === quarter);
                    const locked = props.isPastQuarter(quarter);
                    const disabled = !props.canEdit || locked;
                    return (
                      <td key={quarter} className={styles.quarterCell}>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => props.onToggleQuarter(master, quarter)}
                          title={
                            locked
                              ? "Минулий квартал: створення картки недоступне"
                              : card
                                ? "Прибрати картку"
                                : "Створити картку"
                          }
                          aria-label={`${card ? "Прибрати" : "Створити"} картку ${quarter}`}
                          className={`${styles.quarterToggle} ${locked ? styles.lockedToggle : card ? styles.cardToggle : styles.emptyToggle}`}
                        >
                          {card ? (
                            <Check size={17} strokeWidth={2.7} />
                          ) : (
                            <Plus size={17} strokeWidth={2.5} />
                          )}
                        </button>
                      </td>
                    );
                  })}
                  <td className={styles.actionsCell}>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        onClick={() => props.onEditMaster(master)}
                        title={props.canEdit ? "Редагувати" : "Переглянути"}
                        className={styles.iconButton}
                      >
                        {props.canEdit ? (
                          <Edit2 size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                      {props.canEdit && (
                        <button
                          type="button"
                          onClick={() => props.onDeleteMaster(master)}
                          title="Видалити"
                          className={`${styles.iconButton} ${styles.deleteButton}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {props.expandedId === master.id && (
                  <tr>
                    <td colSpan={columns} className={styles.expandedCell}>
                      <div className={styles.periodCards}>
                        {visibleCards.length ? (
                          [...visibleCards]
                            .sort((a, b) => a.quarter.localeCompare(b.quarter))
                            .map((card) => (
                              <QuarterCard
                                key={card.id}
                                card={card}
                                managers={props.managers}
                                priorities={props.priorities}
                                departments={props.departments}
                                statuses={props.initiativeStatuses}
                                onOpen={props.onOpenCard}
                              />
                            ))
                        ) : (
                          <PreparationCard
                            item={master}
                            managers={props.managers}
                            priorities={props.priorities}
                            departments={props.departments}
                            onOpen={props.onOpenPreparation}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {!props.masters.length && (
            <tr>
              <td colSpan={columns} className={styles.emptyState}>
                За заданими фільтрами ініціатив не знайдено.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const Details = ({
  managerId,
  priorityId,
  departmentIds,
  managers,
  priorities,
  departments,
}: {
  managerId?: string;
  priorityId?: string;
  departmentIds: string[];
  managers: Manager[];
  priorities: PriorityDef[];
  departments: Department[];
}) => {
  const manager = managers.find((item) => item.id === managerId);
  const priority = priorities.find((item) => item.id === priorityId);
  const involved = departmentIds.map(
    (id) => departments.find((department) => department.id === id)?.name ?? id,
  );
  return (
    <div className={styles.periodDetails}>
      <p>
        <strong>Менеджер:</strong> {manager?.name ?? "—"}
      </p>
      <p className={styles.priorityLine}>
        <strong>Пріоритет:</strong>
        <span
          className={styles.priorityBadge}
          style={getPriorityBadgeStyle(priority?.id ?? priorityId, priorities)}
        >
          {priority?.name ?? "—"}
        </span>
      </p>
      <p title={involved.join(", ")} className={styles.involvedLine}>
        <strong>Залучені:</strong> {involved.length ? involved.join(", ") : "—"}
      </p>
    </div>
  );
};

const QuarterCard = ({
  card,
  managers,
  priorities,
  departments,
  statuses,
  onOpen,
}: {
  card: BacklogInitiative;
  managers: Manager[];
  priorities: PriorityDef[];
  departments: Department[];
  statuses: InitiativeStatusDef[];
  onOpen: (item: BacklogInitiative) => void;
}) => {
  const status = getInitiativeStatus(card.health_status, statuses);
  const scope = getScopeProgress(card);
  return (
    <button
      type="button"
      onClick={() => onOpen(card)}
      className={styles.periodCard}
      aria-label={`Переглянути ${card.quarter} ${card.year}`}
    >
      <div className={styles.periodTop}>
        <span className={styles.periodTitle}>
          {card.quarter} {card.year}
        </span>
        <span
          className={styles.statusBadge}
          style={getInitiativeStatusStyle(card.health_status, statuses)}
        >
          {status.name}
        </span>
      </div>
      <Details
        managerId={card.manager_id}
        priorityId={card.priority}
        departmentIds={card.cross_functional_dept_ids}
        managers={managers}
        priorities={priorities}
        departments={departments}
      />
      <div className={styles.periodMetric}>
        <span>{taskCountLabel(scope.total)}</span>
        <strong>
          {scope.completed}/{scope.total} · {scope.percent}%
        </strong>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={`Прогрес завдань ${card.quarter} ${card.year}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={scope.percent}
      >
        <div
          className={styles.progressBar}
          style={{ width: `${scope.percent}%`, backgroundColor: status.color }}
        />
      </div>
    </button>
  );
};

const PreparationCard = ({
  item,
  managers,
  priorities,
  departments,
  onOpen,
}: {
  item: BacklogInitiative;
  managers: Manager[];
  priorities: PriorityDef[];
  departments: Department[];
  onOpen: (item: BacklogInitiative) => void;
}) => {
  const stage = item.preparation_stage;
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`${styles.periodCard} ${styles.preparationCard}`}
      aria-label="Відкрити підготовчий етап"
    >
      <div className={styles.periodTop}>
        <span className={styles.periodTitle}>Підготовчий етап</span>
        <span className={`${styles.statusBadge} ${styles.preparationStatus}`}>
          Без статусу
        </span>
      </div>
      <Details
        managerId={stage?.manager_id}
        priorityId={stage?.priority}
        departmentIds={stage?.cross_functional_dept_ids ?? []}
        managers={managers}
        priorities={priorities}
        departments={departments}
      />
    </button>
  );
};
