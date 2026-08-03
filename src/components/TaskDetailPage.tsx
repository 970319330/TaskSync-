import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority, Member, ChecklistItem } from '../types';
import { RichTextEditor } from './RichTextEditor';
import Markdown from 'react-markdown';
import {
  ArrowLeft,
  Clock,
  CheckSquare,
  MessageSquare,
  History,
  User,
  Plus,
  Trash2,
  Calendar,
  Tag,
  AlertCircle,
  Send,
  Share2,
  Sparkles,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  ChevronRight,
  FolderKanban,
  FileText,
  Play,
  Pause,
  CheckCircle2,
  Edit3,
} from 'lucide-react';

interface TaskDetailPageProps {
  task: Task;
  members: Member[];
  currentMember: Member;
  projectName?: string;
  onBack: () => void;
  onUpdateTask: (updated: Partial<Task>) => void;
  onAddComment: (taskId: string, content: string) => void;
  onDeleteTask?: (taskId: string) => void;
}

export const TaskDetailPage: React.FC<TaskDetailPageProps> = ({
  task,
  members,
  currentMember,
  projectName = '项目',
  onBack,
  onUpdateTask,
  onAddComment,
  onDeleteTask,
}) => {
  const [activeTab, setActiveTab] = useState<'comments' | 'activities'>('comments');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(task.title);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const checklist = task.checklist || [];
  const comments = task.comments || [];
  const activities = task.activities || (task as any).history || [];
  const assigneeIds = task.assigneeIds || [];
  const tags = task.tags || [];

  const completedChecklist = checklist.filter((c) => c.completed).length;
  const totalChecklist = checklist.length;
  const checklistPercent =
    totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  // Copy Task Link
  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

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
    let updatedAssignees = [...assigneeIds];
    if (updatedAssignees.includes(memberId)) {
      updatedAssignees = updatedAssignees.filter((id) => id !== memberId);
    } else {
      updatedAssignees.push(memberId);
    }
    onUpdateTask({ assigneeIds: updatedAssignees });
  };

  // Add Tag
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    if (tags.includes(newTagInput.trim())) return;

    onUpdateTask({ tags: [...tags, newTagInput.trim()] });
    setNewTagInput('');
  };

  // Remove Tag
  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateTask({ tags: tags.filter((t) => t !== tagToRemove) });
  };

  // AI Auto Decompose Checklist
  const handleAiAutoDecompose = async () => {
    setIsDecomposing(true);
    try {
      const res = await fetch('/api/copilot/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: `${task.title}: ${task.description}` }),
      });
      const data = await res.json();
      if (data.checklist && data.checklist.length > 0) {
        const newItems = data.checklist.map((itemTitle: string, idx: number) => ({
          id: `chk_ai_${Date.now()}_${idx}`,
          title: itemTitle,
          completed: false,
        }));
        onUpdateTask({ checklist: [...checklist, ...newItems] });
      }
    } catch (err) {
      console.error('AI Decompose failed:', err);
    } finally {
      setIsDecomposing(false);
    }
  };

  const reporter = members.find((m) => m.id === task.reporterId);

  // 状态徽章映射
  const statusBadgeMap: Record<TaskStatus, { label: string; cls: string }> = {
    backlog: { label: 'Backlog 积压', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    todo: { label: '待办 (To Do)', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    in_progress: { label: '进行中 (In Progress)', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    review: { label: '代码评审 (Code Review)', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    done: { label: '已完成 (Done)', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  // 优先级徽章映射
  const priorityBadgeMap: Record<TaskPriority, { label: string; cls: string }> = {
    urgent: { label: '🔴 紧急 (Urgent)', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    high: { label: '🟠 高级 (High)', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
    medium: { label: '🔵 中等 (Medium)', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    low: { label: '⚪ 低级 (Low)', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  };

  // 操作栏状态按钮可见性
  const showStart = task.status === 'todo' || task.status === 'backlog';
  const showPause = task.status === 'in_progress';
  const showComplete = task.status !== 'done';

  const handleStart = () => onUpdateTask({ status: 'in_progress' });
  const handlePause = () => onUpdateTask({ status: 'todo' });
  const handleComplete = () => onUpdateTask({ status: 'done' });

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 animate-fadeIn">
      
      {/* Top Breadcrumb & Action Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Back Button & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回看板 / 任务列表</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <FolderKanban className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium text-slate-600">{projectName}</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                {task.id}
              </span>
            </div>
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex items-center gap-2">
            {/* 主操作:状态流转(开始 / 暂停 / 完成) */}
            {showStart && (
              <button
                onClick={handleStart}
                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>开始</span>
              </button>
            )}

            {showPause && (
              <button
                onClick={handlePause}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>暂停</span>
              </button>
            )}

            {showComplete && (
              <button
                onClick={handleComplete}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>完成</span>
              </button>
            )}

            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            {/* 次操作:编辑 / 完成编辑 */}
            <button
              onClick={() => setIsEditing((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isEditing
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? '完成编辑' : '编辑'}</span>
            </button>

            {/* 辅助操作:AI 拆解 / 分享 / 删除 */}
            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            <button
              onClick={handleAiAutoDecompose}
              disabled={isDecomposing}
              className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
            >
              {isDecomposing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              )}
              <span>AI 一键拆解子任务</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? '已复制链接' : '分享链接'}</span>
            </button>

            {onDeleteTask && (
              <button
                onClick={() => {
                  if (window.confirm('确定要彻底删除此任务吗？')) {
                    onDeleteTask(task.id);
                    onBack();
                  }
                }}
                className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                title="删除任务"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        
        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Main Content Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Header Title Banner Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">

              {/* 顶部:任务ID + 状态徽章 + 优先级徽章 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-lg">
                  {task.id}
                </span>
                {!isEditing && (
                  <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-lg border ${statusBadgeMap[task.status].cls}`}>
                    {statusBadgeMap[task.status].label}
                  </span>
                )}
                {!isEditing && (
                  <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-lg border ${priorityBadgeMap[task.priority].cls}`}>
                    {priorityBadgeMap[task.priority].label}
                  </span>
                )}
              </div>

              {/* Task Title (Editable in edit mode only) */}
              <div>
                {isEditing && isEditingTitle ? (
                  <input
                    type="text"
                    value={titleText}
                    onChange={(e) => setTitleText(e.target.value)}
                    onBlur={() => {
                      onUpdateTask({ title: titleText });
                      setIsEditingTitle(false);
                    }}
                    className="w-full text-2xl sm:text-3xl font-extrabold bg-white border-2 border-emerald-500 rounded-2xl px-4 py-2 text-slate-900 focus:outline-none shadow-xs"
                    autoFocus
                  />
                ) : (
                  <h1
                    onClick={() => isEditing && setIsEditingTitle(true)}
                    className={`text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight ${
                      isEditing ? 'hover:text-emerald-700 transition-colors cursor-pointer' : 'cursor-default'
                    }`}
                    title={isEditing ? '点击可编辑标题' : ''}
                  >
                    {task.title}
                  </h1>
                )}
              </div>

              {/* 底部:创建者 + 创建时间 + 截止日期(关键元信息) */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 border-t border-slate-100 pt-4">
                {reporter && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>创建者</span>
                    <span className="font-semibold text-slate-800">{reporter.name}</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>创建于 {new Date(task.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </span>
                <span className="flex items-center gap-1.5 text-rose-600">
                  <Clock className="w-3.5 h-3.5" />
                  <span>截止 {task.dueDate || '-'}</span>
                </span>
              </div>

            </div>

            {/* Rich Text Task Description Editor */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>{isEditing ? '需求正文与详细描述' : '任务描述'}</span>
                </h3>
                {isEditing && (
                  <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full">
                    ✨ 支持 Rich Text / Markdown 实时渲染
                  </span>
                )}
              </div>

              <RichTextEditor
                value={task.description}
                onChange={(newDesc) => onUpdateTask({ description: newDesc })}
                placeholder="详细说明此任务的实施目标、技术规格、交互原型、接口约定或验收标准..."
                minHeight="280px"
                readOnly={!isEditing}
              />
            </div>

            {/* Checklist & Subtasks Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    子任务拆解清单 ({completedChecklist}/{totalChecklist})
                  </h3>
                </div>
                <span className="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                  {checklistPercent}% 完成度
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${checklistPercent}%` }}
                />
              </div>

              {/* Checklist Items */}
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      item.completed
                        ? 'bg-emerald-50/40 border-emerald-200/60 text-slate-400 line-through'
                        : 'bg-slate-50/60 border-slate-200 text-slate-800'
                    }`}
                  >
                    <label className={`flex items-center gap-3 flex-1 ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleChecklist(item.id)}
                        disabled={!isEditing}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-medium leading-relaxed">{item.title}</span>
                    </label>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {checklist.length === 0 && !isEditing && (
                  <p className="text-xs text-slate-400 italic text-center py-3">暂无子任务拆解项</p>
                )}
              </div>

              {/* Add New Subtask Form (edit mode only) */}
              {isEditing && (
              <form onSubmit={handleAddChecklistItem} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="新增子任务拆解项..."
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!newChecklistTitle.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs disabled:opacity-40 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加项</span>
                </button>
              </form>
              )}
            </div>

            {/* Discussions & Audit Trail */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
              
              {/* Tabs header */}
              <div className="flex items-center gap-4 border-b border-slate-200 pb-3">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`flex items-center gap-2 text-xs font-bold pb-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'comments'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>讨论与评论 ({comments.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('activities')}
                  className={`flex items-center gap-2 text-xs font-bold pb-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'activities'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>动态履历 ({activities.length})</span>
                </button>
              </div>

              {/* Tab Content 1: Comments */}
              {activeTab === 'comments' && (
                <div className="space-y-6">
                  {/* Comments feed */}
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                    {comments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-6">
                        暂无讨论内容，在下方输入观点开启协同讨论...
                      </p>
                    ) : (
                      comments.map((comment) => {
                        const author = members.find((m) => m.id === comment.authorId);
                        return (
                          <div key={comment.id} className="flex gap-3 text-xs bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
                            <img
                              src={author?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={author?.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                            />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">{author?.name || '未知成员'}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(comment.createdAt).toLocaleTimeString('zh-CN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <div className="prose prose-slate max-w-none text-xs text-slate-700 leading-relaxed">
                                <Markdown>{comment.content}</Markdown>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add comment form */}
                  <form onSubmit={handleSendComment} className="flex gap-2 pt-2">
                    <img
                      src={currentMember.avatar}
                      alt={currentMember.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0 mt-1"
                    />
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        placeholder="表达观点或针对方案提出修改意见..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                      />
                      <button
                        type="submit"
                        disabled={!newCommentText.trim()}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-40 transition-all cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>发送</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab Content 2: History Log */}
              {activeTab === 'activities' && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activities.map((h: any) => {
                    const actor = members.find((m) => m.id === (h.authorId || h.actorId));
                    return (
                      <div key={h.id} className="flex items-start gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <img
                          src={actor?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={actor?.name}
                          className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="text-slate-800 font-medium">
                            <span className="font-bold text-slate-900">{actor?.name}</span> {h.action}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(h.timestamp).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>

          {/* Right Column: Task Properties Sidebar (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-6">
            
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                {isEditing ? '⚙️ 属性配置' : '任务属性'}
              </h3>
              {isEditing && (
                <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                  AUTO-SAVED
                </span>
              )}
            </div>

            {/* Status & Priority Selectors (编辑态显示;只读时已在标题区展示) */}
            {isEditing && (
            <div className="space-y-4">

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                  任务状态
                </label>
                <select
                  value={task.status}
                  onChange={(e) => onUpdateTask({ status: e.target.value as TaskStatus })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="backlog">Backlog 积压</option>
                  <option value="todo">待办 (To Do)</option>
                  <option value="in_progress">进行中 (In Progress)</option>
                  <option value="review">代码评审 (Code Review)</option>
                  <option value="done">已完成 (Done)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                  优先级
                </label>
                <select
                  value={task.priority}
                  onChange={(e) => onUpdateTask({ priority: e.target.value as TaskPriority })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="urgent">🔴 紧急 (Urgent)</option>
                  <option value="high">🟠 高级 (High)</option>
                  <option value="medium">🔵 中等 (Medium)</option>
                  <option value="low">⚪ 低级 (Low)</option>
                </select>
              </div>

            </div>
            )}

            {/* Assignees */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                指派经办人 ({assigneeIds.length})
              </label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {isEditing
                  ? members.map((m) => {
                      const isSelected = assigneeIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleToggleAssignee(m.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <img src={m.avatar} alt={m.name} className="w-4 h-4 rounded-full object-cover" />
                          <span>{m.name.split(' ')[0]}</span>
                        </button>
                      );
                    })
                  : assigneeIds.length > 0
                    ? assigneeIds.map((id) => {
                        const m = members.find((mb) => mb.id === id);
                        if (!m) return null;
                        return (
                          <span
                            key={id}
                            className="px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 border bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                          >
                            <img src={m.avatar} alt={m.name} className="w-4 h-4 rounded-full object-cover" />
                            <span>{m.name.split(' ')[0]}</span>
                          </span>
                        );
                      })
                    : <span className="text-xs text-slate-400 italic">未指派经办人</span>}
              </div>
            </div>

            {/* Dates & Schedule */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                时间周期与计划
              </label>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">开始日期</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={task.startDate}
                      onChange={(e) => onUpdateTask({ startDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  ) : (
                    <span className="block bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-slate-800">
                      {task.startDate || '—'}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">截止日期</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={task.dueDate}
                      onChange={(e) => onUpdateTask({ dueDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  ) : (
                    <span className="block bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-slate-800">
                      {task.dueDate || '—'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Estimated & Logged Hours */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                工时估算与耗时
              </label>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">预估工时(h)</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={task.estimatedHours}
                      onChange={(e) => onUpdateTask({ estimatedHours: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  ) : (
                    <span className="block bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-slate-800">
                      {task.estimatedHours}h
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">实际已用(h)</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={task.loggedHours || 0}
                      onChange={(e) => onUpdateTask({ loggedHours: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    />
                  ) : (
                    <span className="block bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-slate-800">
                      {task.loggedHours || 0}h
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                任务标签
              </label>

              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1"
                  >
                    <span>#{tag}</span>
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-emerald-500 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {tags.length === 0 && !isEditing && (
                  <span className="text-xs text-slate-400 italic">暂无标签</span>
                )}
              </div>

              {isEditing && (
              <form onSubmit={handleAddTag} className="flex gap-2">
                <input
                  type="text"
                  placeholder="添加新标签..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!newTagInput.trim()}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
                >
                  添加
                </button>
              </form>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
