export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface Member {
  id: string;
  name: string;
  role: string;
  avatar: string;
  avatarBg: string;
  email: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  statusText: string;
  workloadCount?: number;
}

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
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
  attachmentsCount: number;
  testerId?: string;
  autoFlowToTest?: boolean;
  completeDevAndFlow?: boolean;
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
