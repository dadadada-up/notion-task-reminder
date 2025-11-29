# 🚀 新功能部署指南

## ✅ 已完成的功能

### 1. 后端新增功能

#### 1.1 GitHubService - 动态更新 GitHub Actions
- **文件**: `backend/services/github_service.py`
- **功能**: 
  - 自动生成 GitHub Actions workflow YAML
  - 根据前端配置动态更新 cron 表达式
  - 支持多个定时任务配置
  
#### 1.2 ConfigService - 配置管理
- **文件**: `backend/services/config_service.py`
- **功能**:
  - 读取和更新 `.env` 文件
  - 敏感信息脱敏显示
  - 支持动态重载环境变量

#### 1.3 增强的 API 接口

**新增接口**:
- `GET /api/config` - 获取系统配置（脱敏）
- `PUT /api/config` - 更新系统配置

**增强接口**:
- `POST /api/notify` - 支持自定义标题、消息、多种类型
- `POST /api/schedule` - 保存后自动更新 GitHub Actions workflow

### 2. 前端新增功能

#### 2.1 NotificationModal - 发送提醒弹窗
- **文件**: `frontend/src/components/NotificationModal.tsx`
- **功能**:
  - 选择消息类型（今日待办/今日完成/全部）
  - 选择推送渠道（PushPlus/邮箱）
  - 自定义标题和消息（支持 HTML）

#### 2.2 ConfigSettings - 系统配置管理
- **文件**: `frontend/src/components/ConfigSettings.tsx`
- **功能**:
  - Notion 配置管理
  - 推送配置管理
  - 邮箱配置管理
  - GitHub 配置管理
  - 敏感信息脱敏显示

#### 2.3 增强的 ScheduleSettings
- **文件**: `frontend/src/components/ScheduleSettings.tsx`
- **新增字段**:
  - `title` - 消息标题
  - `message` - 消息内容（HTML）
  - `channels` - 推送渠道数组

### 3. GitHub Actions 优化

#### 3.1 动态时间配置
- **文件**: `src/main.py`
- **功能**:
  - 读取 `data/schedules.json` 配置
  - 根据当前时间匹配定时任务
  - 支持手动触发和自动触发

---

## 📋 配置步骤

### Step 1: 更新 .env 文件

在 `.env` 文件中添加 GitHub 配置：

```bash
# GitHub 配置（用于自动更新 workflow）
GITHUB_TOKEN="ghp_your_github_personal_access_token"
GITHUB_REPOSITORY="username/notion-task-reminder"
```

**获取 GitHub Token**:
1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token" -> "Generate new token (classic)"
3. 设置权限：
   - ✅ `repo` - 完整的仓库访问权限
   - ✅ `workflow` - 更新 workflow 文件
4. 生成并复制 token

### Step 2: 重启服务器

```bash
# 停止当前服务器
lsof -ti:5000 | xargs kill -9

# 重启服务器
./start.sh
```

### Step 3: 配置定时任务

1. 访问 http://localhost:5000
2. 点击左侧「定时设置」按钮
3. 配置定时任务：
   - 消息类型：daily_todo / daily_done
   - 推送时间：例如 09:00, 21:00
   - 消息标题：自定义标题
   - 消息内容：支持 HTML 格式
   - 推送渠道：选择 PushPlus 和/或邮箱
4. 点击「保存」

**重要**: 保存后会自动更新 GitHub Actions workflow 文件！

---

## 🧪 测试步骤

### 测试 1: 系统配置管理

1. 点击「系统配置」按钮
2. 查看当前配置（敏感信息已脱敏）
3. 修改配置（例如邮箱地址）
4. 点击「保存配置」
5. 验证配置已更新

### 测试 2: 发送提醒

1. 点击「发送提醒」按钮
2. 选择消息类型（例如：今日待办）
3. 选择推送渠道（PushPlus 和/或邮箱）
4. 输入自定义标题和消息（可选）
5. 点击「发送」
6. 检查手机/邮箱是否收到通知

### 测试 3: 定时任务配置

