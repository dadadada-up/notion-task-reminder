# Personal Workbench — 项目 Wiki

> 个人效率管理平台，涵盖任务管理、习惯打卡、周总结、AI 辅助等功能。  
> 技术栈：React + Vite + TailwindCSS / Cloudflare Pages + Workers + D1 + R2 / Hono / DeepSeek AI

---

## 目录

1. [系统架构](#1-系统架构)
2. [数据库设计](#2-数据库设计)
3. [API 接口清单](#3-api-接口清单)
4. [前端页面与组件](#4-前端页面与组件)
5. [认证与权限](#5-认证与权限)
6. [部署与运维](#6-部署与运维)

---

## 1. 系统架构

### 1.1 整体架构

```
┌──────────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                               │
│  ┌──────────────────────┐    ┌─────────────────────────────────┐ │
│  │   前端静态资源         │    │   Pages Functions (Hono)        │ │
│  │   React + Vite        │    │   /api/* → 后端 API 路由         │ │
│  │   TailwindCSS         │───▶│   /share/* → 公开分享           │ │
│  │   dist/               │    │   绑定 D1 (DB)                  │ │
│  └──────────────────────┘    └────────────┬────────────────────┘ │
└───────────────────────────────────────────┼──────────────────────┘
                                            │
          ┌─────────────────────────────────┼──────────────────┐
          │                                 │                  │
    ┌─────▼─────┐                   ┌──────▼──────┐   ┌──────▼──────┐
    │  D1 数据库  │                   │  R2 存储     │   │ DeepSeek AI │
    │  10 张表    │                   │  图片上传     │   │ 周总结优化   │
    └───────────┘                   └─────────────┘   └─────────────┘
```

### 1.2 双部署模式

本项目有两套后端入口，共享同一份 D1 数据库：

| 模式 | 入口 | 说明 |
|------|------|------|
| **Pages Functions** | `frontend/functions/_lib/index.ts` | 随前端自动部署，生产环境使用 |
| **独立 Worker** | `worker/src/index.ts` | 独立部署，开发调试使用 |

两份代码结构一致，修改时需同步更新。

### 1.3 数据流

```
用户操作 → React 组件 → api.ts (axios) → /api/* → Pages Functions → D1/R2
                                                    ↓
                                              返回 JSON → 更新 React State → 重新渲染
```

**缓存策略**：前端 `api.ts` 对任务数据实施 30 秒内存缓存，写操作后手动清除。

---

## 2. 数据库设计

数据库：Cloudflare D1 (SQLite)，database_name = `workbench-db`

### 2.1 表关系图

```
users ─────────┬────────────────────────────────────────────
  │            │
  ├──▶ tasks ──┼──▶ task_dependencies (多对多，blocked_by)
  │    │       └──▶ task_images (1:N)
  │    └──▶ tasks (自引用 parent_id，父子任务)
  │
  ├──▶ habits ────▶ daily_logs (1:N，ON DELETE CASCADE)
  │
  ├──▶ weekly_summaries (1:N)
  │
  ├──▶ share_links (1:N)
  │
  ├──▶ activity_logs (1:N)
  │
  └──▶ app_config (全局 KV 存储，无 user_id)
```

### 2.2 表详细说明

#### `users` — 用户表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| username | TEXT UNIQUE | 登录名 |
| password_hash | TEXT | bcrypt 哈希 |
| display_name | TEXT | 显示名 |
| role | TEXT | `owner` / `editor` / `viewer` |

#### `tasks` — 任务表（核心）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| user_id | TEXT FK | 所属用户 |
| name | TEXT | 任务名称 |
| status | TEXT | `收集箱` / `进行中` / `暂停` / `已放弃` / `已完成` |
| assignee | TEXT | 负责人（`dada` / `panpan`） |
| priority | TEXT | `P0 重要紧急` ~ `P3 不重要不紧急` |
| task_type | TEXT | 分类：`个人成长` / `工作` / `健康` 等 |
| parent_id | TEXT FK→tasks | 父任务 ID（自引用，支持子任务） |
| start_date | TEXT | 开始日期 YYYY-MM-DD |
| deadline | TEXT | 截止日期 |
| completed_time | TEXT | 完成时间 ISO |
| notes | TEXT | 备注 |

**索引**：`user_id+status`, `user_id+task_type`, `user_id+priority`, `parent_id`

#### `task_dependencies` — 任务依赖（多对多）
| 字段 | 说明 |
|------|------|
| task_id | 当前任务 |
| blocked_by_id | 阻止当前任务的依赖任务 |

#### `task_images` — 任务图片
| 字段 | 说明 |
|------|------|
| id | 图片 ID |
| task_id | 所属任务 (CASCADE) |
| name / url / r2_key | 图片信息 |

#### `habits` — 习惯表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| user_id | TEXT FK | 所属用户 |
| name | TEXT | 习惯名称 |
| frequency | TEXT | `每日` / `工作日` / `周末` / `每周` / `每月` / `不定期` |
| status | TEXT | `生效` / `暂停` / `失效` |
| weekly_target | INTEGER | 每周目标次数 |
| monthly_target | INTEGER | 每月目标次数 |
| start_date / end_date | TEXT | 起止日期 |
| phase | TEXT | 阶段标记（自由文本） |

#### `daily_logs` — 打卡记录
| 字段 | 说明 |
|------|------|
| id | UUID |
| habit_id | FK → habits (CASCADE) |
| log_date | 日期 YYYY-MM-DD |
| completed | 0 或 1 |
| **UNIQUE** | `(habit_id, log_date)` 防重复 |

#### `weekly_summaries` — 周总结
| 字段 | 说明 |
|------|------|
| user_id + week_start | UNIQUE 约束 |
| data | JSON 文本（存储完整周总结结构） |
| year / week_number | 年份和周数 |

#### `share_links` — 分享链接
| 字段 | 说明 |
|------|------|
| token | UNIQUE，用于公开访问 URL |
| resource_type | `task` / `weekly_summary` / `habit_dashboard` / `board` |
| password_hash | 可选密码保护 |
| expires_at | 可选过期时间 |

#### `app_config` — 全局配置 (KV)
| 字段 | 说明 |
|------|------|
| key | 配置键（PK） |
| value | 配置值（JSON 文本） |

---

## 3. API 接口清单

### 3.1 认证

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | 可选 | 注册（首个用户自动 owner） |
| POST | `/api/auth/login` | — | 登录，返回 JWT |
| GET | `/api/auth/me` | ✅ | 当前用户信息 |
| GET | `/api/users` | ✅ | 用户列表 |

### 3.2 任务管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks` | 任务列表（?status/assignee/priority/type） |
| POST | `/api/tasks` | 创建任务 |
| PUT | `/api/tasks/:id` | 更新任务 |
| DELETE | `/api/tasks/:id` | 删除任务（子任务自动释放为独立任务） |
| POST | `/api/tasks/auto-transition` | 收集箱→进行中（到达开始日期） |
| GET | `/api/data` | 组合数据（任务+统计，减少请求次数） |

### 3.3 习惯打卡

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/habits` | 习惯列表（?status，含月度完成率） |
| GET | `/api/habits/stats` | 统计数据（今日/本周/本月） |
| GET | `/api/habits/:id` | 单个习惯 |
| POST | `/api/habits` | 创建习惯 |
| PUT | `/api/habits/:id` | 更新习惯 |
| DELETE | `/api/habits/:id` | 删除习惯（级联删除打卡记录） |

### 3.4 打卡记录

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/daily-logs` | 记录列表（?habit_id/start_date/end_date/completed） |
| GET | `/api/daily-logs/calendar` | 日历视图（?year/month） |
| POST | `/api/daily-logs` | 创建打卡（同日同习惯自动去重） |
| PUT | `/api/daily-logs/:id` | 更新记录 |

### 3.5 周总结

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/weekly-summary` | 获取周总结（?week=current/last/日期） |
| GET | `/api/weekly-summary/weeks` | 可用周列表 |
| GET | `/api/weekly-summary/markdown` | Markdown 导出 |
| GET | `/api/weekly-summary/new-format` | 新格式复盘 |
| POST | `/api/weekly-summary/new-format/save` | 保存新格式 |
| GET | `/api/weekly-summary/new-format/markdown` | 新格式 Markdown |
| POST | `/api/weekly-summary/ai-optimize` | AI 优化段落 |

### 3.6 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats` | 组合统计 |
| GET/PUT | `/api/config` | 应用配置 |
| GET/POST | `/api/config/schedule` | 通知定时计划 |
| POST | `/api/upload` | 上传图片到 R2 |
| POST | `/api/notify` | 发送通知（PushPlus） |
| POST | `/api/notify/test` | 测试通知 |
| POST | `/api/ai/optimize` | AI 优化 |
| POST | `/api/ai/chat` | AI 对话 |
| POST | `/api/share` | 创建分享链接 |
| GET | `/share/:token` | 公开查看分享（无需认证） |

### 3.7 定时任务 (Cron)

| UTC | 北京时间 | 任务 |
|-----|---------|------|
| `0 0 * * *` | 08:00 | 早安提醒：推送今日待办 |
| `0 14 * * *` | 22:00 | 晚间总结：自动暂停过期任务 + 推送今日完成 |

---

## 4. 前端页面与组件

### 4.1 页面路由

| 路径 | 菜单 | 组件 | 功能 |
|------|------|------|------|
| `/dashboard` | 工作台 | `DashboardPage` | 统计概览 + 今日任务 + 快捷链接 |
| `/weekly` | 我的一周 | `WeeklySummaryPage` | 周总结编辑 / AI 优化 / Markdown 导出 |
| `/tasks` | 我的任务 | `TaskGallery` / `TaskTable` | 任务管理（画廊/表格视图切换） |
| `/habits` | 习惯打卡 | `HabitTracker` | 习惯管理 + 每日打卡 + 日历 |
| `/share/:token` | — | `ShareViewPage` | 公开分享页（无需登录） |

### 4.2 核心组件树

```
App.tsx
├── LoginPage                    # 登录
├── Sidebar (侧边栏)
│   ├── 菜单导航 (4个页面)
│   ├── 新建任务按钮
│   ├── 发送提醒 / 定时设置 / 系统配置
│   └── 用户信息 + 退出
├── DashboardPage
│   ├── StatsOverview            # 统计卡片
│   ├── TodayTasks               # 今日任务
│   ├── WeekHabits               # 本周习惯
│   └── QuickLinks               # 快捷链接
├── TaskGallery / TaskTable      # 任务视图
│   ├── TaskCard                 # 任务卡片（画廊模式）
│   └── TaskModal                # 新建/编辑任务弹窗
├── TaskDetailModal              # 任务详情弹窗
├── HabitTracker
│   ├── HabitCalendar            # 打卡日历
│   ├── HabitStatsCard           # 统计卡片
│   ├── HabitCard                # 习惯卡片（含 hover 管理按钮）
│   └── HabitModal               # 新建/编辑习惯弹窗
├── WeeklySummaryPage            # 周总结
├── ScheduleSettings             # 定时设置弹窗
├── NotificationModal            # 发送提醒弹窗
└── ConfigSettings               # 系统配置弹窗
```

### 4.3 任务管理设计

- **5 个状态标签页**：收集箱 → 进行中 → 暂停 → 已完成 → 已放弃
- **双视图**：画廊（卡片拖拽）/ 表格（列表）
- **父子任务**：支持子任务嵌套，删除父任务时子任务自动独立
- **自动流转**：收集箱中到达开始日期的任务自动转为进行中
- **删除**：二次确认，子任务释放为独立任务

### 4.4 习惯打卡设计

- **3 种状态**：生效中 / 已暂停 / 已失效
- **频率联动**：选择频率自动填充周/月目标默认值
- **打卡去重**：同一习惯同一天只有一条记录（upsert）
- **管理入口**：卡片 hover 显示编辑/暂停按钮，底部折叠区管理暂停和失效习惯

---

## 5. 认证与权限

### 5.1 认证机制

- **JWT Token** 存储在 `localStorage`
- axios 拦截器自动注入 `Authorization: Bearer <token>`
- 401 响应自动清除 token，触发 `auth:logout` 事件

### 5.2 角色权限

| 角色 | 说明 |
|------|------|
| `owner` | 完全权限，可管理用户 |
| `editor` | 可创建/编辑/删除内容 |
| `viewer` | 只读访问 |

---

## 6. 部署与运维

### 6.1 本地开发

```bash
# 前端开发服务器（Vite）
cd frontend && npm run dev          # http://localhost:5173

# 后端开发（Worker）
cd worker && npm run dev            # http://localhost:8787

# 数据库本地操作
cd worker && npx wrangler d1 execute workbench-db --local --command="SELECT * FROM tasks"
```

### 6.2 生产部署

```bash
# 前端构建 + 部署到 Cloudflare Pages
cd frontend
npx vite build
npx wrangler pages deploy dist --project-name=workbench --branch=main --commit-dirty=true

# Worker 独立部署
cd worker
npx wrangler deploy
```

### 6.3 数据库操作

```bash
# 执行 SQL
npx wrangler d1 execute workbench-db --command="SELECT COUNT(*) FROM tasks"

# 导入 schema
npx wrangler d1 execute workbench-db --file=src/db/schema.sql

# 远程导出
npx wrangler d1 export workbench-db --output=backup.sql
```

### 6.4 关键配置

| 配置项 | 位置 | 说明 |
|--------|------|------|
| D1 数据库 | wrangler.toml | `database_name = "workbench-db"` |
| JWT 密钥 | `.dev.vars` / Pages 环境变量 | `JWT_SECRET` |
| PushPlus | 环境变量 | `PUSHPLUS_TOKEN` |
| R2 存储 | wrangler.toml | `bucket_name = "workbench-uploads"` |
