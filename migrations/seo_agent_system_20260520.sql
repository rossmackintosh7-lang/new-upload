-- PBI SEO Agent System

CREATE TABLE IF NOT EXISTS seo_audits (
  id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  scope_json TEXT DEFAULT '{}',
  summary_json TEXT DEFAULT '{}',
  pages_scanned INTEGER DEFAULT 0,
  issues_found INTEGER DEFAULT 0,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS seo_page_scores (
  id TEXT PRIMARY KEY,
  audit_id TEXT REFERENCES seo_audits(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  path TEXT,
  title TEXT,
  meta_description TEXT,
  h1 TEXT,
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  word_count INTEGER DEFAULT 0,
  status_code INTEGER DEFAULT 0,
  load_time_ms INTEGER DEFAULT 0,
  issue_counts_json TEXT DEFAULT '{}',
  metrics_json TEXT DEFAULT '{}',
  checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seo_tasks (
  id TEXT PRIMARY KEY,
  audit_id TEXT REFERENCES seo_audits(id) ON DELETE SET NULL,
  page_url TEXT NOT NULL,
  task_type TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  reasoning TEXT NOT NULL,
  estimated_impact TEXT NOT NULL,
  suggested_implementation TEXT NOT NULL,
  fix_payload_json TEXT DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','preview','completed','dismissed')),
  source TEXT DEFAULT 'audit',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  applied_at TEXT
);

CREATE TABLE IF NOT EXISTS seo_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  target_url TEXT,
  intent TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  ranking_position INTEGER,
  click_through_rate REAL,
  impressions INTEGER DEFAULT 0,
  seo_difficulty INTEGER DEFAULT 0,
  search_intent TEXT,
  group_type TEXT DEFAULT 'national',
  last_updated TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seo_internal_links (
  id TEXT PRIMARY KEY,
  audit_id TEXT REFERENCES seo_audits(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  anchor_text TEXT,
  opportunity_type TEXT DEFAULT 'contextual',
  reasoning TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested','approved','applied','dismissed')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seo_content_clusters (
  id TEXT PRIMARY KEY,
  cluster_key TEXT UNIQUE,
  name TEXT NOT NULL,
  topic TEXT,
  intent TEXT,
  pillar_url TEXT,
  supporting_urls_json TEXT DEFAULT '[]',
  content_ideas_json TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','planned','published','archived')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seo_reports (
  id TEXT PRIMARY KEY,
  report_type TEXT DEFAULT 'snapshot',
  period_start TEXT,
  period_end TEXT,
  summary_json TEXT DEFAULT '{}',
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seo_page_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_url TEXT NOT NULL UNIQUE,
  title TEXT,
  meta_description TEXT,
  h1 TEXT,
  canonical TEXT,
  robots TEXT,
  schema_jsonld TEXT,
  content_block_html TEXT,
  internal_links_html TEXT,
  image_alt_text TEXT,
  source_suggestion_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seo_apply_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  suggestion_id INTEGER,
  page_url TEXT,
  action TEXT,
  details_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seo_audits_started ON seo_audits(started_at);
CREATE INDEX IF NOT EXISTS idx_seo_page_scores_url ON seo_page_scores(page_url);
CREATE INDEX IF NOT EXISTS idx_seo_page_scores_audit ON seo_page_scores(audit_id);
CREATE INDEX IF NOT EXISTS idx_seo_tasks_status ON seo_tasks(status);
CREATE INDEX IF NOT EXISTS idx_seo_tasks_page ON seo_tasks(page_url);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_group ON seo_keywords(group_type);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_target ON seo_keywords(target_url);
CREATE INDEX IF NOT EXISTS idx_seo_internal_links_status ON seo_internal_links(status);
CREATE INDEX IF NOT EXISTS idx_seo_internal_links_source ON seo_internal_links(source_url);
CREATE INDEX IF NOT EXISTS idx_seo_content_clusters_key ON seo_content_clusters(cluster_key);
