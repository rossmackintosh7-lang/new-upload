
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
