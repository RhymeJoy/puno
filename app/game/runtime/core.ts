// @ts-nocheck
import stageAudioData from '../data/stage_audio.json'

/** Minimal signal adapter used by the old loading scene. */
class AssetSignal{
  handlers = [];

  add(handler){
    if(typeof handler === 'function'){this.handlers.push(handler);}
    return handler;
  }

  emit(...args){
    this.handlers.slice().forEach(function(handler){handler(...args);});
  }

  removeAllListeners(){
    this.handlers.length = 0;
  }
}

/**
 * PixiJS 8 replaced PIXI.loader with Assets. Keep the loading scene's small
 * callback surface while loading and caching through the modern Assets API.
 */
class AssetLoader{
  constructor(){
    this.resources = {};
    this.queue = [];
    this.progress = 0;
    this.onProgress = new AssetSignal();
    this.onComplete = new AssetSignal();
    this.onError = new AssetSignal();
  }

  add(resources){
    const entries = Array.isArray(resources) ? resources : [resources];
    entries.filter(Boolean).forEach(function(url){
      if(!this.queue.includes(url)){this.queue.push(url);}
    }.bind(this));
    return this;
  }

  load(complete){
    const pending = this.queue.splice(0);
    const total = pending.length;
    let completed = 0;
    this.progress = total ? 0 : 100;

    this.promise = Promise.all(pending.map(async function(url){
      const resource = {name: url, url, texture: null, image: null};
      try{
        if(url === Graphics.Iconset){
          resource.image = await this.loadImage(url);
        }
        else{
          resource.texture = await PIXI.Assets.load(url);
        }
        this.resources[url] = resource;
        completed += 1;
        this.progress = total ? completed / total * 100 : 100;
        this.onProgress.emit(this, resource);
        return resource;
      }
      catch(error){
        this.onError.emit(error, this, resource);
        throw error;
      }
    }.bind(this))).then(function(){
      this.progress = 100;
      this.onComplete.emit(this, this.resources);
      if(typeof complete === 'function'){complete(this, this.resources);}
      return this.resources;
    }.bind(this));

    return this;
  }

  loadImage(url){
    return new Promise(function(resolve, reject){
      const image = new Image();
      image.decoding = 'async';
      image.onload = function(){resolve(image);};
      image.onerror = function(){reject(new ResourceError("Image is not loaded: " + url));};
      image.src = url;
    });
  }

  reset(){
    Object.values(this.resources).forEach(function(resource){
      if(resource.image){resource.image.src = '';}
    });
    this.queue.length = 0;
    this.resources = {};
    this.progress = 0;
  }
}

/**----------------------------------------------------------------------------
 * >> The static class that carries out graphics processing.
 * @namespace Graphics
 */
class Graphics{
  /**----------------------------------------------------------------------------
   * @constructor
   * @memberof Graphics
   */
  constructor(){
    throw new Error('This is a static class');
  }
  /**----------------------------------------------------------------------------
   * > Module Initialization
   * @memberof Graphics
   * @property {number} _width          - width of app canvas
   * @property {number} _height         - height of app canvas
   * @property {number} _padding        - default padding of app canvas
   * @property {number} _spacing        - width of space for sprites seperate
   * @property {number} _frameCount    - frames passed after app starts
   * @property {object} _spriteMap     - Mapping sprite name to sprite instance
   * @property {boolean} _loaderReady  - whether the loader is completed
   * @property {Sprite} fadingSprite - Sprite for fade effect
   */  
  static async initialize(){
    // A route remount or HMR update must not leave the previous renderer alive.
    if(this.app || this.renderer){
      this.shutdown();
    }
    this._width   = this.Resolution[0];
    this._height  = this.Resolution[1];
    this._padding = 32;
    this._spacing = 8;
    this._lineHeight = 24;
    this._frameCount = 0;
    this._spriteMap  = {}
    this.fadingSprite     = null;
    this.unfocusSprite    = null;
    this._loaderReady     = false;
    this._assetsReady     = false;
    this._frameCount      = 0;
    this._loadProgress    = 0;
    this.FPS_Sum          = 0;
    this.FPS_MaxSample    = 30;
    this.FPS_SampleIndex  = 0;
    this.FPS_SamplePool   = [];
    this.globalSprites    = [];
    this.globalWindows    = [];
    this._screenWakeLock = null;
    this._visibilityChangeHandler = null;

    this.configureRendering();
    await this.createApp();
    this.initRenderer();
    this.relocatPageElement();
    this.initLoader();
    this.aliasFunctions();
    this.createBasicSprites();
  }
  /*---------------------------------------------------------------------------*/
  /** Apply the renderer and texture sampling defaults before assets load. */
  static configureRendering(){
    const textureStyle = PIXI.TextureStyle?.defaultOptions;
    if(textureStyle){
      textureStyle.scaleMode = this.TextureScaleMode || "linear";
    }
    const textureSource = PIXI.TextureSource?.defaultOptions;
    if(textureSource){
      textureSource.antialias = this.Antialias !== false;
    }
  }
  /*---------------------------------------------------------------------------*/
  static createBasicSprites(){
    this.createFadingSprite();
    this.createDimSprite();
    this.createUnfocusSprite();
    this.createFPSSprite();
  }
  /*---------------------------------------------------------------------------*/
  static createGlobalSprites(){
    this.createOptionSprite();
    this.createBGMSprite();
    this.createSESprite();
  }
  /*---------------------------------------------------------------------------*/
  static createGlobalWindows(){
    this.createOptionWindow();
  }
  /*---------------------------------------------------------------------------*/
  /** Create a larger bottom shortcut with a language-aware hover label. */
  static createGlobalButton(iconID, dx, label, handler, xmarkVisible = false){
    const buttonSize = 45; // 36px × 125%
    const dy = this.height - buttonSize - this.spacing;
    const button = new SpriteCanvas(0, 0, buttonSize, buttonSize);
    const icon = button.drawIcon(iconID, 0, 0);
    icon.scale.set(1.5, 1.5);
    icon.setPOS((buttonSize - icon.width) / 2, (buttonSize - icon.height) / 2);
    button.Xmark = button.drawIcon(this.IconID.Xmark, 0, 0).setZ(2);
    button.Xmark.scale.set(1.5, 1.5);
    button.Xmark.setPOS((buttonSize - button.Xmark.width) / 2,
      (buttonSize - button.Xmark.height) / 2);
    if(!xmarkVisible){button.Xmark.hide();}

    const tooltip = new SpriteCanvas(0, 0, 220, 30);
    const tooltipFont = clone(this.DefaultFontSetting);
    tooltipFont.fontSize = 16;
    tooltipFont.fill = this.color.White;
    const tooltipText = tooltip.drawText(0, 2, label, tooltipFont);
    tooltip.resize(Math.max(64, tooltipText.width + this.spacing * 2), 30);
    tooltipText.x = (tooltip.width - tooltipText.width) / 2;
    tooltip.setPOS(dx + buttonSize / 2 - tooltip.width / 2, dy - tooltip.height - 2);
    tooltip.setZ(0x210).hide();
    button.hoverLabel = tooltip;
    button.on('pointerenter', function(){tooltip.show();});
    button.on('pointerleave', function(){tooltip.hide();});
    // Pixi emits `pointertap` for mouse, touch and pen. Keeping separate
    // `click`/`tap` listeners can make one physical interaction reach the
    // toggle twice on hybrid/touch-enabled browsers.
    button.on('pointertap', handler);
    button.defaultActiveState = true;
    button.setZ(0x200).setPOS(dx, dy).alwaysActive = true;
    this.globalSprites.push(button, tooltip);
    return button;
  }
  /*---------------------------------------------------------------------------*/
  /** Rebuild global controls after the language dictionary changes. */
  static refreshGlobalUI(){
    const scene = SceneManager.scene;
    const oldWindows = this.globalWindows || [];
    const oldSprites = this.globalSprites || [];
    const oldOverlay = scene?.overlay;
    const oldOverlayParent = scene?.overlayParent;
    const replacingOverlay = oldWindows.includes(oldOverlay);
    const replacingOverlayParent = oldWindows.includes(oldOverlayParent);

    // Global windows can be the active overlay while the language is
    // changing. Clear that state before replacing the instances, otherwise
    // the scene may keep pointing at a disposed option/dropdown window.
    if(scene && (replacingOverlay || replacingOverlayParent)){
      const keepParentOverlay = replacingOverlay && oldOverlayParent &&
        !oldWindows.includes(oldOverlayParent);
      scene.overlay = keepParentOverlay ? oldOverlayParent : null;
      scene.overlayParent = null;
      scene.overlayFallback = null;
      if(keepParentOverlay){
        oldOverlayParent.show();
        oldOverlayParent.activate();
        this.renderSprite(this.dimSprite);
      }
      else{
        this.removeSprite(this.dimSprite);
      }
    }

    oldWindows.forEach(function(win){
      win.removeLanguageDropdownOutsideHandler?.();
      win.disposeLanguageDropdown?.();
      win.removeCanvasScaleDropdownOutsideHandler?.();
      win.disposeCanvasScaleDropdown?.();
      win.removeFullscreenUpdateHandler?.();
      if(scene && scene.children.indexOf(win) >= 0){
        scene.removeChild(win);
      }
      if(scene && scene._windows){
        const index = scene._windows.indexOf(win);
        if(index >= 0){scene._windows.splice(index, 1);}
      }
      win.removeAllListeners?.();
      win.destroy?.({children: true});
    });
    oldSprites.forEach(function(sprite){
      if(scene && scene.children.indexOf(sprite) >= 0){
        scene.removeChild(sprite);
      }
      sprite.removeAllListeners?.();
      sprite.destroy?.({children: true});
    });

    this.globalWindows = [];
    this.globalSprites = [];
    this.createGlobalWindows();
    this.createGlobalSprites();

    // Language refresh happens while the current scene is still running.
    // Reattach the newly created global controls immediately instead of
    // waiting for the next scene transition.
    if(scene?.isActive?.()){
      scene.renderGlobalSprites();
      scene.renderGlobalWindows();
    }
  }
  /**----------------------------------------------------------------------------
   * > Sprite for fading effect
   */
  static createFadingSprite(){
    this.fadingSprite = new Sprite();
    this.fadingSprite.fillRect(0, 0, this.width, this.height, Graphics.color.Black);
    this.fadingSprite.label = "Fading Sprite"
    this.fadingSprite.setZ(1000);
    this.fadingSprite.hide();
  }
  /**----------------------------------------------------------------------------
   * > Create unfocus effect sprite
   */
  static createUnfocusSprite(){
    this.unfocusSprite = new Sprite();
    this.unfocusSprite.fillRect(0, 0, this.width, this.height, Graphics.color.White);
    this.unfocusSprite.setOpacity(0.5);
    this.unfocusSprite.setZ(1001);
    this.unfocusSprite.label = "Unfocus Sprite";
    this.unfocusSprite.hide();
  }
  /*---------------------------------------------------------------------------*/
  static createDimSprite(){
    this.dimSprite = new Sprite();
    this.dimSprite.fillRect(0, 0, this.width, this.height, Graphics.color.Black);
    this.dimSprite.label = "Dim Sprite";
    this.dimSprite.setZ(0x100).setOpacity(0.7);
  }
  /**-------------------------------------------------------------------------
   * Option icon on bottom-left corner to open the option window
   */
  static createOptionSprite(){
    let handler = function(){
      Sound.playSE(Sound.IconOK);
      if(Graphics.optionWindow.visible){
        SceneManager.scene.closeOverlayAll();
      }
      else{
        SceneManager.scene.raiseOverlay(Graphics.optionWindow);
      }
    }
    this.optionSprite = this.createGlobalButton(
      this.IconID.Option, this.spacing, Vocab.Options, handler
    );
  }
  /**-------------------------------------------------------------------------
   * Option icon on bottom-left corner to enable/disable the BGM
   */
  static createBGMSprite(){
    let handler = function(){
      this.toggleBGM();
      this.playSE(Sound.IconOK);
    }.bind(Sound);
    this.BGMSprite = this.createGlobalButton(
      this.IconID.BGM, this.spacing + 50, Vocab.BGMButton || Vocab.BGMVolume, handler,
      !Sound.isBGMEnabled
    );
  }
  /**-------------------------------------------------------------------------
   * Option icon on bottom-left corner to enable/disable the SE
   */
  static createSESprite(){
    let handler = function(){
      this.toggleSE();
      this.playSE(Sound.IconOK);
    }.bind(Sound);
    this.SESprite = this.createGlobalButton(
      this.IconID.SE, this.spacing + 100, Vocab.SEButton || Vocab.SEVolume, handler,
      !Sound.isSEEnabled
    );
  }
  /**----------------------------------------------------------------------------
   * > Create sprite display FPS
   */
  static createFPSSprite(){
    let font = clone(this.DefaultFontSetting)
    font.fontSize = 18;
    this.FPSSprite = new PIXI.Text({text: "FPS: ", style: font});
    this.FPSSprite.setZ(0x100);
  }
  /*---------------------------------------------------------------------------*/
  static createOptionWindow(){
    this.optionWindow = new Window_Option();
    this.optionWindow.hide();
    this.optionWindow.deactivate();
    this.globalWindows.push(this.optionWindow);
  }
  /**----------------------------------------------------------------------------
   * > Create main viewport
   * @property {PIXI.Application} app - the PIXI web application
   */  
  static async createApp(){
    this.app = new PIXI.Application();
    const renderResolution = this.RenderResolution || 2;
    await this.app.init({
      width: this._width,
      height: this._height,
      resolution: renderResolution,
      autoDensity: true,
      antialias: this.Antialias !== false,
      background: this.AppBackColor,
      preference: 'webgl',
      autoStart: false,
    });
    this.app.width  = this._width;
    this.app.height = this._height;
    this.app.canvas.style.zIndex = 0;
    this.updateAppPosition();
    this._resizeHandler = this.updateAppPosition.bind(this);
    this._fullscreenChangeHandler = function(){
      this.updateAppPosition();
      this.updateScreenWakeLock();
      requestAnimationFrame(function(){
        if(document.hasFocus() && SceneManager?.scene && !SceneManager._focused){
          SceneManager.focusGame();
        }
      });
    }.bind(this);
    window.addEventListener('resize', this._resizeHandler);
    window.visualViewport?.addEventListener('resize', this._resizeHandler);
    document.addEventListener('fullscreenchange', this._fullscreenChangeHandler);
    this._visibilityChangeHandler = this.updateScreenWakeLock.bind(this);
    document.addEventListener('visibilitychange', this._visibilityChangeHandler);
  }

