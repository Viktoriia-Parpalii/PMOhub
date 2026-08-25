import React from "react";
import { Trash2 } from "lucide-react";
import { useAppContext } from "../../../../app/store";
import { MutationResult } from "../../../../shared/types";
import { BulkWeight, WeightEditor } from "./TaskWeightsSection";
import styles from "./DictionariesSection.module.css";

export type DeleteConfirmation = {
  title: string;
  name: string;
  onConfirm: () => MutationResult | void;
} | null;

export type DeleteBlocked = {
  title: string;
  name: string;
  message: string;
} | null;

type DictionaryDialogsProps = {
  deleteConfirm: DeleteConfirmation;
  setDeleteConfirm: React.Dispatch<React.SetStateAction<DeleteConfirmation>>;
  deleteBlocked: DeleteBlocked;
  setDeleteBlocked: React.Dispatch<React.SetStateAction<DeleteBlocked>>;
  editingWeight: WeightEditor;
  setEditingWeight: React.Dispatch<React.SetStateAction<WeightEditor>>;
  bulkWeight: BulkWeight;
  setBulkWeight: React.Dispatch<React.SetStateAction<BulkWeight>>;
};

export const DictionaryDialogs = ({
  deleteConfirm,
  setDeleteConfirm,
  deleteBlocked,
  setDeleteBlocked,
  editingWeight,
  setEditingWeight,
  bulkWeight,
  setBulkWeight,
}: DictionaryDialogsProps) => {
  const { updateTaskWeight, applyTaskWeightToOpenCards } = useAppContext();

  return (
    <>
      {editingWeight && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <h3 className={styles.dialogTitle}>Редагування ваги</h3>
            <label className={styles.dialogLabel}>
              Назва
              <input
                value={editingWeight.name}
                onChange={(event) =>
                  setEditingWeight({
                    ...editingWeight,
                    name: event.target.value,
                  })
                }
                className={styles.dialogInput}
              />
            </label>
            <label className={styles.dialogLabel}>
              Значення
              <input
                type="number"
                min="0"
                step="0.1"
                value={editingWeight.weight}
                onChange={(event) =>
                  setEditingWeight({
                    ...editingWeight,
                    weight: Number(event.target.value),
                  })
                }
                className={styles.dialogInput}
              />
            </label>
            <p className={styles.warningMessage}>
              Зміна довідника не змінює наявні або архівні картки автоматично.
            </p>
            <div className={styles.dialogActions}>
              <button
                onClick={() => setEditingWeight(null)}
                className={styles.secondaryButton}
              >
                Скасувати
              </button>
              <button
                onClick={() => {
                  const result = updateTaskWeight(editingWeight.id, {
                    name: editingWeight.name,
                    weight: editingWeight.weight,
                  });
                  if (!result.success) return alert(result.message);
                  setEditingWeight(null);
                }}
                className={styles.primaryButton}
              >
                Зберегти
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkWeight && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <h3 className={styles.dialogTitle}>
              Застосувати вагу до відкритих карток
            </h3>
            <p className={styles.dialogText}>
              Вага «{bulkWeight.name}» буде оновлена лише в поточних і майбутніх
              завданнях обсягу робіт. Архівні періоди залишаться без змін.
            </p>
            <div className={styles.dialogActions}>
              <button
                onClick={() => setBulkWeight(null)}
                className={styles.secondaryButton}
              >
                Скасувати
              </button>
              <button
                onClick={() => {
                  const result = applyTaskWeightToOpenCards(bulkWeight.id);
                  if (!result.success) return alert(result.message);
                  setBulkWeight(null);
                }}
                className={styles.primaryButton}
              >
                Застосувати
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteBlocked && (
        <div className={styles.dialogOverlay}>
          <div
            role="alertdialog"
            aria-modal="true"
            className={styles.blockedDialog}
          >
            <div className={styles.blockedHeader}>
              <div className={styles.blockedIcon}>
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className={styles.dialogTitle}>Видалення недоступне</h3>
                <p className={styles.blockedDescription}>
                  {deleteBlocked.title[0].toUpperCase() +
                    deleteBlocked.title.slice(1)}{" "}
                  <strong>«{deleteBlocked.name}»</strong> не можна видалити.
                </p>
              </div>
            </div>
            <p className={styles.blockedMessage}>{deleteBlocked.message}</p>
            <div className={styles.dialogActions}>
              <button
                onClick={() => setDeleteBlocked(null)}
                className={styles.primaryButton}
              >
                Зрозуміло
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <div className={styles.deleteHeading}>
              <div className={styles.deleteIcon}>
                <Trash2 size={24} />
              </div>
              <h3 className={styles.dialogTitle}>Підтвердження видалення</h3>
            </div>
            <p className={styles.dialogText}>
              Ви дійсно бажаєте видалити {deleteConfirm.title}{" "}
              <strong>«{deleteConfirm.name}»</strong>? Цю дію неможливо
              скасувати.
            </p>
            <div className={styles.dialogActions}>
              <button
                onClick={() => setDeleteConfirm(null)}
                className={styles.secondaryButton}
              >
                Скасувати
              </button>
              <button
                onClick={() => {
                  const result = deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                  if (result && !result.success)
                    setDeleteBlocked({
                      title: deleteConfirm.title,
                      name: deleteConfirm.name,
                      message: result.message,
                    });
                }}
                className={styles.dangerButton}
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
