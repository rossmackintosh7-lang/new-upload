CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT, password_salt TEXT);
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT, expires_at TEXT);
CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, status TEXT DEFAULT 'draft', data_json TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS domains (id TEXT PRIMARY KEY, project_id TEXT, hostname TEXT UNIQUE, status TEXT DEFAULT 'pending', provider_ref TEXT, verification_json TEXT);
CREATE TABLE IF NOT EXISTS publishes (id TEXT PRIMARY KEY, project_id TEXT, status TEXT DEFAULT 'queued', target_hostname TEXT, details_json TEXT);
