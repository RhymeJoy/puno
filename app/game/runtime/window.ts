// @ts-nocheck
let languageChangeRequest = 0;
/**
 * The Superclass of all windows within the game.
 * 
 * @class Window_Base
 * @extends SpriteCanvas
 * @property {String} _skin - path to window skin image
 * @property {Object} _renderedObjects - information of rendered stuffs
 * @property {Array.<Object>} drawnObjects - the objects drawn on the window
 * @property {Array.<Sprite>} borderSprites - collection border sprites
 * @property {Array.<Sprite>} arrowSprites - collection of arrow sprites
 * @property {Sprite} indexSprite - background of window index
 * @property {Sprite} patternSprite - pattern image of window background
 */
class Window_Base extends SpriteCanvas{
  /**-------------------------------------------------------------------------
   * @constructor
   * @memberof Window_Base
   * @param {Number} x - X position in app
   * @param {Number} y - Y position in app
   * @param {Number} w - width of canvas, overflowed content will be hidden
   * @param {Number} h - height of canvas, overflowed content will be hidden
   */
  constructor(x = 0, y = 0, w = 300, h = 150){
    super(x, y, w, h);
    this.drawnObjects = [];
    this.changeSkin(Graphics.DefaultWindowSkin);
  }
  /*------------------------------------------------------------------------*/
  get itemWidth(){
    return this.contentWidth;
  }
  /*------------------------------------------------------------------------*/
  get itemHeight(){
    return this.lineHeight + this.spacing;
  }
  /*------------------------------------------------------------------------*/
  /** Draw text vertically centered inside a selectable item row. */
  drawItemText(target, x, text, font = Graphics.DefaultFontSetting, autowrap = false){
    let item = target.drawText(x, 0, text, font, autowrap);
    item.y = Math.round(Math.max((this.itemHeight - item.height) / 2, 0));
    return item;
  }
  /**------------------------------------------------------------------------
   * Change window skin
   */
  changeSkin(skin_name){
    this._skin = skin_name;
    this.applySkin();
    this.resize(this.width, this.height);
  }
  /*------------------------------------------------------------------------*/
  cursorRect(index){
    let rect = new Rect(0,0,0,0);
    let pos  = this.getIndexItemPOS(index);
    rect.x = pos.x;
    // The cursor skin extends below its content rectangle. Move the content
    // rect up by half that overflow so the visible frame centers on the row.
    rect.y = pos.y - this.cursorFrameOverflowY / 2;
    rect.width = this.itemWidth;
    rect.height = this.itemHeight;
    return rect;
  }
  get cursorFrameOverflowY(){
    return Graphics.wSkinCursorUL.height + Graphics.wSkinCursorUR.height;
  }
  /**-------------------------------------------------------------------------
   * > Frame update
   * @memberof Window_Base
   */
  update(){
    this.updateCursor();
  }
  /*------------------------------------------------------------------------*/
  updateCursor(){
    if(this.cursorSprite.visible){
      let sp = this.cursorSprite;
      let delta = 0.02 * Graphics.speedFactor;
      if(!sp.uFlag){
        sp.setOpacity(sp.opacity - delta);
        if(sp.opacity < 0.1){sp.uFlag = true;}
      }
      else{
        sp.setOpacity(sp.opacity + delta);
        if(sp.opacity >= 1){sp.uFlag = false;}
      }
    }
  }
  /**------------------------------------------------------------------------
   * @param {boolean} all - remove all children (dispose)
   */
  clear(all = false){
    for(let i=0;i<this.drawnObjects.length;++i){
      if(this.drawnObjects[i].destroy){
        this.drawnObjects[i].destroy({children: true});
      }
      this.removeChild(this.drawnObjects[i]);
    }
    this.drawnObjects = [];
    if(all){super.clear();}
  }
  /*-------------------------------------------------------------------------*/
  get padding(){return Graphics.padding;}
  get spacing(){return Graphics.spacing;}
  get lineHeight(){return Graphics.lineHeight;}
  get contentWidth(){return this.width - this.padding - this.spacing;}
  get contentHeight(){return this.height - this.padding - this.spacing;}
  /**-------------------------------------------------------------------------
   * > Draw window skin
   */
  applySkin(){
    this.drawSkinIndex();
    this.drawSkinPattern();
    this.drawSkinArrows();
    this.drawSkinCursor();
    this.drawSkinButton();
    this.drawSkinBorder();
  }
  /**-------------------------------------------------------------------------
   * > Draw the border of skin
   */
  drawSkinBorder(){
    if(this.borderSprites){
      this.borderSprites.forEach(function(sp){
        this.removeChild(sp);
        sp.clear();
      }.bind(this))
      this.borderSprites = [];
    }

    let tUL = Graphics.loadTexture(this._skin, Graphics.wSkinBorderUL);
    let tUP = Graphics.loadTexture(this._skin, Graphics.wSkinBorderUP);
    let tUR = Graphics.loadTexture(this._skin, Graphics.wSkinBorderUR);
    let tBL = Graphics.loadTexture(this._skin, Graphics.wSkinBorderBL);
    let tBT = Graphics.loadTexture(this._skin, Graphics.wSkinBorderBT);
    let tBR = Graphics.loadTexture(this._skin, Graphics.wSkinBorderBR);
    let tLT = Graphics.loadTexture(this._skin, Graphics.wSkinBorderLT);
    let tRT = Graphics.loadTexture(this._skin, Graphics.wSkinBorderRT);
    
    this.borderSpriteUL = new Sprite(tUL);
    this.borderSpriteUP = new Sprite(tUP);
    this.borderSpriteUR = new Sprite(tUR);
    this.borderSpriteBL = new Sprite(tBL);
    this.borderSpriteBT = new Sprite(tBT);
    this.borderSpriteBR = new Sprite(tBR);
    this.borderSpriteLT = new Sprite(tLT);
    this.borderSpriteRT = new Sprite(tRT);
    
    this.borderSprites = [
      this.borderSpriteUL, this.borderSpriteUP, this.borderSpriteUR,
      this.borderSpriteBL, this.borderSpriteBT, this.borderSpriteBR,
      this.borderSpriteLT, this.borderSpriteRT
    ]
    
    for(let i=0;i<this.borderSprites.length;++i){
      this.borderSprites[i].setZ(5).static = true;
      this.addChild(this.borderSprites[i]);
    }
  }
  /**-------------------------------------------------------------------------
   * > Draw the hover cursor of skin
   */
  drawSkinCursor(){
    if(this.cursorSprites){
      this.removeChild(this.cursorSprite);
      this.cursorSprites.forEach(function(sp){sp.clear();})
      this.cursorSprites = [];
      this.cursorSprite = null;
    }
    
    let tix = Graphics.loadTexture(this._skin, Graphics.wSkinCursorIndex);
    let tUL = Graphics.loadTexture(this._skin, Graphics.wSkinCursorUL);
    let tUP = Graphics.loadTexture(this._skin, Graphics.wSkinCursorUP);
    let tUR = Graphics.loadTexture(this._skin, Graphics.wSkinCursorUR);
    let tBL = Graphics.loadTexture(this._skin, Graphics.wSkinCursorBL);
    let tBT = Graphics.loadTexture(this._skin, Graphics.wSkinCursorBT);
    let tBR = Graphics.loadTexture(this._skin, Graphics.wSkinCursorBR);
    let tLT = Graphics.loadTexture(this._skin, Graphics.wSkinCursorLT);
    let tRT = Graphics.loadTexture(this._skin, Graphics.wSkinCursorRT);
    
    this.cursorSpriteIX = new Sprite(tix);
    this.cursorSpriteUL = new Sprite(tUL);
    this.cursorSpriteUP = new Sprite(tUP);
    this.cursorSpriteUR = new Sprite(tUR);
    this.cursorSpriteBL = new Sprite(tBL);
    this.cursorSpriteBT = new Sprite(tBT);
    this.cursorSpriteBR = new Sprite(tBR);
    this.cursorSpriteLT = new Sprite(tLT);
    this.cursorSpriteRT = new Sprite(tRT);

    let cursorSprites = [
      this.cursorSpriteIX,
      this.cursorSpriteUL, this.cursorSpriteUP, this.cursorSpriteUR,
      this.cursorSpriteBL, this.cursorSpriteBT, this.cursorSpriteBR,
      this.cursorSpriteLT, this.cursorSpriteRT
    ]

    this.cursorSpriteIX.setPOS(this.cursorSpriteUL.width, this.cursorSpriteUL.height)

    this.cursorSprite = new SpriteCanvas(0,0,32,32);
    for(let i=0;i < cursorSprites.length;++i){
      cursorSprites[i].setZ(1.5).static = true;
      this.cursorSprite.removeChild(cursorSprites[i]);
      this.cursorSprite.addChild(cursorSprites[i]);
    }

    this.cursorSprite.setZ(1.5).hide().static = true;
    this.addChild(this.cursorSprite);
  }
  /**-------------------------------------------------------------------------
   * > Draw the index background of skin
   */
  drawSkinIndex(){
    if(this.indexSprite){
      this.removeChild(this.indexSprite)
      this.indexSprite.clear();
      this.indexSprite = null;
    }
    let texture = Graphics.loadTexture(this._skin, Graphics.wSkinIndexRect);
    this.indexSprite = new Sprite(texture);
    this.indexSprite.setZ(0).setOpacity(0.5).static = true;
    this.addChild(this.indexSprite);
  }
  /**-------------------------------------------------------------------------
   * > Draw index pattern of skin
   */
  drawSkinPattern(){
    if(this.patternSprite){
      this.removeChild(this.patternSprite);
      this.patternSprite.clear();
      this.patternSprite = null;
    }
    let texture = Graphics.loadTexture(this._skin, Graphics.wSkinPatternRect);
    this.patternSprite = new Sprite(texture);
    this.patternSprite.setZ(1).setOpacity(0.5).static = true;
    this.addChild(this.patternSprite);
  }
  /**-------------------------------------------------------------------------
   * > Draw continue icon of skin
   */
  drawSkinButton(){
    if(this.buttonSprite){
      this.removeChild(this.buttonSprite);
      this.buttonSprite = null;
    }
    let rect  = Graphics.wSkinButton;
    rect.width /= 2; rect.height /= 2;
    let d = rect.width;
    let offset = [[0,0],[d,0],[0,d],[d,d]], textureArray = [];
    for(let i=0;i<4;++i){
      let srect = clone(rect);
      srect.x += offset[i][0]; srect.y += offset[i][1]
      textureArray.push(Graphics.loadTexture(this._skin, srect));
    }
    this.buttonSprite = new PIXI.AnimatedSprite(textureArray);
    this.buttonSprite.setZ(3).static = true;
    this.buttonSprite.animationSpeed = 0.25;
    this.buttonSprite.hide();
    this.addChild(this.buttonSprite);
  }
  /**-------------------------------------------------------------------------
   * > Draw scroll arrows of skin
   */
  drawSkinArrows(){
    if(this.arrowSprites){
      this.arrowSprites.forEach(function(sp){
        this.removeChild(sp);
        sp.clear();
      }.bind(this))
      this.arrowSprites = [];
    }
    let tAU = Graphics.loadTexture(this._skin, Graphics.wSkinArrowUP);
    let tAD = Graphics.loadTexture(this._skin, Graphics.wSkinArrowBT);
    let tAL = Graphics.loadTexture(this._skin, Graphics.wSkinArrowLT);
    let tAR = Graphics.loadTexture(this._skin, Graphics.wSkinArrowRT);
    this.arrowDownSprite  = new Sprite(tAD);
    this.arrowUpSprite    = new Sprite(tAU);
    this.arrowLeftSprite  = new Sprite(tAL);
    this.arrowRightSprite = new Sprite(tAR);
    this.arrowSprites = [
      this.arrowDownSprite,  this.arrowLeftSprite,
      this.arrowRightSprite, this.arrowUpSprite
    ]
    for(let i=0;i<4;++i){
      this.arrowSprites[i].setZ(6).hide().static = true;
      this.addChild(this.arrowSprites[i]);
    }
  }
  /**-------------------------------------------------------------------------
   * > Draw Icon in Iconset
   * @param {Number} icon_index - the index of the icon in Iconset
   * @param {Number} x - the draw position of X
   * @param {Number} y - the draw position of Y
   */
  drawIcon(icon_index, x = 0, y = 0){
    x += this.padding / 2; y += this.padding / 2;
    let iconSprite = super.drawIcon(icon_index, x, y);
    this.drawnObjects.push(iconSprite);
    this.refresh();
    return iconSprite;
  }
  /**-------------------------------------------------------------------------
   * > Draw text inside the window
   * @param {String} text - the text to display
   * @param {Number} x - the x position of the text to draw
   * @param {Number} y - the y position of the text to draw
   * @param {Object} font - the font settings
   */
  drawText(x = 0, y = 0, text = '', font = Graphics.DefaultFontSetting, autowrap = false){
    if(!font){font = Graphics.DefaultFontSetting;}
    if(autowrap){text = this.textWrap(text);}
    let ts = new PIXI.Text({text, style: font});
    x += this.padding / 2; y += this.padding / 2;
    ts.setPOS(x, y).setZ(2);
    this.drawnObjects.push(ts);
    this.addChild(ts);
    this.refresh();
    return ts;
  }
  /*------------------------------------------------------------------------*/
  refresh(){
    super.refresh();
    this.checkArrowsVisibility();
  }
  /*------------------------------------------------------------------------*/
  changeBackOpaicty(v){
    this.indexSprite.setOpacity(v);
    this.patternSprite.setOpacity(v);
  }
  /*------------------------------------------------------------------------*/
  useTranslucentBlackBackground(alpha = 0.86){
    if(!this.blackBackground){
      this.blackBackground = new PIXI.Graphics();
      // Keep the black layer above the white mask and skin pattern, but below
      // the window content, so bright skins cannot make the panel look white.
      this.blackBackground.setZ(1.5).static = true;
      this.addChild(this.blackBackground);
    }
    this.blackBackground.clear()
      .rect(0, 0, this.width, this.height)
      .fill({color: Graphics.color.Black, alpha});
    return this;
  }
  /**------------------------------------------------------------------------
   * Check whether to show surplus navigation arrows 
   */
  checkArrowsVisibility(){
    for(let i=0;i<4;++i){
      if(this.surplusDirection & (1 << i) > 0){
        this.arrowSprites[i].show();
      }
    }
  }
  /**-------------------------------------------------------------------------
   * Resize the window, all static children will be adjusted
   * @param {Number} w - new width,  1 <= w <= 4096
   * @param {Number} h - new height, 1 <= h <= 4096
   */
  resize(w, h){
    w = Math.min(Math.max(1, w), 4096);
    h = Math.min(Math.max(1, h), 4096);
    super.resize(w, h);
    if(this.isDisposed()){return ;}    
    this.resizeIndex();
    this.resizeBorder();
    this.resizeCursor();
    this.resizeArrows();
    this.resizeButton();
    return this;
  
  /*------------------------------------------------------------------------*/}
  resizeIndex(){
    let ixmpr = [this.width / Graphics.wSkinIndexRect.width, this.height / Graphics.wSkinIndexRect.height];
    this.indexSprite.scale.set(ixmpr[0], ixmpr[1]);
    this.patternSprite.scale.set(ixmpr[0], ixmpr[1]);
  }
  /*------------------------------------------------------------------------*/
  resizeBorder(){
    // Window resize scale number
    let blen  = Graphics.wSkinBorderUP.width;
    let cblen = Graphics.wSkinBorderUL.width + Graphics.wSkinBorderUR.height;
    let brmpr = [(this.width - cblen) / blen, (this.height - cblen) / blen]

    // Resize borders
    this.borderSpriteUP.scale.set(brmpr[0], 1);
    this.borderSpriteBT.scale.set(brmpr[0], 1);
    this.borderSpriteLT.scale.set(1, brmpr[1]);
    this.borderSpriteRT.scale.set(1, brmpr[1]);

    // Relocate borders
    this.borderSpriteUP.x = this.borderSpriteUL.width;
    this.borderSpriteUR.x = this.borderSpriteUP.x + this.borderSpriteUP.width;
    this.borderSpriteLT.y = this.borderSpriteUL.height;
    this.borderSpriteBL.y = this.borderSpriteLT.y + this.borderSpriteLT.height;
    this.borderSpriteBT.setPOS(this.borderSpriteUP.x, this.borderSpriteBL.y);
    this.borderSpriteBR.setPOS(this.borderSpriteUR.x, this.borderSpriteBL.y);
    this.borderSpriteRT.setPOS(this.borderSpriteUR.x, this.borderSpriteLT.y);
  }
  /**------------------------------------------------------------------------
   * Resize and Relocate cursor
   */
  resizeCursor(){
    let clen  = Graphics.wSkinCursorUP.width;
    let crect = this.cursorRect(0);
    let crmpr = [crect.width / clen, crect.height / clen]
    
    if(crmpr[0] < 1){crmpr[0] = 1;}
    if(crmpr[1] < 1){crmpr[1] = 1;}
    
    let offset = Graphics.wSkinCursorUL.width + Graphics.wSkinCursorUR.width
    this.cursorSprite.resize(crect.width + offset, crect.height + offset);
    this.cursorSpriteIX.scale.set(crmpr[0], crmpr[1]);
    this.cursorSpriteUP.scale.set(crmpr[0], 1);
    this.cursorSpriteBT.scale.set(crmpr[0], 1);
    this.cursorSpriteLT.scale.set(1, crmpr[1]);
    this.cursorSpriteRT.scale.set(1, crmpr[1]);

    this.cursorSpriteUP.x = this.cursorSpriteUL.width;
    this.cursorSpriteUR.x = this.cursorSpriteUP.x + this.cursorSpriteUP.width;
    this.cursorSpriteLT.y = this.cursorSpriteUL.height;
    this.cursorSpriteBL.y = this.cursorSpriteLT.y + this.cursorSpriteLT.height;
    this.cursorSpriteBT.setPOS(this.cursorSpriteUP.x, this.cursorSpriteBL.y);
    this.cursorSpriteBR.setPOS(this.cursorSpriteUR.x, this.cursorSpriteBL.y);
    this.cursorSpriteRT.setPOS(this.cursorSpriteUR.x, this.cursorSpriteLT.y);
  }
  /*------------------------------------------------------------------------*/
  resizeArrows(){
    let offset = [Graphics.wSkinArrowUP.width, Graphics.wSkinArrowUP.height];
    this.arrowUpSprite.setPOS((this.width - offset[0]) / 2, this.spacing);
    this.arrowLeftSprite.setPOS(this.spacing, (this.height - offset[0]) / 2);
    this.arrowDownSprite.setPOS(this.arrowUpSprite.x, this.height - this.spacing - offset[1])
    this.arrowRightSprite.setPOS(this.width - this.spacing - offset[1], this.arrowLeftSprite.y);
  }
  /*------------------------------------------------------------------------*/
  resizeButton(){
    this.buttonSprite.setPOS((this.width - this.spacing * 2) / 2, this.height - this.spacing * 2);
  }
  /**-------------------------------------------------------------------------
   * > Dispose window
   */
  dispose(){
    SceneManager.scene.removeWindow(this);
  }
  /**-------------------------------------------------------------------------
   * > Check whether window has been disposed
   */
  isDisposed(){
    return this.children.length == 0;
  }
  /**------------------------------------------------------------------------
   * Get index rect position, reserved.
   */
  getIndexItemPOS(index){
    return {x: 0, y: 0};
  }
}
/**
 * The window that provides selectable item and arrange
 * @class Window_Selectable
 * @extends Window_Base
 * @property {Array.<Object>} _selections - the available selections
 */
