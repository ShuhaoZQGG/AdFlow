import type { EnrichedRequest, RequestType } from '../types';

export interface ParsedQuery {
  operators: {
    vendor?: string;
    status?: string;
    type?: string;
    url?: string;
    has?: string;
  };
  freeText: string; // Remaining text after extracting operators
}

/**
 * Parse a search query to extract advanced filtering operators
 * Examples:
 * - "vendor:rubicon" -> { operators: { vendor: 'rubicon' }, freeText: '' }
 * - "vendor:rubicon test" -> { operators: { vendor: 'rubicon' }, freeText: 'test' }
 * - "status:200 type:bid_request" -> { operators: { status: '200', type: 'bid_request' }, freeText: '' }
 */
export function parseQuery(query: string): ParsedQuery {
  const operators: ParsedQuery['operators'] = {};
  let freeText = query;

  // Pattern to match operators: operator:value
  // Supports quoted values: operator:"value with spaces"
  const operatorPattern = /(\w+):("([^"]+)"|([^\s]+))/g;
  const matches = Array.from(query.matchAll(operatorPattern));

  for (const match of matches) {
    const operator = match[1].toLowerCase();
    const value = match[3] || match[4]; // Quoted value or unquoted value

    switch (operator) {
      case 'vendor':
        operators.vendor = value;
        break;
      case 'status':
        operators.status = value;
        break;
      case 'type':
        operators.type = value;
        break;
      case 'url':
        operators.url = value;
        break;
      case 'has':
        operators.has = value;
        break;
    }

    // Remove the operator from free text
    freeText = freeText.replace(match[0], '').trim();
  }

  return { operators, freeText };
}

/**
 * Check if a request matches the parsed query operators
 */
export function matchesQueryOperators(
  request: EnrichedRequest,
  operators: ParsedQuery['operators']
): boolean {
  // Vendor filter
  if (operators.vendor) {
    const vendorName = request.vendor?.name.toLowerCase() || '';
    const vendorId = request.vendor?.id.toLowerCase() || '';
    const searchTerm = operators.vendor.toLowerCase();
    if (!vendorName.includes(searchTerm) && !vendorId.includes(searchTerm)) {
      return false;
    }
  }

  // Status filter
  if (operators.status) {
    const status = operators.status.toLowerCase();
    const requestStatus = request.statusCode || 0;

    // Handle status groups (2xx, 3xx, etc.)
    if (status === '2xx') {
      if (requestStatus < 200 || requestStatus >= 300) {
        return false;
      }
    } else if (status === '3xx') {
      if (requestStatus < 300 || requestStatus >= 400) {
        return false;
      }
    } else if (status === '4xx') {
      if (requestStatus < 400 || requestStatus >= 500) {
        return false;
      }
    } else if (status === '5xx') {
      if (requestStatus < 500 || requestStatus >= 600) {
        return false;
      }
    } else {
      // Exact status code match
      const statusNum = parseInt(status, 10);
      if (!isNaN(statusNum) && requestStatus !== statusNum) {
        return false;
      }
    }
  }

  // Type filter
  if (operators.type) {
    const searchType = operators.type.toLowerCase() as RequestType;
    if (request.vendorRequestType !== searchType) {
      return false;
    }
  }

  // URL filter
  if (operators.url) {
    const urlLower = request.url.toLowerCase();
    const searchUrl = operators.url.toLowerCase();
    if (!urlLower.includes(searchUrl)) {
      return false;
    }
  }

  // Has filter
  if (operators.has) {
    const hasType = operators.has.toLowerCase();
    switch (hasType) {
      case 'payload':
        if (!request.decodedPayload && !request.requestBody && !request.responsePayload) {
          return false;
        }
        break;
      case 'requestbody':
      case 'request_body':
        if (!request.requestBody) {
          return false;
        }
        break;
      case 'responsepayload':
      case 'response_payload':
        if (!request.responsePayload) {
          return false;
        }
        break;
      case 'issues':
        if (!request.issues || request.issues.length === 0) {
          return false;
        }
        break;
    }
  }

  return true;
}

/**
 * Check if a request matches the free text part of the query
 * Supports both plain text and regex matching
 */
export function matchesFreeText(
  request: EnrichedRequest,
  freeText: string,
  useRegex: boolean
): boolean {
  if (!freeText.trim()) {
    return true; // Empty free text matches all
  }

  const searchText = `${request.url} ${request.vendor?.name || ''}`.toLowerCase();

  if (useRegex) {
    try {
      const regex = new RegExp(freeText, 'i');
      return regex.test(searchText);
    } catch {
      // Invalid regex, fall back to plain text search
      return searchText.includes(freeText.toLowerCase());
    }
  } else {
    return searchText.includes(freeText.toLowerCase());
  }
}

