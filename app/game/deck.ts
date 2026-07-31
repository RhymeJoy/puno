import { Card } from './card/card'
import { Color } from './card/color'
import { Value } from './card/value'

export class Deck {
  deck: Card[] = []
  extraCardDisabled: boolean
  tradeCardDisabled: boolean
  cardLimit: number
  infinite: boolean

  constructor(extraCardDisabled: boolean, tradeCardDisabled = false, cardLimit = 0) {
    this.extraCardDisabled = extraCardDisabled
    this.tradeCardDisabled = tradeCardDisabled
    this.cardLimit = Number.isInteger(cardLimit) && cardLimit >= 100 ? cardLimit : 0
    this.infinite = this.cardLimit === 0
    for (let color = Color.RED; color <= Color.BLUE; ++color) {
      for (let value = Value.ZERO; value <= Value.DRAW_TWO; ++value) {
        const coloredCard = new Card(color, value)
        for (let i = 0; i < coloredCard.numCards; ++i) {
          const card = new Card(color, value)
          card.numID = i
          this.deck.push(card)
        }
      }
    }

    for (let value = Value.TRADE; value <= Value.WILD_DRAW_FOUR; ++value) {
      const wildCard = new Card(Color.WILD, value)
      if (extraCardDisabled && wildCard.optional && value !== Value.TRADE) continue
      if (tradeCardDisabled && value === Value.TRADE) continue
      for (let i = 0; i < wildCard.numCards; ++i) {
        const card = new Card(Color.WILD, value)
        card.numID = i
        this.deck.push(card)
      }
    }

    // A finite custom deck uses the normal UNO card distribution as its
    // template, then trims or repeats cards to reach the requested size.
    if (this.cardLimit > 0) {
      const template = this.deck.slice()
      if (this.cardLimit < this.deck.length) {
        this.shuffle()
        this.deck.length = this.cardLimit
      } else {
        while (this.deck.length < this.cardLimit) {
          const source = template[this.deck.length % template.length]!
          const copy = new Card(source.color, source.value)
          copy.numID = source.numID
          this.deck.push(copy)
        }
      }
    }
    this.shuffle()
  }

  shuffle() {
    for (let i = this.deck.length - 1; i > 0; --i) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.deck[i], this.deck[j]] = [this.deck[j]!, this.deck[i]!]
    }
  }

  draw(numCards: number, supplement?: Card[]) {
    if (numCards <= 0) return []
    if (this.infinite) {
      while (this.deck.length < numCards) this.refill()
    }
    if (numCards > this.deck.length) {
      if (!supplement?.length) return this.deck.splice(0)
      this.putback(supplement.splice(0))
      this.shuffle()
    }
    return this.deck.splice(-numCards)
  }

  refill() {
    const fresh = new Deck(this.extraCardDisabled, this.tradeCardDisabled, this.cardLimit)
    this.deck.push(...fresh.deck)
    this.shuffle()
  }

  drawNumbered(numCards: number) {
    const numberedCards: Card[] = []
    const notNumberedCards: Card[] = []
    while (this.deck.length !== 0 && numberedCards.length < numCards) {
      const card = this.deck.splice(-1)[0]!
      if (card.numbered) numberedCards.push(card)
      else notNumberedCards.push(card)
    }
    this.putback(notNumberedCards)
    return numberedCards
  }

  drawColored(numCards: number) {
    const coloredCards: Card[] = []
    const wildCards: Card[] = []
    while (this.deck.length !== 0 && coloredCards.length < numCards) {
      const card = this.deck.splice(-1)[0]!
      if (card.color === Color.WILD) wildCards.push(card)
      else coloredCards.push(card)
    }
    this.putback(wildCards)
    return coloredCards
  }

  putback(cards: Card[]) {
    this.deck = cards.concat(this.deck)
  }

  clear() {
    this.deck.length = 0
  }

  get length() {
    return this.deck.length
  }
}

(globalThis as any).Deck = Deck
