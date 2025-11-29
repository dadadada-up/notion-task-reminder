# 定时任务配置与 GitHub Actions 集成说明

## 概述

本项目已实现前端定时任务配置与 GitHub Actions 工作流的完整集成。通过前端界面配置定时任务后，系统会自动更新 GitHub Actions workflow 文件，实现配置的统一管理。

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     前端配置界面                              │
│              (ScheduleSettings.tsx)                         │
│                                                             │
│  • 配置定时任务类型（待办/完成）                              │
│  • 设置推送时间                                              │
│  • 自定义消息内容                                            │
│  • 启用/禁用定时任务                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    POST /api/schedule
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   后端 API 服务                              │
│                  (backend/app.py)                           │
│                                                             │
│  • 接收前端配置请求                                          │
│  • 调用 ScheduleService                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  ScheduleService                            │
│         (backend/services/schedule_service.py)              │
│                                                             │
│  1. 保存配置到 config/schedule.json                          │
│  2. 生成完善的 GitHub Actions workflow                       │
│  3. 更新 .github/workflows/daily_reminder.yml                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              GitHub Actions Workflow                        │
│        (.github/workflows/daily_reminder.yml)               │
│                                                             │
│  • 定时触发（根据配置的时间）                                 │
│  • 手动触发（支持多种参数）                                   │
│  • 完整的环境变量设置                                         │
│  • 时间判断逻辑                                              │
│  • 错误处理和日志记录                                         │
└─────────────────────────────────────────────────────────────┘
```

## 功能特性

### 1. 前端配置界面

- ✅ 可视化配置定时任务
- ✅ 支持多个定时任务
- ✅ 实时预览配置效果
- ✅ 启用/禁用开关
- ✅ 自定义消息内容

### 2. 自动生成 Workflow

生成的 `daily_reminder.yml` 包含：

- **定时触发器**：根据配置的时间自动转换为 UTC cron 表达式
- **手动触发器**：支持以下参数
  - `task_type`: 任务类型（daily_todo/daily_done）
  - `action_type`: 操作类型（send/combined）
  - `force_send`: 强制发送（忽略时间检查）
  - `custom_send_time`: 自定义发送时间
  - `debug_mode`: 调试模式

- **完整的环境变量**：
  - Notion API 配置
  - 推送服务配置（PushPlus、WxPusher）
  - 邮件服务配置
  - 任务类型和时间配置

- **智能时间判断**：
  - 自动识别当前时间对应的任务类型
  - 支持时间窗口匹配（±10分钟）
  - 手动触发时使用用户指定的参数

### 3. 配置存储

配置保存在 `config/schedule.json`，格式如下：

```json
[
  {
    "id": "1",
    "type": "daily_todo",
    "time": "08:00",
    "enabled": true,
    "customMessage": "早上好！今天的任务已为您准备好 💪"
  },
  {
    "id": "2",
    "type": "daily_done",
    "time": "21:00",
    "enabled": true,
    "customMessage": "晚上好！今天辛苦了，看看完成了多少任务 ✨"
  }
]
```

## 使用方法

### 1. 通过前端界面配置

1. 启动前端应用
2. 点击"定时消息设置"按钮
3. 添加或修改定时任务：
   - 选择消息类型（今日待办/今日完成）
   - 设置推送时间（北京时间）
   - 可选：添加自定义消息
   - 启用/禁用该任务
4. 点击"保存设置"
5. 系统会自动更新 GitHub Actions workflow

### 2. 手动修改配置文件

也可以直接编辑 `config/schedule.json`，然后调用 API：

```bash
curl -X POST http://localhost:5000/api/schedule \
  -H "Content-Type: application/json" \
  -d @config/schedule.json
