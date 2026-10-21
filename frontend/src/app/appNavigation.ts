import type { InitiativeDataScope } from "./store/server-store";
import type { AppTabId } from "./appTypes";
import type { Quarter } from "../shared/types";

const tabPaths: Record<AppTabId, string> = {
  dashboard: "analytics",
  projects: "projects",
  tasks: "tasks",
  backlog: "backlog",
  admin: "admin",
};

const normalizedBasePath = (basePath: string) => {
  const normalized = `/${basePath}`.replace(/\/{2,}/g, "/");
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
};

export const hrefForTab = (tab: AppTabId, basePath = "/") =>
  `${normalizedBasePath(basePath)}${tabPaths[tab]}`;

export const tabFromPath = (
  pathname: string,
  basePath = "/",
): AppTabId | null => {
  const base = normalizedBasePath(basePath);
  const normalizedPath = pathname.endsWith("/")
    ? pathname
    : `${pathname}/`;
  if (!normalizedPath.startsWith(base)) return null;
  const segment = normalizedPath.slice(base.length).split("/")[0];
  const match = (Object.entries(tabPaths) as Array<[AppTabId, string]>).find(
    ([, path]) => path === segment,
  );
  return match?.[0] ?? null;
};

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
