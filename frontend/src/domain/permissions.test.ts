import { describe, expect, it } from 'vitest';
import { canDeleteInitiative, canEditInitiative, canViewInitiative } from './permissions';
import { Project, RolePermissions, User } from '../types';

const card: Project = { id: 'C', name: 'Card', strategic_goal: 'Goal', implementer_dept_ids: ['D1'], cross_functional_dept_ids: ['D2'], year: 2026, quarter: 'Q3', health_status: 'DEFAULT', checklist: [], is_backlog: false };
const user = (departmentId: string): User => ({ id: departmentId, name: departmentId, email: `${departmentId}@test`, role: 'USER', departmentId });
const permissions: RolePermissions[] = [{ role: 'USER', canCreateEditProjects: false, canDeleteProjects: false, canAccessAdmin: false, isReadOnly: true, canEditArchive: false }];

describe('permissions', () => {
  it('shows every record to an authenticated user, regardless of department', () => {
    expect(canViewInitiative(card, user('D1'))).toBe(true);
    expect(canViewInitiative(card, user('D2'))).toBe(true);
    expect(canViewInitiative(card, user('D3'))).toBe(true);
    expect(canViewInitiative(card, null)).toBe(false);
  });
  it('enforces delete permission', () => expect(canDeleteInitiative(card, user('D1'), permissions)).toBe(false));

  it('requires canEditArchive for editing and deleting a closed period', () => {
    const archived = { ...card, year: 2025, quarter: 'Q4' as const };
    const admin = { ...user('D1'), role: 'ADMIN' as const };
    const withoutArchive: RolePermissions[] = [{
      role: 'ADMIN', canCreateEditProjects: true, canDeleteProjects: true,
      canAccessAdmin: true, isReadOnly: false, canEditArchive: false,
    }];
    const withArchive = [{ ...withoutArchive[0], canEditArchive: true }];

    expect(canEditInitiative(archived, admin, withoutArchive)).toBe(false);
    expect(canDeleteInitiative(archived, admin, withoutArchive)).toBe(false);
    expect(canEditInitiative(archived, admin, withArchive)).toBe(true);
    expect(canDeleteInitiative(archived, admin, withArchive)).toBe(true);
  });
});
