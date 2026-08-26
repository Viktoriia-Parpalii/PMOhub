import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAppContext } from "../../app/store";
import styles from "./PasswordChangeModal.module.css";

type PasswordChangeModalProps = { isOpen: boolean; onClose: () => void };

export const PasswordChangeModal = ({ isOpen, onClose }: PasswordChangeModalProps) => {
  const { currentUser, changePassword } = useAppContext();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetAndClose = () => {
    onClose();
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setSuccess(""); setError("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setSuccess("");
    if (!currentUser || !currentPassword || !newPassword || !confirmPassword) return setError("Будь ласка, заповніть всі поля");
    if (newPassword.length < 12) return setError("Новий пароль має містити щонайменше 12 символів");
    if (newPassword !== confirmPassword) return setError("Нові паролі не співпадають");
    const result = await changePassword(currentPassword, newPassword);
    if (!result.success) return setError(result.message);
    setSuccess("Пароль успішно змінено");
    window.setTimeout(resetAndClose, 1200);
  };

  if (!isOpen) return null;
  return (
    <div className={`${styles.backdrop} ${styles.profileBackdrop}`}>
      <div className={`${styles.dialog} ${styles.profileDialog}`}>
        <button onClick={resetAndClose} className={styles.closeButton} aria-label="Закрити">✕</button>
        <h2 className={styles.title}>Змінити пароль</h2>
        <p className={styles.description}>Підтвердіть поточний пароль та встановіть новий.</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div>
            <label className={styles.label}>Поточний пароль</label>
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={styles.input} autoComplete="current-password" />
          </div>
          <div>
            <label className={styles.label}>Новий пароль</label>
            <div className={styles.passwordField}>
              <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={`${styles.input} ${styles.passwordInput}`} autoComplete="new-password" />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className={styles.passwordToggle} aria-label="Показати або приховати пароль">
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className={styles.label}>Підтвердження пароля</label>
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={styles.input} autoComplete="new-password" />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}
          <div className={styles.actions}>
            <button type="button" onClick={resetAndClose} className={styles.cancelButton}>Скасувати</button>
            <button type="submit" className={styles.submitButton}>Зберегти пароль</button>
          </div>
        </form>
      </div>
    </div>
  );
};
