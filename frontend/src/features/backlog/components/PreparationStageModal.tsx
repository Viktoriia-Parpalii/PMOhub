import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../../app/store";
import { InitiativeViewModel } from "../../../shared/types";
import { getYearSnapshot } from "../../../domain/initiatives";
import styles from "./BacklogModals.module.css";
import { notify } from "../../../components/ui/ToastNotifications";
import { NOTIFICATION_KINDS } from "../../../shared/constants/notificationConstants";

export const PreparationStageModal = ({
  item,
  type,
  onClose,
  isReadOnly = false,
}: {
  item: InitiativeViewModel;
  type: "project" | "task";
  onClose: () => void;
  isReadOnly?: boolean;
}) => {
  const { departments, managers, priorities, updatePreparationStage } =
    useAppContext();
  const stage = getYearSnapshot(item, item.year)?.preparationStage;
  const [managerId, setManagerId] = useState(stage?.manager_id ?? "");
  const [priority, setPriority] = useState(stage?.priority ?? "");
  const [departmentIds, setDepartmentIds] = useState(
    stage?.cross_functional_dept_ids ?? [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasRevisionConflict, setHasRevisionConflict] = useState(false);
  const [isViewing, setIsViewing] = useState(isReadOnly);
  const toggle = (id: string) =>
    setDepartmentIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const save = async () => {
    if (isSaving || hasRevisionConflict) return;
    setIsSaving(true);
    try {
      const result = await updatePreparationStage(type, item.id, {
        manager_id: managerId || undefined,
        priority: priority || undefined,
        cross_functional_dept_ids: departmentIds,
      });
      if (!result.success) {
        notify(NOTIFICATION_KINDS.error, result.message);
        if (result.errorCode === "REVISION_CONFLICT")
          setHasRevisionConflict(true);
        return;
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };
  return createPortal(
    <div className={styles.preparationBackdrop}>
      <div className={styles.preparationModal}>
        <div className={styles.preparationHeader}>
          <div>
            <h2 className={styles.preparationTitle}>
              {isViewing ? "Перегляд" : "Редагування"} підготовчого етапу ·{" "}
              {item.year}
            </h2>
            <p className={styles.preparationDescription}>
              Нульовий квартал: дані використаються для першої картки року.
            </p>
          </div>
          <button onClick={onClose} className={styles.plainCloseButton}>
            ×
          </button>
        </div>
        <div className={styles.preparationBody}>
          <div className={styles.twoColumnFields}>
            <label className={styles.selectLabel}>
              Менеджер
              <select
                disabled={isViewing}
                value={managerId}
                onChange={(event) => setManagerId(event.target.value)}
                className={styles.selectField}
              >
                <option value="">Не обрано</option>
                {managers
                  .filter(
                    (manager) =>
                      manager.is_active !== false || manager.id === managerId,
                  )
                  .map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className={styles.selectLabel}>
              Пріоритет
              <select
                disabled={isViewing}
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className={styles.selectField}
              >
                <option value="">Не обрано</option>
                {priorities
                  .filter(
                    (value) =>
                      value.is_active !== false || value.id === priority,
                  )
                  .map((value) => (
                    <option key={value.id} value={value.id}>
                      {value.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div>
            <p className={styles.departmentLabel}>Залучені підрозділи</p>
            <div className={styles.departmentPicker}>
              {departments
                .filter(
                  (department) =>
                    department.is_active !== false ||
                    departmentIds.includes(department.id),
                )
                .map((department) => (
                  <button
                    type="button"
                    disabled={isViewing}
                    key={department.id}
                    onClick={() => toggle(department.id)}
                    className={`${styles.departmentChip} ${departmentIds.includes(department.id) ? styles.departmentChipSelected : ""}`}
                  >
                    {departmentIds.includes(department.id) ? "✓ " : ""}
                    {department.name}
                  </button>
                ))}
            </div>
          </div>
        </div>
        <div className={styles.preparationFooter}>
          <button onClick={onClose} className={styles.preparationCancel}>
            {isViewing ? "Закрити" : "Скасувати"}
          </button>
          {isViewing && !isReadOnly && (
            <button
              type="button"
              onClick={() => setIsViewing(false)}
              className={styles.preparationSave}
            >
              Редагувати
            </button>
          )}
          {!isViewing && (
            <button
              onClick={save}
              disabled={isSaving || hasRevisionConflict}
              className={styles.preparationSave}
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
