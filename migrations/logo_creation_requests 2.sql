
CREATE TABLE IF NOT EXISTS logo_creation_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  user_id TEXT,
  business_name TEXT,
  logo_brief TEXT,
  logo_style TEXT,
  logo_colours TEXT,
  status TEXT DEFAULT 'draft',
  stripe_session_id TEXT,
  body_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
