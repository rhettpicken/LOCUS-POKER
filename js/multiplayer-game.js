// Multiplayer Game - Handles multiplayer poker game logic

const MultiplayerGame = {
  socket: null,
  playerName: '',
  opponentName: '',
  playerIndex: -1,
  dealerIndex: 0,
  hand: [],
  playerChips: 1000,
  opponentChips: 1000,
  pot: 0,
  currentBet: 0,
  playerBet: 0,
  opponentBet: 0,
  isMyTurn: false,
  phase: 'idle',
  timeLeft: 30,
  selectedCards: new Set(),
  timerInterval: null,

  // UI Elements
  ui: {
    playerChips: null,
    opponentChips: null,
    potAmount: null,
    playerHand: null,
    opponentHand: null,
    playerBet: null,
    opponentBet: null,
    gameMessage: null,
    dealerButton: null,
    timerValue: null,
    gameTitle: null,
    dealBtn: null,
    foldBtn: null,
    callBtn: null,
    raiseControls: null,
    raiseSlider: null,
    raiseAmount: null,
    raiseBtn: null,
    drawActions: null,
    confirmDraw: null,
    resultOverlay: null,
    resultTitle: null,
    resultHands: null,
    continueBtn: null,
    gameOverOverlay: null,
    gameOverTitle: null,
    gameOverText: null,
    restartBtn: null,
    opponentNameEl: null
  },

  init(socket, playerName, gameData) {
    this.socket = socket;
    this.playerName = playerName;
    this.cacheElements();
    this.bindEvents();
    this.handleGameStart(gameData);
  },

  cacheElements() {
    this.ui.playerChips = document.getElementById('playerChips');
    this.ui.opponentChips = document.getElementById('opponentChips');
    this.ui.potAmount = document.getElementById('potAmount');
    this.ui.playerHand = document.getElementById('playerHand');
    this.ui.opponentHand = document.getElementById('opponentHand');
    this.ui.playerBet = document.getElementById('playerBet');
    this.ui.opponentBet = document.getElementById('opponentBet');
    this.ui.gameMessage = document.getElementById('gameMessage');
    this.ui.dealerButton = document.getElementById('dealerButton');
    this.ui.timerValue = document.getElementById('timerValue');
    this.ui.gameTitle = document.getElementById('gameTitle');
    this.ui.dealBtn = document.getElementById('dealBtn');
    this.ui.foldBtn = document.getElementById('foldBtn');
    this.ui.callBtn = document.getElementById('callBtn');
    this.ui.raiseControls = document.getElementById('raiseControls');
    this.ui.raiseSlider = document.getElementById('raiseSlider');
    this.ui.raiseAmount = document.getElementById('raiseAmount');
    this.ui.raiseBtn = document.getElementById('raiseBtn');
    this.ui.drawActions = document.getElementById('drawActions');
    this.ui.confirmDraw = document.getElementById('confirmDraw');
    this.ui.resultOverlay = document.getElementById('resultOverlay');
    this.ui.resultTitle = document.getElementById('resultTitle');
    this.ui.resultHands = document.getElementById('resultHands');
    this.ui.continueBtn = document.getElementById('continueBtn');
    this.ui.gameOverOverlay = document.getElementById('gameOverOverlay');
    this.ui.gameOverTitle = document.getElementById('gameOverTitle');
    this.ui.gameOverText = document.getElementById('gameOverText');
    this.ui.restartBtn = document.getElementById('restartBtn');
    this.ui.opponentNameEl = document.querySelector('.opponent-info .player-name');
  },

  bindEvents() {
    this.ui.foldBtn.onclick = () => this.sendAction('fold');
    this.ui.callBtn.onclick = () => this.sendAction('call');
    this.ui.raiseBtn.onclick = () => this.sendAction('raise');
    this.ui.raiseSlider.oninput = () => {
      this.ui.raiseAmount.textContent = this.ui.raiseSlider.value;
    };
    this.ui.confirmDraw.onclick = () => this.confirmDraw();
    this.ui.continueBtn.onclick = () => this.hideResult();
    this.ui.restartBtn.onclick = () => this.returnToMenu();
  },

  sendAction(action) {
    if (!this.isMyTurn) return;

    let data = { event: 'action:bet', action };

    if (action === 'raise') {
      data.amount = parseInt(this.ui.raiseSlider.value);
    }

    ModeManager.sendAction('action:bet', { action: data.action, amount: data.amount });
    this.isMyTurn = false;
    this.hideBetButtons();
  },

  confirmDraw() {
    const cardIndices = Array.from(this.selectedCards);
    ModeManager.sendAction('draw:select', { cardIndices });
    this.selectedCards.clear();
    this.hideDrawButtons();
    this.showMessage('Waiting for opponent...');
  },

  handleMessage(data) {
    switch (data.event) {
      case 'hand:dealt':
        this.handleHandDealt(data);
        break;
      case 'turn:start':
        this.handleTurnStart(data);
        break;
      case 'turn:tick':
        this.handleTurnTick(data);
        break;
      case 'action:made':
        this.handleActionMade(data);
        break;
      case 'draw:phase':
        this.handleDrawPhase(data);
        break;
      case 'draw:confirmed':
        this.showMessage(`Discarding ${data.discardCount} cards...`);
        break;
      case 'opponent:draw':
        this.showMessage(`Opponent discarding ${data.discardCount} cards...`);
        break;
      case 'cards:drawn':
        this.handleCardsDrawn(data);
        break;
      case 'showdown':
        this.handleShowdown(data);
        break;
      case 'hand:end':
        this.handleHandEnd(data);
        break;
      case 'game:end':
        this.handleGameEnd(data);
        break;
    }
  },

  handleGameStart(data) {
    // Determine player index based on name matching
    this.playerIndex = data.players.findIndex(p => p.name === this.playerName);
    if (this.playerIndex === -1) this.playerIndex = 0;

    this.opponentName = data.players[1 - this.playerIndex].name;
    this.dealerIndex = data.dealerIndex;

    // Update opponent name in UI
    this.ui.opponentNameEl.textContent = this.opponentName.toUpperCase();

    // Hide deal button (server controls dealing)
    this.ui.dealBtn.classList.add('hidden');
    this.ui.gameTitle.classList.add('hidden');

    this.showMessage('Game starting...');
  },

  handleHandDealt(data) {
    this.hand = data.hand;
    this.pot = data.pot;
    this.playerChips = data.playerChips;
    this.opponentChips = data.opponentChips;
    this.playerBet = data.playerBet;
    this.opponentBet = data.opponentBet;
    this.dealerIndex = data.dealerIndex;
    this.phase = 'betting';

    this.renderPlayerHand();
    this.renderOpponentHand(5);
    this.updateUI();
    this.updateDealerButton(data.isDealer);
  },

  handleTurnStart(data) {
    const isMyTurn = data.playerIndex === this.playerIndex;
    this.isMyTurn = isMyTurn;
    this.timeLeft = data.timeLeft;
    this.currentBet = data.currentBet;

    if (isMyTurn) {
      this.showMessage('Your turn');
      this.showBetButtons(data.callAmount, data.minRaise, data.maxBet);
    } else {
      this.showMessage(`${this.opponentName} is thinking...`);
      this.hideBetButtons();
    }

    this.pot = data.pot;
    this.updateUI();
  },

  handleTurnTick(data) {
    this.timeLeft = data.timeLeft;
    this.ui.timerValue.textContent = data.timeLeft;
  },

  handleActionMade(data) {
    const isOpponent = data.playerIndex !== this.playerIndex;
    const name = isOpponent ? this.opponentName : 'You';

    let message;
    switch (data.action) {
      case 'fold':
        message = `${name} folded`;
        break;
      case 'check':
        message = `${name} checked`;
        break;
      case 'call':
        message = `${name} called $${data.amount}`;
        break;
      case 'raise':
        message = `${name} raised to $${data.amount}`;
        break;
    }

    this.showMessage(message);
    this.pot = data.pot;

    if (data.currentBet !== undefined) {
      this.currentBet = data.currentBet;
    }

    // Update bets
    if (isOpponent) {
      this.opponentBet = data.amount || 0;
      this.opponentChips = data.playerChips;
    } else {
      this.playerBet = data.amount || 0;
      this.playerChips = data.playerChips;
    }

    this.updateUI();
  },

  handleDrawPhase(data) {
    this.phase = 'draw';
    this.pot = data.pot;
    this.timeLeft = data.timeLeft;
    this.selectedCards.clear();

    this.showMessage('Select cards to discard');
    this.renderPlayerHand(true); // Enable selection
    this.showDrawButtons();
    this.updateUI();
  },

  handleCardsDrawn(data) {
    this.hand = data.hand;
    this.phase = 'betting';
    this.selectedCards.clear();

    this.renderPlayerHand();
    this.showMessage('Second betting round');
    this.updateUI();
  },

  handleShowdown(data) {
    this.phase = 'showdown';

    const myHand = data.hands[this.playerIndex];
    const oppHand = data.hands[1 - this.playerIndex];

    // Reveal opponent's cards
    this.renderOpponentCards(oppHand.cards);

    // Determine result
    let title, color;
    if (data.isTie) {
      title = 'TIE!';
      color = '#ffd700';
    } else if (data.winnerIndex === this.playerIndex) {
      title = 'YOU WIN!';
      color = '#ffd700';
    } else {
      title = 'YOU LOSE';
      color = '#dc3545';
    }

    this.playerChips = data.playerChips[this.playerIndex];
    this.opponentChips = data.playerChips[1 - this.playerIndex];

    this.showResult(title, color, myHand.description, oppHand.description, data.pot);
    this.updateUI();
  },

  handleHandEnd(data) {
    const isWinner = data.winnerIndex === this.playerIndex;

    this.playerChips = data.playerChips[this.playerIndex];
    this.opponentChips = data.playerChips[1 - this.playerIndex];

    if (data.reason === 'fold') {
      const title = isWinner ? 'YOU WIN!' : 'YOU LOSE';
      const color = isWinner ? '#ffd700' : '#dc3545';
      const reason = isWinner ? `${this.opponentName} folded` : 'You folded';

      this.showResult(title, color, reason, '', data.pot);
    }

    this.updateUI();
  },

  handleGameEnd(data) {
    const isWinner = data.winnerName === this.playerName;

    this.ui.gameOverTitle.textContent = isWinner ? 'YOU WIN!' : 'GAME OVER';
    this.ui.gameOverText.textContent = isWinner
      ? `You won with $${data.winnerChips}!`
      : `${data.winnerName} wins with $${data.winnerChips}`;

    this.ui.gameOverOverlay.classList.remove('hidden');
  },

  handleDisconnect() {
    this.showMessage('Opponent disconnected');
    setTimeout(() => {
      this.ui.gameOverTitle.textContent = 'DISCONNECTED';
      this.ui.gameOverText.textContent = 'Connection lost';
      this.ui.gameOverOverlay.classList.remove('hidden');
    }, 1000);
  },

  // ============ UI UPDATES ============
  updateUI() {
    this.ui.playerChips.textContent = this.playerChips;
    this.ui.opponentChips.textContent = this.opponentChips;
    this.ui.potAmount.textContent = this.pot;
    this.ui.playerBet.textContent = this.playerBet > 0 ? `$${this.playerBet}` : '';
    this.ui.opponentBet.textContent = this.opponentBet > 0 ? `$${this.opponentBet}` : '';
    this.ui.timerValue.textContent = this.timeLeft;
  },

  updateDealerButton(isDealer) {
    this.ui.dealerButton.className = 'dealer-button ' + (isDealer ? 'player' : 'opponent');
  },

  showMessage(msg) {
    this.ui.gameMessage.textContent = msg;
  },

  showBetButtons(callAmount, minRaise, maxBet) {
    this.ui.foldBtn.classList.remove('hidden');
    this.ui.callBtn.classList.remove('hidden');
    this.ui.raiseControls.classList.remove('hidden');
    this.ui.gameTitle.classList.add('hidden');
    this.ui.dealBtn.classList.add('hidden');

    this.ui.callBtn.textContent = callAmount === 0 ? 'CHECK' : `CALL $${callAmount}`;

    this.ui.raiseSlider.min = minRaise;
    this.ui.raiseSlider.max = maxBet;
    this.ui.raiseSlider.value = Math.min(minRaise * 2, maxBet);
    this.ui.raiseAmount.textContent = this.ui.raiseSlider.value;
  },

  hideBetButtons() {
    this.ui.foldBtn.classList.add('hidden');
    this.ui.callBtn.classList.add('hidden');
    this.ui.raiseControls.classList.add('hidden');
  },

  showDrawButtons() {
    this.ui.drawActions.classList.remove('hidden');
    this.hideBetButtons();
  },

  hideDrawButtons() {
    this.ui.drawActions.classList.add('hidden');
  },

  renderPlayerHand(selectable = false) {
    this.ui.playerHand.innerHTML = '';

    this.hand.forEach((card, i) => {
      const el = createCardElement(card);

      if (selectable) {
        el.onclick = () => {
          el.classList.toggle('selected');
          if (el.classList.contains('selected')) {
            this.selectedCards.add(i);
          } else {
            this.selectedCards.delete(i);
          }
        };
      }

      this.ui.playerHand.appendChild(el);
    });
  },

  renderOpponentHand(count) {
    this.ui.opponentHand.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'card face-down';
      this.ui.opponentHand.appendChild(el);
    }
  },

  renderOpponentCards(cards) {
    this.ui.opponentHand.innerHTML = '';

    cards.forEach(card => {
      const el = createCardElement(card);
      this.ui.opponentHand.appendChild(el);
    });
  },

  showResult(title, color, playerDesc, opponentDesc, pot) {
    this.ui.resultTitle.textContent = title;
    this.ui.resultTitle.style.color = color;

    let html = '';
    if (playerDesc) html += `<p>Your hand: <strong>${playerDesc}</strong></p>`;
    if (opponentDesc) html += `<p>${this.opponentName}: <strong>${opponentDesc}</strong></p>`;
    html += `<p>Pot: $${pot}</p>`;

    this.ui.resultHands.innerHTML = html;
    this.ui.resultOverlay.classList.remove('hidden');

    // Hide continue button - server will auto-deal next hand
    this.ui.continueBtn.classList.add('hidden');

    // Auto-hide after delay
    setTimeout(() => {
      this.hideResult();
    }, 3000);
  },

  hideResult() {
    this.ui.resultOverlay.classList.add('hidden');
    this.playerBet = 0;
    this.opponentBet = 0;
    this.updateUI();
  },

  returnToMenu() {
    this.ui.gameOverOverlay.classList.add('hidden');
    this.ui.resultOverlay.classList.add('hidden');

    // Reset state
    this.hand = [];
    this.selectedCards.clear();
    this.playerChips = 1000;
    this.opponentChips = 1000;
    this.pot = 0;

    // Clear hands
    this.ui.playerHand.innerHTML = '';
    this.ui.opponentHand.innerHTML = '';

    // Close socket
    if (this.socket) {
      this.socket.close();
    }

    ModeManager.showMenuScreen();
  }
};

// Export for use by ModeManager
window.MultiplayerGame = MultiplayerGame;
