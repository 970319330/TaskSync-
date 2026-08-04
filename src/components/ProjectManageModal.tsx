import React, { useState } from 'react';
import { Member, Project } from '../types';
import { getProjectPath, setProjectPath, removeProjectPath, startDevInTrae } from '../utils/trae';
import {
  X,
  Layers,
  Edit3,
  Trash2,
  Check,
  Users,
  FolderKanban,
  AlertCircle,
  Folder,
  ExternalLink,
  Eraser,
} from 'lucide-react';

interface ProjectManageModalProps {
  projects: Project[];
  members: Member[];
  activeProject: Project;
  onClose: () => void;
  onUpdateProject: (id: string, data: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onSelectProject: (p: Project) => void;
}

const COLOR_DOT: Record<string, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  purple: 'bg-purple-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  teal: 'bg-teal-500',
  slate: 'bg-slate-500',
};

const COLOR_OPTIONS = ['emerald', 'blue', 'indigo', 'purple', 'rose', 'amber', 'teal', 'slate'];

export const ProjectManageModal: React.FC<ProjectManageModalProps> = ({
  projects,
  members,
  activeProject,
  onClose,
  onUpdateProject,
  onDeleteProject,
  onSelectProject,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('emerald');
  const [editMemberIds, setEditMemberIds] = useState<string[]>([]);
  const [editLocalPath, setEditLocalPath] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startEdit = (p: Project) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditKey(p.key);
    setEditDescription(p.description);
    setEditColor(p.color);
    setEditMemberIds(p.memberIds);
    setEditLocalPath(getProjectPath(p.id) || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setConfirmDeleteId(null);
  };

  const saveEdit = (id: string) => {
    onUpdateProject(id, {
      name: editName.trim() || '未命名项目',
      key: editKey.trim().toUpperCase(),
      description: editDescription.trim(),
      color: editColor,
      memberIds: editMemberIds,
    });
    const trimmed = editLocalPath.trim();
    if (trimmed) {
      setProjectPath(id, trimmed);
    } else {
      removeProjectPath(id);
    }
    setEditingId(null);
  };

  const toggleMember = (memberId: string) => {
    setEditMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((m) => m !== memberId) : [...prev, memberId]
    );
  };

  const handleDelete = (id: string) => {
    onDeleteProject(id);
    setConfirmDeleteId(null);
    if (editingId === id) setEditingId(null);
  };

  const memberName = (id: string) => members.find((m) => m.id === id)?.name.split(' ')[0] || id;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-4 animate-fadeIn text-slate-800 flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="px-7 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-md">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base sm:text-lg">项目管理</h2>
              <p className="text-[11px] text-slate-500">共 {projects.length} 个项目空间,可编辑或删除</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
          {projects.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无项目,请先创建一个项目空间</p>
            </div>
          )}

          {projects.map((p) => {
            const isActive = p.id === activeProject.id;
            const isEditing = editingId === p.id;
            const isConfirming = confirmDeleteId === p.id;

            return (
              <div
                key={p.id}
                className={`border rounded-2xl transition-all ${
                  isActive ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white'
                }`}
              >
                {/* 展示态 */}
                {!isEditing && (
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-9 h-9 rounded-xl ${COLOR_DOT[p.color] || 'bg-slate-400'} flex items-center justify-center text-white shrink-0 shadow-xs`}>
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm truncate">{p.name}</span>
                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {p.key}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              当前
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{p.description}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                          <Users className="w-3 h-3" />
                          <span>{p.memberIds.length} 位成员</span>
                          <span className="text-slate-300">·</span>
                          <span className="truncate">{p.memberIds.map(memberName).join('、') || '未指派'}</span>
                        </div>
                        {(() => {
                          const localPath = getProjectPath(p.id);
                          return (
                            <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
                              <Folder className="w-3 h-3 text-slate-400 shrink-0" />
                              {localPath ? (
                                <>
                                  <span
                                    className="font-mono text-slate-500 truncate max-w-[320px]"
                                    title={localPath}
                                  >
                                    {localPath}
                                  </span>
                                  <button
                                    onClick={() => startDevInTrae(localPath)}
                                    className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-1.5 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1"
                                    title="在 TRAE Work 中打开"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>在 TRAE 中打开</span>
                                  </button>
                                </>
                              ) : (
                                <span className="text-slate-400 italic">未配置本地开发路径(点击右侧编辑按钮设置)</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isActive && (
                        <button
                          onClick={() => onSelectProject(p)}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          切换
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="编辑"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 删除确认 */}
                {!isEditing && isConfirming && (
                  <div className="px-4 pb-4 -mt-1">
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-rose-700 flex-1">
                        删除后将<strong>级联清除该项目下所有任务</strong>,且无法撤销。确定删除「{p.name}」?
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-500 px-2.5 py-1.5 rounded-lg cursor-pointer"
                        >
                          确认删除
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 编辑态 */}
                {isEditing && (
                  <div className="p-4 space-y-3.5 bg-slate-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase">项目名称</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase">Key</label>
                        <input
                          type="text"
                          value={editKey}
                          onChange={(e) => setEditKey(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                          maxLength={12}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs font-mono font-semibold uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase">项目描述</label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs resize-y leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1.5 uppercase">标识色</label>
                      <div className="flex flex-wrap gap-2">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            className={`w-7 h-7 rounded-lg ${COLOR_DOT[c]} flex items-center justify-center transition-all cursor-pointer ${
                              editColor === c ? 'ring-2 ring-offset-1 ring-slate-800 scale-105' : 'opacity-70 hover:opacity-100'
                            }`}
                          >
                            {editColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1.5 uppercase">
                        项目成员 ({editMemberIds.length})
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-0.5">
                        {members.map((m) => {
                          const isSelected = editMemberIds.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleMember(m.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5 border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <img src={m.avatar} alt={m.name} className="w-3.5 h-3.5 rounded-full object-cover" />
                              <span>{m.name.split(' ')[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase">
                        本地开发路径
                        <span className="ml-1.5 text-[10px] font-normal text-slate-400 normal-case">
                          配置后,任务"开始"时会唤起 TRAE Work 打开此路径
                        </span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={editLocalPath}
                          onChange={(e) => setEditLocalPath(e.target.value)}
                          placeholder="例如 /Users/zhangqi/projects/my-app"
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs font-mono"
                        />
                        {editLocalPath && (
                          <button
                            type="button"
                            onClick={() => setEditLocalPath('')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="清除路径"
                          >
                            <Eraser className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={cancelEdit}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => saveEdit(p.id)}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
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
        </div>

      </div>
    </div>
  );
};
