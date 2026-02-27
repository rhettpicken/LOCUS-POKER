// Double deck (108 cards) with jokers
// Wild cards: All 2s (8 total) and all Jokers (4 total) = 12 wild cards

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
  const deck = [];

  // Create two standard decks
  for (let deckNum = 0; deckNum < 2; deckNum++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          rank,
          suit,
          isWild: rank === '2',
          id: `${rank}_${suit}_${deckNum}`
        });
      }
    }
  }

  // Add 4 jokers (2 per deck)
  for (let i = 0; i < 4; i++) {
    deck.push({
      rank: 'JOKER',
      suit: i < 2 ? 'red' : 'black',
      isWild: true,
      id: `JOKER_${i}`
    });
  }

  return deck;
}

function shuffle(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createShuffledDeck() {
  return shuffle(createDeck());
}

module.exports = {
  createDeck,
  shuffle,
  createShuffledDeck,
  SUITS,
  RANKS
};
