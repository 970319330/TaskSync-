import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, Member, ChecklistItem, Role, TaskColorKey, TASK_COLORS, getTaskColor, TaskFeedback } from '../types';
import { hasPermission } from '../permissions';
import { RichTextEditor } from './RichTextEditor';
import { startDevInTrae, getProjectPath } from '../utils/trae';
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
  Palette,
  Lock,
  GitBranch,
  FileCode2,
  Package,
  ClipboardCheck,
} from 'lucide-react';

interface TaskDetailPageProps {
  task: Task;
  members: Member[];
  roles: Role[];
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
  roles,
  currentMember,
  projectName = '项目',
  onBack,
  onUpdateTask,
  onAddComment,
  onDeleteTask,
}) => {
  const [activeTab, setActiveTab] = useState<'comments' | 'activities' | 'feedbacks'>('comments');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(task.title);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // 弹窗显示时禁止背景滚动
  useEffect(() => {
    document.body.style.overflow = showCompleteModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showCompleteModal]);

  const checklist = task.checklist || [];
  const comments = task.comments || [];
  const activities = task.activities || (task as any).history || [];
  const feedbacks = task.feedbacks || [];
  const assigneeIds = task.assigneeIds || [];
  const tags = task.tags || [];

  const completedChecklist = checklist.filter((c) => c.completed).length;
  const totalChecklist = checklist.length;
  const checklistPercent =
    totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  // 权限判断:管理员或子任务负责人才能勾选完成
  const canToggleChecklist = (item: ChecklistItem) => {
    return currentMember.isAdmin || item.assigneeId === currentMember.id || task.reporterId === currentMember.id;
  };

  // 权限判断:是否有指派任务权限
  const canAssignTask = hasPermission(currentMember, 'assign_task', roles);

  // 操作权限：admin/PM 可操作所有任务；普通用户仅能操作自己是经办人的任务（报告人只读）
  const canEditTask = canAssignTask || (task.assigneeIds?.includes(currentMember.id) ?? false);

  // Copy Task Link
  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Toggle Checklist Item
  const handleToggleChecklist = (checkId: string) => {
    const targetItem = checklist.find((item) => item.id === checkId);
    if (!targetItem) return;

    // 权限检查:非管理员且非本人子任务不能操作
    if (!canToggleChecklist(targetItem)) return;

    const willComplete = !targetItem.completed;
    const updatedChecklist = checklist.map((item) =>
      item.id === checkId ? { ...item, completed: willComplete } : item
    );
    onUpdateTask({ checklist: updatedChecklist });

    // 勾选完成后,如果全部子任务完成且主任务未完结,弹出完结确认
    if (willComplete && updatedChecklist.length > 0 && updatedChecklist.every((item) => item.completed) && task.status !== 'done') {
      setShowCompleteModal(true);
    }
  };

  // Add Checklist Item
  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;

    const newItem: ChecklistItem = {
      id: `chk_${Date.now()}`,
      title: newChecklistTitle.trim(),
      completed: false,
      assigneeId: newSubtaskAssignee || undefined,
    };
    // 自动将子任务负责人合并到主任务经办人列表
    const updatedAssigneeIds = newSubtaskAssignee && !assigneeIds.includes(newSubtaskAssignee)
      ? [...assigneeIds, newSubtaskAssignee]
      : assigneeIds;
    onUpdateTask({ checklist: [...checklist, newItem], assigneeIds: updatedAssigneeIds });
    setNewChecklistTitle('');
    setNewSubtaskAssignee('');
  };

  // Delete Checklist Item
  const handleDeleteChecklistItem = (checkId: string) => {
    const updatedChecklist = checklist.filter((item) => item.id !== checkId);
    onUpdateTask({ checklist: updatedChecklist });
  };

  // Edit Checklist Item Title
  const handleStartEditChecklist = (item: ChecklistItem) => {
    setEditingChecklistId(item.id);
    setEditingChecklistTitle(item.title);
  };

  const handleSaveChecklistTitle = () => {
    if (!editingChecklistId) return;
    const trimmed = editingChecklistTitle.trim();
    if (!trimmed) {
      setEditingChecklistId(null);
      return;
    }
    const updatedChecklist = checklist.map((item) =>
      item.id === editingChecklistId ? { ...item, title: trimmed } : item
    );
    onUpdateTask({ checklist: updatedChecklist });
    setEditingChecklistId(null);
    setEditingChecklistTitle('');
  };

  // Update Checklist Item Assignee
  const handleUpdateChecklistAssignee = (checkId: string, assigneeId: string) => {
    const updatedChecklist = checklist.map((item) =>
      item.id === checkId ? { ...item, assigneeId: assigneeId || undefined } : item
    );
    // 自动将新指派人员合并到主任务经办人列表
    const updatedAssigneeIds = assigneeId && !assigneeIds.includes(assigneeId)
      ? [...assigneeIds, assigneeId]
      : assigneeIds;
    onUpdateTask({ checklist: updatedChecklist, assigneeIds: updatedAssigneeIds });
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
      if (!res.ok) {
        console.error('AI Decompose error:', data.error);
        return;
      }
      if (data.checklist && data.checklist.length > 0) {
        const newItems = data.checklist.map((item: any, idx: number) => ({
          id: `chk_ai_${Date.now()}_${idx}`,
          title: typeof item === 'string' ? item : item.title,
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
    review: { label: '测试 (Test)', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    done: { label: '已完成 (Done)', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  // 优先级徽章映射
  const priorityBadgeMap: Record<TaskPriority, { label: string; cls: string }> = {
    urgent: { label: '🔴 紧急 (Urgent)', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    high: { label: '🟠 高级 (High)', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
    medium: { label: '🔵 中等 (Medium)', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    low: { label: '⚪ 低级 (Low)', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  };

  const taskColor = getTaskColor(task.color);

  // 操作栏状态按钮可见性
  const showStart = task.status === 'todo' || task.status === 'backlog';
  const showPause = task.status === 'in_progress';
  const showComplete = task.status !== 'done';
  const showFlowToTest = task.status !== 'review' && task.status !== 'done';

  const handleStart = () => {
    onUpdateTask({ status: 'in_progress' });
    const projectPath = getProjectPath(task.projectId);
    console.log('[startDev] projectId=', task.projectId, 'projectPath=', projectPath);
    if (projectPath) {
      startDevInTrae(projectPath);
    } else {
      console.warn('[startDev] 未配置项目本地路径,请先通过 setProjectPath(projectId, path) 设置');
    }
  };
  const handlePause = () => onUpdateTask({ status: 'todo' });
  const handleComplete = () => onUpdateTask({ status: 'done' });
  const handleFlowToTest = () => {
    onUpdateTask({ completeDevAndFlow: true, status: 'review' });
  };

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
              {task.color && task.color !== 'none' && (
                <span
                  className={`w-2.5 h-2.5 rounded-full ${taskColor.bar} ring-2 ring-white shadow-2xs`}
                  title={`颜色标记: ${taskColor.label}`}
                />
              )}
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                {task.id}
              </span>
            </div>
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex items-center gap-2">
            {/* 核心快捷操作:开发完成提交测试 */}
            {showFlowToTest && canEditTask && (
              <button
                onClick={handleFlowToTest}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="开发完成，自动流转至测试并转交测试负责人"
              >
                <span>🚀 开发完成，提交测试</span>
              </button>
            )}

            {/* 主操作:状态流转(开始 / 暂停 / 完成) */}
            {showStart && canEditTask && (
              <button
                onClick={handleStart}
                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>开始</span>
              </button>
            )}

            {showPause && canEditTask && (
              <button
                onClick={handlePause}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>暂停</span>
              </button>
            )}

            {showComplete && canEditTask && (
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
              onClick={() => canEditTask && setIsEditing((v) => !v)}
              disabled={!canEditTask}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                !canEditTask ? 'cursor-not-allowed opacity-40 bg-slate-100 text-slate-400 border-slate-200' :
                isEditing
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-xs cursor-pointer'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer'
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

      {/* 只读模式提示横幅 */}
      {!canEditTask && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-amber-800 font-medium">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>只读模式：你不是此任务的经办人，仅可查看不可编辑。如需修改请联系经办人或管理员。</span>
          </div>
        </div>
      )}

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
                    onClick={() => canEditTask && isEditing && setIsEditingTitle(true)}
                    className={`text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight ${
                      canEditTask && isEditing ? 'hover:text-emerald-700 transition-colors cursor-pointer' : 'cursor-default'
                    }`}
                    title={canEditTask && isEditing ? '点击可编辑标题' : ''}
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
                onChange={(newDesc) => canEditTask && onUpdateTask({ description: newDesc })}
                placeholder="详细说明此任务的实施目标、技术规格、交互原型、接口约定或验收标准..."
                minHeight="280px"
                readOnly={!isEditing || !canEditTask}
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
                {checklist.map((item) => {
                  const isEditingThis = editingChecklistId === item.id;
                  const canToggle = canToggleChecklist(item);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-2 p-3 rounded-2xl border transition-all ${
                        item.completed
                          ? 'bg-emerald-50/40 border-emerald-200/60 text-slate-400'
                          : 'bg-slate-50/60 border-slate-200 text-slate-800'
                      }`}
                    >
                      <label className={`flex items-center gap-3 flex-1 min-w-0 pt-0.5 ${canToggle ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleChecklist(item.id)}
                          disabled={!canToggle}
                          className={`w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0 ${canToggle ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                        />
                        {isEditingThis ? (
                          <input
                            type="text"
                            value={editingChecklistTitle}
                            onChange={(e) => setEditingChecklistTitle(e.target.value)}
                            onBlur={handleSaveChecklistTitle}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveChecklistTitle();
                              if (e.key === 'Escape') { setEditingChecklistId(null); setEditingChecklistTitle(''); }
                            }}
                            autoFocus
                            className={`flex-1 bg-white border border-emerald-300 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:border-emerald-500 shadow-xs ${
                              item.completed ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                          />
                        ) : (
                          <span
                            className={`text-xs font-medium leading-relaxed flex-1 ${item.completed ? 'line-through' : ''}`}
                            onDoubleClick={() => handleStartEditChecklist(item)}
                          >
                            {item.title}
                          </span>
                        )}
                      </label>

                      {/* Assignee */}
                      <div className="flex items-center shrink-0 pt-0.5">
                        <select
                          value={item.assigneeId || ''}
                          onChange={(e) => handleUpdateChecklistAssignee(item.id, e.target.value)}
                          disabled={!canAssignTask}
                          className={`text-[10px] border rounded-lg px-1.5 py-1 bg-white focus:outline-none focus:border-emerald-400 ${
                            canAssignTask ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                          } ${
                            item.assigneeId ? 'text-emerald-800 border-emerald-200 font-semibold' : 'text-slate-400 border-slate-200'
                          }`}
                        >
                          <option value="">未指派</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
                        {!isEditingThis && (
                          <button
                            type="button"
                            onClick={() => handleStartEditChecklist(item)}
                            className="p-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                            title="编辑标题"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteChecklistItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {checklist.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-3">暂无子任务拆解项</p>
                )}
              </div>

              {/* Add New Subtask Form */}
              <form onSubmit={handleAddChecklistItem} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="新增子任务..."
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
                <select
                  value={newSubtaskAssignee}
                  onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                  disabled={!canAssignTask}
                  className={`bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 shrink-0 ${
                    canAssignTask ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                  }`}
                >
                  <option value="">指派人员</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!canEditTask || !newChecklistTitle.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs disabled:opacity-40 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加</span>
                </button>
              </form>
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

                <button
                  onClick={() => setActiveTab('feedbacks')}
                  className={`flex items-center gap-2 text-xs font-bold pb-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'feedbacks'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>开发反馈 ({feedbacks.length})</span>
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
                        disabled={!canEditTask || !newCommentText.trim()}
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

              {/* Tab Content 3: Dev Feedback (结构化开发反馈) */}
              {activeTab === 'feedbacks' && (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {feedbacks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">
                      暂无开发反馈，Agent 完成开发后将通过 MCP 工具自动回写结构化结果
                    </p>
                  ) : (
                    feedbacks.map((fb) => {
                      const author = members.find((m) => m.id === fb.authorId);
                      return (
                        <div key={fb.id} className="bg-indigo-50/40 border border-indigo-200/60 rounded-2xl p-4 space-y-3">
                          {/* 反馈头部：作者 + 时间 */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <img
                                src={author?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                                alt={author?.name}
                                className="w-6 h-6 rounded-full object-cover shrink-0"
                              />
                              <span className="text-xs font-bold text-slate-900">{author?.name || fb.authorId}</span>
                              <span className="text-[10px] text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded font-medium">开发反馈</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {fb.createdAt}
                            </span>
                          </div>

                          {/* 完成内容总结 */}
                          <div className="text-xs text-slate-700 leading-relaxed bg-white/60 rounded-xl p-2.5 border border-slate-200/50">
                            <Markdown>{fb.summary}</Markdown>
                          </div>

                          {/* 修改文件清单 */}
                          {fb.changedFiles && fb.changedFiles.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                                <FileCode2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>修改文件 ({fb.changedFiles.length})</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {fb.changedFiles.map((f, i) => (
                                  <code key={i} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono border border-slate-200">
                                    {f}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 依赖变更 */}
                          {fb.dependencies && fb.dependencies.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                                <Package className="w-3.5 h-3.5 text-slate-500" />
                                <span>依赖变更 ({fb.dependencies.length})</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {fb.dependencies.map((d, i) => (
                                  <span key={i} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                                    {d}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Commit + PR 链接 */}
                          {(fb.commitHash || fb.prUrl) && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {fb.commitHash && (
                                <span className="flex items-center gap-1 text-[10px] bg-slate-800 text-slate-100 px-2 py-1 rounded-lg font-mono">
                                  <GitBranch className="w-3 h-3" />
                                  {fb.commitHash.slice(0, 8)}
                                </span>
                              )}
                              {fb.prUrl && (
                                <a
                                  href={fb.prUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-200 font-medium hover:bg-blue-100 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  PR / MR
                                </a>
                              )}
                            </div>
                          )}

                          {/* 注意事项 */}
                          {fb.notes && (
                            <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 leading-relaxed">
                              <span className="font-bold">注意事项：</span> {fb.notes}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
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
                  disabled={!canEditTask}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs ${canEditTask ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                >
                  <option value="backlog">Backlog 积压</option>
                  <option value="todo">待办 (To Do)</option>
                  <option value="in_progress">进行中 (In Progress)</option>
                  <option value="review">测试 (Test)</option>
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
                  disabled={!canEditTask}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs ${canEditTask ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                >
                  <option value="urgent">🔴 紧急 (Urgent)</option>
                  <option value="high">🟠 高级 (High)</option>
                  <option value="medium">🔵 中等 (Medium)</option>
                  <option value="low">⚪ 低级 (Low)</option>
                </select>
              </div>

              {/* 任务颜色标记 */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-emerald-600" />
                  <span>颜色标记</span>
                </label>
                <div className="flex flex-wrap gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2 shadow-2xs">
                  {TASK_COLORS.map((opt) => {
                    const isSelected = (task.color || 'none') === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => canEditTask && onUpdateTask({ color: opt.key } as Partial<Task>)}
                        title={canEditTask ? opt.label : '无操作权限'}
                        className={`relative w-5 h-5 rounded-full ${opt.bar} border-2 transition-all ${canEditTask ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-50'} ${
                          isSelected ? 'ring-2 ring-offset-1 ring-emerald-500 border-white' : 'border-white shadow-2xs'
                        }`}
                      >
                        {opt.key === 'none' && (
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 font-bold">/</span>
                        )}
                      </button>
                    );
                  })}
                  <span className="ml-auto self-center text-[11px] text-slate-500 font-medium pr-1">
                    {taskColor.label}
                  </span>
                </div>
              </div>

            </div>
            )}

            {/* Assignees */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                指派经办人 ({assigneeIds.length})
              </label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {isEditing && canAssignTask
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

            {/* QA Workflow Transition Settings */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                  测试/审核流转设置
                </label>
                {task.testerId && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    已关联测试人
                  </span>
                )}
              </div>

              <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100 space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-600 font-medium block mb-1">测试负责人 (Tester)</span>
                  {isEditing ? (
                    <select
                      value={task.testerId || ''}
                      onChange={(e) => onUpdateTask({ testerId: e.target.value })}
                      className="w-full bg-white border border-indigo-200 rounded-xl p-2 text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs font-medium"
                    >
                      <option value="">未指定 (保留原经办人)</option>
                      {(members || []).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  ) : (
                    (() => {
                      const tMember = members.find((m) => m.id === task.testerId);
                      return tMember ? (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs">
                          <img src={tMember.avatar} alt={tMember.name} className="w-4 h-4 rounded-full object-cover" />
                          <span className="font-semibold text-indigo-950">{tMember.name}</span>
                          <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">
                            {tMember.role}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">未指定测试负责人 (点击右上角编辑配置)</span>
                      );
                    })()
                  )}
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={task.autoFlowToTest !== false}
                      onChange={(e) => onUpdateTask({ autoFlowToTest: e.target.checked })}
                      className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-700 font-medium">
                      开发完成后自动流转至测试人
                    </span>
                  </label>
                </div>
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

      {/* 完结主任务确认弹窗 */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCompleteModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">所有子任务已完成</h3>
                <p className="text-xs text-slate-500 mt-0.5">是否将主任务标记为已完结？</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                暂不
              </button>
              <button
                onClick={() => {
                  onUpdateTask({ status: 'done' });
                  setShowCompleteModal(false);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                确认完结
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
