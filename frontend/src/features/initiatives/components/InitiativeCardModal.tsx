import React, { useMemo, useState } from "react";
import { ArrowRight, Plus, Trash2, X } from "lucide-react";
import { useAppContext } from "../../../app/store";
import {
  ChecklistItem,
  CustomFieldDef,
  OperationalTask,
  Priority,
  Project,
  Quarter,
  ScopeMergePreview,
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
  validateChecklistCapacity,
} from "../../../domain/capacity";
import { canEditInitiative } from "../../../domain/permissions";
import { ScopeMergeConfirmDialog } from "../../../components/ui/ScopeMergeConfirmDialog";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";
import styles from "./InitiativeCardModal.module.css";
import { InitiativeHistory } from "./InitiativeHistory";

type Initiative = Project | OperationalTask;
type Kind = "project" | "task";
interface Props {
  kind: Kind;
  item: Initiative | null;
  onClose: () => void;
  onSave: (item: Initiative, syncTargets?: string[]) => void;
  onDelete?: (id: string) => void;
  isReadOnly?: boolean;
  openInViewMode?: boolean;
  defaultYear?: number;
  defaultQuarter?: Quarter;
}
interface PendingMerge {
  preview: ScopeMergePreview;
  itemId?: string;
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
    currentUser,
    rolePermissions,
    isMutating,
  } = useAppContext();
  const records = kind === "project" ? projects : tasks;
  const year = item?.year ?? defaultYear ?? new Date().getFullYear();
  const quarter = item?.quarter ?? defaultQuarter ?? getCurrentQuarter();
  const noun = kind === "project" ? "проєкту" : "операційної задачі";
  const canSwitchToEdit = Boolean(
    item && canEditInitiative(item, currentUser, rolePermissions),
  );
  const scopeWeightLocked = Boolean(item && isPeriodLocked(year, quarter));
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
  const [newText, setNewText] = useState("");
  const [error, setError] = useState("");
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
  const [pendingMerge, setPendingMerge] = useState<PendingMerge | null>(null);
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
  const performMove = async (confirmation?: ScopeMergePreview) =>
    !item
      ? undefined
      : movingId
        ? moveScopeItem(
            item.id,
            movingId,
            moveYear,
            moveQuarter,
            kind === "project",
            undefined,
            confirmation,
          )
        : moveCard(
            item.id,
            moveYear,
            moveQuarter,
            kind === "project",
            undefined,
            confirmation,
          );
  const requestMove = async () => {
    if (!item) {
      setError("Спочатку збережіть нову картку");
      return;
    }
    const result = await performMove();
    if (!result) return;
    if (result.requiresConfirmation) {
      setPendingMerge({
        preview: result.requiresConfirmation,
        itemId: movingId ?? undefined,
      });
      return;
    }
    if (!result.success) {
      setError(result.message);
      return;
    }
    onClose();
  };
  const requestContinuation = async () => {
    if (!item) return;
    const result = await continueCard(
      item.id,
      moveYear,
      moveQuarter,
      kind === "project",
    );
    if (!result.success) {
      window.alert(result.message);
      return;
    }
    onClose();
  };
  const confirmMerge = async () => {
    const result = await performMove(pendingMerge?.preview);
    if (!result) return;
    if (!result.success) {
      setError(result.message);
      setPendingMerge(null);
      return;
    }
    setPendingMerge(null);
    onClose();
  };
  const save = () => {
    if (!name.trim()) {
      setError(`Вкажіть назву ${noun}`);
      return;
    }
    const validation = validateChecklistCapacity(checklist, taskWeights);
    if (validation.length) {
      setError(validation.join(" • "));
      return;
    }
    onSave({
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
      is_backlog: false,
      backlog_id: item?.backlog_id,
      history: item?.history ?? [],
    } as Initiative);
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
          <ArrowRight size={16} />
          {scopeMove
            ? "Перенесення завдання в інший період"
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
              className="modal-secondary h-10 px-3 text-sm text-emerald-900"
            >
              Продовжити
            </button>
          )}
          <button
            type="button"
            onClick={requestMove}
            className="modal-secondary h-10 px-3 text-sm text-indigo-900"
          >
            Перенести
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

  return (
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
                  onClick={() => onDelete(item.id)}
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
          {error && (
            <div
              role="alert"
              className={styles.error}
            >
              {error}
            </div>
          )}
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
                  onClick={() => onDelete(item.id)}
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
              disabled={isReadOnly}
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
              disabled={isReadOnly}
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
                            onClick={() => {
                              setMovingId(scope.id);
                              setShowMove(true);
                            }}
                            className="icon-action shrink-0"
                          >
                            <ArrowRight size={17} />
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
              <InitiativeHistory events={item?.history} />
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
              disabled={isMutating}
              className={`modal-primary ${styles.footerPrimary}`}
            >
              {isMutating ? "Збереження…" : "Зберегти"}
            </button>
          )}
        </footer>
      </div>
      {pendingMerge && (
        <ScopeMergeConfirmDialog
          preview={pendingMerge.preview}
          onCancel={() => setPendingMerge(null)}
          onConfirm={confirmMerge}
        />
      )}
    </div>
  );
};
