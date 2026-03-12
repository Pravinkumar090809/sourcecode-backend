-- =============================================
-- Source Code Selling Platform — Database Setup
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users Table (auth) — must be created BEFORE orders ───
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Products Table ───
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price INTEGER NOT NULL CHECK (price > 0),
  zip_path TEXT,
  thumbnail_url TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Orders Table ───
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  buyer_email TEXT NOT NULL,
  payment_status TEXT DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED')),
  cashfree_order_id TEXT UNIQUE,
  downloads_used INTEGER DEFAULT 0 NOT NULL,
  max_downloads INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Admins Table (optional) ───
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_orders_buyer_email ON orders(buyer_email);
CREATE INDEX IF NOT EXISTS idx_orders_cashfree_order_id ON orders(cashfree_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── Disable RLS (admin-only system) ───
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ─── Create Storage Bucket ───
-- NOTE: Run this separately or create bucket via Supabase Dashboard:
-- Bucket name: source-codes
-- Public: false (private)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('source-codes', 'source-codes', false)
ON CONFLICT (id) DO NOTHING;
