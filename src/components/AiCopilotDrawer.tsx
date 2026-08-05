import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { Task, Member } from '../types';

interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  members: Member[];
  onGenerateSummary: () => void;
  aiSummary: string;
  isGeneratingSummary: boolean;
}

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({
  isOpen,
  onClose,
  tasks,
  members,
  onGenerateSummary,
  aiSummary,
  isGeneratingSummary,
}) => {
  const [chatPrompt, setChatPrompt] = useState('');
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    {
      role: 'ai',
      text: '你好！我是 **牛磨 Copilot** 智能助手。我可以帮您：\n- 自动提取或拆解任务至**富文本正文**\n- 一键总结 **Sprint 迭代日/周报**\n- 分析团队成员工作负荷与瓶颈',
    },
  ]);
  const [isAsking, setIsAsking] = useState(false);

  if (!isOpen) return null;

  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPrompt.trim()) return;

    const userText = chatPrompt.trim();
    setAiChatMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setChatPrompt('');
    setIsAsking(true);

    try {
      const res = await fetch('/api/channels/chan_sprint/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: 'usr_alex',
          content: `@copilot ${userText}`,
        }),
      });

      const data = await res.json();
      if (data.messages) {
        const lastAiMsg = [...data.messages].reverse().find((m: any) => m.isAiResponse);
        if (lastAiMsg) {
          setAiChatMessages((prev) => [...prev, { role: 'ai', text: lastAiMsg.content }]);
        }
      }
    } catch (err) {
      setAiChatMessages((prev) => [
        ...prev,
        { role: 'ai', text: '抱歉，当前 Copilot 响应超时，请重试。' },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-slideLeft text-slate-800">
      
      {/* Drawer Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs">
            <Sparkles className="w-4 h-4 text-purple-100" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">TaskSync Copilot</h3>
            <p className="text-[10px] text-purple-700 font-medium">Gemini 3.6 Flash 智能驱动</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Action Chips */}
      <div className="p-3 bg-slate-50/50 border-b border-slate-200 flex flex-wrap gap-2 text-xs">
        <button
          onClick={onGenerateSummary}
          disabled={isGeneratingSummary}
          className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 px-3 py-1.5 rounded-xl font-semibold transition-all disabled:opacity-50 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-purple-600" />
          <span>生成 Sprint 迭代周报</span>
        </button>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {aiSummary && (
          <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-4 text-slate-800 shadow-2xs">
            <div className="font-bold text-purple-900 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>最新 Sprint 总结报告:</span>
            </div>
            <div className="prose prose-slate max-w-none text-xs text-slate-700">
              <Markdown>{aiSummary}</Markdown>
            </div>
          </div>
        )}

        {aiChatMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'ai' && (
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
            )}

            <div
              className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white font-medium shadow-2xs'
                  : 'bg-slate-100 text-slate-800 border border-slate-200/80'
              }`}
            >
              <Markdown>{msg.text}</Markdown>
            </div>
          </div>
        ))}

        {isAsking && (
          <div className="flex items-center gap-2 text-purple-700 text-xs font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Copilot 正在生成答复...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendPrompt} className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:border-purple-500 shadow-2xs">
          <input
            type="text"
            placeholder="问问 Copilot 关于团队进展或任务分工..."
            value={chatPrompt}
            onChange={(e) => setChatPrompt(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!chatPrompt.trim()}
            className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

    </div>
  );
};
