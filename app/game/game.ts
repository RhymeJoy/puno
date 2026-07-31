// @ts-nocheck
class PunoGame {
  constructor(initCardNumber, initHP, scoreGoal, extraCardDisabled, gameMode, playerNames = [],
      drawTwoStacking = true, drawFourStacking = true, tradeCardDisabled = false,
      penaltyTransferEnabled = true, drawUntilPlayable = false,
      drawTwoFourStacking = false, deckCardNumber = 0, unoPenaltyCards = 2,
      timedDuration = 180, timedTurnSeconds = 3) {
    const names = Array.isArray(playerNames) ? playerNames : [];
    this.players = Array.from({length: 4}, function(_, index){
      const label = (globalThis.Vocab && Vocab.Player) || 'Player';
      const name = names[index] || (label + ' ' + (index + 1));
      return new Player(name, initHP, index !== 0);
    });
    this.initCardNumber = initCardNumber;
    this.scoreGoal = scoreGoal;
    this.extraCardDisabled = extraCardDisabled;
    this.drawTwoStacking = drawTwoStacking;
    this.drawFourStacking = drawFourStacking;
    this.tradeCardDisabled = tradeCardDisabled;
    this.penaltyTransferEnabled = penaltyTransferEnabled;
    this.drawUntilPlayable = drawUntilPlayable;
    this.drawTwoFourStacking = drawTwoFourStacking;
    this.deckCardNumber = deckCardNumber;
    this.unoPenaltyCards = Number.isInteger(unoPenaltyCards) && unoPenaltyCards >= 1 && unoPenaltyCards <= 4
      ? unoPenaltyCards : 2;
    this.timedDuration = Number.isInteger(timedDuration) && timedDuration >= 30
      ? timedDuration : 180;
    this.timedTurnSeconds = Number.isInteger(timedTurnSeconds) && timedTurnSeconds >= 1
      ? timedTurnSeconds : 3;
    this.timedStartedAt = 0;
    this.timedEnded = false;
    this.timedRemaining = this.timedDuration;
    this.timedTurnStartedAt = 0;
    this.clockwise = true;
    this.currentPlayerIndex = undefined;
    this.currentColor = undefined;
    this.currentValue = undefined;
    this.deck = null;
    this.discardPile = [];
    this.penaltyCard = undefined;
    this.penaltyPool = 0;
    this.gameMode = gameMode;
    this.damagePool = 0;
    this.damageTypes = [false, false, false, false, false];
    this.maxHandThreshold = this.initCardNumber + 1;
    this.initialDealPending = 0;
    this.firstCardDrawn = false;
  }

  numAlivePlayers() {
    let alivePlayersCount = 0;
    for (let i in this.players) {
      if (!this.players[i].knockOut) {
        ++alivePlayersCount;
      }
    }
    return alivePlayersCount;
  }

  getAlivePlayers() {
    let alivePlayers = [];
    for (let i in this.players) {
      if (!this.players[i].knockOut) {
        alivePlayers.push(this.players[i]);
      }
    }
    return alivePlayers;
  }

  chooseDealer() {
    let highest = 0;
    let deadlock = true;
    let firstDraw = undefined;
    while(deadlock){
      firstDraw = this.deck.drawNumbered(4);
      deadlock = false;
      for (let i = 1; i < 4; ++i) {
        if (firstDraw[i].value > firstDraw[highest].value) {
          highest = i;
          deadlock = false;
        } else if (firstDraw[i].value === firstDraw[highest].value) {
          deadlock = true;
        }
      }
      this.deck.putback(firstDraw);
      if (deadlock) {
        debug_log("deadlock => redraw");
      }
    }
    // Dealer selection is a logic-only draw. Do not animate these temporary
    // cards; the actual opening deal follows immediately afterwards.
    for (let i in this.players) {
      debug_log(this.players[i].name, firstDraw[i]);
    }
    return highest;
  }

  currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  cardColorName(color) {
    return {
      [Color.WILD]: '萬用',
      [Color.RED]: '紅色',
      [Color.YELLOW]: '黃色',
      [Color.GREEN]: '綠色',
      [Color.BLUE]: '藍色',
    }[color] || `未知顏色(${color})`;
  }

