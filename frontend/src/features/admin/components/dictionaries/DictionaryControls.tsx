import React, { ReactNode } from "react";
import { Power, PowerOff, Trash2 } from "lucide-react";
import styles from "./DictionaryControls.module.css";

export const DictionaryStatusBadge = ({ isActive }: { isActive: boolean }) => (
  <span className={isActive ? styles.activeStatus : styles.inactiveStatus}>
    {isActive ? "Активно" : "Деактивовано"}
  </span>
);

export const DictionaryActivationButton = ({
  isActive,
  onClick,
  compact = false,
}: {
  isActive: boolean;
  onClick: () => void;
  compact?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`${isActive ? styles.deactivateButton : styles.activateButton} ${compact ? styles.compactIconButton : ""}`}
    title={isActive ? "Деактивувати" : "Активувати"}
  >
    {isActive ? <PowerOff size={16} /> : <Power size={16} />}
  </button>
);

export const DictionaryDeleteButton = ({
  onClick,
  compact = false,
}: {
  onClick: () => void;
  compact?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`${styles.deleteButton} ${compact ? styles.compactIconButton : ""}`}
    title="Видалити"
  >
    <Trash2 size={16} />
  </button>
);

export const DictionaryActionButton = ({
  children,
  onClick,
  title,
  variant = "icon",
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  variant?: "icon" | "apply";
}) => (
  <button
    onClick={onClick}
    className={variant === "apply" ? styles.applyButton : styles.iconButton}
    title={title}
  >
    {children}
  </button>
);

export const DictionaryActionGroup = ({
  children,
}: {
  children: ReactNode;
}) => <div className={styles.actionGroup}>{children}</div>;
