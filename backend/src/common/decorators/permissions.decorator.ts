import { SetMetadata } from '@nestjs/common';
import { RolePermission } from '../../generated/prisma/client';

export type PermissionName = Exclude<keyof RolePermission, 'role'>;
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: PermissionName[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export const ROLES_KEY = 'roles';
export type ApplicationRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export const RequireRoles = (...roles: ApplicationRole[]) => SetMetadata(ROLES_KEY, roles);
