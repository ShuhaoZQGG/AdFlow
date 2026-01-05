// Export functionality for AdFlow Network Inspector

import { jsPDF } from 'jspdf';
import type { EnrichedRequest, AdFlow } from '../types';

interface ExportData {
  exportedAt: string;
  version: string;
  requests: EnrichedRequest[];
  flows: AdFlow[];
  aiAnalysis?: {
    sessionSummary?: string;
    discrepancyPredictions?: string;
  };
}

/**
 * Export session data as JSON file
 */
export async function exportToJSON(
  requests: EnrichedRequest[],
  flows: AdFlow[],
  sessionSummary: string | null,
  predictions: string | null
): Promise<void> {
  const data: ExportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    requests: requests.map(sanitizeRequest),
    flows: flows.map(sanitizeFlow),
  };

  if (sessionSummary || predictions) {
    data.aiAnalysis = {};
    if (sessionSummary) {
      data.aiAnalysis.sessionSummary = sessionSummary;
    }
    if (predictions) {
      data.aiAnalysis.discrepancyPredictions = predictions;
    }
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `adflow-export-${formatTimestamp()}.json`);
}

/**
 * Export session data as PDF report
 */
export async function exportToPDF(
  requests: EnrichedRequest[],
  flows: AdFlow[],
  sessionSummary: string | null,
  predictions: string | null
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper to add text with word wrap
  const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, contentWidth);

    // Check if we need a new page
    const lineHeight = fontSize * 0.4;
    if (y + lines.length * lineHeight > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }

    doc.text(lines, margin, y);
    y += lines.length * lineHeight + 2;
  };

  const addSection = (title: string) => {
    y += 5;
    addText(title, 14, true);
    y += 2;
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('AdFlow Network Inspector Report', margin, y);
  y += 10;

  // Metadata
  addText(`Generated: ${new Date().toLocaleString()}`, 9);
  addText(`Total Requests: ${requests.length}`, 9);
  addText(`Ad Flows Detected: ${flows.length}`, 9);
  y += 5;

  // Session Summary (AI) - render raw text, stripping markdown syntax for PDF
  if (sessionSummary) {
    addSection('AI Session Summary');
    // Strip basic markdown formatting for PDF output
    const cleanText = sessionSummary
      .replace(/#{1,6}\s+/g, '')  // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Bold
      .replace(/\*([^*]+)\*/g, '$1')  // Italic
      .replace(/`([^`]+)`/g, '$1');  // Code
    addText(cleanText, 10);
  }

  // Discrepancy Predictions - render raw text
  if (predictions) {
    addSection('Discrepancy Predictions');
    const cleanText = predictions
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1');
    addText(cleanText, 10);
  }

  // Request Summary
  addSection('Request Summary');

  // Group by vendor
  const vendorCounts: Record<string, number> = {};
  requests.forEach(r => {
    const vendor = r.vendor?.name || 'Unknown';
    vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
  });

  const sortedVendors = Object.entries(vendorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  addText('Top Vendors:', 11, true);
  sortedVendors.forEach(([vendor, count]) => {
    addText(`• ${vendor}: ${count} requests`, 10);
  });

  // Issues Summary
  const allIssues = requests.flatMap(r => r.issues || []);
  if (allIssues.length > 0) {
    addSection('Detected Issues');

    const issuesByType: Record<string, number> = {};
    allIssues.forEach(issue => {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
    });

    Object.entries(issuesByType).forEach(([type, count]) => {
      addText(`• ${type}: ${count} occurrences`, 10);
    });
  }

  // Ad Flows
  if (flows.length > 0) {
    addSection('Ad Flows');

    flows.slice(0, 10).forEach((flow, i) => {
      const slotInfo = flow.slotId ? ` (Slot: ${flow.slotId})` : '';
      addText(`Flow ${i + 1}${slotInfo}`, 11, true);
      addText(`Requests: ${flow.requests.length}`, 10);

      if (flow.winningBid) {
        addText(`Winner: ${flow.winningBid.vendor} @ ${flow.winningBid.price || '?'} ${flow.winningBid.currency || ''}`, 10);
      }

      const stages = Array.from(flow.stages.keys()).join(' → ');
      addText(`Stages: ${stages}`, 10);
      y += 3;
    });
  }

  // Download
  doc.save(`adflow-report-${formatTimestamp()}.pdf`);
}

/**
 * Sanitize request for export (remove circular refs, etc.)
 */
function sanitizeRequest(request: EnrichedRequest): EnrichedRequest {
  return {
    ...request,
    // Convert any Maps or Sets to arrays/objects
    vendor: request.vendor ? { ...request.vendor } : undefined,
    issues: request.issues ? [...request.issues] : undefined,
  };
}

/**
 * Sanitize flow for export
 */
function sanitizeFlow(flow: AdFlow): Record<string, unknown> {
  return {
    id: flow.id,
    slotId: flow.slotId,
    adUnitPath: flow.adUnitPath,
    startTime: flow.startTime,
    endTime: flow.endTime,
    requestCount: flow.requests.length,
    requestIds: flow.requests.map(r => r.id),
    stages: Object.fromEntries(
      Array.from(flow.stages.entries()).map(([stage, reqs]) => [
        stage,
        reqs.map(r => r.id),
      ])
    ),
    winningBid: flow.winningBid,
    issues: flow.issues,
  };
}

/**
 * Format timestamp for filename
 */
function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Trigger download of a blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
