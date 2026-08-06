import React from 'react';
import { Task, Member, Project } from '../types';
import { Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface GanttChartProps {
  tasks: Task[];
  members: Member[];
  activeProject?: Project | null;
  onTaskClick: (task: Task) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  members,
  activeProject,
  onTaskClick,
}) => {
  const displayTasks = tasks;

  // 根据任务实际日期范围动态生成时间线
  const { days, totalDays, monthLabel, getDayOffset } = (() => {
    // 收集所有任务的起止日期
    const allDates = displayTasks.flatMap((t) => [t.startDate, t.dueDate]).filter(Boolean).sort();
    if (allDates.length === 0) {
      // 无任务时默认显示当月 1-31 日
      const fallback = Array.from({ length: 31 }, (_, i) => {
        const dayNum = i + 1;
        return { dayNum, dateStr: `2026-08-${dayNum < 10 ? '0' + dayNum : dayNum}` };
      });
      return {
        days: fallback,
        totalDays: 31,
        monthLabel: '8月',
        getDayOffset: (dateStr: string) => {
          const d = parseInt((dateStr || '2026-08-01').split('-')[2] || '1', 10);
          return Math.max(1, Math.min(31, d));
        },
      };
    }

    const minDate = new Date(allDates[0]);
    const maxDate = new Date(allDates[allDates.length - 1]);
    // 至少显示 7 天，避免太窄
    const diffDays = Math.max(7, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const dayList = Array.from({ length: diffDays }, (_, i) => {
      const dt = new Date(minDate);
      dt.setDate(dt.getDate() + i);
      const dayNum = dt.getDate();
      const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      return { dayNum, dateStr };
    });

    const offsetFn = (dateStr: string) => {
      const target = new Date(dateStr);
      const idx = Math.round((target.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, Math.min(diffDays, idx));
    };

    return { days: dayList, totalDays: diffDays, monthLabel: `${minDate.getMonth() + 1}月`, getDayOffset: offsetFn };
  })();

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">
            {activeProject ? activeProject.name : 'Sprint'} 项目甘特图
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs text-slate-600 font-medium hidden sm:flex">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
              <span>进行中</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-600 inline-block" />
              <span>测试</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-600 inline-block" />
              <span>已完成</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[1100px]">
            {/* Header row with date columns */}
            <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 py-3 text-xs font-semibold text-slate-500">
              <div className="col-span-4 px-4">任务 & 经办人</div>
              <div className="col-span-8 grid text-center font-mono" style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(0, 1fr))` }}>
                {days.map((d) => (
                  <div key={d.dayNum} className="border-r border-slate-200/80 last:border-r-0 py-1">
                    <span className="block text-[9px] text-slate-400">{monthLabel}</span>
                    <span className="font-bold text-slate-800 text-[11px]">{d.dayNum}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Gantt Rows */}
            <div className="divide-y divide-slate-100 text-xs">
              {displayTasks.map((task) => {
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
                    {/* Left Task Title */}
                    <div className="col-span-4 px-4 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[11px] font-bold text-slate-400 group-hover:text-emerald-600">
                            {task.id}
                          </span>
                          <span className="font-semibold text-slate-800 group-hover:text-emerald-700 truncate">
                            {task.title}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap">
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
                    <div className="col-span-8 grid relative h-9 items-center px-1" style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(0, 1fr))` }}>
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
                          left: `${((startDay - 1) / totalDays) * 100}%`,
                          width: `${(duration / totalDays) * 100}%`,
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
