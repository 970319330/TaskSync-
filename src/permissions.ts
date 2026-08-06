import { Member, Role, Permission, TaskStatus } from './types';

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

// ============ 任务状态机校验 ============

/**
 * 合法状态流转映射表
 * key = 当前状态，value = 允许流转到的目标状态
 */
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  backlog:     ['todo'],
  todo:        ['in_progress', 'backlog'],
  in_progress: ['paused', 'review', 'done', 'todo'],
  paused:      ['in_progress', 'todo'],
  review:      ['done', 'in_progress'],
  done:        [],
};

/**
 * 校验状态流转是否合法
 */
export function canTransitionTaskStatus(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return false;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * 获取某状态可流转到的目标列表（供 UI 渲染下拉选项）
 */
export function getNextValidStatuses(from: TaskStatus): TaskStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}