```

### 3. 验证配置

运行测试脚本验证配置是否正确：

```bash
source venv/bin/activate
python test_schedule_integration.py
```

## 时间转换说明

系统会自动将北京时间（UTC+8）转换为 UTC 时间用于 GitHub Actions：

| 北京时间 | UTC 时间 | Cron 表达式 |
|---------|---------|------------|
| 08:00   | 00:00   | 0 0 * * *  |
| 21:00   | 13:00   | 0 13 * * * |
| 22:00   | 14:00   | 0 14 * * * |

## 工作流整合

### 整合前

- ❌ 两个独立的 workflow 文件（`daily_reminder.yml` 和 `schedule.yml`）
- ❌ 配置分散，难以维护
- ❌ 功能重复，可能冲突
- ❌ 前端配置无法影响 GitHub Actions

### 整合后

- ✅ 单一的 `daily_reminder.yml` 文件
- ✅ 前端配置自动同步到 GitHub Actions
- ✅ 完善的环境变量和错误处理
- ✅ 支持手动触发和调试模式
- ✅ 统一的配置管理

## 注意事项

### 1. GitHub Secrets 配置

确保在 GitHub 仓库中配置以下 Secrets：

**必需的 Secrets：**
- `NOTION_TOKEN`: Notion API Token
- `DATABASE_ID`: Notion 数据库 ID
- `PUSHPLUS_TOKEN`: PushPlus Token

**可选的 Secrets：**
- `WXPUSHER_TOKEN`: WxPusher Token
- `WXPUSHER_UID`: WxPusher UID
- `EMAIL_ENABLED`: 是否启用邮件
- `EMAIL_SMTP_SERVER`: SMTP 服务器
- `EMAIL_SMTP_PORT`: SMTP 端口
- `EMAIL_SENDER`: 发件人邮箱
- `EMAIL_PASSWORD`: 邮箱密码
- `EMAIL_RECEIVER`: 收件人邮箱

### 2. 提交更改

修改配置后需要提交到 GitHub：

```bash
git add .github/workflows/daily_reminder.yml
git add config/schedule.json
git commit -m "Update schedule configuration"
git push
```

### 3. 验证执行

可以在 GitHub Actions 页面：
1. 查看定时任务的执行历史
2. 手动触发工作流进行测试
3. 查看执行日志排查问题

## 故障排查

### 问题：前端保存配置后 workflow 没有更新

**解决方法：**
1. 检查后端服务是否正常运行
2. 查看后端日志是否有错误信息
3. 确认 `.github/workflows/` 目录有写入权限

### 问题：GitHub Actions 没有按时执行

**解决方法：**
1. 检查 cron 表达式是否正确
2. 确认 GitHub Secrets 已正确配置
3. 查看 Actions 执行日志
4. 注意 GitHub Actions 可能有 5-10 分钟的延迟

### 问题：收不到推送消息

**解决方法：**
1. 检查 `NOTION_TOKEN` 是否有效（401 错误）
2. 确认 PushPlus Token 已绑定微信
3. 查看执行日志中的错误信息
4. 尝试手动触发工作流进行测试

## 开发者指南

### 修改 Workflow 生成逻辑

编辑 `backend/services/schedule_service.py` 中的以下方法：

- `_generate_workflow()`: 生成 workflow 结构
- `_generate_time_determination_script()`: 生成时间判断脚本
- `_generate_execution_script()`: 生成执行脚本
- `_time_to_cron()`: 时间转换为 cron 表达式

### 添加新的配置选项

1. 在 `frontend/src/components/ScheduleSettings.tsx` 中添加 UI
2. 在 `backend/services/schedule_service.py` 中处理新配置
3. 更新 workflow 生成逻辑以使用新配置

## 相关文件

- `frontend/src/components/ScheduleSettings.tsx`: 前端配置界面
- `frontend/src/api.ts`: API 调用
- `backend/app.py`: API 路由
- `backend/services/schedule_service.py`: 核心服务
- `config/schedule.json`: 配置文件
- `.github/workflows/daily_reminder.yml`: GitHub Actions workflow
- `test_schedule_integration.py`: 集成测试脚本

## 更新日志

### 2025-11-29

- ✅ 实现前端配置与 GitHub Actions 的完整集成
- ✅ 重构 `schedule_service.py` 生成完善的 workflow
- ✅ 删除冗余的 `schedule.yml` 文件
- ✅ 添加集成测试脚本
- ✅ 完善文档说明