class Window_Selectable extends Window_Base{
  /**-------------------------------------------------------------------------
   * @constructor
   * @memberof Window_Selectable
   */
  constructor(x, y, w, h){
    super(x, y, w, h);
    this._active     = false;
    this._selections = [];
    this._index      = -1;
    this._handlers   = {};
    this.on('pointertap', this.onSelfTrigger.bind(this));
  }
  /**------------------------------------------------------------------------
   * Max item count in each row
   */
  get rowMax(){return 1;}
  /**------------------------------------------------------------------------
   * Max item count in each columnm
   */
  get colMax(){return -1;}
  /*------------------------------------------------------------------------*/
  get itemWidth(){
    return (this.contentWidth) / this.rowMax;
  }
  /**------------------------------------------------------------------------
   * Get item padding direction
   */
  get isHorizontal(){return this.rowMax == -1;}
  get isVertical(){return this.colMax == -1;}
  /**-------------------------------------------------------------------------
   * > Frame update
   * @memberof Window_Selectable
   */
  update(){
    super.update();
    this.checkMouseSelection();
  }
  /*------------------------------------------------------------------------*/
  checkMouseSelection(){
    if(this.index < 0){return ;}
    if(!Input.isMouseInArea(this.rect)){this.unselect();}
  }
  /*------------------------------------------------------------------------*/
  clear(){
    // Selection rows are often containers with their own children, so remove
    // them explicitly before clearing direct text objects.
    const selections = this._selections || [];
    const drawnObjects = new Set(this.drawnObjects || []);
    selections.forEach(function(item){
      if(!item || this.children.indexOf(item) < 0){return;}
      this.removeChild(item);
      // Text selections created by drawText are also in drawnObjects and are
      // destroyed by Window_Base.clear(). Destroying them here as well makes
      // PIXI try to remove their already-null event emitter a second time.
      if(!drawnObjects.has(item)){
        item.destroy?.({children: true});
      }
    }.bind(this));
    super.clear();
    this._selections = [];
    this._index = -1;
  }
  /*------------------------------------------------------------------------*/
  refresh(){
    super.refresh();
    this.syncChildrenProperties();
  }
  /*------------------------------------------------------------------------*/
  resize(w, h){
    super.resize(w, h);
    
  }
  /*------------------------------------------------------------------------*/
  get currentItem(){
    return this._selections[this._index];
  }
  /*------------------------------------------------------------------------*/
  get isCurrentItemEnabled(){
    return true;
  }
  /*------------------------------------------------------------------------*/
  getItemByIndex(i){
    return this._selections[i];
  }
  /*------------------------------------------------------------------------*/
  getItemBySymbol(symbol){
    for(let i in this._selections){
      let item = this._selections[i];
      if(!item){continue;}
      let sym = item.symbol
      if(symbol == sym){
        return item;
      }
    }
    return null;
  }
  /*------------------------------------------------------------------------*/
  onSelfTrigger(){
    if(this.index < 0){return ;}
    debug_log(getClassName(this) + " triggered index: " + this.index);
    if(this.isCurrentItemEnabled){
      Sound.playOK();
    }
    else{
      Sound.playBuzzer();
    }
  }
  /**-------------------------------------------------------------------------
   * > Activate to make selections interactable
   */
  activate(){
    super.activate();
    this.refresh();
    return this;
  }
  /**-------------------------------------------------------------------------
   * > Deactivate to make selections un-interactable
   */
  deactivate(){
    super.deactivate();
    this.refresh();
    return this;
  }
  /**------------------------------------------------------------------------
   * Add selection items to window
   * @param {...} item - the items to append, the handler should be
   *                           defined inside the item's EventListener
   */
  addSelection(){
    for(let i=0;i<arguments.length;++i){
      let item = arguments[i];
      let crect = this.cursorRect(this._selections.length);
      if(item){
        item._isSelection = true;
        item.setZ((item.z || 0) + this.patternSprite.z + 1);
        item._index = this._selections.length;
        item.hitArea = new Rect(0,0,this.itemWidth, this.itemHeight);
        item.hitArea.x = crect.x - item.x;
        item.hitArea.y = crect.y - item.y;
        item.on('pointerenter', this.onMouseover.bind(this, item));
        item.on('pointerleave', this.onMouseOut.bind(this, item));
        this.addChild(item);
      }
      this._selections.push(item);
    }
    this.refresh();
  }
  /*------------------------------------------------------------------------*/
  onMouseover(item){
    if(item._index == this.index){return ;}
    this.select(item._index);
  }
  /*------------------------------------------------------------------------*/
  onMouseOut(item){
    if(item._index == this.index){
      this.unselect();
    }
  }
  /*------------------------------------------------------------------------*/
  setHelpWindow(win){
    this.helpWindow = win;
  }
  /*------------------------------------------------------------------------*/
  swapSelectionAt(a, b){
    let ia = this._selections[a];
    let ib = this._selections[b];
    [ia._index, ib._index] = [ib._index, ia._index];
    [this._selections[a], this._selections[b]] = [this._selections[b], this._selections[a]];
  }
  /*------------------------------------------------------------------------*/
  select(idx, se = true){
    this._index = idx;
    if(idx >= 0){
      let crect = this.cursorRect(idx);
      this.cursorSprite.show();
      this.cursorSprite.setPOS(crect.x, crect.y);
      if(se){Sound.playCursor();}
    }
    else{this.cursorSprite.hide();}
    this.updateHelp();
  }
  /*------------------------------------------------------------------------*/
  updateHelp(){
    if(this.helpWindow){
      if(this._index >= 0){
        this.helpWindow.setText(this.currentItem.help || '');
      }else{this.helpWindow.setText('');}
    }
  }
  /*------------------------------------------------------------------------*/
  unselect(){
    this.select(-1);
  }
  /*------------------------------------------------------------------------*/
  setHandler(symbol, method){
    this._handlers[symbol] = method;
    for(let i=0;i<this._selections.length;++i){
      let item = this._selections[i];
      if(item && item.symbol == symbol){
        item.on('pointertap', method);
      }
    }
  }
  /**------------------------------------------------------------------------
   * Add pure text selection item
   * @param {Object} args - option object argument
   * @param {String} args.text - the text
   * @param {Object} [args.font=Graphics.DefaultFontSetting] - text font
   * @param {Number} [args.align=0] - text alignment, 0: left, 1: center, 2: right
   * @param {function} args.handler - the function to call when it's clicked
   * @param {String} args.symbol - symbol of the selection
   * @param {String} args.help   - the help message
   */
  addTextSelection(args){
    if(args.text !== '' && !args.text){
      throw new TypeError(String, args.text);
    }
    if(!args.font){args.font = Graphics.DefaultFontSetting;}
    args.align |= 0;

    let item = new PIXI.Text({text: args.text, style: args.font});
    if(args.handler){
      item.on('pointertap', args.handler);
    }
    let pos = this.nextItemPOS;
    if(args.align == 1){
      pos.x = Math.max((pos.x + this.itemWidth - item.width) / 2 + this.spacing, pos.x);
    }
    else if(args.align == 2){
      pos.x = Math.max((pos.x + this.itemWidth - item.width) , pos.x);
    }
    if(args.symbol){item.symbol = args.symbol;}
    item.help = args.help || '';
    item.setPOS(pos.x, pos.y + Math.max((this.itemHeight - item.height) / 2, 0));
    this.addSelection(item)
    return item;
  }
  /**------------------------------------------------------------------------
   * Get the position where next selection item should be
   */
  get nextItemPOS(){
    return this.getIndexItemPOS(this._selections.length);
  }
  /**------------------------------------------------------------------------
   * Get index of current selected item
   */
  get index(){return this._index;}
  /**------------------------------------------------------------------------
   * Get index rect position
   */
  getIndexItemPOS(index){
    let divmod = (this.isVertical ? this.rowMax : this.colMax)
    let nx = (index % divmod) * (this.itemWidth + this.spacing);
    let ny = (index / divmod) * (this.itemHeight + this.spacing);
    nx += this.padding / 2; ny += this.padding / 2;
    return {x: nx, y:ny};
  }
  /*------------------------------------------------------------------------*/
  cursorRect(index){
    let rect = super.cursorRect(index);
    if(this.isVertical){
      rect.width  = this.contentWidth / this.rowMax;
    }
    else{
      rect.height = this.contentHeight / this.colMax;
    }
    return rect;
  }
  /*------------------------------------------------------------------------*/
  get isWindow(){return true;}
  /*------------------------------------------------------------------------*/
}
/**
 * Menu window in title screen
 * @class
 * @extends Window_Selectable
 */
class Window_Menu extends Window_Selectable{
  /**-------------------------------------------------------------------------
   * @constructor
   */
  constructor(x, y, w, h){
    super(x, y, w, h);
    this.changeSkin(Graphics.WSkinCelestia)
    this.addAllSelections();
    // Fit the frame to the four menu rows instead of leaving an extra blank
    // row below the last button.
    this.resize(this.width, this.padding + this.itemHeight * 4 + this.spacing * 3);
  }
  /*------------------------------------------------------------------------*/
  addAllSelections(){
    this.addStartGame();
    this.addRules();
    this.addOptions();
    this.addCredits();
  }
    refreshLanguage(){
      const wasActive = this.isActive();
      const wasVisible = this.visible;

    // Keep the existing PIXI text objects and their event listeners. Replacing
    // the four menu items during a locale change can leave PIXI with stale
    // interaction targets, making the visible buttons stop responding.
    const labels = [Vocab.StartGame, Vocab.Rules, Vocab.Options, Vocab.Credits];
    this._selections.forEach(function(item, index){
      if(!item){return;}
      item.text = labels[index] || '';
      const startX = this.padding / 2;
      item.x = Math.max(
        (startX + this.itemWidth - item.width) / 2 + this.spacing,
        startX
      );
    }.bind(this));
    this.refresh();
    if(wasActive){this.activate();}else{this.deactivate();}
    if(wasVisible){this.show();}else{this.hide();}
  }
  /*------------------------------------------------------------------------*/
  addStartGame(){
    let opt = {
      text: Vocab.StartGame,
      align: 1,
      symbol: 'gameStart',
      handler: SceneManager.scene.onGameStart.bind(SceneManager.scene)
    }
    this.addTextSelection(opt);
  }
  /*------------------------------------------------------------------------*/
  addRules(){
    let opt = {
      text: Vocab.Rules,
      handler: this.onRules.bind(this),
      align: 1,
    }
    this.addTextSelection(opt);
  }
  /*------------------------------------------------------------------------*/
  addOptions(){
    let opt = {
      text: Vocab.Options,
      handler: this.onOption.bind(this),
      align: 1,
    }
    this.addTextSelection(opt);
  }
  /*------------------------------------------------------------------------*/
  addCredits(){
    let opt = {
      text: Vocab.Credits,
      handler: this.onCredits.bind(this),
      align: 1,
    }
    this.addTextSelection(opt);
  }
  /*------------------------------------------------------------------------*/
  onRules(){
    Sound.playOK();
    let okHandler = function(){
      Sound.playOK();

      const opened = window.open(new URL('rules', window.location.href).toString(), "_blank");
      if(!opened){window.alert(Vocab["PopupBlocked"] || "The browser blocked the new tab.");}
      SceneManager.scene.closeOverlay();
      if(!SceneManager._alwaysFocus){SceneManager.unfocusGame();}
      }
      let noHandler = function(){Sound.playCancel(); SceneManager.scene.closeOverlay();}
      // Give the message and the two actions more breathing room so the
      // confirmation frame does not feel cramped in smaller locales.
      let win = new Window_Confirm(0, 0, 420, 180, Vocab["RulesRedirect"]);
      win.messageKey = "RulesRedirect";
      win.setPOS(Graphics.appCenterWidth(win.width), Graphics.appCenterHeight(win.height));
    win.setHandler('yes', okHandler);
    win.setHandler('no', noHandler);
    win.raise();
  }
  /*------------------------------------------------------------------------*/
  onOption(){
    Sound.playOK();
    SceneManager.scene.raiseOverlay(Graphics.optionWindow);
  }
  /*------------------------------------------------------------------------*/
  onCredits(){
    Sound.playOK();
    let okHandler = function(){
      Sound.playOK();
      const opened = window.open(Vocab["CreditsLink"], "_blank");
      if(!opened){window.alert(Vocab["PopupBlocked"] || "The browser blocked the new tab.");}
      SceneManager.scene.closeOverlay();
      if(!SceneManager._alwaysFocus){SceneManager.unfocusGame();}
      }
      let noHandler = function(){
      Sound.playCancel();
      SceneManager.scene.closeOverlay();
      }
      let win = new Window_Confirm(0, 0, 420, 180, Vocab["CreditsRedirect"]);
      win.messageKey = "CreditsRedirect";
      win.setPOS(Graphics.appCenterWidth(win.width), Graphics.appCenterHeight(win.height));
    win.setHandler('yes', okHandler);
    win.setHandler('no', noHandler);
    win.raise();
  }
  /*------------------------------------------------------------------------*/
}
/**
 * Option window 
 * @class
 * @extends Window_Selectable
 */
