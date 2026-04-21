/**
 * Auto Barcode Generator Engine
 * Generates a unique 12-digit numeric barcode string.
 * Uses Code128 standard compatibility.
 */
export function generateBarcode(): string {
  const prefix = "890"; // Standard JRS Prefix
  // Use last 9 digits of timestamp for high uniqueness
  const timestamp = Date.now().toString().slice(-9);
  return `${prefix}${timestamp}`;
}