  cardValueName(value) {
    return {
      [Value.ZERO]: '0',
      [Value.ONE]: '1',
      [Value.TWO]: '2',
      [Value.THREE]: '3',
      [Value.FOUR]: '4',
      [Value.FIVE]: '5',
      [Value.SIX]: '6',
      [Value.SEVEN]: '7',
      [Value.EIGHT]: '8',
      [Value.NINE]: '9',
      [Value.SKIP]: '跳過',
      [Value.REVERSE]: '反轉',
      [Value.DRAW_TWO]: '+2',
      [Value.TRADE]: '交換',
      [Value.DISCARD_ALL]: '全部棄牌',
      [Value.WILD]: '變色',
      [Value.WILD_CHAOS]: '混沌變色',
      [Value.WILD_HIT_ALL]: '全員攻擊',
      [Value.WILD_DRAW_FOUR]: '+4',
    }[value] || `未知牌值(${value})`;
  }

  cardDescription(card) {
    if(!card){return '無';}
    return `${this.cardColorName(card.color)} ${this.cardValueName(card.value)}`;
  }

  playerDescription(playerId) {
    if(playerId == null || playerId < 0){return '系統底牌';}
    const player = this.players[playerId];
    if(!player){return `玩家 ${playerId}`;}
    return `${player.name}（P${Number(playerId) + 1}${player.ai ? '，AI' : '，玩家'}）`;
  }

  logCardPlay(playerId, card, ext = null) {
    const logger = globalThis.console;
    if(!logger || !card){return;}
    logger.log(`[遊戲行為] ${this.playerDescription(playerId)} 出牌：${this.cardDescription(card)}`, {
      playerId: Number(playerId),
      card: this.cardDescription(card),
      color: this.cardColorName(card.color),
      value: this.cardValueName(card.value),
      effectData: ext,
      nextColor: this.cardColorName(this.currentColor),
      nextValue: this.cardValueName(this.currentValue),
    });
  }

  logCardDraw(playerId, cards) {
    const logger = globalThis.console;
    if(!logger || !Array.isArray(cards) || cards.length < 1){return;}
    logger.log(`[遊戲行為] ${this.playerDescription(playerId)} 抽牌 ${cards.length} 張`, {
      playerId: Number(playerId),
      cards: cards.map(this.cardDescription.bind(this)),
      remainingDeck: this.deck ? this.deck.length : null,
    });
  }

  getAvailableActions(playerId) {
    const player = this.players[playerId];
    if(!player){return [];}
    const playableCards = player.hand.filter(this.isCardPlayable.bind(this));
    const actions = [];
    if(this.penaltyCard?.value === Value.SKIP){
      actions.push('跳過回合');
    }
    else if(this.penaltyCard){
      actions.push(`抽 ${this.penaltyPool} 張罰牌`);
      playableCards.forEach(function(card){
        actions.push(`出牌：${this.cardDescription(card)}`);
      }.bind(this));
    }
    else if(playableCards.length > 0){
      playableCards.forEach(function(card){
        actions.push(`出牌：${this.cardDescription(card)}`);
      }.bind(this));
      actions.push('抽 1 張牌');
    }
    else if(this.drawUntilPlayable){
      actions.push('一直抽牌直到抽到可出的牌');
    }
    else{
      actions.push('抽 1 張牌');
    }
    return actions;
  }

  logAvailableActions(playerId) {
    const logger = globalThis.console;
    const player = this.players[playerId];
    if(!logger || !player){return;}
    const playableCards = player.hand
      .filter(this.isCardPlayable.bind(this))
      .map(this.cardDescription.bind(this));
    const actions = this.getAvailableActions(playerId);
    logger.groupCollapsed?.(`[遊戲行為] 下一位：${this.playerDescription(playerId)} 可用行為`);
    logger.log({
      playerId: Number(playerId),
      handCount: player.hand.length,
      currentColor: this.cardColorName(this.currentColor),
      currentValue: this.cardValueName(this.currentValue),
      penaltyCard: this.penaltyCard ? this.cardDescription(this.penaltyCard) : null,
      penaltyCount: this.penaltyPool,
      playableCards,
      actions,
    });
    logger.groupEnd?.();
  }

