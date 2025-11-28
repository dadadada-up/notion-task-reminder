# Notion Task Manager - 完整安装指南

## 📋 目录

- [系统要求](#系统要求)
- [快速开始](#快速开始)
- [详细配置](#详细配置)
- [使用说明](#使用说明)
- [常见问题](#常见问题)

---

## 系统要求

### 必需
- **Python**: 3.9+
- **Node.js**: 16+
- **npm**: 8+

### 可选
- **Git**: 用于版本控制
- **邮箱账号**: 用于邮件提醒（163/QQ/Gmail）

---

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd notion-task-reminder
```

### 2. 后端设置

```bash
# 安装 Python 依赖
pip install -r requirements.txt

# 复制环境变量文件
cp .env.example .env

# 编辑 .env 文件，填入你的配置
nano .env  # 或使用其他编辑器
```

### 3. 前端设置

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 构建生产版本
npm run build

# 返回项目根目录
cd ..
```

### 4. 启动服务

```bash
# 启动 Flask 后端服务器
python backend/app.py
```

访问 http://localhost:5000 查看 Web 界面！

---

## 详细配置

### Notion 配置

#### 1. 获取 Notion Token

1. 访问 https://www.notion.so/my-integrations
2. 点击 "+ New integration"
3. 填写名称，选择工作区
4. 复制 "Internal Integration Token"

#### 2. 获取 Database ID

1. 打开你的 Notion 任务数据库
2. 点击右上角 "Share"
3. 点击 "Copy link"
4. 链接格式：`https://notion.so/workspace/DATABASE_ID?v=...`
5. 提取中间的 `DATABASE_ID` 部分

#### 3. 连接数据库

1. 在 Notion 数据库页面，点击右上角 "..."
2. 选择 "Add connections"
3. 找到并添加你创建的 integration

### PushPlus 配置（微信推送）

#### 1. 注册 PushPlus

1. 访问 http://www.pushplus.plus
2. 使用微信扫码登录
3. 关注 PushPlus 公众号

#### 2. 获取 Token

1. 登录后台：http://www.pushplus.plus/push
2. 复制你的 "一对一推送" Token

#### 3. 测试推送

```bash
# 在 .env 中配置 PUSHPLUS_TOKEN 后
python -c "from backend.services.push_service import PushService; PushService().send_notification([], False)"
```

### 邮箱配置

#### 163 邮箱配置

1. **开启 SMTP 服务**
   - 登录 163 邮箱
   - 设置 → POP3/SMTP/IMAP
   - 开启 "SMTP 服务"
   - 获取授权码（不是登录密码！）

2. **配置 .env**
   ```env
   EMAIL_ENABLED=true
   EMAIL_SMTP_SERVER=smtp.163.com
   EMAIL_SMTP_PORT=465
   EMAIL_SENDER=your_email@163.com
   EMAIL_PASSWORD=你的授权码
   EMAIL_RECEIVER=receiver@163.com
   ```

#### QQ 邮箱配置

1. **开启 SMTP**
   - 登录 QQ 邮箱
   - 设置 → 账户
   - 开启 "SMTP 服务"
   - 生成授权码

2. **配置 .env**
   ```env
   EMAIL_SMTP_SERVER=smtp.qq.com
   EMAIL_SMTP_PORT=465
   EMAIL_SENDER=your_qq@qq.com
   EMAIL_PASSWORD=授权码
   ```

### GitHub Actions 配置

#### 1. 添加 Secrets

在 GitHub 仓库中：

1. Settings → Secrets and variables → Actions
2. 点击 "New repository secret"
3. 添加以下 secrets：

| Secret 名称 | 说明 | 必需 |
|------------|------|------|
| `NOTION_TOKEN` | Notion Integration Token | ✅ |
| `DATABASE_ID` | Notion 数据库 ID | ✅ |
| `PUSHPLUS_TOKEN` | PushPlus Token | ⭕ |
| `EMAIL_ENABLED` | 是否启用邮件 (true/false) | ⭕ |
| `EMAIL_SMTP_SERVER` | SMTP 服务器地址 | ⭕ |
| `EMAIL_SMTP_PORT` | SMTP 端口 | ⭕ |
| `EMAIL_SENDER` | 发件人邮箱 | ⭕ |
| `EMAIL_PASSWORD` | 邮箱授权码 | ⭕ |
| `EMAIL_RECEIVER` | 收件人邮箱 | ⭕ |

#### 2. 启用 Workflow

1. Actions → Daily Task Reminder
2. 点击 "Enable workflow"

#### 3. 手动触发测试

1. Actions → Daily Task Reminder
2. 点击 "Run workflow"
3. 选择参数并运行

---

## 使用说明

### 本地 Web 界面

#### 启动开发模式

```bash
# 终端 1: 启动后端
python backend/app.py

# 终端 2: 启动前端开发服务器（可选）
cd frontend
npm run dev
```

#### 功能说明

1. **看板视图**
   - 拖拽任务卡片切换状态
   - 支持 Inbox/Pending/Doing/Done 四个状态

2. **统计面板**
   - 实时显示任务统计
   - 按优先级、类型、负责人分组

3. **手动推送**
   - 点击 "发送待办提醒" 立即推送
   - 支持选择推送渠道

### 定时提醒

#### 自动执行时间

- **早上 8:00**：发送今日待办任务
- **晚上 22:00**：发送今日完成任务总结

#### 通知渠道

- ✅ **PushPlus**：微信公众号推送
- ✅ **Email**：邮件推送（HTML 富文本）

#### 消息样式

**PushPlus 推送**：
- 渐变色标题
- 优先级颜色编码
- 卡片式布局
- 任务统计面板

**邮件推送**：
- 响应式 HTML 模板
- 精美的视觉设计
- 完整的任务信息
- 统计图表

---

## 常见问题

### Q1: 前端 Lint 错误

**问题**：TypeScript 报错找不到模块

**解决**：
```bash
cd frontend
npm install
```

Lint 错误会在安装依赖后自动解决。

### Q2: Flask 启动失败

**问题**：`ModuleNotFoundError: No module named 'flask'`

**解决**：
```bash
pip install -r requirements.txt
```

### Q3: Notion API 连接失败

**问题**：401 Unauthorized

**解决**：
1. 检查 `NOTION_TOKEN` 是否正确
2. 确认 Integration 已连接到数据库
3. 检查数据库 ID 是否正确

### Q4: 邮件发送失败

**问题**：SMTP 认证失败

**解决**：
1. 确认使用的是**授权码**而非登录密码
2. 检查 SMTP 服务是否已开启
3. 确认端口号正确（163/QQ 使用 465）

### Q5: GitHub Actions 不执行

**问题**：定时任务没有触发

**解决**：
1. 检查 Workflow 是否已启用
2. GitHub Actions 可能有 5-10 分钟延迟
3. 查看 Actions 页面的执行日志

### Q6: 拖拽功能不工作

**问题**：无法拖动任务卡片

**解决**：
1. 确保前端已正确构建：`cd frontend && npm run build`
2. 清除浏览器缓存
3. 检查浏览器控制台是否有错误

### Q7: 收不到推送通知

**问题**：日志显示发送成功但未收到

**解决 PushPlus**：
1. 确认已关注 PushPlus 公众号
2. 检查 Token 是否正确
3. 访问 http://www.pushplus.plus/push 查看发送记录

**解决 Email**：
1. 检查垃圾邮件文件夹
2. 确认授权码正确
3. 尝试发送测试邮件

---

## 开发模式

### 前端开发

```bash
cd frontend
npm run dev
```

访问 http://localhost:3000（自动代理到后端 API）

### 后端开发

```bash
# 启用调试模式
export FLASK_DEBUG=true
python backend/app.py
```

### 测试 API

```bash
# 测试健康检查
curl http://localhost:5000/api/health

# 获取任务列表
curl http://localhost:5000/api/tasks

# 获取统计数据
curl http://localhost:5000/api/stats
```

---

## 生产部署

### 使用 Gunicorn（推荐）

```bash
# 安装 Gunicorn
pip install gunicorn

# 启动服务
gunicorn -w 4 -b 0.0.0.0:5000 backend.app:app
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 技术支持

如有问题，请：

1. 查看项目 [README.md](./README.md)
2. 检查 [常见问题](#常见问题)
3. 提交 GitHub Issue

---

**祝使用愉快！** 🎉
