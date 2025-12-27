import type { DecodedPayload } from '../types';

/**
 * Decode base64 encoded data
 */
export function decodeBase64(input: string): DecodedPayload {
  try {
    const decoded = atob(input);

    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(decoded);
      return {
        type: 'base64',
        data: jsonData,
        raw: input,
      };
    } catch {
      // Return as plain text
      return {
        type: 'base64',
        data: decoded,
        raw: input,
      };
    }
  } catch (e) {
    return {
      type: 'unknown',
      data: input,
      raw: input,
    };
  }
}

/**
 * Check if a string is valid base64
 */
export function isValidBase64(str: string): boolean {
  if (!str || str.length === 0) return false;

  // Base64 should only contain these characters
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(str)) return false;

  // Try to decode
  try {
    atob(str);
    return true;
  } catch {
    return false;
  }
}
