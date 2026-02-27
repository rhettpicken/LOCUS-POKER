// Solo Poker Game - Player vs Computer

// ============ DECK ============
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
  const deck = [];
  // Double deck
  for (let d = 0; d < 2; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ rank, suit, isWild: rank === '2', id: `${rank}_${suit}_${d}` });
      }
    }
  }
  // 4 Jokers
  for (let i = 0; i < 4; i++) {
    deck.push({ rank: 'JOKER', suit: i < 2 ? 'red' : 'black', isWild: true, id: `JOKER_${i}` });
  }
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ============ HAND EVALUATION ============
const RANK_VALUES = { '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
const HAND_NAMES = ['High Card', 'One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush', 'Five of a Kind'];

function evaluateHand(cards) {
  const dominated = cards.filter(c => !c.isWild);
  const wildCount = cards.filter(c => c.isWild).length;

  if (wildCount === 5) return { rank: 10, name: 'Five Aces', highCard: 14 };

  const rankCounts = {};
  const suitCounts = {};

  for (const c of cards) {
    if (!c.isWild) {
      const rv = RANK_VALUES[c.rank];
      rankCounts[rv] = (rankCounts[rv] || 0) + 1;
      suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
    }
  }

  const ranks = Object.keys(rankCounts).map(Number).sort((a, b) => b - a);
  const maxKind = Math.max(...Object.values(rankCounts), 0) + wildCount;
  const maxSuit = Math.max(...Object.values(suitCounts), 0) + wildCount;

  // Five of a kind
  if (maxKind >= 5) return { rank: 10, name: 'Five of a Kind', highCard: ranks[0] || 14 };

  // Check flush
  const hasFlush = maxSuit >= 5;

  // Check straight
  let hasStraight = false;
  let straightHigh = 0;
  for (let high = 14; high >= 5; high--) {
    const needed = [high, high-1, high-2, high-3, high-4];
    let missing = 0;
    for (const r of needed) {
      if (!rankCounts[r]) missing++;
    }
    if (missing <= wildCount) {
      hasStraight = true;
      straightHigh = high;
      break;
    }
  }

  // Royal/Straight flush
  if (hasFlush && hasStraight) {
    if (straightHigh === 14) return { rank: 9, name: 'Royal Flush', highCard: 14 };
    return { rank: 8, name: 'Straight Flush', highCard: straightHigh };
  }

  // Four of a kind
  if (maxKind >= 4) return { rank: 7, name: 'Four of a Kind', highCard: ranks[0] || 14 };

  // Full house
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  if (counts.length >= 2 && counts[0] + counts[1] + wildCount >= 5 && counts[0] + wildCount >= 3) {
    return { rank: 6, name: 'Full House', highCard: ranks[0] };
  }
  if (counts.length === 1 && counts[0] + wildCount >= 5) {
    return { rank: 6, name: 'Full House', highCard: ranks[0] };
  }

  if (hasFlush) return { rank: 5, name: 'Flush', highCard: ranks[0] || 14 };
  if (hasStraight) return { rank: 4, name: 'Straight', highCard: straightHigh };

  // Three of a kind
  if (maxKind >= 3) return { rank: 3, name: 'Three of a Kind', highCard: ranks[0] || 14 };

  // Two pair
  const pairs = Object.values(rankCounts).filter(c => c >= 2).length;
  if (pairs >= 2 || (pairs >= 1 && wildCount >= 1)) {
    return { rank: 2, name: 'Two Pair', highCard: ranks[0] };
  }

  // One pair
  if (maxKind >= 2 || wildCount >= 1) return { rank: 1, name: 'One Pair', highCard: ranks[0] || 14 };

  return { rank: 0, name: 'High Card', highCard: ranks[0] || 14 };
}

// ============ GAME STATE ============
const game = {
  deck: [],
  playerHand: [],
  computerHand: [],
  playerChips: 1000,
  computerChips: 1000,
  pot: 0,
  playerBet: 0,
  computerBet: 0,
  currentBet: 0,
  phase: 'idle', // idle, firstBet, draw, secondBet, showdown
  isPlayerTurn: true,
  dealerIsPlayer: true,
  timer: null,
  timeLeft: 30
};

// ============ UI ELEMENTS ============
const ui = {
  playerChips: document.getElementById('playerChips'),
  opponentChips: document.getElementById('opponentChips'),
  potAmount: document.getElementById('potAmount'),
  playerHand: document.getElementById('playerHand'),
  opponentHand: document.getElementById('opponentHand'),
  playerBet: document.getElementById('playerBet'),
  opponentBet: document.getElementById('opponentBet'),
  gameMessage: document.getElementById('gameMessage'),
  dealerButton: document.getElementById('dealerButton'),
  timerValue: document.getElementById('timerValue'),
  dealBtn: document.getElementById('dealBtn'),
  foldBtn: document.getElementById('foldBtn'),
  callBtn: document.getElementById('callBtn'),
  raiseControls: document.getElementById('raiseControls'),
  raiseSlider: document.getElementById('raiseSlider'),
  raiseAmount: document.getElementById('raiseAmount'),
  raiseBtn: document.getElementById('raiseBtn'),
  drawActions: document.getElementById('drawActions'),
  confirmDraw: document.getElementById('confirmDraw'),
  resultOverlay: document.getElementById('resultOverlay'),
  resultTitle: document.getElementById('resultTitle'),
  resultHands: document.getElementById('resultHands'),
  continueBtn: document.getElementById('continueBtn'),
  gameOverOverlay: document.getElementById('gameOverOverlay'),
  gameOverTitle: document.getElementById('gameOverTitle'),
  gameOverText: document.getElementById('gameOverText'),
  restartBtn: document.getElementById('restartBtn')
};

// ============ UI UPDATES ============
function updateUI() {
  ui.playerChips.textContent = game.playerChips;
  ui.opponentChips.textContent = game.computerChips;
  ui.potAmount.textContent = game.pot;
  ui.playerBet.textContent = game.playerBet > 0 ? `$${game.playerBet}` : '';
  ui.opponentBet.textContent = game.computerBet > 0 ? `$${game.computerBet}` : '';
  ui.dealerButton.className = 'dealer-button ' + (game.dealerIsPlayer ? 'player' : 'opponent');
}

function showMessage(msg) {
  ui.gameMessage.textContent = msg;
}

function showBetButtons(show) {
  ui.dealBtn.classList.toggle('hidden', show);
  ui.foldBtn.classList.toggle('hidden', !show);
  ui.callBtn.classList.toggle('hidden', !show);
  ui.raiseControls.classList.toggle('hidden', !show);
  ui.drawActions.classList.add('hidden');
}

function showDrawButtons(show) {
  ui.drawActions.classList.toggle('hidden', !show);
  ui.foldBtn.classList.add('hidden');
  ui.callBtn.classList.add('hidden');
  ui.raiseControls.classList.add('hidden');
  ui.dealBtn.classList.add('hidden');
}

function updateCallButton() {
  const toCall = game.currentBet - game.playerBet;
  ui.callBtn.textContent = toCall === 0 ? 'CHECK' : `CALL $${toCall}`;
}

function updateRaiseSlider() {
  const min = Math.max(game.currentBet, 20);
  const max = game.playerChips + game.playerBet;
  ui.raiseSlider.min = min;
  ui.raiseSlider.max = max;
  ui.raiseSlider.value = Math.min(min * 2, max);
  ui.raiseAmount.textContent = ui.raiseSlider.value;
}

function renderPlayerHand(selectable = false) {
  ui.playerHand.innerHTML = '';
  game.playerHand.forEach((card, i) => {
    const el = createCardElement(card);
    if (selectable) {
      el.onclick = () => el.classList.toggle('selected');
    }
    ui.playerHand.appendChild(el);
  });
}

function renderComputerHand(faceDown = true) {
  ui.opponentHand.innerHTML = '';
  game.computerHand.forEach(card => {
    const el = faceDown ? createFaceDownCard() : createCardElement(card);
    ui.opponentHand.appendChild(el);
  });
}

function createFaceDownCard() {
  const el = document.createElement('div');
  el.className = 'card face-down';
  return el;
}

function startTimer() {
  game.timeLeft = 30;
  ui.timerValue.textContent = game.timeLeft;
  clearInterval(game.timer);
  game.timer = setInterval(() => {
    game.timeLeft--;
    ui.timerValue.textContent = game.timeLeft;
    if (game.timeLeft <= 0) {
      clearInterval(game.timer);
      if (game.isPlayerTurn) playerFold();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(game.timer);
}

// ============ GAME FLOW ============
function dealNewHand() {
  game.deck = shuffle(createDeck());
  game.playerHand = [];
  game.computerHand = [];
  game.pot = 0;
  game.playerBet = 0;
  game.computerBet = 0;
  game.currentBet = 0;

  // Deal 5 cards each
  for (let i = 0; i < 5; i++) {
    game.playerHand.push(game.deck.pop());
    game.computerHand.push(game.deck.pop());
  }

  // Post blinds - dealer posts small blind
  const smallBlind = 10;
  const bigBlind = 20;

  if (game.dealerIsPlayer) {
    // Player is dealer, posts SB
    game.playerChips -= smallBlind;
    game.playerBet = smallBlind;
    game.computerChips -= bigBlind;
    game.computerBet = bigBlind;
    game.isPlayerTurn = true; // SB acts first
  } else {
    // Computer is dealer, posts SB
    game.computerChips -= smallBlind;
    game.computerBet = smallBlind;
    game.playerChips -= bigBlind;
    game.playerBet = bigBlind;
    game.isPlayerTurn = false; // Computer acts first
  }

  game.pot = smallBlind + bigBlind;
  game.currentBet = bigBlind;
  game.phase = 'firstBet';

  renderPlayerHand();
  renderComputerHand(true);
  updateUI();

  if (game.isPlayerTurn) {
    showMessage('Your turn - Call, Raise, or Fold');
    showBetButtons(true);
    updateCallButton();
    updateRaiseSlider();
    startTimer();
  } else {
    showMessage('Computer is thinking...');
    showBetButtons(false);
    setTimeout(computerBet, 1000);
  }
}

function playerFold() {
  stopTimer();
  game.computerChips += game.pot;
  showMessage('You folded. Computer wins!');
  showBetButtons(false);
  ui.dealBtn.classList.remove('hidden');
  game.phase = 'idle';
  updateUI();
  checkGameOver();
}

function playerCall() {
  stopTimer();
  const toCall = game.currentBet - game.playerBet;
  game.playerChips -= toCall;
  game.playerBet += toCall;
  game.pot += toCall;
  updateUI();

  // Check if betting round complete
  if (game.computerBet === game.currentBet) {
    endBettingRound();
  } else {
    game.isPlayerTurn = false;
    showMessage('Computer is thinking...');
    showBetButtons(false);
    setTimeout(computerBet, 1000);
  }
}

function playerRaise() {
  stopTimer();
  const raiseAmount = parseInt(ui.raiseSlider.value);
  const additional = raiseAmount - game.playerBet;
  game.playerChips -= additional;
  game.playerBet = raiseAmount;
  game.pot += additional;
  game.currentBet = raiseAmount;
  updateUI();

  game.isPlayerTurn = false;
  showMessage('Computer is thinking...');
  showBetButtons(false);
  setTimeout(computerBet, 1000);
}

function computerBet() {
  const handStrength = evaluateHand(game.computerHand).rank;
  const toCall = game.currentBet - game.computerBet;

  // Simple AI logic
  let action;
  if (handStrength >= 3) {
    // Good hand - raise sometimes
    action = Math.random() > 0.5 ? 'raise' : 'call';
  } else if (handStrength >= 1) {
    // Decent hand - usually call
    action = Math.random() > 0.2 ? 'call' : 'fold';
  } else {
    // Bad hand - fold sometimes
    action = toCall > 50 ? 'fold' : (Math.random() > 0.4 ? 'call' : 'fold');
  }

  if (action === 'fold') {
    game.playerChips += game.pot;
    showMessage('Computer folds. You win!');
    showBetButtons(false);
    ui.dealBtn.classList.remove('hidden');
    game.phase = 'idle';
    updateUI();
    checkGameOver();
  } else if (action === 'raise' && game.computerChips > game.currentBet) {
    const raiseAmount = Math.min(game.currentBet * 2, game.computerChips + game.computerBet);
    const additional = raiseAmount - game.computerBet;
    game.computerChips -= additional;
    game.computerBet = raiseAmount;
    game.pot += additional;
    game.currentBet = raiseAmount;
    updateUI();

    showMessage(`Computer raises to $${raiseAmount}!`);
    game.isPlayerTurn = true;
    showBetButtons(true);
    updateCallButton();
    updateRaiseSlider();
    startTimer();
  } else {
    // Call
    game.computerChips -= toCall;
    game.computerBet += toCall;
    game.pot += toCall;
    updateUI();

    showMessage(toCall === 0 ? 'Computer checks' : `Computer calls $${toCall}`);

    if (game.playerBet === game.currentBet) {
      setTimeout(endBettingRound, 1000);
    } else {
      game.isPlayerTurn = true;
      showBetButtons(true);
      updateCallButton();
      updateRaiseSlider();
      startTimer();
    }
  }
}

function endBettingRound() {
  game.playerBet = 0;
  game.computerBet = 0;
  game.currentBet = 0;
  updateUI();

  if (game.phase === 'firstBet') {
    game.phase = 'draw';
    showMessage('Select cards to discard, then click DRAW');
    renderPlayerHand(true);
    showDrawButtons(true);
    startTimer();
  } else {
    showdown();
  }
}

function playerDraw() {
  stopTimer();
  const selected = ui.playerHand.querySelectorAll('.card.selected');
  const discardIndices = [];
  selected.forEach(el => {
    const idx = Array.from(ui.playerHand.children).indexOf(el);
    discardIndices.push(idx);
  });

  // Remove and draw new cards
  discardIndices.sort((a, b) => b - a).forEach(idx => {
    game.playerHand.splice(idx, 1);
    game.playerHand.push(game.deck.pop());
  });

  // Computer draws (simple AI - discard non-pairs, keep wilds)
  const computerDiscards = computerSelectDiscards();
  computerDiscards.sort((a, b) => b - a).forEach(idx => {
    game.computerHand.splice(idx, 1);
    game.computerHand.push(game.deck.pop());
  });

  showMessage(`You drew ${discardIndices.length}, Computer drew ${computerDiscards.length}`);
  renderPlayerHand();
  renderComputerHand(true);

  // Second betting round - non-dealer acts first
  setTimeout(() => {
    game.phase = 'secondBet';
    game.isPlayerTurn = !game.dealerIsPlayer;

    if (game.isPlayerTurn) {
      showMessage('Your turn - Check, Bet, or Fold');
      showBetButtons(true);
      updateCallButton();
      updateRaiseSlider();
      startTimer();
    } else {
      showMessage('Computer is thinking...');
      showBetButtons(false);
      setTimeout(computerBet, 1000);
    }
  }, 1500);
}

function computerSelectDiscards() {
  const dominated = [];
  const wilds = [];

  game.computerHand.forEach((card, i) => {
    if (card.isWild) wilds.push(i);
    else dominated.push({ card, index: i });
  });

  // Count ranks
  const rankCounts = {};
  dominated.forEach(({ card }) => {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  });

  // Keep pairs/trips, discard singles
  const discards = [];
  dominated.forEach(({ card, index }) => {
    if (rankCounts[card.rank] === 1 && discards.length < 3) {
      discards.push(index);
    }
  });

  return discards;
}

function showdown() {
  stopTimer();
  game.phase = 'showdown';

  renderComputerHand(false); // Reveal computer's hand

  const playerEval = evaluateHand(game.playerHand);
  const computerEval = evaluateHand(game.computerHand);

  let winner;
  if (playerEval.rank > computerEval.rank) {
    winner = 'player';
  } else if (computerEval.rank > playerEval.rank) {
    winner = 'computer';
  } else {
    winner = playerEval.highCard >= computerEval.highCard ? 'player' : 'computer';
  }

  if (winner === 'player') {
    game.playerChips += game.pot;
    ui.resultTitle.textContent = 'YOU WIN!';
    ui.resultTitle.style.color = '#ffd700';
  } else {
    game.computerChips += game.pot;
    ui.resultTitle.textContent = 'COMPUTER WINS';
    ui.resultTitle.style.color = '#dc3545';
  }

  ui.resultHands.innerHTML = `
    <p>Your hand: <strong>${playerEval.name}</strong></p>
    <p>Computer: <strong>${computerEval.name}</strong></p>
    <p>Pot: $${game.pot}</p>
  `;

  ui.resultOverlay.classList.remove('hidden');
  updateUI();
}

function continueGame() {
  ui.resultOverlay.classList.add('hidden');
  game.dealerIsPlayer = !game.dealerIsPlayer;
  game.phase = 'idle';

  if (!checkGameOver()) {
    showMessage('Click DEAL for next hand');
    showBetButtons(false);
    ui.dealBtn.classList.remove('hidden');
  }
}

function checkGameOver() {
  if (game.playerChips <= 0) {
    ui.gameOverTitle.textContent = 'GAME OVER';
    ui.gameOverText.textContent = 'You ran out of chips!';
    ui.gameOverOverlay.classList.remove('hidden');
    return true;
  }
  if (game.computerChips <= 0) {
    ui.gameOverTitle.textContent = 'YOU WIN!';
    ui.gameOverText.textContent = 'You busted the computer!';
    ui.gameOverOverlay.classList.remove('hidden');
    return true;
  }
  return false;
}

function restartGame() {
  game.playerChips = 1000;
  game.computerChips = 1000;
  game.dealerIsPlayer = true;
  ui.gameOverOverlay.classList.add('hidden');
  ui.resultOverlay.classList.add('hidden');
  updateUI();
  showMessage('Click DEAL to start!');
  showBetButtons(false);
  ui.dealBtn.classList.remove('hidden');
  ui.playerHand.innerHTML = '';
  ui.opponentHand.innerHTML = '';
}

// ============ EVENT LISTENERS ============
ui.dealBtn.onclick = dealNewHand;
ui.foldBtn.onclick = playerFold;
ui.callBtn.onclick = playerCall;
ui.raiseBtn.onclick = playerRaise;
ui.raiseSlider.oninput = () => ui.raiseAmount.textContent = ui.raiseSlider.value;
ui.confirmDraw.onclick = playerDraw;
ui.continueBtn.onclick = continueGame;
ui.restartBtn.onclick = restartGame;

// ============ INIT ============
updateUI();
console.log('Wild Draw Poker loaded - Click DEAL to start!');
