import { useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "../../app/store";
import { InitiativeViewModel, Quarter } from "../../shared/types";
import { canViewInitiative, getPermissions } from "../../domain/permissions";
import {
  getChainId,
  getYearSnapshot,
  materializeBacklogYear,
} from "../../domain/initiatives";
import { isPeriodLockedAtBusinessDate } from "../../shared/utils";
import { getHistoricalAndPlanningYears } from "../../shared/utils";
import { BacklogModal } from "./components/BacklogModal";
import { PreparationStageModal } from "./components/PreparationStageModal";
import { InitiativeCardModal } from "../initiatives/components/InitiativeCardModal";
import { BacklogHeader } from "./components/BacklogHeader";
import { BacklogTabs } from "./components/BacklogTabs";
import { ArchiveBanner } from "./components/BacklogFeedback";
import { BacklogFilters } from "./components/BacklogFilters";
import { BacklogTable } from "./components/BacklogTable";
import { BacklogDeleteDialog } from "./components/BacklogDeleteDialog";
import {
  BacklogInitiative as Initiative,
  BacklogTabKind as Tab,
  QuarterFilter,
} from "./backlogTypes";
import styles from "./BacklogTab.module.css";
import { SYSTEM_MESSAGES } from "../../shared/constants/systemMessages";
import {
  ApiError,
  loadInitiativeCardModel,
  toQuarterCardViewModel,
} from "../../api/apiClient";
import {
  useInitiativeAvailableYearsQuery,
  useInitiativeYearCountsQuery,
} from "../../api/hooks";
import { useInitiativeListFilters } from "../../shared/hooks/useInitiativeListFilters";
import {
  InitiativeListError,
  InitiativeListSkeleton,
} from "../../components/ui/InitiativeListFeedback";
import { notify } from "../../components/ui/ToastNotifications";
import { NOTIFICATION_KINDS } from "../../shared/constants/notificationConstants";

const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

export const BacklogTab = () => {
  const {
    projects,
    tasks,
    managers,
    priorities,
    initiativeStatuses,
    departments,
    currentUser,
    rolePermissions,
    addProject,
    addTask,
    updateProject,
    updateTask,
    deleteProject,
    deleteTask,
    createBacklogSnapshots,
    setInitiativeDataScope,
    businessPeriod,
    initiativeListState,
  } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>("PROJECTS");
  const [selectedYear, setSelectedYear] = useState(businessPeriod.year);
  useEffect(() => {
    setSelectedYear(businessPeriod.year);
  }, [businessPeriod.year]);
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilter>("ALL");
  const availableYearsQuery = useInitiativeAvailableYearsQuery();
  const backlogYears = useMemo(
    () =>
      getHistoricalAndPlanningYears(
        availableYearsQuery.data ?? [],
        businessPeriod.year,
      ),
    [availableYearsQuery.data, businessPeriod.year],
  );
  const listFilters = useInitiativeListFilters();
  const serverFilters = useMemo(
    () => ({
      ...listFilters.filters,
      quarter: quarterFilter === "ALL" ? undefined : quarterFilter,
    }),
    [listFilters.filters, quarterFilter],
  );
  const countsQuery = useInitiativeYearCountsQuery(
    selectedYear,
    true,
    serverFilters,
  );
  useEffect(() => {
    setInitiativeDataScope({
      mode: "backlog",
      kind: activeTab === "PROJECTS" ? "project" : "task",
      year: selectedYear,
      filters: serverFilters,
    });
  }, [activeTab, selectedYear, serverFilters, setInitiativeDataScope]);
  const [editingItem, setEditingItem] = useState<Initiative | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSelectingForExtension, setIsSelectingForExtension] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preparationItem, setPreparationItem] = useState<Initiative | null>(
    null,
  );
  const [editingCard, setEditingCard] = useState<Initiative | null>(null);
  const [masterToDelete, setMasterToDelete] = useState<Initiative | null>(null);
  const pendingCommands = useRef(new Set<string>());
  const openCard = async (card: Initiative) => {
    try {
      const response = await loadInitiativeCardModel(card.id);
      setEditingCard(toQuarterCardViewModel(response.data));
    } catch (error) {
      notify(
        NOTIFICATION_KINDS.error,
        error instanceof ApiError
          ? error.message
          : SYSTEM_MESSAGES.api.genericError,
      );
    }
  };

  const records: Initiative[] = activeTab === "PROJECTS" ? projects : tasks;
  const permission = getPermissions(currentUser, rolePermissions);
  const archive = isPeriodLockedAtBusinessDate(
    selectedYear,
    "Q4",
    businessPeriod.business_date,
  );
  const canEdit = Boolean(
    permission?.canCreateEditInitiatives && !permission.isReadOnly && !archive,
  );
  const targetYear = selectedYear + 1;
  const visibleQuarters = quarterFilter === "ALL" ? quarters : [quarterFilter];
  const currentPeriod = businessPeriod;
  const periodIndex = (year: number, quarter: Quarter) =>
    year * 10 + Number(quarter.slice(1));
  const isPastQuarter = (quarter: Quarter) =>
    periodIndex(selectedYear, quarter) <
    periodIndex(currentPeriod.year, currentPeriod.quarter);

  const materializeVisibleMasters = (source: Initiative[]) =>
    source
      .filter(
        (record) =>
          record.record_type === "YEAR" && record.year === selectedYear,
      )
      .map((record) => materializeBacklogYear(record, selectedYear)!)
      .filter((record) => canViewInitiative(record, currentUser));

  const allMasters = useMemo(
    () => materializeVisibleMasters(records),
    [records, selectedYear, currentUser],
  );
  const projectCount =
    countsQuery.data?.projects ?? {
      filtered: activeTab === "PROJECTS" ? allMasters.length : 0,
      total: activeTab === "PROJECTS" ? allMasters.length : 0,
    };
  const taskCount =
    countsQuery.data?.operational_tasks ?? {
      filtered: activeTab === "TASKS" ? allMasters.length : 0,
      total: activeTab === "TASKS" ? allMasters.length : 0,
    };

  const cardsByMaster = useMemo(() => {
    const grouped = new Map<string, Initiative[]>();
    records.forEach((record) => {
      if (
        record.record_type !== "CARD" ||
        record.year !== selectedYear ||
        !record.initiative_year_id
      )
        return;
      const cards = grouped.get(record.initiative_year_id) ?? [];
      cards.push(record);
      grouped.set(record.initiative_year_id, cards);
    });
    return grouped;
  }, [records, selectedYear]);

  const cardFilters = {
    quarter: quarterFilter,
    managerId: listFilters.managerId,
    priorityId: listFilters.priorityId,
  };
  const cardsFor = (masterId: string) => cardsByMaster.get(masterId) ?? [];
  const highlightedQuarter =
    quarterFilter !== "ALL"
      ? quarterFilter
      : selectedYear === currentPeriod.year
        ? currentPeriod.quarter
        : undefined;

  const masters = allMasters;

  const eligibleIds = useMemo(
    () =>
      new Set(
        allMasters
          .filter(
            (master) =>
              !records.some(
                (record) =>
                  record.record_type === "YEAR" &&
                  record.year === targetYear &&
                  getChainId(record) === getChainId(master),
              ),
          )
          .map((master) => master.id),
      ),
    [allMasters, records, targetYear],
  );
  const selectableMasterIds = masters
    .filter((master) => eligibleIds.has(master.id))
    .map((master) => master.id);
  const allVisibleSelected =
    selectableMasterIds.length > 0 &&
    selectableMasterIds.every((id) => selectedIds.includes(id));
  const cancelExtensionSelection = () => {
    setIsSelectingForExtension(false);
    setSelectedIds([]);
  };
  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    setExpandedId(null);
    cancelExtensionSelection();
  };
  const changeYear = (year: number) => {
    setSelectedYear(year);
    setExpandedId(null);
    cancelExtensionSelection();
  };
  const toggleSelected = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const toggleSelectAll = () =>
    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !selectableMasterIds.includes(id))
        : Array.from(new Set([...current, ...selectableMasterIds])),
    );
  const confirmExtension = async () => {
    const commandKey = `extend-${activeTab}-${selectedYear}`;
    if (pendingCommands.current.has(commandKey)) return;
    pendingCommands.current.add(commandKey);
    try {
      const result = await createBacklogSnapshots(
        activeTab === "PROJECTS" ? "project" : "task",
        selectedIds,
        selectedYear,
        targetYear,
      );
      if (!result.success) return;
      cancelExtensionSelection();
    } finally {
      pendingCommands.current.delete(commandKey);
    }
  };
  const toggleQuarter = async (master: Initiative, quarter: Quarter) => {
    const commandKey = `quarter-${master.id}-${selectedYear}-${quarter}`;
    if (pendingCommands.current.has(commandKey)) return;
    if (isPastQuarter(quarter)) {
      notify(
        NOTIFICATION_KINDS.error,
        SYSTEM_MESSAGES.initiatives.cardCreationPeriodRestricted,
      );
      return;
    }
    pendingCommands.current.add(commandKey);
    try {
      const existing = cardsFor(master.id).find(
        (card) => card.year === selectedYear && card.quarter === quarter,
      );
      if (existing) {
        await (activeTab === "PROJECTS"
          ? deleteProject(existing.id)
          : deleteTask(existing.id));
        return;
      }
      const card = {
        ...master,
        id: `${master.id}-${selectedYear}-${quarter}`,
        record_type: "CARD" as const,
        initiative_year_id: master.id,
        initiative_id: getChainId(master),
        year: selectedYear,
        quarter,
        health_status: "DEFAULT" as const,
        checklist: [],
        history: [],
      };
      const result = await (activeTab === "PROJECTS"
        ? addProject(card as InitiativeViewModel)
        : addTask(card as InitiativeViewModel));
      if (!result.success) return;
    } finally {
      pendingCommands.current.delete(commandKey);
    }
  };
  const removeMaster = async () => {
    if (!masterToDelete) return;
    await (activeTab === "PROJECTS"
      ? deleteProject(masterToDelete.id)
      : deleteTask(masterToDelete.id));
    setMasterToDelete(null);
  };

  return (
    <div className={`backlog-page ${styles.page}`}>
      <BacklogHeader
        selectedYear={selectedYear}
        years={backlogYears}
        quarterFilter={quarterFilter}
        isSelectingForExtension={isSelectingForExtension}
        selectedCount={selectedIds.length}
        canConfirmExtension={selectedIds.length > 0}
        canEdit={canEdit}
        extensionAvailable={allMasters.length > 0}
        targetYear={targetYear}
        onYearChange={changeYear}
        onQuarterChange={setQuarterFilter}
        onStartExtension={() => {
          setIsSelectingForExtension(true);
          setSelectedIds([]);
        }}
        onConfirmExtension={confirmExtension}
        onCancelExtension={cancelExtensionSelection}
        onCreate={() => {
          setEditingItem(null);
          setIsModalOpen(true);
        }}
      />

      <BacklogTabs
        activeTab={activeTab}
        projectCount={projectCount}
        taskCount={taskCount}
        countsLoading={countsQuery.isFetching}
        onChange={changeTab}
      />

      {archive && (
        <ArchiveBanner
          year={selectedYear}
          currentYear={businessPeriod.year}
          onReturn={changeYear}
        />
      )}

      <section className={styles.dataSection}>
        <BacklogFilters
          nameSearch={listFilters.name}
          goalSearch={listFilters.strategicGoal}
          managerFilter={listFilters.managerId}
          priorityFilter={listFilters.priorityId}
          managers={managers}
          priorities={priorities}
          onNameSearch={listFilters.setName}
          onGoalSearch={listFilters.setStrategicGoal}
          onManagerFilter={listFilters.setManagerId}
          onPriorityFilter={listFilters.setPriorityId}
          hasFilters={listFilters.hasFilters || quarterFilter !== "ALL"}
          onReset={() => {
            listFilters.reset();
            setQuarterFilter("ALL");
          }}
        />
        {initiativeListState.isFetching ? (
          <InitiativeListSkeleton variant="backlog" />
        ) : initiativeListState.isError ? (
          <InitiativeListError retry={initiativeListState.retry} />
        ) : (
          <BacklogTable
          activeTab={activeTab}
          masters={masters}
          selectedYear={selectedYear}
          visibleQuarters={visibleQuarters}
          cardsFor={cardsFor}
          cardFilters={cardFilters}
          highlightedQuarter={highlightedQuarter}
          managers={managers}
          priorities={priorities}
          departments={departments}
          initiativeStatuses={initiativeStatuses}
          canEdit={canEdit}
          isSelecting={isSelectingForExtension}
          selectedIds={selectedIds}
          eligibleIds={eligibleIds}
          allVisibleSelected={allVisibleSelected}
          selectableIds={selectableMasterIds}
          expandedId={expandedId}
          onToggleExpanded={(id) =>
            setExpandedId(expandedId === id ? null : id)
          }
          onToggleSelected={toggleSelected}
          onToggleAll={toggleSelectAll}
          onToggleQuarter={toggleQuarter}
          isPastQuarter={isPastQuarter}
          onEditMaster={(item) => {
            setEditingItem(item);
            setIsModalOpen(true);
          }}
          onDeleteMaster={setMasterToDelete}
          onOpenCard={(card) => {
            void openCard(card);
          }}
          onOpenPreparation={setPreparationItem}
          />
        )}
      </section>

      {isModalOpen && (
        <BacklogModal
          type={activeTab}
          editItem={editingItem}
          selectedYear={selectedYear}
          isReadOnly={!canEdit}
          onClose={() => setIsModalOpen(false)}
        />
      )}
      {preparationItem && (
        <PreparationStageModal
          item={preparationItem}
          type={activeTab === "PROJECTS" ? "project" : "task"}
          isReadOnly={!canEdit}
          onClose={() => setPreparationItem(null)}
        />
      )}
      {editingCard && (
        <InitiativeCardModal
          kind={activeTab === "PROJECTS" ? "project" : "task"}
          item={editingCard}
          isReadOnly={!canEdit}
          openInViewMode
          onClose={() => setEditingCard(null)}
          onSave={async (item) => {
            const result = await (activeTab === "PROJECTS"
              ? updateProject(item.id, item)
              : updateTask(item.id, item));
            if (!result.success) {
              return result;
            }
            setEditingCard(null);
            return result;
          }}
          onDelete={async (id) => {
            const result = await (activeTab === "PROJECTS"
              ? deleteProject(id)
              : deleteTask(id));
            if (!result.success) {
              return;
            }
            setEditingCard(null);
          }}
        />
      )}
      {masterToDelete && (
        <BacklogDeleteDialog
          item={masterToDelete}
          hasQuarterCards={cardsFor(masterToDelete.id).length > 0}
          onCancel={() => setMasterToDelete(null)}
          onConfirm={removeMaster}
        />
      )}
    </div>
  );
};
