import { OperationalTask, Project, RolePermissions, User } from '../types';
import { isPeriodLocked } from '../utils';

export type InitiativeRecord = Project | OperationalTask;

export const getPermissions = (
  user: User | null,
  permissions: RolePermissions[],
): RolePermissions | undefined => user ? permissions.find(item => item.role === user.role) : undefined;

export const canViewInitiative = (record: InitiativeRecord, user: User | null): boolean => {
  if (!user || user.role !== 'USER' || !user.departmentId) return Boolean(user);
  return record.implementer_dept_ids.includes(user.departmentId)
    || (record.cross_functional_dept_ids ?? []).includes(user.departmentId);
};

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
