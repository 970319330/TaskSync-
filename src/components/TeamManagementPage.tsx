import React, { useState } from 'react';
import { Member, Role, Permission } from '../types';
import { ArrowLeft, Users, Shield, Plus, Trash2, Edit3, Check, Mail, AlertCircle, UserCog } from 'lucide-react';

interface TeamManagementPageProps {
  members: Member[];
  roles: Role[];
  currentMember: Member;
  onClose: () => void;
  onUpdateMembers: (members: Member[]) => void;
  onUpdateRoles: (roles: Role[]) => void;
}

// 权限标签映射
const PERMISSION_LABELS: Record<Permission, string> = {
  assign_task: '指派任务',
  create_task: '创建任务',
  delete_task: '删除任务',
  manage_members: '管理成员',
  manage_roles: '管理角色',
  manage_projects: '管理项目',
};

// 所有权限列表
const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

// 颜色选项
const COLOR_OPTIONS = [
  { value: 'bg-emerald-600', label: '绿色' },
  { value: 'bg-blue-600', label: '蓝色' },
  { value: 'bg-indigo-600', label: '靛蓝' },
  { value: 'bg-rose-600', label: '玫红' },
  { value: 'bg-amber-600', label: '琥珀' },
  { value: 'bg-purple-600', label: '紫色' },
  { value: 'bg-slate-600', label: '灰色' },
];

// 状态点颜色映射
const STATUS_DOT: Record<string, string> = {
  online: 'bg-emerald-500',
  busy: 'bg-rose-500',
  away: 'bg-amber-500',
  offline: 'bg-slate-400',
};

