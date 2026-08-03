import React, { useState, useEffect } from 'react';
import {
  Member,
  Project,
  Task,
  ChatChannel,
  ChatMessage,
  NotificationItem,
  ViewMode,
  TaskStatus,
  TaskPriority,
} from './types';
import { Navbar } from './components/Navbar';
import { MemberPresenceBar } from './components/MemberPresenceBar';
import { KanbanBoard } from './components/KanbanBoard';
import { ListView } from './components/ListView';
import { GanttChart } from './components/GanttChart';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ChatHub } from './components/ChatHub';
import { TaskDetailModal } from './components/TaskDetailModal';
import { TaskDetailPage } from './components/TaskDetailPage';
import { CreateTaskModal } from './components/CreateTaskModal';
import { AiCopilotDrawer } from './components/AiCopilotDrawer';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Workspace UI selections
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);

  // Modals & Panels
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [createTaskInitialStatus, setCreateTaskInitialStatus] = useState<TaskStatus>('todo');
  const [showAiCopilotDrawer, setShowAiCopilotDrawer] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Initial Fetch State
  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      if (data) {
        setMembers(data.members || []);
        setProjects(data.projects || []);
        setTasks(data.tasks || []);
        setChannels(data.channels || []);
        setMessages(data.messages || []);
        setNotifications(data.notifications || []);

        if (!activeProject && data.projects?.length > 0) {
          setActiveProject(data.projects[0]);
        }
        if (!currentMember && data.members?.length > 0) {
          setCurrentMember(data.members[0]);
        }
        if (!activeChannel && data.channels?.length > 0) {
          setActiveChannel(data.channels[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load workspace state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // Sync selected task with latest state
  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find((t) => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
  }, [tasks]);

  // Update Task Status
  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          actorId: currentMember?.id || 'usr_alex',
        }),
      });
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  // Update Task Priority
  const handleUpdateTaskPriority = async (taskId: string, newPriority: TaskPriority) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority: newPriority,
          actorId: currentMember?.id || 'usr_alex',
        }),
      });
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to update task priority:', err);
    }
  };

  // Update Task Details (from modal)
  const handleUpdateTask = async (updatedFields: Partial<Task>) => {
    if (!selectedTask) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === selectedTask.id ? { ...t, ...updatedFields } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedFields,
          actorId: currentMember?.id || 'usr_alex',
        }),
      });
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // Create Task
  const handleCreateTask = async (newTaskData: any) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTaskData,
          reporterId: currentMember?.id || 'usr_alex',
          projectId: activeProject?.id || 'proj_cloud',
        }),
      });

      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
        if (data.notifications) setNotifications(data.notifications);
        setShowCreateTaskModal(false);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTask?.id === taskId) setSelectedTask(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Add Comment
  const handleAddComment = async (taskId: string, content: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentMember?.id || 'usr_alex',
          content,
        }),
      });

      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
      if (data.notifications) setNotifications(data.notifications);
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (channelId: string, content: string, taskRefId?: string) => {
    try {
      const res = await fetch(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentMember?.id || 'usr_alex',
          content,
          taskRefId,
        }),
      });

      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Generate AI Sprint Summary
  const handleGenerateAiSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const res = await fetch('/api/copilot/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.summary) {
        setAiSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to generate AI summary:', err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Update Member Status Text
  const handleUpdateMemberStatusText = async (memberId: string, statusText: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, statusText } : m))
    );

    try {
      await fetch(`/api/members/${memberId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusText }),
      });
    } catch (err) {
      console.error('Failed to update status text:', err);
    }
  };

  // Mark Notifications as Read
  const handleMarkNotificationsRead = async () => {
    if (!currentMember) return;
    setNotifications((prev) =>
      prev.map((n) => (n.recipientId === currentMember.id ? { ...n, isRead: true } : n))
    );

    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: currentMember.id }),
      });
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleOpenTaskById = (taskId: string) => {
    const t = tasks.find((item) => item.id === taskId);
    if (t) setSelectedTask(t);
  };

  if (loading || !activeProject || !currentMember || !activeChannel) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-emerald-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm font-semibold tracking-wide">加载 TaskSync 协作空间...</span>
        </div>
      </div>
    );
  }

  // Filter tasks for current active project
  const projectTasks = tasks.filter((t) => t.projectId === activeProject.id);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white relative">
      
      {/* Top Main Navbar */}
      <Navbar
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(p) => setActiveProject(p)}
        members={members}
        currentMember={currentMember}
        onSelectCurrentMember={(m) => setCurrentMember(m)}
        viewMode={viewMode}
        onSelectViewMode={(v) => setViewMode(v)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        onOpenCreateTask={() => {
          setCreateTaskInitialStatus('todo');
          setShowCreateTaskModal(true);
        }}
        onOpenAiCopilot={() => setShowAiCopilotDrawer(true)}
        notifications={notifications}
        showNotificationsDropdown={showNotificationsDropdown}
        onOpenNotifications={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
        onCloseNotifications={() => setShowNotificationsDropdown(false)}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onTaskClickById={handleOpenTaskById}
      />

      {/* Realtime Team Members Presence & Status Bar */}
      <MemberPresenceBar
        members={members}
        currentMember={currentMember}
        onUpdateMemberStatusText={handleUpdateMemberStatusText}
      />

      {/* Main View Area */}
      <main className="pb-12">
        {selectedTask ? (
          <TaskDetailPage
            task={selectedTask}
            members={members}
            currentMember={currentMember}
            projectName={activeProject.name}
            onBack={() => setSelectedTask(null)}
            onUpdateTask={handleUpdateTask}
            onAddComment={handleAddComment}
            onDeleteTask={handleDeleteTask}
          />
        ) : (
          <>
            {viewMode === 'kanban' && (
              <KanbanBoard
                tasks={projectTasks}
                members={members}
                searchQuery={searchQuery}
                onTaskClick={(t) => setSelectedTask(t)}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onOpenCreateTaskWithStatus={(status) => {
                  setCreateTaskInitialStatus(status);
                  setShowCreateTaskModal(true);
                }}
              />
            )}

            {viewMode === 'list' && (
              <ListView
                tasks={projectTasks}
                members={members}
                searchQuery={searchQuery}
                onTaskClick={(t) => setSelectedTask(t)}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onUpdateTaskPriority={handleUpdateTaskPriority}
                onDeleteTask={handleDeleteTask}
                onOpenCreateTask={() => {
                  setCreateTaskInitialStatus('todo');
                  setShowCreateTaskModal(true);
                }}
              />
            )}

            {viewMode === 'gantt' && (
              <GanttChart
                tasks={projectTasks}
                members={members}
                onTaskClick={(t) => setSelectedTask(t)}
              />
            )}

            {viewMode === 'analytics' && (
              <AnalyticsDashboard
                tasks={projectTasks}
                members={members}
                onGenerateAiSummary={handleGenerateAiSummary}
                aiSummary={aiSummary}
                isGeneratingSummary={isGeneratingSummary}
              />
            )}

            {viewMode === 'chat' && (
              <ChatHub
                channels={channels}
                activeChannel={activeChannel}
                onSelectChannel={(c) => setActiveChannel(c)}
                messages={messages}
                members={members}
                currentMember={currentMember}
                tasks={projectTasks}
                onSendMessage={handleSendMessage}
                onTaskClickById={handleOpenTaskById}
              />
            )}
          </>
        )}
      </main>

      {/* Create / Publish Task Modal */}
      {showCreateTaskModal && (
        <CreateTaskModal
          initialStatus={createTaskInitialStatus}
          members={members}
          projects={projects}
          activeProject={activeProject}
          onClose={() => setShowCreateTaskModal(false)}
          onSubmit={handleCreateTask}
        />
      )}

      {/* AI Copilot Side Drawer */}
      <AiCopilotDrawer
        isOpen={showAiCopilotDrawer}
        onClose={() => setShowAiCopilotDrawer(false)}
        tasks={projectTasks}
        members={members}
        onGenerateSummary={handleGenerateAiSummary}
        aiSummary={aiSummary}
        isGeneratingSummary={isGeneratingSummary}
      />

    </div>
  );
}
