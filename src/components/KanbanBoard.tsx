import React from 'react';
import { Task, TaskStatus, TaskPriority, Member } from '../types';
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
} from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  members: Member[];
  searchQuery: string;
  onTaskClick: (task: Task) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onOpenCreateTaskWithStatus: (status: TaskStatus) => void;
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
    title: '代码评审 (Code Review)',
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
  searchQuery,
  onTaskClick,
  onUpdateTaskStatus,
  onOpenCreateTaskWithStatus,
}) => {
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            紧急
          </span>
        );
      case 'high':
        return (
          <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
            高优
          </span>
        );
      case 'medium':
        return (
          <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-medium">
            中等
          </span>
        );
      case 'low':
        return (
          <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-medium">
            低级
          </span>
        );
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto overflow-x-auto">
      <div className="flex items-start gap-4 min-w-[1200px] xl:min-w-0 pb-6">
        {COLUMNS.map((column) => {
          const colTasks = filteredTasks.filter((t) => t.status === column.id);
          const totalHours = colTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

          return (
            <div
              key={column.id}
              className={`flex-1 min-w-[250px] max-w-[320px] rounded-2xl border ${column.border} ${column.bg} p-3 flex flex-col min-h-[600px] shadow-sm`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${column.color}`}>{column.title}</span>
                  <span className="bg-white text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                    {colTasks.length}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">{totalHours}h 工时</div>
              </div>

              {/* Tasks List */}
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-0.5">
                {colTasks.map((task) => {
                  const checklist = task.checklist || [];
                  const tags = task.tags || [];
                  const comments = task.comments || [];
                  const completedChecklist = checklist.filter((c) => c.completed).length;
                  const totalChecklist = checklist.length;
                  const checklistPercent =
                    totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="group bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer relative"
                    >
                      {/* Top Row: Task ID & Priority & Transition arrows */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
                          {task.id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {getPriorityBadge(task.priority)}

                          {/* Quick move buttons */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white rounded p-0.5 border border-slate-200 shadow-sm">
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
                          </div>
                        </div>
                      </div>

                      {/* Task Title */}
                      <h4 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug mb-1">
                        {task.title}
                      </h4>

                      {/* Task Rich Text Snippet Preview */}
                      {task.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2 font-sans">
                          {task.description.replace(/[#*`_~>[\]]/g, '')}
                        </p>
                      )}

                      {/* Tags & Tester badge */}
                      {(tags.length > 0 || task.testerId) && (
                        <div className="flex flex-wrap items-center gap-1 mb-2.5">
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
                        <div className="mb-3">
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
                                className="w-6 h-6 rounded-full object-cover ring-2 ring-white"
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
                    暂无任务
                  </div>
                )}
              </div>

              {/* Add Task Button at column bottom */}
              <button
                onClick={() => onOpenCreateTaskWithStatus(column.id)}
                className="mt-3 w-full py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                <span>快速发表至 {column.title.split(' ')[0]}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
