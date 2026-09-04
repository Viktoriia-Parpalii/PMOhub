/** Типи toast-повідомлень, підтримувані спільним notification region. */
export const NOTIFICATION_KINDS = {
  success: "success",
  error: "error",
} as const;

export type NotificationKind =
  (typeof NOTIFICATION_KINDS)[keyof typeof NOTIFICATION_KINDS];

/**
 * Поведінка сповіщень.
 * Помилка відображається довше, щоб користувач встиг прочитати причину та
 * зрозуміти, що форма/дані не були успішно збережені.
 */
export const NOTIFICATION_CONFIG = {
  eventName: "pmohub:toast",
  maxVisible: 4,
  duplicateWindowMs: 750,
  durationMs: {
    success: 3_500,
    error: 8_000,
  },
} as const;

/** Стандартні тексти саме для результатів server-state mutation-flow. */
export const NOTIFICATION_MESSAGES = {
  changesSaved: "Зміни успішно збережено",
  commandRejected: "Команду відхилено",
  commitFailed: "Не вдалося зберегти зміни на сервері",
  committedRefreshFailed:
    "Зміни збережено на сервері, але актуальні дані не завантажено. Не повторюйте збереження — оновіть дані.",
} as const;

/** Accessibility-підписи notification region та кнопки закриття. */
export const NOTIFICATION_A11Y = {
  regionLabel: "Повідомлення системи",
  closeLabel: "Закрити повідомлення",
} as const;
