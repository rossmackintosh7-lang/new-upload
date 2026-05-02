-- Paste this into Cloudflare D1 Console.
-- Do not paste the npx wrangler command into the SQL Console.

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

-- Run this next ONLY if PRAGMA table_info(logo_creation_requests);
-- does not show a logo_package column.
-- If it says duplicate column name, it is already done.
ALTER TABLE logo_creation_requests ADD COLUMN logo_package TEXT DEFAULT 'standard';

CREATE INDEX IF NOT EXISTS idx_logo_creation_requests_project_id
ON logo_creation_requests(project_id);

CREATE INDEX IF NOT EXISTS idx_logo_creation_requests_user_id
ON logo_creation_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_logo_creation_requests_status
ON logo_creation_requests(status);
