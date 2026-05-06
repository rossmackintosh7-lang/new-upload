-- Retail Stripe Connect automation
CREATE TABLE IF NOT EXISTS retail_connect_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  email TEXT,
  stripe_account_id TEXT NOT NULL UNIQUE,
  country TEXT DEFAULT 'GB',
  business_type TEXT DEFAULT 'company',
  charges_enabled INTEGER DEFAULT 0,
  payouts_enabled INTEGER DEFAULT 0,
  details_submitted INTEGER DEFAULT 0,
  onboarding_complete INTEGER DEFAULT 0,
  capabilities_json TEXT DEFAULT '{}',
  requirements_json TEXT DEFAULT '{}',
  last_project_id TEXT,
  status TEXT DEFAULT 'created',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_retail_connect_accounts_user_id ON retail_connect_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_retail_connect_accounts_stripe_account_id ON retail_connect_accounts(stripe_account_id);
