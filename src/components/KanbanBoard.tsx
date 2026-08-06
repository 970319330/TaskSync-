import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority, Member, Role, getTaskColor } from '../types';
import { hasPermission } from '../permissions';
import {
  Clock,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Plus,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Lock,
  LayoutGrid,
  ListFilter,
  Maximize2,
  Minimize2,
  User,
  Filter,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  GitFork,
  Trash2,
} from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  members: Member[];
  roles: Role[];
  currentMember: Member;
  searchQuery: string;
  onTaskClick: (task: Task) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onOpenCreateTaskWithStatus: (status: TaskStatus) => void;
  onDeleteTask?: (taskId: string) => void;
}

const COLUMNS: { id: TaskStatus; title: string; color: string; border: string; bg: string }[] = [
  {
    id: 'backlog',
    title: 'Backlog (积压储备)',
    color: 'text-slate-600',
    border: 'border-slate-200',
    bg: 'bg-slate-100/70',
  },
  {
    id: 'todo',
    title: '待办 (To Do)',
    color: 'text-blue-700',
    border: 'border-blue-200/80',
    bg: 'bg-blue-50/50',
  },
  {
    id: 'in_progress',
    title: '进行中 (In Progress)',
    color: 'text-amber-700',
    border: 'border-amber-200/80',
    bg: 'bg-amber-50/50',
  },
  {
    id: 'review',
    title: '测试 (Test)',
    color: 'text-purple-700',
    border: 'border-purple-200/80',
    bg: 'bg-purple-50/50',
  },
  {
    id: 'done',
    title: '已完成 (Done)',
    color: 'text-emerald-700',
    border: 'border-emerald-200/80',
    bg: 'bg-emerald-50/50',
  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  members,
  roles,
  currentMember,
  searchQuery,
  onTaskClick,
  onUpdateTaskStatus,
  onOpenCreateTaskWithStatus,
  onDeleteTask,
}) => {
  const [densityMode, setDensityMode] = useState<'standard' | 'compact'>('standard');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [showSubtasks, setShowSubtasks] = useState<boolean>(false);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const canAssignTask = hasPermission(currentMember, 'assign_task', roles);

  const toggleColumnCollapse = (colId: string) => {
    setCollapsedColumns((prev) => ({
      ...prev,
      [colId]: !prev[colId],
    }));
  };

  const getPriorityBadge = (priority: TaskPriority, compact = false) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className={`bg-rose-100 text-rose-700 border border-rose-200 rounded font-bold uppercase tracking-wider flex items-center gap-0.5 ${compact ? 'px-1 py-0.2 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
            <AlertCircle className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-rose-600`} />
            紧急
          </span>
        );
      case 'high':
        return (
          <span className={`bg-amber-100 text-amber-700 border border-amber-200 rounded font-semibold uppercase tracking-wider ${compact ? 'px-1 py-0.2 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
            高优
          </span>
        );
      case 'medium':
        return (
          <span className={`bg-blue-100 text-blue-700 border border-blue-200 rounded font-medium ${compact ? 'px-1 py-0.2 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
            中等
          </span>
        );
      case 'low':
        return (
          <span className={`bg-slate-100 text-slate-600 border border-slate-200 rounded font-medium ${compact ? 'px-1 py-0.2 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
            低级
          </span>
        );
    }
  };

  const filteredTasks = tasks.filter((t) => {
    // 默认隐藏独立的子任务卡片（规避层级混乱），除非用户勾选平铺显示
    if (!showSubtasks && t.parentId) {
      return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (priorityFilter !== 'all' && t.priority !== priorityFilter) {
      return false;
    }

    if (assigneeFilter === 'my') {
      if (!t.assigneeIds.includes(currentMember.id)) return false;
    } else if (assigneeFilter !== 'all') {
      if (!t.assigneeIds.includes(assigneeFilter)) return false;
    }

    return true;
  });

  return (
    <div className="p-4 sm:p-6 max-w-[1700px] mx-auto flex flex-col gap-4">
      {/* Top Filter & Density Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left Status Summary & Filter Options */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 pr-2 border-r border-slate-200">
            <LayoutGrid className="w-4 h-4 text-emerald-600" />
            <span>看板筛选</span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
              共 {filteredTasks.length} 项
            </span>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">优先级:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">全部优先级</option>
              <option value="urgent">🔥 紧急 (Urgent)</option>
              <option value="high">⚡ 高优 (High)</option>
              <option value="medium">🔷 中等 (Medium)</option>
              <option value="low">🟢 低级 (Low)</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">指派给:</span>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">全部成员</option>
              <option value="my">👤 只看我的任务</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Show/Hide Subtasks Control */}
          <label className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200 cursor-pointer transition-all shadow-2xs">
            <GitFork className="w-3.5 h-3.5 text-indigo-600" />
            <input
              type="checkbox"
              checked={showSubtasks}
              onChange={(e) => setShowSubtasks(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-slate-700 font-semibold">平铺显示独立子任务卡片</span>
          </label>

          {(priorityFilter !== 'all' || assigneeFilter !== 'all' || showSubtasks) && (
            <button
              onClick={() => {
                setPriorityFilter('all');
                setAssigneeFilter('all');
                setShowSubtasks(false);
              }}
              className="text-slate-400 hover:text-rose-600 text-[11px] underline cursor-pointer"
            >
              重置筛选
            </button>
          )}
        </div>

        {/* Right Density View Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium text-[11px]">卡片卡高:</span>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setDensityMode('standard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                densityMode === 'standard'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>标准模式</span>
            </button>
            <button
              onClick={() => setDensityMode('compact')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                densityMode === 'compact'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="紧凑视图：精简高度，适合在任务极多时一览全貌"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>紧凑模式 (高效)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Board Horizontal Scroll Area */}
      <div className="overflow-x-auto pb-4">
        <div className="flex items-start gap-3.5 min-w-[1200px] xl:min-w-0">
          {COLUMNS.map((column) => {
            const isCollapsed = !!collapsedColumns[column.id];
            const colTasks = filteredTasks.filter((t) => t.status === column.id);
            const totalHours = colTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

            // Collapsed Column View
            if (isCollapsed) {
              return (
                <div
                  key={column.id}
                  onClick={() => toggleColumnCollapse(column.id)}
                  className={`w-12 min-w-[48px] max-w-[48px] rounded-2xl border ${column.border} ${column.bg} py-4 px-1 flex flex-col items-center justify-between h-[calc(100vh-210px)] min-h-[550px] shadow-2xs cursor-pointer hover:border-emerald-400 transition-all group`}
                  title={`点击展开 ${column.title}`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <span className="bg-white text-slate-800 text-[11px] font-bold px-1.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                      {colTasks.length}
                    </span>
                    <div className="rotate-90 whitespace-nowrap text-xs font-bold text-slate-700 tracking-wide mt-8 group-hover:text-emerald-700 transition-colors">
                      {column.title.split(' ')[0]}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleColumnCollapse(column.id);
                    }}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-emerald-600 shadow-2xs cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={column.id}
                className={`flex-1 min-w-[260px] max-w-[340px] rounded-2xl border ${column.border} ${column.bg} p-3 flex flex-col h-[calc(100vh-210px)] min-h-[550px] shadow-2xs transition-all`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 mb-2.5 px-1 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${column.color}`}>{column.title}</span>
                    <span className="bg-white text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">{totalHours}h</span>
                    <button
                      onClick={() => toggleColumnCollapse(column.id)}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-white/80 transition-colors cursor-pointer"
                      title="折叠此列"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tasks List Container (Independent Y-axis Scrollable) */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                  {colTasks.map((task) => {
                    const checklist = task.checklist || [];
                    const tags = task.tags || [];
                    const comments = task.comments || [];
                    const completedChecklist = checklist.filter((c) => c.completed).length;
                    const totalChecklist = checklist.length;
                    const checklistPercent =
                      totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;
                    const taskColor = getTaskColor(task.color);
                    const canEditTask = canAssignTask || (task.assigneeIds?.includes(currentMember.id) ?? false);

                    // Compact Card Render Mode
                    if (densityMode === 'compact') {
                      return (
                        <div
                          key={task.id}
                          onClick={() => onTaskClick(task)}
                          className={`group relative border ${taskColor.accent || 'border-slate-200'} ${taskColor.bg || 'bg-white'} hover:border-emerald-400 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer overflow-hidden`}
                        >
                          {task.color && task.color !== 'none' && (
                            <span
                              className={`absolute left-0 top-0 bottom-0 w-1 ${taskColor.bar} rounded-l-xl`}
                              aria-hidden
                            />
                          )}

                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0">
                              {task.id}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {getPriorityBadge(task.priority, true)}
                              {canEditTask && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white rounded p-0.5 border border-slate-200 shadow-2xs">
                                  {column.id !== 'backlog' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const statuses: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];
                                        const currIdx = statuses.indexOf(column.id);
                                        onUpdateTaskStatus(task.id, statuses[currIdx - 1]);
                                      }}
                                      className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                                      title="移至前一列"
                                    >
                                      <ArrowLeft className="w-3 h-3" />
                                    </button>
                                  )}
                                  {column.id !== 'done' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const statuses: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];
                                        const currIdx = statuses.indexOf(column.id);
                                        onUpdateTaskStatus(task.id, statuses[currIdx + 1]);
                                      }}
                                      className="p-0.5 text-slate-400 hover:text-emerald-600 cursor-pointer"
                                      title="移至下一列"
                                    >
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <h4 className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors truncate mb-1.5">
                            {task.title}
                          </h4>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100/80">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {task.dueDate.substring(5)}
                              </span>
                              {totalChecklist > 0 && (
                                <span className="flex items-center gap-0.5 font-mono text-emerald-700">
                                  <CheckSquare className="w-3 h-3" />
                                  {completedChecklist}/{totalChecklist}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center -space-x-1">
                              {task.assigneeIds.map((assigneeId) => {
                                const member = members.find((m) => m.id === assigneeId);
                                if (!member) return null;
                                return (
                                  <img
                                    key={member.id}
                                    src={member.avatar}
                                    alt={member.name}
                                    title={member.name}
                                    className="w-4 h-4 rounded-full object-cover ring-1 ring-white"
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Standard Card Render Mode
                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className={`group relative border ${taskColor.accent || 'border-slate-200'} ${taskColor.bg || 'bg-white'} hover:brightness-95 rounded-xl p-3 shadow-2xs hover:shadow-md transition-all cursor-pointer overflow-hidden`}
                      >
                        {/* 颜色标记左侧色条 */}
                        {task.color && task.color !== 'none' && (
                          <span
                            className={`absolute left-0 top-0 bottom-0 w-1 ${taskColor.bar} rounded-l-xl`}
                            aria-hidden
                          />
                        )}

                        {/* 如果是平铺显示的子任务，展示所属父任务提示 */}
                        {task.parentId && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md mb-1 w-fit">
                            <GitFork className="w-3 h-3 text-indigo-600" />
                            <span>所属父任务: {task.parentId}</span>
                          </div>
                        )}
                        {/* Top Row: Task ID & Priority & Transition arrows */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-mono font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
                            {task.id}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {getPriorityBadge(task.priority)}

                            {/* Quick move buttons */}
                            {canEditTask && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white rounded p-0.5 border border-slate-200 shadow-2xs">
                                {column.id !== 'backlog' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const statuses: TaskStatus[] = [
                                        'backlog',
                                        'todo',
                                        'in_progress',
                                        'review',
                                        'done',
                                      ];
                                      const currIdx = statuses.indexOf(column.id);
                                      onUpdateTaskStatus(task.id, statuses[currIdx - 1]);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                    title="移至前一列"
                                  >
                                    <ArrowLeft className="w-3 h-3" />
                                  </button>
                                )}
                                {column.id !== 'done' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const statuses: TaskStatus[] = [
                                        'backlog',
                                        'todo',
                                        'in_progress',
                                        'review',
                                        'done',
                                      ];
                                      const currIdx = statuses.indexOf(column.id);
                                      onUpdateTaskStatus(task.id, statuses[currIdx + 1]);
                                    }}
                                    className="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer"
                                    title="移至下一列"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                                {onDeleteTask && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingTask(task);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                                    title="彻底删除任务"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                            {!canEditTask && (
                              <span title="无操作权限">
                                <Lock className="w-3 h-3 text-slate-300" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Task Title */}
                        <h4 className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug mb-1">
                          {task.title}
                        </h4>

                        {/* Task Rich Text Snippet Preview */}
                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2 font-sans">
                            {task.description.replace(/<[^>]+>/g, ' ').replace(/[#*`_~>[\]]/g, '').trim()}
                          </p>
                        )}

                        {/* Tags & Tester badge */}
                        {(tags.length > 0 || task.testerId) && (
                          <div className="flex flex-wrap items-center gap-1 mb-2">
                            {task.testerId && (
                              <span
                                className="text-[10px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-2xs"
                                title={`流转测试负责人: ${members.find((m) => m.id === task.testerId)?.name}`}
                              >
                                🧪 测试: {members.find((m) => m.id === task.testerId)?.name.split(' ')[0] || '设置'}
                              </span>
                            )}
                            {tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Subtasks Progress Bar */}
                        {totalChecklist > 0 && (
                          <div className="mb-2">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                              <span className="flex items-center gap-1">
                                <CheckSquare className="w-3 h-3 text-emerald-600" />
                                子任务进度
                              </span>
                              <span className="font-mono">
                                {completedChecklist}/{totalChecklist} ({checklistPercent}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/60">
                              <div
                                className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full transition-all duration-300"
                                style={{ width: `${checklistPercent}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Footer: Due Date, Comments, Assignees */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {task.dueDate.substring(5)}
                            </span>

                            {comments.length > 0 && (
                              <span className="flex items-center gap-0.5 text-[11px] text-slate-600">
                                <MessageSquare className="w-3 h-3 text-indigo-500" />
                                {comments.length}
                              </span>
                            )}

                            {task.attachmentsCount > 0 && (
                              <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
                                <Paperclip className="w-3 h-3" />
                                {task.attachmentsCount}
                              </span>
                            )}
                          </div>

                          {/* Assignees Overlapping Avatars */}
                          <div className="flex items-center -space-x-1.5">
                            {task.assigneeIds.map((assigneeId) => {
                              const member = members.find((m) => m.id === assigneeId);
                              if (!member) return null;
                              return (
                                <img
                                  key={member.id}
                                  src={member.avatar}
                                  alt={member.name}
                                  title={`${member.name} (${member.role})`}
                                  className="w-5 h-5 rounded-full object-cover ring-2 ring-white"
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty State / Add Task */}
                  {colTasks.length === 0 && (
                    <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-400 text-xs bg-white/50">
                      暂无符合条件的任务
                    </div>
                  )}
                </div>

                {/* Add Task Button at column bottom */}
                <button
                  onClick={() => onOpenCreateTaskWithStatus(column.id)}
                  className="mt-2.5 w-full py-1.5 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  <span>快速发表至 {column.title.split(' ')[0]}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setDeletingTask(null)}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">确认彻底删除任务</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  确定要删除任务 <span className="font-mono font-bold text-slate-800">[{deletingTask.id}] {deletingTask.title}</span> 吗？关联的子任务也将清理，此操作不可撤销。
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingTask(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (onDeleteTask) {
                    onDeleteTask(deletingTask.id);
                  }
                  setDeletingTask(null);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                彻底删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

