import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  imports: false,
  manifest: {
    name: 'Kibly File Transfer',
    description: 'Seamlessly drag files from Kibly to Xero',
    version: '1.0.0',
    permissions: ['storage', 'tabs', 'activeTab'],
    host_permissions: [
      'https://*.kibly.com/*',
      'http://localhost:*/*',
      'https://*.xero.com/*',
      'https://*.supabase.co/*'
    ],
  },
  modules: ['@wxt-dev/module-vue'],
});