-- FINAL PRODUCTION SCHEMA (v8) for Joy Ram Steel (VyaparSyncDB)
-- Run this in your Supabase SQL Editor to RESET your database.

-- Clean start
DROP TABLE IF EXISTS digital_bills CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS khata_transactions CASCADE;
DROP TABLE IF EXISTS variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS bills CASCADE;

-- 1. Products
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    gst_rate NUMERIC DEFAULT 18,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0
);

-- 2. Variants (Size/Weight)
CREATE TABLE variants (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    unit TEXT DEFAULT 'pcs',
    stock NUMERIC NOT NULL DEFAULT 0,
    dented_stock NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    base_price NUMERIC NOT NULL DEFAULT 0,
    msp NUMERIC NOT NULL DEFAULT 0,
    barcode TEXT,
    image_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0
);

-- 3. Customers
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    last_tx TEXT NOT NULL,
    status TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0
);

-- 4. Sales
CREATE TABLE sales (
    id TEXT PRIMARY KEY,
    total_amount NUMERIC NOT NULL,
    discount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    split_cash NUMERIC,
    split_upi NUMERIC,
    split_khata NUMERIC,
    customer_id TEXT REFERENCES customers(id),
    date TEXT NOT NULL, -- ISO STRING
    updated_at TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0
);

-- 5. Sale Items
CREATE TABLE sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT REFERENCES sales(id) ON DELETE CASCADE,
    variant_id TEXT REFERENCES variants(id),
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    subtotal NUMERIC NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0
);

-- 6. Bills (GST Vault)
CREATE TABLE bills (
    id TEXT PRIMARY KEY,
    supplier TEXT NOT NULL,
    date TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL,
    image_url TEXT,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0
);

-- 7. Khata Transactions
CREATE TABLE khata_transactions (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    date TEXT NOT NULL, -- ISO STRING
    proof_image_url TEXT,
    notes TEXT,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0
);

-- 8. Digital Bills (Saved GST/eWay History)
CREATE TABLE digital_bills (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'gst' or 'eway'
    bill_no TEXT,
    customer_name TEXT,
    date TEXT NOT NULL, -- ISO STRING
    data TEXT NOT NULL, -- Full JSON
    updated_at TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0
);

-- Disable Row Level Security (RLS)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE khata_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE digital_bills DISABLE ROW LEVEL SECURITY;
