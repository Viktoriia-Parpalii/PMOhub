import { useEffect } from "react";
import { notify } from "./ToastNotifications";
import { NOTIFICATION_KINDS } from "../../shared/constants/notificationConstants";

/** Routes legacy browser alert() calls to the shared PMO Hub toast region. */
export const SystemAlertDialog = () => {
  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (nextMessage?: string) =>
      notify(NOTIFICATION_KINDS.error, String(nextMessage ?? ""));
    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  return null;
};
