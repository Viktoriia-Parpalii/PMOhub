import type { DepartmentRelation } from "../../../../shared/types";
import styles from "./PortfolioTab.module.css";

export const DepartmentRoleFilter = ({
  value,
  disabled,
  onChange,
}: {
  value: DepartmentRelation;
  disabled: boolean;
  onChange: (value: DepartmentRelation) => void;
}) => {
  const executor = value !== "INVOLVED";
  const involved = value !== "EXECUTOR";

  const toggle = (role: "EXECUTOR" | "INVOLVED") => {
    if (role === "EXECUTOR") {
      if (executor && !involved) return;
      onChange(executor ? "INVOLVED" : "ANY");
      return;
    }
    if (involved && !executor) return;
    onChange(involved ? "EXECUTOR" : "ANY");
  };

  return (
    <fieldset className={styles.departmentRoleFilter} disabled={disabled}>
      <legend className={styles.filterLabel}>Роль підрозділу</legend>
      <div className={styles.departmentRoleOptions}>
        <label className={`${styles.departmentRoleOption} ${executor ? styles.departmentRoleOptionActive : ""}`}>
          <input
            type="checkbox"
            checked={executor}
            onChange={() => toggle("EXECUTOR")}
          />
          Виконавці
        </label>
        <label className={`${styles.departmentRoleOption} ${involved ? styles.departmentRoleOptionActive : ""}`}>
          <input
            type="checkbox"
            checked={involved}
            onChange={() => toggle("INVOLVED")}
          />
          Залучені
        </label>
      </div>
    </fieldset>
  );
};
