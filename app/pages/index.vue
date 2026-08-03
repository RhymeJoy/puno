<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const { t } = useI18n()
const isFullscreen = ref(false)

const updateFullscreenState = () => {
  isFullscreen.value = !!document.fullscreenElement
}

const reloadPage = () => {
  window.location.reload()
}

onMounted(() => {
  updateFullscreenState()
  document.addEventListener('fullscreenchange', updateFullscreenState)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', updateFullscreenState)
})

useHead({
  title: t('TitleText'),
})
</script>

<template>
  <div class="site-shell">
    <header class="site-header">
      <h1>{{ t('TitleText') }}</h1>
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
