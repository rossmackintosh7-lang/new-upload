
CREATE TABLE IF NOT EXISTS published_project_sections (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  section_order INTEGER DEFAULT 0,
  section_type TEXT NOT NULL,
  title TEXT,
  text TEXT,
  button TEXT,
  image TEXT,
  layout TEXT DEFAULT 'standard',
  background TEXT DEFAULT '#fff8f1',
  accent TEXT DEFAULT '#bf5c29',
  padding TEXT DEFAULT 'comfortable',
  align TEXT DEFAULT 'left',
  hidden INTEGER DEFAULT 0,
  body_json TEXT,
  published_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_published_project_sections_project_id ON published_project_sections(project_id);
