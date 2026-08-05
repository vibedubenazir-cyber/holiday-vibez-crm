import { User } from '@prisma/client';

export function toUserDto(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    branchId: user.branchId,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    twoFactorEnabled: user.twoFactorEnabled,
  };
}
