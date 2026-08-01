import { Role } from './enums';

/**
 * Mirrors the permission matrix in spec Section 2. Only Admin may write rate cards;
 * Branch Manager is scoped to their own branch; Consultant is scoped to their own leads.
 */
export const RATE_WRITE_ROLES: Role[] = [Role.ADMIN];

export const ADMIN_MODULE_ROLES: Role[] = [Role.ADMIN, Role.DIRECTOR];

export const BRANCH_SCOPED_ROLES: Role[] = [Role.BRANCH_MANAGER, Role.TRAVEL_CONSULTANT];

export function canEditRates(role: Role): boolean {
  return RATE_WRITE_ROLES.includes(role);
}

export function canManageUsersAndBranches(role: Role): boolean {
  return role === Role.ADMIN;
}
