-- =============================================
-- D1 Schema for Personal Workbench
-- No sessions table - using pure JWT auth
-- =============================================

-- 1. Users (owner + collaborators, pre-built for multi-user)
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','editor','viewer')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Tasks (core, replaces Notion tasks DB)
CREATE TABLE IF NOT EXISTS tasks (
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
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_type ON tasks(user_id, task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_user_priority ON tasks(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_created ON tasks(user_id, created_at);

-- 3. Task dependencies (blocked_by, many-to-many)
CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id       TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  blocked_by_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, blocked_by_id)
);
CREATE INDEX IF NOT EXISTS idx_task_deps_blocked_by ON task_dependencies(blocked_by_id);

-- 4. Task images (R2 storage)
CREATE TABLE IF NOT EXISTS task_images (
  id            TEXT PRIMARY KEY,
  task_id       TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  url           TEXT NOT NULL,
  r2_key        TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_task_images_task ON task_images(task_id);

-- 5. Habits (replaces Notion habits DB)
CREATE TABLE IF NOT EXISTS habits (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  name            TEXT NOT NULL,
  frequency       TEXT NOT NULL DEFAULT '每日'
                    CHECK (frequency IN ('每日','每周','每月','工作日','周末','不定期')),
  status          TEXT NOT NULL DEFAULT '生效'
                    CHECK (status IN ('生效','失效')),
  weekly_target   INTEGER,
  monthly_target  INTEGER,
  start_date      TEXT,
  end_date        TEXT,
  phase           TEXT,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);

-- 6. Daily logs (replaces Notion daily_logs DB)
CREATE TABLE IF NOT EXISTS daily_logs (
  id          TEXT PRIMARY KEY,
  habit_id    TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id),
  title       TEXT,
  log_date    TEXT NOT NULL,
  completed   INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(habit_id, log_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_logs_habit ON daily_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, log_date);

-- 7. Weekly summaries (replaces JSON file storage)
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  week_start    TEXT NOT NULL,
  week_end      TEXT NOT NULL,
  year          INTEGER NOT NULL,
  week_number   INTEGER NOT NULL,
  data          TEXT NOT NULL,
  is_editable   INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, week_start)
);
CREATE INDEX IF NOT EXISTS idx_weekly_user ON weekly_summaries(user_id);

-- 8. Share links (new feature)
CREATE TABLE IF NOT EXISTS share_links (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  token         TEXT NOT NULL UNIQUE,
  resource_type TEXT NOT NULL
                  CHECK (resource_type IN ('task','weekly_summary','habit_dashboard','board')),
  resource_id   TEXT,
  title         TEXT,
  password_hash TEXT,
  expires_at    TEXT,
  view_count    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_share_token ON share_links(token);

-- 9. Activity logs (audit/tracking)
CREATE TABLE IF NOT EXISTS activity_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  metadata    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id, created_at);

-- 10. App config (replaces .env runtime config)
CREATE TABLE IF NOT EXISTS app_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
