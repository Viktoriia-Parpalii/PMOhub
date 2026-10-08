import { useState } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../../app/store";
import styles from "./BacklogModals.module.css";

export interface ResumeCandidate {
  kind: "project" | "task";
  name: string;
  sourceYearId: string;
  sourceYear: number;
  sourceRevision: number;
  targetYear: number;
  strategicGoal?: string;
}

export const ResumeBacklogModal = ({ candidate, years, onClose, onSuccess }: {
  candidate: ResumeCandidate;
  years: number[];
  onClose: () => void;
  onSuccess: (year: number) => void;
}) => {
  const { resumeBacklogYear, businessPeriod } = useAppContext();
  const availableYears = Array.from(new Set([...years, candidate.targetYear]))
    .filter((year) => year > candidate.sourceYear && year >= businessPeriod.year)
    .sort((a, b) => a - b);
  const [targetYear, setTargetYear] = useState(candidate.targetYear);
  const [isSaving, setIsSaving] = useState(false);
  const [strategicGoal, setStrategicGoal] = useState(candidate.strategicGoal ?? "");
  const label = candidate.kind === "project" ? "проєкт" : "операційну задачу";
  const handleResume = async () => {
    if (isSaving || !availableYears.includes(targetYear)) return;
    setIsSaving(true);
    try {
      const result = await resumeBacklogYear(
        candidate.kind, candidate.sourceYearId, candidate.sourceRevision,
        targetYear, strategicGoal,
      );
      if (result.success) onSuccess(targetYear);
    } finally {
      setIsSaving(false);
    }
  };
  return createPortal(
    <div className={styles.backdrop}>
      <div className={styles.backlogModal} role="dialog" aria-modal="true" aria-labelledby="resume-title">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle} id="resume-title">Відновити {label}</h2>
          <button type="button" onClick={onClose} aria-label="Закрити" className={styles.closeButton}>×</button>
        </div>
        <div className={styles.modalBody}>
          <p><strong>{candidate.name}</strong> має попередній запис у беклозі за {candidate.sourceYear} рік.</p>
          <p>Архівні роки залишаться без змін. У цільовому році буде створено підготовчий етап без квартальних карток і завдань.</p>
          <div>
            <label className={styles.fieldLabel} htmlFor="resume-year">Рік відновлення</label>
            <select id="resume-year" className={styles.nameInput} value={targetYear}
              onChange={(event) => setTargetYear(Number(event.target.value))}>
              {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div>
            <label className={styles.fieldLabel} htmlFor="resume-goal">Стратегічна задача нового року</label>
            <textarea id="resume-goal" className={styles.goalTextarea} rows={4} maxLength={2000}
              value={strategicGoal} onChange={(event) => setStrategicGoal(event.target.value)} />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" onClick={onClose} className={styles.footerCancel}>Скасувати</button>
          <button type="button" onClick={handleResume} disabled={isSaving || !availableYears.length}
            className={styles.footerSave}>{isSaving ? "Відновлення…" : `Відновити у ${targetYear} році`}</button>
        </div>
      </div>
    </div>, document.body,
  );
};