  lastCard() {
    if (this.discardPile.length === 0) {
      return null;
    }
    return this.discardPile.slice(-1)[0];
  }

  drawCard(numCards) {
    if (this.gameMode === Mode.DEATH_MATCH) {
      return this.deck.draw(numCards, this.discardPile);
    } else {
      return this.deck.draw(numCards);
    }
  }

  isCurrentPlayerSkipped() {
    return this.penaltyCard != undefined && this.penaltyCard.value === Value.SKIP;
  }

  isCardAbilitySelectionNeeded(card) {
    if ((this.gameMode === Mode.BATTLE_PUNO ||
        this.gameMode === Mode.DEATH_MATCH) &&
        card.value === Value.ZERO) {
      return true;
    }
    // A Wild Draw Four stacked on a Draw Two follows the existing color and
    // must not open the color picker.
    if (card.value === Value.WILD_DRAW_FOUR &&
        this.penaltyCard?.value === Value.DRAW_TWO &&
        this.drawTwoFourStacking) {
      return false;
    }
    if (card.value === Value.WILD_CHAOS) {
      return false;
    }
    return card.color === Color.WILD;
  }

  isCardPlayable(card) {
    if (this.penaltyCard != undefined) {
      if (this.penaltyCard.value === Value.SKIP)  return false;
      let base = this.penaltyTransferEnabled &&
        (card.isEqual(new Card(this.currentColor, Value.SKIP)) ||
         card.isEqual(new Card(this.currentColor, Value.REVERSE)));
      if (this.penaltyCard.value === Value.DRAW_TWO) {
        base |= this.drawTwoStacking && card.value === Value.DRAW_TWO;
      } else if (this.penaltyCard.value === Value.WILD_DRAW_FOUR) {
        base |= this.drawFourStacking && card.value === Value.WILD_DRAW_FOUR;
      }
      if (this.drawTwoFourStacking &&
          ((this.penaltyCard.value === Value.DRAW_TWO &&
            this.drawFourStacking && card.value === Value.WILD_DRAW_FOUR) ||
           (this.penaltyCard.value === Value.WILD_DRAW_FOUR &&
            this.drawTwoStacking && card.value === Value.DRAW_TWO &&
            card.color === this.currentColor))) {
        base = true;
      }
      return !!base;
    }
    return card.isMatched(this.currentColor, this.currentValue);
  }

  initGame() {
    this.clockwise = true;
    this.currentPlayerIndex = undefined;
    this.currentColor = undefined;
    this.currentValue = undefined;
    this.initialDealPending = 0;
    this.firstCardDrawn = false;
    this.damageTypes.fill(false);
  }

  initDeck() {
    this.deck = new Deck(
      this.extraCardDisabled,
      this.tradeCardDisabled,
      this.deckCardNumber
    );
    this.penaltyCard = undefined;
    this.penaltyPool = 0;
    this.discardPile.length = 0;
    this.damagePool = 0;
  }

  initPlayer() {
    for (let i in this.players) {
      this.players[i].reset();
    }
  }

  processFirstDraw() {
    this.currentPlayerIndex = this.chooseDealer();
  }

  processFirstDeal() {
    this.initialDealPending = this.players.length;
    for (let i in this.players) {
      let cards = this.drawCard(this.initCardNumber);
      this.players[i].deal(cards);
      if (cards.length > 0) {
        GameManager.onCardDraw(i, cards, false, this.onInitialDealComplete.bind(this));
      } else {
        this.onInitialDealComplete();
      }
    }
  }

  onInitialDealComplete() {
    if (this.initialDealPending <= 0) return;
    this.initialDealPending -= 1;
    if (this.initialDealPending === 0) {
      this.drawFirstCard();
      if (this.gameMode === Mode.TIMED) {
        this.timedStartedAt = Date.now();
        this.timedRemaining = this.timedDuration;
        GameManager.onTimedClockChange?.(this.timedRemaining);
      }
    }
  }

