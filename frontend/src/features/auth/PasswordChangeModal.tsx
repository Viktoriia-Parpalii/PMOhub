import { FormEvent, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useAppContext } from "../../app/store";
import styles from "./PasswordChangeModal.module.css";
import { SYSTEM_MESSAGES } from "../../shared/constants/systemMessages";
import { notify } from "../../components/ui/ToastNotifications";
import { NOTIFICATION_KINDS } from "../../shared/constants/notificationConstants";

type PasswordChangeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  required?: boolean;
  presentation?: "modal" | "page";
};

export const PasswordChangeModal = ({
  isOpen,
  onClose,
  required = false,
  presentation = "modal",
}: PasswordChangeModalProps) => {
  const { currentUser, changePassword } = useAppContext();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetAndClose = () => {
    if (required) return;
    onClose();
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !currentUser ||
      (!required && !currentPassword) ||
      !newPassword ||
      !confirmPassword
    )
      return notify(
        NOTIFICATION_KINDS.error,
        SYSTEM_MESSAGES.auth.allFieldsRequired,
      );
    if (newPassword.length < 12)
      return notify(
        NOTIFICATION_KINDS.error,
        SYSTEM_MESSAGES.auth.passwordTooShort,
      );
    if (newPassword !== confirmPassword)
      return notify(
        NOTIFICATION_KINDS.error,
        SYSTEM_MESSAGES.auth.passwordsDoNotMatch,
      );
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await changePassword(
        required ? undefined : currentPassword,
        newPassword,
      );
      if (!result.success) return;
      if (!required) window.setTimeout(resetAndClose, 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;
  const form = (
    <div
      className={`${styles.dialog} ${styles.profileDialog} ${presentation === "page" ? styles.pageDialog : ""}`}
    >
        {!required && (
          <button
            onClick={resetAndClose}
            className={styles.closeButton}
            aria-label="Закрити"
          >
            ✕
          </button>
        )}
        {presentation === "page" && (
          <div className={styles.securityIcon} aria-hidden="true">
            <KeyRound size={24} />
          </div>
        )}
        <h2 className={styles.title}>
          {required ? "Створіть новий пароль" : "Змінити пароль"}
        </h2>
        <p className={styles.description}>
          {required
            ? "Ви увійшли за тимчасовим паролем. Змініть його, щоб продовжити роботу в PMO Hub."
            : "Підтвердіть поточний пароль та встановіть новий."}
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {!required && (
            <div>
              <label className={styles.label}>Поточний пароль</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className={styles.input}
                autoComplete="current-password"
              />
            </div>
          )}
          <div>
            <label className={styles.label}>Новий пароль</label>
            <div className={styles.passwordField}>
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={`${styles.input} ${styles.passwordInput}`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className={styles.passwordToggle}
                aria-label="Показати або приховати пароль"
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
              autoComplete="new-password"
            />
          </div>
          <div className={styles.actions}>
            {!required && (
              <button
                type="button"
                onClick={resetAndClose}
                className={styles.cancelButton}
              >
                Скасувати
              </button>
            )}
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Збереження…"
                : required
                  ? "Зберегти та продовжити"
                  : "Зберегти пароль"}
            </button>
          </div>
        </form>
    </div>
  );

  if (presentation === "page") {
    return (
      <main className={styles.page}>
        <section className={styles.pageCard} aria-label="Обов’язкова зміна пароля">
          <div className={styles.brandRow}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 100 100"
              fill="currentColor"
              className={styles.brandLogo}
              aria-hidden="true"
            >
              <rect x="0" y="0" width="34" height="34" />
              <rect x="33" y="0" width="34" height="34" />
              <rect x="33" y="33" width="34" height="34" />
              <rect x="66" y="33" width="34" height="34" />
              <rect x="66" y="66" width="34" height="34" />
              <rect x="0" y="66" width="34" height="34" />
            </svg>
            <span className={styles.brandTitle}>PMO Hub</span>
          </div>
          {form}
          <p className={styles.pageHint}>
            Після зміни пароля ви автоматично перейдете до аналітики.
          </p>
        </section>
      </main>
    );
  }

  return (
    <div className={`${styles.backdrop} ${styles.profileBackdrop}`}>
      {form}
    </div>
  );
};
