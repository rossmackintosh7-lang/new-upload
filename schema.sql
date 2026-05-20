-- PBI core tables with auth-compatible columns

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  password_salt TEXT,
  email_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT,
  status TEXT DEFAULT 'draft',
  data_json TEXT DEFAULT '{}',
  published INTEGER DEFAULT 0,
  public_slug TEXT,
  plan TEXT DEFAULT 'free_preview',
  billing_status TEXT DEFAULT 'draft',
  domain_option TEXT DEFAULT 'pbi_subdomain',
  custom_domain TEXT,
  published_at TEXT,
  stripe_session_id TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS domains (id TEXT PRIMARY KEY, project_id TEXT, hostname TEXT UNIQUE, status TEXT DEFAULT 'pending', provider_ref TEXT, verification_json TEXT);
CREATE TABLE IF NOT EXISTS publishes (id TEXT PRIMARY KEY, project_id TEXT, status TEXT DEFAULT 'queued', target_hostname TEXT, details_json TEXT);


CREATE TABLE IF NOT EXISTS custom_build_enquiries (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  business_name TEXT,
  main_promotion_goal TEXT,
  status TEXT DEFAULT 'new',
  body_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  user_id TEXT,
  email TEXT,
  type TEXT DEFAULT 'assisted_setup',
  message TEXT,
  status TEXT DEFAULT 'new',
  body_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS site_enquiries (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  site_slug TEXT,
  name TEXT,
  email TEXT,
  message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


-- SEO Agent operations schema
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

-- SEO Agent approval/apply layer
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


-- Retail V5 starter tables
CREATE TABLE IF NOT EXISTS retail_orders (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  user_id TEXT,
  site_slug TEXT,
  customer_email TEXT,
  customer_name TEXT,
  status TEXT DEFAULT 'pending',
  currency TEXT DEFAULT 'gbp',
  subtotal_minor INTEGER DEFAULT 0,
  shipping_minor INTEGER DEFAULT 0,
  tax_minor INTEGER DEFAULT 0,
  total_minor INTEGER DEFAULT 0,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  body_json TEXT,
  items_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS retail_order_events (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  event_type TEXT,
  body_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


-- Retail Stripe Connect automation
CREATE TABLE IF NOT EXISTS retail_connect_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  email TEXT,
  stripe_account_id TEXT NOT NULL UNIQUE,
  country TEXT DEFAULT 'GB',
  business_type TEXT DEFAULT 'company',
  charges_enabled INTEGER DEFAULT 0,
  payouts_enabled INTEGER DEFAULT 0,
  details_submitted INTEGER DEFAULT 0,
  onboarding_complete INTEGER DEFAULT 0,
  capabilities_json TEXT DEFAULT '{}',
  requirements_json TEXT DEFAULT '{}',
  last_project_id TEXT,
  status TEXT DEFAULT 'created',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_retail_connect_accounts_user_id ON retail_connect_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_retail_connect_accounts_stripe_account_id ON retail_connect_accounts(stripe_account_id);


-- Paid logo creation requests

CREATE TABLE IF NOT EXISTS logo_creation_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  user_id TEXT,
  business_name TEXT,
  logo_package TEXT DEFAULT 'standard',
  logo_brief TEXT,
  logo_style TEXT,
  logo_colours TEXT,
  status TEXT DEFAULT 'draft',
  stripe_session_id TEXT,
  body_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);


-- Goose goal-driven mission planning
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
