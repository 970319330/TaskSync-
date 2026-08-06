import React, { useState } from 'react';
import { Member } from '../types';
import { PROJECT_TEMPLATES, ProjectTemplate } from '../data/projectTemplates';
import {
  X,
  Plus,
  Layers,
  Check,
  Upload,
  FileText,
  Sparkles,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Kanban,
  Bug,
  Megaphone,
  FolderKanban,
} from 'lucide-react';

interface CreateProjectModalProps {
  members: Member[];
  onClose: () => void;
  onSubmit: (
    data: {
      name: string;
      key: string;
      description: string;
      color: string;
      memberIds: string[];
      template?: string;
      initialTasks?: any[];
    },
    importContent?: string
  ) => void;
}

const COLOR_OPTIONS = [
  { id: 'emerald', cls: 'bg-emerald-500', label: '翡翠绿' },
  { id: 'blue', cls: 'bg-blue-500', label: '海洋蓝' },
  { id: 'indigo', cls: 'bg-indigo-500', label: '靛青' },
  { id: 'purple', cls: 'bg-purple-500', label: '紫罗兰' },
  { id: 'rose', cls: 'bg-rose-500', label: '玫瑰红' },
  { id: 'amber', cls: 'bg-amber-500', label: '琥珀橙' },
  { id: 'teal', cls: 'bg-teal-500', label: '青碧' },
  { id: 'slate', cls: 'bg-slate-500', label: '岩石灰' },
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  members,
  onClose,
  onSubmit,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('scrum');

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('emerald');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    members.map((m) => m.id)
  );

  // File import state
  const [importContent, setImportContent] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Initialize form state when a template is selected
  const applyTemplate = (tpl: ProjectTemplate) => {
    setSelectedTemplateId(tpl.id);
    setColor(tpl.recommendedColor || 'emerald');

    if (!name || name === '未命名项目') {
      if (tpl.id === 'scrum') setName('牛磨 Cloud v3.0 敏捷迭代');
      else if (tpl.id === 'bug_tracking') setName('研发缺陷与质量治理专项');
      else if (tpl.id === 'campaign') setName('Q3 线上品牌运营拉新活动');
      else if (tpl.id === 'product_release') setName('牛磨 Copilot 商业化 1.0 发布');
      else setName('新建协作空间');
    }

    if (!key) {
      if (tpl.id === 'scrum') setKey('SCRUM-S1');
      else if (tpl.id === 'bug_tracking') setKey('BUG-QA');
      else if (tpl.id === 'campaign') setKey('MKT-Q3');
      else if (tpl.id === 'product_release') setKey('PROD-10');
      else setKey('PRJ-01');
    }

    if (!description) {
      setDescription(tpl.description);
    }
  };

  // Run initial template apply on load
  React.useEffect(() => {
    const defaultTpl = PROJECT_TEMPLATES.find((t) => t.id === 'scrum') || PROJECT_TEMPLATES[0];
    applyTemplate(defaultTpl);
  }, []);

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setImportError('文件过大,请导入小于 2MB 的文本文件');
      return;
    }
    setImportError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      setImportContent(text);
      setImportFileName(file.name);
    };
    reader.onerror = () => setImportError('文件读取失败,请重试');
    reader.readAsText(file);
    e.target.value = '';
  };

  const clearImport = () => {
    setImportContent('');
    setImportFileName('');
    setImportError('');
  };

  const renderTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case 'scrum':
        return <Kanban className="w-5 h-5 text-emerald-600" />;
      case 'bug':
        return <Bug className="w-5 h-5 text-rose-600" />;
      case 'campaign':
        return <Megaphone className="w-5 h-5 text-amber-600" />;
      case 'product':
        return <FolderKanban className="w-5 h-5 text-indigo-600" />;
      default:
        return <Layers className="w-5 h-5 text-slate-600" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);

    try {
      await onSubmit(
        {
          name: name.trim(),
          key: (key.trim() || 'PRJ').toUpperCase(),
          description: description.trim(),
          color,
          memberIds: selectedMemberIds,
          template: selectedTemplateId,
        },
        importContent || undefined
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-4 animate-fadeIn text-slate-800">
        {/* Header */}
        <div className="px-7 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                新建项目空间
              </h2>
              <p className="text-[11px] text-slate-500">
                步骤 {currentStep} / 2: {currentStep === 1 ? '选择模版预设' : '配置项目基础信息'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Bar */}
        <div className="px-7 py-3 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
          <button
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              currentStep === 1
                ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
              1
            </span>
            <span>模版预设</span>
          </button>
          <div className="h-0.5 w-8 bg-slate-300 hidden sm:block" />
          <button
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              currentStep === 2
                ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
              2
            </span>
            <span>项目基础配置</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* STEP 1: 选择预设模版 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  选择项目模版 (Project Templates)
                </h3>
                <p className="text-xs text-slate-500">
                  预设模版内置行业标准工作流配置，帮助快速启动项目。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {PROJECT_TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => applyTemplate(tpl)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-slate-100">
                              {renderTemplateIcon(tpl.iconName)}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">
                                {tpl.name}
                              </h4>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {tpl.category}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {tpl.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                          {tpl.description}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Step 1 Footer Action */}
              <div className="pt-4 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <span>下一步：项目配置</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: 基础配置与成员 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* 项目名称 & Key */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                    项目名称 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如: 牛磨 Cloud v3.0 敏捷迭代"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                    项目缩写 Key
                  </label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) =>
                      setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))
                    }
                    placeholder="TS-CLOUD"
                    maxLength={12}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs font-mono font-semibold uppercase"
                  />
                </div>
              </div>

              {/* 项目描述 */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                  项目描述
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简述项目阶段目标、业务范围与交付预期..."
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs resize-y leading-relaxed"
                />
              </div>

              {/* 主题标识色 */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wider">
                  主题标识色
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {COLOR_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setColor(opt.id)}
                      title={opt.label}
                      className={`w-8 h-8 rounded-xl ${
                        opt.cls
                      } flex items-center justify-center transition-all cursor-pointer ${
                        color === opt.id
                          ? 'ring-2 ring-offset-2 ring-slate-800 scale-105 shadow-md'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {color === opt.id && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 导入文档 / 思维导图 */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  导入文档 / 思维导图 (可选，AI 自动拆分任务)
                </label>

                {importFileName ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-purple-900 font-semibold min-w-0">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate">{importFileName}</span>
                        <span className="text-[10px] text-purple-500 font-mono shrink-0">
                          {(importContent.length / 1024).toFixed(1)}KB
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={clearImport}
                        className="text-purple-400 hover:text-rose-600 cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <pre className="text-[11px] text-slate-600 bg-white rounded-lg p-2 max-h-24 overflow-y-auto whitespace-pre-wrap break-words border border-purple-100 font-mono">
                      {importContent.slice(0, 600)}
                      {importContent.length > 600 ? '\n...(预览截断)' : ''}
                    </pre>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 rounded-xl py-4 cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-600 font-medium">点击上传需求文档 / 思维导图</span>
                    <span className="text-[10px] text-slate-400">支持 .txt / .md / .opml / .json</span>
                    <input
                      type="file"
                      accept=".txt,.md,.markdown,.opml,.json,text/plain,text/markdown,application/json"
                      onChange={handleFileImport}
                      className="hidden"
                    />
                  </label>
                )}
                {importError && <p className="text-[11px] text-rose-600 mt-1.5">{importError}</p>}
              </div>

              {/* 成员选择 */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wider">
                  项目成员 ({selectedMemberIds.length})
                </label>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                  {members.map((m) => {
                    const isSelected = selectedMemberIds.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleMember(m.id)}
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

              {/* Step 2 Footer Navigation */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>上一步：选择模版</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim() || submitting}
                    className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>
                      {submitting
                        ? '系统初始化中...'
                        : importContent
                        ? '创建项目并 AI 拆分'
                        : '完成并创建项目'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