  drawFirstCard() {
    if (this.firstCardDrawn) return;
    this.firstCardDrawn = true;
    const firstCard = this.deck.drawColored(1)[0];
    this.discardPile.push(firstCard);
    this.setNextColorAndValue(firstCard);
    if (firstCard.value === Value.SKIP) {
      this.penaltyCard = firstCard;
    } else if (firstCard.value === Value.REVERSE) {
      this.reverse();
    }
    GameManager.onCardPlay(-1, firstCard);
  }

  initialize() {
    debug_log("--------------INITIALIZE--------------");
    this.initGame();
    this.initDeck();
    this.initPlayer();
    this.processFirstDraw();
    this.processFirstDeal();
    debug_log("--------------------------------------");
  }

  isGameOver() {
    if (this.gameMode === Mode.TIMED) return this.timedEnded;
    if (this.gameMode === Mode.TRADITIONAL)  return true;
    if (this.gameMode === Mode.DEATH_MATCH && this.players[0].knockOut){
      return true;
    }
    return Math.max(...this.scoreBoard()) >= this.scoreGoal;
  }

  isRoundOver() {
    if (this.gameMode === Mode.TIMED) return this.timedEnded;
    if(this.gameMode === Mode.DEATH_MATCH && this.players[0].knockOut){
      return true;
    }
    for (let i in this.players) {
      if (this.players[i].isGoingOut()) {
        return true;
      }
    }
    return this.numAlivePlayers() === 1;
  }

  reverse() {
    debug_log("REVERSE");
    this.clockwise = !this.clockwise;
  }

  findTarget() {
    let target = undefined;
    for (let i in this.players) {
      if (i != this.currentPlayerIndex && !this.players[i].knockOut) {
        if (target === undefined ||
           this.players[i].hand.length < this.players[target].hand.length) {
          target = i;
        }
      }
    }
    return target;
  }

  discardAll(color) {
    debug_log("DISCARD ALL", color);
    const playerIndex = this.currentPlayerIndex;
    const player = this.players[playerIndex];
    let colorCardsIndex = player.findAllCardsByColor(color);
    for (let i in colorCardsIndex) {
      const cardIndex = colorCardsIndex[i];
      const card = player.hand[cardIndex];
      EventManager.setTimeout(() => {
        this.discardPile.push(card);
        player.discard(cardIndex);
        this.recordPlayedCard(playerIndex, card);
        GameManager.onCardPlay(playerIndex, card, -1);
        if (player.hand.length === 0) this.awardTimedHandClear(playerIndex);
      }, 10 * i);
    }
  }

  trade(player1, player2) {
    if (this.players[player1].knockOut ||
        this.players[player2].knockOut) {
      debug_log("TRADE DENIED: someone knocked out");
      return;
    }
    debug_log("TRADE");
    debug_log("before trade");
    debug_log(player1, this.players[player1].hand.slice());
    debug_log(player2, this.players[player2].hand.slice());
    const temp = this.players[player1].hand.slice();
    this.players[player1].hand = this.players[player2].hand.slice();
    this.players[player2].hand = temp;
    debug_log("after trade");
    debug_log(player1, this.players[player1].hand.slice());
    debug_log(player2, this.players[player2].hand.slice());
  }

  wildHitAll(currentPlayerIndex) {
    debug_log("WILD HIT ALL");
    for (let i in this.players) {
      if (i != currentPlayerIndex && !this.players[i].knockOut) {
        let cards = this.drawCard(2);
        this.players[i].deal(cards);
        GameManager.onCardDraw(i, cards);
      }
    }
  }

  gameResult() {
    for (let i in this.players) {
      if (this.gameMode === Mode.TRADITIONAL) {
        this.players[i].score += this.players[i].cardsPointSum();
      } else if (this.gameMode === Mode.BATTLE_PUNO) {
        this.players[i].hp -= this.players[i].cardsPointSum();
        this.players[i].hp = Math.max(0, this.players[i].hp);
        this.players[i].score += this.players[i].hp;
      }
    }
  }

