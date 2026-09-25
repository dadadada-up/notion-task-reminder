# ⚠️ DEPRECATED — 遗留 Python/Notion 后端

此目录包含 workbench 项目的**第一代后端**（Python + Flask + Notion API），已被 Cloudflare Workers + D1 全栈架构完全替代。

## 目录内容

| 路径 | 说明 |
|------|------|
| `backend/` | Flask API 服务 + Notion/DeepSeek/PushPlus 服务层 |
| `src/` | GitHub Actions 入口脚本（每日提醒） |
| `config/` | 定时推送配置 (schedule.json) |
| `data/` | 运行时生成的周报缓存 |
| `notion_db_structure/` | Notion 数据库结构文档 |
| `requirements.txt` | Python 依赖 |
| `start.sh` / `install_dependencies.sh` | 本地启动脚本 |

## 为什么保留

- `.github/workflows/daily_reminder.yml` 仍引用 `src/main.py`（已禁用 schedule 触发，仅保留手动调试能力）
- 作为历史参考，记录 Notion → D1 的数据迁移逻辑

## 迁移时间线

- **2025-11**: Notion + GitHub Actions 架构上线
- **2025-12**: Cloudflare Workers + D1 重构完成，前端迁移至 React + Pages
- **2026-09**: 正式标记为 DEPRECATED，GitHub Actions schedule 禁用

## 注意

**请勿在此目录下开发新功能。** 所有新开发应在 `worker/src/`（后端）和 `frontend/src/`（前端）中进行。
