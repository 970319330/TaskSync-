import React, { useState, useEffect } from 'react';
import { Pagination } from './Pagination';
import {
  X,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Server,
  User,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface ZentaoTask {
  ztId: string;
  id: string;
  title: string;
  status: string;
  priority: string;
  projectName: string;
  projectId: string;
  estimate: string;
  consumed: string;
  left: string;
  deadline: string;
  assignedTo: string;
  openedBy: string;
  openedDate: string;
  type: string;
  storyTitle: string;
  // 详情字段（task-view 获取）
  desc?: string;
  storySpec?: string;
  storyVerify?: string;
  progress?: number;
  realStarted?: string;
  parent?: string;
  parentName?: string;
  assignedToRealName?: string;
  modulePath?: string;
  activities?: { actor: string; action: string; date: string; comment: string }[];
}

interface ZentaoSyncModalProps {
  onClose: () => void;
  onImport: (tasks: ZentaoTask[]) => void;
}

const statusMap: Record<string, { label: string; color: string }> = {
  backlog: { label: 'Backlog', color: 'bg-slate-100 text-slate-600' },
  todo: { label: '待办', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: '进行中', color: 'bg-amber-100 text-amber-700' },
  done: { label: '已完成', color: 'bg-emerald-100 text-emerald-700' },
};

const priorityMap: Record<string, { label: string; color: string }> = {
  urgent: { label: '紧急', color: 'bg-rose-100 text-rose-700' },
  high: { label: '高级', color: 'bg-orange-100 text-orange-700' },
  medium: { label: '中等', color: 'bg-blue-100 text-blue-700' },
  low: { label: '低级', color: 'bg-slate-100 text-slate-600' },
};

export const ZentaoSyncModal: React.FC<ZentaoSyncModalProps> = ({ onClose, onImport }) => {
  const [account, setAccount] = useState('zhangq');
  const [password, setPassword] = useState('zhangq');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [ztTasks, setZtTasks] = useState<ZentaoTask[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 重新同步拉到新数据后回到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [ztTasks]);

  // 当前页任务
  const pagedTasks = ztTasks
    ? ztTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : [];

  const handleSync = async () => {
    setError('');
    setLoading(true);
    setZtTasks(null);
    try {
      const res = await fetch('/api/zentao/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '同步失败');
      }
      setZtTasks(data.tasks);
      // 默认全选
      setSelectedIds(new Set(data.tasks.map((t: ZentaoTask) => t.id)));
    } catch (err: any) {
      setError(err.message || '禅道同步失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!ztTasks) return;
    if (selectedIds.size === ztTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ztTasks.map((t) => t.id)));
    }
  };

  const handleImport = () => {
    if (!ztTasks) return;
    const selected = ztTasks.filter((t) => selectedIds.has(t.id));
    if (selected.length === 0) return;
    setImporting(true);
    onImport(selected);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Server className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">禅道数据同步</h2>
              <p className="text-[11px] text-slate-500">
                从禅道（124.70.211.186:7099）同步任务到 牛磨
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 登录表单 */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  禅道账号
                </label>
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="zhangq"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-500" />
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>
            </div>
            <button
              onClick={handleSync}
              disabled={loading || !account || !password}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在同步禅道数据（含任务详情）...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>获取禅道任务</span>
                </>
              )}
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 任务预览 */}
          {ztTasks && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-bold text-slate-800">
                    获取到 {ztTasks.length} 条禅道任务
                  </span>
                  <span className="text-xs text-slate-500">
                    （已选 {selectedIds.size} / {ztTasks.length}）
                  </span>
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                >
                  {selectedIds.size === ztTasks.length ? '取消全选' : '全选'}
                </button>
              </div>

              {/* 任务列表 */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="p-2.5 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === ztTasks.length && ztTasks.length > 0}
                          onChange={toggleSelectAll}
                          title="全选/取消全选所有任务（含其他分页）"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="p-2.5 text-left">ID</th>
                      <th className="p-2.5 text-left">任务名称 / 详情</th>
                      <th className="p-2.5 text-left">项目</th>
                      <th className="p-2.5 text-left">状态</th>
                      <th className="p-2.5 text-left">优先级</th>
                      <th className="p-2.5 text-left w-20">进度</th>
                      <th className="p-2.5 text-left">截止</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTasks.map((t) => {
                      const isSelected = selectedIds.has(t.id);
                      const st = statusMap[t.status] || statusMap.todo;
                      const pri = priorityMap[t.priority] || priorityMap.low;
                      const prog = t.progress || 0;
                      return (
                        <tr
                          key={t.id}
                          onClick={() => toggleSelect(t.id)}
                          className={`border-b border-slate-100 cursor-pointer transition-colors align-top ${
                            isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="p-2.5 font-mono font-bold text-indigo-600 whitespace-nowrap">{t.id}</td>
                          <td className="p-2.5 text-slate-800 font-medium max-w-xs">
                            <div className="truncate">{t.title}</div>
                            {/* 详情信息 */}
                            <div className="space-y-0.5 mt-1">
                              {t.storyTitle && (
                                <div className="text-[10px] text-indigo-500 truncate">
                                  需求: {t.storyTitle}
                                </div>
                              )}
                              {t.modulePath && (
                                <div className="text-[10px] text-slate-400 truncate">
                                  模块: {t.modulePath}
                                </div>
                              )}
                              {t.parentName && (
                                <div className="text-[10px] text-slate-400 truncate">
                                  父任务: {t.parentName}
                                </div>
                              )}
                              {t.desc && (() => {
                                const hasImg = /<img[^>]+src=/i.test(t.desc);
                                const cleanDesc = t.desc.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
                                return (cleanDesc || hasImg) ? (
                                  <div className="text-[10px] text-slate-400 line-clamp-2">
                                    {hasImg && <span className="text-indigo-400">[含图片] </span>}
                                    {cleanDesc}
                                  </div>
                                ) : null;
                              })()}
                              {t.activities && t.activities.length > 0 && (
                                <div className="text-[10px] text-emerald-500">
                                  {t.activities.length} 条操作记录
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-slate-600 whitespace-nowrap">{t.projectName}</td>
                          <td className="p-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${st.color}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${pri.color}`}>
                              {pri.label}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1">
                              <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${prog}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">{prog}%</span>
                            </div>
                          </td>
                          <td className="p-2.5 text-slate-500 font-mono whitespace-nowrap">{t.deadline || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* 分页控件（紧凑模式适配弹窗） */}
                <Pagination
                  totalItems={ztTasks.length}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[10, 20, 50]}
                  compact
                />
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ArrowRight className="w-3 h-3" />
                <span>
                  同步时已获取每个任务的完整详情（描述、需求规格、验收标准、操作动态、模块路径等），导入后将填充到任务描述和活动记录中。重复导入时将更新已有任务。
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            服务器：124.70.211.186:7099 / zentao
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              关闭
            </button>
            <button
              onClick={handleImport}
              disabled={!ztTasks || selectedIds.size === 0 || importing}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>
                {importing
                  ? '导入中...'
                  : `导入 ${selectedIds.size} 条任务`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