  setNextColorAndValue(card, ext) {
    if (card.color === Color.WILD) {
      this.currentValue = undefined;
      const lockToPenaltyColor =
        card.value === Value.WILD_DRAW_FOUR &&
        this.penaltyCard?.value === Value.DRAW_TWO &&
        this.drawTwoFourStacking;
      if (lockToPenaltyColor) {
        // Cross-type +2 -> +4 stacking follows the previous +2 color.
        ext = this.currentColor;
      } else if (this.currentPlayer().ai ||
          card.value === Value.WILD_CHAOS ||
          card.value === Value.TRADE) {
        this.currentColor = getRandom(Color.RED, Color.BLUE, this.currentColor);
      } else {
        this.currentColor = ext;
      }
      debug_log("WILD CHOOSE NEXT COLOR", this.currentColor);
      if (card.value === Value.WILD_CHAOS) {
        this.currentValue = getRandom(Value.ZERO, Value.NINE);
        debug_log("WILD CHAOS, NEXT VALUE", this.currentValue);
        ext = [this.currentColor, this.currentValue];
      } else if (card.value === Value.TRADE) {
        ext[0] = this.currentColor;
      } else {
        ext = this.currentColor;
      }
    } else {
      this.currentColor = card.color;
      this.currentValue = card.value;
    }
    return ext;
  }

  takeCardAction(card, ext) {
    if (card.value === Value.REVERSE) {
      this.reverse();
      ext = this.penaltyCard === undefined ? 0 : 1;
    } else if (card.value === Value.TRADE) {
      const target = this.currentPlayer().ai ? this.findTarget() : ext;
      this.trade(this.currentPlayerIndex, target);
      ext = [undefined, target];
    } else if (card.value === Value.DISCARD_ALL) {
      this.discardAll(this.currentColor);
    } else if (card.value === Value.WILD_HIT_ALL) {
      this.wildHitAll(this.currentPlayerIndex);
    }
    return ext;
  }

  setDamagePool(card, ext) {
    if (this.gameMode === Mode.TRADITIONAL || this.gameMode === Mode.TIMED) return;
    this.damageTypes[card.color] = true;
    if (card.value === Value.ZERO) {
      if (this.currentPlayer().ai) {
        if (this.gameMode === Mode.DEATH_MATCH || this.damagePool < 30 || !!getRandom(0, 1)) {
          ext = 0;
        } else {
          ext = 1;
        }
      }
      if (ext === 1) {
        this.resetDamagePool();
      } else {
        debug_log("+10 damage");
        this.addDamagePool(10, card.color);
      }
    } else if (Value.ONE <= card.value && card.value <= Value.NINE) {
      this.addDamagePool(card.value, card.color);
    }
    debug_log("damage pool", this.damagePool);
    return ext;
  }

  addDamagePool(v, c=null) {
    debug_log("Damage add: " + v);
    this.damagePool += (v || 0);
    if (c)  this.damageTypes[c] = true;
    GameManager.onDamageChange();
  }

  resetDamagePool() {
    debug_log("clear damage");
    this.damagePool = 0;
    this.damageTypes.fill(false);
    GameManager.onDamageChange();
  }

