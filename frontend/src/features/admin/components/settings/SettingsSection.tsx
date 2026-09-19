import { useEffect, useState } from "react";
import { useAppContext } from "../../../../app/store";
import type {
  FilterOptionVisibilityMode,
  FilterOptionVisibilitySetting,
} from "../../../../shared/types";
import styles from "./SettingsSection.module.css";

type SettingArea = "analytics" | "portfolio" | "backlog";

const areas: Array<{
  id: SettingArea;
  title: string;
  description: string;
}> = [
  {
    id: "analytics",
    title: "Аналітика",
    description: "Керує варіантами у фільтрах «Підрозділ» і «Менеджер».",
  },
  {
    id: "portfolio",
    title: "Портфелі ініціатив",
    description:
      "Керує варіантами у фільтрах «Менеджер», «Пріоритет» і «Статус проєкту/операційної задачі».",
  },
  {
    id: "backlog",
    title: "Беклог",
    description: "Керує варіантами у фільтрах «Менеджер» і «Пріоритет».",
  },
];

const modes: Array<{ value: FilterOptionVisibilityMode; label: string }> = [
  { value: "ACTIVE_ONLY", label: "Лише активні" },
  { value: "ALL", label: "Усі записи" },
];

export const SettingsSection = () => {
  const {
    currentUser,
    rolePermissions,
    systemSettings,
    updateFilterOptionVisibility,
  } = useAppContext();
  const canonical = systemSettings.filterOptionVisibility;
  const [draft, setDraft] = useState<FilterOptionVisibilitySetting>(canonical);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const permission = rolePermissions.find(
    (item) => item.role === currentUser?.role,
  );
  const readOnly = Boolean(permission?.isReadOnly || !permission?.canAccessAdmin);

  useEffect(() => {
    if (!dirty) setDraft(canonical);
  }, [canonical, dirty]);

  const change = (area: SettingArea, mode: FilterOptionVisibilityMode) => {
    if (readOnly || saving) return;
    setDraft((current) => ({ ...current, [area]: mode }));
    setDirty(true);
  };

  const save = async () => {
    if (!dirty || saving || readOnly) return;
    setSaving(true);
    const result = await updateFilterOptionVisibility(draft);
    setSaving(false);
    if (result.success && result.data) {
      setDraft(result.data);
      setDirty(false);
      return;
    }
    if (result.errorCode === "REVISION_CONFLICT") setDirty(false);
  };

  return (
    <section className={styles.section} aria-labelledby="system-settings-title">
      <div className={styles.heading}>
        <div>
          <h3 id="system-settings-title" className={styles.title}>
            Відображення записів у фільтрах
          </h3>
          <p className={styles.intro}>
            Ці налаштування впливають лише на перелік варіантів у фільтрах.
            Історичні значення у картках, таблицях, беклозі, аналітиці та
            експорті не приховуються.
          </p>
        </div>
      </div>

      <div className={styles.list}>
        {areas.map((area) => (
          <article key={area.id} className={styles.row}>
            <div className={styles.copy}>
              <h4>{area.title}</h4>
              <p>{area.description}</p>
            </div>
            <div
              className={styles.segmented}
              role="radiogroup"
              aria-label={`Відображення записів: ${area.title}`}
            >
              {modes.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  role="radio"
                  aria-checked={draft[area.id] === mode.value}
                  disabled={readOnly || saving}
                  className={
                    draft[area.id] === mode.value ? styles.selected : undefined
                  }
                  onClick={() => change(area.id, mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className={styles.footer}>
        {readOnly && (
          <p className={styles.readOnly}>Налаштування доступні лише для перегляду.</p>
        )}
        <button
          type="button"
          className={styles.save}
          disabled={!dirty || saving || readOnly}
          onClick={() => void save()}
        >
          {saving ? "Збереження…" : "Зберегти зміни"}
        </button>
      </div>
    </section>
  );
};
