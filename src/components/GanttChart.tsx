import React from 'react';
import { Task, Member } from '../types';
import { Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface GanttChartProps {
  tasks: Task[];
  members: Member[];
  onTaskClick: (task: Task) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({ tasks, members, onTaskClick }) => {
  // Generate date timeline headers for August 2026 (Aug 01 to Aug 15)
  const days = Array.from({ length: 15 }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `2026-08-${dayNum < 10 ? '0' + dayNum : dayNum}`;
    return { dayNum, dateStr };
  });

  const getDayOffset = (dateStr: string) => {
    // Parse dateStr (e.g. "2026-08-03")
    const d = parseInt(dateStr.split('-')[2] || '1', 10);
    return Math.max(1, Math.min(15, d));
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">Sprint 24 项目排期甘特图 (2026年8月)</h2>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
            <span>进行中</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-purple-600 inline-block" />
            <span>代码评审</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600 inline-block" />
            <span>已完成</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            {/* Header row with date columns */}
            <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 py-3 text-xs font-semibold text-slate-500">
              <div className="col-span-4 px-4">任务名称 & 经办人</div>
              <div className="col-span-8 grid grid-cols-[repeat(15,minmax(0,1fr))] text-center font-mono">
                {days.map((d) => (
                  <div key={d.dayNum} className="border-r border-slate-200/80 last:border-r-0 py-1">
                    <span className="block text-[10px] text-slate-400">8月</span>
                    <span className="font-bold text-slate-800">{d.dayNum}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Gantt Rows */}
            <div className="divide-y divide-slate-100 text-xs">
              {tasks.map((task) => {
                const startDay = getDayOffset(task.startDate);
                const endDay = getDayOffset(task.dueDate);
                const duration = Math.max(1, endDay - startDay + 1);

                const checklist = task.checklist || [];
                const completedChecklist = checklist.filter((c) => c.completed).length;
                const totalChecklist = checklist.length;
                const percent =
                  task.status === 'done'
                    ? 100
                    : totalChecklist > 0
                    ? Math.round((completedChecklist / totalChecklist) * 100)
                    : 40;

                const statusColorMap: Record<string, string> = {
                  backlog: 'bg-slate-200 text-slate-700 border border-slate-300',
                  todo: 'bg-blue-600 text-white',
                  in_progress: 'bg-amber-500 text-white',
                  review: 'bg-purple-600 text-white',
                  done: 'bg-emerald-600 text-white',
                };

                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="grid grid-cols-12 hover:bg-slate-50 transition-colors items-center py-3 cursor-pointer group"
                  >
                    {/* Left Task Title & Info */}
                    <div className="col-span-4 px-4 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[11px] font-bold text-slate-400 group-hover:text-emerald-600">
                            {task.id}
                          </span>
                          <span className="font-semibold text-slate-800 group-hover:text-emerald-700 truncate">{task.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span>
                            {task.startDate} ~ {task.dueDate}
                          </span>
                          <span>•</span>
                          <span>{task.estimatedHours}h 工时</span>
                        </div>
                      </div>

                      {/* Assignee Avatars */}
                      <div className="flex items-center -space-x-1.5 shrink-0">
                        {task.assigneeIds.map((id) => {
                          const m = members.find((mem) => mem.id === id);
                          if (!m) return null;
                          return (
                            <img
                              key={m.id}
                              src={m.avatar}
                              alt={m.name}
                              title={m.name}
                              className="w-5 h-5 rounded-full object-cover ring-1 ring-white"
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Timeline Grid & Progress Bar */}
                    <div className="col-span-8 grid grid-cols-[repeat(15,minmax(0,1fr))] relative h-9 items-center px-1">
                      {/* Grid Lines */}
                      {days.map((d) => (
                        <div
                          key={d.dayNum}
                          className="h-full border-r border-slate-100 last:border-r-0"
                        />
                      ))}

                      {/* Floating Task Schedule Bar */}
                      <div
                        className={`absolute h-7 rounded-lg shadow-xs ${
                          statusColorMap[task.status] || 'bg-indigo-600 text-white'
                        } flex items-center px-2 text-[10px] font-bold overflow-hidden transition-all group-hover:ring-2 group-hover:ring-emerald-500`}
                        style={{
                          left: `${((startDay - 1) / 15) * 100}%`,
                          width: `${(duration / 15) * 100}%`,
                        }}
                      >
                        {/* Progress overlay */}
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-black/15"
                          style={{ width: `${percent}%` }}
                        />
                        <span className="relative z-10 truncate">{percent}% {task.title}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
