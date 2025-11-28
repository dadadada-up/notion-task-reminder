# 消息推送配置指南

## ✅ 已完成功能

本系统支持两种消息推送方式：
1. **PushPlus** - 微信公众号推送
2. **Email** - 邮件推送

## 📱 PushPlus 配置

### 1. 获取 Token
1. 访问 [PushPlus官网](http://www.pushplus.plus/)
2. 使用微信扫码登录
3. 在"发送消息"页面获取你的 Token

### 2. 配置环境变量
在 `.env` 或 `tests/.env.test` 文件中设置：
```bash
PUSHPLUS_TOKEN="你的PushPlus Token"
```

### 3. 接收推送
- 关注 PushPlus 微信公众号
- 发送消息时会收到微信公众号通知

## 📧 邮件推送配置

### 1. 开启邮箱授权码（以163邮箱为例）
1. 登录163邮箱
2. 设置 -> POP3/SMTP/IMAP
3. 开启 SMTP 服务
4. 获取授权码（不是邮箱密码！）

### 2. 配置环境变量
```bash
EMAIL_ENABLED="true"
EMAIL_SMTP_SERVER="smtp.163.com"
EMAIL_SMTP_PORT="465"
EMAIL_SENDER="你的邮箱@163.com"
EMAIL_PASSWORD="你的授权码"
EMAIL_RECEIVER="接收邮箱@163.com"
```

### 3. 其他邮箱配置

#### QQ邮箱
```bash
EMAIL_SMTP_SERVER="smtp.qq.com"
EMAIL_SMTP_PORT="465"
```

#### Gmail
```bash
EMAIL_SMTP_SERVER="smtp.gmail.com"
EMAIL_SMTP_PORT="587"
```

## 🚀 使用方法

### 方式一：通过Web界面
1. 打开 http://localhost:5000
2. 点击左侧"发送提醒"按钮
3. 系统会同时发送 PushPlus 和邮件通知

### 方式二：通过API
```bash
curl -X POST http://localhost:5000/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily_todo",
    "channels": ["pushplus", "email"]
  }'
```

### 方式三：使用测试脚本
```bash
python test_notification.py
```

## 📊 通知类型

### daily_todo - 今日待办
发送今天需要处理的任务列表

### daily_done - 今日完成
发送今天已完成的任务统计

## 🎨 消息格式

### PushPlus 消息
- 精美的 HTML 格式
- 按负责人分组
- 优先级颜色标识
- 任务类型标签
- 统计信息

### 邮件消息
- 响应式 HTML 邮件
- 支持深色模式
- 任务卡片展示
- 详细统计数据

## ⚠️ 注意事项

1. **环境变量优先级**
   - `tests/.env.test` > `.env.test` > `.env`
   - 使用 `./start.sh` 启动时会优先使用 `tests/.env.test`

2. **邮箱授权码**
   - 必须使用授权码，不是邮箱密码
   - 授权码需要在邮箱设置中生成

3. **PushPlus限制**
   - 免费版每天限制 200 条消息
   - 消息内容不能包含敏感词

4. **邮件发送失败**
   - 检查 SMTP 服务器和端口
   - 检查授权码是否正确
   - 检查网络连接

## 🔍 故障排查

### PushPlus 推送失败
```bash
# 检查 Token 是否配置
echo $PUSHPLUS_TOKEN

# 测试 API
curl -X POST http://www.pushplus.plus/send \
  -H "Content-Type: application/json" \
  -d '{
    "token": "你的Token",
    "title": "测试",
    "content": "这是一条测试消息"
  }'
```

### 邮件发送失败
```bash
# 检查配置
echo $EMAIL_ENABLED
echo $EMAIL_SENDER
echo $EMAIL_PASSWORD

# 测试 SMTP 连接
python -c "
import smtplib
server = smtplib.SMTP_SSL('smtp.163.com', 465)
server.login('你的邮箱', '你的授权码')
print('✅ SMTP 连接成功')
server.quit()
"
```

## 📝 配置示例

### 完整配置（.env）
```bash
# Notion 配置
NOTION_TOKEN="ntn_xxx"
DATABASE_ID="xxx"

# PushPlus 推送
PUSHPLUS_TOKEN="3cfcadc8fcf744769292f0170e724ddb"

# 邮箱推送
EMAIL_ENABLED="true"
EMAIL_SMTP_SERVER="smtp.163.com"
EMAIL_SMTP_PORT="465"
EMAIL_SENDER="dadadada_up@163.com"
EMAIL_PASSWORD="BYTq5DZYLQkvbkbU"
EMAIL_RECEIVER="dadadada_up@163.com"
```

## 🎯 最佳实践

1. **定时推送**
   - 使用 cron 定时任务
   - 每天早上 9:00 发送待办
   - 每天晚上 21:00 发送完成统计

2. **消息过滤**
   - 只推送重要任务（P0/P1）
   - 按负责人筛选
   - 按任务类型筛选

3. **多渠道推送**
   - 工作日使用邮件
   - 紧急任务使用 PushPlus
   - 重要任务双渠道推送

## 📚 相关文档

- [PushPlus官方文档](http://www.pushplus.plus/doc/)
- [163邮箱帮助中心](https://help.mail.163.com/)
- [项目README](../README.md)
