import React, { useState } from 'react';
import { Member, Role } from '../types';
import { hasPermission } from '../permissions';
import {
  Loader2, LogIn, ShieldCheck, User as UserIcon, Lock, Eye, EyeOff, Sparkles,
  Server, CheckCircle2, AlertCircle, CloudDownload,
} from 'lucide-react';

interface LoginProps {
  members: Member[];
  roles: Role[];
  onLogin: (memberId: string) => void;
}

type LoginMode = 'local' | 'zentao';

export const Login: React.FC<LoginProps> = ({ members, roles, onLogin }) => {
  const [mode, setMode] = useState<LoginMode>('local');

  // 本地登录 state
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 禅道登录 state
  const [ztAccount, setZtAccount] = useState('zhangq');
  const [ztPassword, setZtPassword] = useState('zhangq');
  const [ztLoading, setZtLoading] = useState(false);
  const [ztError, setZtError] = useState('');
  const [ztResult, setZtResult] = useState<{ memberName: string; taskCount: number; imported: number; updated: number } | null>(null);

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const canViewAll = selectedMember
    ? hasPermission(selectedMember, 'assign_task', roles)
    : false;

  const handleLocalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedMemberId) { setError('请选择您的账号'); return; }
    if (!password.trim()) { setError('请输入密码'); return; }
    setSubmitting(true);
    // 本地登录：清除禅道会话标记
    sessionStorage.removeItem('tasksync_login_source');
    sessionStorage.removeItem('tasksync_zentao_member_id');
    setTimeout(() => { onLogin(selectedMemberId); setSubmitting(false); }, 450);
  };

  const handleZentaoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setZtError('');
    setZtResult(null);
    if (!ztAccount.trim()) { setZtError('请输入禅道账号'); return; }
    if (!ztPassword.trim()) { setZtError('请输入密码'); return; }
    setZtLoading(true);
    try {
      const res = await fetch('/api/zentao/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: ztAccount, password: ztPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '禅道登录失败');
      setZtResult({
        memberName: data.memberName,
        taskCount: data.taskCount,
        imported: data.imported,
        updated: data.updated,
      });
      // 标记本次为禅道登录会话：登录后只显示禅道同步的项目/任务/成员/频道
      sessionStorage.setItem('tasksync_login_source', 'zentao');
      sessionStorage.setItem('tasksync_zentao_member_id', data.memberId);
      // 短暂展示结果后自动登录
      setTimeout(() => { onLogin(data.memberId); }, 1800);
    } catch (err: any) {
      setZtError(err.message || '禅道登录失败');
    } finally {
      setZtLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/40 to-teal-50/30 flex items-center justify-center p-4 sm:p-6 font-sans">
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-extrabold text-xl shadow-lg shadow-emerald-500/25 mb-3">
            TS
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">TaskSync</h1>
          <p className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase mt-0.5">Collaboration Cloud</p>
          <p className="text-xs text-slate-500 mt-3">登录你的协作空间，开始高效推进任务</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-7">
          {/* Tab 切换 */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
            <button
              onClick={() => { setMode('local'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'local' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>本地账号</span>
            </button>
            <button
              onClick={() => { setMode('zentao'); setZtError(''); setZtResult(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'zentao' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>禅道登录</span>
            </button>
          </div>

          {/* 本地账号登录 */}
          {mode === 'local' && (
            <form onSubmit={handleLocalLogin} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>选择账号</span>
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs font-medium"
                >
                  <option value="">- 请选择您的身份 -</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role}){m.zentaoAccount ? ` [禅道:${m.zentaoAccount}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMember && (
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <img src={selectedMember.avatar} alt={selectedMember.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{selectedMember.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{selectedMember.role}</div>
                  </div>
                  {canViewAll ? (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full">
                      <ShieldCheck className="w-3 h-3" />全局可见
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded-full">
                      <UserIcon className="w-3 h-3" />仅本人任务
                    </span>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" /><span>密码</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="演示模式：任意密码均可登录"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer" title={showPassword ? '隐藏密码' : '显示密码'}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}

              <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                <span>{submitting ? '登录中...' : '登录到工作空间'}</span>
              </button>
            </form>
          )}

          {/* 禅道登录 */}
          {mode === 'zentao' && (
            <form onSubmit={handleZentaoLogin} className="space-y-5">
              {/* 同步结果展示 */}
              {ztResult ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center text-center py-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="text-sm font-bold text-slate-900">禅道登录成功</div>
                    <div className="text-xs text-slate-500 mt-1">欢迎，{ztResult.memberName}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl py-2.5">
                      <div className="text-lg font-extrabold text-indigo-600">{ztResult.taskCount}</div>
                      <div className="text-[10px] text-slate-500">禅道任务</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl py-2.5">
                      <div className="text-lg font-extrabold text-emerald-600">{ztResult.imported}</div>
                      <div className="text-[10px] text-slate-500">新导入</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl py-2.5">
                      <div className="text-lg font-extrabold text-amber-600">{ztResult.updated}</div>
                      <div className="text-[10px] text-slate-500">已更新</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                    <span>正在进入工作空间...</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 text-[11px] text-indigo-700">
                    <Server className="w-3.5 h-3.5 shrink-0" />
                    <span>连接禅道服务器 <strong>124.70.211.186:7099</strong>，登录后自动同步任务（含详情、需求规格、图片）</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-indigo-600" /><span>禅道账号</span>
                    </label>
                    <input
                      type="text"
                      value={ztAccount}
                      onChange={(e) => setZtAccount(e.target.value)}
                      placeholder="zhangq"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" /><span>密码</span>
                    </label>
                    <input
                      type="password"
                      value={ztPassword}
                      onChange={(e) => setZtPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                    />
                  </div>

                  {ztError && (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-xs text-rose-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{ztError}</span>
                    </div>
                  )}

                  <button type="submit" disabled={ztLoading} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                    {ztLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>登录并同步禅道数据（含详情）...</span>
                      </>
                    ) : (
                      <>
                        <CloudDownload className="w-4 h-4" />
                        <span>禅道登录并同步</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          )}

          {/* Demo 提示 */}
          {mode === 'local' && (
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-700">演示模式：</strong>
                选择任意成员并输入任意非空密码即可登录。管理员 / 产品经理可查看全部任务；其他角色仅能看到自己经办或报告的任务。
              </span>
            </div>
          )}
          {mode === 'zentao' && !ztResult && (
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-700">禅道登录：</strong>
                使用禅道账号密码登录，自动同步你的禅道任务（含任务详情、需求规格、图片）到 TaskSync。首次登录会自动创建/匹配本地账号。
              </span>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-5">
          © 2026 TaskSync Collaboration Cloud · 安全协同 · 高效交付
        </p>
      </div>
    </div>
  );
};
