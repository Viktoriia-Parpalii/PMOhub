import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../../app/store";
import {
  InitiativeRelationCandidate,
  InitiativeViewModel,
  Quarter,
} from "../../../shared/types";
import styles from "./BacklogModals.module.css";
import { notify } from "../../../components/ui/ToastNotifications";
import { NOTIFICATION_KINDS } from "../../../shared/constants/notificationConstants";
import type { ResumeCandidate } from "./ResumeBacklogModal";
import { loadInitiativeRelationCandidates } from "../../../api/apiClient";
import {
  FileText,
  Link2,
  LockKeyhole,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

interface BacklogModalProps {
  onClose: () => void;
  type: "PROJECTS" | "TASKS";
  editItem: InitiativeViewModel | null;
  selectedYear: number;
  isReadOnly?: boolean;
  onResumeCandidate?: (candidate: ResumeCandidate) => void;
}

export const BacklogModal = ({
  onClose,
  type,
  editItem,
  selectedYear,
  isReadOnly = false,
  onResumeCandidate,
}: BacklogModalProps) => {
  const { projects, tasks, updateProject, updateTask, createBacklogWithCards } =
    useAppContext();
  const sourceRecords = type === "PROJECTS" ? projects : tasks;
  const master = editItem
    ? sourceRecords.find(
        (item) => item.record_type === "YEAR" && item.id === editItem.id,
      )
    : undefined;
  const [name, setName] = useState(editItem?.name ?? "");
  const [strategicGoal, setStrategicGoal] = useState(
    editItem?.strategic_goal ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasRevisionConflict, setHasRevisionConflict] = useState(false);
  const initialRelations = useMemo(
    () => editItem?.relations ?? master?.relations ?? [],
    [editItem?.relations, master?.relations],
  );
  const [selectedRelations, setSelectedRelations] = useState<
    InitiativeRelationCandidate[]
  >(() =>
    initialRelations.map((relation) => ({
      initiative_id: relation.related_initiative_id,
      kind: relation.related_kind,
      name: relation.related_name,
      available_years: relation.available_years,
      relation_id: relation.id,
      relation_revision: relation.revision,
    })),
  );
  const [relationSearch, setRelationSearch] = useState(name);
  const [relationSearchEdited, setRelationSearchEdited] = useState(false);
  const [relationCandidates, setRelationCandidates] = useState<
    InitiativeRelationCandidate[]
  >([]);
  const [relationsLoading, setRelationsLoading] = useState(false);
  const [isManagingRelations, setIsManagingRelations] = useState(false);
  const [managementSnapshot, setManagementSnapshot] = useState<
    InitiativeRelationCandidate[]
  >([]);

  useEffect(() => {
    if (!relationSearchEdited) setRelationSearch(name);
  }, [name, relationSearchEdited]);

  useEffect(() => {
    const query = relationSearch.trim();
    if (isReadOnly || !isManagingRelations || query.length < 2) {
      setRelationCandidates([]);
      setRelationsLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setRelationsLoading(true);
      void loadInitiativeRelationCandidates(query, {
        excludeInitiativeId: master?.initiative_id ?? editItem?.initiative_id,
        signal: controller.signal,
      })
        .then(setRelationCandidates)
        .catch((error) => {
          if ((error as Error).name !== "AbortError") setRelationCandidates([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setRelationsLoading(false);
        });
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    editItem?.initiative_id,
    isManagingRelations,
    isReadOnly,
    master?.initiative_id,
    relationSearch,
  ]);

  const selectedIds = new Set(
    selectedRelations.map((relation) => relation.initiative_id),
  );
  const initialRelationIds = new Set(
    initialRelations.map((relation) => relation.related_initiative_id),
  );
  const startManagingRelations = () => {
    setManagementSnapshot(selectedRelations);
    setIsManagingRelations(true);
  };
  const cancelManagingRelations = () => {
    setSelectedRelations(managementSnapshot);
    setIsManagingRelations(false);
  };
  const toggleRelationCandidate = (candidate: InitiativeRelationCandidate) => {
    if (initialRelationIds.has(candidate.initiative_id)) return;
    setSelectedRelations((current) =>
      current.some((item) => item.initiative_id === candidate.initiative_id)
        ? current.filter(
            (item) => item.initiative_id !== candidate.initiative_id,
          )
        : [...current, candidate],
    );
  };
  const selectAllRelationCandidates = () => {
    setSelectedRelations((current) => {
      const currentIds = new Set(current.map((item) => item.initiative_id));
      return [
        ...current,
        ...relationCandidates.filter(
          (candidate) => !currentIds.has(candidate.initiative_id),
        ),
      ];
    });
  };
  const relationChanges = () => ({
    add_initiative_ids: selectedRelations
      .filter(
        (relation) =>
          !initialRelations.some(
            (initial) =>
              initial.related_initiative_id === relation.initiative_id,
          ),
      )
      .map((relation) => relation.initiative_id),
    remove_relations: initialRelations
      .filter(
        (initial) =>
          !selectedRelations.some(
            (relation) =>
              relation.initiative_id === initial.related_initiative_id,
          ),
      )
      .map((relation) => ({
        relation_id: relation.id,
        revision: relation.revision,
      })),
  });

  const metadata = () => ({
    name: name.trim(),
    strategic_goal: strategicGoal,
    implementer_dept_ids: [],
    cross_functional_dept_ids: [],
  });
  const handleSave = async () => {
    if (isSaving || hasRevisionConflict) return;
    if (!name.trim()) {
      notify(
        NOTIFICATION_KINDS.error,
        `Вкажіть назву ${type === "PROJECTS" ? "проєкту" : "операційної задачі"}`,
      );
      return;
    }
    setIsSaving(true);
    try {
      if (editItem && master) {
        const result = await (type === "PROJECTS"
          ? updateProject(master.id, {
              ...metadata(),
              relation_changes: relationChanges(),
            })
          : updateTask(master.id, {
              ...metadata(),
              relation_changes: relationChanges(),
            }));
        if (!result.success) {
          notify(NOTIFICATION_KINDS.error, result.message);
          if (result.errorCode === "REVISION_CONFLICT")
            setHasRevisionConflict(true);
          return;
        }
      } else {
        const id = `${type === "PROJECTS" ? "PRJ" : "TSK"}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const base = {
          id,
          ...metadata(),
          year: selectedYear,
          quarter: "Q1" as Quarter,
          health_status: "DEFAULT" as const,
          checklist: [],
          record_type: "YEAR" as const,
          initiative_id: id,
          history: [],
          related_initiative_ids: selectedRelations.map(
            (relation) => relation.initiative_id,
          ),
        };
        const result = await createBacklogWithCards(
          type === "PROJECTS" ? "project" : "task",
          base as InitiativeViewModel,
          [],
        );
        if (!result.success) {
          if (result.status !== "COMMIT_FAILED")
            notify(NOTIFICATION_KINDS.error, result.message);
          if (result.errorCode === "INITIATIVE_NAME_CONFLICT" && result.errorDetails &&
            typeof result.errorDetails === "object") {
            const details = result.errorDetails as Record<string, unknown>;
            if (!details.target_year_exists && typeof details.source_year_id === "string" &&
              typeof details.source_year === "number" && typeof details.source_revision === "number") {
              onResumeCandidate?.({
                kind: type === "PROJECTS" ? "project" : "task",
                name: name.trim(),
                sourceYearId: details.source_year_id,
                sourceYear: details.source_year,
                sourceRevision: details.source_revision,
                targetYear: selectedYear,
                strategicGoal,
              });
            }
          }
          return;
        }
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className={styles.backdrop}>
      <div className={styles.backlogModal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {editItem
              ? isReadOnly
                ? `Перегляд ${type === "PROJECTS" ? "проєкту" : "операційної задачі"} за ${selectedYear}`
                : `Редагувати ${type === "PROJECTS" ? "проєкт" : "операційну задачу"} в ${selectedYear}`
              : `Створити ${type === "PROJECTS" ? "проєкт" : "операційну задачу"} в ${selectedYear}`}
          </h2>
          <button
            onClick={onClose}
            aria-label="Закрити"
            className={styles.closeButton}
          >
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <div>
            <label className={styles.fieldLabel}>
              Назва <span className={styles.required}>*</span>
            </label>
            <input
              disabled={isReadOnly}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={styles.nameInput}
            />
          </div>
          <section className={styles.relationsSection}>
            {!isManagingRelations ? (
              <>
                <div className={styles.relationsHeading}>
                  <div className={styles.relationsTitleRow}>
                    <Link2 size={20} aria-hidden="true" />
                    <h3>Пов’язані ініціативи</h3>
                    {!!selectedRelations.length && (
                      <span className={styles.relationsCount}>
                        {selectedRelations.length}
                      </span>
                    )}
                  </div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      className={styles.addRelationsButton}
                      onClick={startManagingRelations}
                    >
                      <Plus size={18} aria-hidden="true" />
                      Додати
                    </button>
                  )}
                </div>
                {!!selectedRelations.length ? (
                  <div className={styles.selectedRelations}>
                    {selectedRelations.map((relation) => (
                      <div
                        key={relation.initiative_id}
                        className={styles.selectedRelation}
                      >
                        <span className={styles.relationDocumentIcon}>
                          <FileText size={20} aria-hidden="true" />
                        </span>
                        <span className={styles.selectedRelationContent}>
                          <span className={styles.relationKind}>
                            {relation.kind === "PROJECT"
                              ? "Проєкт"
                              : "Операційна задача"}
                          </span>
                          <strong className={styles.relationName}>
                            {relation.name}
                          </strong>
                          <span className={styles.candidateYears}>
                            {relation.available_years.length
                              ? `Роки: ${relation.available_years.join(", ")}`
                              : "Роки не вказані"}
                          </span>
                        </span>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedRelations((current) =>
                                current.filter(
                                  (item) =>
                                    item.initiative_id !==
                                    relation.initiative_id,
                                ),
                              )
                            }
                            className={styles.removeRelation}
                            aria-label={`Прибрати зв’язок з ${relation.name}`}
                            title="Прибрати зв’язок"
                          >
                            <Trash2 size={18} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyRelations}>
                    Пов’язаних ініціатив ще немає.
                  </p>
                )}
                <p className={styles.relationsDisclaimer}>
                  Зв’язки не об’єднують дані або квартальні картки.
                </p>
              </>
            ) : (
              <>
                <div className={styles.relationManagerHeading}>
                  <h3>Додати пов’язані ініціативи</h3>
                  <div className={styles.relationManagerSummary}>
                    {!!relationCandidates.length && (
                      <button
                        type="button"
                        onClick={selectAllRelationCandidates}
                      >
                        Вибрати всі доступні
                      </button>
                    )}
                    <span>Вибрано: {selectedRelations.length}</span>
                  </div>
                </div>
                <div className={styles.relationSearchField}>
                  <Search size={19} aria-hidden="true" />
                  <input
                    id="relation-search"
                    aria-label="Пошук пов’язаних ініціатив"
                    value={relationSearch}
                    onChange={(event) => {
                      setRelationSearchEdited(true);
                      setRelationSearch(event.target.value);
                    }}
                    placeholder="Введіть щонайменше два символи"
                    autoFocus
                  />
                  {!!relationSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setRelationSearchEdited(true);
                        setRelationSearch("");
                      }}
                      aria-label="Очистити пошук"
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <div className={styles.relationResults} aria-live="polite">
                  {relationsLoading && (
                    <p className={styles.relationHint}>Пошук…</p>
                  )}
                  {!relationsLoading && relationSearch.trim().length < 2 && (
                    <p className={styles.relationHint}>
                      Введіть щонайменше два символи для пошуку.
                    </p>
                  )}
                  {!relationsLoading && relationSearch.trim().length >= 2 &&
                    !relationCandidates.length && (
                      <p className={styles.relationHint}>Збігів не знайдено.</p>
                    )}
                  {!relationsLoading &&
                    relationCandidates.map((candidate) => {
                      const selected = selectedIds.has(candidate.initiative_id);
                      const locked = initialRelationIds.has(
                        candidate.initiative_id,
                      );
                      return (
                        <label
                          key={candidate.initiative_id}
                          className={`${styles.relationCandidate} ${
                            locked ? styles.relationCandidateLocked : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={locked}
                            onChange={() => toggleRelationCandidate(candidate)}
                          />
                          <span className={styles.relationDocumentIcon}>
                            <FileText size={19} aria-hidden="true" />
                          </span>
                          <span className={styles.candidateContent}>
                            <span className={styles.candidateTitle}>
                              <span className={styles.relationKind}>
                                {candidate.kind === "PROJECT"
                                  ? "Проєкт"
                                  : "Операційна задача"}
                              </span>
                              <strong>{candidate.name}</strong>
                            </span>
                            <span className={styles.candidateYears}>
                              {locked
                                ? "Уже пов’язано з цією ініціативою"
                                : candidate.available_years.length
                                  ? `Роки: ${candidate.available_years.join(", ")}`
                                  : "Роки не вказані"}
                            </span>
                          </span>
                          {locked && (
                            <LockKeyhole size={18} aria-label="Уже пов’язано" />
                          )}
                        </label>
                      );
                    })}
                </div>
                <div className={styles.relationManagerActions}>
                  <button type="button" onClick={cancelManagingRelations}>
                    Скасувати
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsManagingRelations(false)}
                    className={styles.confirmRelationsButton}
                  >
                    Пов’язати вибрані ({selectedRelations.length})
                  </button>
                </div>
              </>
            )}
          </section>
          <div>
            <label className={styles.fieldLabel}>Стратегічна задача</label>
            <textarea
              disabled={isReadOnly}
              value={strategicGoal}
              onChange={(event) => setStrategicGoal(event.target.value)}
              rows={5}
              className={styles.goalTextarea}
              placeholder="Введіть назву стратегічної задачі за наявності"
            />
          </div>
          <p className={styles.infoBox}>
            Після збереження заповніть менеджера, пріоритет і залучені
            підрозділи у картці <b>«Підготовчий етап»</b>. Виконавців можна
            налаштувати лише в квартальних картках.
          </p>
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.footerCancel}>
            {isReadOnly ? "Закрити" : "Скасувати"}
          </button>
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={isSaving || hasRevisionConflict}
              className={styles.footerSave}
            >
              {isSaving
                ? "Збереження…"
                : hasRevisionConflict
                  ? "Оновіть запис"
                  : "Зберегти"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
