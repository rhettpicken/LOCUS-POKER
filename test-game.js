// Simple game logic tests
const { createShuffledDeck } = require('./lib/deck');
const { compareHands, getHandDescription, HAND_NAMES } = require('./lib/evaluator');

console.log('=== Wild Draw Poker Tests ===\n');

// Test 1: Deck
console.log('1. Deck Creation');
const deck = createShuffledDeck();
console.log(`   - Total cards: ${deck.length} (expected: 108)`);
console.log(`   - Wild cards: ${deck.filter(c => c.isWild).length} (expected: 12)`);
console.log(`   - Status: ${deck.length === 108 && deck.filter(c => c.isWild).length === 12 ? 'PASS' : 'FAIL'}\n`);

// Test 2: Hand Rankings
console.log('2. Hand Rankings');

const testHands = [
  {
    name: 'Five of a Kind',
    cards: [
      { rank: 'A', suit: 'hearts', isWild: false },
      { rank: 'A', suit: 'spades', isWild: false },
      { rank: '2', suit: 'hearts', isWild: true },
      { rank: '2', suit: 'spades', isWild: true },
      { rank: 'JOKER', suit: 'red', isWild: true }
    ],
    expectedRank: 10
  },
  {
    name: 'Royal Flush',
    cards: [
      { rank: 'A', suit: 'spades', isWild: false },
      { rank: 'K', suit: 'spades', isWild: false },
      { rank: 'Q', suit: 'spades', isWild: false },
      { rank: '2', suit: 'hearts', isWild: true },
      { rank: '2', suit: 'clubs', isWild: true }
    ],
    expectedRank: 9
  },
  {
    name: 'Straight Flush',
    cards: [
      { rank: '9', suit: 'hearts', isWild: false },
      { rank: '8', suit: 'hearts', isWild: false },
      { rank: '7', suit: 'hearts', isWild: false },
      { rank: '6', suit: 'hearts', isWild: false },
      { rank: '2', suit: 'hearts', isWild: true }
    ],
    expectedRank: 8
  },
  {
    name: 'Four of a Kind',
    cards: [
      { rank: 'K', suit: 'hearts', isWild: false },
      { rank: 'K', suit: 'spades', isWild: false },
      { rank: '2', suit: 'hearts', isWild: true },
      { rank: '2', suit: 'spades', isWild: true },
      { rank: '5', suit: 'clubs', isWild: false }
    ],
    expectedRank: 7
  },
  {
    name: 'Full House',
    cards: [
      { rank: 'Q', suit: 'hearts', isWild: false },
      { rank: 'Q', suit: 'spades', isWild: false },
      { rank: 'Q', suit: 'clubs', isWild: false },
      { rank: '7', suit: 'hearts', isWild: false },
      { rank: '7', suit: 'spades', isWild: false }
    ],
    expectedRank: 6
  },
  {
    name: 'Flush',
    cards: [
      { rank: 'A', suit: 'diamonds', isWild: false },
      { rank: 'J', suit: 'diamonds', isWild: false },
      { rank: '9', suit: 'diamonds', isWild: false },
      { rank: '6', suit: 'diamonds', isWild: false },
      { rank: '3', suit: 'diamonds', isWild: false }
    ],
    expectedRank: 5
  },
  {
    name: 'Straight',
    cards: [
      { rank: '8', suit: 'hearts', isWild: false },
      { rank: '7', suit: 'spades', isWild: false },
      { rank: '6', suit: 'clubs', isWild: false },
      { rank: '5', suit: 'diamonds', isWild: false },
      { rank: '4', suit: 'hearts', isWild: false }
    ],
    expectedRank: 4
  },
  {
    name: 'Three of a Kind',
    cards: [
      { rank: 'J', suit: 'hearts', isWild: false },
      { rank: 'J', suit: 'spades', isWild: false },
      { rank: '2', suit: 'hearts', isWild: true },
      { rank: '8', suit: 'clubs', isWild: false },
      { rank: '5', suit: 'diamonds', isWild: false }
    ],
    expectedRank: 3
  },
  {
    name: 'High Card (no wilds)',
    cards: [
      { rank: 'A', suit: 'hearts', isWild: false },
      { rank: 'K', suit: 'spades', isWild: false },
      { rank: '9', suit: 'clubs', isWild: false },
      { rank: '7', suit: 'diamonds', isWild: false },
      { rank: '4', suit: 'hearts', isWild: false }
    ],
    expectedRank: 0
  }
];

let passed = 0;
for (const test of testHands) {
  const result = getHandDescription(test.cards);
  const status = result.rank === test.expectedRank ? 'PASS' : 'FAIL';
  if (status === 'PASS') passed++;
  console.log(`   - ${test.name}: ${result.name} (rank ${result.rank}) - ${status}`);
}
console.log(`   - Total: ${passed}/${testHands.length} passed\n`);

// Test 3: Hand Comparison
console.log('3. Hand Comparison');
const pair = [
  { rank: 'K', suit: 'hearts', isWild: false },
  { rank: 'K', suit: 'spades', isWild: false },
  { rank: '9', suit: 'clubs', isWild: false },
  { rank: '7', suit: 'diamonds', isWild: false },
  { rank: '4', suit: 'hearts', isWild: false }
];

const trips = [
  { rank: 'J', suit: 'hearts', isWild: false },
  { rank: 'J', suit: 'spades', isWild: false },
  { rank: 'J', suit: 'clubs', isWild: false },
  { rank: '8', suit: 'diamonds', isWild: false },
  { rank: '5', suit: 'hearts', isWild: false }
];

const comparison = compareHands(trips, pair);
console.log(`   - Three Jacks vs Pair of Kings: ${comparison > 0 ? 'Trips wins' : 'Pair wins'} - ${comparison > 0 ? 'PASS' : 'FAIL'}\n`);

console.log('=== All Tests Complete ===');
