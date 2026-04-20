export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  runtimeConfig: {
    cadenzaServerAddress: process.env.CADENZA_DB_ADDRESS ?? 'http://cadenza-db.localhost',
    cadenzaServerPort: parseInt(process.env.CADENZA_DB_PORT ?? '80', 10),
    public: {
      cadenzaBootstrapUrl: process.env.NUXT_PUBLIC_CADENZA_BOOTSTRAP_URL ?? 'http://cadenza-db.localhost:80',
    },
  },
  modules: ['nuxt-quasar-ui', '@pinia/nuxt'],
  css: [
    '@quasar/extras/material-icons/material-icons.css',
    'quasar/src/css/index.sass',
    '~/assets/css/main.css',
  ],
  ssr: false,
  build: {
    transpile: ['quasar'],
  },
  quasar: {
    plugins: ['Dialog', 'Notify', 'Dark'],
    cssAddon: true,
    config: {
      brand: {
        primary: '#007AFF',
        secondary: '#5AC8FA',
        accent: '#AF52DE',
        warning: '#FF9500',
        positive: '#34C759',
        negative: '#FF3B30',
        info: '#8E8E93',
      },
    },
  },
});
