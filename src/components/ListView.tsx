import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, Member, Role, getTaskColor } from '../types';
import { hasPermission } from '../permissions';
import { Pagination } from './Pagination';
import {
  ArrowUpDown,
  CheckSquare,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  ListFilter,
  Trash2,
  Layers,
  Lock,
} from 'lucide-react';

interface ListViewProps {
  tasks: Task[];
  members: Member[];
  roles: Role[];
  currentMember: Member;
  searchQuery: string;
  onTaskClick: (task: Task) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onUpdateTaskPriority: (taskId: string, newPriority: TaskPriority) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenCreateTask: () => void;
}

export const ListView: React.FC<ListViewProps> = ({
  tasks,
  members,
  roles,
  currentMember,
  searchQuery,
  onTaskClick,
  onUpdateTaskStatus,
  onUpdateTaskPriority,
  onDeleteTask,
  onOpenCreateTask,
}) => {
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'id' | 'dueDate' | 'priority' | 'hours'>('dueDate');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 列表视图不允许修改状态；优先级仅管理员 / 产品经理可修改
  const canEditPriority = hasPermission(currentMember, 'assign_task', roles);

  // Filter tasks
  const filtered = (tasks || []).filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const tags = t.tags || [];
      return (
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Sort tasks
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'id') cmp = a.id.localeCompare(b.id);
    else if (sortField === 'dueDate') cmp = a.dueDate.localeCompare(b.dueDate);
    else if (sortField === 'hours') cmp = a.estimatedHours - b.estimatedHours;
    else if (sortField === 'priority') {
      const pOrder: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      cmp = pOrder[b.priority] - pOrder[a.priority];
    }
    return sortAsc ? cmp : -cmp;
  });

  // 筛选 / 搜索 / 排序变化时回到第一页，避免停留在越界的空白页
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, searchQuery, sortField, sortAsc]);

  // 任务总数减少（如删除）导致当前页越界时，回退到最后一页
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  // 当前页数据
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSelectAll = () => {
    // 全选范围限定为当前页，避免误操作不可见的任务
    const pagedIds = paged.map((t) => t.id);
    const allPagedSelected = pagedIds.length > 0 && pagedIds.every((id) => selectedTaskIds.includes(id));
    if (allPagedSelected) {
      setSelectedTaskIds(selectedTaskIds.filter((id) => !pagedIds.includes(id)));
    } else {
      setSelectedTaskIds([...new Set([...selectedTaskIds, ...pagedIds])]);
    }
  };

  // 当前页是否已全选（用于表头 checkbox 状态）
  const isPageAllSelected =
    paged.length > 0 && paged.every((t) => selectedTaskIds.includes(t.id));

  const toggleSelectTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedTaskIds.includes(id)) {
      setSelectedTaskIds(selectedTaskIds.filter((item) => item !== id));
    } else {
      setSelectedTaskIds([...selectedTaskIds, id]);
    }
  };

  const handleBatchStatusChange = (status: TaskStatus) => {
    selectedTaskIds.forEach((id) => onUpdateTaskStatus(id, status));
    setSelectedTaskIds([]);
  };

  const statusMap: Record<TaskStatus, { label: string; color: string }> = {
    backlog: { label: 'Backlog', color: 'bg-slate-100 text-slate-700 border-slate-300' },
    todo: { label: '待办', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    in_progress: { label: '进行中', color: 'bg-amber-100 text-amber-700 border-amber-300' },
    review: { label: '测试', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    done: { label: '已完成', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
            <ListFilter className="w-4 h-4 text-emerald-600" />
            <span>筛选:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
          >
            <option value="all">全状态 ({tasks.length})</option>
            <option value="backlog">Backlog 积压</option>
            <option value="todo">待办 (To Do)</option>
            <option value="in_progress">进行中 (In Progress)</option>
            <option value="review">测试 (Test)</option>
            <option value="done">已完成 (Done)</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
          >
            <option value="all">全优先级</option>
            <option value="urgent">紧急 (Urgent)</option>
            <option value="high">高级 (High)</option>
            <option value="medium">中等 (Medium)</option>
            <option value="low">低级 (Low)</option>
          </select>
        </div>

        {/* Batch Operations Bar: 列表不允许改状态，仅显示已选数量提示 */}
        {selectedTaskIds.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl text-xs text-slate-600 animate-fadeIn">
            <span className="font-bold text-slate-700">已选 {selectedTaskIds.length} 项</span>
            <span className="flex items-center gap-1 text-slate-500">
              <Lock className="w-3 h-3" />
              列表视图不允许修改状态，请到看板/任务详情中操作
            </span>
          </div>
        )}

        <div className="text-xs text-slate-500 font-mono">
          共 {sorted.length} 条任务
          {totalPages > 1 && <span className="ml-1 text-slate-400">· 第 {currentPage}/{totalPages} 页</span>}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isPageAllSelected}
                    onChange={toggleSelectAll}
                    title="全选/取消全选当前页"
                    className="rounded border-slate-300 bg-white text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="p-0 w-1.5" aria-label="颜色标记"></th>
                <th className="p-3 w-28 cursor-pointer hover:text-slate-800" onClick={() => { setSortField('id'); setSortAsc(!sortAsc); }}>
                  <div className="flex items-center gap-1">
                    <span>任务编号</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3">任务标题 & 标签</th>
                <th className="p-3 w-32">当前状态</th>
                <th className="p-3 w-28 cursor-pointer hover:text-slate-800" onClick={() => { setSortField('priority'); setSortAsc(!sortAsc); }}>
                  <div className="flex items-center gap-1">
                    <span>优先级</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 w-32">经办团队</th>
                <th className="p-3 w-28 cursor-pointer hover:text-slate-800" onClick={() => { setSortField('dueDate'); setSortAsc(!sortAsc); }}>
                  <div className="flex items-center gap-1">
                    <span>截止日期</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 w-20 text-center">工时</th>
                <th className="p-3 w-16 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {paged.map((task) => {
                const isSelected = selectedTaskIds.includes(task.id);
                const st = statusMap[task.status];
                const taskColor = getTaskColor(task.color);

                return (
                  <tr
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className={`hover:brightness-95 transition-all cursor-pointer ${taskColor.bg || ''} ${
                      isSelected ? 'ring-1 ring-inset ring-emerald-400' : ''
                    }`}
                  >
                    <td className="p-3 text-center" onClick={(e) => toggleSelectTask(task.id, e)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-300 bg-white text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-0 w-1.5" aria-label="颜色标记">
                      {task.color && task.color !== 'none' && (
                        <span className={`block w-full h-full ${taskColor.bar}`} title={taskColor.label} />
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-500 hover:text-emerald-600">
                      {task.id}
                    </td>
                    <td className="p-3 max-w-md">
                      <div className="font-semibold text-slate-900 hover:text-emerald-700 transition-colors mb-0.5">
                        {task.title}
                      </div>
                      {task.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 leading-relaxed mb-1 font-sans">
                          {task.description.replace(/[#*`_~>[\]]/g, '')}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {(task.tags || []).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded border ${st.color}`}
                        title="列表视图不允许修改状态（请在看板或任务详情中操作）"
                      >
                        <Lock className="w-3 h-3 opacity-60" />
                        {st.label}
                      </span>
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={task.priority}
                        onChange={(e) => onUpdateTaskPriority(task.id, e.target.value as TaskPriority)}
                        disabled={!canEditPriority}
                        title={canEditPriority ? '修改任务优先级' : '仅管理员 / 产品经理可修改优先级'}
                        className={`text-xs font-semibold rounded px-2 py-1 focus:outline-none border border-slate-200 ${
                          canEditPriority
                            ? 'bg-white text-slate-800 cursor-pointer'
                            : 'bg-slate-50 text-slate-500 cursor-not-allowed opacity-70'
                        }`}
                      >
                        <option value="urgent">🔴 紧急 Urgent</option>
                        <option value="high">🟠 高级 High</option>
                        <option value="medium">🔵 中等 Medium</option>
                        <option value="low">⚪ 低级 Low</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center -space-x-1.5">
                        {(task.assigneeIds || []).map((assigneeId) => {
                          const m = members.find((mem) => mem.id === assigneeId);
                          if (!m) return null;
                          return (
                            <img
                              key={m.id}
                              src={m.avatar}
                              alt={m.name}
                              title={m.name}
                              className="w-6 h-6 rounded-full object-cover ring-2 ring-white"
                            />
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{task.dueDate}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600 font-semibold">
                      {task.estimatedHours}h
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="删除任务"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {paged.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 text-sm">
                    没有找到匹配的任务
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页控件 */}
        <Pagination
          totalItems={sorted.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};
