<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const { t } = useI18n()
const isFullscreen = ref(false)
const isMobileDevice = ref(false)
const gameStarted = ref(false)

const updateFullscreenState = () => {
  isFullscreen.value = !!document.fullscreenElement
}

const reloadPage = () => {
  window.location.reload()
}

const updateMobileState = () => {
  const userAgent = navigator.userAgent
  isMobileDevice.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent)
}

const handleGameStarted = () => {
  gameStarted.value = true
}

onMounted(() => {
  updateFullscreenState()
  updateMobileState()
  document.addEventListener('fullscreenchange', updateFullscreenState)
  window.addEventListener('battle-puno:game-started', handleGameStarted)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', updateFullscreenState)
  window.removeEventListener('battle-puno:game-started', handleGameStarted)
})

useHead({
  title: t('TitleText'),
})
</script>

<template>
  <div class="site-shell">
    <header class="site-header">
      <h1>{{ t('TitleText') }}</h1>
      <nav aria-label="Main navigation">
        <NuxtLink to="/rules">{{ t('Rules') }}</NuxtLink>
        <a v-if="!(isMobileDevice && gameStarted)" class="github-button" href="https://github.com/jmfergeau/battle-puno?tab=readme-ov-file" target="_blank" rel="noopener noreferrer">GitHub</a>
      </nav>
      <button v-if="isFullscreen" class="fullscreen-reload" type="button" @click="reloadPage">
        {{ t('Reload') }}
      </button>
    </header>

    <main>
      <ClientOnly fallback-tag="p" fallback="Loading game...">
        <LegacyGame />
      </ClientOnly>
    </main>
  </div>
</template>
