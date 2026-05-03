
-- PBI Core Platform V2 tables

CREATE TABLE IF NOT EXISTS project_canvas (
  project_id TEXT PRIMARY KEY,
  user_id TEXT,
  canvas_json TEXT NOT NULL,
  published_json TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_project_canvas_user_id ON project_canvas(user_id);
CREATE INDEX IF NOT EXISTS idx_project_canvas_status ON project_canvas(status);

CREATE TABLE IF NOT EXISTS project_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT,
  label TEXT,
  source TEXT DEFAULT 'builder',
  body_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_versions_user_id ON project_versions(user_id);

CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  user_id TEXT,
  generation_type TEXT,
  prompt TEXT,
  response_json TEXT,
  status TEXT DEFAULT 'complete',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_project_id ON ai_generation_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user_id ON ai_generation_logs(user_id);

CREATE TABLE IF NOT EXISTS domain_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  user_id TEXT,
  domain TEXT,
  task_type TEXT,
  status TEXT DEFAULT 'open',
  notes TEXT,
  body_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_domain_tasks_project_id ON domain_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_domain_tasks_status ON domain_tasks(status);

CREATE TABLE IF NOT EXISTS retail_product_categories (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_retail_product_categories_project_id ON retail_product_categories(project_id);

CREATE TABLE IF NOT EXISTS retail_product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  name TEXT,
  sku TEXT,
  price_pence INTEGER,
  stock INTEGER DEFAULT 0,
  body_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_retail_product_variants_project_id ON retail_product_variants(project_id);
CREATE INDEX IF NOT EXISTS idx_retail_product_variants_product_id ON retail_product_variants(product_id);
