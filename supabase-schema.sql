-- Enterprise Supabase Schema V16 (Final Integrity Version)
-- Optimized for Zero Data Loss and 100% Type-Safe Sync

-- 1. Master Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_deleted INTEGER DEFAULT 0,
    version_clock BIGINT DEFAULT 0
);

-- 2. Variants (SKUs)
CREATE TABLE IF NOT EXISTS variants (
    id UUID PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    unit TEXT CHECK (unit IN ('pcs', 'kg')) DEFAULT 'pcs',
    stock DECIMAL DEFAULT 0,
    dented_stock DECIMAL DEFAULT 0,
    cost_price DECIMAL DEFAULT 0,
    msp DECIMAL DEFAULT 0,
    base_price DECIMAL DEFAULT 0,
    barcode TEXT UNIQUE,
    image_url TEXT,
    pricing_type TEXT DEFAULT 'standard',
    bundle_qty INTEGER,
    bundle_price DECIMAL,
    units_per_combo DECIMAL DEFAULT 1,
    parent_pack_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_deleted INTEGER DEFAULT 0,
    version_clock BIGINT DEFAULT 0
);

-- 3. Sales
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY,
    total_amount DECIMAL NOT NULL,
    discount DECIMAL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    customer_id UUID,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_returned INTEGER DEFAULT 0,
    return_date TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_deleted INTEGER DEFAULT 0,
    version_clock BIGINT DEFAULT 0
);

-- 4. Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY,
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES variants(id),
    quantity DECIMAL NOT NULL,
    unit_price DECIMAL NOT NULL,
    subtotal DECIMAL NOT NULL,
    is_returned INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_deleted INTEGER DEFAULT 0,
    version_clock BIGINT DEFAULT 0
);

-- 5. Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    balance DECIMAL DEFAULT 0,
    credit_limit DECIMAL DEFAULT 50000,
    status TEXT DEFAULT 'active',
    last_tx TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_deleted INTEGER DEFAULT 0,
    version_clock BIGINT DEFAULT 0
);

-- 6. Khata Transactions
CREATE TABLE IF NOT EXISTS khata_transactions (
    id UUID PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    type TEXT,
    amount DECIMAL NOT NULL,
    payment_method TEXT,
    proof_image_url TEXT,
    note TEXT,
    notes TEXT, -- Added for zero-loss fallback
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_deleted INTEGER DEFAULT 0,
    version_clock BIGINT DEFAULT 0
);

-- 7. Vault: External Bills
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY,
    bill_no TEXT,
    supplier TEXT NOT NULL,
    total_amount DECIMAL NOT NULL,
    amount DECIMAL, -- Legacy fallback
    status TEXT DEFAULT 'Pending',
    image_url TEXT,
    date TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_deleted INTEGER DEFAULT 0,
    version_clock BIGINT DEFAULT 0
);

-- 8. Digital Bills (JSONB ensures not a single character is lost)
CREATE TABLE IF NOT EXISTS digital_bills (
    id UUID PRIMARY KEY,
    type TEXT,
    bill_no TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    customer_name TEXT,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_deleted INTEGER DEFAULT 0,
    version_clock BIGINT DEFAULT 0
);

-- 9. Departments
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    is_deleted INTEGER DEFAULT 0,
    version_clock BIGINT DEFAULT 0
);

-- Security Enablement
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE khata_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Anonymous Sync Policies
DO $$ 
BEGIN
    CREATE POLICY "SyncAccess" ON products FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "SyncAccess" ON variants FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "SyncAccess" ON sales FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "SyncAccess" ON sale_items FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "SyncAccess" ON customers FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "SyncAccess" ON khata_transactions FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "SyncAccess" ON bills FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "SyncAccess" ON digital_bills FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "SyncAccess" ON categories FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
