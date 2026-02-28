// Mode Manager - Handles mode selection and transitions between Solo and Multiplayer

const ModeManager = {
  serverAvailable: false,
  socket: null,
  currentMode: null,
  playerName: 'Player',
  pendingMode: null,
  roomCode: null,

  // UI Elements
  ui: {
    menuScreen: null,
    gameScreen: null,
    soloModeBtn: null,
    quickMatchBtn: null,
    createRoomBtn: null,
    joinRoomBtn: null,
    roomCodeInput: null,
    serverStatus: null,
    statusDot: null,
    statusText: null,
    quickMatchStatus: null,
    roomCodeDisplay: null,
    displayedRoomCode: null,
    cancelRoomBtn: null,
    nameModal: null,
    playerNameInput: null,
    confirmNameBtn: null,
    cancelNameBtn: null
  },

  init() {
    this.cacheElements();
    this.bindEvents();
    this.checkServerStatus();
  },

  cacheElements() {
    this.ui.menuScreen = document.getElementById('menu');
    this.ui.gameScreen = document.getElementById('game');
    this.ui.soloModeBtn = document.getElementById('soloModeBtn');
    this.ui.quickMatchBtn = document.getElementById('quickMatchBtn');
    this.ui.createRoomBtn = document.getElementById('createRoomBtn');
    this.ui.joinRoomBtn = document.getElementById('joinRoomBtn');
    this.ui.roomCodeInput = document.getElementById('roomCodeInput');
    this.ui.serverStatus = document.getElementById('serverStatus');
    this.ui.statusDot = this.ui.serverStatus.querySelector('.status-dot');
    this.ui.statusText = this.ui.serverStatus.querySelector('.status-text');
    this.ui.quickMatchStatus = document.getElementById('quickMatchStatus');
    this.ui.roomCodeDisplay = document.getElementById('roomCodeDisplay');
    this.ui.displayedRoomCode = document.getElementById('displayedRoomCode');
    this.ui.cancelRoomBtn = document.getElementById('cancelRoomBtn');
    this.ui.nameModal = document.getElementById('nameModal');
    this.ui.playerNameInput = document.getElementById('playerNameInput');
    this.ui.confirmNameBtn = document.getElementById('confirmNameBtn');
    this.ui.cancelNameBtn = document.getElementById('cancelNameBtn');
    this.ui.backToMenuBtn = document.getElementById('backToMenuBtn');
  },

  bindEvents() {
    this.ui.soloModeBtn.addEventListener('click', () => this.startSoloMode());
    this.ui.quickMatchBtn.addEventListener('click', () => this.showNameModal('quick'));
    this.ui.createRoomBtn.addEventListener('click', () => this.showNameModal('create'));
    this.ui.joinRoomBtn.addEventListener('click', () => this.showNameModal('join'));
    this.ui.cancelRoomBtn.addEventListener('click', () => this.cancelRoom());
    this.ui.confirmNameBtn.addEventListener('click', () => this.confirmName());
    this.ui.cancelNameBtn.addEventListener('click', () => this.hideNameModal());

    this.ui.playerNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.confirmName();
    });

    this.ui.roomCodeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^0-9]/g, '');
    });

    this.ui.backToMenuBtn.addEventListener('click', () => this.backToMenu());
  },

  backToMenu() {
    // Clean up current game state
    if (this.currentMode === 'solo' && window.SoloGame) {
      window.SoloGame.cleanup();
    } else if (this.currentMode === 'multiplayer') {
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
    }

    this.currentMode = null;
    this.showMenuScreen();
  },

  async checkServerStatus() {
    this.updateServerStatus('checking');

    try {
      const available = await this.probeServer();
      this.serverAvailable = available;

      if (available) {
        this.updateServerStatus('online');
        this.enableMultiplayer();
      } else {
        this.updateServerStatus('offline');
        this.disableMultiplayer();
      }
    } catch (err) {
      this.serverAvailable = false;
      this.updateServerStatus('offline');
      this.disableMultiplayer();
    }
  },

  probeServer() {
    return new Promise((resolve) => {
      // Determine WebSocket URL based on current location
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${location.host}`;

      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
    });
  },

  updateServerStatus(status) {
    this.ui.statusDot.className = 'status-dot ' + status;

    switch (status) {
      case 'online':
        this.ui.statusText.textContent = 'Server online';
        break;
      case 'offline':
        this.ui.statusText.textContent = 'Server offline - Solo mode only';
        break;
      case 'checking':
        this.ui.statusText.textContent = 'Checking server...';
        break;
    }
  },

  enableMultiplayer() {
    this.ui.quickMatchBtn.disabled = false;
    this.ui.createRoomBtn.disabled = false;
    this.ui.joinRoomBtn.disabled = false;
    this.ui.roomCodeInput.disabled = false;
    this.ui.quickMatchStatus.textContent = '';
  },

  disableMultiplayer() {
    this.ui.quickMatchBtn.disabled = true;
    this.ui.createRoomBtn.disabled = true;
    this.ui.joinRoomBtn.disabled = true;
    this.ui.roomCodeInput.disabled = true;
    this.ui.quickMatchStatus.textContent = 'Server offline';
  },

  showNameModal(mode) {
    this.pendingMode = mode;
    this.ui.nameModal.classList.remove('hidden');
    this.ui.playerNameInput.value = this.playerName !== 'Player' ? this.playerName : '';
    this.ui.playerNameInput.focus();
  },

  hideNameModal() {
    this.ui.nameModal.classList.add('hidden');
    this.pendingMode = null;
  },

  confirmName() {
    const name = this.ui.playerNameInput.value.trim() || 'Player';
    this.playerName = name.substring(0, 12);
    this.hideNameModal();

    switch (this.pendingMode) {
      case 'quick':
        this.startQuickMatch();
        break;
      case 'create':
        this.createPrivateRoom();
        break;
      case 'join':
        this.joinPrivateRoom();
        break;
    }
  },

  // ============ SOLO MODE ============
  startSoloMode() {
    this.currentMode = 'solo';
    this.showGameScreen();
    // Initialize solo game (script already loaded)
    if (window.SoloGame) {
      window.SoloGame.init();
    }
  },

  // ============ MULTIPLAYER ============
  connectWebSocket() {
    return new Promise((resolve, reject) => {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${location.host}`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        resolve();
      };

      this.socket.onerror = (err) => {
        console.error('WebSocket error:', err);
        reject(err);
      };

      this.socket.onclose = () => {
        console.log('WebSocket closed');
        this.handleDisconnect();
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };
    });
  },

  async startQuickMatch() {
    try {
      await this.connectWebSocket();
      this.currentMode = 'multiplayer';

      this.socket.send(JSON.stringify({
        event: 'quick:play',
        name: this.playerName
      }));

      this.ui.quickMatchBtn.disabled = true;
      this.ui.quickMatchStatus.textContent = 'Searching...';
    } catch (err) {
      console.error('Failed to connect:', err);
      this.updateServerStatus('offline');
      this.disableMultiplayer();
    }
  },

  async createPrivateRoom() {
    try {
      await this.connectWebSocket();
      this.currentMode = 'multiplayer';

      this.socket.send(JSON.stringify({
        event: 'room:create',
        name: this.playerName
      }));
    } catch (err) {
      console.error('Failed to connect:', err);
      this.updateServerStatus('offline');
      this.disableMultiplayer();
    }
  },

  async joinPrivateRoom() {
    const code = this.ui.roomCodeInput.value.trim();
    if (code.length !== 4) {
      this.ui.roomCodeInput.classList.add('error');
      setTimeout(() => this.ui.roomCodeInput.classList.remove('error'), 1000);
      return;
    }

    try {
      await this.connectWebSocket();
      this.currentMode = 'multiplayer';

      this.socket.send(JSON.stringify({
        event: 'room:join',
        name: this.playerName,
        code: code
      }));
    } catch (err) {
      console.error('Failed to connect:', err);
      this.updateServerStatus('offline');
      this.disableMultiplayer();
    }
  },

  showRoomCode(code) {
    this.roomCode = code;
    this.ui.displayedRoomCode.textContent = code;
    this.ui.roomCodeDisplay.classList.remove('hidden');
    // Hide the menu buttons
    document.querySelector('.menu-buttons').classList.add('hidden');
  },

  cancelRoom() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.roomCode = null;
    this.ui.roomCodeDisplay.classList.add('hidden');
    document.querySelector('.menu-buttons').classList.remove('hidden');
    this.ui.quickMatchBtn.disabled = false;
    this.ui.quickMatchStatus.textContent = '';
  },

  handleMessage(data) {
    console.log('Received:', data.event, data);

    switch (data.event) {
      case 'quick:waiting':
        this.ui.quickMatchStatus.textContent = 'Waiting...';
        break;

      case 'room:created':
        this.showRoomCode(data.code);
        break;

      case 'room:joined':
        // Successfully joined a room, waiting for game start
        this.ui.quickMatchStatus.textContent = 'Joined! Starting...';
        break;

      case 'room:error':
        alert(data.message || 'Failed to join room');
        this.cancelRoom();
        break;

      case 'game:countdown':
        this.ui.quickMatchStatus.textContent = `Starting in ${data.count}...`;
        if (this.roomCode) {
          document.querySelector('.waiting-text').textContent = `Starting in ${data.count}...`;
        }
        break;

      case 'game:start':
        this.showGameScreen();
        this.loadMultiplayerGame(data);
        break;

      case 'hand:dealt':
      case 'turn:start':
      case 'turn:tick':
      case 'action:made':
      case 'draw:phase':
      case 'draw:confirmed':
      case 'opponent:draw':
      case 'cards:drawn':
      case 'showdown':
      case 'hand:end':
      case 'game:end':
        // Forward to multiplayer game handler
        if (window.MultiplayerGame) {
          window.MultiplayerGame.handleMessage(data);
        }
        break;

      case 'error':
        console.error('Server error:', data.message);
        break;
    }
  },

  handleDisconnect() {
    if (this.currentMode === 'multiplayer' && window.MultiplayerGame) {
      window.MultiplayerGame.handleDisconnect();
    }
  },

  // ============ SCREEN MANAGEMENT ============
  showGameScreen() {
    this.ui.menuScreen.classList.remove('active');
    this.ui.gameScreen.classList.add('active');
  },

  showMenuScreen() {
    this.ui.gameScreen.classList.remove('active');
    this.ui.menuScreen.classList.add('active');
    this.ui.roomCodeDisplay.classList.add('hidden');
    document.querySelector('.menu-buttons').classList.remove('hidden');
    this.ui.quickMatchStatus.textContent = '';
    this.ui.quickMatchBtn.disabled = !this.serverAvailable;
  },

  loadMultiplayerGame(gameData) {
    // Dynamically load multiplayer game script
    if (!window.MultiplayerGame) {
      const script = document.createElement('script');
      script.src = 'js/multiplayer-game.js';
      script.onload = () => {
        window.MultiplayerGame.init(this.socket, this.playerName, gameData);
      };
      document.body.appendChild(script);
    } else {
      window.MultiplayerGame.init(this.socket, this.playerName, gameData);
    }
  },

  // Send action to server (used by multiplayer game)
  sendAction(action, data = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event: action, ...data }));
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  ModeManager.init();
});