class Window_Option extends Window_Selectable{
  /**-------------------------------------------------------------------------
   * @constructor
   */
  constructor(){
    super();
    this.resize(this.WindowWidth, this.WindowHeight);
    this.setPOS(Graphics.appCenterWidth(this.width), Graphics.appCenterHeight(this.height));
    this.drawTitle();
    // Keep two title rows clear: one replaces the old close-icon selection,
    // and one provides the requested extra breathing room below the title.
    this.addSelection(null);
    this.addSelection(null);
    this.addOptions();
    this.createHelpPanel();
    this.createHelpDivider();
    this.createExitButton();
    this.updateHelp();
  }
  /*------------------------------------------------------------------------*/
  // The left side contains controls; the right side contains contextual help.
  get WindowWidth(){return 920;}
  get WindowHeight(){return 400;}
  get optionPanelWidth(){return 600;}
  // Keep the left-side layout tied to one shared divider position so changing
  // the panel width also moves the rows, hover frame, and help panel together.
  get dividerX(){return this.optionPanelWidth + this.spacing / 2;}
  // Leave the same inset on both sides of the left panel.
  get itemWidth(){return this.dividerX - this.padding;}
  get cursorFrameOverflow(){
    return Graphics.wSkinCursorUL.width + Graphics.wSkinCursorUR.width;
  }
  get cursorFrameOverflowY(){
    return Graphics.wSkinCursorUL.height + Graphics.wSkinCursorUR.height;
  }
  get labelX(){return 4;}
  get valueX(){return 360;}
  get volumeBarX(){return 220;}
  get volumeValueX(){return 500;}
  get helpPanelX(){return this.dividerX + this.spacing / 2;}
  cursorRect(index){
    const rect = super.cursorRect(index);
    // The cursor skin grows beyond its content rect by its two corner widths.
    // Account for that overflow so the visible frame ends exactly at dividerX.
    rect.width = Math.max(0, this.itemWidth - this.cursorFrameOverflow);
    return rect;
  }
  /*------------------------------------------------------------------------*/
  drawTitle(){
    let font = clone(Graphics.DefaultFontSetting);
    font.fill = Graphics.color.MistyRose;
    font.fontSize = 28;
    let txt = this.drawText(0, 0, Vocab["Options"], font);
    txt.x = (this.dividerX - txt.width) / 2;
  }
  createHelpPanel(){
    this.helpWindow = new Window_Help(
      this.helpPanelX,
      0,
      this.width - this.helpPanelX - this.padding / 2,
      this.height
    );
    this.helpWindow.setZ(0x40).static = true;
    this.helpWindow.padding_top = 58;
    // The help text is part of the option window now, so its own skin would
    // create a second frame around the right-hand side.
    [
      this.helpWindow.indexSprite,
      this.helpWindow.patternSprite,
      ...(this.helpWindow.borderSprites || [])
    ].forEach(function(sprite){
      sprite.visible = false;
      sprite.renderable = false;
    });
    this.addChild(this.helpWindow);
  }
  createHelpDivider(){
    const divider = new PIXI.Graphics();
    divider
      .rect(this.dividerX, this.padding / 2, 2, this.height - this.padding)
      .fill({color: Graphics.color.Gold, alpha: 0.9});
    divider.setZ(0x50).static = true;
    this.helpDivider = divider;
    this.addChild(divider);
  }
  createExitButton(){
    const width = 136;
    const height = 40;
    const button = new SpriteCanvas(
      this.width - this.padding / 2 - width,
      this.height - this.padding / 2 - height,
      width,
      height
    );
    button.setZ(0x60).static = true;

    const background = new PIXI.Graphics();
    const drawBackground = function(active = false){
      background.clear()
        .roundRect(0, 0, width, height, 6)
        .fill({color: active ? 0x8b6837 : 0x76542e, alpha: 0.95})
        .stroke({width: 2, color: 0xffd36a, alpha: 0.95});
    };
    drawBackground();
    button.addChild(background);

    const font = clone(Graphics.DefaultFontSetting);
    font.fontSize = 20;
    const label = button.drawText(0, 0, Vocab["Exit"] || "Exit", font);
    label.x = Math.round((width - label.width) / 2);
    label.y = Math.round((height - label.height) / 2);

    button.on('pointertap', function(){
      Sound.playCancel();
      SceneManager.scene.closeOverlayAll();
    });
    button.on('pointerenter', function(){drawBackground(true);});
    button.on('pointerleave', function(){drawBackground(false);});
    this.exitButton = button;
    this.addChild(button);
  }
  updateHelp(){
    const text = this.index >= 0 && this.currentItem?.help
      ? this.currentItem.help
      : (Vocab["SystemOptionsHelp"] || "Adjust the system settings here.");
    this.helpWindow?.setText(text);
  }
  /*------------------------------------------------------------------------*/
  addOptions(){
    this.addLanguage();
    this.addMasterVolume();
    this.addBGMVolume();
    this.addSEVolume();
    this.addAlwaysFocus();
    this.addCanvasScale();
    this.addFullscreen();
  }
  /*------------------------------------------------------------------------*/
  isBattleScene(){
    const gameScene = globalThis.Scene_Game;
    const scene = SceneManager.scene;
    return !!(gameScene && scene instanceof gameScene);
  }
  /*------------------------------------------------------------------------*/
  refreshBattleOption(){
    if(this.isBattleScene()){
      this.addLeaveBattleOption();
    }
    else{
      this.removeLeaveBattleOption();
    }
    this.refresh();
    this.updateHelp();
  }
  /*------------------------------------------------------------------------*/
  addLeaveBattleOption(){
    if(this.leaveBattleSelection){return;}
    let pos = this.nextItemPOS;
    let sp = new SpriteCanvas(0, 0, this.itemWidth, this.itemHeight);
    this.drawItemText(sp, this.labelX, Vocab["LeaveBattle"]);
    sp.setPOS(pos.x, pos.y);
    sp.help = Vocab["HelpLeaveBattle"];
    let handler = function(){
      this.confirmLeaveBattle();
    }.bind(this);
    sp.on('pointertap', handler);
    this.leaveBattleSelection = sp;
    this.addSelection(sp);
  }
  /*------------------------------------------------------------------------*/
  removeLeaveBattleOption(){
    const item = this.leaveBattleSelection;
    if(!item){return;}
    const index = this._selections.indexOf(item);
    if(index >= 0){this._selections.splice(index, 1);}
    if(this.children.indexOf(item) >= 0){this.removeChild(item);}
    item.removeAllListeners?.();
    item.destroy?.({children: true});
    this.leaveBattleSelection = null;
    if(this._index >= this._selections.length){this.unselect();}
  }
  /*------------------------------------------------------------------------*/
  confirmLeaveBattle(){
    if(!this.isBattleScene()){return;}
    Sound.playOK();
    const gameScene = SceneManager.scene;
    const yesHandler = function(){
      Sound.playOK();
      gameScene.leaveBattle?.();
    };
    const noHandler = function(){
      Sound.playCancel();
      gameScene.closeOverlay();
    };
    const win = new Window_Confirm(0, 0, 460, 180, Vocab["LeaveBattleConfirm"]);
    win.messageKey = "LeaveBattleConfirm";
    win.setPOS(Graphics.appCenterWidth(win.width), Graphics.appCenterHeight(win.height));
    win.setHandler('yes', yesHandler);
    win.setHandler('no', noHandler);
    win.raise();
  }
  /**------------------------------------------------------------------------
   * Change the game language and keep Nuxt i18n in sync.
   */
  addLanguage(){
    let pos = this.nextItemPOS;
    let sp = new SpriteCanvas(0, 0, this.itemWidth, this.itemHeight);
    this.drawItemText(sp, this.labelX, Vocab["LanguageText"]);
    sp.setPOS(pos.x, pos.y);
    sp.help = Vocab["HelpLanguage"];
    let value = this.drawItemText(sp, this.valueX, this.languageText(DataManager.language));
    let changeLanguage = function(language){
      if(!this.isLanguageChangeAllowed()){
        Sound.playBuzzer();
        return;
      }
      this.closeLanguageDropdown();
      if(language === DataManager.language){return;}

      const request = ++languageChangeRequest;

      DataManager.changeSetting(DataManager.kLanguage, language);
      DataManager.loadLanguageFont();
      value.text = this.languageText(language);
      const setLocale = globalThis.__battlePunoSetLocale;
      const refreshLanguage = function(){
        if(request !== languageChangeRequest){return;}
        globalThis.__battlePunoRefreshLanguage?.();
      };
      if(setLocale){
        Promise.resolve(setLocale(language)).then(refreshLanguage, refreshLanguage);
      }
      else{
        refreshLanguage();
      }
    }.bind(this);
    let handler = function(){
      if(!this.isLanguageChangeAllowed()){
        Sound.playBuzzer();
        return;
      }
      if(!this.languageDropdown){
        this.languageDropdown = new Window_Selectable(
      this.x + this.valueX + this.padding / 2 - 50,
          this.y + pos.y + this.itemHeight,
          220,
          (this.itemHeight + this.spacing) * this.languageOptions.length + this.padding
        );
        this.languageDropdown.indexSprite.setOpacity(0.9);
        this.languageDropdown.patternSprite.setOpacity(0.9);

        this.languageOptions.forEach(function(language){
          this.languageDropdown.addTextSelection({
            text: this.languageText(language),
            align: 1,
            symbol: language,
            handler: function(){changeLanguage(language);}
          });
        }.bind(this));
        this.registerLanguageDropdownOutsideHandler();
      }
      SceneManager.scene.raiseOverlay(this.languageDropdown);
    }.bind(this);
    sp.on('pointertap', handler);
    this.addSelection(sp);
  }
  isLanguageChangeAllowed(){
    const gameScene = globalThis.Scene_Game;
    const scene = SceneManager.scene;
    return !(gameScene && scene instanceof gameScene);
  }
  closeLanguageDropdown(){
    this.removeLanguageDropdownOutsideHandler();
    if(SceneManager.scene?.overlay === this.languageDropdown){
      SceneManager.scene.closeOverlay();
    }
  }
  registerLanguageDropdownOutsideHandler(){
    if(this._languageDropdownOutsideHandler){return;}
    this._languageDropdownOutsideHandler = function(event){
      if(!this.languageDropdown || SceneManager.scene?.overlay !== this.languageDropdown){
        this.removeLanguageDropdownOutsideHandler();
        return;
      }

      const view = Graphics.app?.canvas;
      const rect = view?.getBoundingClientRect?.();
      if(!rect || rect.width <= 0 || rect.height <= 0){
        this.closeLanguageDropdown();
        return;
      }

      const point = Graphics.mapClientPosition(event.clientX, event.clientY);
      const x = point.x;
      const y = point.y;
      const boundsResult = this.languageDropdown.getBounds();
      const bounds = boundsResult.rectangle || boundsResult;
      const inside = x >= bounds.x && x <= bounds.x + bounds.width &&
        y >= bounds.y && y <= bounds.y + bounds.height;
      if(!inside){
        this.closeLanguageDropdown();
      }
    }.bind(this);
    document.addEventListener('pointerdown', this._languageDropdownOutsideHandler);
  }
  removeLanguageDropdownOutsideHandler(){
    if(!this._languageDropdownOutsideHandler){return;}
    document.removeEventListener('pointerdown', this._languageDropdownOutsideHandler);
    this._languageDropdownOutsideHandler = null;
  }
  disposeLanguageDropdown(){
    this.removeLanguageDropdownOutsideHandler();
    const dropdown = this.languageDropdown;
    if(!dropdown){return;}
    if(SceneManager.scene?.children?.indexOf(dropdown) >= 0){
      SceneManager.scene.removeChild(dropdown);
    }
    dropdown.removeAllListeners?.();
    dropdown.destroy?.({children: true});
    this.languageDropdown = null;
  }
  /*------------------------------------------------------------------------*/
  languageText(language){
    const labels = {
      en_us: "English",
      zh_tw: "繁體中文",
      zh_cn: "简体中文",
      fr_fr: "Français",
      ja_jp: "日本語",
      ko_kr: "한국어",
    };
    return labels[language] || labels.en_us;
  }
  get languageOptions(){
    return ["en_us", "zh_tw", "zh_cn", "fr_fr", "ja_jp", "ko_kr"];
  }
  /**------------------------------------------------------------------------
   * Draggable meter to adjust master volume
   */
  addMasterVolume(){
    let pos = this.nextItemPOS;
    let sp  = new SpriteCanvas(0, 0, this.itemWidth, this.itemHeight);
    this.drawItemText(sp, this.labelX, Vocab["MasterVolume"]);
    sp.setPOS(pos.x, pos.y);
    sp.help = Vocab["HelpMasterVolume"];

    let ts  = this.drawItemText(sp, this.volumeValueX, parseInt(Sound._masterVolume * 100));
    this.MVBar = new Sprite_DragBar(this.volumeBarX, (this.itemHeight - 30) / 2, 250, null, null, null, parseInt(Sound._masterVolume * 100));
    sp.addChild(this.MVBar);
    this.MVBar.handler = function(v){
      Sound.changeMasterVolume(v / 100.0);
      ts.text = parseInt(Sound._masterVolume * 100);
    }
    this.addSelection(sp);
  }
  /*------------------------------------------------------------------------*/
  addBGMVolume(){
    let pos = this.nextItemPOS;
    let sp  = new SpriteCanvas(0, 0, this.itemWidth, this.itemHeight);
    this.drawItemText(sp, this.labelX, Vocab["BGMVolume"]);
    sp.setPOS(pos.x, pos.y);
    sp.help = Vocab["HelpBGMVolume"];
    let ts  = this.drawItemText(sp, this.volumeValueX, parseInt(Sound._bgmVolume * 100));
    this.BVBar = new Sprite_DragBar(this.volumeBarX, (this.itemHeight - 30) / 2, 250, null, null, null, parseInt(Sound._bgmVolume * 100));
    sp.addChild(this.BVBar);
    this.BVBar.handler = function(v){
      Sound.changeBGMVolume(v / 100.0);
      ts.text = parseInt(Sound._bgmVolume * 100);
    }
    this.BVBar.changeColor(Graphics.color.Violet)
    this.addSelection(sp);
  }
  /*------------------------------------------------------------------------*/
  addSEVolume(){
    let pos = this.nextItemPOS;
    let sp  = new SpriteCanvas(0, 0, this.itemWidth, this.itemHeight);
    this.drawItemText(sp, this.labelX, Vocab["SEVolume"]);
    sp.setPOS(pos.x, pos.y);
    sp.help = Vocab["HelpSEVolume"];
    let ts  = this.drawItemText(sp, this.volumeValueX, parseInt(Sound._seVolume * 100));
    this.SVBar = new Sprite_DragBar(this.volumeBarX, (this.itemHeight - 30) / 2, 250, null, null, null, parseInt(Sound._seVolume * 100));
    sp.addChild(this.SVBar);
    this.SVBar.handler = function(v){
      Sound.changeSEVolume(v / 100.0);
      ts.text = parseInt(Sound._seVolume * 100);
    }
    this.SVBar.changeColor(Graphics.color.Orange)
    this.addSelection(sp);
  }
  /**------------------------------------------------------------------------
   * Whether enable extra cards(trade/wild chaos/discard all/wild hit),
   * default is enabled
   */
  addAlwaysFocus(){
    let pos = this.nextItemPOS;
    let sp = new SpriteCanvas(0, 0, this.itemWidth, this.itemHeight);
    this.drawItemText(sp, this.labelX, Vocab["AlwaysFocus"]);
    sp.setPOS(pos.x, pos.y);
    sp.help = Vocab["HelpAlwaysFocus"];
    let value = this.drawItemText(sp, this.valueX, DataManager.focus ? Vocab["Enable"] : Vocab["Disable"]);
    let handler = function(){
      let b = !!(DataManager.focus ^ true);
      DataManager.changeSetting(DataManager.kFocus, b);
      value.text = b ? Vocab["Enable"] : Vocab["Disable"];
      if(b){
        SceneManager.alwaysFocus();
      }
      else{
        SceneManager.autoFocus();
      }
    }
    sp.on('pointertap', handler);
    
    this.addSelection(sp);
  }
  /*------------------------------------------------------------------------*/
  addCanvasScale(){
    let pos = this.nextItemPOS;
    let sp = new SpriteCanvas(0, 0, this.itemWidth, this.itemHeight);
    this.drawItemText(sp, this.labelX, Vocab["CanvasScale"]);
    sp.setPOS(pos.x, pos.y);
    sp.help = Vocab["HelpCanvasScale"];
    let value = this.drawItemText(sp, this.valueX, this.canvasScaleText(DataManager.canvasScale));
    this.canvasScaleSelection = sp;
    this.canvasScaleValue = value;
    let handler = function(){
      if(Graphics.isFullscreen || Graphics.isMobileDevice){
        Sound.playBuzzer();
        return;
      }
      if(!this.canvasScaleDropdown){
        const options = this.canvasScaleOptions;
        this.canvasScaleDropdown = new Window_Selectable(
          this.x + this.valueX + this.padding / 2 - 50,
          this.y + pos.y + this.itemHeight,
          220,
          (this.itemHeight + this.spacing) * options.length + this.padding
        );
        this.canvasScaleDropdown.indexSprite.setOpacity(0.9);
        this.canvasScaleDropdown.patternSprite.setOpacity(0.9);

        options.forEach(function(mode){
          this.canvasScaleDropdown.addTextSelection({
            text: this.canvasScaleText(mode),
            align: 1,
            symbol: mode,
            handler: function(){
              if(Graphics.isFullscreen || Graphics.isMobileDevice){
                this.closeCanvasScaleDropdown();
                Sound.playBuzzer();
                return;
              }
              Graphics.changeCanvasScale(mode);
              value.text = this.canvasScaleText(mode);
              this.closeCanvasScaleDropdown();
              Sound.playOK();
            }.bind(this)
          });
        }.bind(this));
        this.registerCanvasScaleDropdownOutsideHandler();
      }
      SceneManager.scene.raiseOverlay(this.canvasScaleDropdown);
    }.bind(this);
    sp.on('pointertap', handler);
    this.addSelection(sp);
  }
  updateCanvasScaleState(){
    const locked = Graphics.isFullscreen || Graphics.isMobileDevice;
    if(locked && DataManager.canvasScale !== 'fit'){
      Graphics.changeCanvasScale('fit');
    }
    if(locked && this.canvasScaleDropdown){
      this.closeCanvasScaleDropdown();
    }
    if(this.canvasScaleValue){
      this.canvasScaleValue.text = this.canvasScaleText(DataManager.canvasScale);
      this.canvasScaleValue.tint = locked
        ? Graphics.color.DarkGray
        : Graphics.color.White;
    }
    if(this.canvasScaleSelection){
      this.canvasScaleSelection._disabled = locked;
      this.canvasScaleSelection.setOpacity(locked ? 0.55 : 1);
      if(this.index === this.canvasScaleSelection._index){
        this.unselect();
      }
      this.refresh();
    }
  }
  get canvasScaleOptions(){
    return ["fit", "0.75", "1", "1.25", "1.5", "2"];
  }
  closeCanvasScaleDropdown(){
    this.removeCanvasScaleDropdownOutsideHandler();
    if(SceneManager.scene?.overlay === this.canvasScaleDropdown){
      SceneManager.scene.closeOverlay();
    }
  }
  registerCanvasScaleDropdownOutsideHandler(){
    if(this._canvasScaleDropdownOutsideHandler){return;}
    this._canvasScaleDropdownOutsideHandler = function(event){
      if(!this.canvasScaleDropdown || SceneManager.scene?.overlay !== this.canvasScaleDropdown){
        this.removeCanvasScaleDropdownOutsideHandler();
        return;
      }

      const view = Graphics.app?.canvas;
      const rect = view?.getBoundingClientRect?.();
      if(!rect || rect.width <= 0 || rect.height <= 0){
        this.closeCanvasScaleDropdown();
        return;
      }

      const point = Graphics.mapClientPosition(event.clientX, event.clientY);
      const x = point.x;
      const y = point.y;
      const boundsResult = this.canvasScaleDropdown.getBounds();
      const bounds = boundsResult.rectangle || boundsResult;
      const inside = x >= bounds.x && x <= bounds.x + bounds.width &&
        y >= bounds.y && y <= bounds.y + bounds.height;
      if(!inside){
        this.closeCanvasScaleDropdown();
      }
    }.bind(this);
    document.addEventListener('pointerdown', this._canvasScaleDropdownOutsideHandler);
  }
  removeCanvasScaleDropdownOutsideHandler(){
    if(!this._canvasScaleDropdownOutsideHandler){return;}
    document.removeEventListener('pointerdown', this._canvasScaleDropdownOutsideHandler);
    this._canvasScaleDropdownOutsideHandler = null;
  }
  disposeCanvasScaleDropdown(){
    this.removeCanvasScaleDropdownOutsideHandler();
    const dropdown = this.canvasScaleDropdown;
    if(!dropdown){return;}
    if(SceneManager.scene?.children?.indexOf(dropdown) >= 0){
      SceneManager.scene.removeChild(dropdown);
    }
    dropdown.removeAllListeners?.();
    dropdown.destroy?.({children: true});
    this.canvasScaleDropdown = null;
  }
  /*------------------------------------------------------------------------*/
  canvasScaleText(mode){
    const labels = {
      fit: Vocab["CanvasFit"],
      "0.75": Vocab["Canvas75"],
      "1": Vocab["Canvas100"],
      "1.25": Vocab["Canvas125"],
      "1.5": Vocab["Canvas150"],
      "2": Vocab["Canvas200"],
    };
    return labels[mode] || labels.fit;
  }
  /*------------------------------------------------------------------------*/
  addFullscreen(){
    let pos = this.nextItemPOS;
    let sp = new SpriteCanvas(0, 0, this.itemWidth, this.itemHeight);
    this.drawItemText(sp, this.labelX, Vocab["Fullscreen"]);
    sp.setPOS(pos.x, pos.y);
    sp.help = Vocab["HelpFullscreen"];
    let value = this.drawItemText(sp, this.valueX, Graphics.isFullscreen ? Vocab["FullscreenEnable"] : Vocab["FullscreenDisable"]);
    let renderValue = function(){
      value.text = Graphics.isFullscreen ? Vocab["FullscreenEnable"] : Vocab["FullscreenDisable"];
      this.updateCanvasScaleState();
    }.bind(this);
    let update = function(){
      renderValue();
    };
    this._fullscreenUpdateHandler = update;
    document.addEventListener('fullscreenchange', this._fullscreenUpdateHandler);
    let toggling = false;
    let toggle = function(){
      if(toggling){return;}
      toggling = true;
      Promise.resolve(Graphics.toggleFullscreen()).then(function(success){
        if(!success){
          window.alert(Vocab["FullscreenError"] || "Fullscreen is unavailable or blocked by the browser.");
        }
      }).finally(function(){
        toggling = false;
        renderValue();
      });
    };
    // Pixi 8's federated pointer event covers mouse, touch and pen.
    sp.on('pointertap', toggle);
    this.addSelection(sp);
    renderValue();
  }
  /*------------------------------------------------------------------------*/
  removeFullscreenUpdateHandler(){
    if(!this._fullscreenUpdateHandler){return;}
    document.removeEventListener('fullscreenchange', this._fullscreenUpdateHandler);
    this._fullscreenUpdateHandler = null;
  }
  /*------------------------------------------------------------------------*/
  activate(){
    super.activate();
    this.MVBar.activate();
    this.BVBar.activate();
    this.SVBar.activate();
  }
  /*------------------------------------------------------------------------*/
  deactivate(){
    super.deactivate();
    this.MVBar.deactivate();
    this.BVBar.deactivate();
    this.SVBar.deactivate();
  }
  /*------------------------------------------------------------------------*/
}

