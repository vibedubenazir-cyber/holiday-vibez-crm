/**
 * Allowlist of User columns that are safe to serialize into an API response for
 * a *related* user (e.g. `include: { user: true }` on a payslip, message or leave
 * request). It deliberately omits `passwordHash`, `twoFactorSecret` and
 * `fcmToken`, so an endpoint that pulls a related user can never leak
 * credentials into its payload.
 *
 * Prisma `select` is an allowlist, so any User column added later is excluded by
 * default until it's added here on purpose — which is exactly what we want for
 * the sensitive fields. Use this everywhere a related User is returned to a
 * client; the three secret columns are only ever read internally (login,
 * 2FA verify, push delivery) via unprojected `findUnique`.
 */
export const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  branchId: true,
  status: true,
  designation: true,
  employeeCode: true,
  dateOfJoining: true,
  profilePhotoUrl: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  reportsToId: true,
  probationEndDate: true,
  lastLoginAt: true,
  lastSeenAt: true,
  manualStatus: true,
  twoFactorEnabled: true,
  createdAt: true,
  updatedAt: true,
} as const;
