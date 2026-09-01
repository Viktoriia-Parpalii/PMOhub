import React, { useState } from "react";
import { Pencil } from "lucide-react";
import { useAppContext } from "../../../../app/store";
import { MutationResult } from "../../../../shared/types";
import styles from "./DictionariesSection.module.css";
import table from "./DictionaryTable.module.css";
import { DictionaryTableColumns } from "./DictionaryTableColumns";
import {
  DictionaryActionButton,
  DictionaryActionGroup,
  DictionaryActivationButton,
  DictionaryDeleteButton,
  DictionaryStatusBadge,
} from "./DictionaryControls";

export type WeightEditor = { id: string; name: string; weight: number } | null;
export type BulkWeight = { id: string; name: string } | null;
type DeleteConfirmation = {
  title: string;
  name: string;
  onConfirm: () => Promise<MutationResult> | void;
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
  const add = async () => {
    if (!name.trim()) return;
    const result = await addTaskWeight({
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
          <DictionaryTableColumns />
          <thead className={table.tableHead}>
            <tr>
              <th className={table.headerCell}>Назва</th>
              <th className={table.detailHeaderCell}>Вага</th>
              <th className={table.statusHeaderCell}>Статус</th>
              <th aria-label="Дії" className={table.actionsHeaderCell} />
            </tr>
          </thead>
          <tbody className={table.tableBody}>
            {taskWeights.map((item) => (
              <tr key={item.id} className={table.tableRow}>
                <td className={table.primaryCell}>{item.name}</td>
                <td className={table.detailCell}>{item.weight}</td>
                <td className={table.statusCell}>
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
                      onClick={async () => {
                        const result = await updateTaskWeight(item.id, {
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
                          onConfirm: async () => {
                            const result = await deleteTaskWeight(item.id);
                            if (!result.success) alert(result.message);
                            return result;
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
