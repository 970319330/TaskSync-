import React, { useState, useRef } from 'react';
import { Project, Task, Member } from '../types';
import {
  X,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  Copy,
  Check,
  AlertCircle,
  FileText,
  CheckCircle2,
  FolderKanban,
  Layers,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface ProjectImportExportModalProps {
  projects: Project[];
  tasks: Task[];
  members: Member[];
  activeProject: Project;
  onClose: () => void;
  onImportSuccess: (importedProject: Project, updatedProjects: Project[], updatedTasks: Task[]) => void;
  initialTab?: 'export' | 'import';
  selectedProjectId?: string;
}

export const ProjectImportExportModal: React.FC<ProjectImportExportModalProps> = ({
  projects,
  tasks,
  members,
  activeProject,
  onClose,
  onImportSuccess,
  initialTab = 'export',
  selectedProjectId,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab);

  // --- Export State ---
  const [exportTargetId, setExportTargetId] = useState<string>(selectedProjectId || activeProject.id);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [copied, setCopied] = useState(false);

  // Target export project & tasks
  const isExportAll = exportTargetId === 'all';
  const targetProject = isExportAll ? null : projects.find((p) => p.id === exportTargetId) || activeProject;
  const targetTasks = isExportAll
    ? tasks
    : tasks.filter((t) => t.projectId === (targetProject ? targetProject.id : activeProject.id));

  // --- Import State ---
  const [importJsonText, setImportJsonText] = useState('');
  const [importMode, setImportMode] = useState<'create_new' | 'overwrite'>('create_new');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [parsedImportData, setParsedImportData] = useState<{
    project?: Partial<Project>;
    tasks?: Partial<Task>[];
    version?: string;
    raw?: any;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Member name lookup
  const getMemberName = (id?: string) => {
    if (!id) return '未指派';
    const m = members.find((mem) => mem.id === id);
    return m ? m.name : id;
  };

  // Status text mapping
  const statusLabels: Record<string, string> = {
    backlog: '需求池',
    todo: '待处理',
    in_progress: '进行中',
    in_review: '审核中',
    done: '已完成',
  };

  // Priority text mapping
  const priorityLabels: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  };

  // --- Export Logic ---
  const generateExportJson = () => {
    if (isExportAll) {
      return JSON.stringify(
        {
          version: '2.0',
          exportedAt: new Date().toISOString(),
          type: 'all_projects',
          projects,
          tasks,
          membersSummary: members.map((m) => ({ id: m.id, name: m.name, role: m.role, email: m.email })),
        },
        null,
        2
      );
    }

    if (!targetProject) return '';

    return JSON.stringify(
      {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        type: 'single_project',
        project: targetProject,
        tasks: targetTasks,
        membersSummary: members
          .filter((m) => targetProject.memberIds?.includes(m.id))
          .map((m) => ({ id: m.id, name: m.name, role: m.role, email: m.email })),
      },
      null,
      2
    );
  };

  const generateExportCsv = () => {
    const headers = [
      '任务ID',
      '所属项目',
      '项目编号',
      '任务标题',
      '状态',
      '优先级',
      '指派人',
      '报告人',
      '开始日期',
      '截止日期',
      '预估工时(h)',
      '已耗工时(h)',
      '标签',
      '创建时间',
      '任务描述概览',
    ];

    const rows = targetTasks.map((t) => {
      const proj = projects.find((p) => p.id === t.projectId) || targetProject;
      const assignees = (t.assigneeIds || []).map(getMemberName).join(';');
      const tags = (t.tags || []).join(';');
      const cleanDesc = (t.description || '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ').slice(0, 200);

      return [
        `"${t.id}"`,
        `"${proj?.name || ''}"`,
        `"${proj?.key || ''}"`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${statusLabels[t.status] || t.status}"`,
        `"${priorityLabels[t.priority] || t.priority}"`,
        `"${assignees}"`,
        `"${getMemberName(t.reporterId)}"`,
        `"${t.startDate || ''}"`,
        `"${t.dueDate || ''}"`,
        `"${t.estimatedHours || 0}"`,
        `"${t.loggedHours || 0}"`,
        `"${tags}"`,
        `"${t.createdAt || ''}"`,
        `"${cleanDesc}"`,
      ].join(',');
    });

    // Add UTF-8 BOM for Excel compatibility
    return '\uFEFF' + [headers.join(','), ...rows].join('\n');
  };

  const handleDownload = () => {
    let content = '';
    let filename = '';
    let mimeType = '';

    if (exportFormat === 'json') {
      content = generateExportJson();
      const name = isExportAll ? 'TaskSync_All_Projects' : targetProject?.name.replace(/\s+/g, '_');
      filename = `${name}_${new Date().toISOString().slice(0, 10)}.json`;
      mimeType = 'application/json';
    } else {
      content = generateExportCsv();
      const name = isExportAll ? 'TaskSync_Tasks_Export' : targetProject?.name.replace(/\s+/g, '_');
      filename = `${name}_Tasks_${new Date().toISOString().slice(0, 10)}.csv`;
      mimeType = 'text/csv;charset=utf-8;';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    const jsonStr = generateExportJson();
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Parse Import Content ---
  const parseAndValidateJson = (text: string) => {
    setImportError(null);
    if (!text.trim()) {
      setParsedImportData(null);
      return;
    }

    try {
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object') {
        throw new Error('格式无效：解析结果不是合法的 JSON 对象');
      }

      // Check format
      let projObj: Partial<Project> | undefined;
      let tasksArr: Partial<Task>[] = [];

      if (data.type === 'single_project' || data.project) {
        projObj = data.project || { name: '导入的项目', key: 'IMP' };
        tasksArr = Array.isArray(data.tasks) ? data.tasks : [];
      } else if (data.name && (data.key || data.id)) {
        // Simple raw project JSON format
        projObj = {
          id: data.id,
          name: data.name,
          key: data.key,
          description: data.description,
          color: data.color,
          memberIds: data.memberIds,
        };
        tasksArr = Array.isArray(data.tasks) ? data.tasks : [];
      } else if (Array.isArray(data)) {
        // Direct tasks array import
        projObj = { name: '导入的外部任务集', key: 'IMP' };
        tasksArr = data;
      } else if (data.projects && Array.isArray(data.projects)) {
        // All projects bundle - pick first project or prompt
        projObj = data.projects[0] || { name: '全量恢复项目', key: 'ALL' };
        tasksArr = Array.isArray(data.tasks) ? data.tasks : [];
      } else {
        throw new Error('未识别的项目结构： JSON 需包含 project 和 tasks 属性');
      }

      setParsedImportData({
        project: projObj,
        tasks: tasksArr,
        version: data.version || '1.0',
        raw: data,
      });
    } catch (err: any) {
      setParsedImportData(null);
      setImportError(err.message || 'JSON 解析失败，请检查语法格式');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setImportJsonText(text);
        parseAndValidateJson(text);
      }
    };
    reader.readAsText(file);
  };

  const handleTextareaChange = (text: string) => {
    setImportJsonText(text);
    parseAndValidateJson(text);
  };

  // --- Submit Import to API ---
  const handleExecuteImport = async () => {
    if (!parsedImportData || !parsedImportData.project) {
      setImportError('请输入或上传合法的项目 JSON 数据');
      return;
    }

    setImporting(true);
    setImportError(null);

    try {
      const res = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: parsedImportData.project,
          tasks: parsedImportData.tasks || [],
          mode: importMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '导入失败，请重试');
      }

      onImportSuccess(data.project, data.projects, data.tasks);
      onClose();
    } catch (err: any) {
      setImportError(err.message || '网络连接异常，导入失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-4 animate-fadeIn text-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-7 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base sm:text-lg">项目数据导入与导出</h2>
              <p className="text-[11px] text-slate-500">支持 JSON 备份包与 CSV/Excel 表格格式的归档与一键恢复</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 px-6 shrink-0">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>导出项目数据 (Export)</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>导入/恢复项目 (Import)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Select Project */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">选择导出对象</label>
                <select
                  value={exportTargetId}
                  onChange={(e) => setExportTargetId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value={activeProject.id}>当前项目：{activeProject.name} ({activeProject.key})</option>
                  {projects
                    .filter((p) => p.id !== activeProject.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.key})
                      </option>
                    ))}
                  <option value="all">📁 全部项目空间打包导出 (全量工作空间)</option>
                </select>
              </div>

              {/* Select Export Format */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">选择导出格式</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setExportFormat('json')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                      exportFormat === 'json'
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                        <span>JSON 数据全量包 (.json)</span>
                        {exportFormat === 'json' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        包含项目属性、全量任务卡片、Checklist、评论列表及动态操作日志，支持无损导入恢复。
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setExportFormat('csv')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                      exportFormat === 'csv'
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                        <span>CSV / Excel 表格 (.csv)</span>
                        {exportFormat === 'csv' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        包含任务编号、标题、状态、指派人、工时与日期等核心字段，可在 Excel / Numbers 中直接查看。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Summary Card */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4 text-slate-500" />
                  <span>导出包元数据预览</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block font-medium">包含项目数</span>
                    <span className="font-extrabold text-slate-900 text-base">
                      {isExportAll ? projects.length : 1}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block font-medium">任务卡片总数</span>
                    <span className="font-extrabold text-emerald-600 text-base">{targetTasks.length}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block font-medium">成员关联覆盖</span>
                    <span className="font-extrabold text-indigo-600 text-base">
                      {isExportAll ? members.length : targetProject?.memberIds?.length || 0} 人
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block font-medium">规范版本</span>
                    <span className="font-mono font-bold text-slate-700 text-xs">v2.0 JSON/CSV</span>
                  </div>
                </div>
              </div>

              {/* Export Action Controls */}
              <div className="flex items-center justify-between gap-3 pt-2">
                {exportFormat === 'json' ? (
                  <button
                    onClick={handleCopyJson}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? '已复制 JSON 到剪贴板' : '复制 JSON 内容'}</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">已应用 UTF-8 BOM，防止 Excel 乱码</span>
                )}

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>生成并下载文件 ({exportFormat.toUpperCase()})</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* File Upload Zone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">选择或拖拽文件 (.json)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/20 rounded-2xl p-6 text-center transition-all cursor-pointer group"
                >
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 mx-auto mb-2 transition-colors" />
                  <p className="text-xs font-bold text-slate-700">点击上传或将项目 JSON 文件拖放到此处</p>
                  <p className="text-[11px] text-slate-400 mt-1">支持导出生成的标准格式 .json 备份文件</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Textarea for JSON Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">或直接粘贴 JSON 文本内容</label>
                  {importJsonText && (
                    <button
                      onClick={() => {
                        setImportJsonText('');
                        setParsedImportData(null);
                        setImportError(null);
                      }}
                      className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                    >
                      清空文本
                    </button>
                  )}
                </div>
                <textarea
                  rows={5}
                  value={importJsonText}
                  onChange={(e) => handleTextareaChange(e.target.value)}
                  placeholder={`{\n  "version": "2.0",\n  "project": {\n    "name": "示例项目",\n    "key": "DEMO"\n  },\n  "tasks": [...] \n}`}
                  className="w-full bg-slate-900 text-emerald-400 font-mono text-[11px] p-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 leading-relaxed placeholder-slate-600 resize-none"
                />
              </div>

              {/* Parse Error Notification */}
              {importError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">导入校验失败：</span>
                    <span>{importError}</span>
                  </div>
                </div>
              )}

              {/* Parsed Preview Card */}
              {parsedImportData && parsedImportData.project && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        校验成功：可解析的项目架构 ({parsedImportData.project.name})
                      </span>
                    </div>
                    <span className="font-mono text-[10px] bg-emerald-200/60 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                      KEY: {parsedImportData.project.key || 'IMP'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-slate-400 block font-medium">包含待导入任务</span>
                      <span className="font-bold text-emerald-700 text-sm">
                        {parsedImportData.tasks?.length || 0} 个任务卡片
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-slate-400 block font-medium">关联成员配置</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {parsedImportData.project.memberIds?.length || 0} 名团队成员
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 block font-medium">版本与类型</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {parsedImportData.version} (Standard JSON)
                      </span>
                    </div>
                  </div>

                  {/* Task Sample List */}
                  {parsedImportData.tasks && parsedImportData.tasks.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/60">
                      <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                        即将导入的任务预览 (前 {Math.min(5, parsedImportData.tasks.length)} 项):
                      </span>
                      <div className="space-y-1">
                        {parsedImportData.tasks.slice(0, 5).map((t, idx) => (
                          <div
                            key={idx}
                            className="bg-white/90 px-3 py-1.5 rounded-lg border border-emerald-100 text-xs flex items-center justify-between gap-2"
                          >
                            <span className="font-medium text-slate-800 truncate">{t.title || '未命名任务'}</span>
                            <div className="flex items-center gap-2 shrink-0 text-[10px]">
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                {statusLabels[t.status || 'todo'] || t.status}
                              </span>
                              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                                {priorityLabels[t.priority || 'medium'] || t.priority}优先级
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Import Mode Radio Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">选择导入模式</label>
                <div className="space-y-2">
                  <label
                    onClick={() => setImportMode('create_new')}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                      importMode === 'create_new'
                        ? 'border-emerald-500 bg-emerald-50/30 font-semibold'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'create_new'}
                      onChange={() => setImportMode('create_new')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">新建为独立项目 (推荐)</span>
                      <span className="text-slate-500 font-normal">
                        系统自动为该项目及其任务生成全新 ID，绝不覆盖已有任何数据。
                      </span>
                    </div>
                  </label>

                  <label
                    onClick={() => setImportMode('overwrite')}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                      importMode === 'overwrite'
                        ? 'border-amber-500 bg-amber-50/30 font-semibold'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'overwrite'}
                      onChange={() => setImportMode('overwrite')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">覆盖 / 合并同名项目</span>
                      <span className="text-slate-500 font-normal">
                        若遇到相同的项目 ID 或 Key，将替换该项目的全量任务与基础信息。
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleExecuteImport}
                  disabled={!parsedImportData || importing}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer ${
                    !parsedImportData || importing
                      ? 'bg-slate-300 shadow-none cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  }`}
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>导入并同步中...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>确认导入并构建项目</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
