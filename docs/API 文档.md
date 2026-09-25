# API 文档

**基础 URL**: `https://workbench-22i.pages.dev/api`  
**认证方式**: JWT Bearer Token  
**响应格式**: `{ "success": boolean, "data": ..., "count"?: number }`

---

## 目录

- [认证](#认证)
- [任务管理](#任务管理)
- [习惯打卡](#习惯打卡)
- [打卡记录](#打卡记录)
- [数据总览](#数据总览)
- [统计](#统计)
- [周总结](#周总结)
- [推送通知](#推送通知)
- [系统配置](#系统配置)
- [图片上传](#图片上传)
- [分享](#分享)
- [健康检查](#健康检查)

---

## 认证

所有 API（除健康检查外）均需要 JWT 认证。

### POST /api/auth/register

注册新用户。

```bash
curl -X POST https://workbench-22i.pages.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"dada","password":"your_password","display_name":"大达"}'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "username": "dada", "display_name": "大达" },
    "token": "eyJhbGciOi..."
  }
}
```

### POST /api/auth/login

登录。

```bash
curl -X POST https://workbench-22i.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dada","password":"your_password"}'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "username": "dada" },
    "token": "eyJhbGciOi..."
  }
}
```

### GET /api/auth/me

获取当前用户信息。

```bash
curl https://workbench-22i.pages.dev/api/auth/me \
  -H "Authorization: Bearer <token>"
```

---

## 任务管理

### GET /api/tasks

获取任务列表，支持筛选。

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 状态筛选：收集箱/进行中/暂停/已完成/已放弃 |
| assignee | string | 负责人筛选 |
| priority | string | 优先级筛选：P0 重要紧急/P1 重要不紧急/P2 紧急不重要/P3 不重要不紧急 |
| type | string | 任务类型筛选 |

```bash
curl "https://workbench-22i.pages.dev/api/tasks?status=进行中&assignee=dada" \
  -H "Authorization: Bearer <token>"
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "完成项目方案",
      "status": "进行中",
      "priority": "P1 重要不紧急",
      "task_type": "工作",
      "assignee": "dada",
      "parent_ids": [],
      "child_ids": ["child-uuid-1"],
      "blocked_by_ids": [],
      "start_date": "2026-09-01",
      "deadline": "2026-09-30",
      "completed_time": null,
      "email": "dadadada_up@163.com",
      "notes": "备注内容",
      "created_time": "2026-09-01 10:00:00",
      "last_edited_time": "2026-09-15 08:30:00",
      "images": []
    }
  ],
  "count": 1
}
```

### POST /api/tasks

创建任务。

```bash
curl -X POST https://workbench-22i.pages.dev/api/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新任务",
    "status": "收集箱",
    "priority": "P2 紧急不重要",
    "task_type": "个人成长",
    "assignee": "dada",
    "email": "dadadada_up@163.com",
    "start_date": "2026-09-15",
    "deadline": "2026-10-15",
    "notes": "",
    "parent_ids": [],
    "images": []
  }'
```

**创建子任务**: 在 `parent_ids` 中指定父任务 ID。

```bash
-d '{ "name": "子任务", "parent_ids": ["parent-task-uuid"], ... }'
```

### GET /api/tasks/:id

获取单个任务详情。

### PUT /api/tasks/:id

更新任务。

```bash
curl -X PUT https://workbench-22i.pages.dev/api/tasks/<task_id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "已完成", "completed_time": "2026-09-15T10:00:00.000Z" }'
```

### POST /api/tasks/auto-transition

自动流转：将收集箱中已到开始时间的任务转为进行中。

```bash
curl -X POST https://workbench-22i.pages.dev/api/tasks/auto-transition \
  -H "Authorization: Bearer <token>"
```

**响应**:
```json
{
  "success": true,
  "data": { "transitioned": 2, "total_checked": 5 }
}
```

---

## 习惯打卡

### GET /api/habits

获取习惯列表。

### POST /api/habits

创建习惯。

```bash
curl -X POST https://workbench-22i.pages.dev/api/habits \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "每日阅读",
    "frequency": "daily",
    "status": "active",
    "weekly_target": 7,
    "monthly_target": 30
  }'
```

### PUT /api/habits/:id

更新习惯。

### GET /api/habits/:id/stats

获取习惯统计数据。

---

## 打卡记录

### GET /api/daily-logs

获取打卡记录。支持查询参数：`?habit_id=xxx&start_date=2026-09-01&end_date=2026-09-30`

### POST /api/daily-logs

创建打卡记录。

```bash
curl -X POST https://workbench-22i.pages.dev/api/daily-logs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "habit_id": "habit-uuid",
    "log_date": "2026-09-15",
    "completed": true,
    "notes": "今天读了30页"
  }'
```

### PUT /api/daily-logs/:id

更新打卡记录。

### GET /api/daily-logs/calendar

获取日历视图数据。

---

## 数据总览

### GET /api/data

前端主入口，返回任务列表 + 统计数据。

```bash
curl https://workbench-22i.pages.dev/api/data \
  -H "Authorization: Bearer <token>"
```

**响应**:
```json
{
  "success": true,
  "data": {
    "tasks": [ ... ],
    "stats": {
      "distribution": {
        "total": 165,
        "by_status": { "已完成": 80, "进行中": 45, "收集箱": 20 },
        "by_priority": {},
        "by_type": {},
        "by_assignee": {}
      }
    }
  }
}
```

---

## 统计

### GET /api/stats

获取任务统计。

---

## 周总结

### GET /api/weekly-summary/current

获取当前周的周总结。

### POST /api/weekly-summary/save

保存周总结。

### POST /api/weekly-summary/ai-optimize

AI 优化周总结内容（需要配置 DEEPSEEK_API_KEY）。

---

## 推送通知

### POST /api/notify

手动触发推送通知。

```bash
curl -X POST https://workbench-22i.pages.dev/api/notify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily_todo",
    "channels": ["pushplus"]
  }'
```

**参数**:
- `type`: `daily_todo`（今日待办）/ `daily_done`（今日完成）/ `both`
- `channels`: `["pushplus"]` / `["email"]` / `["pushplus", "email"]`

---

## 系统配置

### GET /api/config

获取系统配置（已脱敏）。

### PUT /api/config

更新系统配置。

### GET /api/schedule

获取定时任务配置。

### POST /api/schedule

保存定时任务配置。

---

## 图片上传

### POST /api/upload-image

上传图片到 R2 存储。

```bash
curl -X POST https://workbench-22i.pages.dev/api/upload-image \
  -H "Authorization: Bearer <token>" \
  -F "image=@photo.jpg"
```

**响应**:
```json
{
  "success": true,
  "data": {
    "file_upload_id": "uuid",
    "filename": "photo.jpg",
    "url": "https://..."
  }
}
```

---

## 分享

### POST /api/share/create

创建分享链接。

```bash
curl -X POST https://workbench-22i.pages.dev/api/share/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "resource_type": "weekly_summary",
    "resource_id": "summary-uuid",
    "password": "optional_password",
    "expires_in_days": 7
  }'
```

### GET /share/:token

访问分享页面（无需认证）。

---

## 健康检查

### GET /api/health

无需认证。

```bash
curl https://workbench-22i.pages.dev/api/health
```

**响应**:
```json
{
  "success": true,
  "data": { "status": "ok", "timestamp": "2026-09-15T10:00:00.000Z" }
}
```

---

## 错误处理

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证（token 缺失/无效/过期） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

---

## 相关文档

- [架构文档](./架构文档.md)
- [快速开始](./快速开始.md)
- [项目主页](../README.md)
