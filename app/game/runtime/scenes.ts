// @ts-nocheck
/**
 * The Superclass of all scene within the game.
 *
 * @class Scene_Base
 * @constructor
 * @extends Stage
 * @property {boolean} _active      - acitve flag
 * @property {number}  _fadingFlag  - fade type flag
 * @property {number}  _fadingTimer - timer of fade effect
 * @property {Sprite}  _fadeSprite  - sprite of fade effect
 */
class Scene_Base extends Stage{
  /**-------------------------------------------------------------------------
   * @constructor
   * @memberof Scene_Base
   */
  constructor(){
    super();
    this._active  = false;
    this._windows = [];
    this._fadingFlag = 0;
    this._fadingTimer = 0;
    this.fadeDuration = 30;
    this._buttonCooldown = new Array(0xff);
    this._fadingSprite = Graphics.fadingSprite;
    this._terminating  = false;
    this._gamePaused = false;
    this.overlayParent = null;
    // Keep the interaction state from before the first overlay was opened.
    // Nested overlays (for example a language dropdown over the option
    // window) must not overwrite the state that will be restored when the
    // whole overlay stack is closed.
    this._overlayActiveStates = null;
  }
  /**-------------------------------------------------------------------------
   * > Frame update
   * @memberof Scene_Base
   */
  update(){
    this.updateFading();
    this.updateChildren();
    this.updateShake();
  }
  /*-------------------------------------------------------------------------*/
  updateChildren(){
    this.children.forEach(function(child){
      if(this._gamePaused && child !== this.overlay){return;}
      if(child.update){
        if(this._terminating && child.isWindow){return ;}
        if(!this.overlay || !child.isWindow || child === this.overlay){
          child.update();
        }
      }
    }.bind(this))
  }
  /*------------------------------------------------------------------------*/
  updateShake(){
    if(!this._shaking){return ;}
    if(this._shakeTimer <= 0){
      this.x = 0; this.y = 0;
      this._shaking = false;
      return ;
    }
    let dis = 2 * this._shakeLevel;
    let dx = randInt(0, 2 * dis) - dis;
    let dy = randInt(0, 2 * dis) - dis;
    this.x = dx;
    this.y = dy;
    this._shakeTimer -= 1;
  }
  /*------------------------------------------------------------------------*/
  sortChildren(){
    return super.sortChildren();
  }
  /*-------------------------------------------------------------------------*/
  prepare(){
    // reserved
  }
  /*-------------------------------------------------------------------------*/
  shake(level = 1, duration = 30){
    this._shaking    = true;
    this._shakeLevel = level;
    this._shakeTimer = duration;
  }
  /**-------------------------------------------------------------------------
   * @returns {boolean} - whether scene is fading
   */
  isBusy(){
    return this._fadingTimer > 0;
  }
  /*-------------------------------------------------------------------------*/
  preTerminate(){
    debug_log("Scene pre-terminate: " + getClassName(this));
    this._terminating = true;
    // Frame events belong to the scene that scheduled them. Clear them before
    // changing scenes so delayed game callbacks cannot touch a disposed scene
    // or the next scene's global state.
    EventManager.clear();
    this.fadeOutAll();
    this.deactivateChildren();
  }
  /*-------------------------------------------------------------------------*/
  terminate(){
    debug_log("Scene terminated: " + getClassName(this));
    this.disposeAllWindows();
  }
  /**-------------------------------------------------------------------------
   * > Create the components and add them to the rendering process.
   */
  create(){
    this.createBackground();
  }
  /**-------------------------------------------------------------------------
   * Deactivate all sprites to prevent interaction during terminating
   */
  deactivateChildren(){
    this.children.forEach(function(sp){
      sp.deactivate();
    })
  }
  /**-------------------------------------------------------------------------
   * > Remove windows from page
   */
  disposeAllWindows(){
    for(let i=0;i<this._windows.length;++i){
      this.disposeWindowAt(i);
    }
    this._windows = [];
  }
  /**-------------------------------------------------------------------------
   * > Remove a single window
   */
  removeWindow(win){
    this.disposeWindowAt(this._windows.indexOf(win));
  }
  /**-------------------------------------------------------------------------
   * > Dispose window
   */
  disposeWindowAt(index){
    if(index <= -1){
      console.error("Trying to dispose the window not rendered yet")
      return ;
    }
    debug_log("Dispose window: " + getClassName(this._windows[index]));
    if(Graphics.globalWindows.indexOf(this._windows[index]) == -1){
      this._windows[index].clear(true)
    }else{this._windows[index].hide()}
    this._windows.splice(index, 1);
  }
  /**-------------------------------------------------------------------------
   * > Create background
   */
  createBackground(){
    // reserved for inherited class
  }
  /**-------------------------------------------------------------------------
   * @returns {boolean} - whether current scene is active
   */
  isActive(){
    return this._active;
  }
  /*-------------------------------------------------------------------------*/
  isGameplayPaused(){
    return !!this._gamePaused;
  }
  /*-------------------------------------------------------------------------*/
  start(){
    this._active = true;
    this._fadingSprite = Graphics.fadingSprite;
    if(DebugMode){this.addChild(Graphics.FPSSprite)}
    this.renderGlobalSprites();
    this.renderGlobalWindows();
  }
  /*------------------------------------------------------------------------*/
  // Language changes rebuild global controls without replacing the scene.
  refreshLanguage(){
    const refreshed = new Set();
    (this._windows || []).forEach(function(win){
      win.refreshLanguage?.();
      refreshed.add(win);
    });
    return refreshed;
  }
  /*-------------------------------------------------------------------------*/
  stop(){
    this._active = false;
  }
  /*-------------------------------------------------------------------------*/
  renderGlobalSprites(){
    Graphics.globalSprites.forEach(function(sp){
      Graphics.renderSprite(sp);
      if(sp.defaultActiveState){sp.activate(); sp.show();}
    });
    this.optionSprite = Graphics.optionSprite;
  }
  /*-------------------------------------------------------------------------*/
  renderGlobalWindows(){
    Graphics.globalWindows.forEach(function(win){
      Graphics.renderWindow(win);
      if(win.defaultActiveState){win.activate(); win.show();}
    });
    this.optionWindow = Graphics.optionWindow;
  }
  /*-------------------------------------------------------------------------*/
  startFadeIn(duration = this.fadeDuration){
    Graphics.renderSprite(Graphics.fadingSprite);
    this._fadingSprite.show();
    this._fadeSign = 1;
    this._fadingTimer = duration;
    this._fadingSprite.setOpacity(1);
    Sound.fadeInCurrentBGM(duration * 1000 / 60);
  }
  /*-------------------------------------------------------------------------*/
  startFadeOut(duration = this.fadeDuration){
    Graphics.renderSprite(Graphics.fadingSprite);
    this._fadingSprite.show();
    this._fadeSign = -1;
    this._fadingTimer = duration;
    this._fadingSprite.setOpacity(0);
  }
  /*-------------------------------------------------------------------------*/
  updateFading(){
    if(this._fadingTimer <= 0){return ;}
    let d = this._fadingTimer;
    let opa = this._fadingSprite.opacity;
    if(this._fadeSign > 0){
      this._fadingSprite.setOpacity(opa - opa / d)
    }
    else{
      this._fadingSprite.setOpacity(opa + (1 - opa) / d)
    }
    this._fadingTimer -= 1;
    if(this._fadingTimer <= 0){this.onFadeComplete();}
  }
  /**-------------------------------------------------------------------------
   * > Fade out screen and sound
   */
  fadeOutAll(){
    Sound.fadeOutAll(this.fadeDuration * 1000 / 60);
    this.startFadeOut();
  }
  /*-------------------------------------------------------------------------*/
  onFadeComplete(){
    this._fadingFlag  = 0;
    this._fadingTimer = 0;
  }
  /**-------------------------------------------------------------------------
   * @returns {number} - frames before fade completed, slower one
   */
  slowFadeSpeed(){
    return this.fadeSpeed() * 2;
  }
  /**-------------------------------------------------------------------------
   * @returns {number} - frames before fade completed
   */
  fadeSpeed(){
    return 24;
  }
  /**-------------------------------------------------------------------------
   * @returns {boolean} - Graphics is loaded and ready
   */
  isReady(){
    return Graphics.isReady();
  }
  /**-------------------------------------------------------------------------
   * > Add window to page view
   * @param {Window_Base} win - the window class
   */
  addWindow(win, forced = false){
    if(!this.isActive() && !forced){
      console.error("Trying to add window to stopped scene")
      return ;
    }
    if(win.isDisposed()){
      console.error("Try to add disposed window: " + getClassName(win));
      return ;
    }
    if(this._windows.indexOf(win) >= 0){
      return ;
    }
    this._windows.push(win);
    this.addChild(win);
  }
  /**-------------------------------------------------------------------------
   * > Pause animate sprites
   */
  pause(){
    this.children.forEach(function(sp){
      Graphics.pauseAnimatedSprite(sp);
      if(sp.isActive()){sp.lastActiveState = sp.isActive();}
      sp.deactivate();
    })
  }
  /**-------------------------------------------------------------------------
   * > Resume paused animate sprites
   */
  resume(){
    this.children.forEach(function(sp){
      Graphics.resumeAnimatedSprite(sp);
      if(sp.lastActiveState){
        sp.activate();
      }
    })
  }
  /*-------------------------------------------------------------------------*/
  heatupButton(kid){
    this._buttonCooldown[kid] = 4;
  }
  /*-------------------------------------------------------------------------*/
  isButtonCooled(kid){
    return (this._buttonCooldown[kid] || 0) == 0;
  }
  /*-------------------------------------------------------------------------*/
  raiseOverlay(ovs, fallback=null){
    if(!ovs){return ;}
    if(ovs === this.optionWindow){
      ovs.refreshBattleOption?.();
    }
    if(!this.overlay){
      this._overlayActiveStates = new Map();
      this.children.forEach(function(sp){
        if(sp?.isActive){
          this._overlayActiveStates.set(sp, sp.isActive());
        }
      }.bind(this));
    }
    const parentOverlay = this.overlay && this.overlay !== ovs ? this.overlay : null;
    if(ovs !== this.optionWindow){
      this.optionSprite?.deactivate?.();
      this.optionSprite?.Xmark?.show?.();
    }
    debug_log("Raise overlay: " + getClassName(ovs));
    this.overlay = ovs;
    this.overlayParent = parentOverlay;
    if(ovs === this.optionWindow){
      this._gamePaused = true;
      this.onSettingsPause?.();
    }
    this.overlay.oriZ = ovs.z;
    const highestWindowZ = this._windows.reduce(function(max, win){
      return Math.max(max, win.z || 0);
    }, 0);
    this.overlay.setZ(Math.max(0x111, highestWindowZ) + 1).render();
    // Re-sort existing overlays as well; reopening a previously rendered
    // dropdown changes its z-index without adding a new child to the scene.
    this.sortChildren();
    this.overlayFallback = fallback;
    this.children.forEach(function(sp){
      if(sp.alwaysActive){return ;}
      if(sp !== ovs){
        sp.lastActiveState = sp.isActive();
        sp.deactivate();
      }
    })
    Graphics.renderSprite(Graphics.dimSprite);
    Graphics.dimSprite.show();
    ovs.show(); ovs.activate();
  }
  /*-------------------------------------------------------------------------*/
  closeOverlay(){
    if(!this.overlay){return ;}
    debug_log("Close overlay");
    const closingOverlay = this.overlay;
    const parentOverlay = this.overlayParent;
    closingOverlay.hide(); closingOverlay.deactivate();
    closingOverlay.setZ(closingOverlay.oriZ);
    if(closingOverlay === this.optionWindow){
      this.onSettingsResume?.();
      this._gamePaused = false;
    }
    this.overlay = parentOverlay;
    this.overlayParent = null;
    if(parentOverlay){
      // Closing a child overlay (such as the language dropdown) returns to
      // the window underneath it instead of leaving the scene without an
      // active overlay.
      parentOverlay.show();
      parentOverlay.activate();
      Graphics.renderSprite(Graphics.dimSprite);
      Graphics.dimSprite.show();
      this.overlayFallback = null;
      return ;
    }

    // This is the final overlay. Restore the exact interaction state from
    // before the overlay stack was opened. In particular, this reactivates
    // the title menu after closing an option window that previously showed a
    // nested dropdown. Do not reactivate the closing overlay itself: it may
    // still be registered as a child while it is hidden.
    const activeStates = this._overlayActiveStates;
    this._overlayActiveStates = null;
    if(activeStates){
      activeStates.forEach(function(wasActive, sp){
        if(!sp || sp === closingOverlay || sp.destroyed){return;}
        if(wasActive){sp.activate?.();}
        else{sp.deactivate?.();}
      });
    }
    Graphics.removeSprite(Graphics.dimSprite);
    this.optionSprite?.activate?.();
    this.optionSprite?.Xmark?.hide?.();
    const fallback = this.overlayFallback;
    this.overlayFallback = null;
    if(fallback){
      EventManager.setTimeout(fallback, 2);
    }
  }
  /*-------------------------------------------------------------------------*/
  closeOverlayAll(){
    while(this.overlay){
      this.closeOverlay();
    }
    // Recover from a stale overlay reference left by a scene or language
    // refresh. The global option window should never remain visible without
    // an overlay that can close it.
    if(this.optionWindow?.visible){
      this.optionWindow.hide();
      this.optionWindow.deactivate();
      this.onSettingsResume?.();
      this._gamePaused = false;
      Graphics.removeSprite(Graphics.dimSprite);
      this.optionSprite?.activate?.();
      this.optionSprite?.Xmark?.hide?.();
    }
    this._overlayActiveStates = null;
  }
  /*-------------------------------------------------------------------------*/
} // Scene_Base
/**-------------------------------------------------------------------------
 * > The scene that shows the load process
 *
 * @class Scene_Load
 * @extends Scene_Base
 * @property {number} loading_timer - timer record of loading phase
 */
