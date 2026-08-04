import { Member, Role, Permission } from './types';

// 检查成员是否拥有指定权限
export function hasPermission(member: Member, permission: Permission, roles: Role[]): boolean {
  // isAdmin 直接拥有所有权限
  if (member.isAdmin) return true;
  // 通过 roleId 查找角色权限
  if (!member.roleId) return false;
  const role = roles.find((r) => r.id === member.roleId);
  if (!role) return false;
  return role.permissions.includes(permission);
}
