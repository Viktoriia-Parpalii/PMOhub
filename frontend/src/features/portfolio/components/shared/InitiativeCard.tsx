import React from "react";
import { InitiativeViewModel } from "../../../../shared/types";
import { calculateProgress, stripHtml } from "../../../../shared/utils";
import { useAppContext } from "../../../../app/store";
import {
  getInitiativeSize,
  getInitiativeWeight,
} from "../../../../domain/capacity";
import {
  colorWithAlpha,
  getPriorityBadgeStyle,
} from "../../../../domain/priority";
import { getInitiativeStatus } from "../../../../domain/health";
import { RichTextPreview } from "../../../../components/ui/RichTextEditor";
import styles from "./InitiativeCard.module.css";

type Initiative = InitiativeViewModel;
type InitiativeKind = "project" | "task";

export interface InitiativeCardProps {
  initiative: Initiative;
  kind: InitiativeKind;
  onClick?: () => void;
  hideColorPicker?: boolean;
  isBacklogView?: boolean;
}

const getScopeColor = (color?: string) => {
  switch (color) {
    case "GREEN":
      return { dot: "bg-emerald-500", text: "text-emerald-700" };
    case "YELLOW":
      return { dot: "bg-amber-500", text: "text-amber-700" };
    case "RED":
      return { dot: "bg-red-500", text: "text-rose-700" };
    default:
      return { dot: "bg-slate-400", text: "text-slate-700" };
  }
};

