import React from 'react';
import { useRequestStore } from '@/contexts/RequestStoreContext';

export default function ElementInspector() {
  const {
    isPickerActive,
    inspectedElement,
    startElementPicker,
    stopElementPicker,
    clearInspectedElement,
    filteredRequests,
  } = useRequestStore();

  const filtered = filteredRequests();
  const matchingCount = inspectedElement ? filtered.length : 0;

  // Format element label for display
  const getElementLabel = () => {
    if (!inspectedElement) return '';
    let label = inspectedElement.tagName;
    if (inspectedElement.id) {
      label += `#${inspectedElement.id}`;
    } else if (inspectedElement.className) {
      const firstClass = inspectedElement.className.split(' ').find(c => c.trim());
      if (firstClass) {
        label += `.${firstClass}`;
      }
    }
    return label;
  };

  const handleTogglePicker = () => {
    if (isPickerActive) {
      stopElementPicker();
    } else {
      // Clear previous selection when starting picker
      if (inspectedElement) {
        clearInspectedElement();
      }
      startElementPicker();
    }
  };

  return (
    <div className="relative flex items-center gap-1">
      {/* Pick Element Button */}
      <button
        onClick={handleTogglePicker}
        className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded border transition-colors ${
          isPickerActive
            ? 'bg-blue-500 border-blue-600 text-white'
            : inspectedElement
            ? 'bg-cyan-100 dark:bg-cyan-900 border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        title={isPickerActive ? 'Cancel element selection' : 'Pick an element to inspect its network requests'}
      >
        {/* Crosshair/Target Icon */}
        <svg
          className={`w-3.5 h-3.5 ${isPickerActive ? 'animate-pulse' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>
          {isPickerActive ? 'Picking...' : inspectedElement ? getElementLabel() : 'Inspect Element'}
        </span>
        {inspectedElement && !isPickerActive && (
          <span className="px-1 py-0.5 text-[10px] bg-cyan-500 text-white rounded-full min-w-[16px] text-center">
            {matchingCount}
          </span>
        )}
      </button>

      {/* Clear Button - shown when element is selected */}
      {inspectedElement && !isPickerActive && (
        <button
          onClick={clearInspectedElement}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Clear element selection"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Element Info Tooltip - shown when element is selected */}
      {inspectedElement && !isPickerActive && (
        <ElementInfoTooltip element={inspectedElement} matchingCount={matchingCount} />
      )}
    </div>
  );
}

interface ElementInfoTooltipProps {
  element: {
    tagName: string;
    id?: string;
    className?: string;
    src?: string;
    directUrls: string[];
    frameId: number;
  };
  matchingCount: number;
}

function ElementInfoTooltip({ element, matchingCount }: ElementInfoTooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Show element details"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3">
          <div className="text-xs space-y-2">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Element:</span>
              <span className="ml-2 font-mono text-blue-600 dark:text-blue-400">
                {element.tagName}
                {element.id && <span className="text-green-600 dark:text-green-400">#{element.id}</span>}
                {element.className && (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    .{element.className.split(' ').slice(0, 2).join('.')}
                  </span>
                )}
              </span>
            </div>

            {element.src && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Source:</span>
                <span className="ml-2 font-mono text-gray-600 dark:text-gray-300 break-all">
                  {element.src.length > 60 ? element.src.substring(0, 60) + '...' : element.src}
                </span>
              </div>
            )}

            <div>
              <span className="text-gray-500 dark:text-gray-400">Frame ID:</span>
              <span className="ml-2 font-mono">{element.frameId}</span>
            </div>

            {element.directUrls.length > 0 && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">
                  Related URLs ({element.directUrls.length}):
                </span>
                <ul className="mt-1 ml-2 space-y-0.5 max-h-24 overflow-y-auto">
                  {element.directUrls.slice(0, 5).map((url, i) => (
                    <li key={i} className="font-mono text-[10px] text-gray-600 dark:text-gray-300 truncate">
                      {url}
                    </li>
                  ))}
                  {element.directUrls.length > 5 && (
                    <li className="text-gray-400">+{element.directUrls.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                {matchingCount} matching request{matchingCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
