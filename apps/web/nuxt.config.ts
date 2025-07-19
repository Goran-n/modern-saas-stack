export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",

  modules: [
    "@nuxt/ui-pro",
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@nuxtjs/color-mode",
    "@nuxtjs/supabase",
    "@pinia/nuxt",
    "@vueuse/nuxt",
  ],

  ssr: false,

  devtools: { enabled: true },

  devServer: {
    port: process.env.WEB_PORT ? parseInt(process.env.WEB_PORT) : 4000,
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || "http://localhost:5000",
    },
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    redirect: false,
    redirectOptions: {
      login: "/auth/login",
      callback: "/auth/confirm",
      exclude: ["/auth/*"],
    },
    cookieOptions: {
      maxAge: 60 * 60 * 8,
      sameSite: "lax",
      secure: true,
    },
  },

  css: ["~/assets/css/main.css"],

  ui: {
    theme: {
      colors: [
        "primary",
        "gray",
        "green",
        "red",
        "midnight",
        "electric",
        "prosperity",
        "alert",
      ],
    },
  },

  colorMode: {
    classSuffix: "",
    preference: "system",
    fallback: "light",
  },

  pinia: {
    storesDirs: ["./stores/**"],
    disableVuex: true,
  },

  app: {
    head: {
      title: "Kibly",
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
    devProxy: {
      "/api": {
        target: process.env.NUXT_PUBLIC_API_URL || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },

  imports: {
    dirs: ["stores", "composables", "utils"],
  },

  components: {
    global: true,
    dirs: ["~/components"],
  },

  fonts: {
    families: [{ name: "Inter", provider: "google" }],
  },

  vite: {
    resolve: {
      alias: {
        cookie: "cookie",
      },
    },
    optimizeDeps: {
      include: ["cookie"],
    },
  },
});
