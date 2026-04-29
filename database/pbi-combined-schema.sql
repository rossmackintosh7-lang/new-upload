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

-- SEO Agent tables
CREATE TABLE IF NOT EXISTS seo_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  meta_description TEXT,
  h1 TEXT,
  canonical TEXT,
  robots TEXT,
  word_count INTEGER DEFAULT 0,
  status_code INTEGER,
  seo_score INTEGER DEFAULT 0,
  last_checked TEXT
);

CREATE TABLE IF NOT EXISTS seo_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_url TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  issue_text TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seo_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_url TEXT NOT NULL,
  suggestion_type TEXT NOT NULL,
  current_value TEXT,
  suggested_value TEXT,
  reasoning TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seo_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  target_url TEXT,
  intent TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seo_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_date TEXT NOT NULL,
  total_pages INTEGER DEFAULT 0,
  total_issues INTEGER DEFAULT 0,
  average_score INTEGER DEFAULT 0,
  summary TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seo_pages_score ON seo_pages(seo_score);
CREATE INDEX IF NOT EXISTS idx_seo_issues_page_status ON seo_issues(page_url, status);
CREATE INDEX IF NOT EXISTS idx_seo_suggestions_page_status ON seo_suggestions(page_url, status);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_target_url ON seo_keywords(target_url);
