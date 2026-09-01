import React, { useState } from "react";
import {
  Archive,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { useAppContext } from "./store";
import { AppTabId, NavigationItem } from "./appTypes";
import { dataScopeForTab } from "./appNavigation";
import { AppSidebar } from "./components/AppSidebar";
import { AppContentArea } from "./components/AppContentArea";
import { MobileHeader } from "./components/MobileHeader";
import { ProjectsTab } from "../features/portfolio/projects/ProjectsTab";
import { TasksTab } from "../features/portfolio/tasks/TasksTab";
import { BacklogTab } from "../features/backlog/BacklogTab";
import { Login } from "../features/auth/Login";
import { PasswordChangeModal } from "../features/auth/PasswordChangeModal";
import styles from "./AppShell.module.css";
import { AppLoader } from "../components/ui/AppLoader";

const AdminTab = React.lazy(() =>
  import("../features/admin/AdminTab").then((module) => ({
    default: module.AdminTab,
  })),
);
const Dashboard = React.lazy(() =>
  import("../features/analytics/Dashboard").then((module) => ({
    default: module.Dashboard,
  })),
);
const wideTabs: AppTabId[] = ["projects", "tasks", "backlog", "dashboard"];
const getRoleLabel = (role: string) =>
  role === "SUPER_ADMIN"
    ? "Супер адмін"
    : role === "ADMIN"
      ? "Адміністратор"
      : "Користувач";

export const AppContent = () => {
  const {
    currentUser,
    logout,
    departments,
    rolePermissions,
    isHydrating,
    setInitiativeDataScope,
  } = useAppContext();
  const [activeTab, setActiveTab] = useState<AppTabId>(() => {
    const saved = window.sessionStorage.getItem("pmohub-active-tab");
    return (
      ["dashboard", "projects", "tasks", "backlog", "admin"] as AppTabId[]
    ).includes(saved as AppTabId)
      ? (saved as AppTabId)
      : "dashboard";
  });
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  if (isHydrating) return <AppLoader label="Відновлення сесії…" fullPage />;
  if (!currentUser) return <Login />;
  if (currentUser.must_change_password) {
    return (
      <PasswordChangeModal
        isOpen
        required
        presentation="page"
        onClose={() => undefined}
      />
    );
  }

  const userRolePerm = rolePermissions.find(
    (permission) => permission.role === currentUser.role,
  );
  const canAccessAdmin =
    userRolePerm?.canAccessAdmin ??
    (currentUser.role === "ADMIN" || currentUser.role === "SUPER_ADMIN");
  const tabs: NavigationItem[] = [
    {
      id: "dashboard",
      label: "Аналітика",
      icon: <LayoutDashboard size={20} />,
    },
    { id: "projects", label: "Проєкти", icon: <FolderKanban size={20} /> },
    {
      id: "tasks",
      label: "Операційні задачі",
      icon: <CheckSquare size={20} />,
    },
    { id: "backlog", label: "Беклог", icon: <Archive size={20} /> },
    ...(canAccessAdmin
      ? [
          {
            id: "admin" as const,
            label: "Адміністрування",
            icon: <Settings size={20} />,
          },
        ]
      : []),
  ];
  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const departmentName = currentUser.departmentId
    ? (departments.find(
        (department) => department.id === currentUser.departmentId,
      )?.name ?? "")
    : "";
  const selectTab = (tab: AppTabId) => {
    setInitiativeDataScope(dataScopeForTab(tab));
    setActiveTab(tab);
    window.sessionStorage.setItem("pmohub-active-tab", tab);
    setIsMobileMenuOpen(false);
  };
  const handleChangePassword = () => {
    setIsProfileMenuOpen(false);
    setIsPasswordModalOpen(true);
    setIsMobileMenuOpen(false);
  };
  const handleLogout = () => {
    logout();
    setActiveTab("dashboard");
    window.sessionStorage.setItem("pmohub-active-tab", "dashboard");
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={styles.shell}>
      {isMobileMenuOpen && (
        <div
          className={styles.mobileBackdrop}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <AppSidebar
        currentUser={currentUser}
        departmentName={departmentName}
        roleLabel={getRoleLabel(currentUser.role)}
        tabs={tabs}
        activeTab={currentTab.id}
        isMobileMenuOpen={isMobileMenuOpen}
        isProfileMenuOpen={isProfileMenuOpen}
        onSelectTab={selectTab}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
        onToggleProfileMenu={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
        onCloseProfileMenu={() => setIsProfileMenuOpen(false)}
        onChangePassword={handleChangePassword}
        onLogout={handleLogout}
      />
      <AppContentArea
        isWide={wideTabs.includes(currentTab.id)}
        header={
          <MobileHeader
            title={currentTab.label}
            userName={currentUser.name}
            onOpenMenu={() => setIsMobileMenuOpen(true)}
          />
        }
      >
        {currentTab.id === "dashboard" && (
          <React.Suspense
            fallback={<AppLoader label="Завантаження аналітики…" />}
          >
            <Dashboard />
          </React.Suspense>
        )}
        {currentTab.id === "projects" && <ProjectsTab />}
        {currentTab.id === "tasks" && <TasksTab />}
        {currentTab.id === "backlog" && <BacklogTab />}
        {currentTab.id === "admin" && (
          <React.Suspense
            fallback={<AppLoader label="Завантаження адміністрування…" />}
          >
            <AdminTab />
          </React.Suspense>
        )}
      </AppContentArea>
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};
