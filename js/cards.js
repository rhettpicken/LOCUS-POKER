// Card rendering utilities

const SUIT_SYMBOLS = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
  red: '\u2605',
  black: '\u2605'
};

function createCardElement(card, faceDown = false) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.cardId = card.id;

  if (faceDown) {
    el.classList.add('face-down');
    return el;
  }

  // Add suit class for coloring
  el.classList.add(card.suit);

  // Wild card styling
  if (card.isWild) {
    el.classList.add('wild');
    if (card.rank === 'JOKER') {
      el.classList.add('joker');
    }
  }

  const displayRank = card.rank === 'JOKER' ? 'JOKER' : card.rank;
  const displaySuit = SUIT_SYMBOLS[card.suit] || '';

  el.innerHTML = `
    <div class="corner top-left">
      <div class="rank">${displayRank}</div>
      <div class="suit">${displaySuit}</div>
    </div>
    <div class="rank">${displayRank}</div>
    <div class="suit">${displaySuit}</div>
    <div class="corner bottom-right">
      <div class="rank">${displayRank}</div>
      <div class="suit">${displaySuit}</div>
    </div>
  `;

  return el;
}

function createFaceDownCards(count) {
  const cards = [];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'card face-down';
    cards.push(el);
  }
  return cards;
}

function renderHand(container, cards, selectable = false, onSelect = null) {
  container.innerHTML = '';

  cards.forEach((card, index) => {
    const el = createCardElement(card);
    el.classList.add('dealing');
    el.style.animationDelay = `${index * 0.1}s`;

    if (selectable) {
      el.addEventListener('click', () => {
        el.classList.toggle('selected');
        if (onSelect) {
          onSelect(index, el.classList.contains('selected'));
        }
      });
    }

    container.appendChild(el);
  });
}

function renderOpponentHand(container, count) {
  container.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'card face-down dealing';
    el.style.animationDelay = `${i * 0.1}s`;
    container.appendChild(el);
  }
}

function revealCards(container, cards) {
  const cardElements = container.querySelectorAll('.card');
  cardElements.forEach((el, index) => {
    if (cards[index]) {
      setTimeout(() => {
        const newCard = createCardElement(cards[index]);
        el.replaceWith(newCard);
      }, index * 200);
    }
  });
}
