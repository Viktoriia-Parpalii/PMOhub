import React, { useState } from "react";
import { useAppContext } from "../../app/store";
import { User } from "../../shared/types";
import { Eye, EyeOff } from "lucide-react";
import styles from "./Login.module.css";
import { PasswordChangeModal } from "./PasswordChangeModal";

export const Login = () => {
  const { users, login, departments } = useAppContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );

    if (user) {
      if (user.password === password) {
        login(user);
      } else {
        setError("Невірний пароль");
      }
    } else {
      setError("Користувача з таким email не знайдено");
    }
  };

  const handleTestUserClick = (user: User) => {
    setEmail(user.email);
    setPassword(user.password || "password123");
    setError("");
  };

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <div className={styles.brandRow}>
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
            <h1 className={styles.brandTitle}>PMO Hub</h1>
          </div>
          <p className={styles.brandSubtitle}>
            Увійдіть у систему для продовження
          </p>
        </div>

        <form onSubmit={handleEmailLogin} className={styles.loginForm}>
          <div>
            <label className={styles.fieldLabel}>Ел. пошта</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className={styles.input}
              placeholder="Введіть email..."
            />
          </div>
          <div>
            <label className={styles.fieldLabel}>Пароль</label>
            <div className={styles.passwordField}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className={`${styles.input} ${styles.passwordInput}`}
                placeholder="Введіть пароль..."
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.passwordToggle}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitButton}>
            Увійти
          </button>
        </form>

        <div className={styles.changePassword}>
          <button
            onClick={() => setShowPasswordModal(true)}
            className={styles.changePasswordButton}
          >
            Змінити пароль
          </button>
        </div>

        <div className={styles.divider}>
          <div className={styles.dividerLine}>
            <div></div>
          </div>
          <div className={styles.dividerContent}>
            <span>швидкий вибір тестового користувача</span>
          </div>
        </div>

        <div className={styles.usersList}>
          {(users || []).map((user) => (
            <button
              key={user.id}
              onClick={() => handleTestUserClick(user)}
              className={styles.userButton}
            >
              <div>
                <div className={styles.userName}>{user.name}</div>
                <div className={styles.userDetails}>
                  {user.email} &bull;{" "}
                  {departments.find((d) => d.id === user.departmentId)?.name ||
                    "—"}
                </div>
              </div>
              <div className={styles.roleBadge}>{user.role}</div>
            </button>
          ))}
        </div>
      </div>

      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        mode="login"
      />
    </div>
  );
};

export default Login;
