import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAppContext } from "../../app/store";
import styles from "./PasswordChangeModal.module.css";

type PasswordChangeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: "login" | "profile";
};

export const PasswordChangeModal = ({
  isOpen,
  onClose,
  mode,
}: PasswordChangeModalProps) => {
  const { currentUser, users, updateUser } = useAppContext();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetAndClose = () => {
    onClose();
    setEmail("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess("");
    setError("");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword ||
      (mode === "login" && !email)
    ) {
      setError("Будь ласка, заповніть всі поля");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Нові паролі не співпадають");
      return;
    }
    const user =
      mode === "login"
        ? users.find((item) => item.email.toLowerCase() === email.toLowerCase())
        : currentUser;
    const hasInvalidCurrentPassword = isLoginMode
      ? user?.password !== currentPassword
      : Boolean(user?.password && user.password !== currentPassword);

    if (!user || hasInvalidCurrentPassword) {
      setError(
        mode === "login"
          ? "Невірний email або поточний пароль"
          : "Невірний поточний пароль",
      );
      return;
    }
    updateUser(user.id, { password: newPassword });
    setSuccess("Пароль успішно змінено!");
    setTimeout(resetAndClose, 2000);
  };

  if (!isOpen) return null;
  const isLoginMode = mode === "login";
  return (
    <div
      className={`${styles.backdrop} ${isLoginMode ? styles.loginBackdrop : styles.profileBackdrop}`}
    >
      <div
        className={`${styles.dialog} ${isLoginMode ? "" : styles.profileDialog}`}
      >
        <button onClick={resetAndClose} className={styles.closeButton}>
          ✕
        </button>
        <h2 className={styles.title}>Змінити пароль</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          {isLoginMode && (
            <div>
              <label className={styles.label}>Ел. пошта</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={styles.input}
              />
            </div>
          )}
          <div>
            <label className={styles.label}>
              {isLoginMode ? "Поточний / Тимчасовий пароль" : "Поточний пароль"}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={styles.input}
            />
          </div>
          <div>
            <label className={styles.label}>Новий пароль</label>
            <div className={styles.passwordField}>
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={`${styles.input} ${styles.passwordInput}`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className={styles.passwordToggle}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className={styles.label}>Підтвердження пароля</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={styles.input}
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
          <div className={styles.actions}>
            <button
              type="button"
              onClick={resetAndClose}
              className={styles.cancelButton}
            >
              Скасувати
            </button>
            <button type="submit" className={styles.submitButton}>
              Змінити пароль
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
