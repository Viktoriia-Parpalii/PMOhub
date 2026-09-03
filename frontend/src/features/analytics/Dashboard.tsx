import React, { CSSProperties, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { X } from "lucide-react";
import { useAppContext } from "../../app/store";
import { useAnalyticsDrilldownQuery, useAnalyticsQuery } from "../../api/hooks";
import { Quarter } from "../../shared/types";
import {
  analyticsKindLabels,
  analyticsQueryParams,
  analyticsStatusLabel,
  quarterlyDepartmentReserve,
} from "./analyticsSelectors";
import {
  AnalyticsDrilldownCriteria,
  AnalyticsFilters,
  AnalyticsMode,
  AnalyticsOverviewResponse,
  AnalyticsPlanningHealthResponse,
  AnalyticsRecord,
  AnalyticsResponse,
  AnalyticsTrendsResponse,
  AnalyticsWorkloadResponse,
  CardStatusMetric,
  StatusCounts,
} from "./analyticsTypes";
import styles from "./Dashboard.module.css";
import { SYSTEM_MESSAGES } from "../../shared/constants/systemMessages";
import { AppLoader } from "../../components/ui/AppLoader";
import { notify } from "../../components/ui/ToastNotifications";
import { NOTIFICATION_KINDS } from "../../shared/constants/notificationConstants";

const statusOrder = ["DEFAULT", "YELLOW", "GREEN", "RED"] as const;
const statusColors: Record<keyof StatusCounts, string> = {
  DEFAULT: "#94a3b8",
  YELLOW: "#f59e0b",
  GREEN: "#10b981",
  RED: "#f43f5e",
};
const sizeColors = ["#c4b5fd", "#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9"];
const riskLabels: Record<string, string> = {
  NO_MANAGER: "Без менеджера",
  NO_PRIORITY: "Без пріоритету",
  NO_SCOPE: "Без scope",
  NO_EXECUTOR: "Без виконавця",
  INCOMPLETE_PREPARATION: "Підготовчий етап заповнений не повністю",
};

const AnalyticsLoadingContext = React.createContext(false);

type DepartmentCapacity = AnalyticsResponse["department_capacity"][number];
type Drilldown =
  | {
      type: "records";
      title: string;
      criteria?: AnalyticsDrilldownCriteria;
      page: number;
    }
  | { type: "departments"; title: string; departments: DepartmentCapacity[] }
  | null;

export const Dashboard = () => {
  const { departments, managers, businessPeriod, setInitiativeDataScope } = useAppContext();
  useEffect(() => {
    setInitiativeDataScope({ mode: "dashboard" });
  }, [setInitiativeDataScope]);
  const [mode, setMode] = useState<AnalyticsMode>("quarterly");
  const [filters, setFilters] = useState<AnalyticsFilters>({
    year: businessPeriod.year,
    quarter: businessPeriod.quarter,
    kind: "ALL",
    departmentId: "",
    managerId: "",
  });
  useEffect(() => {
    setFilters((current) => ({
      ...current,
      year: businessPeriod.year,
      quarter: businessPeriod.quarter,
    }));
  }, [businessPeriod.quarter, businessPeriod.year]);
  const [drilldown, setDrilldown] = useState<Drilldown>(null);
  const params = useMemo(() => {
    const result = analyticsQueryParams(filters);
    if (mode === "quarterly") result.set("quarter", filters.quarter);
    return result;
  }, [filters, mode]);
  const overviewQuery = useAnalyticsQuery(mode, "overview", params);
  const workloadQuery = useAnalyticsQuery(mode, "workload", params);
  const trendsQuery = useAnalyticsQuery(mode, "trends", params);
  const planningHealthQuery = useAnalyticsQuery(
    mode,
    "planning-health",
    params,
  );
  const analyticsQueries = [
    overviewQuery,
    workloadQuery,
    trendsQuery,
    planningHealthQuery,
  ];
  useEffect(() => {
    if (analyticsQueries.some((query) => query.isError))
      notify(NOTIFICATION_KINDS.error, SYSTEM_MESSAGES.loading.analyticsFailed);
  }, [overviewQuery.isError, workloadQuery.isError, trendsQuery.isError, planningHealthQuery.isError]);
  const overview = overviewQuery.data as AnalyticsOverviewResponse | undefined;
  const workload = workloadQuery.data as AnalyticsWorkloadResponse | undefined;
  const trends = trendsQuery.data as AnalyticsTrendsResponse | undefined;
  const planningHealth = planningHealthQuery.data as
    | AnalyticsPlanningHealthResponse
    | undefined;
  const data = useMemo<AnalyticsResponse | undefined>(() => {
    if (!overview) return undefined;
    const departmentCapacity = (workload?.departments ?? []).map((item) => ({
      department_id: item.id,
      name: item.name,
      load: item.load,
      limit: item.limit,
      reserve: item.reserve,
      is_over_capacity: item.is_over_capacity,
    }));
    const capacityByQuarter = mode === "annual"
      ? (["Q1", "Q2", "Q3", "Q4"] as Quarter[]).map((quarter) => ({
          quarter,
          departments: (workload?.departments ?? []).map((item) => {
            const metric = item.quarters?.find((entry) => entry.quarter === quarter);
            return {
              department_id: item.id,
              name: item.name,
              load: metric?.load ?? 0,
              limit: metric?.limit ?? 0,
            };
          }),
        }))
      : [{
          quarter: filters.quarter,
          departments: departmentCapacity.map((item) => ({
            department_id: item.department_id,
            name: item.name,
            load: item.load,
            limit: item.limit,
          })),
        }];
    return {
      mode: overview.mode,
      available_years: overview.available_years,
      summary: {
        ...overview.summary,
        overloaded_departments: workload?.overloaded_departments ?? 0,
      },
      status_distribution: overview.status_distribution,
      scope_status_counts: overview.scope_status_counts ?? {
        GREEN: 0,
        YELLOW: 0,
        RED: 0,
        DEFAULT: 0,
      },
      size_breakdown: overview.size_breakdown,
      priority_status_breakdown: overview.priority_status_breakdown,
      department_capacity: departmentCapacity,
      capacity_by_quarter: capacityByQuarter,
      manager_loads: workload?.managers ?? [],
      risks: planningHealth?.risks?.preview ?? [],
      volume_trend: trends?.volume_trend ?? [],
      period_comparison: trends?.period_comparison ?? [],
      history: trends?.history ?? [],
      preparation: planningHealth?.preparation ?? {
        total: 0,
        ready: 0,
        incomplete: 0,
      },
    };
  }, [filters.quarter, mode, overview, planningHealth, trends, workload]);
  const kindLabels = analyticsKindLabels(filters.kind);
  const statusColor = (code: keyof StatusCounts) => statusColors[code];
  const openRecords = (
    title: string,
    criteria?: AnalyticsDrilldownCriteria,
  ) => setDrilldown({ type: "records", title, criteria, page: 1 });
  const drilldownParams = useMemo(() => {
    const value = analyticsQueryParams(filters);
    value.set("mode", mode);
    value.set("page", String(drilldown?.type === "records" ? drilldown.page : 1));
    value.set("page_size", "25");
    if (mode === "quarterly") value.set("quarter", filters.quarter);
    if (drilldown?.type === "records") {
      Object.entries(drilldown.criteria ?? {}).forEach(([key, entry]) => {
        if (entry) value.set(key, entry);
      });
    }
    return value;
  }, [drilldown, filters, mode]);
  const drilldownQuery = useAnalyticsDrilldownQuery(
    drilldownParams,
    drilldown?.type === "records",
  );
  const update = <K extends keyof AnalyticsFilters>(
    key: K,
    value: AnalyticsFilters[K],
  ) => setFilters((current) => ({ ...current, [key]: value }));
  const years = Array.from(
    new Set([
      ...(data?.available_years ?? []),
      filters.year,
      businessPeriod.year,
    ]),
  ).sort((a, b) => a - b);
  const statusData = data?.status_distribution ?? [];
  const summary = data?.summary ?? {
    cards: 0,
    initiatives: 0,
    total_weight: 0,
    average_progress: 0,
    average_duration: 0,
    overloaded_departments: 0,
  };
  const activeDepartments = departments.filter(
    (department) =>
      department.is_active !== false &&
      (!filters.departmentId || department.id === filters.departmentId),
  );
  const overloadedDepartments =
    data?.department_capacity.filter((item) => item.is_over_capacity) ?? [];
  const preparationDrilldown = () =>
    openRecords("Підготовчі етапи без квартальної картки", {
      view: "preparation",
    });

  return (
    <div className={styles.dashboard}>
      <section className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <div className={styles.filters}>
            <select
              value={filters.kind}
              onChange={(event) =>
                update("kind", event.target.value as AnalyticsFilters["kind"])
              }
              className={`${styles.select} ${styles.kindSelect}`}
              aria-label="Тип записів"
            >
              <option value="ALL">Проєкти + операційні задачі</option>
              <option value="PROJECT">Тільки проєкти</option>
              <option value="OPERATIONAL_TASK">Тільки операційні задачі</option>
            </select>
            <select
              value={filters.year}
              onChange={(event) => update("year", Number(event.target.value))}
              className={styles.select}
              aria-label="Рік"
            >
              {years.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
            {mode === "quarterly" && (
              <select
                value={filters.quarter}
                onChange={(event) =>
                  update("quarter", event.target.value as Quarter)
                }
                className={styles.select}
                aria-label="Квартал"
              >
                {(["Q1", "Q2", "Q3", "Q4"] as Quarter[]).map((quarter) => (
                  <option key={quarter}>{quarter}</option>
                ))}
              </select>
            )}
            <select
              value={filters.departmentId}
              onChange={(event) => update("departmentId", event.target.value)}
              className={styles.select}
              aria-label="Підрозділ"
            >
              <option value="">Всі підрозділи</option>
              {departments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              value={filters.managerId}
              onChange={(event) => update("managerId", event.target.value)}
              className={styles.select}
              aria-label="Менеджер"
            >
              <option value="">Всі менеджери</option>
              {managers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.switch} aria-label="Період аналітики">
            {(
              [
                ["quarterly", "Квартальний"],
                ["annual", "Річний"],
              ] as const
            ).map(([id, title]) => (
              <button
                type="button"
                key={id}
                onClick={() => {
                  setMode(id);
                  setDrilldown(null);
                }}
                className={`${styles.switchButton} ${mode === id ? styles.switchActive : ""}`}
              >
                {title}
              </button>
            ))}
          </div>
        </div>
        <p className={styles.filterNote}>
          {mode === "quarterly"
            ? `Усі показники розраховано для ${filters.quarter} ${filters.year} року.`
            : "Річні показники розраховано за всіма квартальними картками Q1–Q4."}
        </p>
      </section>

      {overviewQuery.isPending && <AppLoader label="Завантаження аналітики…" />}
      <AnalyticsLoadingContext.Provider
        value={analyticsQueries.some((query) => query.isFetching)}
      >
        {data && (
          <>
          <div className={styles.kpiGrid}>
            <Kpi
              title={`Карток ${kindLabels.genitive} у вибраному періоді`}
              value={summary.cards}
              accent="#0f766e"
              onClick={() => openRecords("Картки у вибраному періоді")}
            />
            <Kpi
              title={`Унікальних ${kindLabels.genitive}`}
              value={summary.initiatives}
              accent="#4f46e5"
              onClick={() => openRecords(kindLabels.nominativeTitle)}
            />
            <Kpi
              title={`Сумарна вага ${kindLabels.genitive}`}
              value={`${summary.total_weight} бал.`}
              accent="#7c3aed"
              onClick={() => openRecords("Картки, що формують сумарну вагу")}
            />
            <Kpi
              title={`${mode === "annual" ? "Загальне виконання скоупу" : "Середній прогрес"} ${kindLabels.genitive}`}
              value={`${summary.average_progress}%`}
              accent="#6366f1"
              progress={summary.average_progress}
              onClick={() =>
                openRecords(
                  mode === "annual"
                    ? "Картки, що формують загальне виконання скоупу"
                    : "Картки, що формують середній прогрес",
                )
              }
            />
            {mode === "annual" && (
              <Kpi
                title={`Середня тривалість ${kindLabels.genitive}`}
                value={`${summary.average_duration} кв.`}
                accent="#8b5cf6"
              />
            )}
            <Kpi
              title="Підрозділів понад ліміт"
              value={summary.overloaded_departments}
              accent={summary.overloaded_departments ? "#e11d48" : "#059669"}
              danger={summary.overloaded_departments > 0}
              onClick={() =>
                setDrilldown({
                  type: "departments",
                  title: "Підрозділи з перевищенням ліміту",
                  departments: overloadedDepartments,
                })
              }
            />
          </div>

          {mode === "quarterly" ? (
            <>
              <div className={styles.grid2}>
                <Chart title={`Статус ${kindLabels.genitive}`}>
                  {statusData.length ? (
                    <StatusDonut
                      data={statusData}
                      onSelect={(item) =>
                        openRecords(
                          `Статус: ${item.name}`,
                          { status_id: item.status_id },
                        )
                      }
                    />
                  ) : (
                    <Empty />
                  )}
                </Chart>
                <Chart title={`Пріоритети та статуси ${kindLabels.genitive}`}>
                  <PriorityStatusChart data={data} onOpen={openRecords} />
                </Chart>
              </div>
              <div className={styles.grid2}>
                <Chart title="Виконання скоупу">
                  <ScopeProgressChart data={data} statusColor={statusColor} />
                </Chart>
                <Chart
                  title={`Структура ${kindLabels.genitive} за розміром`}
                  description="Розмір визначено діапазоном сумарної ваги."
                >
                  <SizeChart data={data} onOpen={openRecords} />
                </Chart>
              </div>
              <div className={styles.grid2}>
                <Chart
                  title={`Завантаженість підрозділів за вагою ${kindLabels.genitive}`}
                >
                  <DepartmentLoadChart data={data} />
                </Chart>
                <Chart
                  title="Резерв завантаження"
                  description={`Вільна вага до ліміту ${filters.quarter}.`}
                  badge={
                    summary.overloaded_departments
                      ? `Перевантажено: ${summary.overloaded_departments}`
                      : undefined
                  }
                  dangerBadge={summary.overloaded_departments > 0}
                >
                  <ReserveWidget
                    data={data}
                    mode={mode}
                    quarter={filters.quarter}
                    departments={activeDepartments}
                  />
                </Chart>
              </div>
              <div className={styles.grid2}>
                <Chart
                  title={`Динаміка обсягу ${kindLabels.genitive}: поточний і попередній квартал`}
                >
                  <QuarterComparisonChart data={data} />
                </Chart>
                <Chart
                  title={`Топ завантажених менеджерів за вагою ${kindLabels.genitive}`}
                >
                  <ManagerCards data={data} onOpen={openRecords} compact />
                </Chart>
              </div>
            </>
          ) : (
            <>
              <div className={styles.grid12}>
                <Chart
                  title={`Статуси квартальних карток ${kindLabels.genitive} за рік`}
                  className={styles.span5}
                >
                  {statusData.length ? (
                    <StatusDonut
                      data={statusData}
                      onSelect={(item) =>
                        openRecords(
                          `Статус: ${item.name}`,
                          { status_id: item.status_id },
                        )
                      }
                    />
                  ) : (
                    <Empty />
                  )}
                </Chart>
                <Chart
                  title={`Структура ${kindLabels.genitive} за розміром`}
                  description="Розмір визначено діапазоном сумарної ваги."
                  className={styles.span7}
                >
                  <SizeChart data={data} onOpen={openRecords} />
                </Chart>
              </div>
              <div className={styles.grid2}>
                <Chart
                  title={`Історична динаміка статусів ${kindLabels.genitive}`}
                >
                  <HistoryChart data={data} />
                </Chart>
                <Chart
                  title={`Динаміка обсягу ${kindLabels.genitive}: ${filters.year} порівняно з ${filters.year - 1}`}
                >
                  <AnnualVolumeChart data={data} year={filters.year} />
                </Chart>
              </div>
              <div className={styles.grid2}>
                <Chart
                  title={`Завантаженість підрозділів за вагою ${kindLabels.genitive}`}
                >
                  <DepartmentLoadChart data={data} />
                </Chart>
                <Chart title={`Пріоритети та статуси ${kindLabels.genitive}`}>
                  <PriorityStatusChart data={data} onOpen={openRecords} />
                </Chart>
              </div>
              <div className={styles.grid2}>
                <Chart
                  title="Теплова карта завантаження за кварталами"
                  description="Зелений — норма, жовтий — від 80%, червоний — перевищення."
                  badge="вага / ліміт"
                >
                  <CapacityTable
                    data={data.capacity_by_quarter}
                    departments={activeDepartments}
                  />
                </Chart>
                <Chart
                  title="Резерв завантаження"
                  description="Вільна вага до річного ліміту."
                  badge={
                    summary.overloaded_departments
                      ? `Перевантажено: ${summary.overloaded_departments}`
                      : undefined
                  }
                  dangerBadge={summary.overloaded_departments > 0}
                >
                  <ReserveWidget
                    data={data}
                    mode={mode}
                    quarter={filters.quarter}
                    departments={activeDepartments}
                  />
                </Chart>
              </div>
              <Chart
                title={`Топ завантажених менеджерів за вагою ${kindLabels.genitive}`}
              >
                <ManagerCards data={data} onOpen={openRecords} />
              </Chart>
            </>
          )}

          {mode === "quarterly" && (
            <Chart
              title="Контроль плану"
              badge={String(planningHealth?.risks?.total ?? 0)}
            >
              <RiskList data={data} onOpen={openRecords} />
            </Chart>
          )}

          {mode === "annual" && (
            <div className={styles.grid12}>
              <Chart
                title="Готовність підготовчого етапу"
                className={styles.span12}
              >
                <button
                  type="button"
                  onClick={preparationDrilldown}
                  className={styles.preparation}
                >
                  <div className={styles.preparationValue}>
                    {data.preparation.ready}/{data.preparation.total}
                  </div>
                  <p className={styles.preparationText}>
                    готових етапів без квартальної картки
                  </p>
                  <span className={styles.link}>Переглянути записи →</span>
                </button>
              </Chart>
            </div>
          )}
          </>
        )}
      </AnalyticsLoadingContext.Provider>
      {drilldown && (
        <DrilldownModal
          value={drilldown}
          records={
            drilldown.type === "records"
              ? (drilldownQuery.data?.records ?? [])
              : []
          }
          loading={drilldown.type === "records" && drilldownQuery.isPending}
          total={drilldownQuery.data?.total ?? 0}
          page={drilldown.type === "records" ? drilldown.page : 1}
          pageSize={drilldownQuery.data?.page_size ?? 25}
          onPageChange={(page) =>
            setDrilldown((current) =>
              current?.type === "records" ? { ...current, page } : current,
            )
          }
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
};

const Kpi = ({
  title,
  value,
  accent,
  progress,
  danger = false,
  onClick,
}: {
  title: string;
  value: string | number;
  accent: string;
  progress?: number;
  danger?: boolean;
  onClick?: () => void;
}) => {
  const loading = React.useContext(AnalyticsLoadingContext);
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={loading ? undefined : onClick}
      className={`${styles.kpi} ${danger ? styles.kpiDanger : ""}`}
      style={{ "--accent": accent } as CSSProperties}
      aria-busy={loading}
    >
      <div className={styles.kpiLabel}>{title}</div>
      <div className={styles.kpiValue}>{value}</div>
      {progress !== undefined && (
        <div className={styles.kpiTrack}>
          <div
            className={styles.kpiTrackFill}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
      {onClick && <span className={styles.kpiHint}>Деталі →</span>}
      {loading && <WidgetLoader compact />}
    </Tag>
  );
};
const Chart = ({
  title,
  description,
  badge,
  dangerBadge = false,
  children,
  className = "",
}: React.PropsWithChildren<{
  title: string;
  description?: string;
  badge?: string;
  dangerBadge?: boolean;
  className?: string;
}>) => {
  const loading = React.useContext(AnalyticsLoadingContext);
  return (
    <section
      className={`${styles.panel} ${className}`}
      aria-busy={loading}
    >
      <header className={styles.panelHeader}>
        <div>
          <h3 className={styles.panelTitle}>{title}</h3>
          {description && (
            <p className={styles.panelDescription}>{description}</p>
          )}
        </div>
        {badge && (
          <span
            className={`${styles.badge} ${dangerBadge ? styles.badgeDanger : ""}`}
          >
            {badge}
          </span>
        )}
      </header>
      <div
        className={`${styles.panelContent} ${loading ? styles.panelContentLoading : ""}`}
      >
        {children}
        {loading && <WidgetLoader />}
      </div>
    </section>
  );
};

const WidgetLoader = ({ compact = false }: { compact?: boolean }) => (
  <div
    className={`${styles.widgetLoader} ${compact ? styles.widgetLoaderCompact : ""}`}
    role="status"
    aria-live="polite"
  >
    <span className={styles.widgetSpinner} aria-hidden="true" />
    <span>Оновлюємо дані…</span>
  </div>
);
const Empty = () => <div className={styles.empty}>Немає даних</div>;

const SizeChart = ({
  data,
  onOpen,
}: {
  data: AnalyticsResponse;
  onOpen: (title: string, criteria?: AnalyticsDrilldownCriteria) => void;
}) => {
  const height = Math.max(280, data.size_breakdown.length * 52);
  return (
    <div className={styles.verticalChartScroll}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.size_breakdown}
            layout="vertical"
            margin={{ left: 8, right: 30 }}
          >
            <CartesianGrid
              strokeDasharray="4 4"
              horizontal={false}
              stroke="#dbe5f0"
            />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#71829d" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={62}
              tick={{ fontSize: 12, fill: "#475569", fontWeight: 750 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<SimpleTooltip valueLabel="Кількість карток" />}
              cursor={{ fill: "#f6f8fb" }}
            />
            <Bar
              dataKey="count"
              name="Кількість карток"
              radius={[0, 6, 6, 0]}
              onClick={(entry: any) =>
                onOpen(
                  `Розмір: ${entry.name ?? entry.payload?.name}`,
                  { size_name: entry.name ?? entry.payload?.name },
                )
              }
            >
              {data.size_breakdown.map((item, index) => (
                <Cell
                  key={item.name}
                  fill={sizeColors[index % sizeColors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const DepartmentLoadChart = ({ data }: { data: AnalyticsResponse }) => {
  const width = Math.max(620, data.department_capacity.length * 105);
  return (
    <div className={styles.chartScroll}>
      <div style={{ width, height: 315 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.department_capacity}
            margin={{ top: 8, right: 20, left: 2, bottom: 76 }}
          >
            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              stroke="#dbe5f0"
            />
            <XAxis
              dataKey="name"
              angle={-34}
              textAnchor="end"
              interval={0}
              tick={{ fontSize: 11, fill: "#61738f" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#61738f" }}
            />
            <Tooltip
              content={<SimpleTooltip valueLabel="Сумарна вага" />}
              cursor={{ fill: "#f6f8fb" }}
            />
            <Bar
              dataKey="load"
              name="Сумарна вага"
              fill="#6366f1"
              radius={[6, 6, 0, 0]}
              maxBarSize={54}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const PriorityStatusChart = ({
  data,
  onOpen,
}: {
  data: AnalyticsResponse;
  onOpen: (title: string, criteria?: AnalyticsDrilldownCriteria) => void;
}) => {
  const height = Math.max(265, data.priority_status_breakdown.length * 54);
  return (
    <>
      <div className={styles.verticalChartScroll}>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.priority_status_breakdown}
              layout="vertical"
              margin={{ top: 6, right: 22, left: 4, bottom: 2 }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                horizontal={false}
                stroke="#dbe5f0"
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#71829d" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={105}
                tick={{ fontSize: 11, fill: "#61738f" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<StatusTooltip />}
                cursor={{ fill: "#f6f8fb" }}
              />
              {data.status_distribution.map((status) => (
                <Bar
                  key={status.status_id}
                  dataKey={(entry) =>
                    entry.status_counts[status.status_id] ?? 0
                  }
                  name={status.name}
                  stackId="priority"
                  fill={status.color}
                   onClick={(entry: any) =>
                     onOpen(
                       `Пріоритет: ${entry.name ?? entry.payload?.name}`,
                       {
                         priority_key:
                           entry.priority_id ??
                           entry.payload?.priority_id ??
                           "NONE",
                         status_id: status.status_id,
                       },
                     )
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <CardStatusKey statuses={data.status_distribution} />
    </>
  );
};

const ScopeProgressChart = ({
  data,
  statusColor,
}: {
  data: AnalyticsResponse;
  statusColor: (code: keyof StatusCounts) => string;
}) => {
  const rows = statusOrder.map((code) => ({
    code,
    name: analyticsStatusLabel(code),
    value: data.scope_status_counts[code],
    color: statusColor(code),
  }));
  return (
    <>
      <ResponsiveContainer width="100%" height={265}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 6, right: 20, left: 2, bottom: 2 }}
        >
          <CartesianGrid
            strokeDasharray="4 4"
            horizontal={false}
            stroke="#dbe5f0"
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#71829d" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={112}
            tick={{ fontSize: 11, fill: "#61738f" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<SimpleTooltip valueLabel="Завдань" />}
            cursor={{ fill: "#f6f8fb" }}
          />
          <Bar dataKey="value" name="Завдань" radius={[0, 5, 5, 0]}>
            {rows.map((item) => (
              <Cell key={item.code} fill={item.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <StatusKey />
    </>
  );
};

const HistoryChart = ({ data }: { data: AnalyticsResponse }) => {
  const width = Math.max(600, data.history.length * 130);
  const statuses = Array.from(
    new Map(
      data.history
        .flatMap((period) => period.status_distribution)
        .map((status) => [status.status_id, status]),
    ).values(),
  );
  const chartData = data.history.map((period) => ({
    ...period,
    status_counts: Object.fromEntries(
      period.status_distribution.map((status) => [
        status.status_id,
        status.count,
      ]),
    ),
  }));
  return (
    <>
      <div className={styles.chartScroll}>
        <div style={{ width, height: 285 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 18, left: 4, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="#dbe5f0"
              />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12, fill: "#61738f", fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#61738f" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<StatusTooltip />}
                cursor={{ fill: "#f6f8fb" }}
              />
              {statuses.map((status) => (
                <Bar
                  key={status.status_id}
                  dataKey={(entry) =>
                    entry.status_counts[status.status_id] ?? 0
                  }
                  name={status.name}
                  stackId="status"
                  fill={status.color}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <CardStatusKey statuses={statuses} />
    </>
  );
};

const AnnualVolumeChart = ({
  data,
  year,
}: {
  data: AnalyticsResponse;
  year: number;
}) => (
  <>
    <ResponsiveContainer width="100%" height={285}>
      <LineChart
        data={data.volume_trend}
        margin={{ top: 8, right: 20, left: 2, bottom: 4 }}
      >
        <CartesianGrid
          strokeDasharray="4 4"
          vertical={false}
          stroke="#dbe5f0"
        />
        <XAxis
          dataKey="quarter"
          tick={{ fontSize: 12, fill: "#61738f" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#61738f" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<VolumeTooltip currentYear={year} />} />
        <Line
          type="monotone"
          dataKey="previous"
          name={`Рік ${year - 1}`}
          stroke="#94a3b8"
          strokeWidth={2.5}
          strokeDasharray="7 6"
          dot={{ r: 4, fill: "#94a3b8", stroke: "#fff", strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="current"
          name={`Рік ${year}`}
          stroke="#6366f1"
          strokeWidth={3.5}
          dot={{ r: 5, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
    <div className={styles.chartLegend}>
      <LegendItem color="#94a3b8" label={`Рік ${year - 1}`} line dashed />
      <LegendItem color="#6366f1" label={`Рік ${year}`} line />
    </div>
  </>
);

const QuarterComparisonChart = ({ data }: { data: AnalyticsResponse }) => (
  <ResponsiveContainer width="100%" height={285}>
    <LineChart
      data={data.period_comparison}
      margin={{ top: 12, right: 26, left: 2, bottom: 8 }}
    >
      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#dbe5f0" />
      <XAxis
        dataKey="label"
        tick={{ fontSize: 12, fill: "#61738f", fontWeight: 700 }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        allowDecimals={false}
        tick={{ fontSize: 11, fill: "#61738f" }}
        axisLine={false}
        tickLine={false}
      />
      <Tooltip content={<SimpleTooltip valueLabel="Кількість карток" />} />
      <Line
        type="monotone"
        dataKey="cards"
        name="Кількість карток"
        stroke="#6366f1"
        strokeWidth={3.5}
        dot={{ r: 6, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
      />
    </LineChart>
  </ResponsiveContainer>
);

const StatusDonut = ({
  data,
  onSelect,
}: {
  data: CardStatusMetric[];
  onSelect: (item: CardStatusMetric) => void;
}) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  return (
    <div className={styles.donutLayout}>
      <ResponsiveContainer width="100%" height={235}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            innerRadius={70}
            outerRadius={103}
            paddingAngle={3}
            stroke="#fff"
            strokeWidth={3}
            onClick={(entry: any) => onSelect(entry.payload ?? entry)}
          >
            {data.map((item) => (
              <Cell key={item.status_id} fill={item.color} />
            ))}
          </Pie>
          <Tooltip content={<SimpleTooltip valueLabel="Кількість" />} />
        </PieChart>
      </ResponsiveContainer>
      <div className={styles.statusLegend}>
        {data.map((item) => (
          <button
            type="button"
            key={item.status_id}
            className={styles.statusLegendRow}
            onClick={() => onSelect(item)}
          >
            <span
              className={styles.legendDot}
              style={{ background: item.color }}
            />
            <span className={styles.legendLabel}>{item.name}</span>
            <strong>
              {total ? Math.round((item.count / total) * 100) : 0}%
            </strong>
            <span className={styles.legendCount}>({item.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const StatusKey = () => (
  <div className={styles.chartLegend}>
    {statusOrder.map((code) => (
      <LegendItem
        key={code}
        color={statusColors[code]}
        label={analyticsStatusLabel(code)}
      />
    ))}
  </div>
);
const CardStatusKey = ({ statuses }: { statuses: CardStatusMetric[] }) => (
  <div className={styles.chartLegend}>
    {statuses.map((status) => (
      <LegendItem
        key={status.status_id}
        color={status.color}
        label={status.name}
      />
    ))}
  </div>
);
const LegendItem = ({
  color,
  label,
  line = false,
  dashed = false,
}: {
  color: string;
  label: string;
  line?: boolean;
  dashed?: boolean;
}) => (
  <span className={styles.legendItem}>
    <i
      className={`${line ? styles.legendLine : styles.legendSquare} ${dashed ? styles.legendDashed : ""}`}
      style={{ "--legend-color": color } as CSSProperties}
    />
    {label}
  </span>
);
const SimpleTooltip = ({ active, payload, label, valueLabel }: any) =>
  active && payload?.length ? (
    <div className={styles.tooltip}>
      <strong>{label ?? payload[0]?.payload?.name}</strong>
      <span className={styles.tooltipValue}>
        {valueLabel}: {payload[0]?.value}
      </span>
    </div>
  ) : null;
const StatusTooltip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div className={styles.tooltip}>
      <strong>{label ?? payload[0]?.payload?.name}</strong>
      {payload.map((item: any) => (
        <span key={item.name} style={{ color: item.color }}>
          {item.name}: {item.value ?? 0}
        </span>
      ))}
    </div>
  ) : null;
const VolumeTooltip = ({ active, payload, label, currentYear }: any) =>
  active && payload?.length ? (
    <div className={styles.tooltip}>
      <strong>{label}</strong>
      <span style={{ color: "#94a3b8" }}>
        Карток {currentYear - 1}:{" "}
        {payload.find((item: any) => item.dataKey === "previous")?.value ?? 0}
      </span>
      <span style={{ color: "#6366f1" }}>
        Карток {currentYear}:{" "}
        {payload.find((item: any) => item.dataKey === "current")?.value ?? 0}
      </span>
    </div>
  ) : null;

const ManagerCards = ({
  data,
  onOpen,
  compact = false,
}: {
  data: AnalyticsResponse;
  onOpen: (title: string, criteria?: AnalyticsDrilldownCriteria) => void;
  compact?: boolean;
}) =>
  data.manager_loads.length ? (
    <div
      className={`${styles.managerGrid} ${compact ? styles.managerGridCompact : ""}`}
    >
      {data.manager_loads.slice(0, 5).map((manager, index) => (
        <button
          type="button"
          key={manager.manager_id}
          className={styles.managerCard}
          onClick={() =>
            onOpen(`Менеджер: ${manager.name}`, {
              manager_id: manager.manager_id,
            })
          }
        >
          <span
            className={`${styles.managerRank} ${index === 0 ? styles.managerRankTop : ""}`}
          >
            #{index + 1}
          </span>
          <div className={styles.managerName} title={manager.name}>
            {manager.name}
          </div>
          <div className={styles.managerLoad}>
            {manager.load} <span className={styles.managerUnit}>бал.</span>
          </div>
        </button>
      ))}
    </div>
  ) : (
    <Empty />
  );

const reserveTone = (load: number, limit: number) =>
  load > limit
    ? styles.danger
    : limit > 0 && load / limit >= 0.8
      ? styles.warning
      : styles.good;
const ReserveWidget = ({
  data,
  mode,
  quarter,
  departments,
}: {
  data: AnalyticsResponse;
  mode: AnalyticsMode;
  quarter: Quarter;
  departments: Array<{ id: string; name: string }>;
}) => {
  if (!departments.length) return <Empty />;
  const metrics =
    mode === "annual"
      ? data.department_capacity
          .filter((item) =>
            departments.some(
              (department) => department.id === item.department_id,
            ),
          )
          .map((item) => ({
            id: item.department_id,
            name: item.name,
            load: item.load,
            limit: item.limit,
            reserve: item.reserve,
            isOverCapacity: item.is_over_capacity,
          }))
      : quarterlyDepartmentReserve(data, quarter, departments);
  return (
    <div className={styles.reserveGrid}>
      {metrics.map((department) => {
        const percent = department.limit
          ? Math.min((department.load / department.limit) * 100, 100)
          : 0;
        return (
          <article key={department.id} className={styles.reserveCard}>
            <div className={styles.reserveTop}>
              <span className={styles.departmentName} title={department.name}>
                {department.name}
              </span>
              <span
                className={`${styles.reserveValue} ${reserveTone(department.load, department.limit)}`}
              >
                {department.reserve < 0
                  ? `Перевищення ${Math.abs(department.reserve)}`
                  : `Резерв ${department.reserve}`}
              </span>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={`${styles.progressFill} ${department.isOverCapacity ? styles.progressDanger : ""}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className={styles.loadMeta}>
              <span>
                {department.load} з {department.limit} балів
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
};

const CapacityTable = ({
  data,
  departments,
}: {
  data: AnalyticsResponse["capacity_by_quarter"];
  departments: Array<{ id: string; name: string }>;
}) => (
  <div className={styles.heatmapScroll}>
    <div className={styles.heatmapGrid}>
      <span className={styles.heatmapHeading}>Підрозділ</span>
      {data.map((item) => (
        <span key={item.quarter} className={styles.quarterHeader}>
          {item.quarter}
        </span>
      ))}
      {departments.flatMap((department) => [
        <span key={`${department.id}-name`} className={styles.departmentName}>
          {department.name}
        </span>,
        ...data.map((period) => {
          const item = period.departments.find(
            (entry) => entry.department_id === department.id,
          );
          const load = item?.load ?? 0;
          const limit = item?.limit ?? 0;
          return (
            <span
              key={`${department.id}-${period.quarter}`}
              className={`${styles.heatmapCell} ${reserveTone(load, limit)}`}
            >
              {load}/{limit}
            </span>
          );
        }),
      ])}
    </div>
  </div>
);
const RiskList = ({
  data,
  onOpen,
}: {
  data: AnalyticsResponse;
  onOpen: (title: string, criteria?: AnalyticsDrilldownCriteria) => void;
}) => (
  <div className={styles.riskList}>
    {data.risks.length ? (
      data.risks.map((risk) => (
        <button
          type="button"
          key={risk.id}
          onClick={() =>
            onOpen("Планувальний ризик", { card_id: risk.id })
          }
          className={styles.risk}
        >
          <span className={styles.riskName}>{risk.name}</span>
          <span className={styles.riskText}>
            {risk.risks.map((item) => riskLabels[item] ?? item).join(" · ")}
          </span>
        </button>
      ))
    ) : (
      <Empty />
    )}
  </div>
);

const DrilldownModal = ({
  value,
  records,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  onClose,
}: {
  value: NonNullable<Drilldown>;
  records: AnalyticsRecord[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onClose: () => void;
}) =>
  createPortal(
    <div
      className={styles.modalBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <header className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{value.title}</h2>
            <p className={styles.modalCount}>
              {value.type === "records"
                ? `Записів: ${total}`
                : `Підрозділів: ${value.departments.length}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.close}
            aria-label="Закрити"
          >
            <X />
          </button>
        </header>
        <div className={styles.modalBody}>
          {value.type === "records" ? (
            loading ? (
              <AppLoader label="Завантаження записів…" />
            ) : (
              <div className={styles.recordList}>
                {records.map((record) => (
                  <article key={record.id} className={styles.record}>
                    <div className={styles.recordTop}>
                      <div>
                        <div className={styles.recordName}>{record.name}</div>
                        <div className={styles.recordMeta}>
                          {record.kind === "PROJECT"
                            ? "Проєкт"
                            : "Операційна задача"}{" "}
                          · {record.year} · {record.quarter} ·{" "}
                          {record.manager_name ?? "Без менеджера"}
                        </div>
                      </div>
                      <div>
                        <div className={styles.recordWeight}>
                          {record.total_weight} бал.
                        </div>
                        <div className={styles.recordDetail}>
                          {record.size_name} · прогрес {record.progress}%
                        </div>
                      </div>
                    </div>
                    {record.risks.length > 0 && (
                      <div className={styles.recordRisk}>
                        {record.risks
                          .map((item) => riskLabels[item] ?? item)
                          .join(" · ")}
                      </div>
                    )}
                  </article>
                ))}
                {!records.length && <Empty />}
                {total > pageSize && (
                  <div className={styles.pagination}>
                    <button
                      type="button"
                      className={styles.paginationButton}
                      disabled={page <= 1}
                      onClick={() => onPageChange(page - 1)}
                    >
                      Назад
                    </button>
                    <span className={styles.paginationStatus}>
                      {page} з {Math.ceil(total / pageSize)}
                    </span>
                    <button
                      type="button"
                      className={styles.paginationButton}
                      disabled={page * pageSize >= total}
                      onClick={() => onPageChange(page + 1)}
                    >
                      Далі
                    </button>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className={styles.recordList}>
              {value.departments.map((department) => (
                <article
                  key={department.department_id}
                  className={`${styles.record} ${styles.overloadRecord}`}
                >
                  <div>
                    <div className={styles.recordName}>{department.name}</div>
                    <div className={styles.recordMeta}>
                      Навантаження {department.load} · ліміт {department.limit}
                    </div>
                  </div>
                  <div className={styles.overloadValue}>
                    +{Math.abs(department.reserve)} бал.
                  </div>
                </article>
              ))}
              {!value.departments.length && <Empty />}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
