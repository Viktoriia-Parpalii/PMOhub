import { FolderOpen, X } from "lucide-react";
import { getCurrentPeriod } from "../../../shared/utils";
import styles from "../BacklogTab.module.css";

interface Notice {
  type: "success" | "error";
  message: string;
}

export const BacklogNotice = ({
  notice,
  onClose,
}: {
  notice: Notice;
  onClose: () => void;
}) => (
  <div
    role="status"
    className={`${styles.notice} ${notice.type === "success" ? styles.noticeSuccess : styles.noticeError}`}
  >
    <span>{notice.message}</span>
    <button
      type="button"
      onClick={onClose}
      aria-label="Закрити повідомлення"
      className={styles.noticeClose}
    >
      <X size={16} />
    </button>
  </div>
);

export const ArchiveBanner = ({
  year,
  onReturn,
}: {
  year: number;
  onReturn: (year: number) => void;
}) => (
  <section aria-label="Архівний період" className={styles.archiveBanner}>
    <div className={styles.archiveInfo}>
      <FolderOpen size={32} className={styles.archiveIcon} aria-hidden="true" />
      <div>
        <h2 className={styles.archiveTitle}>Архівний період ({year})</h2>
        <p className={styles.archiveText}>Тільки для перегляду</p>
      </div>
    </div>
    <button
      type="button"
      onClick={() => onReturn(getCurrentPeriod().year)}
      className={styles.archiveReturn}
    >
      <span aria-hidden="true">←</span> Повернутись на поточний рік
    </button>
  </section>
);
