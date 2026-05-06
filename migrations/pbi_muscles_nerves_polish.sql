-- PBI muscles/nerves polish schema additions
ALTER TABLE projects ADD COLUMN readiness_score INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN package_warnings TEXT DEFAULT '[]';
ALTER TABLE projects ADD COLUMN last_validated_at TEXT;
ALTER TABLE projects ADD COLUMN staging_slug TEXT;
ALTER TABLE projects ADD COLUMN unpublished_at TEXT;

CREATE TABLE IF NOT EXISTS project_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  user_id TEXT,
  plan TEXT,
  data_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cms_items (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  user_id TEXT,
  type TEXT,
  title TEXT,
  slug TEXT,
  status TEXT DEFAULT 'draft',
  body TEXT,
  excerpt TEXT,
  seo_title TEXT,
  seo_description TEXT,
  data_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  project_id TEXT,
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

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  event_name TEXT,
  path TEXT,
  data_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS retail_products (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  user_id TEXT,
  name TEXT,
  price INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 0,
  image TEXT,
  status TEXT DEFAULT 'active',
  data_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
