CREATE TABLE IF NOT EXISTS pbi_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  project_name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  project_json TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_website_drafts (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  user_id TEXT,
  business_name TEXT NOT NULL,
  business_description TEXT NOT NULL,
  location TEXT,
  tone TEXT,
  goal TEXT,
  audience TEXT,
  generated_json TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_agent_messages (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  user_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pbi_custom_build_enquiries (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  business_name TEXT,
  phone TEXT,
  budget TEXT,
  timeframe TEXT,
  needs TEXT NOT NULL,
  source TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pbi_projects_user_id ON pbi_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_website_drafts_project_id ON ai_website_drafts(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_messages_project_id ON ai_agent_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_pbi_custom_build_enquiries_project_id ON pbi_custom_build_enquiries(project_id);
