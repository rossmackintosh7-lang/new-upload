CREATE TABLE IF NOT EXISTS published_sites (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  site_slug TEXT NOT NULL UNIQUE,
  default_hostname TEXT,
  custom_domain TEXT,
  primary_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  plan TEXT NOT NULL DEFAULT 'starter',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_checkout_session_id TEXT,
  payment_status TEXT DEFAULT 'unpaid',
  readiness_score INTEGER DEFAULT 0,
  latest_deployment_id TEXT,
  last_deploy_hash TEXT,
  primary_domain TEXT,
  seo_title TEXT,
  seo_description TEXT,
  published_at TEXT,
  unpublished_at TEXT,
  suspended_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_published_sites_project_id ON published_sites(project_id);
CREATE INDEX IF NOT EXISTS idx_published_sites_user_id ON published_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_published_sites_status ON published_sites(status);
CREATE INDEX IF NOT EXISTS idx_published_sites_subscription ON published_sites(stripe_subscription_id);

CREATE TABLE IF NOT EXISTS site_domains (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  domain_name TEXT,
  hostname_type TEXT DEFAULT 'custom',
  domain_type TEXT DEFAULT 'custom',
  status TEXT DEFAULT 'pending_dns',
  ssl_status TEXT DEFAULT 'pending',
  verification_token TEXT,
  cloudflare_hostname_id TEXT,
  dns_target TEXT,
  is_primary INTEGER DEFAULT 0,
  verification_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_domains_domain ON site_domains(domain);
CREATE INDEX IF NOT EXISTS idx_site_domains_domain_name ON site_domains(domain_name);
CREATE INDEX IF NOT EXISTS idx_site_domains_site_id ON site_domains(site_id);

CREATE TABLE IF NOT EXISTS site_deployments (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  deploy_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter',
  status TEXT DEFAULT 'created',
  notes TEXT,
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_deployments_site_id ON site_deployments(site_id);
CREATE INDEX IF NOT EXISTS idx_site_deployments_project_id ON site_deployments(project_id);

CREATE TABLE IF NOT EXISTS site_events (
  id TEXT PRIMARY KEY,
  site_id TEXT,
  project_id TEXT,
  user_id TEXT,
  event_type TEXT NOT NULL,
  message TEXT,
  data_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_events_site_id ON site_events(site_id);
CREATE INDEX IF NOT EXISTS idx_site_events_project_id ON site_events(project_id);
CREATE INDEX IF NOT EXISTS idx_site_events_event_type ON site_events(event_type);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  project_id TEXT,
  site_id TEXT,
  filename TEXT,
  content_type TEXT,
  size INTEGER DEFAULT 0,
  url TEXT,
  alt TEXT,
  storage_key TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_assets_project_id ON media_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_site_id ON media_assets(site_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON media_assets(user_id);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  site_id TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  source TEXT,
  data_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_project_id ON leads(project_id);
CREATE INDEX IF NOT EXISTS idx_leads_site_id ON leads(site_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  site_id TEXT,
  event_name TEXT,
  path TEXT,
  visitor_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  data_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_project_id ON analytics_events(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_site_id ON analytics_events(site_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
