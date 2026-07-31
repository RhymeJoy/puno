// @ts-nocheck
/**
 * > Add-ons for library/default classes
 */

/**--------------------------------------------------------------------------
 * Check whether number between two value
 */
Number.prototype.between = function(a, b, closeure = true) {
  let minn = Math.min.apply(Math, [a, b]), maxn = Math.max.apply(Math, [a, b]);
  return closeure ? (this > minn && this < maxn) : (this >= minn && this <= maxn);
};
/**
 * PixiJS 8's Sprite, Text and Graphics share Container rather than Text
 * inheriting Sprite as it did in v4. Put the runtime helpers on Container so
 * every scene object receives the same behavior.
 */
PIXI.Container.prototype.show = function(){
  this.visible = true;
  return this;
}
PIXI.Container.prototype.hide = function(){
  this.visible = false;
  return this;
}
PIXI.Container.prototype.setZ = function(z = 0){
  this.zIndex = z;
  return this;
}
PIXI.Container.prototype.setOpacity = function(opa){
  this.alpha = opa;
  return this;
}
PIXI.Container.prototype.setPOS = function(x, y){
  this.position.set(x == null ? this.x : x, y == null ? this.y : y);
  return this;
}
PIXI.Container.prototype.rotateDegree = function(deg){
  this.rotation = (deg == 0) ? 0 : Math.PI * 2 * ((deg%360) / 360);
  return this;
}
PIXI.Container.prototype.activate = function(){
  this.eventMode = 'static';
  return this;
}
PIXI.Container.prototype.deactivate = function(){
  this.eventMode = 'none';
  return this;
}
PIXI.Container.prototype.isActivate = function(){
  return this.eventMode === 'static' || this.eventMode === 'dynamic';
}
PIXI.Container.prototype.isActive = PIXI.Container.prototype.isActivate;
