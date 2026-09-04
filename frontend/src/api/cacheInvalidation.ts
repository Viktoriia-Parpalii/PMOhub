import type { QueryClient } from "@tanstack/react-query";

export type InitiativeCacheKind = "project" | "task";

/**
 * Central invalidation policy for commands that can affect initiative
 * collections, backlog counters, and analytics. Inactive caches are marked
 * stale; only queries currently rendered by the UI are fetched immediately.
 */
export async function invalidateInitiativeCaches(
  client: QueryClient,
  kind: InitiativeCacheKind,
) {
  await Promise.all([
    client.invalidateQueries({
      queryKey: ["initiative-years", kind],
      refetchType: "none",
    }),
    client.invalidateQueries({
      queryKey: ["initiative-years", "counts"],
      refetchType: "none",
    }),
    client.invalidateQueries({
      queryKey: ["quarter-cards", kind],
      refetchType: "none",
    }),
    client.invalidateQueries({
      queryKey: ["backlog-card-summaries"],
      refetchType: "none",
    }),
    client.invalidateQueries({ queryKey: ["analytics"], refetchType: "none" }),
  ]);
  await Promise.all([
    client.refetchQueries({
      queryKey: ["initiative-years", kind],
      type: "active",
    }),
    client.refetchQueries({
      queryKey: ["initiative-years", "counts"],
      type: "active",
    }),
    client.refetchQueries({
      queryKey: ["quarter-cards", kind],
      type: "active",
    }),
    client.refetchQueries({
      queryKey: ["backlog-card-summaries"],
      type: "active",
    }),
    client.refetchQueries({ queryKey: ["analytics"], type: "active" }),
  ]);
}
