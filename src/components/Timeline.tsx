import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRequestStore } from '@/contexts/RequestStoreContext';
import type { EnrichedRequest, VendorCategory, Issue } from '@/lib/types';
import { CATEGORY_COLORS, ISSUE_COLORS, ISSUE_LABELS } from '@/lib/types';

interface TimelineProps {
  requests: EnrichedRequest[];
}

const ROW_HEIGHT = 24;
const HEADER_HEIGHT = 30;
const LEFT_PADDING = 200;
const RIGHT_PADDING = 20;

export default function Timeline({ requests }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [hoveredRequest, setHoveredRequest] = useState<EnrichedRequest | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { selectRequest, selectedRequest } = useRequestStore();

  // Calculate timeline bounds
  const minTime = Math.min(...requests.map((r) => r.startTime));
  const maxTime = Math.max(
    ...requests.map((r) => r.startTime + (r.duration || 100))
  );
  const timeRange = maxTime - minTime || 1000;

  // Group requests by vendor
  const groupedRequests = groupByVendor(requests);
  const rows = Object.entries(groupedRequests);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        // Use requestAnimationFrame to ensure layout is complete
        requestAnimationFrame(() => {
          if (containerRef.current) {
            // Use clientWidth to get the actual inner width (excluding scrollbar)
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            setDimensions({
              width: Math.max(width, LEFT_PADDING + 400), // Ensure minimum width for timeline
              height: Math.max(rows.length * ROW_HEIGHT + HEADER_HEIGHT + 20, height),
            });
          }
        });
      }
    };

    // Initial update with a small delay to ensure layout is complete
    const timeoutId = setTimeout(updateDimensions, 50);

    window.addEventListener('resize', updateDimensions);

    // Use ResizeObserver for more accurate container size tracking
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, [rows.length]);

  // Draw timeline on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Determine if dark mode
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Draw time axis
    ctx.fillStyle = isDark ? '#e0e0e0' : '#333';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';

    const timelineWidth = dimensions.width - LEFT_PADDING - RIGHT_PADDING;
    const tickCount = Math.floor(timelineWidth / 80);
    const tickInterval = timeRange / tickCount;

    for (let i = 0; i <= tickCount; i++) {
      const time = minTime + i * tickInterval;
      const x = LEFT_PADDING + (i / tickCount) * timelineWidth;

      ctx.fillStyle = isDark ? '#555' : '#ddd';
      ctx.fillRect(x, HEADER_HEIGHT, 1, dimensions.height - HEADER_HEIGHT);

      ctx.fillStyle = isDark ? '#888' : '#666';
      ctx.fillText(formatTime(time), x - 15, HEADER_HEIGHT - 8);
    }

    // Draw request bars
    rows.forEach(([vendorId, vendorRequests], rowIndex) => {
      const y = HEADER_HEIGHT + rowIndex * ROW_HEIGHT;
      const firstRequest = vendorRequests[0];
      const vendor = firstRequest.vendor;

      // Draw vendor label - positioned with enough margin from left edge
      ctx.fillStyle = isDark ? '#e0e0e0' : '#333';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      const label = vendor?.name || 'Unknown';
      // Truncate label to fit in LEFT_PADDING area
      const labelX = 100; // Start labels 100px from left to ensure visibility
      const maxLabelWidth = LEFT_PADDING - labelX - 10;
      let displayLabel = label;
      while (ctx.measureText(displayLabel).width > maxLabelWidth && displayLabel.length > 3) {
        displayLabel = displayLabel.slice(0, -4) + '...';
      }
      ctx.fillText(
        displayLabel,
        labelX,
        y + ROW_HEIGHT / 2 + 4
      );

      // Draw request bars
      vendorRequests.forEach((request) => {
        const startX =
          LEFT_PADDING +
          ((request.startTime - minTime) / timeRange) * timelineWidth;
        const width = Math.max(
          ((request.duration || 50) / timeRange) * timelineWidth,
          3
        );

        const color = vendor
          ? CATEGORY_COLORS[vendor.category]
          : CATEGORY_COLORS.Other;

        // Highlight selected request
        if (selectedRequest?.id === request.id) {
          ctx.fillStyle = isDark ? '#fff' : '#000';
          ctx.fillRect(startX - 2, y + 4, width + 4, ROW_HEIGHT - 8);
        }

        ctx.fillStyle = color;
        ctx.fillRect(startX, y + 6, width, ROW_HEIGHT - 12);

        // Draw error indicator
        if (request.error) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(startX + width / 2, y + ROW_HEIGHT / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw issue indicator (warning triangle or exclamation)
        if (request.issues && request.issues.length > 0) {
          const hasError = request.issues.some(i => i.severity === 'error');
          const indicatorColor = hasError ? ISSUE_COLORS.error : ISSUE_COLORS.warning;

          // Draw small indicator at the end of the bar
          ctx.fillStyle = indicatorColor;
          const indicatorX = startX + width + 2;
          const indicatorY = y + ROW_HEIGHT / 2;

          // Draw exclamation mark
          ctx.beginPath();
          ctx.arc(indicatorX + 3, indicatorY, 5, 0, Math.PI * 2);
          ctx.fill();

          // White exclamation mark inside
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 8px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('!', indicatorX + 3, indicatorY);
        }
      });
    });
  }, [requests, dimensions, rows, minTime, timeRange, selectedRequest]);

  // Handle mouse events
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setMousePos({ x: e.clientX, y: e.clientY });

      // Find hovered request
      const rowIndex = Math.floor((y - HEADER_HEIGHT) / ROW_HEIGHT);
      if (rowIndex < 0 || rowIndex >= rows.length) {
        setHoveredRequest(null);
        return;
      }

      const [, vendorRequests] = rows[rowIndex];
      const timelineWidth = dimensions.width - LEFT_PADDING - RIGHT_PADDING;

      for (const request of vendorRequests) {
        const startX =
          LEFT_PADDING +
          ((request.startTime - minTime) / timeRange) * timelineWidth;
        const width = Math.max(
          ((request.duration || 50) / timeRange) * timelineWidth,
          3
        );

        if (x >= startX && x <= startX + width) {
          setHoveredRequest(request);
          return;
        }
      }

      setHoveredRequest(null);
    },
    [rows, dimensions, minTime, timeRange]
  );

  const handleClick = useCallback(() => {
    if (hoveredRequest) {
      selectRequest(hoveredRequest);
    }
  }, [hoveredRequest, selectRequest]);

  return (
    <div ref={containerRef} className="relative h-full overflow-y-auto overflow-x-auto">
      <canvas
        ref={canvasRef}
        className="cursor-pointer block"
        style={{
          width: dimensions.width,
          height: dimensions.height,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredRequest(null)}
        onClick={handleClick}
      />

      {/* Tooltip */}
      {hoveredRequest && (
        <div
          className="fixed z-50 px-2 py-1 text-xs bg-gray-900 text-white rounded shadow-lg pointer-events-none"
          style={{
            left: mousePos.x + 10,
            top: mousePos.y + 10,
          }}
        >
          <div className="font-medium">{hoveredRequest.vendor?.name || 'Unknown'}</div>
          <div className="text-gray-300 truncate max-w-xs">
            {getUrlPath(hoveredRequest.url)}
          </div>
          <div className="text-gray-400">
            {hoveredRequest.duration
              ? `${Math.round(hoveredRequest.duration)}ms`
              : 'Pending...'}
          </div>
          {hoveredRequest.issues && hoveredRequest.issues.length > 0 && (
            <div className="mt-1 pt-1 border-t border-gray-700">
              {hoveredRequest.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1"
                  style={{ color: issue.severity === 'error' ? '#FCA5A5' : '#FCD34D' }}
                >
                  <span className="text-[10px]">{ISSUE_LABELS[issue.type]}:</span>
                  <span className="text-[10px] text-gray-400">{issue.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function groupByVendor(requests: EnrichedRequest[]): Record<string, EnrichedRequest[]> {
  const groups: Record<string, EnrichedRequest[]> = {};

  for (const request of requests) {
    const key = request.vendor?.id || 'unknown';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(request);
  }

  // Sort by first request time
  const entries = Object.entries(groups);
  entries.sort((a, b) => a[1][0].startTime - b[1][0].startTime);

  return Object.fromEntries(entries);
}

function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function getUrlPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return url;
  }
}
