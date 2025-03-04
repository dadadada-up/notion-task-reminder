# Notion 任务提醒助手

基于 Notion API 的任务提醒工具，支持多渠道消息推送（微信、WxPusher）。

## 功能特性

- 📅 每日任务提醒
  - 早上 8:00：推送今日待办任务
  - 晚上 22:00：推送今日已完成任务总结

- 🔄 任务关联展示
  - 上级项目关联
  - 子任务状态
  - 任务依赖关系（阻止/被阻止）

- 📱 多渠道推送
  - 微信（PushPlus）
  - WxPusher

## 环境要求

- Python 3.9+
- 依赖包：
  ```
  requests==2.31.0
  pytz==2024.1
  ```

## 配置说明

### 1. 环境变量

```bash
# Notion配置
NOTION_TOKEN="your_notion_token"
DATABASE_ID="your_database_id"

# 消息推送配置
PUSHPLUS_TOKEN="your_pushplus_token"
WXPUSHER_TOKEN="your_wxpusher_token"
WXPUSHER_UID="your_wxpusher_uid"

# 运行配置
REMINDER_TYPE="daily_todo/daily_done"  # 待办任务/已完成任务
SEND_TIME="HH:MM"                      # 发送时间
ACTION_TYPE="prepare/send"             # 准备/发送
```

### 2. Notion数据库要求

数据库需要包含以下属性：
- 任务名称（标题）
- 负责人（单选）
- 状态（状态）
- 四象限（单选）
- 任务类型（单选）
- 上级项目（关联）
- 子级项目（关联）
- 正在阻止（关联）
- 被阻止（关联）
- 开始日期（日期）
- 上次编辑时间（最后编辑时间）

## 使用方法

### 1. 本地运行

```bash
# 安装依赖
pip install -r requirements.txt

# 运行脚本
python src/main.py
```

### 2. GitHub Actions

项目已配置 GitHub Actions，会在以下时间自动运行：
- 07:00（北京时间）：准备待办任务数据
- 08:00（北京时间）：发送待办任务提醒
- 21:30（北京时间）：准备已完成任务数据
- 22:00（北京时间）：发送已完成任务提醒

也可以在 GitHub Actions 页面手动触发，支持选择：
- 任务类型：daily_todo（待办任务）/ daily_done（已完成任务）
- 操作类型：prepare（准备数据）/ send（发送消息）

## 消息格式示例

### 待办任务
```
📋 待办任务 | dada (共2条)

1. 完成项目方案 | doing (P0 | 项目)
   └─ 撰写需求文档 | doing (P1 | 文档)
   └─ 设计系统架构 | inbox (P0 | 设计)
      ⛔️ 被阻止: UI设计评审

2. 更新周报 | inbox (P2 | 文档)
   ⛔️ 被阻止: 数据统计
```

### 已完成任务
```
✅ 今日完成 (3/5)

1. 完成项目方案 | 项目 | P0 重要紧急
2. 撰写需求文档 | 文档 | P1 重要不紧急
3. 更新周报 | 文档 | P2 紧急不重要

📊 任务统计:
- 完成率: 60%
- 重要任务: 2 | 紧急任务: 2
- 优先级: P0(1) P1(1) P2(1) P3(0)
- 任务类型:
  • 文档: 2
  • 项目: 1
```

## 注意事项

1. 确保所有必要的环境变量都已正确配置
2. Notion API Token 需要有数据库的读取权限
3. 推送渠道的 Token 需要提前申请并配置
4. 时区默认使用北京时间（Asia/Shanghai）
5. 数据准备和发送分离，可以更好地处理任务统计
6. GitHub Actions 的执行记录会通过 commit comment 保存 