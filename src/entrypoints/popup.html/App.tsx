import { useEffect, useState } from 'react';
import { usePopupStore, initializePopup } from './stores/popupStore';
import type { EnrichedRequest } from '@/lib/types';

function RequestRow({ request, isSelected, onClick }: {
  request: EnrichedRequest;
  isSelected: boolean;
  onClick: () => void;
}) {
  const hasIssues = request.issues && request.issues.length > 0;

  return (
    <div
      onClick={onClick}
      className={`request-row ${isSelected ? 'selected' : ''} ${hasIssues ? 'has-issues' : ''}`}
    >
      <div className="request-row-main">
        <span className="request-vendor">
          {request.vendor?.name || 'Unknown'}
        </span>
        <span className="request-type">
          {request.vendorRequestType || request.type}
        </span>
        {hasIssues && (
          <span className="request-issues-badge">
            {request.issues!.length}
          </span>
        )}
      </div>
      <div className="request-url">{new URL(request.url).pathname}</div>
      <div className="request-meta">
        <span className={`request-status ${request.error ? 'error' : request.statusCode && request.statusCode >= 400 ? 'error' : 'success'}`}>
          {request.error ? 'ERR' : request.statusCode || '...'}
        </span>
        {request.duration && (
          <span className="request-duration">{Math.round(request.duration)}ms</span>
        )}
      </div>
    </div>
  );
}

function RequestDetail({ request, onClose }: { request: EnrichedRequest; onClose: () => void }) {
  return (
    <div className="request-detail">
      <div className="detail-header">
        <span className="detail-title">{request.vendor?.name || 'Request Details'}</span>
        <button onClick={onClose} className="detail-close">&times;</button>
      </div>
      <div className="detail-content">
        <div className="detail-section">
          <div className="detail-label">URL</div>
          <div className="detail-value url">{request.url}</div>
        </div>
        <div className="detail-section">
          <div className="detail-label">Type</div>
          <div className="detail-value">{request.vendorRequestType || request.type}</div>
        </div>
        {request.statusCode && (
          <div className="detail-section">
            <div className="detail-label">Status</div>
            <div className="detail-value">{request.statusCode}</div>
          </div>
        )}
        {request.duration && (
          <div className="detail-section">
            <div className="detail-label">Duration</div>
            <div className="detail-value">{Math.round(request.duration)}ms</div>
          </div>
        )}
        {request.slotId && (
          <div className="detail-section">
            <div className="detail-label">Slot ID</div>
            <div className="detail-value">{request.slotId}</div>
          </div>
        )}
        {request.issues && request.issues.length > 0 && (
          <div className="detail-section">
            <div className="detail-label">Issues</div>
            <div className="detail-issues">
              {request.issues.map((issue, i) => (
                <div key={i} className="issue-badge">{issue.type}</div>
              ))}
            </div>
          </div>
        )}
        {request.decodedPayload && (
          <div className="detail-section">
            <div className="detail-label">Payload</div>
            <pre className="detail-payload">
              {JSON.stringify(request.decodedPayload.data, null, 2).slice(0, 1000)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { requests, selectedRequest, selectRequest, isInitialized, error } = usePopupStore();
  const [view, setView] = useState<'list' | 'detail'>('list');

  useEffect(() => {
    initializePopup();
  }, []);

  const handleRequestClick = (request: EnrichedRequest) => {
    selectRequest(request);
    setView('detail');
  };

  const handleBack = () => {
    selectRequest(null);
    setView('list');
  };

  const handleClear = () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' });
    usePopupStore.getState().clearRequests();
  };

  // Show error state
  if (error) {
    return (
      <div className="popup-container">
        <div className="popup-header">
          <img src="/icons/icon.svg" alt="AdFlow" className="popup-logo" />
          <span className="popup-title">AdFlow Inspector</span>
        </div>
        <div className="error-state">
          <div className="error-icon">!</div>
          <div className="error-message">{error}</div>
          <div className="error-hint">
            Open DevTools (F12) to use the full AdFlow panel
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!isInitialized) {
    return (
      <div className="popup-container">
        <div className="popup-header">
          <img src="/icons/icon.svg" alt="AdFlow" className="popup-logo" />
          <span className="popup-title">AdFlow Inspector</span>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <div>Loading requests...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <div className="popup-header">
        <img src="/icons/icon.svg" alt="AdFlow" className="popup-logo" />
        <span className="popup-title">AdFlow Inspector</span>
        <span className="request-count">{requests.length}</span>
        {view === 'list' && requests.length > 0 && (
          <button onClick={handleClear} className="clear-btn">Clear</button>
        )}
        {view === 'detail' && (
          <button onClick={handleBack} className="back-btn">&larr; Back</button>
        )}
      </div>

      {view === 'list' ? (
        <div className="request-list">
          {requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="empty-text">No ad requests captured</div>
              <div className="empty-hint">Navigate to a page with ads to see requests</div>
            </div>
          ) : (
            requests.slice().reverse().map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                isSelected={selectedRequest?.id === request.id}
                onClick={() => handleRequestClick(request)}
              />
            ))
          )}
        </div>
      ) : (
        selectedRequest && (
          <RequestDetail request={selectedRequest} onClose={handleBack} />
        )
      )}

      <div className="popup-footer">
        <span className="footer-hint">Open DevTools (F12) for full features</span>
      </div>
    </div>
  );
}
