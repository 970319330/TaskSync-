import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority, Member, ChecklistItem } from '../types';
import { RichTextEditor } from './RichTextEditor';
import {
  X,
  Clock,
  CheckSquare,
  MessageSquare,
  History,
  User,
  Plus,
  Trash2,
  Paperclip,
  Calendar,
  Tag,
  AlertCircle,
  Send,
} from 'lucide-react';

interface TaskDetailModalProps {
  task: Task;
  members: Member[];
  currentMember: Member;
  onClose: () => void;
  onUpdateTask: (updated: Partial<Task>) => void;
  onAddComment: (taskId: string, content: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  members,
  currentMember,
  onClose,
  onUpdateTask,
  onAddComment,
}) => {
  const [activeTab, setActiveTab] = useState<'comments' | 'activities'>('comments');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(task.title);

  const checklist = task.checklist || [];
  const comments = task.comments || [];
  const activities = task.activities || (task as any).history || [];
  const assigneeIds = task.assigneeIds || [];
  const tags = task.tags || [];

  const completedChecklist = checklist.filter((c) => c.completed).length;
  const totalChecklist = checklist.length;
  const checklistPercent =
    totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  // Toggle Checklist Item
  const handleToggleChecklist = (checkId: string) => {
    const updatedChecklist = checklist.map((item) =>
      item.id === checkId ? { ...item, completed: !item.completed } : item
    );
    onUpdateTask({ checklist: updatedChecklist });
  };

  // Add Checklist Item
  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;

    const newItem: ChecklistItem = {
      id: `chk_${Date.now()}`,
      title: newChecklistTitle.trim(),
      completed: false,
    };
    onUpdateTask({ checklist: [...checklist, newItem] });
    setNewChecklistTitle('');
  };

  // Delete Checklist Item
  const handleDeleteChecklistItem = (checkId: string) => {
    const updatedChecklist = checklist.filter((item) => item.id !== checkId);
    onUpdateTask({ checklist: updatedChecklist });
  };

  // Submit Comment
  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    onAddComment(task.id, newCommentText.trim());
    setNewCommentText('');
  };

  // Toggle Assignee
  const handleToggleAssignee = (memberId: string) => {
    let updatedAssignees = [...task.assigneeIds];
    if (updatedAssignees.includes(memberId)) {
      updatedAssignees = updatedAssignees.filter((id) => id !== memberId);
    } else {
      updatedAssignees.push(memberId);
    }
    onUpdateTask({ assigneeIds: updatedAssignees });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn text-slate-800">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              {task.id}
            </span>

            {/* Status Picker */}
            <select
              value={task.status}
              onChange={(e) => onUpdateTask({ status: e.target.value as TaskStatus })}
              className="bg-white border border-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
            >
              <option value="backlog">Backlog 积压</option>
              <option value="todo">待办 (To Do)</option>
              <option value="in_progress">进行中 (In Progress)</option>
              <option value="review">代码评审 (Code Review)</option>
              <option value="done">已完成 (Done)</option>
            </select>

            {/* Priority Picker */}
            <select
              value={task.priority}
              onChange={(e) => onUpdateTask({ priority: e.target.value as TaskPriority })}
              className="bg-white border border-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
            >
              <option value="urgent">🔴 紧急 (Urgent)</option>
              <option value="high">🟠 高级 (High)</option>
              <option value="medium">🔵 中等 (Medium)</option>
              <option value="low">⚪ 低级 (Low)</option>
            </select>

            {/* Quick Flow to Test Button */}
            {task.status !== 'review' && task.status !== 'done' && (
              <button
                onClick={() => onUpdateTask({ completeDevAndFlow: true, status: 'review' })}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1 shadow-2xs transition-all cursor-pointer ml-1"
                title="开发完成，自动流转至测试/代码评审并转交测试人员"
              >
                🚀 开发完成，提交测试
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Title */}
            <div>
              {isEditingTitle ? (
                <input
                  type="text"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  onBlur={() => {
                    onUpdateTask({ title: titleText });
                    setIsEditingTitle(false);
                  }}
                  className="w-full text-xl font-bold bg-white border border-emerald-500 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none shadow-2xs"
                  autoFocus
                />
              ) : (
                <h2
                  onClick={() => setIsEditingTitle(true)}
                  className="text-xl font-bold text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer"
                  title="点击编辑标题"
                >
                  {task.title}
                </h2>
              )}
            </div>

            {/* Description (Rich Text) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  任务描述与需求正文 (富文本)
                </label>
                <span className="text-[10px] text-emerald-600 font-medium">✨ 支持 Rich Text / Markdown 实时渲染</span>
              </div>
              <RichTextEditor
                value={task.description}
                onChange={(newDesc) => onUpdateTask({ description: newDesc })}
                placeholder="详细说明此任务的实现目标、交付产物与关联规则..."
                minHeight="200px"
              />
            </div>

            {/* Checklist Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  <span>子任务拆解清单 ({completedChecklist}/{totalChecklist})</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700">{checklistPercent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-600 to-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${checklistPercent}%` }}
                />
              </div>

              {/* Checklist Items */}
              <div className="space-y-2 pt-1">
                {task.checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-2xs"
                  >
                    <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleChecklist(item.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <span className={item.completed ? 'line-through text-slate-400' : ''}>
                        {item.title}
                      </span>
                    </label>

                    <button
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add Checklist Input */}
                <form onSubmit={handleAddChecklistItem} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    placeholder="添加新子项..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                  <button
                    type="submit"
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加
                  </button>
                </form>
              </div>
            </div>

            {/* Comments & Audit Trail Tabs */}
            <div className="space-y-3">
              <div className="flex border-b border-slate-200 text-xs font-semibold gap-6">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`pb-2.5 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'comments'
                      ? 'border-emerald-600 text-emerald-700 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>讨论与意见 ({comments.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('activities')}
                  className={`pb-2.5 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'activities'
                      ? 'border-emerald-600 text-emerald-700 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>状态轨迹与变更历史 ({activities.length})</span>
                </button>
              </div>

              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <div className="space-y-4">
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {comments.map((cm) => {
                      const author = members.find((m) => m.id === cm.authorId) || {
                        name: '未知成员',
                        avatar: '',
                      };
                      return (
                        <div key={cm.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex gap-3">
                          <img
                            src={author.avatar}
                            alt={author.name}
                            className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-900">{author.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{cm.createdAt}</span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">{cm.content}</p>
                          </div>
                        </div>
                      );
                    })}

                    {comments.length === 0 && (
                      <div className="text-slate-400 text-xs text-center py-4">暂无讨论留言</div>
                    )}
                  </div>

                  {/* Comment Input */}
                  <form onSubmit={handleSendComment} className="flex gap-2">
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="发表评论或 @团队成员..."
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      发送
                    </button>
                  </form>
                </div>
              )}

              {/* Activity Trail Tab */}
              {activeTab === 'activities' && (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 text-xs">
                  {task.activities.map((act) => {
                    const author = members.find((m) => m.id === act.authorId)?.name || '系统';
                    return (
                      <div key={act.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-700">{author}</span>
                          <span>{act.action}</span>
                          {act.details && <span className="font-semibold text-slate-900">{act.details}</span>}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{act.timestamp}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Properties (Right 1 col) */}
          <div className="space-y-5 bg-slate-50 border border-slate-200 p-4 rounded-2xl h-fit">
            
            {/* Assignees */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                经办团队成员 (Assignees)
              </label>
              <div className="space-y-1.5">
                {members.map((m) => {
                  const isAssigned = task.assigneeIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleToggleAssignee(m.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between border transition-all cursor-pointer ${
                        isAssigned
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img src={m.avatar} alt={m.name} className="w-5 h-5 rounded-full object-cover" />
                        <span className="truncate">{m.name}</span>
                      </div>
                      {isAssigned && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium">已指派</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dates & Estimates */}
            <div className="space-y-3 pt-3 border-t border-slate-200 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">开始日期</label>
                <input
                  type="date"
                  value={task.startDate}
                  onChange={(e) => onUpdateTask({ startDate: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">截止日期</label>
                <input
                  type="date"
                  value={task.dueDate}
                  onChange={(e) => onUpdateTask({ dueDate: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">评估工时 (小时)</label>
                <input
                  type="number"
                  value={task.estimatedHours}
                  onChange={(e) => onUpdateTask({ estimatedHours: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* QA Workflow Transition Settings */}
            <div className="pt-3 border-t border-slate-200 text-xs space-y-2">
              <label className="text-xs font-semibold text-slate-700 block uppercase tracking-wider">
                测试/审核流转设置
              </label>
              <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-150 space-y-2">
                <div>
                  <span className="text-slate-600 block mb-1">测试负责人 (Tester)</span>
                  <select
                    value={task.testerId || ''}
                    onChange={(e) => onUpdateTask({ testerId: e.target.value })}
                    className="w-full bg-white border border-indigo-200 rounded-lg p-1.5 text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="">未指定 (保留原经办人)</option>
                    {(members || []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={task.autoFlowToTest !== false}
                    onChange={(e) => onUpdateTask({ autoFlowToTest: e.target.checked })}
                    className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-700 font-medium">开发完成自动流转测试</span>
                </label>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
