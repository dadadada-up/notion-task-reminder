# 📘 API 参考文档

**版本**: v2.1.0  
**基础 URL**: `http://localhost:5000`

---

## 目录

- [健康检查](#健康检查)
- [任务管理](#任务管理)
- [通知管理](#通知管理)
- [定时任务](#定时任务)
- [配置管理](#配置管理)
- [错误代码](#错误代码)

---

## 健康检查

### GET /health

检查服务器健康状态

**请求示例**:
```bash
curl http://localhost:5000/health
```

**响应示例**:
```json
{
  "status": "healthy",
  "timestamp": "2024-11-29T22:30:00Z"
}
```

---

## 任务管理

### GET /api/tasks

获取任务列表

**查询参数**:
- `is_done` (boolean, 可选): 是否获取已完成任务，默认 `false`

**请求示例**:
```bash
# 获取待办任务
curl http://localhost:5000/api/tasks

# 获取已完成任务
curl http://localhost:5000/api/tasks?is_done=true
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "task_123",
      "name": "完成项目文档",
      "status": "进行中",
      "priority": "P1 重要不紧急",
      "assignee": "张三",
      "deadline": "2024-11-30"
    }
  ],
  "count": 1
}
```

### GET /api/tasks/stats

获取任务统计信息

**请求示例**:
```bash
curl http://localhost:5000/api/tasks/stats
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total": 10,
    "pending": 6,
    "in_progress": 2,
    "completed": 2,
    "by_priority": {
      "P0": 1,
      "P1": 3,
      "P2": 4,
      "P3": 2
    }
  }
}
```

---

## 通知管理

### POST /api/notify

发送通知

**请求体**:
```json
{
  "type": "daily_todo",
  "channels": ["pushplus", "email"],
  "customTitle": "今日任务提醒",
  "customMessage": "早上好！"
}
```

**参数说明**:
- `type` (string, 必需): 通知类型
  - `daily_todo`: 待办任务
  - `daily_done`: 已完成任务
  - `both`: 两者都发送
- `channels` (array, 必需): 通知渠道
  - `pushplus`: PushPlus 推送
  - `wxpusher`: WxPusher 推送
  - `email`: 邮件
- `customTitle` (string, 可选): 自定义标题
- `customMessage` (string, 可选): 自定义消息

**请求示例**:
```bash
curl -X POST http://localhost:5000/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily_todo",
    "channels": ["pushplus", "email"]
  }'
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "pushplus": {
      "success": true,
      "message_id": "msg_123"
    },
    "email": {
      "success": true
    }
  }
}
```

---

## 定时任务

### GET /api/schedule

获取定时任务配置

**请求示例**:
```bash
curl http://localhost:5000/api/schedule
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "type": "daily_todo",
      "time": "09:00",
      "enabled": true,
      "customMessage": "早上好！今天的任务已为您准备好 💪"
    },
    {
      "id": "2",
      "type": "daily_done",
      "time": "21:00",
      "enabled": true,
      "customMessage": "晚上好！今天辛苦了 ✨"
    }
  ]
}
```

### POST /api/schedule

保存定时任务配置

**请求体**:
```json
{
  "schedules": [
    {
      "id": "1",
      "type": "daily_todo",
      "time": "09:00",
      "enabled": true,
      "customMessage": "早上好！"
    }
  ]
}
```

**请求示例**:
```bash
curl -X POST http://localhost:5000/api/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "schedules": [
      {
        "id": "1",
        "type": "daily_todo",
        "time": "09:00",
        "enabled": true
      }
    ]
  }'
```

**响应示例**:
```json
{
  "success": true,
  "message": "定时任务配置已保存"
}
```

---

## 配置管理

### GET /api/config

获取系统配置（已脱敏）

**请求示例**:
```bash
curl http://localhost:5000/api/config
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "notion": {
      "token": "ntn***def",
      "databaseId": "db_1234567890"
    },
    "push": {
      "pushplusToken": "3cf***8c8",
      "wxpusherToken": "***",
      "wxpusherUid": "",
      "hasPushplus": true,
      "hasWxpusher": false
    },
    "email": {
      "enabled": true,
      "smtpServer": "smtp.163.com",
      "smtpPort": 465,
      "sender": "test@163.com",
      "password": "***",
      "receiver": "receiver@163.com",
      "isConfigured": true
    },
    "github": {
      "token": "ghp***123",
      "repository": "user/repo",
      "isConfigured": true
    }
  }
}
```

### PUT /api/config

更新系统配置

**请求体**:
```json
{
  "notion": {
    "token": "ntn_new_token",
    "databaseId": "db_new_id"
  },
  "push": {
    "pushplusToken": "new_pushplus_token"
  },
  "email": {
    "enabled": true,
    "smtpServer": "smtp.163.com",
    "smtpPort": 465,
    "sender": "test@163.com",
    "password": "new_password",
    "receiver": "receiver@163.com"
  }
}
```

**请求示例**:
```bash
curl -X PUT http://localhost:5000/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "notion": {
      "token": "ntn_new_token"
    }
  }'
```

**响应示例**:
```json
{
  "success": true,
  "message": "配置已更新"
}
```

**注意事项**:
- 脱敏字段（包含 `***`）不会被更新
- 只更新提供的字段，其他字段保持不变
- 配置更新后建议重启服务

---

## 错误代码

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
| 502 | 服务不可用 |

### 错误响应格式

```json
{
  "success": false,
  "error": "错误描述",
  "details": "详细错误信息（可选）"
}
```

### 常见错误

#### 配置错误
```json
{
  "success": false,
  "error": "Notion token 无效"
}
```

#### 通知发送失败
```json
{
  "success": false,
  "error": "PushPlus token 未配置"
}
```

#### 任务获取失败
```json
{
  "success": false,
  "error": "无法连接到 Notion API",
  "details": "Connection timeout"
}
```

---

## 认证

当前版本不需要认证。如果部署到公网，建议：

1. 使用反向代理（如 Nginx）添加基本认证
2. 配置防火墙规则限制访问
3. 使用 HTTPS 加密传输

---

## 速率限制

- Notion API: 3 requests/second
- PushPlus API: 无官方限制，建议不超过 10 requests/minute
- Email: 建议不超过 5 emails/minute

---

## 示例代码

### Python
```python
import requests

# 获取任务
response = requests.get('http://localhost:5000/api/tasks')
tasks = response.json()

# 发送通知
response = requests.post(
    'http://localhost:5000/api/notify',
    json={
        'type': 'daily_todo',
        'channels': ['pushplus']
    }
)
result = response.json()
```

### JavaScript
```javascript
// 获取任务
fetch('http://localhost:5000/api/tasks')
  .then(res => res.json())
  .then(data => console.log(data));

// 发送通知
fetch('http://localhost:5000/api/notify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'daily_todo',
    channels: ['pushplus']
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### cURL
```bash
# 获取任务统计
curl http://localhost:5000/api/tasks/stats

# 发送通知
curl -X POST http://localhost:5000/api/notify \
  -H "Content-Type: application/json" \
  -d '{"type":"daily_todo","channels":["pushplus"]}'

# 更新配置
curl -X PUT http://localhost:5000/api/config \
  -H "Content-Type: application/json" \
  -d '{"push":{"pushplusToken":"new_token"}}'
```

---

## 更新日志

### v2.1.0 (2024-11-29)
- ✅ 添加配置管理 API
- ✅ 支持 WxPusher 推送
- ✅ 优化错误处理
- ✅ 添加配置状态检查

### v2.0.0 (2024-11-28)
- ✅ 重构为 RESTful API
- ✅ 添加 Web 界面
- ✅ 支持多通道通知

---

## 相关文档

- [项目文档](./README.md)
- [架构文档](./ARCHITECTURE.md)
- [优化总结](./OPTIMIZATION_SUMMARY.md)
- [当前状态](./CURRENT_STATUS.md)

---

**最后更新**: 2024-11-29  
**维护者**: Cascade AI
