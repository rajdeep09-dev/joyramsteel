# Supabase Database Setup for Joy Ram Steel (Production)

To ensure reliable syncing across multiple devices, follow these steps to update your database schema.

### 1. Execute the SQL Schema
Copy the code block below and paste it into your **Supabase Dashboard** -> **SQL Editor** and click **Run**.

*Note: This script uses `DROP TABLE IF EXISTS` to ensure a clean start with the new `updated_at` and `is_deleted` fields. Back up any real data if necessary.*

```sql
-- CLEANUP
DROP TABLE IF EXISTS sale_items;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS variants;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS khata_transactions;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS bills;

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

-- 2. Variants
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
    date TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'synced'
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

-- 6. Bills
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
    date TEXT NOT NULL,
    proof_image_url TEXT,
    notes TEXT,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'synced'
);
```

### 2. Disable Row Level Security (RLS)
For easiest setup:
1. Go to **Supabase Dashboard** -> **Table Editor**.
2. For **each** of the 7 tables, click the **RLS** badge and select **Disable RLS**.

### 3. Production Verify
- Refresh your site.
- Check the **Sync** indicator in the header (if present).
- Any item updated on one device will now intelligently overwrite older versions on other devices based on the `updated_at` timestamp.
