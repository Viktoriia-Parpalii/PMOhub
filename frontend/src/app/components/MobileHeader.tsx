import { Menu } from "lucide-react";
import styles from "../AppShell.module.css";

type MobileHeaderProps = {
  title: string;
  userName: string;
  onOpenMenu: () => void;
};

export const MobileHeader = ({
  title,
  userName,
  onOpenMenu,
}: MobileHeaderProps) => (
  <header className={styles.mobileHeader}>
    <div className={styles.mobileHeaderLeft}>
      <button
        type="button"
        onClick={onOpenMenu}
        className={styles.mobileMenuButton}
        aria-label="Toggle menu"
      >
        <Menu size={22} />
      </button>
      <span className={styles.mobileTitle}>{title}</span>
    </div>
    <div className={styles.mobileUserName}>{userName}</div>
  </header>
);
