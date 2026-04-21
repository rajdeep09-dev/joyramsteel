/**
 * Auto Barcode Generator Engine
 * Generates a unique 12-digit numeric barcode string.
 */
export function generateBarcode(): string {
  const prefix = "890"; // JRS Prefix
  const timestamp = Date.now().toString().slice(-9);
  return `${prefix}${timestamp}`;
}
