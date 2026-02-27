// Client game state and UI updates

class GameState {
  constructor() {
    this.playerIndex = -1;
    this.playerName = '';
    this.hand = [];
    this.chips = 1000;
    this.opponentChips = 1000;
    this.pot = 0;
    this.currentBet = 0;
    this.playerBet = 0;
    this.opponentBet = 0;
    this.isMyTurn = false;
    this.phase = 'idle';
    this.selectedCards = new Set();
    this.dealerIndex = 0;
  }

  reset() {
    this.hand = [];
    this.pot = 0;
    this.currentBet = 0;
    this.playerBet = 0;
    this.opponentBet = 0;
    this.isMyTurn = false;
    this.phase = 'idle';
    this.selectedCards.clear();
  }
}

const gameState = new GameState();

// UI Elements - initialized after DOM ready
let elements = {};

function initElements() {
  elements = {
    // Screens
    lobby: document.getElementById('lobby'),
    countdown: document.getElementById('countdown'),
    game: document.getElementById('game'),
    result: document.getElementById('result'),

    // Lobby
    playerNameInput: document.getElementById('playerName'),
    quickPlayBtn: document.getElementById('quickPlay'),
    statusText: document.getElementById('statusText'),

    // Game
    opponentName: document.getElementById('opponentName'),
    opponentChips: document.getElementById('opponentChips'),
    playerNameDisplay: document.getElementById('playerNameDisplay'),
    playerChips: document.getElementById('playerChips'),
    potAmount: document.getElementById('potAmount'),
    timerValue: document.getElementById('timerValue'),
    opponentHand: document.getElementById('opponentHand'),
    playerHand: document.getElementById('playerHand'),
    opponentBet: document.getElementById('opponentBet'),
    playerBet: document.getElementById('playerBet'),
    gameMessage: document.getElementById('gameMessage'),
    dealerButton: document.getElementById('dealerButton'),
    actionPanel: document.getElementById('actionPanel'),
    betActions: document.getElementById('betActions'),
    drawActions: document.getElementById('drawActions'),
    foldBtn: document.getElementById('foldBtn'),
    callBtn: document.getElementById('callBtn'),
    raiseBtn: document.getElementById('raiseBtn'),
    raiseSlider: document.getElementById('raiseSlider'),
    raiseAmount: document.getElementById('raiseAmount'),
    confirmDrawBtn: document.getElementById('confirmDraw'),

    // Result
    resultTitle: document.getElementById('resultTitle'),
    resultDetails: document.getElementById('resultDetails'),
    playAgainBtn: document.getElementById('playAgain')
  };

  console.log('Elements initialized:', Object.keys(elements).length);
}

// Screen management
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// UI Updates
function updateChips() {
  elements.playerChips.textContent = gameState.chips;
  elements.opponentChips.textContent = gameState.opponentChips;
}

function updatePot() {
  elements.potAmount.textContent = gameState.pot;
}

function updateBets() {
  elements.playerBet.textContent = gameState.playerBet > 0 ? `$${gameState.playerBet}` : '';
  elements.opponentBet.textContent = gameState.opponentBet > 0 ? `$${gameState.opponentBet}` : '';
}

function updateTimer(seconds) {
  elements.timerValue.textContent = seconds;
  elements.timerValue.parentElement.style.background = seconds <= 10 ? '#dc3545' : '#28a745';
}

function updateMessage(text) {
  elements.gameMessage.textContent = text;
}

function updateDealerButton(isPlayerDealer) {
  elements.dealerButton.className = 'dealer-button ' + (isPlayerDealer ? 'player' : 'opponent');
}

function updateActionButtons(callAmount, minRaise, maxBet) {
  if (callAmount === 0) {
    elements.callBtn.textContent = 'CHECK';
  } else {
    elements.callBtn.textContent = `CALL $${callAmount}`;
  }

  elements.raiseSlider.min = minRaise;
  elements.raiseSlider.max = maxBet;
  elements.raiseSlider.value = minRaise;
  elements.raiseAmount.textContent = minRaise;
}

function showBetActions(show) {
  elements.betActions.classList.toggle('hidden', !show);
  elements.drawActions.classList.add('hidden');
}

function showDrawActions(show) {
  elements.drawActions.classList.toggle('hidden', !show);
  elements.betActions.classList.add('hidden');
}

