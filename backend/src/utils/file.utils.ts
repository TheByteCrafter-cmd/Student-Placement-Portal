import path from 'path';

/**
 * Validates that a file buffer starts with PDF magic bytes (%PDF- / 0x25 0x50 0x44 0x46 0x2D)
 */
export function validatePdfMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 5) {
    return false;
  }
  // Check header %PDF-
  const header = buffer.subarray(0, 5).toString('ascii');
  return header === '%PDF-';
}

/**
 * Validates that a string is a valid HTTP or HTTPS URL (rejects javascript:, data:, file:)
 */
export function isValidHttpUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') {
    return false;
  }
  const trimmed = urlString.trim();
  if (trimmed === '') return true; // Optional empty URL is valid

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

/**
 * Sanitizes a filename to prevent directory traversal
 */
export function sanitizeOriginalFilename(filename: string): string {
  return path.basename(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');
}