/**
 * Window that displays help message
 */
class Window_Help extends Window_Base{
  /*------------------------------------------------------------------------*/
  constructor(x, y, w, h){
    super(x, y, w, h);
    this.message = '';
    this.font = clone(Graphics.DefaultFontSetting);
    this.padding_left = 0;
    this.padding_top = 0;
    this.autoWidth = false;
    this.autoWidthMin = null;
    this.autoWidthMax = null;
    this.autoHeight = false;
    this.autoHeightBottom = null;
    this.autoHeightMin = null;
    this.autoHeightMax = null;
  }
  /*------------------------------------------------------------------------*/
  setText(...args){
    const text = args.map(function(value){
      return value == null ? '' : String(value);
    }).join('');

    if(this.autoWidth){
      const lines = text.split(/[\r\n]/);
      const widest = lines.reduce((width, line) => {
        return Math.max(width, new PIXI.Text({text: line, style: this.font}).width);
      }, 0);
      const minWidth = this.autoWidthMin == null ? 1 : this.autoWidthMin;
      const maxWidth = this.autoWidthMax == null ? 4096 : this.autoWidthMax;
      const wantedWidth = Math.ceil(widest + this.padding + this.padding_left + this.spacing);
      this.resize(Math.min(maxWidth, Math.max(minWidth, wantedWidth)), this.height);
    }

    // Preserve explicit line breaks and wrap each line only once. Re-wrapping
    // the full string would split already separated card-help sentences.
    const wrapped = text
      .split(/[\r\n]/)
      .map(line => this.textWrap(line, this.font) || '')
      .join('\n');
    if(this.autoHeight){
      const measured = new PIXI.Text({text: wrapped, style: this.font});
      const minHeight = this.autoHeightMin == null
        ? this.itemHeight + this.padding
        : this.autoHeightMin;
      const wantedHeight = Math.ceil(measured.height + this.padding);
      let height = Math.max(minHeight, wantedHeight);
      if(this.autoHeightMax != null){
        height = Math.min(height, this.autoHeightMax);
      }
      this.resize(this.width, height);
      if(this.autoHeightBottom != null){
        this.y = this.autoHeightBottom - this.height;
      }
    }
    this.clear();
    this.message = text;
    let dy = this.padding_top;
    if(text){
      dy += this.drawText(this.padding_left, dy, wrapped, this.font, false).height;
    }
  }
  /*------------------------------------------------------------------------*/
}
/**------------------------------------------------------------------------
 *  Window as back button
 */
class Window_Back extends Window_Selectable{
  /*------------------------------------------------------------------------*/
  constructor(x, y, handler, txt = Vocab["Back"]){
    super(x, y, 80, 50);
    this.handler = handler;
    this.changeSkin(Graphics.WSkinPinkie);
    this.addBackSelection(txt);
    this.activate();
  }
  /*------------------------------------------------------------------------*/
  addBackSelection(txt){
    this.backSprite = this.addTextSelection({
      text: txt,
      align: 2,
      handler: this.handler,
      symbol: 'back'
    });
    this.backSprite.setPOS((this.width - this.backSprite.width)/2, (this.height - this.backSprite.height)/2);
  }
  /*------------------------------------------------------------------------*/
  applyPrimaryButtonStyle(width = 220, height = this.itemHeight, fontSize = 20){
    if(this.primaryButtonBackground){return this;}
    this.primaryButtonStyle = true;
    this.resize(width, height);

    [
      this.indexSprite,
      this.patternSprite,
      this.buttonSprite,
      this.cursorSprite,
      ...(this.borderSprites || []),
      ...(this.arrowSprites || []),
    ].forEach(function(sprite){
      if(!sprite){return;}
      sprite.visible = false;
      sprite.renderable = false;
    });

    const background = new PIXI.Graphics();
    const drawBackground = function(active = false){
      background.clear()
        .roundRect(0, 0, this.width, this.height, 6)
        .fill({color: active ? 0x405d7c : 0x27364e, alpha: 0.95})
        .stroke({width: 2, color: 0xb2c9e4, alpha: 0.95});
    }.bind(this);
    background.setZ(1.5).static = true;
    background.eventMode = 'none';
    drawBackground();
    this.primaryButtonBackground = background;
    this.addChild(background);

    this.backSprite.setZ(2);
    this.backSprite.tint = 0xffffff;
    // Match the Start Game button label size after replacing the default
    // Back window skin.
    this.backSprite.style.fontSize = fontSize;
    this.backSprite.setPOS(
      (this.width - this.backSprite.width) / 2,
      (this.height - this.backSprite.height) / 2
    );
    this.backSprite.hitArea = new Rect(
      -this.backSprite.x,
      -this.backSprite.y,
      this.width,
      this.height
    );
    this.backSprite.on('pointerenter', function(){drawBackground(true);});
    this.backSprite.on('pointerleave', function(){drawBackground(false);});
    return this;
  }
  /*------------------------------------------------------------------------*/
  onSelfTrigger(){
    if(this.index < 0){return ;}
    if(this.isCurrentItemEnabled){
      Sound.playCancel();
    }
    else{
      Sound.playBuzzer();
    }
  }
  /*------------------------------------------------------------------------*/
}
/**------------------------------------------------------------------------
 * A confirm window works like window.confirm, should be called as overlay
 */
class Window_Confirm extends Window_Selectable{
  /**------------------------------------------------------------------------
   * @constructor
   * @param {Number} x
   * @param {Number} y
   * @param {Number} w
   * @param {Number} h
   * @param {String} message - the message to display when raised
   */
  constructor(x, y, w, h, message, yesText=null, noText=null){
    super(x, y, w, h);
    this.value = undefined;
    this.yesHandler = undefined;
    this.noHandler  = undefined;
    this.customActionText = yesText != null || noText != null;
    this.yesText = yesText || Vocab["Yes"];
    this.noText = noText || Vocab["Cancel"];
    this.drawMessage(message);
    this.changeSkin(Graphics.WSkinRD);
    this.createOptions();
    this.resizeCursor();
    this.activate();
  }
  /**------------------------------------------------------------------------
   * Max item count in each row
   */
  get rowMax(){return 2;}
  /*------------------------------------------------------------------------*/
  raise(){
    this.render();
    SceneManager.scene.raiseOverlay(this);
  }
  /*------------------------------------------------------------------------*/
  drawMessage(msg){
    this.messageSprite = this.drawText(0, 0, msg, null, true);
  }
  /*------------------------------------------------------------------------*/
  get itemWidth(){
    if(!this.yesSprite){return super.itemWidth}
    return this.width / 5;
  }
  /*------------------------------------------------------------------------*/
  cursorRect(index){
    if(!this.yesSprite){return super.cursorRect(index);}
    const sprite = index == 0 ? this.yesSprite : this.noSprite;
    const centerX = sprite.x + sprite.width / 2;
    const centerY = sprite.y + sprite.height / 2;
    const frameWidth = this.itemWidth + this.cursorFrameOverflowX;
    const frameHeight = this.itemHeight + this.cursorFrameOverflowY;
    return new Rect(
      centerX - frameWidth / 2,
      centerY - frameHeight / 2,
      this.itemWidth,
      this.itemHeight
    );
  }
  /*------------------------------------------------------------------------*/
  createOptions(){
    this.yesSprite = this.drawText(0, 0, this.yesText);
    this.noSprite  = this.drawText(0, 0, this.noText)
    this.positionOptions();
    this.yesSprite.symbol = 'yes';
    this.noSprite.symbol  = 'no';
    this.addSelection(this.yesSprite);
    this.addSelection(this.noSprite);
  }
  /*------------------------------------------------------------------------*/
  positionOptions(){
    if(!this.yesSprite || !this.noSprite){return;}
    const buttonWidth = this.itemWidth;
    const centerX = this.width / 2;
    const yesCenterX = centerX - buttonWidth / 2;
    const noCenterX = centerX + buttonWidth / 2;
    const groupHeight = Math.max(this.yesSprite.height, this.noSprite.height);
    const frameHeight = this.itemHeight + this.cursorFrameOverflowY;
    const frameY = this.height - this.padding / 2 - frameHeight;
    const groupY = frameY + (frameHeight - groupHeight) / 2;
    this.yesSprite.setPOS(yesCenterX - this.yesSprite.width / 2, groupY);
    this.noSprite.setPOS(noCenterX - this.noSprite.width / 2, groupY);
  }
  /*------------------------------------------------------------------------*/
  get cursorFrameOverflowX(){
    return Graphics.wSkinCursorUL.width + Graphics.wSkinCursorUR.width;
  }
  get cursorFrameOverflowY(){
    return Graphics.wSkinCursorUL.height + Graphics.wSkinCursorUR.height;
  }
  /*------------------------------------------------------------------------*/
  refreshLanguage(){
    if(this.messageKey && this.messageSprite){
      this.messageSprite.text = this.textWrap(Vocab[this.messageKey]);
    }
    if(this.yesSprite){this.yesSprite.text = this.customActionText ? this.yesText : Vocab.Yes;}
    if(this.noSprite){this.noSprite.text = this.customActionText ? this.noText : Vocab.Cancel;}
    this.positionOptions();
    this.resizeCursor();
  }
  /*------------------------------------------------------------------------*/
}
/**------------------------------------------------------------------------
 *  Window for selecting game mode 
 */
