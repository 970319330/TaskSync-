import React from 'react';
import { NotificationItem, Member } from '../types';
import { Bell, Check, MessageSquare, UserPlus, FileText } from 'lucide-react';

interface NotificationDropdownProps {
  notifications: NotificationItem[];
  members: Member[];
  currentMember: Member;
  onClose: () => void;
  onMarkRead: () => void;
  onTaskClickById: (taskId: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  members,
  currentMember,
  onClose,
  onMarkRead,
  onTaskClickById,
}) => {
  const safeNotifs = notifications || [];
  const userNotifications = safeNotifs.filter((n) => currentMember && n.recipientId === currentMember.id);
  const unreadCount = userNotifications.filter((n) => !n.isRead).length;

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-fadeIn text-slate-800">
      
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <Bell className="w-4 h-4 text-emerald-600" />
          <span>通知中心 ({unreadCount} 未读)</span>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkRead}
            className="text-[11px] text-emerald-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>全部标为已读</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
        {userNotifications.map((notif) => {
          const sender = members.find((m) => m.id === notif.senderId);

          return (
            <div
              key={notif.id}
              onClick={() => {
                if (notif.taskId) {
                  onTaskClickById(notif.taskId);
                  onClose();
                }
              }}
              className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                !notif.isRead ? 'bg-emerald-50/60 border-l-2 border-emerald-500' : ''
              }`}
            >
              {sender ? (
                <img src={sender.avatar} alt={sender.name} className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                  <Bell className="w-3.5 h-3.5" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-slate-800 leading-snug">{notif.message}</p>
                <div className="text-[10px] text-slate-400 font-mono mt-1">{notif.createdAt}</div>
              </div>
            </div>
          );
        })}

        {userNotifications.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            暂无新的协作通知
          </div>
        )}
      </div>

    </div>
  );
};
