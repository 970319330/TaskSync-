import React, { useState } from 'react';
import { Member } from '../types';
import { Radio, Activity, MessageSquareQuote, Check } from 'lucide-react';

interface MemberPresenceBarProps {
  members: Member[];
  currentMember: Member;
  onUpdateMemberStatusText: (memberId: string, statusText: string) => void;
}

export const MemberPresenceBar: React.FC<MemberPresenceBarProps> = ({
  members,
  currentMember,
  onUpdateMemberStatusText,
}) => {
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatusText, setNewStatusText] = useState(currentMember.statusText || '');

  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateMemberStatusText(currentMember.id, newStatusText);
    setEditingStatus(false);
  };

  const getStatusDot = (status: Member['status']) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-400 ring-2 ring-emerald-400/20';
      case 'busy':
        return 'bg-rose-400 ring-2 ring-rose-400/20';
      case 'away':
        return 'bg-amber-400 ring-2 ring-amber-400/20';
      default:
        return 'bg-slate-500';
    }
  };

  const safeMembers = members || [];

  return (
    <div className="bg-slate-100/80 border-b border-slate-200 text-slate-700 py-2.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        
        {/* Left: Realtime Team Online Avatars */}
        <div className="flex items-center gap-3 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wider shrink-0 text-[11px]">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>实时协同在线 ({safeMembers.filter(m => m.status === 'online').length}/{safeMembers.length}):</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {safeMembers.map((member) => (
              <div
                key={member.id}
                className="group relative flex items-center gap-2 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs transition-all"
              >
                <div className="relative">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${getStatusDot(
                      member.status
                    )}`}
                  />
                </div>
                <span className="font-semibold text-slate-800">{member.name.split(' ')[0]}</span>
                
                {/* Status tooltip hover preview */}
                <div className="absolute left-0 top-8 hidden group-hover:block z-50 bg-white border border-slate-200 rounded-lg p-2.5 shadow-xl w-52 pointer-events-none">
                  <div className="font-semibold text-slate-900">{member.name}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">{member.role}</div>
                  <div className="text-[11px] text-slate-600 mt-1 italic border-t border-slate-100 pt-1">
                    "{member.statusText || '正在处理任务'}"
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>关联进行中任务:</span>
                    <span className="font-bold text-slate-800">{member.workloadCount || 0} 个</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Current User Status Text Quick Update */}
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-200 pt-2 md:pt-0">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-500">我的实时状态:</span>
          </div>

          {editingStatus ? (
            <form onSubmit={handleSaveStatus} className="flex items-center gap-1.5">
              <input
                type="text"
                value={newStatusText}
                onChange={(e) => setNewStatusText(e.target.value)}
                placeholder="例如：正在处理 TS-101 拖拽逻辑"
                className="bg-white border border-emerald-500 rounded px-2 py-0.5 text-xs text-slate-800 focus:outline-none w-52"
                autoFocus
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white p-1 rounded font-bold cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setNewStatusText(currentMember.statusText || '');
                setEditingStatus(true);
              }}
              className="flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 font-medium bg-white px-2.5 py-1 rounded-md border border-slate-200 hover:border-slate-300 transition-all text-[11px] group cursor-pointer shadow-2xs"
              title="点击修改实时状态"
            >
              <MessageSquareQuote className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
              <span className="truncate max-w-[200px]">"{currentMember.statusText || '设置当前工作状态...'}"</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
