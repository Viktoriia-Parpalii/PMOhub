import { TaskModal } from "./TaskModal";
import React, { useEffect, useState } from "react";
import {
  getAvailableYears,
  truncateText,
  isPeriodLocked,
} from "../../../shared/utils";
import { useAppContext } from "../../../app/store";
import { TaskCard } from "./TaskCard";
import { InitiativeViewModel } from "../../../shared/types";
import styles from "../components/shared/PortfolioTab.module.css";
import { PortfolioTable } from "../components/shared/PortfolioTable";
import {
  loadInitiativeCardModel,
  toQuarterCardViewModel,
} from "../../../api/apiClient";
import { AppLoader } from "../../../components/ui/AppLoader";

export const TasksTab = () => {
  const {
    tasks,
    updateTask,
    currentUser,
    customFields,
    departments,
    managers,
    priorities,
    deleteTask,
    rolePermissions,
    createBacklogWithCards,
    setInitiativeDataScope,
  } = useAppContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<InitiativeViewModel | null>(
    null,
  );
  const [isLoadingCard, setIsLoadingCard] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = (
    currentMonth < 3
      ? "Q1"
      : currentMonth < 6
        ? "Q2"
        : currentMonth < 9
          ? "Q3"
          : "Q4"
  ) as import("../../../shared/types").Quarter;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] =
    useState<import("../../../shared/types").Quarter>(currentQuarter);
  useEffect(() => {
    setInitiativeDataScope({
      mode: "tasks",
      year: selectedYear,
      quarter: selectedQuarter,
    });
  }, [selectedQuarter, selectedYear, setInitiativeDataScope]);
  const isArchive = isPeriodLocked(selectedYear, selectedQuarter);
  const [isReadOnlyModal, setIsReadOnlyModal] = useState(false);

  const [filterManager, setFilterManager] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchGoal, setSearchGoal] = useState<string>("");

  let portfolioTasks = tasks.filter(
    (t) =>
      t.record_type === "CARD" &&
      t.year === selectedYear &&
      t.quarter === selectedQuarter,
  );
  if (filterManager) {
    portfolioTasks = portfolioTasks.filter(
      (t) => t.manager_id === filterManager,
    );
  }
  if (filterPriority) {
    portfolioTasks = portfolioTasks.filter(
      (t) => t.priority === filterPriority,
    );
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    portfolioTasks = portfolioTasks.filter((t) =>
      t.name.toLowerCase().includes(q),
    );
  }
  if (searchGoal) {
    const q = searchGoal.toLowerCase();
    portfolioTasks = portfolioTasks.filter((t) => {
      return (t.strategic_goal ?? "").toLowerCase().includes(q);
    });
  }

  const userRolePerm = rolePermissions?.find(
    (rp) => rp.role === currentUser?.role,
  );
  const canEditArchive = userRolePerm?.canEditArchive === true;
  const canEditNormal = Boolean(
    userRolePerm?.isActive !== false &&
      userRolePerm?.canCreateEditInitiatives &&
      !userRolePerm?.isReadOnly,
  );
  const canEdit = isArchive ? canEditNormal && canEditArchive : canEditNormal;

  const taskCustomFields = (customFields || []).filter(
    (cf) => cf.entityType === "task" && cf.showInTable,
  );

  const openEditModal = async (task: InitiativeViewModel) => {
    setIsLoadingCard(true);
    try {
      const response = await loadInitiativeCardModel(task.id);
      setEditingTask(toQuarterCardViewModel(response.data));
      setIsReadOnlyModal(!canEdit);
      setIsModalOpen(true);
    } finally {
      setIsLoadingCard(false);
    }
  };
  const openCreateModal = () => {
    setEditingTask(null);
    setIsReadOnlyModal(false);
    setIsModalOpen(true);
  };

  return (
    <div className={styles.portfolioTab}>
      {isLoadingCard && <AppLoader label="Завантаження картки…" />}
      {isArchive && (
        <div className={styles.archiveBanner}>
          <div className={styles.archiveInfo}>
            <span className={styles.archiveIcon}>📁</span>
            <div>
              <strong className={styles.archiveTitle}>
                Архівний період ({selectedYear} {selectedQuarter})
                {canEditArchive && (
                  <span className={styles.archiveBadge}>
                    Доступне редагування
                  </span>
                )}
              </strong>
              <span className={styles.archiveDescription}>
                {canEditArchive
                  ? "Ви маєте права супер адміна на редагування в архіві."
                  : "Тільки для перегляду"}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedYear(currentYear);
              setSelectedQuarter(currentQuarter);
            }}
            className={styles.returnButton}
          >
            <span className={styles.returnArrow}>←</span> Повернутись на
            поточний період
          </button>
        </div>
      )}

      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.title}>Портфель Операційних задач</h2>
          <p className={styles.subtitle}>Всі задачі обраного періоду.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.periodSelectors}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className={styles.compactSelect}
            >
              {getAvailableYears().map((y) => (
                <option key={y} value={y} title={String(y)}>
                  {truncateText(y, 70)}
                </option>
              ))}
            </select>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value as any)}
              className={styles.compactSelect}
            >
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>
          <div className={styles.viewSwitch}>
            <button
              onClick={() => setViewMode("grid")}
              className={`${styles.viewButton} ${viewMode === "grid" ? styles.activeViewButton : ""}`}
            >
              Картки
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`${styles.viewButton} ${viewMode === "table" ? styles.activeViewButton : ""}`}
            >
              Таблиця
            </button>
          </div>
          {canEdit && (
            <button onClick={openCreateModal} className={styles.addButton}>
              + Додати задачу
            </button>
          )}
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterControls}>
          <input
            type="text"
            placeholder="Пошук за назвою..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.filterInput}
          />
          <input
            type="text"
            placeholder="Пошук за стратегічною задачею..."
            value={searchGoal}
            onChange={(e) => setSearchGoal(e.target.value)}
            className={styles.filterInput}
          />
          <select
            value={filterManager}
            onChange={(e) => setFilterManager(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Всі менеджери</option>
            {(managers || []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={`${styles.filterSelect} ${styles.priorityFilter}`}
          >
            <option value="">Всі пріоритети</option>
            {(priorities || [])
              .filter((priority) => priority.is_active !== false)
              .map((priority) => (
                <option key={priority.id} value={priority.id}>
                  {priority.name}
                </option>
              ))}
          </select>
          {(filterManager || filterPriority || searchQuery || searchGoal) && (
            <button
              onClick={() => {
                setFilterManager("");
                setFilterPriority("");
                setSearchQuery("");
                setSearchGoal("");
              }}
              className={styles.resetButton}
            >
              Скинути
            </button>
          )}
        </div>
      </div>
      {portfolioTasks.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>Задачі відсутні.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className={styles.cardGrid}>
          {portfolioTasks.map((t) => (
            <div key={t.id} className={styles.cardWrapper}>
              <TaskCard
                task={t}
                onClick={() => openEditModal(t)}
                hideColorPicker={!canEdit}
              />
            </div>
          ))}
        </div>
      ) : (
        <PortfolioTable
          kind="task"
          initiatives={portfolioTasks}
          customFields={taskCustomFields}
          canEdit={canEdit}
          onOpen={openEditModal}
        />
      )}

      {isModalOpen && (
        <TaskModal
          task={editingTask}
          defaultYear={selectedYear}
          defaultQuarter={selectedQuarter}
          isReadOnly={isReadOnlyModal}
          onClose={() => setIsModalOpen(false)}
          onSave={async (t) => {
            if (editingTask) {
              const result = await updateTask(editingTask.id, t);
              if (!result.success) {
                alert(result.message);
                return result;
              }
              setIsModalOpen(false);
              return result;
            } else {
              const master = {
                ...t,
                record_type: "YEAR" as const,
                initiative_id: t.initiative_id ?? t.id,
                initiative_year_id: undefined,
                checklist: [],
                quarter: "Q1" as const,
              };
              const result = await createBacklogWithCards(
                "task",
                master,
                [t.quarter],
                t.checklist,
              );
              if (!result.success) {
                alert(result.message);
                return result;
              }
              setIsModalOpen(false);
              return result;
            }
          }}
          onDelete={async (id) => {
            const result = await deleteTask(id);
            if (!result.success) {
              alert(result.message);
              return;
            }
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
