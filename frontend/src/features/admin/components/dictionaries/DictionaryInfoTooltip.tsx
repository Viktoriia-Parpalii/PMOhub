import React, { ReactNode, useId } from "react";
import { Info } from "lucide-react";
import styles from "./DictionariesSection.module.css";

export const DictionaryInfoTooltip = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => {
  const tooltipId = useId();
  return (
    <span className={styles.infoTooltip}>
      <button
        type="button"
        className={styles.infoButton}
        aria-label={`Пояснення: ${label}`}
        aria-describedby={tooltipId}
      >
        <Info size={15} aria-hidden="true" />
      </button>
      <span id={tooltipId} role="tooltip" className={styles.infoPanel}>
        {children}
      </span>
    </span>
  );
};

export const DictionaryTitle = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className={styles.titleWithInfo}>
    <h3 className={styles.sectionTitle}>{title}</h3>
    <DictionaryInfoTooltip label={title}>{children}</DictionaryInfoTooltip>
  </div>
);

export const ReferenceActionsExplanation = () => (
  <>
    <strong>Деактивація</strong> прибирає значення з нових виборів, але не
    змінює вже збережені картки та історичні дані. Запис можна активувати
    повторно.
    <br />
    <strong>Видалення</strong> фізично прибирає лише значення без залежностей.
    Якщо запис уже використовується, система збереже пов’язані дані та
    деактивує його. Захищені системні записи видалити не можна.
  </>
);
