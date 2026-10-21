import React, { useState } from "react";
import { Pencil } from "lucide-react";
import { useAppContext } from "../../../../app/store";
import { truncateText } from "../../../../shared/utils";
import { Manager } from "../../../../shared/types";
import { ProtectedDelete } from "./DepartmentsSection";
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

export const ManagersSection = ({
  requestProtectedDelete,
}: {
  requestProtectedDelete: ProtectedDelete;
}) => {
  const {
    departments,
    managers,
    addManager,
    updateManager,
    deleteManager,
    checkManagerDeletion,
  } = useAppContext();
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [editing, setEditing] = useState<Manager>();
  const [editName, setEditName] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [saving, setSaving] = useState(false);
  const add = async () => {
    if (!name.trim() || !departmentId) return;
    const result = await addManager({
      id: Math.random().toString(36).substring(2, 10),
      name,
      department_id: departmentId,
      is_active: true,
    });
    if (result.success) {
      setName("");
      setDepartmentId("");
    }
  };
  const openEdit = (manager: Manager) => {
    setEditing(manager);
    setEditName(manager.name);
    setEditDepartmentId(manager.department_id ?? "");
  };
  const trimmedEditName = editName.trim();
  const editChanged = Boolean(
    editing &&
      (trimmedEditName !== editing.name ||
        editDepartmentId !== (editing.department_id ?? "")),
  );
  const editValid = Boolean(
    trimmedEditName && trimmedEditName.length <= 200 && editDepartmentId,
  );
  const saveEdit = async () => {
    if (!editing || !editValid || !editChanged || saving) return;
    setSaving(true);
    const result = await updateManager(editing.id, {
      name: trimmedEditName,
      department_id: editDepartmentId,
    });
    setSaving(false);
    if (result.success) setEditing(undefined);
  };
  return (
    <section>
      <div className={styles.sectionHeader}>
        <DictionaryTitle title="Менеджери">
          Менеджер прив’язується до відділу та може бути призначений
          відповідальним за квартальну картку або вказаний у підготовчому етапі.
          <br />
          <ReferenceActionsExplanation />
        </DictionaryTitle>
        <div className={styles.toolbar}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ім'я менеджера"
            className={styles.input}
          />
          <select
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            className={`${styles.input} truncate`}
          >
            <option value="">Оберіть відділ</option>
            {departments.map((department) => (
              <option
                key={department.id}
                value={department.id}
                title={department.name}
              >
                {truncateText(department.name, 70)}
              </option>
            ))}
          </select>
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
              <th className={table.detailHeaderCell}>Відділ</th>
              <th className={table.statusHeaderCell}>Статус</th>
              <th aria-label="Дії" className={table.actionsHeaderCell} />
            </tr>
          </thead>
          <tbody className={table.tableBody}>
            {managers.map((manager) => (
              <tr key={manager.id} className={table.tableRow}>
                <td className={table.primaryCell}>{manager.name}</td>
                <td className={table.detailCell}>
                  {manager.department_id
                    ? departments.find(
                        (department) => department.id === manager.department_id,
                      )?.name
                    : "—"}
                </td>
                <td className={table.statusCell}>
                  <DictionaryStatusBadge
                    isActive={manager.is_active !== false}
                  />
                </td>
                <td className={table.actionsCell}>
                  <DictionaryActionGroup>
                    <DictionaryActionButton
                      onClick={() => openEdit(manager)}
                      title="Редагувати менеджера"
                    >
                      <Pencil size={16} />
                    </DictionaryActionButton>
                    <DictionaryActivationButton
                      onClick={() =>
                        updateManager(manager.id, {
                          is_active: manager.is_active === false,
                        })
                      }
                      isActive={manager.is_active !== false}
                    />
                    <DictionaryDeleteButton
                      onClick={() =>
                        requestProtectedDelete(
                          "менеджера",
                          manager.name,
                          () => checkManagerDeletion(manager.id),
                          () => deleteManager(manager.id),
                        )
                      }
                    />
                  </DictionaryActionGroup>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <div
          className={styles.dialogOverlay}
          role="presentation"
          onMouseDown={() => !saving && setEditing(undefined)}
        >
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-edit-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 id="manager-edit-dialog-title" className={styles.dialogTitle}>
              Редагувати менеджера
            </h3>
            <label className={styles.dialogLabel} htmlFor="manager-edit-name">
              Ім’я менеджера
            </label>
            <input
              id="manager-edit-name"
              className={styles.dialogInput}
              value={editName}
              maxLength={200}
              onChange={(event) => setEditName(event.target.value)}
              autoFocus
            />
            <label
              className={styles.dialogLabel}
              htmlFor="manager-edit-department"
            >
              Відділ
            </label>
            <select
              id="manager-edit-department"
              className={styles.dialogInput}
              value={editDepartmentId}
              onChange={(event) => setEditDepartmentId(event.target.value)}
            >
              <option value="">Оберіть відділ</option>
              {departments
                .filter(
                  (department) =>
                    department.is_active !== false ||
                    department.id === editing.department_id,
                )
                .map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
            </select>
            {!trimmedEditName && (
              <p className={styles.validationError}>
                Вкажіть ім’я менеджера.
              </p>
            )}
            <div className={styles.dialogActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setEditing(undefined)}
                disabled={saving}
              >
                Скасувати
              </button>
              <button
                className={styles.primaryButton}
                onClick={saveEdit}
                disabled={saving || !editValid || !editChanged}
              >
                {saving ? "Збереження…" : "Зберегти"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