  /**-------------------------------------------------------------------------
   * > Keep the fixed-resolution game centered in the browser viewport
   */
  static updateAppPosition(){
    if(!this.app || !this.app.canvas){return ;}
    const scale = this.displayScale;
    const displayWidth = this._width * scale;
    const displayHeight = this._height * scale;
    const viewport = window.visualViewport;
    const viewportWidth = viewport?.width || window.innerWidth || document.documentElement.clientWidth || screen.width;
    const viewportHeight = viewport?.height || window.innerHeight || document.documentElement.clientHeight || screen.height;
    const fitViewport = this.isMobileDevice || (DataManager.canvasScale || "fit") === "fit";
    this.app.x = Math.max((viewportWidth - displayWidth) / 2, 0);
    this.app.y = fitViewport
      ? Math.max((viewportHeight - displayHeight) / 2, 0)
      : Math.max((viewportHeight - displayHeight) / 2 - this._padding * 2, 0);
    this.app.canvas.style.left = this.app.x + 'px';
    this.app.canvas.style.top = this.app.y + 'px';
    this.app.canvas.style.width = displayWidth + 'px';
    this.app.canvas.style.height = displayHeight + 'px';
    this.relocatPageElement(displayHeight);
  }
  /*-------------------------------------------------------------------------*/
  static mapClientPosition(clientX, clientY){
    const point = new PIXI.Point();
    if(this.renderer?.events?.mapPositionToPoint){
      this.renderer.events.mapPositionToPoint(point, clientX, clientY);
      return point;
    }
    const rect = this.app?.canvas?.getBoundingClientRect?.();
    if(rect && rect.width > 0 && rect.height > 0){
      point.set(
        (clientX - rect.left) * this.width / rect.width,
        (clientY - rect.top) * this.height / rect.height,
      );
    }
    return point;
  }
  /**----------------------------------------------------------------------------
   * @property {PIXI.WebGLRenderer} renderer - the rending software of the app
   */
  static initRenderer(){
    if(!this.app){return;}
    // PIXI.Application already creates and owns the renderer. Creating a
    // second auto-detected renderer here leaks another WebGL context.
    this.renderer = this.app.renderer;
    document.app = this.app;
    const gameElement = document.getElementById('GAME');
    if(gameElement && gameElement !== this.app.canvas){
      gameElement.replaceWith(this.app.canvas);
    }
    // Try to enter fullscreen immediately after the canvas is attached.
    // Browsers may reject this automatic request, so
    // requestMobileFullscreen still retries on the first real touch/click
    // gesture.
    this.requestMobileFullscreen();
  }
  /*-------------------------------------------------------------------------*/
  /** Release the renderer and listeners when the Nuxt page is unmounted. */
  static shutdown(){
    if(this._resizeHandler){
      window.removeEventListener('resize', this._resizeHandler);
      window.visualViewport?.removeEventListener('resize', this._resizeHandler);
    }
    if(this._fullscreenChangeHandler){
      document.removeEventListener('fullscreenchange', this._fullscreenChangeHandler);
    }
    if(this._visibilityChangeHandler){
      document.removeEventListener('visibilitychange', this._visibilityChangeHandler);
    }
    this.releaseScreenWakeLock();
    this.removeMobileFullscreenRetryHandler();

    const app = this.app;
    const renderer = this.renderer;
    const appRenderer = app?.renderer;
    // Keep the DOM canvas reference before destroying the application.
    let view = null;
    if(app){
      try{view = app.canvas;}catch(e){view = null;}
    }
    if(app && app.ticker){
      app.ticker.remove(SceneManager.updateMain);
      app.ticker.stop();
    }
    this.clearAssetTextureCache();
    if(renderer && renderer !== appRenderer && typeof renderer.destroy === 'function'){
      try{renderer.destroy(true);}catch(e){console.warn('Unable to release old renderer', e);}
    }
    if(app && typeof app.destroy === 'function'){
      try{app.destroy({removeView: true}, {children: true});}
      catch(e){console.warn('Unable to destroy game renderer', e);}
    }
    if(view && view.parentNode){
      view.parentNode.removeChild(view);
    }
    if(this.loader && typeof this.loader.reset === 'function'){
      this.loader.onProgress?.removeAllListeners?.();
      this.loader.onComplete?.removeAllListeners?.();
      this.loader.onError?.removeAllListeners?.();
      this.loader.reset();
    }
    (this.globalWindows || []).forEach(function(win){
      win.removeLanguageDropdownOutsideHandler?.();
      win.removeCanvasScaleDropdownOutsideHandler?.();
      win.disposeCanvasScaleDropdown?.();
      win.removeFullscreenUpdateHandler?.();
    });
    this.app = null;
    this.renderer = null;
    this._resizeHandler = null;
    this._fullscreenChangeHandler = null;
    this._visibilityChangeHandler = null;
    this._screenWakeLock = null;
  }
  /**-------------------------------------------------------------------------
   * Re-locate page elements under the app
   */
  static relocatPageElement(displayHeight = this._height){
    // Page-level controls now live in the Nuxt header or the game option window.
  }
  /**-------------------------------------------------------------------------
   * > Initialize PIXI Loader
   * @property {AssetLoader} loader - adapter backed by PIXI.Assets
   */
  static initLoader(){
    this.loader = new AssetLoader();
    this.loader.onProgress.add( function(){Graphics._loaderReady = false;} );
    this.loader.onComplete.add( function(){Graphics._loaderReady = true;} );
    this.loader.add(this.LoadImage).load(function(){
      Graphics.app.ticker.add(SceneManager.updateMain);
      Graphics.app.ticker.start();
      SceneManager.processFirstScene();
    });
  }
  /**-------------------------------------------------------------------------
   * > Pre-load all image assets
   */
  static preloadAllAssets(progresshandler, load_ok_handler){
    if(!progresshandler){ progresshandler = function(){} }
    if(!load_ok_handler){ load_ok_handler = function(){} }
    // A route remount can reach this loader more than once. Do not enqueue
    // the same URL repeatedly in one preload pass. IconSet is deliberately
    // decoded as an HTML image: its 19,200px height exceeds the WebGL texture
    // limit on some GPUs, so individual 24px icons are uploaded instead.
    this.loader.add(this.preloadAssetIds);
    this.loader.onProgress.add(progresshandler);
    this.loader.onError.add(this.onLoadError.bind(this));
    this.loader.load(load_ok_handler);
    this.loader.onComplete.add(function(){
      this._assetsReady = true;
    }.bind(this));
  }
  /*------------------------------------------------------------------------*/
  static onLoadError(msg, loader, rss){
    reportError(new ResourceError("PIXI Loader error:\n" + msg + '\n' + 'filename: ' + rss.name));
    let txt = "There was an error while loading resources, probably caused by github.io server error " +
              "and should be resolved after reload the page. Would you like to reload the page?";
    requestReload(txt);
  }
  /**-------------------------------------------------------------------------
   * > Return textire of pre-loaded resources
   * @param {string} name - name of resources
   * @param {Rectangle} [srect] - (Opt)Souce Slice Rect of the texture
   */  
  static loadTexture(name, srect){
    if(srect){
      const source = this.loader.resources[name]?.texture;
      if(!source){throw new ResourceError("Texture is not loaded: " + name);}
      const texture = new PIXI.Texture({
        source: source.source,
        frame: new PIXI.Rectangle(srect.x, srect.y, srect.width, srect.height),
      });
      this._derivedTextures ||= new Set();
      this._derivedTextures.add(texture);
      return texture;
    }
    const resource = this.loader.resources[name];
    if(!resource){throw new ResourceError("Texture is not loaded: " + name);}
    return resource.texture;
  }
  /*-------------------------------------------------------------------------*/
  static loadIconTexture(iconIndex){
    iconIndex = parseInt(iconIndex);
    this._iconTextures ||= new Map();
    if(this._iconTextures.has(iconIndex)){
      return this._iconTextures.get(iconIndex);
    }

    const image = this.loader.resources[this.Iconset]?.image;
    if(!image){throw new ResourceError("IconSet is not loaded: " + this.Iconset);}

    const width = this.IconRect.width;
    const height = this.IconRect.height;
    const sx = iconIndex % this.IconRowCount * width;
    const sy = parseInt(iconIndex / this.IconRowCount) * height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, sx, sy, width, height, 0, 0, width, height);

