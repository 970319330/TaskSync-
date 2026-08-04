# TaskSync MCP Server

通过 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 把 TaskSync 任务管理能力暴露给 AI Agent（如 Claude Desktop、Cursor、Continue 等），使 AI 可以：

| 工具 | 方向 | 功能 |
|------|------|------|
| `get_pending_tasks` | 读 | 拉取待开发任务（默认 backlog + todo），支持按项目/优先级/经办人过滤 |
| `get_task_detail` | 读 | 获取任务完整详情（描述、需求、验收标准、子任务、评论、活动） |
| `update_task_status` | 写 | 回写任务状态，可选附带优先级/已用工时/备注 |

## 启动

### 1. 启动 TaskSync HTTP 服务

```bash
npm run dev          # 启动前端 + HTTP API（默认 3000 端口）
```

### 2. 启动 MCP Server

```bash
npm run mcp          # 通过 stdio 暴露 MCP 工具
```

## 客户端配置

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
`%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "tasksync": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/Users/zhangqi/Documents/code/TaskSync-",
      "env": {
        "TASKSYNC_API_BASE": "http://localhost:3000"
      }
    }
  }
}
```

### Cursor

`.cursor/mcp.json` (项目级) 或 `~/.cursor/mcp.json` (全局)

```json
{
  "mcpServers": {
    "tasksync": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/Users/zhangqi/Documents/code/TaskSync-",
      "env": { "TASKSYNC_API_BASE": "http://localhost:3000" }
    }
  }
}
```

### Continue (VSCode)

`~/.continue/config.json`

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "name": "tasksync",
        "transport": {
          "type": "stdio",
          "command": "npx",
          "args": ["tsx", "mcp/server.ts"],
          "cwd": "/Users/zhangqi/Documents/code/TaskSync-"
        }
      }
    ]
  }
}
```

## 工具详情

### `get_pending_tasks`

**参数：**

| 名称 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `status` | string | 否 | 状态过滤，多个用逗号分隔。默认 `backlog,todo` |
| `projectId` | string | 否 | 按项目 ID 过滤 |
| `priority` | enum | 否 | `urgent` / `high` / `medium` / `low` |
| `assigneeId` | string | 否 | 按经办人 ID 过滤 |
| `limit` | number | 否 | 限制返回数量，默认 50 |

**返回：** 按优先级（紧急 → 低）+ 截止日期排序的任务列表，包含 ID、标题、项目、经办人、截止日期、工时、标签。

### `get_task_detail`

**参数：**

| 名称 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 任务 ID（如 `TS-101`、`ZT-8935`） |

**返回：** 任务完整信息（描述、项目、报告人/经办人、起止日期、工时、标签、子任务、近期评论、近期活动）。

### `update_task_status`

**参数：**

| 名称 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 任务 ID |
| `status` | enum | 是 | `backlog` / `todo` / `in_progress` / `review` / `done` |
| `actorId` | string | 否 | 操作人 ID，默认 `usr_alex` |
| `note` | string | 否 | 备注（写入评论 + 活动记录） |
| `newPriority` | enum | 否 | 同时调整优先级 |
| `loggedHours` | number | 否 | 累计已用工时 |

**返回：** 成功消息 + 更新摘要。

## 使用示例

```
用户: 帮我看看待开发任务
AI:  (调用 get_pending_tasks)
     共 12 条待开发任务，按优先级排序：
     1. [urgent] TS-105 修复登录页空白 (明天截止)
     2. [high]  TS-103 优化看板性能
     ...

用户: 把 TS-105 状态改成 in_progress，备注：正在修复
AI:  (调用 update_task_status)
     任务 TS-105 状态已更新为 in_progress，备注：正在修复
```

## 通信协议

- **传输层**：stdio（标准输入输出）
- **协议**：JSON-RPC 2.0
- **stdout**：JSON-RPC 消息
- **stderr**：调试日志

MCP 客户端会自动通过 `npx tsx mcp/server.ts` 启动子进程并通过 stdin/stdout 通信。
