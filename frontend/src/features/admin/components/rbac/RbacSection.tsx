import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, KeyRound, Power, PowerOff, Trash2 } from "lucide-react";
import { useAppContext } from "../../../../app/store";
import { UserRole } from "../../../../shared/types";
import { truncateText } from "../../../../shared/utils";
import styles from "./RbacSection.module.css";
import { SYSTEM_MESSAGES } from "../../../../shared/constants/systemMessages";
import { notify } from "../../../../components/ui/ToastNotifications";
import { NOTIFICATION_KINDS } from "../../../../shared/constants/notificationConstants";

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
    enableAdminData,
    disableAdminData,
  } = useAppContext();
  useEffect(() => {
    enableAdminData();
    return disableAdminData;
  }, [disableAdminData, enableAdminData]);
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
  const [newUserRole, setNewUserRole] = useState<UserRole>("");
  const [copied, setCopied] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<{
    name: string;
    value: string;
  } | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const activeRoles = useMemo(
    () => rolePermissions.filter((role) => role.isActive !== false),
    [rolePermissions],
  );
  const roleLabel = (role: (typeof rolePermissions)[number]) =>
    role.roleName || role.role;
  const roleNameByCode = (code: UserRole) => {
    const role = rolePermissions.find((candidate) => candidate.role === code);
    return role ? roleLabel(role) : code;
  };

  useEffect(() => {
    if (
      activeRoles.length &&
      !activeRoles.some((role) => role.role === newUserRole)
    ) {
      setNewUserRole(
        activeRoles.find((role) => role.isDefault)?.role ??
          activeRoles[0].role,
      );
    }
  }, [activeRoles, newUserRole]);

  const isCurrentUserEmail = (email: string) =>
    email.trim().toLowerCase() === currentUser?.email.trim().toLowerCase();

  const handleResetPassword = async (user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  }) => {
    if (isCurrentUserEmail(user.email)) {
      notify(
        NOTIFICATION_KINDS.error,
        SYSTEM_MESSAGES.access.ownTemporaryPasswordDenied,
      );
      return;
    }
    setResettingUserId(user.id);
    try {
      const result = await resetUserPassword(user.id);
      if (!result.data?.temporary_password) {
        notify(NOTIFICATION_KINDS.error, result.message);
        return;
      }
      setCopied(false);
      setTemporaryPassword({
        name: user.name,
        value: result.data.temporary_password,
      });
    } finally {
      setResettingUserId(null);
    }
  };

  const handleAddUser = async () => {
    if (
      !newUserName.trim() ||
      !newUserEmail.trim() ||
      !newUserDept ||
      !newUserRole
    ) {
      notify(NOTIFICATION_KINDS.error, SYSTEM_MESSAGES.entities.fillAllFields);
      return;
    }
    if (
      users.some((u) => u.email.toLowerCase() === newUserEmail.toLowerCase())
    ) {
      notify(NOTIFICATION_KINDS.error, SYSTEM_MESSAGES.auth.duplicateEmail);
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
      notify(NOTIFICATION_KINDS.error, result.message);
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
                    {roleLabel(rp)}
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
                      checked={rp.canCreateEditInitiatives}
                      onChange={(e) =>
                        updateRolePermission(rp.role, {
                          canCreateEditInitiatives: e.target.checked,
                        })
                      }
                      className={styles.checkbox}
                    />
                  </td>
                  <td className={styles.center}>
                    <input
                      type="checkbox"
                      checked={rp.canDeleteInitiatives}
                      onChange={(e) =>
                        updateRolePermission(rp.role, {
                          canDeleteInitiatives: e.target.checked,
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
          <table className={`${styles.table} ${styles.usersTable}`}>
            <thead>
              <tr>
                <th>ПІБ</th>
                <th>Електронна адреса</th>
                <th>Департамент</th>
                <th className={styles.userRoleColumn}>Роль</th>
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
                  <td className={`${styles.tableCell} ${styles.userRoleColumn}`}>
                    <select
                      value={user.role}
                      title={roleNameByCode(user.role)}
                      onChange={(e) =>
                        updateUser(user.id, {
                          role: e.target.value as UserRole,
                        })
                      }
                      className={styles.roleSelect}
                    >
                      {rolePermissions.map((role) => (
                        <option
                          key={role.role}
                          value={role.role}
                          disabled={role.isActive === false}
                        >
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={styles.tableCellRight}>
                    {!(
                      currentUser?.role !== "SUPER_ADMIN" &&
                      user.role === "SUPER_ADMIN"
                    ) && (
                      <button
                        onClick={() => void handleResetPassword(user)}
                        className={styles.resetPasswordButton}
                        disabled={
                          isCurrentUserEmail(user.email) ||
                          resettingUserId !== null
                        }
                        title={
                          isCurrentUserEmail(user.email)
                            ? SYSTEM_MESSAGES.access.ownTemporaryPasswordDenied
                            : "Видати тимчасовий пароль"
                        }
                      >
                        <KeyRound size={15} />
                        {resettingUserId === user.id
                          ? "Створення…"
                          : "Тимчасовий пароль"}
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
                    notify(NOTIFICATION_KINDS.error, result.message);
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
              <div className={styles.resetIcon}>
                <KeyRound size={22} />
              </div>
              <h3 className={styles.dialogTitle}>Тимчасовий пароль</h3>
            </div>
            <p className={styles.dialogDescription}>
              Передайте пароль користувачу{" "}
              <span className={styles.emphasis}>
                «{temporaryPassword.name}»
              </span>{" "}
              захищеним каналом. Він показується лише зараз і має бути змінений
              після входу.
            </p>
            <div className={styles.passwordRow}>
              <div className={`${styles.valueBox} ${styles.passwordBox}`}>
                {temporaryPassword.value}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(temporaryPassword.value);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                }}
                className={styles.copyButton}
                title="Скопіювати пароль"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
            <div className={styles.dialogActions}>
              <button
                onClick={() => setTemporaryPassword(null)}
                className={styles.closeButton}
              >
                Готово
              </button>
            </div>
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
                  <label className={styles.fieldLabel}>Електронна адреса</label>
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
                      }}
                      className={styles.input}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Електронна адреса</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => {
                        setNewUserEmail(e.target.value);
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
                      {activeRoles.map((role) => (
                        <option key={role.role} value={role.role}>
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
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
