import React, { useState, useRef, useEffect } from 'react';
import type { EnrichedRequest, AdFlow } from '@/lib/types';
import { exportToJSON, exportToPDF } from '@/lib/export';

interface ExportMenuProps {
  requests: EnrichedRequest[];
  flows: AdFlow[];
  sessionSummary: string | null;
  predictions: string | null;
}

export default function ExportMenu({ requests, flows, sessionSummary, predictions }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      await exportToJSON(requests, flows, sessionSummary, predictions);
    } catch (error) {
      console.error('Failed to export JSON:', error);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportToPDF(requests, flows, sessionSummary, predictions);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting || requests.length === 0}
        className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {isExporting ? 'Exporting...' : 'Export'}
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-1">
            <button
              onClick={handleExportJSON}
              disabled={isExporting}
              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <div className="font-medium">Export as JSON</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  Full data with all requests
                </div>
              </div>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div>
                <div className="font-medium">Export as PDF</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  Report with AI summary
                </div>
              </div>
            </button>
          </div>

          {/* Info */}
          <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {requests.length} request{requests.length !== 1 ? 's' : ''} to export
              {sessionSummary && ' (with AI summary)'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
