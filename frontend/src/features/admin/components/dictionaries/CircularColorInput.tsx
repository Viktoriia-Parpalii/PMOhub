import React from "react";
import styles from "./CircularColorInput.module.css";

interface CircularColorInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  compact?: boolean;
}

/** A shared color control for priority and initiative-status dictionaries. */
export const CircularColorInput = ({
  value,
  onChange,
  label,
  compact = false,
}: CircularColorInputProps) => (
  <label
    aria-label={label}
    title={label}
    className={`${styles.control} ${compact ? styles.compact : ""}`}
    style={{ backgroundColor: value }}
  >
    <input
      type="color"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={styles.nativeInput}
    />
  </label>
);
