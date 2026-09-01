import type { InitiativeDataScope } from "./store/server-store";
import type { AppTabId } from "./appTypes";
import type { Quarter } from "../shared/types";

export const dataScopeForTab = (
  tab: AppTabId,
  now = new Date(),
): InitiativeDataScope => {
  const year = now.getFullYear();
  const quarter = `Q${Math.floor(now.getMonth() / 3) + 1}` as Quarter;
  if (tab === "dashboard") return { mode: "dashboard" };
  if (tab === "projects") return { mode: "projects", year, quarter };
  if (tab === "tasks") return { mode: "tasks", year, quarter };
  if (tab === "backlog") return { mode: "backlog", kind: "project", year };
  return { mode: "none" };
};
