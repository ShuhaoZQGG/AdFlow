import type { DecodedPayload } from '../types';

/**
 * Decode URL query parameters into a structured object
 */
export function decodeUrlParams(url: string): DecodedPayload {
  try {
    const urlObj = new URL(url);
    const params: Record<string, unknown> = {};

    urlObj.searchParams.forEach((value, key) => {
      // Try to parse JSON values
      try {
        const parsed = JSON.parse(value);
        params[key] = parsed;
      } catch {
        // Keep raw value - don't try to decode base64 as it often produces gibberish
        params[key] = value;
      }
    });

    return {
      type: 'urlParams',
      data: params,
      raw: urlObj.search,
    };
  } catch (e) {
    return {
      type: 'unknown',
      data: url,
      raw: url,
    };
  }
}
