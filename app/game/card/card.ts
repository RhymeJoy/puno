import { Color } from './color'
import { Value, type ValueId } from './value'

export class Card {
  color: number
  value: ValueId
  point: number
  optional: boolean
  numCards: number
  numbered: boolean
  penalty: boolean
  numID = 0

  constructor(color: number, value: ValueId) {
    this.color = color
    this.value = value
    this.point = (() => {
      switch (value) {
        case Value.SKIP:
        case Value.REVERSE:
        case Value.DRAW_TWO:
          return 20
        case Value.WILD:
        case Value.WILD_CHAOS:
          return 30
        case Value.TRADE:
        case Value.DISCARD_ALL:
        case Value.WILD_HIT_ALL:
        case Value.WILD_DRAW_FOUR:
          return 50
        default:
          return value
      }
    })()
    this.optional = value === Value.TRADE
      || value === Value.DISCARD_ALL
      || value === Value.WILD_CHAOS
      || value === Value.WILD_HIT_ALL
    this.numCards = value === Value.ZERO
      ? 1
      : value === Value.WILD || value === Value.WILD_DRAW_FOUR ? 4 : 2
    this.numbered = value >= Value.ZERO && value <= Value.NINE
    this.penalty = value === Value.SKIP || value === Value.DRAW_TWO || value === Value.WILD_DRAW_FOUR
  }

  isEqual(card: Card, compareId = false) {
    if (compareId) {
      return this.numID === card.numID
        && (card.color === -1 || this.color === card.color)
        && this.value === card.value
    }
    return (card.color === -1 || this.color === card.color) && this.value === card.value
  }

  isMatched(color: number, value: number) {
    return this.color === color || this.value === value || this.color === Color.WILD
  }
}

(globalThis as any).Card = Card
