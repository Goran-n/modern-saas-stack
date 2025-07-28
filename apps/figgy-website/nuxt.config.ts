import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",

  modules: [
    "@nuxt/icon",
    "@nuxtjs/color-mode",
    "@vueuse/nuxt",
  ],

  icon: {
    serverBundle: {
      collections: ["heroicons", "simple-icons", "mdi", "carbon"], 
    },
  },

  ssr: true,

  devtools: { enabled: true },

  devServer: {
    port: process.env.WEBSITE_PORT ? parseInt(process.env.WEBSITE_PORT) : 8020,
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  css: ["~/app.css"],

  colorMode: {
    classSuffix: "",
    preference: "light",
    fallback: "light",
  },

  app: {
    head: {
      title: "Figgy - Your AI Accountant That Never Sleeps",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { 
          name: "description", 
          content: "Figgy automates invoice and receipt processing for small businesses. Send documents via WhatsApp, Slack or Email. AI-powered bookkeeping that saves you 20+ hours per month." 
        },
        { property: "og:title", content: "Figgy - Your AI Accountant That Never Sleeps" },
        { property: "og:description", content: "Automate invoice processing with AI. Works with WhatsApp, Slack, Email. Integrates with Xero & QuickBooks. Save 20+ hours monthly on bookkeeping." },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Figgy" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Figgy - AI-Powered Invoice Automation" },
        { name: "twitter:description", content: "Send invoices via chat. AI reads, organizes & posts to your accounting software. £49/month." },
      ],
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        {
          rel: "icon",
          type: "image/png",
          sizes: "16x16",
          href: "/favicon-16x16.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "48x48",
          href: "/favicon-48x48.png",
        },
      ],
    },
  },

  nitro: {
    prerender: {
      routes: ['/'],
    },
  },

  imports: {
    dirs: ["composables", "utils"],
  },

  components: {
    global: true,
    dirs: [
      "~/components",
      "~/components/landing",
      "~/components/shared",
    ],
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["vue"],
    },
  },
});