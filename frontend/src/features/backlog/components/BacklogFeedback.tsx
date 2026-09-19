import { FolderOpen } from "lucide-react";
import styles from "../BacklogTab.module.css";

export const ArchiveBanner = ({
  year,
  currentYear,
  onReturn,
}: {
  year: number;
  currentYear: number;
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
      onClick={() => onReturn(currentYear)}
      className={styles.archiveReturn}
    >
      <span aria-hidden="true">←</span> Повернутись на поточний рік
    </button>
  </section>
);
