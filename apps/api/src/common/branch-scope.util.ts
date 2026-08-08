import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

// Branch Managers are always scoped to their own branch regardless of what's
// passed in — but if a Branch Manager account somehow has branchId: null
// (unassigned/misconfigured), the naive `user.branchId ?? undefined` pattern
// silently widens the filter to org-wide instead of scoping to nothing or
// erroring. This throws instead, so a misconfigured account never sees more
// than an unconfigured one should.
export function resolveBranchScope(user: { role: Role; branchId: string | null }, requestedBranchId?: string): string | undefined {
  if (user.role === Role.BRANCH_MANAGER) {
    if (!user.branchId) {
      throw new ForbiddenException('Your account has no branch assigned — contact an admin');
    }
    return user.branchId;
  }
  return requestedBranchId;
}
