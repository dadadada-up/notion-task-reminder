# Personal Workbench

个人工作台 -- 基于 Cloudflare Workers + Pages 的全栈任务管理系统，支持任务管理、习惯打卡、周总结、智能推送等功能。

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![React](https://img.shields.io/badge/React-18.2-61dafb.svg)
![Hono](https://img.shields.io/badge/Hono-4.x-black.svg)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20Pages-orange.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

</div>

---

## 架构概览

```
用户浏览器 --> Cloudflare CDN
                ├── Pages: React SPA + Pages Functions (API)
                ├── D1: SQLite 数据库
                └── R2: 对象存储（图片上传）
```

前后端一体化部署在 Cloudflare Pages，API 通过 Pages Functions 处理，无需独立 Worker 服务。

---

## 核心特性

### 任务管理
- 看板视图 + 表格视图双模式切换
- 五状态流转：收集箱 -> 进行中 -> 已完成 / 暂停 / 已放弃
- 父子任务关系、阻止关系管理
- 四象限优先级（P0-P3）
- 自动流转：收集箱任务到开始时间自动转为进行中
- 任务详情页支持查看/完成子任务

### 习惯打卡
- 每日/每周/每月多频率习惯追踪
- 日历视图打卡记录
- 习惯完成率统计

### 周总结
- 自动汇总本周任务完成情况
- AI 辅助优化周总结内容（需配置 DeepSeek API Key）
- 分享链接生成（支持密码保护）

### 智能推送
- PushPlus 微信推送
- 邮件通知（SMTP）
- 双时段定时提醒（早 8:00 / 晚 22:00，通过 Workers Cron Triggers）

### 认证与安全
- JWT 无状态认证
- 用户注册/登录
- 密码 PBKDF2 哈希存储

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React 18 + TypeScript | SPA 单页应用 |
| 样式 | TailwindCSS 3 | 原子化 CSS |
| 构建 | Vite 5 | 前端构建工具 |
| 后端框架 | Hono 4 | 轻量 Web 框架，运行在 Workers 上 |
| 数据库 | Cloudflare D1 | SQLite 兼容的关系型数据库 |
| 对象存储 | Cloudflare R2 | 图片上传存储 |
| 部署 | Cloudflare Pages | 前端 + API 一体化部署 |
| 定时任务 | Workers Cron Triggers | 原生 cron 支持 |
| 认证 | JWT (jose) | 无状态 Token 认证 |

---

## 项目结构

```
workbench/
├── frontend/                  # 前端 + Pages Functions（主部署目录）
│   ├── src/                   # React 源码
│   │   ├── App.tsx            # 主应用组件
│   │   ├── api.ts             # API 请求层
│   │   ├── types.ts           # TypeScript 类型定义
│   │   ├── components/        # UI 组件
│   │   │   ├── TaskGallery.tsx      # 任务看板视图
│   │   │   ├── TaskTable.tsx        # 任务表格视图
│   │   │   ├── TaskModal.tsx        # 任务编辑弹窗
│   │   │   ├── TaskDetailModal.tsx  # 任务详情弹窗
│   │   │   ├── TaskSelector.tsx     # 任务选择器（父子关系）
│   │   │   ├── LoginPage.tsx        # 登录页
│   │   │   ├── habits/              # 习惯打卡模块
│   │   │   └── ...
│   │   └── utils/             # 工具函数
│   ├── functions/             # Pages Functions（服务端 API）
│   │   ├── api/[[path]].ts    # /api/* 路由入口
│   │   ├── share/[[path]].ts  # /share/* 路由入口
│   │   └── _lib/              # API 业务逻辑（与 worker/src 同步）
│   ├── public/
│   │   ├── _routes.json       # Functions 路由规则
│   │   └── _redirects         # SPA 路由回退
│   ├── wrangler.toml          # Cloudflare 配置
│   ├── vite.config.ts         # Vite 配置
│   └── package.json
├── worker/                    # 独立 Worker（可选，与 functions/_lib 同源）
│   ├── src/
│   │   ├── index.ts           # Hono 入口
│   │   ├── db/schema.sql      # D1 建表 SQL
│   │   ├── routes/            # 路由模块
│   │   ├── services/          # 业务服务
│   │   └── middleware/        # 中间件（JWT 鉴权）
│   ├── wrangler.toml
│   └── package.json
└── scripts/                   # 辅助脚本
```

---

## 本地开发

### 环境要求

- Node.js 18+
- npm 9+
- Cloudflare 账号（用于远程 D1 数据访问）

### 启动后端（Worker）

```bash
cd worker
npm install
npx wrangler dev
# Ready on http://localhost:8787
```

Worker 默认连接远程 D1 数据库（只读模拟），本地修改会写入本地模拟的 Miniflare 存储。

如需本地环境变量（如 JWT_SECRET），创建 `worker/.dev.vars`：

```env
JWT_SECRET=your-dev-secret
```

### 启动前端

```bash
cd frontend
npm install
npm run dev
# Ready on http://localhost:3001
```

Vite 开发服务器会将 `/api/*` 请求代理到 `http://localhost:8787`。

### 访问应用

| 模式 | 地址 | 说明 |
|------|------|------|
| 前端开发 | http://localhost:3001 | Vite HMR 热更新 |
| 后端 API | http://localhost:8787 | Wrangler 本地服务 |

默认测试账号：`dada` / `test123456`

---

## 部署

### 一键部署到 Cloudflare Pages

```bash
# 1. 构建前端
cd frontend
npm run build

# 2. 部署到 Pages（production）
npx wrangler pages deploy dist --project-name=workbench --branch=main
```

### 配置 Secrets

部署后需在 Cloudflare Dashboard 设置 Production 环境变量（Secrets）：

| Secret | 说明 |
|--------|------|
| `JWT_SECRET` | JWT 签名密钥（必填） |
| `PUSHPLUS_TOKEN` | PushPlus 微信推送 Token（可选） |
| `DEEPSEEK_API_KEY` | DeepSeek API Key，用于 AI 周总结优化（可选） |

> 注意：Pages Secrets 仅在 Production 环境生效，Preview 环境无法访问。

### 初始化数据库

首次部署需初始化 D1 数据库：

```bash
cd worker
npx wrangler d1 execute workbench-db --remote --file=src/db/schema.sql
```

---

## API 文档

所有 API 统一响应格式：

```json
{
  "success": true,
  "data": { ... },
  "count": 10
}
```

### 认证

```http
POST /api/auth/register    # 注册
POST /api/auth/login       # 登录，返回 JWT token
GET  /api/auth/me          # 获取当前用户信息
```

后续请求需在 Header 中携带 Token：

```
Authorization: Bearer <token>
```

### 任务

```http
GET    /api/tasks              # 获取任务列表（支持筛选）
POST   /api/tasks              # 创建任务
GET    /api/tasks/:id          # 获取单个任务
PUT    /api/tasks/:id          # 更新任务
POST   /api/tasks/auto-transition  # 自动流转收集箱任务
```

**任务筛选参数**：`?status=进行中&assignee=dada&priority=P0&type=工作`

### 习惯

```http
GET    /api/habits             # 获取习惯列表
POST   /api/habits             # 创建习惯
PUT    /api/habits/:id         # 更新习惯
GET    /api/habits/:id/stats   # 获取习惯统计
```

### 打卡记录

```http
GET    /api/daily-logs         # 获取打卡记录
POST   /api/daily-logs         # 创建打卡记录
PUT    /api/daily-logs/:id     # 更新打卡记录
```

### 数据总览

```http
GET /api/data                  # 组合数据（任务 + 统计），前端主入口
```

### 周总结

```http
GET    /api/weekly-summary/current    # 获取当前周总结
POST   /api/weekly-summary/save       # 保存周总结
POST   /api/weekly-summary/ai-optimize  # AI 优化周总结
```

### 推送

```http
POST /api/notify               # 手动触发推送
```

### 分享

```http
POST   /api/share/create       # 创建分享链接
GET    /share/:token           # 访问分享页面（无需认证）
```

---

## 数据库表结构

共 11 张表，核心表如下：

| 表名 | 说明 |
|------|------|
| `users` | 用户表 |
| `tasks` | 任务表（支持 parent_id 父子关系） |
| `task_dependencies` | 任务阻止关系（多对多） |
| `task_images` | 任务图片（关联 R2） |
| `habits` | 习惯表 |
| `daily_logs` | 打卡记录表 |
| `weekly_summaries` | 周总结表 |
| `share_links` | 分享链接表 |
| `activity_logs` | 活动日志表 |
| `app_config` | 系统配置表 |

---

## 定时任务

通过 Cloudflare Workers Cron Triggers 实现，配置在 `wrangler.toml`：

```toml
[triggers]
crons = [
  "0 0 * * *",    # UTC 00:00 = 北京时间 08:00（今日待办提醒）
  "0 14 * * *"    # UTC 14:00 = 北京时间 22:00（今日完成总结）
]
```

前端也提供可视化配置界面，支持动态调整推送时间和渠道。

---

## 故障排除

**Q: 本地开发时 API 返回 401？**
检查 `worker/.dev.vars` 是否配置了 `JWT_SECRET`，并重新登录获取新 token。

**Q: 部署后登录返回 500？**
确认已在 Cloudflare Dashboard 的 Pages Production 环境设置了 `JWT_SECRET` Secret。

**Q: 子任务不显示？**
确保 `/api/data` 端点正确填充了 `child_ids`（已从数据库查询，非硬编码空数组）。

**Q: workers.dev 域名无法访问？**
国内网络环境下 `workers.dev` 和 `pages.dev` 可能被墙，建议使用自定义域名。

---

## License

MIT License

---

<div align="center">

**Made with care by dada**

[Cloudflare Pages](https://pages.cloudflare.com/) | [Hono](https://hono.dev/) | [React](https://react.dev/)

</div>