    const texture = PIXI.Texture.from({
      resource: canvas,
      scaleMode: this.TextureScaleMode || "linear",
      antialias: this.Antialias !== false,
    });
    this._iconTextures.set(iconIndex, texture);
    this._derivedTextures ||= new Set();
    this._derivedTextures.add(texture);
    return texture;
  }
  /*-------------------------------------------------------------------------*/
  /** Remove textures owned by the game before a new renderer is created. */
  static clearAssetTextureCache(){
    const assetIds = new Set([
      this.LoadImage,
      ...(this.Images || []),
      ...(this.WindowSkinSrc || []),
    ].filter(function(id){return id && id !== this.Iconset;}.bind(this)));
    (this._derivedTextures || []).forEach(function(texture){
      try{
        texture.destroy?.(false);
      }catch(e){
        console.warn('Unable to release game texture', e);
      }
    });
    this._derivedTextures?.clear?.();
    this._iconTextures?.clear?.();
    Promise.resolve(PIXI.Assets.unload(Array.from(assetIds))).catch(function(error){
      console.warn('Unable to unload game assets', error);
    });
  }
  /*-------------------------------------------------------------------------*/
  static get getLoadingProgress(){
    return [this._loadProgress, this.preloadAssetIds.length];
  }
  /*-------------------------------------------------------------------------*/
  static get preloadAssetIds(){
    return Array.from(new Set([...(this.Images || []), this.Iconset].filter(Boolean)));
  }
  /**-------------------------------------------------------------------------
   * > Check whether loader has loaded all resources
   * @returns {boolean}
   */  
  static isReady(){
    return this._loaderReady && this._assetsReady;
  }
  /**-------------------------------------------------------------------------
   * > Render scene(stage)
   * @param {Scene_Base} stage - the scene to be rendered
   */  
  static render(stage){
    if(stage){
      this.app.stage = stage;
      this.renderer.render({container: stage})
    }
  }
  /**-------------------------------------------------------------------------
   * > Render sprite to current scene
   * @param {Sprite} sprite - the sprite to be rendered
   */
  static renderSprite(sprite){
    if(SceneManager.scene.children.indexOf(sprite) > -1){return ;}
    if(sprite.isWindow){return this.renderWindow(sprite);}
    SceneManager.scene.addChild(sprite);
    SceneManager.scene.sortChildren();
  }
  /**-------------------------------------------------------------------------
   * > Render window to web page
   */
  static renderWindow(win){
    SceneManager.scene.addWindow(win)
    SceneManager.scene.sortChildren();
  }
  /*-------------------------------------------------------------------------*/
  static renderBitmap(bmp){
    document.body.appendChild(bmp.canvas);
  }
  /*-------------------------------------------------------------------------*/
  static removeBitmap(bmp){
    document.body.removeChild(bmp.canvas);
    if(bmp.input){
      document.body.removeChild(bmp.input);
    }
  }
  /**-------------------------------------------------------------------------
   * > Remove the window that rendered to page
   */
  static removeWindow(win){
    SceneManager.scene.removeWindow(win);
  }
  /**-------------------------------------------------------------------------
   * > Render bitmap to web page
   */
  static removeBitmap(bmp){
    document.body.removeChild(bmp.canvas);
  }
  /**-------------------------------------------------------------------------
   * > Get center x-pos of object in screen
   * @param {number} x - the object's width
   * @returns {number} - the x-pos after centered
   */  
  static screenCenterWidth(x = this._width){
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || screen.width;
    return Math.max((viewportWidth - x) / 2, 0);
  }
  /**-------------------------------------------------------------------------
   * > Get center y-pos of object in screen
   * @param {number} y - the object's height
   * @returns {number} - the y-pos after centered
   */  
  static screenCenterHeight(y = this._height){
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || screen.height;
    return Math.max((viewportHeight - y) / 2 - this._padding * 2, 0);
  }
  /**-------------------------------------------------------------------------
   * Current CSS scale for the fixed 1280x720 game surface.
   */
  static get displayScale(){
    const mode = this.isMobileDevice ? "fit" : (DataManager.canvasScale || "fit");
    if(mode !== "fit"){
      return parseFloat(mode);
    }
    const viewport = window.visualViewport;
    const viewportWidth = viewport?.width || window.innerWidth || document.documentElement.clientWidth || screen.width;
    const viewportHeight = viewport?.height || window.innerHeight || document.documentElement.clientHeight || screen.height;
    const widthScale = Math.max(viewportWidth, 1) / this._width;
    const heightScale = Math.max(viewportHeight, 1) / this._height;
    return Math.max(Math.min(widthScale, heightScale), 0.25);
  }
  /**-------------------------------------------------------------------------
   * Change the display scale without changing the internal game resolution.
   */
  static changeCanvasScale(mode){
    if(this.isFullscreen || this.isMobileDevice){mode = "fit";}
    const valid = ["fit", "0.75", "1", "1.25", "1.5", "2"];
    if(!valid.includes(mode)){return ;}
    DataManager.changeSetting(DataManager.kCanvasScale, mode);
    this.updateAppPosition();
  }
  /**-------------------------------------------------------------------------
   * Whether the current browser is a mobile device.
   */
  static get isMobileDevice(){
    if(typeof globalThis.isMobile === "boolean"){
      return globalThis.isMobile;
    }
    return typeof window !== "undefined" &&
      typeof window.mobilecheck === "function" && window.mobilecheck();
  }
  /**-------------------------------------------------------------------------
   * Whether the game is using the browser Fullscreen API.
   */
  static get isFullscreen(){
    return !!document.fullscreenElement;
  }
  /**-------------------------------------------------------------------------
   * Keep the device screen awake while the game is in browser fullscreen.
   */
  static async updateScreenWakeLock(){
    if(!this.isFullscreen || document.visibilityState === 'hidden'){
      this.releaseScreenWakeLock();
      return;
    }
    if(this._screenWakeLock && !this._screenWakeLock.released){return;}
    const wakeLock = navigator.wakeLock;
    if(!wakeLock || typeof wakeLock.request !== 'function'){return;}
    try{
      const sentinel = await wakeLock.request('screen');
      if(!this.isFullscreen || document.visibilityState === 'hidden'){
        await sentinel.release();
        return;
      }
      this._screenWakeLock = sentinel;
      sentinel.addEventListener('release', function(){
        if(this._screenWakeLock === sentinel){
          this._screenWakeLock = null;
        }
      }.bind(this));
    }
    catch(e){
      // Wake Lock is optional and may be unavailable on insecure origins or
      // denied by the browser without affecting the game itself.
    }
  }
  /**-------------------------------------------------------------------------*/
  static releaseScreenWakeLock(){
    const sentinel = this._screenWakeLock;
    this._screenWakeLock = null;
    if(sentinel && !sentinel.released){
      Promise.resolve(sentinel.release()).catch(function(){});
    }
  }
  /**-------------------------------------------------------------------------
   * Try to enter fullscreen for mobile and tablet devices.
   *
   * Most browsers require a user activation for this API. The initial call
   * is still useful for browsers that allow it, while rejected calls are
   * retried from the first pointer/touch interaction.
   */
  static requestMobileFullscreen(){
    if(!this.isMobileDevice || this.isFullscreen){
      if(this.isFullscreen){this.removeMobileFullscreenRetryHandler();}
      return Promise.resolve(this.isFullscreen);
    }
    const target = document.documentElement;
    const request = target?.requestFullscreen;
    if(typeof request !== 'function'){
      return Promise.resolve(false);
    }
    let requestResult;
    try{
      requestResult = request.call(target, {navigationUI: 'hide'});
    }
    catch(e){
      this.installMobileFullscreenRetryHandler();
      return Promise.resolve(false);
    }
    return Promise.resolve(requestResult)
      .then(function(){
        this.removeMobileFullscreenRetryHandler();
        return true;
      }.bind(this), function(){
        this.installMobileFullscreenRetryHandler();
        return false;
      }.bind(this));
  }
  /**-------------------------------------------------------------------------*/
  static installMobileFullscreenRetryHandler(){
    if(this._mobileFullscreenRetryHandler){return;}
    this._mobileFullscreenRetryHandler = function(){
      this.requestMobileFullscreen();
    }.bind(this);
    const eventName = window.PointerEvent ? 'pointerdown' : 'touchstart';
    this._mobileFullscreenRetryEventName = eventName;
    window.addEventListener(eventName, this._mobileFullscreenRetryHandler);
  }
  /**-------------------------------------------------------------------------*/
  static removeMobileFullscreenRetryHandler(){
    if(!this._mobileFullscreenRetryHandler){return;}
    window.removeEventListener(this._mobileFullscreenRetryEventName || 'pointerdown', this._mobileFullscreenRetryHandler);
    this._mobileFullscreenRetryHandler = null;
    this._mobileFullscreenRetryEventName = null;
  }
  /**-------------------------------------------------------------------------
   * Toggle browser fullscreen. Fit mode remains the non-fullscreen option.
   */
  static toggleFullscreen(){
    if(document.fullscreenElement){
      const exit = document.exitFullscreen?.();
      return Promise.resolve(exit).then(()=>true, ()=>false);
    }
    const requestFullscreen = document.documentElement.requestFullscreen;
    if(typeof requestFullscreen !== 'function'){
      return Promise.resolve(false);
    }
    return Promise.resolve(requestFullscreen.call(document.documentElement))
      .then(()=>true, ()=>false);
  }
  /**-------------------------------------------------------------------------
   * > Get center x-pos of object in canva
   * @param {number} x - the object's width
   * @returns {number} - the x-pos after center
   */  
  static appCenterWidth(x = 0){
    return (this._width - x) / 2;
  }
  /**-------------------------------------------------------------------------
   * > Get center y-pos of canva
   * @param {number} y - the object's height
   * @returns {number} - the y-pos after center
   */  
  static appCenterHeight(y = 0){
    return (this._height - y) / 2;
  }
  /**-------------------------------------------------------------------------
   * > Frame update
   * @memberof Graphics
   */  
  static update(){
    this.updateFPS();
    this.updateMouseEffect();
  }
  /**-------------------------------------------------------------------------
   * > Update FPS information
   */
  static updateFPS(){
    this._frameCount += 1;
    this.FPS_Sum -= (this.FPS_SamplePool[this.FPS_SampleIndex] || 0);
    this.FPS_SamplePool[this.FPS_SampleIndex] = this.app.ticker.FPS;
    this.FPS_Sum += this.FPS_SamplePool[this.FPS_SampleIndex];
    this.FPS_SampleIndex = (this.FPS_SampleIndex + 1) % this.FPS_MaxSample;
    this.FPS = Math.floor(this.FPS_Sum / this.FPS_MaxSample);
    this.FPSSprite.text = "FPS: " + this.FPS;
  }
  /**-------------------------------------------------------------------------
   * > Update mouse trailing effect
   */
  static updateMouseEffect(){
    if(Input.isMouseMoved){
      this.mouseMoveTrailingEffect();
    }
    if(Input.isTriggered(Input.keymap.kMOUSE1)){
      this.mouseClickEffect();
    }
  }
  /**-------------------------------------------------------------------------
   * > Add sprite and build a instance name map
   * @param {string} image_name - the path to the image
   * @param {string} instance_name - the name give to the sprite after created
   * @returns {Sprite} - the created sprite
   */  
  static addSprite(image_name, instance_name = null){
    var sprite = new Sprite(Graphics.loadTexture(image_name));
    if(instance_name == null){instance_name = image_name;}
    sprite.label = instance_name;
    this._spriteMap[instance_name] = sprite;
    return sprite;
  }
  /**-------------------------------------------------------------------------
   * > Add text sprite and build a instance name map
   * @param {string} text - the text to show
   * @param {string} instance_name - the name give to the sprite after created
   * @param {object} fontsetting - the font setting for the text
   * @returns {PIXI.Sprite} - the created sprite
   */  
  static addText(text, instance_name = null, fontsetting = Graphics.DefaultFontSetting){
    var sprite = new PIXI.Text({text, style: fontsetting});
    if(instance_name == null){instance_name = text;}
    sprite.label = instance_name;
    this._spriteMap[instance_name] = sprite;
    return sprite;
  }
  /**-------------------------------------------------------------------------
   * > Remove object in current scene
   * @param {PIXI.Sprite|string} - the sprite/instance name of sprite to remove
   */
  static removeSprite(...args){
    args.forEach(function(obj){
      if(isClassOf(obj, String)){ obj = Graphics._spriteMap[obj]; }
      if(!obj){return;}
      delete Graphics._spriteMap[obj.label];
      // Cards and effects can be reparented into a hand or discard-pile
      // container. Remove them from their actual parent during a scene
      // transition instead of assuming they are direct scene children.
      if(obj.parent){
        obj.parent.removeChild(obj);
      }
    })
  }
  /**-------------------------------------------------------------------------
   * > Process transition
   */
  static transition(){
    debug_log(SplitLine, "Process transition")
    this.disposeSprites();
  }
  /*------------------------------------------------------------------------*/
  static disposeSprites(){
    for(var sprite in this._spriteMap){
      if(this._spriteMap.hasOwnProperty(sprite)){
        this.removeSprite(sprite)
      }
    }
  }
  /*------------------------------------------------------------------------*/
  static startLoading(){
    // reserved
  }
  /*------------------------------------------------------------------------*/
  static updateLoading(){
    // reserved
  }
  /*------------------------------------------------------------------------*/
  static endLoading(){
    if(!this.fadingSprite){return ;}
    SceneManager.scene.startFadeIn();
    this.renderSprite(this.unfocusSprite);
  }
  /*------------------------------------------------------------------------*/
  static onUnfocus(){
    this.unfocusSprite.show();
  }
  /*------------------------------------------------------------------------*/
  static onFocus(){
    this.unfocusSprite.hide();
  }
  /**------------------------------------------------------------------------
   * > Getter functions
   */
  static get width(){return this._width;}
  static get height(){return this._height;}
  static get padding(){return this._padding;}
  static get spacing(){return this._spacing;}
  static get lineHeight(){return this._lineHeight;}
  /**------------------------------------------------------------------------
   * > Return a random color from color.json
   */
  static randomColor(exclude = []){
    let candidates = [];
    for(let k in this.color){
      if(this.color.hasOwnProperty(k)){
        candidates.push(this.color[k]);
      }
    }
    for(let i=0;i<exclude.length;++i){
      let idx = candidates.indexOf(exclude[i]);
      if(idx >= 0){candidates.splice(idx, 1);}
    }
    let ki = parseInt(Math.random() * 1000) % candidates.length;
    let re = candidates[ki];
    return re;
  }
  /**------------------------------------------------------------------------
   * > Alias functions
   * @function
   */
  static aliasFunctions(){
    /** @alias renderWindow */
    this.addWindow = this.renderWindow.bind(this);
  }
  /*------------------------------------------------------------------------*/
  static pauseAnimatedSprite(obj){
    if(obj.unpause){return ;}
    if(isClassOf(obj, PIXI.AnimatedSprite)){
      if(obj.playing){
        obj.paused = true;
        obj.stop();
      }
    }
    if(obj.children){
      obj.children.forEach(function(child){
        Graphics.pauseAnimatedSprite(child);
      })
    }
  }
  /*------------------------------------------------------------------------*/
  static resumeAnimatedSprite(obj){
    if(isClassOf(obj, PIXI.AnimatedSprite)){
      if(obj.paused){
        obj.play();
        obj.paused = false;
      }
    }
    if(obj.children){
      obj.children.forEach(function(child){
        Graphics.resumeAnimatedSprite(child);
      })
    }
  }
  /**----------------------------------------------------------------------------
   * Clicking feedback effect
   */
  static mouseClickEffect(){
    if(!this.isReady() || !Input.mouseAppPOS){return ;}
    let dx = Input.mouseAppPOS[0];
    let dy = Input.mouseAppPOS[1];
    /**
     * @property {boolean} unpause - won't pause regardless game unfocused
     */
    let sp = this.playAnimation(dx, dy, this.Clicking, 2);
    sp.setZ(0x1000).setOpacity(this.mouseClickOpacity).unpause = true;    
  }
  /**----------------------------------------------------------------------------
   * Mouse move trailing visual effect
   */
  static mouseMoveTrailingEffect(){
    if(!this.isReady()){return ;}
    let dx = Input.mouseAppPOS[0];
    let dy = Input.mouseAppPOS[1];
    /**
     * @property {boolean} unpause - won't pause regardless game unfocused
     */
    let sp = this.playAnimation(dx, dy, this.Trailing, 2)
    sp.setOpacity(this.mouseTrailOpacity).setZ(0x1000).unpause = true;
  }
  /**------------------------------------------------------------------------
   * Create animated sprite
   * @param {String} image - the image name
   * @param {boolean} crt_holder - create holder to avoid the direct render 
   * crash on scene. The animatedSprite can be accessed with <Holder.anim>
   */
  static generateAnimation(image, crt_holder = false){
    let oriImage = this.loadTexture(image);
    let sqlen    = oriImage.width / this.AnimRowCount
    let src_rect = new Rect(0, 0, sqlen, sqlen)
    let textureArray = [];
    let rowMax   = oriImage.width  / src_rect.width;
    let colMax   = oriImage.height / src_rect.height;
    for(let i=0;i<colMax;++i){
      src_rect.x = 0;
      for(let j=0;j<rowMax;++j){
        textureArray.push(this.loadTexture(image, src_rect))
        src_rect.x += src_rect.width;
      }
      src_rect.y += src_rect.height;
    }
    let re = new PIXI.AnimatedSprite(textureArray);
    re.loop = false;
    if(crt_holder){
      let holder = new SpriteCanvas(0, 0, re.width, re.height);
      holder.addChild(animSprite);
      holder.anim = re;
      re.onComplete = function(){Graphics.removeSprite(holder)};
      return holder;
    }
    else{re.onComplete = function(){Graphics.removeSprite(re)};}
    return re;
  }
  /**------------------------------------------------------------------------
   * Play an animation on the screen
   * @param {Number} x
   * @param {Number} y
   * @param {String} image - image key(path)
   * @param {Number} [align] - (Default=1) 1: Same as given position, 2: center
   */
  static playAnimation(x, y, image, align = 1){
    let animSprite = this.generateAnimation(image);
    let holder = new SpriteCanvas(0, 0, animSprite.width, animSprite.height);
    holder.addChild(animSprite);
    animSprite.loop = false;
    animSprite.onComplete = function(){Graphics.removeSprite(holder)};
    let dx = align == 1 ? x : (x - animSprite.width  / 2);
    let dy = align == 1 ? y : (y - animSprite.height / 2);
    holder.setPOS(dx, dy).setZ(0x1000);
    this.renderSprite(holder);
    animSprite.play();
    return animSprite;
  }
  /**-------------------------------------------------------------------------
   * If performance is lower, haste the object to make it looks normal
   * @returns {Number} - the delta multiple factor
   */
  static get speedFactor(){
    return 60.0 / this.FPS;
  }
  /*------------------------------------------------------------------------*/
} // class Graphics

