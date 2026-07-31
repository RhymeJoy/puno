<script setup lang="ts">
const { t, locale, setLocale, getLocaleMessage } = useI18n()

type LocaleCode = 'en_us' | 'zh_tw' | 'zh_cn' | 'fr_fr' | 'ja_jp' | 'ko_kr'

const allowedRuleTags = new Set([
  'b', 'strong', 'i', 'em', 'br', 'img',
  'h3', 'p', 'ul', 'ol', 'li',
])
const allowedRuleAttributes = new Set(['src', 'width', 'height', 'class', 'alt'])

function escapeRuleAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function isSafeRuleImageSource(value: string) {
  const source = value.trim()
  return /^(?:https?:\/\/|\/|assets\/)/i.test(source) &&
    !/^(?:javascript|data|vbscript):/i.test(source)
}

const friendlyRuleTerms: Record<string, Record<string, string>> = {
  zh_tw: {
    'Wild Draw Four': '變色 +4 罰抽牌',
    'Draw Two': '+2 罰抽牌',
    Zero: '0',
    Skip: '跳過牌',
    Reverse: '反轉牌',
    'Wild Chaos': '混沌萬用牌',
    'Wild Hit All': '全體攻擊牌',
    'Discard All': '全部棄牌',
    Trade: '交換牌',
    Wild: '萬用牌',
    Traditional: '傳統模式',
    'Death Match': '死鬥模式',
  },
  zh_cn: {
    'Wild Draw Four': '变色 +4 罚抽牌',
    'Draw Two': '+2 罚抽牌',
    Zero: '0',
    Skip: '跳过牌',
    Reverse: '反转牌',
    'Wild Chaos': '混沌万能牌',
    'Wild Hit All': '全体攻击牌',
    'Discard All': '全部弃牌',
    Trade: '交换牌',
    Wild: '万能牌',
    Traditional: '经典模式',
    'Death Match': '死斗模式',
  },
  fr_fr: {
    'Wild Draw Four': 'Joker +4',
    'Draw Two': '+2',
    Zero: '0',
    Skip: 'Passe',
    Reverse: 'Inverser',
    'Wild Chaos': 'Joker Chaos',
    'Wild Hit All': 'Joker Tous',
    'Discard All': 'Tout jeter',
    Trade: 'Échange',
    Wild: 'Joker',
    Traditional: 'Mode traditionnel',
    'Death Match': 'Match à mort',
  },
  ja_jp: {
    'Wild Draw Four': 'ワイルドドロー4',
    'Draw Two': 'ドロー2',
    Zero: '0',
    Skip: 'スキップ',
    Reverse: 'リバース',
    'Wild Chaos': 'ワイルドカオス',
    'Wild Hit All': 'ワイルドヒットオール',
    'Discard All': '全捨て',
    Trade: '交換',
    Wild: 'ワイルド',
    Traditional: 'クラシックモード',
    'Death Match': 'デスマッチ',
  },
  ko_kr: {
    'Wild Draw Four': '와일드 +4',
    'Draw Two': '+2',
    Zero: '0',
    Skip: '스킵',
    Reverse: '리버스',
    'Wild Chaos': '와일드 카오스',
    'Wild Hit All': '와일드 히트 올',
    'Discard All': '모두 버리기',
    Trade: '교환',
    Wild: '와일드',
    Traditional: '클래식 모드',
    'Death Match': '데스 매치',
  },
}

