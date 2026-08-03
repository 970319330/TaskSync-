import React, { useState } from 'react';
import { Member, Project, TaskPriority, TaskStatus, ChecklistItem } from '../types';
import { X, Sparkles, Plus, Loader2, CheckSquare } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';

interface CreateTaskModalProps {
  initialStatus?: TaskStatus;
  members: Member[];
  projects: Project[];
  activeProject: Project;
  onClose: () => void;
  onSubmit: (newTask: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeIds: string[];
    projectId: string;
    startDate: string;
    dueDate: string;
    estimatedHours: number;
    tags: string[];
    checklist: ChecklistItem[];
  }) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  initialStatus = 'todo',
  members,
  projects,
  activeProject,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [projectId, setProjectId] = useState(activeProject.id);
  const [startDate, setStartDate] = useState('2026-08-03');
  const [dueDate, setDueDate] = useState('2026-08-08');
  const [estimatedHours, setEstimatedHours] = useState(8);
  const [tagInput, setTagInput] = useState('前端, 需求');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  const [aiGoal, setAiGoal] = useState('');
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [aiError, setAiError] = useState('');

  // AI Decompose Task Trigger
  const handleAiDecompose = async () => {
    const query = aiGoal.trim() || title.trim();
    if (!query) {
      setAiError('请先输入任务名称或在 AI 输入框中填写高层级目标');
      return;
    }

    setAiError('');
    setIsDecomposing(true);

    try {
      const res = await fetch('/api/copilot/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: query }),
      });

      const data = await res.json();
      if (res.ok) {
        setTitle(data.title || query);
        setDescription(data.description || '');
        setPriority(data.priority || 'high');
        setEstimatedHours(data.estimatedHours || 12);
        if (data.tags && Array.isArray(data.tags)) {
          setTagInput(data.tags.join(', '));
        }
        if (data.checklist && Array.isArray(data.checklist)) {
          setChecklist(data.checklist);
        }
      } else {
        setAiError(data.error || 'AI 拆解服务返回失败');
      }
    } catch (err: any) {
      setAiError(err.message || '网络连接超时');
    } finally {
      setIsDecomposing(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSubmit({
      title: title.trim(),
      description,
      status,
      priority,
      assigneeIds: selectedAssigneeIds,
      projectId,
      startDate,
      dueDate,
      estimatedHours,
      tags,
      checklist,
    });
  };

  const toggleAssignee = (id: string) => {
    if (selectedAssigneeIds.includes(id)) {
      setSelectedAssigneeIds(selectedAssigneeIds.filter((item) => item !== id));
    } else {
      setSelectedAssigneeIds([...selectedAssigneeIds, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden my-4 animate-fadeIn text-slate-800">
        
        {/* Header */}
        <div className="px-7 py-4.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-xs" />
            <h2 className="font-bold text-slate-900 text-base sm:text-lg">发布与分配新协作任务</h2>
            <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold hidden sm:inline-block">
              双栏宽屏富文本模式
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
          
          {/* AI Decompose Copilot Banner */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50/60 border border-purple-200/80 rounded-2xl p-4.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-purple-900">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                <span className="text-sm">TaskSync AI Copilot 智能拆解与生成</span>
              </div>
              <span className="text-xs text-purple-700 font-medium hidden sm:inline-block">输入总体目标，AI 自动整理富文本正文、拆解子任务与估算工时</span>
            </div>

            <div className="flex gap-2.5">
              <input
                type="text"
                placeholder="例如: 部署安全身份鉴权与企业级 OAuth2 单点登录流程"
                value={aiGoal}
                onChange={(e) => setAiGoal(e.target.value)}
                className="flex-1 bg-white border border-purple-200 rounded-xl px-4 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 shadow-2xs"
              />
              <button
                type="button"
                onClick={handleAiDecompose}
                disabled={isDecomposing}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isDecomposing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>AI 智能生成</span>
              </button>
            </div>
            {aiError && <p className="text-xs text-rose-600 font-medium">{aiError}</p>}
          </div>

          {/* Two Column Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Primary Content & Rich Text (7.5 cols approx: 7/12) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                  任务标题 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="简明扼要说明此任务的核心交付目标..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs font-semibold"
                />
              </div>

              {/* Description (Rich Text Editor) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between uppercase tracking-wider">
                  <span>任务细则与需求正文 (富文本 / Markdown)</span>
                  <span className="text-[11px] text-emerald-600 font-medium lowercase">✨ 支持富文本格式排版与实时双栏预览</span>
                </label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="在此使用富文本排版详细的任务目标、交付边界、依赖接口或测试步骤..."
                  minHeight="300px"
                />
              </div>

              {/* Checklist Subtasks */}
              {checklist.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span>AI 智能拆解子任务清单 ({checklist.length} 项)</span>
                  </div>
                  <div className="space-y-1.5 pl-1">
                    {checklist.map((item, idx) => (
                      <div key={idx} className="text-slate-800 flex items-center gap-2.5 bg-white px-3 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="flex-1 font-medium">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Task Attributes Sidebar (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50/90 p-5 rounded-2xl border border-slate-200/90 space-y-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚙️ 属性分配与管理</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">TASK CONFIG</span>
              </div>

              {/* Project & Status */}
              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">所属项目</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs font-medium"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">初始状态</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs font-medium"
                  >
                    <option value="backlog">Backlog 积压</option>
                    <option value="todo">待办 (To Do)</option>
                    <option value="in_progress">进行中 (In Progress)</option>
                    <option value="review">代码评审 (Code Review)</option>
                    <option value="done">已完成 (Done)</option>
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">优先级</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs font-medium"
                >
                  <option value="urgent">🔴 紧急 (Urgent)</option>
                  <option value="high">🟠 高级 (High)</option>
                  <option value="medium">🔵 中等 (Medium)</option>
                  <option value="low">⚪ 低级 (Low)</option>
                </select>
              </div>

              {/* Assignees */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">指派经办人</label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                  {(members || []).map((m) => {
                    const isSelected = selectedAssigneeIds.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleAssignee(m.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <img src={m.avatar} alt={m.name} className="w-4 h-4 rounded-full object-cover" />
                        <span>{m.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">开始日期</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">截止日期</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Hours & Tags */}
              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">工时估算 (小时)</label>
                  <input
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 font-mono shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">任务标签 (逗号分隔)</label>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="前端, API, 核心"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

            </div>

          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer"
            >
              立刻发布任务
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
