import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AdFlow Inspector',
    description: 'Debug adtech network requests with vendor recognition and payload decoding',
    version: '1.0.0',
    icons: {
      16: '/icons/icon.svg',
      32: '/icons/icon.svg',
      48: '/icons/icon.svg',
      128: '/icons/icon.svg',
    },
    action: {
      default_title: 'AdFlow Inspector - Click to open side panel',
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
});