function enableActionButtons(enabled) {
  elements.foldBtn.disabled = !enabled;
  elements.callBtn.disabled = !enabled;
  elements.raiseBtn.disabled = !enabled;
}

// Card rendering
function renderPlayerHand(selectable = false) {
  const container = elements.playerHand;
  container.innerHTML = '';

  gameState.hand.forEach((card, index) => {
    const el = createCardElement(card);
    el.classList.add('dealing');
    el.style.animationDelay = `${index * 0.1}s`;

    if (selectable) {
      el.addEventListener('click', () => {
        if (gameState.selectedCards.has(index)) {
          gameState.selectedCards.delete(index);
          el.classList.remove('selected');
        } else {
          gameState.selectedCards.add(index);
          el.classList.add('selected');
        }
      });
    }

    container.appendChild(el);
  });
}

function renderOpponentCards(count = 5) {
  renderOpponentHand(elements.opponentHand, count);
}

// Event handlers
function handleRaiseSlider() {
  elements.raiseAmount.textContent = elements.raiseSlider.value;
}

function handleFold() {
  if (!gameState.isMyTurn) return;
  socket.sendAction('fold');
  gameState.isMyTurn = false;
  enableActionButtons(false);
}

function handleCall() {
  if (!gameState.isMyTurn) return;
  socket.sendAction('call');
  gameState.isMyTurn = false;
  enableActionButtons(false);
}

function handleRaise() {
  if (!gameState.isMyTurn) return;
  const amount = parseInt(elements.raiseSlider.value);
  socket.sendAction('raise', amount);
  gameState.isMyTurn = false;
  enableActionButtons(false);
}

function handleConfirmDraw() {
  const indices = Array.from(gameState.selectedCards);
  socket.sendDraw(indices);
  showDrawActions(false);
  updateMessage(`Drawing ${indices.length} card(s)...`);
}

