export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  
  modules: [
    '@nuxt/ui-pro',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],


  ssr: true,
  
  devtools: { enabled: true },

  devServer: {
    port: process.env.WEB_PORT ? parseInt(process.env.WEB_PORT) : 4000
  },
  
  typescript: {
    strict: true,
    typeCheck: true
  },

  runtimeConfig: {
    public: {
      apiUrl: process.env.API_URL || 'http://localhost:5001',
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
    }
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light'
  },

  app: {
    head: {
      title: 'Kibly',
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon-48x48.png' },
      ]
    }
  },

  nitro: {
    devProxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:5001',
        changeOrigin: true
      }
    }
  },

  imports: {
    dirs: ['stores', 'composables', 'utils']
  },

  components: {
    global: true,
    dirs: ['~/components']
  },

  fonts: {
    families: [
      { name: 'Inter', provider: 'google' }
    ]
  }
})