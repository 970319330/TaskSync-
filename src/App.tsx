import React, { useState, useEffect } from 'react';
import {
  Member,
  Project,
  Task,
  ChatChannel,
  ChatMessage,
  NotificationItem,
  ViewMode,
  TaskStatus,
  TaskPriority,
  AiSettings,
  AiProvider,
  Role,
  Milestone,
} from './types';
import { Navbar } from './components/Navbar';
import { MemberPresenceBar } from './components/MemberPresenceBar';
import { KanbanBoard } from './components/KanbanBoard';
import { ListView } from './components/ListView';
import { GanttChart } from './components/GanttChart';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ChatHub } from './components/ChatHub';
import { TaskDetailModal } from './components/TaskDetailModal';
import { TaskDetailPage } from './components/TaskDetailPage';
import { CreateTaskModal } from './components/CreateTaskModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ProjectManageModal } from './components/ProjectManageModal';
import { SettingsModal } from './components/SettingsModal';
import { TeamManagementPage } from './components/TeamManagementPage';
import { AiCopilotDrawer } from './components/AiCopilotDrawer';
import { Login } from './components/Login';
import { ZentaoSyncModal } from './components/ZentaoSyncModal';
import { ProjectImportExportModal } from './components/ProjectImportExportModal';
import { hasPermission } from './permissions';
import logoUrl from './assets/logo.png';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Workspace UI selections
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);

  // 登录态：登录后才能进入工作空间
  const [loggedInMemberId, setLoggedInMemberId] = useState<string | null>(
    () => localStorage.getItem('tasksync_logged_in_member_id')
  );

  // 禅道登录会话：true 时只显示禅道同步的项目/任务/成员/频道
  const [isZentaoSession, setIsZentaoSession] = useState<boolean>(
    () => sessionStorage.getItem('tasksync_login_source') === 'zentao'
  );

  const handleLogin = async (memberId: string) => {
    localStorage.setItem('tasksync_logged_in_member_id', memberId);
    setLoggedInMemberId(memberId);
    // 立即设置 currentMember，避免等待 fetchState 重跑
    // 注意：禅道登录时该成员可能是服务端刚创建的，本地 members 中还没有，
    // 此时依赖下面 fetchState 显式传入 memberId 来兜底设置
    const m = members.find((mem) => mem.id === memberId);
    if (m) setCurrentMember(m);
    // 同步禅道登录会话标记
    setIsZentaoSession(sessionStorage.getItem('tasksync_login_source') === 'zentao');
    // 登录后强制刷新 state，确保显示最新的项目/任务数据
    // （禅道登录会在 server 端新增项目和任务，需要重新拉取）
    // 显式传入 memberId，避免 fetchState 闭包读到过期的 loggedInMemberId 导致卡在登录页
    await fetchState(true, memberId);
  };

  const handleLogout = () => {
    localStorage.removeItem('tasksync_logged_in_member_id');
    sessionStorage.removeItem('tasksync_login_source');
    sessionStorage.removeItem('tasksync_zentao_member_id');
    setLoggedInMemberId(null);
    setIsZentaoSession(false);
    setActiveProject(null);
    setCurrentMember(null);
    setSelectedTask(null);
  };

  // Modals & Panels
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [createTaskInitialStatus, setCreateTaskInitialStatus] = useState<TaskStatus>('todo');
  const [createTaskParentId, setCreateTaskParentId] = useState<string | undefined>(undefined);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showManageProjectModal, setShowManageProjectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [showAiCopilotDrawer, setShowAiCopilotDrawer] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showZentaoSyncModal, setShowZentaoSyncModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [importExportTab, setImportExportTab] = useState<'import' | 'export'>('export');
  const [importExportProjectId, setImportExportProjectId] = useState<string | undefined>(undefined);

  const handleOpenImportExport = (tab: 'import' | 'export' = 'export', projectId?: string) => {
    setImportExportTab(tab);
    setImportExportProjectId(projectId);
    setShowImportExportModal(true);
  };

  const handleImportSuccess = (importedProject: Project, updatedProjects: Project[], updatedTasks: Task[]) => {
    setProjects(updatedProjects);
    setTasks(updatedTasks);
    setActiveProject(importedProject);
  };

  // Initial Fetch State
  // loginMemberId：登录场景下显式传入成员 ID，避免读取到闭包中过期的 loggedInMemberId
  const fetchState = async (force = false, loginMemberId?: string) => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      if (data) {
        setMembers(data.members || []);
        setRoles(data.roles || []);
        setProjects(data.projects || []);
        setTasks(data.tasks || []);
        setChannels(data.channels || []);
        setMessages(data.messages || []);
        setNotifications(data.notifications || []);

        if ((force || !activeProject) && data.projects?.length > 0) {
          setActiveProject(data.projects[0]);
        }
        // 若已登录，则以登录身份作为 currentMember；否则保持 null（由登录页处理）
        const effectiveMemberId = loginMemberId || loggedInMemberId;
        if (effectiveMemberId) {
          const loggedIn = (data.members || []).find((m) => m.id === effectiveMemberId);
          if (loggedIn) {
            setCurrentMember(loggedIn);
          } else {
            // 登录身份已失效（成员被移除等），清理登录态
            localStorage.removeItem('tasksync_logged_in_member_id');
            setLoggedInMemberId(null);
          }
        }
        if ((force || !activeChannel) && data.channels?.length > 0) {
          setActiveChannel(data.channels[0]);
        }
      }

      // 加载 AI 设置
      try {
        const sres = await fetch('/api/settings');
        const sdata = await sres.json();
        if (sdata) setAiSettings(sdata);
      } catch (e) {
        console.error('Failed to load AI settings:', e);
      }
    } catch (err) {
      console.error('Failed to load workspace state:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 初始加载失败已在 fetchState 内打印日志，此处捕获避免未处理的 rejection
    fetchState().catch(() => {});
  }, []);

  // 数据权限：管理员 / 产品经理可看全部；其他成员仅能看到自己经办或报告的任务
  // 提前计算，供 handleOpenTaskById / selectedTask 同步 / 通知过滤 / 各视图统一使用
  const canViewAllTasks = currentMember ? hasPermission(currentMember, 'assign_task', roles) : false;
  // 禅道登录会话：只显示禅道同步的项目/任务（id 以 ZT- 开头，projectId 以 zentao- 开头）
  const isZentaoTask = (t: Task) => t.id.startsWith('ZT-') || t.projectId.startsWith('zentao-');
  // 禅道会话下判断任务是否属于当前登录账号：
  // 优先用任务上的 zentaoAccount 标记，其次回退到经办人/报告人归属
  const isOwnZentaoTask = (t: Task) => {
    if (!currentMember) return false;
    if (t.zentaoAccount && currentMember.zentaoAccount) {
      return t.zentaoAccount === currentMember.zentaoAccount;
    }
    return t.assigneeIds?.includes(currentMember.id) || t.reporterId === currentMember.id;
  };
  const visibleTasks = currentMember
    ? tasks.filter((t) => {
        // 禅道会话：只保留当前禅道账号自己的任务，避免多账号任务互相串现
        if (isZentaoSession) return isZentaoTask(t) && isOwnZentaoTask(t);
        // 非禅道会话：按角色权限过滤
        if (!canViewAllTasks) {
          return t.assigneeIds?.includes(currentMember.id) || t.reporterId === currentMember.id;
        }
        return true;
      })
    : [];

  // Sync selected task with latest state（仅在可见任务范围内同步）
  useEffect(() => {
    if (selectedTask) {
      const updated = visibleTasks.find((t) => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
  }, [tasks]);

  // 禅道会话下，若当前 activeProject 不在可见项目列表中，自动切换到第一个可见项目
  useEffect(() => {
    if (!isZentaoSession) return;
    // 可见项目 = 当前账号可见任务所属的项目
    const visibleProjectIds = new Set(visibleTasks.map((t) => t.projectId));
    const inVisible = projects.filter((p) => visibleProjectIds.has(p.id));
    if (inVisible.length === 0) return;
    if (!activeProject || !inVisible.find((p) => p.id === activeProject.id)) {
      setActiveProject(inVisible[0]);
    }
  }, [isZentaoSession, projects, tasks, currentMember, activeProject]);

  // Update Task Status
  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          actorId: currentMember?.id || 'usr_alex',
        }),
      });
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  // Update Task Priority
  const handleUpdateTaskPriority = async (taskId: string, newPriority: TaskPriority) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority: newPriority,
          actorId: currentMember?.id || 'usr_alex',
        }),
      });
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to update task priority:', err);
    }
  };

  // Update Task Details (from modal)
  const handleUpdateTask = async (updatedFields: Partial<Task>) => {
    if (!selectedTask) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === selectedTask.id ? { ...t, ...updatedFields } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedFields,
          actorId: currentMember?.id || 'usr_alex',
        }),
      });
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // Create Task
  const handleCreateTask = async (newTaskData: any) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTaskData,
          reporterId: currentMember?.id || 'usr_alex',
          projectId: activeProject?.id || 'proj_cloud',
        }),
      });

      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
        if (data.notifications) setNotifications(data.notifications);
        setShowCreateTaskModal(false);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTask?.id === taskId) setSelectedTask(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Create Project
  const handleCreateProject = async (data: {
    name: string;
    key: string;
    description: string;
    color: string;
    memberIds: string[];
    template?: string;
    milestones?: Milestone[];
    initialTasks?: any[];
  }, importContent?: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.projects) {
        setProjects(result.projects);
        if (result.tasks) {
          setTasks(result.tasks);
        }
        if (result.project) {
          setActiveProject(result.project);

          // 如有导入内容,触发 AI 拆分任务(modal 保持显示 loading 直至完成)
          if (importContent) {
            try {
              const decomposeRes = await fetch('/api/copilot/import-decompose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  content: importContent,
                  projectId: result.project.id,
                  projectName: result.project.name,
                  projectDescription: result.project.description,
                  reporterId: currentMember?.id || 'usr_alex',
                  assigneeIds: data.memberIds,
                }),
              });
              const decomposeData = await decomposeRes.json();
              if (decomposeData.allTasks) setTasks(decomposeData.allTasks);
            } catch (e) {
              console.error('Failed to import-decompose:', e);
            }
          }
        }
        // 项目创建(及拆分)完成后关闭弹窗
        setShowCreateProjectModal(false);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  // Update Project
  const handleUpdateProject = async (id: string, data: Partial<Project>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    setActiveProject((prev) => (prev && prev.id === id ? { ...prev, ...data } : prev));
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.projects) setProjects(result.projects);
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  };

  // Delete Project
  const handleDeleteProject = async (id: string) => {
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    setTasks((prev) => prev.filter((t) => t.projectId !== id));
    // 若删除的是当前活跃项目,切换到剩余第一个
    if (activeProject?.id === id) {
      setActiveProject(remaining[0] || null);
    }
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.projects) setProjects(result.projects);
      if (result.tasks) setTasks(result.tasks);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  // Save AI Settings
  const handleSaveSettings = async (data: {
    provider: AiProvider;
    apiKey: string;
    model: string;
    baseUrl: string;
    keys?: Record<AiProvider, string>;
    models?: Record<AiProvider, string>;
    baseUrls?: Record<AiProvider, string>;
  }) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.settings) setAiSettings(result.settings);
    } catch (err) {
      console.error('Failed to save AI settings:', err);
    }
  };

  // Add Comment
  const handleAddComment = async (taskId: string, content: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentMember?.id || 'usr_alex',
          content,
        }),
      });

      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
      if (data.notifications) setNotifications(data.notifications);
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (channelId: string, content: string, taskRefId?: string) => {
    try {
      const res = await fetch(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentMember?.id || 'usr_alex',
          content,
          taskRefId,
        }),
      });

      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Generate AI Sprint Summary
  const handleGenerateAiSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const res = await fetch('/api/copilot/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.summary) {
        setAiSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to generate AI summary:', err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Update Member Status Text
  const handleUpdateMemberStatusText = async (memberId: string, statusText: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, statusText } : m))
    );

    try {
      await fetch(`/api/members/${memberId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusText }),
      });
    } catch (err) {
      console.error('Failed to update status text:', err);
    }
  };

  // Mark Notifications as Read
  const handleMarkNotificationsRead = async () => {
    if (!currentMember) return;
    setNotifications((prev) =>
      prev.map((n) => (n.recipientId === currentMember.id ? { ...n, isRead: true } : n))
    );

    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: currentMember.id }),
      });
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleOpenTaskById = (taskId: string) => {
    const t = visibleTasks.find((item) => item.id === taskId);
    if (t) setSelectedTask(t);
  };

  // 禅道数据导入
  const handleZentaoImport = async (ztTasks: any[]) => {
    try {
      const res = await fetch('/api/zentao/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: ztTasks,
          memberId: currentMember?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // 刷新 state
        if (data.projects) setProjects(data.projects);
        // 重新拉取全部 state 以获取最新 tasks
        const stateRes = await fetch('/api/state');
        const stateData = await stateRes.json();
        if (stateData.tasks) setTasks(stateData.tasks);
        if (stateData.projects) setProjects(stateData.projects);
        setShowZentaoSyncModal(false);
      }
    } catch (err) {
      console.error('Zentao import failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-emerald-600">
          <img src={logoUrl} alt="牛磨 Logo" className="w-14 h-14 object-contain mb-2" />
          <Loader2 className="w-7 h-7 animate-spin" />
          <span className="text-sm font-semibold tracking-wide">加载 牛磨 协作空间...</span>
        </div>
      </div>
    );
  }

  // 未登录：渲染登录页
  if (!loggedInMemberId || !currentMember) {
    return <Login members={members} roles={roles} onLogin={handleLogin} />;
  }

  // 已登录但项目数据未就绪
  if (!activeProject || !activeChannel) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-emerald-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm font-semibold tracking-wide">准备协作空间...</span>
        </div>
      </div>
    );
  }

  // Filter tasks for current active project（基于已过滤的 visibleTasks）
  const visibleProjectTasks = visibleTasks.filter((t) => t.projectId === activeProject.id);

  // 通知按当前用户过滤（普通用户只看到发给自己的通知）
  const visibleNotifications = canViewAllTasks
    ? notifications
    : notifications.filter((n) => n.recipientId === currentMember.id);

  // 禅道登录会话：项目/成员/频道也只显示禅道相关数据
  // 项目按「当前账号可见任务所属项目」过滤，避免显示其他禅道账号的项目
  const visibleProjects = isZentaoSession
    ? (() => {
        const ids = new Set(visibleTasks.map((t) => t.projectId));
        return projects.filter((p) => ids.has(p.id));
      })()
    : projects;
  const zentaoMemberId = isZentaoSession ? sessionStorage.getItem('tasksync_zentao_member_id') : null;
  const visibleMembers = isZentaoSession
    ? members.filter((m) => m.id === zentaoMemberId || m.id === currentMember?.id)
    : members;
  // 频道按可见项目关联的活动频道过滤
  const visibleChannels = isZentaoSession
    ? channels
    : channels;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white relative">

      {/* 禅道会话横幅提示 */}
      {isZentaoSession && (
        <div className="bg-indigo-50 border-b border-indigo-200 text-indigo-800 text-xs font-medium">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between">
            <span>当前为禅道登录会话，仅显示从禅道同步的项目与任务</span>
            <button
              onClick={handleLogout}
              className="text-indigo-700 hover:text-indigo-900 font-bold cursor-pointer"
            >
              退出禅道会话
            </button>
          </div>
        </div>
      )}

      {/* Top Main Navbar */}
      <Navbar
        projects={visibleProjects}
        activeProject={activeProject}
        onSelectProject={(p) => setActiveProject(p)}
        members={visibleMembers}
        roles={roles}
        currentMember={currentMember}
        canSwitchMember={canViewAllTasks}
        onSelectCurrentMember={(m) => setCurrentMember(m)}
        onLogout={handleLogout}
        viewMode={viewMode}
        onSelectViewMode={(v) => setViewMode(v)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        onOpenCreateTask={() => {
          setCreateTaskInitialStatus('todo');
          setShowCreateTaskModal(true);
        }}
        onOpenAiCopilot={() => setShowAiCopilotDrawer(true)}
        onOpenCreateProject={() => setShowCreateProjectModal(true)}
        onOpenManageProject={() => setShowManageProjectModal(true)}
        onOpenImportExport={handleOpenImportExport}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenTeamModal={() => setShowTeamModal(true)}
        onOpenZentaoSync={() => setShowZentaoSyncModal(true)}
        notifications={visibleNotifications}
        showNotificationsDropdown={showNotificationsDropdown}
        onOpenNotifications={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
        onCloseNotifications={() => setShowNotificationsDropdown(false)}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onTaskClickById={handleOpenTaskById}
      />

      {/* Realtime Team Members Presence & Status Bar */}
      <MemberPresenceBar
        members={visibleMembers}
        currentMember={currentMember}
        onUpdateMemberStatusText={handleUpdateMemberStatusText}
      />

      {/* Main View Area */}
      <main className="pb-12">
        {selectedTask ? (
          <TaskDetailPage
            task={selectedTask}
            allTasks={visibleProjectTasks}
            members={visibleMembers}
            roles={roles}
            currentMember={currentMember}
            projectName={activeProject.name}
            onBack={() => setSelectedTask(null)}
            onSelectTask={handleOpenTaskById}
            onOpenCreateSubtask={(parentTaskId) => {
              setCreateTaskParentId(parentTaskId);
              setCreateTaskInitialStatus('todo');
              setShowCreateTaskModal(true);
            }}
            onUpdateTask={handleUpdateTask}
            onAddComment={handleAddComment}
            onDeleteTask={handleDeleteTask}
          />
        ) : showTeamModal ? (
          <TeamManagementPage
            members={visibleMembers}
            roles={roles}
            currentMember={currentMember}
            onClose={() => setShowTeamModal(false)}
            onUpdateMembers={setMembers}
            onUpdateRoles={setRoles}
          />
        ) : (
          <>
            {viewMode === 'kanban' && (
              <KanbanBoard
                tasks={visibleProjectTasks}
                members={visibleMembers}
                roles={roles}
                currentMember={currentMember}
                searchQuery={searchQuery}
                onTaskClick={(t) => setSelectedTask(t)}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onDeleteTask={handleDeleteTask}
                onOpenCreateTaskWithStatus={(status) => {
                  setCreateTaskInitialStatus(status);
                  setShowCreateTaskModal(true);
                }}
              />
            )}

            {viewMode === 'list' && (
              <ListView
                tasks={visibleProjectTasks}
                members={visibleMembers}
                roles={roles}
                currentMember={currentMember}
                searchQuery={searchQuery}
                onTaskClick={(t) => setSelectedTask(t)}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onUpdateTaskPriority={handleUpdateTaskPriority}
                onDeleteTask={handleDeleteTask}
                onOpenCreateTask={() => {
                  setCreateTaskInitialStatus('todo');
                  setShowCreateTaskModal(true);
                }}
              />
            )}

            {viewMode === 'gantt' && (
              <GanttChart
                tasks={visibleProjectTasks}
                members={visibleMembers}
                activeProject={activeProject}
                onTaskClick={(t) => setSelectedTask(t)}
              />
            )}

            {viewMode === 'analytics' && (
              <AnalyticsDashboard
                tasks={visibleProjectTasks}
                members={visibleMembers}
                activeProject={activeProject}
                onGenerateAiSummary={handleGenerateAiSummary}
                aiSummary={aiSummary}
                isGeneratingSummary={isGeneratingSummary}
              />
            )}

            {viewMode === 'chat' && (
              <ChatHub
                channels={visibleChannels}
                activeChannel={activeChannel}
                onSelectChannel={(c) => setActiveChannel(c)}
                messages={messages}
                members={visibleMembers}
                currentMember={currentMember}
                tasks={visibleProjectTasks}
                onSendMessage={handleSendMessage}
                onTaskClickById={handleOpenTaskById}
              />
            )}
          </>
        )}
      </main>

      {/* Create / Publish Task Modal */}
      {showCreateTaskModal && (
        <CreateTaskModal
          initialStatus={createTaskInitialStatus}
          members={visibleMembers}
          roles={roles}
          currentMember={currentMember}
          projects={visibleProjects}
          activeProject={activeProject}
          allTasks={visibleProjectTasks}
          initialParentId={createTaskParentId}
          onClose={() => {
            setShowCreateTaskModal(false);
            setCreateTaskParentId(undefined);
          }}
          onSubmit={handleCreateTask}
        />
      )}

      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <CreateProjectModal
          members={visibleMembers}
          onClose={() => setShowCreateProjectModal(false)}
          onSubmit={handleCreateProject}
        />
      )}

      {/* Project Management Modal */}
      {showManageProjectModal && (
        <ProjectManageModal
          projects={visibleProjects}
          members={visibleMembers}
          activeProject={activeProject}
          onClose={() => setShowManageProjectModal(false)}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
          onSelectProject={(p) => setActiveProject(p)}
          onOpenImportExport={handleOpenImportExport}
        />
      )}

      {/* Project Import & Export Modal */}
      {showImportExportModal && (
        <ProjectImportExportModal
          projects={projects}
          tasks={tasks}
          members={members}
          activeProject={activeProject || projects[0]}
          onClose={() => setShowImportExportModal(false)}
          onImportSuccess={handleImportSuccess}
          initialTab={importExportTab}
          selectedProjectId={importExportProjectId}
        />
      )}

      {/* System Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          settings={aiSettings}
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSaveSettings}
        />
      )}

      {/* AI Copilot Side Drawer */}
      <AiCopilotDrawer
        isOpen={showAiCopilotDrawer}
        onClose={() => setShowAiCopilotDrawer(false)}
        tasks={visibleProjectTasks}
        members={visibleMembers}
        onGenerateSummary={handleGenerateAiSummary}
        aiSummary={aiSummary}
        isGeneratingSummary={isGeneratingSummary}
      />

      {/* 禅道数据同步 */}
      {showZentaoSyncModal && (
        <ZentaoSyncModal
          onClose={() => setShowZentaoSyncModal(false)}
          onImport={handleZentaoImport}
        />
      )}

    </div>
  );
}