class Window_GameModeSelect extends Window_Selectable{
    /*------------------------------------------------------------------------*/
    constructor(x, y, w, h){
      super(x, y, w, h);
      this.kTraditional = "traditional";
      this.kBattlepuno  = "battlepuno";
      this.kDeathMatch  = "deathmatch";
      this.kTimed       = "timed";
      this._hoveredModeItem = null;
      this._modeStateSprites = [];
      this._activeMode = GameManager.gameMode;
      this.drawTitle();
      this.changeSkin(Graphics.WSkinLuna)
      this.useTranslucentBlackBackground();
      this.createSelections();
      this.fitModeWindowHeight();
      this.removeModeCursor();
      this.selectMode(GameManager.gameMode, false);
    }
    /*------------------------------------------------------------------------*/
    removeModeCursor(){
      const cursor = this.cursorSprite;
      if(!cursor){return;}
      if(this.children.indexOf(cursor) >= 0){
        this.removeChild(cursor);
      }
      cursor.destroy?.({children: true});
      this.cursorSprite = null;
    }
    /*------------------------------------------------------------------------*/
    resizeCursor(){
      // The mode pane uses custom state graphics instead of the shared cursor.
      if(!this.cursorSprite){return;}
      super.resizeCursor();
    }
    /*------------------------------------------------------------------------*/
    updateCursor(){
      // There is no cursor sprite to animate in the mode pane.
    }
    /*------------------------------------------------------------------------*/
    drawTitle(){
      let font = clone(Graphics.DefaultFontSetting);
      font.fill = Graphics.color["SlateBlue"];
      font.fontSize = 28;
      this.titleSprite = this.drawText(0, 4, Vocab["GameMode"], font);
      this.titleSprite.x = (this.width - this.titleSprite.width) / 2;
      this.addSelection(null);
    }
    /*------------------------------------------------------------------------*/
  createSelections(){
    this.addTraditionalSelection();
    this.addBattlePunoSelection();
    this.addDeathMatchSelection();
    this.addTimedSelection();
  }
  /*------------------------------------------------------------------------*/
  fitModeWindowHeight(){
    let lastItem = null;
    for(let i = this._selections.length - 1; i >= 0; --i){
      if(this._selections[i]){
        lastItem = this._selections[i];
        break;
      }
    }
    if(!lastItem){return;}

    const pos = this.getIndexItemPOS(lastItem._index);
    const frameBottom = pos.y + this.itemHeight + this.cursorFrameOverflowY / 2;
    const height = Math.ceil(frameBottom + this.padding / 2);
    this.resize(this.width, Math.max(this.padding + this.itemHeight, height));
    // The translucent layer was drawn using the old window height.
    this.useTranslucentBlackBackground();
  }
  refreshLanguage(){
    const wasActive = this.isActive();
    const wasVisible = this.visible;
    this._hoveredModeItem = null;
    this._activeMode = GameManager.gameMode;
    this.clear();
    this._modeStateSprites = [];
    this.drawTitle();
    this.createSelections();
    this.fitModeWindowHeight();
    this.selectMode(GameManager.gameMode, false);
    if(wasActive){this.activate();}else{this.deactivate();}
    if(wasVisible){this.show();}else{this.hide();}
    this.showDefaultHelp();
  }
    /*------------------------------------------------------------------------*/
    onMouseover(item){
      const mode = this.modeForItem(item);
      if(mode != null){
        this._hoveredModeItem = item;
        this.helpWindow?.setText(item.help || this.defaultHelpText());
        this.updateModeStyles();
      }
    }
    /*------------------------------------------------------------------------*/
    onMouseOut(item){
      if(this._hoveredModeItem === item){
        this._hoveredModeItem = null;
        this.showDefaultHelp();
        this.updateModeStyles();
      }
    }
    /*------------------------------------------------------------------------*/
    checkMouseSelection(){
      // The clicked mode remains active even when the pointer leaves the window.
    }
    /*------------------------------------------------------------------------*/
    select(index, se = true){
      this._index = index;
      if(index >= 0 && se){Sound.playCursor();}
      this.updateHelp();
      this.updateModeStyles();
    }
    /*------------------------------------------------------------------------*/
    updateHelp(){
      if(this._hoveredModeItem){
        this.helpWindow?.setText(this._hoveredModeItem.help || this.defaultHelpText());
      }
      else{
        this.showDefaultHelp();
      }
    }
    /*------------------------------------------------------------------------*/
    defaultHelpText(){
      return Vocab["GameModeHelp"] || Vocab["HelpStartGame"] || "Select a game mode.";
    }
    /*------------------------------------------------------------------------*/
    showDefaultHelp(){
      this.helpWindow?.setText(this.defaultHelpText());
    }
    /*------------------------------------------------------------------------*/
    bindModeClick(item){
      this.centerModeText(item);
      const selectOnClick = () => {
        this._activeMode = this.modeForItem(item);
        this.select(item._index, false);
      };
      item.on('pointertap', selectOnClick);
      this.createModeStateSprite(item);
    }
    /*------------------------------------------------------------------------*/
    centerModeText(item){
      if(!item){return;}
      const rect = this.cursorRect(item._index);
      // Center the text object itself instead of relying on its font's
      // top-left metrics, which makes CJK glyphs appear low in the frame.
      item.anchor.set(0, 0.5);
      item.y = rect.y + this.itemHeight / 2;
      if(item.hitArea){
        item.hitArea.y = rect.y - item.y;
      }
    }
    /*------------------------------------------------------------------------*/
    createModeStateSprite(item){
      const state = new PIXI.Graphics();
      const rect = this.cursorRect(item._index);
      state.position.set(rect.x, rect.y);
      state.zIndex = (this.patternSprite?.z || 1) + 0.5;
      state.eventMode = 'none';
      this._modeStateSprites.push({item: item, sprite: state});
      this.drawnObjects.push(state);
      this.addChild(state);
    }
    /*------------------------------------------------------------------------*/
    refresh(){
      super.refresh();
      this.updateModeStyles();
    }
    /*------------------------------------------------------------------------*/
    updateModeStyles(){
      if(!this._modeStateSprites){return;}
      this._modeStateSprites.forEach(function(entry){
        const item = entry.item;
        const state = entry.sprite;
        if(!item || !state || item._destroyed){return;}

        const isActive = this.modeForItem(item) === this._activeMode;
        const isHovered = item === this._hoveredModeItem;
        const rect = this.cursorRect(item._index);
        state.position.set(rect.x, rect.y);
        state.clear();

        if(!isActive && !isHovered){
          state.visible = false;
          item.tint = 0xffffff;
          return;
        }

        let fill = 0x4b79a8;
        let fillAlpha = 0.28;
        let border = 0x8fe8ff;
        let textTint = 0xfff4b0;
        if(isActive && !isHovered){
          fill = 0x76542e;
          fillAlpha = 0.52;
          border = 0xffd36a;
          textTint = 0xffff8a;
        }
        else if(isActive && isHovered){
          fill = 0x8a6732;
          fillAlpha = 0.62;
          border = 0xfff0a0;
          textTint = 0xffffd0;
        }

        state
          .roundRect(0, 0, this.itemWidth, this.itemHeight, 8)
          .fill({color: fill, alpha: fillAlpha})
          .stroke({width: 2, color: border, alpha: 0.9});
        state.visible = true;
        item.tint = textTint;
      }.bind(this));
    }
    /*------------------------------------------------------------------------*/
    selectMode(mode, se = false){
      this._activeMode = mode;
      const symbols = {
        [Mode.TRADITIONAL]: this.kTraditional,
        [Mode.BATTLE_PUNO]: this.kBattlepuno,
        [Mode.DEATH_MATCH]: this.kDeathMatch,
        [Mode.TIMED]: this.kTimed,
      };
      const item = this.getItemBySymbol(symbols[mode]);
      if(item){this.select(item._index, se);}
    }
    /*------------------------------------------------------------------------*/
    modeForItem(item){
      const modes = {
        [this.kTraditional]: Mode.TRADITIONAL,
        [this.kBattlepuno]: Mode.BATTLE_PUNO,
        [this.kDeathMatch]: Mode.DEATH_MATCH,
        [this.kTimed]: Mode.TIMED,
      };
      return modes[item?.symbol];
    }
    /*------------------------------------------------------------------------*/
    addTraditionalSelection(){
      let opt = {
        text: Vocab["GameModeTraditional"],
        symbol: this.kTraditional,
        align: 1,
        help: Vocab["HelpTraditional"]
      }
      this.addSelection(null);
    const item = this.addTextSelection(opt);
    this.bindModeClick(item);
    }
    /*------------------------------------------------------------------------*/
    addBattlePunoSelection(){
      let opt = {
        text: Vocab["GameModeBattlePuno"],
        symbol: this.kBattlepuno,
        align: 1,
        help: Vocab["HelpBattlePuno"]
      }
      this.addSelection(null);
    const item = this.addTextSelection(opt);
    this.bindModeClick(item);
    }
    /*------------------------------------------------------------------------*/
    addDeathMatchSelection(){
      let opt = {
        text: Vocab["GameModeDeathMatch"],
        symbol: this.kDeathMatch,
        align: 1,
        help: Vocab["HelpDeathMatch"]
      }
      this.addSelection(null);
    const item = this.addTextSelection(opt);
    this.bindModeClick(item);
    }
    /*------------------------------------------------------------------------*/
    addTimedSelection(){
      let opt = {
        text: Vocab["GameModeTimed"],
        symbol: this.kTimed,
        align: 1,
        help: Vocab["HelpTimed"]
      }
      this.addSelection(null);
      const item = this.addTextSelection(opt);
      this.bindModeClick(item);
    }
    /*------------------------------------------------------------------------*/
}
/**------------------------------------------------------------------------
 *  Window for custom in-game options
 */
