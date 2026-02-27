const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const { Room, generateRoomCode } = require('./lib/room');
const { updatePlayerStats } = require('./lib/stats');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store active rooms
const rooms = new Map();

// Find a waiting room or create a new one
function findOrCreateRoom() {
  // Look for a room with only 1 player waiting
  for (const [code, room] of rooms.entries()) {
    if (room.state === 'waiting' && room.players.length === 1) {
      return room;
    }
  }

  // No waiting room, create a new one
  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  const room = new Room(code);
  rooms.set(code, room);
  return room;
}

// Clean up empty rooms periodically
setInterval(() => {
  for (const [code, room] of rooms.entries()) {
    if (room.players.length === 0 || room.state === 'finished') {
      rooms.delete(code);
    }
  }
}, 60000);

wss.on('connection', (ws) => {
  console.log('New connection');
  let currentRoom = null;
  let playerIndex = -1;
  let playerName = '';

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Received:', message.event);

      switch (message.event) {
        case 'quick:play': {
          playerName = message.name || `Player${Math.floor(Math.random() * 1000)}`;

          // Find or create a room
          const room = findOrCreateRoom();
          const isNewRoom = room.players.length === 0;

          const result = room.addPlayer(ws, playerName);

          if (result.success) {
            currentRoom = room;
            playerIndex = result.playerIndex;

            if (isNewRoom || room.players.length === 1) {
              // Waiting for opponent
              ws.send(JSON.stringify({
                event: 'quick:waiting',
                message: 'Waiting for opponent...'
              }));
            }
            // If room now has 2 players, Room.addPlayer will trigger startCountdown
          } else {
            ws.send(JSON.stringify({
              event: 'error',
              message: result.error
            }));
          }
          break;
        }

        case 'action:bet': {
          if (!currentRoom || playerIndex === -1) break;

          const result = currentRoom.handleAction(
            playerIndex,
            message.action,
            message.amount
          );

          if (!result.success) {
            ws.send(JSON.stringify({
              event: 'error',
              message: result.error
            }));
          }
          break;
        }

        case 'draw:select': {
          if (!currentRoom || playerIndex === -1) break;

          const result = currentRoom.handleDraw(
            playerIndex,
            message.cardIndices
          );

          if (!result.success) {
            ws.send(JSON.stringify({
              event: 'error',
              message: result.error
            }));
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    console.log('Connection closed');
    if (currentRoom) {
      currentRoom.removePlayer(ws);

      // Update stats for disconnection
      if (playerName) {
        updatePlayerStats(playerName, { gamePlayed: true });
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

server.listen(PORT, () => {
  console.log(`Wild Draw Poker server running on http://localhost:${PORT}`);
});
