import React, { useState } from "react";
import { Pencil, Power, PowerOff, Trash2, X } from "lucide-react";
import { useAppContext } from "../../../../app/store";
import { CustomFieldType } from "../../../../shared/types";
import styles from "./CustomFieldsSection.module.css";

export const CustomFieldsSection = () => {
  const { customFields, addCustomField, deleteCustomField, updateCustomField } =
    useAppContext();
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    name: string;
    onConfirm: () => void;
  } | null>(null);
  const [editingField, setEditingField] = useState<
    (typeof customFields)[number] | null
  >(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<CustomFieldType>("TEXT");
  const [editEntityType, setEditEntityType] = useState<"project" | "task">(
    "project",
  );
  const [editOptions, setEditOptions] = useState("");
  const [editShowInTable, setEditShowInTable] = useState(false);
  const [editShowInCards, setEditShowInCards] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<CustomFieldType>("TEXT");
  const [entityType, setEntityType] = useState<"project" | "task">("project");
  const [optionsStr, setOptionsStr] = useState("");
  const [showInTable, setShowInTable] = useState(false);
  const [showInCards, setShowInCards] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) return;
    const newField = {
      id: "cf_" + Math.random().toString(36).substring(2, 10),
      name,
      type,
      entityType,
      isRequired: false,
      showInTable,
      showInCards,
      options:
        type === "SELECT"
          ? optionsStr
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
    };
    addCustomField(newField);
    setName("");
    setOptionsStr("");
    setShowInTable(false);
    setShowInCards(false);
  };

  const openEdit = (field: (typeof customFields)[number]) => {
    setEditingField(field);
    setEditName(field.name);
    setEditType(field.type);
    setEditEntityType(field.entityType === "task" ? "task" : "project");
    setEditOptions(field.options?.join(", ") ?? "");
    setEditShowInTable(Boolean(field.showInTable));
    setEditShowInCards(Boolean(field.showInCards));
  };

  const saveEdit = () => {
    if (!editingField || !editName.trim()) return;
    updateCustomField(editingField.id, {
      name: editName.trim(),
      type: editType,
      entityType: editEntityType,
      isRequired: false,
      showInTable: editShowInTable,
      showInCards: editShowInCards,
      options:
        editType === "SELECT"
          ? editOptions
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
          : undefined,
    });
    setEditingField(null);
  };

  return (
    <div className={styles.section}>
      <div className={styles.createPanel}>
        <h3 className={styles.sectionTitle}>Створити нове поле</h3>
        <div className={styles.formGrid}>
          <div>
            <label className={styles.fieldLabel}>Назва поля</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              placeholder="напр. Бюджет"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Тип сутності</label>
            <select
              value={entityType}
              onChange={(e) =>
                setEntityType(e.target.value as "project" | "task")
              }
              className={styles.select}
            >
              <option value="project">Проєкт</option>
              <option value="task">Операційна задача</option>
            </select>
          </div>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Тип даних</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CustomFieldType)}
              className={styles.select}
            >
              <option value="TEXT">Текст</option>
              <option value="NUMBER">Число</option>
              <option value="SELECT">Випадаючий список (Select)</option>
              <option value="CHECKBOX">Прапорець (Checkbox)</option>
              <option value="RICHTEXT">Текст з форматуванням (Примітки)</option>
            </select>
          </div>
          <div className={styles.optionToggles}>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={showInTable}
                onChange={(e) => setShowInTable(e.target.checked)}
                className={styles.checkbox}
              />
              Показувати в таблиці
            </label>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={showInCards}
                onChange={(e) => setShowInCards(e.target.checked)}
                className={styles.checkbox}
              />
              Показувати в картках
            </label>
          </div>
        </div>
        {type === "SELECT" && (
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Варіанти (через кому)</label>
            <input
              type="text"
              value={optionsStr}
              onChange={(e) => setOptionsStr(e.target.value)}
              className={styles.input}
              placeholder="Option 1, Option 2"
            />
          </div>
        )}
        <button onClick={handleAdd} className={styles.addButton}>
          Додати поле
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Назва</th>
              <th>Сутність</th>
              <th>Тип</th>
              <th>Відображення</th>
              <th>Статус</th>
              <th aria-label="Дії" className={styles.headerActions} />
            </tr>
          </thead>
          <tbody>
            {customFields.map((cf) => (
              <tr key={cf.id}>
                <td className={styles.strong}>{cf.name}</td>
                <td>
                  {cf.entityType === "project" ? "Проєкт" : "Операційна задача"}
                </td>
                <td>
                  {cf.type}{" "}
                  {cf.type === "SELECT" && (
                    <span className={styles.smallText}>
                      ({cf.options?.join(", ")})
                    </span>
                  )}
                </td>
                <td className={styles.displayCell}>
                  {cf.showInTable && (
                    <div>
                      <span className={styles.emphasis}>Таблиця:</span> Так
                    </div>
                  )}
                  {cf.showInCards && (
                    <div>
                      <span className={styles.emphasis}>Картки:</span> Так
                    </div>
                  )}
                  {!cf.showInTable && !cf.showInCards && (
                    <div className={styles.emptyDisplay}>Тільки в модалці</div>
                  )}
                </td>
                <td>
                  <span
                    className={`${styles.status} ${cf.isActive !== false ? styles.statusActive : styles.statusInactive}`}
                  >
                    {cf.isActive !== false ? "Активно" : "Деактивовано"}
                  </span>
                </td>
                <td className={styles.actionsCell}>
                  <div className={styles.rowActions}>
                    <button
                      onClick={() => openEdit(cf)}
                      className={styles.iconButton}
                      title="Редагувати поле"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() =>
                        updateCustomField(cf.id, {
                          isActive: cf.isActive === false ? true : false,
                        })
                      }
                      className={`${styles.iconButton} ${cf.isActive !== false ? styles.deactivate : styles.activate}`}
                      title={
                        cf.isActive !== false ? "Деактивувати" : "Активувати"
                      }
                    >
                      {cf.isActive !== false ? (
                        <PowerOff size={16} />
                      ) : (
                        <Power size={16} />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirm({
                          title: "кастомне поле",
                          name: cf.name,
                          onConfirm: () => deleteCustomField(cf.id),
                        })
                      }
                      className={`${styles.iconButton} ${styles.deleteButton}`}
                      title="Видалити"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {customFields.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  Немає кастомних полів
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingField && (
        <div className={styles.backdrop}>
          <div className={styles.dialog}>
            <div className={styles.dialogHeader}>
              <div>
                <h3 className={styles.dialogTitle}>Редагування поля</h3>
                <p className={styles.dialogHelp}>
                  Зміни застосуються до нових і наявних форм.
                </p>
              </div>
              <button
                onClick={() => setEditingField(null)}
                aria-label="Закрити"
                className={styles.closeButton}
              >
                <X size={22} />
              </button>
            </div>
            <div className={styles.dialogGrid}>
              <label className={`${styles.dialogLabel} ${styles.spanTwo}`}>
                Назва поля
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className={styles.dialogInput}
                />
              </label>
              <div className={styles.dialogLabel}>
                Тип сутності
                <div className={styles.readOnlyValue}>
                  {editEntityType === "project"
                    ? "Проєкт"
                    : "Операційна задача"}
                </div>
              </div>
              <div className={styles.dialogLabel}>
                Тип даних
                <div className={styles.readOnlyValue}>
                  {editType === "TEXT"
                    ? "Текст"
                    : editType === "NUMBER"
                      ? "Число"
                      : editType === "SELECT"
                        ? "Випадаючий список"
                        : editType === "CHECKBOX"
                          ? "Прапорець"
                          : "Текст з форматуванням"}
                </div>
              </div>
              {editType === "SELECT" && (
                <label className={`${styles.dialogLabel} ${styles.spanTwo}`}>
                  Значення списку (через кому)
                  <input
                    value={editOptions}
                    onChange={(event) => setEditOptions(event.target.value)}
                    className={styles.dialogInput}
                    placeholder="Варіант 1, Варіант 2"
                  />
                </label>
              )}
              <div className={`${styles.dialogChecks} ${styles.spanTwo}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={editShowInTable}
                    onChange={(event) =>
                      setEditShowInTable(event.target.checked)
                    }
                  />
                  Показувати в таблиці
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editShowInCards}
                    onChange={(event) =>
                      setEditShowInCards(event.target.checked)
                    }
                  />
                  Показувати в картках
                </label>
              </div>
            </div>
            <div className={styles.dialogFooter}>
              <button
                onClick={() => setEditingField(null)}
                className={styles.cancelButton}
              >
                Скасувати
              </button>
              <button
                onClick={saveEdit}
                disabled={!editName.trim()}
                className={styles.saveButton}
              >
                Зберегти зміни
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className={styles.backdrop}>
          <div className={`${styles.dialog} ${styles.deleteDialog}`}>
            <div className={styles.dangerLead}>
              <div className={styles.dangerIcon}>
                <Trash2 size={24} />
              </div>
              <h3 className={styles.dialogTitle}>Підтвердження видалення</h3>
            </div>
            <p className={styles.dangerDescription}>
              Ви дійсно бажаєте видалити кастомне поле{" "}
              <span className={styles.emphasis}>«{deleteConfirm.name}»</span>?
              Цю дію неможливо скасувати.
            </p>
            <div className={styles.dialogFooter}>
              <button
                onClick={() => setDeleteConfirm(null)}
                className={styles.cancelButton}
              >
                Скасувати
              </button>
              <button
                onClick={() => {
                  deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                }}
                className={styles.dangerButton}
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
