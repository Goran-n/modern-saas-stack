import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",

  modules: [
    "@nuxt/icon",
    "@nuxtjs/color-mode",
    "@nuxtjs/supabase",
    "@pinia/nuxt",
    "@vueuse/nuxt",
  ],

  icon: {
    serverBundle: {
      collections: ["heroicons", "simple-icons"],
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
      apiUrl: process.env.NUXT_PUBLIC_API_URL || "http://localhost:3000",
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
      title: "My App",
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.png" },
      ],
    },
  },

  nitro: {
    devProxy: {
      "/api/**": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
      "/trpc/**": {
        target: "http://localhost:3000",
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

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        cookie: "cookie",
      },
    },
    optimizeDeps: {
      include: ["cookie", "pinia", "vue"],
    },
  },
});