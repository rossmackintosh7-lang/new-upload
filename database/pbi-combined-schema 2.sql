-- PBI combined schema: original + AI Agent + SEO Agent

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


-- AI Website Agent tables
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
CREATE TABLE IF NOT EXISTS seo_pages (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL UNIQUE, title TEXT, meta_description TEXT, h1 TEXT, canonical TEXT, robots TEXT, word_count INTEGER DEFAULT 0, status_code INTEGER, seo_score INTEGER DEFAULT 0, last_checked TEXT);
CREATE TABLE IF NOT EXISTS seo_issues (id INTEGER PRIMARY KEY AUTOINCREMENT, page_url TEXT NOT NULL, issue_type TEXT NOT NULL, issue_text TEXT NOT NULL, severity TEXT DEFAULT 'medium', status TEXT DEFAULT 'open', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS seo_suggestions (id INTEGER PRIMARY KEY AUTOINCREMENT, page_url TEXT NOT NULL, suggestion_type TEXT NOT NULL, current_value TEXT, suggested_value TEXT, reasoning TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS seo_keywords (id INTEGER PRIMARY KEY AUTOINCREMENT, keyword TEXT NOT NULL, target_url TEXT, intent TEXT, priority TEXT DEFAULT 'medium', status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS seo_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, report_date TEXT NOT NULL, total_pages INTEGER DEFAULT 0, total_issues INTEGER DEFAULT 0, average_score INTEGER DEFAULT 0, summary TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS site_enquiries (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  site_slug TEXT,
  name TEXT,
  email TEXT,
  message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


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
  source_suggestion_id INTEGER,
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


-- PBI analytics starter

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  site_slug TEXT,
  event_type TEXT,
  page_path TEXT,
  referrer TEXT,
  user_agent TEXT,
  body_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_project_id ON analytics_events(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_site_slug ON analytics_events(site_slug);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
