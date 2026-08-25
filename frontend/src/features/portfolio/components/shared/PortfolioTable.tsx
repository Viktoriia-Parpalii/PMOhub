import React from "react";
import { Edit2, Eye } from "lucide-react";
import { useAppContext } from "../../../../app/store";
import {
  CustomFieldDef,
  OperationalTask,
  Project,
} from "../../../../shared/types";
import { stripHtml } from "../../../../shared/utils";
import {
  colorWithAlpha,
  getPriorityBadgeStyle,
} from "../../../../domain/priority";
import {
  getInitiativeStatus,
  getInitiativeStatusStyle,
} from "../../../../domain/health";
import { RichTextPreview } from "../../../../components/ui/RichTextEditor";
import styles from "./PortfolioTable.module.css";

type Initiative = Project | OperationalTask;
type InitiativeKind = "project" | "task";

type PortfolioTableProps = {
  kind: InitiativeKind;
  initiatives: Initiative[];
  customFields: CustomFieldDef[];
  canEdit: boolean;
  onOpen: (initiative: Initiative) => void;
};

const getScopeClasses = (color?: string) => {
  switch (color) {
    case "GREEN":
      return { dot: styles.scopeDotGreen, text: styles.scopeTextGreen };
    case "YELLOW":
      return { dot: styles.scopeDotYellow, text: styles.scopeTextYellow };
    case "RED":
      return { dot: styles.scopeDotRed, text: styles.scopeTextRed };
    default:
      return { dot: styles.scopeDotDefault, text: styles.scopeTextDefault };
  }
};

const getRowClass = (status?: string) => {
  switch (status) {
    case "GREEN":
      return styles.rowGreen;
    case "YELLOW":
      return styles.rowYellow;
    case "RED":
      return styles.rowRed;
    default:
      return styles.rowDefault;
  }
};

const getStickyClass = (status?: string) => {
  switch (status) {
    case "GREEN":
      return styles.stickyGreen;
    case "YELLOW":
      return styles.stickyYellow;
    case "RED":
      return styles.stickyRed;
    default:
      return styles.stickyDefault;
  }
};

