import { AlertTriangle } from "lucide-react";
import { BacklogInitiative } from "../backlogTypes";
import styles from "../BacklogTab.module.css";

export const BacklogDeleteDialog = ({
  item,
  onCancel,
  onConfirm,
}: {
  item: BacklogInitiative;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <div className={styles.dialogBackdrop}>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-backlog-title"
      className={styles.deleteDialog}
    >
      <div className={styles.deleteDialogHead}>
        <AlertTriangle className={styles.deleteDialogIcon} />
        <div>
          <h3 id="delete-backlog-title" className={styles.deleteDialogTitle}>
            Видалити запис із беклогу?
          </h3>
          <p className={styles.deleteDialogSubtitle}>
            Цю дію не можна скасувати.
          </p>
        </div>
      </div>
      <div className={styles.deleteDialogBody}>
        Ви дійсно бажаєте видалити <strong>«{item.name}»</strong>? Якщо існують
        квартальні картки, система не дозволить видалення.
      </div>
      <div className={styles.deleteDialogFooter}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.dialogCancel}
        >
          Скасувати
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={styles.dialogDelete}
        >
          Видалити
        </button>
      </div>
    </div>
  </div>
);