  discard(cardIndex, ext=null, unoCalled=null) {
    const player = this.currentPlayer();
    const handCountBefore = player.hand.length;
    const card = player.hand[cardIndex];
    // AI players call UNO automatically.  Human players must explicitly pass
    // true from the scene's UNO button.
    const timedMode = this.gameMode === Mode.TIMED;
    const didCallUno = timedMode || (unoCalled == null ? !!player.ai : !!unoCalled);
    debug_log("discard: ", card);
    player.discard(cardIndex);
    this.recordPlayedCard(this.currentPlayerIndex, card);
    if (player.hand.length != 0) {
      if (card.numbered) {
        ext = this.setDamagePool(card, ext);
      } else {
        ext = this.takeCardAction(card, ext);
      }
      ext = this.setNextColorAndValue(card, ext);

      if(card.value === Value.DRAW_TWO){this.penaltyPool += 2;}
      else if(card.value === Value.WILD_DRAW_FOUR){this.penaltyPool += 4;}

      if (this.penaltyCard === undefined) {
        if (card.penalty) {
          this.penaltyCard = card;
        }
      } else {
        ext = 1;
      }
    } else {
      ext = -1;
      this.awardTimedHandClear(this.currentPlayerIndex);
    }
    const reachedOneCard = handCountBefore === 2 && player.hand.length === 1;
    const missedUno = !timedMode && reachedOneCard && !didCallUno;
    if (reachedOneCard && didCallUno) {
      player.uno();
    }
    if (missedUno) {
      debug_log(player.name, 'MISSED UNO; draw ' + this.unoPenaltyCards);
    }
    debug_log("ext", ext);
    this.discardPile.push(card);
    GameManager.onCardPlay(this.currentPlayerIndex, card, ext);
    if (missedUno) {
      const cards = this.drawCard(this.unoPenaltyCards) || [];
      player.deal(cards);
      if (cards.length > 0) {
        GameManager.onCardDraw(this.currentPlayerIndex, cards);
      }
    }
  }

  getPenalty() {
    debug_log("PENALTY");
    if (this.penaltyCard.value === Value.SKIP) {
      debug_log("SKIP");
      this.penaltyCard = undefined;
    } else {
      const avoidCardIndex =
          this.currentPlayer().receivePenalty(this.penaltyCard, this.currentColor);
      if (avoidCardIndex != -1) {
        this.discard(avoidCardIndex, 1);
      } else {
        let cards = undefined;
        if (this.penaltyPool > 0) {
          debug_log("DRAW " + this.penaltyPool);
          cards = this.drawCard(this.penaltyPool);
        }
        this.currentPlayer().deal(cards);
        GameManager.onCardDraw(this.currentPlayerIndex, cards);
        this.penaltyCard = undefined;
        this.penaltyPool = 0;
      }
    }
  }

  replenish() {
    if (this.gameMode != Mode.DEATH_MATCH)  return;
    let numCardsDiff = this.initCardNumber - this.currentPlayer().hand.length;
    if (numCardsDiff > 0) {
      debug_log("DEATH MATCH DRAW");
      let cards = this.drawCard(numCardsDiff);
      this.currentPlayer().deal(cards);
      GameManager.onCardDraw(this.currentPlayerIndex, cards);
    }
  }

  beginTurn() {
    debug_log("hand", this.currentPlayer().hand.slice());
    debug_log("CURRENT COLOR:", this.currentColor);
    debug_log("CURRENT VALUE:", this.currentValue);
    if (this.penaltyCard != undefined) {
      this.getPenalty();
      return;
    }
    let matchedCardIndex = this.currentPlayer().matching(this.currentColor,
                                                         this.currentValue);
    if (matchedCardIndex === -1) {
      if (this.gameMode === Mode.BATTLE_PUNO ||
          this.gameMode === Mode.DEATH_MATCH) {
        this.processDeckDamage(this.currentPlayerIndex);
      }
      const cards = [];
      let playable = false;
      do {
        const card = this.drawCard(1);
        if (!card || card.length < 1) break;
        cards.push(card[0]);
        playable = this.isCardPlayable(card[0]);
      } while (this.drawUntilPlayable && !playable);
      if (cards.length < 1) {
        debug_log("deck empty => player knocked out");
        this.currentPlayer().knockOut = true;
      } else {
        debug_log("no matched card => draw");
        this.currentPlayer().deal(cards);
        GameManager.onCardDraw(this.currentPlayerIndex, cards);
      }
    } else {
      this.discard(matchedCardIndex);
    }
  }

  processDeckDamage(player_id){
    if (this.gameMode === Mode.TRADITIONAL || this.gameMode === Mode.TIMED)  return;
    this.processPlayerDamage(player_id, this.damagePool, this.damageTypes)
    this.resetDamagePool();
    debug_log("reset damage pool");
  }

