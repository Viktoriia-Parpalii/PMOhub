import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../../app/store";
import {
  InitiativeYearSnapshot,
  OperationalTask,
  Priority,
  Project,
  Quarter,
} from "../../../shared/types";
import {
  getCurrentPeriod,
  getValidQuarters,
  isBacklogLocked,
  isPeriodLocked,
  truncateText,
} from "../../../shared/utils";
import styles from "./BacklogModals.module.css";

interface BacklogModalProps {
  onClose: () => void;
  type: "PROJECTS" | "TASKS";
  editItem: Project | OperationalTask | null;
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
  const {
    departments,
    managers,
    priorities,
    projects,
    tasks,
    savePassport,
    createBacklogWithCards,
    isMutating,
  } = useAppContext();
  const sourceRecords = type === "PROJECTS" ? projects : tasks;
  const master = editItem
    ? sourceRecords.find((item) => item.is_backlog && item.id === editItem.id)
    : undefined;
  const [name, setName] = useState(editItem?.name ?? "");
  const [strategicGoal, setStrategicGoal] = useState(
    editItem?.strategic_goal ?? "",
  );
  const [notes, setNotes] = useState("");
  const [managerId, setManagerId] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  // Виконавці належать scope-завданням квартальної картки. Backlog лише зберігає
  // синхронізований паспортний знімок, тому тут їх не можна редагувати.
  const syncedImplementerIds = editItem?.implementer_dept_ids ?? [];
  const [crossFunctional, setCrossFunctional] = useState<string[]>(
    editItem?.cross_functional_dept_ids ?? [],
  );
  const [selectedQuarters, setSelectedQuarters] = useState<Quarter[]>([]);
  const [targetYears, setTargetYears] = useState<number[]>([]);
  const [targetCardIds, setTargetCardIds] = useState<string[]>([]);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [error, setError] = useState("");

  const availableFutureYears = Object.keys(master?.yearSnapshots ?? {})
    .map(Number)
    .filter((year) => year > selectedYear && !isBacklogLocked(year))
    .sort((a, b) => a - b);
  const current = getCurrentPeriod();
  const periodNumber = (year: number, quarter: Quarter) =>
    year * 10 + Number(quarter.slice(1));
  const availableCards = sourceRecords.filter(
    (card) =>
      !card.is_backlog &&
      card.backlog_id === master?.id &&
      !isPeriodLocked(card.year, card.quarter),
  );
  const currentCards =
    selectedYear === current.year
      ? availableCards.filter(
          (card) =>
            card.year === current.year && card.quarter === current.quarter,
        )
      : [];
  const futureCards = availableCards.filter(
    (card) =>
      card.year >= selectedYear &&
      periodNumber(card.year, card.quarter) >
        periodNumber(current.year, current.quarter),
  );

  const toggle = <T,>(
    value: T,
    values: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>,
  ) =>
    setter(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  const passport = () => ({
    name: name.trim(),
    strategic_goal: strategicGoal,
    implementer_dept_ids: [],
    cross_functional_dept_ids: [],
  });
  const handleSave = async () => {
    if (!name.trim()) {
      setError(`Вкажіть назву ${type === "PROJECTS" ? "проєкту" : "операційної задачі"}`);
      return;
    }
    if (editItem && master) {
      const result = await savePassport({
        kind: type === "PROJECTS" ? "project" : "task",
        source: { type: "backlog", masterId: master.id, year: selectedYear },
        passportPatch: passport(),
        targets: { backlogYears: targetYears, cardIds: targetCardIds },
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
    } else {
      const id = `${type === "PROJECTS" ? "PRJ" : "TSK"}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const yearSnapshot: InitiativeYearSnapshot = {
        ...passport(),
        year: selectedYear,
        history: [],
      };
      const base = {
        id,
        ...passport(),
        year: selectedYear,
        quarter: "Q1" as Quarter,
        health_status: "DEFAULT" as const,
        checklist: [],
        is_backlog: true,
        yearSnapshots: { [String(selectedYear)]: yearSnapshot },
        history: [],
      };
      const result = await createBacklogWithCards(
        type === "PROJECTS" ? "project" : "task",
        base as Project | OperationalTask,
        [],
      );
      if (!result.success) {
        setError(result.message);
        return;
      }
    }
    onClose();
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
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}
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
            <label className={styles.fieldLabel}>
              Стратегічна задача
            </label>
            <textarea
              disabled={isReadOnly}
              value={strategicGoal}
              onChange={(event) => setStrategicGoal(event.target.value)}
              rows={5}
              className={styles.goalTextarea}
              placeholder="Введіть назву стратегічної задачі за наявності"
            />
          </div>
          {false && (
            <div className={styles.hiddenFieldGrid}>
              <div>
                <label className={styles.hiddenFieldLabel}>
                  Менеджер
                </label>
                <select
                  disabled={isReadOnly}
                  value={managerId}
                  onChange={(event) => setManagerId(event.target.value)}
                  className={styles.hiddenSelect}
                >
                  <option value="">Не обрано</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={styles.hiddenFieldLabel}>
                  Пріоритет
                </label>
                <select
                  disabled={isReadOnly}
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className={styles.hiddenSelect}
                >
                  <option value="">Не обрано</option>
                  {priorities
                    .filter(
                      (item) =>
                        item.is_active !== false || item.id === priority,
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}
          <p className={styles.infoBox}>
            Після збереження заповніть менеджера, пріоритет і залучені
            підрозділи у картці <b>«Підготовчий етап»</b>. Виконавців можна
            налаштувати лише в квартальних картках.
          </p>
          {false && <div className={styles.hiddenDivider} />}
        </div>
        <div className={styles.modalFooter}>
          <button
            onClick={onClose}
            className={styles.footerCancel}
          >
            {isReadOnly ? "Закрити" : "Скасувати"}
          </button>
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={isMutating}
              className={styles.footerSave}
            >
              {isMutating ? "Збереження…" : "Зберегти"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
