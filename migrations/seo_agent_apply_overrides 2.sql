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
