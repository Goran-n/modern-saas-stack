import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  imports: false,
  dev: {
    openBrowser: false,
  },
  manifest: {
    name: "Figgy File Transfer",
    description: "Seamlessly drag files from Figgy to Xero",
    version: "1.0.0",
    permissions: ["storage", "tabs", "activeTab", "identity", "scripting"],
    host_permissions: [
      "https://*.figgy.com/*",
      "*://localhost/*",
      "*://127.0.0.1/*",
      "https://*.xero.com/*",
      "https://*.supabase.co/*",
      "https://accounts.google.com/*",
    ],
  },
  modules: ["@wxt-dev/module-vue"],
});
