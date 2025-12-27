import type { DecodedPayload } from '../types';

/**
 * Decode JSON data with error handling
 */
export function decodeJson(input: string): DecodedPayload {
  try {
    const data = JSON.parse(input);
    return {
      type: 'json',
      data,
      raw: input,
    };
  } catch (e) {
    // Try to fix common JSON issues
    const cleaned = cleanJsonString(input);
    try {
      const data = JSON.parse(cleaned);
      return {
        type: 'json',
        data,
        raw: input,
      };
    } catch {
      return {
        type: 'unknown',
        data: input,
        raw: input,
      };
    }
  }
}

/**
 * Attempt to clean malformed JSON
 */
function cleanJsonString(str: string): string {
  // Remove trailing commas before ] or }
  let cleaned = str.replace(/,(\s*[}\]])/g, '$1');

  // Ensure proper quote escaping
  // This is a simplified version - real JSON repair is complex

  return cleaned;
}

/**
 * Check if a string is valid JSON
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pretty print JSON with syntax highlighting markers
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
