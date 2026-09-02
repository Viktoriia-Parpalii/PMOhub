import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Copy, Plus, Trash2, X } from "lucide-react";
import { useAppContext } from "../../../app/store";
import {
  ChecklistItem,
  CustomFieldDef,
  MutationResult,
  Priority,
  InitiativeViewModel,
  QuarterCardReadModel,
  Quarter,
} from "../../../shared/types";
import {
  getCurrentPeriod,
  getCurrentQuarter,
  getValidYears,
  isPeriodLocked,
  qToNum,
} from "../../../shared/utils";
import {
  makeWeightSnapshot,
  validateChecklistAssignments,
} from "../../../domain/capacity";
import { canEditInitiative, getPermissions } from "../../../domain/permissions";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";
import styles from "./InitiativeCardModal.module.css";
import { SYSTEM_MESSAGES } from "../../../shared/constants/systemMessages";
import { InitiativeHistory } from "./InitiativeHistory";
import { useAuditQuery } from "../../../api/hooks";
import { ApiError, loadInitiativeCardModel } from "../../../api/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../api/queryClient";
import { notify } from "../../../components/ui/ToastNotifications";
import { NOTIFICATION_KINDS } from "../../../shared/constants/notificationConstants";

type Initiative = InitiativeViewModel;
type Kind = "project" | "task";
interface Props {
  kind: Kind;
  item: Initiative | null;
  onClose: () => void;
  onSave: (
    item: Initiative,
  ) => void | MutationResult | Promise<void | MutationResult>;
  onDelete?: (id: string) => void | Promise<void>;
  isReadOnly?: boolean;
  openInViewMode?: boolean;
  defaultYear?: number;
  defaultQuarter?: Quarter;
}
const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];
const statusDots: Array<{
  value: ChecklistItem["color"];
  label: string;
  color: string;
}> = [
  {
    value: "DEFAULT",
    label: "Без статусу",
    color: "bg-slate-400 ring-slate-400",
  },
  {
    value: "GREEN",
    label: "Виконано",
    color: "bg-emerald-500 ring-emerald-500",
  },
  { value: "YELLOW", label: "В процесі", color: "bg-amber-400 ring-amber-400" },
  {
    value: "RED",
    label: "На паузі / блоковано",
    color: "bg-rose-400 ring-rose-400",
  },
];
const makeItem = (text = ""): ChecklistItem => ({
  id: `SCOPE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  text,
  is_completed: false,
  color: "DEFAULT",
  implementer_dept_ids: [],
});

export const InitiativeCardModal = ({
  kind,
  item,
  onClose,
  onSave,
  onDelete,
  isReadOnly: locked = false,
  openInViewMode = false,
  defaultYear,
  defaultQuarter,
}: Props) => {
  const queryClient = useQueryClient();
  const {
    customFields,
    departments,
    managers,
    priorities,
    taskWeights,
    projects,
    tasks,
    moveCard,
    continueCard,
    moveScopeItem,
    copyScopeItem,
    currentUser,
    rolePermissions,
  } = useAppContext();
  const records = kind === "project" ? projects : tasks;
  const year = item?.year ?? defaultYear ?? new Date().getFullYear();
  const quarter = item?.quarter ?? defaultQuarter ?? getCurrentQuarter();
  const noun = kind === "project" ? "проєкту" : "операційної задачі";
  const canSwitchToEdit = Boolean(
    item && !locked && canEditInitiative(item, currentUser, rolePermissions),
  );
  const permissions = getPermissions(currentUser, rolePermissions);
  const canCopyScope = Boolean(
    item && permissions?.canCreateEditInitiatives && !permissions.isReadOnly,
  );
  const hasCompletedScope = Boolean(
    item?.checklist.some(
      (scopeItem) =>
        scopeItem.status_code === "GREEN" || scopeItem.color === "GREEN",
    ),
  );
  const scopeWeightLocked = Boolean(
    item && (item.is_locked ?? isPeriodLocked(year, quarter)),
  );
  const [name, setName] = useState(item?.name ?? "");
  const [goal, setGoal] = useState(item?.strategic_goal ?? "");
  const [managerId, setManagerId] = useState(item?.manager_id ?? "");
  const [priority, setPriority] = useState<Priority | "">(item?.priority ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [involved, setInvolved] = useState<string[]>(
    item?.cross_functional_dept_ids ?? [],
  );
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    item?.checklist ?? [],
  );
  const [fieldVals, setFieldVals] = useState<Record<string, unknown>>(
    item?.custom_fields ?? {},
  );
  const [activeTab, setActiveTab] = useState<"SCOPE" | "HISTORY">("SCOPE");
  const auditQuery = useAuditQuery(
    activeTab === "HISTORY" && item ? "QuarterCard" : undefined,
    activeTab === "HISTORY" ? item?.id : undefined,
  );
  const [newText, setNewText] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [hasRevisionConflict, setHasRevisionConflict] = useState(false);
  const [committedRefreshFailed, setCommittedRefreshFailed] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(locked || openInViewMode);
  const nextPeriod =
    quarter === "Q4"
      ? { year: year + 1, quarter: "Q1" as Quarter }
      : { year, quarter: quarters[quarters.indexOf(quarter) + 1] };
  const currentPeriod = getCurrentPeriod();
  const nextIndex = nextPeriod.year * 10 + qToNum(nextPeriod.quarter);
  const currentIndex = currentPeriod.year * 10 + qToNum(currentPeriod.quarter);
  const initialMovePeriod =
    currentIndex > nextIndex ? currentPeriod : nextPeriod;
  const [showMove, setShowMove] = useState(false);
  const [moveYear, setMoveYear] = useState(initialMovePeriod.year);
  const [moveQuarter, setMoveQuarter] = useState<Quarter>(
    initialMovePeriod.quarter,
  );
  const [movingId, setMovingId] = useState<string | null>(null);
  const [scopeTransferMode, setScopeTransferMode] = useState<"MOVE" | "COPY">(
    "MOVE",
  );
  const hasUnsavedChanges =
    Boolean(item) &&
    (managerId !== (item?.manager_id ?? "") ||
      priority !== (item?.priority ?? "") ||
      notes !== (item?.notes ?? "") ||
      JSON.stringify(involved) !==
        JSON.stringify(item?.cross_functional_dept_ids ?? []) ||
      JSON.stringify(checklist) !== JSON.stringify(item?.checklist ?? []) ||
      JSON.stringify(fieldVals) !== JSON.stringify(item?.custom_fields ?? {}));
  const refreshCanonicalCard = async () => {
    if (!item) return;
    const response = await loadInitiativeCardModel(item.id);
    queryClient.setQueryData(queryKeys.initiativeCard(item.id), response.data);
    queryClient.setQueriesData<QuarterCardReadModel[]>(
      { queryKey: ["quarter-cards", kind] },
      (current) =>
        current?.map((card) => (card.id === item.id ? response.data : card)),
    );
    await queryClient.invalidateQueries({
      queryKey: ["analytics"],
      refetchType: "none",
    });
    await queryClient.refetchQueries({
      queryKey: ["initiative-years", kind],
      type: "active",
    });
  };
  const executors = useMemo(
    () =>
      Array.from(
        new Set(checklist.flatMap((scope) => scope.implementer_dept_ids ?? [])),
      ),
    [checklist],
  );
  const effectiveInvolved = involved.filter((id) => !executors.includes(id));
  const selectableExecutors = Array.from(
    new Set([...effectiveInvolved, ...executors]),
  );
  const customFieldsForKind = customFields.filter(
    (field) =>
      field.entityType === kind &&
      (field.isActive !== false || fieldVals[field.id] !== undefined),
  );
  const updateScope = (id: string, patch: Partial<ChecklistItem>) =>
    setChecklist((items) =>
      items.map((scope) => (scope.id === id ? { ...scope, ...patch } : scope)),
    );
  const setExecutor = (scope: ChecklistItem, id: string) => {
    const ids = scope.implementer_dept_ids ?? [];
    updateScope(scope.id, {
      implementer_dept_ids: ids.includes(id)
        ? ids.filter((value) => value !== id)
        : [...ids, id],
    });
  };
  const closeMove = () => {
    setShowMove(false);
    setMovingId(null);
  };
  const performMove = async () =>
    !item
      ? undefined
      : movingId
        ? scopeTransferMode === "COPY"
          ? copyScopeItem(
              item.id,
              movingId,
              moveYear,
              moveQuarter,
              kind === "project",
            )
          : moveScopeItem(
              item.id,
              movingId,
              moveYear,
              moveQuarter,
              kind === "project",
            )
        : moveCard(item.id, moveYear, moveQuarter, kind === "project");
  const requestMove = async () => {
    if (isPending || hasRevisionConflict || committedRefreshFailed) return;
    if (!item) {
      notify(
        NOTIFICATION_KINDS.error,
        SYSTEM_MESSAGES.initiatives.saveNewCardFirst,
      );
      return;
    }
    if (
      hasUnsavedChanges &&
      !window.confirm(SYSTEM_MESSAGES.initiatives.discardDraftForTransfer)
    )
      return;
    setIsPending(true);
    try {
      const result = await performMove();
      if (!result) return;
      if (!result.success) {
        notify(NOTIFICATION_KINDS.error, result.message);
        return;
      }
      onClose();
    } finally {
      setIsPending(false);
    }
  };
  const requestContinuation = async () => {
    if (!item || isPending) return;
    setIsPending(true);
    try {
      const result = await continueCard(
        item.id,
        moveYear,
        moveQuarter,
        kind === "project",
      );
      if (!result.success) {
        notify(NOTIFICATION_KINDS.error, result.message);
        return;
      }
      onClose();
    } finally {
      setIsPending(false);
    }
  };
  const save = async () => {
    if (isPending) return;
    if (hasRevisionConflict && item) {
      setIsPending(true);
      try {
        await refreshCanonicalCard();
        setHasRevisionConflict(false);
        notify(
          NOTIFICATION_KINDS.success,
          "Актуальну версію завантажено. Перевірте чернетку та збережіть ще раз.",
        );
      } catch (refreshError) {
        notify(
          NOTIFICATION_KINDS.error,
          refreshError instanceof ApiError
            ? refreshError.message
            : SYSTEM_MESSAGES.api.genericError,
        );
      } finally {
        setIsPending(false);
      }
      return;
    }
    if (committedRefreshFailed && item) {
      setIsPending(true);
      try {
        await refreshCanonicalCard();
        setCommittedRefreshFailed(false);
        onClose();
      } catch (refreshError) {
        notify(
          NOTIFICATION_KINDS.error,
          refreshError instanceof ApiError
            ? refreshError.message
            : SYSTEM_MESSAGES.api.genericError,
        );
      } finally {
        setIsPending(false);
      }
      return;
    }
    if (!name.trim()) {
      notify(NOTIFICATION_KINDS.error, `Вкажіть назву ${noun}`);
      return;
    }
    const validation = validateChecklistAssignments(checklist, taskWeights);
    if (validation.length) {
      notify(NOTIFICATION_KINDS.error, validation.join(" • "));
      return;
    }
    setIsPending(true);
    try {
      const result = await onSave({
        ...(item ?? {}),
        id:
          item?.id ??
          `${kind === "project" ? "PRJ" : "TSK"}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        name: name.trim(),
        strategic_goal: goal,
        manager_id: managerId || undefined,
        priority: priority || undefined,
        notes,
        implementer_dept_ids: executors,
        cross_functional_dept_ids: effectiveInvolved,
        custom_fields: fieldVals,
        year,
        quarter,
        health_status: item?.health_status ?? "DEFAULT",
        checklist,
        record_type: "CARD",
        initiative_id: item?.initiative_id ?? item?.id ?? "",
        initiative_year_id: item?.initiative_year_id,
        history: item?.history ?? [],
      } as Initiative);
      if (result && !result.success) {
        notify(NOTIFICATION_KINDS.error, result.message);
        if (result.errorCode === "REVISION_CONFLICT")
          setHasRevisionConflict(true);
        if (result.status === "COMMITTED_REFRESH_FAILED")
          setCommittedRefreshFailed(true);
      }
    } finally {
      setIsPending(false);
    }
  };
  const requestDelete = async () => {
    if (!item || !onDelete || isPending) return;
    if (hasCompletedScope) {
      notify(
        NOTIFICATION_KINDS.error,
        SYSTEM_MESSAGES.initiatives.cardHasCompletedScope,
      );
      return;
    }
    setIsPending(true);
    try {
      await onDelete(item.id);
    } finally {
      setIsPending(false);
    }
  };
  const resize = (event: React.FormEvent<HTMLTextAreaElement>) => {
    event.currentTarget.style.height = "auto";
    event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
  };
  const setCustomFieldValue = (fieldId: string, value: unknown) =>
    setFieldVals((values) => ({ ...values, [fieldId]: value }));
  const renderCustomField = (field: CustomFieldDef) => {
    const value = fieldVals[field.id];
    if (field.type === "RICHTEXT")
      return (
        <RichTextEditor
          disabled={isReadOnly}
          value={String(value ?? "")}
          onChange={(nextValue) => setCustomFieldValue(field.id, nextValue)}
          placeholder="Значення..."
        />
      );
    if (field.type === "SELECT")
      return (
        <select
          disabled={isReadOnly}
          value={String(value ?? "")}
          onChange={(event) =>
            setCustomFieldValue(field.id, event.target.value)
          }
          className="modal-field mt-1"
        >
          <option value="">Не обрано</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    if (field.type === "CHECKBOX")
      return (
        <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={Boolean(value)}
            onChange={(event) =>
              setCustomFieldValue(field.id, event.target.checked)
            }
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
          />
          <span>Так</span>
        </label>
      );
    if (field.type === "NUMBER")
      return (
        <input
          type="number"
          disabled={isReadOnly}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(event) =>
            setCustomFieldValue(
              field.id,
              event.target.value === "" ? "" : Number(event.target.value),
            )
          }
          className="modal-field mt-1"
          placeholder="Значення..."
        />
      );
    return (
      <textarea
        disabled={isReadOnly}
        value={String(value ?? "")}
        onChange={(event) => setCustomFieldValue(field.id, event.target.value)}
        rows={1}
        className="modal-field mt-1 min-h-[44px] resize-y"
        placeholder="Значення..."
      />
    );
  };
  const movePanel = (scopeMove: boolean) => {
    const current = getCurrentPeriod();
    const isContinuationPeriod = (
      candidateYear: number,
      candidateQuarter: Quarter,
    ) => {
      const candidate = candidateYear * 10 + qToNum(candidateQuarter);
      return (
        candidate >= current.year * 10 + qToNum(current.quarter) &&
        candidate > year * 10 + qToNum(quarter)
      );
    };
    const years = scopeMove
      ? getValidYears(year)
      : getValidYears().filter((candidateYear) =>
          quarters.some((candidateQuarter) =>
            isContinuationPeriod(candidateYear, candidateQuarter),
          ),
        );
    const availableQuarters = scopeMove
      ? quarters
      : quarters.filter((candidateQuarter) =>
          isContinuationPeriod(moveYear, candidateQuarter),
        );
    return (
      <section className={`move-panel ${scopeMove ? "mt-3" : "mb-4"}`}>
        <h3>
          {scopeMove && scopeTransferMode === "COPY" ? (
            <Copy size={16} />
          ) : (
            <ArrowRight size={16} />
          )}
          {scopeMove
            ? scopeTransferMode === "COPY"
              ? "Копіювання завдання в інший період"
              : "Перенесення завдання в інший період"
            : "Продовжити / перенести картку"}
        </h3>
        <div className={styles.moveControls}>
          <label className="modal-label w-46">
            Цільовий рік
            <select
              value={moveYear}
              onChange={(event) => {
                const nextYear = Number(event.target.value);
                setMoveYear(nextYear);
                const firstQuarter = scopeMove
                  ? moveQuarter
                  : quarters.find((candidateQuarter) =>
                      isContinuationPeriod(nextYear, candidateQuarter),
                    );
                if (firstQuarter) setMoveQuarter(firstQuarter);
              }}
              className="modal-field mt-1"
            >
              {years.map((value) => (
                <option key={value} value={value}>
                  {value} рік
                </option>
              ))}
            </select>
          </label>
          <label className="modal-label w-36">
            Квартал
            <select
              value={moveQuarter}
              onChange={(event) =>
                setMoveQuarter(event.target.value as Quarter)
              }
              className="modal-field mt-1"
            >
              {availableQuarters.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          {!scopeMove && (
            <button
              type="button"
              onClick={requestContinuation}
              disabled={isPending || hasRevisionConflict}
              className="modal-secondary h-10 px-3 text-sm text-emerald-900"
            >
              Продовжити
            </button>
          )}
          <button
            type="button"
            onClick={requestMove}
            disabled={isPending}
            className="modal-secondary h-10 px-3 text-sm text-indigo-900"
          >
            {scopeMove && scopeTransferMode === "COPY"
              ? "Копіювати"
              : "Перенести"}
          </button>
          <button
            type="button"
            onClick={closeMove}
            className="h-10 px-2 text-sm font-extrabold text-indigo-600"
          >
            Скасувати
          </button>
        </div>
      </section>
    );
  };

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <header className={styles.header}>
          <h2 className={styles.title}>
            {item
              ? isReadOnly
                ? `Перегляд ${noun}`
                : `Редагування ${noun}`
              : `Створення ${noun}`}
          </h2>
          {item && !isReadOnly && (
            <div className={styles.desktopActions}>
              <button
                type="button"
                onClick={() => {
                  setMovingId(null);
                  setShowMove(true);
                }}
                className={`modal-secondary ${styles.headerAction} ${styles.continueAction}`}
              >
                <ArrowRight size={16} />
                Продовжити / Перенести
              </button>
              {onDelete && (
                <button
                  type="button"
                  onClick={requestDelete}
                  disabled={isPending || hasCompletedScope}
                  title={
                    hasCompletedScope
                      ? SYSTEM_MESSAGES.initiatives.cardHasCompletedScope
                      : undefined
                  }
                  className={`modal-secondary ${styles.headerAction} ${styles.deleteAction}`}
                >
                  <Trash2 size={16} className="text-rose-500" />
                  Видалити з кварталу
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            aria-label="Закрити"
            onClick={onClose}
            className={styles.closeButton}
          >
            <X size={24} />
          </button>
        </header>
        <main className={`${styles.content} modal-scroll`}>
          {showMove && !movingId && movePanel(false)}
          {item && !isReadOnly && (
            <div className={styles.mobileActions}>
              <button
                type="button"
                onClick={() => {
                  setMovingId(null);
                  setShowMove(true);
                }}
                className={`modal-secondary ${styles.mobileAction} ${styles.mobileContinueAction}`}
              >
                <ArrowRight size={15} />
                Продовжити
              </button>
              {onDelete && (
                <button
                  type="button"
                  onClick={requestDelete}
                  disabled={isPending || hasCompletedScope}
                  title={
                    hasCompletedScope
                      ? SYSTEM_MESSAGES.initiatives.cardHasCompletedScope
                      : undefined
                  }
                  className={`modal-secondary ${styles.mobileAction}`}
                >
                  <Trash2 size={15} className="text-rose-500" />
                  Видалити з кварталу
                </button>
              )}
            </div>
          )}
          <div>
            <label className="modal-label">
              Назва <span className="text-rose-500">*</span>
            </label>
            <input
              disabled={Boolean(item) || isReadOnly}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="modal-field text-lg leading-6 font-semibold"
              placeholder={`Введіть назву ${noun}...`}
            />
          </div>
          <div className={styles.formGrid}>
            <label className="modal-label">
              Менеджер
              <select
                disabled={isReadOnly}
                value={managerId}
                onChange={(event) => setManagerId(event.target.value)}
                className="modal-field mt-1"
              >
                <option value="">Не обрано</option>
                {managers
                  .filter(
                    (manager) =>
                      manager.is_active !== false || manager.id === managerId,
                  )
                  .map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="modal-label">
              Пріоритет
              <select
                disabled={isReadOnly}
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="modal-field mt-1"
              >
                <option value="">Не обрано</option>
                {priorities
                  .filter(
                    (option) =>
                      option.is_active !== false || option.id === priority,
                  )
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <section>
            <div className={styles.involvedHeader}>
              <h3 className="modal-label mb-0">Залучені підрозділи</h3>
              {executors.length > 0 && (
                <span className={styles.executorCount}>
                  Виконавці зі скоупу ({executors.length})
                </span>
              )}
            </div>
            <div className={styles.departmentPanel}>
              <div className={styles.departmentList}>
                {departments
                  .filter(
                    (department) =>
                      department.is_active !== false ||
                      effectiveInvolved.includes(department.id) ||
                      executors.includes(department.id),
                  )
                  .map((department) => {
                    const executor = executors.includes(department.id);
                    const selected = effectiveInvolved.includes(department.id);
                    return (
                      <button
                        type="button"
                        disabled={isReadOnly || executor}
                        key={department.id}
                        onClick={() =>
                          setInvolved((ids) =>
                            ids.includes(department.id)
                              ? ids.filter((id) => id !== department.id)
                              : [...ids, department.id],
                          )
                        }
                        className={`department-chip ${executor ? "department-chip-executor" : selected ? "department-chip-involved" : "department-chip-idle"}`}
                      >
                        {executor ? "★ " : selected ? "✓ " : ""}
                        {department.name}
                        {executor && (
                          <span className="executor-chip-label">
                            Виконавець
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
            <p className={styles.departmentHelp}>
              Оберіть залучені підрозділи. Виконавці обираються індивідуально у
              кожному завданні скоупу.
            </p>
          </section>
          <div>
            <label className="modal-label">Стратегічна задача</label>
            <textarea
              disabled={Boolean(item) || isReadOnly}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              onInput={resize}
              rows={1}
              className="modal-field min-h-[52px] resize-y overflow-hidden"
              placeholder="Опишіть стратегічну задачу..."
            />
          </div>
          <section className={styles.scopePanel}>
            <div className={styles.tabs}>
              <button
                type="button"
                onClick={() => setActiveTab("SCOPE")}
                className={`modal-tab ${activeTab === "SCOPE" ? "modal-tab-active" : ""}`}
              >
                СКОУП РОБІТ (ЗАВДАННЯ) ({checklist.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("HISTORY")}
                className={`modal-tab ${activeTab === "HISTORY" ? "modal-tab-active" : ""}`}
              >
                Історія змін
              </button>
            </div>
            {activeTab === "SCOPE" ? (
              <div className={styles.scopeBody}>
                <div className={styles.scopeList}>
                  {scopeWeightLocked && (
                    <p className={styles.lockedNotice}>
                      Вага та склад обсягу робіт в архівному періоді
                      зафіксовані.
                    </p>
                  )}
                  {checklist.length === 0 && (
                    <div className={styles.emptyScope}>
                      Завдань у скоупі поки немає. Додайте перше завдання нижче.
                    </div>
                  )}
                  {checklist.map((scope, index) => (
                    <div
                      key={scope.id}
                      className={`scope-item scope-item-${scope.color ?? "DEFAULT"}`}
                    >
                      <div className={styles.scopeInputRow}>
                        <span className="scope-item-number">{index + 1}.</span>
                        <input
                          disabled={isReadOnly}
                          value={scope.text}
                          onChange={(event) =>
                            updateScope(scope.id, { text: event.target.value })
                          }
                          className={styles.scopeTextInput}
                          placeholder="Назва завдання"
                        />
                      </div>
                      <div className={styles.scopeControls}>
                        <select
                          disabled={isReadOnly || scopeWeightLocked}
                          value={
                            scope.weightId ??
                            scope.weightSnapshot?.definitionId ??
                            ""
                          }
                          onChange={(event) => {
                            const definition = taskWeights.find(
                              (weight) => weight.id === event.target.value,
                            );
                            if (definition)
                              updateScope(scope.id, {
                                weightId: definition.id,
                                weightSnapshot: makeWeightSnapshot(definition),
                              });
                          }}
                          className="scope-select shrink-0"
                        >
                          <option value="">Вага</option>
                          {scope.weightSnapshot &&
                            !taskWeights.some(
                              (weight) =>
                                weight.id ===
                                  (scope.weightId ??
                                    scope.weightSnapshot?.definitionId) &&
                                weight.is_active,
                            ) && (
                              <option
                                value={
                                  scope.weightId ??
                                  scope.weightSnapshot.definitionId ??
                                  `legacy-${scope.id}`
                                }
                              >
                                {scope.weightSnapshot.name} (
                                {scope.weightSnapshot.value}) · архівне
                              </option>
                            )}
                          {taskWeights
                            .filter((weight) => weight.is_active)
                            .map((weight) => (
                              <option key={weight.id} value={weight.id}>
                                {weight.name} ({weight.weight})
                              </option>
                            ))}
                        </select>
                        <select
                          disabled={
                            isReadOnly || selectableExecutors.length === 0
                          }
                          value=""
                          onChange={(event) => {
                            if (event.target.value)
                              setExecutor(scope, event.target.value);
                          }}
                          className="scope-select min-w-[155px] shrink-0"
                        >
                          <option value="">Додати виконавця</option>
                          {departments
                            .filter(
                              (department) =>
                                selectableExecutors.includes(department.id) &&
                                department.is_active !== false &&
                                !(scope.implementer_dept_ids ?? []).includes(
                                  department.id,
                                ),
                            )
                            .map((department) => (
                              <option key={department.id} value={department.id}>
                                {department.name}
                              </option>
                            ))}
                        </select>
                        <div className={styles.statusOptions}>
                          {statusDots.map((dot) => (
                            <button
                              type="button"
                              disabled={isReadOnly}
                              key={dot.value}
                              aria-label={dot.label}
                              title={dot.label}
                              onClick={() =>
                                updateScope(scope.id, {
                                  color: dot.value,
                                  is_completed: dot.value === "GREEN",
                                })
                              }
                              className={`h-4 w-4 rounded-full ${dot.color} ${scope.color === dot.value ? "ring-2 ring-offset-2" : "opacity-80 hover:opacity-100"}`}
                            />
                          ))}
                        </div>
                        {item && !isReadOnly && (
                          <button
                            type="button"
                            title="Перенести завдання"
                            disabled={scope.color === "GREEN"}
                            onClick={() => {
                              setMovingId(scope.id);
                              setScopeTransferMode("MOVE");
                              setShowMove(true);
                            }}
                            className="icon-action shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowRight size={17} />
                          </button>
                        )}
                        {canCopyScope && (
                          <button
                            type="button"
                            title="Копіювати завдання"
                            disabled={scope.color === "GREEN"}
                            onClick={() => {
                              setMovingId(scope.id);
                              setScopeTransferMode("COPY");
                              setShowMove(true);
                            }}
                            className="icon-action shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Copy size={16} />
                          </button>
                        )}
                        {!isReadOnly && !scopeWeightLocked && (
                          <button
                            type="button"
                            title="Видалити завдання"
                            onClick={() =>
                              setChecklist((items) =>
                                items.filter(
                                  (candidate) => candidate.id !== scope.id,
                                ),
                              )
                            }
                            className="icon-action shrink-0 text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      {(scope.implementer_dept_ids ?? []).length > 0 && (
                        <div className={styles.implementerList}>
                          {(scope.implementer_dept_ids ?? []).map((id) => {
                            const department = departments.find(
                              (candidate) => candidate.id === id,
                            );
                            return department ? (
                              <button
                                type="button"
                                disabled={isReadOnly}
                                key={id}
                                onClick={() => setExecutor(scope, id)}
                                className="department-chip department-chip-executor"
                              >
                                ★ {department.name} ×
                              </button>
                            ) : null;
                          })}
                        </div>
                      )}
                      {showMove && movingId === scope.id && movePanel(true)}
                    </div>
                  ))}
                </div>
                {!isReadOnly && !scopeWeightLocked && (
                  <div className={styles.addScope}>
                    <input
                      value={newText}
                      onChange={(event) => setNewText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          setChecklist((items) => [
                            ...items,
                            makeItem(newText.trim()),
                          ]);
                          setNewText("");
                        }
                      }}
                      className="modal-field h-10 flex-1"
                      placeholder="+ Додати нове завдання..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setChecklist((items) => [
                          ...items,
                          makeItem(newText.trim()),
                        ]);
                        setNewText("");
                      }}
                      className="modal-secondary h-10 px-4 text-sm text-indigo-600"
                    >
                      <Plus size={16} />
                      Додати
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <InitiativeHistory events={auditQuery.data ?? []} />
            )}
          </section>
          <div>
            <label className="modal-label mb-2">Примітки</label>
            <RichTextEditor
              disabled={isReadOnly}
              value={notes}
              onChange={setNotes}
              placeholder="Коментарі, блокери..."
            />
          </div>
          {customFieldsForKind.length > 0 && (
            <section className={styles.customFields}>
              <h3 className="modal-label mb-3">Додаткові поля</h3>
              <div className={styles.customFieldsGrid}>
                {customFieldsForKind.map((field) => (
                  <div
                    key={field.id}
                    className={field.type === "RICHTEXT" ? "sm:col-span-2" : ""}
                  >
                    <label className="modal-label">{field.name}</label>
                    {renderCustomField(field)}
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
        <footer className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            className={styles.footerCancel}
          >
            {isReadOnly ? "Закрити" : "Скасувати"}
          </button>
          {item && isReadOnly && canSwitchToEdit && (
            <button
              type="button"
              onClick={() => setIsReadOnly(false)}
              className={`modal-primary ${styles.footerPrimary}`}
            >
              Редагувати
            </button>
          )}
          {!isReadOnly && (
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className={`modal-primary ${styles.footerPrimary}`}
            >
              {isPending
                ? "Завантаження…"
                : committedRefreshFailed
                  ? "Повторити завантаження"
                  : hasRevisionConflict
                    ? "Оновити версію"
                    : "Зберегти"}
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
};
