// The original renderer is still global internally, but its source is now
// bundled and loaded from the Nuxt app as TypeScript modules.
import '../card/color'
import '../card/value'
import '../card/card'
import '../effect'
import '../mode'
import '../deck'
import '../player'
import './util'
import './addon'
import './errno'
import '../game'
import './core'
import './vocab'
import './managers'
import './window'
import './scenes'
import './scene_game'
import './objects'
import './assets'
import './main'

let runtimeStarted = false

export function startLegacyGame() {
  if (runtimeStarted) {
    return
  }
  runtimeStarted = true
  ;(globalThis as any).initializeApplication?.()
}

export function refreshLegacyLanguage() {
  const dataManager = (globalThis as any).DataManager
  const vocab = (globalThis as any).Vocab
  const graphics = (globalThis as any).Graphics
  const sceneManager = (globalThis as any).SceneManager

  dataManager?.loadLanguageFont?.()
  vocab?.initialize?.()
  graphics?.refreshGlobalUI?.()

  const scene = sceneManager?.scene
  const titleScene = (globalThis as any).Scene_Title
  if(scene && titleScene && scene instanceof titleScene){
    // Keep the original title-screen transition so every menu button is
    // created with a fresh PIXI interaction target after a locale change.
    sceneManager.goto(titleScene)
    return
  }

  // Other non-game scenes can refresh their localized windows in place.
  scene?.refreshLanguage?.()
}

export function stopLegacyGame() {
  runtimeStarted = false
  ;(globalThis as any).stopApplication?.()
  ;(globalThis as any).EventManager?.clear?.()
  if ((globalThis as any).GameManager) {
    ;(globalThis as any).GameManager.game = null
    ;(globalThis as any).GameManager._inTurn = false
  }
  ;(globalThis as any).SceneManager?.stop?.()
  ;(globalThis as any).Input?.shutdown?.()
  ;(globalThis as any).Sound?.shutdownAudioUnlock?.()
  ;(globalThis as any).Sound?.stopAll?.()
  ;(globalThis as any).Graphics?.globalWindows?.forEach((win: any) => {
    win.removeLanguageDropdownOutsideHandler?.()
    win.disposeLanguageDropdown?.()
    win.removeCanvasScaleDropdownOutsideHandler?.()
    win.disposeCanvasScaleDropdown?.()
    win.removeFullscreenUpdateHandler?.()
  })
  ;(globalThis as any).Graphics?.shutdown?.()
  ;(globalThis as any).GameStarted = false
  window.onbeforeunload = null
}
