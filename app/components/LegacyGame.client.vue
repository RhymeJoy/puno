<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as PixiModule from 'pixi.js'
import { ShockwaveFilter } from 'pixi-filters'

const runtimeConfig = useRuntimeConfig()
const { locale, setLocale } = useI18n()
const loading = ref(true)
const loadError = ref('')

type LocaleCode = 'en_us' | 'zh_tw' | 'zh_cn' | 'fr_fr' | 'ja_jp' | 'ko_kr'
const supportedLocales: LocaleCode[] = ['en_us', 'zh_tw', 'zh_cn', 'fr_fr', 'ja_jp', 'ko_kr']

const vendorScripts = [
  '/vendor/howler.js',
]

const vendorScriptPromises = new Map<string, Promise<void>>()
let gameRuntime: typeof import('../game/runtime/entry') | null = null
let disposed = false
let localeChangeQueue = Promise.resolve()

const withBase = (path: string) => {
  const baseURL = runtimeConfig.app.baseURL || '/'
  return `${baseURL.replace(/\/$/, '')}${path}` || '/'
}

function loadScript(path: string) {
  const pending = vendorScriptPromises.get(path)
  if (pending) {
    return pending
  }

  const existing = Array.from(document.scripts).find(script => script.dataset.battlePuno === path)
  if (existing) {
    return Promise.resolve()
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = withBase(path)
    script.dataset.battlePuno = path
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Unable to load ${path}`))
    document.head.appendChild(script)
  })

  vendorScriptPromises.set(path, promise)
  promise.catch(() => vendorScriptPromises.delete(path))
  return promise
}

function getStoredLocale(): LocaleCode | null {
  try {
    const stored = JSON.parse(window.localStorage.getItem('language') || 'null')
    return supportedLocales.includes(stored) ? stored : null
  }
  catch {
    return null
  }
}

function detectBrowserLocale(): LocaleCode {
  const browserLanguages = [navigator.language, ...(navigator.languages || [])]

  for (const browserLanguage of browserLanguages) {
    const normalized = browserLanguage.toLowerCase()
    if (normalized.startsWith('zh-tw') || normalized.includes('hant')) return 'zh_tw'
    if (normalized.startsWith('zh-cn') || normalized.startsWith('zh-sg') || normalized.includes('hans')) return 'zh_cn'
    if (normalized.startsWith('ja')) return 'ja_jp'
    if (normalized.startsWith('ko')) return 'ko_kr'
    if (normalized.startsWith('fr')) return 'fr_fr'
    if (normalized.startsWith('en')) return 'en_us'
  }

  return supportedLocales.includes(locale.value as LocaleCode)
    ? locale.value as LocaleCode
    : 'en_us'
}

async function initializeLocalePreference() {
  const storedLocale = getStoredLocale()
  const preferredLocale = storedLocale || detectBrowserLocale()

  if (locale.value !== preferredLocale) {
    await setLocale(preferredLocale)
  }

  window.localStorage.setItem('language', JSON.stringify(preferredLocale))
}

;(globalThis as typeof globalThis & {
  __battlePunoSetLocale?: (nextLocale: string) => Promise<void>
  __battlePunoRefreshLanguage?: () => void
}).__battlePunoSetLocale = (nextLocale: string) => {
  const nextChange = localeChangeQueue.then(() =>
    setLocale(nextLocale as typeof locale.value)
  )
  // Keep later changes in the queue even when an earlier locale load fails.
  localeChangeQueue = nextChange.catch(() => undefined)
  return nextChange
}

;(globalThis as typeof globalThis & {
  __battlePunoRefreshLanguage?: () => void
}).__battlePunoRefreshLanguage = () => gameRuntime?.refreshLegacyLanguage()

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  // Check if we're in a battle scene and user is trying to leave
  const SceneManager = (globalThis as any).SceneManager
  const SceneGame = (globalThis as any).Scene_Game
  
  if (SceneManager && SceneGame && SceneManager.scene instanceof SceneGame) {
    const gameScene = SceneManager.scene
    
    // Only show warning if not already leaving and battle has started
    if (!gameScene._leavingBattle && gameScene.game?.turn !== undefined) {
      // Prevent page unload
      event.preventDefault()
      event.returnValue = ''
      
      // Signal game scene to show leave confirmation
      gameScene._showLeaveConfirmation = true
      
      return false
    }
  }
}

onMounted(async () => {
  disposed = false

  try {
    await initializeLocalePreference()

    for (const script of vendorScripts) {
      await loadScript(script)
    }

    // The game modules still share one PIXI namespace. Populate it from the
    // bundled PixiJS 8 packages instead of loading a global vendor script.
    ;(globalThis as typeof globalThis & { PIXI?: unknown }).PIXI = {
      ...PixiModule,
      filters: {
        ShockwaveFilter,
      },
    }

    const runtime = await import('../game/runtime/entry')
    if (disposed) {
      runtime.stopLegacyGame()
      return
    }

    gameRuntime = runtime
    gameRuntime.startLegacyGame()
    loading.value = false
    
    // Add beforeunload listener to show warning when leaving battle
    window.addEventListener('beforeunload', handleBeforeUnload)
  }
  catch (error) {
    loading.value = false
    loadError.value = error instanceof Error ? error.message : 'Unable to load the game.'
  }
})

onBeforeUnmount(() => {
  disposed = true
  // Remove beforeunload listener
  window.removeEventListener('beforeunload', handleBeforeUnload)
  gameRuntime?.stopLegacyGame()
  gameRuntime = null
})
</script>

<template>
  <section class="legacy-game" aria-label="Battle-Puno game">
    <p v-if="loading" class="game-status">Loading game resources...</p>
    <p v-else-if="loadError" class="game-status game-error">{{ loadError }}</p>

    <div id="GAME" />
  </section>
</template>
