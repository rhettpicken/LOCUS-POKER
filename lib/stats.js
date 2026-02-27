// Player stats persistence using JSON file

const fs = require('fs');
const path = require('path');

const STATS_FILE = path.join(__dirname, '..', 'stats.json');

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
  return { players: {} };
}

function saveStats(stats) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error('Error saving stats:', err);
  }
}

function getPlayerStats(name) {
  const stats = loadStats();
  return stats.players[name] || {
    gamesPlayed: 0,
    gamesWon: 0,
    handsPlayed: 0,
    handsWon: 0,
    biggestPot: 0,
    totalWinnings: 0
  };
}

function updatePlayerStats(name, update) {
  const stats = loadStats();

  if (!stats.players[name]) {
    stats.players[name] = {
      gamesPlayed: 0,
      gamesWon: 0,
      handsPlayed: 0,
      handsWon: 0,
      biggestPot: 0,
      totalWinnings: 0
    };
  }

  const player = stats.players[name];

  if (update.gamePlayed) player.gamesPlayed++;
  if (update.gameWon) player.gamesWon++;
  if (update.handPlayed) player.handsPlayed++;
  if (update.handWon) player.handsWon++;
  if (update.potWon) {
    player.totalWinnings += update.potWon;
    if (update.potWon > player.biggestPot) {
      player.biggestPot = update.potWon;
    }
  }

  saveStats(stats);
  return player;
}

function getAllStats() {
  return loadStats();
}

module.exports = {
  getPlayerStats,
  updatePlayerStats,
  getAllStats
};