  processPlayerDamage(player_id, value, dmg_types) {
    value = (value || 0);
    debug_log("RECEIVE DAMAGE");
    debug_log("HP:", this.players[player_id].hp + " => " + this.players[player_id].hp - value);
    this.players[player_id].hp = Math.max(this.players[player_id].hp - value, 0);
    this.players[player_id].knockOut = this.players[player_id].hp <= 0;
    if(this.players[player_id].knockOut){this.players[player_id].damageStack = 0;}
    GameManager.onHPChange(player_id, dmg_types);
    if(this.gameMode === Mode.DEATH_MATCH){
      for(let i in this.players){
        if(i == player_id || this.players[i].knockOut){continue;}
        this.players[i].score += value;
      }
    }
  }

  processPlayerExtraDamage(player_id){
    let pl = this.players[player_id];
    let ar = [];
    let types = [false, false, false, false, false];
    for(let i in pl.hand){ar.push(parseInt(pl.hand[i].color));}
    ar = shuffleArray(ar);
    types[ar[0]] = true;
    let value = Math.max(1, parseInt(GameManager.initHP * pl.damageStack / 100.0))
    if(pl.damageStack > 0){this.processPlayerDamage(player_id, value, types);}
    pl.damageStack += 1;
  }

  endTurn() {
    this.timedTurnStartedAt = 0;
    GameManager.onTimedTurnChange?.(0);
    GameManager.onTurnEnd(this.currentPlayerIndex);
    this.currentPlayerIndex = this.getNextPlayerIndex();
  }

  getNextPlayerIndex() {
    return this.clockwise ? mod(this.currentPlayerIndex + 1, 4)
                          : mod(this.currentPlayerIndex - 1, 4);
  }

  getNextAlivePlayerIndex() {
    let nextAlivePlayerIndex = this.getNextPlayerIndex();
    while (this.players[nextAlivePlayerIndex].knockOut) {
      nextAlivePlayerIndex =
          this.clockwise ? mod(nextAlivePlayerIndex + 1, 4)
                         : mod(nextAlivePlayerIndex - 1, 4);
    }
    return nextAlivePlayerIndex;
  }

  scoreBoard() {
    return [this.players[0].score, this.players[1].score,
            this.players[2].score, this.players[3].score];
  }

  gameStart() {
    GameManager.onGameStart()
    debug_log("SCORE GOAL", this.scoreGoal);
    this.roundStart();
  }

  roundStart() {
    this.initialize();
    GameManager.onRoundStart();
  }

  update() {
    this.updateTimedClock();
    this.updateTimedTurn();
    if (GameManager.isSceneBusy() || this.flagAIThinking || this.initialDealPending > 0) return;
    if (this.isRoundOver())  return this.processResult();
    if (GameManager.isInTurn()) {
      if (this.gameMode === Mode.DEATH_MATCH) {
        this.replenish();
      }
      this.endTurn();
    } else {
      debug_log(this.currentPlayer());
      this.processDeathMatchDamage();
      if (!this.currentPlayer().knockOut) {
        this.processTurnAction();
      } else {
        debug_log(this.currentPlayer().name, "knocked out - SKIP");
        this.endTurn();
      }
    }
  }

  processDeathMatchDamage(){
    if(this.currentPlayer().knockOut){return this.currentPlayer().damageStack = 0;}
    if(this.gameMode === Mode.DEATH_MATCH){
      if(this.currentPlayer().hand.length > this.maxHandThreshold){
        this.processPlayerExtraDamage(this.currentPlayerIndex);
      }
      else{this.currentPlayer().damageStack = 0;}
    }
  }

  processTurnAction() {
    
    if (this.currentPlayer().ai) {
      GameManager.onNPCTurnBegin(this.currentPlayerIndex);
    } else {
      GameManager.onUserTurnBegin(this.currentPlayerIndex);
    }
    if (this.isCurrentPlayerSkipped()) {
      this.penaltyCard = undefined;
      this.endTurn();
    } else {
      this.startTimedTurn();
      if (this.currentPlayer().ai) {
        const thinkingPlayer = this.currentPlayerIndex;
        this.flagAIThinking = true;
        EventManager.setTimeout(()=>{
          this.flagAIThinking = false;
          if (this.currentPlayerIndex !== thinkingPlayer) return;
          this.beginTurn();
          this.finishTimedTurnAction();
        }, 30);
      }
    }
  }

