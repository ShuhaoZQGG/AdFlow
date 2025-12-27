// Only run in actual DevTools context (not during build/pre-render)
if (typeof chrome !== 'undefined' && chrome.devtools?.panels) {
  chrome.devtools.panels.create(
    'AdFlow',
    '/icons/icon.svg',
    '/panel.html',
    (panel) => {
      console.log('AdFlow panel created');
    }
  );
}
