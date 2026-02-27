// Room and game session management

const { createShuffledDeck } = require('./deck');
const { compareHands, getHandDescription } = require('./evaluator');

const STARTING_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const TURN_TIME = 30000; // 30 seconds

class Room {
  constructor(code) {
    this.code = code;
    this.players = [];
    this.state = 'waiting'; // waiting, countdown, playing, finished
    this.deck = [];
    this.dealerIndex = 0;
    this.pot = 0;
    this.currentBet = 0;
    this.currentPlayerIndex = 0;
    this.phase = 'idle'; // idle, blinds, firstBet, draw, secondBet, showdown
    this.turnTimer = null;
    this.countdownTimer = null;
    this.lastAction = null;
  }

  addPlayer(ws, name) {
    if (this.players.length >= 2) {
      return { success: false, error: 'Room is full' };
    }

    const player = {
      ws,
      name,
      chips: STARTING_CHIPS,
      hand: [],
      bet: 0,
      folded: false,
      hasActed: false,
      disconnected: false
    };

    this.players.push(player);

    if (this.players.length === 2) {
      this.startCountdown();
    }

    return { success: true, playerIndex: this.players.length - 1 };
  }

  removePlayer(ws) {
    const index = this.players.findIndex(p => p.ws === ws);
    if (index !== -1) {
      this.players[index].disconnected = true;
      if (this.state === 'playing') {
        // Other player wins by disconnection
        const winner = this.players[1 - index];
        this.endGame(winner, 'disconnect');
      } else {
        this.players.splice(index, 1);
      }
    }
  }

  broadcast(event, data, excludeWs = null) {
    for (const player of this.players) {
      if (player.ws !== excludeWs && !player.disconnected) {
        player.ws.send(JSON.stringify({ event, ...data }));
      }
    }
  }

  sendToPlayer(playerIndex, event, data) {
    const player = this.players[playerIndex];
    if (player && !player.disconnected) {
      player.ws.send(JSON.stringify({ event, ...data }));
    }
  }

