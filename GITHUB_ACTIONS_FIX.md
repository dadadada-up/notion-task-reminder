# 🔧 GitHub Actions 定时任务修复

## 问题描述

GitHub Actions 定时任务无法发送消息，依赖安装成功但没有后续执行日志。

## 根本原因

`src/main.py` 的新逻辑会优先读取 `schedules.json` 文件，但在 GitHub Actions 环境中：
1. 没有 `schedules.json` 文件
2. 代码会尝试读取不存在的文件
3. 虽然会回退到使用环境变量，但逻辑不够清晰

## 修复方案

修改 `src/main.py` 的执行逻辑优先级：

1. **优先检查 `REMINDER_TYPE` 环境变量**（GitHub Actions 场景）
2. 如果未设置，检查 `MANUAL_TASK_TYPE`（手动触发）
3. 最后才读取 `schedules.json`（本地定时任务）

### 修改代码

```python
# 优先检查是否已经设置了 REMINDER_TYPE 环境变量（GitHub Actions 场景）
reminder_type_env = os.environ.get('REMINDER_TYPE', '')
manual_task_type = os.environ.get('MANUAL_TASK_TYPE', '')

if reminder_type_env and reminder_type_env != 'unknown':
    # GitHub Actions 或其他已设置环境变量的场景
    print(f"✅ 使用环境变量配置: REMINDER_TYPE={reminder_type_env}")
    # 环境变量已设置，直接使用
elif manual_task_type:
    # 手动触发模式
    ...
else:
    # 读取 schedules.json
    ...
```

## 测试步骤

### 1. 手动触发 GitHub Actions

访问 GitHub 仓库：
```
https://github.com/YOUR_USERNAME/notion-task-reminder/actions
```

点击 "Daily Task Reminder" workflow，然后点击 "Run workflow"：
- 任务类型：选择 `daily_todo` 或 `daily_done`
- 操作类型：选择 `combined`
- 强制发送：选择 `true`
- 点击 "Run workflow"

### 2. 查看执行日志

在 Actions 页面查看运行日志，应该看到：

```
✅ 使用环境变量配置: REMINDER_TYPE=daily_todo

=== 时间信息 ===
UTC 时间: ...
北京时间: ...
目标发送时间: 08:00
执行类型: daily_todo
操作类型: combined
=== 时间信息结束 ===

检查环境变量...
PUSHPLUS_TOKEN: 3cf******** (长度: 32)
...
```

### 3. 验证消息发送

- 检查 PushPlus 微信公众号
- 检查邮箱
- 确认收到通知

## 环境变量说明

### GitHub Actions 需要的 Secrets

在 GitHub 仓库设置中配置以下 Secrets：

1. **Notion 配置**
   - `NOTION_TOKEN` - Notion API Token
   - `DATABASE_ID` - Notion 数据库 ID

2. **推送配置**
   - `PUSHPLUS_TOKEN` - PushPlus Token
   - `WXPUSHER_TOKEN` - WxPusher Token（可选）
   - `WXPUSHER_UID` - WxPusher UID（可选）

3. **邮箱配置**（可选）
   - `EMAIL_ENABLED` - 是否启用邮箱（true/false）
   - `EMAIL_SMTP_SERVER` - SMTP 服务器
   - `EMAIL_SMTP_PORT` - SMTP 端口
   - `EMAIL_SENDER` - 发件人邮箱
   - `EMAIL_PASSWORD` - 邮箱授权码
   - `EMAIL_RECEIVER` - 收件人邮箱

### 配置方法

1. 访问 GitHub 仓库
2. 点击 Settings -> Secrets and variables -> Actions
3. 点击 "New repository secret"
4. 输入名称和值
5. 点击 "Add secret"

## 定时任务说明

### 当前定时配置

在 `.github/workflows/daily_reminder.yml` 中：

```yaml
schedule:
  - cron: "0 0 * * *"   # UTC 00:00 = 北京时间 08:00 (daily_todo)
  - cron: "0 13 * * *"  # UTC 13:00 = 北京时间 21:00 (daily_done)
```

### 修改定时时间

如果需要修改定时时间，有两种方式：

#### 方式 1: 通过前端配置（推荐）

1. 访问 http://localhost:5000
2. 点击「定时设置」
3. 修改时间
4. 保存（会自动更新 GitHub Actions workflow）

**注意**: 需要配置 `GITHUB_TOKEN` 和 `GITHUB_REPOSITORY` 环境变量

#### 方式 2: 手动修改 workflow 文件

1. 编辑 `.github/workflows/daily_reminder.yml`
2. 修改 `cron` 表达式
3. 提交并推送到 GitHub

**Cron 表达式格式**:
```
分 时 日 月 周
* * * * *
```

**时区转换**:
- 北京时间 = UTC + 8
- 例如：北京时间 09:00 = UTC 01:00
- Cron: `0 1 * * *`

## 故障排查

### 问题 1: Actions 运行但没有输出

**检查**:
1. 查看 Actions 日志的 "Run reminder script" 步骤
2. 确认是否有 Python 错误
3. 检查环境变量是否正确设置

**解决**:
- 确保所有必需的 Secrets 都已配置
- 检查 `REMINDER_TYPE` 是否为 `unknown`

### 问题 2: 消息未发送

**检查**:
1. 日志中是否显示 "发送成功"
2. PushPlus Token 是否有效
3. 是否有任务数据

**解决**:
- 验证 PushPlus Token
- 确认 Notion 数据库中有符合条件的任务
- 检查任务筛选条件（今日完成的任务）

### 问题 3: 定时任务不执行

**检查**:
1. Cron 表达式是否正确
2. 时区转换是否正确
3. GitHub Actions 是否启用

**解决**:
- 使用 [Crontab Guru](https://crontab.guru/) 验证 cron 表达式
- 确认时区转换（UTC vs 北京时间）
- 检查仓库的 Actions 权限设置

## 验证清单

- [ ] 修改 `src/main.py` 完成
- [ ] 提交并推送到 GitHub
- [ ] 配置所有必需的 Secrets
- [ ] 手动触发 GitHub Actions 测试
- [ ] 查看执行日志确认无错误
- [ ] 验证收到通知消息
- [ ] 等待定时任务自动执行
- [ ] 确认定时任务正常工作

## 后续优化

1. **添加健康检查**
   - 定期检查 GitHub Actions 是否正常运行
   - 发送执行报告

2. **错误通知**
   - 如果执行失败，通过其他渠道通知
   - 记录失败原因

3. **执行历史**
   - 保存执行记录
   - 统计成功率

## 相关文档

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Cron 表达式说明](https://crontab.guru/)
- [PushPlus 文档](http://www.pushplus.plus/)

---

**修复完成时间**: 2025-11-29 21:55

**修复版本**: v2.0.2

请提交代码到 GitHub 并手动触发 Actions 测试！
