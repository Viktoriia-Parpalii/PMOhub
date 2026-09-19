import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../../app/store";
import { InitiativeViewModel, Quarter } from "../../../shared/types";
import styles from "./BacklogModals.module.css";
import { notify } from "../../../components/ui/ToastNotifications";
import { NOTIFICATION_KINDS } from "../../../shared/constants/notificationConstants";

interface BacklogModalProps {
  onClose: () => void;
  type: "PROJECTS" | "TASKS";
  editItem: InitiativeViewModel | null;
  selectedYear: number;
  isReadOnly?: boolean;
}

export const BacklogModal = ({
  onClose,
  type,
  editItem,
  selectedYear,
  isReadOnly = false,
}: BacklogModalProps) => {
  const { projects, tasks, updateProject, updateTask, createBacklogWithCards } =
    useAppContext();
  const sourceRecords = type === "PROJECTS" ? projects : tasks;
  const master = editItem
    ? sourceRecords.find(
        (item) => item.record_type === "YEAR" && item.id === editItem.id,
      )
    : undefined;
  const [name, setName] = useState(editItem?.name ?? "");
  const [strategicGoal, setStrategicGoal] = useState(
    editItem?.strategic_goal ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasRevisionConflict, setHasRevisionConflict] = useState(false);

  const metadata = () => ({
    name: name.trim(),
    strategic_goal: strategicGoal,
    implementer_dept_ids: [],
    cross_functional_dept_ids: [],
  });
  const handleSave = async () => {
    if (isSaving || hasRevisionConflict) return;
    if (!name.trim()) {
      notify(
        NOTIFICATION_KINDS.error,
        `Вкажіть назву ${type === "PROJECTS" ? "проєкту" : "операційної задачі"}`,
      );
      return;
    }
    setIsSaving(true);
    try {
      if (editItem && master) {
        const result = await (type === "PROJECTS"
          ? updateProject(master.id, metadata())
          : updateTask(master.id, metadata()));
        if (!result.success) {
          notify(NOTIFICATION_KINDS.error, result.message);
          if (result.errorCode === "REVISION_CONFLICT")
            setHasRevisionConflict(true);
          return;
        }
      } else {
        const id = `${type === "PROJECTS" ? "PRJ" : "TSK"}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const base = {
          id,
          ...metadata(),
          year: selectedYear,
          quarter: "Q1" as Quarter,
          health_status: "DEFAULT" as const,
          checklist: [],
          record_type: "YEAR" as const,
          initiative_id: id,
          history: [],
        };
        const result = await createBacklogWithCards(
          type === "PROJECTS" ? "project" : "task",
          base as InitiativeViewModel,
          [],
        );
        if (!result.success) {
          notify(NOTIFICATION_KINDS.error, result.message);
          return;
        }
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className={styles.backdrop}>
      <div className={styles.backlogModal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {editItem
              ? isReadOnly
                ? `Перегляд ${type === "PROJECTS" ? "проєкту" : "операційної задачі"} за ${selectedYear}`
                : `Редагувати ${type === "PROJECTS" ? "проєкт" : "операційну задачу"} в ${selectedYear}`
              : `Створити ${type === "PROJECTS" ? "проєкт" : "операційну задачу"} в ${selectedYear}`}
          </h2>
          <button
            onClick={onClose}
            aria-label="Закрити"
            className={styles.closeButton}
          >
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <div>
            <label className={styles.fieldLabel}>
              Назва <span className={styles.required}>*</span>
            </label>
            <input
              disabled={isReadOnly}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={styles.nameInput}
            />
          </div>
          <div>
            <label className={styles.fieldLabel}>Стратегічна задача</label>
            <textarea
              disabled={isReadOnly}
              value={strategicGoal}
              onChange={(event) => setStrategicGoal(event.target.value)}
              rows={5}
              className={styles.goalTextarea}
              placeholder="Введіть назву стратегічної задачі за наявності"
            />
          </div>
          <p className={styles.infoBox}>
            Після збереження заповніть менеджера, пріоритет і залучені
            підрозділи у картці <b>«Підготовчий етап»</b>. Виконавців можна
            налаштувати лише в квартальних картках.
          </p>
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.footerCancel}>
            {isReadOnly ? "Закрити" : "Скасувати"}
          </button>
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={isSaving || hasRevisionConflict}
              className={styles.footerSave}
            >
              {isSaving
                ? "Збереження…"
                : hasRevisionConflict
                  ? "Оновіть запис"
                  : "Зберегти"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
