-- Retail V5 starter tables
CREATE TABLE IF NOT EXISTS retail_orders (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  user_id TEXT,
  site_slug TEXT,
  customer_email TEXT,
  customer_name TEXT,
  status TEXT DEFAULT 'pending',
  currency TEXT DEFAULT 'gbp',
  subtotal_minor INTEGER DEFAULT 0,
  shipping_minor INTEGER DEFAULT 0,
  tax_minor INTEGER DEFAULT 0,
  total_minor INTEGER DEFAULT 0,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  body_json TEXT,
  items_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS retail_order_events (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  event_type TEXT,
  body_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
