/**
 * Scandit License Key Configuration
 * 
 * This file contains the Scandit license key used for barcode scanning functionality.
 * For security reasons, in a production environment, this should be:
 * 1. Stored as an environment variable (VITE_SCANDIT_LICENSE_KEY)
 * 2. Retrieved from a secure API endpoint rather than being embedded in frontend code
 */

// Default to environment variable if available, otherwise use sample license key
export const SCANDIT_LICENSE_KEY: string = 
  import.meta.env.VITE_SCANDIT_LICENSE_KEY || 
  "AcGjfGbhMH7qIy2ow3Onur8BLe9KCcC8ks2NXcPekrlHdI7ULG++Q2Rw8q8xN1B3M9GxsUm+7eSMdLAmEOkl97s+AAAAAYmHzhQAAABqpbz4Pk4h7rIKTb+UbKGH8iWxVEuqYbYnRxlMwLHg5DFg/RZq5GdnAWCYAF/j+TLYo2LoE8Fmg3aWwCmkPZz3wl98D5qWyOzIQgLCPf6o8xdpbNpXyMntaAh+kHkGdPSa9AZXVg+0";

/**
 * Supported barcode symbologies
 * List of barcode types that our application will recognize
 * These are common symbologies used in inventory/warehouse environments
 */
export const SUPPORTED_SYMBOLOGIES = [
  'ean13', // Standard retail barcode
  'ean8',  // Shorter version used on small packages
  'upca',  // UPC-A (used in US/Canada)
  'upce',  // UPC-E (compressed UPC format)
  'code128', // Versatile high-density barcode
  'code39', // Common in logistics/industrial
  'code93', // Similar to Code 39 but more secure
  'datamatrix', // 2D matrix barcode (small items)
  'qr', // QR Code (versatile 2D barcode)
  'pdf417', // High-capacity 2D barcode
  'interleaved2of5', // Used in warehouse/shipping
  'itf', // Same as interleaved2of5
];

export default SCANDIT_LICENSE_KEY;