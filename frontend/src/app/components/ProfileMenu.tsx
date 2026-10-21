import { KeyRound, LogOut } from "lucide-react";
import styles from "../AppShell.module.css";

type ProfileMenuProps = {
  onChangePassword: () => void;
  onLogout: () => void;
  onClose: () => void;
};

export const ProfileMenu = ({
  onChangePassword,
  onLogout,
  onClose,
}: ProfileMenuProps) => (
  <>
    <div className={styles.profileMenuBackdrop} onClick={onClose} />
    <div className={styles.profileMenu}>
      <button
        type="button"
        onClick={onChangePassword}
        className={styles.profileMenuButton}
      >
        <KeyRound size={16} /> Змінити пароль
      </button>
      <button
        type="button"
        onClick={onLogout}
        className={styles.profileMenuLogout}
      >
        <LogOut size={16} /> Вийти
      </button>
    </div>
  </>
);
