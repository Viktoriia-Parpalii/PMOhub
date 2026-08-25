import { ReactNode } from "react";

export type AppTabId = "dashboard" | "projects" | "tasks" | "backlog" | "admin";

export type NavigationItem = {
  id: AppTabId;
  label: string;
  icon: ReactNode;
};
