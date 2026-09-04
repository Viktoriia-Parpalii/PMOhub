import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bot,
  Check,
  ChevronDown,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  ShieldAlert,
  X,
} from "lucide-react";
import { useAppContext } from "../../../../app/store";
import { notify } from "../../../../components/ui/ToastNotifications";
import { NOTIFICATION_KINDS } from "../../../../shared/constants/notificationConstants";
import { SYSTEM_MESSAGES } from "../../../../shared/constants/systemMessages";
import {
  downloadAiJson,
  downloadExcel,
  downloadFullJson,
  loadExportAvailability,
  loadExportPreview,
  saveDownloadedFile,
} from "./exportApi";
import {
  AiExportPrivacy,
  ExcelField,
  ExportKind,
  ExportPeriod,
  InitiativeExportFilter,
} from "./exportTypes";
import styles from "./ExportSection.module.css";

const ALL_KINDS: ExportKind[] = ["PROJECT", "OPERATIONAL_TASK"];
const ALL_PERIODS: ExportPeriod[] = ["BACKLOG", "Q1", "Q2", "Q3", "Q4"];
const PERIOD_LABELS: Record<ExportPeriod, string> = {
  BACKLOG: "Беклог",
  Q1: "Q1",
  Q2: "Q2",
  Q3: "Q3",
  Q4: "Q4",
};
const KIND_LABELS: Record<ExportKind, string> = {
  PROJECT: "Проєкти",
  OPERATIONAL_TASK: "Операційні задачі",
};
const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: "Текст",
  NUMBER: "Число",
  SELECT: "Список",
  CHECKBOX: "Так / Ні",
  RICHTEXT: "Форматований текст",
};
const ALL_EXCEL_FIELDS: ExcelField[] = [
  "NAME",
  "STRATEGIC_GOAL",
  "MANAGER",
  "PRIORITY",
  "DEPARTMENTS",
  "STATUS",
  "SIZE",
  "TOTAL_WEIGHT",
  "PROGRESS",
  "SCOPE",
  "NOTES",
];
const EXCEL_FIELD_LABELS: Record<ExcelField, string> = {
  NAME: "Назва ініціативи",
  STRATEGIC_GOAL: "Стратегічна ціль",
  MANAGER: "Менеджер",
  PRIORITY: "Пріоритет",
  DEPARTMENTS: "Залучені підрозділи",
  STATUS: "Статус",
  SIZE: "Розмір",
  TOTAL_WEIGHT: "Загальна вага",
  PROGRESS: "Прогрес",
  SCOPE: "Скоуп",
  NOTES: "Примітки",
};

const defaultPrivacy: AiExportPrivacy = {
  include_name: true,
  include_strategic_goal: false,
  include_manager: true,
  include_departments: true,
  include_notes: false,
  selected_custom_field_ids: [],
};

type KindMode = "ALL" | ExportKind;

const useDebounced = <T,>(value: T, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [delay, value]);
  return debounced;
};

