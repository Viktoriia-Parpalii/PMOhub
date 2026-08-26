import { QueryClient } from "@tanstack/react-query";

export const queryKeys = {
  appData: ["app-data"] as const,
  bootstrap: ["bootstrap"] as const,
  initiatives: (kind: "project" | "task") => ["initiatives", kind] as const,
  initiativeCard: (id: string) => ["initiatives", "card", id] as const,
  initiativeYear: (id: string) => ["initiatives", "year", id] as const,
  audit: (aggregateType: string, aggregateId: string) => ["audit", aggregateType, aggregateId] as const,
  users: ["reference-data", "users"] as const,
  permissions: ["reference-data", "permissions"] as const,
  customFields: ["reference-data", "custom-fields"] as const,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
