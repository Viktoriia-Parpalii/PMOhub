import React, { useState } from "react";
import { Pencil } from "lucide-react";
import { useAppContext } from "../../../../app/store";
import { MutationResult } from "../../../../shared/types";
import styles from "./DictionariesSection.module.css";
import table from "./DictionaryTable.module.css";
import { DictionaryActionButton, DictionaryActionGroup, DictionaryActivationButton, DictionaryDeleteButton, DictionaryStatusBadge } from "./DictionaryControls";

export type WeightEditor = { id: string; name: string; weight: number } | null;
export type BulkWeight = { id: string; name: string } | null;
type DeleteConfirmation = {
  title: string;
  name: string;
  onConfirm: () => MutationResult | void;
};

export const TaskWeightsSection = ({
  openDeleteConfirm,
  setEditingWeight,
  setBulkWeight,
}: {
  openDeleteConfirm: (value: DeleteConfirmation) => void;
  setEditingWeight: React.Dispatch<React.SetStateAction<WeightEditor>>;
  setBulkWeight: React.Dispatch<React.SetStateAction<BulkWeight>>;
}) => {
  const { taskWeights, addTaskWeight, updateTaskWeight, deleteTaskWeight } =
    useAppContext();
  const [name, setName] = useState("");
  const [weight, setWeight] = useState(1);
  const add = () => {
    if (!name.trim()) return;
    const result = addTaskWeight({
      id: Math.random().toString(36).substring(2, 10),
      name,
      weight,
      is_active: true,
    });
    if (!result.success) return alert(result.message);
    setName("");
    setWeight(1);
  };
  return (
    <section>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Розмір (вага)</h3>
        <div className={styles.toolbar}>
          <input
            type="number"
            value={weight}
            onChange={(event) => setWeight(Number(event.target.value))}
            placeholder="Вага (бали)"
            className={styles.weightInput}
          />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Назва розміру"
            className={styles.input}
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
              <th className={`${table.headerCell} w-[44%]`}>Розмір</th>
              <th className={`${table.headerCell} w-24`}>Вага</th>
              <th className={`${table.headerCell} w-40 px-3`}>Статус</th>
              <th aria-label="Дії" className="w-60 py-4 pl-2 pr-4" />
            </tr>
          </thead>
          <tbody className={table.tableBody}>
            {taskWeights.map((item) => (
              <tr key={item.id} className={table.tableRow}>
                <td className={table.primaryCell}>{item.name}</td>
                <td className={table.primaryCell}>{item.weight}</td>
                <td className={table.cell}>
                  <DictionaryStatusBadge isActive={item.is_active !== false} />
                </td>
                <td className={table.actionsCell}>
                  <DictionaryActionGroup>
                    <DictionaryActionButton
                      onClick={() =>
                        setEditingWeight({
                          id: item.id,
                          name: item.name,
                          weight: item.weight,
                        })
                      }
                      title="Редагувати вагу"
                    >
                      <Pencil size={16} />
                    </DictionaryActionButton>
                    <DictionaryActionButton
                      onClick={() =>
                        setBulkWeight({ id: item.id, name: item.name })
                      }
                      title="Застосувати до поточних і майбутніх карток"
                      variant="apply"
                    >
                      Застосувати
                    </DictionaryActionButton>
                    <DictionaryActivationButton
                      onClick={() => {
                        const result = updateTaskWeight(item.id, {
                          is_active: item.is_active === false,
                        });
                        if (!result.success) alert(result.message);
                      }}
                      isActive={item.is_active !== false}
                      compact
                    />
                    <DictionaryDeleteButton
                      onClick={() =>
                        openDeleteConfirm({
                          title: "розмір",
                          name: item.name,
                          onConfirm: () => {
                            const result = deleteTaskWeight(item.id);
                            if (!result.success) alert(result.message);
                          },
                        })
                      }
                      compact
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
