import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import styles from "./ToastNotifications.module.css";

export type ToastKind = "success" | "error";
type Toast = { id: number; kind: ToastKind; message: string };
type ToastEvent = { kind: ToastKind; message: string };

const toastEventName = "pmohub:toast";
let nextToastId = 1;

/** Use for backend command results and legacy UI errors. */
export const notify = (kind: ToastKind, message: string) => {
  window.dispatchEvent(new CustomEvent<ToastEvent>(toastEventName, { detail: { kind, message } }));
};

export const ToastNotifications = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const addToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastEvent>).detail;
      if (!detail?.message) return;
      const toast = { id: nextToastId++, ...detail };
      setToasts((current) => [...current, toast].slice(-4));
      window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 5000);
    };
    window.addEventListener(toastEventName, addToast);
    return () => window.removeEventListener(toastEventName, addToast);
  }, []);

  return (
    <div className={styles.region} aria-live="polite" aria-label="Повідомлення системи">
      {toasts.map((toast) => (
        <section key={toast.id} className={`${styles.toast} ${toast.kind === "success" ? styles.success : styles.error}`} role={toast.kind === "error" ? "alert" : "status"}>
          <span className={styles.icon}>{toast.kind === "success" ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}</span>
          <p className={styles.message}>{toast.message}</p>
          <button type="button" className={styles.close} onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label="Закрити повідомлення"><X size={17} /></button>
        </section>
      ))}
    </div>
  );
};