1. 点击「定时设置」按钮
2. 添加新的定时任务
3. 配置时间、类型、消息
4. 保存配置
5. 检查 GitHub 仓库的 `.github/workflows/daily_reminder.yml` 文件
6. 验证 cron 表达式已更新

### 测试 4: GitHub Actions 自动执行

1. 等待配置的时间点
2. 查看 GitHub Actions 运行记录
3. 验证任务是否按时执行
4. 检查是否收到通知

---

## 🔍 API 测试

使用提供的测试脚本：

```bash
./test_new_features.sh
```

或手动测试：

```bash
# 1. 获取系统配置
curl http://localhost:5000/api/config

# 2. 获取定时任务配置
curl http://localhost:5000/api/schedule

# 3. 发送通知（测试）
curl -X POST http://localhost:5000/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily_todo",
    "channels": ["pushplus"],
    "customTitle": "测试通知",
    "customMessage": "<p>这是一条测试消息</p>"
  }'
```

---

## 📊 数据流程图

```
用户操作 (前端)
    ↓
保存定时配置
    ↓
POST /api/schedule
    ↓
ScheduleService.save_schedules()
    ↓
保存到 data/schedules.json
    ↓
GitHubService.update_workflow()
    ↓
生成新的 workflow YAML
    ↓
调用 GitHub API 更新文件
    ↓
GitHub Actions 按新 cron 运行
    ↓
src/main.py 读取 schedules.json
    ↓
匹配当前时间
    ↓
发送通知
```

---

## ⚠️ 注意事项

### 1. GitHub Token 安全
- ✅ Token 已添加到 `.gitignore`
- ✅ 不要将 Token 提交到代码仓库
- ✅ 定期更换 Token

### 2. 时区问题
- GitHub Actions 使用 UTC 时间
- 前端配置使用北京时间（UTC+8）
- 系统会自动转换时区

### 3. Workflow 更新
- 每次保存定时配置都会更新 workflow
- 更新后立即生效
- 可以在 GitHub 仓库查看更新记录

### 4. 配置文件位置
- 定时配置: `data/schedules.json`
- 系统配置: `.env`
- Workflow: `.github/workflows/daily_reminder.yml`

---

## 🐛 故障排查

### 问题 1: GitHub Actions 未更新

**可能原因**:
- GitHub Token 未配置或无效
- Repository 名称错误
- Token 权限不足

**解决方法**:
1. 检查 `.env` 文件中的 `GITHUB_TOKEN` 和 `GITHUB_REPOSITORY`
2. 验证 Token 权限包含 `repo` 和 `workflow`
3. 查看后端日志确认错误信息

### 问题 2: 定时任务未执行

**可能原因**:
- 时间配置错误
- 任务未启用
- schedules.json 文件不存在

**解决方法**:
1. 检查 `data/schedules.json` 文件是否存在
2. 验证 `enabled` 字段为 `true`
3. 确认时间格式为 "HH:MM"（例如 "09:00"）

### 问题 3: 通知发送失败

**可能原因**:
- PushPlus Token 无效
- 邮箱配置错误
- 网络问题

**解决方法**:
1. 在「系统配置」中验证 Token 和邮箱配置
2. 使用「发送提醒」功能手动测试
3. 查看后端日志确认错误信息

---

## 📝 更新日志

### v2.0.0 (2025-11-29)

**新增功能**:
- ✅ 动态配置 GitHub Actions workflow
- ✅ 前端配置管理界面
- ✅ 增强的通知发送功能
- ✅ 自定义消息标题和内容
- ✅ 多渠道推送选择

**优化**:
- ✅ 简化 src/main.py 逻辑
- ✅ 统一消息格式化
- ✅ 改进错误处理

**修复**:
- ✅ 修复 daily_done 时间不匹配问题
- ✅ 修复任务关联逻辑
- ✅ 修复邮箱属性名称错误

---

## 🎉 完成！

所有新功能已部署完成，请按照上述步骤进行测试和配置。

如有问题，请查看：
- 后端日志
- GitHub Actions 运行记录
- 浏览器控制台

祝使用愉快！ 🚀
