import { Variant } from "./db";

/**
 * Task 2: Create a Pricing Utility
 * Reusable, exported function calculateItemTotal(variant, inputQty) 
 * Returns the exact line total based on complex multi-unit pricing rules.
 */
export function calculateItemTotal(variant: Partial<Variant>, inputQty: number): number {
  const basePrice = variant.base_price || 0;
  
  // Rule 1: If unit is 'kg' (weight-based)
  if (variant.unit === 'kg') {
    return Number((inputQty * basePrice).toFixed(2));
  }

  // Rule 2: If pricing_type is 'bundle' (e.g., 4 pcs for 100)
  if (variant.pricing_type === 'bundle' && variant.bundle_qty && variant.bundle_price) {
    const fullBundles = Math.floor(inputQty / variant.bundle_qty);
    const remainder = inputQty % variant.bundle_qty;
    
    const bundleTotal = fullBundles * variant.bundle_price;
    const remainderTotal = remainder * basePrice;
    
    return Number((bundleTotal + remainderTotal).toFixed(2));
  }

  // Rule 3: Default/Standard
  return Number((inputQty * basePrice).toFixed(2));
}
