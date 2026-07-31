// @ts-nocheck
/**----------------------------------------------------------------------------
 * > Object that shows load progress
 * @class
 * @extends SpriteCanvas
 */
class Sprite_ProgressBar extends SpriteCanvas{
  /*-------------------------------------------------------------------------*/
  constructor(x, y, width, height){
    super(x, y, width, height);
    this.maxProgress     = 1;
    this.currentProgress = 0;
    this._borderWidth    = 4;
    this.fillHorz        = (width > height);
    this._healthColorMode = false;
    this.changeColor(Graphics.color.DeepSkyBlue);
    this.createSprite();
    this.drawBorderSprite();
    this.setZ(1);
  }
  /*-------------------------------------------------------------------------*/
  get borderWidth(){return this._borderWidth;}
  get color(){return this._color;}
  /*-------------------------------------------------------------------------*/
  changeBorderWidth(w){
    this._borderWidth = w;
    this.drawBorderSprite();
    this.refresh();
  }
  /*-------------------------------------------------------------------------*/
  changeColor(c){
    this._color = c;
    this.refresh();
  }
  /*-------------------------------------------------------------------------*/
  enableHealthColorMode(){
    this._healthColorMode = true;
    this.refresh();
    return this;
  }
  /*-------------------------------------------------------------------------*/
  enableValueText(mode = 'percent'){
    this.valueTextMode = mode === 'health' ? 'health' : 'percent';
    if(!this.valueText){this.createValueText();}
    this.updateValueText();
    return this;
  }
  /*-------------------------------------------------------------------------*/
  getFillColor(){
    if(!this._healthColorMode){return this.color;}
    const ratio = this.maxProgress > 0
      ? this.currentProgress / this.maxProgress
      : 0;
    if(ratio < 0.25){return Graphics.color.Red;}
    if(ratio < 0.5){return Graphics.color.Yellow;}
    return Graphics.color.LightGreen;
  }
  /*-------------------------------------------------------------------------*/
  resize(w, h){
    super.resize(w, h);
    this.clear();
    this.drawBorderSprite();
    this.refresh();
  }
  /*-------------------------------------------------------------------------*/
  refresh(){
    if(!this.indexSprite){return ;}
    this.indexSprite.clear();
    if(this.fillHorz){
      let dw = (this.width - this.borderWidth * 2) * (this.currentProgress / this.maxProgress);
      this.indexSprite.rect(0, 0, dw, this.height - this.borderWidth);
    }
    else{
      let dh = (this.height - this.borderWidth * 2) * (this.currentProgress / this.maxProgress);
      this.indexSprite.rect(0, 0, this.width - this.borderWidth, dh);
    }
    this.indexSprite.fill(this.getFillColor());
    this.updateValueText();
  }
  /*-------------------------------------------------------------------------*/
  createSprite(){
    this.indexSprite  = new PIXI.Graphics();
    this.borderSprite = new PIXI.Graphics();
    this.indexSprite.setPOS(this.borderWidth, this.borderWidth);
    this.addChild(this.indexSprite);
    this.addChild(this.borderSprite);
  }
  createValueText(){
    const font = clone(Graphics.DefaultFontSetting);
    font.fontSize = 14;
    font.fill = 0xffffff;
    font.stroke = {color: 0x000000, width: 3};
    this.valueText = new PIXI.Text({text: '', style: font});
    this.valueText.anchor.set(0.5);
    this.valueText.eventMode = 'none';
    this.valueText.static = true;
    this.valueText.setZ(3);
    this.addChild(this.valueText);
    this.updateValueTextLayout();
    this.updateValueText();
  }
  updateValueTextLayout(){
    if(!this.valueText){return;}
    this.valueText.position.set(this.width / 2, this.height / 2);
    this.valueText.rotation = this.fillHorz ? 0 : -Math.PI / 2;
  }
  updateValueText(){
    if(!this.valueText){return;}
    if(this.valueTextMode === 'health'){
      this.valueText.text = `${this.currentProgress} / ${this.maxProgress}`;
    }
    else{
      const ratio = this.maxProgress > 0
        ? this.currentProgress / this.maxProgress
        : 0;
      this.valueText.text = `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;
    }
    this.updateValueTextLayout();
  }
  /*-------------------------------------------------------------------------*/
  clear(){
    if(!this.borderSprite){return ;}
    this.borderSprite.destroy({children: true});
    this.borderSprite = null;
    this.createSprite();
    this.drawBorderSprite();
  }
  /*-------------------------------------------------------------------------*/
  setMaxProgress(n){
    this.maxProgress = n;
    this.refresh();
  }
  /*-------------------------------------------------------------------------*/
  setProgress(n){
    this.currentProgress = n;
    this.refresh();
  }
  /*-------------------------------------------------------------------------*/
  drawBorderSprite(){
    if(!this.borderSprite){return ;}
    this.borderSprite.clear();
    // Draw upper border
    this.borderSprite.rect(0, 0, this._width, this.borderWidth);
    // Draw bottom border
    this.borderSprite.rect(0, this._height - this.borderWidth, this._width, this.borderWidth);
    // Draw left border;
    this.borderSprite.rect(0, 0, this.borderWidth, this.height);
    // Draw right border;
    this.borderSprite.rect(this._width - this.borderWidth, 0, this.borderWidth, this.height);
    this.borderSprite.fill(Graphics.color.White);
  }
  // last work here: progress bar
  /*-------------------------------------------------------------------------*/
}
/**----------------------------------------------------------------------------
 * > A bar that allowed to drag with mouse to adjust values
 * @class
 * @extends SpriteCanvas
 * @property {function} handler - the function to call when refreshed
 *                                (value changed)
 */
class Sprite_DragBar extends SpriteCanvas{
  /**------------------------------------------------------------------------
   * @param {Number} x
   * @param {Number} y
   * @param {Number} width
   * @param {Number} height
   * @param {Number} minn  - minimum value
   * @param {Number} maxn  - maximum value
   * @param {Number} initn - initial value
   */
  constructor(x, y, width, height = 30, minn = 0, maxn = 100, initn = null){
    if(!height){height = 30;}
    if(!minn){minn = 0;}
    if(!maxn){maxn = 100;}
    super(x, y, width, height);
    // Zero is a valid value for volume sliders; only use the midpoint when
    // no initial value was supplied.
    if(initn === null || initn === undefined){initn = (minn + maxn) / 2;}
    this.valuePeak = [minn, maxn];
    this.value     = initn;
    this.step      = 0;
    this.handler   = null;
    this.fillColor = Graphics.color.DeepSkyBlue;
    this.createDragButton();
    this.createDragBar();
    // Allow clicking and dragging anywhere on the slider, not only on the
    // knob. The hit area also makes the thin visual track easier to use.
    this.eventMode = 'static';
    this.hitArea = new Rect(0, 0, this.width, this.height);
    this.on('pointerdown', this.onTrackPointerDown.bind(this));
    this.on('pointerup', this.onDragEnd.bind(this));
    this.on('pointerupoutside', this.onDragEnd.bind(this));
    this.on('pointercancel', this.onDragEnd.bind(this));
    this.on('globalpointermove', this.onDragMove.bind(this));
    this.on('pointertap', function(event){event.stopPropagation?.();});
    this.refresh();
  }
  /*-------------------------------------------------------------------------*/
  get barHeight(){return 4;}
  get barWidth(){return this.width - this.dragButton.width;}
  get xOffset(){return this.dragButton.width / 2;}
  /*-------------------------------------------------------------------------*/
  get valuedWidth(){
    return this.barWidth * (this.value - this.valuePeak[0]) / (this.valuePeak[1] - this.valuePeak[0]);
  }
  /*-------------------------------------------------------------------------*/
  refresh(){
    this.updateButtonLocation();
    this.drawBar();
    if(this.handler){this.handler(this.value);}
  }
  /*-------------------------------------------------------------------------*/
  createDragButton(){
    this.dragButton = (new Sprite()).drawIcon(184,0,0);
    let offset = 2;
    this.dragButton.y = (this.height - this.barHeight) / 2 - (this.dragButton.height / 2) + offset;
    this.dragButton.setZ(1);
    this.addChild(this.dragButton);
    this.dragButton.eventMode = 'static';
    this.dragButton.on('pointerdown', this.onDragStart.bind(this));
    this.dragButton.on('pointerup', this.onDragEnd.bind(this));
    this.dragButton.on('pointerupoutside', this.onDragEnd.bind(this));
    this.dragButton.on('pointercancel', this.onDragEnd.bind(this));
  }
  /*-------------------------------------------------------------------------*/
  onDragStart(event){
    this.dragButton.dragging = true;
  }
  /*-------------------------------------------------------------------------*/
  onTrackPointerDown(event){
    this.dragButton.dragging = true;
    this.onDragMove(event);
    event.stopPropagation?.();
  }
  /*-------------------------------------------------------------------------*/
  onDragEnd(event){
    this.dragButton.dragging = false;
  }
  /*-------------------------------------------------------------------------*/
  onDragMove(event){
    if(!this.dragButton.dragging){return ;}
    let offset = this.xOffset;
    let dx = event.getLocalPosition(this).x - offset;
    this.dragButton.x = Math.min(Math.max(0, dx), this.barWidth);
    this.value = this.normalizeValue(
      this.valuePeak[0] + (this.valuePeak[1] - this.valuePeak[0])
        * (this.dragButton.x / this.dragBar.width)
    );
    this.refresh();
  }
  /*-------------------------------------------------------------------------*/
  createDragBar(){
    this.dragBar   = new PIXI.Graphics();
    this.dragBar.x = this.xOffset;
    this.dragBar.y = (this.height - this.barHeight) / 2;
    this.addChild(this.dragBar);
  }
  /*-------------------------------------------------------------------------*/
  setValue(v){
    this.value = this.normalizeValue(v);
    this.refresh();
  }
  /*-------------------------------------------------------------------------*/
  normalizeValue(v){
    const min = this.valuePeak[0];
    const max = this.valuePeak[1];
    const clamped = Math.min(max, Math.max(min, Number(v)));
    if(!this.step || this.step <= 0){return clamped;}
    return Math.min(max, min + Math.round((clamped - min) / this.step) * this.step);
  }
  /*-------------------------------------------------------------------------*/
  updateButtonLocation(){
    this.dragButton.x = this.dragBar.x + this.valuedWidth - this.dragButton.width / 2;
  }
  /*-------------------------------------------------------------------------*/
  drawBar(){
    this.dragBar.clear();
    this.dragBar.rect(0, 0, this.valuedWidth, this.barHeight).fill(this.fillColor);
    this.dragBar
      .rect(this.valuedWidth, 0, this.barWidth - this.valuedWidth, this.barHeight)
      .fill(Graphics.color.Black);
  }
  /*-------------------------------------------------------------------------*/
  changeColor(c){
    this.fillColor = c;
    this.refresh();
  }
  /*-------------------------------------------------------------------------*/
}
/**
 * This object represent the deck durnig the game
 */
class Game_Deck{
  /**
   * @constructor
   * @param {boolean} extraCardsEnabled
   */
  constructor(extraCardsEnabled){
    this.extraCardsEnabled = extraCardsEnabled;
    this.deck = [];
    if(this.extraCardsEnabled){this.totalCardsNumber = 116;}
    else{this.totalCardsNumber = 108;}
  }
  /*-------------------------------------------------------------------------*/
  get size(){return this.deck.length;}
  /**-------------------------------------------------------------------------
   * Shuffle the deck
   */ 
  shuffle(){
    this.deck.shuffle();
    return this;
  }
  /**-------------------------------------------------------------------------
   * Restore all cards
   */
  restore(){

  }
  /*-------------------------------------------------------------------------*/
  push(){

  }
  /*-------------------------------------------------------------------------*/
  pop(){

  }
  /*-------------------------------------------------------------------------*/
  insert(){

  }
  /*-------------------------------------------------------------------------*/
  remove(){

  }
  /*-------------------------------------------------------------------------*/
  top(){
    return this.deck[this.size - 1];
  }
  /*-------------------------------------------------------------------------*/
  /**
   * Get the card sprite at the top of the deck
   * @param {Boolean} covered - Return the card cover if true
   */
  getTopImage(covered = false){
    if(covered){
      return Graphics.CardBack;
    }

  }
  /*-------------------------------------------------------------------------*/
}
/**
 * The basic puno card object
 */
class Game_Card extends SpriteCanvas{
  /**
   * @constructor
   * @param {Number} cardId - Id of the card
   */
  constructor(cardId){
    super(0, 0, 212, 300);
    this.cardId = cardId;
  }
  /*-------------------------------------------------------------------------*/
  loadSprite(){
    
  }
  /*-------------------------------------------------------------------------*/
}
/**
 * The player object, also including NPC
 */
class Game_Player{

  constructor(){
    this.hands = [];
  }


}

Object.assign(globalThis, {
  Sprite_ProgressBar,
  Sprite_DragBar,
  Game_Deck,
  Game_Card,
  Game_Player,
});
