import { Member, Project, Task, ChatChannel, ChatMessage, NotificationItem, Role } from './types';

export const INITIAL_ROLES: Role[] = [
  {
    id: 'role_admin',
    name: '系统管理员',
    description: '拥有所有权限，可管理成员、角色、项目和任务',
    color: 'bg-emerald-600',
    permissions: ['assign_task', 'create_task', 'delete_task', 'manage_members', 'manage_roles', 'manage_projects'],
  },
  {
    id: 'role_pm',
    name: '产品经理 (PM)',
    description: '负责需求管理与任务分配，可创建和指派任务',
    color: 'bg-blue-600',
    permissions: ['assign_task', 'create_task', 'delete_task'],
  },
  {
    id: 'role_dev',
    name: '开发工程师',
    description: '负责开发实现，可创建任务但不能指派',
    color: 'bg-indigo-600',
    permissions: ['create_task'],
  },
  {
    id: 'role_designer',
    name: '设计师',
    description: '负责 UI/UX 设计，可创建任务但不能指派',
    color: 'bg-rose-600',
    permissions: ['create_task'],
  },
  {
    id: 'role_devops',
    name: 'DevOps 工程师',
    description: '负责部署运维，可创建任务但不能指派',
    color: 'bg-amber-600',
    permissions: ['create_task'],
  },
  {
    id: 'role_ai',
    name: '智能助手',
    description: 'AI 协作助手，辅助任务总结与分析',
    color: 'bg-purple-600',
    permissions: [],
  },
];

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'usr_alex',
    name: '陈亚历 (Alex)',
    role: 'Tech Lead / 架构师',
    roleId: 'role_admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    avatarBg: 'bg-emerald-600',
    email: 'alex.chen@tasksync.io',
    status: 'online',
    statusText: '正在评审底层数据结构与协同协议',
    workloadCount: 0,
    isAdmin: true,
  },
  {
    id: 'usr_ai',
    name: '牛磨 Copilot (AI)',
    role: '智能协作助手',
    roleId: 'role_ai',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150',
    avatarBg: 'bg-purple-600',
    email: 'copilot@tasksync.io',
    status: 'online',
    statusText: '随时准备回答或总结任务',
    workloadCount: 0,
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj_cloud',
    name: '牛磨 Cloud v2.4 敏捷迭代',
    key: 'TS-CLOUD',
    description: '核心协同平台升级，重点优化多人实时沟通、看板交互与自动化工作流。',
    color: 'emerald',
    memberIds: ['usr_alex', 'usr_ai'],
  }
];

export const INITIAL_TASKS: Task[] = [];

export const INITIAL_CHANNELS: ChatChannel[] = [
  {
    id: 'chan_sprint',
    projectId: 'proj_cloud',
    name: 'sprint-24-迭代沟通',
    description: 'Sprint 24 每日站会、代码评审及日常开发阻碍讨论频道',
    isPrivate: false,
    unreadCount: 0,
  },
  {
    id: 'chan_design',
    projectId: 'proj_cloud',
    name: 'design-设计交流',
    description: 'UI/UX 规范、交互原型图走查及设计反馈讨论',
    isPrivate: false,
    unreadCount: 0,
  },
  {
    id: 'chan_architecture',
    projectId: 'proj_cloud',
    name: 'architecture-技术架构',
    description: '底层数据协议、API接口规范、性能优化与安全性研讨',
    isPrivate: false,
    unreadCount: 0,
  },
  {
    id: 'chan_general',
    projectId: 'proj_cloud',
    name: 'team-大堂茶水间',
    description: '团队日常公告、灵感分享与休闲交流',
    isPrivate: false,
    unreadCount: 0,
  }
];

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_1',
    channelId: 'chan_sprint',
    authorId: 'usr_alex',
    content: '工作空间已初始化完成，可以开始创建任务或从禅道同步任务了。',
    createdAt: '2026-08-02 09:30',
  },
  {
    id: 'msg_2',
    channelId: 'chan_sprint',
    authorId: 'usr_ai',
    content: '我是牛磨 Copilot，可以帮你拆解任务、生成站会报告，随时呼唤我。',
    createdAt: '2026-08-02 09:35',
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
