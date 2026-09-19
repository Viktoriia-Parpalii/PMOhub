import React, { useEffect, useState } from "react";
import { ChevronDown, LoaderCircle, Pencil, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "../../../../app/store";
import { Department, MutationResult } from "../../../../shared/types";
import { useDepartmentCapacityHistoryQuery } from "../../../../api/hooks";
import { queryKeys } from "../../../../api/queryClient";
import styles from "./DictionariesSection.module.css";
import table from "./DictionaryTable.module.css";
import { DictionaryTableColumns } from "./DictionaryTableColumns";
import {
  DictionaryActivationButton,
  DictionaryActionGroup,
  DictionaryDeleteButton,
  DictionaryActionButton,
  DictionaryStatusBadge,
} from "./DictionaryControls";
import {
  DictionaryTitle,
  ReferenceActionsExplanation,
} from "./DictionaryInfoTooltip";

export type ProtectedDelete = (
  title: string,
  name: string,
  check: () => MutationResult,
  onConfirm: () => Promise<MutationResult>,
) => void;

export const DepartmentsSection = ({
  requestProtectedDelete,
}: {
  requestProtectedDelete: ProtectedDelete;
}) => {
  const {
    departments,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    checkDepartmentDeletion,
  } = useAppContext();
  const [name, setName] = useState("");
  const [limit, setLimit] = useState(10);
  const [expandedId, setExpandedId] = useState<string>();
  const [editing, setEditing] = useState<Department>();
  const [newLimit, setNewLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const historyQuery = useDepartmentCapacityHistoryQuery(expandedId);
  useEffect(() => {
    if (editing) setNewLimit(String(editing.capacity_limit_points));
  }, [editing]);
  const add = async () => {
    if (!name.trim()) return;
    const result = await addDepartment({
      id: Math.random().toString(36).substring(2, 10),
      name,
      capacity_limit_points: limit,
      is_active: true,
    });
    if (result.success) setName("");
  };
  const parsedLimit = Number(newLimit);
  const validLimit =
    newLimit.trim() !== "" &&
    Number.isFinite(parsedLimit) &&
    parsedLimit >= 0 &&
    /^\d+(?:[.,]\d{1,2})?$/.test(newLimit.trim());
  const saveLimit = async () => {
    if (!editing || !validLimit || parsedLimit === editing.capacity_limit_points) return;
    setSaving(true);
    const result = await updateDepartment(editing.id, {
      capacity_limit_points: parsedLimit,
    });
    if (result.success) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.departmentCapacityHistory(editing.id),
      });
      setEditing(undefined);
    }
    setSaving(false);
  };
  return (
    <section>
      <div className={styles.sectionHeader}>
        <DictionaryTitle title="Відділи">
          У таблиці показано актуальний ліміт відділу. Кожна його зміна
          зберігається в квартальній історії. Для минулого кварталу аналітика
          бере останню зміну не пізніше цього кварталу, а річний ліміт є сумою
          фактичних лімітів Q1–Q4.
          <br />
          <ReferenceActionsExplanation />
        </DictionaryTitle>
        <div className={styles.toolbar}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Назва відділу"
            className={styles.input}
          />
          <input
            type="number"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            className={`${styles.input} w-20`}
            min="0"
            step="0.01"
          />
          <button onClick={add} className={styles.addButton}>
            Додати
          </button>
        </div>
      </div>
      <div className={styles.tableContainer}>
        <table className={table.table}>
          <DictionaryTableColumns />
          <thead className={table.tableHead}>
            <tr>
              <th className={table.headerCell}>Назва</th>
              <th className={table.detailHeaderCell}>Ліміт</th>
              <th className={table.statusHeaderCell}>Статус</th>
              <th aria-label="Дії" className={table.actionsHeaderCell} />
            </tr>
          </thead>
          <tbody className={table.tableBody}>
            {departments.map((department) => (
              <React.Fragment key={department.id}>
              <tr
                className={`${table.tableRow} ${styles.clickableRow}`}
                onClick={() => setExpandedId((current) => current === department.id ? undefined : department.id)}
                aria-expanded={expandedId === department.id}
              >
                <td className={table.primaryCell}>
                  <span className={styles.departmentName}>
                    <ChevronDown
                      size={16}
                      className={expandedId === department.id ? styles.chevronOpen : styles.chevron}
                    />
                    {department.name}
                  </span>
                </td>
                <td className={table.detailCell}>
                  {department.capacity_limit_points}
                </td>
                <td className={table.statusCell}>
                  <DictionaryStatusBadge
                    isActive={department.is_active !== false}
                  />
                </td>
                <td className={table.actionsCell} onClick={(event) => event.stopPropagation()}>
                  <DictionaryActionGroup>
                    <DictionaryActionButton
                      onClick={() => setEditing(department)}
                      title="Змінити ліміт"
                    >
                      <Pencil size={16} />
                    </DictionaryActionButton>
                    <DictionaryActivationButton
                      onClick={() =>
                        updateDepartment(department.id, {
                          is_active: department.is_active === false,
                        })
                      }
                      isActive={department.is_active !== false}
                    />
                    <DictionaryDeleteButton
                      onClick={() =>
                        requestProtectedDelete(
                          "відділ",
                          department.name,
                          () => checkDepartmentDeletion(department.id),
                          () => deleteDepartment(department.id),
                        )
                      }
                    />
                  </DictionaryActionGroup>
                </td>
              </tr>
              {expandedId === department.id && (
                <tr className={styles.historyRow}>
                  <td colSpan={4} className={styles.historyCell}>
                    {historyQuery.isPending && (
                      <div className={styles.historyState}><LoaderCircle className={styles.spinner} size={18} /> Завантаження історії…</div>
                    )}
                    {historyQuery.isError && (
                      <div className={styles.historyState}>
                        Не вдалося завантажити історію.
                        <button className={styles.retryButton} onClick={() => historyQuery.refetch()}>
                          <RotateCcw size={14} /> Повторити
                        </button>
                      </div>
                    )}
                    {historyQuery.isSuccess && historyQuery.data.length === 0 && (
                      <div className={styles.historyState}>Історія змін відсутня.</div>
                    )}
                    {historyQuery.isSuccess && historyQuery.data.length > 0 && (
                      <div className={styles.historyList}>
                        {historyQuery.data.map((item) => (
                          <div className={styles.historyItem} key={item.id}>
                            <strong>{item.limit_points.toLocaleString("uk-UA", { maximumFractionDigits: 2 })} балів</strong>
                            <span>{item.quarter} {item.year}</span>
                            <span>{new Intl.DateTimeFormat("uk-UA", { timeZone: "Europe/Kyiv", dateStyle: "medium", timeStyle: "short" }).format(new Date(item.changed_at))}</span>
                            <span>{item.changed_by?.name ?? "Системна зміна"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className={styles.dialogOverlay} role="presentation" onMouseDown={() => !saving && setEditing(undefined)}>
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="capacity-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <h3 id="capacity-dialog-title" className={styles.dialogTitle}>Змінити ліміт відділу</h3>
            <label className={styles.dialogLabel}>Назва відділу</label>
            <input className={styles.dialogInput} value={editing.name} readOnly />
            <label className={styles.dialogLabel}>Поточний ліміт</label>
            <input className={styles.dialogInput} value={editing.capacity_limit_points} readOnly />
            <label className={styles.dialogLabel}>Новий ліміт</label>
            <input
              className={styles.dialogInput}
              type="number"
              min="0"
              step="0.01"
              value={newLimit}
              onChange={(event) => setNewLimit(event.target.value)}
              autoFocus
            />
            {!validLimit && <p className={styles.validationError}>Вкажіть невід’ємне число, максимум із двома знаками після коми.</p>}
            <div className={styles.dialogActions}>
              <button className={styles.secondaryButton} onClick={() => setEditing(undefined)} disabled={saving}>Скасувати</button>
              <button className={styles.primaryButton} onClick={saveLimit} disabled={saving || !validLimit || parsedLimit === editing.capacity_limit_points}>
                {saving ? "Збереження…" : "Зберегти"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
