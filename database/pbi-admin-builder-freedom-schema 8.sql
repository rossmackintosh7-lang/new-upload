
-- PBI Admin + Builder Freedom Upgrade
CREATE TABLE IF NOT EXISTS admin_notifications (id TEXT PRIMARY KEY,type TEXT NOT NULL,title TEXT NOT NULL,message TEXT,status TEXT DEFAULT 'new',priority TEXT DEFAULT 'normal',customer_email TEXT,project_id TEXT,request_id TEXT,body_json TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,read_at TEXT);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_status ON admin_notifications(status);
CREATE TABLE IF NOT EXISTS admin_requests (id TEXT PRIMARY KEY,request_type TEXT NOT NULL,status TEXT DEFAULT 'new',priority TEXT DEFAULT 'normal',customer_name TEXT,customer_email TEXT,customer_phone TEXT,business_name TEXT,business_type TEXT,project_id TEXT,package_name TEXT,payment_status TEXT DEFAULT 'unknown',brief TEXT,requested_pages TEXT,uploaded_assets_json TEXT,internal_notes TEXT,customer_message TEXT,body_json TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_admin_requests_status ON admin_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_requests_project_id ON admin_requests(project_id);
CREATE TABLE IF NOT EXISTS admin_project_notes (id TEXT PRIMARY KEY,project_id TEXT NOT NULL,request_id TEXT,note TEXT NOT NULL,created_by TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_admin_project_notes_project_id ON admin_project_notes(project_id);
CREATE TABLE IF NOT EXISTS project_sections (id TEXT PRIMARY KEY,project_id TEXT NOT NULL,section_order INTEGER DEFAULT 0,section_type TEXT NOT NULL,title TEXT,text TEXT,button TEXT,image TEXT,layout TEXT DEFAULT 'standard',background TEXT DEFAULT '#fff8f1',accent TEXT DEFAULT '#bf5c29',padding TEXT DEFAULT 'comfortable',align TEXT DEFAULT 'left',hidden INTEGER DEFAULT 0,body_json TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_project_sections_project_id ON project_sections(project_id);
CREATE TABLE IF NOT EXISTS admin_audit_log (id TEXT PRIMARY KEY,admin_email TEXT,action TEXT NOT NULL,project_id TEXT,request_id TEXT,body_json TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