/**---------------------------------------------------------------------------
 * The static class handles the input
 *
 * @class Input
 * @property {Array.<Number>} mousePagePOS - mouse position in the web page
 * @property {Array.<Nunber>} mouseClientPOS - mouse position in window viewport
 * @property {Array.<Nunber>} mouseAppPOS - mouse position inside the application
 */
class Input{
  /**-------------------------------------------------------------------------
   * @constructor
   * @memberof Input
   */
  constructor(){
    throw new Error('This is a static class');
  }
  /**-------------------------------------------------------------------------
   * > Module initialization
   * @memberof Input
   * @property {Array.<boolean>} keystate_press   - array of pressed flag key ids
   * @property {Array.<boolean>} keystate_trigger - array of trigger flag key ids
   * @property {boolean} state_changed - key state changed flag
   * @property {boolean} reset_needed  - flag of whether need to reset keystates
   */
  static initialize(){
    this.build_keymap();
    this.keystate_press   = new Array(0xff);
    this.keystate_trigger = new Array(0xff);
    this.state_changed    = false;
    this.reset_needed     = false;
    this.wheelstate       = 0;
    this.mouseAppPOS      = [0, 0];
    this.mouseClientPOS   = [0, 0];
    this.mousePagePOS     = [0, 0];
    this._pointerInside   = false;
    this.setupEventHandlers();
  }
  /**-------------------------------------------------------------------------
   * > Setup keymap for acceptable keys
   * @property {object} keymap - key map, mapping to the key id
   */
  static build_keymap(){
    this.keymap = { 
      kMOUSE1: 1, kMOUSE2: 2, kMOUSE3: 3,
      k0: 48, k1: 49, k2: 50, k3: 51, k4: 52, k5: 53,
      k6: 54, k7: 55, k8: 56, k9: 57,
      
      kA: 65, kB: 66, kC: 67, kD: 68, kE: 69, kF: 70,
      kG: 71, kH: 72, kI: 73, kJ: 74, kK: 75, kL: 76,
      kM: 77, kN: 78, kO: 79, kP: 80, kQ: 81, kR: 82,
      kS: 83, kT: 84, kU: 85, kV: 86, kW: 87, kX: 88,
      kY: 89, kZ: 90,
      
      kENTER: 13,    kRETURN: 13,  kBACKSPACE: 8, kSPACE: 32,
      kESCAPE: 27,   kESC: 27,     kSHIFT: 16,    kTAB: 9,
      kALT: 18,      kCTRL: 17,    kDELETE: 46,   kDEL: 46,
      kINSERT: 45,   kINS: 45,     kPAGEUP: 33,   kPUP: 33,
      kPAGEDOWN: 34, kPDOWN: 34,   kHOME: 36,     kEND: 35,
      kLALT: 164,    kLCTRL: 162,  kRALT: 165,    kRCTRL: 163,
      kLSHIFT: 160,  kRSHIFT: 161,
      
      kLEFT: 37, kRIGHT: 39, kUP: 38, kDOWN: 40,
      
      kCOLON: 186,     kAPOSTROPHE: 222, kQUOTE: 222,
      kCOMMA: 188,     kPERIOD: 190,     kSLASH: 191,
      kBACKSLASH: 220, kLEFTBRACE: 219,  kRIGHTBRACE: 221,
      kMINUS: 189,     kUNDERSCORE: 189, kPLUS: 187,
      kEQUAL: 187,     kEQUALS: 187,     kTILDE: 192,
      
      kF1: 112,  kF2: 113,  kF3: 114, kF4: 115, kF5: 116,
      kF6: 117,  kF7: 118,  kF8: 119, kF9: 120, kF10: 121,
      kF11: 122, kF12: 123,
      
      kArrows: 224,
    }
  }
  /**-------------------------------------------------------------------------
   * > Process when key is down
   * @param {KeyboardEvent|MouseEvent} event - the keydown event
   */
  static onKeydown(event){
    let key_id = parseInt(event.which || event.keyCode);
    // Keep F11, the option item and Esc on the same Fullscreen API state.
    // Native browser F11 fullscreen cannot be exited by page JavaScript,
    // which otherwise leaves the in-game switch unable to control it.
    if(event.code === 'F11' || key_id === this.keymap.kF11){
      event.preventDefault();
      if(!event.repeat && !this.keystate_press[key_id]){
        Graphics.toggleFullscreen();
      }
    }
    if(!this.keystate_press[key_id]){
      this.keystate_trigger[key_id] = true;
    }
    this.keystate_press[key_id] = true;
    this.state_changed = true;
  }
  /**-------------------------------------------------------------------------
   * > Process when key is up
   * @param {KeyboardEvent|MouseEvent} event - the keyup event
   */
  static onKeyup(event){
    const key_id = parseInt(event.which || event.keyCode);
    this.keystate_press[key_id] = false;
    this.state_changed = true;
  }
  /**-------------------------------------------------------------------------
   * > Mouse wheel handler
   */
  static processMouseWheel(event){
    const delta = event.wheelDelta || -event.detail || -event.deltaY || 0;
    this.wheelstate = delta > 0 ? 1 : delta < 0 ? -1 : 0;
    this.state_changed = true;
  }
  /**-------------------------------------------------------------------------
   * > Record client mouse pos
   * @param {MouseEvent} event 
   */
  static processMouseMove(event){
    let px = event.pageX || 0, py = event.pageY || 0;
    this._mouseMoved    = !(isArrayalike([px, py], this.mousePagePOS));
    this.mousePagePOS   = [px, py];
    this.mouseClientPOS = [event.clientX || 0, event.clientY || 0];
    const appPosition = Graphics.mapClientPosition(
      this.mouseClientPOS[0],
      this.mouseClientPOS[1],
    );
    this.mouseAppPOS = [appPosition.x, appPosition.y];
    this.state_changed  = true;
  }
  /*-------------------------------------------------------------------------*/
  static setupEventHandlers(){
    this._eventHandlers = {
      keydown: this.onKeydown.bind(this),
      keyup: this.onKeyup.bind(this),
      mousedown: this.onKeydown.bind(this),
      mouseup: this.onKeyup.bind(this),
      mousewheel: this.processMouseWheel.bind(this),
      wheel: this.processMouseWheel.bind(this),
      mousemove: this.processMouseMove.bind(this),
      pointermove: this.processMouseMove.bind(this),
    };
    window.addEventListener("keydown", this._eventHandlers.keydown);
    window.addEventListener("keyup", this._eventHandlers.keyup);
    window.addEventListener("mousedown", this._eventHandlers.mousedown);
    window.addEventListener("mouseup", this._eventHandlers.mouseup);
    window.addEventListener("mousewheel", this._eventHandlers.mousewheel);
    window.addEventListener("wheel", this._eventHandlers.wheel);
    document.addEventListener("mousemove", this._eventHandlers.mousemove);
    document.addEventListener("pointermove", this._eventHandlers.pointermove);

    let app = Graphics.app.canvas;
    this._inputView = app;
    this._viewMouseoverHandler = function(){this._pointerInside = true;}.bind(this);
    this._viewMouseoutHandler = function(){this._pointerInside = false;}.bind(this);
    this._viewPointerdownHandler = function(){
      this._pointerInside = true;
      if(document.hasFocus() && globalThis.SceneManager?.scene && !SceneManager._focused){
        SceneManager.focusGame();
      }
    }.bind(this);
    app.addEventListener('mouseover', this._viewMouseoverHandler);
    app.addEventListener('mouseout', this._viewMouseoutHandler);
    // Restore the scene before Pixi handles this same pointer event. Without
    // capture, the first click after focus/fullscreen only wakes the game and
    // never reaches the selected control's pointertap handler.
    app.addEventListener('pointermove', this._viewPointerdownHandler, true);
    app.addEventListener('pointerdown', this._viewPointerdownHandler, true);
  }
  /*-------------------------------------------------------------------------*/
  static shutdown(){
    const handlers = this._eventHandlers;
    if(handlers){
      window.removeEventListener("keydown", handlers.keydown);
      window.removeEventListener("keyup", handlers.keyup);
      window.removeEventListener("mousedown", handlers.mousedown);
      window.removeEventListener("mouseup", handlers.mouseup);
      window.removeEventListener("mousewheel", handlers.mousewheel);
      window.removeEventListener("wheel", handlers.wheel);
      document.removeEventListener("mousemove", handlers.mousemove);
      document.removeEventListener("pointermove", handlers.pointermove);
    }
    if(this._inputView){
      this._inputView.removeEventListener('mouseover', this._viewMouseoverHandler);
      this._inputView.removeEventListener('mouseout', this._viewMouseoutHandler);
      this._inputView.removeEventListener('pointermove', this._viewPointerdownHandler, true);
      this._inputView.removeEventListener('pointerdown', this._viewPointerdownHandler, true);
    }
    this._eventHandlers = null;
    this._inputView = null;
  }
  /**-------------------------------------------------------------------------
   * > Frame update
   * @memberof Input
   */
  static update(){
    if(this.state_changed){
      this.state_changed = false;
      this.reset_needed  = true;
    }
    else if(this.reset_needed){
      this._mouseMoved  = false;
      this.reset_needed = false;
      for(let i=0;i<0xff;++i){this.keystate_trigger[i] = false;}
      this.wheelstate = 0;
    }
  }
  /**-------------------------------------------------------------------------
   * > Check whether mouse is in certain area
   * @param {Rect} crect - the collision rect
   */
  static isMouseInArea(crect){
    return crect.contains(this.mouseAppPOS[0], this.mouseAppPOS[1]);
  }
  /**-------------------------------------------------------------------------
   * > Check whether key is triggered in certain area
   * @param {Number} kid - key id
   * @param {Rect} crect - collision rect
   */
  static isTriggerArea(kid, crect){
    if(!crect || !Input.mousePagePOS){return false;}
    if(!Input.isTriggered(kid)){return false;}
    return crect.contains(Input.mouseAppPOS[0], Input.mouseAppPOS[1]);
  }
  /**-------------------------------------------------------------------------
   * > Check whether the given key id is triggered
   * @param {number} key_id - id of the key
   * @returns {boolean}
   */
  static isTriggered(key_id){
    return this.keystate_trigger[key_id];
  }
  /**-------------------------------------------------------------------------
   * > Check whether the given key id is pressed
   * @param {number} key_id - id of the key
   * @returns {boolean}
   */
  static isPressed(key_id){
    return this.keystate_press[key_id];
  }
  /**-------------------------------------------------------------------------
   * > Check whether mouse moved
   */
  static get isMouseMoved(){
    return this._mouseMoved;
  }
  /**-------------------------------------------------------------------------
   * > Check whether pointer is inside the app
   */
  static get isPointerInside(){
    const view = Graphics.app?.canvas;
    const rect = view?.getBoundingClientRect?.();
    const position = this.mouseClientPOS;
    if(rect && position){
      return position[0] >= rect.left && position[0] <= rect.right &&
        position[1] >= rect.top && position[1] <= rect.bottom;
    }
    return !!this._pointerInside;
  }
  /**-------------------------------------------------------------------------
   * > Check whether mouse wheel scrolled up
   */
  static isWheelUp(){
    return this.wheelstate == 1;
  }
  /**-------------------------------------------------------------------------
   * > Check whether mouse wheel scrolled down
   */
  static isWheelDown(){
    return this.wheelstate == -1;  
  }
} // class Input

