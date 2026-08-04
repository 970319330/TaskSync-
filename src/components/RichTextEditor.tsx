import React, { useState, useRef } from 'react';
import Markdown from 'react-markdown';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Link as LinkIcon,
  Table as TableIcon,
  Minus,
  Eye,
  Edit3,
  Columns,
  Sparkles,
  FileCode,
  HelpCircle,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '使用富文本 / Markdown 格式输入任务需求正文...',
  minHeight = '180px',
  readOnly = false,
}) => {
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to insert markdown syntax at cursor position or around selected text
  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || defaultText;

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 10);
  };

  const insertLinePrefix = (prefix: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    
    // Find beginning of line
    const lastNewline = value.lastIndexOf('\n', start - 1);
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const newValue = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 10);
  };

  const insertTemplate = (templateType: 'criteria' | 'api' | 'bug') => {
    let templateText = '';
    if (templateType === 'criteria') {
      templateText = `\n### 🎯 验收与交付标准 (Acceptance Criteria)\n- [ ] **功能需求**: 完成核心交互流程开发\n- [ ] **性能指标**: 页面响应时间控制在 200ms 以内\n- [ ] **兼容规范**: 通过 Chrome / Safari 及移动端响应式测试\n- [ ] **代码质量**: 附带完整单元测试并通过 CI/CD 走查\n`;
    } else if (templateType === 'api') {
      templateText = `\n### 🔌 API 接口与数据协议规范\n**接口地址**: \`POST /api/v1/resource/sync\`\n\n**请求 Payload 示例**:\n\`\`\`json\n{\n  "action": "update_status",\n  "version": "v2.4",\n  "payload": { "id": "TS-101", "status": "in_progress" }\n}\n\`\`\`\n`;
    } else if (templateType === 'bug') {
      templateText = `\n### 🐛 问题排查与重现步骤\n1. **复现路径**: 登录系统 -> 打开看板 -> 快速多次点击卡片\n2. **预期行为**: 正常打开弹窗并流畅高亮\n3. **实际现象**: 产生短暂的 UI 抖动或提示网络延迟\n\n> **环境信息**: Chrome 124.0 / macOS Sonoma / 100Mbps 局域网\n`;
    }

    onChange(value ? `${value.trim()}\n${templateText}` : templateText.trim());
  };

  if (readOnly) {
    return (
      <div className="prose prose-slate max-w-none text-xs text-slate-800 leading-relaxed font-sans bg-slate-50/70 p-4 rounded-xl border border-slate-200">
        <Markdown
          components={{
            h1: ({ children }) => <h1 className="text-base font-extrabold text-slate-900 border-b border-slate-200 pb-1 mt-3 mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200/60 pb-1 mt-3 mb-1.5">{children}</h2>,
            h3: ({ children }) => <h3 className="text-xs font-bold text-slate-900 mt-2.5 mb-1 flex items-center gap-1.5">{children}</h3>,
            p: ({ children }) => <p className="mb-2 leading-relaxed text-slate-700">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 pl-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 pl-1">{children}</ol>,
            li: ({ children }) => <li className="text-slate-700 font-normal">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-3 border-emerald-500 bg-emerald-50/60 pl-3 py-1.5 my-2 text-slate-700 rounded-r-lg italic">
                {children}
              </blockquote>
            ),
            pre: ({ children }) => (
              <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl text-[11px] font-mono overflow-x-auto my-2 border border-slate-800 shadow-xs [&>code]:bg-transparent [&>code]:text-slate-100 [&>code]:p-0 [&>code]:border-none">
                {children}
              </pre>
            ),
            code: ({ children, className }: any) => (
              <code className={`font-mono text-[11px] bg-slate-200/80 text-emerald-800 px-1.5 py-0.5 rounded border border-slate-300/60 ${className || ''}`}>
                {children}
              </code>
            ),
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noreferrer" className="text-emerald-600 underline font-medium hover:text-emerald-700">
                {children}
              </a>
            ),
            strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
            table: ({ children }) => (
              <div className="overflow-x-auto my-2">
                <table className="min-w-full divide-y divide-slate-200 text-xs border border-slate-200 rounded-lg overflow-hidden">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => <th className="bg-slate-100 px-3 py-1.5 text-left font-bold text-slate-700 border-b border-slate-200">{children}</th>,
            td: ({ children }) => <td className="px-3 py-1.5 border-b border-slate-100 text-slate-700">{children}</td>,
          }}
        >
          {value || '*暂无详细正文描述*'}
        </Markdown>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs focus-within:border-emerald-500 transition-all">
      {/* Top Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        {/* Formatting Actions */}
        <div className="flex items-center flex-wrap gap-1">
          <button
            type="button"
            title="加粗 (Bold)"
            onClick={() => insertFormatting('**', '**', '粗体文本')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="斜体 (Italic)"
            onClick={() => insertFormatting('*', '*', '斜体文本')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="删除线 (Strikethrough)"
            onClick={() => insertFormatting('~~', '~~', '删除文本')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          
          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          <button
            type="button"
            title="一级标题 (H1)"
            onClick={() => insertLinePrefix('# ')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="二级标题 (H2)"
            onClick={() => insertLinePrefix('## ')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          <button
            type="button"
            title="无序列表"
            onClick={() => insertLinePrefix('- ')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="有序列表"
            onClick={() => insertLinePrefix('1. ')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="任务清单 (Checklist)"
            onClick={() => insertLinePrefix('- [ ] ')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          <button
            type="button"
            title="内联代码 / 代码块"
            onClick={() => insertFormatting('`', '`', 'code')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="引用块 (Blockquote)"
            onClick={() => insertLinePrefix('> ')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="插入超链接"
            onClick={() => insertFormatting('[', '](https://example.com)', '链接标题')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="插入表格"
            onClick={() => insertFormatting('\n| 参数名称 | 类型 | 说明 |\n|---|---|---|\n| id | string | 唯一标识 |\n')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="分割线"
            onClick={() => insertLinePrefix('---\n')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Templates & View Modes */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Preset Templates */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-semibold">快捷模版:</span>
            <button
              type="button"
              onClick={() => insertTemplate('criteria')}
              className="text-[10px] bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer"
            >
              + 验收标准
            </button>
            <button
              type="button"
              onClick={() => insertTemplate('api')}
              className="text-[10px] bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer"
            >
              + API 协议
            </button>
            <button
              type="button"
              onClick={() => insertTemplate('bug')}
              className="text-[10px] bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer"
            >
              + Bug 模板
            </button>
          </div>

          <div className="w-px h-4 bg-slate-200" />

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('edit')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                mode === 'edit'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span className="hidden md:inline">编辑</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('split')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                mode === 'split'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3 h-3" />
              <span className="hidden md:inline">双栏</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('preview')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                mode === 'preview'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span className="hidden md:inline">预览</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="relative min-h-[160px]">
        {mode === 'edit' && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ minHeight }}
            className="w-full p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none resize-y font-mono leading-relaxed"
          />
        )}

        {mode === 'preview' && (
          <div style={{ minHeight }} className="p-4 bg-slate-50/50">
            <Markdown
              components={{
                h1: ({ children }) => <h1 className="text-base font-extrabold text-slate-900 border-b border-slate-200 pb-1 mt-3 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200/60 pb-1 mt-3 mb-1.5">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xs font-bold text-slate-900 mt-2.5 mb-1 flex items-center gap-1.5">{children}</h3>,
                p: ({ children }) => <p className="mb-2 leading-relaxed text-slate-700">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 pl-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 pl-1">{children}</ol>,
                li: ({ children }) => <li className="text-slate-700 font-normal">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-3 border-emerald-500 bg-emerald-50/60 pl-3 py-1.5 my-2 text-slate-700 rounded-r-lg italic">
                    {children}
                  </blockquote>
                ),
                pre: ({ children }) => (
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl text-[11px] font-mono overflow-x-auto my-2 border border-slate-800 shadow-xs [&>code]:bg-transparent [&>code]:text-slate-100 [&>code]:p-0 [&>code]:border-none">
                    {children}
                  </pre>
                ),
                code: ({ children, className }: any) => (
                  <code className={`font-mono text-[11px] bg-slate-200/80 text-emerald-800 px-1.5 py-0.5 rounded border border-slate-300/60 ${className || ''}`}>
                    {children}
                  </code>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noreferrer" className="text-emerald-600 underline font-medium hover:text-emerald-700">
                    {children}
                  </a>
                ),
                strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="min-w-full divide-y divide-slate-200 text-xs border border-slate-200 rounded-lg overflow-hidden">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => <th className="bg-slate-100 px-3 py-1.5 text-left font-bold text-slate-700 border-b border-slate-200">{children}</th>,
                td: ({ children }) => <td className="px-3 py-1.5 border-b border-slate-100 text-slate-700">{children}</td>,
              }}
            >
              {value || '*暂无详细正文描述，请在上方或编辑模式下补充...*'}
            </Markdown>
          </div>
        )}

        {mode === 'split' && (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 min-h-[180px]">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              style={{ minHeight }}
              className="w-full p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none resize-none font-mono leading-relaxed"
            />
            <div style={{ minHeight }} className="p-3.5 bg-slate-50/50 overflow-y-auto">
              <Markdown
                components={{
                  h1: ({ children }) => <h1 className="text-base font-extrabold text-slate-900 border-b border-slate-200 pb-1 mt-2 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200/60 pb-1 mt-2 mb-1.5">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-xs font-bold text-slate-900 mt-2 mb-1 flex items-center gap-1.5">{children}</h3>,
                  p: ({ children }) => <p className="mb-2 leading-relaxed text-slate-700 text-xs">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 pl-1 text-xs">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 pl-1 text-xs">{children}</ol>,
                  li: ({ children }) => <li className="text-slate-700 font-normal">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-3 border-emerald-500 bg-emerald-50/60 pl-3 py-1 my-2 text-slate-700 rounded-r-lg italic text-xs">
                      {children}
                    </blockquote>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-xl text-[10px] font-mono overflow-x-auto my-2 border border-slate-800 shadow-xs [&>code]:bg-transparent [&>code]:text-slate-100 [&>code]:p-0 [&>code]:border-none">
                      {children}
                    </pre>
                  ),
                  code: ({ children, className }: any) => (
                    <code className={`font-mono text-[10px] bg-slate-200/80 text-emerald-800 px-1 py-0.5 rounded border border-slate-300/60 ${className || ''}`}>
                      {children}
                    </code>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noreferrer" className="text-emerald-600 underline font-medium hover:text-emerald-700">
                      {children}
                    </a>
                  ),
                  strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
                }}
              >
                {value || '*实时渲染预览中...*'}
              </Markdown>
            </div>
          </div>
        )}
      </div>

      {/* Editor Footer Status */}
      <div className="bg-slate-50 border-t border-slate-200 px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>富文本需求编辑器 (支持全量 Markdown 格式与 HTML 兼容渲染)</span>
        </div>
        <div className="font-mono">
          {value.length} 字符 | {value.split(/\s+/).filter(Boolean).length} 单词
        </div>
      </div>
    </div>
  );
};
