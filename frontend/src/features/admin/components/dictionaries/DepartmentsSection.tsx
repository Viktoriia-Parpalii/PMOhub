import React, { useState } from "react";
import { useAppContext } from "../../../../app/store";
import { MutationResult } from "../../../../shared/types";
import styles from "./DictionariesSection.module.css";
import table from "./DictionaryTable.module.css";
import { DictionaryActivationButton, DictionaryActionGroup, DictionaryDeleteButton, DictionaryStatusBadge } from "./DictionaryControls";

export type ProtectedDelete = (
  title: string,
  name: string,
  check: () => MutationResult,
  onConfirm: () => MutationResult,
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
  const add = () => {
    if (!name.trim()) return;
    addDepartment({
      id: Math.random().toString(36).substring(2, 10),
      name,
      capacity_limit_points: limit,
      is_active: true,
    });
    setName("");
  };
  return (
    <section>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Відділи</h3>
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
            min="1"
          />
          <button onClick={add} className={styles.addButton}>
            Додати
          </button>
        </div>
      </div>
      <div className={styles.tableContainer}>
        <table className={table.table}>
          <thead className={table.tableHead}>
            <tr>
              <th className={table.headerCell}>Відділ</th>
              <th className={`${table.headerCell} w-32`}>Ліміт capacity</th>
              <th className={table.statusHeaderCell}>Статус</th>
              <th aria-label="Дії" className={table.actionsHeaderCell} />
            </tr>
          </thead>
          <tbody className={table.tableBody}>
            {departments.map((department) => (
              <tr key={department.id} className={table.tableRow}>
                <td className={table.primaryCell}>{department.name}</td>
                <td className={table.secondaryCell}>
                  {department.capacity_limit_points}
                </td>
                <td className={table.cell}>
                  <DictionaryStatusBadge isActive={department.is_active !== false} />
                </td>
                <td className={table.actionsCell}>
                  <DictionaryActionGroup>
                    <DictionaryActivationButton
                      onClick={() =>
                      updateDepartment(department.id, {
                        is_active: department.is_active === false,
                      })
                      }
                      isActive={department.is_active !== false}
                    />
                    <DictionaryDeleteButton onClick={() =>
                      requestProtectedDelete(
                        "відділ",
                        department.name,
                        () => checkDepartmentDeletion(department.id),
                        () => deleteDepartment(department.id),
                      )
                    } />
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
