import { Plus } from "lucide-react";
import { Quarter } from "../../../shared/types";
import { getAvailableYears } from "../../../shared/utils";
import { QuarterFilter } from "../backlogTypes";
import styles from "../BacklogTab.module.css";

const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

interface BacklogHeaderProps {
  selectedYear: number;
  quarterFilter: QuarterFilter;
  isSelectingForExtension: boolean;
  selectedCount: number;
  canConfirmExtension: boolean;
  canEdit: boolean;
  extensionAvailable: boolean;
  targetYear: number;
  onYearChange: (year: number) => void;
  onQuarterChange: (quarter: QuarterFilter) => void;
  onStartExtension: () => void;
  onConfirmExtension: () => void;
  onCancelExtension: () => void;
  onCreate: () => void;
}

export const BacklogHeader = ({
  selectedYear,
  quarterFilter,
  isSelectingForExtension,
  selectedCount,
  canConfirmExtension,
  canEdit,
  extensionAvailable,
  targetYear,
  onYearChange,
  onQuarterChange,
  onStartExtension,
  onConfirmExtension,
  onCancelExtension,
  onCreate,
}: BacklogHeaderProps) => (
  <section className={styles.header}>
    <div className={styles.headerInner}>
      <h1 className={styles.title}>Беклог</h1>
      <div
        className={`${styles.headerControls} ${isSelectingForExtension ? styles.headerControlsSelecting : styles.headerControlsDefault}`}
      >
        <select
          aria-label="Рік беклогу"
          value={selectedYear}
          onChange={(event) => onYearChange(Number(event.target.value))}
          className={styles.yearSelect}
        >
          {getAvailableYears().map((year) => (
            <option key={year} value={year}>
              {year} рік
            </option>
          ))}
        </select>
        <div className={styles.quarterFilter} aria-label="Фільтр кварталу">
          {(["ALL", ...quarters] as QuarterFilter[]).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => onQuarterChange(item)}
              className={`${styles.quarterFilterButton} ${quarterFilter === item ? styles.quarterFilterButtonActive : ""}`}
            >
              {item === "ALL" ? "Всі квартали" : item}
            </button>
          ))}
        </div>
        {canEdit && !isSelectingForExtension && (
          <button
            type="button"
            disabled={!extensionAvailable}
            onClick={onStartExtension}
            className={styles.extendButton}
            title={
              !extensionAvailable
                ? "Немає ініціатив для продовження"
                : undefined
            }
          >
            Продовжити на {targetYear} рік
          </button>
        )}
        {canEdit && isSelectingForExtension && (
          <div
            className={styles.extensionConfirmation}
            aria-label="Підтвердження продовження"
          >
            <span className={styles.selectedCount}>
              Вибрано: {selectedCount}
            </span>
            <div className={styles.confirmationActions}>
              <button
                type="button"
                disabled={!canConfirmExtension}
                onClick={onConfirmExtension}
                className={styles.confirmButton}
              >
                Підтвердити
              </button>
              <button
                type="button"
                onClick={onCancelExtension}
                className={styles.cancelButton}
              >
                Скасувати
              </button>
            </div>
          </div>
        )}
        {canEdit && !isSelectingForExtension && (
          <button type="button" onClick={onCreate} className={styles.addButton}>
            <Plus size={18} strokeWidth={2.6} /> Додати в беклог
          </button>
        )}
      </div>
    </div>
  </section>
);
