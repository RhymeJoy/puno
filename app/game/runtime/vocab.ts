// @ts-nocheck
import enUS from '../data/en_us.json'
import zhTW from '../data/zh_tw.json'
import zhCN from '../data/zh_cn.json'
import frFR from '../data/fr_fr.json'
import jaJP from '../data/ja_jp.json'
import koKR from '../data/ko_kr.json'

const languageData = {
  en_us: enUS,
  zh_tw: zhTW,
  zh_cn: zhCN,
  fr_fr: frFR,
  ja_jp: jaJP,
  ko_kr: koKR,
};

/**----------------------------------------------------------------------------
 * > The module that handles vocabularies
 * 
 * @namespace Vocab
 */
class Vocab{
  /**--------------------------------------------------------------------------
   * @constructor
   */
  constructor(){
    throw new Error('this is a static class');
  }
  /**--------------------------------------------------------------------------
   * Setup
   */
  static initialize(){
    this.Language   = DataManager.language;
    this.ready      = false;
    this.loadLanguageFile();
  }
  /*-------------------------------------------------------------------------*/
  static loadLanguageFile(){
    const dict = {
      ...languageData.en_us,
      ...(languageData[Vocab.Language] || {}),
    };
    for (const key in dict) {
      Vocab[key] = dict[key];
    }
    Vocab.ready = true;
    debug_log("Vocab loaded");
  }
  /*-------------------------------------------------------------------------*/
  static onLoadError(){
    DataManager.changeSetting(DataManager.kLanguage, DataManager.DefaultLanguage);
    Vocab.Language = DataManager.language;
    Vocab.loadLanguageFile();
  }
  /*-------------------------------------------------------------------------*/
  static isReady(){
    return this.ready;
  }
  /*-------------------------------------------------------------------------*/
}

globalThis.Vocab = Vocab;
