-- =============================================
-- Admin Dashboard Tables — Run in Supabase SQL Editor
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Reviews Table ───
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_title TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Coupons Table ───
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount INTEGER NOT NULL CHECK (discount > 0),
  type TEXT NOT NULL CHECK (type IN ('percent', 'flat')),
  uses INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 999,
  active BOOLEAN DEFAULT true,
  expiry DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Refunds Table ───
CREATE TABLE IF NOT EXISTS refunds (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Support Tickets Table ───
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT DEFAULT '',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'closed')),
  admin_reply TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Activity Logs Table ───
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT DEFAULT 'System',
  details TEXT DEFAULT '',
  type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Download Logs Table ───
CREATE TABLE IF NOT EXISTS download_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_name TEXT DEFAULT '',
  user_email TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_title TEXT DEFAULT '',
  file_name TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Settings Table (key-value) ───
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Insert default settings ───
INSERT INTO settings (key, value) VALUES
  ('site_name', 'SourceCode Store'),
  ('site_description', 'Premium source code marketplace'),
  ('admin_email', 'admin@sourcecode.com'),
  ('currency', 'INR'),
  ('tax_rate', '18'),
  ('maintenance_mode', 'false'),
  ('signup_enabled', 'true'),
  ('reviews_enabled', 'true'),
  ('max_upload_size', '50'),
  ('download_expiry', '72'),
  ('payment_qr_code_url', ''),
  ('payment_qr_image_path', ''),
  ('payment_upi_id', ''),
  ('payment_instructions', 'QR scan karke payment karein aur UTR number submit karein. Payment admin verify hone ke baad approve hoga.'),
  ('seo_title', 'SourceCode Store - Premium Source Code Marketplace'),
  ('seo_description', 'Buy premium source code, templates, and scripts for web, mobile, and backend projects.'),
  ('seo_keywords', 'source code, buy code, web templates, mobile app source, react, node.js, flutter'),
  ('seo_canonical', 'https://sourcecodestore.com'),
  ('seo_robots', 'index, follow'),
  ('seo_og_image', ''),
  ('seo_google_analytics', ''),
  ('seo_sitemap', 'true'),
  ('security_two_factor', 'false'),
  ('security_ip_whitelist', ''),
  ('security_session_timeout', '60'),
  ('security_max_login_attempts', '5'),
  ('security_force_https', 'true'),
  ('security_rate_limiting', 'true'),
  ('security_csrf_protection', 'true'),
  ('security_cors_origins', 'https://sourcecodestore.com'),
  ('email_welcome_active', 'true'),
  ('email_welcome_subject', 'Welcome to SourceCode Store!'),
  ('email_order_confirmation_active', 'true'),
  ('email_order_confirmation_subject', 'Your order has been confirmed'),
  ('email_payment_success_active', 'true'),
  ('email_payment_success_subject', 'Payment received successfully'),
  ('email_download_ready_active', 'true'),
  ('email_download_ready_subject', 'Your download link is ready'),
  ('email_password_reset_active', 'false'),
  ('email_password_reset_subject', 'Reset your password'),
  ('email_refund_processed_active', 'false'),
  ('email_refund_processed_subject', 'Your refund has been processed')
ON CONFLICT (key) DO NOTHING;

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_email ON reviews(user_email);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_download_logs_created_at ON download_logs(created_at DESC);

-- ─── Disable RLS ───
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE refunds DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE download_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
