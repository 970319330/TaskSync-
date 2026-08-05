export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

// 任务颜色标记：用作任务卡的视觉标签色，hex 值用于背景/边框
export type TaskColorKey =
  | 'none'
  | 'rose'
  | 'amber'
  | 'emerald'
  | 'teal'
  | 'sky'
  | 'indigo'
  | 'violet'
  | 'pink'
  | 'slate';

export interface TaskColorOption {
  key: TaskColorKey;
  label: string;
  // 用于卡片背景（柔和底色）
  bg: string;
  // 用于左边/头部色条（实色）
  bar: string;
  // 用于文字/边框强调
  accent: string;
}

export const TASK_COLORS: TaskColorOption[] = [
  { key: 'none',    label: '无标记',  bg: '',                bar: 'bg-slate-200',  accent: 'border-slate-200'  },
  { key: 'rose',    label: '玫瑰红',  bg: 'bg-rose-50',      bar: 'bg-rose-500',   accent: 'border-rose-300'   },
  { key: 'amber',   label: '琥珀黄',  bg: 'bg-amber-50',     bar: 'bg-amber-500',  accent: 'border-amber-300'  },
  { key: 'emerald', label: '翡翠绿',  bg: 'bg-emerald-50',   bar: 'bg-emerald-500',accent: 'border-emerald-300'},
  { key: 'teal',    label: '青松绿',  bg: 'bg-teal-50',      bar: 'bg-teal-500',   accent: 'border-teal-300'   },
  { key: 'sky',     label: '天空蓝',  bg: 'bg-sky-50',       bar: 'bg-sky-500',    accent: 'border-sky-300'    },
  { key: 'indigo',  label: '靛青蓝',  bg: 'bg-indigo-50',    bar: 'bg-indigo-500', accent: 'border-indigo-300' },
  { key: 'violet',  label: '紫罗兰',  bg: 'bg-violet-50',    bar: 'bg-violet-500', accent: 'border-violet-300' },
  { key: 'pink',    label: '樱花粉',  bg: 'bg-pink-50',      bar: 'bg-pink-500',   accent: 'border-pink-300'   },
  { key: 'slate',   label: '石灰灰',  bg: 'bg-slate-100',    bar: 'bg-slate-500',  accent: 'border-slate-300'  },
];

export const getTaskColor = (key?: string | null): TaskColorOption => {
  return TASK_COLORS.find((c) => c.key === key) || TASK_COLORS[0];
};

// 权限定义
export type Permission =
  | 'assign_task'      // 指派任务/子任务
  | 'create_task'      // 创建任务
  | 'delete_task'      // 删除任务
  | 'manage_members'   // 管理成员
  | 'manage_roles'     // 管理角色
  | 'manage_projects'; // 管理项目

// 角色定义
export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: Permission[];
}

export interface Member {
  id: string;
  name: string;
  role: string;
  roleId?: string;
  avatar: string;
  avatarBg: string;
  email: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  statusText: string;
  workloadCount?: number;
  isAdmin?: boolean;
  zentaoAccount?: string;
  // 从禅道同步的账号资料
  zentaoUserId?: string;
  zentaoRole?: string;
  zentaoDept?: string;
  phone?: string;
  weixin?: string;
  gender?: 'm' | 'f' | '';
  // 最近一次禅道同步时间
  zentaoSyncedAt?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  assigneeId?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  mentions?: string[];
}

export interface TaskActivity {
  id: string;
  taskId: string;
  authorId: string;
  action: string;
  details?: string;
  timestamp: string;
}

// 开发反馈：Agent / 开发者完成开发后回写的结构化结果
export interface TaskFeedback {
  id: string;
  taskId: string;
  authorId: string;
  // 完成内容总结
  summary: string;
  // 修改的文件清单
  changedFiles?: string[];
  // Git commit hash
  commitHash?: string;
  // PR / MR 链接
  prUrl?: string;
  // 新增/升级的依赖
  dependencies?: string[];
  // 需要团队知悉的注意事项
  notes?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  reporterId: string;
  projectId: string;
  dueDate: string;
  startDate: string;
  estimatedHours: number;
  loggedHours?: number;
  tags: string[];
  checklist: ChecklistItem[];
  comments: TaskComment[];
  activities: TaskActivity[];
  // 开发反馈记录（Agent / 开发者回写的结构化结果）
  feedbacks?: TaskFeedback[];
  attachmentsCount: number;
  testerId?: string;
  autoFlowToTest?: boolean;
  completeDevAndFlow?: boolean;
  // 任务颜色标记（可选）
  color?: string;
  // 来源禅道账号（从禅道同步的任务才有，用于多账号隔离）
  zentaoAccount?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string;
  color: string;
  memberIds: string[];
}

export interface ChatMessage {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  createdAt: string;
  taskRefId?: string;
  isAiResponse?: boolean;
}

export interface ChatChannel {
  id: string;
  projectId: string;
  name: string;
  description: string;
  isPrivate: boolean;
  unreadCount: number;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  senderId: string;
  type: 'mention' | 'assigned' | 'status_change' | 'comment';
  taskId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export type ViewMode = 'kanban' | 'list' | 'gantt' | 'analytics' | 'chat';

export type AiProvider = 'gemini' | 'deepseek' | 'openai';

export interface AiSettings {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  hasApiKey?: boolean;
  keys?: Record<AiProvider, string>;
  models?: Record<AiProvider, string>;
  baseUrls?: Record<AiProvider, string>;
  hasApiKeys?: Record<AiProvider, boolean>;
}
