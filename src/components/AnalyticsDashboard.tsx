import React, { useState } from 'react';
import { Task, Member } from '../types';
import {
  TrendingUp,
  PieChart,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart2,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  tasks: Task[];
  members: Member[];
  onGenerateAiSummary: () => void;
  aiSummary: string;
  isGeneratingSummary: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  tasks = [],
  members = [],
  onGenerateAiSummary,
  aiSummary,
  isGeneratingSummary,
}) => {
  const safeTasks = tasks || [];
  const safeMembers = members || [];

  const totalTasks = safeTasks.length;
  const completedTasks = safeTasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = safeTasks.filter((t) => t.status === 'in_progress').length;
  const reviewTasks = safeTasks.filter((t) => t.status === 'review').length;
  const urgentTasks = safeTasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length;

  const totalEstimatedHours = safeTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const completedHours = safeTasks
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const hoursPercent =
    totalEstimatedHours > 0 ? Math.round((completedHours / totalEstimatedHours) * 100) : 0;

  // Workload per member
  const memberWorkload = safeMembers.map((m) => {
    const memberTasks = safeTasks.filter((t) => (t.assigneeIds || []).includes(m.id) && t.status !== 'done');
    const totalHours = memberTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    return {
      member: m,
      taskCount: memberTasks.length,
      hours: totalHours,
    };
  });

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      
      {/* Top Banner & AI Sprint Summary Trigger */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-white">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Sprint 24 状态监控中心</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">
            整体完成进度 {completionPercent}% （{completedTasks}/{totalTasks} 任务已归档）
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            已交付 {completedHours} 小时工时，剩余 {totalEstimatedHours - completedHours} 小时
          </p>
        </div>

        <button
          onClick={onGenerateAiSummary}
          disabled={isGeneratingSummary}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4 text-purple-200 animate-spin-slow" />
          <span>{isGeneratingSummary ? 'AI 正在分析全站任务...' : '✨ 一键生成 AI 站会与迭代总结'}</span>
        </button>
      </div>

      {/* AI Sprint Summary Box */}
      {aiSummary && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2 text-purple-900 font-bold text-sm mb-3">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>牛磨 AI Copilot 站会与风险总结报告:</span>
          </div>
          <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans bg-white p-4 rounded-xl border border-purple-100 shadow-2xs">
            {aiSummary}
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span>任务总数</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalTasks} <span className="text-xs font-normal text-slate-500">个</span></div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden border border-slate-200/60">
            <div className="bg-emerald-500 h-full" style={{ width: `${completionPercent}%` }} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span>推进中与测试</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{inProgressTasks + reviewTasks} <span className="text-xs font-normal text-slate-500">个</span></div>
          <div className="text-[11px] text-slate-500 mt-2">
            进行中: {inProgressTasks} | 测试中: {reviewTasks}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span>未解决紧急任务</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">{urgentTasks} <span className="text-xs font-normal text-slate-500">项</span></div>
          <div className="text-[11px] text-rose-600 mt-2 font-medium">
            {urgentTasks > 0 ? '需优先处理卡阻卡片' : '暂无卡阻紧急任务'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span>预估工时交付率</span>
            <BarChart2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600">{hoursPercent}%</div>
          <div className="text-[11px] text-slate-500 mt-2">
            {completedHours} / {totalEstimatedHours} 小时
          </div>
        </div>

      </div>

      {/* Member Workload Distribution & Status Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Workload Allocation per Member */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">成员负荷与任务分配 (Workload Distribution)</h3>
            </div>
            <span className="text-xs text-slate-400">仅显示未完成任务</span>
          </div>

          <div className="space-y-4">
            {memberWorkload.map(({ member, taskCount, hours }) => {
              const maxHours = 30;
              const loadPercent = Math.min(100, Math.round((hours / maxHours) * 100));

              return (
                <div key={member.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <img src={member.avatar} alt={member.name} className="w-6 h-6 rounded-full object-cover" />
                      <span className="font-semibold text-slate-800">{member.name}</span>
                      <span className="text-[10px] text-slate-400">({member.role})</span>
                    </div>
                    <div className="font-mono text-slate-500">
                      <span className="text-slate-800 font-bold">{taskCount}</span> 个任务 ({hours}h)
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className={`h-full transition-all duration-300 ${
                        loadPercent > 80 ? 'bg-rose-500' : loadPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(5, loadPercent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Priority & Status Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">任务状态分布 (Status Breakdown)</h3>
          </div>

          <div className="space-y-3">
            {[
              { id: 'backlog', label: 'Backlog 积压', count: tasks.filter((t) => t.status === 'backlog').length, color: 'bg-slate-400' },
              { id: 'todo', label: '待办 (To Do)', count: tasks.filter((t) => t.status === 'todo').length, color: 'bg-blue-500' },
              { id: 'in_progress', label: '进行中 (In Progress)', count: tasks.filter((t) => t.status === 'in_progress').length, color: 'bg-amber-500' },
              { id: 'review', label: '测试 (Test)', count: tasks.filter((t) => t.status === 'review').length, color: 'bg-purple-500' },
              { id: 'done', label: '已完成 (Done)', count: tasks.filter((t) => t.status === 'done').length, color: 'bg-emerald-500' },
            ].map((st) => {
              const pct = totalTasks > 0 ? Math.round((st.count / totalTasks) * 100) : 0;
              return (
                <div key={st.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{st.label}</span>
                    <span className="font-mono text-slate-500">{st.count} 项 ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                    <div className={`${st.color} h-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
