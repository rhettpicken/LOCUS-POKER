// Main entry point

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing...');

  // Initialize UI elements
  initElements();

  // Connect to WebSocket server
  try {
    await socket.connect();
    console.log('WebSocket connected successfully');
  } catch (err) {
    console.error('Failed to connect:', err);
    document.getElementById('statusText').textContent = 'Connection failed. Refresh to retry.';
    return;
  }

  // Setup socket event handlers
  setupSocketHandlers();

  // Additional handlers for quick play
  socket.on('quick:waiting', (data) => {
    const statusText = document.getElementById('statusText');
    statusText.textContent = data.message;
    statusText.classList.add('waiting');
  });

  // Quick Play button
  const quickPlayBtn = document.getElementById('quickPlay');
  const playerNameInput = document.getElementById('playerName');
  const statusText = document.getElementById('statusText');

  quickPlayBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim() || `Player${Math.floor(Math.random() * 1000)}`;
    gameState.playerName = name;
    console.log('Quick play as:', name);

    quickPlayBtn.disabled = true;
    playerNameInput.disabled = true;
    statusText.textContent = 'Connecting...';

    socket.quickPlay(name);
  });

  // Enter key to start
  playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      quickPlayBtn.click();
    }
  });

  // Game action buttons
  elements.foldBtn.addEventListener('click', handleFold);
  elements.callBtn.addEventListener('click', handleCall);
  elements.raiseBtn.addEventListener('click', handleRaise);
  elements.raiseSlider.addEventListener('input', handleRaiseSlider);
  elements.confirmDrawBtn.addEventListener('click', handleConfirmDraw);

  // Play again button
  elements.playAgainBtn.addEventListener('click', () => {
    window.location.reload();
  });

  // Prevent accidental page unload during game
  window.addEventListener('beforeunload', (e) => {
    if (document.getElementById('game').classList.contains('active')) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  console.log('Wild Draw Poker initialized - ready to play!');
});
