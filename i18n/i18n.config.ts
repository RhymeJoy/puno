import enUS from '../app/game/data/en_us.json'
import zhTW from '../app/game/data/zh_tw.json'
import zhCN from '../app/game/data/zh_cn.json'
import frFR from '../app/game/data/fr_fr.json'
import jaJP from '../app/game/data/ja_jp.json'
import koKR from '../app/game/data/ko_kr.json'

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en_us',
  fallbackLocale: 'en_us',
  messages: {
    en_us: enUS,
    zh_tw: zhTW,
    zh_cn: zhCN,
    fr_fr: frFR,
    ja_jp: jaJP,
    ko_kr: koKR,
  },
}))