/**---------------------------------------------------------------------------
 * >> The root object of the display tree.
 *
 * @class Stage
 * @extends PIXI.Container
 */
class Stage extends PIXI.Container{
  /**-------------------------------------------------------------------------
   * @constructor
   * @memberof Stage
   */
  constructor(...args){
    super(...args);
    this.initialize.apply(this, arguments);
  }
  /**-------------------------------------------------------------------------
   * > Object initialization
   * @memberof Stage
   */
  initialize(){
    // Passive keeps scene children in the v8 event traversal without making
    // the stage itself a hit target.
    this.eventMode = 'passive';
    this.sortableChildren = true;
  }
}

/**---------------------------------------------------------------------------
 * >> The static class that process audios
 *
 * @class Sound
 */
class Sound{
  /**-------------------------------------------------------------------------
   * @constructor
   * @memberof Sound
   */
  constructor(){
    throw new Error('This is a static class');
  }

  /**-------------------------------------------------------------------------
   * @class soundInstance
   * @property {string} symbol - symbol/key of audio file
   * @property {string} type   - type of audio file: SE(non-looping)/BGM(looping)
   * @property {Number} id     - Id of audio file's eigen-object
   */

  /**-------------------------------------------------------------------------
   * > Module initialization
   * @memberof Sound
   * @property {float} _masterVolume - default master volume of audios
   * @property {soundInstance} _currentBGM - current BGM
   * @property {Array.<soundInstance>} _currentSE - list of current playing SE
   * @property {Object.<Number, soundInstance>} _audioMap 
   *          - Dictionary of audio id to its soundInstance
   * @property {Object.<String, Howl>} tacck - Dictionary of audio file symbol
   * 
   */
  static initialize(){
    this._masterVolume = 0.5;
    this._bgmVolume    = 1;
    this._seVolume     = 1;
    this._currentBGM   = null;
    this._currentSE    = [];
    this._audioMap     = {};
    this.track         = {};
    this._loadProgress = 0;
    this._stackedBGM   = null;
    this._stageProgres = [];
    this._audioUnlocked = false;
    this._audioUnlockPending = false;
    this.setupAudioUnlock();
    
    this.loadVolumeSetting();
    this.loadAudioEnable();
    this.preloadAllAudio();
  }
  /*-------------------------------------------------------------------------*/
  // Browsers require Web Audio to be resumed from a user gesture.
  static setupAudioUnlock(){
    this._audioUnlockGeneration = (this._audioUnlockGeneration || 0) + 1;
    const unlock = this.unlockAudio.bind(this);
    this._audioUnlockHandlers = {pointerdown: unlock, keydown: unlock};
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }
  /*-------------------------------------------------------------------------*/
  static shutdownAudioUnlock(){
    const handlers = this._audioUnlockHandlers;
    if(!handlers){return;}
    window.removeEventListener('pointerdown', handlers.pointerdown);
    window.removeEventListener('keydown', handlers.keydown);
    this._audioUnlockHandlers = null;
    this._audioUnlockGeneration = (this._audioUnlockGeneration || 0) + 1;
    this._audioUnlockPending = false;
  }
  /*-------------------------------------------------------------------------*/
  static unlockAudio(){
    if(this._audioUnlocked || this._audioUnlockPending){return;}

    const howler = globalThis.Howler;
    const unlockGeneration = this._audioUnlockGeneration;
    const finish = () => {
      if(this._audioUnlockGeneration !== unlockGeneration){return;}
      this._audioUnlockPending = false;
      this._audioUnlocked = true;
      if(howler){howler.state = 'running';}

      const pendingBGM = this._stackedBGM;
      if(pendingBGM && this.isBGMEnabled){
        this._stackedBGM = null;
        this.fadeInBGM(pendingBGM);
      }
    };

    if(!howler || !howler.ctx || typeof howler.ctx.resume !== 'function'){
      finish();
      return;
    }
    if(howler.ctx.state === 'running'){
      finish();
      return;
    }

    this._audioUnlockPending = true;
    try{
      const resumeResult = howler.ctx.resume();
      if(resumeResult && typeof resumeResult.then === 'function'){
        resumeResult.then(finish).catch(() => {
          if(this._audioUnlockGeneration === unlockGeneration){
            this._audioUnlockPending = false;
          }
        });
      }
      else{
        finish();
      }
    }
    catch(e){
      if(this._audioUnlockGeneration === unlockGeneration){
        this._audioUnlockPending = false;
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  static loadVolumeSetting(){
    let vol = DataManager.volume;
    this._masterVolume = vol[0];
    this._bgmVolume    = vol[1];
    this._seVolume     = vol[2];
  }
  /*-------------------------------------------------------------------------*/
  static loadAudioEnable(){
    this.audioEnable   = DataManager.audioEnable;
  }
  /*-------------------------------------------------------------------------*/
  static preloadAllAudio(){
    debug_log("Load audios...")
    Sound.resources.forEach((filename) => {
      this.loadAudio(filename)
    })
  }
  /*-------------------------------------------------------------------------*/
  static loadAudio(filename){
    this.track[filename] = new Howl({
      src: [filename],
      volume: Sound._masterVolume,
      onload: function(){Sound.reportLoadProgress(filename)},
      onfade: function(SoundID){Sound.onAudioFadeComplete(SoundID)},
      onstop: function(soundID){Sound.unregisterAudio(soundID);}, 
      onend: function(soundID){Sound.unregisterAudio(soundID);},
      onloaderror: function(sid, msg){
        reportError(new ResourceError(msg + ' ' + filename));
        let txt = "There was an error while loading resources, probably caused by github.io server error " +
              "and should be resolved after reload the page. Would you like to reload the page?";
        requestReload(txt);
      },
    });
    return this.track[filename];
  }
  /*-------------------------------------------------------------------------*/
  static loadStageAudio(){
    if(this._loadingStage){return ;}
    debug_log("Load stage audios...")
    this._loadingStage = true;
    for (const prop in stageAudioData) {
      if (prop == "resources" || prop == "_comment") { continue; }
      Sound[prop] = stageAudioData[prop];
      Sound.resources.push(stageAudioData[prop]);
      Sound.loadAudio(stageAudioData[prop]);
    }
  }
  /*-------------------------------------------------------------------------*/
  static registerAudio(soundInstance){
    debug_log("Audio registered: " + soundInstance.id);
    Sound._audioMap[soundInstance.id] = soundInstance;
    if(soundInstance.type == 'SE'){
      Sound._currentSE.push(soundInstance);
    }
    else if(soundInstance.type == 'BGM'){
      Sound._currentBGM = soundInstance;
    }
  }
  /*-------------------------------------------------------------------------*/
  static unregisterAudio(soundID){
    let soundInstance = Sound._audioMap[soundID];
    if(!soundInstance){return ;}
    debug_log("Audio unregisterd: " + soundID);
    let soundContext = Sound.track[soundInstance.symbol];
    if(soundInstance && !soundContext.loop(soundID)){
      if(soundInstance.type == 'SE'){
        let index = Sound._currentSE.indexOf(soundInstance);
        if(index >= 0){Sound._currentSE.splice(index, 1);}
      }
      else if(soundInstance.type == 'BGM'){
        if(Sound._currentBGM && Sound._currentBGM.id == soundID){
          Sound._currentBGM = null;
        }
      }
      Sound._audioMap[soundID] = null;
    }
  }
  /*-------------------------------------------------------------------------*/
  static get getLoadingProgress(){
    return [this._loadProgress, this.resources.length];
  }
  /*-------------------------------------------------------------------------*/
  static reportLoadProgress(fname){
    Sound._loadProgress += 1;
    debug_log("Audio Loaded: " + fname + ' ' + Sound._loadProgress + '/' + Sound.resources.length + '(' + Sound.loadPercent + ')')
  }
  /*-------------------------------------------------------------------------*/
  static onAudioFadeComplete(soundID){
    if(!Sound._audioMap[soundID]){
      // Howler can finish a fade after stop/unregister has already run.
      // Treat that callback as harmless instead of reporting a false error.
      return ;
    }
    let soundGroup = Sound.track[Sound._audioMap[soundID].symbol];
    if(!soundGroup){return ;}
    if(soundGroup.volume(soundID) == 0.0){
      soundGroup.loop(false, soundID);
      Sound.unregisterAudio(soundID)
    }
  }
  /*-------------------------------------------------------------------------*/
  static isReady(){
    return this._loadProgress == this.resources.length;
  }
  /*-------------------------------------------------------------------------*/
  static isStageReady(){
    return this._loadingStage && this.isReady();
  }
  /*-------------------------------------------------------------------------*/
  static get loadProgress(){
    return this._loadProgress;
  }
  /*-------------------------------------------------------------------------*/
  static get loadPercent(){
    return this._loadProgress / this.resources.length;
  }
  /**-------------------------------------------------------------------------
   * > Play the audio file as Sound Effect of given symbol
   * @param {string} symbol - symbol of the audio file
   */
  static playSE(symbol, volume = this._seVolume){
    if(!this.isSEEnabled){return ;}
    if(!this._audioUnlocked){return -1;}
    if(!this.track[symbol]){
      throw new Error("Undefined audio track: " + symbol)
    }
    let pid = -1;
    pid = this.track[symbol].play();
    this.track[symbol].volume(volume * this._masterVolume, pid);
    this.registerAudio( {id:pid, type:'SE', symbol:symbol} );
    return pid;
  }
  /**-------------------------------------------------------------------------
   * > Play the audio file as BGM(looping)
   */
  static playBGM(symbol){
    if(arguments.length != 1){
      throw new ArgumentError(1, arguments.length);
    }
    if(!this.isBGMEnabled){
      this._stackedBGM = symbol;
      return 0;
    }
    if(!this._audioUnlocked){
      this._stackedBGM = symbol;
      return 0;
    }
    if(this._currentBGM){this.stopBGM();}
    let pid = -1;
    pid = this.track[symbol].play();
    this.track[symbol].loop(true, pid);
    this.track[symbol].volume(this._masterVolume * this._bgmVolume);
    this.registerAudio( {id:pid, type:'BGM', symbol:symbol} );

    return pid;
  }
  /**-------------------------------------------------------------------------
   * > Play the SE with fade-in effect
   */
  static fadeInSE(symbol, duration = Sound.fadeDurationSE){
    if(!this.isSEEnabled){return ;}
    if(!this._audioUnlocked){return -1;}
    let pid = -1;
    pid = this.track[symbol].play();
    let vol = this._masterVolume * this._seVolume
    this.track[symbol].fade(0.0, vol, duration, pid);
    this.registerAudio( {id:pid, type:'SE',symbol:symbol} );
    return pid;
  }
  /**-------------------------------------------------------------------------
   * > Play the BGM with fade-in effect
   */
  static fadeInBGM(symbol, duration = Sound.fadeDurationBGM){
    if(!this.isBGMEnabled){
      this._stackedBGM = symbol;
      return 0;
    }
    if(!this._audioUnlocked){
      this._stackedBGM = symbol;
      return 0;
    }
    // Re-entering a scene while refreshing its language should not restart
    // the same BGM. Restore the existing instance instead so playback keeps
    // its current position and any pending fade-out is cancelled.
    if(this._currentBGM && this._currentBGM.symbol === symbol){
      const current = this._currentBGM;
      this.track[symbol].loop(true, current.id);
      const targetVolume = this._masterVolume * this._bgmVolume;
      const currentVolume = this.track[symbol].volume(current.id);
      this.track[symbol].fade(currentVolume, targetVolume, duration, current.id);
      return current.id;
    }
    if(this._currentBGM){this.fadeOutBGM();}
    let pid = -1;
    pid = this.track[symbol].play();
    this.track[symbol].loop(true, pid);

    if(!this.isBGMEnabled){
      this.track[symbol].volume(0);
    }
    else{
      this.track[symbol].fade(0.0, this._masterVolume * this._bgmVolume, duration, pid);
    }

    this.registerAudio( {id:pid, type:'BGM', symbol:symbol} );
    return pid;
  }
  /*-------------------------------------------------------------------------*/
  /** Fade the currently playing BGM back in without restarting it. */
  static fadeInCurrentBGM(duration = Sound.fadeDurationBGM){
    const current = this._currentBGM;
    if(!current || !this.isBGMEnabled){return;}

    const track = this.track[current.symbol];
    const targetVolume = this._masterVolume * this._bgmVolume;
    const currentVolume = track.volume(current.id);
    track.fade(currentVolume, targetVolume, duration, current.id);
  }
  /*-------------------------------------------------------------------------*/
  static fadeOutBGM(duration = Sound.fadeDurationBGM){
    let s = this._currentBGM;
    if(!s){return;}
    if(!this.isBGMEnabled){return this.stopBGM();}
    this.track[s.symbol].fade(this._masterVolume * this._bgmVolume, 0.0, duration, s.id);
  }
  /*-------------------------------------------------------------------------*/
  static fadeOutSE(soundID, duration = Sound.fadeDurationSE){
    if(!this.isSEEnabled){return this.stopSE(soundID, duration);}
    let vol = this._masterVolume * this._seVolume;
    if(soundID){
      let s = this._audioMap[soundID];
      this.track[s.symbol].fade(vol, 0.0, duration, s.id);
    }
    else{
      for(let i=0;i<this._currentSE.length;++i){
        let s = this._currentSE[i];
        this.track[s.symbol].fade(vol, 0.0, duration, s.id);
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  static stopBGM(){
    let s = this._currentBGM;
    if(!s){return;}
    this.track[s.symbol].loop(false, s.id);
    this.track[s.symbol].stop(s.id);
  }
  /*-------------------------------------------------------------------------*/
  static stopSE(soundID){
    if(soundID){
      let s = this._audioMap[soundID];
      if(s){this.track[s.symbol].stop(s.id);}
    }
    else{
      // Howler emits `stop` synchronously. The callback removes the sound
      // from _currentSE, so iterate backwards to avoid skipping entries.
      const currentSE = this._currentSE || [];
      for(let i=currentSE.length - 1;i>=0;--i){
        let s = currentSE[i];
        this.track[s.symbol].stop(s.id)
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  static stopAll(){
    this.stopBGM();
    this.stopSE();
  }
  /*-------------------------------------------------------------------------*/
  static fadeOutAll(duration = Sound.fadeDurationBGM){
    this.fadeOutBGM(duration);
    this.fadeOutSE(undefined, duration);
  }
  /*-------------------------------------------------------------------------*/
  static resumeAll(){
    this.resumeBGM();
    this.resumeSE()
  }
  /*-------------------------------------------------------------------------*/
  static pauseAll(){
    this.pauseBGM();
    this.pauseSE()
  }
  /*-------------------------------------------------------------------------*/
  static pauseBGM(){
    let s = this._currentBGM;
    if(!s){return;}
    this.track[s.symbol].pause(s.id);
  }
  /*-------------------------------------------------------------------------*/
  static resumeBGM(){
    if(!this._audioUnlocked){return;}
    let s = this._currentBGM;
    if(!s){return;}
    this.track[s.symbol].play(s.id);
  }
  /*-------------------------------------------------------------------------*/
  static pauseSE(soundID){
    if(soundID){
      let s = this._audioMap[soundID];
      this.track[s.symbol].pause(s.id);
    }
    else{
      for(let i=0;i<this._currentSE.length;++i){
        let s = this._currentSE[i];
        this.track[s.symbol].pause(s.id)
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  static resumeSE(soundID){
    if(!this._audioUnlocked){return;}
    if(soundID){
      let s = this._audioMap[soundID];
      this.track[s.symbol].play(s.id);
    }
    else{
      for(let i=0;i<this._currentSE.length;++i){
        let s = this._currentSE[i];
        this.track[s.symbol].play(s.id)
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  static changeMasterVolume(vol){
    this._masterVolume = vol;
    this.changeBGMVolume(this._bgmVolume);
    this.changeSEVolume(this._seVolume);
    DataManager.changeSetting(DataManager.kVolume, this.volumeData);
  }
  /*-------------------------------------------------------------------------*/
  static changeBGMVolume(vol){
    this._bgmVolume = vol;
    DataManager.changeSetting(DataManager.kVolume, this.volumeData)
    if(!this._currentBGM){return ;}
    this.track[this._currentBGM.symbol].volume(this._masterVolume * vol);
  }
  /*-------------------------------------------------------------------------*/
  static changeSEVolume(vol){
    this._seVolume = vol;
    for(let i=0;i<this._currentSE.length;++i){
      let s = this._currentSE[i];
      this.track[s.symbol].volume(this._masterVolume * vol)
    }
    DataManager.changeSetting(DataManager.kVolume, this.volumeData)
  }
  /*-------------------------------------------------------------------------*/
  static enableBGM(){
    this.audioEnable[0] = true;
    const current = this._currentBGM;
    if(current && this._stackedBGM === current.symbol){
      const track = this.track[current.symbol];
      const currentVolume = track.volume(current.id);
      track.loop(true, current.id);
      track.play(current.id);
      track.fade(currentVolume, this._masterVolume * this._bgmVolume,
        this.fadeDurationBGM, current.id);
      this._stackedBGM = null;
    }
    else if(this._stackedBGM){
      this.playBGM(this._stackedBGM);
      this._stackedBGM = null;
    }
    if(Graphics.BGMSprite){Graphics.BGMSprite.Xmark.hide();}
    DataManager.changeSetting(DataManager.kAudioEnable, this.audioEnable)
  }
  /*-------------------------------------------------------------------------*/
  static disableBGM(){
    this.audioEnable[0] = false;
    if(this._currentBGM){
      // Pausing keeps the Howler id and playback position so enabling BGM
      // resumes the same track instead of starting a new instance.
      this._stackedBGM = this._currentBGM.symbol;
      this.pauseBGM();
    }
    if(Graphics.BGMSprite){Graphics.BGMSprite.Xmark.show();}
    DataManager.changeSetting(DataManager.kAudioEnable, this.audioEnable)
  }
  /*-------------------------------------------------------------------------*/
  static toggleBGM(){
    if(this.isBGMEnabled){
      this.disableBGM();
    }
    else{
      this.enableBGM();
    }
  }
  /*-------------------------------------------------------------------------*/
  static enableSE(){
    this.audioEnable[1] = true;
    if(Graphics.SESprite){Graphics.SESprite.Xmark.hide();}
    DataManager.changeSetting(DataManager.kAudioEnable, this.audioEnable);
  }
  /*-------------------------------------------------------------------------*/
  static disableSE(){
    this.audioEnable[1] = false;
    this.stopSE();
    if(Graphics.SESprite){Graphics.SESprite.Xmark.show();}
    DataManager.changeSetting(DataManager.kAudioEnable, this.audioEnable);
  }
  /*-------------------------------------------------------------------------*/
  static toggleSE(){
    if(this.isSEEnabled){
      this.disableSE();
    }
    else{
      this.enableSE();
    }
  }
  /*-------------------------------------------------------------------------*/
  static playCardDraw(){
    let cand = ["audio/se/cardDraw.mp3", "audio/se/cardDraw2.mp3"]
    this.playSE(cand[parseInt(randInt(0, cand.length-1))])
  }
  /*-------------------------------------------------------------------------*/
  static playCardPlace(){
    let cand = ["audio/se/cardPlace1.mp3", "audio/se/cardPlace2.mp3", "audio/se/cardPlace3.mp3"]
    this.playSE(cand[parseInt(randInt(0, cand.length-1))])
  }
  /*-------------------------------------------------------------------------*/
  static getVictoryTheme(id = -1){
    let cand = [this.Victory0, this.Victory1, this.Victory2]
    if(id < 0 || id >= cand.length){
      id = parseInt(randInt(0, cand.length-1))
    }
    return cand[id];
  }
  /*-------------------------------------------------------------------------*/
  static getStageTheme(id = -1){
    let cand = [this.Stage0, this.Stage1, this.Stage2]
    if(id < 0 || id >= cand.length){
      id = parseInt(randInt(0, cand.length-1))
    }
    return cand[id];
  }
  /*-------------------------------------------------------------------------*/
  static playDefeat(){
    this.playBGM(this.Defeat);
  }
  /*-------------------------------------------------------------------------*/
  static playCardPlace(){
    let cand = ["audio/se/cardPlace1.mp3", "audio/se/cardPlace2.mp3", "audio/se/cardPlace3.mp3"]
    this.playSE(cand[parseInt(randInt(0, cand.length-1))])
  }
  /*-------------------------------------------------------------------------*/
  static playOK(){this.playSE(this.OK);}
  static playOK2(){this.playSE(this.OK2);}
  static playBuzzer(){this.playSE(this.Buzzer);}
  static playCursor(){this.playSE(this.Cursor);}
  static playCancel(){this.playSE(this.Cancel);}
  static playSaveLoad(){this.playSE(this.SaveLoad);}
  static playDeal(){this.playSE(this.Deal);}
  static get volumeData(){return [this._masterVolume, this._bgmVolume, this._seVolume];}
  static get isBGMEnabled(){return this.audioEnable[0];}
  static get isSEEnabled(){return this.audioEnable[1];}
  /*-------------------------------------------------------------------------*/
}

/**---------------------------------------------------------------------------
 * Container-backed game sprite.
 *
 * @class Sprite
 * @constructor
 * @extends PIXI.Container
 * @property {boolean} static - When is child, the position won't effected by
 *                              parent's display origin (ox/oy)
 * 
 * @property {Number} speed   - Pixel delta per average frame
 * @property {Number} realX   - The final x position the sprite should be
 * @property {Number} realY   - The final y position the sprite should be
 */
class Sprite extends PIXI.Container{
  /**-------------------------------------------------------------------------
   * @constructor
   * @memberof Sprite
   * @param {Texture} texture - A PIXI.Texture to convert to sprite
   */
  constructor(...args){
    super();
    const texture = args[0];
    this._visual = null;
    if(texture && texture !== PIXI.Texture.EMPTY){
      this.createVisual(texture);
    }
    this.realX = this.x;
    this.realY = this.y;
    this.setZ(0);
    this.static = false;
    this.eventMode = 'none';
    this.sortableChildren = true;
    this.speed = 8;
    return this;
  }
  /*-------------------------------------------------------------------------*/
  createVisual(texture = PIXI.Texture.EMPTY){
    if(this._visual){return this._visual;}
    this._visual = new PIXI.Sprite(texture);
    this._visual.eventMode = 'none';
    this._visual.zIndex = 0;
    super.addChild(this._visual);
    return this._visual;
  }
  /*-------------------------------------------------------------------------*/
  get texture(){
    return this._visual?.texture || PIXI.Texture.EMPTY;
  }
  set texture(value){
    this.createVisual(value).texture = value;
  }
  get tint(){
    return this._visual?.tint ?? 0xffffff;
  }
  set tint(value){
    this.createVisual().tint = value;
  }
  get anchor(){
    return this.createVisual().anchor;
  }
  /*-------------------------------------------------------------------------*/
  get z(){return this.zIndex;}
  /*-------------------------------------------------------------------------*/
  get rect(){
    return new Rect(this.x, this.y, this.width, this.height);
  }
  /*-------------------------------------------------------------------------*/
  update(){
    this.updateMovement();
  }
  /*-------------------------------------------------------------------------*/
  updateMovement(){
    if(this.deltaX == 0 && this.deltaY == 0){return ;}
    if(this.realX == this.x && this.realY == this.y){
      this.deltaX = 0; this.deltaY = 0;
      this.callMoveCompleteFunction();
      return ;
    }
    if(this.x < this.realX){
      this.x = Math.min(this.realX, this.x + this.deltaX * Graphics.speedFactor);
    }
    else{
      this.x = Math.max(this.realX, this.x + this.deltaX * Graphics.speedFactor);
    }
    if(this.y < this.realY){
      this.y = Math.min(this.realY, this.y + this.deltaY * Graphics.speedFactor);
    }
    else{
      this.y = Math.max(this.realY, this.y + this.deltaY * Graphics.speedFactor);
    }
  }
  /**-------------------------------------------------------------------------
   * Move to given position step by step (called from update)
   */
  moveto(x, y, fallback=null){
    if(x == null){x = this.x;}
    if(y == null){y = this.y;}
    if(this.isMoving){this.callMoveCompleteFunction();}
    this.moveCompleteFallback = fallback;
    this.realX = x;
    this.realY = y;
    let dx = (this.realX - this.x), dy = (this.realY - this.y);
    let h = Math.sqrt(dx*dx + dy*dy);
    this.deltaX = this.speed * dx / h;
    this.deltaY = this.speed * dy / h;
    if(this.deltaX == 0 && this.deltaY == 0){
      this.callMoveCompleteFunction();
    }
  }
  /*-------------------------------------------------------------------------*/
  callMoveCompleteFunction(delay=0){
    if(!this.moveCompleteFallback){return ;}
    if(delay > 0){
      EventManager.setTimeout(()=>{
        if(this.moveCompleteFallback){
          this.moveCompleteFallback();
          this.moveCompleteFallback = null;
        };
      }, delay);
    }
    else{
      this.moveCompleteFallback();
      this.moveCompleteFallback = null;
    }
  }
  /*-------------------------------------------------------------------------*/
  resize(w, h){
    if(w === null){w = this.width;}
    if(h === null){h = this.height;}
    var scale = [w / this.width, h / this.height]
    // PixiJS 8 containers no longer expose the old setTransform helper.
    // Preserve the current position and apply the requested size through the
    // container scale instead.
    this.scale.set(scale[0], scale[1]);
    return this;
  }
  /*-------------------------------------------------------------------------*/
  /** Resize proportionally so the complete image stays inside the target. */
  resizeContain(w, h){
    if(w === null){w = this.width;}
    if(h === null){h = this.height;}
    const sourceWidth = this.texture?.orig?.width || this.width;
    const sourceHeight = this.texture?.orig?.height || this.height;
    const scale = Math.min(w / sourceWidth, h / sourceHeight);
    this.scale.set(scale, scale);
    this.setPOS((w - this.width) / 2, (h - this.height) / 2);
    return this;
  }
  /*-------------------------------------------------------------------------*/
  /** Resize proportionally until the target rectangle has no empty space. */
  resizeCover(w, h){
    if(w === null){w = this.width;}
    if(h === null){h = this.height;}
    const sourceWidth = this.texture?.orig?.width || this.width;
    const sourceHeight = this.texture?.orig?.height || this.height;
    const scale = Math.max(w / sourceWidth, h / sourceHeight);
    this.scale.set(scale, scale);
    this.setPOS((w - this.width) / 2, (h - this.height) / 2);
    return this;
  }
  /*-------------------------------------------------------------------------*/
  /** Resize to the target width while preserving the complete image. */
  resizeToWidth(w){
    if(w === null){w = this.width;}
    const sourceWidth = this.texture?.orig?.width || this.width;
    const scale = w / sourceWidth;
    this.scale.set(scale, scale);
    return this;
  }
  /*-------------------------------------------------------------------------*/
  clear(){
    const children = this.removeChildren();
    children.forEach(function(child){child.destroy?.({children: true});});
    this._visual = null;
    return this;
  }
  /*-------------------------------------------------------------------------*/
  setPOS(x, y){
    if(this.isMoving){this.callMoveCompleteFunction(2);}
    super.setPOS(x, y);
    this.realX = this.x;
    this.realY = this.y;
    return this;
  }
  /*-------------------------------------------------------------------------*/
  fillRect(x, y, w, h, c){
    let rect = new PIXI.Graphics().rect(x, y, w, h).fill(c);
    rect.zIndex = 2;
    rect.alpha = this.opacity;
    this.addChild(rect);
    return rect;
  }
  /*-------------------------------------------------------------------------*/
  drawText(x, y, text, font = Graphics.DefaultFontSetting, autowrap = true){
    if(!font){font = Graphics.DefaultFontSetting}
    if(autowrap){text = this.textWrap(text, font);}
    let txt = new PIXI.Text({text, style: font});
    txt.alpha  = this.opacity;
    txt.setPOS(x,y).setZ(2);
    this.addChild(txt);
    return txt;
  }
  /**-------------------------------------------------------------------------
   * > Draw Icon in Iconset
   * @param {Number} icon_index - the index of the icon in Iconset
   * @param {Number} x - the draw position of X
   * @param {Number} y - the draw position of Y
   */
  drawIcon(icon_index, x, y){
    icon_index = parseInt(icon_index);
    let texture = Graphics.loadIconTexture(icon_index);
    let iconSprite = new Sprite(texture);
    iconSprite.setPOS(x, y).setZ(2);
    this.addChild(iconSprite);
    return iconSprite;
  }
  /*-------------------------------------------------------------------------*/
  addChild(...args){
    const child = super.addChild(...args);
    this.sortChildren();
    return child;
  }
  /*-------------------------------------------------------------------------*/
  render(){
    Graphics.renderSprite(this);
  }
  /*-------------------------------------------------------------------------*/
  remove(){
    Graphics.removeSprite(this);
  }
  /*-------------------------------------------------------------------------*/
  getStringWidth(text, font = Graphics.DefaultFontSetting){
    return new PIXI.Text({text, style: font}).width;
  }
  /*-------------------------------------------------------------------------*/
  textWrap(text, font = Graphics.DefaultFontSetting){
    if(!text){return ;}
    let paddingW = Graphics.padding / 2; // Padding width
    if(this.width - paddingW - Graphics.spacing < 0){
      console.error("Window too small to text warp: " + getClassName(text));
      return text;
    }

    // Line width
    let lineWidth = this.width - paddingW;

    let formated = "";  // Formated string to return
    let curW = 0;       // Current Line Width
    let line = "";      // Current line string
    let strings = text.split(/[\r\n ]+/) // Split strings
    let minusW = this.getStringWidth('-', font);
    let spaceW = this.getStringWidth(' ', font);
    let endl = false;   // End Of Line Flag
    let strW = 0;       // Current processing string width
    let flag_simple = (DataManager.language.indexOf("zh") != -1);
    let str = null; // Current processing string
    debug_log("-----Text Wrap-----");
    debug_log("Original: " + text);
    if(!flag_simple){
      while(str = strings[0]){
        if((str || '').length == 0){continue;}
        strW = this.getStringWidth(str, font);
        endl = false; 
        // String excessed line limit
        if(strW + paddingW > lineWidth){
          line = "";
          let curW = minusW, last_i = 0;
          let processed = false;
          // Process each character in current string
          for(let i=0;i<str.length;++i){
            strW = this.getStringWidth(str[i], font);
            last_i = i;
            // Display not possible
            if(!processed && curW + strW >= lineWidth){
              return text;
            } // Current character acceptable
            else if(curW + strW < lineWidth){
              curW += strW;
              line += str[i];
              processed = true;
            } // Unable to add more
            else{
              break;
            }
          }
  
          line += '-'
          strings[0] = str.substr(last_i, str.length);
          endl = true;
        } // current string can fully add to line
        else if(curW + strW < lineWidth){
          curW += strW + spaceW;
          line += strings.shift() + ' ';
          if(strings.length == 0){endl = true;}
        }
        else{
          endl = true;
        }
        debug_log("Current: " + line);
        if(endl){
          formated += line;
          if(strings.length > 0){formated += '\n';}
          line = "";
          curW = paddingW;
          debug_log("Endl merged: " + formated);
        }
      }
    } // else: just process one by one
    else{
      for(let i=0;i<text.length;++i){
        strW = this.getStringWidth(text[i], font);
        if(curW + strW >= lineWidth){
          formated += line + '\n';
          curW = strW;
          line = text[i];
        }
        else{
          line += text[i];
          curW += strW;
        }
      }
    }
    if(line.length > 0){formated += line;}
    debug_log("Final: " + formated);
    debug_log("-------------------")
    return formated;
  }
  /*-------------------------------------------------------------------------*/
  get translucentAlpha(){return 0.4;}
  /*-------------------------------------------------------------------------*/
  get isMoving(){return this.x != this.realX || this.y != this.realY;}
  /**-------------------------------------------------------------------------
   * > Getter function
   */
  get opacity(){return parseFloat(this.alpha);}
  /*-------------------------------------------------------------------------*/
}

/**---------------------------------------------------------------------------
 * > An object holds collection of sprites, does not an actual sprite 
 * class itself. Supposed to be superclass so won't call initialize itself.
 * 
 * @class
 * @extends Sprite
 * @property {Number} x - X position in app
 * @property {Number} y - Y position in app
 * @property {Number} w - width of canvas, overflowed content will be hidden
 * @property {Number} h - height of canvas, overflowed content will be hidden
 * @property {Number} ox - Display origin x
 * @property {Number} oy - Display origin y
 * @property {Bitset} surplusDirection - bitset that represent which direction
 *                                       has overflowed item.
 *                                       Range: 0000-1111(Up/Right/Left/Down)
 */
class SpriteCanvas extends Sprite{
  /**-------------------------------------------------------------------------
   * @constructor
   * @param {Rect} rect - initialize by an rect object
   *//**
   * @constructor
   * @param {Number} x - X position in app
   * @param {Number} y - Y position in app
   * @param {Number} w - width of canvas, overflowed content will be hidden
   * @param {Number} h - height of canvas, overflowed content will be hidden
   */
  constructor(x, y, w, h){
    if(isClassOf(x, Rect)){
      let rect = x;
      y = rect.x;
      w = rect.width;
      h = rect.height;
      x = rect.x;
    }
    if(validArgCount(x, y, w, h) != 4){
      throw new ArgumentError(4, validArgCount(x,y,w,h));
    }
    super(PIXI.Texture.EMPTY);
    this.setPOS(x, y);
    this.resize(w, h);
    this.surplusDirection = 0;
    this.ox = 0; this.oy = 0;
    this.lastDisplayOrigin = [0,0];
    this.applyMask();
    this.hitArea = new Rect(0, 0, w, h);
  }
  /*-------------------------------------------------------------------------*/
  get width(){return this._width;}
  get height(){return this._height;}
  /**------------------------------------------------------------------------
   * > Check whether the object is inside the visible area
   * @param {Sprite|Bitmap} obj - the DisplayObject to be checked
   * @returns {Number} - which diection it overflowed. 
   *                     8: Up, 6: Right, 4: Left, 2: Down
   */
  isObjectVisible(obj){
    // Children are already positioned using the previous display origin.
    // Add that origin back once when calculating their next position. Adding
    // it twice made scrolling use a stale coordinate and could leave items
    // hidden after the viewport moved.
    let dx = obj.x - this.ox + this.lastDisplayOrigin[0];
    let dy = obj.y - this.oy + this.lastDisplayOrigin[1];
    if(dx > this.width){return 6;}
    if(dy > this.height){return 2;}
    let dw = dx + obj.width, dh = dy + obj.height;
    if(dw < 0){return 4;}
    if(dh < 0){return 8;}
    return 0;
  }
  /*-------------------------------------------------------------------------*/
  refresh(){
    this.surplusDirection = 0;
    let dox = this.ox - this.lastDisplayOrigin[0];
    let doy = this.oy - this.lastDisplayOrigin[1];
    this.sortChildren();
    for(let i=0;i<this.children.length;++i){
      let sp = this.children[i];
      if(sp.static){continue;}
      let overflowDir = this.isObjectVisible(sp);
      // A masked child is already clipped by its mask. Do not toggle its
      // visibility based on the parent's bounds, otherwise scrolling can
      // hide the whole row even while part of it should remain visible.
      if(overflowDir > 0 && !sp.mask){
        sp.hide();
        this.surplusDirection |= (1 << ((overflowDir - 2) / 2))
      }
      else if(!sp.mask){sp.show();}
      let dx = sp.x - dox, dy = sp.y - doy;
      sp.setPOS(dx, dy);
    }
    this.lastDisplayOrigin = [this.ox, this.oy];
  }
  /**------------------------------------------------------------------------
   * > Synchronize child properties to parent's
   */
  syncChildrenProperties(){
    const active = this.isActivate();
    const eventTypes = [
      'pointertap', 'pointerenter', 'pointerleave', 'pointermove',
      'pointerdown', 'pointerup', 'globalpointermove',
    ];
    for(let i=0;i<this.children.length;++i){
      const child = this.children[i];
      // Don't modify eventMode for elements marked as attached (e.g., interactive card sprites)
      if(child.attached || child._forceInteractive){
        continue;
      }
      const hasInteraction = child._isSelection || eventTypes.some(function(type){
        return child.listenerCount?.(type) > 0;
      });
      child.eventMode = active && hasInteraction && !child._disabled
        ? 'static'
        : 'none';
    }
  }
  /*-------------------------------------------------------------------------*/
  resize(w, h){
    if(w === null){w = this._width;}
    if(h === null){h = this._height;}
    this._width  = w;
    this._height = h;
    this.drawMask();
    this.hitArea = new Rect(0, 0, w, h);
    return this;
  }
  /**-------------------------------------------------------------------------
   * > Apply mask to prevent shown overflow objects
   */
  applyMask(){
    this.maskGraphics = new PIXI.Graphics();
    this.drawMask();
    this.maskGraphics.static = true;
    this.addChild(this.maskGraphics);
    this.mask = this.maskGraphics;
  }
  /*------------------------------------------------------------------------*/
  drawMask(){
    if(!this.maskGraphics){return ;}
    this.maskGraphics.clear()
      .rect(0, 0, this.width, this.height)
      .fill(Graphics.color.White);
  }
  /*------------------------------------------------------------------------*/
  clear(){
    const children = this.removeChildren();
    children.forEach(function(child){child.destroy?.({children: true});});
    this.maskGraphics = null;
    this.mask = null;
  }
  /*------------------------------------------------------------------------*/
  sortChildren(){
    return super.sortChildren();
  }
  /**-------------------------------------------------------------------------
   * > Scroll window horz/vert
   */
  scroll(sx = 0, sy = 0){
    this.ox += sx;
    this.oy += sy;
    this.refresh();
  }
  /**-------------------------------------------------------------------------
   * > Set display origin
   * @param {Number} x - new ox, should be real x in pixel
   * @param {Number} y - new oy, should be rael y in pixel
   */
  setDisplayOrigin(x, y){
    this.ox = x;
    this.oy = y;
    this.refresh();
  }
  /*-------------------------------------------------------------------------*/
}
/**---------------------------------------------------------------------------
 * The basic object that represents an image.
 *
 * @class Bitmap
 * @constructor
 * @param {Number} x - The X point of the bitmap
 * @param {Number} y - The Y point of the bitmap
 * @param {Number} width - The width of the bitmap
 * @param {Number} height - The height of the bitmap
 */
class Bitmap{
  /**-------------------------------------------------------------------------
   * @constructor
   * @memberof Bitmap
   */
  constructor(){
    this.initialize.apply(this, arguments);
  }
  /**-------------------------------------------------------------------------
   * > Object initialization
   * @memberof Bitmap
   */
  initialize(x = 0, y = 0, w = 1, h = 1){
    this.createCanvas();
    this.setPOS(x, y);
    this.resize(w, h);
  }
  /*-------------------------------------------------------------------------*/
  createCanvas(){
    this._canvas  = document.createElement("canvas");
    this._context = this._canvas.getContext("2d");
  }
  /*-------------------------------------------------------------------------*/
  setX(x){
    this._x = x;
    this.realX = Graphics.app.x + this._x;
    this._canvas.style.left = this.realX + 'px'
  }
  /*-------------------------------------------------------------------------*/
  setY(y){
    this._y = y;
    this.realY = Graphics.app.y + this._y;
    this._canvas.style.top = this.realY + 'px'
  }
  /*-------------------------------------------------------------------------*/
  setPOS(x, y){
    this.setX(x);
    this.setY(y);
    return this;
  }
  /*-------------------------------------------------------------------------*/
  setZ(z){
    this._canvas.style.zIndex = z;
    return this;
  }
  /*-------------------------------------------------------------------------*/
  resize(w, h){
    if(w === null){w = this._width;}
    if(h === null){h = this._height;}
    this._width = w; this._height = h;
    this._canvas.width  = w;
    this._canvas.height = h;
    return this;
  }
  /*-------------------------------------------------------------------------*/
  hide(){
    this._canvas.style.display = "none";
    return this;
  }
  /*-------------------------------------------------------------------------*/
  show(){
    this._canvas.style.display = '';
    return this;
  }
  /*-------------------------------------------------------------------------*/
  blt(){
    this._context.drawImage.apply(this._context, arguments);
  }
  /**-------------------------------------------------------------------------
   * > Draw Icon in Iconset
   */
  drawIcon(icon_index, x, y){
    icon_index = parseInt(icon_index);
    let src_rect = clone(Graphics.IconRect);
    src_rect.x = icon_index % Graphics.IconRowCount * src_rect.width;
    src_rect.y = parseInt(icon_index / Graphics.IconRowCount) * src_rect.height;
    let sx = src_rect.x, sy = src_rect.y, sw = src_rect.width, sh = src_rect.height;
    const source = Graphics.loader.resources[Graphics.Iconset]?.image;
    if(source){
      this.blt(source, sx, sy, sw, sh, x, y, sw, sh);
    }
  }
  /*-------------------------------------------------------------------------*/
  setOpacity(opa){
    this._canvas.style.opacity = opa
  }
  /*-------------------------------------------------------------------------*/
  dispose(){
    this._canvas  = null;
    this._context = null;
    if(this.input){this.input.destroy();}
    this.input = null;
  }
  /*-------------------------------------------------------------------------*/
  isDisposed(){
    return this._canvas === null;
  }
  /*-------------------------------------------------------------------------*/
  render(){
    Graphics.renderBitmap(this);
  }
  /*-------------------------------------------------------------------------*/
  remove(){
    Graphics.removeBitmap(this);
  }
  /*-------------------------------------------------------------------------*/
  get canvas(){return this._canvas;}
  get context(){return this._context;}
  /*-------------------------------------------------------------------------*/
}
/**---------------------------------------------------------------------------
 * The Rectangle object for abbreviation of PIXI's one
 * @class Rect
 * @extends PIXI.Rectangle
 */
class Rect extends PIXI.Rectangle{
  /**
   * @constructor
   * @param {Object} rect - initialize by the object that contain rect data
   * @param {...Number} [params] - initialize by given x, y, w, h
   * @param {Number} x - The X point of the bitmap
   * @param {Number} y - The Y point of the bitmap
   * @param {Number} width - The width of the bitmap
   * @param {Number} height - The height of the bitmap
   */
  constructor(...args){
    super(0,0,0,0);
    let arglen = validArgCount.apply(window, args);
    if(arglen == 1){
      this.x = args[0].x;
      this.y = args[0].y;
      this.width = args[0].width;
      this.height = args[0].height;
    }
    else if(arglen == 4){
      this.x = args[0];
      this.y = args[1];
      this.width = args[2];
      this.height = args[3];
    }
    else{
      throw new ArgumentError([1,4], arglen)
    }
  }
}

Object.assign(globalThis, { Graphics, Input, Stage, Sound, Sprite, SpriteCanvas, Bitmap, Rect });