class Window_GameOption extends Window_Selectable{
  /*------------------------------------------------------------------------*/
  constructor(x, y, w, h){
    super(x, y, w, h);
    this.mode = GameManager.gameMode;
    this.eventMode = 'static';
    this.optionTouchScrolling = false;
    this.optionTouchPointerId = null;
    this.optionTouchLastY = 0;
    this.optionTouchStartY = 0;
    this.optionTouchMoved = false;
    this.on('pointerdown', this.onOptionTouchStart.bind(this));
    this.on('pointermove', this.onOptionTouchMove.bind(this));
    this.on('globalpointermove', this.onOptionTouchMove.bind(this));
    this.on('pointerup', this.onOptionTouchEnd.bind(this));
    this.on('pointerupoutside', this.onOptionTouchEnd.bind(this));
    this.on('pointercancel', this.onOptionTouchEnd.bind(this));
    this.changeSkin(Graphics.WSkinRarity)
    this.useTranslucentBlackBackground();
    this.createOptionViewportMask();
    this.createOptionViewportLines();
    this.createOptionScrollbar();
    this.drawTitle();
    this.createOptions();
    this.refreshOptionScrollbar();
  }
  /*------------------------------------------------------------------------*/
  onOptionTouchStart(event){
    if(!this.isActive() || event.pointerType === 'mouse') {return;}
    if(this.optionScrollbarDragging || event.target === this.optionScrollbarThumb){return;}
    const metrics = this.optionScrollbarMetrics;
    if(!metrics?.visible || metrics.maxScroll <= 0){return;}
    const point = event.getLocalPosition(this);
    if(point.y < this.optionTop || point.y > this.optionBottom){return;}
    this.optionTouchScrolling = true;
    this.optionTouchPointerId = event.pointerId;
    this.optionTouchLastY = point.y;
    this.optionTouchStartY = point.y;
    this.optionTouchMoved = false;
  }
  /*------------------------------------------------------------------------*/
  onOptionTouchMove(event){
    if(!this.optionTouchScrolling || event.pointerId !== this.optionTouchPointerId){return;}
    const point = event.getLocalPosition(this);
    const delta = point.y - this.optionTouchLastY;
    if(!this.optionTouchMoved && Math.abs(point.y - this.optionTouchStartY) >= 6){
      this.optionTouchMoved = true;
    }
    if(delta !== 0){
      this.scrollOptions(-delta);
      this.optionTouchLastY = point.y;
      event.stopPropagation?.();
      event.preventDefault?.();
    }
  }
  /*------------------------------------------------------------------------*/
  onOptionTouchEnd(event){
    if(!this.optionTouchScrolling || event.pointerId !== this.optionTouchPointerId){return;}
    this.optionTouchScrolling = false;
    this.optionTouchPointerId = null;
    this.optionTouchLastY = 0;
    this.optionTouchStartY = 0;
    this.optionTouchMoved = false;
  }
  /*------------------------------------------------------------------------*/
  createOptionViewportMask(){
    const mask = new PIXI.Graphics();
    mask
      .rect(
        0,
        this.optionTop,
        this.width,
        Math.max(0, this.optionBottom - this.optionTop)
      )
      .fill(Graphics.color.White);
    mask.static = true;
    this.optionViewportMask = mask;
    this.addChild(mask);
    if(this.cursorSprite){
      this.cursorSprite.mask = mask;
    }
  }
  /*------------------------------------------------------------------------*/
  createOptionViewportLines(){
    const lines = new PIXI.Graphics();
    lines
      .rect(0, this.optionTop, this.width, 2)
      .rect(0, this.optionBottom, this.width, 2)
      .fill({color: Graphics.color.Gold, alpha: 0.8});
    lines.setZ(4).static = true;
    lines.eventMode = 'none';
    this.optionViewportLines = lines;
    this.addChild(lines);
  }
  /*------------------------------------------------------------------------*/
  createOptionScrollbar(){
    const track = new PIXI.Graphics();
    const thumb = new PIXI.Graphics();
    track.setZ(5).static = true;
    thumb.setZ(6).static = true;
    track.eventMode = 'none';
    thumb.eventMode = 'static';
    thumb.on('pointerdown', this.onOptionScrollbarDragStart.bind(this));
    thumb.on('pointerup', this.onOptionScrollbarDragEnd.bind(this));
    thumb.on('pointerupoutside', this.onOptionScrollbarDragEnd.bind(this));
    thumb.on('pointercancel', this.onOptionScrollbarDragEnd.bind(this));
    thumb.on('globalpointermove', this.onOptionScrollbarDragMove.bind(this));
    // Prevent clicking the thumb from triggering the currently selected row.
    thumb.on('pointertap', function(event){event.stopPropagation?.();});
    this.optionScrollbarDragging = false;
    this.optionScrollbarDragOffset = 0;
    this.optionScrollbarTrack = track;
    this.optionScrollbarThumb = thumb;
    this.addChild(track);
    this.addChild(thumb);
  }
  /*------------------------------------------------------------------------*/
  onOptionScrollbarDragStart(event){
    const metrics = this.optionScrollbarMetrics;
    if(!metrics?.visible || metrics.thumbTravel <= 0){return;}
    const point = event.getLocalPosition(this);
    this.optionScrollbarDragging = true;
    this.optionScrollbarDragOffset = point.y - metrics.thumbY;
    event.stopPropagation?.();
  }
  /*------------------------------------------------------------------------*/
  onOptionScrollbarDragEnd(event){
    this.optionScrollbarDragging = false;
    this.optionScrollbarDragOffset = 0;
    event.stopPropagation?.();
  }
  /*------------------------------------------------------------------------*/
  onOptionScrollbarDragMove(event){
    if(!this.optionScrollbarDragging){return;}
    const metrics = this.optionScrollbarMetrics;
    if(!metrics?.visible || metrics.thumbTravel <= 0){return;}
    const point = event.getLocalPosition(this);
    const thumbY = Math.min(
      metrics.trackTop + metrics.thumbTravel,
      Math.max(metrics.trackTop, point.y - this.optionScrollbarDragOffset)
    );
    const ratio = (thumbY - metrics.trackTop) / metrics.thumbTravel;
    const next = ratio * metrics.maxScroll;
    this.setDisplayOrigin(0, next);
    this.syncCursorToDisplay();
    this.refreshOptionScrollbar();
    event.stopPropagation?.();
  }
  /*------------------------------------------------------------------------*/
  get optionContentBottom(){
    let bottom = this.optionTop;
    for(let i = 0; i < this._selections.length; ++i){
      const item = this._selections[i];
      if(!item){continue;}
      // cursorRect is intentionally shifted upward to center the hover frame
      // around a row. It is not the row's real content position, so using it
      // here under-counts the last row and lets the bottom mask cover it.
      const pos = this.getIndexItemPOS(i);
      bottom = Math.max(bottom, pos.y + this.itemHeight);
    }
    return bottom;
  }
  /*------------------------------------------------------------------------*/
  refreshOptionScrollbar(){
    const track = this.optionScrollbarTrack;
    const thumb = this.optionScrollbarThumb;
    if(!track || !thumb){return;}

    const trackWidth = 10;
    const trackTop = this.optionTop + 4;
    const trackBottom = this.optionBottom - 4;
    const trackHeight = Math.max(0, trackBottom - trackTop);
    const viewportHeight = Math.max(0, this.optionBottom - this.optionTop);
    const maxScroll = this.maxScrollY;
    const contentHeight = Math.max(
      viewportHeight,
      this.optionContentBottom - this.optionTop + this.optionBottomGap
    );
    const thumbHeight = Math.min(
      trackHeight,
      Math.max(28, trackHeight * viewportHeight / contentHeight)
    );
    const thumbTravel = Math.max(0, trackHeight - thumbHeight);
    const thumbY = trackTop + (
      maxScroll > 0 ? thumbTravel * this.oy / maxScroll : 0
    );
    const x = this.width - this.padding / 2 - trackWidth;
    const visible = maxScroll > 0 && trackHeight > 0;

    this.optionScrollbarMetrics = {
      trackTop,
      trackHeight,
      thumbHeight,
      thumbTravel,
      thumbY,
      maxScroll,
      visible,
    };

    track.clear();
    thumb.clear();
    if(visible){
      track
        .roundRect(x, trackTop, trackWidth, trackHeight, 3)
        .fill({color: Graphics.color.Black, alpha: 0.72})
        .stroke({width: 1, color: Graphics.color.White, alpha: 0.35});
      thumb
        .roundRect(x, thumbY, trackWidth, thumbHeight, 3)
        .fill({color: Graphics.color.Gold, alpha: 0.95})
        .stroke({width: 1, color: Graphics.color.White, alpha: 0.9});
    }
    // Make the drag target wider than the visible bar, with extra room on
    // the left side where the option buttons end.
    const hitPaddingLeft = 0;
    const hitPaddingRight = 10;
    thumb.hitArea = new Rect(
      x - hitPaddingLeft,
      thumbY,
      trackWidth + hitPaddingLeft + hitPaddingRight,
      thumbHeight
    );
    track.visible = visible;
    thumb.visible = visible;
  }
  /*------------------------------------------------------------------------*/
  drawTitle(){
    let font = clone(Graphics.DefaultFontSetting);
    font.fill = Graphics.color["MediumSeaGreen"];
    font.fontSize = 28;
    const modeText = this.mode === Mode.TRADITIONAL ? Vocab["GameModeTraditional"]
      : this.mode === Mode.DEATH_MATCH ? Vocab["GameModeDeathMatch"]
      : this.mode === Mode.TIMED ? Vocab["GameModeTimed"]
      : Vocab["GameModeBattlePuno"];
    let ts = this.drawText(0, 4, `${Vocab["GameOptions"]} - ${modeText}`, font);
    ts.x = (this.width - ts.width) / 2;
    ts.static = true;
    this.titleSprite = ts;
  }
  /**------------------------------------------------------------------------
   * Create all available options
   */
  createOptions(){
    this.addPlayerNameOption();
    this.addAINamesOption();
    this.addExtraCardOption();
    this.addTradeCardOption();
    this.addDrawTwoStackingOption();
    this.addDrawFourStackingOption();
    this.addDrawTwoFourStackingOption();
    this.addPenaltyTransferOption();
    if(this.mode !== Mode.TIMED){
      this.addUnoPenaltyOption();
    }
    if(this.mode !== Mode.TIMED){
      this.addDeckSizeOption();
    }
    this.addDrawUntilPlayableOption();
    this.addHandCardOption();
    if(this.mode === Mode.TIMED){
      this.addTimedDurationOption();
      this.addTimedTurnSecondsOption();
    }
    else if(this.mode !== Mode.TRADITIONAL){
      this.addHPOption();
      this.addScoreGoalOption();
    }
    this.addStartGameOption();
  }
  refreshForMode(mode){
    if(this.nameModeDropdown){this.closeNameModeDropdown();}
    if(this.nameInputDialog){this.closeNameInputDialog();}
    if(this.numberInputDialog){this.closeNumberInputDialog();}
    const wasActive = this.isActive();
    const wasVisible = this.visible;
    this.mode = mode;
    GameManager.applyModeSettings(mode);
    this.clear();
    this.setDisplayOrigin(0, 0);
    this.drawTitle();
    this.createOptions();
    this.refreshOptionScrollbar();
    if(wasActive){this.activate();}else{this.deactivate();}
    if(wasVisible){this.show();}else{this.hide();}
    this.render();
  }
  /*------------------------------------------------------------------------*/
  clear(){
    if(this.numberInputDialog){this.closeNumberInputDialog();}
    if(this.startGameRow && this.children.indexOf(this.startGameRow) >= 0){
      this.removeChild(this.startGameRow);
      this.startGameRow.destroy?.({children: true});
    }
    this.startGameRow = null;
    super.clear();
  }
  refreshLanguage(){
    // Each mode has its own settings window. Keep hidden mode windows tied to
    // their original mode when the locale changes.
    const currentMode = GameManager.gameMode;
    this.refreshForMode(this.mode);
    if(currentMode !== this.mode){
      GameManager.applyModeSettings(currentMode);
    }
  }
  /*------------------------------------------------------------------------*/
  update(){
    super.update();
    if(!this.isActive() || !Input.isMouseInArea(this.rect)){return;}
    if(Input.isWheelUp()){
      this.scrollOptions(-this.scrollStep);
    }
    else if(Input.isWheelDown()){
      this.scrollOptions(this.scrollStep);
    }
  }
  /*------------------------------------------------------------------------*/
  get scrollStep(){return this.itemHeight + this.spacing;}
  /*------------------------------------------------------------------------*/
  // Keep the title and the fixed start button outside the scrollable options.
  get optionTop(){return this.itemHeight + this.spacing * 5;}
  get optionBottom(){
    return this.height - this.itemHeight - this.padding / 2 - this.spacing * 3;
  }
  // Center the bottom button row between the viewport divider and the inner
  // bottom edge of the panel.
  get startGameTop(){
    const bottomEdge = this.height - this.padding / 2;
    // The skin's lower border has a little visual weight, so compensate with
    // a small downward offset to make the button row look truly centered.
    return Math.round(
      (this.optionBottom + bottomEdge - this.itemHeight) / 2
      + this.spacing / 2
    );
  }
  get optionBottomGap(){return this.spacing * 2;}
  /*------------------------------------------------------------------------*/
  getIndexItemPOS(index){
    const pos = super.getIndexItemPOS(index);
    pos.y += this.optionTop;
    return pos;
  }
  /*------------------------------------------------------------------------*/
  get maxScrollY(){
    return Math.max(
      0,
      this.optionContentBottom - (this.optionBottom - this.optionBottomGap)
    );
  }
  /*------------------------------------------------------------------------*/
  scrollOptions(amount){
    const next = Math.max(0, Math.min(this.maxScrollY, this.oy + amount));
    if(next === this.oy){return;}
    this.setDisplayOrigin(0, next);
    this.syncCursorToDisplay();
    this.refreshOptionScrollbar();
  }
  /*------------------------------------------------------------------------*/
  syncCursorToDisplay(){
    if(this.index < 0 || !this.cursorSprite){return;}
    const rect = this.cursorRect(this.index);
    this.cursorSprite.setPOS(rect.x, rect.y - this.oy);
  }
  /*------------------------------------------------------------------------*/
  select(index, se = true){
    super.select(index, se);
    this.syncCursorToDisplay();
  }
  /*------------------------------------------------------------------------*/
  updateHelp(){
    const text = this.index >= 0 && this.currentItem?.help
      ? this.currentItem.help
      : (Vocab["GameModeHelp"] || Vocab["HelpStartGame"] || "Select a game mode.");
    this.helpWindow?.setText(text);
  }
  /*------------------------------------------------------------------------*/
  get optionButtonWidth(){return 136;}
  get optionButtonHeight(){return Math.max(this.itemHeight - 4, 24);}
  get startGameButtonGap(){return Math.max(this.spacing, 30);}
  // Keep the two bottom buttons compact enough to sit side by side inside
  // the panel at every supported display scale.
  get startGameButtonWidth(){
    return Math.floor(Math.min(180, Math.max(0,
      (this.itemWidth - this.startGameButtonGap) / 2
    )));
  }
  get startGameButtonGroupWidth(){
    return this.startGameButtonWidth * 2 + this.startGameButtonGap;
  }
  get startGameButtonX(){
    return Math.max(0, (this.itemWidth - this.startGameButtonGroupWidth) / 2);
  }
  get optionCenterY(){return this.itemHeight / 2;}
  optionControlY(height){return Math.round(this.optionCenterY - height / 2);}
  get optionScrollbarGap(){return 10;}
  get optionButtonX(){
    return this.itemWidth - this.optionButtonWidth - this.spacing - this.optionScrollbarGap;
  }
  get optionSliderX(){
    return this.optionButtonX - this.spacing - this.optionSliderWidth;
  }
  get optionSliderWidth(){
    return 175;
  }
  /*------------------------------------------------------------------------*/
  createOptionRow(labelKey, helpKey, controlX = this.optionButtonX){
    const pos = this.nextItemPOS;
    const row = new SpriteCanvas(0, 0, this.itemWidth, this.itemHeight);
    row.mask = this.optionViewportMask;
    // SpriteCanvas creates a local white mask graphic for its own bounds.
    // The option viewport mask replaces it, so keep the old graphic hidden
    // instead of letting it render as a white row background.
    if(row.maskGraphics){
      row.maskGraphics.visible = false;
      row.maskGraphics.renderable = false;
    }
    const label = this.drawItemText(row, 4, Vocab[labelKey]);
    const maxLabelWidth = Math.max(56, controlX - this.spacing - 8);
    this.fitOptionLabel(label, maxLabelWidth);
    row.labelSprite = label;
    row.setPOS(pos.x, pos.y).help = Vocab[helpKey] || '';
    return {row: row, pos: pos};
  }
  /*------------------------------------------------------------------------*/
  fitOptionLabel(label, maxWidth){
    if(!label || label.width <= maxWidth){return;}
    const originalSize = Number(label.style?.fontSize || Graphics.DefaultFontSetting.fontSize);
    const minSize = 12;
    const fittedSize = Math.max(minSize, Math.floor(originalSize * maxWidth / label.width));
    label.style.fontSize = fittedSize;
    label.y = Math.round((this.itemHeight - label.height) / 2);
    // Keep extremely long translations inside the label column even at the
    // minimum font size. This is a last-resort horizontal fit, so normal
    // translations retain their original proportions and readability.
    if(label.width > maxWidth){
      label.scale.x *= maxWidth / label.width;
    }
  }
  /*------------------------------------------------------------------------*/
  createOptionButton(row, text, style = 'value', width = this.optionButtonWidth,
                     customHeight = null, fontSize = 18){
    const height = customHeight || this.optionButtonHeight;
    const button = new SpriteCanvas(0, 0, width, height);
    button.setPOS(this.optionButtonX, this.optionControlY(height));
    button.eventMode = 'none';

    const background = new PIXI.Graphics();
    button.addChild(background);
    const font = clone(Graphics.DefaultFontSetting);
    font.fontSize = fontSize;
    const label = button.drawText(0, 0, '', font, false);
    label.eventMode = 'none';

    const palettes = {
      value:    {fill: 0x202c45, border: 0x9eb6d6, text: 0xffffff},
      enabled:  {fill: 0x2e739f, border: 0x8fe8ff, text: 0xffffff},
      disabled: {fill: 0x713b55, border: 0xff8a9a, text: 0xffd7dd},
      primary:  {fill: 0x76542e, border: 0xffd36a, text: 0xffff8a},
    };
    button.setText = function(value){
      label.text = value == null ? '' : String(value);
      label.x = Math.round((width - label.width) / 2);
      label.y = Math.round((height - label.height) / 2);
      return button;
    };
    button.setStyle = function(name){
      const color = palettes[name] || palettes.value;
      background.clear();
      background
        .roundRect(0, 0, width, height, 6)
        .fill({color: color.fill, alpha: 0.9})
        .stroke({width: 2, color: color.border, alpha: 0.95});
      label.tint = color.text;
      return button;
    };
    button.optionLabel = label;
    button.optionBackground = background;
    button.optionWidth = width;
    button.setText(text);
    button.setStyle(style);
    row.addChild(button);
    return button;
  }
  /*------------------------------------------------------------------------*/
  addPlayerNameOption(){
    const option = this.createOptionRow('PlayerNames', 'HelpPlayerNames');
    const button = this.createOptionButton(
      option.row,
      GameManager.isAutomaticPlayerName ? Vocab["PlayerNamesAuto"] : Vocab["PlayerNamesCustom"]
    );
    this.playerNameModeButton = button;
    this.playerNameModeValue = button.optionLabel;
    let handler = function(){
      this.openNameModeDropdown('player', button, option.pos);
    }.bind(this);
    option.row.on('pointertap', handler);
    this.addSelection(option.row);
  }
  /*------------------------------------------------------------------------*/
  addAINamesOption(){
    const option = this.createOptionRow('AutoPlayerNames', 'HelpAutoPlayerNames');
    const button = this.createOptionButton(
      option.row,
      GameManager.isAutomaticAINames ? Vocab["PlayerNamesAuto"] : Vocab["PlayerNamesCustom"]
    );
    this.aiNamesModeButton = button;
    this.aiNamesModeValue = button.optionLabel;
    let handler = function(){
      this.openNameModeDropdown('ai', button, option.pos);
    }.bind(this);
    option.row.on('pointertap', handler);
    this.addSelection(option.row);
  }
  /*------------------------------------------------------------------------*/
  openNameModeDropdown(type, value, pos){
    if(this.nameModeDropdown){
      this.closeNameModeDropdown();
    }
    const modes = [
      {mode: 'auto', text: Vocab["PlayerNamesAuto"]},
      {mode: 'custom', text: Vocab["PlayerNamesCustom"]},
    ];
    this.nameModeDropdown = new Window_Selectable(
      this.x + 380,
      this.y + pos.y + this.itemHeight,
      220,
      (this.itemHeight + this.spacing) * modes.length + this.padding
    );
    this.nameModeDropdown.indexSprite.setOpacity(0.9);
    this.nameModeDropdown.patternSprite.setOpacity(0.9);
    modes.forEach(function(option){
      this.nameModeDropdown.addTextSelection({
        text: option.text,
        align: 1,
        symbol: option.mode,
        handler: function(){
          this.closeNameModeDropdown();
          let result = true;
          if(type == 'player'){
            result = option.mode == 'auto'
              ? GameManager.useAutomaticPlayerName()
              : (this.openNameInputDialog('player'), false);
          }
          else{
            result = option.mode == 'auto'
              ? GameManager.useAutomaticAINames()
              : (this.openNameInputDialog('ai'), false);
          }
          if(result){
            value.setText(option.mode == 'auto'
              ? Vocab["PlayerNamesAuto"] : Vocab["PlayerNamesCustom"]);
            Sound.playOK();
          }
        }.bind(this)
      });
    }.bind(this));
    this.registerNameModeDropdownOutsideHandler();
    SceneManager.scene.raiseOverlay(this.nameModeDropdown);
  }
  /*------------------------------------------------------------------------*/
  openNameInputDialog(type){
    if(this.nameInputDialog){this.closeNameInputDialog();}
    const current = GameManager.getPlayerNames();
    const isPlayer = type == 'player';
    const values = isPlayer ? [current[0]] : current.slice(1);
    const labels = isPlayer
      ? [Vocab["PlayerNames"]]
      : values.map(function(_, index){
        return `${Vocab["AutoPlayerNames"]} ${index + 1}`;
      });
    const title = isPlayer ? Vocab["PlayerNamePrompt"] : Vocab["AINamePrompt"];
    const height = isPlayer ? 250 : 340;
    const dialog = new Window_NameInput(
      (Graphics.width - 600) / 2,
      (Graphics.height - height) / 2,
      600,
      height,
      {
        title: title,
        labels: labels,
        values: values,
        onSubmit: function(names){
          const saved = isPlayer
            ? GameManager.saveCustomPlayerName(names[0])
            : GameManager.saveCustomAINames(names);
          if(!saved){return false;}
          const value = isPlayer ? this.playerNameModeButton : this.aiNamesModeButton;
          value.setText(Vocab["PlayerNamesCustom"]);
          this.closeNameInputDialog();
          Sound.playOK();
          return true;
        }.bind(this),
        onCancel: function(){
          this.closeNameInputDialog();
          Sound.playCancel();
        }.bind(this),
      }
    );
    this.nameInputDialog = dialog;
    SceneManager.scene.raiseOverlay(dialog);
    dialog.focusFirstInput();
  }
  /*------------------------------------------------------------------------*/
  closeNameInputDialog(){
    const dialog = this.nameInputDialog;
    if(!dialog){return;}
    this.nameInputDialog = null;
    const scene = SceneManager.scene;
    if(scene?.overlay === dialog){
      scene.closeOverlay();
    }
    dialog.removeInputFields();
    if(scene?.children?.indexOf(dialog) >= 0){
      scene.removeChild(dialog);
    }
    if(scene?._windows){
      const index = scene._windows.indexOf(dialog);
      if(index >= 0){scene._windows.splice(index, 1);}
    }
    dialog.removeAllListeners?.();
    dialog.destroy?.({children: true});
  }
  /*------------------------------------------------------------------------*/
  closeNameModeDropdown(){
    this.removeNameModeDropdownOutsideHandler();
    if(SceneManager.scene?.overlay === this.nameModeDropdown){
      SceneManager.scene.closeOverlay();
    }
    const dropdown = this.nameModeDropdown;
    if(!dropdown){return;}
    const scene = SceneManager.scene;
    if(scene?.children?.indexOf(dropdown) >= 0){
      scene.removeChild(dropdown);
    }
    if(scene?._windows){
      const index = scene._windows.indexOf(dropdown);
      if(index >= 0){scene._windows.splice(index, 1);}
    }
    dropdown.removeAllListeners?.();
    dropdown.destroy?.({children: true});
    this.nameModeDropdown = null;
  }
  /*------------------------------------------------------------------------*/
  registerNameModeDropdownOutsideHandler(){
    if(this._nameModeDropdownOutsideHandler){return;}
    this._nameModeDropdownOutsideHandler = function(event){
      const dropdown = this.nameModeDropdown;
      if(!dropdown || SceneManager.scene?.overlay !== dropdown){
        this.removeNameModeDropdownOutsideHandler();
        return;
      }
      const view = Graphics.app?.canvas;
      const rect = view?.getBoundingClientRect?.();
      if(!rect || rect.width <= 0 || rect.height <= 0){
        this.closeNameModeDropdown();
        return;
      }
      const point = Graphics.mapClientPosition(event.clientX, event.clientY);
      const x = point.x;
      const y = point.y;
      const boundsResult = dropdown.getBounds();
      const bounds = boundsResult.rectangle || boundsResult;
      if(x < bounds.x || x > bounds.x + bounds.width ||
         y < bounds.y || y > bounds.y + bounds.height){
        this.closeNameModeDropdown();
      }
    }.bind(this);
    document.addEventListener('pointerdown', this._nameModeDropdownOutsideHandler);
  }
  /*------------------------------------------------------------------------*/
  removeNameModeDropdownOutsideHandler(){
    if(!this._nameModeDropdownOutsideHandler){return;}
    document.removeEventListener('pointerdown', this._nameModeDropdownOutsideHandler);
    this._nameModeDropdownOutsideHandler = null;
  }
  /**------------------------------------------------------------------------
   * Option defines how many cards player have at beginning, default is 7
   */
  addHandCardOption(){
    const option = this.createOptionRow('InitHandCard', 'HelpInitHandCard', this.optionSliderX);
    const value = GameManager.initCardNumber;
    const peak = GameManager.initCardPeak;
    this.HCBar = new Sprite_DragBar(
      this.optionSliderX,
      this.optionControlY(30),
      this.optionSliderWidth,
      null,
      peak[0], peak[1], value
    );
    option.row.addChild(this.HCBar);
    const valueButton = this.createOptionButton(option.row, value);
    valueButton.eventMode = 'static';
    this.HCBar.handler = function(v){
      GameManager.changeGameSetting(GameManager.kInitCardNumber, parseInt(v));
      valueButton.setText(parseInt(GameManager.initCardNumber));
    }
    this.HCBar.changeColor(Graphics.color.Fuchsia)
    let handler = function(){
      this.openNumberInputDialog({
        title: `${Vocab["InitHandCard"]} (${GameManager.initCardPeak[0]} ~ ${GameManager.initCardPeak[1]})`,
        label: Vocab["InitHandCard"],
        value: GameManager.initCardNumber,
        min: GameManager.initCardPeak[0],
        max: GameManager.initCardPeak[1],
        onSubmit: function(v){
          GameManager.changeGameSetting(GameManager.kInitCardNumber, v);
          this.HCBar.setValue(GameManager.initCardNumber);
          valueButton.setText(parseInt(GameManager.initCardNumber));
        }.bind(this),
      });
    }.bind(this);
    valueButton.on('pointertap', handler);
    this.addSelection(option.row);
  }
  /**------------------------------------------------------------------------
   * Whether enable extra cards(trade/wild chaos/discard all/wild hit),
   * default is enabled
   */
  addExtraCardOption(){
    this.addBooleanOption(
      'ExtraCard', 'HelpExtraCard',
      function(){return GameManager.extraCardEnabled;},
      function(enabled){GameManager.changeGameSetting(GameManager.kExtraCardDisabled, !enabled);}
    );
  }
  /*------------------------------------------------------------------------*/
  addTradeCardOption(){
    this.addBooleanOption(
      'TradeCard', 'HelpTradeCard',
      function(){return GameManager.tradeCardEnabled;},
      function(enabled){GameManager.changeGameSetting(GameManager.kTradeCardDisabled, !enabled);}
    );
  }
  /*------------------------------------------------------------------------*/
  addDrawTwoStackingOption(){
    this.addBooleanOption(
      'DrawTwoStacking', 'HelpDrawTwoStacking',
      function(){return GameManager.drawTwoStacking;},
      function(enabled){GameManager.changeGameSetting(GameManager.kDrawTwoStacking, enabled);}
    );
  }
  /*------------------------------------------------------------------------*/
  addDrawFourStackingOption(){
    this.addBooleanOption(
      'DrawFourStacking', 'HelpDrawFourStacking',
      function(){return GameManager.drawFourStacking;},
      function(enabled){GameManager.changeGameSetting(GameManager.kDrawFourStacking, enabled);}
    );
  }
  /*------------------------------------------------------------------------*/
  addDrawTwoFourStackingOption(){
    this.addBooleanOption(
      'DrawTwoFourStacking', 'HelpDrawTwoFourStacking',
      function(){return GameManager.drawTwoFourStacking;},
      function(enabled){GameManager.changeGameSetting(GameManager.kDrawTwoFourStacking, enabled);}
    );
  }
  /*------------------------------------------------------------------------*/
  addPenaltyTransferOption(){
    this.addBooleanOption(
      'PenaltyTransfer', 'HelpPenaltyTransfer',
      function(){return GameManager.penaltyTransferEnabled;},
      function(enabled){GameManager.changeGameSetting(GameManager.kPenaltyTransferEnabled, enabled);}
    );
  }
  /*------------------------------------------------------------------------*/
  addUnoPenaltyOption(){
    const option = this.createOptionRow('UnoPenalty', 'HelpUnoPenalty', this.optionSliderX);
    const min = 1;
    const max = 4;
    const step = 1;
    const value = Math.min(max, Math.max(min, GameManager.unoPenaltyCards || 2));
    const valueButton = this.createOptionButton(option.row, value);
    this.unoPenaltyBar = new Sprite_DragBar(
      this.optionSliderX,
      this.optionControlY(30),
      this.optionSliderWidth,
      null,
      min,
      max,
      value
    );
    this.unoPenaltyBar.step = step;
    this.unoPenaltyBar.setValue(value);
    this.unoPenaltyBar.changeColor(Graphics.color.Gold);
    this.unoPenaltyBar.on('pointertap', function(event){
      event.stopPropagation?.();
    });
    option.row.addChild(this.unoPenaltyBar);
    this.unoPenaltyBar.handler = function(v){
      const next = Math.min(max, Math.max(min, Math.round(v)));
      GameManager.changeGameSetting(GameManager.kUnoPenaltyCards, next);
      valueButton.setText(next);
    };
    this.addSelection(option.row);
  }
  /*------------------------------------------------------------------------*/
  openNumberInputDialog(args = {}){
    if(this.numberInputDialog){return;}
    const min = args.min == null ? null : args.min;
    const max = args.max == null ? null : args.max;
    const step = args.step == null ? 1 : args.step;
    const current = args.value == null ? min : args.value;
    let dialog = null;
    dialog = new Window_NameInput(
      (Graphics.width - 600) / 2,
      (Graphics.height - 250) / 2,
      600,
      250,
      {
        title: args.title || Vocab["NumberInput"] || "Enter a number:",
        labels: [args.label || Vocab["NumberInput"] || "Number"],
        values: [String(current)],
        inputType: 'number',
        inputMode: 'numeric',
        maxLength: 10,
        min: min,
        max: max,
        step: step,
        onSubmit: function(values){
          const value = Number(values[0]);
          if(!Number.isInteger(value) ||
             (min != null && value < min) ||
             (max != null && value > max) ||
             (step > 1 && min != null && (value - min) % step !== 0)){
            dialog.errorSprite.text = args.invalidText
              || Vocab["NumberInputInvalid"]
              || "Please enter a valid number.";
            dialog.inputs[0]?.focus();
            Sound.playBuzzer();
            return false;
          }
          const accepted = args.onSubmit ? args.onSubmit(value) : true;
          if(accepted === false){return false;}
          this.closeNumberInputDialog();
          Sound.playOK();
          return true;
        }.bind(this),
        onCancel: function(){
          this.closeNumberInputDialog();
          Sound.playCancel();
        }.bind(this),
      }
    );
    this.numberInputDialog = dialog;
    SceneManager.scene.raiseOverlay(dialog);
    dialog.focusFirstInput();
  }
  /*------------------------------------------------------------------------*/
  openDeckCardNumberInput(onChange = null){
    const current = GameManager.deckCardNumber >= 100
      ? Math.min(1000, Math.max(100,
        Math.round(GameManager.deckCardNumber / 10) * 10
      ))
      : 100;
    this.openNumberInputDialog({
      title: Vocab["DeckCardPrompt"] || "Enter the deck card count (minimum 100):",
      label: Vocab["DeckSize"] || "Deck size",
      value: current,
      min: 100,
      max: 1000,
      step: 10,
      invalidText: Vocab["DeckCardMinimum"]
        || "The deck size must be between 100 and 1000 cards in steps of 10.",
      onSubmit: function(value){
        GameManager.changeGameSetting(GameManager.kDeckCardNumber, value);
        onChange?.(value);
      },
    });
  }
  /*------------------------------------------------------------------------*/
  addDeckSizeOption(){
    const option = this.createOptionRow('DeckSize', 'HelpDeckSize', this.optionSliderX);
    const button = this.createOptionButton(option.row, '');
    const deckMin = 100;
    const deckMax = 1000;
    const deckStep = 10;
    const current = GameManager.deckCardNumber >= deckMin
      ? Math.min(deckMax, Math.max(deckMin,
        Math.round(GameManager.deckCardNumber / deckStep) * deckStep
      ))
      : deckMin;
    this.deckSizeBar = new Sprite_DragBar(
      this.optionSliderX,
      this.optionControlY(30),
      this.optionSliderWidth,
      null,
      deckMin,
      deckMax,
      current
    );
    this.deckSizeBar.step = deckStep;
    this.deckSizeBar.setValue(current);
    this.deckSizeBar.changeColor(Graphics.color.Gold);
    this.deckSizeBar.on('pointertap', function(event){
      event.stopPropagation?.();
    });
    option.row.addChild(this.deckSizeBar);
    const refresh = function(){
      if(GameManager.deckCardNumber === 0){
        button.setText(Vocab["DeckInfinite"] || "Infinite");
      }
      else{
        button.setText(
          `${Vocab["DeckCustom"] || "Custom"} (${GameManager.deckCardNumber})`
        );
      }
    };
    const handler = function(){
      if(GameManager.deckCardNumber === 0){
        this.openDeckCardNumberInput(function(value){
          this.deckSizeBar.setValue(value);
          refresh();
        }.bind(this));
        return;
      }
      else{
        GameManager.changeGameSetting(GameManager.kDeckCardNumber, 0);
      }
      refresh();
      Sound.playOK();
    }.bind(this);
    this.deckSizeBar.handler = function(v){
      const value = Math.round(v / deckStep) * deckStep;
      GameManager.changeGameSetting(GameManager.kDeckCardNumber, value);
      refresh();
    }.bind(this);
    refresh();
    option.row.on('pointertap', handler);
    this.addSelection(option.row);
  }
  /*------------------------------------------------------------------------*/
  closeNumberInputDialog(){
    const dialog = this.numberInputDialog;
    if(!dialog){return;}
    this.numberInputDialog = null;
    const scene = SceneManager.scene;
    if(scene?.overlay === dialog){
      scene.closeOverlay();
    }
    dialog.removeInputFields();
    if(scene?.children?.indexOf(dialog) >= 0){
      scene.removeChild(dialog);
    }
    if(scene?._windows){
      const index = scene._windows.indexOf(dialog);
      if(index >= 0){scene._windows.splice(index, 1);}
    }
    dialog.removeAllListeners?.();
    dialog.destroy?.({children: true});
  }
  /*------------------------------------------------------------------------*/
  addDrawUntilPlayableOption(){
    const option = this.createOptionRow('DrawMode', 'HelpDrawMode');
    const button = this.createOptionButton(
      option.row,
      GameManager.drawUntilPlayable ? Vocab["DrawUntilPlayable"] : Vocab["DrawOne"],
      'value'
    );
    const refresh = function(){
      button.setText(GameManager.drawUntilPlayable
        ? Vocab["DrawUntilPlayable"] : Vocab["DrawOne"]);
    };
    const handler = function(){
      GameManager.changeGameSetting(
        GameManager.kDrawUntilPlayable,
        !GameManager.drawUntilPlayable
      );
      refresh();
      Sound.playOK();
    };
    option.row.on('pointertap', handler);
    this.addSelection(option.row);
  }
  /*------------------------------------------------------------------------*/
  addStartGameOption(){
    const row = new SpriteCanvas(0, 0, this.itemWidth, this.itemHeight);
    row.setPOS(this.padding / 2, this.startGameTop);
    row.help = Vocab["HelpStartGame"] || '';
    row.static = true;
    row.hitArea = new Rect(0, 0, this.itemWidth, this.itemHeight);
    const button = this.createOptionButton(
      row, Vocab["StartGame"], 'primary', this.startGameButtonWidth,
      this.itemHeight, 20
    );
    button.setPOS(this.startGameButtonX, (this.itemHeight - button.height) / 2);
    const handler = function(){
      SceneManager.scene?.onStartSelectedGame?.();
    };
    row.on('pointertap', handler);
    row.setZ((this.patternSprite?.z || 0) + 1);
    this.startGameRow = row;
    this.addChild(row);
    row.eventMode = this.isActive() ? 'static' : 'none';
  }
  /*------------------------------------------------------------------------*/
  addBooleanOption(labelKey, helpKey, getEnabled, setEnabled){
    const option = this.createOptionRow(labelKey, helpKey);
    const button = this.createOptionButton(
      option.row,
      getEnabled() ? Vocab["Enable"] : Vocab["Disable"],
      getEnabled() ? 'enabled' : 'disabled'
    );
    option.row.toggleButton = button;
    const refresh = function(enabled){
      button.setText(enabled ? Vocab["Enable"] : Vocab["Disable"]);
      button.setStyle(enabled ? 'enabled' : 'disabled');
    };
    let handler = function(){
      const enabled = !getEnabled();
      setEnabled(enabled);
      refresh(enabled);
    };
    option.row.on('pointertap', handler);
    this.addSelection(option.row);
  }
  /**------------------------------------------------------------------------*/
  addTimedDurationOption(){
    const option = this.createOptionRow('TimedDuration', 'HelpTimedDuration');
    const button = this.createOptionButton(option.row, '');
    const peak = GameManager.timedDurationPeak;
    const format = function(value){
      const minutes = Math.floor(value / 60);
      const seconds = String(value % 60).padStart(2, '0');
      return `${minutes}:${seconds}`;
    };
    const refresh = function(){
      button.setText(format(GameManager.timedDuration));
    };
    option.row.on('pointertap', function(){
      this.openNumberInputDialog({
        title: `${Vocab.TimedDuration || 'Game time'} (${peak[0]} ~ ${peak[1]}s)`,
        label: Vocab.TimedDuration || 'Game time',
        value: GameManager.timedDuration,
        min: peak[0],
        max: peak[1],
        step: 30,
        invalidText: Vocab.HelpTimedDuration || 'Choose a value in 30-second steps.',
        onSubmit: function(value){
          GameManager.changeGameSetting(GameManager.kTimedDuration, value);
          refresh();
        },
      });
    }.bind(this));
    refresh();
    this.addSelection(option.row);
  }
  /*------------------------------------------------------------------------*/
  addTimedTurnSecondsOption(){
    const option = this.createOptionRow('TimedTurn', 'HelpTimedTurn');
    const button = this.createOptionButton(option.row, '');
    const peak = GameManager.timedTurnSecondsPeak;
    const refresh = function(){
      button.setText(`${GameManager.timedTurnSeconds}s`);
    };
    option.row.on('pointertap', function(){
      this.openNumberInputDialog({
        title: `${Vocab.TimedTurn || 'Turn time'} (${peak[0]} ~ ${peak[1]}s)`,
        label: Vocab.TimedTurn || 'Turn time',
        value: GameManager.timedTurnSeconds,
        min: peak[0],
        max: peak[1],
        step: 1,
        invalidText: Vocab.HelpTimedTurn || 'Choose between 1 and 5 seconds.',
        onSubmit: function(value){
          GameManager.changeGameSetting(GameManager.kTimedTurnSeconds, value);
          refresh();
        },
      });
    }.bind(this));
    refresh();
    this.addSelection(option.row);
  }
  /**------------------------------------------------------------------------
   * Max HP at beginning in Battle Puno and Death Match, default is 200
   */
  addHPOption(){
    const option = this.createOptionRow('InitHP', 'HelpInitHP', this.optionSliderX);
    const value = GameManager.initHP;
    const peak = GameManager.initHPPeak;
    this.HPBar = new Sprite_DragBar(
      this.optionSliderX,
      this.optionControlY(30),
      this.optionSliderWidth,
      null,
      peak[0], peak[1], value
    );
    option.row.addChild(this.HPBar);
    const valueButton = this.createOptionButton(option.row, value);
    valueButton.eventMode = 'static';
    this.HPBar.handler = function(v){
      GameManager.changeGameSetting(GameManager.kInitHP, parseInt(v));
      valueButton.setText(parseInt(GameManager.initHP));
    }
    this.HPBar.changeColor(Graphics.color.Chartreuse)

    let handler = function(){
      this.openNumberInputDialog({
        title: `${Vocab["HPInput"]} (${GameManager.initHPPeak[0]} ~ ${GameManager.initHPPeak[1]})`,
        label: Vocab["InitHP"],
        value: GameManager.initHP,
        min: GameManager.initHPPeak[0],
        max: GameManager.initHPPeak[1],
        onSubmit: function(v){
          GameManager.changeGameSetting(GameManager.kInitHP, v);
          this.HPBar.setValue(GameManager.initHP);
          valueButton.setText(parseInt(GameManager.initHP));
        }.bind(this),
      });
    }.bind(this);
    valueButton.on('pointertap', handler);
    this.addSelection(option.row);
  }
  /**------------------------------------------------------------------------
   * Score thereshold to end the game in battle puno, default is 500
   */
  addScoreGoalOption(){
    const option = this.createOptionRow('ScoreGoal', 'HelpScoreGoal', this.optionSliderX);
    const value = GameManager.scoreGoal;
    const peak = GameManager.scoreGoalPeak;
    this.SGBar = new Sprite_DragBar(
      this.optionSliderX,
      this.optionControlY(30),
      this.optionSliderWidth,
      null,
      peak[0], peak[1], value
    );
    option.row.addChild(this.SGBar);
    const valueButton = this.createOptionButton(option.row, value);
    valueButton.eventMode = 'static';
    this.SGBar.handler = function(v){
      GameManager.changeGameSetting(GameManager.kScoreGoal, parseInt(v));
      valueButton.setText(parseInt(GameManager.scoreGoal));
    }
    this.SGBar.changeColor(Graphics.color.Gold);

    let handler = function(){
      this.openNumberInputDialog({
        title: `${Vocab["ScoreInput"]} (${GameManager.scoreGoalPeak[0]} ~ ${GameManager.scoreGoalPeak[1]})`,
        label: Vocab["ScoreGoal"],
        value: GameManager.scoreGoal,
        min: GameManager.scoreGoalPeak[0],
        max: GameManager.scoreGoalPeak[1],
        onSubmit: function(v){
          GameManager.changeGameSetting(GameManager.kScoreGoal, v);
          this.SGBar.setValue(GameManager.scoreGoal);
          valueButton.setText(parseInt(GameManager.scoreGoal));
        }.bind(this),
      });
    }.bind(this);
    valueButton.on('pointertap', handler);
    this.addSelection(option.row);
  }
  /*------------------------------------------------------------------------*/
}
/**------------------------------------------------------------------------
 * In-game text input window used for custom player and AI names.
 * The text fields are DOM inputs positioned over this PIXI window so they
 * remain usable with IME/mobile keyboards without opening browser dialogs.
 */
