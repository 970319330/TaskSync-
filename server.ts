import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  INITIAL_MEMBERS,
  INITIAL_ROLES,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_CHANNELS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
} from './src/mockData';
import { Task, ChatMessage, TaskComment, TaskActivity, TaskFeedback, NotificationItem, Project, Member, Role } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory persistent state
let members = [...INITIAL_MEMBERS];
let roles = [...INITIAL_ROLES];
let projects = [...INITIAL_PROJECTS];
let tasks: Task[] = [...INITIAL_TASKS];
let channels = [...INITIAL_CHANNELS];
let messages: ChatMessage[] = [...INITIAL_MESSAGES];
let notifications: NotificationItem[] = [...INITIAL_NOTIFICATIONS];

// AI Settings (每个供应商独立保存凭证与模型配置)
type AiProvider = 'gemini' | 'deepseek' | 'openai';

let activeProvider: AiProvider = 'gemini';

let apiKeysByProvider: Record<AiProvider, string> = {
  gemini: process.env.GEMINI_API_KEY || '',
  deepseek: '',
  openai: '',
};

let providerConfigs: Record<AiProvider, { model: string; baseUrl: string }> = {
  gemini: {
    model: 'gemini-3.6-flash',
    baseUrl: '',
  },
  deepseek: {
    model: 'deepseek-v4-flash',
    baseUrl: 'https://api.deepseek.com/v1',
  },
  openai: {
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
  },
};

function getSettingsResponse() {
  const keys: Record<AiProvider, string> = { gemini: '', deepseek: '', openai: '' };
  const hasApiKeys: Record<AiProvider, boolean> = { gemini: false, deepseek: false, openai: false };
  const models: Record<AiProvider, string> = { gemini: '', deepseek: '', openai: '' };
  const baseUrls: Record<AiProvider, string> = { gemini: '', deepseek: '', openai: '' };

  (Object.keys(apiKeysByProvider) as AiProvider[]).forEach((p) => {
    const k = apiKeysByProvider[p];
    keys[p] = k ? `${k.slice(0, 4)}****${k.slice(-4)}` : '';
    hasApiKeys[p] = !!k;
    models[p] = providerConfigs[p].model;
    baseUrls[p] = providerConfigs[p].baseUrl;
  });

  const currentKey = apiKeysByProvider[activeProvider];
  const currentMaskedKey = currentKey ? `${currentKey.slice(0, 4)}****${currentKey.slice(-4)}` : '';

  return {
    provider: activeProvider,
    apiKey: currentMaskedKey,
    model: providerConfigs[activeProvider].model,
    baseUrl: providerConfigs[activeProvider].baseUrl,
    hasApiKey: !!currentKey,
    keys,
    hasApiKeys,
    models,
    baseUrls,
  };
}

// 统一 LLM 调用:支持 Gemini 与 OpenAI 兼容接口(DeepSeek / OpenAI 等)
async function callLLM(prompt: string, options: { jsonMode?: boolean } = {}): Promise<string> {
  const provider = activeProvider;
  const apiKey = apiKeysByProvider[provider];
  const { model, baseUrl } = providerConfigs[provider];

  if (!apiKey) return '';

  if (provider === 'gemini') {
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const response = await client.models.generateContent({
      model: model || 'gemini-3.6-flash',
      contents: prompt,
      ...(options.jsonMode ? { config: { responseMimeType: 'application/json' } } : {}),
    });
    return response.text || '';
  }

  // OpenAI 兼容接口(deepseek / openai)
  const base =
    baseUrl ||
    (provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1');
  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || (provider === 'deepseek' ? 'deepseek-v4-flash' : 'gpt-4o-mini'),
      messages: [{ role: 'user', content: prompt }],
      ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM 请求失败 (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// 安全解析 LLM 返回的 JSON,兼容 markdown 代码块包裹的情况
function safeJsonParse(text: string): any {
  let cleaned = text.trim();
  // 去除 markdown 代码块包裹 (```json ... ``` 或 ``` ... ```)
  const codeBlockMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  return JSON.parse(cleaned);
}

// API Routes
app.get('/api/state', (req, res) => {
  res.json({
    members,
    roles,
    projects,
    tasks,
    channels,
    messages,
    notifications,
  });
});

// Create Project
app.post('/api/projects', (req, res) => {
  const data = req.body || {};
  const newProject: Project = {
    id: `proj_${Date.now()}`,
    name: (data.name || '').trim() || '新项目空间',
    key: (data.key || '').trim().toUpperCase() || `PRJ-${projects.length + 1}`,
    description: data.description || '',
    color: data.color || 'emerald',
    memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
  };
  projects = [...projects, newProject];
  res.json({ success: true, project: newProject, projects });
});

// Update Project
app.put('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  let updated: Project | null = null;
  projects = projects.map((p) => {
    if (p.id === id) {
      updated = {
        ...p,
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.key !== undefined ? { key: updates.key } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.color !== undefined ? { color: updates.color } : {}),
        ...(Array.isArray(updates.memberIds) ? { memberIds: updates.memberIds } : {}),
      };
      return updated;
    }
    return p;
  });
  res.json({ success: true, project: updated, projects });
});

// Delete Project
app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  projects = projects.filter((p) => p.id !== id);
  // 级联清理该项目的任务,避免孤儿任务
  tasks = tasks.filter((t) => t.projectId !== id);
  res.json({ success: true, projects, tasks });
});

// Get AI Settings (API Key 脱敏返回，返回全量各供应商 Key 与配置状态)
app.get('/api/settings', (req, res) => {
  res.json(getSettingsResponse());
});

// Update AI Settings
app.put('/api/settings', (req, res) => {
  const { provider, apiKey, model, baseUrl, keys, models, baseUrls } = req.body || {};

  if (provider && ['gemini', 'deepseek', 'openai'].includes(provider)) {
    activeProvider = provider as AiProvider;
  }

  // 如果客户端提交了多供应商配置 maps (keys, models, baseUrls)
  if (keys && typeof keys === 'object') {
    (Object.keys(keys) as AiProvider[]).forEach((p) => {
      if (['gemini', 'deepseek', 'openai'].includes(p)) {
        const val = keys[p];
        if (typeof val === 'string') {
          const trimmed = val.trim();
          // 仅在不是脱敏占位符 **** 时更新，允许用户传空字符串清空
          if (!trimmed.includes('****')) {
            apiKeysByProvider[p] = trimmed;
          }
        }
      }
    });
  }

  if (models && typeof models === 'object') {
    (Object.keys(models) as AiProvider[]).forEach((p) => {
      if (['gemini', 'deepseek', 'openai'].includes(p) && typeof models[p] === 'string') {
        const trimmed = models[p].trim();
        if (trimmed) providerConfigs[p].model = trimmed;
      }
    });
  }

  if (baseUrls && typeof baseUrls === 'object') {
    (Object.keys(baseUrls) as AiProvider[]).forEach((p) => {
      if (['gemini', 'deepseek', 'openai'].includes(p) && typeof baseUrls[p] === 'string') {
        providerConfigs[p].baseUrl = baseUrls[p].trim();
      }
    });
  }

  // 单值兼容兜底 (仅针对当前选择的 activeProvider)
  if (typeof apiKey === 'string') {
    const trimmed = apiKey.trim();
    if (trimmed && !trimmed.includes('****')) {
      apiKeysByProvider[activeProvider] = trimmed;
    }
  }
  if (typeof model === 'string' && model.trim()) {
    providerConfigs[activeProvider].model = model.trim();
  }
  if (typeof baseUrl === 'string') {
    providerConfigs[activeProvider].baseUrl = baseUrl.trim();
  }

  res.json({ success: true, settings: getSettingsResponse() });
});

