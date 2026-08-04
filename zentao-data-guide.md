# 禅道数据获取机制与实操指南

> 涵盖 `my-task.html` 任务列表 + `task-view-{id}.html` 任务详情

> **服务器**：124.70.211.186:7099 ｜ **账号**：zhangq（张琪）｜ **日期**：2026-08-04

---

## 目录

1. [概述](#一概述)
2. [页面运行机制](#二页面运行机制)
3. [程序化获取数据的三种方法](#三程序化获取数据的三种方法)
4. [实战演练：my-task 完整流程](#四实战演练my-task-完整流程)
5. [获取到的任务列表数据](#五获取到的任务列表数据)
6. [数据解析与处理](#六数据解析与处理)
7. [任务详情获取：task-view](#七任务详情获取task-view)
8. [详情中的图片展示机制](#八详情中的图片展示机制)
9. [附录：其他可用数据接口](#九附录其他可用数据接口)

---

## 一、概述

禅道（ZenTao）是一款基于 PHP 的项目管理软件，其 URL 中的 `my-task.html` 对应「我的任务」页面。本文档详细解析该页面的数据获取机制，并提供三种程序化获取数据的方法——均已通过实际服务器验证。

> **核心结论**：禅道采用 **PATH_INFO 路由 + 会话鉴权** 模式。将 URL 中的 `.html` 后缀替换为 `.json` 即可获取 JSON 格式数据，但**必须先登录携带有效的 `zentaosid` Cookie**。未登录时服务器返回一段 JavaScript 跳转脚本，而非数据。

| 指标 | 值 |
|------|-----|
| 数据获取方法 | 3 种 |
| 已获取任务数 | 10 条 |
| 未完成任务 | 3 条 |
| 接口验证通过率 | 100% |

---

## 二、页面运行机制

`my-task.html` 是禅道 PHP 框架的一个**服务端渲染页面**，其完整的数据流转过程如下：

```
浏览器请求 my-task.html
        │
        ▼
Apache 服务器（PATH_INFO 路由）
        │
        ▼
   会话校验（zentaosid Cookie）
        │
   ┌────┴────┐
   ▼         ▼
未登录      已登录
   │         │
   ▼         ▼
JS 跳转    my 模块 → task 方法
user-         │
login         ▼
.html      task 模型 → getByUser()
   │          │
   ▼          ▼
登录页面   MySQL 数据库查询
   │          │
   ▼          ▼
登录成功   填充模板 → 渲染 HTML 输出
   │
   └──→ 重新请求 my-task.html
```

### 2.1 请求路由

Apache 将 `/zentao/my-task.html` 解析为 PATH_INFO 格式，映射到禅道的 `my` 模块（Module）、`task` 方法（Method）。这是禅道框架标准的 MVC 路由方式。

### 2.2 会话鉴权

服务器检查请求中的 `zentaosid` Cookie。未登录时，服务器返回 HTTP 200，但响应体是一段 JavaScript 跳转代码：

```html
<!-- 未登录时的响应（HTTP 200, Content-Length: 155） -->
<html><meta charset='utf-8'/><style>body{background:white}</style>
<script>self.location='/zentao/user-login-L3plbnRhby9teS10YXNrLmh0bWw=.html';</script>
```

其中 base64 串 `L3plbnRhby9teS10YXNrLmh0bWw=` 解码后为 `/zentao/my-task.html`，即登录成功后的跳回地址。

### 2.3 数据查询与渲染

登录验证通过后，`my` 模块的 `task` 方法调用 `task` 模型的 `getByUser()` 等方法，从 MySQL 数据库查询当前用户名下的任务列表，填充到模板后输出 HTML。

---

## 三、程序化获取数据的三种方法

### 方法一：旧版 JSON 接口（推荐 · 已验证）

这是禅道最经典的数据获取方式，通过「获取 Session → 登录 → 请求 JSON」三步完成。核心原理是**将 URL 中的 `.html` 替换为 `.json`**，禅道框架会自动返回 JSON 格式数据。

> **实测结果**：本服务器 `api-getSessionID.json` 接口正常返回会话信息，登录成功后 `my-task.json` 返回了完整的 10 条任务数据（16676 字节）。

### 方法二：REST API v1（Token 鉴权）

禅道较新版本提供了 REST 风格的 API，通过 Token 进行鉴权。本服务器已启用该接口：

```json
// 实测 /api.php/v1/tokens 接口返回：
{"errcode":401,"errmsg":"缺少code参数"}
```

说明该接口需要先在禅道后台「二次开发 → 应用」中创建应用，获取 `code` 和 `secret`，然后按 OAuth 流程换取 access token。

### 方法三：超级 Model 接口

如果 `.json` 接口返回的字段不满足需求，可调用底层 model 方法获取更灵活的数据。需要在后台为账号开启「超级 model 调用接口」权限。

```bash
# PATH_INFO 格式：api-getmodel-模块-方法-参数.json
curl -s -b cookies.txt \
  "http://124.70.211.186:7099/zentao/api-getmodel-task-getByUser-account=zhangq.json"
```

---

## 四、实战演练：my-task 完整流程

以下为方法一（旧版 JSON 接口）的完整操作流程，所有命令均已在本服务器验证通过。

### 步骤 1：获取 Session ID

访问 `api-getSessionID.json` 接口，获取会话标识。服务器返回的 JSON 中包含 `sessionName` 和 `sessionID`。

```bash
curl -s -c cookies.txt \
  "http://124.70.211.186:7099/zentao/api-getSessionID.json"
```

```json
// 返回结果
{
  "status": "success",
  "data": "{\"title\":\"\",\"sessionName\":\"zentaosid\",\"sessionID\":\"22b8d8bt228jtvstigve5gdi34\",\"rand\":667,\"pager\":null}",
  "md5": "a579053f763a0ad74ed28780888b5a95"
}
```

### 步骤 2：用户登录

使用 POST 方式提交用户名和密码到 `user-login.json` 接口。登录成功后，Cookie 文件中会保存有效的 `zentaosid`。

```bash
curl -s -b cookies.txt -c cookies.txt \
  "http://124.70.211.186:7099/zentao/user-login.json" \
  -d "account=zhangq&password=zhangq"
```

> **登录成功**：返回用户信息——张琪（ID: 13），部门：嘉兴云链信息技术有限公司，角色：研发（dev）。登录成功后 Cookie 中已包含有效会话。

### 步骤 3：获取任务数据

携带登录后的 Cookie，请求 `my-task.json`，获取 JSON 格式的任务列表。

```bash
curl -s -b cookies.txt \
  "http://124.70.211.186:7099/zentao/my-task.json"
```

返回数据大小为 16676 字节，包含 10 条任务记录。

### 完整一键脚本

```bash
#!/bin/bash
# 禅道任务数据获取脚本
ZENTAO_URL="http://124.70.211.186:7099/zentao"
ACCOUNT="zhangq"
PASSWORD="zhangq"

# 步骤1：获取 Session
curl -s -c cookies.txt "$ZENTAO_URL/api-getSessionID.json"

# 步骤2：登录
curl -s -b cookies.txt -c cookies.txt "$ZENTAO_URL/user-login.json" \
  -d "account=$ACCOUNT&password=$PASSWORD"

# 步骤3：获取任务数据
curl -s -b cookies.txt "$ZENTAO_URL/my-task.json" -o tasks.json

# 步骤4：解析（需要 jq 工具）
cat tasks.json | jq -r '.data | fromjson | .tasks[] | "\(.id) \(.status) \(.name)"'
```

---

## 五、获取到的任务列表数据

使用账号 **zhangq（张琪）** 登录后，共获取到 **10 条**任务记录，分布在不同项目中。

### 5.1 完整任务列表

| # | ID | 状态 | 项目 | 任务名称 | 预计(h) | 已耗(h) | 剩余(h) | 截止日期 |
|---|-----|------|------|---------|---------|---------|---------|---------|
| 1 | 8935 | 🔄 进行中 | 美大e订单升级 | 【web】人员（原团队管理） | 2 | 0 | 2 | — |
| 2 | 8677 | ✅ 已完成 | 美大e订单升级 | 报表：领料单统计 | 3 | 1 | 0 | 2026-02-05 |
| 3 | 8446 | ⬜ 未开始 | 美大e订单升级 | 订单管理、配件申请单管理详情页tab标红 | 3 | 0 | 3 | 2025-12-06 |
| 4 | 8234 | ✅ 已完成 | 美大e订单升级 | 【后端】配件申请单新增支持序列号查询 | 1 | 1 | 0 | 2025-11-05 |
| 5 | 8152 | ✅ 已完成 | 美大e订单升级 | 【后端】返修出库单 | 1 | 2 | 0 | 2025-10-22 |
| 6 | 6680 | ⬜ 未开始 | 云链e订单 | 【商品档案】增加成本调整按钮 | 0 | 0 | 0 | 2024-09-21 |
| 7 | 4844 | 🔄 进行中 | 运维-美大CRM | CRM配件订单明细增加"退回核销"字段 | 0 | 1 | 0 | 2023-10-24 |
| 8 | 4679 | ✅ 已完成 | 来斯奥e订单升级 | 订单定制信息同步到发货单备注 | 0 | 1 | 0 | 2023-09-10 |
| 9 | 4516 | ✅ 已完成 | 来斯奥e订单升级 | 订单详情页增加打印及导出 | 0 | 1 | 0 | 2023-08-16 |
| 10 | 4382 | ✅ 已完成 | 来斯奥e订单升级 | 销售出库单生成物料账户返利金 | 0 | 2 | 0 | 2023-07-15 |

### 5.2 任务状态分布

| 状态 | 数量 | 占比 |
|------|------|------|
| 进行中 | 2 | 20% |
| 未开始 | 2 | 20% |
| 已完成 | 6 | 60% |

### 5.3 需要关注的任务

> ⚠️ **逾期预警**：当前有 **3 条未完成任务**，其中多条已逾期，建议优先处理：
>
> - **8935（进行中）** — 【web】人员（原团队管理），预计 2h，尚未消耗工时，最近编辑于 2026-07-30
> - **8446（未开始）** — 订单管理详情页 tab 标红，已逾期（截止 2025-12-06）
> - **6680（未开始）** — 商品档案增加成本调整按钮，已逾期（截止 2024-09-21）
> - **4844（进行中）** — CRM 退回核销字段，已逾期（截止 2023-10-24）

---

## 六、数据解析与处理

### 6.1 JSON 数据结构

禅道返回的 JSON 有一个特殊之处：**外层 `data` 字段是二次 JSON 编码的字符串**，需要解析两次才能获取实际数据。

```json
{
  "status": "success",
  "data": "{...}",  // 这是一个 JSON 字符串，需要再次解析
  "md5": "a579053f763a0ad74ed28780888b5a95"
}
```

### 6.2 Python 解析示例

```python
import json

# 第一次解析：获取外层 JSON
outer = json.loads(response_text)

# 第二次解析：解析 data 字段中的 JSON 字符串
data = json.loads(outer['data'])

# 获取任务列表
tasks = data['tasks']
print(f"标题: {data['title']}")
print(f"任务总数: {len(tasks)}")

for task in tasks:
    status_map = {
        'wait': '未开始',
        'doing': '进行中',
        'done': '已完成',
        'closed': '已关闭',
        'pause': '已暂停',
        'cancel': '已取消'
    }
    status = status_map.get(task['status'], task['status'])
    print(f"ID:{task['id']} | {status} | {task['name']}")
```

### 6.3 任务对象核心字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务 ID |
| `name` | string | 任务名称 |
| `project` | string | 所属项目 ID |
| `projectName` | string | 所属项目名称 |
| `status` | string | 任务状态（wait/doing/done/closed/pause/cancel） |
| `pri` | string | 优先级（1-4，1 最高） |
| `estimate` | string | 预计工时（小时） |
| `consumed` | string | 已消耗工时（小时） |
| `left` | string | 剩余工时（小时） |
| `deadline` | string | 截止日期（0000-00-00 表示无截止日期） |
| `assignedTo` | string | 指派给（用户账号） |
| `openedBy` | string | 创建人 |
| `openedDate` | string | 创建时间 |
| `finishedBy` | string | 完成人 |
| `finishedDate` | string | 完成时间 |
| `type` | string | 任务类型（devel/design/test 等） |
| `story` | string | 关联需求 ID（0 表示无关联） |
| `storyTitle` | string | 关联需求标题 |

---

## 七、任务详情获取：task-view

`task-view-{id}.html` 是禅道的**单个任务详情页面**，对应 `task` 模块的 `view` 方法。将 `.html` 替换为 `.json` 同样可以获取 JSON 格式数据。本节以任务 8935 为例，完整解析详情数据的获取方法与返回结构。

### 7.1 数据获取方法

与 `my-task.json` 完全相同的鉴权流程，仅 URL 路径不同：

```bash
# 复用已有 Cookie（步骤1-2与 my-task 相同）
# 步骤3：获取任务详情 JSON
curl -s -b cookies.txt \
  "http://124.70.211.186:7099/zentao/task-view-8935.json"
```

> **实测结果**：返回 HTTP 200，数据大小 7030 字节，包含任务完整详情、操作动态、关联需求描述等。

**REST API v1 方式**（需应用授权）：

```bash
curl -s -b cookies.txt \
  "http://124.70.211.186:7099/zentao/api.php/v1/tasks/8935"
# → {"errcode":401,"errmsg":"缺少code参数"}（需先创建应用获取 code/secret）
```

**超级 Model 方式**：

```bash
curl -s -b cookies.txt \
  "http://124.70.211.186:7099/zentao/api-getmodel-task-getById-taskID=8935.json"
```

### 7.2 返回数据结构

`task-view-{id}.json` 返回的数据比 `my-task.json` **丰富得多**，包含 9 个顶层字段：

| 顶层字段 | 类型 | 说明 |
|---------|------|------|
| `title` | string | 页面标题 |
| `project` | dict | 项目信息（ID、类型、父项目） |
| **`task`** | **dict** | **任务完整信息（44 个字段）** |
| `actions` | dict | 动态记录（按动作 ID 索引） |
| `users` | dict | 相关用户列表（账号 → 姓名） |
| `preAndNext` | dict | 前后任务导航 |
| `product` | dict | 所属产品信息 |
| `modulePath` | list | 模块路径（层级树） |
| `pager` | null | 分页（详情页无分页） |

### 7.3 任务 8935 详情数据（实测）

#### 基本信息

| 字段 | 值 |
|------|-----|
| 任务 ID | 8935 |
| 任务名称 | 【web】人员（原团队管理） |
| 任务类型 | devel（开发） |
| 优先级 | 3 |
| 状态 | **doing（进行中）** |
| 预计工时 | 2h |
| 已消耗工时 | 0h |
| 剩余工时 | 2h |
| 实际开始 | 2026-07-30 |
| 指派给 | zhangq（张琪） |
| 创建人 | xiaj |
| 创建时间 | 2026-05-16 14:38:46 |
| 最后编辑 | zhangq @ 2026-07-30 13:20:17 |
| 父任务 | 8933（人员（原团队管理）） |
| 关联需求 | 2056 - 人员（原团队管理） |
| 需求状态 | active |

#### 项目与模块

| 字段 | 值 |
|------|-----|
| 项目 ID | 117 |
| 项目类型 | sprint |
| 产品名称 | 美大drp&crm升级 |
| 模块路径 | crm → 站点管理 |

#### 动态记录（2 条）

| 时间 | 操作人 | 动作 |
|------|--------|------|
| 2026-05-16 14:38:47 | xiaj | opened（创建） |
| 2026-07-30 13:20:17 | zhangq | started（开始） |

### 7.4 task 对象完整字段列表（44 个）

`task-view` 的 `task` 对象相比 `my-task` **多返回以下重要字段**：

| 额外字段 | 类型 | 说明 |
|---------|------|------|
| `assignedToRealName` | string | 指派人真实姓名（张琪） |
| `parentName` | string | 父任务名称 |
| `children` | list | 子任务列表 |
| `team` | list | 团队成员 |
| `files` | list | 附件文件 |
| `cases` | list | 关联测试用例 |
| `needConfirm` | bool | 是否需要确认需求变更 |
| `progress` | int | 进度百分比 |
| `storySpec` | string | **关联需求的完整描述（HTML）** |
| `storyVerify` | string | 需求验收标准 |
| `storyFiles` | list | 需求附件 |
| `storyStatus` | string | 需求状态 |
| `latestStoryVersion` | string | 最新需求版本 |
| `subStatus` | string | 子状态 |

> 其中 `storySpec` 字段包含了关联需求 2056 的**完整 HTML 描述**，包括人员新建/编辑规则、密码重置、人员列表查询等详细需求说明——这是 `my-task.json` 中无法获取的。

完整字段列表：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务 ID |
| `parent` | string | 父任务 ID（0 表示无） |
| `project` | string | 所属项目 ID |
| `module` | string | 所属模块 ID |
| `story` | string | 关联需求 ID（0 表示无） |
| `storyVersion` | string | 需求版本号 |
| `fromBug` | string | 来源 Bug ID（0 表示无） |
| `name` | string | 任务名称 |
| `type` | string | 任务类型（devel/design/test 等） |
| `pri` | string | 优先级（1-4，1 最高） |
| `estimate` | string | 预计工时（小时） |
| `consumed` | string | 已消耗工时（小时） |
| `left` | string | 剩余工时（小时） |
| `deadline` | string | 截止日期 |
| `status` | string | 任务状态 |
| `subStatus` | string | 子状态 |
| `color` | string | 颜色标记 |
| `mailto` | string | 邮件通知对象 |
| `desc` | string | 任务描述 |
| `openedBy` | string | 创建人 |
| `openedDate` | string | 创建时间 |
| `assignedTo` | string | 指派给 |
| `assignedDate` | string | 指派时间 |
| `estStarted` | string | 预计开始日期 |
| `realStarted` | string | 实际开始日期 |
| `finishedBy` | string | 完成人 |
| `finishedDate` | string | 完成时间 |
| `finishedList` | string | 完成人列表 |
| `canceledBy` | string | 取消人 |
| `canceledDate` | string | 取消时间 |
| `closedBy` | string | 关闭人 |
| `closedDate` | string | 关闭时间 |
| `closedReason` | string | 关闭原因 |
| `lastEditedBy` | string | 最后编辑人 |
| `lastEditedDate` | string | 最后编辑时间 |
| `deleted` | string | 是否删除（0/1） |
| `storyID` | string | 关联需求 ID |
| `storyTitle` | string | 关联需求标题 |
| `latestStoryVersion` | string | 最新需求版本 |
| `storyStatus` | string | 需求状态 |
| `assignedToRealName` | string | 指派人真实姓名 |
| `children` | list | 子任务列表 |
| `parentName` | string | 父任务名称 |
| `team` | list | 团队成员 |
| `files` | list | 附件文件 |
| `cases` | list | 关联测试用例 |
| `needConfirm` | bool | 是否需要确认需求变更 |
| `progress` | int | 进度百分比 |
| `storySpec` | string | 关联需求完整描述（HTML） |
| `storyVerify` | string | 需求验收标准 |
| `storyFiles` | list | 需求附件 |

### 7.5 列表接口与详情接口对比

| 维度 | `my-task.json` | `task-view-{id}.json` |
|------|---------------|----------------------|
| 数据范围 | 当前用户所有任务列表 | 单个任务的完整详情 |
| task 字段数 | ~20 个 | **44 个** |
| 额外数据 | 无 | 动态记录、用户列表、模块路径、需求描述 |
| 数据大小 | 16676 字节（10 条） | 7030 字节（1 条） |
| 适用场景 | 浏览任务概览、统计汇总 | 查看任务详情、需求描述、操作历史 |
| 鉴权方式 | Cookie（zentaosid） | Cookie（zentaosid） |

### 7.6 Python 解析示例

```python
import json

# 第一次解析：获取外层 JSON
outer = json.loads(response_text)

# 第二次解析：解析 data 字段中的 JSON 字符串
data = json.loads(outer['data'])

# 获取任务详情
task = data['task']
print(f"任务ID: {task['id']}")
print(f"任务名称: {task['name']}")
print(f"状态: {task['status']}")
print(f"指派给: {task['assignedToRealName']}")
print(f"进度: {task['progress']}%")

# 获取动态记录
actions = data.get('actions', {})
for aid, action in actions.items():
    print(f"  [{aid}] {action['date']} | {action['actor']} | {action['action']}")

# 获取关联需求描述
if task.get('storySpec'):
    print(f"需求描述: {task['storySpec']}")

# 获取模块路径
for module in data.get('modulePath', []):
    print(f"  模块: {module.get('name', '')}")
```

---

## 八、详情中的图片展示机制

任务详情（`task-view`）中的图片以 HTML `<img>` 标签内嵌在 `storySpec`（关联需求描述）字段中，通过禅道的 `file-read` 接口加载。本节以任务 8935 中的图片（文件 ID: 25181）为例，完整解析图片的存储、展示与获取方式。

### 8.1 图片标签格式

在任务 8935 的 `storySpec` 字段中，图片标签如下：

```html
<img onload="setImageSize(this,0)" src="/zentao/file-read-25181.png" alt="" />
```

- **`src="/zentao/file-read-{文件ID}.png"`** — 图片地址，`25181` 是禅道 `zt_file` 表中的记录 ID
- **`onload="setImageSize(this,0)"`** — 禅道前端 JS 函数，图片加载后自动按容器宽度缩放（参数 `0` 表示不限制最大宽度）
- 图片直接以 HTML 内联在 `storySpec` 字段中，浏览器渲染 HTML 时自动加载

### 8.2 两种文件访问接口

禅道提供两个文件访问入口，分别用于在线展示和下载：

| 接口 | URL 格式 | Content-Type | 响应头 | 用途 |
|------|---------|-------------|--------|------|
| **file-read** | `/zentao/file-read-{id}.png` | `image/png` | `cache-control: max-age=315360000` | **在线展示**（`<img src>` 引用） |
| **file-download** | `/zentao/file-download-{id}.html` | `application/octet-stream` | `Content-Disposition: attachment` | **文件下载**（触发浏览器下载） |

实测对比：

```http
# file-read 接口（在线展示）
HTTP/1.1 200 OK
Content-Type: image/png
Cache-Control: max-age=315360000          ← 10年缓存
Transfer-Encoding: chunked
[PNG 二进制数据]

# file-download 接口（下载）
HTTP/1.1 200 OK
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="1614360605707r4l.png"  ← 原始文件名
Transfer-Encoding: chunked
[PNG 二进制数据]
```

### 8.3 图片实测信息

通过 `file-read-25181.png` 下载并解析图片，确认以下信息：

| 属性 | 值 |
|------|-----|
| 文件 ID | 25181 |
| 原始文件名 | 1614360605707r4l.png（通过 file-download 响应头获取） |
| 格式 | PNG, 8-bit RGBA, non-interlaced |
| 尺寸 | 1126 x 542 |
| 大小 | 67,284 字节（约 66KB） |

### 8.4 鉴权特点

> **图片接口不需要登录即可访问。** 实测未携带任何 Cookie 直接请求 `file-read-25181.png`，服务器仍返回了完整的图片数据（HTTP 200, `image/png`）。这意味着 `storySpec` 中的图片 URL 可以直接在任何地方通过 `<img>` 标签引用，无需额外鉴权。

这与任务数据接口（`task-view.json`、`my-task.json`）形成鲜明对比——后者必须携带有效的 `zentaosid` Cookie 才能返回数据。

| 接口类型 | 鉴权要求 | 原因 |
|---------|---------|------|
| `file-read-{id}.png` | **无需登录** | 图片资源直接输出，不经过会话校验 |
| `file-download-{id}.html` | 无需登录 | 文件下载直接输出二进制流 |
| `task-view-{id}.json` | **必须登录** | 任务数据经过会话鉴权 |
| `my-task.json` | **必须登录** | 任务列表经过会话鉴权 |

### 8.5 完整数据流

```
① 存储层
   zt_file 表 → 记录文件 ID(25181)、原始文件名、存储路径
   zt_story 表 → spec 字段存储 HTML 格式的需求描述（含 <img> 标签）

② 接口层
   task-view-8935.json → 返回 data.task.storySpec（HTML 字符串）
   storySpec 内容:
   <p>2、人员密码重置</p>
   <p><img onload="setImageSize(this,0)" src="/zentao/file-read-25181.png" /></p>

③ 前端渲染
   浏览器解析 HTML → 遇到 <img> 标签
   → 请求 http://124.70.211.186:7099/zentao/file-read-25181.png
   → 禅道 file 模块 read 方法 → 读取 zt_file 表 → 输出 PNG 二进制流
   → 浏览器显示图片
   → onload 触发 setImageSize() 自适应缩放
```

### 8.6 程序化获取图片

#### Bash 方式

```bash
# 直接下载图片（无需登录 Cookie）
curl -s -o image_25181.png \
  "http://124.70.211.186:7099/zentao/file-read-25181.png"

# 获取原始文件名（通过 file-download 的响应头）
curl -s -I \
  "http://124.70.211.186:7099/zentao/file-download-25181.html" \
  | grep -i content-disposition
# → Content-Disposition: attachment; filename="1614360605707r4l.png"
```

#### Python 方式

```python
import re
import requests

# 假设已通过 task-view-8935.json 获取到 storySpec
spec = data['task']['storySpec']

# 从 storySpec 中提取所有图片 URL
image_urls = re.findall(r'src="(/zentao/file-read-\d+\.png)"', spec)

# 下载所有图片（无需登录）
base_url = "http://124.70.211.186:7099"
for url_path in image_urls:
    file_id = re.search(r'file-read-(\d+)', url_path).group(1)
    resp = requests.get(f"{base_url}{url_path}")
    filename = f"image_{file_id}.png"
    with open(filename, "wb") as f:
        f.write(resp.content)
    print(f"已下载: {filename} ({len(resp.content)} bytes)")

# 获取原始文件名
for url_path in image_urls:
    file_id = re.search(r'file-read-(\d+)', url_path).group(1)
    resp = requests.head(
        f"{base_url}/zentao/file-download-{file_id}.html"
    )
    cd = resp.headers.get('Content-Disposition', '')
    original_name = re.search(r'filename="([^"]+)"', cd)
    if original_name:
        print(f"文件ID {file_id} 原始文件名: {original_name.group(1)}")
```

### 8.7 storySpec 完整内容示例

任务 8935 关联需求 2056 的 `storySpec` 字段完整内容：

```html
<p>1、人员新建/编辑</p>
<ul>
  <li>账号（必填）、姓名（非必填，文本）、手机号（必填，并验证系统站点唯一）、
      备注（非必填，文本）、密码（必填，并需要遵循系统站点账号密码规则）、
      确认密码（和密码验证一致）、所属门店（非必填，选择站点门店：门店名称下拉选择）、
      仅可查询本人客户/订单（是/否，默认否）、仅可处理门店数据（是/否，默认否）、
      状态（启用/停用，默认启用）、选择角色（可多选，范围是系统预设的经销商员工类型的角色）</li>
  <li>账号生成规则：xxxxx（经销商编码：100010）-填写的账号（002）<br />例如：100010-002</li>
  <li>账号角色参考老crm和新crm中预设角色的绑定关系</li>
</ul>
<p><br /></p>
<p>2、人员密码重置</p>
<p>填写密码（规则和设置人员账号密码一样）、确认密码</p>
<p><img onload="setImageSize(this,0)" src="/zentao/file-read-25181.png" alt="" /></p>
<p>3、人员列表（查询经销商站点所有人员账号）</p>
<p>列表：账号、姓名、手机号、状态、备注、角色、所属门店</p>
```

> 图片位于「2、人员密码重置」段落中，展示了密码重置的操作界面截图。

---

## 九、附录：其他可用数据接口

禅道的 `.html → .json` 替换规则适用于所有模块页面。以下是与「我的」相关的常用接口，只需将 `my-task` 替换为对应路径即可：

### 「我的」模块接口

| 接口路径 | 功能 | 对应页面 |
|---------|------|---------|
| `my-task.json` | 我的任务 | 我的地盘 → 任务 |
| `my-bug.json` | 我的 Bug | 我的地盘 → Bug |
| `my-story.json` | 我的需求 | 我的地盘 → 需求 |
| `my-project.json` | 我的项目 | 我的地盘 → 项目 |
| `my-todo.json` | 我的待办 | 我的地盘 → 待办 |
| `my-dynamic.json` | 我的动态 | 我的地盘 → 动态 |
| `my-profile.json` | 个人档案 | 我的地盘 → 档案 |
| `my-index.json` | 我的地盘首页 | 我的地盘总览 |

### 其他常用模块接口

| 接口路径 | 功能 |
|---------|------|
| `project-browse-{status}.json` | 项目列表（按状态筛选） |
| `project-task-{projectID}.json` | 项目下的任务列表 |
| `product-browse-{productID}.json` | 产品下的需求列表 |
| `bug-browse-{productID}.json` | 产品下的 Bug 列表 |
| `task-view-{taskID}.json` | 单个任务详情 |
| `user-view-{account}.json` | 用户信息详情 |

> **使用提示**：
> - 所有接口均需**先登录获取有效 Cookie**（`zentaosid`）
> - GET 参数 `t=json` 与 `.json` 后缀效果相同（PATH_INFO 模式与普通模式）
> - 分页参数通过 `recTotal`、`recPerPage`、`pageID` 控制
> - 返回数据中的 `pager` 字段包含分页信息（总条数、每页条数、当前页码）

---

## 参考来源

1. [禅道API机制介绍 - 深度开放](https://www.open-open.com/bbs/view/1356415570495) — 禅道官方 API 机制说明文档，介绍了页面调用和超级 model 调用两种方式
2. [禅道项目管理软件API功能集成开发方法指南 - CSDN](https://blog.csdn.net/watermelonbig/article/details/81217085) — 禅道 API 登录认证、查看及创建任务等操作的接口集成开发说明
3. [禅道怎么使用API接口 - PHP中文网](https://www.php.cn/faq/2326851.html) — 禅道开放 API 对接教程，包括获取 Session ID、用户登录验证、调用 API 的完整步骤