class Window_NameInput extends Window_Selectable{
  /*------------------------------------------------------------------------*/
  constructor(x, y, w, h, args = {}){
    super(x, y, w, h);
    this.title = args.title || '';
    this.labels = args.labels || [];
    this.values = args.values || [];
    this.inputType = args.inputType || 'text';
    this.inputMode = args.inputMode || '';
    this.inputMaxLength = args.maxLength || 24;
    this.inputMin = args.min;
    this.inputMax = args.max;
    this.inputStep = args.step;
    this.onSubmitHandler = args.onSubmit || function(){return true;};
    this.onCancelHandler = args.onCancel || function(){};
    this.buttonStartIndex = 1;
    this.fieldTop = 68;
    this.fieldHeight = 32;
    this.fieldSpacing = 50;
    this.inputs = [];
    this.changeSkin(Graphics.WSkinRarity);
    this.drawTitle();
    this.createInputFields();
    this.createButtons();
  }
  /*------------------------------------------------------------------------*/
  get rowMax(){return 2;}
  /*------------------------------------------------------------------------*/
  drawTitle(){
    let font = clone(Graphics.DefaultFontSetting);
    font.fill = Graphics.color["MediumSeaGreen"];
    font.fontSize = 26;
    this.titleSprite = this.drawText(0, 5, this.title, font);
    this.titleSprite.x = (this.width - this.titleSprite.width) / 2;
    this.addSelection(null);
  }
  /*------------------------------------------------------------------------*/
  createInputFields(){
    let labelFont = clone(Graphics.DefaultFontSetting);
    labelFont.fontSize = 16;
    labelFont.fill = Graphics.color["White"];
    for(let i = 0; i < this.values.length; ++i){
      this.drawText(this.padding / 2, this.fieldTop - 24 + i * this.fieldSpacing,
        this.labels[i] || '', labelFont);
      const input = document.createElement('input');
      input.type = this.inputType;
      input.inputMode = this.inputMode;
      input.maxLength = this.inputMaxLength;
      if(this.inputMin != null){input.min = this.inputMin;}
      if(this.inputMax != null){input.max = this.inputMax;}
      if(this.inputStep != null){input.step = this.inputStep;}
      input.value = this.values[i] || '';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.style.position = 'absolute';
      input.style.boxSizing = 'border-box';
      input.style.padding = '4px 8px';
      input.style.border = '2px solid #526d82';
      input.style.borderRadius = '4px';
      input.style.background = '#f8fbff';
      input.style.color = '#17212b';
      input.style.fontFamily = 'Arial, sans-serif';
      input.style.fontWeight = 'bold';
      input.style.zIndex = '1200';
      input.addEventListener('keydown', function(event){
        if(event.key === 'Enter'){
          event.preventDefault();
          this.submit();
        }
        else if(event.key === 'Escape'){
          event.preventDefault();
          this.cancel();
        }
      }.bind(this));
      document.body.appendChild(input);
      this.inputs.push(input);
    }
    let errorFont = clone(Graphics.DefaultFontSetting);
    errorFont.fontSize = 15;
    errorFont.fill = Graphics.color["Red"];
    this.errorSprite = this.drawText(this.padding / 2,
      this.height - this.itemHeight * 2 - this.spacing,
      '', errorFont);
    this.updateInputPositions();
  }
  /*------------------------------------------------------------------------*/
  createButtons(){
    this.addButton(Vocab.Yes, 'yes', this.submit.bind(this));
    this.addButton(Vocab.Cancel, 'cancel', this.cancel.bind(this));
  }
  /*------------------------------------------------------------------------*/
  addButton(text, symbol, handler){
    let font = clone(Graphics.DefaultFontSetting);
    font.fontSize = 22;
    font.fill = symbol === 'yes' ? Graphics.color["LightSkyBlue"] : Graphics.color["Red"];
    const item = new PIXI.Text({text: text || '', style: font});
    item.symbol = symbol;
    item.help = '';
    item.on('pointertap', handler);
    const pos = this.getIndexItemPOS(this._selections.length);
    item.setPOS(pos.x + Math.max((this.itemWidth - item.width) / 2, 0),
      pos.y + Math.max((this.itemHeight - item.height) / 2, 0));
    this.addSelection(item);
    return item;
  }
  /*------------------------------------------------------------------------*/
  getIndexItemPOS(index){
    if(index >= this.buttonStartIndex && index < this.buttonStartIndex + 2){
      const buttonIndex = index - this.buttonStartIndex;
      return {
        x: this.padding / 2 + buttonIndex * (this.itemWidth + this.spacing),
        y: this.height - this.itemHeight - this.padding / 2,
      };
    }
    return super.getIndexItemPOS(index);
  }
  /*------------------------------------------------------------------------*/
  updateInputPositions(){
    if(!Graphics.app){return;}
    const scale = Graphics.displayScale || 1;
    const appX = Graphics.app.x || 0;
    const appY = Graphics.app.y || 0;
    const x = appX + (this.x + this.padding) * scale;
    const width = (this.width - this.padding * 2) * scale;
    this.inputs.forEach(function(input, index){
      input.style.left = `${x}px`;
      input.style.top = `${appY + (this.y + this.fieldTop + index * this.fieldSpacing) * scale}px`;
      input.style.width = `${width}px`;
      input.style.height = `${this.fieldHeight * scale}px`;
      input.style.fontSize = `${Math.max(14, 18 * scale)}px`;
    }.bind(this));
  }
  /*------------------------------------------------------------------------*/
  focusFirstInput(){
    setTimeout(function(){
      const input = this.inputs[0];
      if(!input){return;}
      input.focus();
      input.select();
    }.bind(this), 0);
  }
  /*------------------------------------------------------------------------*/
  submit(){
    const names = this.inputs.map(function(input){return input.value.trim();});
    const invalidIndex = names.findIndex(function(name){return !name;});
    if(invalidIndex >= 0){
      this.errorSprite.text = Vocab["PlayerNamesRequired"] || 'All names are required.';
      this.inputs[invalidIndex].focus();
      this.refresh();
      return false;
    }
    this.errorSprite.text = '';
    const ok = this.onSubmitHandler(names);
    if(!ok){
      this.errorSprite.text = Vocab["PlayerNamesRequired"] || 'All names are required.';
      this.refresh();
      return false;
    }
    return true;
  }
  /*------------------------------------------------------------------------*/
  cancel(){
    this.onCancelHandler();
  }
  /*------------------------------------------------------------------------*/
  update(){
    super.update();
    this.updateInputPositions();
  }
  /*------------------------------------------------------------------------*/
  clear(...args){
    this.removeInputFields();
    super.clear(...args);
  }
  /*------------------------------------------------------------------------*/
  removeInputFields(){
    this.inputs.forEach(function(input){
      if(input.parentNode){input.parentNode.removeChild(input);}
    });
    this.inputs = [];
  }
}
/**------------------------------------------------------------------------
 * Window for select card ability
 */
