import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",

  modules: [
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@nuxtjs/color-mode",
    "@nuxtjs/supabase",
    "@pinia/nuxt",
    "@vueuse/nuxt",
  ],

  icon: {
    serverBundle: {
      collections: ["heroicons", "simple-icons"], // Only include needed icon packs
    },
  },

  ssr: false,

  devtools: { enabled: true },

  devServer: {
    port: process.env.WEB_PORT ? parseInt(process.env.WEB_PORT) : 8010,
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || "http://localhost:8011",
      oauthApiUrl:
        process.env.NUXT_PUBLIC_OAUTH_API_URL ||
        process.env.NUXT_PUBLIC_API_URL ||
        "http://localhost:8011",
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

  css: ["~/app.css"],

  colorMode: {
    classSuffix: "",
    preference: "light",
    fallback: "light",
  },

  pinia: {
    storesDirs: ["./stores/**"],
  },

  app: {
    head: {
      title: "Figgy",
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
      "/api/**": {
        target: "http://localhost:8011",
        changeOrigin: true,
        ws: true,
      },
      "/trpc/**": {
        target: "http://localhost:8011",
        changeOrigin: true,
        ws: true,
      },
    },
  },

  imports: {
    dirs: ["stores", "composables", "utils"],
  },

  components: {
    global: true,
    dirs: [
      "~/components",
      "~/components/atoms",
      "~/components/molecules",
      "~/components/organisms",
    ],
  },

  fonts: {
    families: [{ name: "Inter", provider: "google" }],
  },

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        cookie: "cookie",
      },
    },
    optimizeDeps: {
      include: ["cookie", "pinia", "vue"],
      exclude: [],
      esbuildOptions: {
        keepNames: true,
      },
    },
    server: {
      hmr: {
        overlay: false,
        timeout: 60000,
      },
      watch: {
        usePolling: false,
        interval: 1000,
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ["vue", "vue-router", "pinia"],
          },
        },
      },
    },
    esbuild: {
      keepNames: true,
      minifyIdentifiers: false,
    },
  },
});