const timedRuleContent: Record<LocaleCode, string> = {
  zh_tw: '<h3>限時模式</h3><ul><li>牌堆固定為無限，不顯示牌堆剩餘數量。</li><li>可設定總時間 30～600 秒，以及每位玩家回合 1～5 秒。</li><li>每打出一張牌加 5 分；手牌出清時額外加 100 分，並立即補回起始手牌（預設 7 張）。</li><li>回合超時會自動抽牌且不能出牌；若有待處理罰抽，抽取原本罰抽數量再加 1 張。</li><li>時間結束時分數最高者獲勝；同分時手牌較少者優先。</li></ul>',
  zh_cn: '<h3>限时模式</h3><ul><li>牌堆固定为无限，不显示牌堆剩余数量。</li><li>可设置总时间 30～600 秒，以及每位玩家回合 1～5 秒。</li><li>每打出一张牌加 5 分；手牌出清时额外加 100 分，并立即补回起始手牌（默认 7 张）。</li><li>回合超时会自动抽牌且不能出牌；若有待处理罚抽，抽取原本罚抽数量再加 1 张。</li><li>时间结束时分数最高者获胜；同分时手牌较少者优先。</li></ul>',
  en_us: '<h3>Timed Mode</h3><ul><li>The deck is always infinite, so no remaining deck count is shown.</li><li>Set the total time from 30 to 600 seconds and each player turn from 1 to 5 seconds.</li><li>Each played card gives 5 points. Clearing a hand gives an extra 100 points, then the starting hand size is dealt immediately (7 cards by default).</li><li>When a turn times out, the player draws cards and cannot play them. If a penalty is pending, draw the original penalty amount plus one.</li><li>When time runs out, the highest score wins; ties favor the player with fewer cards in hand.</li></ul>',
  fr_fr: '<h3>Mode chronométré</h3><ul><li>La pioche est toujours infinie et son nombre restant n’est pas affiché.</li><li>Réglez la durée totale de 30 à 600 secondes et chaque tour de 1 à 5 secondes.</li><li>Chaque carte jouée rapporte 5 points. Vider sa main rapporte 100 points supplémentaires, puis la main initiale est distribuée immédiatement (7 cartes par défaut).</li><li>En cas de dépassement du temps, le joueur pioche sans pouvoir jouer les cartes. Une pénalité en attente ajoute une carte au nombre prévu.</li><li>À la fin du temps, le meilleur score gagne ; en cas d’égalité, la main la plus courte est prioritaire.</li></ul>',
  ja_jp: '<h3>タイムモード</h3><ul><li>山札は常に無限で、残り枚数は表示されません。</li><li>全体時間は30～600秒、各プレイヤーのターンは1～5秒で設定できます。</li><li>出したカード1枚につき5点。手札をなくすと追加で100点を得て、初期手札枚数（初期値7枚）がすぐ補充されます。</li><li>ターン制限時間を超えるとカードを引き、引いたカードは出せません。保留中のペナルティがあれば通常枚数に1枚を加えて引きます。</li><li>時間終了時に最高得点が勝利し、同点なら手札が少ない方を優先します。</li></ul>',
  ko_kr: '<h3>시간 제한 모드</h3><ul><li>덱은 항상 무한이며 남은 덱 수는 표시되지 않습니다.</li><li>전체 시간은 30~600초, 각 플레이어의 턴은 1~5초로 설정할 수 있습니다.</li><li>카드를 한 장 낼 때마다 5점을 얻습니다. 손패를 모두 내면 추가 100점을 얻고 시작 손패 수(기본 7장)를 즉시 보충합니다.</li><li>턴 시간이 초과되면 카드를 자동으로 뽑고 낼 수 없습니다. 대기 중인 벌칙이 있으면 원래 벌칙 수에 1장을 더해 뽑습니다.</li><li>시간이 끝났을 때 점수가 가장 높은 플레이어가 승리하며, 동점이면 손패가 적은 플레이어가 우선입니다.</li></ul>',
}

function localizeRuleTerms(value: string) {
  const terms = friendlyRuleTerms[locale.value]
  if (!terms) return value

  return Object.entries(terms).reduce(
    (result, [source, replacement]) => result.split(source).join(replacement),
    value,
  )
}

