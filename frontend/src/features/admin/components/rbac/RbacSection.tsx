import React, { useState } from "react";
import { Check, Copy, KeyRound, Power, PowerOff, Trash2, X } from "lucide-react";
import { useAppContext } from "../../../../app/store";
import { UserRole } from "../../../../shared/types";
import { truncateText } from "../../../../shared/utils";
import styles from "./RbacSection.module.css";

export const RbacSection = () => {
  const {
    rolePermissions,
    updateRolePermission,
    users,
    updateUser,
    deleteUser,
    departments,
    addUser,
    resetUserPassword,
    currentUser,
  } = useAppContext();
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    name: string;
    onConfirm: () => Promise<{ success: boolean; message: string }>;
  } | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserDept, setNewUserDept] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("USER");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<{ name: string; value: string } | null>(null);
  const [resetError, setResetError] = useState("");

  const handleResetPassword = async (user: { id: string; name: string; role: UserRole }) => {
    setResetError("");
    const result = await resetUserPassword(user.id);
    if (!result.success || !result.data) {
      setResetError(result.message);
      return;
    }
    setCopied(false);
    setTemporaryPassword({ name: user.name, value: result.data.temporary_password });
  };

  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserDept) {
      setError("Заповніть всі поля");
      return;
    }
    if (
      users.some((u) => u.email.toLowerCase() === newUserEmail.toLowerCase())
    ) {
      setError("Користувач з таким email вже існує");
      return;
    }

    setCopied(false);
    const result = await addUser({
      id: "USR-" + Math.random().toString(36).substring(2, 8),
      name: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      role: newUserRole,
      departmentId: newUserDept || undefined,
      password: "",
    });
    if (!result.success || !result.data) {
      setError(result.message);
      return;
    }
    setGeneratedPassword(result.data.temporary_password);
  };

  return (
    <div className={styles.section}>
      <div>
        <h3 className={styles.sectionTitle}>Матриця прав доступу</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Роль</th>
                <th className={styles.headerCenter}>Read-Only</th>
                <th className={styles.headerCenter}>Створення/Редагування</th>
                <th className={styles.headerCenter}>Видалення</th>
                <th className={styles.headerCenter}>Доступ до Адмін</th>
                <th className={styles.headerCenter}>Редагування архіву</th>
              </tr>
            </thead>
            <tbody>
              {rolePermissions.map((rp) => (
                <tr key={rp.role}>
                  <td className={styles.strong}>
                    {rp.role === "SUPER_ADMIN"
                      ? "Супер адмін (SUPER_ADMIN)"
                      : rp.role === "ADMIN"
                        ? "Адміністратор (ADMIN)"
                        : "Користувач (USER)"}
                  </td>
                  <td className={styles.center}>
                    <input
                      type="checkbox"
                      checked={rp.isReadOnly}
                      onChange={(e) =>
                        updateRolePermission(rp.role, {
                          isReadOnly: e.target.checked,
                        })
                      }
                      className={styles.checkbox}
                    />
                  </td>
                  <td className={styles.center}>
                    <input
                      type="checkbox"
                      checked={rp.canCreateEditProjects}
                      onChange={(e) =>
                        updateRolePermission(rp.role, {
                          canCreateEditProjects: e.target.checked,
                        })
                      }
                      className={styles.checkbox}
                    />
                  </td>
                  <td className={styles.center}>
                    <input
                      type="checkbox"
                      checked={rp.canDeleteProjects}
                      onChange={(e) =>
                        updateRolePermission(rp.role, {
                          canDeleteProjects: e.target.checked,
                        })
                      }
                      className={styles.checkbox}
                    />
                  </td>
                  <td className={styles.center}>
                    <input
                      type="checkbox"
                      checked={rp.canAccessAdmin}
                      onChange={(e) =>
                        updateRolePermission(rp.role, {
                          canAccessAdmin: e.target.checked,
                        })
                      }
                      className={styles.checkbox}
                    />
                  </td>
                  <td className={styles.center}>
                    <input
                      type="checkbox"
                      checked={rp.canEditArchive ?? false}
                      onChange={(e) =>
                        updateRolePermission(rp.role, {
                          canEditArchive: e.target.checked,
                        })
                      }
                      className={styles.checkbox}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Користувачі системи</h3>
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className={styles.addUserButton}
          >
            + Додати користувача
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ПІБ</th>
                <th>Ел. пошта</th>
                <th>Департамент</th>
                <th>Роль</th>
                <th className={styles.headerRight}></th>
              </tr>
            </thead>
            <tbody>
              {(users || []).map((user) => (
                <tr key={user.id}>
                  <td className={styles.strong}>{user.name}</td>
                  <td className={styles.tableCell}>{user.email}</td>
                  <td className={styles.tableCell}>
                    {departments.find((d) => d.id === user.departmentId)
                      ?.name || "—"}
                  </td>
                  <td className={styles.tableCell}>
                    <select
                      value={user.role}
                      onChange={(e) =>
                        updateUser(user.id, {
                          role: e.target.value as UserRole,
                        })
                      }
                      className={styles.roleSelect}
                    >
                      <option value="SUPER_ADMIN">
                        Супер адмін (SUPER_ADMIN)
                      </option>
                      <option value="ADMIN">Адміністратор (ADMIN)</option>
                      <option value="USER">Користувач (USER)</option>
                    </select>
                  </td>
                  <td className={styles.tableCellRight}>
                    {!(currentUser?.role !== "SUPER_ADMIN" && user.role === "SUPER_ADMIN") && (
                      <button
                        onClick={() => void handleResetPassword(user)}
                        className={styles.resetPasswordButton}
                        title="Видати тимчасовий пароль"
                      >
                        <KeyRound size={15} />
                        Тимчасовий пароль
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setDeleteConfirm({
                          title: "користувача",
                          name: user.name,
                          onConfirm: () => deleteUser(user.id),
                        })
                      }
                      className={styles.iconButton}
                      title="Видалити"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleteConfirm && (
        <div className={styles.backdrop}>
          <div className={styles.dialog}>
            <div className={styles.dialogLead}>
              <div className={styles.dangerIcon}>
                <Trash2 size={24} />
              </div>
              <h3 className={styles.dialogTitle}>Підтвердження видалення</h3>
            </div>
            <p className={styles.dialogDescription}>
              Ви дійсно бажаєте видалити користувача{" "}
              <span className={styles.emphasis}>«{deleteConfirm.name}»</span>?
              Цю дію неможливо скасувати.
            </p>
            <div className={styles.dialogActions}>
              <button
                onClick={() => setDeleteConfirm(null)}
                className={styles.cancelButton}
              >
                Скасувати
              </button>
              <button
                onClick={async () => {
                  const result = await deleteConfirm.onConfirm();
                  if (!result.success) {
                    setResetError(result.message);
                    return;
                  }
                  setDeleteConfirm(null);
                }}
                className={styles.dangerButton}
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}

      {temporaryPassword && (
        <div className={styles.backdrop}>
          <div className={styles.dialog}>
            <div className={styles.dialogLead}>
              <div className={styles.resetIcon}><KeyRound size={22} /></div>
              <h3 className={styles.dialogTitle}>Тимчасовий пароль</h3>
            </div>
            <p className={styles.dialogDescription}>
              Передайте пароль користувачу <span className={styles.emphasis}>«{temporaryPassword.name}»</span> захищеним каналом. Він показується лише зараз і має бути змінений після входу.
            </p>
            <div className={styles.passwordRow}>
              <div className={`${styles.valueBox} ${styles.passwordBox}`}>{temporaryPassword.value}</div>
              <button onClick={() => { navigator.clipboard.writeText(temporaryPassword.value); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }} className={styles.copyButton} title="Скопіювати пароль">
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
            <div className={styles.dialogActions}>
              <button onClick={() => setTemporaryPassword(null)} className={styles.closeButton}>Готово</button>
            </div>
          </div>
        </div>
      )}

      {resetError && (
        <div className={styles.backdrop}>
          <div className={styles.dialog}>
            <div className={styles.dialogLead}><div className={styles.dangerIcon}><X size={22} /></div><h3 className={styles.dialogTitle}>Не вдалося видати пароль</h3></div>
            <p className={styles.dialogDescription}>{resetError}</p>
            <div className={styles.dialogActions}><button onClick={() => setResetError("")} className={styles.closeButton}>Закрити</button></div>
          </div>
        </div>
      )}

      {isAddUserModalOpen && (
        <div className={styles.backdrop}>
          <div className={`${styles.dialog} ${styles.dialogTall}`}>
            <h3 className={styles.newUserTitle}>
              {generatedPassword ? "Користувача створено" : "Новий користувач"}
            </h3>

            {generatedPassword ? (
              <div className={styles.formStack}>
                <div className={styles.successMessage}>
                  Користувач <strong>{newUserName}</strong> успішно доданий до
                  системи. Передайте йому ці дані для входу:
                </div>

                <div>
                  <label className={styles.fieldLabel}>Ел. пошта</label>
                  <div className={styles.valueBox}>{newUserEmail}</div>
                </div>

                <div>
                  <label className={styles.fieldLabel}>Тимчасовий пароль</label>
                  <div className={styles.passwordRow}>
                    <div className={`${styles.valueBox} ${styles.passwordBox}`}>
                      {generatedPassword}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPassword);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className={styles.copyButton}
                      title="Скопіювати пароль"
                    >
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>

                <div className={styles.dialogActions}>
                  <button
                    onClick={() => {
                      setIsAddUserModalOpen(false);
                      setNewUserName("");
                      setNewUserEmail("");
                      setNewUserDept("");
                      setGeneratedPassword("");
                    }}
                    className={styles.closeButton}
                  >
                    Закрити
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.formStack}>
                  <div>
                    <label className={styles.fieldLabel}>
                      Ім'я та Прізвище
                    </label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => {
                        setNewUserName(e.target.value);
                        setError("");
                      }}
                      className={styles.input}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Ел. пошта</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => {
                        setNewUserEmail(e.target.value);
                        setError("");
                      }}
                      className={styles.input}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Департамент</label>
                    <select
                      value={newUserDept}
                      onChange={(e) => {
                        setNewUserDept(e.target.value);
                        setError("");
                      }}
                      className={styles.select}
                    >
                      <option value="">Оберіть департамент</option>
                      {(departments || []).map((d) => (
                        <option key={d.id} value={d.id} title={d.name}>
                          {truncateText(d.name, 70)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Роль</label>
                    <select
                      value={newUserRole}
                      onChange={(e) =>
                        setNewUserRole(e.target.value as UserRole)
                      }
                      className={styles.select}
                    >
                      <option value="SUPER_ADMIN">
                        Супер адмін (SUPER_ADMIN)
                      </option>
                      <option value="ADMIN">Адміністратор (ADMIN)</option>
                      <option value="USER">Користувач (USER)</option>
                    </select>
                  </div>
                </div>

                {error && <p className={styles.formError}>{error}</p>}

                <div className={styles.dialogActions}>
                  <button
                    onClick={() => {
                      setIsAddUserModalOpen(false);
                      setError("");
                      setNewUserName("");
                      setNewUserEmail("");
                      setNewUserDept("");
                      setGeneratedPassword("");
                    }}
                    className={styles.cancelButton}
                  >
                    Скасувати
                  </button>
                  <button
                    onClick={handleAddUser}
                    className={styles.primaryButton}
                  >
                    Додати
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