// Update Member Status
app.put('/api/members/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, statusText } = req.body;
  members = members.map((m) =>
    m.id === id ? { ...m, status: status || m.status, statusText: statusText ?? m.statusText } : m
  );
  res.json({ success: true, members });
});

// Create Member
app.post('/api/members', (req, res) => {
  const data = req.body || {};
  const newMember: Member = {
    id: `usr_${Date.now()}`,
    name: (data.name || '').trim() || '新成员',
    role: data.role || '团队成员',
    roleId: data.roleId || undefined,
    avatar: data.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150`,
    avatarBg: data.avatarBg || 'bg-slate-600',
    email: data.email || '',
    status: 'online',
    statusText: '新加入团队',
    workloadCount: 0,
  };
  members = [...members, newMember];
  res.json({ success: true, member: newMember, members });
});

// Update Member
app.put('/api/members/:id', (req, res) => {
  const { id } = req.params;
  const data = req.body || {};
  members = members.map((m) =>
    m.id === id ? {
      ...m,
      name: data.name?.trim() || m.name,
      role: data.role ?? m.role,
      roleId: data.roleId ?? m.roleId,
      email: data.email ?? m.email,
      avatar: data.avatar || m.avatar,
      avatarBg: data.avatarBg || m.avatarBg,
      isAdmin: data.isAdmin ?? m.isAdmin,
    } : m
  );
  res.json({ success: true, members });
});

// Delete Member
app.delete('/api/members/:id', (req, res) => {
  const { id } = req.params;
  members = members.filter((m) => m.id !== id);
  // 从项目中移除该成员
  projects = projects.map((p) => ({ ...p, memberIds: p.memberIds.filter((mid) => mid !== id) }));
  res.json({ success: true, members, projects });
});

// Create Role
app.post('/api/roles', (req, res) => {
  const data = req.body || {};
  const newRole: Role = {
    id: `role_${Date.now()}`,
    name: (data.name || '').trim() || '新角色',
    description: data.description || '',
    color: data.color || 'bg-slate-600',
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
  };
  roles = [...roles, newRole];
  res.json({ success: true, role: newRole, roles });
});

// Update Role
app.put('/api/roles/:id', (req, res) => {
  const { id } = req.params;
  const data = req.body || {};
  roles = roles.map((r) =>
    r.id === id ? {
      ...r,
      name: data.name?.trim() || r.name,
      description: data.description ?? r.description,
      color: data.color || r.color,
      permissions: Array.isArray(data.permissions) ? data.permissions : r.permissions,
    } : r
  );
  res.json({ success: true, roles });
});

// Delete Role
app.delete('/api/roles/:id', (req, res) => {
  const { id } = req.params;
  // 不允许删除仍有成员关联的角色
  const hasMembers = members.some((m) => m.roleId === id);
  if (hasMembers) {
    return res.status(400).json({ error: '该角色仍有成员关联，请先调整成员角色后再删除' });
  }
  roles = roles.filter((r) => r.id !== id);
  res.json({ success: true, roles });
});

// Create Task
app.post('/api/tasks', (req, res) => {
  const newTaskData = req.body;
  const newId = `TS-${100 + tasks.length + 1}`;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

  const newTask: Task = {
    id: newId,
    title: newTaskData.title || '新协作任务',
    description: newTaskData.description || '',
    status: newTaskData.status || 'todo',
    priority: newTaskData.priority || 'medium',
    assigneeIds: newTaskData.assigneeIds || [],
    reporterId: newTaskData.reporterId || 'usr_alex',
    projectId: newTaskData.projectId || 'proj_cloud',
    startDate: newTaskData.startDate || nowStr.substring(0, 10),
    dueDate: newTaskData.dueDate || nowStr.substring(0, 10),
    estimatedHours: Number(newTaskData.estimatedHours) || 8,
    tags: newTaskData.tags || ['新增'],
    checklist: newTaskData.checklist || [],
    comments: [],
    testerId: newTaskData.testerId || '',
    autoFlowToTest: newTaskData.autoFlowToTest !== false,
    color: newTaskData.color || 'none',
    activities: [
      {
        id: `act_${Date.now()}`,
        taskId: newId,
        authorId: newTaskData.reporterId || 'usr_alex',
        action: '发布了新任务',
        timestamp: nowStr,
      },
    ],
    attachmentsCount: 0,
    createdAt: nowStr,
    updatedAt: nowStr,
  };

  tasks.unshift(newTask);

  // Generate notifications for assignees
  if (newTask.assigneeIds.length > 0) {
    const reporter = members.find((m) => m.id === newTask.reporterId)?.name || '团队成员';
    newTask.assigneeIds.forEach((assigneeId) => {
      if (assigneeId !== newTask.reporterId) {
        notifications.unshift({
          id: `notif_${Date.now()}_${Math.random()}`,
          recipientId: assigneeId,
          senderId: newTask.reporterId,
          type: 'assigned',
          taskId: newId,
          message: `${reporter} 为你指派了新任务 "${newTask.title}"`,
          isRead: false,
          createdAt: nowStr,
        });
      }
    });
  }

  res.json({ success: true, task: newTask, tasks, notifications });
});

// Update Task
app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

  let updatedTask: Task | null = null;

  tasks = tasks.map((t) => {
    if (t.id === id) {
      const activities = [...t.activities];
      const authorId = updates.actorId || 'usr_alex';

      const finalTesterId = updates.testerId !== undefined ? updates.testerId : t.testerId;
      const finalAutoFlow =
        updates.autoFlowToTest !== undefined ? updates.autoFlowToTest : t.autoFlowToTest !== false;

      // 判断是否触发“开发完成流转测试”
      const isEnteringReview = updates.status === 'review' || updates.completeDevAndFlow === true;
      const wasNotInReview = t.status !== 'review';

      if (isEnteringReview && wasNotInReview && finalAutoFlow) {
        updates.status = 'review';
        if (finalTesterId) {
          updates.assigneeIds = [finalTesterId];
          const testerObj = members.find((m) => m.id === finalTesterId);
          const testerName = testerObj?.name || '测试人员';

          activities.unshift({
            id: `act_${Date.now()}`,
            taskId: id,
            authorId,
            action: '🚀 开发完成，自动流转测试',
            details: `开发工作已完成！任务自动进入【测试】阶段，经办人已更新交由 ${testerName}`,
            timestamp: nowStr,
          });

          // 发送系统通知给测试负责人
          notifications.unshift({
            id: `notif_${Date.now()}_${Math.random()}`,
            recipientId: finalTesterId,
            senderId: authorId,
            type: 'status_change',
            taskId: id,
            message: `任务 "${t.title}" 开发已完成，自动流转给你进行测试`,
            isRead: false,
            createdAt: nowStr,
          });
        } else {
          activities.unshift({
            id: `act_${Date.now()}`,
            taskId: id,
            authorId,
            action: '🚀 开发完成，流转至测试',
            details: `开发工作已完成，任务已流转至【测试】阶段`,
            timestamp: nowStr,
          });
        }
      } else {
        // 常规状态更改日志
        if (updates.status && updates.status !== t.status) {
          const statusMap: Record<string, string> = {
            backlog: 'Backlog 积压',
            todo: '待办 (To Do)',
            in_progress: '进行中 (In Progress)',
            review: '测试 (Test)',
            done: '已完成 (Done)',
          };
          activities.unshift({
            id: `act_${Date.now()}`,
            taskId: id,
            authorId,
            action: '更新了任务状态',
            details: `由 "${statusMap[t.status]}" 更改为 "${statusMap[updates.status]}"`,
            timestamp: nowStr,
          });
        }
      }

      // Log priority change
      if (updates.priority && updates.priority !== t.priority) {
        activities.unshift({
          id: `act_${Date.now()}`,
          taskId: id,
          authorId,
          action: '更新了优先级',
          details: `设置为 ${updates.priority.toUpperCase()}`,
          timestamp: nowStr,
        });
      }

      // 来自 MCP 工具的备注：作为评论写入
      if (updates.activityNote) {
        const newComment: TaskComment = {
          id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          taskId: id,
          authorId,
          content: updates.activityNote,
          createdAt: nowStr,
        };
        const comments = [...(t.comments || []), newComment];
        updates.comments = comments;
        activities.unshift({
          id: `act_${Date.now()}`,
          taskId: id,
          authorId,
          action: 'MCP 工具添加了备注',
          details: updates.activityNote,
          timestamp: nowStr,
        });
      }
      // 清理仅供后端消费的字段
      delete updates.activityNote;

      // 结构化开发反馈：Agent 回写的开发结果，存入 feedbacks 数组
      if (updates.devFeedback) {
        const fb = updates.devFeedback;
        const newFeedback: TaskFeedback = {
          id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          taskId: id,
          authorId: fb.authorId || authorId,
          summary: fb.summary || '',
          changedFiles: Array.isArray(fb.changedFiles) ? fb.changedFiles : [],
          commitHash: fb.commitHash || undefined,
          prUrl: fb.prUrl || undefined,
          dependencies: Array.isArray(fb.dependencies) ? fb.dependencies : [],
          notes: fb.notes || undefined,
          createdAt: nowStr,
        };
        const feedbacks = [...(t.feedbacks || []), newFeedback];
        updates.feedbacks = feedbacks;
        activities.unshift({
          id: `act_${Date.now()}`,
          taskId: id,
          authorId: newFeedback.authorId,
          action: '提交了开发反馈',
          details: fb.summary ? fb.summary.slice(0, 80) : '开发结果已回写',
          timestamp: nowStr,
        });
      }
      delete updates.devFeedback;

      // 清除辅助请求标记避免多存
      delete updates.completeDevAndFlow;

      updatedTask = {
        ...t,
        ...updates,
        activities,
        updatedAt: nowStr,
      };
      return updatedTask;
    }
    return t;
  });

  res.json({ success: true, task: updatedTask, tasks, notifications });
});

// Delete Task
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  tasks = tasks.filter((t) => t.id !== id);
  res.json({ success: true, tasks });
});

// Add Comment
app.post('/api/tasks/:id/comments', (req, res) => {
  const { id } = req.params;
  const { authorId, content } = req.body;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

  const newComment: TaskComment = {
    id: `cm_${Date.now()}`,
    taskId: id,
    authorId: authorId || 'usr_alex',
    content,
    createdAt: nowStr,
  };

  let targetTask: Task | null = null;
  tasks = tasks.map((t) => {
    if (t.id === id) {
      targetTask = {
        ...t,
        comments: [...t.comments, newComment],
        updatedAt: nowStr,
      };
      return targetTask;
    }
    return t;
  });

  // Notify task assignees
  if (targetTask) {
    const author = members.find((m) => m.id === authorId)?.name || '团队成员';
    (targetTask as Task).assigneeIds.forEach((assigneeId) => {
      if (assigneeId !== authorId) {
        notifications.unshift({
          id: `notif_${Date.now()}`,
          recipientId: assigneeId,
          senderId: authorId,
          type: 'comment',
          taskId: id,
          message: `${author} 在任务 ${id} 中发表了新评论`,
          isRead: false,
          createdAt: nowStr,
        });
      }
    });
  }

  res.json({ success: true, comment: newComment, task: targetTask, tasks, notifications });
});

// Submit Dev Feedback (结构化开发反馈，供 MCP / Agent 调用)
app.post('/api/tasks/:id/feedback', (req, res) => {
  const { id } = req.params;
  const { authorId, summary, changedFiles, commitHash, prUrl, dependencies, notes } = req.body || {};
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

  if (!summary || !summary.trim()) {
    return res.status(400).json({ error: 'summary 不能为空' });
  }

  const actorId = authorId || 'usr_alex';
  const newFeedback: TaskFeedback = {
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    taskId: id,
    authorId: actorId,
    summary: summary.trim(),
    changedFiles: Array.isArray(changedFiles) ? changedFiles : [],
    commitHash: commitHash || undefined,
    prUrl: prUrl || undefined,
    dependencies: Array.isArray(dependencies) ? dependencies : [],
    notes: notes || undefined,
    createdAt: nowStr,
  };

  let updatedTask: Task | null = null;
  tasks = tasks.map((t) => {
    if (t.id === id) {
      const feedbacks = [...(t.feedbacks || []), newFeedback];
      const activities = [
        {
          id: `act_${Date.now()}`,
          taskId: id,
          authorId: actorId,
          action: '提交了开发反馈',
          details: summary.slice(0, 80),
          timestamp: nowStr,
        },
        ...t.activities,
      ];
      updatedTask = { ...t, feedbacks, activities, updatedAt: nowStr };
      return updatedTask;
    }
    return t;
  });

  if (!updatedTask) {
    return res.status(404).json({ error: `任务 ${id} 不存在` });
  }

  res.json({ success: true, feedback: newFeedback, task: updatedTask, tasks });
});

// Post Channel Message
app.post('/api/channels/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { authorId, content, taskRefId } = req.body;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

  const userMsg: ChatMessage = {
    id: `msg_${Date.now()}`,
    channelId: id,
    authorId: authorId || 'usr_alex',
    content,
    createdAt: nowStr,
    taskRefId,
  };

  messages.push(userMsg);

  // Check if user is asking AI / @copilot or mentioning Copilot
  const mentionsCopilot = content.toLowerCase().includes('@copilot') || content.includes('@ai') || content.includes('小助手');

  if (mentionsCopilot) {
    let aiAnswer = '我是 牛磨 AI 协同助手。我已经分析了当前项目的任务状态，有什么需要我帮忙一键拆解或总结站会的吗？';

    try {
      if (apiKeysByProvider[activeProvider]) {
        const prompt = `你是一个专业的敏捷项目管理 Copilot AI 助手。团队成员在聊天频道说："${content}"。
结合当前任务数量 (${tasks.length}个) 和成员在线状态，给出专业、亲切、富有生产力建设性的简短回复 (不超过150字)。如果用户提到特定任务，可直接说明。`;

        const text = await callLLM(prompt);
        if (text) {
          aiAnswer = text;
        }
      }
    } catch (err) {
      console.error('LLM chat error:', err);
    }

    const aiMsg: ChatMessage = {
      id: `msg_ai_${Date.now()}`,
      channelId: id,
      authorId: 'usr_ai',
      content: aiAnswer,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      isAiResponse: true,
    };
    messages.push(aiMsg);
  }

  res.json({ success: true, messages });
});

// AI Copilot Decompose Task Endpoint
app.post('/api/copilot/decompose', async (req, res) => {
  const { goal } = req.body;

  if (!goal) {
    return res.status(400).json({ error: '请输入任务目标或描述' });
  }

  try {
    if (!apiKeysByProvider[activeProvider]) {
      // Mock decomposition fallback if key not configured
      return res.json({
        title: `【AI拆解】${goal}`,
        description: `基于目标 "${goal}" 的敏捷工程拆解。包含了需求评审、前端落地、后端API及质量走查。`,
        priority: 'high',
        estimatedHours: 16,
        tags: ['AI拆解', '敏捷工程', '协同'],
        checklist: [
          { id: 'c_1', title: '撰写需求及接口 API 定义文档', completed: false },
          { id: 'c_2', title: '搭建组件与 UI 原型页面', completed: false },
          { id: 'c_3', title: '联调核心逻辑与状态驱动测试', completed: false },
          { id: 'c_4', title: '进行单元测试与 Code Review', completed: false },
          { id: 'c_5', title: '预发环境走查与上线部署', completed: false },
        ],
      });
    }

    const prompt = `你是一个经验丰富的敏捷项目管理大师。请将以下高层级项目目标分解为一个标准任务的详细规格，包含标题、详细描述、推荐优先级(urgent, high, medium, low)、估计工时(小时)、适用的标签(3个)以及4-6条具体可执行的子任务清单(checklist)。

目标描述: "${goal}"

请严格以 JSON 格式输出，不要打任何 markdown 代码块或附加文字，格式必须符合以下 JSON Schema:
{
  "title": "任务标题",
  "description": "详细任务说明与注意事项",
  "priority": "high",
  "estimatedHours": 12,
  "tags": ["前端", "架构", "设计"],
  "checklist": ["子任务项1", "子任务项2", "子任务项3", "子任务项4"]
}`;

    const jsonText = (await callLLM(prompt, { jsonMode: true })).trim() || '{}';
    const parsed = safeJsonParse(jsonText);

    const checklistItems = (parsed.checklist || []).map((itemTitle: string, index: number) => ({
      id: `chk_gen_${Date.now()}_${index}`,
      title: itemTitle,
      completed: false,
    }));

    res.json({
      title: parsed.title,
      description: parsed.description,
      priority: ['urgent', 'high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'high',
      estimatedHours: parsed.estimatedHours || 12,
      tags: parsed.tags || ['AI智能拆解'],
      checklist: checklistItems,
    });
  } catch (error: any) {
    console.error('Copilot decompose error:', error);
    res.status(500).json({ error: error.message || 'AI 拆解服务异常' });
  }
});

// AI Import & Decompose: 导入文档/思维导图,LLM 拆分为多个任务并批量创建
app.post('/api/copilot/import-decompose', async (req, res) => {
  const { content, projectId, projectName, projectDescription, reporterId, assigneeIds } = req.body || {};

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '导入内容为空' });
  }
  if (!projectId) {
    return res.status(400).json({ error: '缺少项目 ID' });
  }

  // 未配置 Key 时返回空,前端可提示
  if (!apiKeysByProvider[activeProvider]) {
    return res.json({ tasks: [], allTasks: tasks, mock: true });
  }

  try {
    const truncated = content.length > 8000 ? content.slice(0, 8000) + '\n...(内容已截断)' : content;

    const prompt = `你是一个经验丰富的敏捷项目管理大师。用户正在创建一个新项目,并提供了项目的需求文档 / 思维导图大纲 / 会议纪要等内容。请仔细阅读并理解其结构与意图,将其拆分为 5-15 个具体可执行的敏捷任务。

项目名称: "${projectName || ''}"
项目描述: "${projectDescription || ''}"

导入的内容:
"""
${truncated}
"""

拆分要求:
- 每个任务应有明确的标题、详细描述、推荐优先级(urgent/high/medium/low)、估计工时(小时)、2-3 个标签
- 为每个任务生成 3-6 条具体可执行的子任务清单(checklist)
- 任务应覆盖项目的主要工作流与交付物,粒度适中

请严格以 JSON 格式输出,不要打任何 markdown 代码块或附加文字,格式必须符合:
{
  "tasks": [
    {
      "title": "任务标题",
      "description": "详细任务说明与注意事项",
      "priority": "high",
      "estimatedHours": 12,
      "tags": ["标签1", "标签2"],
      "checklist": ["子任务1", "子任务2"]
    }
  ]
}`;

    const jsonText = (await callLLM(prompt, { jsonMode: true })).trim() || '{}';
    const parsed = safeJsonParse(jsonText);
    const llmTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const today = nowStr.substring(0, 10);
    const fallbackAssignees = Array.isArray(assigneeIds) ? assigneeIds : [];

    const createdTasks: Task[] = llmTasks.map((t: any, idx: number) => {
      const newId = `TS-${100 + tasks.length + idx + 1}`;
      const checklistItems = (t.checklist || []).map((itemTitle: string, i: number) => ({
        id: `chk_imp_${Date.now()}_${idx}_${i}`,
        title: itemTitle,
        completed: false,
      }));
      return {
        id: newId,
        title: t.title || `导入任务 ${idx + 1}`,
        description: t.description || '',
        status: 'todo' as const,
        priority: ['urgent', 'high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
        assigneeIds: fallbackAssignees,
        reporterId: reporterId || 'usr_alex',
        projectId,
        startDate: today,
        dueDate: today,
        estimatedHours: Number(t.estimatedHours) || 8,
        tags: Array.isArray(t.tags) ? t.tags : ['导入'],
        checklist: checklistItems,
        comments: [],
        activities: [
          {
            id: `act_${Date.now()}_${idx}`,
            taskId: newId,
            authorId: reporterId || 'usr_alex',
            action: '通过导入文档 AI 拆分创建',
            timestamp: nowStr,
          },
        ],
        attachmentsCount: 0,
        createdAt: nowStr,
        updatedAt: nowStr,
      };
    });

    // 批量加入(最新在前)
    tasks = [...createdTasks, ...tasks];

    res.json({ tasks: createdTasks, allTasks: tasks });
  } catch (error: any) {
    console.error('Import decompose error:', error);
    res.status(500).json({ error: error.message || '导入拆分服务异常' });
  }
});

// AI Copilot Sprint Summarizer Endpoint
app.post('/api/copilot/summarize', async (req, res) => {
  try {
    const taskSummaryData = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignees: t.assigneeIds.map((id) => members.find((m) => m.id === id)?.name || id),
    }));

    if (!apiKeysByProvider[activeProvider]) {
      return res.json({
        summary: `📊 **Sprint 24 进展快照 (Mock)**
• **已完成任务**: 1项 (TS-105 DevOps 流水线)
• **推进中任务**: 2项 (TS-101 实时看板、TS-103 AI Copilot)
• **代码评审中**: 1项 (TS-102 任务详情弹窗)
• **阻塞与风险**: 暂无严重阻塞，建议注意 TS-101 的多端卡片冲突问题。
• **下阶段重点**: 加速 TS-104 消息联动上线，完成测试走查。`,
      });
    }

    const prompt = `请分析以下团队当前 Sprint 的全部任务列表，生成一份精炼、专业的敏捷站会/迭代总结报告（使用 Markdown 格式），包含：
1. **迭代完成度与总体进展**
2. **重点攻坚与进行中事项**
3. **潜在瓶颈与风险提示**
4. **下一步推荐行动计划**

当前任务数据:
${JSON.stringify(taskSummaryData, null, 2)}`;

    const text = await callLLM(prompt);
    res.json({ summary: text || '暂无总结' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '生成总结失败' });
  }
});

// Mark Notifications Read
app.post('/api/notifications/mark-read', (req, res) => {
  const { recipientId } = req.body;
  notifications = notifications.map((n) =>
    n.recipientId === recipientId ? { ...n, isRead: true } : n
  );
  res.json({ success: true, notifications });
});

// ============ 禅道数据同步 ============
const ZENTAO_BASE = 'http://124.70.211.186:7099/zentao';

// 缓存禅道会话 ID（sync 登录后更新，图片代理接口复用）
let zentaoCachedSid = '';

// 禅道状态 -> TaskSync 状态
const mapZentaoStatus = (status: string): string => {
  switch (status) {
    case 'wait': return 'todo';
    case 'doing': return 'in_progress';
    case 'done':
    case 'closed': return 'done';
    case 'pause':
    case 'cancel': return 'backlog';
    default: return 'todo';
  }
};

// 禅道优先级(1-4) -> 牛磨 优先级
const mapZentaoPriority = (pri: string | number): string => {
  const n = Number(pri);
  if (n === 1) return 'urgent';
  if (n === 2) return 'high';
  if (n === 3) return 'medium';
  return 'low';
};

// 禅道角色 -> 本地角色名与 roleId
const mapZentaoRole = (ztRole: string, isAdmin: boolean): { role: string; roleId: string } => {
  if (isAdmin) return { role: '系统管理员', roleId: 'role_admin' };
  const map: Record<string, { role: string; roleId: string }> = {
    dev: { role: '开发工程师', roleId: 'role_dev' },
    qa: { role: '测试工程师', roleId: 'role_dev' },
    pm: { role: '产品经理 (PM)', roleId: 'role_pm' },
    po: { role: '产品经理 (PM)', roleId: 'role_pm' },
    pd: { role: '产品经理 (PM)', roleId: 'role_pm' },
    td: { role: '研发主管', roleId: 'role_pm' },
    ui: { role: '设计师', roleId: 'role_designer' },
    devops: { role: 'DevOps 工程师', roleId: 'role_devops' },
    top: { role: '公司管理层', roleId: 'role_pm' },
  };
  return map[ztRole] || { role: '研发工程师', roleId: 'role_dev' };
};

/**
 * 解析禅道登录响应，提取用户账号资料。
 * 注意：禅道将用户信息放在顶层 `user` 字段（部分版本在 `data` 中），需同时兼容。
 */
const parseZentaoUser = (loginText: string): Record<string, any> | null => {
  try {
    const loginJson = JSON.parse(loginText);
    if (loginJson.status === 'failed') return null;
    // 优先取 user 字段，回退到 data（兼容不同禅道版本）
    let u = loginJson.user;
    if (!u && loginJson.data) {
      u = typeof loginJson.data === 'string' ? JSON.parse(loginJson.data) : loginJson.data;
      // 某些版本 data 内层还包一层 user
      if (u?.user) u = u.user;
    }
    return u && typeof u === 'object' ? u : null;
  } catch {
    return null;
  }
};

// 禅道操作动作 -> 中文描述
const mapZentaoAction = (action: string): string => {
  const map: Record<string, string> = {
    opened: '创建任务',
    started: '开始任务',
    finished: '完成任务',
    closed: '关闭任务',
    paused: '暂停任务',
    canceled: '取消任务',
    assigned: '指派任务',
    changed: '修改任务',
    edited: '编辑任务',
    commented: '添加备注',
    activated: '激活任务',
    recordestimate: '记录工时',
  };
  return map[action] || action;
};

// 将禅道 HTML 中的图片 src 转换为代理 URL，并将 <img> 转为 Markdown 图片语法
const processZentaoHtml = (html: string): string => {
  if (!html) return '';
  let result = html;

  // 匹配 <img> 标签，提取 src，转换为 Markdown 图片
  result = result.replace(/<img[^>]+src=["']([^"']+)["'][^>]*\/?>/gi, (_, src) => {
    let fullUrl: string;
    if (src.startsWith('http://') || src.startsWith('https://')) {
      fullUrl = src;
    } else {
      // 相对路径，拼接禅道服务器前缀
      fullUrl = `http://124.70.211.186:7099${src.startsWith('/') ? '' : '/'}${src}`;
    }
    const proxyUrl = `/api/zentao/image?url=${encodeURIComponent(fullUrl)}`;
    return `\n![图片](${proxyUrl})\n`;
  });

  // 清理其他 HTML 标签，保留已转换的 Markdown
  result = result.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
  return result;
};

