import React, { useState } from "react";
import { useAppContext } from "../../../../app/store";
import { MutationResult } from "../../../../shared/types";
import styles from "./DictionariesSection.module.css";
import table from "./DictionaryTable.module.css";
import { DictionaryActivationButton, DictionaryActionGroup, DictionaryDeleteButton, DictionaryStatusBadge } from "./DictionaryControls";

type DeleteConfirmation = {
  title: string;
  name: string;
  onConfirm: () => Promise<MutationResult> | void;
};
export const InitiativeSizesSection = ({
  openDeleteConfirm,
}: {
  openDeleteConfirm: (value: DeleteConfirmation) => void;
}) => {
  const {
    initiativeSizes,
    addInitiativeSize,
    updateInitiativeSize,
    deleteInitiativeSize,
    refreshOpenInitiativeSizes,
  } = useAppContext();
  const [name, setName] = useState("");
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(1);
  const add = async () => {
    if (!name.trim()) return;
    const result = await addInitiativeSize({
      id: Math.random().toString(36).substring(2, 10),
      name,
      min_score: min,
      max_score: max,
      is_active: true,
    });
    if (!result.success) return alert(result.message);
    setName("");
    setMin(0);
    setMax(1);
  };
  return (
    <section>
      <div className={styles.initiativeSizeHeader}>
        <h2 className="text-lg font-bold text-slate-800">
          Розмір (вага) ініціативи
        </h2>
        <button
          onClick={async () => {
            const result = await refreshOpenInitiativeSizes();
            if (!result.success) alert(result.message);
          }}
          className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50"
        >
          Перерахувати відкриті картки
        </button>
      </div>
      <div className={styles.initiativeSizeCard}>
        <div className={styles.initiativeSizeForm}>
          <div className={styles.initiativeSizeFields}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Назва розміру (напр. XS, M, XL)
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Новий розмір"
                className={styles.formInput}
              />
            </div>
            <div className={styles.narrowField}>
              <label className={styles.formLabel}>Мін. балів</label>
              <input
                type="number"
                step="0.1"
                value={min}
                onChange={(event) => setMin(Number(event.target.value))}
                className={styles.formInput}
              />
            </div>
            <div className={styles.narrowField}>
              <label className={styles.formLabel}>Макс. балів</label>
              <input
                type="number"
                step="0.1"
                value={max}
                onChange={(event) => setMax(Number(event.target.value))}
                className={styles.formInput}
              />
            </div>
            <button onClick={add} className={styles.responsiveAddButton}>
              Додати
            </button>
          </div>
        </div>
        <div className={table.scroll}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className={`${table.headerCell} w-1/3`}>Назва</th>
                <th className={`${table.headerCell} w-1/3`}>Діапазон</th>
                <th className={table.statusHeaderCell}>Статус</th>
                <th aria-label="Дії" className={table.actionsHeaderCell} />
              </tr>
            </thead>
            <tbody className={table.tableBody}>
              {initiativeSizes.map((item) => (
                <tr key={item.id} className={table.tableRow}>
                  <td className={table.primaryCell}>{item.name}</td>
                  <td className={table.primaryCell}>
                    {item.min_score} - {item.max_score}
                  </td>
                  <td className={table.cell}>
                  <DictionaryStatusBadge isActive={item.is_active !== false} />
                  </td>
                  <td className={table.actionsCell}>
                    <DictionaryActionGroup>
                      <DictionaryActivationButton
                        onClick={async () => {
                        const result = await updateInitiativeSize(item.id, {
                          is_active: item.is_active === false,
                        });
                        if (!result.success) alert(result.message);
                        }}
                        isActive={item.is_active !== false}
                      />
                      <DictionaryDeleteButton onClick={() =>
                        openDeleteConfirm({
                          title: "розмір ініціативи",
                          name: item.name,
                          onConfirm: async () => {
                            const result = await deleteInitiativeSize(item.id);
                            if (!result.success) alert(result.message);
                            return result;
                          },
                        })
                      } />
                    </DictionaryActionGroup>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
