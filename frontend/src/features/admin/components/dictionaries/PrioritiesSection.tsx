import React, { useState } from "react";
import { useAppContext } from "../../../../app/store";
import { CircularColorInput } from "./CircularColorInput";
import { ProtectedDelete } from "./DepartmentsSection";
import styles from "./DictionariesSection.module.css";
import table from "./DictionaryTable.module.css";
import { DictionaryActivationButton, DictionaryActionGroup, DictionaryDeleteButton, DictionaryStatusBadge } from "./DictionaryControls";

export const PrioritiesSection = ({
  requestProtectedDelete,
}: {
  requestProtectedDelete: ProtectedDelete;
}) => {
  const {
    priorities,
    addPriority,
    updatePriority,
    deletePriority,
    checkPriorityDeletion,
  } = useAppContext();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#e11d48");
  const add = async () => {
    if (!name.trim()) return;
    const result = await addPriority({
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
        <h3 className={styles.sectionTitle}>Пріоритети</h3>
        <div className={styles.toolbar}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Назва пріоритету"
            className={styles.input}
          />
          <CircularColorInput
            label="Колір пріоритету"
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
              <th className={table.headerCell}>Пріоритет</th>
              <th className={table.statusHeaderCell}>Статус</th>
              <th aria-label="Дії" className={table.actionsHeaderCell} />
            </tr>
          </thead>
          <tbody className={table.tableBody}>
            {priorities.map((priority) => (
              <tr key={priority.id} className={table.tableRow}>
                <td className={table.primaryCell}>
                  <div className={table.colorName}>
                    <CircularColorInput
                      compact
                      label={`Колір ${priority.name}`}
                      value={priority.color ?? "#64748b"}
                      onChange={(nextColor) =>
                        updatePriority(priority.id, { color: nextColor })
                      }
                    />
                    <span>{priority.name}</span>
                  </div>
                </td>
                <td className={table.cell}>
                  <DictionaryStatusBadge isActive={priority.is_active !== false} />
                </td>
                <td className={table.actionsCell}>
                  <DictionaryActionGroup>
                    <DictionaryActivationButton
                      onClick={() =>
                      updatePriority(priority.id, {
                        is_active: priority.is_active === false,
                      })
                      }
                      isActive={priority.is_active !== false}
                    />
                    <DictionaryDeleteButton onClick={() =>
                      requestProtectedDelete(
                        "пріоритет",
                        priority.name,
                        () => checkPriorityDeletion(priority.id),
                        () => deletePriority(priority.id),
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