export const InitiativeCard: React.FC<InitiativeCardProps> = ({
  initiative,
  kind,
  onClick,
  hideColorPicker,
  isBacklogView,
}) => {
  const {
    departments,
    priorities,
    initiativeStatuses,
    taskWeights,
    initiativeSizes,
    updateProject,
    updateTask,
    customFields,
    managers,
  } = useAppContext();
  const cardFields = customFields.filter(
    (field) => field.entityType === kind && field.showInCards,
  );
  const effectiveStatus =
    initiative.record_type === "YEAR" ? "DEFAULT" : initiative.health_status;
  const statusDefinition = getInitiativeStatus(
    effectiveStatus,
    initiativeStatuses,
  );
  const progress = calculateProgress(initiative.checklist);
  const manager = managers.find((item) => item.id === initiative.manager_id);
  const implementerIds = Array.from(
    new Set(
      initiative.checklist.flatMap((item) => item.implementer_dept_ids ?? []),
    ),
  );
  const implementerNames = implementerIds
    .map((id) => departments.find((department) => department.id === id)?.name)
    .filter((name): name is string => Boolean(name))
    .join(", ");
  const involvedNames = initiative.cross_functional_dept_ids
    .map((id) => departments.find((department) => department.id === id)?.name)
    .filter((name): name is string => Boolean(name))
    .join(", ");
  const priority = priorities.find((item) => item.id === initiative.priority);
  const sizeName =
    initiative.sizeSnapshot?.name ??
    getInitiativeSize(
      getInitiativeWeight(initiative.checklist, taskWeights),
      initiativeSizes,
    );
  const updateStatus = (healthStatus: string) =>
    kind === "project"
      ? updateProject(initiative.id, { health_status: healthStatus })
      : updateTask(initiative.id, { health_status: healthStatus });

  return (
    <div
      onClick={onClick}
      className={`${styles.card} ${onClick ? styles.interactive : ""}`}
    >
      <div
        className={styles.statusStripe}
        style={{ backgroundColor: statusDefinition.color }}
      />
      {!hideColorPicker && initiative.record_type === "CARD" && (
        <div className={styles.statusPicker}>
          <div className={styles.statusPickerLabel}>СТАТУС</div>
          <div className={styles.statusPickerOptions}>
            {initiativeStatuses
              .filter((item) => item.is_active || item.id === effectiveStatus)
              .map((item) => (
                <button
                  key={item.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    updateStatus(item.id);
                  }}
                  className={styles.statusOption}
                  style={{
                    backgroundColor: item.color,
                    borderColor: colorWithAlpha(item.color, 0.8),
                  }}
                  title={item.name}
                />
              ))}
          </div>
        </div>
      )}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h3 className={styles.title} title={initiative.name}>
            {initiative.name}
          </h3>
          <p className={styles.id}>{initiative.id}</p>
        </div>
      </div>
      <div className={styles.metadataGrid}>
        <CardRow label="Менеджер" value={manager?.name ?? "—"} />
        <div className={styles.row}>
          <span className={styles.rowLabel}>Пріоритет:</span>
          <span
            className="rounded border px-2 py-0.5 text-xs font-bold"
            style={getPriorityBadgeStyle(initiative.priority, priorities)}
          >
            {priority?.name ?? "—"}
          </span>
        </div>
        <CardRow
          label="Стратегічна задача"
          value={initiative.strategic_goal?.trim() ? "✓" : "—"}
          success={Boolean(initiative.strategic_goal?.trim())}
          title={
            initiative.strategic_goal?.trim()
              ? "Стратегічна задача заповнена"
              : "Стратегічна задача відсутня"
          }
        />
        <CardRow
          label="Розмір/Період"
          value={`${sizeName} • ${initiative.year} ${initiative.quarter}`}
        />
      </div>
      <div className={styles.details}>
        <CardRow label="Виконавці" value={implementerNames || "—"} />
        <CardRow label="Залучені" value={involvedNames || "—"} />
      </div>
      {!isBacklogView && (
        <div className={styles.scopeSection}>
          {initiative.checklist.length > 0 && (
            <div className={styles.scopeBlock}>
              <h4 className={styles.scopeTitle}>Скоуп:</h4>
              <ul className={styles.scopeList}>
                {initiative.checklist.map((item, index) => {
                  const presentation = getScopeColor(item.color);
                  return (
                    <li key={item.id} className={styles.scopeItem}>
                      <div className={styles.scopeMarker}>
                        <span className={styles.scopeNumber}>{index + 1}.</span>
                        <div
                          className={`${styles.scopeDot} ${presentation.dot}`}
                        />
                      </div>
                      <span
                        className={`${styles.scopeText} ${presentation.text}`}
                        title={item.text}
                      >
                        {item.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {initiative.notes && (
            <div className={styles.notes}>
              <h4 className={styles.notesTitle}>Примітки:</h4>
              <RichTextPreview
                value={initiative.notes}
                title={stripHtml(initiative.notes)}
                className={`rich-text-card-preview ${styles.notesText}`}
              />
            </div>
          )}
        </div>
      )}
      {cardFields.length > 0 && (
        <div className={styles.customFields}>
          {cardFields.map((field) => {
            const rawValue = initiative.custom_fields?.[field.id];
            const value =
              field.type === "CHECKBOX"
                ? rawValue
                  ? "Так"
                  : "Ні"
                : field.type === "RICHTEXT" && typeof rawValue === "string"
                  ? `${stripHtml(rawValue).slice(0, 50)}${rawValue.length > 50 ? "..." : ""}`
                  : String(rawValue || "—");
            return <CardRow key={field.id} label={field.name} value={value} />;
          })}
        </div>
      )}
      {progress !== null && (
        <div className={styles.progress}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>Прогрес</span>
            <span className={styles.progressValue}>{progress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              style={{
                width: `${progress}%`,
                backgroundColor: statusDefinition.color,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const CardRow: React.FC<{
  label: string;
  value: string;
  success?: boolean;
  title?: string;
}> = ({ label, value, success, title }) => (
  <div className={styles.row}>
    <span className={styles.rowLabel}>{label}:</span>
    <span
      className={`${styles.rowValue} ${success ? styles.rowValueSuccess : ""}`}
      title={title ?? value}
    >
      {value}
    </span>
  </div>
);
