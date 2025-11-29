# 更新日志

## 2025-11-29

### ✅ 定时任务配置集成
- 实现前端配置界面与 GitHub Actions 工作流的自动同步
- 删除冗余的 `schedule.yml` 文件
- 统一使用 `daily_reminder.yml` 作为唯一的工作流文件
- 详细文档：[docs/SCHEDULE_INTEGRATION.md](./docs/SCHEDULE_INTEGRATION.md)

### ✅ 环境变量配置优化
- 简化环境变量加载逻辑，统一使用根目录 `.env` 文件
- 删除 `tests/.env.test` 等测试配置文件
- 更新 Notion API Token

### 🔧 修改的文件
- `backend/app.py` - 简化环境变量加载
- `backend/services/schedule_service.py` - 生成完善的 workflow
- `.github/workflows/daily_reminder.yml` - 自动生成的工作流
- `.env` - 统一的配置文件

### 📚 新增文档
- `docs/SCHEDULE_INTEGRATION.md` - 定时任务集成详细文档
- `README.md` - 更新定时任务配置说明

### 🗑️ 清理的文件
- `tests/.env.test` - 测试环境配置
- `.github/workflows/schedule.yml` - 旧的工作流文件
- 临时测试脚本和文档

## 使用说明

### 配置定时任务
1. 启动服务：`./start.sh`
2. 访问前端界面
3. 点击"定时消息设置"
4. 配置并保存
5. 提交到 GitHub

### 环境变量
所有配置统一在 `.env` 文件中管理。

### 更多信息
查看 [README.md](./README.md) 和 [docs/SCHEDULE_INTEGRATION.md](./docs/SCHEDULE_INTEGRATION.md)
