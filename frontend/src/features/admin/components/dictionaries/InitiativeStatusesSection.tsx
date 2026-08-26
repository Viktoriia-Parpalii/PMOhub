import React, { useState } from "react";
import { useAppContext } from "../../../../app/store";
import { CircularColorInput } from "./CircularColorInput";
import { ProtectedDelete } from "./DepartmentsSection";
import styles from "./DictionariesSection.module.css";
import table from "./DictionaryTable.module.css";
import { DictionaryActivationButton, DictionaryActionGroup, DictionaryDeleteButton, DictionaryStatusBadge } from "./DictionaryControls";

export const InitiativeStatusesSection = ({
  requestProtectedDelete,
}: {
  requestProtectedDelete: ProtectedDelete;
}) => {
  const {
    initiativeStatuses,
    addInitiativeStatus,
    updateInitiativeStatus,
    deleteInitiativeStatus,
    checkInitiativeStatusDeletion,
  } = useAppContext();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");
  const add = async () => {
    if (!name.trim()) return;
    const result = await addInitiativeStatus({
      id: Math.random().toString(36).substring(2, 10),
      name,
      color,
      is_active: true,
    });
    if (result.success) setName("");
  };
  return (
    <section>
      <div className={styles.sectionHeader}>
        <div>
          <h3 className={styles.sectionTitle}>Статуси ініціатив</h3>
          <p className="mt-1 text-xs text-slate-500">
            Використовуються для квартальних карток проєктів і операційних
            задач.
          </p>
        </div>
        <div className={styles.toolbar}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Назва статусу"
            className={styles.input}
          />
          <CircularColorInput
            label="Колір статусу"
            value={color}
            onChange={setColor}
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
              <th className={table.headerCell}>Статус</th>
              <th className={`${table.headerCell} w-32`}>Активність</th>
              <th aria-label="Дії" className={table.actionsHeaderCell} />
            </tr>
          </thead>
          <tbody className={table.tableBody}>
            {initiativeStatuses.map((status) => (
              <tr key={status.id} className={table.tableRow}>
                <td className={table.primaryCell}>
                  <div className={table.colorName}>
                    <CircularColorInput
                      compact
                      label={`Колір ${status.name}`}
                      value={status.color}
                      onChange={(nextColor) =>
                        updateInitiativeStatus(status.id, { color: nextColor })
                      }
                    />
                    <span>{status.name}</span>
                  </div>
                </td>
                <td className={table.cell}>
                  <DictionaryStatusBadge isActive={status.is_active} />
                </td>
                <td className={table.actionsCell}>
                  <DictionaryActionGroup>
                    <DictionaryActivationButton
                      onClick={() =>
                      updateInitiativeStatus(status.id, {
                        is_active: !status.is_active,
                      })
                      }
                      isActive={status.is_active}
                    />
                    <DictionaryDeleteButton onClick={() =>
                      requestProtectedDelete(
                        "статус ініціативи",
                        status.name,
                        () => checkInitiativeStatusDeletion(status.id),
                        () => deleteInitiativeStatus(status.id),
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
