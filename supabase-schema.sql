-- ENTERPRISE V13 FINAL SQL SCHEMA
-- Run this in Supabase SQL Editor for a 100% Clean Sync

-- 1. DROP EXISTING (ONLY IF YOU WANT A TOTAL WIPE)
DROP TABLE IF EXISTS digital_bills;
DROP TABLE IF EXISTS bills;
DROP TABLE IF EXISTS khata_transactions;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS sale_items;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS variants;
DROP TABLE IF EXISTS products;

-- 2. CREATE TABLES
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  image_url TEXT,
  gst_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted INTEGER DEFAULT 0,
  version_clock BIGINT DEFAULT 0
);

CREATE TABLE variants (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  size TEXT,
  unit TEXT CHECK (unit IN ('pcs', 'kg')),
  stock NUMERIC DEFAULT 0,
  dented_stock NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  base_price NUMERIC DEFAULT 0,
  msp NUMERIC DEFAULT 0,
  barcode TEXT,
  image_url TEXT,
  pricing_type TEXT CHECK (pricing_type IN ('standard', 'bundle')) DEFAULT 'standard',
  bundle_qty INTEGER,
  bundle_price NUMERIC,
  units_per_combo INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted INTEGER DEFAULT 0,
  version_clock BIGINT DEFAULT 0
);

CREATE TABLE sales (
  id UUID PRIMARY KEY,
  total_amount NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  payment_method TEXT,
  customer_id UUID,
  date TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted INTEGER DEFAULT 0,
  is_returned INTEGER DEFAULT 0,
  return_date TIMESTAMPTZ,
  version_clock BIGINT DEFAULT 0
);

CREATE TABLE sale_items (
  id UUID PRIMARY KEY,
  sale_id UUID REFERENCES sales(id),
  variant_id UUID REFERENCES variants(id),
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted INTEGER DEFAULT 0,
  is_returned INTEGER DEFAULT 0,
  version_clock BIGINT DEFAULT 0
);

CREATE TABLE customers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  balance NUMERIC DEFAULT 0,
  last_tx TEXT,
  status TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted INTEGER DEFAULT 0,
  version_clock BIGINT DEFAULT 0
);

CREATE TABLE khata_transactions (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  amount NUMERIC NOT NULL,
  type TEXT,
  payment_method TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  proof_image_url TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted INTEGER DEFAULT 0,
  version_clock BIGINT DEFAULT 0
);

CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  supplier TEXT NOT NULL,
  date TEXT,
  amount NUMERIC NOT NULL,
  status TEXT,
  image_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted INTEGER DEFAULT 0,
  version_clock BIGINT DEFAULT 0
);

CREATE TABLE digital_bills (
  id TEXT PRIMARY KEY,
  type TEXT,
  bill_no TEXT,
  date TEXT,
  customer_name TEXT,
  data TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted INTEGER DEFAULT 0,
  version_clock BIGINT DEFAULT 0
);

-- 3. ENABLE REALTIME (Optional but recommended)
alter publication supabase_realtime add table products, variants, sales, sale_items, customers, khata_transactions, bills, digital_bills;
