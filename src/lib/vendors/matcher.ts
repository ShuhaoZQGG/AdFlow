import type { Vendor, RequestType } from '../types';
import { vendors } from './taxonomy';

/**
 * Convert a glob pattern to a RegExp
 * Supports * (any chars except /) and ** (any chars including /)
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape special regex chars except * and ?
    .replace(/\*\*/g, '{{DOUBLESTAR}}')   // placeholder for **
    .replace(/\*/g, '[^/]*')              // * matches any except /
    .replace(/\{\{DOUBLESTAR\}\}/g, '.*'); // ** matches anything

  return new RegExp(`^${escaped}$`, 'i');
}

/**
 * Check if a URL matches a glob pattern
 */
function matchPattern(url: string, pattern: string): boolean {
  try {
    // Remove protocol for matching
    const urlWithoutProtocol = url.replace(/^https?:\/\//, '');
    const regex = globToRegex(pattern);
    return regex.test(urlWithoutProtocol);
  } catch {
    return false;
  }
}

/**
 * Find the vendor that matches a given URL
 */
export function matchVendor(url: string): Vendor | undefined {
  for (const vendor of vendors) {
    for (const pattern of vendor.patterns) {
      if (matchPattern(url, pattern)) {
        return vendor;
      }
    }
  }
  return undefined;
}

/**
 * Map of common parameter values to RequestType
 */
const TYPE_VALUE_MAP: Record<string, RequestType> = {
  // Impression variants
  'impression': 'impression',
  'imp': 'impression',
  'impr': 'impression',
  'pixel': 'impression',
  'track': 'impression',
  'beacon': 'impression',
  'log': 'impression',
  'fired': 'impression',

  // Click variants
  'click': 'click',
  'clk': 'click',
  'clicked': 'click',
  'redirect': 'click',

  // Viewability variants
  'viewability': 'viewability',
  'viewable': 'viewability',
  'visible': 'viewability',
  'inview': 'viewability',
  'view': 'viewability',
  'jload': 'viewability',
  'exposure': 'viewability',

  // Sync variants
  'sync': 'sync',
  'usync': 'sync',
  'idsync': 'sync',
  'cookie': 'sync',
  'match': 'sync',
  'cm': 'sync',
  'uid': 'sync',

  // Bid request variants
  'bid': 'bid_request',
  'auction': 'bid_request',
  'openrtb': 'bid_request',
  'request': 'bid_request',
  'prebid': 'bid_request',

  // Bid response variants
  'response': 'bid_response',
  'win': 'bid_response',
  'won': 'bid_response',
  'notify': 'bid_response',

  // Creative variants
  'creative': 'creative',
  'ad': 'creative',
  'render': 'creative',
  'display': 'creative',
  'banner': 'creative',
  'video': 'creative',
  'native': 'creative',

  // Config variants
  'config': 'config',
  'settings': 'config',
  'init': 'config',
  'setup': 'config',
};

/**
 * Common parameter names that indicate request type
 */
const TYPE_PARAM_NAMES = [
  'type',
  'action',
  'event',
  'eventtype',
  'event_type',
  'evt',
  'ev',
  't',
  'act',
  'a',
  'reqtype',
  'req_type',
  'request_type',
  'trackingtype',
  'tracking_type',
];

/**
 * Extract query parameters from URL
 */
function parseQueryParams(url: string): Map<string, string> {
  const params = new Map<string, string>();
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.forEach((value, key) => {
      params.set(key.toLowerCase(), value.toLowerCase());
    });
  } catch {
    // Fallback for malformed URLs - try to extract query string manually
    const queryStart = url.indexOf('?');
    if (queryStart !== -1) {
      const queryString = url.slice(queryStart + 1);
      const pairs = queryString.split('&');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          params.set(decodeURIComponent(key).toLowerCase(), decodeURIComponent(value).toLowerCase());
        }
      }
    }
  }
  return params;
}

/**
 * Check query parameters for type indicators
 */
function matchTypeFromParams(params: Map<string, string>): RequestType | null {
  for (const paramName of TYPE_PARAM_NAMES) {
    const value = params.get(paramName);
    if (value) {
      const mappedType = TYPE_VALUE_MAP[value];
      if (mappedType) {
        return mappedType;
      }
    }
  }
  return null;
}

/**
 * Determine the request type based on URL patterns, query params, and payload
 */
export function matchRequestType(url: string, vendor: Vendor, payload?: string | object): RequestType {
  // 1. First check vendor-specific patterns (highest priority)
  if (vendor.requestTypes) {
    for (const [type, config] of Object.entries(vendor.requestTypes)) {
      if (url.includes(config.pattern)) {
        return type as RequestType;
      }
    }
  }

  // 2. Check query parameters for type indicators
  const queryParams = parseQueryParams(url);
  const typeFromParams = matchTypeFromParams(queryParams);
  if (typeFromParams) {
    return typeFromParams;
  }

  // 3. Check payload for type indicators (if provided)
  if (payload) {
    let payloadObj: Record<string, unknown> | null = null;

    if (typeof payload === 'string') {
      try {
        payloadObj = JSON.parse(payload);
      } catch {
        // Try to parse as form-urlencoded
        const payloadParams = new Map<string, string>();
        const pairs = payload.split('&');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key && value) {
            payloadParams.set(decodeURIComponent(key).toLowerCase(), decodeURIComponent(value).toLowerCase());
          }
        }
        const typeFromPayload = matchTypeFromParams(payloadParams);
        if (typeFromPayload) {
          return typeFromPayload;
        }
      }
    } else if (typeof payload === 'object') {
      payloadObj = payload as Record<string, unknown>;
    }

    if (payloadObj) {
      // Check common type fields in JSON payload
      for (const paramName of TYPE_PARAM_NAMES) {
        const value = payloadObj[paramName];
        if (typeof value === 'string') {
          const mappedType = TYPE_VALUE_MAP[value.toLowerCase()];
          if (mappedType) {
            return mappedType;
          }
        }
      }
    }
  }

  // 4. Try to infer from URL path patterns (fallback)
  const urlLower = url.toLowerCase();

  if (urlLower.includes('/impression') || urlLower.includes('/imp') || urlLower.includes('/pixel')) {
    return 'impression';
  }
  if (urlLower.includes('/click') || urlLower.includes('/clk')) {
    return 'click';
  }
  if (urlLower.includes('/viewability') || urlLower.includes('/visible') || urlLower.includes('/jload')) {
    return 'viewability';
  }
  if (urlLower.includes('/sync') || urlLower.includes('/usync') || urlLower.includes('/idsync')) {
    return 'sync';
  }
  if (urlLower.includes('/auction') || urlLower.includes('/bid') || urlLower.includes('/openrtb')) {
    return 'bid_request';
  }
  if (urlLower.includes('/creative') || urlLower.includes('/ad/') || urlLower.includes('/ads/')) {
    return 'creative';
  }

  return 'unknown';
}

/**
 * Get the decoder type for a request
 */
export function getDecoderType(url: string, vendor: Vendor): string | undefined {
  if (!vendor.requestTypes) {
    return undefined;
  }

  for (const config of Object.values(vendor.requestTypes)) {
    if (url.includes(config.pattern)) {
      return config.decoder;
    }
  }

  return undefined;
}
