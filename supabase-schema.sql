-- Supabase Schema for Joy Ram Steel POS (VyaparSyncDB)

-- 1. Products Table
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    gst_rate NUMERIC DEFAULT 18,
    created_at TEXT NOT NULL
);

-- 2. Variants Table
CREATE TABLE variants (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    stock NUMERIC NOT NULL DEFAULT 0,
    dented_stock NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    base_price NUMERIC NOT NULL DEFAULT 0,
    msp NUMERIC NOT NULL DEFAULT 0,
    barcode TEXT,
    image_url TEXT,
    created_at TEXT NOT NULL
);

-- 3. Customers Table
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    last_tx TEXT NOT NULL,
    status TEXT NOT NULL
);

-- 4. Sales Table
CREATE TABLE sales (
    id TEXT PRIMARY KEY,
    total_amount NUMERIC NOT NULL,
    discount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    split_cash NUMERIC,
    split_upi NUMERIC,
    split_khata NUMERIC,
    customer_id TEXT REFERENCES customers(id),
    date TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'synced'
);

-- 5. Sale Items Table
CREATE TABLE sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT REFERENCES sales(id) ON DELETE CASCADE,
    variant_id TEXT REFERENCES variants(id),
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    subtotal NUMERIC NOT NULL
);

-- 6. Bills Table
CREATE TABLE bills (
    id TEXT PRIMARY KEY,
    supplier TEXT NOT NULL,
    date TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL,
    image_url TEXT
);

-- 7. Khata Transactions Table
CREATE TABLE khata_transactions (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    date TEXT NOT NULL,
    proof_image_url TEXT,
    notes TEXT,
    sync_status TEXT NOT NULL DEFAULT 'synced'
);

-- Enable Row Level Security (Optional but recommended)
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE khata_transactions ENABLE ROW LEVEL SECURITY;