class Window_CardSelection extends Window_Selectable{
  /**------------------------------------------------------------------------
   * @constructor 
   */
  constructor(x, y, w, h){
    super(x, y, w, h);
    this.addDefaultSelections();
    this.changeSkin(Graphics.WSkinLuna);
    const timerFont = clone(Graphics.DefaultFontSetting);
    timerFont.fontSize = 18;
    timerFont.fontWeight = 'bold';
    timerFont.fill = 0xffd36a;
    timerFont.stroke = 0x111111;
    timerFont.strokeThickness = 3;
    this.choiceTimerText = new PIXI.Text({text: '', style: timerFont});
    this.choiceTimerText.anchor.set(0.5, 0.5);
    this.choiceTimerText.setPOS(this.width / 2, this.height - this.padding / 2 - this.lineHeight / 2);
    this.choiceTimerText.setZ(4).static = true;
    this.choiceTimerText.eventMode = 'none';
    this.addChild(this.choiceTimerText);
    this.timedChoiceMode = false;
  }
  /*------------------------------------------------------------------------*/
  addDefaultSelections(){
    for(let i=0;i<4;++i){
      this.addDefaultSelection(i);
    }
    this.addCancelSelection();
  }
  /*------------------------------------------------------------------------*/
  addDefaultSelection(index){
    let args = {
      text: '',
      symbol: index+1,
      align: 1,
    }
    this.addTextSelection(args);
  }
  /*------------------------------------------------------------------------*/
  addCancelSelection(){
    let args = {
      text: Vocab.Cancel,
      symbol: 'cancel',
      align: 1,
    }
    this.cancelSelection = this.addTextSelection(args);
  }
  /*------------------------------------------------------------------------*/
  setTimedChoiceMode(enabled){
    this.timedChoiceMode = !!enabled;
    if(!this.cancelSelection){return this;}
    this.cancelSelection._disabled = this.timedChoiceMode;
    if(this.timedChoiceMode){
      this.cancelSelection.hide().deactivate();
    }
    else{
      this.cancelSelection.show();
    }
    this.refresh();
    return this;
  }
  /*------------------------------------------------------------------------*/
  refresh(){
    super.refresh();
    if(this.timedChoiceMode && this.cancelSelection){
      this.cancelSelection.hide();
    }
    return this;
  }
  /*------------------------------------------------------------------------*/
  setChoiceTime(seconds){
    if(!this.choiceTimerText){return this;}
    const value = Math.max(0, Math.ceil(Number(seconds) || 0));
    this.choiceTimerText.text = value > 0 ? `⏱ ${value}s` : '';
    this.choiceTimerText.style.fill = value <= 1 ? 0xff8a80 : 0xffd36a;
    this.choiceTimerText.visible = value > 0;
    return this;
  }
  /*------------------------------------------------------------------------*/
  setupCard(card){
    switch(card.value){
      case Value.WILD:
      case Value.WILD_DRAW_FOUR:
      case Value.WILD_HIT_ALL:
      case Value.WILD_CHAOS:
      case Value.DISCARD_ALL:
        return this.setupColorSelection();
      case Value.TRADE:
        return this.setupPlayerSelection();
      case Value.ZERO:
        return this.setupZeroSelection();
      default:
        return this.clearSelection();
    }
  }
  /*------------------------------------------------------------------------*/
  clearSelection(){
    for(let i=0;i<GameManager.playerNumber;++i){
      let sel = this.getItemBySymbol(i+1);
      sel.text = '';
      sel.off('pointertap');
    }
    return Effect.NULL;
  }
  /*------------------------------------------------------------------------*/
  setupZeroSelection(){
    this.clearSelection();
    let txts = ["+10", Vocab.HelpReset];
    for(let i=0;i<txts.length;++i){
      this.getItemBySymbol(i+1).text = txts[i];
    }
    debug_log("Ability setup: ", txts);
    this.sortSelections();
    return Effect.CLEAR_DAMAGE;
  }
  /*------------------------------------------------------------------------*/
  setupColorSelection(){
    this.clearSelection();
    let txts = [Vocab.Red, Vocab.Yellow, Vocab.Green, Vocab.Blue];
    debug_log("Ability setup: ", txts);
    for(let i=0;i<txts.length;++i){
      this.getItemBySymbol(i+1).text = txts[i];
    }
    this.sortSelections();
    return Effect.CHOOSE_COLOR;
  }
  /*------------------------------------------------------------------------*/
  setupPlayerSelection(){
    this.clearSelection();
    let alives = GameManager.game.getAlivePlayers();
    let txts   = [];
    let cnt    = 1;
    for(let i in alives){
      if(alives[i] == GameManager.game.players[0]){continue;}
      let sel = this.getItemBySymbol(cnt++);
      sel.text = alives[i].name;
      txts.push(alives[i].name);
    }
    debug_log("Ability setup: ", txts);
    this.sortSelections();
    return Effect.TRADE;
  }
  /*------------------------------------------------------------------------*/
  sortSelections(){
    let cnt = 0, pos = {};
    for(let i in this._selections){
      i = parseInt(i);
      let sel = this._selections[i];
      if(sel == this.cancelSelection){continue;}
      if(this.isItemEnabled(sel)){
        sel._index = cnt;
        pos = this.getIndexItemPOS(cnt++);
        let px = (pos.x + this.itemWidth - sel.width) / 2 + this.spacing;
        sel.setPOS(px, pos.y).activate();
      }
      else{
        sel.setPOS(-this.itemWidth, -this.itemHeight).deactivate();
      }
    }
    pos = this.getIndexItemPOS(cnt);
    this.cancelSelection._index = cnt;
    this.cancelSelection.setPOS(null, pos.y);
  }
  /*------------------------------------------------------------------------*/
  isItemEnabled(item){
    let txt = (item.text || '');
    if((txt.replace(/\s+/g, '')).length == 0){return false;}
    return true;
  }
  /*------------------------------------------------------------------------*/
  get isCurrentItemEnabled(){
    return this.isItemEnabled(this.currentItem);
  }
  /*------------------------------------------------------------------------*/
}
/**
 * Window_Scoreboard
 */
class Window_Scoreboard extends Window_Base{
  
  constructor(){
    super(0,0,300,150);
    let ww = parseInt(Graphics.width  * 0.7);
    let wh = parseInt(Graphics.height * 0.9);
    let wx = Graphics.appCenterWidth(ww);
    let wy = Graphics.appCenterHeight(wh);
    this.setPOS(wx, wy).resize(ww, wh);
    this.game = GameManager.game;
  }

  drawRank(){
    let ar = this.game.players.slice();
    if(this.game.gameMode == Mode.TRADITIONAL){
      for(let i in ar){ar[i].score *= -1;}
    }
    ar.sort(function(a,b){
      if(b.score !== a.score){return b.score - a.score;}
      if(this.game.gameMode === Mode.TIMED && a.hand && b.hand){
        return a.hand.length - b.hand.length;
      }
      return 0;
    }.bind(this));
    let ww = this.width;
    let dx = [parseInt(ww * 0.1),  parseInt(ww * 0.25), parseInt(ww * 0.4), parseInt(ww * 0.8)];
    let dy = Graphics.spacing;
    const showHP = this.game.gameMode != Mode.TRADITIONAL &&
      this.game.gameMode != Mode.TIMED;
    this.drawText(dx[0], dy, Vocab.Rank);
    if(showHP){
      this.drawText(dx[1], dy, "HP");  
    }
    this.drawText(dx[2], dy, Vocab.Player);
    this.drawText(dx[3], dy, Vocab.Score);
    dy += this.lineHeight * 2;
    for(let i in ar){
      i = parseInt(i);
      this.drawText(dx[0], dy, String(i+1));
      if(showHP){
        this.drawText(dx[1], dy, String(ar[i].hp));  
      }
      this.drawText(dx[2], dy, String(ar[i].name));
      this.drawText(dx[3], dy, String(ar[i].score));
      dy += this.lineHeight;
    }
    return ar;
  }

}

Object.assign(globalThis, {
  Window_Base,
  Window_Selectable,
  Window_Menu,
  Window_Option,
  Window_Help,
  Window_Back,
  Window_Confirm,
  Window_GameModeSelect,
  Window_GameOption,
  Window_CardSelection,
  Window_Scoreboard,
});
