import type { DecodedPayload } from '../types';
import { decodeUrlParams } from './urlParams';
import { decodeBase64, isValidBase64 } from './base64';
import { decodeJson, isValidJson } from './json';
import { decodeOpenRTB } from './openrtb';

export { decodeUrlParams } from './urlParams';
export { decodeBase64, isValidBase64 } from './base64';
export { decodeJson, isValidJson, formatJson } from './json';
export { decodeOpenRTB, getOpenRTBSummary } from './openrtb';

/**
 * Auto-detect and decode a payload
 */
export function autoDecodePayload(
  input: string,
  hint?: 'urlParams' | 'json' | 'base64' | 'openrtb'
): DecodedPayload {
  if (!input || input.length === 0) {
    return {
      type: 'unknown',
      data: '',
      raw: '',
    };
  }

  // If hint provided, use that decoder
  if (hint) {
    switch (hint) {
      case 'urlParams':
        return decodeUrlParams(input);
      case 'json':
        return decodeJson(input);
      case 'base64':
        return decodeBase64(input);
      case 'openrtb':
        return decodeOpenRTB(input);
    }
  }

  // Try to auto-detect the format
  const trimmed = input.trim();

  // Check for JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    // Check if it looks like OpenRTB
    if (trimmed.includes('"imp"') || trimmed.includes('"seatbid"')) {
      return decodeOpenRTB(trimmed);
    }
    return decodeJson(trimmed);
  }

  // Check for URL with query params
  if (trimmed.includes('?') && trimmed.includes('=')) {
    return decodeUrlParams(trimmed);
  }

  // Check for base64
  if (isValidBase64(trimmed) && trimmed.length > 20) {
    return decodeBase64(trimmed);
  }

  // Return as text
  return {
    type: 'text',
    data: trimmed,
    raw: input,
  };
}

/**
 * Decode request body based on content type
 */
export function decodeRequestBody(
  body: string | ArrayBuffer | undefined,
  contentType?: string
): DecodedPayload | undefined {
  if (!body) {
    return undefined;
  }

  let bodyStr: string;
  if (body instanceof ArrayBuffer) {
    bodyStr = new TextDecoder().decode(body);
  } else {
    bodyStr = body;
  }

  if (!bodyStr || bodyStr.length === 0) {
    return undefined;
  }

  // Detect based on content type
  if (contentType) {
    if (contentType.includes('application/json')) {
      // Check for OpenRTB
      if (bodyStr.includes('"imp"') || bodyStr.includes('"seatbid"')) {
        return decodeOpenRTB(bodyStr);
      }
      return decodeJson(bodyStr);
    }
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return decodeUrlParams('?' + bodyStr);
    }
  }

  // Auto-detect
  return autoDecodePayload(bodyStr);
}
