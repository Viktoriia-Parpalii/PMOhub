import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../../app/store";
import { OperationalTask, Project } from "../../../shared/types";
import { getYearSnapshot } from "../../../domain/initiatives";
import styles from "./BacklogModals.module.css";

export const PreparationStageModal = ({
  item,
  type,
  onClose,
}: {
  item: Project | OperationalTask;
  type: "project" | "task";
  onClose: () => void;
}) => {
  const { departments, managers, priorities, updatePreparationStage, isMutating } =
    useAppContext();
  const stage = getYearSnapshot(item, item.year)?.preparationStage;
  const [managerId, setManagerId] = useState(stage?.manager_id ?? "");
  const [priority, setPriority] = useState(stage?.priority ?? "");
  const [departmentIds, setDepartmentIds] = useState(
    stage?.cross_functional_dept_ids ?? [],
  );
  const [error, setError] = useState("");
  const toggle = (id: string) =>
    setDepartmentIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const save = async () => {
    const result = await updatePreparationStage(type, item.id, {
      manager_id: managerId || undefined,
      priority: priority || undefined,
      cross_functional_dept_ids: departmentIds,
    });
    if (!result.success) {
      setError(result.message);
      return;
    }
    onClose();
  };
  return createPortal(
    <div className={styles.preparationBackdrop}>
      <div className={styles.preparationModal}>
        <div className={styles.preparationHeader}>
          <div>
            <h2 className={styles.preparationTitle}>
              Підготовчий етап · {item.year}
            </h2>
            <p className={styles.preparationDescription}>
              Нульовий квартал: дані використаються для першої картки року.
            </p>
          </div>
          <button
            onClick={onClose}
            className={styles.plainCloseButton}
          >
            ×
          </button>
        </div>
        <div className={styles.preparationBody}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}
          <div className={styles.twoColumnFields}>
            <label className={styles.selectLabel}>
              Менеджер
              <select
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
            <p className={styles.departmentLabel}>
              Залучені підрозділи
            </p>
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
          <button
            onClick={onClose}
            className={styles.preparationCancel}
          >
            Скасувати
          </button>
          <button
            onClick={save}
            disabled={isMutating}
            className={styles.preparationSave}
          >
            {isMutating ? "Збереження…" : "Зберегти"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
