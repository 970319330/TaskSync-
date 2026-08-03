import React, { useState } from 'react';
import { ChatChannel, ChatMessage, Member, Task } from '../types';
import {
  Hash,
  Send,
  Sparkles,
  Bot,
  Users,
  Paperclip,
  Smile,
  AtSign,
  MessageSquare,
  Lock,
} from 'lucide-react';

interface ChatHubProps {
  channels: ChatChannel[];
  activeChannel: ChatChannel;
  onSelectChannel: (c: ChatChannel) => void;
  messages: ChatMessage[];
  members: Member[];
  currentMember: Member;
  tasks: Task[];
  onSendMessage: (channelId: string, content: string, taskRefId?: string) => void;
  onTaskClickById: (taskId: string) => void;
}

export const ChatHub: React.FC<ChatHubProps> = ({
  channels,
  activeChannel,
  onSelectChannel,
  messages,
  members,
  currentMember,
  tasks,
  onSendMessage,
  onTaskClickById,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedTaskRef, setSelectedTaskRef] = useState<string>('');

  const channelMessages = messages.filter((m) => m.channelId === activeChannel.id);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(activeChannel.id, inputText.trim(), selectedTaskRef || undefined);
    setInputText('');
    setSelectedTaskRef('');
  };

  const handleAddCopilotPrompt = () => {
    setInputText((prev) => (prev ? `${prev} @Copilot` : '@Copilot '));
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg flex flex-col md:flex-row h-[680px]">
        
        {/* Left Channels Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-3.5 flex flex-col shrink-0">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2 flex items-center justify-between">
            <span>项目讨论频道 (Channels)</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-mono">
              {channels.length}
            </span>
          </div>

          <div className="space-y-1 flex-1 overflow-y-auto">
            {channels.map((chan) => {
              const isActive = chan.id === activeChannel.id;
              return (
                <button
                  key={chan.id}
                  onClick={() => onSelectChannel(chan)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {chan.isPrivate ? (
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Hash className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
                    )}
                    <span className="truncate">{chan.name}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Online Members Quick List */}
          <div className="pt-3 border-t border-slate-200 mt-2">
            <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1.5 px-2">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>协同成员在线中:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 px-1">
              {members.map((m) => (
                <img
                  key={m.id}
                  src={m.avatar}
                  alt={m.name}
                  title={`${m.name} - ${m.statusText || '在线'}`}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-300"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Chat Main Section */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          
          {/* Channel Header */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <Hash className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="truncate">
                <h3 className="font-bold text-sm text-slate-900 truncate">{activeChannel.name}</h3>
                <p className="text-xs text-slate-500 truncate">{activeChannel.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleAddCopilotPrompt}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-800 text-xs font-semibold transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>@Copilot 助手</span>
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {channelMessages.map((msg) => {
              const author = members.find((m) => m.id === msg.authorId) || {
                name: msg.isAiResponse ? 'TaskSync Copilot' : '匿名成员',
                avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150',
                role: 'AI 协同助手',
              };

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 items-start ${
                    msg.isAiResponse ? 'bg-purple-50/70 border border-purple-200 p-3 rounded-2xl' : ''
                  }`}
                >
                  <img
                    src={author.avatar}
                    alt={author.name}
                    className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-xs text-slate-900">{author.name}</span>
                      {msg.isAiResponse && (
                        <span className="bg-purple-100 text-purple-800 border border-purple-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded flex items-center gap-1">
                          <Bot className="w-2.5 h-2.5" /> AI
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">{msg.createdAt}</span>
                    </div>

                    <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>

                    {/* Linked Task Badge */}
                    {msg.taskRefId && (
                      <button
                        onClick={() => onTaskClickById(msg.taskRefId!)}
                        className="mt-2 inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-emerald-300 text-emerald-800 text-xs px-2.5 py-1 rounded-lg font-mono font-medium transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600" />
                        <span>关联任务卡片: #{msg.taskRefId} (点击查看)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {channelMessages.length === 0 && (
              <div className="text-center py-16 text-slate-400 text-xs">
                此频道暂无动态消息，发起第一次探讨吧！
              </div>
            )}
          </div>

          {/* Message Input Bar */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-slate-50/60">
            {/* Task Link selector */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-slate-500 font-semibold">关联任务:</span>
              <select
                value={selectedTaskRef}
                onChange={(e) => setSelectedTaskRef(e.target.value)}
                className="bg-white border border-slate-200 rounded text-[11px] text-slate-700 px-2 py-0.5 focus:outline-none cursor-pointer"
              >
                <option value="">不关联特定任务</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.id} - {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:border-emerald-500 transition-all shadow-2xs">
              <input
                type="text"
                placeholder={`在 #${activeChannel.name} 中发言，输入 @Copilot 寻求 AI 智能答疑...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
              />

              <button
                type="button"
                onClick={handleAddCopilotPrompt}
                className="text-purple-700 hover:text-purple-800 text-xs font-semibold px-2 py-1 bg-purple-100 hover:bg-purple-200 rounded border border-purple-300 shrink-0 cursor-pointer"
              >
                @Copilot
              </button>

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg font-bold disabled:opacity-40 transition-all shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
