import Dexie, { type EntityTable } from 'dexie';

export interface Product {
  id: string;
  name: string;
  category: string;
  image_url?: string;
  gst_rate?: number;
  created_at: string;
  updated_at: string;
  is_deleted: number;
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

export interface DigitalBill {
  id: string;
  type: 'gst' | 'eway';
  bill_no: string;
  date: string;
  customer_name: string;
  data: string;
  updated_at: string;
  is_deleted: number;
  sync_status: 'pending' | 'synced';
}

const db = new Dexie('VyaparSyncDB') as Dexie & {
  products: EntityTable<Product, 'id'>;
  variants: EntityTable<Variant, 'id'>;
  sales: EntityTable<Sale, 'id'>;
  sale_items: EntityTable<SaleItem, 'id'>;
  customers: EntityTable<Customer, 'id'>;
  khata_transactions: EntityTable<KhataTransaction, 'id'>;
  bills: EntityTable<Bill, 'id'>;
  digital_bills: EntityTable<DigitalBill, 'id'>;
};

// V8: Added updated_at and sync_status to all indexes for robust cloud sync
db.version(8).stores({
  products: 'id, name, category, updated_at, is_deleted', 
  variants: 'id, product_id, size, barcode, updated_at, is_deleted, unit', 
  sales: 'id, date, sync_status, updated_at, is_deleted',
  sale_items: 'id, sale_id, variant_id, updated_at, is_deleted',
  customers: 'id, name, phone, status, updated_at, is_deleted',
  khata_transactions: 'id, customer_id, date, sync_status, updated_at, is_deleted',
  bills: 'id, supplier, status, updated_at, is_deleted',
  digital_bills: 'id, type, bill_no, customer_name, date, sync_status, updated_at, is_deleted'
});

db.on('versionchange', function() {
  db.close();
  if (typeof window !== 'undefined') window.location.reload();
});

export const seedDatabase = async () => {
  try {
    const productsCount = await db.products.count();
    if (productsCount === 0) {
      console.log("Fresh database detected.");
    }
  } catch (err) {
    console.error("Dexie seeding failed:", err);
  }
};

if (typeof window !== 'undefined') {
  seedDatabase();
}

export { db };
