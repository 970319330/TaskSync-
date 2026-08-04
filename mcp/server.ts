/**
 * TaskSync MCP Server
 *
 * 通过 Model Context Protocol (MCP) 暴露任务管理工具，使 AI Agent 能够：
 *   1. 拉取待开发任务
 *   2. 获取任务详情
 *   3. 回写任务状态
 *
 * 通信方式：stdio (JSON-RPC 2.0)
 * 启动方式：npm run mcp
 *
 * 配置示例（Claude Desktop / Cursor / Continue 等）:
 *   {
 *     "mcpServers": {
 *       "tasksync": {
 *         "command": "npx",
 *         "args": ["tsx", "mcp/server.ts"],
 *         "cwd": "/path/to/TaskSync-",
 *         "env": {
 *           "TASKSYNC_API_BASE": "http://localhost:3000"
 *         }
 *       }
 *     }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = process.env.TASKSYNC_API_BASE || 'http://localhost:3000';

/**
 * 调用 TaskSync HTTP API
 */
async function apiRequest(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<unknown> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ============ MCP Server ============

const server = new McpServer({
  name: 'tasksync',
  version: '1.0.0',
});

/**
 * 工具 1: 拉取待开发任务
 *
 * 默认返回状态为 backlog / todo 的任务，可通过参数筛选。
 * 返回值包含任务 ID、标题、状态、优先级、项目、截止日期、预估工时等。
 */
server.tool(
  'get_pending_tasks',
  '拉取待开发任务列表。默认返回 backlog + todo 状态的任务，可通过参数按项目、优先级、分配人过滤。',
  {
    projectId: z
      .string()
      .optional()
      .describe('可选：按项目 ID 过滤'),
    priority: z
      .enum(['urgent', 'high', 'medium', 'low'])
      .optional()
      .describe('可选：按优先级过滤'),
    status: z
      .string()
      .optional()
      .describe('可选：按状态过滤，多个用逗号分隔（如 "backlog,todo"）。不传则默认 backlog+todo'),
    assigneeId: z
      .string()
      .optional()
      .describe('可选：按经办人 ID 过滤'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .describe('可选：限制返回数量，默认 50'),
  },
  async (params) => {
    try {
      const data = (await apiRequest('/api/state')) as {
        tasks: Array<{
          id: string;
          title: string;
          status: string;
          priority: string;
          projectId: string;
          projectName?: string;
          assigneeIds: string[];
          reporterId: string;
          dueDate?: string;
          estimatedHours: number;
          loggedHours?: number;
          tags?: string[];
        }>;
        projects: Array<{ id: string; name: string }>;
        members: Array<{ id: string; name: string }>;
      };

      const defaultStatuses = ['backlog', 'todo'];
      const wantedStatuses = params.status
        ? params.status.split(',').map((s) => s.trim())
        : defaultStatuses;

      let tasks = data.tasks.filter((t) => wantedStatuses.includes(t.status));

      if (params.projectId) tasks = tasks.filter((t) => t.projectId === params.projectId);
      if (params.priority) tasks = tasks.filter((t) => t.priority === params.priority);
      if (params.assigneeId) tasks = tasks.filter((t) => t.assigneeIds?.includes(params.assigneeId!));

      // 紧急优先 + 截止日期升序
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      tasks.sort((a, b) => {
        const pa = priorityOrder[a.priority] ?? 4;
        const pb = priorityOrder[b.priority] ?? 4;
        if (pa !== pb) return pa - pb;
        const da = a.dueDate || '9999-12-31';
        const db = b.dueDate || '9999-12-31';
        return da.localeCompare(db);
      });

      const limited = tasks.slice(0, params.limit || 50);

      // 友好格式输出
      const summary = limited.map((t) => {
        const project = data.projects.find((p) => p.id === t.projectId);
        const assignees = (t.assigneeIds || [])
          .map((id) => data.members.find((m) => m.id === id)?.name)
          .filter(Boolean);
        return {
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          project: project?.name || t.projectId,
          assignees,
          dueDate: t.dueDate || null,
          estimate: t.estimatedHours,
          tags: t.tags || [],
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                total: tasks.length,
                returned: limited.length,
                tasks: summary,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  }
);

/**
 * 工具 2: 获取任务详情
 */
server.tool(
  'get_task_detail',
  '获取任务完整详情，包括描述、需求、验收标准、子任务、评论、活动记录等。',
  {
    id: z.string().describe('任务 ID（如 TS-101、ZT-8935）'),
  },
  async ({ id }) => {
    try {
      const data = (await apiRequest(`/api/state`)) as {
        tasks: Array<{
          id: string;
          title: string;
          description: string;
          status: string;
          priority: string;
          projectId: string;
          assigneeIds: string[];
          reporterId: string;
          startDate?: string;
          dueDate?: string;
          estimatedHours: number;
          loggedHours?: number;
          tags?: string[];
          checklist?: Array<{ id: string; title: string; completed: boolean; assigneeId?: string }>;
          comments?: Array<{ id: string; authorId: string; content: string; timestamp: string }>;
          activities?: Array<{ id: string; action: string; authorId: string; timestamp: string; details?: string }>;
        }>;
        projects: Array<{ id: string; name: string }>;
        members: Array<{ id: string; name: string; avatar?: string }>;
      };

      const task = data.tasks.find((t) => t.id === id);
      if (!task) {
        return { content: [{ type: 'text', text: `任务 ${id} 不存在` }], isError: true };
      }

      const project = data.projects.find((p) => p.id === task.projectId);
      const memberById = (id: string) => data.members.find((m) => m.id === id);

      const detail = {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        project: project ? { id: project.id, name: project.name } : null,
        assignees: (task.assigneeIds || []).map((aid) => {
          const m = memberById(aid);
          return m ? { id: m.id, name: m.name } : { id: aid, name: aid };
        }),
        reporter: (() => {
          const m = memberById(task.reporterId);
          return m ? { id: m.id, name: m.name } : { id: task.reporterId, name: task.reporterId };
        })(),
        startDate: task.startDate || null,
        dueDate: task.dueDate || null,
        estimatedHours: task.estimatedHours,
        loggedHours: task.loggedHours || 0,
        tags: task.tags || [],
        checklist: (task.checklist || []).map((c) => ({
          title: c.title,
          completed: c.completed,
          assignee: c.assigneeId ? memberById(c.assigneeId)?.name : null,
        })),
        recentComments: (task.comments || []).slice(-10).map((c) => ({
          author: memberById(c.authorId)?.name || c.authorId,
          content: c.content,
          timestamp: c.timestamp,
        })),
        recentActivities: (task.activities || []).slice(-10).map((a) => ({
          action: a.action,
          author: memberById(a.authorId)?.name || a.authorId,
          timestamp: a.timestamp,
          details: a.details || null,
        })),
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(detail, null, 2) }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  }
);

/**
 * 工具 3: 回写任务状态
 */
server.tool(
  'update_task_status',
  '回写任务状态到 TaskSync。可选附带优先级、剩余工时、活动备注。',
  {
    id: z.string().describe('任务 ID'),
    status: z
      .enum(['backlog', 'todo', 'in_progress', 'review', 'done'])
      .describe('目标状态：backlog / todo / in_progress / review / done'),
    actorId: z
      .string()
      .optional()
      .describe('操作人 ID（可选，默认 usr_alex 管理员）'),
    note: z
      .string()
      .optional()
      .describe('可选：本次操作备注（写入活动记录）'),
    newPriority: z
      .enum(['urgent', 'high', 'medium', 'low'])
      .optional()
      .describe('可选：同时调整优先级'),
    loggedHours: z
      .number()
      .min(0)
      .optional()
      .describe('可选：累计已用工时'),
  },
  async ({ id, status, actorId, note, newPriority, loggedHours }) => {
    try {
      const updates: Record<string, unknown> = { status };
      if (newPriority) updates.priority = newPriority;
      if (typeof loggedHours === 'number') updates.loggedHours = loggedHours;
      if (note) updates.activityNote = note;
      if (actorId) updates.actorId = actorId;

      const result = await apiRequest(`/api/tasks/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: updates,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: `任务 ${id} 状态已更新为 ${status}${newPriority ? `，优先级 ${newPriority}` : ''}${typeof loggedHours === 'number' ? `，已用工时 ${loggedHours}h` : ''}${note ? `，备注：${note}` : ''}`,
                taskId: id,
                newStatus: status,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  }
);

// ============ 启动 ============

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // 启动后输出到 stderr（stdout 留给 JSON-RPC）
  console.error('[TaskSync MCP] server started, connected via stdio');
}

main().catch((err) => {
  console.error('[TaskSync MCP] failed to start:', err);
  process.exit(1);
});
