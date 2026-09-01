import { command } from "../../api/apiClient";
import { Quarter } from "../../shared/types";
import { DictionaryApiType } from "./dictionary-api";
import type { components } from "../../api/generated/schema";
import { uuidOrUndefined } from "./api-contract-mappers";

type Schemas = components["schemas"];

type CommandResult<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
};

const dictionaryBody = (body: Schemas["DictionaryDto"] | undefined) =>
  body && {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.capacity_limit_points !== undefined
      ? { capacity_limit_points: body.capacity_limit_points }
      : {}),
    ...(uuidOrUndefined(body.department_id)
      ? { department_id: uuidOrUndefined(body.department_id) }
      : {}),
    ...(body.color !== undefined ? { color: body.color } : {}),
    ...(body.weight !== undefined ? { weight: body.weight } : {}),
    ...(body.min_score !== undefined ? { min_score: body.min_score } : {}),
    ...(body.max_score !== undefined ? { max_score: body.max_score } : {}),
    ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
    ...(body.code !== undefined ? { code: body.code } : {}),
  };

const permissionBody = (body: Schemas["UpdatePermissionDto"]) => ({
  ...(body.canCreateEditInitiatives !== undefined
    ? { canCreateEditInitiatives: body.canCreateEditInitiatives }
    : {}),
  ...(body.canDeleteInitiatives !== undefined
    ? { canDeleteInitiatives: body.canDeleteInitiatives }
    : {}),
  ...(body.canAccessAdmin !== undefined
    ? { canAccessAdmin: body.canAccessAdmin }
    : {}),
  ...(body.isReadOnly !== undefined ? { isReadOnly: body.isReadOnly } : {}),
  ...(body.canEditArchive !== undefined
    ? { canEditArchive: body.canEditArchive }
    : {}),
});

const customFieldBody = (body: Schemas["CustomFieldDto"]) => ({
  entityType: body.entityType,
  name: body.name,
  type: body.type,
  isRequired: body.isRequired,
  ...(body.options !== undefined ? { options: [...body.options] } : {}),
  ...(body.showInTable !== undefined ? { showInTable: body.showInTable } : {}),
  ...(body.showInCards !== undefined ? { showInCards: body.showInCards } : {}),
  ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
});

const userBody = (
  body: Schemas["CreateUserDto"] | Schemas["UpdateUserDto"] | undefined,
) =>
  body && {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.email !== undefined ? { email: body.email } : {}),
    ...(body.role !== undefined ? { role: body.role } : {}),
    ...(uuidOrUndefined(body.department_id)
      ? { department_id: uuidOrUndefined(body.department_id) }
      : {}),
    ...("is_active" in body && body.is_active !== undefined
      ? { is_active: body.is_active }
      : {}),
  };

