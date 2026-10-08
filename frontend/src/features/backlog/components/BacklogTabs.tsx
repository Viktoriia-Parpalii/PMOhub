import { ClipboardList, FolderOpen } from "lucide-react";
import { BacklogTabKind } from "../backlogTypes";
import type { BacklogCounts } from "../../../shared/types";
import styles from "../BacklogTab.module.css";

interface BacklogTabsProps {
  activeTab: BacklogTabKind;
  projectCount: BacklogCounts["projects"];
  taskCount: BacklogCounts["operational_tasks"];
  countsLoading?: boolean;
  onChange: (tab: BacklogTabKind) => void;
}

export const BacklogTabs = ({
  activeTab,
  projectCount,
  taskCount,
  countsLoading = false,
  onChange,
}: BacklogTabsProps) => (
  <section>
    <div className={styles.tabs}>
      <button
        type="button"
        onClick={() => onChange("PROJECTS")}
        className={`${styles.tabButton} ${activeTab === "PROJECTS" ? styles.tabButtonActive : ""}`}
      >
        <FolderOpen
          size={24}
          className={
            activeTab === "PROJECTS"
              ? styles.projectIconActive
              : styles.tabIconInactive
          }
        />
        Проєкти ({countsLoading ? "… / …" : `${projectCount.filtered} / ${projectCount.total}`})
      </button>
      <button
        type="button"
        onClick={() => onChange("TASKS")}
        className={`${styles.tabButton} ${activeTab === "TASKS" ? styles.tabButtonActive : ""}`}
      >
        <ClipboardList
          size={23}
          className={
            activeTab === "TASKS"
              ? styles.taskIconActive
              : styles.tabIconInactive
          }
        />
        Операційні задачі ({countsLoading ? "… / …" : `${taskCount.filtered} / ${taskCount.total}`})
      </button>
    </div>
  </section>
);
