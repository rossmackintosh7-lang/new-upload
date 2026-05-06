-- PBI User Manager support table. Functions also create this automatically.
CREATE TABLE IF NOT EXISTS admin_user_controls (
  user_id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'active',
  notes TEXT,
  suspended_at TEXT,
  suspended_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_user_controls_status ON admin_user_controls(status);
