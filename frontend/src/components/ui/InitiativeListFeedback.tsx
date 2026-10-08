import styles from "./InitiativeListFeedback.module.css";

export const InitiativeListSkeleton = ({
  variant,
}: {
  variant: "grid" | "table" | "backlog";
}) => (
  <div
    className={`${styles.skeleton} ${styles[variant]}`}
    role="status"
    aria-label="Завантаження списку"
  >
    {Array.from({ length: variant === "grid" ? 8 : 6 }, (_, index) => (
      <div className={styles.placeholder} key={index}>
        <span className={styles.long} />
        <span className={styles.medium} />
        <span className={styles.short} />
      </div>
    ))}
  </div>
);

export const InitiativeListError = ({ retry }: { retry: () => void }) => (
  <div className={styles.error} role="alert">
    <strong>Не вдалося завантажити список.</strong>
    <span>Перевірте з’єднання та повторіть запит.</span>
    <button type="button" onClick={retry}>
      Повторити
    </button>
  </div>
);