/** Single typed boundary for every state-changing API request. */
export const serverCommands = {
  createInitiative: (body: Schemas["CreateInitiativeDto"]) =>
    command<CommandResult>("/initiatives", "POST", {
      kind: body.kind,
      name: body.name,
      year: body.year,
      strategic_goal: body.strategic_goal,
      preparation: body.preparation,
      initial_card: body.initial_card,
    }),
  updateInitiative: (id: string, revision: number, name: string) =>
    command<CommandResult>(`/initiatives/${id}`, "PATCH", { revision, name }),
  updateYear: (id: string, revision: number, strategicGoal?: string) =>
    command<CommandResult>(`/initiative-years/${id}`, "PATCH", {
      revision,
      strategic_goal: strategicGoal,
    }),
  updateBacklog: (id: string, body: Schemas["UpdateBacklogDto"]) =>
    command<CommandResult>(`/initiative-years/${id}/backlog`, "PATCH", body),
  createCard: (yearId: string, body: Schemas["CreateQuarterCardDto"]) =>
    command<CommandResult>(`/initiative-years/${yearId}/cards`, "POST", {
      quarter: body.quarter,
    }),
  updateCard: (id: string, body: Schemas["UpdateCardDto"]) =>
    command<CommandResult>(`/quarter-cards/${id}`, "PATCH", body),
  updateArchivedCard: (
    id: string,
    body: {
      revision: number;
      notes?: string;
      status_id?: string;
      scope_status_updates: Array<{
        id: string;
        revision: number;
        status_code: string;
      }>;
    },
  ) => command<CommandResult>(`/quarter-cards/${id}/archive`, "PATCH", body),
  deleteCard: (id: string, revision: number) =>
    command<CommandResult>(
      `/quarter-cards/${id}?revision=${revision}`,
      "DELETE",
    ),
  deleteYear: (id: string, revision: number) =>
    command<CommandResult>(
      `/initiative-years/${id}?revision=${revision}`,
      "DELETE",
    ),
  moveCard: (
    id: string,
    revision: number,
    toYear: number,
    toQuarter: Quarter,
  ) =>
    command<CommandResult>(`/quarter-cards/${id}/move`, "POST", {
      revision,
      to_year: toYear,
      to_quarter: toQuarter,
    }),
  continueCard: (
    id: string,
    revision: number,
    toYear: number,
    toQuarter: Quarter,
  ) =>
    command<CommandResult>(`/quarter-cards/${id}/continue`, "POST", {
      revision,
      to_year: toYear,
      to_quarter: toQuarter,
    }),
  moveScope: (
    cardId: string,
    itemId: string,
    revision: number,
    toYear: number,
    toQuarter: Quarter,
    targetRevision?: number,
  ) =>
    command<CommandResult>(
      `/quarter-cards/${cardId}/scope/${itemId}/move`,
      "POST",
      {
        revision,
        to_year: toYear,
        to_quarter: toQuarter,
        target_revision: targetRevision,
      },
    ),
  copyScope: (
    cardId: string,
    itemId: string,
    revision: number,
    toYear: number,
    toQuarter: Quarter,
    targetRevision?: number,
  ) =>
    command<CommandResult>(
      `/quarter-cards/${cardId}/scope/${itemId}/copy`,
      "POST",
      {
        revision,
        to_year: toYear,
        to_quarter: toQuarter,
        target_revision: targetRevision,
      },
    ),
  extendYears: (
    sourceYears: Array<{ id: string; revision: number }>,
    targetYear: number,
  ) =>
    command<CommandResult<{ years: unknown[] }>>(
      "/initiative-years/extend",
      "POST",
      { source_years: sourceYears, target_year: targetYear },
    ),
  updatePreparation: (yearId: string, body: Schemas["UpdatePreparationDto"]) =>
    command<CommandResult>(`/initiative-years/${yearId}/preparation`, "PATCH", {
      revision: body.revision,
      manager_id: uuidOrUndefined(body.manager_id),
      priority_id: uuidOrUndefined(body.priority_id),
      department_ids: body.department_ids,
    }),
  dictionary: (
    type: DictionaryApiType,
    method: "POST" | "PATCH" | "DELETE",
    id?: string,
    body?: Schemas["DictionaryDto"],
  ) =>
    command<CommandResult>(
      `/dictionaries/${type}${id ? `/${id}` : ""}`,
      method,
      dictionaryBody(body),
    ),
  updatePermission: (role: string, body: Schemas["UpdatePermissionDto"]) =>
    command<CommandResult>(
      `/role-permissions/${role}`,
      "PATCH",
      permissionBody(body),
    ),
  customField: (
    method: "POST" | "PATCH" | "DELETE",
    id?: string,
    body?: Schemas["CustomFieldDto"],
  ) =>
    command<CommandResult>(
      `/custom-fields${id ? `/${id}` : ""}`,
      method,
      body ? customFieldBody(body) : undefined,
    ),
  user: (
    method: "POST" | "PATCH" | "DELETE",
    id?: string,
    body?: Schemas["CreateUserDto"] | Schemas["UpdateUserDto"],
  ) =>
    command<CommandResult>(
      `/users${id ? `/${id}` : ""}`,
      method,
      userBody(body),
    ),
  resetUserPassword: (id: string) =>
    command<CommandResult<{ user: unknown; temporary_password: string }>>(
      `/users/${id}/reset-password`,
      "POST",
    ),
  applyWeight: (id: string) =>
    command<CommandResult<{ cards: number; tasks: number }>>(
      `/dictionaries/weights/${id}/apply-to-open-cards`,
      "POST",
    ),
  recalculateSizes: () =>
    command<CommandResult<{ cards: number }>>(
      "/dictionaries/sizes/recalculate-open-cards",
      "POST",
    ),
};
