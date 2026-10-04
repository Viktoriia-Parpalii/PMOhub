import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import styles from "./FilterPopover.module.css";

interface FilterPopoverProps {
  activeCount: number;
  children: ReactNode;
  onReset: () => void;
  ariaLabel?: string;
  panelClassName?: string;
}

export const FilterPopover = ({
  activeCount,
  children,
  onReset,
  ariaLabel = "Фільтри",
  panelClassName,
}: FilterPopoverProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <SlidersHorizontal size={17} strokeWidth={2.2} aria-hidden="true" />
        <span>Фільтри</span>
        {activeCount > 0 && (
          <span className={styles.badge} aria-label={`Активних фільтрів: ${activeCount}`}>
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          className={`${styles.panel} ${panelClassName ?? ""}`}
          role="dialog"
          aria-label="Налаштування фільтрів"
        >
          <div className={styles.content}>{children}</div>
          <div className={styles.actions}>
            <button type="button" className={styles.reset} onClick={onReset}>
              Скинути
            </button>
            <button
              type="button"
              className={styles.done}
              onClick={() => setOpen(false)}
            >
              Готово
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
