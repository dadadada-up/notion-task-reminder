# Notion 任务提醒助手

基于 Notion API 的任务提醒工具，支持多渠道消息推送（微信、钉钉、WxPusher）。

## 功能特性

- 📅 每日任务提醒
  - 早上：推送待办任务
  - 晚上：推送已完成任务总结

- 🔄 任务关联展示
  - 上级项目关联
  - 子任务状态
  - 任务依赖关系（阻止/被阻止）

- 📱 多渠道推送
  - 微信（PushPlus）
  - 钉钉
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
REMINDER_TYPE="morning/evening"  # 早上/晚上提醒
SEND_TIME="HH:MM"               # 发送时间
```

### 2. Notion数据库要求

数据库需要包含以下属性：
- 任务名称（标题）
- 负责人（单选）
- 状态（状态）
- 上级项目（关联）
- 子级项目（关联）
- 正在阻止（关联）
- 被阻止（关联）
- 开始日期（日期）

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
- 早上 8:00（北京时间）：推送待办任务
- 晚上 22:00（北京时间）：推送完成任务总结

## 消息格式示例

```
📋 待办任务 | dada (共2条)

1. 完成项目方案
   🔗 上级项目: Q1季度规划
   👶 子任务: 
      - 撰写需求文档 [进行中]
      - 设计系统架构 [还未开始]
   🚫 正在阻止: UI设计评审

2. 更新周报
   ⛔️ 被阻止: 数据统计

---

📋 待办任务 | pp (共1条)

1. 设计UI原型
```

## 注意事项

1. 确保所有必要的环境变量都已正确配置
2. Notion API Token 需要有数据库的读取权限
3. 推送渠道的 Token 需要提前申请并配置
4. 时区默认使用北京时间（Asia/Shanghai） 