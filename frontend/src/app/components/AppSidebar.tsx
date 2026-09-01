import { X } from "lucide-react";
import { User } from "../../shared/types";
import { AppTabId, NavigationItem } from "../appTypes";
import { ProfileMenu } from "./ProfileMenu";
import styles from "../AppShell.module.css";

type AppSidebarProps = {
  currentUser: User;
  departmentName: string;
  roleLabel: string;
  tabs: NavigationItem[];
  activeTab: AppTabId;
  isMobileMenuOpen: boolean;
  isProfileMenuOpen: boolean;
  onSelectTab: (tab: AppTabId) => void;
  onCloseMobileMenu: () => void;
  onToggleProfileMenu: () => void;
  onCloseProfileMenu: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
};

export const AppSidebar = ({
  currentUser,
  departmentName,
  roleLabel,
  tabs,
  activeTab,
  isMobileMenuOpen,
  isProfileMenuOpen,
  onSelectTab,
  onCloseMobileMenu,
  onToggleProfileMenu,
  onCloseProfileMenu,
  onChangePassword,
  onLogout,
}: AppSidebarProps) => (
  <aside
    className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ""}`}
  >
    <div className={styles.brandRow}>
      <div className={styles.brandIdentity}>
        <svg
          width="28"
          height="28"
          viewBox="0 0 100 100"
          fill="currentColor"
          className={styles.brandLogo}
        >
          <rect x="0" y="0" width="34" height="34" />
          <rect x="33" y="0" width="34" height="34" />
          <rect x="33" y="33" width="34" height="34" />
          <rect x="66" y="33" width="34" height="34" />
          <rect x="66" y="66" width="34" height="34" />
          <rect x="0" y="66" width="34" height="34" />
        </svg>
        <h1 className={styles.brandName}>PMO Hub</h1>
      </div>
      <button
        type="button"
        onClick={onCloseMobileMenu}
        className={styles.mobileCloseButton}
      >
        <X size={20} />
      </button>
    </div>
    <nav className={styles.navigation}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelectTab(tab.id)}
          className={`${styles.navigationButton} ${activeTab === tab.id ? styles.navigationButtonActive : styles.navigationButtonInactive}`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
    <div className={styles.profileArea}>
      <div className={styles.profileSummary}>
        <button
          type="button"
          aria-label="Відкрити профіль"
          onClick={onToggleProfileMenu}
          className={styles.avatarButton}
        >
          {currentUser.name.charAt(0)}
        </button>
        <button
          type="button"
          onClick={onToggleProfileMenu}
          className={styles.profileDetails}
        >
          <span className={styles.profileName}>{currentUser.name}</span>
          <span className={styles.profileRole}>
            {roleLabel}
            {departmentName ? ` • ${departmentName}` : ""}
          </span>
        </button>
      </div>
      {isProfileMenuOpen && (
        <ProfileMenu
          onClose={onCloseProfileMenu}
          onChangePassword={onChangePassword}
          onLogout={onLogout}
        />
      )}
    </div>
  </aside>
);
