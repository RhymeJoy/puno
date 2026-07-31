// @ts-nocheck
//-----------------------------------------------------------------------------
/**
 *  Global constants
**/


// Initialize kernel module
DataManager.initialize();

/**
 * Debug mode flag, prints debug information and allow to use cheat function
 * if enabled.
 * @global
 * @type {boolean}
 */
const DebugMode   = DataManager.debugMode;

// Will go to Test Scene if set to true
const TestMode    = false;

/**
 * Flag that determines whether skips the intro scene
 * @global
 * @type {boolean}
 */
const QuickStart  = false;

/**
 * A paragraph-wrap line of string for debug console
 * @global
 * @type {string}
 */
const SplitLine   = "-------------------------\n"

/**
 * Flag represents whether the game has loaded and started
 * @global
 * @type {boolean}
 */
var GameStarted   = false;

/**
 * Flag whether encountered a fatel error and game cannot be continued
 * @global
 * @type {boolean}
 */
var FatelError    = false;

let startupTimer = null;

function clearStartupTimer(){
  if(startupTimer !== null){
    clearTimeout(startupTimer);
    startupTimer = null;
  }
}

function scheduleStart(delay){
  clearStartupTimer();
  startupTimer = setTimeout(function(){
    startupTimer = null;
    start();
  }, delay);
}

/**
 * > Game initialize process
 */
function initializeApplication(){
  clearStartupTimer();
  // Disable page scrolling
  // DisablePageScroll();
  // Confirm leave before page unload
  RegisterLeaveEvent();
  Vocab.initialize();
  // call start
  scheduleStart(2000);
}

function stopApplication(){
  clearStartupTimer();
}

/**
 * Start Processing, call itself 0.5 sec later if DataManager is not ready
 */
async function start(){
  // wait until initial data is ready
  if(!DataManager.isReady() || !Graphics.jsonReady || !Sound.jsonReady){
    return scheduleStart(500);
  }
  debug_log("start")
  
  try{
    await SceneManager.run();
  }
  catch(e){
    reportError(e);
  }
}

Object.assign(globalThis, {
  DebugMode,
  TestMode,
  QuickStart,
  SplitLine,
  GameStarted,
  FatelError,
  initializeApplication,
  stopApplication,
  start,
});