export const TeamManagementPage: React.FC<TeamManagementPageProps> = ({
  members,
  roles,
  currentMember,
  onClose,
  onUpdateMembers,
  onUpdateRoles,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');

  // 人员管理状态
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [confirmDeleteMemberId, setConfirmDeleteMemberId] = useState<string | null>(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRoleId, setNewMemberRoleId] = useState<string>('');
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberEmail, setEditMemberEmail] = useState('');
  const [editMemberRoleId, setEditMemberRoleId] = useState<string>('');

  // 角色管理状态
  const [showAddRole, setShowAddRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [confirmDeleteRoleId, setConfirmDeleteRoleId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('bg-slate-600');
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');
  const [editRoleColor, setEditRoleColor] = useState('bg-slate-600');
  const [editRolePermissions, setEditRolePermissions] = useState<Permission[]>([]);

  // 只有系统管理员才能修改人员和角色
  const canManage = currentMember.isAdmin === true;

  const getRoleById = (roleId?: string) => roles.find((r) => r.id === roleId);
  const getRoleName = (roleId?: string) => {
    const role = getRoleById(roleId);
    return role ? role.name : '未分配角色';
  };

  // ============ 人员管理操作 ============

  const handleStartAddMember = () => {
    setShowAddMember(true);
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRoleId(roles[0]?.id || '');
  };

  const handleAddMember = async () => {
    const name = newMemberName.trim();
    if (!name) return;
    const role = getRoleById(newMemberRoleId);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: newMemberEmail.trim(),
          roleId: newMemberRoleId || undefined,
          role: role?.name || '团队成员',
          avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150`,
          avatarBg: role?.color || 'bg-slate-600',
        }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdateMembers(data.members);
        setShowAddMember(false);
        setNewMemberName('');
        setNewMemberEmail('');
        setNewMemberRoleId('');
      }
    } catch (err) {
      console.error('添加成员失败:', err);
    }
  };

  const handleStartEditMember = (m: Member) => {
    setEditingMemberId(m.id);
    setEditMemberName(m.name);
    setEditMemberEmail(m.email);
    setEditMemberRoleId(m.roleId || '');
  };

  const cancelEditMember = () => {
    setEditingMemberId(null);
    setConfirmDeleteMemberId(null);
  };

  const handleEditMember = async (id: string) => {
    const name = editMemberName.trim();
    if (!name) return;
    const role = getRoleById(editMemberRoleId);
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: editMemberEmail.trim(),
          roleId: editMemberRoleId || undefined,
          role: role?.name || '团队成员',
          avatarBg: role?.color || 'bg-slate-600',
          isAdmin: members.find((m) => m.id === id)?.isAdmin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdateMembers(data.members);
        setEditingMemberId(null);
      }
    } catch (err) {
      console.error('更新成员失败:', err);
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onUpdateMembers(data.members);
        setConfirmDeleteMemberId(null);
        if (editingMemberId === id) setEditingMemberId(null);
      }
    } catch (err) {
      console.error('删除成员失败:', err);
    }
  };

  // ============ 角色管理操作 ============

  const handleStartAddRole = () => {
    setShowAddRole(true);
    setNewRoleName('');
    setNewRoleDesc('');
    setNewRoleColor('bg-slate-600');
  };

  const handleAddRole = async () => {
    const name = newRoleName.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: newRoleDesc.trim(),
          color: newRoleColor,
          permissions: [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdateRoles(data.roles);
        setShowAddRole(false);
        setNewRoleName('');
        setNewRoleDesc('');
        setNewRoleColor('bg-slate-600');
      }
    } catch (err) {
      console.error('添加角色失败:', err);
    }
  };

  const handleStartEditRole = (r: Role) => {
    setEditingRoleId(r.id);
    setEditRoleName(r.name);
    setEditRoleDesc(r.description);
    setEditRoleColor(r.color);
    setEditRolePermissions(r.permissions);
    setRoleError(null);
  };

  const cancelEditRole = () => {
    setEditingRoleId(null);
    setConfirmDeleteRoleId(null);
    setRoleError(null);
  };

  const handleEditRole = async (id: string) => {
    const name = editRoleName.trim();
    if (!name) return;
    try {
      const res = await fetch(`/api/roles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: editRoleDesc.trim(),
          color: editRoleColor,
          permissions: editRolePermissions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdateRoles(data.roles);
        setEditingRoleId(null);
      }
    } catch (err) {
      console.error('更新角色失败:', err);
    }
  };

  const togglePermission = (perm: Permission) => {
    setEditRolePermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleDeleteRole = async (id: string) => {
    try {
      const res = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onUpdateRoles(data.roles);
        setConfirmDeleteRoleId(null);
        if (editingRoleId === id) setEditingRoleId(null);
      } else {
        setRoleError(data.error || '删除失败');
      }
    } catch (err) {
      console.error('删除角色失败:', err);
      setRoleError('删除角色失败，请重试');
    }
  };

  return (
    <div className="bg-slate-50 text-slate-900">
      {/* 页面头部 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-semibold hidden sm:inline">返回</span>
            </button>
            <div className="w-px h-6 bg-slate-200 shrink-0" />
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-md shrink-0">
                <UserCog className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-slate-900 text-base sm:text-lg leading-tight truncate">团队管理</h1>
                <p className="text-[11px] text-slate-500 truncate hidden sm:block">管理团队成员与角色权限</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{members.length} 位成员</span>
              <span className="sm:hidden">{members.length}</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{roles.length} 个角色</span>
              <span className="sm:hidden">{roles.length}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* 左侧导航 */}
          <aside className="col-span-12 lg:col-span-3">
            <nav className="space-y-1 lg:sticky lg:top-20">
              <button
                onClick={() => setActiveTab('members')}
                className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'members'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">人员管理</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'members' ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-500'
                }`}>
                  {members.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('roles')}
                className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'roles'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">角色管理</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'roles' ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-500'
                }`}>
                  {roles.length}
                </span>
              </button>
            </nav>

            {/* 权限说明卡片 */}
            <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">权限说明</h3>
              <div className="space-y-1.5">
                {ALL_PERMISSIONS.map((perm) => (
                  <div key={perm} className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                    <span className="font-medium">{PERMISSION_LABELS[perm]}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* 右侧内容 */}
          <main className="col-span-12 lg:col-span-9">
            {!canManage && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 font-medium">当前为只读模式，仅系统管理员可修改人员与角色配置</p>
              </div>
            )}
            {activeTab === 'members' && (
              <div className="space-y-4">
                {/* 区域标题 + 添加按钮 */}
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800">团队成员列表</h2>
                  {!showAddMember && canManage && (
                    <button
                      onClick={handleStartAddMember}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      添加成员
                    </button>
                  )}
                </div>

                {/* 添加成员表单 */}
                {showAddMember && (
                  <div className="border border-emerald-200 rounded-2xl p-5 space-y-4 bg-emerald-50/30 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-600" />
                      新增成员
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase">姓名</label>
                        <input
                          type="text"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          placeholder="输入成员姓名"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs font-semibold"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase">邮箱</label>
                        <input
                          type="email"
                          value={newMemberEmail}
                          onChange={(e) => setNewMemberEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase">角色</label>
                        <select
                          value={newMemberRoleId}
                          onChange={(e) => setNewMemberRoleId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setShowAddMember(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleAddMember}
                        disabled={!newMemberName.trim()}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Check className="w-3.5 h-3.5" />
                        添加
                      </button>
                    </div>
                  </div>
                )}

                {/* 成员表格 */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">成员</th>
                        <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">角色</th>
                        <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">状态</th>
                        <th className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">工作量</th>
                        <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => {
                        const isEditing = editingMemberId === m.id;
                        const isConfirming = confirmDeleteMemberId === m.id;
                        const isSelf = m.id === currentMember.id;
                        const role = getRoleById(m.roleId);

                        return (
                          <React.Fragment key={m.id}>
                            {/* 展示行 */}
                            {!isEditing && (
                              <tr className={`border-b border-slate-100 transition-colors hover:bg-slate-50/50 ${isSelf ? 'bg-emerald-50/20' : ''}`}>
                                {/* 成员（含邮箱） */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="relative shrink-0">
                                      <img
                                        src={m.avatar}
                                        alt={m.name}
                                        className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                                      />
                                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${STATUS_DOT[m.status]} ring-2 ring-white`} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-slate-900 text-sm truncate">{m.name}</span>
                                        {isSelf && <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded shrink-0">我</span>}
                                        {m.isAdmin && <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.5 rounded shrink-0">管理员</span>}
                                      </div>
                                      {m.email ? (
                                        <span className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                                          <Mail className="w-3 h-3 shrink-0" />
                                          {m.email}
                                        </span>
                                      ) : (
                                        <span className="text-[11px] text-slate-300">—</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                {/* 角色 */}
                                <td className="px-4 py-3">
                                  <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-md ${role?.color || 'bg-slate-400'}`}>
                                    {getRoleName(m.roleId)}
                                  </span>
                                </td>
                                {/* 状态 */}
                                <td className="px-4 py-3 hidden md:table-cell">
                                  <span className="text-xs text-slate-500">{m.statusText || '在线'}</span>
                                </td>
                                {/* 工作量 */}
                                <td className="px-4 py-3 hidden lg:table-cell text-center">
                                  <span className={`text-xs font-bold ${typeof m.workloadCount === 'number' && m.workloadCount > 3 ? 'text-rose-500' : 'text-slate-600'}`}>
                                    {typeof m.workloadCount === 'number' ? `${m.workloadCount} 个任务` : '—'}
                                  </span>
                                </td>
                                {/* 操作 */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-1">
                                    {canManage && (
                                      <button
                                        onClick={() => handleStartEditMember(m)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                        title="编辑"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {canManage && !isSelf && (
                                      <button
                                        onClick={() => setConfirmDeleteMemberId(m.id)}
                                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="删除"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}

                            {/* 删除确认行 */}
                            {!isEditing && isConfirming && (
                              <tr className="border-b border-slate-100 bg-rose-50/40">
                                <td colSpan={5} className="px-4 py-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs text-rose-700">
                                      确定要删除「{m.name}」吗？该操作无法撤销。
                                    </p>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        onClick={() => setConfirmDeleteMemberId(null)}
                                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                                      >
                                        取消
                                      </button>
                                      <button
                                        onClick={() => handleDeleteMember(m.id)}
                                        className="text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-500 px-2.5 py-1.5 rounded-lg cursor-pointer"
                                      >
                                        确认删除
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}

                            {/* 编辑行 */}
                            {isEditing && (
                              <tr className="border-b border-slate-100 bg-emerald-50/20">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <img src={m.avatar} alt={m.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm" />
                                    <div className="flex flex-col gap-1.5 min-w-0">
                                      <input
                                        type="text"
                                        value={editMemberName}
                                        onChange={(e) => setEditMemberName(e.target.value)}
                                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs font-semibold w-full max-w-[180px]"
                                        placeholder="姓名"
                                      />
                                      <input
                                        type="email"
                                        value={editMemberEmail}
                                        onChange={(e) => setEditMemberEmail(e.target.value)}
                                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs w-full max-w-[180px]"
                                        placeholder="邮箱"
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={editMemberRoleId}
                                    onChange={(e) => setEditMemberRoleId(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
                                  >
                                    {roles.map((r) => (
                                      <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                  <span className="text-xs text-slate-400">{m.statusText || '在线'}</span>
                                </td>
                                <td className="px-4 py-3 hidden lg:table-cell text-center">
                                  <span className="text-xs text-slate-400">{m.workloadCount ?? '—'}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={cancelEditMember}
                                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                    >
                                      取消
                                    </button>
                                    <button
                                      onClick={() => handleEditMember(m.id)}
                                      disabled={!editMemberName.trim()}
                                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      保存
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {members.length === 0 && !showAddMember && (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-400">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">暂无成员，请先添加</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'roles' && (
              <div className="space-y-3">
                {/* 区域标题 + 添加按钮 */}
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800">角色权限列表</h2>
                  {!showAddRole && canManage && (
                    <button
                      onClick={handleStartAddRole}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      添加角色
                    </button>
                  )}
                </div>

                {/* 添加角色表单 */}
                {showAddRole && (
                  <div className="border border-emerald-200 rounded-2xl p-5 space-y-4 bg-emerald-50/30 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-600" />
                      新增角色
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase">角色名称</label>
                        <input
                          type="text"
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          placeholder="如：测试工程师"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs font-semibold"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase">角色描述</label>
                        <input
                          type="text"
                          value={newRoleDesc}
                          onChange={(e) => setNewRoleDesc(e.target.value)}
                          placeholder="简要描述该角色的职责"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1.5 uppercase">标识色</label>
                      <div className="flex flex-wrap gap-2">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setNewRoleColor(c.value)}
                            className={`w-8 h-8 rounded-lg ${c.value} flex items-center justify-center transition-all cursor-pointer ${
                              newRoleColor === c.value ? 'ring-2 ring-offset-1 ring-slate-800 scale-105' : 'opacity-70 hover:opacity-100'
                            }`}
                            title={c.label}
                          >
                            {newRoleColor === c.value && <Check className="w-4 h-4 text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setShowAddRole(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleAddRole}
                        disabled={!newRoleName.trim()}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Check className="w-3.5 h-3.5" />
                        添加
                      </button>
                    </div>
                  </div>
                )}

                {/* 角色列表 */}
                {roles.map((r) => {
                  const isEditing = editingRoleId === r.id;
                  const isConfirming = confirmDeleteRoleId === r.id;
                  const memberCount = members.filter((m) => m.roleId === r.id).length;

                  return (
                    <div key={r.id} className="border border-slate-200 rounded-2xl bg-white shadow-2xs">
                      {/* 展示态 */}
                      {!isEditing && (
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`w-10 h-10 rounded-xl ${r.color} flex items-center justify-center text-white shrink-0 shadow-xs`}>
                                <Shield className="w-4.5 h-4.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 text-sm">{r.name}</span>
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {r.permissions.length} 项权限
                                  </span>
                                </div>
                                {r.description && (
                                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{r.description}</p>
                                )}
                                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                                  <Users className="w-3 h-3" />
                                  <span>{memberCount} 位成员关联</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {canManage && (
                                <button
                                  onClick={() => handleStartEditRole(r)}
                                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="编辑"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}
                              {canManage && (
                                <button
                                  onClick={() => {
                                    setConfirmDeleteRoleId(r.id);
                                    setRoleError(null);
                                  }}
                                  className="p-2 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 权限标签预览 */}
                          {r.permissions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                              {r.permissions.map((p) => (
                                <span
                                  key={p}
                                  className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                                >
                                  {PERMISSION_LABELS[p]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 删除确认 */}
                      {!isEditing && isConfirming && (
                        <div className="px-4 pb-4 -mt-1">
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-3">
                            <p className="text-xs text-rose-700 flex-1">
                              确定要删除角色「{r.name}」吗？
                              {memberCount > 0 && ' 该角色仍有成员关联，可能无法删除。'}
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => setConfirmDeleteRoleId(null)}
                                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                              >
                                取消
                              </button>
                              <button
                                onClick={() => handleDeleteRole(r.id)}
                                className="text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-500 px-2.5 py-1.5 rounded-lg cursor-pointer"
                              >
                                确认删除
                              </button>
                            </div>
                          </div>
                          {roleError && (
                            <div className="mt-2 bg-rose-50 border border-rose-300 rounded-xl p-2.5 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <p className="text-[11px] text-rose-700">{roleError}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 编辑态 */}
                      {isEditing && (
                        <div className="p-4 space-y-4 bg-slate-50/50">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase">角色名称</label>
                              <input
                                type="text"
                                value={editRoleName}
                                onChange={(e) => setEditRoleName(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs font-semibold"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase">角色描述</label>
                              <input
                                type="text"
                                value={editRoleDesc}
                                onChange={(e) => setEditRoleDesc(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1.5 uppercase">标识色</label>
                            <div className="flex flex-wrap gap-2">
                              {COLOR_OPTIONS.map((c) => (
                                <button
                                  key={c.value}
                                  type="button"
                                  onClick={() => setEditRoleColor(c.value)}
                                  className={`w-8 h-8 rounded-lg ${c.value} flex items-center justify-center transition-all cursor-pointer ${
                                    editRoleColor === c.value ? 'ring-2 ring-offset-1 ring-slate-800 scale-105' : 'opacity-70 hover:opacity-100'
                                  }`}
                                  title={c.label}
                                >
                                  {editRoleColor === c.value && <Check className="w-4 h-4 text-white" />}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 权限管理 */}
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-2 uppercase">
                              权限管理 ({editRolePermissions.length}/{ALL_PERMISSIONS.length})
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {ALL_PERMISSIONS.map((perm) => {
                                const checked = editRolePermissions.includes(perm);
                                return (
                                  <label
                                    key={perm}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                                      checked
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => togglePermission(perm)}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span className="text-xs font-semibold">{PERMISSION_LABELS[perm]}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={cancelEditRole}
                              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => handleEditRole(r.id)}
                              disabled={!editRoleName.trim()}
                              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Check className="w-3.5 h-3.5" />
                              保存
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {roles.length === 0 && !showAddRole && (
                  <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无角色，请先添加</p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
