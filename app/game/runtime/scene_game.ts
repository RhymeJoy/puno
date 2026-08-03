// @ts-nocheck
/**-------------------------------------------------------------------------
 * The main scene during gameplay
 * @class Scene_Game
 * @property {String} bgiName - Path to background image
 * @property {String} bgmName - Path to background music
 * @property {String} meName  - Path to music effect (victory theme)
 * @property {Number} cardSpritePoolSize - Object pool size of card sprite
 * @property {boolean} playerPhase - Whether is user/player's turn
 */
class Scene_Game extends Scene_Base{
  /**-------------------------------------------------------------------------
   * @constructors
   */
  constructor(){
    super();
    this.game = GameManager.initStage();
    this.fadeDuration       = 60;
    this.cardSpritePoolSize = 50;
    this.discardPileSize    = 15;
    this.animationCount     = 0;
    this.playerPhase        = false;
    this._leavingBattle     = false;
    this._leaveFallbackTimer = null;
    this._drawInProgress = false;
    this._pendingDrawChoice = null;
    this._abilityChoiceStartedAt = 0;
    this._abilityChoiceDeadline = 0;
    this._abilityChoiceToken = 0;
    this._abilityChoiceTimerToken = 0;
    this._abilityChoiceCard = null;
    this._settingsPausedAt = 0;
    this._unoCalled = false;
    this._showLeaveConfirmation = false;
    this._directionIndicatorFadeIn = false;
    this._directionIndicatorFadePending = false;
    this._directionIndicatorFadeDelay = 0;
    this._directionIndicatorLocked = false;
    // The game model changes currentPlayerIndex before the hand transition
    // and card animations have made that player's controls ready.  Keep the
    // visual turn marker tied to the player whose turn has actually begun.
    this._turnReadyPlayerIndex = -1;
  }
  /*-------------------------------------------------------------------------*/
  create(){
    this.changeAmbient(GameManager.gameMode);
    super.create();
    this.createDeckSprite();
    this.createDiscardPile();
    this.createCardSpritePool();
    this.createHandCanvas();
    this.createDirectionIndicator();
    this.createHintWindow();
    this.createSelectionWindow();
    this.createInfoSprite();
    this.createHuds();
    this.createHitSprite();
    this.createDimBack();
    this.createScoreBoard();
    this.createNextButton();
    this.createUnoButton();
  }
  /*-------------------------------------------------------------------------*/
  /**
   * Return the logical rectangle that is visible inside a wide viewport.
   * The 16:9 game surface can be cropped vertically when its width fills a
   * wider screen.
   */
  getGameVisibleRect(){
    const height = Math.min(Graphics.height, Graphics.backgroundViewportHeight || Graphics.height);
    const top = (Graphics.height - height) / 2;
    return {top, bottom: top + height, height};
  }
  /*-------------------------------------------------------------------------*/
  isWideGameLayout(){
    return this.getGameVisibleRect().height < Graphics.height - 0.5;
  }
  /*-------------------------------------------------------------------------*/
  getGameLayoutSprites(){
    return [
      this.deckSprite,
      this.deckCountSprite,
      this.discardPile,
      ...(this.handCanvas || []),
      this.directionIndicator,
      this.infoSprite,
      ...(this.hudCanvas || []),
      this.timedHud,
      this.hitEffectSprite,
      ...(this.nameCanvas || []),
      ...(this.penaltyCanvas || []),
    ].filter(Boolean);
  }
  /*-------------------------------------------------------------------------*/
  /** Keep the left/right player groups attached to the visible table edges. */
  updateWideGameSideAnchors(scale){
    if(!this.gameLayoutRoot || !scale){return;}
    for(let i = 0; i < (this.handCanvas || []).length; ++i){
      const side = i % 4;
      if(side !== 1 && side !== 3){continue;}
      const hand = this.handCanvas[i];
      if(!hand){continue;}
      hand._gameLayoutBaseX ??= hand.x;
      const targetGlobalX = side === 1
        ? Graphics.spacing
        : Graphics.width - Graphics.spacing - hand.width * scale;
      const targetLocalX = (targetGlobalX - this.gameLayoutRoot.x) / scale;
      const delta = targetLocalX - hand._gameLayoutBaseX;
      hand.x = hand._gameLayoutBaseX + delta;

      [this.nameCanvas?.[i], this.penaltyCanvas?.[i], this.hudCanvas?.[i]]
        .filter(Boolean)
        .forEach(sprite => {
          sprite._gameLayoutBaseX ??= sprite.x;
          sprite.x = sprite._gameLayoutBaseX + delta;
        });
    }
  }
  /*-------------------------------------------------------------------------*/
  restoreGameLayoutBasePositions(){
    this.handCanvas?.forEach(hand => {
      if(hand._gameLayoutBaseX != null){
        hand.x = hand._gameLayoutBaseX;
      }
    });
    [this.nameCanvas, this.penaltyCanvas, this.hudCanvas]
      .filter(Boolean)
      .flat()
      .forEach(sprite => {
        if(sprite._gameLayoutBaseX != null){
          sprite.x = sprite._gameLayoutBaseX;
        }
      });
  }
  /*-------------------------------------------------------------------------*/
  /**
   * Keep gameplay artwork in one proportional layer on wide screens.
   * This avoids assigning different emergency coordinates to cards, badges,
   * status panels, and names when the browser crops the fixed game surface.
   */
  updateGameLayoutViewport(force = false){
    const wide = this.isWideGameLayout();
    const visible = this.getGameVisibleRect();
    const scale = wide ? Math.min(1, visible.height / Graphics.height) : 1;
    const signature = `${wide}:${visible.height}:${scale}`;
    if(!force && signature === this._gameLayoutSignature){return;}
    this._gameLayoutSignature = signature;

    if(!wide){
      if(this.gameLayoutRoot){
        this.restoreGameLayoutBasePositions();
        this.gameLayoutRoot.children.slice().forEach(sprite => this.addChild(sprite));
        this.gameLayoutRoot.removeFromParent();
        this.gameLayoutRoot = null;
        this.sortChildren();
      }
      return;
    }

    if(!this.gameLayoutRoot){
      this.gameLayoutRoot = new PIXI.Container();
      this.gameLayoutRoot.sortableChildren = true;
      this.gameLayoutRoot.zIndex = 1;
      // Keep the responsive wrapper transparent to hit testing while still
      // allowing its hand canvases and cards to receive pointer events.
      this.gameLayoutRoot.eventMode = 'passive';
      this.gameLayoutRoot.interactiveChildren = true;
      this.addChild(this.gameLayoutRoot);
    }
    this.gameLayoutRoot.position.set(
      (Graphics.width - Graphics.width * scale) / 2,
      visible.top
    );
    this.gameLayoutRoot.scale.set(scale, scale);
    this.updateWideGameSideAnchors(scale);
    this.getGameLayoutSprites().forEach(sprite => {
      if(sprite.parent !== this.gameLayoutRoot){
        this.gameLayoutRoot.addChild(sprite);
      }
    });
    this.gameLayoutRoot.sortChildren();
    this.sortChildren();
    if(this.players){
      this.updateDirectionIndicator(true);
      this.positionUnoButton();
    }
  }
  /*-------------------------------------------------------------------------*/
  start(){
    super.start();
    if(typeof window !== 'undefined'){
      window.dispatchEvent(new Event('battle-puno:game-started'));
    }
    this.selectionWindow.render();
    this.nextButton.render();
    this.unoButton.render();
    this.dimBack.render();
    Graphics.renderSprite(this.infoSprite);
    this.updateGameLayoutViewport(true);
    EventManager.setTimeout(this.gameStart.bind(this), 90);
  }
  /*-------------------------------------------------------------------------*/
  /** Refresh localized labels without recreating the active game state. */
  refreshLanguage(){
    super.refreshLanguage();
    if(this.nextButton?.backSprite){
      this.nextButton.backSprite.text = Vocab.Next;
      this.nextButton.backSprite.x = (this.nextButton.width - this.nextButton.backSprite.width) / 2;
    }
    if(this.selectionWindow?.cancelSelection){
      this.selectionWindow.cancelSelection.text = Vocab.Cancel;
    }
    if(this.timedHud){
      this.timedHud.totalLabel.text = Vocab.TimedTime || 'Time';
      this.timedHud.turnLabel.text = Vocab.TimedTurn || 'Turn';
    }
    if(this.game?.gameMode === Mode.TIMED){
      if(this.infoSprite?.unoLabelSprite){
        this.infoSprite.unoLabelSprite.text = Vocab.Score || 'Score';
      }
      for(const canvas of this.penaltyCanvas || []){
        if(canvas?.unoLabelSprite){
          canvas.unoLabelSprite.text = Vocab.Score || 'Score';
        }
      }
    }
    if(this._activeAbilityCard && this.selectionWindow?.visible){
      const effect = this.selectionWindow.setupCard(this._activeAbilityCard);
      this.setupCardAbilityHandler(this._activeAbilityCard, effect);
    }
    if(this.players && this.penaltyCanvas){
      this.updatePenaltyInfo();
    }
    if(this.infoSprite?.visible){
      this.updateLastCardInfo();
    }
    if(this.resultWindow?.drawnObjects?.length){
      this.resultWindow.clear();
      this.resultWindow.drawRank();
    }
  }
  /*-------------------------------------------------------------------------*/
  playStageBGM(){
    if(this._leavingBattle || this._terminating){return ;}
    if(!this.bgmName){
      setTimeout(this.playStageBGM.bind(this), 500);
    }
    else{Sound.fadeInBGM(this.bgmName, 500);}
  }
  /*-------------------------------------------------------------------------*/
  gameStart(){
    if(this._leavingBattle || this._terminating){return ;}
    this.playStageBGM();
    this.game.gameStart();
    this.players = this.game.players;
    for(let i in this.players){
      this.players[i].lastHand = this.players[i].hand.slice();
    }
    // Hand anchors are created before player names. Restore their authored
    // positions while deriving the names, then reapply the responsive edge
    // layout after every player sprite exists.
    this.restoreGameLayoutBasePositions();
    this.createNameSprites();
    this.createPenaltySprites();
    this.createDummyWindow();
    this.updateGameLayoutViewport(true);
  }
  /*-------------------------------------------------------------------------*/
  randomBackground(draw=false){
    this.bgiName = Graphics["Background" + randInt(0, 3)];
    if(draw){
      if(this.backgroundImage){
        this.backgroundImage.texture = Graphics.loadTexture(this.bgiName);
        this.fitBackgroundToWidth();
      }
      else{this.createBackground();}
    }
  }
  /*-------------------------------------------------------------------------*/
  changeAmbient(amb_id){
    this.randomBackground();
    this.changeAmbientMusic(amb_id);
  }
  /*-------------------------------------------------------------------------*/
  changeAmbientMusic(amb_id){
    if(this._leavingBattle || this._terminating){return ;}
    if(!Sound.isStageReady()){
      Sound.loadStageAudio();
      setTimeout(this.changeAmbientMusic.bind(this, amb_id), 500);
    }
    else{
      this.bgmName = Sound.getStageTheme(amb_id);
    }
  }
  /*-------------------------------------------------------------------------*/
  createBackground(){
    this.backgroundImage = Graphics.addSprite(this.bgiName);
    this.fitBackgroundToWidth();
    Graphics.renderSprite(this.backgroundImage);
  }
  /*-------------------------------------------------------------------------*/
  fitBackgroundToWidth(){
    if(!this.backgroundImage){return;}
    // Keep artwork proportional while adapting the visible crop for wide
    // mobile screens.
    Graphics.fitBackgroundSprite(this.backgroundImage);
  }
  /*-------------------------------------------------------------------------*/
  createDeckSprite(){
    let st = Graphics.addSprite(Graphics.CardBack).show();
    let sb = Graphics.addSprite(Graphics.CardEmpty).hide();
    this.deckSprite = new SpriteCanvas(0, 0, st.width, st.height).setZ(0x10);
    this.deckSprite.addChild(st); this.deckSprite.top = st;
    this.deckSprite.addChild(sb); this.deckSprite.bot = sb;
    let sx = Graphics.appCenterWidth(st.width) - 100;
    let sy = Graphics.appCenterHeight(st.height / 2) - 40;
    this.deckSprite.setPOS(sx, sy).activate().scale.set(0.525, 0.525);
    this.createDeckCountSprite(st);
    this.deckSprite.on('pointerenter', ()=>{
      this.showHintWindow(null,null,Vocab["HelpDeck"] + this.getDeckLeftNumber)
    });
    this.deckSprite.on('pointermove', ()=>{this.updateHintWindow()});
    this.deckSprite.on('pointerleave', ()=>{this.hideHintWindow()});
    this.deckSprite.on('pointertap', ()=>{this.onDeckTrigger()})
    Graphics.renderSprite(this.deckSprite);
  }
  /*-------------------------------------------------------------------------*/
  createDeckCountSprite(deckSprite){
    const width = 120;
    const height = 34;
    const font = clone(Graphics.DefaultFontSetting);
    font.fontSize = 22;
    font.fill = Graphics.color.White;
    font.stroke = {color: Graphics.color.Black, width: 4};

    const countSprite = new SpriteCanvas(0, 0, width, height).setZ(0x11).hide();
    const countText = countSprite.drawText(0, 0, '', font, false);
    countText.anchor.set(0.5, 0.5);
    countText.setPOS(width / 2, height / 2);
    countSprite.countText = countText;
    this.deckCountSprite = countSprite;

    const scale = this.deckSprite.scale.x || 1;
    const deckWidth = deckSprite.width * scale;
    const deckHeight = deckSprite.height * scale;
    countSprite.setPOS(
      this.deckSprite.x + (deckWidth - width) / 2,
      this.deckSprite.y + deckHeight + 8
    );
    Graphics.renderSprite(countSprite);
  }
  /*-------------------------------------------------------------------------*/
  createDiscardPile(){
    let sw = 200, sh = 200;
    let sx = Graphics.appCenterWidth(sw) + Graphics.padding;
    let sy = Graphics.appCenterHeight(sh) - 40;
    this.discardPile = new SpriteCanvas(sx, sy, sw, sh);
    this.discardPile.activate().setZ(0x10);
    if(DebugMode){this.discardPile.fillRect(0, 0, sw, sh).setZ(0).setOpacity(0.5);}
    this.discardPile.on("mouseover", ()=>{
      this.showHintWindow(null,null, this.getLastCardInfo())
    });
    this.discardPile.on('pointermove', ()=>{this.updateHintWindow()});
    this.discardPile.on("mouseout",()=>{this.hideHintWindow()});
    if(this.game.gameMode != Mode.TRADITIONAL && this.game.gameMode != Mode.TIMED){
      this.createDamageText();
    }
    Graphics.renderSprite(this.discardPile);
  }
  /*-------------------------------------------------------------------------*/
  /**
   * Draw a compact direction guide around the center pile. The arrowheads
   * follow the current table direction and the marker shows whose turn it is.
   */
  createDirectionIndicator(){
    // Use one non-interactive overlay so each player's badge can sit above
    // the corresponding hand without affecting card hit testing.
    this.directionIndicator = new SpriteCanvas(
      0, 0, Graphics.width, Graphics.height
    );
    this.directionIndicator
      .setPOS(0, 0)
      // Keep the direction guide above the center pile and dealt cards. It
      // still stays below selection windows and other gameplay overlays.
      .setZ(0x1f);
    this.directionIndicator.eventMode = 'none';
    this.directionIndicator.render();
    this.directionIndicator.setOpacity(0).hide();
    this.updateDirectionIndicator(true);
  }
  /*-------------------------------------------------------------------------*/
  drawDirectionArrow(graphics, x, y, angle, size, color, opacity = 1){
    // Use a clean chevron instead of a filled triangle so the marker stays
    // readable without visually competing with the center cards.
    const half = size / 2;
    const back = size * 0.36;
    const spread = size * 0.42;
    const tip = {x: x + Math.cos(angle) * half, y: y + Math.sin(angle) * half};
    const left = {
      x: x - Math.cos(angle) * back + Math.cos(angle + Math.PI / 2) * spread,
      y: y - Math.sin(angle) * back + Math.sin(angle + Math.PI / 2) * spread
    };
    const right = {
      x: x - Math.cos(angle) * back + Math.cos(angle - Math.PI / 2) * spread,
      y: y - Math.sin(angle) * back + Math.sin(angle - Math.PI / 2) * spread
    };
    const draw = (width, strokeColor, alpha) => graphics
      .moveTo(left.x, left.y)
      .lineTo(tip.x, tip.y)
      .lineTo(right.x, right.y)
      .stroke({width, color: strokeColor, alpha});
    draw(7, 0x111111, 0.9 * opacity);
    draw(3, color, opacity);
  }
  /*-------------------------------------------------------------------------*/
  updateDirectionIndicator(force = false){
    if(!this.directionIndicator || !this.game){return;}
    const clockwise = this.game.clockwise !== false;
    const rawPlayerIndex = Number(this.game.currentPlayerIndex ?? -1);
    const turnReady = rawPlayerIndex === this._turnReadyPlayerIndex;
    const playerIndex = turnReady ? rawPlayerIndex : -1;
    const handSignature = this.players?.map(player => player.hand?.length || 0).join(',') || '';
    const state = `${clockwise ? 1 : 0}:${rawPlayerIndex}:${playerIndex}:${handSignature}`;
    if(!force && this._directionIndicatorState === state){return;}
    this._directionIndicatorState = state;

    const color = clockwise ? 0xffd447 : 0x6fc8ff;
    const graphics = this.directionIndicator.directionGraphics || new PIXI.Graphics();
    graphics.clear();
    const badgePositions = [];
    if(!this.directionIndicator.directionGraphics){
      this.directionIndicator.directionGraphics = graphics;
      this.directionIndicator.addChild(graphics);
    }

    // Player positions are bottom, left, top, right (player id 0..3).
    const sideAngles = [Math.PI / 2, Math.PI, -Math.PI / 2, 0];
    for(let i = 0; i < this.handCanvas.length; ++i){
      const hand = this.handCanvas[i];
      if(!hand){continue;}
      const positionAngle = sideAngles[i % 4];
      const tangent = clockwise ? positionAngle + Math.PI / 2 : positionAngle - Math.PI / 2;
      const handBounds = hand.getBounds?.();
      let badgeX = handBounds
        ? (handBounds.left + handBounds.right) / 2
        : hand.x + hand.width / 2;
      let badgeY = handBounds
        ? (handBounds.top + handBounds.bottom) / 2
        : hand.y + hand.height / 2;
      const badgeOpacity = i === playerIndex ? 1 : 0.5;
      const badgeOffset = -50;
      // Position all badges against the dealt card piles once. Card draw/play
      // animations should not make the badges chase changing piles.
      const lockedPosition = this._directionIndicatorLocked
        ? this.directionIndicator.badgePositions?.[i]
        : null;
      const cardBounds = !lockedPosition
        ? this.getDirectionCardBounds(i)
        : null;
      // Put each badge on the edge of the hand that faces the table center:
      // bottom -> above, right -> left, top -> below, left -> right.
      if(lockedPosition){
        badgeX = lockedPosition.x;
        badgeY = lockedPosition.y;
      }
      else if(cardBounds){
        switch(i % 4){
          case 0:
            badgeX = (cardBounds.left + cardBounds.right) / 2;
            badgeY = cardBounds.top - 36;
            break;
          case 1:
            badgeX = cardBounds.right + 36;
            badgeY = (cardBounds.top + cardBounds.bottom) / 2;
            break;
          case 2:
            badgeX = (cardBounds.left + cardBounds.right) / 2;
            badgeY = cardBounds.bottom + 36;
            break;
          case 3:
            badgeX = cardBounds.left - 36;
            badgeY = (cardBounds.top + cardBounds.bottom) / 2;
            break;
        }
      }
      else switch(i % 4){
        case 0:
          // Keep the bottom player's badge above the hand mask. Placing it
          // inside the hand makes the turn marker sit on top of the cards.
          badgeY = (handBounds?.top ?? hand.y) - 32;
          break;
        case 1:
          // Left player's badge: move slightly to the right.
          badgeX = (handBounds?.right ?? (hand.x + hand.width)) - 43;
          break;
        case 2:
          badgeY = (handBounds?.bottom ?? (hand.y + hand.height)) + badgeOffset;
          break;
        case 3:
          badgeX = (handBounds?.left ?? hand.x) - badgeOffset;
          break;
      }
      const hoverOffset = this.directionIndicator.hoverBadgeOffset;
      if(hoverOffset?.index === i){
        badgeX += hoverOffset.x;
        badgeY += hoverOffset.y;
      }
      badgePositions.push({x: badgeX, y: badgeY, radius: 20});
      const drawPoint = this.gameLayoutRoot
        ? this.gameLayoutRoot.toLocal(new PIXI.Point(badgeX, badgeY))
        : {x: badgeX, y: badgeY};
      graphics.circle(drawPoint.x, drawPoint.y, 16)
        .fill({color: 0x111111, alpha: 0.78 * badgeOpacity})
        .stroke({width: 2, color, alpha: 0.8 * badgeOpacity});
      this.drawDirectionArrow(
        graphics,
        drawPoint.x,
        drawPoint.y,
        tangent,
        20,
        color,
        badgeOpacity
      );
      if(i === playerIndex){
        graphics.circle(drawPoint.x, drawPoint.y, 20)
          .stroke({width: 4, color: 0xffffff, alpha: 0.95});
        graphics.circle(drawPoint.x, drawPoint.y, 18)
          .stroke({width: 2, color, alpha: 1});
      }
    }
    this.directionIndicator.badgePositions = badgePositions;
  }
  /*-------------------------------------------------------------------------*/
  getDirectionCardBounds(index){
    const cards = this.players?.[index]?.hand || [];
    const sprites = cards.map(card => card.sprite).filter(sprite => sprite?.getBounds);
    if(sprites.length === 0){return null;}
    const bounds = sprites.map(sprite => sprite.getBounds());
    return {
      left: Math.min(...bounds.map(rect => rect.left)),
      right: Math.max(...bounds.map(rect => rect.right)),
      top: Math.min(...bounds.map(rect => rect.top)),
      bottom: Math.max(...bounds.map(rect => rect.bottom)),
    };
  }
  /*-------------------------------------------------------------------------*/
  createDamageText(){
    let font = clone(Graphics.DefaultFontSetting);
    font.fill = Graphics.color.Crimson;
    let dx = Graphics.spacing / 2;
    let dy = this.discardPile.height - Graphics.lineHeight;
    let txt = this.discardPile.drawText(dx, dy, '0', font);
    this.discardPile.damageText = txt;
  }
  /*-------------------------------------------------------------------------*/
  resetDirectionIndicator(){
    this._directionIndicatorFadeIn = false;
    this._directionIndicatorFadePending = false;
    this._directionIndicatorFadeDelay = 0;
    this._directionIndicatorLocked = false;
    this._turnReadyPlayerIndex = -1;
    this._directionIndicatorState = null;
    this.directionIndicator?.setOpacity(0).hide();
    this.penaltyCanvas?.forEach(sprite => sprite.setOpacity(0).hide());
    this.infoSprite?.setOpacity(0).hide();
  }
  /*-------------------------------------------------------------------------*/
  fadeInDirectionIndicator(){
    if(!this._directionIndicatorFadeIn || !this.directionIndicator){return;}
    const opacity = Math.min(1, this.directionIndicator.alpha + 0.06);
    this.directionIndicator.setOpacity(opacity);
    this.penaltyCanvas?.forEach((sprite, index) => {
      if(index > 0){sprite.setOpacity(opacity);}
    });
    this.infoSprite?.setOpacity(opacity);
    if(opacity >= 1){this._directionIndicatorFadeIn = false;}
  }
  /*-------------------------------------------------------------------------*/
  showDirectionIndicatorAfterDeal(){
    if(this.game?.initialDealPending > 0){return;}
    if(this._directionIndicatorFadeDelay > 0){
      this._directionIndicatorFadeDelay -= 1;
      if(this._directionIndicatorFadeDelay === 0){
        this._directionIndicatorFadePending = false;
        // Lock the final dealt-hand positions before the indicator appears.
        // Subsequent draw/play operations leave these visual anchors alone.
        this.updateDirectionIndicator(true);
        this._directionIndicatorLocked = true;
        this.directionIndicator.setOpacity(0).show();
        this.penaltyCanvas?.forEach((sprite, index) => {
          if(index > 0){sprite.setOpacity(0).show();}
        });
        this.infoSprite?.setOpacity(0).show();
        this.positionUnoButton();
        this._directionIndicatorFadeIn = true;
      }
      return;
    }
    if(this._directionIndicatorFadeIn || this._directionIndicatorFadePending ||
       this.directionIndicator?.visible || !this.players){return;}
    const requiredCards = Number(this.game?.initCardNumber || GameManager.initCardNumber || 0);
    const handsReady = this.players.length === this.handCanvas.length &&
      this.players.every(player => player.hand.length >= requiredCards &&
        player.hand.every(card => !!card.sprite));
    if(!handsReady || this.spritePool.some(sprite => sprite.isMoving)){return;}
    this._directionIndicatorFadePending = true;
    this._directionIndicatorFadeDelay = Math.round(Graphics.FPS || 60);
  }
  /*-------------------------------------------------------------------------*/
  getIdleCardSprite(){
    for(let i in this.spritePool){
      if(this.spritePool[i].playerIndex == -2){
        return this.spritePool[i];
      }
    }
    this.cardSpritePoolSize += 1;
    let sp = this.createCardSprite();
    this.spritePool.push(sp);
    return sp;
  }
  /*-------------------------------------------------------------------------*/
  createCardSpritePool(){
    this.spritePool = [];
    this.cardValueCount = [];
    for(let i=0;i<this.cardSpritePoolSize;++i){
      this.spritePool.push(this.createCardSprite());
    }
  }
  /*-------------------------------------------------------------------------*/
  createCardSprite(){
    let i  = this.spritePool.length;
    let sp = Graphics.addSprite(Graphics.CardBack, "card" + i).hide();
    let sx = this.deckSprite.x + this.deckSprite.width / 2;
    let sy = this.deckSprite.y + this.deckSprite.height / 2;
    sp.setZ(0x11).scale.set(0.5, 0.5);
    sp.anchor.set(0.5, 0.5);
    sp.index    = i;      // index in the pool
    sp.handIndex = -1;    // index in player's hand
    sp.playerIndex = -2;  // this card belongs to which player
    sp.setPOS(sx, sy);
    // The hit area is synchronized again when a card texture is assigned.
    // Keep a full-size fallback so cards are still easy to select before the
    // first face texture has been loaded.
    sp.hitArea = new PIXI.Rectangle(-36, -50, 72, 100);
    sp.eventMode = 'none';  // Start disabled, will be enabled by attachCardInfo
    return sp;
  }
  /*-------------------------------------------------------------------------*/
  /**
   * Keep card faces at the logical 105x150 display size regardless of the
   * source image resolution. Card backs intentionally keep their compact
   * 0.5 scale because they are also used for the deck and draw animations.
   */
  getCardBaseScale(texture, isBack = false){
    if(isBack){return 0.5;}
    const width = texture?.orig?.width || texture?.width || Graphics.CardRectOri.width;
    const height = texture?.orig?.height || texture?.height || Graphics.CardRectOri.height;
    return Math.min(Graphics.CardRectReg.width / width, Graphics.CardRectReg.height / height);
  }
  /*-------------------------------------------------------------------------*/
  setCardTexture(sprite, image){
    const texture = Graphics.loadTexture(image);
    sprite.texture = texture;
    sprite._cardBaseScale = this.getCardBaseScale(texture, image === Graphics.CardBack);
    const centerScale = sprite.playerIndex === -1 ? 1.15 : 1;
    sprite._cardScaleMultiplier = centerScale;
    sprite.scale.set(
      sprite._cardBaseScale * centerScale,
      sprite._cardBaseScale * centerScale
    );
    // Hit areas use the sprite's local coordinates. Convert the intended
    // on-screen card size back through the current base scale so high-
    // resolution card art and its clickable area stay aligned.
    const textureWidth = texture?.orig?.width || texture?.width || 72;
    const textureHeight = texture?.orig?.height || texture?.height || 100;
    const displayWidth = image === Graphics.CardBack
      ? textureWidth * sprite._cardBaseScale
      : Graphics.CardRectReg.width;
    const displayHeight = image === Graphics.CardBack
      ? textureHeight * sprite._cardBaseScale
      : Graphics.CardRectReg.height;
    sprite.hitArea = new PIXI.Rectangle(
      -displayWidth / (2 * sprite._cardBaseScale),
      -displayHeight / (2 * sprite._cardBaseScale),
      displayWidth / sprite._cardBaseScale,
      displayHeight / sprite._cardBaseScale
    );
    return sprite;
  }
  /*-------------------------------------------------------------------------*/
  setCardScale(sprite, multiplier = 1){
    sprite._cardScaleMultiplier = multiplier;
    const baseScale = sprite._cardBaseScale || this.getCardBaseScale(sprite.texture);
    sprite.scale.set(baseScale * multiplier, baseScale * multiplier);
    return sprite;
  }
  /*-------------------------------------------------------------------------*/
  getHandCardScale(index){
    return index === 0 ? 1.25 : 0.75;
  }
  /*-------------------------------------------------------------------------*/
  createHandCanvas(){
    this.handCanvas = [];
    let maxNumbers  = [3, 2, 2, 3];
    let counter     = [0, 0, 0, 0];
    let sh = 225, sw = 350, sx, sy;

    for(let i=0;i<GameManager.playerNumber;++i){
      counter[i % 4] += 1;
      let ssw = (i == 0) ? parseInt(Graphics.width * 0.6) : sw;
      this.handCanvas.push(new SpriteCanvas(0, 0, ssw, sh));
      this.handCanvas[i].playerIndex = i;
      // Card hit testing follows the same sorted child order as rendering.
      this.handCanvas[i].sortableChildren = true;
      this.handCanvas[i].activate().render();
    }

    for(let i=0;i<4;++i){
      let portion = Math.min(counter[i], maxNumbers[i]);
      let partWidth  = Graphics.width  / portion;
      let partHeight = Graphics.height / portion;
      for(let j=0;j<counter[i];++j){
        let index = i + (4 * j);
        let hcs   = this.handCanvas[index];
        // up/down
        if(!(i&1)){
          // Divide canvas space
          sx = partWidth * j;
          if(partWidth > hcs.width){sx = (partWidth - hcs.width) / 2;}
          // Align bottom if i == 0 (down)
          sy = (i == 0) ? Graphics.height - hcs.height : Graphics.spacing;
        }
        // left/right
        else{
          hcs.resize(sh, sw);
          sy = partHeight * j;
          if(partHeight > hcs.height){sy = (partHeight - hcs.height) / 2;}
          // Align left if i == 1 (left)
          sx = (i == 1)
            ? Graphics.spacing
            : Graphics.width - hcs.width - 12;
          sy -= 50;
        }
        hcs.setPOS(sx, sy).setZ(0x10);
        if(DebugMode){hcs.fillRect(0, 0, hcs.width, hcs.height).setOpacity(0.5);}
      }
    }
    this.createArrangeIcon(0);
  }
  /*-------------------------------------------------------------------------*/
  getCollisionRect(sp){
    let rect = new Rect(sp.hitArea);
    [rect.x, rect.y] = [sp.x, sp.y]
    return rect;
  }
  /*-------------------------------------------------------------------------*/
  createArrangeIcon(idx){
    let hcs = this.handCanvas[idx];
    let sx = 0, sy = hcs.height - Graphics.IconRect.height;
    hcs.arrangeIcon = hcs.drawIcon(117, sx, sy).setZ(0x30).activate();
    hcs.arrangeIcon.on('pointertap', ()=>{
      this.players?.[idx]?.sortHand?.();
      this.arrangeHandCards(idx);
    });
    hcs.arrangeIcon.on('pointerenter', ()=>{
      this.showHintWindow(null, null,Vocab.HelpArrange)
    });
    hcs.arrangeIcon.on('pointerleave', ()=>{this.hideHintWindow()});
  }
  /*-------------------------------------------------------------------------*/
  createNameSprites(){
    this.nameCanvas = []
    for(let i in this.handCanvas){
      i = parseInt(i);
      let side = i % 4;
      // Names are plain sprites rather than masked canvases.  Their bounds
      // follow the rendered text so long generated names stay fully visible.
      let sp = new Sprite();
      let font = clone(Graphics.DefaultFontSetting);
      font.fill = 0xffffff;
      font.stroke = {color: 0x000000, width: 3, join: 'round'};
      let txt = new PIXI.Text({text: this.players[i].name, style: font});
      txt.alpha = sp.opacity;
      txt.setPOS(0, 0).setZ(2);
      sp.addChild(txt);
      sp.textSprite = txt;
      this.fitNameSprite(sp);
      let sx = 0, sy = 0;
      if(side == 0){
        sx = this.handCanvas[i].x - txt.width;
        sy = this.handCanvas[i].y + this.handCanvas[i].height - txt.height - Graphics.spacing;
      }
      else if(side == 1){
        sx = this.handCanvas[i].x;
        sy = this.handCanvas[i].y - txt.height;
      }
      else if(side == 2){
        sx = this.handCanvas[i].x + this.handCanvas[i].width;
        sy = this.handCanvas[i].y;
      }
      else if(side == 3){
        sx = this.handCanvas[i].x + this.handCanvas[i].width - txt.width;
        sy = this.handCanvas[i].y + this.handCanvas[i].height;
      }
      this.nameCanvas.push(sp.setPOS(sx, sy).setZ(0x10));
      sp.render();
    }
  }
  /*-------------------------------------------------------------------------*/
  fitNameSprite(sp){
    const txt = sp?.textSprite;
    if(!txt){return ;}
    // Keep the original text scale.  The parent has no mask and naturally
    // reports the complete text width through its child bounds.
    txt.scale.set(1, 1);
    txt.x = 0;
    txt.y = 0;
  }
  /*-------------------------------------------------------------------------*/
  createPenaltySprites(){
    this.penaltyCanvas = []
    for(let i in this.handCanvas){
      i = parseInt(i);
      if(i === 0){continue;}
      let side = i % 4;
      const width = 148;
      const height = 60;
      let sp = new SpriteCanvas(0, 0, width, height).setZ(0x22);
      sp.sortableChildren = true;
      const panel = new PIXI.Graphics()
        .roundRect(0, 0, width, height, 9)
        .fill({color: 0x071827, alpha: 0.7})
        .stroke({width: 1.5, color: 0xf2c75c, alpha: 0.72});
      panel.zIndex = 0;
      sp.addChild(panel);
      const divider = new PIXI.Graphics()
        .moveTo(9, 30)
        .lineTo(width - 9, 30)
        .stroke({width: 1, color: 0x79c9c8, alpha: 0.32});
      divider.zIndex = 1;
      sp.addChild(divider);

      let labelFont = clone(Graphics.DefaultFontSetting);
      labelFont.fontSize = 18;
      labelFont.fill = 0x9bc7c8;
      let valueFont = clone(Graphics.DefaultFontSetting);
      valueFont.fontSize = 25;
      valueFont.fill = 0xf7d36a;
      const penaltyLabel = sp.drawText(10, 2, Vocab.UnoPenalty || 'Penalty', labelFont, false);
      const penaltyValue = sp.drawText(104, -2, '—', valueFont, false);
      const statusLabel = this.game.gameMode === Mode.TIMED
        ? (Vocab.Score || 'Score')
        : (Vocab.Uno || 'UNO');
      const statusValue = this.game.gameMode === Mode.TIMED
        ? String(this.players?.[i]?.score || 0)
        : '—';
      const unoLabel = sp.drawText(10, 35, statusLabel, labelFont, false);
      const unoValue = sp.drawText(104, 31, statusValue, valueFont, false);
      sp.penaltyLabelSprite = penaltyLabel;
      sp.penaltyValueSprite = penaltyValue;
      sp.unoLabelSprite = unoLabel;
      sp.unoValueSprite = unoValue;
      let sx = 0, sy = 0;
      if(side == 0){
        sx = this.handCanvas[i].x + this.handCanvas[i].width;
        sy = this.nameCanvas[i].y
      }
      else if(side == 1){
        sx = this.nameCanvas[i].x;
        sy = this.handCanvas[i].y + this.handCanvas[i].height;
      }
      else if(side == 2){
        // Anchor the top card to the hand itself; player-name width must not
        // make its position change between rounds or languages.
        sx = this.handCanvas[i].x - width - 8;
        sy = this.nameCanvas[i].y;
      }
      else if(side == 3){
        // Align with the visible right-side card stack, not the full hand canvas.
        const visibleStackWidth = Graphics.CardRectReg.height;
        sx = this.handCanvas[i].x + this.handCanvas[i].width - visibleStackWidth;
        sy = this.handCanvas[i].y - height - 4;
      }
      // Keep the AI status cards closer to the table-facing side.
      if(side == 1){sx += 10;}
      sp.baseX = sx; sp.baseY = sy;
      this.penaltyCanvas[i] = sp.setPOS(sx, sy);
      sp.render();
      sp.setOpacity(0).hide();
    }
  }
  /*-------------------------------------------------------------------------*/
  createDummyWindow(){
    this.dummy = new Window_Selectable(0, 0, 300, 150);
    this.dummy.changeSkin(Graphics.WSkinTrans);
    Graphics.renderWindow(this.dummy);
    this.dummy.hide();
    this.cursor = this.dummy.cursorSprite;
    this.dummy.removeChild(this.cursor);
    this.cursor.setZ(0x20).render();
  }
  /*-------------------------------------------------------------------------*/
  createSelectionWindow(){
    let ww = 300, wh = 250;
    let wx = Graphics.appCenterWidth(ww);
    let wy = Graphics.appVisibleCenterHeight(wh);
    this.selectionWindow = new Window_CardSelection(wx, wy, ww, wh);
    this.selectionWindow.hide().setZ(0x30);
    this.selectionWindow.setHandler('cancel', ()=>{
      this.onUserAbilityCancel();
    });
  }
  /*-------------------------------------------------------------------------*/
  createInfoSprite(){
    const width = 250;
    const height = 145;
    this.infoSprite = new SpriteCanvas(0, 0, width, height).setZ(0x22);
    this.infoSprite.sortableChildren = true;

    const panel = new PIXI.Graphics()
      .roundRect(0, 0, width, height, 12)
      .fill({color: 0x071827, alpha: 0.7})
      .stroke({width: 2, color: 0xf2c75c, alpha: 0.78});
    panel.zIndex = 0;
    this.infoSprite.addChild(panel);
    this.infoSprite.panelSprite = panel;

    const innerFrame = new PIXI.Graphics()
      .roundRect(7, 7, width - 14, height - 14, 9)
      .stroke({width: 1, color: 0x42d8d0, alpha: 0.25});
    innerFrame.zIndex = 1;
    this.infoSprite.addChild(innerFrame);
    const header = new PIXI.Graphics()
      .roundRect(13, 10, width - 26, 22, 6)
      .fill({color: 0x153b4a, alpha: 0.7});
    header.zIndex = 1;
    this.infoSprite.addChild(header);
    const headerAccent = new PIXI.Graphics()
      .roundRect(18, 15, 3, 12, 1.5)
      .fill({color: 0x42d8d0, alpha: 1});
    headerAccent.zIndex = 1;
    this.infoSprite.addChild(headerAccent);

    const titleFont = clone(Graphics.DefaultFontSetting);
    titleFont.fontSize = 18;
    titleFont.fill = 0xf7d36a;
    const title = this.infoSprite.drawText(28, 12, '', titleFont, false);

    const labelFont = clone(Graphics.DefaultFontSetting);
    labelFont.fontSize = 18;
    labelFont.fill = 0x9bc7c8;
    const colorLabel = this.infoSprite.drawText(18, 38, '', labelFont, false);
    const valueLabel = this.infoSprite.drawText(144, 38, '', labelFont, false);

    const colorFont = clone(Graphics.DefaultFontSetting);
    colorFont.fontSize = 20;
    colorFont.fill = 0xffffff;
    const colorValue = this.infoSprite.drawText(34, 58, '', colorFont, false);

    const valueFont = clone(Graphics.DefaultFontSetting);
    valueFont.fontSize = 20;
    valueFont.fill = 0xffffff;
    const valueValue = this.infoSprite.drawText(160, 58, '', valueFont, false);

    const swatch = new PIXI.Graphics()
      .circle(24, 66, 6)
      .fill({color: 0x9aa8b8, alpha: 1})
      .stroke({width: 2, color: 0xf7d36a, alpha: 0.9});
    swatch.zIndex = 3;
    this.infoSprite.addChild(swatch);

    const divider = new PIXI.Graphics()
      .moveTo(16, 88)
      .lineTo(width - 16, 88)
      .stroke({width: 1, color: 0x42d8d0, alpha: 0.3});
    divider.zIndex = 1;
    this.infoSprite.addChild(divider);

    const statusFont = clone(Graphics.DefaultFontSetting);
    statusFont.fontSize = 20;
    statusFont.fill = 0x9bc7c8;
    const penaltyLabel = this.infoSprite.drawText(18, 94, Vocab.UnoPenalty || 'Penalty', statusFont, false);
    const statusLabel = this.game.gameMode === Mode.TIMED
      ? (Vocab.Score || 'Score')
      : (Vocab.Uno || 'UNO');
    const unoLabel = this.infoSprite.drawText(144, 94, statusLabel, statusFont, false);

    const statusValueFont = clone(Graphics.DefaultFontSetting);
    statusValueFont.fontSize = 18;
    statusValueFont.fill = 0xffffff;
    const penaltyValue = this.infoSprite.drawText(18, 116, '—', statusValueFont, false);
    const unoValue = this.infoSprite.drawText(
      144,
      116,
      this.game.gameMode === Mode.TIMED
        ? String(this.game.players?.[0]?.score || 0)
        : '—',
      statusValueFont,
      false
    );

    this.infoSprite.titleSprite = title;
    this.infoSprite.colorLabelSprite = colorLabel;
    this.infoSprite.colorValueSprite = colorValue;
    this.infoSprite.valueLabelSprite = valueLabel;
    this.infoSprite.valueValueSprite = valueValue;
    this.infoSprite.colorSwatch = swatch;
    this.infoSprite.penaltyLabelSprite = penaltyLabel;
    this.infoSprite.penaltyValueSprite = penaltyValue;
    this.infoSprite.unoLabelSprite = unoLabel;
    this.infoSprite.unoValueSprite = unoValue;
    // Hide only after creating the text children so their own alpha stays 1
    // and the whole card can fade in through its parent opacity.
    this.infoSprite.setOpacity(0).hide();
  }
  /*-------------------------------------------------------------------------*/
  createHuds(){
    if(this.game.gameMode == Mode.TRADITIONAL){return ;}
    if(this.game.gameMode == Mode.TIMED){
      this.hudCanvas = [];
      this.createTimedHud();
      return;
    }
    this.hudCanvas = [];
    for(let i in this.handCanvas){
      i = parseInt(i);
      let side = i % 4;
      let hcs = this.handCanvas[i];
      let cw = Math.max(hcs.width, hcs.height), ch = 30;
      let cx = hcs.x, cy = hcs.y;
      if(!(side&1)){cy += + Graphics.spacing / 2;}
      if(side == 0){
        cx += Graphics.IconRect.width + Graphics.spacing;
        cy += hcs.height - ch + Graphics.spacing/2;
      }
      else if(side == 3){
        cx += hcs.width - ch;
      }
      if(!!(side&1)){[cw, ch] = [ch,cw]}
      let canvas = new SpriteCanvas(cx, cy, cw, ch);
      let font = clone(Graphics.DefaultFontSetting);
      font.fontSize = 16;
      let txt = canvas.drawText(Graphics.spacing/2, 0, "HP ", font);
      let bx = !(side&1) ? txt.width: 0;
      let by = !(side&1) ? 0: txt.height;
      let bw = !(side&1) ? (hcs.width - Graphics.spacing*2 - txt.width) :  20;
      let bh = !(side&1) ?  20 : (hcs.height - Graphics.spacing - txt.height);
      if(!(side&1)){
        bx += Graphics.spacing/2;
        if(side == 0){bw -= (Graphics.IconRect.width + Graphics.padding);}
      }

      let bar = new Sprite_ProgressBar(bx, by, bw, bh)
      bar.changeColor(Graphics.color.LightGreen);
      bar.enableHealthColorMode();
      bar.enableValueText('health');
      bar.setMaxProgress(GameManager.initHP);
      bar.setProgress(GameManager.initHP);
      bar.on('pointerenter', ()=>{
        this.showHintWindow(null, null, this.getPlayerHPText(i));
      });
      bar.on('pointermove', ()=>{
        this.updateHintWindow();
      });
      bar.on('pointerleave', ()=>{
        this.hideHintWindow();
      });
      bar.activate();

      canvas.hpBar = bar;
      canvas.addChild(bar);
      canvas.show().setZ(0x1a).render();
      this.hudCanvas.push(canvas);
    }
  }
  /*-------------------------------------------------------------------------*/
  createTimedHud(){
    const width = 220;
    const height = 62;
    const canvas = new SpriteCanvas(0, 0, width, height).setZ(0x2a);
    const panel = new PIXI.Graphics()
      .roundRect(0, 0, width, height, 10)
      .fill({color: 0x071827, alpha: 0.78})
      .stroke({width: 2, color: 0xf2c75c, alpha: 0.88});
    canvas.addChild(panel);
    const font = clone(Graphics.DefaultFontSetting);
    font.fontSize = 17;
    font.fill = 0x9bc7c8;
    const valueFont = clone(Graphics.DefaultFontSetting);
    valueFont.fontSize = 20;
    valueFont.fill = 0xffffff;
    const totalLabel = canvas.drawText(12, 7, Vocab.TimedTime || 'Time', font, false);
    const totalValue = canvas.drawText(112, 5, '--:--', valueFont, false);
    const turnLabel = canvas.drawText(12, 35, Vocab.TimedTurn || 'Turn', font, false);
    const turnValue = canvas.drawText(112, 33, '--', valueFont, false);
    canvas.totalValue = totalValue;
    canvas.turnValue = turnValue;
    canvas.totalLabel = totalLabel;
    canvas.turnLabel = turnLabel;
    const topHand = this.handCanvas?.[2];
    const rightOfTopHand = topHand
      ? topHand.x + topHand.width + Graphics.spacing
      : Graphics.appCenterWidth(width);
    const leftOfTopHand = topHand
      ? topHand.x - width - Graphics.spacing
      : Graphics.appCenterWidth(width);
    const x = rightOfTopHand + width <= Graphics.width - Graphics.spacing
      ? rightOfTopHand
      : Math.max(Graphics.spacing, leftOfTopHand);
    canvas.setPOS(x, Graphics.spacing + 70)
      .hide().render();
    this.timedHud = canvas;
  }
  /*-------------------------------------------------------------------------*/
  updateTimedClock(seconds){
    if(!this.timedHud){return;}
    const total = Math.max(0, Math.ceil(Number(seconds) || 0));
    const minutes = Math.floor(total / 60);
    const remainder = String(total % 60).padStart(2, '0');
    this.timedHud.totalValue.text = `${minutes}:${remainder}`;
    this.timedHud.totalValue.style.fill = total <= 10 ? 0xff8a80 : 0xffffff;
    this.timedHud.show();
  }
  /*-------------------------------------------------------------------------*/
  updateTimedTurn(seconds){
    if(!this.timedHud){return;}
    const value = Number(seconds);
    this.timedHud.turnValue.text = value > 0 ? `${Math.ceil(value)}s` : '--';
    this.timedHud.turnValue.style.fill = value > 0 && value <= 1 ? 0xff8a80 : 0xffffff;
  }
  /*-------------------------------------------------------------------------*/
  createHitSprite(){
    let sp = new SpriteCanvas(0, 0, 300, 300);
    let rect = sp.fillRect(0,0,300,300, Graphics.color.White);
    sp.effectRect = rect;
    sp.hide().setZ(0x30).render();
    this.hitEffectSprite = sp;
  }
  /*-------------------------------------------------------------------------*/
  createScoreBoard(){
    this.resultWindow = new Window_Scoreboard();
    this.resultWindow.setZ(0x50).hide().render();
  }
  /*-------------------------------------------------------------------------*/
  createNextButton(){
    this.nextButton = new Window_Back(0, 0, this.onActionNext.bind(this), Vocab.Next);
    let wx = Graphics.width - this.nextButton.width - Graphics.padding;
    let wy = this.getGameVisibleRect().top + Graphics.padding;
    this.nextButton.setPOS(wx, wy).setZ(0x50).hide();
  }
  /*-------------------------------------------------------------------------*/
  createUnoButton(){
    this.unoButton = new Window_Back(0, 0, this.onUnoButton.bind(this), 'UNO');
    this.unoButton.applyPrimaryButtonStyle(180, 58, 24);
    this.unoButton.alwaysActive = true;
    this.positionUnoButton();
    this.unoButton.setZ(0x300).hide().deactivate();
  }
  /*-------------------------------------------------------------------------*/
  positionUnoButton(){
    if(!this.unoButton){return;}
    if(this.infoSprite?.visible){
      // Keep the call-to-action beside the status card instead of covering
      // its status row.  The status card is anchored to the bottom-right,
      // so its left edge is the stable reference for all game modes.
      const infoBounds = this.infoSprite.getBounds?.();
      const infoLeft = infoBounds?.left ?? this.infoSprite.x;
      const infoBottom = infoBounds?.bottom ?? (this.infoSprite.y + this.infoSprite.height);
      const x = Math.max(
        Graphics.padding,
        infoLeft - this.unoButton.width - Graphics.spacing
      );
      const handBounds = this.handCanvas?.[0]?.getBounds?.();
      const alignedY = infoBottom - this.unoButton.height - 8;
      const aboveHandY = handBounds
        ? handBounds.top - this.unoButton.height - Graphics.spacing
        : alignedY;
      const y = Math.min(alignedY, aboveHandY);
      this.unoButton.setPOS(x, y);
      return;
    }
    const x = Graphics.width - this.unoButton.width - Graphics.padding;
    const y = Graphics.height - this.unoButton.height - Graphics.padding;
    this.unoButton.setPOS(x, y);
  }
  /*-------------------------------------------------------------------------*/
  isUnoButtonAvailable(){
    const player = this.players?.[0];
    if(this.game?.gameMode === Mode.TIMED || !this.playerPhase || this._drawInProgress || !player || player.ai ||
       this._unoCalled || player.hand.length !== 2){
      return false;
    }
    return player.hand.some(this.game.isCardPlayable.bind(this.game));
  }
  /*-------------------------------------------------------------------------*/
  updateUnoButton(){
    if(!this.unoButton){return;}
    if(this.game?.gameMode === Mode.TIMED){
      this._unoCalled = false;
      this.unoButton.hide().deactivate();
      return;
    }
    if(this.isUnoButtonAvailable()){
      this.unoButton.show().activate();
      this.unoButton.setZ(Math.max(0x300, this.unoButton.z || 0));
      this.sortChildren();
    }
    else if(!this._pendingDrawChoice?.card){
      this._unoCalled = false;
      this.unoButton.hide().deactivate();
    }
    this.updateLastCardInfo();
  }
  /*-------------------------------------------------------------------------*/
  onUnoButton(){
    if(this.game?.gameMode === Mode.TIMED){
      return Sound.playBuzzer();
    }
    if(!this.isUnoButtonAvailable()){
      return Sound.playBuzzer();
    }
    this._unoCalled = true;
    this.unoButton.hide().deactivate();
    this.updatePenaltyInfo(true);
    debug_log('UNO called by player');
    Sound.playOK();
  }
  /*-------------------------------------------------------------------------*/
  createDimBack(){
    this.dimBack = new Sprite(0, 0, Graphics.width, Graphics.height);
    this.dimBack.fillRect(0, 0, Graphics.width, Graphics.height, Graphics.color.Black);
    this.dimBack.setOpacity(0.7).setZ(0x4f).hide();
  }
  /*-------------------------------------------------------------------------*/
  displayHitEffect(i){
    let sx = this.handCanvas[i].x;
    let sy = this.handCanvas[i].y;
    let sw = this.handCanvas[i].width;
    let sh = this.handCanvas[i].height;
    let rect = this.hitEffectSprite.effectRect;
    rect.clear();
    rect.rect(0, 0, sw, sh).fill(Graphics.color.White);
    this.hitEffectSprite.setPOS(sx, sy).resize(sw, sh);
    this.hitEffectSprite.setOpacity(0.01).show();
    this.hitEffectSprite.flag = true;
  }
  /*-------------------------------------------------------------------------*/
  getPlayerHPText(i){
    if(!this.players){return '';}
    let v = 0;
    v = String(this.players[i].hp);
    return v + ' / ' + GameManager.initHP + '; ' + Vocab.Score + ': ' + this.players[i].score;
  }
  /*-------------------------------------------------------------------------*/
  arrangeHandCards(index, show=false, verify=true){
    let hcs  = this.handCanvas[index];
    let side = index % 4;
    let cardSize  = this.players[index].hand.length;
    const handScale = this.getHandCardScale(index);
    let cardWidth  = Graphics.CardRectReg.width * handScale;
    let cardHeight = Graphics.CardRectReg.height * handScale;
    let canvasWidth  = !(index&1) ? hcs.width  : hcs.height;
    let canvasHeight = !(index&1) ? hcs.height : hcs.width;
    const availableStackPortion = (canvasWidth - cardWidth) /
      (cardSize * cardWidth);
    // Keep small hands visually stacked instead of spreading two or three
    // cards across the whole hand area.  The cap leaves a little more room
    // than a normal hand while preserving the overlap between cards.
    const smallHandStackCap = 0.86;
    let stackPortion = cardSize <= 5
      ? Math.min(availableStackPortion, smallHandStackCap)
      : availableStackPortion;
    stackPortion = parseFloat(stackPortion.toFixed(3));
    let totalWidth   = cardWidth + (cardWidth * stackPortion * (cardSize - 1));
    let cur_player   = this.players[index];
    if(cur_player.knockOut){show = true;}
    let base_pos     = (canvasWidth - totalWidth) / 2;
    let deg = index * (360 / GameManager.playerNumber);
    debug_log("Arrange " + index);
    for(let i in cur_player.hand){
      let dx = 0, dy = 0;
      let card = cur_player.hand[i];
      let next_index = (side <= 1) ? i : cardSize - i - 1;
      this.detachCardInfo(card);
      
      if(!(side&1)){
        dx = base_pos + cardWidth * stackPortion * next_index + cardWidth / 2;
        dy = (side == 0) ? canvasHeight - cardHeight + cardHeight / 2 : cardHeight / 2;
        if(this.game.gameMode != Mode.TRADITIONAL){
          if(side == 0){dy -= 30;}
          else{dy += 30;}
        }
      }
      else{
        dy = base_pos + cardWidth * stackPortion * next_index + cardWidth / 2;
        dx = (side == 1) ? Graphics.spacing + cardHeight/2: canvasHeight - cardHeight + cardHeight / 2;
        if(this.game.gameMode != Mode.TRADITIONAL){
          if(side == 1){dx += 30;}
          else{dx -= 30;}
        }
      }
      
      if(!card.sprite){
        let sx = hcs.x + hcs.width / 2;
        let sy = hcs.y + hcs.height / 2;
        this.assignCardSprite(card, sx, sy, true);
      }
      card.sprite.playerIndex = index;

      if(index == 0 || show || DataManager.debugOption["showHand"]){
        this.setCardTexture(card.sprite, this.getCardImage(card));
      }
      else{
        this.setCardTexture(card.sprite, Graphics.CardBack);
      }
      this.setCardScale(card.sprite, handScale);

      if(card.sprite.parent && card.sprite.parent != hcs){
        card.sprite.parent.removeChild(card.sprite);
        hcs.addChild(card.sprite);
        card.sprite.setPOS(canvasWidth/2,canvasHeight/2);
      }
      card.sprite.setZ(0x11 + parseInt(i));
      card.sprite.rotateDegree(deg);
      
      // Attach card info immediately so events are available during/after movement
      if(index == 0){
        this.attachCardInfo(card);
        debug_log("Card attached:", card, "eventMode:", card.sprite.eventMode);
      }
      
      // Hand re-layout is a frequent operation. Use a faster temporary
      // movement speed here without changing the normal draw/play speed.
      const arrangeSpeed = card.sprite.speed || 8;
      card.sprite.speed = arrangeSpeed * 1.5;
      card.sprite.moveto(dx, dy, function(){
        if(index == 0){
          // Ensure card stays interactive after movement completes
          EventManager.setTimeout(()=>{
            if(card.attached && card.sprite){
              card.sprite.eventMode = 'static';
              debug_log("Card eventMode reset after move:", card, "eventMode:", card.sprite.eventMode);
            }
          }, 10)
        }
      }.bind(this));
      card.sprite.speed = arrangeSpeed;
      card.lastZ = card.sprite.z; card.lastY = dy;
    }
    EventManager.setTimeout(()=>{
      this.purifyHandCards(index)
      if(index == 0){this.activatePlayerCards()}
    }, 8);
    this.animationCount += 1;
    this.sortHandCardLayers(index);
    if(verify){
      EventManager.setTimeout(()=>{
        this.verifyHandLayout(index);
      }, 30);
    }
  }
  /*-------------------------------------------------------------------------*/
  sortHandCardLayers(index = 0){
    const hand = this.handCanvas?.[index];
    if(!hand){return;}
    hand.sortableChildren = true;
    hand.sortChildren();
  }
  /*-------------------------------------------------------------------------*/
  verifyHandLayout(index, attempt = 0, stableChecks = 0){
    const hand = this.players?.[index]?.hand;
    if(!hand || !this.handCanvas?.[index]){return;}
    this.purifyHandCards(index);
    const stable = hand.every(function(card){
      return !!card.sprite && !card.sprite.isMoving;
    });
    if(!stable && attempt < 80){
      EventManager.setTimeout(()=>{
        this.verifyHandLayout(index, attempt + 1, 0);
      }, 16);
      return;
    }
    // Require three consecutive stable checks before finalizing the layout.
    // Any movement or missing sprite resets the consecutive count.
    if(stable && stableChecks < 2 && attempt < 80){
      EventManager.setTimeout(()=>{
        this.verifyHandLayout(index, attempt + 1, stableChecks + 1);
      }, 16);
      return;
    }
    // Re-apply the final positions after all draw/play movements have
    // settled. The three consecutive stable checks above are shared by
    // system dealing and manual arrangement.
    this.arrangeHandCards(index, false, false);
    this.sortHandCardLayers(index);
  }
  /*-------------------------------------------------------------------------*/
  purifyHandCards(index){
    let trash = [];
    for(let i in this.handCanvas[index].children){
      let sprite = this.handCanvas[index].children[i];
      if(!sprite.instance){continue;}
      if(this.players[index].hand.indexOf(sprite.instance) == -1){
        trash.push(sprite);
      }
    }
    for(let i in trash){
      this.recycleCardSprite(trash[i]);
    }
  }
  /*-------------------------------------------------------------------------*/
  getPlayerPosition(pid){
    return {x: this.handCanvas[pid].x + this.handCanvas[pid].width / 2,
            y: this.handCanvas[pid].y + this.handCanvas[pid].height / 2};
  }
  /*-------------------------------------------------------------------------*/
  playColorEffect(cid){

  }
  /*-------------------------------------------------------------------------*/
  onHPChange(pid, types = []){
    this.updateHPBar(pid);
    debug_log("On HP Change: ", pid, types);
    let hit = false;
    for(let i in types){
      if(!types[i]){continue;}
      switch(parseInt(i)){
        case Color.RED:
          this.playFireDanage(pid);
          hit = true;
          break;
        case Color.YELLOW:
          this.playThunderDamage(pid);
          hit = true;
          break;
        case Color.GREEN:
          this.playWindDamage(pid);
          hit = true;
          break;
        case Color.BLUE:
          this.playIceDamage(pid);
          hit = true;
          break;
      }
    }
    if(hit){
      this.displayHitEffect(pid);
    }
    if(this.players[pid].knockOut){
      this.arrangeHandCards(pid, true)
    }
  }
  /*-------------------------------------------------------------------------*/
  playFireDanage(pid){
    this.shake(2);
    let pos = this.getPlayerPosition(pid);
    Sound.playSE(Sound.FireHit);
    Graphics.playAnimation(pos.x, pos.y, Graphics.FireHit, 2);
  }
  /*-------------------------------------------------------------------------*/
  playIceDamage(pid){
    this.shake(2);
    let pos = this.getPlayerPosition(pid);
    Sound.playSE(Sound.IceHit);
    Graphics.playAnimation(pos.x, pos.y, Graphics.IceHit, 2);
  }
  /*-------------------------------------------------------------------------*/
  playWindDamage(pid){
    this.shake(2);
    let pos = this.getPlayerPosition(pid);
    Sound.playSE(Sound.WindHit);
    Graphics.playAnimation(pos.x, pos.y, Graphics.WindHit, 2);
  }
  /*-------------------------------------------------------------------------*/
  playThunderDamage(pid){
    this.shake(2);
    let pos = this.getPlayerPosition(pid);
    Sound.playSE(Sound.ThunderHit);
    Graphics.playAnimation(pos.x, pos.y, Graphics.ThunderHit, 2);
  }
  /*-------------------------------------------------------------------------*/
  onDamageChange(){
    this.updateDamagePool();
  }
  /*-------------------------------------------------------------------------*/
  addDiscardCard(card, player_id, ext){
    player_id = parseInt(player_id);
    card.sprite.show();
    if(player_id >= 0){
      let deg = -20 + player_id * (360 / GameManager.playerNumber) + randInt(0, 40);
      card.sprite.rotateDegree(deg);
      EventManager.setTimeout(()=>{
        this.arrangeHandCards(player_id);
      }, 8);
    }
    this.setCardTexture(card.sprite, this.getCardImage(card));
    let sx = this.discardPile.x + this.discardPile.width / 2;
    let sy = this.discardPile.y + this.discardPile.height / 2;
    let cx = (this.discardPile.width) / 2;
    let cy = (this.discardPile.height) / 2;
    debug_log("Discard ", sx, sy, card.sprite.x, card.sprite.y);
    this.animationCount += 1;
    card.sprite.moveto(sx, sy, function(){
      this.playColorEffect(card.color);
      if(card.sprite.parent != SceneManager.scene){
        card.sprite.parent.removeChild(card.sprite);
      }
      this.discardPile.addChild(card.sprite);
      if(ext != -1){this.updateLastCardInfo();}
      else{
        let len = this.discardPile.children.length;
        [this.discardPile.children[len-1], this.discardPile.children[len-2]] = [
          this.discardPile.children[len-2], this.discardPile.children[len-1]
        ]
      }
      card.sprite.setPOS(cx, cy);
    }.bind(this));
    let repos = 1;
    while(this.discardPile.children.length > this.discardPileSize){
      let re = this.recycleCardSprite(this.discardPile.children[repos]);
      if(!re){repos += 1;}
      if(re >= this.discardPile.length){break;}
    }
  }
  /*-------------------------------------------------------------------------*/
  recycleCardSprite(sprite){
    if(!sprite || this.spritePool.indexOf(sprite) == -1){return false;}
    sprite.playerIndex = -2;
    sprite.instance = null;
    if(sprite.parent){
      sprite.parent.removeChild(sprite);
    }
    let sx = this.deckSprite.x + this.deckSprite.width / 2;
    let sy = this.deckSprite.y + this.deckSprite.height / 2;
    sprite.setPOS(sx, sy).hide();
  }
  /*-------------------------------------------------------------------------*/
  createHintWindow(){
    this.hintWindow = new Window_Help(0, 0, 250, 120);
    this.hintWindow.changeSkin(Graphics.WSkinTrans);
    this.hintWindow.font.fontSize = 16;
    this.hintWindow.padding_left  = 12;
    this.hintWindow.autoWidth     = true;
    this.hintWindow.autoWidthMin  = 112;
    this.hintWindow.autoWidthMax  = 480;
    this.hintWindow.autoHeight    = true;
    this.hintWindow.autoHeightMin = 56;
    this.hintWindow.autoHeightMax = 180;
    this.hintWindow.hoverNumber   = 0;
    this.hintWindow.setZ(0x20).hide().render();
  }
  /*-------------------------------------------------------------------------*/
  update(){
    super.update();
    this.updateGameLayoutViewport();
    if(this._gamePaused){return;}
    if(this._leavingBattle){return ;}
    // Check if user is trying to leave the page and show confirmation
    if(this._showLeaveConfirmation){
      this._showLeaveConfirmation = false;
      this.showLeavePageConfirmation();
      return;
    }
    this.updateGame();
    this.updateAbilityChoiceTimer();
    this.updateDirectionIndicator();
    this.showDirectionIndicatorAfterDeal();
    this.fadeInDirectionIndicator();
    this.updatePendingDrawChoice();
    this.updateCards();
    this.updateHintWindowVisibility();
    this.updateHitEffect();
    this.updateDimBack();
  }
  /*-------------------------------------------------------------------------*/
  onSettingsPause(){
    if(this._settingsPausedAt){return;}
    this._settingsPausedAt = Date.now();
    this.children.forEach(child => Graphics.pauseAnimatedSprite(child));
  }
  /*-------------------------------------------------------------------------*/
  onSettingsResume(){
    if(!this._settingsPausedAt){return;}
    const pausedFor = Math.max(0, Date.now() - this._settingsPausedAt);
    const shiftTimestamp = value => value ? value + pausedFor : value;
    if(this.game){
      this.game.timedStartedAt = shiftTimestamp(this.game.timedStartedAt);
      this.game.timedTurnStartedAt = shiftTimestamp(this.game.timedTurnStartedAt);
    }
    this._abilityChoiceStartedAt = shiftTimestamp(this._abilityChoiceStartedAt);
    this._abilityChoiceDeadline = shiftTimestamp(this._abilityChoiceDeadline);
    this._settingsPausedAt = 0;
    this.children.forEach(child => Graphics.resumeAnimatedSprite(child));
  }
  /*-------------------------------------------------------------------------*/
  updateGame(){
    if(this.flagResulting){return ;}
    if(this.game.deck){this.game.update();}
  }
  /*-------------------------------------------------------------------------*/
  updateCards(){
    for(let i in this.spritePool){
      this.spritePool[i].update();
    }
  }
  /*-------------------------------------------------------------------------*/
  updateHintWindow(txt=null){
    if(!this.hintWindow){return ;}
    if(!this.hintWindow.visible){return ;}
    if(txt){this.hintWindow.setText(txt);}
    this.positionHintWindow();
  }
  /*-------------------------------------------------------------------------*/
  updateDeckInfo(){
    this.updateDeckCount();
    if(Input.isMouseInArea(this.deckSprite.hitArea)){
      this.updateHintWindow(Vocab["HelpDeck"] + this.getDeckLeftNumber);
    }
    if(this.game.deck.length == 0){
      this.deckSprite.top.hide();
      this.deckSprite.bot.show();
    }else{
      this.deckSprite.bot.hide();
      this.deckSprite.top.show();
    }
  }
  /*-------------------------------------------------------------------------*/
  updateDeckCount(){
    const countSprite = this.deckCountSprite;
    const deck = this.game?.deck;
    if(!countSprite){return;}
    if(!deck || deck.infinite){
      countSprite.hide();
      return;
    }
    countSprite.countText.text = String(deck.length);
    countSprite.show();
  }
  /*-------------------------------------------------------------------------*/
  updateHintWindowVisibility(){
    if(this.hintWindow.hoverNumber <= 0){return ;}
    const ar = [this.deckSprite, this.discardPile].concat(this.handCanvas);
    let ok = false;
    for(let i in ar){
      let rect = this.getCollisionRect(ar[i]);
      if(Input.isMouseInArea(rect)){ok = true; break;}
    }
    if(!ok){
      this.hintWindow.hoverNumber = 0;
      this.hideHintWindow();
    }
  }
  /*-------------------------------------------------------------------------*/
  updateHitEffect(){
    if(!this.hitEffectSprite.visible){return ;}
    if(this.hitEffectSprite.flag){
      let opa = Math.min(1, this.hitEffectSprite.opacity + 0.1);
      this.hitEffectSprite.setOpacity(opa);
      if(opa >= 1){this.hitEffectSprite.flag = false;}
    }
    else{
      let opa = Math.max(1, this.hitEffectSprite.opacity - 0.1);
      this.hitEffectSprite.setOpacity(opa);
      if(opa <= 1){this.hitEffectSprite.hide();}
    }
  }
  /*-------------------------------------------------------------------------*/
  updateDimBack(){
    if(!this.dimBack.visible){return ;}
    let opa = this.dimBack.opacity;
    if(opa >= 0.8){return ;}
    this.dimBack.setOpacity(opa + 0.02);
  }
  /*-------------------------------------------------------------------------*/
  updateLastCardInfo(){
    if(!this.infoSprite){return;}
    // RED is enum value 0, so a falsy check would hide the panel and its text.
    if(!this.game || this.game.currentColor == null || this.game.currentColor < 0){
      this.infoSprite.hide();
      return;
    }

    const titleText = String(Vocab.CurrentColorValue || 'Current Color/Value')
      .replace(/[:：]\s*$/, '').trim();
    const labels = titleText.split(/[\/／]/).map(label => label.trim());
    const colorName = this.getCurrentColorName();
    const colorHex = this.getCurrentColorHex();
    const valueName = this.getCurrentValueName();

    this.infoSprite.titleSprite.text = titleText;
    // The heading already communicates "current"; the detail row only needs the color label.
    this.infoSprite.colorLabelSprite.text = (labels[0] || 'Color').replace(/^當前\s*/, '');
    this.infoSprite.valueLabelSprite.text = labels[1] || '數字';
    this.infoSprite.colorValueSprite.text = colorName;
    this.infoSprite.colorValueSprite.style.fill = colorHex;
    this.infoSprite.valueValueSprite.text = valueName;
    this.infoSprite.colorSwatch.clear()
      .circle(24, 72, 6)
      .fill({color: colorHex, alpha: 1})
      .stroke({width: 2, color: 0xffffff, alpha: 0.85});

    // The status row always describes the human player (player 0).
    const self = this.players?.[0];
    const selfIsPenaltyTarget = this.game.penaltyCard &&
      (this.game.currentPlayerIndex === 0 || this.game.getNextAlivePlayerIndex() === 0);
    let penaltyText = '—';
    if(selfIsPenaltyTarget){
      penaltyText = this.game.penaltyPool > 0
        ? '+' + this.game.penaltyPool
        : (this.game.penaltyCard.value === Value.SKIP ? Vocab.SKIP : '—');
    }
    const isTimed = this.game.gameMode === Mode.TIMED;
    const selfHasUno = !!self && self.hand.length === 1 &&
      (!!self.unoCalled || !!this._unoCalled);
    const unoText = isTimed
      ? String(self?.score || 0)
      : (selfHasUno ? (Vocab.Uno || 'UNO') : '—');
    this.infoSprite.penaltyValueSprite.text = penaltyText;
    this.infoSprite.unoValueSprite.text = unoText;
    this.infoSprite.penaltyValueSprite.style.fill = penaltyText === '—' ? 0xb0bec5 : 0xffc857;
    this.infoSprite.unoValueSprite.style.fill = isTimed
      ? 0xf7d36a
      : (selfHasUno ? 0x66e39b : 0xb0bec5);

    const panelWidth = this.infoSprite.width;
    this.infoSprite.setPOS(
      Graphics.width - Graphics.spacing - panelWidth,
      Graphics.height - Graphics.spacing - this.infoSprite.height
    ).show();
    this.positionUnoButton();
  }
  /*-------------------------------------------------------------------------*/
  updateDamagePool(){
    if(!this.discardPile.damageText){return ;}
    this.discardPile.damageText.text = String(this.game.damagePool);
  }
  /*-------------------------------------------------------------------------*/
  updateHPBar(i = null){
    if(!this.players){return ;}
    if(i == null){
      for(let i in this.hudCanvas){
        this.updateHPBar(parseInt(i));
        this.hudCanvas[i].hpBar.setProgress(this.players[i].hp);
      }
    }
    else{
      this.hudCanvas[i].hpBar.setProgress(this.players[i].hp);
    }
  }
  /*-------------------------------------------------------------------------*/
  updatePenaltyInfo(current=false){
    let idx = this.game.getNextAlivePlayerIndex();
    if(current){idx = this.game.currentPlayerIndex;}
    let pcard = this.game.penaltyCard;
    for(let i in this.penaltyCanvas){
      i = parseInt(i);
      const player = this.players[i];
      const isTimed = this.game.gameMode === Mode.TIMED;
      const uno = (i === 0 && this._unoCalled) || !!player?.unoCalled;
      let penalty = '-';
      if(i === idx && pcard){
        if(pcard.value === Value.SKIP){
          penalty = Vocab.SKIP;
        }
        else if(this.game.penaltyPool > 0){
          penalty = '+' + this.game.penaltyPool;
        }
      }
      this.setPenaltyInfo(i, {
        penalty,
        uno: isTimed ? String(player?.score || 0) : (uno ? (Vocab.Uno || 'UNO') : '-'),
        score: isTimed,
      });
    }
    this.updateLastCardInfo();
  }
  /*-------------------------------------------------------------------------*/
  setPenaltyInfo(i, txt){
    let hcs = this.penaltyCanvas[i];
    if(!hcs){return;}
    const empty = '-';
    const state = typeof txt === 'string'
      ? {penalty: txt, uno: txt === (Vocab.Uno || 'UNO') ? txt : empty}
      : txt;
    hcs.penaltyValueSprite.text = state.penalty || empty;
    hcs.unoValueSprite.text = state.uno || empty;
    hcs.penaltyValueSprite.style.fill = state.penalty && state.penalty !== empty
      ? 0xffc857 : 0xb0bec5;
    hcs.unoValueSprite.style.fill = state.score
      ? 0xf7d36a
      : (state.uno && state.uno !== empty ? 0x66e39b : 0xb0bec5);
    hcs.setPOS(hcs.baseX, hcs.baseY);
  }
  /*-------------------------------------------------------------------------*/
  raiseOverlay(w){
    super.raiseOverlay(w);
    // The UNO call must remain clickable even while the drawn-card choice or
    // a wild-card ability window is open, and must render above that overlay.
    if(this.unoButton && this.isUnoButtonAvailable()){
      this.unoButton.alwaysActive = true;
      this.unoButton.show().activate();
      this.unoButton.setZ(Math.max(0x300, (w?.z || 0) + 1));
      this.sortChildren();
    }
    this.deckSprite.deactivate();
    this.discardPile.deactivate();
    for(let i in this.spritePool){
      let sp = this.spritePool[i];
      sp.lastActiveState = sp.isActive();
      sp.deactivate();
    }
  }
  /*-------------------------------------------------------------------------*/
  closeOverlay(){
    super.closeOverlay();
    this.deckSprite.activate();
    this.discardPile.activate();
    for(let i in this.spritePool){
      let sp = this.spritePool[i];
      if(sp.lastActiveState){
        sp.activate();
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  getHintAnchorPosition(){
    const anchorSprite = this.hintWindow?.anchorSprite;
    if(anchorSprite?.getBounds){
      const bounds = anchorSprite.getBounds();
      return {
        x: bounds.x + bounds.width / 2,
        y: bounds.y,
      };
    }
    const mouse = Input.mouseAppPOS || [0, 0];
    return {x: mouse[0], y: mouse[1]};
  }
  /*-------------------------------------------------------------------------*/
  positionHintWindow(x=null, y=null){
    if(!this.hintWindow){return ;}
    const anchor = this.getHintAnchorPosition();
    const visible = this.getGameVisibleRect();
    if(x == null){x = anchor.x - this.hintWindow.width / 2;}
    if(y == null){y = anchor.y - this.hintWindow.height - 12;}
    if(y < visible.top){y = anchor.y + 12;}
    x = Math.max(0, Math.min(x, Graphics.width - this.hintWindow.width));
    y = Math.max(visible.top, Math.min(y, visible.bottom - this.hintWindow.height));
    this.hintWindow.setPOS(x, y);
  }
  /*-------------------------------------------------------------------------*/
  showHintWindow(x, y, txt = ''){
    this.hintWindow.hoverNumber += 1;
    this.hintWindow.show().setText(txt);
    this.positionHintWindow(x, y);
  }
  /*-------------------------------------------------------------------------*/
  hideHintWindow(){
    this.hintWindow.hoverNumber -= 1;
    if(this.hintWindow.hoverNumber <= 0){
      this.hintWindow.hoverNumber = 0;
      this.hintWindow.hide();
    }
  }
  /*-------------------------------------------------------------------------*/
  /**
   * The Battle Puno HUD moves the player's hand upward by 30px. Hovering a
   * card moves it upward once more, so the regular hand mask can clip its
   * top edge. Extend only the mask while a card is hovered; the card layout
   * and its hover scale/position remain unchanged.
   */
  setPlayerHandHoverOverflow(card, enabled, lift = 0){
    const hand = this.handCanvas?.[0];
    if(!hand?.maskGraphics){return;}
    if(!enabled){
      hand.drawMask();
      return;
    }

    const hoverScale = this.getHandCardScale(0) * 1.2;
    const hoverHeight = Graphics.CardRectReg.height * hoverScale;
    const hoverY = (card.lastY || 0) - lift;
    const overflowTop = Math.max(0, Math.ceil(hoverHeight / 2 - hoverY) + 4);
    hand.maskGraphics.clear()
      .rect(0, -overflowTop, hand.width, hand.height + overflowTop)
      .fill(Graphics.color.White);
  }
  /*-------------------------------------------------------------------------*/
  shouldShowCardInfo(card){
    if(this.game?.gameMode !== Mode.TRADITIONAL){return true;}
    return [
      Value.WILD_CHAOS,
      Value.DISCARD_ALL,
      Value.WILD_HIT_ALL,
      Value.TRADE,
    ].includes(card?.value);
  }
  /*-------------------------------------------------------------------------*/
  cardTouchesDirectionBadge(card){
    const indicator = this.directionIndicator;
    if(!indicator?.visible || !indicator.badgePositions?.length || !card?.sprite){
      return false;
    }
    const bounds = card.sprite.getBounds();
    return indicator.badgePositions.some(badge => {
      const x = Math.max(bounds.left, Math.min(badge.x, bounds.right));
      const y = Math.max(bounds.top, Math.min(badge.y, bounds.bottom));
      const dx = badge.x - x;
      const dy = badge.y - y;
      return dx * dx + dy * dy <= Math.pow((badge.radius || 20) + 4, 2);
    });
  }
  /*-------------------------------------------------------------------------*/
  moveDirectionBadgeForHover(card){
    const indicator = this.directionIndicator;
    const badge = indicator?.badgePositions?.[0];
    if(!indicator?.visible || !badge || !card?.sprite){return;}
    const bounds = card.sprite.getBounds();
    const gap = (badge.radius || 20) + 8;
    // The human player's badge is above the bottom hand. Move it farther
    // outward only when the enlarged hovered card reaches it.
    const y = Math.min(badge.y, bounds.top - gap);
    if(y === badge.y){return;}
    indicator.hoverBadgeOffset = {index: 0, x: 0, y: y - badge.y};
    this.updateDirectionIndicator(true);
  }
  /*-------------------------------------------------------------------------*/
  clearDirectionBadgeHoverOffset(){
    if(!this.directionIndicator?.hoverBadgeOffset){return;}
    this.directionIndicator.hoverBadgeOffset = null;
    this.updateDirectionIndicator(true);
  }
  /*-------------------------------------------------------------------------*/
  attachCardInfo(card){
    if(!card.sprite || card.attached){return ;}
    card.attached = true;
    card.sprite.attached = true;  // Mark sprite to prevent syncChildrenProperties from changing it
    card.sprite.lastActiveState = true;
    // Explicitly set eventMode before adding listeners
    card.sprite.eventMode = 'static';
    card.sprite._forceInteractive = true;  // Additional protection flag
    // Remove old listeners first to avoid duplicates
    card.sprite.off('pointerenter');
    card.sprite.off('pointermove');
    card.sprite.off('pointerleave');
    card.sprite.off('pointertap');
    // Add fresh listeners with arrow functions to preserve 'this' context
    const self = this;
    // A touch contact can emit pointerenter on mobile browsers.  Hovering a
    // card moves and scales it, which can change the hit target while the
    // finger is still down and make the following pointertap intermittent.
    // Touch should activate the card without running desktop hover effects.
    const isTouchPointer = (event) => event?.pointerType === 'touch' ||
      (Graphics.isMobileDevice && event?.pointerType !== 'mouse' &&
       event?.pointerType !== 'pen');
    card.sprite.on('pointerenter', (e) => {
      debug_log("pointerenter event fired for card:", card);
      // Touch keeps the enlarged preview, but showCardInfo leaves the card
      // in its original slot so the finger's hit target does not move.
      self.showCardInfo(card, isTouchPointer(e));
    });
    card.sprite.on('pointermove', (e) => {
      if(isTouchPointer(e)){return;}
      self.updateHintWindow();
    });
    card.sprite.on('pointerleave', (e) => {
      if(isTouchPointer(e)){return;}
      self.hideCardInfo(card);
    });
    card.sprite.on('pointertap', (e) => {
      debug_log("pointertap event fired! calling onCardTrigger for card:", card);
      self.onCardTrigger(card);
      // An unplayable touch still gets the visual preview, so clear it after
      // the tap when onCardTrigger did not already consume the card.
      if(isTouchPointer(e) && self.hintWindow?.subject === card){
        self.hideCardInfo(card);
      }
    });
    debug_log("attachCardInfo completed:", card, "eventMode:", card.sprite.eventMode, "has listeners:", card.sprite.listenerCount('pointertap') > 0);
  }
  /*-------------------------------------------------------------------------*/
  detachCardInfo(card){
    card.attached = false;
    if(!card.sprite){return ;}
    if(this.hintWindow.subject == card){
      this.hideCardInfo(card);
    }
    card.sprite.attached = false;  // Clear protection flag
    card.sprite._forceInteractive = false;  // Clear additional flag
    card.sprite.lastActiveState = false;
    card.sprite.eventMode = 'none';
    card.sprite.removeAllListeners();
  }
  /*-------------------------------------------------------------------------*/
  showCardInfo(card, touch = false){
    let info = this.getCardHelp(card);
    this.clearDirectionBadgeHoverOffset();
    // Lift every hovered card slightly after scaling it. The collision check
    // is intentionally done again after this first lift, because scaling can
    // make a card touch a badge even when its normal bounds did not.
    let hoverLift = touch ? 0 : 32;
    this.setPlayerHandHoverOverflow(card, true, hoverLift);
    card.sprite.setZ(0x30);
    // Make only the hovered card visibly larger while leaving the hand
    // spacing and every other card unchanged.
    this.setCardScale(card.sprite, this.getHandCardScale(0) * 1.2);
    card.sprite.setPOS(null, card.lastY - hoverLift);
    if(this.cardTouchesDirectionBadge(card)){
      this.moveDirectionBadgeForHover(card);
    }
    this.handCanvas[0].sortChildren();
    if(!this.shouldShowCardInfo(card)){
      this.hintWindow.hide();
      this.hintWindow.hoverNumber = 0;
      this.hintWindow.anchorSprite = null;
      this.hintWindow.subject = null;
      return;
    }
    this.hintWindow.anchorSprite = card.sprite;
    this.showHintWindow(null, null, info);
    this.hintWindow.subject = card;
  }
  /*-------------------------------------------------------------------------*/
  hideCardInfo(card){
    if(!card?.sprite){
      this.clearDirectionBadgeHoverOffset();
      this.hintWindow?.hide();
      if(this.hintWindow){
        this.hintWindow.anchorSprite = null;
        this.hintWindow.subject = null;
      }
      return;
    }
    card.sprite.setZ(card.lastZ);
    this.setCardScale(card.sprite, this.getHandCardScale(0));
    card.sprite.setPOS(null, card.lastY);
    this.setPlayerHandHoverOverflow(card, false);
    this.clearDirectionBadgeHoverOffset();
    this.handCanvas[0].sortChildren();
    this.hideHintWindow(true);
    this.hintWindow.anchorSprite = null;
    this.hintWindow.subject = null;
  }
  /*-------------------------------------------------------------------------*/
  getCardHelp(card){
    let re = ''
    switch(card.color){
      case Color.RED:
        re += Vocab.HelpColorRed + '; '; break;
      case Color.BLUE:
        re += Vocab.HelpColorBlue + '; '; break;
      case Color.YELLOW:
        re += Vocab.HelpColorYellow + '; '; break;
      case Color.GREEN:
        re += Vocab.HelpColorGreen + '; '; break;
      case Color.WILD:
        re += Vocab.HelpColorWild + '; '; break;
      default:
        re += "???";
    }
    re += Vocab.Effect + ': ';
    switch(card.value){
      case Value.ZERO:
        re += Vocab.HelpZero + '; '; break;
      case Value.REVERSE:
        re += Vocab.HelpReverse + '; '; break;
      case Value.SKIP:
        re += Vocab.HelpSkip + '; '; break;
      default:
        re += this.getEffectsHelp(GameManager.interpretCardAbility(card, 0));
    }
    re += this.getCharacterHelp(card);
    return this.formatCardHelp(re);
  }
  /*-------------------------------------------------------------------------*/
  formatCardHelp(text){
    return String(text || '')
      // Semicolons separate effects in the source text; show each one as a line.
      .replace(/\s*;\s*/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .replace(/\n+$/, '')
      .trim();
  }
  /*-------------------------------------------------------------------------*/
  getEffectsHelp(effects){
    let re = '';
    for(let i in effects){
      let eff = effects[i];
      switch(eff){
        case Effect.DRAW_TWO:
          re += Vocab.HelpPlusTwo + '; '; break;
        case Effect.DRAW_FOUR:
          re += Vocab.HelpPlusFour + '; '; break;
        case Effect.CHOOSE_COLOR:
          re += Vocab.HelpChooseColor + '; '; break;
        case Effect.HIT_ALL:
          re += Vocab.HelpHitAll + '; '; break;
        case Effect.TRADE:
          re += Vocab.HelpTrade + '; '; break;
        case Effect.WILD_CHAOS:
          re += Vocab.HelpChaos + '; '; break;
        case Effect.DISCARD_ALL:
          re += Vocab.HelpDiscardAll + '; '; break;
        case Effect.ADD_DAMAGE:
          re += Vocab.HelpNumber + '; '; break;
      }
    }
    re += '\n';
    return re;
  }
  /*-------------------------------------------------------------------------*/
  getCharacterHelp(card){
    return ''
  }
  /*-------------------------------------------------------------------------*/
  assignCardSprite(card, ix=0, iy=0, rnd=false){
    if(card.sprite){return ;}
    let sprite = this.getIdleCardSprite();
    this.setCardTexture(sprite, this.getCardImage(card));
    sprite.setPOS(ix, iy);
    card.sprite = sprite;
    sprite.instance = card;
    if(rnd){sprite.render();}
    return card;
  }
  /*-------------------------------------------------------------------------*/
  onCardPlay(pid, card, effects, ext){
    this.flagBusy = true;
    EventManager.setTimeout(()=>{this.flagBusy = false}, Graphics.FPS);
    if(this.game?.gameMode === Mode.TIMED){
      this.updatePenaltyInfo();
    }
    pid = parseInt(pid);
    // The opening discard may reuse a card object from the dealer preview.
    // Give it a fresh sprite so its motion always starts at the draw pile on
    // the left of the discard pile instead of inheriting the preview position.
    if(pid == -1 && card.sprite){
      card.sprite = null;
    }
    if(!card.sprite){
      let sx = this.deckSprite.x + this.deckSprite.width / 2;
      let sy = this.deckSprite.y + this.deckSprite.height / 2;
      this.assignCardSprite(card, sx, sy, true);
    }

    if(pid == -1){
      this.updateDeckInfo();
      EventManager.setTimeout(()=>{
        this.updatePenaltyInfo();
      }, 10);
    }
    else{
      let pos = card.sprite.worldTransform;
      card.sprite.setPOS(pos.tx, pos.ty);
      this.handCanvas[pid].removeChild(card.sprite);
      card.sprite.render();
    }
    if(ext != -1){
      this.processCardEffects(effects, ext);
      EventManager.setTimeout(()=>{
        this.updatePenaltyInfo();
      }, 2);
    }
    this.detachCardInfo(card);
    Sound.playCardPlace();
    card.sprite.setZ(0x20).handIndex = -1;
    card.sprite.playerIndex = -1;
    debug_log("Card play: " + pid, card);
    this.addDiscardCard(card, pid, ext);
  }
  /*-------------------------------------------------------------------------*/
  processCardEffects(effects, ext){
    ext = [].concat(ext);
    debug_log("Effects: " + effects);
    debug_log("Ext: " + ext);
    for(let i in effects){
      if(ext[i] == -1){continue;}
      switch(effects[i]){
        case Effect.CHOOSE_COLOR:
          this.processColorChangeEffect(parseInt(ext[i]));
          break;
        case Effect.TRADE:
          this.processTradeEffect(parseInt(ext[i]));
          break;
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  processTradeEffect(ext){
    let pid = this.game.currentPlayerIndex;
    EventManager.setTimeout(()=>{
      this.arrangeHandCards(pid);
      this.arrangeHandCards(ext);
    }, 10);
  }
  /*-------------------------------------------------------------------------*/
  processColorChangeEffect(cid){
    debug_log("Color changed: " + cid);
  }
  /*-------------------------------------------------------------------------*/
  onCardDraw(pid, cards, show=false, complete=null){
    pid = parseInt(pid);
    let wt = 10; // wait time
    for(let i in cards){
      i = parseInt(i);
      let ar = (i+1 == cards.length);
      EventManager.setTimeout(this.processCardDrawAnimation.bind(this, pid, cards[i], show, ar, i, complete), wt * i);
    }
    this.updateDeckInfo();
  }
  /*-------------------------------------------------------------------------*/
  processCardDrawAnimation(pid, card, show=false, ar=false, ord=0, complete=null){
    let sprite = this.getIdleCardSprite().show();
    this.setCardTexture(sprite, Graphics.CardBack);
    sprite.render();
    sprite.playerIndex = pid;
    this.setCardScale(sprite, pid >= 0 ? this.getHandCardScale(pid) : 1);
    card.sprite = sprite;
    let dx = 0, dy = 0;
    if(pid >= 0){
      let sx = this.deckSprite.x + this.deckSprite.width / 3;
      let sy = this.deckSprite.y + this.deckSprite.height / 3;
      let deg = pid * (360 / GameManager.playerNumber);
      dx = this.handCanvas[pid].x + this.handCanvas[pid].width / 2;
      dy = this.handCanvas[pid].y + this.handCanvas[pid].height / 2;
      sprite.setPOS(sx, sy).rotateDegree(deg);
    }
    Sound.playCardDraw();
    sprite.setZ(0x50 + ord);
    sprite.instance = card;
    if(show){
      this.setCardTexture(sprite, this.getCardImage(card));
      this.setCardScale(sprite, pid >= 0 ? this.getHandCardScale(pid) : 1);
      sprite.setZ(0x60 + ord);
    }

    debug_log(`${pid} Draw`);
    this.animationCount += 1;
    sprite.moveto(dx, dy, function(){
      if(pid == 0){
        this.setCardTexture(sprite, this.getCardImage(card));
        this.setCardScale(sprite, this.getHandCardScale(pid));
      }
      // Keep the animation sprite captured here. A dealer-preview card can be
      // dealt again immediately afterwards, which replaces card.sprite with
      // the real hand sprite before this delayed return-to-deck runs.
      if(show){EventManager.setTimeout(this.sendCardToDeck.bind(this, pid, card, sprite), 150);}
      else if(ar){
        EventManager.setTimeout(()=>{
          this.arrangeHandCards(pid, false, true);
          if(complete){EventManager.setTimeout(complete, 20);}
        }, 20)
      }
    }.bind(this));

    this.sortChildren();
  }
  /*-------------------------------------------------------------------------*/
  onCardTrigger(card){
    if(this.game?.isTimedTurnExpired?.()){
      this.game.handleTimedTurnTimeout();
      return Sound.playBuzzer();
    }
    debug_log("Trigger: ", card);
    debug_log("playerPhase:", this.playerPhase);
    debug_log("currentColor:", this.game.currentColor, "currentValue:", this.game.currentValue);
    debug_log("isCardPlayable:", this.game.isCardPlayable(card));
    debug_log("_drawInProgress:", this._drawInProgress, "_pendingDrawChoice:", this._pendingDrawChoice);
    if(this._drawInProgress || this._pendingDrawChoice){
      return Sound.playBuzzer();
    }
    if(this.playerPhase && this.game.isCardPlayable(card)){
      if(this.game.gameMode === Mode.TIMED){
        // Clicking a playable card is already the action for this turn. A
        // special card may still need a second choice, so stop the normal
        // turn clock before opening that choice window.
        this.game.finishTimedTurnAction?.();
      }
      this.hideCardInfo(card);
      if(this.game.isCardAbilitySelectionNeeded(card)){
        Sound.playOK();
        this.processCardAbilitySelection(card);
        this.raiseOverlay(this.selectionWindow);
      }
      else{
        this.onUserCardPlay(card, null);
      }
    }
    else{
      Sound.playBuzzer();
    }
  }
  /*-------------------------------------------------------------------------*/
  processCardAbilitySelection(card){
    this._activeAbilityCard = card;
    this.selectionWindow.setTimedChoiceMode?.(this.game.gameMode === Mode.TIMED);
    let effid = this.selectionWindow.setupCard(card);
    this.setupCardAbilityHandler(card, effid);
    if(this.game.gameMode === Mode.TIMED){
      this.startTimedAbilityChoice(card);
    }
  }
  /*-------------------------------------------------------------------------*/
  startTimedAbilityChoice(card){
    this._abilityChoiceToken += 1;
    this._abilityChoiceStartedAt = Date.now();
    this._abilityChoiceDeadline = this._abilityChoiceStartedAt + 3000;
    this._abilityChoiceTimerToken = this._abilityChoiceToken;
    this._abilityChoiceCard = card;
    this.selectionWindow.setChoiceTime?.(3);
  }
  /*-------------------------------------------------------------------------*/
  clearTimedAbilityChoice(){
    this._abilityChoiceToken += 1;
    this._abilityChoiceStartedAt = 0;
    this._abilityChoiceDeadline = 0;
    this._abilityChoiceTimerToken = 0;
    this._abilityChoiceCard = null;
    this.selectionWindow?.setChoiceTime?.(0);
  }
  /*-------------------------------------------------------------------------*/
  updateAbilityChoiceTimer(){
    if(!this._abilityChoiceStartedAt || !this._abilityChoiceCard ||
       this.game?.gameMode !== Mode.TIMED || this.game?.timedEnded ||
       !this.selectionWindow?.visible){
      return;
    }
    const remaining = Math.max(0, (this._abilityChoiceDeadline - Date.now()) / 1000);
    this.selectionWindow.setChoiceTime?.(remaining);
    if(remaining <= 0){
      const card = this._abilityChoiceCard;
      const token = this._abilityChoiceTimerToken;
      this.clearTimedAbilityChoice();
      if(token === this._abilityChoiceToken - 1 &&
         this._activeAbilityCard === card && this.selectionWindow.visible){
        this.autoSelectTimedAbility(card);
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  autoSelectTimedAbility(card){
    if(!card || this.game?.timedEnded || !this.selectionWindow?.visible){return;}
    let ext;
    if(card.value === Value.TRADE){
      const targets = this.game.getAlivePlayers()
        .map(player => this.players.indexOf(player))
        .filter(index => index >= 0 && index !== this.game.currentPlayerIndex);
      ext = targets[Math.floor(Math.random() * targets.length)] ?? this.game.findTarget();
    }
    else if(card.value === Value.ZERO){
      ext = Math.floor(Math.random() * 2);
    }
    else{
      const colors = [Color.RED, Color.YELLOW, Color.GREEN, Color.BLUE];
      ext = colors[Math.floor(Math.random() * colors.length)];
    }
    this.onUserAbilityDecided(card, ext);
  }
  /*-------------------------------------------------------------------------*/
  setupCardAbilityHandler(card, effid){
    switch(effid){
      case Effect.CLEAR_DAMAGE:
        return this.setupZeroHandlers(card);
      case Effect.TRADE:
        return this.setupTradeHandlers(card);
      case Effect.CHOOSE_COLOR:
        return this.setupColorSelectionHandlers(card);
      default:
        throw new Error(`Unknown Card Selection: ${effid}, ${card}`)
    }
  }
  /*-------------------------------------------------------------------------*/
  setupZeroHandlers(card){
    this.selectionWindow.setHandler(1, ()=>{
      this.onUserAbilityDecided(card, 0)
    });
    this.selectionWindow.setHandler(2, ()=>{
      this.onUserAbilityDecided(card, 1)
    });
  }
  /*-------------------------------------------------------------------------*/
  setupTradeHandlers(card){
    let alives = this.game.getAlivePlayers();
    let cnt = 1;
    for(let i in alives){
      if(alives[i] == GameManager.game.players[0]){continue;}
        this.selectionWindow.setHandler(cnt++, ()=>{
        this.onUserAbilityDecided(card, this.players.indexOf(alives[i]))
      });
    }
  }
  /*-------------------------------------------------------------------------*/
  setupColorSelectionHandlers(card){
    this.selectionWindow.setHandler(1, ()=>{
      this.onUserAbilityDecided(card, Color.RED)
    });
    this.selectionWindow.setHandler(2, ()=>{
      this.onUserAbilityDecided(card, Color.YELLOW)
    });
    this.selectionWindow.setHandler(3, ()=>{
      this.onUserAbilityDecided(card, Color.GREEN)
    });
    this.selectionWindow.setHandler(4, ()=>{
      this.onUserAbilityDecided(card, Color.BLUE)
    });
  }
  /*-------------------------------------------------------------------------*/
  deactivatePlayerCards(){
    for(let i in this.handCanvas[0].children){
      const child = this.handCanvas[0].children[i];
      child.lastActiveState = child.isActive();
      if(child.isActive()){
        child.deactivate();
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  activatePlayerCards(){
    this.sortHandCardLayers(0);
    for(let i in this.handCanvas[0].children){
      const child = this.handCanvas[0].children[i];
      // Explicitly reactivate player's hand cards
      if(child.attached){
        child.lastActiveState = true;
        child.eventMode = 'static';
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  deactivateAllHuds(){
    this.deactivatePlayerCards();
    const ar = [this.deckSprite, this.discardPile, this.handCanvas[0].arrangeIcon];
    for(let i in ar){
      ar[i].deactivate();
    }
    for(let i in this.hudCanvas){
      this.hudCanvas[i].hpBar.deactivate();
    }
  }
  /*-------------------------------------------------------------------------*/
  actiavteAllHuds(){
    this.activatePlayerCards();
    const ar = [this.deckSprite, this.discardPile, this.handCanvas[0].arrangeIcon];
    for(let i in ar){
      ar[i].activate();
    }
    for(let i in this.hudCanvas){
      this.hudCanvas[i].hpBar.activate();
    }
  }
  /*-------------------------------------------------------------------------*/
  onUserCardPlay(card, ext){
    Sound.playOK();
    this.deactivatePlayerCards();
    this.detachCardInfo(card);
    this.hideCardInfo(card);
    let cardIndex = this.players[0].findCard(card, true);
    if(cardIndex >= 0){
      this.game.discard(cardIndex, ext, this._unoCalled);
      this.processUserTurnEnd();
      this.animationCount += 1;
    }
    else{
      console.error("Selected card not in hand: ", card);
      this.arrangeHandCards(0);
    }
  }
  /*-------------------------------------------------------------------------*/
  onUserAbilityCancel(){
    Sound.playCancel();
    this.clearTimedAbilityChoice();
    this._activeAbilityCard = null;
    this.closeOverlay();
    if(this.game?.gameMode === Mode.TIMED && this.playerPhase && !this.game.timedEnded){
      this.game.startTimedTurn?.();
    }
  }
  /*-------------------------------------------------------------------------*/
  onUserAbilityDecided(card, ext){
    Sound.playOK();
    this.clearTimedAbilityChoice();
    this._activeAbilityCard = null;
    this.closeOverlay();
    this.onUserCardPlay(card, ext);
  }
  /*-------------------------------------------------------------------------*/
  onDeckTrigger(){
    if(this.game?.isTimedTurnExpired?.()){
      this.game.handleTimedTurnTimeout();
      return Sound.playBuzzer();
    }
    if(!this.playerPhase || this._drawInProgress || this._pendingDrawChoice){
      return Sound.playBuzzer();
    }
    this._unoCalled = false;
    this.unoButton?.hide().deactivate();
    let numCards = GameManager.getCardDrawNumber();
    if(!this.game.penaltyCard){
      if(this.game.gameMode !== Mode.TIMED){
        this.game.processDeckDamage(0);
      }
      this._drawInProgress = true;
      this.deckSprite.deactivate();

      const cards = [];
      let playableCard = null;
      do{
        const drawn = this.game.drawCard(1);
        if(!drawn || drawn.length < 1){break;}
        const card = drawn[0];
        cards.push(card);
        if(this.game.isCardPlayable(card)){
          playableCard = card;
          break;
        }
      }while(this.game.drawUntilPlayable);

      this.players[0].deal(cards);
      if(cards.length < 1){
        this._drawInProgress = false;
        this.deckSprite.activate();
        this.processUserTurnEnd();
        return;
      }
      this._pendingDrawChoice = {
        card: playableCard,
        animationReady: false,
      };
      if(this.game.gameMode === Mode.TIMED){
        this.game?.finishTimedTurnAction?.();
      }
      GameManager.onCardDraw(0, cards, false, ()=>{
        if(this._pendingDrawChoice){
          this._pendingDrawChoice.animationReady = true;
        }
      });
      return;
    }
    this.game.penaltyCard = undefined;
    this.game.penaltyPool = 0;
    const cards = GameManager.game.deck.draw(numCards);
    this.players[0].deal(cards);
    GameManager.onCardDraw(0, cards);
    this.processUserTurnEnd();
  }
  /*-------------------------------------------------------------------------*/
  updatePendingDrawChoice(){
    const pending = this._pendingDrawChoice;
    if(!pending || !pending.animationReady || pending.presented){return;}
    for(let i in this.spritePool){
      if(this.spritePool[i].isMoving){return;}
    }
    pending.presented = true;
    this._drawInProgress = false;
    if(pending.card){
      if(this.game.gameMode === Mode.TIMED){
        this.autoPlayTimedDrawnCard(pending.card);
      }
      else{
        this.updateUnoButton();
        this.showDrawnCardChoice(pending.card);
      }
    }
    else{
      this._pendingDrawChoice = null;
      this.deckSprite.activate();
      this.processUserTurnEnd();
    }
  }
  /*-------------------------------------------------------------------------*/
  autoPlayTimedDrawnCard(card){
    EventManager.setTimeout(()=>{
      if(this.game?.timedEnded || !this._pendingDrawChoice){return;}
      this._pendingDrawChoice = null;
      if(this.players[0].findCard(card, true) < 0){
        this.processUserTurnEnd();
        return;
      }

      let ext = null;
      if(card.value === Value.TRADE){
        ext = this.game.findTarget();
      }
      else if(card.color === Color.WILD && card.value !== Value.WILD_CHAOS){
        const colors = [Color.RED, Color.YELLOW, Color.GREEN, Color.BLUE]
          .filter(color => color !== this.game.currentColor);
        ext = colors[Math.floor(Math.random() * colors.length)] || Color.RED;
      }
      this.onUserCardPlay(card, ext);
    }, Graphics.FPS);
  }
  /*-------------------------------------------------------------------------*/
  showDrawnCardChoice(card){
    const win = new Window_Confirm(
      0, 0, 420, 180,
      Vocab["DrawPlayablePrompt"],
      Vocab["PlayCard"], Vocab["KeepCard"]
    );
    win.setPOS(Graphics.appCenterWidth(win.width), Graphics.appVisibleCenterHeight(win.height));
    win.setHandler('yes', ()=>{
      Sound.playOK();
      this._pendingDrawChoice = null;
      this.closeOverlay();
      if(this.players[0].findCard(card, true) >= 0){
        this.onCardTrigger(card);
      }
      else{
        this.processUserTurnEnd();
      }
    });
    win.setHandler('no', ()=>{
      Sound.playCancel();
      this._pendingDrawChoice = null;
      this.closeOverlay();
      this.processUserTurnEnd();
    });
    win.raise();
  }
  /*-------------------------------------------------------------------------*/
  sendCardToDeck(pid, card, sprite = card?.sprite){
    if(!sprite){return;}
    sprite.playerIndex = -2;
    let sx = this.deckSprite.x + this.deckSprite.width / 2;
    let sy = this.deckSprite.y + this.deckSprite.height / 2;
    this.handCanvas[pid]?.removeChild(sprite);
    sprite.hide().setPOS(sx,sy);
  }
  /*-------------------------------------------------------------------------*/
  getCardImage(card){
    let symbol = '';
    switch(card.color){
      case Color.RED:
        symbol += 'Red'; break;
      case Color.BLUE:
        symbol += 'Blue'; break;
      case Color.YELLOW:
        symbol += 'Yellow'; break;
      case Color.GREEN:
        symbol += 'Green'; break;
      case Color.WILD:
        symbol += 'Wild'; break;
      default:
        throw new Error("Invalid card color: " + card.color);
    }
    switch(card.value){
      case Value.REVERSE:
        symbol += 'Reverse'; break;
      case Value.SKIP:
        symbol += 'Ban'; break;
      case Value.DRAW_TWO:
        symbol += 'Plus2'; break;
      case Value.WILD_DRAW_FOUR:
        symbol += 'Plus4'; break;
      case Value.WILD:
        symbol += 'Wild'; break;
      case Value.TRADE:
        symbol += 'Exchange'; break;
      case Value.WILD_HIT_ALL:
        symbol += 'Hit'; break;
      case Value.DISCARD_ALL:
        symbol += 'Discard'; break;
      case Value.WILD_CHAOS:
        symbol += 'Chaos'; break;
      default:
        symbol += card.value;
    }
    if(card.value > 9 && card.numID > 0){
      let tmp = symbol + '_' + (card.numID + 1);
      if(Graphics[tmp]){symbol = tmp;}
    }
    // debug_log("Card Image Symbol: " + symbol);
    return Graphics[symbol];
  }
  /*-------------------------------------------------------------------------*/
  processUserTurn(pid){
    this._turnReadyPlayerIndex = Number(pid);
    if(parseInt(pid) === 0){
      // A Trade replaces the hand arrays while the old card sprites remain
      // attached to their previous hand canvas.  Reconcile that visual/event
      // state before the player can click a card.  This is especially
      // important when the responsive wrapper was created on a wide mobile
      // viewport, where changing the viewport later used to rebuild it by
      // accident and make the cards interactive again.
      this.updateGameLayoutViewport(true);
      this.ensurePlayerHandInteraction();

      // On mobile, a turn can begin while the previous player's final card
      // animation is still handing sprites back to their hand canvases.  A
      // few short rechecks make the new turn tolerant of that handoff without
      // changing the authored layout or the normal desktop timing.
      if(Graphics.isMobileDevice){
        [16, 64, 144].forEach(delay => EventManager.setTimeout(()=>{
          if(this.playerPhase && this.game?.currentPlayerIndex === 0){
            this.updateGameLayoutViewport(true);
            this.ensurePlayerHandInteraction();
          }
        }, delay));
      }
    }
    this.setCursor(pid);
    this.playerPhase = true;
    this.updateUnoButton();
    EventManager.setTimeout(()=>{
      this.updatePenaltyInfo(true);
    }, 5);
  }
  /*-------------------------------------------------------------------------*/
  processUserTurnEnd(){
    this.game?.finishTimedTurnAction?.();
    this.playerPhase = false;
    this._turnReadyPlayerIndex = -1;
    this._drawInProgress = false;
    this._pendingDrawChoice = null;
    this._unoCalled = false;
    this.unoButton?.hide().deactivate();
    this.updatePenaltyInfo(true);
    this.deckSprite?.activate();
  }
  /*-------------------------------------------------------------------------*/
  onTimedTurnTimeout(){
    this.clearTimedAbilityChoice();
    const alreadyDrew = !!this._pendingDrawChoice || !!this._drawInProgress;
    this._activeAbilityCard = null;
    this.closeOverlayAll();
    this.selectionWindow?.hide().deactivate();
    this.processUserTurnEnd();
    this.updateTimedTurn(0);
    return alreadyDrew;
  }
  /*-------------------------------------------------------------------------*/
  processNPCTurn(pid){
    this._turnReadyPlayerIndex = Number(pid);
    this.setCursor(pid);
    EventManager.setTimeout(()=>{
      this.updatePenaltyInfo(true);
    }, 5);
  }
  /*-------------------------------------------------------------------------*/
  setCursor(pid){
    if(pid == -1){return this.cursor.hide();}
    let sx = this.nameCanvas[pid].x - Graphics.spacing;
    let sy = this.nameCanvas[pid].y - Graphics.spacing;
    let sw = this.nameCanvas[pid].textSprite.width + Graphics.padding + Graphics.spacing;
    if(['zh_tw', 'zh_cn', 'ja_jp', 'ko_kr'].includes(Vocab.Language)){
      sw += Graphics.spacing * 2;
    }
    let sh = Graphics.lineHeight;
    this.dummy.resize(sw, sh);
    this.cursor.setPOS(sx, sy).show();
  }
  /*-------------------------------------------------------------------------*/
  ensurePlayerHandInteraction(){
    const hand = this.players?.[0]?.hand;
    const canvas = this.handCanvas?.[0];
    if(!hand || !canvas){return;}

    // A traded card may still be owned by the other hand canvas.  Run the
    // normal layout path in that case so the sprite is moved and all card
    // listeners are attached in one place.
    const needsLayout = hand.some(card => !card?.sprite || card.sprite.parent !== canvas);
    if(needsLayout){
      this.arrangeHandCards(0, false, true);
      canvas.eventMode = 'static';
      canvas.interactiveChildren = true;
      this.activatePlayerCards();
      return;
    }

    // The normal path is already laid out; only restore the interaction flags
    // if a previous play/deal/hand exchange detached them.
    hand.forEach(card => {
      if(!card?.sprite){return;}
      if(!card.attached){this.attachCardInfo(card);}
      card.sprite.attached = true;
      card.sprite._forceInteractive = true;
      card.sprite.lastActiveState = true;
      card.sprite.eventMode = 'static';
    });
    canvas.eventMode = 'static';
    canvas.interactiveChildren = true;
    this.activatePlayerCards();
  }
  /*-------------------------------------------------------------------------*/
  applyColorChangeEffect(cid){
    debug_log("Color Changed: " + cid);
  }
  /*-------------------------------------------------------------------------*/
  processGameOver(){
    debug_log("Game Ends")
    this.flagResulting = true;
    this.setCursor(-1);
    SceneManager.goto(Scene_GameOver, this.game);
  }
  /*-------------------------------------------------------------------------*/
  /**
   * Show confirmation dialog when user tries to leave the page/close window
   */
  showLeavePageConfirmation(){
    const yesHandler = () => {
      Sound.playOK();
      this.leaveBattle?.();
    };
    const noHandler = () => {
      Sound.playCancel();
      // Don't do anything, just close the dialog and stay in game
    };
    const win = new Window_Confirm(0, 0, 460, 180, Vocab["LeaveBattleConfirm"]);
    win.messageKey = "LeaveBattleConfirm";
    win.setPOS(Graphics.appCenterWidth(win.width), Graphics.appVisibleCenterHeight(win.height));
    win.setHandler('yes', yesHandler);
    win.setHandler('no', noHandler);
    win.raise();
  }
  /*-------------------------------------------------------------------------*/
  /**
   * Finish the current battle and return to the title scene.
   *
   * SceneManager waits for a scene to stop being busy before changing it.
   * A player's turn and pending card animations used to keep that condition
   * true forever, leaving the game visually stuck after confirmation.
   */
  leaveBattle(){
    if(this._leavingBattle){return ;}
    debug_log("Leave battle");
    this._leavingBattle = true;
    this.flagResulting = true;
    this.flagBusy = false;
    this.playerPhase = false;
    this._drawInProgress = false;
    this._pendingDrawChoice = null;
    GameManager._inTurn = false;
    this.animationCount = 0;
    this._activeAbilityCard = null;
    this.setCursor(-1);
    this.closeOverlayAll();
    EventManager.clear();
    this.selectionWindow?.hide().deactivate();
    this.nextButton?.hide().deactivate();
    this.resultWindow?.hide().deactivate();
    this.hintWindow?.hide().deactivate();
    if(GameManager.game === this.game){
      GameManager.game = null;
    }
    SceneManager.goto(Scene_Title);
    // If a transition exception stops the main ticker, the native timer still
    // gives the title scene one deterministic chance to be created.
    this._leaveFallbackTimer = setTimeout(function(){
      if(SceneManager.scene !== this || !SceneManager.isNextScene(Scene_Title)){
        return;
      }
      if(globalThis.FatelError){globalThis.FatelError = false;}
      SceneManager.forceChangeScene();
    }.bind(this), 1500);
  }
  /*-------------------------------------------------------------------------*/
  processRoundOver(){
    debug_log("Round Ends")
    this.flagResulting = true;
    this.setCursor(-1);
    this.updateHPBar();
    this.dimBack.show().setOpacity(0);
    EventManager.setTimeout(()=>{
      this.displayRoundResult();
    }, 60);
  }
  /*-------------------------------------------------------------------------*/
  processRoundStart(){
    debug_log("Round Start");
    this.resetDirectionIndicator();
    this.flagResulting = false;
    this.clearTable();
    this.updateDamagePool();
    this.updateHPBar();
    this.updateDeckInfo();
  }
  /*-------------------------------------------------------------------------*/
  displayRoundResult(){
    this.resultWindow.drawRank();
    this.resultWindow.show().activate();
    this.nextButton.show().activate();
  }
  /*-------------------------------------------------------------------------*/
  onActionNext(){
    Sound.playOK();
    this.resultWindow.hide().deactivate().clear();
    this.dimBack.hide();
    this.nextButton.hide().deactivate();
    this.game.roundStart();
  }
  /*-------------------------------------------------------------------------*/
  clearTable(){
    this.clearDeck();
    this.clearCardSprites();
  }
  /*-------------------------------------------------------------------------*/
  clearDeck(){
    this.updateDeckInfo();
  }
  /*-------------------------------------------------------------------------*/
  clearCardSprites(){
    for(let i in this.spritePool){
      let sprite = this.spritePool[i];
      if(!sprite.instance){continue;}
      if(sprite.instance != this.game.lastCard()){
        this.recycleCardSprite(sprite);
      }
    }
  }
  /*-------------------------------------------------------------------------*/
  processGameStart(){
    debug_log("Game Start")
  }
  /*-------------------------------------------------------------------------*/
  isBusy(){
    if(this._leavingBattle){return super.isBusy();}
    return super.isBusy() || this.isAnimationPlaying() ||
           this.isPlayerThinking() || this.flagBusy;
  }
  /*-------------------------------------------------------------------------*/
  terminate(){
    if(this._leaveFallbackTimer !== null){
      clearTimeout(this._leaveFallbackTimer);
      this._leaveFallbackTimer = null;
    }
    super.terminate();
  }
  /*-------------------------------------------------------------------------*/
  isAnimationPlaying(){
    if(!this.animationCount){return false;}
    this.animationCount = 0;
    for(let i in this.spritePool){
      if(this.spritePool[i].isMoving){
        this.animationCount = 1;
        return true;
      }
    }
    return false;
  }
  /*-------------------------------------------------------------------------*/
  isPlayerThinking(){
    return this.playerPhase;
  }
  /*-------------------------------------------------------------------------*/
  getCurrentColorName(){
    switch(this.game?.currentColor){
      case Color.RED: return Vocab.Red;
      case Color.BLUE: return Vocab.Blue;
      case Color.GREEN: return Vocab.Green;
      case Color.YELLOW: return Vocab.Yellow;
      default: return Vocab.Any;
    }
  }
  /*-------------------------------------------------------------------------*/
  getCurrentColorHex(){
    switch(this.game?.currentColor){
      case Color.RED: return 0xef5350;
      case Color.BLUE: return 0x42a5f5;
      case Color.GREEN: return 0x66bb6a;
      case Color.YELLOW: return 0xffca28;
      default: return 0xb0bec5;
    }
  }
  /*-------------------------------------------------------------------------*/
  getCurrentValueName(){
    const value = this.game?.currentValue;
    if(value !== 0 && !value){return Vocab.Any;}
    if(value < 10){return String(value);}
    switch(value){
      case Value.DRAW_TWO: return Vocab.DRAW_TWO;
      case Value.SKIP: return Vocab.SKIP;
      case Value.REVERSE: return Vocab.REVERSE;
      case Value.WILD: return Vocab.WILD;
      case Value.WILD_DRAW_FOUR: return Vocab.WILD_DRAW_FOUR;
      case Value.WILD_HIT_ALL: return Vocab.WILD_HIT_ALL;
      case Value.WILD_CHAOS: return Vocab.WILD_CHAOS;
      case Value.TRADE: return Vocab.TRADE;
      case Value.DISCARD_ALL: return Vocab.DISCARD_ALL;
      default: return Vocab.Any;
    }
  }
  /*-------------------------------------------------------------------------*/
  getLastCardInfo(){
    if(!this.game || this.game.currentColor == null || this.game.currentColor < 0){
      return Vocab.NoCardPlays;
    }
    let re = Vocab.CurrentColorValue;
    switch(this.game.currentColor){
      case Color.RED:
        re += Vocab.Red; break;
      case Color.BLUE:
        re += Vocab.Blue; break;
      case Color.GREEN:
        re += Vocab.Green; break;
      case Color.YELLOW:
        re += Vocab.Yellow; break;
      default:
        re += Vocab.Any;
    }
    re += " / ";
    if(this.game.currentValue !== 0 && !this.game.currentValue){
      re += Vocab.Any;
    }
    else if(this.game.currentValue < 10){
      re += this.game.currentValue;
    }
    else{
      switch(this.game.currentValue){
        case Value.DRAW_TWO:
          return re + Vocab.DRAW_TWO;
        case Value.SKIP:
          return re + Vocab.SKIP;
        case Value.REVERSE:
          return re + Vocab.REVERSE;
        case Value.WILD:
          return re + Vocab.WILD;
        case Value.WILD_DRAW_FOUR:
          return re + Vocab.WILD_DRAW_FOUR;
        case Value.WILD_HIT_ALL:
          return re + Vocab.WILD_HIT_ALL;
        case Value.WILD_CHAOS:
          return re + Vocab.WILD_CHAOS;
        case Value.TRADE:
          return re + Vocab.TRADE;
        case Value.DISCARD_ALL:
          return re + Vocab.DISCARD_ALL;
      }
    }
    return re;
  }
  /*-------------------------------------------------------------------------*/
  get getDeckLeftNumber(){
    return this.game.deck ? this.game.deck.length : 0;
  }
  /*-------------------------------------------------------------------------*/
}

globalThis.Scene_Game = Scene_Game;
