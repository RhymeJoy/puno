const configuredBaseURL = process.env.NUXT_APP_BASE_URL || '/'
const appBaseURL = configuredBaseURL.endsWith('/') ? configuredBaseURL : `${configuredBaseURL}/`

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  modules: ['@nuxtjs/i18n'],

  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en_us',
    locales: [
      { code: 'en_us', language: 'en-US', name: 'English (US)' },
      { code: 'zh_tw', language: 'zh-TW', name: '繁體中文' },
      { code: 'zh_cn', language: 'zh-CN', name: '简体中文' },
      { code: 'fr_fr', language: 'fr-FR', name: 'Français' },
      { code: 'ja_jp', language: 'ja-JP', name: '日本語' },
      { code: 'ko_kr', language: 'ko-KR', name: '한국어' },
    ],
    vueI18n: './i18n.config.ts',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'battle-puno-locale',
      redirectOn: 'root',
    },
  },

  css: ['~/assets/css/main.css'],

  nitro: {
    prerender: {
      crawlLinks: false,
      routes: ['/', '/rules'],
    },
  },

  app: {
    head: {
      title: 'Battle-Puno',
      meta: [
        { name: 'description', content: 'Battle-Puno card game' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: `${appBaseURL}favicon.ico` },
      ],
    },
  },
})