class Scene_Load extends Scene_Base{
  /**-------------------------------------------------------------------------
   * @constructor
   * @memberof Scene_Load
   * @property {boolean} allLoaded - Graphics and Audio are both loaded
   */
  constructor(){
    super()
    this.allLoaded = false;
    this.loading_timer = 0;
  }
  /**-------------------------------------------------------------------------
   * > Start processing
   */
  start(){
    super.start();
    this.processLoadingPhase();
    let bitset = DataManager.getSetting('hideWarning');
    if(validNumericCount(null, bitset) != 1){bitset = 0;}
    let newSetting = 0;

    if(isMobile){
      if(!(bitset & 1)){
        let b = window.confirm(Vocab["MobileWarning"] + '\n' + Vocab["DontShowWarning"])
        newSetting |= (b + 0)
      }else{newSetting |= 1;}
    }

    if(!isChrome && !isFirefox && !isSafari){
      if(!(bitset & 2)){
        let b = window.confirm(Vocab["BrowserWarning"]+ '\n' + Vocab["DontShowWarning"])
        newSetting |= ((b + 0) << 1);
      }else{newSetting |= (1 << 1);}
    }

    if(isFirefox){
      if(!(bitset & 4)){
        let b = window.confirm(Vocab["FirefoxWarning"]+ '\n' + Vocab["DontShowWarning"])
        newSetting |= ((b+0) << 2);
      }else{newSetting |= (1 << 2);}
    }

    DataManager.changeSetting('hideWarning', newSetting);
  }
  /**-------------------------------------------------------------------------
   * @returns {boolean}
   */
  isReady(){
    return Graphics._loaderReady;
  }
  /*-------------------------------------------------------------------------*/
  create(){
    super.create();
    this.createLoadingImage();
    this.createLoadingText();
    this.createProgressBar();
  }
  /*-------------------------------------------------------------------------*/
  update(){
    super.update();
    this.updateLoading();
    this.updateButtonCooldown();
    this.updateProgressBar();
  }
  /*-------------------------------------------------------------------------*/
  createProgressBar(){
    let dw = Graphics.width * 0.3;
    let dh = 24;
    let dx = Graphics.appCenterWidth(dw), dy = this.load_text.y + 36;
    this.bar = new Sprite_ProgressBar(dx, dy, dw, dh);
    this.bar.setMaxProgress(Graphics.getLoadingProgress[1] + Sound.getLoadingProgress[1]);
  }
  /*-------------------------------------------------------------------------*/
  createLoadingImage(){
    this.loading_sprite = Graphics.addSprite(Graphics.LoadImage);
    let sx = Graphics.appCenterWidth(this.loading_sprite.width);;
    let sy = Graphics.appCenterHeight(this.loading_sprite.height);
    this.loading_sprite.setPOS(sx, sy);
    this.loading_sprite.anchor.set(0.5);
  }
  /*-------------------------------------------------------------------------*/
  createLoadingText(){
    this.load_text = Graphics.addText(Vocab.LoadText);
    let lt = this.load_text, ls = this.loading_sprite;
    let offset = Graphics._spacing;
    lt.x = Graphics.appCenterWidth(lt.width);
    lt.y = Graphics.appCenterHeight(lt.height) + ls.height + offset;
  }
  /*-------------------------------------------------------------------------*/
  reportLoaderProgress(loader, resources){
    Graphics._loadProgress += 1;
    let message = 'Graphics Loaded : ' + loader.progress + '%';
    if(resources){message += ', name : ' + resources.name + ', url : ' + resources.url;}
    debug_log(message);
  }
  /*-------------------------------------------------------------------------*/
  updateButtonCooldown(){
    for(let i=0;i<0xff;++i){
      if((this._buttonCooldown[i] || 0) > 0){
        this._buttonCooldown[i] -= 1;
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  updateLoading(){
    this.updateImage();
    this.updateText();
    if(this.allLoaded){
      if(this.loading_timer < 60)this.loading_timer += 1;
      if(this.loading_timer == 60){this.processLoadingComplete();}
    }
  }
  /*-------------------------------------------------------------------------*/
  updateImage(){
    let sprite = SceneManager.scene.loading_sprite;
    if(sprite.scale_flag){
      sprite.scale.x *= 0.98;
      sprite.scale.y *= 0.98;
      if(sprite.scale.x <= 0.5)sprite.scale_flag = false;
    }
    else{
      sprite.scale.x *= 1.02;
      sprite.scale.y *= 1.02;
      if(sprite.scale.x >= 1.5)sprite.scale_flag = true;
    }
  }
  /*-------------------------------------------------------------------------*/
  updateText(){
    let gr = Graphics.isReady(), sr = Sound.isReady();
    let sprite = this.load_text;
    let txt = Vocab.LoadText;
    if(gr && !sr){
      txt = Vocab.LoadTextAudio;
    }
    else if(!gr && sr){
      txt = Vocab.LoadTextGraphics;
    }
    else if(gr && sr){
      txt = Vocab.LoadTextComplete;
      this.allLoaded = true;
    }
    if(sprite.text == txt){return ;}
    sprite.text = txt;
    sprite.x = Graphics.appCenterWidth(sprite.width) - Graphics._spacing * 2;
  }
  /*-------------------------------------------------------------------------*/
  updateProgressBar(){
    this.bar.setProgress(Graphics.getLoadingProgress[0] + Sound.getLoadingProgress[0]);
  }
  /*-------------------------------------------------------------------------*/
  processLoadingPhase(){
    debug_log("Init loading phase");
    Graphics.renderSprite(this.loading_sprite);
    Graphics.renderSprite(this.load_text);
    Graphics.renderSprite(this.bar);
    Graphics.preloadAllAssets(this.reportLoaderProgress, null);
  }
  /*-------------------------------------------------------------------------*/
  processLoadingComplete(){
    debug_log("Loading Complete called");
    this.loading_timer = 0xff;
    GameStarted = true;
    Sound.playSaveLoad();
    if(TestMode){
      SceneManager.goto(Scene_Test);
    }
    else if(QuickStart){
      SceneManager.goto(Scene_Title);
    }
    else{
      SceneManager.goto(Scene_Intro);
    }
  }
  /*-------------------------------------------------------------------------*/
}
/**---------------------------------------------------------------------------
 * > The intro scene that display the splash image
 * @class Scene_Intro
 * @extends Scene_Base
 */
class Scene_Intro extends Scene_Base{
  /*-------------------------------------------------------------------------*/
  constructor(...args){
    super(...args)
  }
  /*-------------------------------------------------------------------------*/
  create(){
    super.create();
    this.createNTOUSplash();
    this.createPIXISplash();
    this.createHowlerSplash();
  }
  /*-------------------------------------------------------------------------*/
  createBackground(){
    this.backgroundImage = new PIXI.Graphics();
    this.backgroundImage
      .rect(0, 0, Graphics.width, Graphics.height)
      .fill(0);
    Graphics.renderSprite(this.backgroundImage);
  }
  /*-------------------------------------------------------------------------*/
  start(){
    super.start();
    this.timer        = 0;
    this.fadeDuration = 30;
    this.librarySwitchMoment = 120;
    this.NTOUmoment   = 240;
    this.ENDmoment    = 500;
    this.showLibrarySplash(this.pixiSplash);
  }
  /*-------------------------------------------------------------------------*/
  update(){
    super.update();
    this.timer += 1;
    this.updateSplashStage();
    this.updateSkip();
    if(this.requestFilterUpdate){
      this.shockwaveFilter.time += 1;
    }
  }
  /*-------------------------------------------------------------------------*/
  updateSplashStage(){
    if(this.timer == this.librarySwitchMoment){
      this.startFadeOut();
    }
    else if(this.timer == this.librarySwitchMoment + this.fadeDuration){
      this.startFadeIn();
      this.showLibrarySplash(this.howlerSplash);
    }
    else if(this.timer == this.NTOUmoment){
      this.startFadeOut();
    }
    else if(this.timer == this.NTOUmoment + this.fadeDuration){
      this.startFadeIn();
      this.processNTOUSplash();
    }
    else if(this.timer == this.NTOUmoment + this.fadeDuration + 40){
      Sound.playSE(Sound.Wave);
    }
    else if(this.timer == this.NTOUmoment + this.fadeDuration + 60){
      this.startSplashEffect();
    }
    else if(this.timer == this.ENDmoment){
      this.startFadeOut();
      Sound.fadeOutAll();
      SceneManager.goto(Scene_Title);
    }
  }
  /*-------------------------------------------------------------------------*/
  updateSkip(){
    if(!Input.isTriggered(Input.keymap.kMOUSE1)){return ;}
    this.heatupButton(Input.keymap.kMOUSE1);
    if(this.timer < this.NTOUmoment){
      this.timer = this.NTOUmoment - 1;
    }
    else if(this.timer < this.NTOUmoment + this.fadeDuration){
      this.timer = this.NTOUmoment + this.fadeDuration - 1;
    }
    else if(this.timer < this.ENDmoment){
      this.timer = this.ENDmoment - 1;
    }
  }
  /*-------------------------------------------------------------------------*/
  createPIXISplash(){
    this.pixiSplash = Graphics.addSprite(Graphics.pixiSplash);
  }
  /*-------------------------------------------------------------------------*/
  createHowlerSplash(){
    this.howlerSplash = Graphics.addSprite(Graphics.howlerSplash);
  }
  /*-------------------------------------------------------------------------*/
  createNTOUSplash(){
    this.ntouSplash = Graphics.addSprite(Graphics.ntouSplash);
    // Preserve the AVIF aspect ratio and prioritize fitting the full width.
    this.ntouSplash.resizeToWidth(Graphics.width);
    this.ntouSplash.setPOS(
      0,
      (Graphics.height - this.ntouSplash.height) / 2
    );
  }
  /*-------------------------------------------------------------------------*/
  showLibrarySplash(sprite){
    // Show one library logo at a time and prioritize fitting the full width
    // while preserving the complete image. Remaining height stays black.
    Graphics.removeSprite(this.pixiSplash, this.howlerSplash);
    sprite.resizeToWidth(Graphics.width);
    sprite.setPOS(
      (Graphics.width - sprite.width) / 2,
      (Graphics.height - sprite.height) / 2
    );
    sprite.show();
    Graphics.renderSprite(sprite);
  }
  /*-------------------------------------------------------------------------*/
  terminate(){
    if(this.shockwaveFilter){
      this.ntouSplash.filters = null;
      this.shockwaveFilter.destroy();
      this.shockwaveFilter = null;
    }
    super.terminate();
    Graphics.createGlobalWindows();
    Graphics.createGlobalSprites();
  }
  /*-------------------------------------------------------------------------*/
  processNTOUSplash(){
    this.ntouSplash.filters = null;
    Graphics.removeSprite(this.pixiSplash, this.howlerSplash);
    Graphics.renderSprite(this.ntouSplash);
  }
  /*-------------------------------------------------------------------------*/
  startSplashEffect(){
    this.shockwaveFilter = new PIXI.filters.ShockwaveFilter({
      center: {x: 0.5, y: 0.5},
      speed: 5,
      brightness: 8,
    });
    this.ntouSplash.filters = [this.shockwaveFilter];
    this.requestFilterUpdate = true;
  }
  /*-------------------------------------------------------------------------*/
}
/**---------------------------------------------------------------------------
 * > The title scene
 * @class Scene_Title
 * @extends Scene_Base
 */
class Scene_Title extends Scene_Base{
  /**-------------------------------------------------------------------------
   * @constructor
   * @memberof Scene_Title
   */
  constructor(){
    super()
    this.particles = [];
    this.particleNumber = 16;
    this.particleScaleRange = [0.2, 0.3];
  }
  /**-------------------------------------------------------------------------
   * > Start processing
   */
  start(){
    super.start();
    Sound.fadeInBGM(Sound.Title, 500);
    Graphics.addWindow(this.menu);
    this.menu.activate();
    this.particles.forEach(function(sp){sp.render();})
    this.fadeDuration = 60;
    if(!Sound.isStageReady()){Sound.loadStageAudio();}
  }
  /*-------------------------------------------------------------------------*/
  create(){
    super.create();
    this.createMenu();
    this.createparticles();
    this.createGameSetupFrame();
    this.createGameModeWindow();
    this.createGameOptionWindow();
    this.createHelpWindow();
    this.createBackButton();
    this.createDimBack();
    this.assignHandlers();
  }
  /*-------------------------------------------------------------------------*/
  assignHandlers(){
    this.gameModeWindow.setHandler(this.gameModeWindow.kTraditional, this.onGameTraditional.bind(this));
    this.gameModeWindow.setHandler(this.gameModeWindow.kBattlepuno, this.onGameBattlePuno.bind(this));
    this.gameModeWindow.setHandler(this.gameModeWindow.kDeathMatch, this.onGameDeathMatch.bind(this));
    this.gameModeWindow.setHandler(this.gameModeWindow.kTimed, this.onGameTimed.bind(this));
  }
  /*-------------------------------------------------------------------------*/
  update(){
    super.update();
    this.updateparticles();
  }
  /*-------------------------------------------------------------------------*/
  updateparticles(){
    for(let i=0;i<this.particleNumber;++i){
      let sp = this.particles[i];
      sp.y -= sp.speedFactor * Graphics.speedFactor;
      sp.breezePhase += sp.breezeSpeed * Graphics.speedFactor;
      if(sp.breezePulseRemaining > 0){
        const step = Math.min(sp.breezePulseRemaining, Graphics.speedFactor);
        const progress = 1 - sp.breezePulseRemaining / sp.breezePulseDuration;
        const velocity = sp.breezePulseVelocity * (1 - progress);
        sp.baseX += sp.breezePulseDirection
          * velocity * step;
        sp.breezePulseRemaining -= Graphics.speedFactor;
        if(sp.breezePulseRemaining <= 0){
          sp.breezePulseRemaining = 0;
          sp.breezePulseCooldown = randInt(300, 600);
        }
      }
      else{
        sp.breezePulseCooldown -= Graphics.speedFactor;
        if(sp.breezePulseCooldown <= 0){
          sp.breezePulseDirection = Math.random() < 0.5 ? -1 : 1;
          sp.breezePulseDistance = randInt(40, 80) / 10;
          sp.breezePulseDuration = randInt(30, 60);
          sp.breezePulseVelocity = 2 * sp.breezePulseDistance / sp.breezePulseDuration;
          sp.breezePulseRemaining = sp.breezePulseDuration;
        }
      }
      sp.x = sp.baseX
        + Math.sin(sp.breezePhase) * sp.breezeAmplitude;
      if(!(i&1)){sp.rotation += sp.rotationDelta * Graphics.speedFactor;}
      if(sp.opacity < 0.6){sp.setOpacity(sp.opacity + 0.05 * Graphics.speedFactor);}
      if(sp.y < -50){this.setParticlePosition(i);}
    }
  }
  /*-------------------------------------------------------------------------*/
  refreshLanguage(){
    const refreshed = super.refreshLanguage();
    if(!refreshed.has(this.menu)){this.menu?.refreshLanguage?.();}
    if(!refreshed.has(this.gameModeWindow)){this.gameModeWindow?.refreshLanguage?.();}
    if(!refreshed.has(this.gameOptionWindow)){this.gameOptionWindow?.refreshLanguage?.();}
    // The mode window is rebuilt with new text sprites, so restore the
    // handlers that were originally assigned during scene creation.
    this.assignHandlers();

    // Changing language closes the language dropdown, but the old option
    // window may have temporarily deactivated the title menu. Restore the
    // four main-menu buttons when the title screen is visible and no title
    // overlay is open.
    if(this.isActive() && !this.overlay && this.menu?.visible){
      this.menu.activate();
    }
  }
  /*-------------------------------------------------------------------------*/
  createBackground(){
    this.backgroundImage = Graphics.addSprite(Graphics.Title);
    // Keep the AVIF background aligned with the fixed game viewport even if
    // the source asset has different metadata dimensions.
    this.backgroundImage.setPOS(0, 0).resize(Graphics.width, Graphics.height);
    // Adjust these three values to tune the title background. 1 is the
    // original/default value for each setting.
    this.titleColorSettings = {
      contrast: 1,
      brightness: 1,
      saturation: 1,
    };
    const color = this.titleColorSettings;
    if(PIXI.ColorMatrixFilter && (
      color.contrast !== 1 || color.brightness !== 1 || color.saturation !== 1
    )){
      this.titleContrastFilter = new PIXI.ColorMatrixFilter();
      this.titleContrastFilter.contrast(color.contrast, true);
      this.titleContrastFilter.brightness(color.brightness, true);
      this.titleContrastFilter.saturate(color.saturation, true);
      this.backgroundImage.filters = [this.titleContrastFilter];
    }
    Graphics.renderSprite(this.backgroundImage);
  }
  /*-------------------------------------------------------------------------*/
  createMenu(){
    let ww = 200, wh = 200;
    let wx = Graphics.width - ww - Graphics.padding / 2;
    let wy = Graphics.height / 2;
    this.menu = new Window_Menu(wx, wy, ww, wh);
  }
  /*-------------------------------------------------------------------------*/
  createDimBack(){
    // Use a scene-level graphic so this overlay is guaranteed to sit above the
    // title artwork and below the game mode/options windows.
    this.dimBack = new Sprite();
    const shade = new PIXI.Graphics()
      .rect(0, 0, Graphics.width, Graphics.height)
      .fill({color: Graphics.color.Black, alpha: 0.7});
    shade.eventMode = 'none';
    this.dimBack.addChild(shade);
    this.dimBack.setZ(0x0f).hide();
  }
  /*-------------------------------------------------------------------------*/
  createparticles(){
    let p = Graphics.Particle, p2 = Graphics.Particle2;
    for(let i=0;i<this.particleNumber;++i){
      let pn = !(i&1) ? p2: p;
      let sp = Graphics.addSprite(pn);
      const particleScale = randInt(
        this.particleScaleRange[0] * 100,
        this.particleScaleRange[1] * 100
      ) / 100;
      sp.scale.set(particleScale, particleScale);
      sp.setZ(0.1);
      this.particles.push(sp);
      this.setParticlePosition(i, true);
    }
  }
  /*-------------------------------------------------------------------------*/
  setParticlePosition(index, randomDist = false){
    let sp = this.particles[index];
    let ux = (Graphics.width - Graphics.padding) / this.particleNumber;
    let dx = ux * index, dy = Graphics.height - Graphics.padding * 2;
    dx = randInt(dx, dx + ux);
    dy = randInt(randomDist ? Graphics.padding : dy, Graphics.height);
    sp.baseX = dx;
    sp.breezePhase = randInt(0, 628) / 100;
    sp.breezeSpeed = randInt(15, 35) / 1000;
    sp.breezeAmplitude = randInt(25, 50) / 10;
    sp.breezePulseCooldown = randInt(300, 600);
    sp.breezePulseRemaining = 0;
    sp.breezePulseDuration = 0;
    sp.breezePulseDirection = 0;
    sp.breezePulseDistance = 0;
    sp.breezePulseVelocity = 0;
    sp.speedFactor = randInt(25, 75) / 100.0
    sp.anchor.set(0.5);
    sp.setPOS(dx, dy).setOpacity(0);
    if(!(index & 1)){
      sp.rotationDelta = randInt(2,12) / 10000.0
    }
  }
  /*-------------------------------------------------------------------------*/
  createGameModeWindow(){
    this.gameModeWindow = new Window_GameModeSelect(0, 0, 240, 400);
    const wx = this.gameSetupFrame.x;
    this.gameModeWindow.setPOS(wx, this.gameSetupFrame.y).setZ(0x10).hide();
    this.embedGameSetupPane(this.gameModeWindow);
  }
  /*-------------------------------------------------------------------------*/
  createGameOptionWindow(){
    // Keep seven option rows visible; the remaining settings stay reachable
    // through the option scrollbar.
    this.gameOptionWindow = new Window_GameOption(0, 0, 580, 440);
    const wx = this.gameSetupFrame.x + this.gameModeWindow.width;
    this.gameOptionWindow.setPOS(wx, this.gameSetupFrame.y).setZ(0x10).hide();
    this.embedGameSetupPane(this.gameOptionWindow);
    this.gameOptionWindows = new Map();
    this.gameOptionWindows.set(this.gameOptionWindow.mode, this.gameOptionWindow);
  }
  /*-------------------------------------------------------------------------*/
  createGameSetupFrame(){
    const modeWidth = 240;
    const optionWidth = 580;
    const width = modeWidth + optionWidth;
    const height = 440;
    const x = (Graphics.width - width) / 2;
    const y = 150;
    const dividerX = modeWidth;
    const frame = new SpriteCanvas(x, y, width, height);
    const background = new PIXI.Graphics();
    background
      .roundRect(0, 0, width, height, 4)
      .fill({color: Graphics.color.Black, alpha: 0.3})
      .stroke({width: 3, color: Graphics.color.Gold, alpha: 0.95})
      .roundRect(5, 5, width - 10, height - 10, 2)
      .stroke({width: 1, color: Graphics.color.Gold, alpha: 0.55});

    // A double divider visually separates mode selection from its options.
    background
      .rect(dividerX - 4, Graphics.padding / 2, 2, height - Graphics.padding)
      .rect(dividerX + 2, Graphics.padding / 2, 2, height - Graphics.padding)
      .fill({color: Graphics.color.Gold, alpha: 0.9});
    background.eventMode = 'none';
    background.static = true;
    frame.addChild(background);
    frame.setZ(0x10).hide();
    frame.eventMode = 'none';
    this.gameSetupFrame = frame;
    this.addChild(frame);
  }
  /*-------------------------------------------------------------------------*/
  embedGameSetupPane(window){
    // The two content windows share the setup frame. Keep their masks and
    // controls, but remove their individual chrome so the frame reads as one
    // panel instead of two adjacent windows.
    [
      window.indexSprite,
      window.patternSprite,
      window.blackBackground,
      ...(window.borderSprites || [])
    ].forEach(function(sprite){
      if(sprite){
        sprite.visible = false;
        sprite.renderable = false;
      }
    });
  }
  /*-------------------------------------------------------------------------*/
  createHelpWindow(){
    let wx = this.gameModeWindow.x, wy = this.gameModeWindow.y;
    let ww = this.gameOptionWindow.width + this.gameOptionWindow.x - wx;
    let wh = 80;
    wy -= wh;
    this.helpWindow = new Window_Help(wx, wy, ww, wh);
    this.helpWindow.autoHeight = true;
    this.helpWindow.autoHeightBottom = this.gameModeWindow.y;
    this.helpWindow.autoHeightMin = this.helpWindow.itemHeight + this.helpWindow.padding;
    this.helpWindow.autoHeightMax = Math.max(
      this.helpWindow.autoHeightMin,
      this.gameModeWindow.y - Graphics.padding
    );
    this.helpWindow.useTranslucentBlackBackground(0.3);
    this.helpWindow.setZ(0x10).hide();
    this.helpWindow.setText(
      Vocab["GameModeHelp"] || Vocab["HelpStartGame"] || "Select a game mode."
    );
    this.gameModeWindow.helpWindow = this.helpWindow;
    this.gameOptionWindow.helpWindow = this.helpWindow;
  }
  /*-------------------------------------------------------------------------*/
  createBackButton(){
    this.backButton = new Window_Back(0, 0, this.onActionBack.bind(this));
    const optionWindow = this.gameOptionWindow;
    const startButtonWidth = optionWindow.startGameButtonWidth;
    this.backButton.applyPrimaryButtonStyle(startButtonWidth);
    const startButtonX = optionWindow.x + optionWindow.padding / 2
      + optionWindow.startGameButtonX;
    const startButtonY = optionWindow.y + optionWindow.startGameTop;
    const wx = startButtonX + startButtonWidth + optionWindow.startGameButtonGap;
    const wy = startButtonY
      + (optionWindow.itemHeight - this.backButton.height) / 2;
    this.backButton.setPOS(wx, wy).setZ(0x10).hide();
  }
  /*-------------------------------------------------------------------------*/
  onGameStart(){
    this.menu.deactivate();
    // Keep the original title artwork. The scene-level shade sits above the
    // artwork and four main-menu buttons, but below the option panels.
    this.backgroundImage.show();
    this.backgroundImage.tint = 0xffffff;
    this.dimBack.show().render();
    this.gameSetupFrame.show();
    this.helpWindow.show().activate().render();
    this.gameModeWindow.show().activate().render();
    this.gameOptionWindow.show().activate().render();
    this.gameModeWindow.showDefaultHelp();
    this.backButton.show().activate().render();
  }
  /*-------------------------------------------------------------------------*/
  onActionBack(){
    Sound.playCancel();
    this.backgroundImage.tint = 0xffffff;
    this.backgroundImage.show();
    this.helpWindow.hide().deactivate();
    this.gameSetupFrame.hide();
    this.gameModeWindow.hide().deactivate();
    this.gameOptionWindow.hide().deactivate();
    this.backButton.hide().deactivate();
    this.dimBack.hide().remove();
    this.menu.activate();
  }
  /*-------------------------------------------------------------------------*/
  previewGameMode(mode){
    if(GameManager.gameMode === mode && this.gameOptionWindow?.mode === mode){return;}
    GameManager.changeGameMode(mode);
    const previousWindow = this.gameOptionWindow;
    if(previousWindow){
      previousWindow.hide().deactivate();
    }

    let nextWindow = this.gameOptionWindows?.get(mode);
    if(!nextWindow || nextWindow.isDisposed()){
      nextWindow = new Window_GameOption(0, 0, 580, 440);
      const wx = previousWindow
        ? previousWindow.x
        : (Graphics.width - nextWindow.width) * 7 / 10;
      const wy = previousWindow ? previousWindow.y : 150;
      nextWindow.setPOS(wx, wy).setZ(0x10);
      this.embedGameSetupPane(nextWindow);
      this.gameOptionWindows ??= new Map();
      this.gameOptionWindows.set(mode, nextWindow);
    }
    nextWindow.helpWindow = this.helpWindow;
    this.gameOptionWindow = nextWindow;

    // Keep the window registered with the title scene. Hidden windows stay in
    // the scene so switching modes only changes visibility and active state.
    this.addWindow(nextWindow, true);
    if(this.gameModeWindow?.visible){
      nextWindow.show().activate().render();
    }
    this.sortChildren();
  }
  /*-------------------------------------------------------------------------*/
  replaceGameOptionWindow(){
    const oldWindow = this.gameOptionWindow;
    if(!oldWindow){return;}
    const wasVisible = oldWindow.visible;
    const wasActive = oldWindow.isActive();
    const position = [oldWindow.x, oldWindow.y];
    const size = [oldWindow.width, oldWindow.height];
    const z = oldWindow.zIndex || 0x10;

    oldWindow.closeNameModeDropdown?.();
    oldWindow.closeNameInputDialog?.();
    oldWindow.hide().deactivate();
    if(this.children.indexOf(oldWindow) >= 0){
      this.removeChild(oldWindow);
    }
    const oldIndex = this._windows.indexOf(oldWindow);
    if(oldIndex >= 0){this._windows.splice(oldIndex, 1);}
    oldWindow.clear(true);
    oldWindow.destroy?.({children: true});

    const newWindow = new Window_GameOption(0, 0, size[0], size[1]);
    newWindow.setPOS(position[0], position[1]).setZ(z);
    this.embedGameSetupPane(newWindow);
    newWindow.helpWindow = this.helpWindow;
    this.gameOptionWindow = newWindow;
    // The previous window was removed before rebuilding it. Register the new
    // window with the scene again so it is rendered and receives input.
    this.addWindow(newWindow, true);
    if(wasVisible){newWindow.show();}else{newWindow.hide();}
    if(wasActive){newWindow.activate();}else{newWindow.deactivate();}
    if(wasVisible){newWindow.render();}
  }
  /*-------------------------------------------------------------------------*/
  onGameTraditional(){
    this.previewGameMode(Mode.TRADITIONAL);
  }
  /*-------------------------------------------------------------------------*/
  onGameBattlePuno(){
    this.previewGameMode(Mode.BATTLE_PUNO);
  }
  /*-------------------------------------------------------------------------*/
  onGameDeathMatch(){
    this.previewGameMode(Mode.DEATH_MATCH);
  }
  /*-------------------------------------------------------------------------*/
  onGameTimed(){
    this.previewGameMode(Mode.TIMED);
  }
  /*-------------------------------------------------------------------------*/
  onStartSelectedGame(){
    Sound.playOK();
    GameManager.changeGameMode(GameManager.gameMode);
    SceneManager.goto(Scene_Game);
  }
  /*-------------------------------------------------------------------------*/
}
/**-------------------------------------------------------------------------
 * Test scene
 */
class Scene_Test extends Scene_Base{
  /*-------------------------------------------------------------------------*/
  constructor(){
    super();
    GameManager.changeGameMode(1);
  }
  /*-------------------------------------------------------------------------*/
  start(){
    super.start();
    SceneManager.goto(Scene_Game);
  }
}
/**-------------------------------------------------------------------------
 * The game over scene that display the results
 */
class Scene_GameOver extends Scene_Base{
  /*-------------------------------------------------------------------------*/
  constructor(){
    super();
    this.fadeDuration = 60;
  }
  /*-------------------------------------------------------------------------*/
  prepare(g){
    this.game = g;
  }
  /*-------------------------------------------------------------------------*/
  createBackground(){
    this.backgroundImage = Graphics.addSprite(Graphics.GameOver);
    Graphics.renderSprite(this.backgroundImage);
  }
  /*-------------------------------------------------------------------------*/
  create(){
    super.create();
    this.createScoreBoard();
    this.createLeaveButton();
  }
  /*-------------------------------------------------------------------------*/
  createScoreBoard(){
    this.resultWindow = new Window_Scoreboard();
    this.resultWindow.setOpacity(0.1).setZ(0x10).hide();
    this.drawRank();
  }
  /*-------------------------------------------------------------------------*/
  createLeaveButton(){
    this.backButton = new Window_Back(0, 0, this.onActionBack.bind(this));
    this.restartButton = null;
    if(this.game?.gameMode === Mode.TRADITIONAL ||
       this.game?.gameMode === Mode.TIMED){
      this.restartButton = new Window_Back(
        0,
        0,
        this.onActionReplay.bind(this),
        Vocab.PlayAgain || 'Play Again'
      );
    }
    this.resizeActionButtons(140);
    this.positionActionButtons();
    this.backButton.setZ(0x10).deactivate().hide();
    this.restartButton?.setZ(0x10).deactivate().hide();
  }
  resizeActionButtons(width){
    const buttons = [this.backButton, this.restartButton].filter(Boolean);
    buttons.forEach(button => {
      button.resize(width, button.height);
      const label = button.backSprite;
      if(!label){return;}
      label.setPOS(
        (button.width - label.width) / 2,
        (button.height - label.height) / 2
      );
      label.hitArea = new Rect(-label.x, -label.y, button.width, button.height);
    });
  }
  positionActionButtons(){
    const resultWindow = this.resultWindow;
    const gap = this.restartButton ? Graphics.spacing : 0;
    const totalWidth = this.backButton.width + gap + (this.restartButton?.width || 0);
    let wx = resultWindow.x + (resultWindow.width - totalWidth) / 2;
    let wy = resultWindow.y + resultWindow.height
      - this.backButton.height - resultWindow.padding;
    this.backButton.setPOS(wx, wy).setZ(0x10).deactivate().hide();
    if(this.restartButton){
      this.restartButton.setPOS(wx + this.backButton.width + gap, wy)
        .setZ(0x10).deactivate().hide();
    }
  }
  /*-------------------------------------------------------------------------*/
  start(){
    super.start();
    EventManager.setTimeout(()=>{
      this.showResultWindow();
    }, 20 + this.fadeDuration);
    EventManager.setTimeout(()=>{
      this.showLeaveButton();
    }, 90 + this.fadeDuration);
    this.resultWindow.render();
    this.backButton.render();
    this.restartButton?.render();
  }
  /*-------------------------------------------------------------------------*/
  update(){
    super.update();
    if(this.resultWindow.visible && this.resultWindow.opacity < 1){
      this.resultWindow.setOpacity(this.resultWindow.opacity + 0.015);
    }
  }
  /*-------------------------------------------------------------------------*/
  drawRank(){
    const ar = this.resultWindow.drawRank();
    if(ar[0] == this.game.players[0]){
      this.playVictory();
    }
    else{
      this.playDefeat();
    }
  }
  /*-------------------------------------------------------------------------*/
  playVictory(){
    Sound.playBGM(Sound.getVictoryTheme(this.game.gameMode));
  }
  /*-------------------------------------------------------------------------*/
  playDefeat(){
    Sound.fadeInBGM(Sound.Defeat, 3000);
  }
  /*-------------------------------------------------------------------------*/
  refreshLanguage(){
    super.refreshLanguage();
    if(this.backButton?.backSprite){
      this.backButton.backSprite.text = Vocab.Back;
      this.backButton.backSprite.x = (this.backButton.width - this.backButton.backSprite.width) / 2;
    }
    if(this.restartButton?.backSprite){
      this.restartButton.backSprite.text = Vocab.PlayAgain || 'Play Again';
      this.restartButton.backSprite.x = (this.restartButton.width - this.restartButton.backSprite.width) / 2;
    }
    this.positionActionButtons();
    if(this.resultWindow?.drawnObjects?.length){
      this.resultWindow.clear();
      this.resultWindow.drawRank();
    }
  }
  /*-------------------------------------------------------------------------*/
  showResultWindow(){
    this.resultWindow.show().setOpacity(0.1);
  }
  /*-------------------------------------------------------------------------*/
  showLeaveButton(){
    this.backButton.activate().show();
    this.restartButton?.activate().show();
  }
  /*-------------------------------------------------------------------------*/
  onActionBack(){
    Sound.playOK();
    SceneManager.goto(Scene_Title);
  }
  /*-------------------------------------------------------------------------*/
  onActionReplay(){
    Sound.playOK();
    GameManager.changeGameMode(this.game.gameMode);
    SceneManager.goto(Scene_Game);
  }
  /*-------------------------------------------------------------------------*/
  terminate(){
    if(GameManager.game === this.game){
      GameManager.game = null;
    }
    super.terminate();
  }
  /*-------------------------------------------------------------------------*/
}

Object.assign(globalThis, {
  Scene_Base,
  Scene_Load,
  Scene_Intro,
  Scene_Title,
  Scene_Test,
  Scene_GameOver,
});
