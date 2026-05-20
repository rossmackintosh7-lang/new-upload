CREATE TABLE IF NOT EXISTS goose_missions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  project_id TEXT,
  goal TEXT NOT NULL,
  mission_type TEXT DEFAULT 'business_growth',
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  progress INTEGER DEFAULT 0,
  plan_json TEXT DEFAULT '{}',
  summary TEXT,
  created_by TEXT DEFAULT 'customer',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS goose_mission_steps (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  step_index INTEGER DEFAULT 0,
  title TEXT NOT NULL,
  detail TEXT,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'todo',
  action_key TEXT,
  estimated_impact TEXT DEFAULT 'medium',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_goose_missions_user_id ON goose_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_goose_missions_project_id ON goose_missions(project_id);
CREATE INDEX IF NOT EXISTS idx_goose_missions_status ON goose_missions(status);
CREATE INDEX IF NOT EXISTS idx_goose_mission_steps_mission_id ON goose_mission_steps(mission_id);
