import styles from "./AppLoader.module.css";

interface AppLoaderProps {
  label?: string;
  fullPage?: boolean;
}

export const AppLoader = ({
  label = "Завантаження даних…",
  fullPage = false,
}: AppLoaderProps) => (
  <div
    className={`${styles.loader} ${fullPage ? styles.fullPage : ""}`}
    role="status"
    aria-live="polite"
  >
    <div className={styles.content}>
      <div className={styles.visual} aria-hidden="true">
        <span className={styles.orbit}>
          <i className={styles.dotPrimary} />
          <i className={styles.dotAccent} />
        </span>
        <span className={styles.chartMark}>
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className={styles.copy}>
        <strong>{label}</strong>
        <span>Готуємо актуальні показники</span>
      </div>
      <span className={styles.pulse} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  </div>
);
