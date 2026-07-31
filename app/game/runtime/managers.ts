// @ts-nocheck
import playerNameData from '../data/name.json'
/**---------------------------------------------------------------------------
 * > SceneManager:
 *    The static class that manages scene transitions.
 * @namespace
 */
class SceneManager{
  /*-------------------------------------------------------------------------*/
  constructor(){
    throw new Error('This is a static class');
  }
  /*-------------------------------------------------------------------------*/
  static async initialize(){
    this._scene             = null;
    this._nextScene         = null;
    this._stack             = [];
    this._stopped           = false;
    this._sceneStarted      = false;
    this._exiting           = false;
    this._previousClass     = null;
    this._backgroundSprite  = null;
    this._focused           = true;
    if(DataManager.focus){
      this.alwaysFocus();
      debug_log("Game always focus")
    }
    await this.initModules();
  }
  /*-------------------------------------------------------------------------*/
  static updateMain(){
    if(FatelError || this._stopped)return ;
    try{
      Input.update();
      Graphics.update();
      if(!SceneManager.isGameFocused()){
        return SceneManager.unfocusGame();
      }
      SceneManager.focusGame();
      SceneManager.changeScene();
      SceneManager.updateScene();
      SceneManager.renderScene();
      EventManager.update();
    }
    catch(e){
      reportError(e);
    }
  }
  /*-------------------------------------------------------------------------*/
  static isGameFocused(){
    if(!GameStarted || this._alwaysFocus)return true;
    if(!document.hasFocus())return false;
    let mouseKeys = [1,2,3];
    for(let i=0;i<mouseKeys.length;++i){
      let key = mouseKeys[i];
      if(Input.isTriggered(key)){
        switch(key){
          case 1:
            return Input.isPointerInside;
          case 2:
          case 3:
            return false;
        }
      }
    }
    return this._focused;
  }
  /*-------------------------------------------------------------------------*/
  static alwaysFocus(){this._alwaysFocus = true;}
  static autoFocus(){this._alwaysFocus = false;}
  /*-------------------------------------------------------------------------*/
  static focusGame(){
    if(SceneManager._focused){return ;}
    debug_log("Focus Game")
    // DisablePageScroll();
    SceneManager._focused = true;
    Graphics.onFocus();
    Sound.resumeAll();
    this._scene.resume();
  }
  /*-------------------------------------------------------------------------*/
  static unfocusGame(){
    if(!SceneManager._focused || isMobile){return ;}
    debug_log("Unfocus Game")
    // EnablePageScroll();
    SceneManager._focused = false;
    Sound.pauseAll();
    Graphics.onUnfocus();
    this._scene.pause();
  }
  /*-------------------------------------------------------------------------*/
  static async run(){
    try{
      await this.initialize();
    }
    catch(e){
      reportError(e);
    }
  }
  /*-------------------------------------------------------------------------*/
  static processFirstScene(){
    try{
      this.goto(this.firstSceneClass);
      this.startNextScene();
    }
    catch(e){
      reportError(e);
    }
  }
  /*-------------------------------------------------------------------------*/
  static get scene(){
    return this._scene;
  }
  /*-------------------------------------------------------------------------*/
  static async initModules(){
    await Graphics.initialize();
    Sound.initialize();
    Input.initialize();
    GameManager.initialize();
    EventManager.initialize();
  }
  /*-------------------------------------------------------------------------*/
  static goto(sceneClass, args){
    if(sceneClass){
      this._nextScene = new (sceneClass.bind.apply(sceneClass, args))();
      this.prepareNextScene(args);
    }
    if(this._scene){
      this._scene.preTerminate();
      this._scene.stop();
    }
  }
  /*-------------------------------------------------------------------------*/
  static push(sceneClass){
    this._stack.push(this._scene.constructor);
    this.goto(sceneClass);
  }
  /*-------------------------------------------------------------------------*/
  static pop(){
    if(this._stack.length > 0){
      this.goto(this._stack.pop());
    }
    else{ this.exit(); }
  }
  /*-------------------------------------------------------------------------*/
  static exit(){
    this.goto(null);
    this._exiting = true;
  }
  /*-------------------------------------------------------------------------*/
  static clearStack(){
    this._stack = [];
  }
  /*-------------------------------------------------------------------------*/
  static stop(){
    this._stopped = true;
    if(Graphics.app && Graphics.app.ticker){
      Graphics.app.ticker.remove(this.updateMain);
      Graphics.app.ticker.stop();
    }
  }
  /*-------------------------------------------------------------------------*/
  static prepareNextScene(){
    this._nextScene.prepare.apply(this._nextScene, arguments);
  }
  /*-------------------------------------------------------------------------*/
  static terminate(){
    window.location.reload();
  }
  /*-------------------------------------------------------------------------*/
  static updateScene(){
    if(this._scene){
      if(!this._sceneStarted && this._scene.isReady()) {
        this._scene.start();
        this._sceneStarted = true;
        this.onSceneStart();
      }
      if(this.isCurrentSceneStarted()) {
        this._scene.update();
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  static renderScene(){
    if(this.isCurrentSceneStarted()) {
      Graphics.render(this._scene);
    }
    else if(this._scene) {
      this.onSceneLoading();
    }
  }
  /*-------------------------------------------------------------------------*/
  static onSceneCreate(){
    Graphics.startLoading();
  }
  /*-------------------------------------------------------------------------*/
  static onSceneLoading(){
    Graphics.updateLoading();
  }
  /*-------------------------------------------------------------------------*/
  static onSceneStart(){
    Graphics.endLoading();
  }
  /*-------------------------------------------------------------------------*/
  static isSceneChanging(){
    return this._exiting || !!this._nextScene;
  }
  /*-------------------------------------------------------------------------*/
  static isCurrentSceneBusy(){
    return this._scene && this._scene.isBusy(); 
  }
  /*-------------------------------------------------------------------------*/
  static isCurrentSceneStarted(){
    return this._scene && this._sceneStarted;
  }
  /*-------------------------------------------------------------------------*/
  static isNextScene(sceneClass){
    return this._nextScene && this._nextScene.constructor === sceneClass;
  }
  /*-------------------------------------------------------------------------*/
  static isPreviousScene(sceneClass){
    return this._previousClass === sceneClass;
  }
  /*-------------------------------------------------------------------------*/
  static changeScene(){
    if(!this.isSceneChanging() || this.isCurrentSceneBusy()){return ;}
    if (this._scene) {
      this._scene.terminate();
      Graphics.transition();
      this._previousClass = this._scene.constructor;
    }
    this.startNextScene();
  }
  /*-------------------------------------------------------------------------*/
  static startNextScene(){
    this._scene = this._nextScene;
    debug_log(SplitLine, "Scene changed: " + getClassName(this._scene))
    if (this._scene) {
      this._scene.create();
      this._nextScene = null;
      this._sceneStarted = false;
      this.onSceneCreate();
    }
    if (this._exiting) {
      this.terminate();
    }
  }
  /*-------------------------------------------------------------------------*/
  /**
   * Last-resort scene switch used when leaving a battle. The normal path
   * waits for the fade and disposes the old scene first; this path prevents a
   * cleanup exception from leaving the application permanently on the battle
   * canvas.
   */
  static forceChangeScene(){
    if(!this._nextScene){return false;}
    this._previousClass = this._scene?.constructor || null;
    this._scene = this._nextScene;
    this._nextScene = null;
    this._sceneStarted = false;
    this._stopped = false;
    try{
      this._scene.create();
      this.onSceneCreate();
      return true;
    }
    catch(e){
      reportError(e);
      return false;
    }
  }
  /*-------------------------------------------------------------------------*/
}
/**---------------------------------------------------------------------------
 * > DataManager:
 *    The static class that manages data and settings.
 * @namespace
 * @property {object} database - The Local Storage
 */
class DataManager{
  /*-------------------------------------------------------------------------*/
  constructor(){
    throw new Error("This is a static class")
  }
  /**-------------------------------------------------------------------------
   * @property {object} setting - the system settings
   */
  static initialize(){
    this.setting  = {}
    this.database = window.localStorage;
    this.ready    = false;
    this.setupSettingKeys();
    this.loadDatabase();
    this.loadLanguageSetting();
    this.loadLanguageFont();
    this.loadVolumeSetting();
    this.loadAudioEnable();
    this.loadFocusSetting();
    this.loadDebugOption();
    this.loadCanvasScale();
    this.ready    = true;
  }
  /*-------------------------------------------------------------------------*/
  static setupSettingKeys(){
    this.DefaultLanguage = "en_us"
    this.SupportedLanguages = ["en_us", "zh_tw", "zh_cn", "fr_fr", "ja_jp", "ko_kr"];
    this.DefaultVolume   = [0.5, 1, 1]
    this.DefaultAudioEnable = [true, true];
    this.DefaultFocus = false;
    this.kLanguage       = "language";
    this.kVolume         = "volume";
    this.kAudioEnable    = "audioEnable";
    this.kDebug          = "debug";
    this.kDebugMode      = "debugMode";
    this.kFocus          = "focus";
    this.kCanvasScale    = "canvasScale";
    this.DefaultCanvasScale = "fit";
  }
  /*-------------------------------------------------------------------------*/
  static loadDatabase(){
    for(let i=0;i<this.database.length;++i){
      let k = this.database.key(i);
      this.setting[k] = null;
      try{
        this.setting[k] = JSON.parse(this.database.getItem(k));
      }
      catch(e){
        // Other browser tools may store plain strings in the same local
        // storage. They are not game settings and should not look like a game
        // error in the console.
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  static loadLanguageSetting(){
    let lan_param = new URL(document.URL).searchParams.get("language");
    let candidates = [lan_param, this.language, this.DefaultLanguage];
    let lan = candidates.find(function(value){
      return this.SupportedLanguages.includes(value);
    }.bind(this));
    if(!lan){lan = this.DefaultLanguage;}
    this.changeSetting(this.kLanguage, lan);
  }
  /*-------------------------------------------------------------------------*/
  static loadVolumeSetting(){
    let check = function(n){return 0 <= n && n <= 1;}
    if(validArgCount.apply(window, this.volume) != 3){
      this.changeSetting(this.kVolume, this.DefaultVolume);
    }
    else if(validNumericCount.apply(this, [check, this.volume].flat()) != 3){
      this.changeSetting(this.kVolume, this.DefaultVolume);
    }
  }
  /*-------------------------------------------------------------------------*/
  static loadLanguageFont(){
    if(Graphics.LanguageFontMap[this.language]){
      Graphics.DefaultFontSetting = Graphics.LanguageFontMap[this.language];
    }
  }
  /*-------------------------------------------------------------------------*/
  static loadAudioEnable(){
    let en = this.audioEnable
    if(!isClassOf(en, Array) || en.length != 2 ||
       en.some(function(value){return typeof value != "boolean";})){
      this.changeSetting(this.kAudioEnable, this.DefaultAudioEnable.slice());
    }
  }
  /*-------------------------------------------------------------------------*/
  static loadFocusSetting(){
    if(typeof this.focus != "boolean"){
      this.changeSetting(this.kFocus, this.DefaultFocus);
    }
  }
  /*-------------------------------------------------------------------------*/
  static loadDebugOption(){
    let dbg = this.debugOption;
    let dbgm = this.debugMode;
    if(!dbg){
      dbg = {
        "log": true,
        "showHand": false
      }
      this.changeSetting(this.kDebug, dbg);
    }
    if(!dbgm){this.changeSetting(this.kDebugMode, false);}
  }
  /*-------------------------------------------------------------------------*/
  static loadCanvasScale(){
    const valid = ["fit", "0.75", "1", "1.25", "1.5", "2"];
    // Mobile browsers need the fixed-resolution canvas to follow the
    // available viewport. Do not reuse a desktop scale saved in storage.
    if(isMobile){
      this.changeSetting(this.kCanvasScale, this.DefaultCanvasScale);
      return;
    }
    if(!valid.includes(this.canvasScale)){
      this.changeSetting(this.kCanvasScale, this.DefaultCanvasScale);
    }
  }
  /*-------------------------------------------------------------------------*/
  static changeSetting(key, value){
    this.setting[key] = value;
    try{
      this.database.setItem(key, JSON.stringify(value));
    }
    catch(e){
      // Keep the in-memory setting usable if private browsing or storage
      // quota restrictions prevent persistence.
      console.warn("Unable to persist setting: " + key, e);
    }
  }
  /*-------------------------------------------------------------------------*/
  static isReady(){
    return Vocab.isReady() && this.ready;
  }
  /*-------------------------------------------------------------------------*/
  static getSetting(key){
    return this.setting[key];
  }
  /*-------------------------------------------------------------------------*/
  static changeDebugOption(key, value){
    let dbg = this.debugOption;
    dbg[key] = value;
    this.changeSetting(this.kDebug, dbg);
  }
  /*-------------------------------------------------------------------------*/
  static toggleDebugMode(){
    const stat = !!(this.debugMode ^ true);
    this.changeSetting(this.kDebugMode, stat);
  }
  /**-------------------------------------------------------------------------
   * > Getter functions
   */
  static get language(){return this.setting[this.kLanguage];}
  static get volume(){return this.setting[this.kVolume];}
  static get audioEnable(){return this.setting[this.kAudioEnable];}
  static get debugOption(){return this.setting[this.kDebug];}
  static get debugMode(){return this.setting[this.kDebugMode];}
  static get focus(){return this.setting[this.kFocus];}
  static get canvasScale(){return this.setting[this.kCanvasScale];}
  /*-------------------------------------------------------------------------*/
}
/**---------------------------------------------------------------------------
 * > GameManager:
 *    The static class that manage the game information
 * @namespace
 * @property {Array.[Number,Number]} initCardPeak - the min/max value of initial
 *                                                  card number in hand
 * @property {Array.[Number,Number]} initHPPeak - the min/max value of initial hitpoint
 * @property {Array.[Number,Number]} scoreGoalPeak - the min/max value of score needed
 *                                                   to end the game
 * @property {Number} initCardNumber - Initial card number in hand
 * @property {Number} initHP - Initial hitpoint
 * @property {Number} scoreGoal - Score needed to end the game
 * @property {Boolean} extraCardDisabled - Whether not using extra black cards
 * 
 * @property {object} game - The PunoGame instance
 */
class GameManager{
  /*-------------------------------------------------------------------------*/
  constructor(){
    throw new Error('This is a static class');
  }
  /*-------------------------------------------------------------------------*/
  static initialize(){
    this._mode = null;
    this.initCardPeak   = [4, 10];
    this.initCardNumber = 7;
    this.initHPPeak     = [50, 1000];
    this.initHP         = 200;
    this.scoreGoalPeak  = [100, 5000];
    this.scoreGoal      = 500;
    this.timedDurationPeak = [30, 600];
    this.timedDuration  = 180;
    this.timedTurnSecondsPeak = [1, 5];
    this.timedTurnSeconds = 3;
    // Special cards are disabled by default; each mode can still enable them
    // independently and the choice is persisted in gameModeSettings.
    this.extraCardDisabled = true;
    this.tradeCardDisabled = false;
    this.drawTwoStacking = true;
    this.drawFourStacking = true;
    this.drawTwoFourStacking = false;
    this.penaltyTransferEnabled = true;
    this.drawUntilPlayable = false;
    // Number of cards drawn when a player fails to call UNO before reaching
    // one card.  Keep the default compatible with the usual +2 penalty.
    this.unoPenaltyCards = 2;
    // 0 means an inexhaustible deck; positive values set the finite deck size.
    this.deckCardNumber = 0;
    this.playerNumber   = 4;
    this.gameMode       = 0;
    this.maxHandNumber  = 15;
    this.importModules();
    this.initGameKeys();
    this.loadGameSettings();
  }
/*-------------------------------------------------------------------------*/
  static importModules(){
    
  }
  /*-------------------------------------------------------------------------*/
  static initGameKeys(){
    this.kInitCardNumber = 'initCardNumber';
    this.kInitHP = 'iniHP';
    this.kExtraCardDisabled = 'extraCardDisabled';
    this.kScoreGoal = 'scoreGoal';
    this.kTimedDuration = 'timedDuration';
    this.kTimedTurnSeconds = 'timedTurnSeconds';
    this.kTradeCardDisabled = 'tradeCardDisabled';
    this.kDrawTwoStacking = 'drawTwoStacking';
    this.kDrawFourStacking = 'drawFourStacking';
    this.kDrawTwoFourStacking = 'drawTwoFourStacking';
    this.kPenaltyTransferEnabled = 'penaltyTransferEnabled';
    this.kDrawUntilPlayable = 'drawUntilPlayable';
    this.kUnoPenaltyCards = 'unoPenaltyCards';
    this.kDeckCardNumber = 'deckCardNumber';
    this.kModeSettings = 'gameModeSettings';
    this.kPlayerName = 'playerName';
    this.kAINames = 'aiNames';
    // Kept only so settings saved by the previous four-name version can be
    // migrated without losing the existing names.
    this.kPlayerNames = 'playerNames';
    this.DefaultPlayerName = {mode: 'auto', name: ''};
    this.DefaultAINames = {mode: 'auto', names: ['', '', '']};
    this.DefaultPlayerNames = {mode: 'auto', names: ['', '', '', '']};
    this.modeSettings = this.createDefaultModeSettings();
  }
  /*-------------------------------------------------------------------------*/
  static createDefaultModeSettings(){
    const create = function(){
      return {
        initCardNumber: this.initCardNumber,
        initHP: this.initHP,
        scoreGoal: this.scoreGoal,
        timedDuration: this.timedDuration,
        timedTurnSeconds: this.timedTurnSeconds,
        extraCardDisabled: this.extraCardDisabled,
        tradeCardDisabled: this.tradeCardDisabled,
        drawTwoStacking: this.drawTwoStacking,
        drawFourStacking: this.drawFourStacking,
        drawTwoFourStacking: this.drawTwoFourStacking,
        penaltyTransferEnabled: this.penaltyTransferEnabled,
        drawUntilPlayable: this.drawUntilPlayable,
        unoPenaltyCards: this.unoPenaltyCards,
        deckCardNumber: this.deckCardNumber,
      };
    }.bind(this);
    return {
      traditional: create(),
      battlepuno: create(),
      deathmatch: create(),
      timed: create(),
    };
  }
  /*-------------------------------------------------------------------------*/
  static modeSettingKey(mode = this.gameMode){
    return ['traditional', 'battlepuno', 'deathmatch', 'timed'][mode] || 'traditional';
  }
  /**-------------------------------------------------------------------------
   * Load game setting from database
   */
  static loadGameSettings(){ 
    const storedModes = DataManager.getSetting(this.kModeSettings);
    if(this.isModeSettingsValid(storedModes)){
      this.modeSettings = this.normalizeModeSettings(storedModes);
      DataManager.changeSetting(this.kModeSettings, this.modeSettings);
    }
    else{
      const legacyInitCardNumber = this.isCardNumberValid(DataManager.getSetting(this.kInitCardNumber))
        ? DataManager.getSetting(this.kInitCardNumber) : this.initCardNumber;
      const legacyHP = this.isHPValid(DataManager.getSetting(this.kInitHP))
        ? DataManager.getSetting(this.kInitHP) : this.initHP;
      const legacyScoreGoal = this.isScoreGoalValid(DataManager.getSetting(this.kScoreGoal))
        ? DataManager.getSetting(this.kScoreGoal) : this.scoreGoal;
      const legacyExtraCards = typeof DataManager.getSetting(this.kExtraCardDisabled) == 'boolean'
        ? DataManager.getSetting(this.kExtraCardDisabled) : this.extraCardDisabled;
      const legacyDeckCardNumber = this.isDeckCardNumberValid(DataManager.getSetting(this.kDeckCardNumber))
        ? DataManager.getSetting(this.kDeckCardNumber) : this.deckCardNumber;
      this.modeSettings = {
        traditional: {
          initCardNumber: legacyInitCardNumber,
          initHP: legacyHP,
          scoreGoal: legacyScoreGoal,
          extraCardDisabled: legacyExtraCards,
          tradeCardDisabled: this.tradeCardDisabled,
          drawTwoStacking: this.drawTwoStacking,
          drawFourStacking: this.drawFourStacking,
          drawTwoFourStacking: this.drawTwoFourStacking,
          penaltyTransferEnabled: this.penaltyTransferEnabled,
          drawUntilPlayable: this.drawUntilPlayable,
          unoPenaltyCards: this.unoPenaltyCards,
          deckCardNumber: legacyDeckCardNumber,
        },
        battlepuno: {
          initCardNumber: legacyInitCardNumber,
          initHP: legacyHP,
          scoreGoal: legacyScoreGoal,
          extraCardDisabled: legacyExtraCards,
          tradeCardDisabled: this.tradeCardDisabled,
          drawTwoStacking: this.drawTwoStacking,
          drawFourStacking: this.drawFourStacking,
          drawTwoFourStacking: this.drawTwoFourStacking,
          penaltyTransferEnabled: this.penaltyTransferEnabled,
          drawUntilPlayable: this.drawUntilPlayable,
          unoPenaltyCards: this.unoPenaltyCards,
          deckCardNumber: legacyDeckCardNumber,
        },
        deathmatch: {
          initCardNumber: legacyInitCardNumber,
          initHP: legacyHP,
          scoreGoal: legacyScoreGoal,
          extraCardDisabled: legacyExtraCards,
          tradeCardDisabled: this.tradeCardDisabled,
          drawTwoStacking: this.drawTwoStacking,
          drawFourStacking: this.drawFourStacking,
          drawTwoFourStacking: this.drawTwoFourStacking,
          penaltyTransferEnabled: this.penaltyTransferEnabled,
          drawUntilPlayable: this.drawUntilPlayable,
          unoPenaltyCards: this.unoPenaltyCards,
          deckCardNumber: legacyDeckCardNumber,
        },
        timed: {
          initCardNumber: legacyInitCardNumber,
          initHP: legacyHP,
          scoreGoal: legacyScoreGoal,
          timedDuration: this.timedDuration,
          timedTurnSeconds: this.timedTurnSeconds,
          extraCardDisabled: legacyExtraCards,
          tradeCardDisabled: this.tradeCardDisabled,
          drawTwoStacking: this.drawTwoStacking,
          drawFourStacking: this.drawFourStacking,
          drawTwoFourStacking: this.drawTwoFourStacking,
          penaltyTransferEnabled: this.penaltyTransferEnabled,
          drawUntilPlayable: this.drawUntilPlayable,
          unoPenaltyCards: this.unoPenaltyCards,
          deckCardNumber: legacyDeckCardNumber,
        },
      };
      DataManager.changeSetting(this.kModeSettings, this.modeSettings);
    }
    this.applyModeSettings(this.gameMode);

    let keys = [this.kPlayerName, this.kAINames];
    const legacy = DataManager.getSetting(this.kPlayerNames);
    const hasLegacyNames = this.isPlayerNamesValid(legacy);
    for(let i=0;i<keys.length;++i){
      let k = keys[i];
      let stored = DataManager.getSetting(k);
      if(stored == null && hasLegacyNames){
        if(k == this.kPlayerName){
          stored = {mode: legacy.mode, name: legacy.names[0] || ''};
        }
        else if(k == this.kAINames){
          stored = {mode: legacy.mode, names: legacy.names.slice(1, this.playerNumber)};
        }
      }
      let ok = this.changeGameSetting(k, stored);
      if(!ok){
        let v = null;
        if(k == this.kInitCardNumber){v = this.initCardNumber;}
        else if(k == this.kInitHP){v = this.initHP;}
        else if(k == this.kScoreGoal){v = this.scoreGoal;}
        else if(k == this.kExtraCardDisabled){v = this.extraCardDisabled;}
        else if(k == this.kPlayerName){v = {
          mode: this.DefaultPlayerName.mode,
          name: this.DefaultPlayerName.name,
        };}
        else if(k == this.kAINames){v = {
          mode: this.DefaultAINames.mode,
          names: this.DefaultAINames.names.slice(),
        };}
        DataManager.changeSetting(k, v);
        if(k == this.kPlayerName){this.playerName = v;}
        if(k == this.kAINames){this.aiNames = v;}
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  static changeGameSetting(k, v){
    let ok = false;
    if(k == this.kInitCardNumber){
      if(this.isCardNumberValid(v)){
        this.initCardNumber = v;
        this.updateCurrentModeSetting('initCardNumber', v);
        ok = true;
      }
    }
    else if(k == this.kInitHP){
      if(this.isHPValid(v)){
        this.initHP = v;
        this.updateCurrentModeSetting('initHP', v);
        ok = true;
      }
    }
    else if(k == this.kScoreGoal){
      if(this.isScoreGoalValid(v)){
        this.scoreGoal = v;
        this.updateCurrentModeSetting('scoreGoal', v);
        ok = true;
      }
    }
    else if(k == this.kTimedDuration){
      if(this.isTimedDurationValid(v)){
        this.timedDuration = v;
        this.updateCurrentModeSetting('timedDuration', v);
        ok = true;
      }
    }
    else if(k == this.kTimedTurnSeconds){
      if(this.isTimedTurnSecondsValid(v)){
        this.timedTurnSeconds = v;
        this.updateCurrentModeSetting('timedTurnSeconds', v);
        ok = true;
      }
    }
    else if(k == this.kExtraCardDisabled){
      ok = true;
      v = !!(v);
      this.extraCardDisabled = v;
      this.updateCurrentModeSetting('extraCardDisabled', v);
    }
    else if(k == this.kTradeCardDisabled){
      ok = true;
      v = !!(v);
      this.tradeCardDisabled = v;
      this.updateCurrentModeSetting('tradeCardDisabled', v);
    }
    else if(k == this.kDrawTwoStacking){
      ok = true;
      v = !!(v);
      this.drawTwoStacking = v;
      this.updateCurrentModeSetting('drawTwoStacking', v);
    }
    else if(k == this.kDrawFourStacking){
      ok = true;
      v = !!(v);
      this.drawFourStacking = v;
      this.updateCurrentModeSetting('drawFourStacking', v);
    }
    else if(k == this.kDrawTwoFourStacking){
      ok = true;
      v = !!(v);
      this.drawTwoFourStacking = v;
      this.updateCurrentModeSetting('drawTwoFourStacking', v);
    }
    else if(k == this.kPenaltyTransferEnabled){
      ok = true;
      v = !!(v);
      this.penaltyTransferEnabled = v;
      this.updateCurrentModeSetting('penaltyTransferEnabled', v);
    }
    else if(k == this.kDrawUntilPlayable){
      ok = true;
      v = !!(v);
      this.drawUntilPlayable = v;
      this.updateCurrentModeSetting('drawUntilPlayable', v);
    }
    else if(k == this.kUnoPenaltyCards){
      if(this.isUnoPenaltyCardsValid(v)){
        this.unoPenaltyCards = v;
        this.updateCurrentModeSetting('unoPenaltyCards', v);
        ok = true;
      }
    }
    else if(k == this.kDeckCardNumber){
      if(this.gameMode === Mode.TIMED){
        this.deckCardNumber = 0;
        this.updateCurrentModeSetting('deckCardNumber', 0);
        ok = true;
      }
      else if(this.isDeckCardNumberValid(v)){
        this.deckCardNumber = v;
        this.updateCurrentModeSetting('deckCardNumber', v);
        ok = true;
      }
    }
    else if(k == this.kPlayerName){
      if(this.isPlayerNameValid(v)){
        v = {mode: v.mode, name: (v.name || '').trim()};
        this.playerName = v;
        ok = true;
      }
    }
    else if(k == this.kAINames){
      if(this.isAINamesValid(v)){
        v = {
          mode: v.mode,
          names: v.names.map(function(name){return name.trim();}),
        };
        this.aiNames = v;
        ok = true;
      }
    }
    else if(k == this.kPlayerNames){
      if(this.isPlayerNamesValid(v)){
        v = {
          mode: v.mode,
          names: v.names.map(function(name){return name.trim();}),
        };
        this.playerNames = v;
        ok = true;
      }
    }

    if(ok){
      DataManager.changeSetting(k, v);
    }

    return ok;
  }
  /*-------------------------------------------------------------------------*/
  static isModeSettingsValid(settings){
    if(!settings || typeof settings != 'object'){return false;}
    return ['traditional', 'battlepuno', 'deathmatch', 'timed'].every(function(mode){
      const value = settings[mode];
      return value && this.isCardNumberValid(value.initCardNumber) &&
        this.isHPValid(value.initHP) && this.isScoreGoalValid(value.scoreGoal) &&
        (value.timedDuration == null || this.isTimedDurationValid(value.timedDuration)) &&
        (value.timedTurnSeconds == null || this.isTimedTurnSecondsValid(value.timedTurnSeconds)) &&
        typeof value.extraCardDisabled == 'boolean' &&
        (value.tradeCardDisabled == null || typeof value.tradeCardDisabled == 'boolean') &&
        (value.drawTwoStacking == null || typeof value.drawTwoStacking == 'boolean') &&
        (value.drawFourStacking == null || typeof value.drawFourStacking == 'boolean') &&
        (value.drawTwoFourStacking == null || typeof value.drawTwoFourStacking == 'boolean') &&
        (value.penaltyTransferEnabled == null || typeof value.penaltyTransferEnabled == 'boolean') &&
        (value.drawUntilPlayable == null || typeof value.drawUntilPlayable == 'boolean') &&
        (value.unoPenaltyCards == null || this.isUnoPenaltyCardsValid(value.unoPenaltyCards)) &&
        (value.deckCardNumber == null || this.isDeckCardNumberValid(value.deckCardNumber));
    }.bind(this));
  }
  /*-------------------------------------------------------------------------*/
  static normalizeModeSettings(settings){
    const result = {};
    ['traditional', 'battlepuno', 'deathmatch', 'timed'].forEach(function(mode){
      result[mode] = {
        initCardNumber: settings[mode].initCardNumber,
        initHP: settings[mode].initHP,
        scoreGoal: settings[mode].scoreGoal,
        timedDuration: this.isTimedDurationValid(settings[mode].timedDuration)
          ? settings[mode].timedDuration : this.timedDuration,
        timedTurnSeconds: this.isTimedTurnSecondsValid(settings[mode].timedTurnSeconds)
          ? settings[mode].timedTurnSeconds : this.timedTurnSeconds,
        extraCardDisabled: settings[mode].extraCardDisabled == null
          ? true : !!settings[mode].extraCardDisabled,
        tradeCardDisabled: settings[mode].tradeCardDisabled == null
          ? false : !!settings[mode].tradeCardDisabled,
        drawTwoStacking: settings[mode].drawTwoStacking == null
          ? true : !!settings[mode].drawTwoStacking,
        drawFourStacking: settings[mode].drawFourStacking == null
          ? true : !!settings[mode].drawFourStacking,
        drawTwoFourStacking: settings[mode].drawTwoFourStacking == null
          ? false : !!settings[mode].drawTwoFourStacking,
        penaltyTransferEnabled: settings[mode].penaltyTransferEnabled == null
          ? true : !!settings[mode].penaltyTransferEnabled,
        drawUntilPlayable: settings[mode].drawUntilPlayable == null
          ? false : !!settings[mode].drawUntilPlayable,
        unoPenaltyCards: this.isUnoPenaltyCardsValid(settings[mode].unoPenaltyCards)
          ? settings[mode].unoPenaltyCards : 2,
        deckCardNumber: mode === 'timed' ? 0
          : (this.isDeckCardNumberValid(settings[mode].deckCardNumber)
            ? settings[mode].deckCardNumber : 0),
      };
    }.bind(this));
    return result;
  }
  /*-------------------------------------------------------------------------*/
  static applyModeSettings(mode){
    const setting = this.modeSettings[this.modeSettingKey(mode)];
    if(!setting){return;}
    this.initCardNumber = setting.initCardNumber;
    this.initHP = setting.initHP;
    this.scoreGoal = setting.scoreGoal;
    this.timedDuration = this.isTimedDurationValid(setting.timedDuration)
      ? setting.timedDuration : this.timedDuration;
    this.timedTurnSeconds = this.isTimedTurnSecondsValid(setting.timedTurnSeconds)
      ? setting.timedTurnSeconds : this.timedTurnSeconds;
    this.extraCardDisabled = setting.extraCardDisabled;
    this.tradeCardDisabled = setting.tradeCardDisabled;
    this.drawTwoStacking = setting.drawTwoStacking;
    this.drawFourStacking = setting.drawFourStacking;
    this.drawTwoFourStacking = setting.drawTwoFourStacking;
    this.penaltyTransferEnabled = setting.penaltyTransferEnabled;
    this.drawUntilPlayable = setting.drawUntilPlayable;
    this.unoPenaltyCards = this.isUnoPenaltyCardsValid(setting.unoPenaltyCards)
      ? setting.unoPenaltyCards : 2;
    this.deckCardNumber = mode === Mode.TIMED ? 0
      : (this.isDeckCardNumberValid(setting.deckCardNumber)
        ? setting.deckCardNumber : 0);
  }
  /*-------------------------------------------------------------------------*/
  static updateCurrentModeSetting(key, value){
    if(!this.modeSettings){return;}
    const mode = this.modeSettingKey();
    this.modeSettings[mode][key] = value;
    DataManager.changeSetting(this.kModeSettings, this.modeSettings);
  }
  /*-------------------------------------------------------------------------*/
  static isCardNumberValid(n){
    let h = function(n){
      return n.between(this.initCardPeak[0], this.initCardPeak[1], false)
    }.bind(this);
    return validNumericCount(h, n) == 1;
  }
  /*-------------------------------------------------------------------------*/
  static isHPValid(n){
    let h = function(n){
      return n.between(this.initHPPeak[0], this.initHPPeak[1], false)
    }.bind(this);
    return validNumericCount(h, n) == 1;
  }
  /*-------------------------------------------------------------------------*/
  static isScoreGoalValid(n){
    let h = function(n){
      return n.between(this.scoreGoalPeak[0], this.scoreGoalPeak[1], false)
    }.bind(this);
    return validNumericCount(h, n) == 1;
  }
  /*-------------------------------------------------------------------------*/
  static isTimedDurationValid(n){
    return Number.isInteger(n) && n >= this.timedDurationPeak[0] &&
      n <= this.timedDurationPeak[1] && n % 30 === 0;
  }
  /*-------------------------------------------------------------------------*/
  static isTimedTurnSecondsValid(n){
    return Number.isInteger(n) && n >= this.timedTurnSecondsPeak[0] &&
      n <= this.timedTurnSecondsPeak[1];
  }
  /*-------------------------------------------------------------------------*/
  static isDeckCardNumberValid(n){
    return Number.isInteger(n) && (n === 0 || n >= 100);
  }
  /*-------------------------------------------------------------------------*/
  static isUnoPenaltyCardsValid(n){
    return Number.isInteger(n) && n >= 1 && n <= 4;
  }
  /*-------------------------------------------------------------------------*/
  static isPlayerNamesValid(setting){
    if(!setting || !['auto', 'custom'].includes(setting.mode)){return false;}
    if(!Array.isArray(setting.names) || setting.names.length != this.playerNumber){return false;}
    if(setting.mode == 'auto'){return true;}
    return setting.names.every(function(name){
      return typeof name == 'string' && name.trim().length > 0 && name.trim().length <= 24;
    });
  }
  /*-------------------------------------------------------------------------*/
  static isPlayerNameValid(setting){
    if(!setting || !['auto', 'custom'].includes(setting.mode)){return false;}
    if(setting.mode == 'auto'){return typeof setting.name == 'string';}
    return typeof setting.name == 'string' &&
      setting.name.trim().length > 0 && setting.name.trim().length <= 24;
  }
  /*-------------------------------------------------------------------------*/
  static isAINamesValid(setting){
    if(!setting || !['auto', 'custom'].includes(setting.mode)){return false;}
    if(!Array.isArray(setting.names) || setting.names.length != this.playerNumber - 1){return false;}
    if(setting.mode == 'auto'){return true;}
    return setting.names.every(function(name){
      return typeof name == 'string' && name.trim().length > 0 && name.trim().length <= 24;
    });
  }
  /*-------------------------------------------------------------------------*/
  static get playerNameSetting(){
    return this.playerName || this.DefaultPlayerName;
  }
  /*-------------------------------------------------------------------------*/
  static get aiNameSetting(){
    return this.aiNames || this.DefaultAINames;
  }
  /*-------------------------------------------------------------------------*/
  static get isAutomaticPlayerName(){
    return this.playerNameSetting.mode == 'auto';
  }
  /*-------------------------------------------------------------------------*/
  static get isAutomaticAINames(){
    return this.aiNameSetting.mode == 'auto';
  }
  /*-------------------------------------------------------------------------*/
  // Backward-compatible aggregate state for older callers.
  static get isAutomaticPlayerNames(){
    return this.isAutomaticPlayerName && this.isAutomaticAINames;
  }
  /*-------------------------------------------------------------------------*/
  /** Return one player name and three unique AI names from the current locale. */
  static getPlayerNames(){
    const language = DataManager.language;
    const fallback = playerNameData[DataManager.DefaultLanguage] || [];
    const source = playerNameData[language] || fallback;
    const pool = shuffleArray(source.slice());
    const used = [];
    const label = (globalThis.Vocab && Vocab.Player) || 'Player';
    const takeAutomatic = function(index){
      const candidate = pool.find(function(name){return used.indexOf(name) < 0;});
      const name = candidate || (label + ' ' + (index + 1));
      used.push(name);
      return name;
    };

    const playerSetting = this.playerNameSetting;
    const playerName = playerSetting.mode == 'custom' && this.isPlayerNameValid(playerSetting)
      ? playerSetting.name.trim()
      : takeAutomatic(0);
    used.push(playerName);

    const aiSetting = this.aiNameSetting;
    const aiNames = [];
    for(let i = 0; i < this.playerNumber - 1; ++i){
      let name;
      if(aiSetting.mode == 'custom' && this.isAINamesValid(aiSetting)){
        name = aiSetting.names[i].trim();
      }
      else{
        name = takeAutomatic(i + 1);
      }
      aiNames.push(name);
    }
    return [playerName].concat(aiNames);
  }
  /*-------------------------------------------------------------------------*/
  static saveCustomPlayerName(name){
    if(!this.isPlayerNameValid({mode: 'custom', name: name})){return false;}
    return this.changeGameSetting(this.kPlayerName, {
      mode: 'custom',
      name: name,
    });
  }
  /*-------------------------------------------------------------------------*/
  static saveCustomAINames(names){
    if(!Array.isArray(names) || names.length != this.playerNumber - 1){return false;}
    return this.changeGameSetting(this.kAINames, {
      mode: 'custom',
      names: names,
    });
  }
  /*-------------------------------------------------------------------------*/
  static useAutomaticPlayerName(){
    return this.changeGameSetting(this.kPlayerName, {
      mode: 'auto',
      name: this.playerNameSetting.name || '',
    });
  }
  /*-------------------------------------------------------------------------*/
  static useAutomaticAINames(){
    return this.changeGameSetting(this.kAINames, {
      mode: 'auto',
      names: this.aiNameSetting.names.slice(),
    });
  }
  /*-------------------------------------------------------------------------*/
  static promptPlayerName(name){
    // Kept as a compatibility helper. Name editing is handled by the
    // in-game Window_NameInput instead of browser prompt dialogs.
    if(typeof name != 'string'){return null;}
    const value = name.trim();
    return this.saveCustomPlayerName(value) ? value : null;
  }
  /*-------------------------------------------------------------------------*/
  static promptAINames(names){
    // Kept as a compatibility helper for callers that already collected the
    // names. It deliberately does not open a browser dialog.
    if(!Array.isArray(names)){return null;}
    const values = names.map(function(name){return String(name).trim();});
    return this.saveCustomAINames(values) ? values : null;
  }
  /*-------------------------------------------------------------------------*/
  /** Compatibility helper for code that still wants to edit all four names. */
  static saveCustomPlayerNames(names){
    if(!Array.isArray(names) || names.length != this.playerNumber){return false;}
    return this.saveCustomPlayerName(names[0]) && this.saveCustomAINames(names.slice(1));
  }
  /*-------------------------------------------------------------------------*/
  static useAutomaticPlayerNames(){
    return this.useAutomaticPlayerName() && this.useAutomaticAINames();
  }
  /*-------------------------------------------------------------------------*/
  /** Compatibility helper for the previous four-name prompt. */
  static promptPlayerNames(){
    const player = this.promptPlayerName();
    if(player === null){return null;}
    const ai = this.promptAINames();
    if(ai === null){return null;}
    return [player].concat(ai);
  }
  /*-------------------------------------------------------------------------*/
  static getCardImageById(cid){
    let color = '', id = '';
    
    return color + id + '.png';
  }
  /*-------------------------------------------------------------------------*/
  static get extraCardEnabled(){return !this.extraCardDisabled;}
  static get tradeCardEnabled(){return !this.tradeCardDisabled;}
  /*-------------------------------------------------------------------------*/
  static changeGameMode(gm){
    this.gameMode = gm;
    this.applyModeSettings(gm);
  }
  /**-------------------------------------------------------------------------
   * Initialize game stage
   */
  static initStage(){
    this.game = new PunoGame(this.initCardNumber, this.initHP, this.scoreGoal, 
      this.extraCardDisabled, this.gameMode, this.getPlayerNames(),
      this.drawTwoStacking, this.drawFourStacking, this.tradeCardDisabled,
      this.penaltyTransferEnabled, this.drawUntilPlayable, this.drawTwoFourStacking,
      this.deckCardNumber, this.unoPenaltyCards,
      this.timedDuration, this.timedTurnSeconds);
    return this.game;
  }
  /**-------------------------------------------------------------------------
   * Get the effect ID after card played
   * @param {Number} ext - extra information
   */
  static interpretCardAbility(card, ext){
    if(ext == -1){return [];}
    switch(card.value){
      case Value.DRAW_TWO:
        return [Effect.DRAW_TWO];
      // ext=0: normal;  ext=1: reactive;
      case Value.SKIP:
        return !ext ? [Effect.SKIP] : [Effect.SKIP_PENALTY];
      // ext=0: normal;  ext=1: reactive;
      case Value.REVERSE:
        return !ext ? [Effect.REVERSE] : [Effect.REVERSE_PENALTY];
      // ext=0: reset;  ext=1: +10;
      case Value.ZERO:
        return !ext ? [Effect.CLEAR_DAMAGE] : [Effect.ADD_DAMAGE];
      case Value.WILD:
        return [Effect.CHOOSE_COLOR];
      case Value.WILD_DRAW_FOUR:
        return [Effect.CHOOSE_COLOR, Effect.DRAW_FOUR];
      case Value.WILD_HIT_ALL:
        return [Effect.CHOOSE_COLOR, Effect.HIT_ALL];
      case Value.WILD_CHAOS:
        return [Effect.WILD_CHAOS]
      case Value.TRADE:
        return [Effect.CHOOSE_COLOR, Effect.TRADE];
      case Value.DISCARD_ALL:
        return [Effect.CHOOSE_COLOR, Effect.DISCARD_ALL];
      default:
        return [Effect.ADD_DAMAGE];
    }
  }
  /**-------------------------------------------------------------------------
   * Fired when a card is played onto table
   * @param {Number} player_id - the player id, 0 is the user, -1 is the beginning card
   * @param {Number} card_instance - the card object
   * @param {Number} ext - The extra information value, as following list:
   * -1:
   *  This card has no any effect (discarded by discard-all)
   * Value.SKIP:
   *  0: Normal use, 1: Reactive use;
   * Value.REVERSE:
   *  0: Normal use, 1: Reactive use;
   * Value.ZERO: (Does not effect in traditional mode)
   *  0: Clear damage, 1: +10 damage;
   * Value.WILD:
   * Value.WILD_DRAW_FOUR:
   * Value.WILD_HIT_ALL:
   * Value.DISCARD_ALL:
   *  ext = <Color Value>;
   * Value.TRADE:
   *  ext = Array.<Color Value, Player id that traded with>;
   * Value.WILD_CHAOS:
   *  ext = Array.<Color Value, Number Value>;
   */
  static onCardPlay(player_id, card_instance, ext = null){
    let effects = this.interpretCardAbility(card_instance, ext);
    this.game?.logCardPlay?.(player_id, card_instance, ext);
    SceneManager.scene.onCardPlay(player_id, card_instance, effects, ext);
  }
  /**-------------------------------------------------------------------------
   * Fired when a player draws card(s)
   * @param {Number} player_id - The player id
   * @param {Array.<Card>} cards - The cards newly drew
   * @param {Boolean} show     - Show the card to everyone or not
   */
  static onCardDraw(player_id, cards, show = false, complete = null){
    if(cards.length < 1){return false;}
    this.game?.logCardDraw?.(player_id, cards);
    SceneManager.scene.onCardDraw(player_id, cards, show, complete);
    return true;
  }
  /*-------------------------------------------------------------------------*/
  static onTimedClockChange(seconds){
    SceneManager.scene?.updateTimedClock?.(seconds);
  }
  /*-------------------------------------------------------------------------*/
  static onTimedTurnChange(seconds){
    SceneManager.scene?.updateTimedTurn?.(seconds);
  }
  /*-------------------------------------------------------------------------*/
  static onTimedTurnTimeout(){
    return SceneManager.scene?.onTimedTurnTimeout?.() === true;
  }
  /**-------------------------------------------------------------------------
   * Fired when a user's turn begins
   */
  static onUserTurnBegin(player_id){
    debug_log(`User ${player_id} turn start`)
    this.game?.logAvailableActions?.(player_id);
    SceneManager.scene.processUserTurn(player_id);
    this._inTurn = true;
  }
  /**-------------------------------------------------------------------------
   * Fired when other player/NPC's turn begins
   * @param {Number} player_id - the player's id
   */
  static onNPCTurnBegin(player_id){
    debug_log(`CPU ${player_id} turn start`)
    this.game?.logAvailableActions?.(player_id);
    SceneManager.scene.processNPCTurn(player_id);
    this._inTurn = true;
  }
  /*-------------------------------------------------------------------------*/
  static onTurnEnd(player_id){
    this._inTurn = false;
    if(player_id == 0){
      SceneManager.scene.processUserTurnEnd();
    }
  }
  /*-------------------------------------------------------------------------*/
  static changeColor(color_id){
    if(color_id == Color.WILD){
      throw new Error("Color Id should not be zero!")
    }
    SceneManager.scene.applyColorChangeEffect(color_id);
  }
  /*-------------------------------------------------------------------------*/
  static isCardPlayable(card){
    return card && this.game.isCardPlayable(card);
  }
  /*-------------------------------------------------------------------------*/
  static isInTurn(){
    return this._inTurn || false;
  }
  /*-------------------------------------------------------------------------*/
  static isSceneBusy(){
    if(isClassOf(SceneManager.scene, Scene_Game)){
      return SceneManager.scene.isBusy();
    }
    return false;
  }
  /*-------------------------------------------------------------------------*/
  static onGameStart(){
    SceneManager.scene.processGameStart();
  }
  /*-------------------------------------------------------------------------*/
  static onRoundStart(){
    SceneManager.scene.processRoundStart();
  }
  /*-------------------------------------------------------------------------*/
  static processGameOver(){
    SceneManager.scene.processGameOver();
  }
  /*-------------------------------------------------------------------------*/
  static processRoundOver(){
    SceneManager.scene.processRoundOver();
  }
  /*-------------------------------------------------------------------------*/
  static getCardDrawNumber(){
    let pnum = this.game.penaltyPool;
    if(pnum < 1){return 1;}
    return pnum;
  }
  /*-------------------------------------------------------------------------*/
  static quickWin(pid){
    if(!DebugMode){return ;}
    let cards = this.game.players[pid].hand;
    while(cards.length > 0){
      this.forcePlayCard(pid, cards[0]);
    }
    if(pid == 0){
      EventManager.setTimeout(()=>{
        SceneManager.scene.processUserTurnEnd();
      }, 60);
    }
  }
  /*-------------------------------------------------------------------------*/
  static forcePlayCard(pid, card){
    debug_log("Force play: " + pid + card);
    let cardIndex = this.game.players[pid].hand.indexOf(card);
    this.game.discardPile.push(card);
    this.game.players[pid].discard(cardIndex);
    GameManager.onCardPlay(pid, card, -1);
  }
  /*-------------------------------------------------------------------------*/
  static onHPChange(pid, types){
    SceneManager.scene.onHPChange(pid, types);
  }
  /*-------------------------------------------------------------------------*/
  static onDamageChange(){
    SceneManager.scene.onDamageChange();
  }
  /*-------------------------------------------------------------------------*/
}
/**-------------------------------------------------------------------------
 * A class that manages scheduled functions/events
 * @namespace
 */
class EventManager{
  /*-------------------------------------------------------------------------*/
  constructor(){
    throw new Error("This is a static class")
  }
  /*-------------------------------------------------------------------------*/
  static initialize(){
    this.container   = [];
    this.event_timer = [];
    this.indexMap    = [];
    this.symbolMap   = {};
  }
  /*-------------------------------------------------------------------------*/
  static update(){
    if(SceneManager.scene?.isGameplayPaused?.()){return;}
    for(let i in this.container){
      i = parseInt(i);
      this.event_timer[i] -= 1;
      if(this.event_timer[i] <= 0){
        this.executeEvent(this.container[i]);
        this.unregisterEventByIndex(i);
      }
    }
  }/*-------------------------------------------------------------------------*/
  /**
   * Works just like window.setTimeout about the timer is in frame and called
   * via the frame updates.
   * @param {Function} func - The function to be fired 
   * @param {Number} timer  - Frames to wait before fire the function
   * @param {String} symbol - Symbol of this event
   */
  static setTimeout(func, timer, symbol=null){
    if(symbol){
      if(!this.symbolMap[symbol]){
        this.symbolMap[symbol] = this.container.length;
        this.indexMap[this.container.length] = symbol;
      }
      else{
        console.error("Duplicated event symbol: " + symbol);
        console.error("And it will be ignored");
      }
    }
    this.container.push(func);
    this.event_timer.push(timer || 0);
  }
  /*-------------------------------------------------------------------------*/
  static executeEvent(eve){
    eve();
  }
  /*-------------------------------------------------------------------------*/
  static unregisterEventByIndex(idx){
    this.container.splice(idx, 1);
    this.event_timer.splice(idx, 1);
    let sym = this.indexMap[idx];
    if(sym){
      this.symbolMap[sym] = null;
      this.indexMap.splice(idx, 1);
    }
  }
  /*-------------------------------------------------------------------------*/
  static unregisterEventBySymbol(sym){
    if(!this.symbolMap[sym]){
      return console.error("Symbol not found: " + sym);
    }
    this.unregisterEventByIndex(this.symbolMap[sym]);
  }
  /*-------------------------------------------------------------------------*/
  /** Cancel all frame events owned by the current scene before leaving it. */
  static clear(){
    this.container.length = 0;
    this.event_timer.length = 0;
    this.indexMap.length = 0;
    this.symbolMap = {};
  }
  /*-------------------------------------------------------------------------*/
}

Object.assign(globalThis, { SceneManager, DataManager, GameManager, EventManager });
