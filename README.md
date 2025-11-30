# 🚀 Notion Task Manager

基于 Notion API 的现代化任务管理系统，支持 Web 界面、多渠道推送提醒和自动化工作流。

<div align="center">

![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![React](https://img.shields.io/badge/React-18.2-61dafb.svg)
![Flask](https://img.shields.io/badge/Flask-3.0-black.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

</div>

---

## ✨ 核心特性

### 📱 现代化 Web 界面
- **看板视图**：拖拽式任务管理，支持 Inbox/Pending/Doing/Done 状态切换
- **实时统计**：任务数量、优先级分布、类型统计一目了然
- **响应式设计**：完美适配桌面端，流畅的用户体验
- **美观 UI**：基于 TailwindCSS + Lucide Icons 的现代化设计

### 🔔 智能推送提醒
- **PushPlus 微信推送**：精美的 HTML 模板，优先级颜色编码
- **邮件提醒**：富文本邮件，支持 163/QQ/Gmail 等主流邮箱
- **双时段提醒**：
  - 早上 8:00 - 今日待办任务
  - 晚上 22:00 - 今日完成总结

### ⚙️ 自动化工作流
- **GitHub Actions**：无需服务器，云端自动执行
- **定时任务**：精确到分钟的定时提醒
- **手动触发**：支持随时手动发送通知

### 🎯 任务管理功能
- **多维度筛选**：按状态、负责人、优先级、类型筛选
- **关系管理**：支持父子任务、阻止关系
- **优先级系统**：四象限时间管理（P0-P3）
- **任务统计**：完成率、重要/紧急任务统计

---

## 🖼️ 界面预览

### Web 看板界面
```
┌─────────────────────────────────────────────────────────────────┐
│  Notion Task Manager                    [今日] [本周] [全部]    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   📥 Inbox   │  │  🔄 Doing    │  │  ✅ Done     │          │
│  │   (3 tasks)  │  │  (5 tasks)   │  │  (8 tasks)   │          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│  │ 任务卡片...  │  │ 任务卡片...  │  │ 任务卡片...  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  📊 统计面板：总任务 16 | 今日完成 8 | 重要 3 | 紧急 2         │
└─────────────────────────────────────────────────────────────────┘
```

### 推送消息示例

**微信推送（PushPlus）**：
- 渐变色标题
- 优先级颜色标识（P0红色、P1橙色、P2紫色）
- 卡片式任务布局
- 任务统计图表

**邮件推送**：
- 响应式 HTML 模板
- 精美的视觉设计
- 完整任务信息展示
- 统计数据可视化

---

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <your-repo-url>
cd notion-task-reminder

# 安装 Python 依赖
pip install -r requirements.txt

# 安装前端依赖
cd frontend
npm install
npm run build
cd ..
```

### 2. 配置环境变量

```bash
# 复制配置文件
cp .env.example .env

# 编辑配置文件
nano .env
```

**必需配置**：
```env
NOTION_TOKEN=your_notion_token
DATABASE_ID=your_database_id
```

**可选配置**：
```env
# PushPlus 微信推送
PUSHPLUS_TOKEN=your_pushplus_token

# 邮件推送
EMAIL_ENABLED=true
EMAIL_SMTP_SERVER=smtp.163.com
EMAIL_SMTP_PORT=465
EMAIL_SENDER=your_email@163.com
EMAIL_PASSWORD=your_auth_code
EMAIL_RECEIVER=receiver@163.com
```

### 3. 启动服务

#### 方式一：使用启动脚本（推荐）

```bash
# 一键启动（自动检查环境、安装依赖、构建前端、启动服务器）
./start.sh
```

启动脚本会自动：
- ✅ 检查 Python 版本
- ✅ 创建并激活虚拟环境
- ✅ 安装 Python 依赖
- ✅ 检查前端构建
- ✅ 加载环境变量
- ✅ 启动 Flask 服务器

#### 方式二：手动启动

**启动后端**：
```bash
# 激活虚拟环境（如果有）
source venv/bin/activate

# 启动 Flask 服务器
python backend/app.py
```

**前端开发模式**（可选）：
```bash
# 在另一个终端
cd frontend
npm run dev
```

#### 访问应用

- **生产模式**: http://localhost:5000
- **开发模式**: http://localhost:5173 (Vite dev server)

🎉 启动成功！

---

## 📖 详细文档

- **[完整安装指南](./docs/SETUP_GUIDE.md)** - 详细的配置步骤
- **[实施总结](./docs/IMPLEMENTATION_SUMMARY.md)** - 开发实施详情
- **[测试报告](./docs/TEST_REPORT.md)** - 完整测试报告
- **[交付文档](./docs/DELIVERY.md)** - 项目交付说明
- **[Notion 数据库结构](./notion_db_structure/notion_database_complete.md)** - 数据库字段说明
- **[API 文档](#api-文档)** - RESTful API 接口说明

---

## 🛠️ 技术栈

### 后端
- **Flask 3.0** - Web 框架
- **Requests** - HTTP 客户端
- **Python 3.9+** - 编程语言

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **TailwindCSS** - 样式框架
- **Lucide React** - 图标库
- **Axios** - HTTP 客户端
- **Vite** - 构建工具

### 自动化
- **GitHub Actions** - CI/CD
- **Cron** - 定时任务

---

## 📡 API 文档

### 基础接口

#### 健康检查
```http
GET /api/health
```

#### 获取任务列表
```http
GET /api/tasks?status=doing&assignee=dada
```

**Query 参数**：
- `status`: inbox/pedding/doing/done
- `assignee`: 负责人名称
- `priority`: P0/P1/P2/P3
- `type`: 任务类型

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": "xxx",
      "name": "完成项目方案",
      "status": "doing",
      "priority": "P0 重要紧急",
      "assignee": "dada",
      "task_type": "工作"
    }
  ],
  "count": 1
}
```

#### 更新任务
```http
PUT /api/tasks/{task_id}
Content-Type: application/json

{
  "status": "done",
  "priority": "P1 重要不紧急"
}
```

#### 获取统计数据
```http
GET /api/stats
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "total": 16,
    "today_completed": 8,
    "important_tasks": 3,
    "urgent_tasks": 2,
    "by_status": {
      "inbox": 3,
      "doing": 5,
      "done": 8
    }
  }
}
```

#### 发送通知
```http
POST /api/notify
Content-Type: application/json

{
  "type": "daily_todo",
  "channels": ["pushplus", "email"]
}
```

---

## 🔧 配置说明

### Notion 数据库要求

数据库需包含以下字段：

| 字段名称 | 类型 | 说明 |
|---------|------|------|
| 任务名称 | Title | 任务标题 |
| 状态 | Status | inbox/pedding/doing/done |
| 四象限 | Select | P0-P3 优先级 |
| 任务类型 | Select | 工作/学习/生活等 |
| 负责人 | Select | 任务执行者 |
| 开始日期 | Date | 任务开始时间 |
| 上级项目 | Relation | 父任务关系 |
| 子级项目 | Relation | 子任务关系 |
| 被阻止 | Relation | 阻止关系 |

详见 [数据库结构文档](./notion_db_structure/notion_database_complete.md)

### GitHub Actions 配置

在仓库 Settings → Secrets 中添加：

| Secret 名称 | 必需 | 说明 |
|------------|------|------|
| `NOTION_TOKEN` | ✅ | Notion Integration Token |
| `DATABASE_ID` | ✅ | Notion 数据库 ID |
| `PUSHPLUS_TOKEN` | ⭕ | PushPlus Token |
| `EMAIL_ENABLED` | ⭕ | 是否启用邮件 |
| `EMAIL_SENDER` | ⭕ | 发件人邮箱 |
| `EMAIL_PASSWORD` | ⭕ | 邮箱授权码 |
| `EMAIL_RECEIVER` | ⭕ | 收件人邮箱 |

---

## 📅 定时任务

### 🎨 前端配置界面

本项目支持通过前端界面配置定时任务，配置会自动同步到 GitHub Actions！

**使用方法：**
1. 启动 Web 应用
2. 点击"定时消息设置"按钮
3. 配置定时任务：
   - 选择消息类型（今日待办/今日完成）
   - 设置推送时间（北京时间）
   - 添加自定义消息（可选）
   - 启用/禁用任务
4. 点击"保存设置"
5. 系统自动更新 GitHub Actions workflow

**默认配置：**
- **早上 8:00**（北京时间）- 发送今日待办任务
- **晚上 21:00**（北京时间）- 发送今日完成总结

### 🔧 手动触发

1. 访问 GitHub Actions 页面
2. 选择 "Daily Task Reminder"
3. 点击 "Run workflow"
4. 选择任务类型和参数：
   - 任务类型（daily_todo/daily_done）
   - 操作类型（send/combined）
   - 强制发送（忽略时间检查）
   - 自定义发送时间
   - 调试模式

### 📖 详细文档

查看 [定时任务集成文档](./docs/SCHEDULE_INTEGRATION.md) 了解：
- 架构设计
- 配置说明
- 时间转换
- 故障排查

---

## 🐛 故障排除

### 常见问题

**Q: 前端 TypeScript 报错？**
```bash
cd frontend && npm install
```

**Q: Flask 启动失败？**
```bash
pip install -r requirements.txt
```

**Q: Notion API 401 错误？**
- 检查 Token 是否正确
- 确认 Integration 已连接到数据库

**Q: 收不到推送？**
- PushPlus: 检查是否关注公众号
- Email: 检查授权码是否正确，查看垃圾邮件

更多问题请查看 [安装指南](./docs/SETUP_GUIDE.md#常见问题)

---

## 🛠️ 工具脚本

项目提供了多个实用脚本来简化开发和部署：

### 主要脚本
- **`start.sh`** - 启动服务器（自动检查环境、安装依赖、构建前端）
- **`auto_complete.sh`** - 自动完成任务（定时任务脚本）
- **`install_dependencies.sh`** - 安装所有依赖（Python + Node.js）

### 工具脚本（scripts/目录）
- **`scripts/fix_env.sh`** - 修复环境变量配置
- **`scripts/fix_git_secrets.sh`** - 清理Git历史中的敏感信息

### 测试脚本（tests/目录）
- **`tests/run_tests.sh`** - 运行所有测试
- **`tests/run_unit_tests.sh`** - 运行单元测试

---

## 📝 更新日志

查看 [docs/changelog/](./docs/changelog/) 目录了解详细的功能更新和bug修复记录。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 License

MIT License

---

## 🙏 致谢

- [Notion API](https://developers.notion.com/)
- [PushPlus](http://www.pushplus.plus/)
- [React](https://react.dev/)
- [Flask](https://flask.palletsprojects.com/)
- [TailwindCSS](https://tailwindcss.com/)

---

<div align="center">

**Made with ❤️ by dada**

[⬆ 回到顶部](#-notion-task-manager)

</div>
