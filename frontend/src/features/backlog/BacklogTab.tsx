import { useMemo, useState } from "react";
import { useAppContext } from "../../app/store";
import { OperationalTask, Project, Quarter } from "../../shared/types";
import { canViewInitiative, getPermissions } from "../../domain/permissions";
import {
  getChainId,
  getYearSnapshot,
  materializeBacklogYear,
  passportFrom,
} from "../../domain/initiatives";
import { getCurrentPeriod, isBacklogLocked } from "../../shared/utils";
import { BacklogModal } from "./components/BacklogModal";
import { PreparationStageModal } from "./components/PreparationStageModal";
import { InitiativeCardModal } from "../initiatives/components/InitiativeCardModal";
import { BacklogHeader } from "./components/BacklogHeader";
import { BacklogTabs } from "./components/BacklogTabs";
import { ArchiveBanner, BacklogNotice } from "./components/BacklogFeedback";
import { BacklogFilters } from "./components/BacklogFilters";
import { BacklogTable } from "./components/BacklogTable";
import { BacklogDeleteDialog } from "./components/BacklogDeleteDialog";
import { BacklogInitiative as Initiative, BacklogTabKind as Tab, QuarterFilter } from "./backlogTypes";
import styles from "./BacklogTab.module.css";

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
  } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>("PROJECTS");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilter>("ALL");
  const [nameSearch, setNameSearch] = useState("");
  const [goalSearch, setGoalSearch] = useState("");
  const [managerFilter, setManagerFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [editingItem, setEditingItem] = useState<Initiative | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSelectingForExtension, setIsSelectingForExtension] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [preparationItem, setPreparationItem] = useState<Initiative | null>(
    null,
  );
  const [editingCard, setEditingCard] = useState<Initiative | null>(null);
  const [masterToDelete, setMasterToDelete] = useState<Initiative | null>(null);

  const records: Initiative[] = activeTab === "PROJECTS" ? projects : tasks;
  const permission = getPermissions(currentUser, rolePermissions);
  const archive = isBacklogLocked(selectedYear);
  const canEdit = Boolean(
    permission?.canCreateEditProjects && !permission.isReadOnly && !archive,
  );
  const targetYear = selectedYear + 1;
  const visibleQuarters = quarterFilter === "ALL" ? quarters : [quarterFilter];
  const currentPeriod = getCurrentPeriod();
  const periodIndex = (year: number, quarter: Quarter) =>
    year * 10 + Number(quarter.slice(1));
  const isPastQuarter = (quarter: Quarter) =>
    periodIndex(selectedYear, quarter) <
    periodIndex(currentPeriod.year, currentPeriod.quarter);

  const materializeVisibleMasters = (source: Initiative[]) =>
    source
      .filter(
        (record) =>
          record.is_backlog &&
          record.year === selectedYear &&
          record.yearSnapshots?.[String(selectedYear)],
      )
      .map((record) => materializeBacklogYear(record, selectedYear)!)
      .filter((record) => canViewInitiative(record, currentUser));

  const allMasters = useMemo(
    () => materializeVisibleMasters(records),
    [records, selectedYear, currentUser],
  );
  const projectCount = useMemo(
    () => materializeVisibleMasters(projects).length,
    [projects, selectedYear, currentUser],
  );
  const taskCount = useMemo(
    () => materializeVisibleMasters(tasks).length,
    [tasks, selectedYear, currentUser],
  );

  const masters = useMemo(
    () =>
      allMasters.filter((record) => {
        const nameQuery = nameSearch.trim().toLowerCase();
        const goalQuery = goalSearch.trim().toLowerCase();
        return (
          (!nameQuery || record.name.toLowerCase().includes(nameQuery)) &&
          (!goalQuery ||
            (record.strategic_goal ?? "").toLowerCase().includes(goalQuery)) &&
          (!managerFilter || record.manager_id === managerFilter) &&
          (!priorityFilter || record.priority === priorityFilter)
        );
      }),
    [allMasters, nameSearch, goalSearch, managerFilter, priorityFilter],
  );

  const eligibleIds = useMemo(
    () =>
      new Set(
        allMasters
          .filter(
            (master) =>
              !records.some(
                (record) =>
                  record.is_backlog &&
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
  const cardsFor = (masterId: string) =>
    records.filter(
      (record) =>
        !record.is_backlog &&
        record.backlog_id === masterId &&
        record.year === selectedYear,
    );
  const cancelExtensionSelection = () => {
    setIsSelectingForExtension(false);
    setSelectedIds([]);
  };
  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    setExpandedId(null);
    cancelExtensionSelection();
    setNotice(null);
  };
  const changeYear = (year: number) => {
    setSelectedYear(year);
    setExpandedId(null);
    cancelExtensionSelection();
    setNotice(null);
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
  const confirmExtension = () => {
    const result = createBacklogSnapshots(
      activeTab === "PROJECTS" ? "project" : "task",
      selectedIds,
      selectedYear,
      targetYear,
    );
    if (!result.success) {
      setNotice({ type: "error", message: result.message });
      return;
    }
    setNotice({
      type: "success",
      message: `${result.data?.created ?? selectedIds.length} ініціатив продовжено на ${targetYear} рік.`,
    });
    cancelExtensionSelection();
  };
  const toggleQuarter = (master: Initiative, quarter: Quarter) => {
    if (isPastQuarter(quarter)) {
      setNotice({ type: "error", message: "Картки можна створювати лише для поточного або майбутніх кварталів" });
      return;
    }
    const existing = cardsFor(master.id).find((card) => card.year === selectedYear && card.quarter === quarter);
    if (existing) {
      const result = activeTab === "PROJECTS" ? deleteProject(existing.id) : deleteTask(existing.id);
      if (!result.success) setNotice({ type: "error", message: result.message });
      return;
    }
    const previousCard = cardsFor(master.id).sort((a, b) => b.quarter.localeCompare(a.quarter))[0];
    const preparation = getYearSnapshot(master, selectedYear)?.preparationStage;
    const card = {
      ...master,
      ...passportFrom(master),
      ...(previousCard ? passportFrom(previousCard) : (preparation ?? {})),
      implementer_dept_ids: [],
      id: `${master.id}-${selectedYear}-${quarter}`,
      is_backlog: false,
      backlog_id: master.id,
      initiative_chain_id: getChainId(master),
      yearSnapshots: undefined,
      year: selectedYear,
      quarter,
      health_status: "DEFAULT" as const,
      checklist: [],
      history: [],
    };
    const result = activeTab === "PROJECTS" ? addProject(card as Project) : addTask(card as OperationalTask);
    if (!result.success) setNotice({ type: "error", message: result.message });
  };
  const removeMaster = () => {
    if (!masterToDelete) return;
    const result = activeTab === "PROJECTS" ? deleteProject(masterToDelete.id) : deleteTask(masterToDelete.id);
    if (!result.success) setNotice({ type: "error", message: result.message });
    setMasterToDelete(null);
  };

  return (
    <div className={`backlog-page ${styles.page}`}>
      <BacklogHeader
        selectedYear={selectedYear}
        quarterFilter={quarterFilter}
        isSelectingForExtension={isSelectingForExtension}
        selectedCount={selectedIds.length}
        canConfirmExtension={selectedIds.length > 0}
        canEdit={canEdit}
        extensionAvailable={eligibleIds.size > 0}
        targetYear={targetYear}
        onYearChange={changeYear}
        onQuarterChange={setQuarterFilter}
        onStartExtension={() => {
          setIsSelectingForExtension(true);
          setSelectedIds([]);
          setNotice(null);
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
        onChange={changeTab}
      />

      {notice && <BacklogNotice notice={notice} onClose={() => setNotice(null)} />}
      {archive && <ArchiveBanner year={selectedYear} onReturn={changeYear} />}

      <section className={styles.dataSection}>
        <BacklogFilters
          nameSearch={nameSearch}
          goalSearch={goalSearch}
          managerFilter={managerFilter}
          priorityFilter={priorityFilter}
          managers={managers}
          priorities={priorities}
          onNameSearch={setNameSearch}
          onGoalSearch={setGoalSearch}
          onManagerFilter={setManagerFilter}
          onPriorityFilter={setPriorityFilter}
        />
        <BacklogTable
          activeTab={activeTab}
          masters={masters}
          selectedYear={selectedYear}
          visibleQuarters={visibleQuarters}
          cardsFor={cardsFor}
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
          onToggleExpanded={(id) => setExpandedId(expandedId === id ? null : id)}
          onToggleSelected={toggleSelected}
          onToggleAll={toggleSelectAll}
          onToggleQuarter={toggleQuarter}
          isPastQuarter={isPastQuarter}
          onEditMaster={(item) => {
            setEditingItem(item);
            setIsModalOpen(true);
          }}
          onDeleteMaster={setMasterToDelete}
          onOpenCard={setEditingCard}
          onOpenPreparation={setPreparationItem}
        />
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
          onClose={() => setPreparationItem(null)}
        />
      )}
      {editingCard && (
        <InitiativeCardModal
          kind={activeTab === "PROJECTS" ? "project" : "task"}
          item={editingCard}
          isReadOnly={!canEdit}
          openInViewMode={canEdit}
          onClose={() => setEditingCard(null)}
          onSave={(item) => {
            const result =
              activeTab === "PROJECTS"
                ? updateProject(item.id, item as Project)
                : updateTask(item.id, item as OperationalTask);
            if (!result.success) {
              setNotice({ type: "error", message: result.message });
              return;
            }
            setEditingCard(null);
          }}
          onDelete={(id) => {
            const result =
              activeTab === "PROJECTS" ? deleteProject(id) : deleteTask(id);
            if (!result.success) {
              setNotice({ type: "error", message: result.message });
              return;
            }
            setEditingCard(null);
          }}
        />
      )}
      {masterToDelete && (
        <BacklogDeleteDialog
          item={masterToDelete}
          onCancel={() => setMasterToDelete(null)}
          onConfirm={removeMaster}
        />
      )}
    </div>
  );
};
