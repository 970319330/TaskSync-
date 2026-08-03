import React, { useState } from 'react';
import {
  Kanban,
  ListTodo,
  GanttChart,
  BarChart3,
  MessageSquare,
  Sparkles,
  Bell,
  Search,
  Plus,
  ChevronDown,
  Layers,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { Project, Member, ViewMode, NotificationItem } from '../types';
import { NotificationDropdown } from './NotificationDropdown';

interface NavbarProps {
  projects: Project[];
  activeProject: Project;
  onSelectProject: (p: Project) => void;
  members: Member[];
  currentMember: Member;
  onSelectCurrentMember: (m: Member) => void;
  viewMode: ViewMode;
  onSelectViewMode: (v: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCreateTask: () => void;
  onOpenAiCopilot: () => void;
  notifications: NotificationItem[];
  showNotificationsDropdown: boolean;
  onOpenNotifications: () => void;
  onCloseNotifications: () => void;
  onMarkNotificationsRead: () => void;
  onTaskClickById: (taskId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projects,
  activeProject,
  onSelectProject,
  members,
  currentMember,
  onSelectCurrentMember,
  viewMode,
  onSelectViewMode,
  searchQuery,
  onSearchChange,
  onOpenCreateTask,
  onOpenAiCopilot,
  notifications,
  showNotificationsDropdown,
  onOpenNotifications,
  onCloseNotifications,
  onMarkNotificationsRead,
  onTaskClickById,
}) => {
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState(false);

  const safeNotifs = notifications || [];
  const unreadCount = safeNotifs.filter(
    (n) => currentMember && n.recipientId === currentMember.id && !n.isRead
  ).length;

  const navItems: { id: ViewMode; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'kanban', label: '看板视图', icon: Kanban },
    { id: 'list', label: '列表视图', icon: ListTodo },
    { id: 'gantt', label: '甘特进度', icon: GanttChart },
    { id: 'analytics', label: '数据报表', icon: BarChart3 },
    { id: 'chat', label: '团队沟通', icon: MessageSquare },
  ];

  return (
    <header id="main-navbar" className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-30 shadow-xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        
        {/* Left: Brand Logo & Project Switcher */}
        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-extrabold shadow-md shadow-emerald-500/20 shrink-0">
              TS
            </div>
            <div className="shrink-0">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 whitespace-nowrap">
                TaskSync
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-emerald-600 block -mt-1 uppercase whitespace-nowrap">
                Collaboration Cloud
              </span>
            </div>
          </div>

          {/* Project Switcher Dropdown */}
          <div className="relative shrink-0">
            <button
              id="project-switcher-btn"
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="max-w-[110px] sm:max-w-[180px] truncate whitespace-nowrap font-semibold">{activeProject.name}</span>
              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
            </button>

            {showProjectMenu && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  项目空间 (Projects)
                </div>
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      onSelectProject(proj);
                      setShowProjectMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                      proj.id === activeProject.id ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{proj.name}</span>
                    </div>
                    {proj.id === activeProject.id && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Navigation Tabs (Desktop) */}
        <nav className="hidden xl:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = viewMode === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => onSelectViewMode(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Search, Create, AI, User Account */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative hidden lg:block shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索任务/关键字/标签..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white w-36 xl:w-48 transition-all"
            />
          </div>

          {/* AI Copilot Button */}
          <button
            id="ai-copilot-trigger-btn"
            onClick={onOpenAiCopilot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="TaskSync Copilot AI 智能助手"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200 animate-pulse shrink-0" />
            <span className="whitespace-nowrap">AI Copilot</span>
          </button>

          {/* Publish Task Button */}
          <button
            id="create-task-nav-btn"
            onClick={onOpenCreateTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3] shrink-0" />
            <span className="whitespace-nowrap">发布新任务</span>
          </button>

          {/* Notifications Button */}
          <div className="relative shrink-0">
            <button
              id="notification-bell-btn"
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="通知中心"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              )}
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500" />
              )}
            </button>

            {showNotificationsDropdown && (
              <NotificationDropdown
                notifications={notifications}
                members={members}
                currentMember={currentMember}
                onClose={onCloseNotifications}
                onMarkRead={onMarkNotificationsRead}
                onTaskClickById={onTaskClickById}
              />
            )}
          </div>

          {/* Current Member Role Switcher */}
          <div className="relative shrink-0">
            <button
              id="current-user-switcher-btn"
              onClick={() => setShowMemberMenu(!showMemberMenu)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200/80 transition-colors shrink-0 cursor-pointer"
            >
              <img
                src={currentMember.avatar}
                alt={currentMember.name}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500/40 shrink-0"
              />
              <div className="text-left hidden sm:flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-xs font-semibold text-slate-800">
                  {currentMember.name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                  {currentMember.role.split(' ')[0]}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>

            {showMemberMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  切换当前协作视角 (Switch User)
                </div>
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectCurrentMember(m);
                      setShowMemberMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                      m.id === currentMember.id ? 'bg-slate-100 text-emerald-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full object-cover" />
                      <div>
                        <div className="font-medium text-slate-800">{m.name}</div>
                        <div className="text-[10px] text-slate-500">{m.role}</div>
                      </div>
                    </div>
                    {m.id === currentMember.id && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                        当前
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Sub-header Nav Tabs (Mobile / Tablet / Medium screens) */}
      <div className="xl:hidden flex items-center gap-1.5 overflow-x-auto scrollbar-none border-t border-slate-200 bg-slate-50 px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = viewMode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectViewMode(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
