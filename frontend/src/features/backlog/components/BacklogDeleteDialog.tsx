import { AlertTriangle } from "lucide-react";
import { BacklogInitiative } from "../backlogTypes";
import styles from "../BacklogTab.module.css";

export const BacklogDeleteDialog = ({
  item,
  hasQuarterCards,
  onCancel,
  onConfirm,
}: {
  item: BacklogInitiative;
  hasQuarterCards: boolean;
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
            {hasQuarterCards
              ? "Видалення неможливе"
              : "Видалити запис із беклогу?"}
          </h3>
          <p className={styles.deleteDialogSubtitle}>
            {hasQuarterCards
              ? "Спочатку видаліть квартальні картки."
              : "Цю дію не можна скасувати."}
          </p>
        </div>
      </div>
      <div className={styles.deleteDialogBody}>
        {hasQuarterCards ? (
          <>
            Запис <strong>«{item.name}»</strong> має квартальні картки, тому
            його не можна видалити з беклогу.
          </>
        ) : (
          <>
            Ви дійсно бажаєте видалити <strong>«{item.name}»</strong>?
          </>
        )}
      </div>
      <div className={styles.deleteDialogFooter}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.dialogCancel}
        >
          Скасувати
        </button>
        {!hasQuarterCards && (
          <button
            type="button"
            onClick={onConfirm}
            className={styles.dialogDelete}
          >
            Видалити
          </button>
        )}
      </div>
    </div>
  </div>
);
