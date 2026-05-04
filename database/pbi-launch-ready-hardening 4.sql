-- PBI launch-ready hardening: payment-safe canvas publishing, public-only renderer, CMS pages and collaboration permissions.

CREATE TABLE IF NOT EXISTS project_canvas (
  project_id TEXT PRIMARY KEY,
  user_id TEXT,
  canvas_json TEXT NOT NULL,
  cms_json TEXT DEFAULT '[]',
  collaboration_json TEXT DEFAULT '{}',
  published_json TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS project_cms_entries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT DEFAULT 'blog',
  title TEXT,
  slug TEXT,
  status TEXT DEFAULT 'draft',
  body TEXT,
  excerpt TEXT,
  image TEXT,
  seo_title TEXT,
  seo_description TEXT,
  data_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS project_collaborators (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'editor',
  status TEXT DEFAULT 'invited',
  invite_token TEXT,
  invited_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  accepted_at TEXT
);

CREATE TABLE IF NOT EXISTS project_presence (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT,
  page TEXT,
  block TEXT,
  seen_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_collab_notes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  page TEXT,
  text TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_cms_project_user ON project_cms_entries(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_project_cms_public ON project_cms_entries(project_id, type, slug, status);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_project ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_email ON project_collaborators(email);
CREATE INDEX IF NOT EXISTS idx_project_presence_project ON project_presence(project_id, seen_at);
CREATE INDEX IF NOT EXISTS idx_project_notes_project ON project_collab_notes(project_id, created_at);
