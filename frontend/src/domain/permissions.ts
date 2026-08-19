import { OperationalTask, Project, RolePermissions, User } from '../types';
import { isPeriodLocked } from '../utils';

export type InitiativeRecord = Project | OperationalTask;

export const getPermissions = (
  user: User | null,
  permissions: RolePermissions[],
): RolePermissions | undefined => user ? permissions.find(item => item.role === user.role) : undefined;

/**
 * Visibility is intentionally global for every authenticated role.  The USER
 * role remains read-only through `canEditInitiative` / `canDeleteInitiative`;
 * department membership is a planning attribute, not a visibility boundary.
 */
export const canViewInitiative = (_record: InitiativeRecord, user: User | null): boolean => Boolean(user);

export const canEditInitiative = (
  record: InitiativeRecord,
  user: User | null,
  permissions: RolePermissions[],
): boolean => {
  const role = getPermissions(user, permissions);
  if (!role || role.isReadOnly || !role.canCreateEditProjects) return false;
  if (!record.is_backlog && isPeriodLocked(record.year, record.quarter)) return role.canEditArchive;
  return true;
};

export const canDeleteInitiative = (
  record: InitiativeRecord,
  user: User | null,
  permissions: RolePermissions[],
): boolean => {
  const role = getPermissions(user, permissions);
  if (!role?.canDeleteProjects || role.isReadOnly) return false;
  if (!record.is_backlog && isPeriodLocked(record.year, record.quarter)) return role.canEditArchive;
  return true;
};
