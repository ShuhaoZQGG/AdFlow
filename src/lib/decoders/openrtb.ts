import type { DecodedPayload } from '../types';
import { decodeJson } from './json';

/**
 * OpenRTB specific fields for better labeling
 */
interface OpenRTBBidRequest {
  id?: string;
  imp?: Array<{
    id?: string;
    banner?: {
      w?: number;
      h?: number;
      format?: Array<{ w: number; h: number }>;
    };
    video?: {
      w?: number;
      h?: number;
      mimes?: string[];
      protocols?: number[];
    };
    bidfloor?: number;
    bidfloorcur?: string;
  }>;
  site?: {
    domain?: string;
    page?: string;
    publisher?: { id?: string; name?: string };
  };
  device?: {
    ua?: string;
    ip?: string;
    geo?: { country?: string; region?: string; city?: string };
  };
  user?: {
    id?: string;
    buyeruid?: string;
  };
  regs?: {
    gdpr?: number;
    us_privacy?: string;
  };
  ext?: Record<string, unknown>;
}

/**
 * Decode and annotate OpenRTB bid request/response
 */
export function decodeOpenRTB(input: string): DecodedPayload {
  const decoded = decodeJson(input);

  if (decoded.type === 'unknown') {
    return decoded;
  }

  // Add OpenRTB specific annotations
  const data = decoded.data as Record<string, unknown>;

  // Check if this is an OpenRTB request
  if (isOpenRTBRequest(data)) {
    return {
      type: 'openrtb',
      data: annotateOpenRTBRequest(data as OpenRTBBidRequest),
      raw: input,
    };
  }

  return {
    type: 'openrtb',
    data,
    raw: input,
  };
}

/**
 * Check if data looks like an OpenRTB request
 */
function isOpenRTBRequest(data: Record<string, unknown>): boolean {
  return (
    'imp' in data ||
    'id' in data && ('site' in data || 'app' in data)
  );
}

/**
 * Annotate OpenRTB request with human-readable labels
 */
function annotateOpenRTBRequest(data: OpenRTBBidRequest): Record<string, unknown> {
  const annotated: Record<string, unknown> = { ...data };

  // Add summary at top level
  const summary: Record<string, unknown> = {};

  if (data.imp && data.imp.length > 0) {
    summary.impressionCount = data.imp.length;
    summary.adFormats = data.imp.map(imp => {
      if (imp.banner) {
        const sizes = imp.banner.format
          ? imp.banner.format.map(f => `${f.w}x${f.h}`).join(', ')
          : `${imp.banner.w}x${imp.banner.h}`;
        return `Banner (${sizes})`;
      }
      if (imp.video) {
        return `Video (${imp.video.w}x${imp.video.h})`;
      }
      return 'Unknown';
    });

    const floors = data.imp
      .filter(imp => imp.bidfloor)
      .map(imp => imp.bidfloor);
    if (floors.length > 0) {
      summary.bidFloors = floors;
    }
  }

  if (data.site) {
    summary.site = data.site.domain || data.site.page;
  }

  if (data.regs) {
    summary.privacy = {
      gdpr: data.regs.gdpr === 1,
      ccpa: data.regs.us_privacy,
    };
  }

  annotated._summary = summary;

  return annotated;
}

/**
 * Get a human-readable summary of an OpenRTB request
 */
export function getOpenRTBSummary(data: Record<string, unknown>): string {
  const parts: string[] = [];

  if (data.imp && Array.isArray(data.imp)) {
    const imp = data.imp[0] as Record<string, unknown>;
    if (imp.banner) {
      const banner = imp.banner as Record<string, unknown>;
      parts.push(`Banner ${banner.w}x${banner.h}`);
    }
    if (imp.video) {
      parts.push('Video');
    }
    if (imp.bidfloor) {
      parts.push(`Floor: $${imp.bidfloor}`);
    }
  }

  return parts.join(' | ') || 'OpenRTB Request';
}
