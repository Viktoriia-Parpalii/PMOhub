import { command } from "../../api/apiClient";
import { Quarter, ScopeMergePreview } from "../../shared/types";
import { DictionaryApiType } from "./dictionary-api";
import type { components } from "../../api/generated/schema";
import { toChecklistDto, toPassportDto, uuidOrUndefined } from "./api-contract-mappers";

type Schemas = components["schemas"];

type CommandResult<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
  requiresConfirmation?: ScopeMergePreview;
};

const dictionaryBody = (body: Schemas["DictionaryDto"] | undefined) => body && ({
  ...(body.name !== undefined ? { name: body.name } : {}),
  ...(body.capacity_limit_points !== undefined ? { capacity_limit_points: body.capacity_limit_points } : {}),
  ...(uuidOrUndefined(body.department_id) ? { department_id: uuidOrUndefined(body.department_id) } : {}),
  ...(body.color !== undefined ? { color: body.color } : {}),
  ...(body.weight !== undefined ? { weight: body.weight } : {}),
  ...(body.min_score !== undefined ? { min_score: body.min_score } : {}),
  ...(body.max_score !== undefined ? { max_score: body.max_score } : {}),
  ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
  ...(body.code !== undefined ? { code: body.code } : {}),
});

const permissionBody = (body: Schemas["UpdatePermissionDto"]) => ({
  ...(body.canCreateEditProjects !== undefined ? { canCreateEditProjects: body.canCreateEditProjects } : {}),
  ...(body.canDeleteProjects !== undefined ? { canDeleteProjects: body.canDeleteProjects } : {}),
  ...(body.canAccessAdmin !== undefined ? { canAccessAdmin: body.canAccessAdmin } : {}),
  ...(body.isReadOnly !== undefined ? { isReadOnly: body.isReadOnly } : {}),
  ...(body.canEditArchive !== undefined ? { canEditArchive: body.canEditArchive } : {}),
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

const userBody = (body: Schemas["CreateUserDto"] | Schemas["UpdateUserDto"] | undefined) => body && ({
  ...(body.name !== undefined ? { name: body.name } : {}),
  ...(body.email !== undefined ? { email: body.email } : {}),
  ...(body.role !== undefined ? { role: body.role } : {}),
  ...(uuidOrUndefined(body.department_id) ? { department_id: uuidOrUndefined(body.department_id) } : {}),
  ...("is_active" in body && body.is_active !== undefined ? { is_active: body.is_active } : {}),
});

/** Single typed boundary for every state-changing API request. */
export const serverCommands = {
  createInitiative: (body: Schemas["CreateInitiativeDto"]) => command<CommandResult>("/initiatives", "POST", {
    kind: body.kind,
    year: body.year,
    passport: toPassportDto(body.passport),
    quarters: [...body.quarters],
    ...(body.initial_scope !== undefined ? { initial_scope: toChecklistDto(body.initial_scope) } : {}),
  }),
  createCard: (yearId: string, body: Schemas["CreateQuarterCardDto"]) => command<CommandResult>(`/initiatives/years/${yearId}/cards`, "POST", {
    quarter: body.quarter,
    passport: toPassportDto(body.passport),
    ...(body.initial_scope !== undefined ? { initial_scope: toChecklistDto(body.initial_scope) } : {}),
  }),
  updateCard: (id: string, body: Schemas["UpdateCardDto"]) => {
    const healthStatus = uuidOrUndefined(body.health_status);
    return command<CommandResult>(`/initiatives/cards/${id}`, "PATCH", {
      revision: body.revision,
      ...(body.passport ? { passport: toPassportDto(body.passport) } : {}),
      ...(healthStatus ? { health_status: healthStatus } : {}),
      ...(body.checklist !== undefined ? { checklist: toChecklistDto(body.checklist) } : {}),
    });
  },
  deleteCard: (id: string, revision: number) => command<CommandResult>(`/initiatives/cards/${id}?revision=${revision}`, "DELETE"),
  deleteYear: (id: string, revision: number) => command<CommandResult>(`/initiatives/years/${id}?revision=${revision}`, "DELETE"),
  savePassport: (owner: "cards" | "years", id: string, body: Schemas["SavePassportDto"]) => {
    const healthStatus = uuidOrUndefined(body.source_card_patch?.health_status);
    return command<CommandResult<{ snapshots: number; cards: number }>>(`/initiatives/${owner}/${id}/passport`, "POST", {
      revision: body.revision,
      passport: toPassportDto(body.passport),
      target_years: body.target_years.map(({ id: targetId, revision }) => ({ id: targetId, revision })),
      target_cards: body.target_cards.map(({ id: targetId, revision }) => ({ id: targetId, revision })),
      ...(body.source_card_patch
        ? {
            source_card_patch: {
              ...(healthStatus ? { health_status: healthStatus } : {}),
              ...(body.source_card_patch.checklist !== undefined
                ? { checklist: toChecklistDto(body.source_card_patch.checklist) }
                : {}),
            },
          }
        : {}),
    });
  },
  moveCard: (id: string, revision: number, toYear: number, toQuarter: Quarter, reason?: string) => command<CommandResult>(`/initiatives/cards/${id}/move`, "POST", { revision, to_year: toYear, to_quarter: toQuarter, reason }),
  continueCard: (id: string, revision: number, toYear: number, toQuarter: Quarter) => command<CommandResult>(`/initiatives/cards/${id}/continue`, "POST", { revision, to_year: toYear, to_quarter: toQuarter }),
  moveScope: (cardId: string, itemId: string, revision: number, toYear: number, toQuarter: Quarter, reason?: string, confirmationToken?: string) => command<CommandResult>(`/initiatives/cards/${cardId}/scope/${itemId}/move`, "POST", { revision, to_year: toYear, to_quarter: toQuarter, reason, confirmation_token: confirmationToken }),
  extendYears: (sourceYearIds: string[], targetYear: number) => command<CommandResult<{ created: number }>>("/initiatives/years/extend", "POST", { source_year_ids: sourceYearIds, target_year: targetYear }),
  updatePreparation: (yearId: string, body: Schemas["UpdatePreparationDto"]) => command<CommandResult>(`/initiatives/years/${yearId}/preparation`, "PATCH", {
    revision: body.revision,
    ...toPassportDto(body),
  }),
  dictionary: (type: DictionaryApiType, method: "POST" | "PATCH" | "DELETE", id?: string, body?: Schemas["DictionaryDto"]) => command<CommandResult>(`/dictionaries/${type}${id ? `/${id}` : ""}`, method, dictionaryBody(body)),
  updatePermission: (role: string, body: Schemas["UpdatePermissionDto"]) => command<CommandResult>(`/role-permissions/${role}`, "PATCH", permissionBody(body)),
  customField: (method: "POST" | "PATCH" | "DELETE", id?: string, body?: Schemas["CustomFieldDto"]) => command<CommandResult>(`/custom-fields${id ? `/${id}` : ""}`, method, body ? customFieldBody(body) : undefined),
  user: (method: "POST" | "PATCH" | "DELETE", id?: string, body?: Schemas["CreateUserDto"] | Schemas["UpdateUserDto"]) => command<CommandResult>(`/users${id ? `/${id}` : ""}`, method, userBody(body)),
  resetUserPassword: (id: string) => command<CommandResult<{ user: unknown; temporary_password: string }>>(`/users/${id}/reset-password`, "POST"),
  applyWeight: (id: string) => command<CommandResult<{ cards: number; tasks: number }>>(`/dictionaries/weights/${id}/apply-to-open-cards`, "POST"),
  recalculateSizes: () => command<CommandResult<{ cards: number }>>("/dictionaries/sizes/recalculate-open-cards", "POST"),
};
