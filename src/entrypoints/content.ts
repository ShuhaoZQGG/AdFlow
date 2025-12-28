// Content script for highlighting DOM elements by element ID
// Also supports element picker for inspecting any element and its network requests

import type { SlotInfo, SelectedElement } from '@/lib/types';

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

    // Element picker state
    let pickerActive = false;
    let pickerOverlay: HTMLDivElement | null = null;
    let pickerHoverElement: HTMLElement | null = null; // Element being hovered (blue highlight)
    let currentSelectedElement: HTMLElement | null = null; // Currently selected element (yellow highlight)
    let isSelecting = false; // Flag to prevent multiple simultaneous selections
    
    // Store MutationObservers for highlighted elements to ensure persistence
    const highlightObservers = new WeakMap<HTMLElement, MutationObserver>();

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
      } else if (message.type === 'START_ELEMENT_PICKER') {
        startElementPicker();
        sendResponse({ success: true });
      } else if (message.type === 'STOP_ELEMENT_PICKER') {
        stopElementPicker();
        sendResponse({ success: true });
      }
      return true;
    });

    // ===== Element Picker Functions =====

    function startElementPicker() {
      if (pickerActive) return;
      pickerActive = true;
      isSelecting = false; // Reset selection flag
      console.log('[AdFlow Content] Element picker started');

      // Clear any existing hover state
      clearPickerHover();
      
      // Clear previous selection highlight when starting new picker session
      // This allows user to start fresh or switch to a different element
      if (currentSelectedElement) {
        clearHighlight();
        currentSelectedElement = null;
      }
      
      // Notify background to clear any existing inspected element
      chrome.runtime.sendMessage({
        type: 'CLEAR_INSPECTED_ELEMENT',
      }).catch(() => {});
      
      // Add class to body to disable iframe interactions
      document.body.classList.add('adflow-picker-active');

      // Create overlay for picker UI
      createPickerOverlay();

      // Add event listeners - use capture phase to intercept before other handlers
      document.addEventListener('mousemove', handlePickerMouseMove, true);
      document.addEventListener('mousedown', handlePickerMousedown, true);
      document.addEventListener('mouseup', handlePickerMouseup, true);
      document.addEventListener('click', handlePickerClick, true);
      document.addEventListener('keydown', handlePickerKeydown, true);
    }

    function stopElementPicker() {
      if (!pickerActive) return;
      pickerActive = false;
      isSelecting = false; // Reset selection flag
      console.log('[AdFlow Content] Element picker stopped');

      // Remove class from body to re-enable iframe interactions
      document.body.classList.remove('adflow-picker-active');

      // Remove overlay
      removePickerOverlay();
      clearPickerHover(); // Clear hover state but keep selected element highlighted

      // Remove event listeners
      document.removeEventListener('mousemove', handlePickerMouseMove, true);
      document.removeEventListener('mousedown', handlePickerMousedown, true);
      document.removeEventListener('mouseup', handlePickerMouseup, true);
      document.removeEventListener('click', handlePickerClick, true);
      document.removeEventListener('keydown', handlePickerKeydown, true);

      // Note: We intentionally keep currentSelectedElement and its highlight
      // The highlight will remain until user starts a new picker session or clears it
    }

    function createPickerOverlay() {
      if (pickerOverlay) return;

      // Add picker styles
      const style = document.createElement('style');
      style.id = 'adflow-picker-styles';
      style.textContent = `
        .adflow-picker-hover {
          outline: 3px solid #3B82F6 !important;
          outline-offset: -3px !important;
          background-color: rgba(59, 130, 246, 0.1) !important;
        }
        .adflow-highlight.adflow-picker-hover {
          /* When selected element is hovered, keep yellow highlight, remove blue hover */
          outline: none !important;
          background-color: rgba(255, 230, 100, 0.15) !important;
        }
        .adflow-picker-active iframe {
          pointer-events: none !important;
        }
        #adflow-picker-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2147483646;
          cursor: crosshair;
          pointer-events: none;
        }
        #adflow-picker-tooltip {
          position: fixed;
          background: #1F2937;
          color: white;
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 4px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
          z-index: 2147483647;
          pointer-events: none;
          max-width: 400px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        #adflow-picker-tooltip .tag {
          color: #60A5FA;
          font-weight: bold;
        }
        #adflow-picker-tooltip .id {
          color: #34D399;
        }
        #adflow-picker-tooltip .class {
          color: #FBBF24;
        }
        #adflow-picker-instructions {
          position: fixed;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #3B82F6, #2563EB);
          color: white;
          font-size: 13px;
          padding: 8px 16px;
          border-radius: 6px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          z-index: 2147483647;
          pointer-events: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
      `;
      document.head.appendChild(style);

      // Create overlay (invisible, just for cursor)
      pickerOverlay = document.createElement('div');
      pickerOverlay.id = 'adflow-picker-overlay';
      document.body.appendChild(pickerOverlay);

      // Create tooltip
      const tooltip = document.createElement('div');
      tooltip.id = 'adflow-picker-tooltip';
      tooltip.style.display = 'none';
      document.body.appendChild(tooltip);

      // Create instructions
      const instructions = document.createElement('div');
      instructions.id = 'adflow-picker-instructions';
      instructions.innerHTML = 'Click an element to inspect its network requests • Press <b>Esc</b> to cancel';
      document.body.appendChild(instructions);
    }

    function removePickerOverlay() {
      document.getElementById('adflow-picker-styles')?.remove();
      document.getElementById('adflow-picker-overlay')?.remove();
      document.getElementById('adflow-picker-tooltip')?.remove();
      document.getElementById('adflow-picker-instructions')?.remove();
      pickerOverlay = null;
    }

    function clearPickerHover() {
      if (pickerHoverElement) {
        pickerHoverElement.classList.remove('adflow-picker-hover');
        pickerHoverElement = null;
      }
    }

    function handlePickerMouseMove(e: MouseEvent) {
      if (!pickerActive || isSelecting) return; // Don't update hover if selecting

      // Get all elements under cursor
      const elementsUnderCursor = document.elementsFromPoint(e.clientX, e.clientY);
      
      // Filter out our overlay elements and find the most specific valid element
      // elementsFromPoint returns elements from most specific to least specific
      const targetElement = elementsUnderCursor.find(el => {
        if (el.id?.startsWith('adflow-picker')) return false;
        if (el.tagName === 'HTML' || el.tagName === 'BODY') return false;
        if (!(el instanceof HTMLElement)) return false;
        // Make sure it's actually in the document
        if (!document.contains(el)) return false;
        // Skip if it's a child of our overlay
        if (el.closest('#adflow-picker-overlay')) return false;
        return true;
      }) as HTMLElement | undefined;

      if (targetElement && targetElement !== pickerHoverElement) {
        clearPickerHover();
        pickerHoverElement = targetElement;
        
        // Only add hover highlight if this element is not the currently selected one
        // (selected elements should show yellow highlight, not blue hover)
        // Also check that it doesn't already have the highlight class
        if (targetElement !== currentSelectedElement && !targetElement.classList.contains('adflow-highlight')) {
          targetElement.classList.add('adflow-picker-hover');
        }

        // Update tooltip
        updatePickerTooltip(targetElement, e.clientX, e.clientY);
      } else if (!targetElement && pickerHoverElement) {
        // Clear hover if we're not over any valid element
        clearPickerHover();
      }
    }

    function updatePickerTooltip(element: HTMLElement, x: number, y: number) {
      const tooltip = document.getElementById('adflow-picker-tooltip');
      if (!tooltip) return;

      // Build element description
      let html = `<span class="tag">${element.tagName.toLowerCase()}</span>`;
      if (element.id) {
        html += `<span class="id">#${element.id}</span>`;
      }
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ').filter(c => c && !c.startsWith('adflow-')).slice(0, 2);
        if (classes.length > 0) {
          html += `<span class="class">.${classes.join('.')}</span>`;
        }
      }
      // Show src for images/iframes
      const src = element.getAttribute('src');
      if (src) {
        const shortSrc = src.length > 50 ? src.substring(0, 50) + '...' : src;
        html += ` <span style="color: #9CA3AF; font-size: 10px;">${shortSrc}</span>`;
      }

      tooltip.innerHTML = html;
      tooltip.style.display = 'block';

      // Position tooltip near cursor
      const tooltipRect = tooltip.getBoundingClientRect();
      let tooltipX = x + 15;
      let tooltipY = y + 15;

      // Keep tooltip on screen
      if (tooltipX + tooltipRect.width > window.innerWidth - 10) {
        tooltipX = x - tooltipRect.width - 15;
      }
      if (tooltipY + tooltipRect.height > window.innerHeight - 10) {
        tooltipY = y - tooltipRect.height - 15;
      }

      tooltip.style.left = `${tooltipX}px`;
      tooltip.style.top = `${tooltipY}px`;
    }

    function handlePickerMousedown(e: MouseEvent) {
      if (!pickerActive || isSelecting) return; // Don't handle if already selecting

      // Only prevent if we have a hovered element to select
      // This allows hover detection to work properly
      if (pickerHoverElement && e.button === 0) {
        // Prevent all mousedown events to stop clicks from propagating
        // This prevents iframe ads from redirecting when clicked
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Mark that we're in selection mode
        (e as any).__adflowSelecting = true;
      } else {
        // If no hovered element, still prevent on iframes and links to be safe
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'IFRAME' || target.tagName === 'A' || target.closest('iframe') || target.closest('a'))) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }

    function handlePickerMouseup(e: MouseEvent) {
      if (!pickerActive || isSelecting) return; // Prevent multiple simultaneous selections

      // Prevent all mouseup events during picker mode
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Only proceed if we have a hovered element and this was a left click
      if (!pickerHoverElement || e.button !== 0) return;

      // Set flag to prevent race conditions during selection processing
      isSelecting = true;

      const selectedElement = pickerHoverElement;
      console.log('[AdFlow Content] Element selected:', selectedElement);

      // Remove hover highlight from selected element first (it will get yellow highlight instead)
      if (pickerHoverElement === selectedElement) {
        selectedElement.classList.remove('adflow-picker-hover');
        pickerHoverElement = null; // Clear hover reference
      }

      // Clear previous selection highlight before applying new one
      // Only clear if it's a different element
      if (currentSelectedElement && currentSelectedElement !== selectedElement) {
        // Disconnect observer from previous element
        const oldObserver = highlightObservers.get(currentSelectedElement);
        if (oldObserver) {
          oldObserver.disconnect();
          highlightObservers.delete(currentSelectedElement);
        }
        // Remove highlight class from previous element directly (don't use clearHighlight to avoid clearing styles)
        currentSelectedElement.classList.remove('adflow-highlight', 'adflow-highlight-slot');
        // Remove label if it exists
        const oldLabel = document.getElementById('adflow-highlight-label');
        if (oldLabel) oldLabel.remove();
      }

      // Update current selected element BEFORE applying highlight
      currentSelectedElement = selectedElement;

      // Collect element info
      const elementInfo = collectElementInfo(selectedElement);

      // Apply yellow highlight to selected element (keep picker active)
      // false = not ad slot, so no rotation animation
      applyHighlight(selectedElement, getElementLabel(selectedElement), false);
      
      // Ensure highlight persists - set up a MutationObserver to re-apply if removed
      if (!highlightObservers.has(selectedElement)) {
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              // If highlight class was removed and this is still the selected element, re-add it
              if (selectedElement === currentSelectedElement && 
                  !selectedElement.classList.contains('adflow-highlight') &&
                  document.contains(selectedElement)) {
                console.warn('[AdFlow Content] Highlight class was removed! Re-applying...');
                selectedElement.classList.add('adflow-highlight');
              }
            }
          }
        });
        observer.observe(selectedElement, { attributes: true, attributeFilter: ['class'] });
        highlightObservers.set(selectedElement, observer);
      }

      // Send to background script to update filters
      chrome.runtime.sendMessage({
        type: 'ELEMENT_SELECTED',
        payload: elementInfo,
      })
        .then(() => {
          // Reset flag after successful send so user can select another element
          isSelecting = false;
        })
        .catch(err => {
          console.warn('[AdFlow Content] Failed to send element selection:', err);
          // Reset flag if send failed so user can try again
          isSelecting = false;
        });
    }

    function handlePickerClick(e: MouseEvent) {
      if (!pickerActive) return;

      // Prevent all click events during picker mode
      // This is a backup in case mousedown/mouseup didn't catch it
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // If this click somehow got through, also stop the picker
      // (This shouldn't happen, but acts as a safety net)
      if ((e as any).__adflowSelecting) {
        stopElementPicker();
      }
    }

    function handlePickerKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        stopElementPicker();

        // Notify background that picker was stopped
        // Note: We keep the last selected element highlighted
        chrome.runtime.sendMessage({
          type: 'ELEMENT_PICKER_STOPPED',
        }).catch(() => {});
      }
    }

    function getElementLabel(element: HTMLElement): string {
      let label = element.tagName.toLowerCase();
      if (element.id) {
        label += `#${element.id}`;
      } else if (element.className && typeof element.className === 'string') {
        const firstClass = element.className.split(' ').find(c => c && !c.startsWith('adflow-'));
        if (firstClass) {
          label += `.${firstClass}`;
        }
      }
      return label;
    }

    function collectElementInfo(element: HTMLElement): SelectedElement {
      const rect = element.getBoundingClientRect();

      // Collect direct URLs from this element
      const directUrls: string[] = [];
      const src = element.getAttribute('src');
      const href = element.getAttribute('href');
      if (src && isValidUrl(src)) directUrls.push(src);
      if (href && isValidUrl(href)) directUrls.push(href);

      // Also collect URLs from child elements (images, scripts, etc.)
      const childResources = element.querySelectorAll('img[src], script[src], link[href], iframe[src]');
      childResources.forEach(child => {
        const childSrc = child.getAttribute('src') || child.getAttribute('href');
        if (childSrc && isValidUrl(childSrc) && !directUrls.includes(childSrc)) {
          directUrls.push(childSrc);
        }
      });

      // Collect child iframe info
      const childFrameIds: number[] = [];
      // Note: We can't directly get frameIds from content script
      // But we can identify iframes for the background to match
      const childIframes = element.querySelectorAll('iframe');
      // We'll need to use a different approach - collect iframe src URLs
      // and let the background match them to frameIds

      // Get the document URL for frame resolution
      const documentUrl = window.location.href;

      // Determine which frame this element is in (will be resolved by background script)
      // We'll send documentUrl so background can match it to the correct frameId
      const frameId = 0; // Placeholder - will be resolved by background script

      const info: SelectedElement = {
        tagName: element.tagName.toLowerCase(),
        id: element.id || undefined,
        className: typeof element.className === 'string' ? element.className : undefined,
        src: src || undefined,
        href: href || undefined,
        innerText: element.innerText?.substring(0, 100) || undefined,
        frameId,
        childFrameIds,
        directUrls,
        documentUrl,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
      };

      // If the element is an iframe, try to get more info
      if (element.tagName === 'IFRAME') {
        // Mark that this is an iframe - the background will need to find its frameId
        // by matching the src URL
        info.src = (element as HTMLIFrameElement).src;
      }

      // Collect child iframe URLs for the background to match
      childIframes.forEach(iframe => {
        if (iframe.src) {
          directUrls.push(iframe.src);
        }
      });

      console.log('[AdFlow Content] Collected element info:', info);
      return info;
    }

    function isValidUrl(str: string): boolean {
      try {
        // Handle relative URLs
        if (str.startsWith('//') || str.startsWith('http://') || str.startsWith('https://')) {
          new URL(str.startsWith('//') ? 'https:' + str : str);
          return true;
        }
        // For relative paths, they're valid URLs in context
        return str.startsWith('/') || !str.includes(':');
      } catch {
        return false;
      }
    }

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

      applyHighlight(element, info, true); // true = isAdSlot, includes rotation animation
      scrollToElement(element);

      return { found: true, info };
    }

    // Apply highlight effect to element
    // isAdSlot: true for ad slot selection (with rotation), false for element inspection (persistent, no rotation)
    function applyHighlight(element: HTMLElement, label: string, isAdSlot: boolean = false) {
      // Ensure we're highlighting the correct element
      if (!element || !document.contains(element)) {
        console.warn('[AdFlow Content] Cannot highlight element - not in DOM');
        return;
      }

      // Update the tracked highlighted element
      currentHighlightedElement = element;

      // Ensure styles are in the document (only add once, reuse if exists)
      let style = document.getElementById('adflow-highlight-styles') as HTMLStyleElement;
      if (!style) {
        style = document.createElement('style');
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
            animation: adflow-glow 1.5s ease-in-out infinite !important;
            box-shadow:
              inset 0 0 0 6px rgba(255, 200, 0, 1),
              0 0 0 6px rgba(255, 200, 0, 1),
              0 0 20px rgba(255, 200, 0, 0.8),
              0 0 40px rgba(255, 200, 0, 0.5),
              0 0 60px rgba(255, 200, 0, 0.3) !important;
            background-color: rgba(255, 230, 100, 0.15) !important;
            border-radius: 6px !important;
          }
          .adflow-highlight-slot {
            animation: adflow-glow 1.5s ease-in-out infinite, adflow-rotate 1.5s ease-in-out 2 !important;
          }
        `;
        document.head.appendChild(style);
      }

      // Remove highlight from any previous element (if different)
      const allHighlighted = document.querySelectorAll('.adflow-highlight, .adflow-highlight-slot');
      allHighlighted.forEach(el => {
        if (el !== element) {
          el.classList.remove('adflow-highlight', 'adflow-highlight-slot');
        }
      });

      // Apply highlight class to the element
      element.classList.add('adflow-highlight');
      
      // Add rotation animation only for ad slot selection
      if (isAdSlot) {
        element.classList.add('adflow-highlight-slot');
      } else {
        element.classList.remove('adflow-highlight-slot');
      }
      
      // Force a reflow to ensure the class is applied and visible
      void element.offsetHeight;

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
        currentHighlightedElement.classList.remove('adflow-highlight', 'adflow-highlight-slot');
        currentHighlightedElement = null;
      }
      // Don't remove styles - they might be needed for other highlights
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
