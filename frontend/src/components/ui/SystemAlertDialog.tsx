import { useEffect } from "react";
import { notify } from "./ToastNotifications";

/** Routes legacy browser alert() calls to the shared PMO Hub toast region. */
export const SystemAlertDialog = () => {
  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (nextMessage?: string) => notify("error", String(nextMessage ?? ""));
    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  return null;
};
