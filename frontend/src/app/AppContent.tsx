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
import { AppSidebar } from "./components/AppSidebar";
import { AppContentArea } from "./components/AppContentArea";
import { MobileHeader } from "./components/MobileHeader";
import { Dashboard } from "../features/analytics/Dashboard";
import { ProjectsTab } from "../features/portfolio/projects/ProjectsTab";
import { TasksTab } from "../features/portfolio/tasks/TasksTab";
import { BacklogTab } from "../features/backlog/BacklogTab";
import { Login } from "../features/auth/Login";
import { PasswordChangeModal } from "../features/auth/PasswordChangeModal";
import styles from "./AppShell.module.css";

const AdminTab = React.lazy(() =>
  import("../features/admin/AdminTab").then((module) => ({
    default: module.AdminTab,
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
  const { currentUser, logout, departments, rolePermissions } = useAppContext();
  const [activeTab, setActiveTab] = useState<AppTabId>("dashboard");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  if (!currentUser) return <Login />;

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
    setActiveTab(tab);
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
        {currentTab.id === "dashboard" && <Dashboard />}
        {currentTab.id === "projects" && <ProjectsTab />}
        {currentTab.id === "tasks" && <TasksTab />}
        {currentTab.id === "backlog" && <BacklogTab />}
        {currentTab.id === "admin" && (
          <React.Suspense
            fallback={
              <div className={styles.loading}>
                Завантаження адміністрування…
              </div>
            }
          >
            <AdminTab />
          </React.Suspense>
        )}
      </AppContentArea>
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        mode="profile"
      />
    </div>
  );
};