/** Shared project and operational-task portfolio table. */
export const PortfolioTable = ({
  kind,
  initiatives,
  customFields,
  canEdit,
  onOpen,
}: PortfolioTableProps) => {
  const {
    departments,
    managers,
    priorities,
    initiativeStatuses,
    updateProject,
    updateTask,
  } = useAppContext();
  const entityLabel = kind === "project" ? "проєкту" : "задачі";

  const updateStatus = (initiative: Initiative, healthStatus: string) => {
    if (kind === "project")
      updateProject(initiative.id, { health_status: healthStatus });
    else updateTask(initiative.id, { health_status: healthStatus });
  };

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead className={styles.head}>
          <tr>
            <th className={`${styles.headerCell} ${styles.managerColumn}`}>
              Менеджер
            </th>
            <th className={`${styles.headerCell} ${styles.nameColumn}`}>
              Назва {entityLabel}
            </th>
            <th className={`${styles.headerCell} ${styles.statusColumn}`}>
              Статус {entityLabel}
            </th>
            <th className={`${styles.headerCell} ${styles.goalColumn}`}>
              Стратегічна задача
            </th>
            <th className={`${styles.headerCell} ${styles.priorityColumn}`}>
              Пріоритет
            </th>
            <th className={`${styles.headerCell} ${styles.departmentsColumn}`}>
              Виконавці
            </th>
            <th className={`${styles.headerCell} ${styles.departmentsColumn}`}>
              Залучені
            </th>
            <th className={`${styles.headerCell} ${styles.scopeColumn}`}>
              Скоуп зі статусами
            </th>
            <th className={`${styles.headerCell} ${styles.notesColumn}`}>
              Примітки
            </th>
            {customFields.map((field) => (
              <th
                key={field.id}
                className={`${styles.headerCell} ${styles.customColumn}`}
                title={field.name}
              >
                {field.name}
              </th>
            ))}
            <th aria-label="Відкрити" className={styles.actionsHeader} />
          </tr>
        </thead>
        <tbody className={styles.body}>
          {initiatives.map((initiative) => {
            const status = initiative.health_status || "DEFAULT";
            const statusPresentation = getInitiativeStatus(
              status,
              initiativeStatuses,
            );
            const managerName =
              managers?.find((manager) => manager.id === initiative.manager_id)
                ?.name || "—";
            const goalName = initiative.strategic_goal || "—";
            const priority = priorities?.find(
              (item) => item.id === initiative.priority,
            );
            const implementerIds = Array.from(
              new Set(
                (initiative.checklist ?? []).flatMap(
                  (item) => item.implementer_dept_ids ?? [],
                ),
              ),
            );

            return (
              <tr
                key={initiative.id}
                className={`${styles.row} ${getRowClass(status)}`}
                style={{
                  backgroundColor: colorWithAlpha(
                    statusPresentation.color,
                    0.07,
                  ),
                }}
              >
                <td className={`${styles.cell} ${styles.managerCell}`}>
                  <span className={styles.clampedTwo} title={managerName}>
                    {managerName}
                  </span>
                </td>
                <td className={styles.cell}>
                  <div className={styles.minWidth}>
                    <span
                      className={styles.initiativeName}
                      title={initiative.name}
                      onClick={() => onOpen(initiative)}
                    >
                      {initiative.name}
                    </span>
                    <div className={styles.identifier}>{initiative.id}</div>
                  </div>
                </td>
                <td className={styles.cell}>
                  <div className={styles.statusStack}>
                    <span
                      className={styles.statusBadge}
                      style={getInitiativeStatusStyle(
                        status,
                        initiativeStatuses,
                      )}
                    >
                      {statusPresentation.name}
                    </span>
                    {canEdit && (
                      <div
                        className={styles.statusPicker}
                        aria-label="Обрати статус ініціативи"
                      >
                        {initiativeStatuses
                          .filter(
                            (item) => item.is_active || item.id === status,
                          )
                          .map((item) => (
                            <button
                              key={item.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                updateStatus(initiative, item.id);
                              }}
                              className={`${styles.statusDot} ${status === item.id ? styles.selectedStatusDot : ""}`}
                              style={{
                                backgroundColor: item.color,
                                borderColor: colorWithAlpha(item.color, 0.8),
                                outlineColor: item.color,
                              }}
                              title={item.name}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className={`${styles.cell} ${styles.goalCell}`}>
                  <span className={styles.clampedThree} title={goalName}>
                    {goalName}
                  </span>
                </td>
                <td className={`${styles.cell} ${styles.priorityCell}`}>
                  <span
                    className={styles.priorityBadge}
                    style={getPriorityBadgeStyle(
                      priority?.id ?? initiative.priority,
                      priorities,
                    )}
                    title={priority?.name ?? initiative.priority ?? "Не обрано"}
                  >
                    {priority?.name ?? initiative.priority ?? "—"}
                  </span>
                </td>
                <td className={styles.cell}>
                  <div className={styles.tagList}>
                    {implementerIds.map((id) => {
                      const department = departments.find(
                        (item) => item.id === id,
                      );
                      return department ? (
                        <span
                          key={id}
                          className={styles.implementerTag}
                          title={department.name}
                        >
                          {department.name}
                        </span>
                      ) : null;
                    })}
                    {implementerIds.length === 0 && (
                      <span className={styles.emptyMark}>—</span>
                    )}
                  </div>
                </td>
                <td className={styles.cell}>
                  <div className={styles.tagList}>
                    {(initiative.cross_functional_dept_ids || []).map((id) => {
                      const department = departments.find(
                        (item) => item.id === id,
                      );
                      return department ? (
                        <span
                          key={id}
                          className={styles.involvedTag}
                          title={department.name}
                        >
                          {department.name}
                        </span>
                      ) : null;
                    })}
                    {initiative.cross_functional_dept_ids.length === 0 && (
                      <span className={styles.emptyMark}>—</span>
                    )}
                  </div>
                </td>
                <td className={styles.cell}>
                  {initiative.checklist.length > 0 ? (
                    <ul className={styles.scopeList}>
                      {initiative.checklist.map((item) => {
                        const scope = getScopeClasses(item.color);
                        return (
                          <li key={item.id} className={styles.scopeItem}>
                            <span
                              className={`${styles.scopeDot} ${scope.dot}`}
                            />
                            <span
                              className={`${styles.scopeText} ${scope.text}`}
                              title={item.text}
                            >
                              {item.text}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <span className={styles.emptyMark}>—</span>
                  )}
                </td>
                <td className={`${styles.cell} ${styles.notesCell}`}>
                  {initiative.notes ? (
                    <RichTextPreview
                      value={initiative.notes}
                      title={stripHtml(initiative.notes)}
                      className="rich-text-card-preview transition-all"
                    />
                  ) : (
                    "—"
                  )}
                </td>
                {customFields.map((field) => {
                  const value = initiative.custom_fields?.[field.id];
                  return (
                    <td
                      key={field.id}
                      className={`${styles.cell} ${styles.customCell}`}
                    >
                      <span
                        className={styles.clampedTwo}
                        title={String(value ?? "")}
                      >
                        {value !== undefined && value !== null && value !== ""
                          ? String(value)
                          : "—"}
                      </span>
                    </td>
                  );
                })}
                <td
                  className={`${styles.actionsCell} ${getStickyClass(status)} `}
                >
                  <button
                    onClick={() => onOpen(initiative)}
                    className={styles.openButton}
                    title={!canEdit ? "Переглянути" : "Редагувати"}
                  >
                    {!canEdit ? <Eye size={18} /> : <Edit2 size={18} />}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