// Rule text is stored in the local translation files and intentionally uses a
// few formatting tags. Keep that formatting while allowing only the tags and
// image attributes that the rule page actually needs.
function sanitizeRuleHtml(value: unknown) {
  const html = String(value ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|form|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')

  return html.replace(/<\s*(\/?)\s*([a-z][\w-]*)\b([^>]*)>/gi,
    (full, closing: string, rawTag: string, rawAttributes: string) => {
      const tag = rawTag.toLowerCase()
      if(!allowedRuleTags.has(tag)){return ''}
      if(closing){return tag === 'br' || tag === 'img' ? '' : `</${tag}>`}
      if(tag === 'br'){return '<br>'}
      if(tag !== 'img'){return `<${tag}>`}

      const attributes: string[] = []
      rawAttributes.replace(/([:\w-]+)\s*=\s*(["'])([\s\S]*?)\2/g,
        (_match: string, rawName: string, _quote: string, rawValue: string) => {
          const name = rawName.toLowerCase()
          const attributeValue = rawValue.trim()
          if(!allowedRuleAttributes.has(name)){return ''}
          if(name === 'src' && !isSafeRuleImageSource(attributeValue)){return ''}
          if(name === 'class' && !/^[\w -]+$/.test(attributeValue)){return ''}
          if((name === 'width' || name === 'height') && !/^[\d.]+%?$/.test(attributeValue)){return ''}
          attributes.push(`${name}="${escapeRuleAttribute(attributeValue)}"`)
          return ''
        })
      return `<img${attributes.length ? ` ${attributes.join(' ')}` : ''}>`
    })
}

const vSafeHtml = {
  mounted(element: HTMLElement, binding: { value: unknown }) {
    element.innerHTML = sanitizeRuleHtml(binding.value)
  },
  updated(element: HTMLElement, binding: { value: unknown }) {
    element.innerHTML = sanitizeRuleHtml(binding.value)
  },
  getSSRProps(binding: { value: unknown }) {
    return { innerHTML: sanitizeRuleHtml(binding.value) }
  },
}

// Read rule bodies without passing them through `t()`. Vue I18n warns when
// `t()` receives a message containing HTML, even though these messages are
// intentionally rendered by the restricted directive above.
function ruleMessage(key: string) {
  const message = getLocaleMessage(locale.value)[key]
  if (typeof message !== 'string') return ''

  let result = localizeRuleTerms(message)
  if (key === 'CurrentRulesContent') {
    const crossTypeRule = getLocaleMessage(locale.value).RulesCrossTypeColor
    if (typeof crossTypeRule === 'string') {
      const localizedNote = localizeRuleTerms(crossTypeRule)
        .replace(/^<p>/, '<li>')
        .replace(/<\/p>$/, '</li>')
      let headingCount = 0
      result = result.replace(/<h3>[^<]*<\/h3><ul>/g, (section) => {
        headingCount += 1
        return headingCount === 4 ? section + localizedNote : section
      })
    }
    result += timedRuleContent[locale.value as LocaleCode] || timedRuleContent.en_us
  }
  return result
}

async function setLanguage(nextLanguage: LocaleCode) {
  await setLocale(nextLanguage)
  window.localStorage.setItem('language', JSON.stringify(nextLanguage))
}

useHead(() => ({
  title: t('RulesTitle'),
}))
</script>

<template>
  <main class="rules-page">
    <nav class="rules-nav">
      <NuxtLink to="/">← Battle-Puno</NuxtLink>
      <span>
        <button type="button" :class="{ active: locale === 'en_us' }" @click="setLanguage('en_us')">English</button>
        <button type="button" :class="{ active: locale === 'zh_tw' }" @click="setLanguage('zh_tw')">繁中</button>
        <button type="button" :class="{ active: locale === 'zh_cn' }" @click="setLanguage('zh_cn')">简中</button>
        <button type="button" :class="{ active: locale === 'fr_fr' }" @click="setLanguage('fr_fr')">Français</button>
        <button type="button" :class="{ active: locale === 'ja_jp' }" @click="setLanguage('ja_jp')">日本語</button>
        <button type="button" :class="{ active: locale === 'ko_kr' }" @click="setLanguage('ko_kr')">한국어</button>
      </span>
    </nav>

    <h1>{{ t('RulesTitle') }}</h1>
    <hr>

    <section class="rules-toc">
      <ul>
        <li><a href="#current-rules">{{ t('RulesCurrent') }}</a></li>
      </ul>
    </section>

    <section id="current-rules">
      <h2>{{ t('RulesCurrent') }}</h2>
      <div v-safe-html="ruleMessage('CurrentRulesContent')" />
    </section>
  </main>
</template>
