import type { DecodedPayload, EnrichedRequest } from '../types';

/**
 * Serialize a decoded payload to a searchable string
 */
export function serializePayload(payload: DecodedPayload): string {
  if (!payload || !payload.data) {
    return payload?.raw || '';
  }

  switch (payload.type) {
    case 'json':
    case 'openrtb':
      // For JSON, use compact stringification
      try {
        return JSON.stringify(payload.data, null, 0);
      } catch {
        return payload.raw || '';
      }

    case 'urlParams':
      // For URL params, serialize key-value pairs
      if (typeof payload.data === 'object' && payload.data !== null) {
        const params = payload.data as Record<string, unknown>;
        return Object.entries(params)
          .map(([key, value]) => {
            if (typeof value === 'object') {
              return `${key}=${JSON.stringify(value)}`;
            }
            return `${key}=${value}`;
          })
          .join('&');
      }
      return payload.raw || '';

    case 'base64':
    case 'text':
      // For text/base64, use the data directly if it's a string
      if (typeof payload.data === 'string') {
        return payload.data;
      }
      return payload.raw || '';

    default:
      return payload.raw || '';
  }
}

/**
 * Get all searchable payload strings from a request
 */
export function getRequestPayloadStrings(request: EnrichedRequest): string[] {
  const payloads: string[] = [];

  if (request.decodedPayload) {
    payloads.push(serializePayload(request.decodedPayload));
  }

  if (request.requestBody) {
    payloads.push(serializePayload(request.requestBody));
  }

  if (request.responsePayload) {
    payloads.push(serializePayload(request.responsePayload));
  }

  return payloads.filter(Boolean);
}

/**
 * Check if a request matches a payload search query
 * @param request - The request to search
 * @param query - The search query
 * @param useRegex - Whether to use regex matching
 * @returns true if the request matches the query
 */
export function matchesPayloadSearch(
  request: EnrichedRequest,
  query: string,
  useRegex: boolean
): boolean {
  if (!query.trim()) {
    return true; // Empty query matches all
  }

  const payloadStrings = getRequestPayloadStrings(request);

  if (payloadStrings.length === 0) {
    return false; // No payloads to search
  }

  const searchText = payloadStrings.join('\n');

  if (useRegex) {
    try {
      const regex = new RegExp(query, 'i');
      return regex.test(searchText);
    } catch {
      // Invalid regex, fall back to plain text search
      return searchText.toLowerCase().includes(query.toLowerCase());
    }
  } else {
    return searchText.toLowerCase().includes(query.toLowerCase());
  }
}

