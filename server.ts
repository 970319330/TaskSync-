import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  INITIAL_MEMBERS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_CHANNELS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
} from './src/mockData';
import { Task, ChatMessage, TaskComment, TaskActivity, NotificationItem, Project } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory persistent state
let members = [...INITIAL_MEMBERS];
let projects = [...INITIAL_PROJECTS];
let tasks: Task[] = [...INITIAL_TASKS];
let channels = [...INITIAL_CHANNELS];
let messages: ChatMessage[] = [...INITIAL_MESSAGES];
let notifications: NotificationItem[] = [...INITIAL_NOTIFICATIONS];

// AI Settings (可在运行时通过 /api/settings 修改)
let aiSettings: {
  provider: 'gemini' | 'deepseek' | 'openai';
  apiKey: string;
  model: string;
  baseUrl: string;
} = {
  provider: 'gemini',
  apiKey: process.env.GEMINI_API_KEY || '',
  model: 'gemini-3.6-flash',
  baseUrl: '',
};

// 统一 LLM 调用:支持 Gemini 与 OpenAI 兼容接口(DeepSeek / OpenAI 等)
async function callLLM(prompt: string, options: { jsonMode?: boolean } = {}): Promise<string> {
  const { provider, apiKey, model, baseUrl } = aiSettings;
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

// API Routes
app.get('/api/state', (req, res) => {
  res.json({
    members,
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

// Get AI Settings (API Key 脱敏返回)
app.get('/api/settings', (req, res) => {
  const key = aiSettings.apiKey;
  const maskedKey = key ? `${key.slice(0, 4)}****${key.slice(-4)}` : '';
  res.json({ ...aiSettings, apiKey: maskedKey, hasApiKey: !!key });
});

// Update AI Settings
app.put('/api/settings', (req, res) => {
  const { provider, apiKey, model, baseUrl } = req.body || {};
  const validProvider = ['gemini', 'deepseek', 'openai'].includes(provider) ? provider : aiSettings.provider;
  const providerChanged = validProvider !== aiSettings.provider;
  aiSettings = {
    provider: validProvider,
    // 切换供应商时,Key 跟随请求值(空则清空,强制为新供应商重填);
    // 未切换时,含 **** 的脱敏回传值不覆盖原 Key
    apiKey: providerChanged
      ? typeof apiKey === 'string'
        ? apiKey.trim()
        : ''
      : typeof apiKey === 'string' && apiKey.trim() && !apiKey.includes('****')
        ? apiKey.trim()
        : aiSettings.apiKey,
    model: typeof model === 'string' ? model.trim() : aiSettings.model,
    baseUrl: typeof baseUrl === 'string' ? baseUrl.trim() : aiSettings.baseUrl,
  };
  const key = aiSettings.apiKey;
  const maskedKey = key ? `${key.slice(0, 4)}****${key.slice(-4)}` : '';
  res.json({ success: true, settings: { ...aiSettings, apiKey: maskedKey, hasApiKey: !!key } });
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

      // Log status change activity
      if (updates.status && updates.status !== t.status) {
        const statusMap: Record<string, string> = {
          backlog: 'Backlog 积压',
          todo: '待办 (To Do)',
          in_progress: '进行中 (In Progress)',
          review: '代码评审 (Code Review)',
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

  res.json({ success: true, task: updatedTask, tasks });
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
    let aiAnswer = '我是 TaskSync AI 协同助手。我已经分析了当前项目的任务状态，有什么需要我帮忙一键拆解或总结站会的吗？';

    try {
      if (aiSettings.apiKey) {
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
    if (!aiSettings.apiKey) {
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
    const parsed = JSON.parse(jsonText);

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
  if (!aiSettings.apiKey) {
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
    const parsed = JSON.parse(jsonText);
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

    if (!aiSettings.apiKey) {
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
