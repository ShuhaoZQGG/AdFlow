import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AdFlow Network Inspector',
    description: 'Debug adtech network requests with vendor recognition and payload decoding',
    version: '1.0.0',
    icons: {
      16: '/icons/icon.svg',
      32: '/icons/icon.svg',
      48: '/icons/icon.svg',
      128: '/icons/icon.svg',
    },
    action: {
      default_title: 'AdFlow Network Inspector - Click to open side panel',
    },
    permissions: [
      'webRequest',
      'storage',
      'tabs',
      'webNavigation',
      'scripting',
      'alarms',
      'sidePanel',
    ],
    // Host permissions: Required to intercept network requests from any website
    // Adtech requests can originate from hundreds of different domains (SSPs, DSPs, verification services)
    // We need broad access to capture and analyze advertising-related HTTP traffic for debugging
    // Note: <all_urls> already covers all domains including AI service endpoints, so optional_host_permissions
    // would be redundant. AI features are controlled via user settings, not permissions.
    host_permissions: ['<all_urls>'],
    side_panel: {
      default_path: 'sidepanel.html',
    },
    devtools_page: 'devtools.html',
    web_accessible_resources: [
      {
        resources: ['/injected.js'],
        matches: ['<all_urls>'],
      },
    ],
  },
  vite: () => ({
    build: {
      // Remove console logs in production builds
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // Remove all console.* statements
          drop_debugger: true, // Remove debugger statements
          pure_funcs: ['console.log', 'console.debug', 'console.info', 'console.warn'], // Remove specific console methods
        },
        format: {
          comments: false, // Remove all comments
        },
      },
    },
  }),
});