// 构建任务描述：任务描述 + 需求规格 + 验收标准 + 模块路径（保留图片）
const buildZentaoDescription = (zt: any): string => {
  const parts: string[] = [];

  if (zt.desc && zt.desc.trim()) {
    const cleanDesc = processZentaoHtml(zt.desc);
    if (cleanDesc) parts.push(`**任务描述**\n${cleanDesc}`);
  }

  if (zt.storyTitle) {
    parts.push(`**关联需求**: ${zt.storyTitle}`);
  }

  if (zt.storySpec && zt.storySpec.trim()) {
    const cleanSpec = processZentaoHtml(zt.storySpec);
    if (cleanSpec) parts.push(`**需求规格**\n${cleanSpec}`);
  }

  if (zt.storyVerify && zt.storyVerify.trim()) {
    const cleanVerify = processZentaoHtml(zt.storyVerify);
    if (cleanVerify) parts.push(`**验收标准**\n${cleanVerify}`);
  }

  if (zt.modulePath) {
    parts.push(`**模块路径**: ${zt.modulePath}`);
  }

  if (zt.parentName) {
    parts.push(`**父任务**: ${zt.parentName}`);
  }

  parts.push(`**任务类型**: ${zt.type || 'devel'}`);
  parts.push(`**进度**: ${zt.progress || 0}%`);

  return parts.join('\n\n') || `类型: ${zt.type || 'devel'}`;
};