export const ExportSection = () => {
  const { currentUser, businessPeriod } = useAppContext();
  const availability = useQuery({
    queryKey: ["exports", "availability"],
    queryFn: ({ signal }) => loadExportAvailability(signal),
    staleTime: 60_000,
  });
  const currentYear = businessPeriod?.year ?? new Date().getFullYear();
  const years = availability.data?.years ?? [];
  const firstYear = years[0] ?? currentYear;
  const lastYear = years[years.length - 1] ?? currentYear;
  const [fromYear, setFromYear] = useState(firstYear);
  const [toYear, setToYear] = useState(lastYear);
  const [kindMode, setKindMode] = useState<KindMode>("ALL");
  const [periods, setPeriods] = useState<ExportPeriod[]>(ALL_PERIODS);
  const [excelOpen, setExcelOpen] = useState(false);
  const [excelFields, setExcelFields] = useState<ExcelField[]>(ALL_EXCEL_FIELDS);
  const [excelCustomFieldIds, setExcelCustomFieldIds] = useState<string[]>([]);
  const [aiOpen, setAiOpen] = useState(false);
  const [privacy, setPrivacy] = useState(defaultPrivacy);
  const [fullConfirmOpen, setFullConfirmOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const downloadController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!years.length) return;
    setFromYear((value) => (years.includes(value) ? value : firstYear));
    setToYear((value) => (years.includes(value) ? value : lastYear));
  }, [firstYear, lastYear, years.join(",")]);

  const kinds = useMemo<ExportKind[]>(
    () => (kindMode === "ALL" ? ALL_KINDS : [kindMode]),
    [kindMode],
  );
  const filter = useMemo<InitiativeExportFilter>(
    () => ({ years: { from: fromYear, to: toYear }, periods, kinds }),
    [fromYear, kinds, periods, toYear],
  );
  const debouncedFilter = useDebounced(filter, 350);
  const filterValid = fromYear <= toYear && periods.length > 0 && kinds.length > 0;
  const preview = useQuery({
    queryKey: ["exports", "preview", debouncedFilter],
    queryFn: ({ signal }) => loadExportPreview(debouncedFilter, signal),
    enabled: filterValid,
    placeholderData: (previous) => previous,
  });
  const fieldsQuery = useQuery({
    queryKey: ["exports", "custom-fields", kinds],
    queryFn: ({ signal }) => loadExportAvailability(signal, true, kinds),
    enabled: aiOpen || excelOpen,
    staleTime: 60_000,
  });

  const availableFields = useMemo(
    () =>
      (fieldsQuery.data?.custom_fields ?? []).filter((field) => {
        const expected = field.entity_type === "project" ? "PROJECT" : "OPERATIONAL_TASK";
        return kinds.includes(expected);
      }),
    [fieldsQuery.data?.custom_fields, kinds],
  );

  const fileMutation = useMutation({
    mutationFn: async (request: "EXCEL" | "AI" | "FULL") => {
      downloadController.current?.abort();
      const controller = new AbortController();
      downloadController.current = controller;
      if (request === "EXCEL")
        return downloadExcel(
          {
            ...filter,
            columns: {
              selected_fields: excelFields,
              selected_custom_field_ids: excelCustomFieldIds,
            },
          },
          controller.signal,
        );
      if (request === "AI") return downloadAiJson(filter, privacy, controller.signal);
      return downloadFullJson(controller.signal);
    },
    onSuccess: (file) => {
      saveDownloadedFile(file);
      notify(NOTIFICATION_KINDS.success, SYSTEM_MESSAGES.exports.downloadReady);
      setFullConfirmOpen(false);
      setConfirmation("");
    },
    onError: (error) => {
      if ((error as Error).name === "AbortError") return;
      notify(
        NOTIFICATION_KINDS.error,
        error instanceof Error ? error.message : SYSTEM_MESSAGES.exports.downloadFailed,
      );
    },
    onSettled: () => {
      downloadController.current = null;
    },
  });

  const togglePeriod = (period: ExportPeriod) => {
    setPeriods((current) =>
      current.includes(period)
        ? current.filter((item) => item !== period)
        : ALL_PERIODS.filter((item) => [...current, period].includes(item)),
    );
  };
  const togglePrivacy = (key: keyof Omit<AiExportPrivacy, "selected_custom_field_ids">) =>
    setPrivacy((current) => ({ ...current, [key]: !current[key] }));
  const toggleField = (id: string) =>
    setPrivacy((current) => ({
      ...current,
      selected_custom_field_ids: current.selected_custom_field_ids.includes(id)
        ? current.selected_custom_field_ids.filter((item) => item !== id)
        : [...current.selected_custom_field_ids, id],
    }));
  const toggleExcelField = (field: ExcelField) =>
    setExcelFields((current) =>
      current.includes(field)
        ? current.filter((item) => item !== field)
        : ALL_EXCEL_FIELDS.filter((item) => [...current, field].includes(item)),
    );
  const toggleExcelCustomField = (id: string) =>
    setExcelCustomFieldIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  const noData = !preview.isPending && (preview.data?.total ?? 0) === 0;
  const exportDisabled = !filterValid || noData || fileMutation.isPending;
  const excelDisabled = exportDisabled || excelFields.length === 0;
  const matrixRows = useMemo(() => {
    const rows = new Map<string, { year: number; period: ExportPeriod; PROJECT: number; OPERATIONAL_TASK: number }>();
    (preview.data?.matrix ?? []).forEach((cell) => {
      const key = `${cell.year}:${cell.period}`;
      const row = rows.get(key) ?? {
        year: cell.year,
        period: cell.period,
        PROJECT: 0,
        OPERATIONAL_TASK: 0,
      };
      row[cell.kind] = cell.count;
      rows.set(key, row);
    });
    return [...rows.values()].sort(
      (a, b) =>
        a.year - b.year ||
        ALL_PERIODS.indexOf(a.period) - ALL_PERIODS.indexOf(b.period),
    );
  }, [preview.data?.matrix]);

  return (
    <section className={styles.root}>
      <div className={styles.intro}>
        <div>
          <h3>Експорт даних</h3>
          <p>Сформуйте Excel-звіт, безпечний набір для AI або повний системний snapshot.</p>
        </div>
        <span className={styles.securityBadge}><ShieldAlert size={17} /> Контрольований експорт</span>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.cardHeading}>
          <div className={styles.headingIcon}><Database size={20} /></div>
          <div><h4>Період і склад даних</h4><p>Ці параметри застосовуються до Excel та JSON для AI.</p></div>
        </div>
        <div className={styles.filterGrid}>
          <label className={styles.field}>
            <span>Рік від</span>
            <select value={fromYear} onChange={(event) => setFromYear(Number(event.target.value))}>
              {(years.length ? years : [currentYear]).map((year) => <option key={year}>{year}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Рік до</span>
            <select value={toYear} onChange={(event) => setToYear(Number(event.target.value))}>
              {(years.length ? years : [currentYear]).map((year) => <option key={year}>{year}</option>)}
            </select>
          </label>
          <div className={`${styles.field} ${styles.kindField}`}>
            <span>Тип ініціатив</span>
            <div className={styles.segmented}>
              {([
                ["ALL", "Усі"],
                ["PROJECT", "Проєкти"],
                ["OPERATIONAL_TASK", "Операційні задачі"],
              ] as Array<[KindMode, string]>).map(([value, label]) => (
                <button key={value} type="button" className={kindMode === value ? styles.segmentActive : ""} onClick={() => setKindMode(value)}>{label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.periodRow}>
          <span>Періоди</span>
          <button type="button" className={periods.length === ALL_PERIODS.length ? styles.periodActive : ""} onClick={() => setPeriods(periods.length === ALL_PERIODS.length ? [] : ALL_PERIODS)}>Усі періоди</button>
          {ALL_PERIODS.map((period) => (
            <button key={period} type="button" className={periods.includes(period) ? styles.periodActive : ""} onClick={() => togglePeriod(period)}>{PERIOD_LABELS[period]}</button>
          ))}
        </div>
      </div>

      <div className={styles.preview} aria-live="polite">
        <article><span>Усього записів</span><strong>{preview.isFetching ? "…" : preview.data?.total ?? 0}</strong></article>
        <article><span>Записи беклогу</span><strong>{preview.data?.backlog_records ?? 0}</strong></article>
        <article><span>Квартальні картки</span><strong>{preview.data?.quarter_cards ?? 0}</strong></article>
      </div>

      {!!matrixRows.length && (
        <div className={styles.matrixCard}>
          <div className={styles.matrixHeading}>
            <div><h4>Склад майбутнього експорту</h4><p>Кількість записів за роками, періодами та типами.</p></div>
          </div>
          <div className={styles.matrixScroll}>
            <table>
              <thead><tr><th>Рік</th><th>Період</th><th>Проєкти</th><th>Операційні задачі</th><th>Разом</th></tr></thead>
              <tbody>
                {matrixRows.map((row) => (
                  <tr key={`${row.year}:${row.period}`}>
                    <td>{row.year}</td><td>{PERIOD_LABELS[row.period]}</td><td>{row.PROJECT}</td><td>{row.OPERATIONAL_TASK}</td><td><strong>{row.PROJECT + row.OPERATIONAL_TASK}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={styles.exportGrid}>
        <article className={styles.exportCard}>
          <div className={styles.cardHeading}>
            <div className={`${styles.headingIcon} ${styles.excelIcon}`}><FileSpreadsheet size={22} /></div>
            <div><h4>Excel-звіт</h4><p>Зведення, беклог і квартальні аркуші зі стилями та форматуванням.</p></div>
          </div>
          <button type="button" className={styles.settingsToggle} onClick={() => setExcelOpen((value) => !value)}>Налаштувати поля Excel <ChevronDown size={17} className={excelOpen ? styles.chevronOpen : ""} /></button>
          {excelOpen && (
            <div className={styles.excelSettingsColumns}>
              <section className={styles.excelSettingsSection}>
                <div className={styles.customFieldsHeader}>
                  <div><strong>Стандартні поля</strong><small className={styles.neutralHint}>Оберіть щонайменше одне поле.</small></div>
                  <button type="button" onClick={() => setExcelFields(excelFields.length === ALL_EXCEL_FIELDS.length ? [] : ALL_EXCEL_FIELDS)}>{excelFields.length === ALL_EXCEL_FIELDS.length ? "Очистити" : "Обрати всі"}</button>
                </div>
                <div className={styles.excelFieldList}>
                  {ALL_EXCEL_FIELDS.map((field) => {
                    const checked = excelFields.includes(field);
                    return (
                      <label key={field} className={styles.customFieldRow}>
                        <input type="checkbox" checked={checked} onChange={() => toggleExcelField(field)} />
                        <span className={styles.checkboxVisual}>{checked && <Check size={14} />}</span>
                        <span><strong>{EXCEL_FIELD_LABELS[field]}</strong></span>
                      </label>
                    );
                  })}
                </div>
              </section>
              <section className={`${styles.excelSettingsSection} ${styles.excelCustomFieldsSection}`}>
                <div className={styles.customFieldsHeader}>
                  <div><strong>Додаткові поля</strong><small className={styles.neutralHint}>Додаються окремими колонками квартальних аркушів.</small></div>
                  <button type="button" onClick={() => setExcelCustomFieldIds([])}>Очистити</button>
                </div>
                <div className={styles.customFieldList}>
                  {fieldsQuery.isPending ? <p>Завантаження полів…</p> : (fieldsQuery.data?.custom_fields ?? []).length ? (fieldsQuery.data?.custom_fields ?? []).map((field) => {
                    const checked = excelCustomFieldIds.includes(field.id);
                    return (
                      <label key={field.id} className={styles.customFieldRow}>
                        <input type="checkbox" checked={checked} onChange={() => toggleExcelCustomField(field.id)} />
                        <span className={styles.checkboxVisual}>{checked && <Check size={14} />}</span>
                        <span><strong>{field.name}</strong><small>{field.entity_type === "project" ? "Проєкти" : "Операційні задачі"} · {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}</small></span>
                      </label>
                    );
                  }) : <p>Додаткових полів не знайдено.</p>}
                </div>
              </section>
            </div>
          )}
          <button className={styles.primaryButton} type="button" disabled={excelDisabled} onClick={() => fileMutation.mutate("EXCEL")}><Download size={18} /> Завантажити Excel</button>
        </article>

        <article className={styles.exportCard}>
          <div className={styles.cardHeading}>
            <div className={`${styles.headingIcon} ${styles.aiIcon}`}><Bot size={22} /></div>
            <div><h4>JSON для AI</h4><p>Компактні агрегати без тексту завдань скоупу.</p></div>
          </div>
          <button type="button" className={styles.settingsToggle} onClick={() => setAiOpen((value) => !value)}>Налаштувати приватність <ChevronDown size={17} className={aiOpen ? styles.chevronOpen : ""} /></button>
          {aiOpen && (
            <div className={styles.excelSettingsColumns}>
              <section className={styles.excelSettingsSection}>
                <div className={`${styles.switchList} ${styles.aiStandardFields}`}>
                  {([
                    ["include_name", "Назви ініціатив"],
                    ["include_strategic_goal", "Стратегічні цілі"],
                    ["include_manager", "Менеджери"],
                    ["include_departments", "Підрозділи"],
                    ["include_notes", "Примітки"],
                  ] as Array<[keyof Omit<AiExportPrivacy, "selected_custom_field_ids">, string]>).map(([key, label]) => (
                    <label key={key} className={styles.switchRow}><span>{label}</span><input type="checkbox" checked={privacy[key]} onChange={() => togglePrivacy(key)} /></label>
                  ))}
                </div>
              </section>
              <section className={`${styles.excelSettingsSection} ${styles.excelCustomFieldsSection}`}>
                <div className={styles.customFieldsHeader}>
                  <div><strong>Додаткові поля</strong><small>Текстові поля можуть містити чутливі дані.</small></div>
                  <button type="button" onClick={() => setPrivacy((value) => ({ ...value, selected_custom_field_ids: [] }))}>Очистити</button>
                </div>
                <div className={styles.customFieldList}>
                  {fieldsQuery.isPending ? <p>Завантаження полів…</p> : availableFields.length ? availableFields.map((field) => {
                    const checked = privacy.selected_custom_field_ids.includes(field.id);
                    return (
                      <label key={field.id} className={styles.customFieldRow}>
                        <input type="checkbox" checked={checked} onChange={() => toggleField(field.id)} />
                        <span className={styles.checkboxVisual}>{checked && <Check size={14} />}</span>
                        <span><strong>{field.name}</strong><small>{field.entity_type === "project" ? "Проєкти" : "Операційні задачі"} · {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}{!field.is_active ? " · Неактивне" : ""}</small></span>
                      </label>
                    );
                  }) : <p>Додаткових полів не знайдено.</p>}
                </div>
                {!!availableFields.length && <button type="button" className={styles.selectVisible} onClick={() => setPrivacy((value) => ({ ...value, selected_custom_field_ids: [...new Set([...value.selected_custom_field_ids, ...availableFields.map((field) => field.id)])] }))}>Обрати всі видимі</button>}
              </section>
            </div>
          )}
          <button className={styles.primaryButton} type="button" disabled={exportDisabled} onClick={() => fileMutation.mutate("AI")}><FileJson size={18} /> Завантажити JSON для AI</button>
        </article>

        {currentUser?.role === "SUPER_ADMIN" && (
          <article className={`${styles.exportCard} ${styles.fullCard}`}>
            <div className={styles.cardHeading}>
              <div className={`${styles.headingIcon} ${styles.fullIcon}`}><Database size={22} /></div>
              <div><h4>Повний JSON snapshot</h4><p>Усі таблиці БД незалежно від фільтрів вище.</p></div>
            </div>
            <div className={styles.warning}><ShieldAlert size={19} /><span>Містить користувачів, RBAC, довідники, ініціативи та audit. Password hashes і refresh sessions вилучаються.</span></div>
            <button className={styles.dangerButton} type="button" disabled={fileMutation.isPending} onClick={() => setFullConfirmOpen(true)}><Download size={18} /> Створити повний snapshot</button>
          </article>
        )}
      </div>

      {fileMutation.isPending && (
        <div className={styles.generating}><span className={styles.spinner} /><span>Формуємо файл на сервері…</span><button type="button" onClick={() => downloadController.current?.abort()}>Скасувати</button></div>
      )}

      {fullConfirmOpen && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setFullConfirmOpen(false)}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="full-export-title">
            <button type="button" className={styles.modalClose} onClick={() => setFullConfirmOpen(false)} aria-label="Закрити"><X size={20} /></button>
            <div className={styles.modalIcon}><ShieldAlert size={28} /></div>
            <h3 id="full-export-title">Підтвердьте системний експорт</h3>
            <p>Файл міститиме майже всі дані БД. Введіть <strong>ЕКСПОРТУВАТИ</strong>, щоб продовжити.</p>
            <input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="ЕКСПОРТУВАТИ" />
            <div className={styles.modalActions}><button type="button" onClick={() => setFullConfirmOpen(false)}>Скасувати</button><button type="button" disabled={confirmation !== "ЕКСПОРТУВАТИ" || fileMutation.isPending} onClick={() => fileMutation.mutate("FULL")}>Завантажити snapshot</button></div>
          </section>
        </div>
      )}
    </section>
  );
};

export default ExportSection;
