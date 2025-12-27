// Content script for highlighting DOM elements by element ID
// Simplified approach: only highlight elements we can definitely find via GAM/Prebid APIs

import type { SlotInfo } from '@/lib/types';

interface SlotMappings {
  slots: SlotInfo[];
  timestamp: number;
}

// Find elementId for a slotId from cached mappings
function findElementIdForSlot(slotId: string, mappings: SlotMappings): string | undefined {
  // Direct match
  const directMatch = mappings.slots.find(s => s.slotId === slotId);
  if (directMatch) return directMatch.elementId;

  // Partial match - slotId might be part of a longer path
  const partialMatch = mappings.slots.find(s =>
    s.slotId.includes(slotId) || slotId.includes(s.slotId)
  );
  if (partialMatch) return partialMatch.elementId;

  // Match by elementId directly (in case slotId is actually the element ID)
  const elementMatch = mappings.slots.find(s => s.elementId === slotId);
  if (elementMatch) return elementMatch.elementId;

  return undefined;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  allFrames: true,
  main() {
    // Store slot mappings received from injected script
    let slotMappings: SlotMappings = { slots: [], timestamp: 0 };

    // Current highlight state
    let currentHighlightedElement: HTMLElement | null = null;

    // Inject the slot collector script into page context
    injectSlotCollector();

    // Listen for slot data from injected script
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      if (event.data?.type === 'ADFLOW_SLOT_DATA') {
        const newMappings = event.data.payload as SlotMappings;
        console.log('[AdFlow Content] Received slot data:', newMappings.slots.length, 'slots', newMappings.slots);

        // Merge new slots with existing (don't overwrite with empty data from iframes)
        if (newMappings.slots.length > 0) {
          // Add new slots that don't already exist
          for (const newSlot of newMappings.slots) {
            const exists = slotMappings.slots.some(s => s.elementId === newSlot.elementId);
            if (!exists) {
              slotMappings.slots.push(newSlot);
            }
          }
          slotMappings.timestamp = newMappings.timestamp;

          console.log('[AdFlow Content] Merged to', slotMappings.slots.length, 'total slots');

          // Forward to background script
          chrome.runtime.sendMessage({
            type: 'SLOT_MAPPINGS_UPDATED',
            payload: slotMappings,
          }).then(() => {
            console.log('[AdFlow Content] Forwarded to background successfully');
          }).catch((err) => {
            console.warn('[AdFlow Content] Failed to forward to background:', err);
          });
        }
      }
    });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'HIGHLIGHT_ELEMENT') {
        const { elementId, slotId } = message.payload;
        const result = highlightElement(elementId, slotId);
        sendResponse({ success: result.found, elementInfo: result.info });
      } else if (message.type === 'CLEAR_HIGHLIGHT') {
        clearHighlight();
        sendResponse({ success: true });
      } else if (message.type === 'GET_SLOT_MAPPINGS') {
        sendResponse({ slots: slotMappings });
      }
      return true;
    });

    // Find and highlight element by ID
    function highlightElement(elementId?: string, slotId?: string): { found: boolean; info?: string } {
      clearHighlight();

      let targetId = elementId;

      // If no elementId, try to find it from slotId using mappings
      if (!targetId && slotId) {
        targetId = findElementIdForSlot(slotId, slotMappings);
      }

      if (!targetId) {
        return { found: false };
      }

      // Simple getElementById - fast and reliable
      const element = document.getElementById(targetId);
      if (!element) {
        return { found: false };
      }

      // Find the slot info for additional context
      const slotInfo = slotMappings.slots.find(s => s.elementId === targetId);
      const info = slotInfo
        ? `${slotInfo.type.toUpperCase()}: ${slotInfo.slotId}${slotInfo.sizes ? ` (${slotInfo.sizes.join(', ')})` : ''}`
        : `Element: ${targetId}`;

      applyHighlight(element, info);
      scrollToElement(element);

      return { found: true, info };
    }

    // Apply highlight effect to element
    function applyHighlight(element: HTMLElement, label: string) {
      currentHighlightedElement = element;

      // Add animation styles to document
      const style = document.createElement('style');
      style.id = 'adflow-highlight-styles';
      style.textContent = `
        @keyframes adflow-glow {
          0%, 100% {
            box-shadow:
              inset 0 0 0 6px rgba(255, 200, 0, 1),
              0 0 0 6px rgba(255, 200, 0, 1),
              0 0 20px rgba(255, 200, 0, 0.8),
              0 0 40px rgba(255, 200, 0, 0.5),
              0 0 60px rgba(255, 200, 0, 0.3);
          }
          50% {
            box-shadow:
              inset 0 0 0 6px rgba(255, 180, 0, 1),
              0 0 0 6px rgba(255, 180, 0, 1),
              0 0 30px rgba(255, 200, 0, 1),
              0 0 60px rgba(255, 200, 0, 0.7),
              0 0 90px rgba(255, 200, 0, 0.4);
          }
        }
        @keyframes adflow-rotate {
          0% {
            transform: perspective(500px) rotateY(0deg);
          }
          25% {
            transform: perspective(500px) rotateY(8deg);
          }
          50% {
            transform: perspective(500px) rotateY(0deg);
          }
          75% {
            transform: perspective(500px) rotateY(-8deg);
          }
          100% {
            transform: perspective(500px) rotateY(0deg);
          }
        }
        .adflow-highlight {
          z-index: 2147483647 !important;
          position: relative !important;
          animation: adflow-glow 1.5s ease-in-out infinite, adflow-rotate 1.5s ease-in-out 2 !important;
          box-shadow:
            inset 0 0 0 6px rgba(255, 200, 0, 1),
            0 0 0 6px rgba(255, 200, 0, 1),
            0 0 20px rgba(255, 200, 0, 0.8),
            0 0 40px rgba(255, 200, 0, 0.5),
            0 0 60px rgba(255, 200, 0, 0.3) !important;
          background-color: rgba(255, 230, 100, 0.15) !important;
          border-radius: 6px !important;
        }
      `;

      // Remove existing styles
      document.getElementById('adflow-highlight-styles')?.remove();
      document.head.appendChild(style);

      // Apply highlight class
      element.classList.add('adflow-highlight');

      // Create floating label
      const rect = element.getBoundingClientRect();
      const labelEl = document.createElement('div');
      labelEl.id = 'adflow-highlight-label';
      labelEl.style.cssText = `
        position: fixed;
        top: ${Math.max(8, rect.top - 32)}px;
        left: ${Math.max(8, rect.left)}px;
        background: linear-gradient(135deg, #FFD700, #FFA500);
        color: #000;
        font-size: 12px;
        font-weight: bold;
        padding: 4px 12px;
        border-radius: 4px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        white-space: nowrap;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        z-index: 2147483647;
        pointer-events: none;
      `;
      labelEl.textContent = `AdFlow: ${label}`;

      document.getElementById('adflow-highlight-label')?.remove();
      document.body.appendChild(labelEl);

      // Highlight stays permanent until cleared by user action (selecting another slot or clearing filter)
    }

    // Scroll element into view
    function scrollToElement(element: Element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }

    // Clear current highlight
    function clearHighlight() {
      if (currentHighlightedElement) {
        currentHighlightedElement.classList.remove('adflow-highlight');
        currentHighlightedElement = null;
      }
      document.getElementById('adflow-highlight-styles')?.remove();
      document.getElementById('adflow-highlight-label')?.remove();
    }

    // Update label position on scroll
    function updateLabelPosition() {
      if (currentHighlightedElement) {
        const label = document.getElementById('adflow-highlight-label');
        if (label) {
          const rect = currentHighlightedElement.getBoundingClientRect();
          label.style.top = `${Math.max(8, rect.top - 32)}px`;
          label.style.left = `${Math.max(8, rect.left)}px`;
        }
      }
    }

    window.addEventListener('scroll', updateLabelPosition, { passive: true });
    window.addEventListener('resize', updateLabelPosition, { passive: true });
  },
});

// Inject script into page context to access GAM/Prebid APIs
// Uses chrome.runtime.getURL to bypass CSP restrictions on inline scripts
function injectSlotCollector() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('/injected.js');
  script.id = 'adflow-slot-collector';

  const target = document.head || document.documentElement;
  if (target) {
    target.appendChild(script);
    // Remove script element after it loads (keeps DOM clean)
    script.onload = () => {
      script.remove();
    };
  }
}