app.post('/api/zentao/sync', async (req, res) => {
  const { account = 'zhangq', password = 'zhangq' } = req.body;

  try {
    // 步骤1: 获取 Session ID
    const sessionRes = await fetch(`${ZENTAO_BASE}/api-getSessionID.json`);
    const sessionJson = await sessionRes.json();
    const sessionData = JSON.parse(sessionJson.data);
    const sessionID = sessionData.sessionID;
    const sessionName = sessionData.sessionName;

    // 步骤2: 登录
    const loginRes = await fetch(`${ZENTAO_BASE}/user-login.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `${sessionName}=${sessionID}`,
      },
      body: `account=${account}&password=${password}`,
    });
    const loginText = await loginRes.text();
    const setCookie = loginRes.headers.get('set-cookie') || '';
    // 提取最新的 zentaosid
    const cookieMatch = setCookie.match(/zentaosid=([^;]+)/);
    const finalSid = cookieMatch ? cookieMatch[1] : sessionID;
    // 缓存 sid 供图片代理接口使用
    zentaoCachedSid = finalSid;

    // 校验登录并解析账号资料
    const ztUser = parseZentaoUser(loginText);
    if (!ztUser) {
      return res.status(401).json({ error: '禅道登录失败，请检查账号密码' });
    }

    // 步骤3: 获取任务数据
    const taskRes = await fetch(`${ZENTAO_BASE}/my-task.json`, {
      headers: { 'Cookie': `zentaosid=${finalSid}` },
    });
    const taskJson = await taskRes.json();

    // data 字段是二次 JSON 编码的字符串
    const data = JSON.parse(taskJson.data);
    const ztTasks = data.tasks || [];

    // 转换为 TaskSync 格式（列表基础信息）
    const mappedTasks = ztTasks.map((t: any) => ({
      ztId: t.id,
      id: `ZT-${t.id}`,
      title: t.name || '(无标题)',
      status: mapZentaoStatus(t.status),
      priority: mapZentaoPriority(t.pri),
      projectName: t.projectName || '未分类项目',
      projectId: t.project || '',
      estimate: t.estimate || '0',
      consumed: t.consumed || '0',
      left: t.left || '0',
      deadline: t.deadline && t.deadline !== '0000-00-00' ? t.deadline : '',
      assignedTo: t.assignedTo || '',
      openedBy: t.openedBy || '',
      openedDate: t.openedDate || '',
      type: t.type || 'devel',
      storyTitle: t.storyTitle || '',
    }));

    // 步骤4: 批量获取每个任务的详情（task-view-{id}.json）
    const detailHeaders = { 'Cookie': `zentaosid=${finalSid}` };
    for (const mt of mappedTasks) {
      try {
        const detailRes = await fetch(`${ZENTAO_BASE}/task-view-${mt.ztId}.json`, { headers: detailHeaders });
        const detailJson = await detailRes.json();
        const detailData = JSON.parse(detailJson.data);
        const dt = detailData.task || {};

        // 补充详情字段
        mt.desc = dt.desc || '';
        mt.storySpec = dt.storySpec || '';
        mt.storyVerify = dt.storyVerify || '';
        mt.progress = dt.progress ?? 0;
        mt.realStarted = dt.realStarted || '';
        mt.parent = dt.parent || '0';
        mt.parentName = dt.parentName || '';
        mt.assignedToRealName = dt.assignedToRealName || '';
        mt.lastEditedBy = dt.lastEditedBy || '';
        mt.lastEditedDate = dt.lastEditedDate || '';
        mt.modulePath = (detailData.modulePath || []).map((m: any) => m.name || '').filter(Boolean).join(' > ');

        // 操作动态
        const actions = detailData.actions || {};
        mt.activities = Object.values(actions).map((a: any) => ({
          actor: a.actor || '',
          action: a.action || '',
          date: a.date || '',
          comment: a.comment || '',
        }));
      } catch (e) {
        // 单个任务详情获取失败不影响整体
        mt.desc = '';
        mt.activities = [];
      }
    }

    res.json({
      success: true,
      memberName: ztUser.realname || ztUser.nickname || account,
      taskCount: mappedTasks.length,
      tasks: mappedTasks,
      // 同步到的禅道账号资料
      account: {
        zentaoAccount: account,
        zentaoUserId: ztUser.id ? String(ztUser.id) : undefined,
        realname: ztUser.realname || ztUser.nickname || account,
        zentaoRole: ztUser.role || undefined,
        dept: ztUser.dept ? String(ztUser.dept) : undefined,
        email: ztUser.email || undefined,
        phone: ztUser.mobile || ztUser.phone || undefined,
        weixin: ztUser.weixin || undefined,
        isAdmin: ztUser.admin === true,
      },
    });
  } catch (err: any) {
    console.error('Zentao sync error:', err);
    res.status(500).json({ error: `禅道同步失败: ${err.message || '未知错误'}` });
  }
});

// 导入禅道任务到 TaskSync
app.post('/api/zentao/import', (req, res) => {
  const { tasks: ztTasks, targetProjectId, memberId } = req.body;

  if (!Array.isArray(ztTasks) || ztTasks.length === 0) {
    return res.json({ success: true, imported: 0, tasks: [] });
  }

  // 按 projectName 分组，为每个禅道项目创建/复用 TaskSync 项目
  const projectMap = new Map<string, string>(); // projectName -> projectId
  let newTasks: Task[] = [];

  for (const zt of ztTasks) {
    let projectId = targetProjectId;

    // 如果没有指定目标项目，按禅道项目名创建/复用
    if (!projectId) {
      const pName = zt.projectName;
      if (projectMap.has(pName)) {
        projectId = projectMap.get(pName)!;
      } else {
        // 查找已有项目
        const existing = projects.find((p) => p.name === pName);
        if (existing) {
          projectId = existing.id;
          // 复用已有项目时，把当前成员补入项目成员列表
          if (memberId && !existing.memberIds.includes(memberId)) {
            existing.memberIds = [...existing.memberIds, memberId];
          }
        } else {
          // 创建新项目
          projectId = `zentao-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          projects.push({
            id: projectId,
            name: pName,
            key: `ZT-${zt.projectId}`,
            description: `禅道同步项目（来源: ${zt.projectId}）`,
            color: '#6366f1',
            memberIds: memberId ? [memberId] : [],
          });
        }
        projectMap.set(pName, projectId);
      }
    }

    // 检查是否已存在同 ID 的任务（避免重复导入）
    const existingTask = tasks.find((t) => t.id === zt.id);
    if (existingTask) {
      // 更新已有任务
      Object.assign(existingTask, {
        title: zt.title,
        status: zt.status,
        priority: zt.priority,
        dueDate: zt.deadline,
        estimatedHours: parseFloat(zt.estimate) || 0,
        loggedHours: parseFloat(zt.consumed) || 0,
        tags: [zt.type, ...(zt.storyTitle ? [`需求: ${zt.storyTitle}`] : []), ...(zt.modulePath ? [`模块: ${zt.modulePath}`] : [])],
      });
      // 更新描述（如果详情有数据）
      if (zt.desc || zt.storySpec) {
        existingTask.description = buildZentaoDescription(zt);
      }
      continue;
    }

    const now = new Date().toISOString();

    // 构建活动记录：禅道操作动态 + 同步导入记录
    const ztActivities: TaskActivity[] = [];
    if (Array.isArray(zt.activities)) {
      for (const a of zt.activities) {
        ztActivities.push({
          id: `act-zt-${zt.ztId}-${a.date || Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
          taskId: zt.id,
          action: mapZentaoAction(a.action),
          authorId: memberId || '1',
          timestamp: a.date ? a.date.replace(' ', 'T') : now,
          details: a.comment || '',
        });
      }
    }
    ztActivities.push({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      taskId: zt.id,
      action: '从禅道同步导入',
      authorId: memberId || '1',
      timestamp: now,
      details: `禅道任务 ID: ${zt.ztId}${zt.parentName ? ` | 父任务: ${zt.parentName}` : ''}`,
    });

    newTasks.push({
      id: zt.id,
      title: zt.title,
      description: buildZentaoDescription(zt),
      status: zt.status,
      priority: zt.priority,
      assigneeIds: memberId ? [memberId] : [],
      reporterId: memberId || '1',
      projectId,
      startDate: zt.realStarted || (zt.openedDate ? zt.openedDate.split(' ')[0] : ''),
      dueDate: zt.deadline,
      estimatedHours: parseFloat(zt.estimate) || 0,
      loggedHours: parseFloat(zt.consumed) || 0,
      tags: [zt.type, ...(zt.storyTitle ? [`需求: ${zt.storyTitle}`] : []), ...(zt.modulePath ? [`模块: ${zt.modulePath}`] : [])],
      checklist: [],
      comments: [],
      activities: ztActivities,
      attachmentsCount: 0,
      createdAt: zt.openedDate || now,
      updatedAt: zt.lastEditedDate || now,
    });
  }

  tasks.push(...newTasks);

  res.json({
    success: true,
    imported: newTasks.length,
    updated: ztTasks.length - newTasks.length,
    tasks: newTasks,
    projects,
  });
});

// 禅道登录：登录 + 同步任务 + 导入 + 匹配本地成员，一步到位
app.post('/api/zentao/login', async (req, res) => {
  const { account = 'zhangq', password = 'zhangq' } = req.body;

  try {
    // 步骤1: 获取 Session ID
    const sessionRes = await fetch(`${ZENTAO_BASE}/api-getSessionID.json`);
    const sessionJson = await sessionRes.json();
    const sessionData = JSON.parse(sessionJson.data);
    const sessionID = sessionData.sessionID;
    const sessionName = sessionData.sessionName;

    // 步骤2: 登录
    const loginRes = await fetch(`${ZENTAO_BASE}/user-login.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `${sessionName}=${sessionID}`,
      },
      body: `account=${account}&password=${password}`,
    });
    const loginText = await loginRes.text();
    const setCookie = loginRes.headers.get('set-cookie') || '';
    const cookieMatch = setCookie.match(/zentaosid=([^;]+)/);
    const finalSid = cookieMatch ? cookieMatch[1] : sessionID;
    zentaoCachedSid = finalSid;

    // 解析禅道账号资料（realname / role / dept / 联系方式等）
    const ztUser = parseZentaoUser(loginText);
    if (!ztUser) {
      return res.status(401).json({ error: '禅道登录失败，请检查账号密码' });
    }
    const zentaoRealName = ztUser.realname || ztUser.nickname || account;

    // 步骤3: 获取任务列表
    const taskRes = await fetch(`${ZENTAO_BASE}/my-task.json`, {
      headers: { 'Cookie': `zentaosid=${finalSid}` },
    });
    const taskJson = await taskRes.json();
    const data = JSON.parse(taskJson.data);
    const ztTasks = data.tasks || [];

    // 步骤4: 批量获取任务详情
    const detailHeaders = { 'Cookie': `zentaosid=${finalSid}` };
    const mappedTasks = ztTasks.map((t: any) => ({
      ztId: t.id,
      id: `ZT-${t.id}`,
      title: t.name || '(无标题)',
      status: mapZentaoStatus(t.status),
      priority: mapZentaoPriority(t.pri),
      projectName: t.projectName || '未分类项目',
      projectId: t.project || '',
      estimate: t.estimate || '0',
      consumed: t.consumed || '0',
      left: t.left || '0',
      deadline: t.deadline && t.deadline !== '0000-00-00' ? t.deadline : '',
      assignedTo: t.assignedTo || '',
      openedBy: t.openedBy || '',
      openedDate: t.openedDate || '',
      type: t.type || 'devel',
      storyTitle: t.storyTitle || '',
    }));

    for (const mt of mappedTasks) {
      try {
        const detailRes = await fetch(`${ZENTAO_BASE}/task-view-${mt.ztId}.json`, { headers: detailHeaders });
        const detailJson = await detailRes.json();
        const detailData = JSON.parse(detailJson.data);
        const dt = detailData.task || {};
        mt.desc = dt.desc || '';
        mt.storySpec = dt.storySpec || '';
        mt.storyVerify = dt.storyVerify || '';
        mt.progress = dt.progress ?? 0;
        mt.realStarted = dt.realStarted || '';
        mt.parent = dt.parent || '0';
        mt.parentName = dt.parentName || '';
        mt.assignedToRealName = dt.assignedToRealName || '';
        mt.lastEditedBy = dt.lastEditedBy || '';
        mt.lastEditedDate = dt.lastEditedDate || '';
        mt.modulePath = (detailData.modulePath || []).map((m: any) => m.name || '').filter(Boolean).join(' > ');
        const actions = detailData.actions || {};
        mt.activities = Object.values(actions).map((a: any) => ({
          actor: a.actor || '', action: a.action || '', date: a.date || '', comment: a.comment || '',
        }));
      } catch {
        mt.desc = ''; mt.activities = [];
      }
    }

    // 步骤5: 匹配本地成员（优先 zentaoAccount，其次姓名精确匹配）
    let member = members.find((m) => m.zentaoAccount === account);
    if (!member && zentaoRealName !== account) {
      // 仅做精确匹配：姓名完全相同或去掉英文括号后缀后相同，
      // 避免「张琪」被模糊匹配到「张莎拉 (Sarah)」这类同姓成员
      const normalize = (s: string) => s.replace(/\s*[（(].*?[)）]\s*/g, '').trim();
      const target = normalize(zentaoRealName);
      member = members.find((m) => normalize(m.name) === target);
    }

    // 从禅道账号资料构建同步字段
    const syncedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const mappedRole = mapZentaoRole(ztUser.role || '', ztUser.admin === true);
    // 禅道头像为相对路径时需走图片代理，为空则用 initials 头像兜底
    const ztAvatar = ztUser.avatar
      ? (String(ztUser.avatar).startsWith('http')
          ? String(ztUser.avatar)
          : `/api/zentao/image?url=${encodeURIComponent(`http://124.70.211.186:7099${String(ztUser.avatar).startsWith('/') ? '' : '/'}${ztUser.avatar}`)}`)
      : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(zentaoRealName)}`;

    const zentaoProfile = {
      name: zentaoRealName,
      role: mappedRole.role,
      roleId: mappedRole.roleId,
      email: ztUser.email || `${account}@zentao.sync`,
      status: 'online' as const,
      statusText: `禅道同步 · ${mappedRole.role}`,
      workloadCount: mappedTasks.length,
      isAdmin: ztUser.admin === true,
      zentaoAccount: account,
      zentaoUserId: ztUser.id ? String(ztUser.id) : undefined,
      zentaoRole: ztUser.role || undefined,
      zentaoDept: ztUser.dept ? String(ztUser.dept) : undefined,
      phone: ztUser.mobile || ztUser.phone || undefined,
      weixin: ztUser.weixin || undefined,
      gender: (ztUser.gender === 'm' || ztUser.gender === 'f' ? ztUser.gender : '') as 'm' | 'f' | '',
      zentaoSyncedAt: syncedAt,
    };

    if (member) {
      // 已存在成员：同步最新禅道资料（保留本地已有头像，避免覆盖用户自定义头像）
      const existing = member;
      members = members.map((m) =>
        m.id === existing.id
          ? { ...m, ...zentaoProfile, avatar: m.avatar || ztAvatar }
          : m
      );
      member = members.find((m) => m.id === existing.id)!;
    } else {
      // 匹配不到则创建新成员
      member = {
        id: `usr_zt_${Date.now()}`,
        ...zentaoProfile,
        avatar: ztAvatar,
        avatarBg: 'bg-indigo-600',
      };
      members.push(member);
    }

    // 步骤6: 导入任务
    const projectMap = new Map<string, string>();
    let importedCount = 0;
    let updatedCount = 0;

    for (const zt of mappedTasks) {
      let projectId: string | undefined;
      const pName = zt.projectName;
      if (projectMap.has(pName)) {
        projectId = projectMap.get(pName)!;
      } else {
        const existing = projects.find((p) => p.name === pName);
        if (existing) {
          projectId = existing.id;
          // 同名项目被多个禅道账号共用时，补入当前登录成员
          if (!existing.memberIds.includes(member!.id)) {
            existing.memberIds = [...existing.memberIds, member!.id];
          }
        } else {
          projectId = `zentao-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          projects.push({
            id: projectId, name: pName, key: `ZT-${zt.projectId}`,
            description: `禅道同步项目（来源: ${zt.projectId}）`, color: '#6366f1',
            memberIds: [member!.id],
          });
        }
        projectMap.set(pName, projectId);
      }

      const existingTask = tasks.find((t) => t.id === zt.id);
      if (existingTask) {
        Object.assign(existingTask, {
          title: zt.title, status: zt.status, priority: zt.priority, dueDate: zt.deadline,
          estimatedHours: parseFloat(zt.estimate) || 0, loggedHours: parseFloat(zt.consumed) || 0,
          tags: [zt.type, ...(zt.storyTitle ? [`需求: ${zt.storyTitle}`] : []), ...(zt.modulePath ? [`模块: ${zt.modulePath}`] : [])],
          // 归属信息随当前登录账号更新，避免多账号下任务停留在首次导入者名下
          assigneeIds: [member!.id],
          reporterId: member!.id,
          projectId,
          zentaoAccount: account,
        });
        if (zt.desc || zt.storySpec) existingTask.description = buildZentaoDescription(zt);
        updatedCount++;
        continue;
      }

      const now = new Date().toISOString();
      const ztActivities: TaskActivity[] = [];
      if (Array.isArray(zt.activities)) {
        for (const a of zt.activities) {
          ztActivities.push({
            id: `act-zt-${zt.ztId}-${a.date || Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
            taskId: zt.id, action: mapZentaoAction(a.action), authorId: member!.id,
            timestamp: a.date ? a.date.replace(' ', 'T') : now, details: a.comment || '',
          });
        }
      }
      ztActivities.push({
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        taskId: zt.id, action: '从禅道同步导入', authorId: member!.id, timestamp: now,
        details: `禅道任务 ID: ${zt.ztId}${zt.parentName ? ` | 父任务: ${zt.parentName}` : ''}`,
      });

      tasks.push({
        id: zt.id, title: zt.title, description: buildZentaoDescription(zt),
        status: zt.status, priority: zt.priority,
        assigneeIds: [member!.id], reporterId: member!.id, projectId,
        startDate: zt.realStarted || (zt.openedDate ? zt.openedDate.split(' ')[0] : ''),
        dueDate: zt.deadline, estimatedHours: parseFloat(zt.estimate) || 0,
        loggedHours: parseFloat(zt.consumed) || 0,
        tags: [zt.type, ...(zt.storyTitle ? [`需求: ${zt.storyTitle}`] : []), ...(zt.modulePath ? [`模块: ${zt.modulePath}`] : [])],
        checklist: [], comments: [], activities: ztActivities, attachmentsCount: 0,
        zentaoAccount: account,
        createdAt: zt.openedDate || now, updatedAt: zt.lastEditedDate || now,
      });
      importedCount++;
    }

    res.json({
      success: true,
      memberId: member.id,
      memberName: member.name,
      taskCount: mappedTasks.length,
      imported: importedCount,
      updated: updatedCount,
      // 回传同步到的禅道账号资料，供前端展示
      account: {
        zentaoAccount: account,
        zentaoUserId: member.zentaoUserId,
        realname: member.name,
        role: member.role,
        zentaoRole: member.zentaoRole,
        dept: member.zentaoDept,
        email: member.email,
        phone: member.phone,
        weixin: member.weixin,
        isAdmin: member.isAdmin,
        syncedAt: member.zentaoSyncedAt,
      },
      members,
    });
  } catch (err: any) {
    console.error('Zentao login error:', err);
    res.status(500).json({ error: `禅道登录失败: ${err.message || '未知错误'}` });
  }
});

// 禅道图片代理（携带 zentaosid 请求禅道图片，返回给前端）
app.get('/api/zentao/image', async (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    return res.status(400).send('Missing url parameter');
  }

  // 安全检查：只允许代理禅道服务器的图片
  if (!url.startsWith('http://124.70.211.186:7099')) {
    return res.status(403).send('Forbidden: only zentao server images allowed');
  }

  if (!zentaoCachedSid) {
    return res.status(401).send('No cached zentao session, please sync first');
  }

  try {
    const imageRes = await fetch(url, {
      headers: { 'Cookie': `zentaosid=${zentaoCachedSid}` },
    });

    if (!imageRes.ok) {
      return res.status(imageRes.status).send(`Image fetch failed: ${imageRes.status}`);
    }

    const contentType = imageRes.headers.get('content-type') || 'image/png';
    const buffer = await imageRes.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.error('Zentao image proxy error:', err);
    res.status(500).send('Image proxy error');
  }
});

// Start Express + Vite
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TaskSync Platform server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