  processResult() {
    this.gameResult();
    debug_log(this.scoreBoard());
    if (this.isGameOver()) {
      GameManager.processGameOver();
    } else {
      GameManager.processRoundOver();
    }
  }

  recordPlayedCard(playerIndex, card) {
    if (this.gameMode !== Mode.TIMED || playerIndex < 0 || !card) return;
    // Timed mode intentionally gives every played card the same value so the
    // score measures play volume and hand management instead of card luck.
    this.players[playerIndex].score += 5;
  }

  awardTimedHandClear(playerIndex) {
    if (this.gameMode !== Mode.TIMED || playerIndex < 0) return;
    this.players[playerIndex].score += 100;
    const cards = this.drawCard(this.initCardNumber) || [];
    this.players[playerIndex].deal(cards);
    if (cards.length > 0) GameManager.onCardDraw(playerIndex, cards);
  }

  startTimedTurn() {
    if (this.gameMode !== Mode.TIMED || this.timedEnded) return;
    this.timedTurnStartedAt = Date.now();
    GameManager.onTimedTurnChange?.(this.timedTurnSeconds);
  }

  finishTimedTurnAction() {
    if (this.gameMode !== Mode.TIMED) return;
    this.timedTurnStartedAt = 0;
    GameManager.onTimedTurnChange?.(0);
  }

  updateTimedTurn() {
    if (this.gameMode !== Mode.TIMED || this.timedEnded ||
        !this.timedTurnStartedAt || !GameManager.isInTurn()) return;
    const elapsed = (Date.now() - this.timedTurnStartedAt) / 1000;
    const remaining = Math.max(0, this.timedTurnSeconds - elapsed);
    GameManager.onTimedTurnChange?.(remaining);
    if (remaining <= 0) this.handleTimedTurnTimeout();
  }

  isTimedTurnExpired() {
    return this.gameMode === Mode.TIMED && !this.timedEnded &&
      !!this.timedTurnStartedAt &&
      Date.now() - this.timedTurnStartedAt >= this.timedTurnSeconds * 1000;
  }

  handleTimedTurnTimeout() {
    if (!this.timedTurnStartedAt || this.timedEnded) return;
    this.timedTurnStartedAt = 0;
    const alreadyDrew = GameManager.onTimedTurnTimeout?.() === true;
    if (!alreadyDrew) {
      const player = this.currentPlayer();
      let numCards = 1;
      if (this.penaltyCard && this.penaltyCard.value !== Value.SKIP) {
        numCards = Math.max(1, this.penaltyPool) + 1;
        this.penaltyCard = undefined;
        this.penaltyPool = 0;
      }
      const cards = this.drawCard(numCards) || [];
      player.deal(cards);
      if (cards.length > 0) GameManager.onCardDraw(this.currentPlayerIndex, cards);
    }
    this.endTurn();
  }

  updateTimedClock() {
    if (this.gameMode !== Mode.TIMED || !this.timedStartedAt || this.timedEnded) return;
    const elapsed = Math.max(0, (Date.now() - this.timedStartedAt) / 1000);
    this.timedRemaining = Math.max(0, this.timedDuration - elapsed);
    GameManager.onTimedClockChange?.(this.timedRemaining);
    if (this.timedRemaining <= 0) {
      this.timedEnded = true;
      this.timedTurnStartedAt = 0;
      GameManager.onTimedClockChange?.(0);
    }
  }
}

/************************** helper function **************************/
function getRandom(a, b, filter=undefined) {
  const random = Math.floor(Math.random() * (b - a + 1) + a);
  return random != filter ? random : getRandom(a, b, filter);
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

globalThis.PunoGame = PunoGame;
/*********************************************************************/
