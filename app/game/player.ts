import { Card } from './card/card'
import { Color, type ColorId } from './card/color'
import { Value } from './card/value'
import { Mode } from './mode'

export class Player {
  name: string
  score = 0
  initHP: number
  hp: number
  ai: boolean
  knockOut = false
  hand: Card[] = []
  damageStack = 0
  unoCalled = false

  constructor(name: string, initHP: number, ai = true) {
    this.name = name
    this.initHP = initHP
    this.hp = initHP
    this.ai = ai
  }

  reset() {
    this.hp = this.initHP
    this.hand.length = 0
    this.knockOut = false
    this.damageStack = 0
    this.unoCalled = false
  }

  deal(cards: Card[]) {
    if (cards.length > 0) this.unoCalled = false
    this.hand = this.hand.concat(cards)
    this.sortHand()
    return this.hand
  }

  sortHand() {
    this.hand.sort((a, b) => a.color === b.color ? a.value - b.value : a.color - b.color)
  }

  findMatchedCard(color: ColorId | -1, value: number) {
    for (const [index, card] of this.hand.entries()) {
      if (card.color === color || card.value === value) return index
    }
    return this.findWildCard()
  }

  findWildCard() {
    for (const [index, card] of this.hand.entries()) {
      if (card.color === Color.WILD) return index
    }
    return -1
  }

  findCard(card: Card, compareId = false) {
    for (const [index, handCard] of this.hand.entries()) {
      if (handCard.isEqual(card, compareId)) return index
    }
    return -1
  }

  discard(index: number) {
    return this.hand.splice(index, 1)[0]
  }

  matching(color: ColorId | -1, value: number) {
    const matched: number[] = []
    for (const [index, card] of this.hand.entries()) {
      if (card.isMatched(color, value)) matched.push(index)
    }
    if (matched.length === 0) return -1
    return matched[Math.floor(Math.random() * matched.length)]
  }

  findAllCardsByColor(color: ColorId | -1) {
    const matched: number[] = []
    for (const [index, card] of this.hand.entries()) {
      if (card.color === color) matched.push(index)
    }
    return matched.reverse()
  }

  receivePenalty(penaltyCard: Card, currentColor: ColorId | -1) {
    if (penaltyCard.value === Value.SKIP) return -1
    const gameManager = (globalThis as any).GameManager
    let matchedCard = -1
    if (gameManager.game.penaltyTransferEnabled) {
      matchedCard = this.findCard(new Card(currentColor, Value.SKIP))
      if (matchedCard === -1) matchedCard = this.findCard(new Card(currentColor, Value.REVERSE))
    }

    if (matchedCard === -1 && penaltyCard.value === Value.DRAW_TWO) {
      if (gameManager.game.drawTwoStacking) {
        matchedCard = this.findCard(new Card(-1, Value.DRAW_TWO))
      }
    }
    if (matchedCard === -1 && penaltyCard.value === Value.WILD_DRAW_FOUR) {
      if (gameManager.game.drawFourStacking) {
        matchedCard = this.findCard(new Card(-1, Value.WILD_DRAW_FOUR))
      }
    }
    if (matchedCard === -1 && gameManager.game.drawTwoFourStacking) {
      if (penaltyCard.value === Value.DRAW_TWO && gameManager.game.drawFourStacking) {
        matchedCard = this.findCard(new Card(-1, Value.WILD_DRAW_FOUR))
      } else if (penaltyCard.value === Value.WILD_DRAW_FOUR && gameManager.game.drawTwoStacking) {
        // Cross-type +4 -> +2 stacking must follow the color selected by +4.
        matchedCard = this.findCard(new Card(currentColor, Value.DRAW_TWO))
      }
    }
    return matchedCard
  }

  isGoingOut() {
    return this.hand.length === 0
  }

  uno() {
    this.unoCalled = true
    ;(globalThis as any).debug_log(this.name, 'CALL UNO!!!')
  }

  cardsPointSum() {
    return this.hand.reduce((sum, card) => sum + card.point, 0)
  }
}

(globalThis as any).Player = Player
