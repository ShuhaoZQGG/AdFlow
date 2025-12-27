import { matchVendor, matchRequestType, getDecoderType } from '@/lib/vendors/matcher';
import { autoDecodePayload, decodeRequestBody } from '@/lib/decoders';
import { detectRequestIssues, detectCrossRequestIssues } from '@/lib/issues';
import { detectAdFlowStage, extractSlotId } from '@/lib/adflow';
import type { EnrichedRequest, MessageType, Issue, SlotInfo } from '@/lib/types';

export default defineBackground(async () => {
  console.log('AdFlow Inspector: Background service worker started');

  // Store requests per tab, keyed by Chrome's requestId
  const requestsByTab = new Map<number, Map<string, EnrichedRequest>>();
  const pageLoadTimes = new Map<number, number>();
  const MAX_REQUESTS_PER_TAB = 1000;

  // Store slot mappings per tab (from GAM/Prebid)
  const slotMappingsByTab = new Map<number, SlotInfo[]>();

  // Track tabs where content script has been injected
  const injectedTabs = new Set<number>();

  // Inject content script into a tab if not already injected
  async function ensureContentScriptInjected(tabId: number) {
    if (injectedTabs.has(tabId)) return;

    try {
      // Check if tab exists and is a valid URL
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
        return;
      }

      // Try to inject the content script
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: ['content-scripts/content.js'],
      });

      injectedTabs.add(tabId);
      console.log('[AdFlow BG] Content script injected into tab', tabId);
    } catch (err) {
      // Script might already be injected or tab might not be accessible
      console.debug('[AdFlow BG] Could not inject content script:', err);
    }
  }

  // Find elementId for a slotId from cached mappings
  function findElementIdForSlot(tabId: number, slotId: string): string | undefined {
    const slots = slotMappingsByTab.get(tabId) || [];

    // Direct match on slotId
    const directMatch = slots.find(s => s.slotId === slotId);
    if (directMatch) return directMatch.elementId;

    // Partial match - slotId might be part of GAM ad unit path
    const partialMatch = slots.find(s =>
      s.slotId.includes(slotId) || slotId.includes(s.slotId)
    );
    if (partialMatch) return partialMatch.elementId;

    // Match by elementId directly
    const elementMatch = slots.find(s => s.elementId === slotId);
    if (elementMatch) return elementMatch.elementId;

    return undefined;
  }

  // Get or create request map for tab
  function getTabRequests(tabId: number): Map<string, EnrichedRequest> {
    if (!requestsByTab.has(tabId)) {
      requestsByTab.set(tabId, new Map());
    }
    return requestsByTab.get(tabId)!;
  }

  // Broadcast message to DevTools panels
  function broadcastToDevTools(message: MessageType) {
    chrome.runtime.sendMessage(message).catch(() => {
      // DevTools panel might not be open, ignore errors
    });
  }

  // Run cross-request issue detection for a tab
  function runCrossRequestIssueDetection(tabId: number) {
    const tabRequests = getTabRequests(tabId);
    const requests = Array.from(tabRequests.values());

    const crossIssues = detectCrossRequestIssues(requests);

    // Update requests with new issues and broadcast
    for (const [requestId, issues] of crossIssues) {
      const request = tabRequests.get(requestId);
      if (request) {
        // Merge issues, avoiding duplicates
        const existingTypes = new Set(request.issues?.map(i => i.type) || []);
        const newIssues = issues.filter(i => !existingTypes.has(i.type));

        if (newIssues.length > 0) {
          request.issues = [...(request.issues || []), ...newIssues];

          broadcastToDevTools({
            type: 'ISSUES_DETECTED',
            payload: {
              requestId,
              issues: request.issues,
            },
          });
        }
      }
    }
  }

  // Debounced cross-request issue detection
  const issueDetectionTimers = new Map<number, ReturnType<typeof setTimeout>>();

  function scheduleCrossRequestIssueDetection(tabId: number) {
    // Clear existing timer
    const existingTimer = issueDetectionTimers.get(tabId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new detection after 500ms of inactivity
    const timer = setTimeout(() => {
      runCrossRequestIssueDetection(tabId);
      issueDetectionTimers.delete(tabId);
    }, 500);

    issueDetectionTimers.set(tabId, timer);
  }

  // Track page load time and notify panel of navigation
  chrome.webNavigation?.onCommitted.addListener((details) => {
    if (details.frameId === 0) {
      pageLoadTimes.set(details.tabId, details.timeStamp);
      // Clear previous requests and injection status on navigation
      requestsByTab.delete(details.tabId);
      slotMappingsByTab.delete(details.tabId);
      injectedTabs.delete(details.tabId);

      // Notify DevTools panel to clear its state for this tab
      broadcastToDevTools({
        type: 'PAGE_NAVIGATED',
        payload: {
          tabId: details.tabId,
          url: details.url,
        },
      });
    }
  });

  // Inject content script when page finishes loading
  chrome.webNavigation?.onCompleted.addListener((details) => {
    if (details.frameId === 0) {
      ensureContentScriptInjected(details.tabId);
    }
  });

  // Also inject on tab update (for cases where webNavigation doesn't fire)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome')) {
      ensureContentScriptInjected(tabId);
    }
  });

  // Clean up when tab closes
  chrome.tabs.onRemoved.addListener((tabId) => {
    requestsByTab.delete(tabId);
    pageLoadTimes.delete(tabId);
    slotMappingsByTab.delete(tabId);
    injectedTabs.delete(tabId);
  });

  // Inject content scripts into all existing tabs on extension start/reload
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith('chrome')) {
        ensureContentScriptInjected(tab.id);
      }
    }
  } catch (err) {
    console.debug('[AdFlow BG] Could not inject into existing tabs:', err);
  }

  // Intercept requests before they're sent
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (details.tabId < 0) return; // Ignore service worker requests

      const tabRequests = getTabRequests(details.tabId);

      // Enforce request limit
      if (tabRequests.size >= MAX_REQUESTS_PER_TAB) {
        // Remove oldest request
        const oldestKey = tabRequests.keys().next().value;
        if (oldestKey) tabRequests.delete(oldestKey);
      }

      const pageLoadTime = pageLoadTimes.get(details.tabId) || details.timeStamp;
      const startTime = details.timeStamp - pageLoadTime;

      // Match vendor
      const vendor = matchVendor(details.url);

      // Decode URL params
      const decodedPayload = autoDecodePayload(
        details.url,
        vendor ? (getDecoderType(details.url, vendor) as 'urlParams' | 'json' | 'base64' | 'openrtb' | undefined) : undefined
      );

      // Decode request body if present
      let requestBody;
      let rawBodyStr: string | undefined;
      if (details.requestBody) {
        if (details.requestBody.raw && details.requestBody.raw.length > 0) {
          const bodyBytes = details.requestBody.raw[0].bytes;
          if (bodyBytes) {
            rawBodyStr = new TextDecoder().decode(bodyBytes);
            requestBody = decodeRequestBody(rawBodyStr);
          }
        } else if (details.requestBody.formData) {
          requestBody = {
            type: 'urlParams' as const,
            data: details.requestBody.formData,
            raw: JSON.stringify(details.requestBody.formData),
          };
          rawBodyStr = JSON.stringify(details.requestBody.formData);
        }
      }

      // Match request type using URL, query params, and body
      const vendorRequestType = vendor
        ? matchRequestType(details.url, vendor, rawBodyStr)
        : undefined;

      // Create initial request object for ad flow detection
      // Use Chrome's requestId for consistent tracking across events
      const initialRequest: EnrichedRequest = {
        id: details.requestId,
        url: details.url,
        method: details.method,
        type: details.type,
        tabId: details.tabId,
        timestamp: details.timeStamp,
        startTime,
        vendor,
        vendorRequestType,
        decodedPayload,
        requestBody,
        completed: false,
      };

      // Detect ad flow stage and slot ID
      const adFlowStage = detectAdFlowStage(initialRequest);
      const slotId = extractSlotId(initialRequest);

      // Try to find elementId from slot mappings
      const elementId = slotId ? findElementIdForSlot(details.tabId, slotId) : undefined;

      const request: EnrichedRequest = {
        ...initialRequest,
        adFlowStage,
        slotId,
        elementId,
      };

      tabRequests.set(request.id, request);

      broadcastToDevTools({
        type: 'REQUEST_START',
        payload: request,
      });
    },
    { urls: ['<all_urls>'] },
    ['requestBody']
  );

  // Capture request headers
  chrome.webRequest.onSendHeaders.addListener(
    (details) => {
      if (details.tabId < 0) return;

      const tabRequests = getTabRequests(details.tabId);
      const request = tabRequests.get(details.requestId);
      if (request) {
        request.requestHeaders = details.requestHeaders;
      }
    },
    { urls: ['<all_urls>'] },
    ['requestHeaders']
  );

  // Track response headers and completion
  chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
      if (details.tabId < 0) return;

      const tabRequests = getTabRequests(details.tabId);
      const request = tabRequests.get(details.requestId);
      if (request) {
        request.responseHeaders = details.responseHeaders;
      }
    },
    { urls: ['<all_urls>'] },
    ['responseHeaders']
  );

  // Track request completion
  chrome.webRequest.onCompleted.addListener(
    (details) => {
      if (details.tabId < 0) return;

      const tabRequests = getTabRequests(details.tabId);
      const request = tabRequests.get(details.requestId);

      if (request && !request.completed) {
        request.completed = true;
        request.statusCode = details.statusCode;
        request.duration = details.timeStamp - request.timestamp;
        request.responseHeaders = details.responseHeaders;

        // Run issue detection on this request
        const issues = detectRequestIssues(request);
        if (issues.length > 0) {
          request.issues = [...(request.issues || []), ...issues];
        }

        broadcastToDevTools({
          type: 'REQUEST_COMPLETE',
          payload: {
            id: request.id,
            statusCode: details.statusCode,
            duration: request.duration,
            responseHeaders: details.responseHeaders,
            issues: request.issues,
          },
        });

        // Schedule cross-request issue detection
        scheduleCrossRequestIssueDetection(details.tabId);
      }
    },
    { urls: ['<all_urls>'] },
    ['responseHeaders']
  );

  // Track request errors
  chrome.webRequest.onErrorOccurred.addListener(
    (details) => {
      if (details.tabId < 0) return;

      const tabRequests = getTabRequests(details.tabId);
      const request = tabRequests.get(details.requestId);

      if (request && !request.completed) {
        request.completed = true;
        request.error = details.error;

        // Run issue detection on this request
        const issues = detectRequestIssues(request);
        if (issues.length > 0) {
          request.issues = [...(request.issues || []), ...issues];
        }

        broadcastToDevTools({
          type: 'REQUEST_ERROR',
          payload: {
            id: request.id,
            error: details.error,
            issues: request.issues,
          },
        });

        // Schedule cross-request issue detection
        scheduleCrossRequestIssueDetection(details.tabId);
      }
    },
    { urls: ['<all_urls>'] }
  );

  // Handle messages from DevTools panel and content scripts
  chrome.runtime.onMessage.addListener((message: MessageType | { type: 'HIGHLIGHT_ELEMENT' | 'CLEAR_HIGHLIGHT' | 'SLOT_MAPPINGS_UPDATED'; tabId?: number; payload?: any }, sender, sendResponse) => {
    // Handle slot mappings update from content script
    if (message.type === 'SLOT_MAPPINGS_UPDATED') {
      const tabId = sender.tab?.id;
      console.log('[AdFlow BG] Received SLOT_MAPPINGS_UPDATED from tab', tabId, 'slots:', message.payload?.slots?.length);
      if (tabId && message.payload?.slots) {
        slotMappingsByTab.set(tabId, message.payload.slots);
        console.log('[AdFlow BG] Stored', message.payload.slots.length, 'slots for tab', tabId);

        // Retroactively update requests with elementId if we now have mappings
        const tabRequests = getTabRequests(tabId);
        for (const request of tabRequests.values()) {
          if (request.slotId && !request.elementId) {
            const elementId = findElementIdForSlot(tabId, request.slotId);
            if (elementId) {
              request.elementId = elementId;
            }
          }
        }

        // Broadcast to DevTools panel
        console.log('[AdFlow BG] Broadcasting SLOT_MAPPINGS_UPDATED to DevTools panel');
        broadcastToDevTools({
          type: 'SLOT_MAPPINGS_UPDATED',
          payload: message.payload,
        });
      }
      return;
    }

    if (message.type === 'GET_REQUESTS') {
      const tabRequests = getTabRequests(message.tabId);
      const requests = Array.from(tabRequests.values());

      sendResponse({
        type: 'REQUESTS_DATA',
        payload: requests,
      });
    }

    if (message.type === 'GET_SLOT_MAPPINGS' && 'tabId' in message) {
      const slots = slotMappingsByTab.get(message.tabId) || [];
      console.log('[AdFlow BG] GET_SLOT_MAPPINGS for tab', message.tabId, 'returning', slots.length, 'slots');
      sendResponse({
        type: 'SLOT_MAPPINGS_DATA',
        payload: { slots },
      });
    }

    if (message.type === 'CLEAR_REQUESTS') {
      // Clear requests for all tabs or specific tab
      requestsByTab.clear();
      broadcastToDevTools({ type: 'CLEAR_REQUESTS' });
    }

    // Relay highlight messages to content script - now uses elementId/slotId instead of URL
    if (message.type === 'HIGHLIGHT_ELEMENT' && 'tabId' in message && message.tabId) {
      const { elementId, slotId } = message.payload || {};

      // Send to all frames and collect responses
      chrome.webNavigation.getAllFrames({ tabId: message.tabId }, (frames) => {
        if (!frames || frames.length === 0) {
          sendResponse({ success: false });
          return;
        }

        let foundInAnyFrame = false;
        let responsesReceived = 0;
        const totalFrames = frames.length;

        frames.forEach((frame) => {
          chrome.tabs.sendMessage(
            message.tabId!,
            {
              type: 'HIGHLIGHT_ELEMENT',
              payload: { elementId, slotId },
            },
            { frameId: frame.frameId },
            (response) => {
              responsesReceived++;
              if (response?.success) {
                foundInAnyFrame = true;
              }
              // Send response after checking all frames or when found
              if (foundInAnyFrame || responsesReceived === totalFrames) {
                sendResponse({ success: foundInAnyFrame, elementInfo: response?.elementInfo });
              }
            }
          );
        });
      });
      return true; // Keep channel open for async response
    }

    if (message.type === 'CLEAR_HIGHLIGHT' && 'tabId' in message && message.tabId) {
      // Clear in all frames
      chrome.webNavigation.getAllFrames({ tabId: message.tabId }, (frames) => {
        if (frames) {
          frames.forEach((frame) => {
            chrome.tabs.sendMessage(
              message.tabId!,
              { type: 'CLEAR_HIGHLIGHT' },
              { frameId: frame.frameId }
            );
          });
        }
      });
      sendResponse({ success: true });
      return true;
    }

    return true; // Keep channel open for async response
  });
});
