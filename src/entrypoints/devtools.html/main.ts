// Only run in actual DevTools context (not during build/pre-render)
if (typeof chrome !== 'undefined' && chrome.devtools?.panels) {
  console.log('[AdFlow DevTools] Initializing panel for tab:', chrome.devtools.inspectedWindow.tabId);

  chrome.devtools.panels.create(
    'AdFlow',
    '/icons/icon.svg',
    '/panel.html',
    (panel) => {
      if (chrome.runtime.lastError) {
        console.error('[AdFlow DevTools] Error creating panel:', chrome.runtime.lastError);
        return;
      }

      console.log('[AdFlow DevTools] Panel created successfully');

      // Log when panel is shown/hidden
      panel.onShown.addListener((panelWindow) => {
        console.log('[AdFlow DevTools] Panel shown');
      });

      panel.onHidden.addListener(() => {
        console.log('[AdFlow DevTools] Panel hidden');
      });
    }
  );
} else {
  console.log('[AdFlow DevTools] Not in DevTools context, skipping panel creation');
}