  startCountdown() {
    this.state = 'countdown';
    let count = 3;

    this.broadcast('game:countdown', { count });

    this.countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        this.broadcast('game:countdown', { count });
      } else {
        clearInterval(this.countdownTimer);
        this.startGame();
      }
    }, 1000);
  }

  startGame() {
    this.state = 'playing';
    this.broadcast('game:start', {
      players: this.players.map(p => ({ name: p.name, chips: p.chips })),
      dealerIndex: this.dealerIndex
    });
    this.startHand();
  }

  startHand() {
    // Reset for new hand
    this.deck = createShuffledDeck();
    this.pot = 0;
    this.currentBet = 0;
    this.phase = 'blinds';

    for (const player of this.players) {
      player.hand = [];
      player.bet = 0;
      player.folded = false;
      player.hasActed = false;
    }

    // Deal 5 cards to each player
    for (let i = 0; i < 5; i++) {
      for (const player of this.players) {
        player.hand.push(this.deck.pop());
      }
    }

    // Post blinds
    const sbIndex = this.dealerIndex; // Dealer posts small blind in heads-up
    const bbIndex = 1 - this.dealerIndex;

    this.postBlind(sbIndex, SMALL_BLIND);
    this.postBlind(bbIndex, BIG_BLIND);

    // Send hands to players
    for (let i = 0; i < this.players.length; i++) {
      this.sendToPlayer(i, 'hand:dealt', {
        hand: this.players[i].hand,
        pot: this.pot,
        playerChips: this.players[i].chips,
        opponentChips: this.players[1 - i].chips,
        playerBet: this.players[i].bet,
        opponentBet: this.players[1 - i].bet,
        dealerIndex: this.dealerIndex,
        isDealer: i === this.dealerIndex
      });
    }

    // First betting round - dealer (SB) acts first in heads-up
    this.phase = 'firstBet';
    this.currentBet = BIG_BLIND;
    this.currentPlayerIndex = sbIndex;
    this.startTurn();
  }

  postBlind(playerIndex, amount) {
    const player = this.players[playerIndex];
    const actualAmount = Math.min(amount, player.chips);
    player.chips -= actualAmount;
    player.bet = actualAmount;
    this.pot += actualAmount;
  }

  startTurn() {
    const player = this.players[this.currentPlayerIndex];

    // Check if hand should end
    if (this.checkHandEnd()) return;

    // Clear any existing timer
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
    }

    const callAmount = this.currentBet - player.bet;
    const minRaise = this.currentBet;
    const maxBet = player.chips;

    this.broadcast('turn:start', {
      playerIndex: this.currentPlayerIndex,
      playerName: player.name,
      callAmount,
      minRaise,
      maxBet,
      pot: this.pot,
      currentBet: this.currentBet,
      phase: this.phase,
      timeLeft: TURN_TIME / 1000
    });

    // Start countdown timer
    let timeLeft = TURN_TIME / 1000;
    this.turnTimer = setInterval(() => {
      timeLeft--;
      this.broadcast('turn:tick', { timeLeft });

      if (timeLeft <= 0) {
        clearInterval(this.turnTimer);
        // Auto-fold on timeout
        this.handleAction(this.currentPlayerIndex, 'fold');
      }
    }, 1000);
  }

  handleAction(playerIndex, action, amount = 0) {
    if (playerIndex !== this.currentPlayerIndex) {
      return { success: false, error: 'Not your turn' };
    }

    const player = this.players[playerIndex];
    const opponent = this.players[1 - playerIndex];

    // Clear turn timer
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }

    switch (action) {
      case 'fold':
        player.folded = true;
        this.broadcast('action:made', {
          playerIndex,
          action: 'fold',
          pot: this.pot
        });
        this.endHand(1 - playerIndex);
        return { success: true };

      case 'call':
        const callAmount = Math.min(this.currentBet - player.bet, player.chips);
        player.chips -= callAmount;
        player.bet += callAmount;
        this.pot += callAmount;
        player.hasActed = true;

        this.broadcast('action:made', {
          playerIndex,
          action: callAmount === 0 ? 'check' : 'call',
          amount: callAmount,
          pot: this.pot,
          playerChips: player.chips
        });
        break;

      case 'raise':
        const raiseTotal = Math.min(amount, player.chips + player.bet);
        const raiseAmount = raiseTotal - player.bet;
        player.chips -= raiseAmount;
        player.bet = raiseTotal;
        this.pot += raiseAmount;
        this.currentBet = raiseTotal;
        player.hasActed = true;
        opponent.hasActed = false; // Opponent needs to respond

        this.broadcast('action:made', {
          playerIndex,
          action: 'raise',
          amount: raiseTotal,
          pot: this.pot,
          playerChips: player.chips,
          currentBet: this.currentBet
        });
        break;

      default:
        return { success: false, error: 'Invalid action' };
    }

    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      this.endBettingRound();
    } else {
      this.currentPlayerIndex = 1 - this.currentPlayerIndex;
      this.startTurn();
    }

    return { success: true };
  }

  isBettingRoundComplete() {
    // Both players have acted and bets are equal
    return this.players.every(p => p.hasActed && (p.bet === this.currentBet || p.chips === 0));
  }

  endBettingRound() {
    // Reset for next round
    for (const player of this.players) {
      player.bet = 0;
      player.hasActed = false;
    }
    this.currentBet = 0;

    if (this.phase === 'firstBet') {
      this.phase = 'draw';
      this.startDrawPhase();
    } else if (this.phase === 'secondBet') {
      this.showdown();
    }
  }

  startDrawPhase() {
    this.drawSelections = [null, null];

    this.broadcast('draw:phase', {
      pot: this.pot,
      timeLeft: TURN_TIME / 1000
    });

    // Both players select simultaneously
    let timeLeft = TURN_TIME / 1000;
    this.turnTimer = setInterval(() => {
      timeLeft--;
      this.broadcast('turn:tick', { timeLeft });

      if (timeLeft <= 0) {
        clearInterval(this.turnTimer);
        // Auto-stand (keep all cards) for players who haven't selected
        for (let i = 0; i < 2; i++) {
          if (this.drawSelections[i] === null) {
            this.drawSelections[i] = [];
          }
        }
        this.processDraws();
      }
    }, 1000);
  }

  handleDraw(playerIndex, cardIndices) {
    this.drawSelections[playerIndex] = cardIndices;

    this.sendToPlayer(playerIndex, 'draw:confirmed', {
      discardCount: cardIndices.length
    });

    // Tell opponent how many cards they're drawing
    this.sendToPlayer(1 - playerIndex, 'opponent:draw', {
      discardCount: cardIndices.length
    });

    // Check if both players have made selections
    if (this.drawSelections[0] !== null && this.drawSelections[1] !== null) {
      if (this.turnTimer) {
        clearInterval(this.turnTimer);
        this.turnTimer = null;
      }
      this.processDraws();
    }

    return { success: true };
  }

  processDraws() {
    for (let i = 0; i < 2; i++) {
      const player = this.players[i];
      const discardIndices = this.drawSelections[i] || [];

      // Remove discarded cards (in reverse order to maintain indices)
      const sortedIndices = [...discardIndices].sort((a, b) => b - a);
      for (const idx of sortedIndices) {
        player.hand.splice(idx, 1);
      }

      // Draw new cards
      const newCards = [];
      for (let j = 0; j < discardIndices.length; j++) {
        const newCard = this.deck.pop();
        player.hand.push(newCard);
        newCards.push(newCard);
      }

      // Send new hand to player
      this.sendToPlayer(i, 'cards:drawn', {
        hand: player.hand,
        newCards
      });
    }

    // Start second betting round - non-dealer acts first
    this.phase = 'secondBet';
    this.currentPlayerIndex = 1 - this.dealerIndex;
    this.startTurn();
  }

  showdown() {
    const hands = this.players.map(p => ({
      cards: p.hand,
      description: getHandDescription(p.hand)
    }));

    const comparison = compareHands(this.players[0].hand, this.players[1].hand);
    let winnerIndex;
    let isTie = false;

    if (comparison > 0) {
      winnerIndex = 0;
    } else if (comparison < 0) {
      winnerIndex = 1;
    } else {
      isTie = true;
    }

    if (isTie) {
      // Split pot
      const half = Math.floor(this.pot / 2);
      this.players[0].chips += half;
      this.players[1].chips += this.pot - half;
    } else {
      this.players[winnerIndex].chips += this.pot;
    }

    this.broadcast('showdown', {
      hands,
      winnerIndex: isTie ? -1 : winnerIndex,
      winnerName: isTie ? null : this.players[winnerIndex].name,
      pot: this.pot,
      isTie,
      playerChips: [this.players[0].chips, this.players[1].chips]
    });

    this.pot = 0;
    this.checkGameEnd();
  }

  endHand(winnerIndex) {
    const winner = this.players[winnerIndex];
    winner.chips += this.pot;

    this.broadcast('hand:end', {
      winnerIndex,
      winnerName: winner.name,
      pot: this.pot,
      reason: 'fold',
      playerChips: [this.players[0].chips, this.players[1].chips]
    });

    this.pot = 0;
    this.checkGameEnd();
  }

  checkHandEnd() {
    const activePlayers = this.players.filter(p => !p.folded);
    if (activePlayers.length === 1) {
      const winnerIndex = this.players.findIndex(p => !p.folded);
      this.endHand(winnerIndex);
      return true;
    }
    return false;
  }

  checkGameEnd() {
    // Check if either player is busted
    const bustedPlayer = this.players.findIndex(p => p.chips <= 0);

    if (bustedPlayer !== -1) {
      const winner = this.players[1 - bustedPlayer];
      this.endGame(winner, 'bust');
    } else {
      // Continue to next hand
      setTimeout(() => {
        this.dealerIndex = 1 - this.dealerIndex; // Alternate dealer
        this.startHand();
      }, 3000);
    }
  }

  endGame(winner, reason) {
    this.state = 'finished';

    if (this.turnTimer) {
      clearInterval(this.turnTimer);
    }

    this.broadcast('game:end', {
      winnerName: winner.name,
      winnerChips: winner.chips,
      reason,
      players: this.players.map(p => ({
        name: p.name,
        chips: p.chips
      }))
    });
  }

  getState() {
    return {
      code: this.code,
      state: this.state,
      playerCount: this.players.length,
      players: this.players.map(p => ({
        name: p.name,
        chips: p.chips
      }))
    };
  }
}

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

module.exports = {
  Room,
  generateRoomCode
};
