// Hand evaluation with wild cards
// Wild cards (2s and Jokers) can substitute for any card

const HAND_RANKS = {
  FIVE_OF_A_KIND: 10,
  ROYAL_FLUSH: 9,
  STRAIGHT_FLUSH: 8,
  FOUR_OF_A_KIND: 7,
  FULL_HOUSE: 6,
  FLUSH: 5,
  STRAIGHT: 4,
  THREE_OF_A_KIND: 3,
  TWO_PAIR: 2,
  ONE_PAIR: 1,
  HIGH_CARD: 0
};

const HAND_NAMES = {
  10: 'Five of a Kind',
  9: 'Royal Flush',
  8: 'Straight Flush',
  7: 'Four of a Kind',
  6: 'Full House',
  5: 'Flush',
  4: 'Straight',
  3: 'Three of a Kind',
  2: 'Two Pair',
  1: 'One Pair',
  0: 'High Card'
};

const RANK_VALUES = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];

// Optimized evaluation using wild card logic
function evaluateHandWithWilds(cards) {
  const wildCount = cards.filter(c => c.isWild).length;
  const naturalCards = cards.filter(c => !c.isWild);

  // Special case: all wilds = five aces
  if (wildCount === 5) {
    return { rank: HAND_RANKS.FIVE_OF_A_KIND, highCards: [14, 14, 14, 14, 14] };
  }

  // Get rank and suit distributions of natural cards
  const rankCounts = {};
  const suitCounts = {};

  for (const card of naturalCards) {
    const rv = RANK_VALUES[card.rank];
    rankCounts[rv] = (rankCounts[rv] || 0) + 1;
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  }

  const ranks = Object.keys(rankCounts).map(Number).sort((a, b) => b - a);
  const maxOfAKind = Math.max(...Object.values(rankCounts), 0);
  const pairCount = Object.values(rankCounts).filter(c => c >= 2).length;

  // Check flush potential
  const maxSuitCount = Math.max(...Object.values(suitCounts), 0);
  const hasFlush = maxSuitCount + wildCount >= 5;

  // Find best flush suit
  let flushSuit = null;
  if (hasFlush) {
    for (const [suit, count] of Object.entries(suitCounts)) {
      if (count + wildCount >= 5) {
        flushSuit = suit;
        break;
      }
    }
  }

  // Check straight potential (with wilds filling gaps)
  function canMakeStraight(ranksSet, wilds) {
    const sortedRanks = [...ranksSet].sort((a, b) => a - b);

    // Check all possible 5-card sequences
    for (let high = 14; high >= 5; high--) {
      const needed = [high, high - 1, high - 2, high - 3, high - 4];
      // Special case: A-2-3-4-5 wheel (but 2 is wild, so it's A-wild-3-4-5)
      if (high === 5) {
        needed[0] = 14; // Ace plays low
        needed.sort((a, b) => a - b);
      }

      let missing = 0;
      for (const r of needed) {
        if (!ranksSet.has(r)) missing++;
      }

      if (missing <= wilds) {
        return { possible: true, high: high === 5 ? 5 : high };
      }
    }

    // Check wheel: A-2-3-4-5 (A high, others filled by cards or wilds)
    const wheelRanks = [14, 3, 4, 5]; // 2 is wild
    let wheelMissing = 0;
    for (const r of wheelRanks) {
      if (!ranksSet.has(r)) wheelMissing++;
    }
    // Need at least one wild for the 2 in A-2-3-4-5
    if (wheelMissing <= wilds - 1 && wilds >= 1) {
      return { possible: true, high: 5 };
    }

    return { possible: false, high: 0 };
  }

  const ranksSet = new Set(ranks);
  const straightResult = canMakeStraight(ranksSet, wildCount);
  const hasStraight = straightResult.possible;

  // Check for straight flush
  function canMakeStraightFlush(cards, wilds) {
    for (const suit of SUITS) {
      const suitCards = cards.filter(c => c.suit === suit && !c.isWild);
      const suitRanks = new Set(suitCards.map(c => RANK_VALUES[c.rank]));

      if (suitRanks.size + wilds >= 5) {
        const result = canMakeStraight(suitRanks, wilds);
        if (result.possible) {
          return { possible: true, high: result.high, suit };
        }
      }
    }
    return { possible: false, high: 0 };
  }

  const sfResult = canMakeStraightFlush(cards, wildCount);

  // Determine best hand
  // Five of a kind
  if (maxOfAKind + wildCount >= 5) {
    const bestRank = ranks[0] || 14; // Default to ace if all wilds
    return {
      rank: HAND_RANKS.FIVE_OF_A_KIND,
      highCards: [bestRank, bestRank, bestRank, bestRank, bestRank]
    };
  }

  // Royal flush
  if (sfResult.possible && sfResult.high === 14) {
    return {
      rank: HAND_RANKS.ROYAL_FLUSH,
      highCards: [14, 13, 12, 11, 10]
    };
  }

  // Straight flush
  if (sfResult.possible) {
    const h = sfResult.high;
    return {
      rank: HAND_RANKS.STRAIGHT_FLUSH,
      highCards: h === 5 ? [5, 4, 3, 2, 14] : [h, h - 1, h - 2, h - 3, h - 4]
    };
  }

  // Four of a kind
  if (maxOfAKind + wildCount >= 4) {
    const quadRank = ranks.find(r => rankCounts[r] + wildCount >= 4) || ranks[0] || 14;
    const kicker = ranks.find(r => r !== quadRank) || quadRank;
    return {
      rank: HAND_RANKS.FOUR_OF_A_KIND,
      highCards: [quadRank, quadRank, quadRank, quadRank, kicker]
    };
  }

  // Full house
  // Need 3+2, check if we can make it with wilds
  const sortedCounts = Object.entries(rankCounts)
    .sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]));

  if (sortedCounts.length >= 2) {
    const [first, second] = sortedCounts;
    const firstRank = Number(first[0]);
    const firstCount = first[1];
    const secondRank = Number(second[0]);
    const secondCount = second[1];

    // Try to make trips with first rank, pair with second
    const neededForTrips = Math.max(0, 3 - firstCount);
    const wildsAfterTrips = wildCount - neededForTrips;
    const neededForPair = Math.max(0, 2 - secondCount);

    if (neededForTrips <= wildCount && neededForPair <= wildsAfterTrips) {
      return {
        rank: HAND_RANKS.FULL_HOUSE,
        highCards: [firstRank, firstRank, firstRank, secondRank, secondRank]
      };
    }
  } else if (sortedCounts.length === 1 && wildCount >= 2) {
    // One natural rank, wilds can make full house
    const rankVal = Number(sortedCounts[0][0]);
    const count = sortedCounts[0][1];
    if (count + wildCount >= 5) {
      // Can make full house: trips of natural + pair of next best
      return {
        rank: HAND_RANKS.FULL_HOUSE,
        highCards: [rankVal, rankVal, rankVal, 14, 14]
      };
    }
  }

  // Flush
  if (hasFlush) {
    // Get the high cards in the flush suit
    const flushCards = naturalCards
      .filter(c => c.suit === flushSuit)
      .map(c => RANK_VALUES[c.rank])
      .sort((a, b) => b - a);
    // Fill remaining with aces (best wild substitution for flush)
    while (flushCards.length < 5) {
      flushCards.push(14);
    }
    return {
      rank: HAND_RANKS.FLUSH,
      highCards: flushCards.slice(0, 5)
    };
  }

  // Straight
  if (hasStraight) {
    const h = straightResult.high;
    return {
      rank: HAND_RANKS.STRAIGHT,
      highCards: h === 5 ? [5, 4, 3, 2, 14] : [h, h - 1, h - 2, h - 3, h - 4]
    };
  }

  // Three of a kind
  if (maxOfAKind + wildCount >= 3) {
    const tripRank = ranks.find(r => rankCounts[r] + wildCount >= 3) || 14;
    const kickers = ranks.filter(r => r !== tripRank).slice(0, 2);
    while (kickers.length < 2) kickers.push(14);
    return {
      rank: HAND_RANKS.THREE_OF_A_KIND,
      highCards: [tripRank, tripRank, tripRank, ...kickers]
    };
  }

  // Two pair
  if (pairCount >= 2 || (pairCount >= 1 && wildCount >= 1)) {
    const pairs = ranks.filter(r => rankCounts[r] >= 2).slice(0, 2);
    if (pairs.length < 2 && wildCount >= 1) {
      // Make second pair with a wild
      const unpaired = ranks.find(r => rankCounts[r] === 1);
      if (unpaired) pairs.push(unpaired);
      else pairs.push(14);
    }
    pairs.sort((a, b) => b - a);
    const kicker = ranks.find(r => !pairs.includes(r)) || 14;
    return {
      rank: HAND_RANKS.TWO_PAIR,
      highCards: [pairs[0], pairs[0], pairs[1], pairs[1], kicker]
    };
  }

  // One pair
  if (maxOfAKind >= 2 || wildCount >= 1) {
    const pairRank = ranks.find(r => rankCounts[r] >= 2) || ranks[0] || 14;
    const kickers = ranks.filter(r => r !== pairRank || rankCounts[r] > 2).slice(0, 3);
    while (kickers.length < 3) kickers.push(14);
    return {
      rank: HAND_RANKS.ONE_PAIR,
      highCards: [pairRank, pairRank, ...kickers.slice(0, 3)]
    };
  }

  // High card
  const highCards = [...ranks];
  while (highCards.length < 5) highCards.push(14);
  return {
    rank: HAND_RANKS.HIGH_CARD,
    highCards: highCards.slice(0, 5)
  };
}

function compareHighCards(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

// Compare two hands, returns positive if hand1 wins, negative if hand2 wins, 0 for tie
function compareHands(hand1, hand2) {
  const eval1 = evaluateHandWithWilds(hand1);
  const eval2 = evaluateHandWithWilds(hand2);

  if (eval1.rank !== eval2.rank) {
    return eval1.rank - eval2.rank;
  }

  return compareHighCards(eval1.highCards, eval2.highCards);
}

function getHandDescription(cards) {
  const result = evaluateHandWithWilds(cards);
  return {
    name: HAND_NAMES[result.rank],
    rank: result.rank,
    highCards: result.highCards
  };
}

module.exports = {
  evaluateHandWithWilds,
  compareHands,
  getHandDescription,
  HAND_RANKS,
  HAND_NAMES
};
