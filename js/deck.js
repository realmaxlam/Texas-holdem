/**
 * deck.js - 牌组管理模块
 * 包含 Card 类和 Deck 类
 */
(function () {
  'use strict';

  const SUITS = ['s', 'h', 'd', 'c'];
  const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const SUIT_COLORS = { s: 'black', h: 'red', d: 'red', c: 'black' };
  const SUIT_NAMES = { s: '黑桃', h: '红桃', d: '方块', c: '梅花' };

  const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };

  const RANK_DISPLAY = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
    8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
  };

  const RANK_CHARS = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
    8: '8', 9: '9', 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
  };

  class Card {
    constructor(rank, suit) {
      this.rank = rank;   // 2-14
      this.suit = suit;   // 's', 'h', 'd', 'c'
    }

    get rankDisplay() {
      return RANK_DISPLAY[this.rank];
    }

    get rankChar() {
      return RANK_CHARS[this.rank];
    }

    get suitSymbol() {
      return SUIT_SYMBOLS[this.suit];
    }

    get suitColor() {
      return SUIT_COLORS[this.suit];
    }

    get isRed() {
      return this.suit === 'h' || this.suit === 'd';
    }

    get shortName() {
      return this.rankChar + this.suit;
    }

    get displayName() {
      return this.rankDisplay + this.suitSymbol;
    }

    toString() {
      return `[${this.rankChar}${this.suit}]`;
    }
  }

  class Deck {
    constructor() {
      this.cards = [];
      this.reset();
    }

    reset() {
      this.cards = [];
      for (const suit of SUITS) {
        for (const [rankChar, rankValue] of Object.entries(RANK_VALUES)) {
          this.cards.push(new Card(rankValue, suit));
        }
      }
      this.shuffle();
    }

    shuffle() {
      for (let i = this.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
      }
    }

    deal() {
      return this.cards.pop();
    }

    dealMultiple(n) {
      const result = [];
      for (let i = 0; i < n; i++) {
        result.push(this.deal());
      }
      return result;
    }
  }

  window.TH = window.TH || {};
  window.TH.Card = Card;
  window.TH.Deck = Deck;
  window.TH.SUITS = SUITS;
  window.TH.SUIT_SYMBOLS = SUIT_SYMBOLS;
  window.TH.SUIT_COLORS = SUIT_COLORS;
  window.TH.RANK_VALUES = RANK_VALUES;
  window.TH.RANK_DISPLAY = RANK_DISPLAY;
  window.TH.RANK_CHARS = RANK_CHARS;
})();