// Socket event handlers
function setupSocketHandlers() {
  socket.on('room:created', (data) => {
    gameState.playerIndex = data.playerIndex;
    elements.displayCode.textContent = data.code;
    elements.waitingRoom.classList.remove('hidden');
  });

  socket.on('room:joined', (data) => {
    gameState.playerIndex = data.playerIndex;
    updateMessage('Joined room. Starting soon...');
  });

  socket.on('room:playerJoined', (data) => {
    updateMessage(`${data.playerName} joined!`);
  });

  socket.on('game:countdown', (data) => {
    showScreen('countdown');
    document.querySelector('.countdown-number').textContent = data.count;
  });

  socket.on('game:start', (data) => {
    showScreen('game');
    gameState.dealerIndex = data.dealerIndex;

    const player = data.players[gameState.playerIndex];
    const opponent = data.players[1 - gameState.playerIndex];

    elements.playerNameDisplay.textContent = player.name;
    elements.opponentName.textContent = opponent.name;

    gameState.chips = player.chips;
    gameState.opponentChips = opponent.chips;
    updateChips();
  });

  socket.on('hand:dealt', (data) => {
    gameState.reset();
    gameState.hand = data.hand;
    gameState.pot = data.pot;
    gameState.chips = data.playerChips;
    gameState.opponentChips = data.opponentChips;
    gameState.playerBet = data.playerBet;
    gameState.opponentBet = data.opponentBet;
    gameState.dealerIndex = data.dealerIndex;

    renderPlayerHand(false);
    renderOpponentCards(5);
    updateChips();
    updatePot();
    updateBets();
    updateDealerButton(data.isDealer);
    updateMessage('Cards dealt!');
    showBetActions(false);
  });

  socket.on('turn:start', (data) => {
    gameState.isMyTurn = data.playerIndex === gameState.playerIndex;
    gameState.pot = data.pot;
    gameState.currentBet = data.currentBet;
    gameState.phase = data.phase;

    updatePot();
    updateTimer(data.timeLeft);

    if (gameState.isMyTurn) {
      updateMessage('Your turn!');
      updateActionButtons(data.callAmount, data.minRaise, data.maxBet);
      showBetActions(true);
      enableActionButtons(true);
    } else {
      updateMessage(`${data.playerName}'s turn...`);
      showBetActions(false);
    }
  });

  socket.on('turn:tick', (data) => {
    updateTimer(data.timeLeft);
  });

  socket.on('action:made', (data) => {
    const isPlayer = data.playerIndex === gameState.playerIndex;

    // Update chips for the player who acted
    if (data.playerChips !== undefined) {
      if (isPlayer) {
        gameState.chips = data.playerChips;
      } else {
        gameState.opponentChips = data.playerChips;
      }
    }

    // Track cumulative bets - for raises, amount is the total bet
    if (data.action === 'raise') {
      if (isPlayer) {
        gameState.playerBet = data.amount;
      } else {
        gameState.opponentBet = data.amount;
      }
    } else if (data.action === 'call' && data.amount > 0) {
      // Call adds to existing bet
      if (isPlayer) {
        gameState.playerBet += data.amount;
      } else {
        gameState.opponentBet += data.amount;
      }
    }

    gameState.pot = data.pot;
    if (data.currentBet !== undefined) {
      gameState.currentBet = data.currentBet;
    }

    updateChips();
    updatePot();
    updateBets();

    const name = isPlayer ? 'You' : elements.opponentName.textContent;
    let actionText = data.action;
    if (data.action === 'raise') {
      actionText = `raise to $${data.amount}`;
    } else if (data.action === 'call' && data.amount > 0) {
      actionText = `call $${data.amount}`;
    }
    updateMessage(`${name} ${actionText}`);
  });

  socket.on('draw:phase', (data) => {
    gameState.phase = 'draw';
    gameState.selectedCards.clear();
    // Clear bets at start of draw phase
    gameState.playerBet = 0;
    gameState.opponentBet = 0;
    updateBets();

    renderPlayerHand(true);
    showDrawActions(true);
    updateMessage('Select cards to discard');
    updateTimer(data.timeLeft);
  });

  socket.on('draw:confirmed', (data) => {
    updateMessage(`Discarding ${data.discardCount} card(s)...`);
  });

  socket.on('opponent:draw', (data) => {
    updateMessage(`Opponent draws ${data.discardCount} card(s)`);
  });

  socket.on('cards:drawn', (data) => {
    gameState.hand = data.hand;
    renderPlayerHand(false);
    updateMessage('New cards received!');
  });

  socket.on('showdown', (data) => {
    const playerHand = data.hands[gameState.playerIndex];
    const opponentHand = data.hands[1 - gameState.playerIndex];

    // Reveal opponent's cards
    revealCards(elements.opponentHand, opponentHand.cards);

    gameState.chips = data.playerChips[gameState.playerIndex];
    gameState.opponentChips = data.playerChips[1 - gameState.playerIndex];
    updateChips();

    setTimeout(() => {
      if (data.isTie) {
        updateMessage(`Tie! ${playerHand.description.name} vs ${opponentHand.description.name}`);
      } else if (data.winnerIndex === gameState.playerIndex) {
        updateMessage(`You win with ${playerHand.description.name}!`);
      } else {
        updateMessage(`${data.winnerName} wins with ${opponentHand.description.name}`);
      }
    }, 1000);
  });

  socket.on('hand:end', (data) => {
    gameState.chips = data.playerChips[gameState.playerIndex];
    gameState.opponentChips = data.playerChips[1 - gameState.playerIndex];
    updateChips();

    if (data.winnerIndex === gameState.playerIndex) {
      updateMessage(`You win $${data.pot}! (Opponent folded)`);
    } else {
      updateMessage(`${data.winnerName} wins $${data.pot}`);
    }
  });

  socket.on('game:end', (data) => {
    showScreen('result');

    const won = data.winnerName === gameState.playerName;

    elements.resultTitle.textContent = won ? 'YOU WIN!' : 'GAME OVER';
    elements.resultDetails.innerHTML = `
      <p>Winner: ${data.winnerName}</p>
      <p>Final Chips: $${data.winnerChips}</p>
      <p>Reason: ${data.reason === 'bust' ? 'Opponent busted' : 'Opponent disconnected'}</p>
    `;
  });

  socket.on('error', (data) => {
    console.error('Server error:', data.message);
    updateMessage(`Error: ${data.message}`);
  });

  socket.on('disconnected', () => {
    updateMessage('Disconnected from server...');
  });
}
