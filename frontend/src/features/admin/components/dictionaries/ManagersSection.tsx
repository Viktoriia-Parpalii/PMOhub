import React, { useState } from "react";
import { useAppContext } from "../../../../app/store";
import { truncateText } from "../../../../shared/utils";
import { ProtectedDelete } from "./DepartmentsSection";
import styles from "./DictionariesSection.module.css";
import table from "./DictionaryTable.module.css";
import { DictionaryTableColumns } from "./DictionaryTableColumns";
import {
  DictionaryActivationButton,
  DictionaryActionGroup,
  DictionaryDeleteButton,
  DictionaryStatusBadge,
} from "./DictionaryControls";

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
  return (
    <section>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Менеджери</h3>
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
              <th className={table.detailHeaderCell}>Департамент</th>
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
    </section>
  );
};
