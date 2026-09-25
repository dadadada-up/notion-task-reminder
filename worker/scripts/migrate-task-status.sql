-- =============================================
-- Migration: task status vocabulary
--   旧: 收集箱 / 暂停 / 已放弃 / 进行中 / 已完成
--   新: 待开始 / 进行中 / 已完成 / 已放弃 / 已逾期
--   映射: 收集箱 -> 待开始, 暂停 -> 已逾期
--
-- SQLite 无法直接修改 CHECK 约束，需重建 tasks 表。
-- 关键约束：D1 强制 foreign_keys=ON，且忽略 `PRAGMA foreign_keys=OFF`
--   与 `PRAGMA defer_foreign_keys`。因此常规「建新表 + 拷贝 + DROP 旧表」
--   会失败：新表 parent_id REFERENCES tasks(id) 的行会指向旧表，DROP 旧表
--   即触发外键报错；task_dependencies / task_images 的 ON DELETE CASCADE
--   也会级联删数据。
--
-- 本脚本改用「CTAS 暂存表」方案（暂存表不带任何外键，可安全 DROP 旧表）：
--   备份子表 -> 暂存 tasks -> 删除旧表与子表 -> 按新 schema 重建 tasks
--   -> 先插入(parent_id 置空)再回填 parent_id -> 重建并恢复子表 -> 重建索引。
--
-- 运行（远程）: npx wrangler d1 execute workbench-db --remote --file=scripts/migrate-task-status.sql
-- 运行（本地）: npx wrangler d1 execute workbench-db --local  --file=scripts/migrate-task-status.sql
--
-- 事务说明：D1 远程执行禁止显式 BEGIN TRANSACTION / COMMIT，会以「自动原子
--   事务」包裹整个批次（异常自动回滚），故本脚本不使用显式事务语句。
-- =============================================

-- 1. 备份子表数据（CTAS：不含外键，纯数据快照）
CREATE TABLE task_dependencies_bak AS SELECT * FROM task_dependencies;
CREATE TABLE task_images_bak       AS SELECT * FROM task_images;

-- 2. 暂存旧 tasks 全量数据（CTAS：不含外键/CHECK，保留 parent_id 与旧 status）
CREATE TABLE tasks_stage AS SELECT * FROM tasks;

-- 3. 删除旧表：先解除 tasks 自引用，再删子表与 tasks（tasks_stage 无外键，不阻塞）
UPDATE tasks SET parent_id = NULL;
DROP TABLE task_dependencies;
DROP TABLE task_images;
DROP TABLE tasks;

-- 4. 按新 schema 重建 tasks（新 CHECK + 自引用 parent_id 外键）
CREATE TABLE tasks (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT '待开始'
                    CHECK (status IN ('待开始','进行中','已完成','已放弃','已逾期')),
  assignee        TEXT NOT NULL DEFAULT 'dada',
  priority        TEXT NOT NULL DEFAULT 'P2 紧急不重要'
                    CHECK (priority IN ('P0 重要紧急','P1 重要不紧急','P2 紧急不重要','P3 不重要不紧急')),
  task_type       TEXT NOT NULL DEFAULT '未分类',
  parent_id       TEXT REFERENCES tasks(id),
  start_date      TEXT,
  deadline        TEXT,
  completed_time  TEXT,
  email           TEXT,
  unique_id       TEXT,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. 先插入数据并映射状态值（parent_id 暂置空，避免自引用外键的插入顺序问题）
INSERT INTO tasks (
  id, user_id, name, status, assignee, priority, task_type,
  start_date, deadline, completed_time, email, unique_id, notes, created_at, updated_at
)
SELECT
  id, user_id, name,
  CASE status
    WHEN '收集箱' THEN '待开始'
    WHEN '暂停'   THEN '已逾期'
    ELSE status
  END,
  assignee, priority, task_type,
  start_date, deadline, completed_time, email, unique_id, notes, created_at, updated_at
FROM tasks_stage;

-- 6. 回填 parent_id（此时所有行均已存在，自引用外键可解析）
UPDATE tasks
SET parent_id = (SELECT parent_id FROM tasks_stage WHERE tasks_stage.id = tasks.id);

-- 7. 重建子表（恢复外键与级联删除）
CREATE TABLE task_dependencies (
  task_id       TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  blocked_by_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, blocked_by_id)
);
CREATE TABLE task_images (
  id            TEXT PRIMARY KEY,
  task_id       TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  url           TEXT NOT NULL,
  r2_key        TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. 恢复子表数据
INSERT INTO task_dependencies SELECT * FROM task_dependencies_bak;
INSERT INTO task_images       SELECT * FROM task_images_bak;

-- 9. 清理暂存表与备份表
DROP TABLE tasks_stage;
DROP TABLE task_dependencies_bak;
DROP TABLE task_images_bak;

-- 10. 重建索引
CREATE INDEX IF NOT EXISTS idx_tasks_user_status   ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_type     ON tasks(user_id, task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_user_priority ON tasks(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_parent        ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_created  ON tasks(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_deps_blocked_by ON task_dependencies(blocked_by_id);
CREATE INDEX IF NOT EXISTS idx_task_images_task     ON task_images(task_id);
