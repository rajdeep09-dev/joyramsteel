import Dexie, { type EntityTable } from 'dexie';

export interface Product {
  id: string;
  name: string;
  category: string;
  image_url?: string;
  gst_rate?: number;
  created_at: string;
  updated_at: string;
  is_deleted: number; // 0 or 1 for soft delete
}

export interface Variant {
  id: string;
  product_id: string;
  size: string;
  unit: 'pcs' | 'kg';
  stock: number;
  dented_stock: number;
  cost_price: number;
  base_price: number;
  msp: number;
  barcode?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  is_deleted: number;
}

export interface Sale {
  id: string;
  total_amount: number;
  discount: number;
  payment_method: 'cash' | 'upi' | 'khata' | 'split';
  split_cash?: number;
  split_upi?: number;
  split_khata?: number;
  customer_id?: string;
  date: string;
  updated_at: string;
  sync_status: 'pending' | 'synced';
  is_deleted: number;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  updated_at: string;
  is_deleted: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  last_tx: string;
  status: 'Overdue' | 'Recent' | 'Clear';
  updated_at: string;
  is_deleted: number;
}

export interface KhataTransaction {
  id: string;
  customer_id: string;
  amount: number;
  type: 'payment_received' | 'credit_given';
  payment_method: 'cash' | 'upi' | 'bank_transfer' | 'other';
  date: string;
  proof_image_url?: string;
  notes?: string;
  sync_status: 'pending' | 'synced';
  updated_at: string;
  is_deleted: number;
}

export interface Bill {
  id: string;
  supplier: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending';
  image_url?: string;
  updated_at: string;
  is_deleted: number;
}

const db = new Dexie('VyaparSyncDB') as Dexie & {
  products: EntityTable<Product, 'id'>;
  variants: EntityTable<Variant, 'id'>;
  sales: EntityTable<Sale, 'id'>;
  sale_items: EntityTable<SaleItem, 'id'>;
  customers: EntityTable<Customer, 'id'>;
  khata_transactions: EntityTable<KhataTransaction, 'id'>;
  bills: EntityTable<Bill, 'id'>;
};

db.version(6).stores({
  products: 'id, name, category, updated_at, is_deleted', 
  variants: 'id, product_id, size, barcode, updated_at, is_deleted, unit', 
  sales: 'id, date, sync_status, updated_at, is_deleted',
  sale_items: 'id, sale_id, variant_id, updated_at, is_deleted',
  customers: 'id, name, phone, status, updated_at, is_deleted',
  khata_transactions: 'id, customer_id, date, sync_status, updated_at, is_deleted',
  bills: 'id, supplier, status, updated_at, is_deleted'
});

export const seedDatabase = async () => {
  const productsCount = await db.products.count();
  const now = new Date().toISOString();
  if (productsCount === 0) {
    await db.products.bulkAdd([
      { id: "p1", name: "Blue Diamond Bucket", category: "Buckets", image_url: "https://images.unsplash.com/photo-1584346133934-a3afd2a33c4c?w=400&q=80", created_at: now, updated_at: now, is_deleted: 0 },
      { id: "p2", name: "3-Tier Steel Tiffin", category: "Tiffins", image_url: "https://images.unsplash.com/photo-1596484552993-9c8646394bb5?w=400&q=80", created_at: now, updated_at: now, is_deleted: 0 }
    ]);
    await db.variants.bulkAdd([
      { id: "v1", product_id: "p1", size: "Size 14", unit: 'pcs', stock: 12, dented_stock: 2, cost_price: 150, msp: 150, base_price: 200, created_at: now, updated_at: now, is_deleted: 0 },
      { id: "v2", product_id: "p1", size: "Size 16", unit: 'pcs', stock: 8, dented_stock: 0, cost_price: 180, msp: 180, base_price: 250, created_at: now, updated_at: now, is_deleted: 0 },
      { id: "v3", product_id: "p1", size: "Size 18", unit: 'pcs', stock: 3, dented_stock: 1, cost_price: 220, msp: 220, base_price: 300, created_at: now, updated_at: now, is_deleted: 0 },
      { id: "v4", product_id: "p2", size: "Standard", unit: 'pcs', stock: 24, dented_stock: 0, cost_price: 300, msp: 300, base_price: 450, created_at: now, updated_at: now, is_deleted: 0 },
      { id: "v5", product_id: "p2", size: "Large", unit: 'pcs', stock: 15, dented_stock: 3, cost_price: 400, msp: 400, base_price: 600, created_at: now, updated_at: now, is_deleted: 0 }
    ]);
  }

  const customersCount = await db.customers.count();
  if (customersCount === 0) {
    await db.customers.bulkAdd([
      { id: "c1", name: "Ramesh Steel Traders", phone: "+91 9876543210", balance: 14500, last_tx: "2 Days ago", status: "Overdue", updated_at: now, is_deleted: 0 },
      { id: "c2", name: "Hotel Grand Blue", phone: "+91 9876543211", balance: 45000, last_tx: "1 Week ago", status: "Overdue", updated_at: now, is_deleted: 0 },
      { id: "c3", name: "Local Wedding Event", phone: "+91 9876543212", balance: 8000, last_tx: "Today", status: "Recent", updated_at: now, is_deleted: 0 },
      { id: "c4", name: "Vikash Enterprises", phone: "+91 9876543213", balance: 2500, last_tx: "Yesterday", status: "Recent", updated_at: now, is_deleted: 0 },
    ]);
  }

  const billsCount = await db.bills.count();
  if (billsCount === 0) {
    await db.bills.bulkAdd([
      { id: "B-2023-01", supplier: "Global Steel Mfg", date: "24 Oct 2023", amount: 145000, status: "Paid", updated_at: now, is_deleted: 0 },
      { id: "B-2023-02", supplier: "Premier Plastics", date: "26 Oct 2023", amount: 32000, status: "Pending", updated_at: now, is_deleted: 0 },
      { id: "B-2023-03", supplier: "Milton Distributors", date: "28 Oct 2023", amount: 89000, status: "Paid", updated_at: now, is_deleted: 0 },
      { id: "B-2023-04", supplier: "Vikash Steel Distributors", date: "29 Oct 2023", amount: 45000, status: "Pending", updated_at: now, is_deleted: 0 },
    ]);
  }
};

if (typeof window !== 'undefined') {
  seedDatabase();
}

export { db };
