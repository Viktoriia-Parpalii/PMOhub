import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import styles from "./ToastNotifications.module.css";
import {
  NOTIFICATION_A11Y,
  NOTIFICATION_CONFIG,
  NOTIFICATION_KINDS,
  NotificationKind,
} from "../../shared/constants/notificationConstants";

export type ToastKind = NotificationKind;
type Toast = { id: number; kind: ToastKind; message: string };
type ToastEvent = { kind: ToastKind; message: string };

let nextToastId = 1;
let lastNotification: { key: string; createdAt: number } | null = null;

/** Use for backend command results and legacy UI errors. */
export const notify = (kind: ToastKind, message: string) => {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const key = `${kind}:${message}`;
  if (
    lastNotification?.key === key &&
    now - lastNotification.createdAt < NOTIFICATION_CONFIG.duplicateWindowMs
  )
    return;
  lastNotification = { key, createdAt: now };
  window.dispatchEvent(
    new CustomEvent<ToastEvent>(NOTIFICATION_CONFIG.eventName, {
      detail: { kind, message },
    }),
  );
};

export const ToastNotifications = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const addToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastEvent>).detail;
      if (!detail?.message) return;
      const toast = { id: nextToastId++, ...detail };
      setToasts((current) =>
        [...current, toast].slice(-NOTIFICATION_CONFIG.maxVisible),
      );
      window.setTimeout(
        () =>
          setToasts((current) =>
            current.filter((item) => item.id !== toast.id),
          ),
        NOTIFICATION_CONFIG.durationMs[detail.kind],
      );
    };
    window.addEventListener(NOTIFICATION_CONFIG.eventName, addToast);
    return () =>
      window.removeEventListener(NOTIFICATION_CONFIG.eventName, addToast);
  }, []);

  return (
    <div
      className={styles.region}
      aria-live="polite"
      aria-label={NOTIFICATION_A11Y.regionLabel}
    >
      {toasts.map((toast) => (
        <section
          key={toast.id}
          className={`${styles.toast} ${toast.kind === NOTIFICATION_KINDS.success ? styles.success : styles.error}`}
          role={toast.kind === NOTIFICATION_KINDS.error ? "alert" : "status"}
        >
          <span className={styles.icon}>
            {toast.kind === NOTIFICATION_KINDS.success ? (
              <CheckCircle2 size={20} />
            ) : (
              <CircleAlert size={20} />
            )}
          </span>
          <p className={styles.message}>{toast.message}</p>
          <button
            type="button"
            className={styles.close}
            onClick={() =>
              setToasts((current) =>
                current.filter((item) => item.id !== toast.id),
              )
            }
            aria-label={NOTIFICATION_A11Y.closeLabel}
          >
            <X size={17} />
          </button>
        </section>
      ))}
    </div>
  );
};
