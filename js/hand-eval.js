/**
 * hand-eval.js - 牌型评估器
 * 从7张牌中选出最强的5张组合，支持所有10种牌型
 */
(function () {
  'use strict';

  const HandType = {
    HIGH_CARD: 0,
    ONE_PAIR: 1,
    TWO_PAIR: 2,
    THREE_OF_A_KIND: 3,
    STRAIGHT: 4,
    FLUSH: 5,
    FULL_HOUSE: 6,
    FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8,
    ROYAL_FLUSH: 9
  };

  const HAND_NAMES = {
    0: '高牌',
    1: '一对',
    2: '两对',
    3: '三条',
    4: '顺子',
    5: '同花',
    6: '葫芦',
    7: '四条',
    8: '同花顺',
    9: '皇家同花顺'
  };

  /**
   * 生成组合 C(n, k)
   */
  function getCombinations(arr, k) {
    const result = [];
    function combine(start, combo) {
      if (combo.length === k) {
        result.push([...combo]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        combo.push(arr[i]);
        combine(i + 1, combo);
        combo.pop();
      }
    }
    combine(0, []);
    return result;
  }

  /**
   * 评估5张牌的牌型
   */
  function evaluate5(cards) {
    const sorted = [...cards].sort((a, b) => b.rank - a.rank);
    const ranks = sorted.map(c => c.rank);
    const suits = sorted.map(c => c.suit);

    // 检查同花
    const isFlush = suits.every(s => s === suits[0]);

    // 检查顺子
    let isStraight = false;
    let straightHigh = 0;

    // 普通顺子
    if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) {
      isStraight = true;
      straightHigh = ranks[0];
    }
    // 最小顺子 A-2-3-4-5 (轮子)
    if (!isStraight && ranks[0] === 14 && ranks[1] === 5 &&
        ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
      isStraight = true;
      straightHigh = 5;
    }

    // 统计点数频率
    const freq = {};
    for (const r of ranks) {
      freq[r] = (freq[r] || 0) + 1;
    }
    const freqEntries = Object.entries(freq)
      .map(([r, c]) => [parseInt(r), c])
      .sort((a, b) => b[1] - a[1] || b[0] - a[0]);

    // 判定牌型
    if (isFlush && isStraight) {
      if (straightHigh === 14) {
        return {
          type: HandType.ROYAL_FLUSH,
          score: [9, 14],
          cards: sorted,
          name: HAND_NAMES[9]
        };
      }
      return {
        type: HandType.STRAIGHT_FLUSH,
        score: [8, straightHigh],
        cards: sorted,
        name: HAND_NAMES[8]
      };
    }

    if (freqEntries[0][1] === 4) {
      const quadRank = freqEntries[0][0];
      const kicker = freqEntries[1][0];
      return {
        type: HandType.FOUR_OF_A_KIND,
        score: [7, quadRank, kicker],
        cards: sorted,
        name: HAND_NAMES[7]
      };
    }

    if (freqEntries[0][1] === 3 && freqEntries[1] && freqEntries[1][1] === 2) {
      return {
        type: HandType.FULL_HOUSE,
        score: [6, freqEntries[0][0], freqEntries[1][0]],
        cards: sorted,
        name: HAND_NAMES[6]
      };
    }

    if (isFlush) {
      return {
        type: HandType.FLUSH,
        score: [5, ...ranks],
        cards: sorted,
        name: HAND_NAMES[5]
      };
    }

    if (isStraight) {
      return {
        type: HandType.STRAIGHT,
        score: [4, straightHigh],
        cards: sorted,
        name: HAND_NAMES[4]
      };
    }

    if (freqEntries[0][1] === 3) {
      const tripRank = freqEntries[0][0];
      const kickers = freqEntries.slice(1).map(e => e[0]).sort((a, b) => b - a);
      return {
        type: HandType.THREE_OF_A_KIND,
        score: [3, tripRank, ...kickers],
        cards: sorted,
        name: HAND_NAMES[3]
      };
    }

    if (freqEntries[0][1] === 2 && freqEntries[1] && freqEntries[1][1] === 2) {
      const highPair = Math.max(freqEntries[0][0], freqEntries[1][0]);
      const lowPair = Math.min(freqEntries[0][0], freqEntries[1][0]);
      const kicker = freqEntries[2][0];
      return {
        type: HandType.TWO_PAIR,
        score: [2, highPair, lowPair, kicker],
        cards: sorted,
        name: HAND_NAMES[2]
      };
    }

    if (freqEntries[0][1] === 2) {
      const pairRank = freqEntries[0][0];
      const kickers = freqEntries.slice(1).map(e => e[0]).sort((a, b) => b - a);
      return {
        type: HandType.ONE_PAIR,
        score: [1, pairRank, ...kickers],
        cards: sorted,
        name: HAND_NAMES[1]
      };
    }

    return {
      type: HandType.HIGH_CARD,
      score: [0, ...ranks],
      cards: sorted,
      name: HAND_NAMES[0]
    };
  }

  /**
   * 比较两个score数组
   * 返回: >0 则 s1 赢, <0 则 s2 赢, 0 则平局
   */
  function compareScores(s1, s2) {
    for (let i = 0; i < Math.max(s1.length, s2.length); i++) {
      const a = s1[i] || 0;
      const b = s2[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  }

  /**
   * 从7张牌中选出最强的5张组合
   */
  function evaluateBest(cards) {
    if (!cards || cards.length < 5) return null;
    if (cards.length === 5) return evaluate5(cards);

    const combos = getCombinations(cards, 5);
    let best = null;
    for (const combo of combos) {
      const result = evaluate5(combo);
      if (!best || compareScores(result.score, best.score) > 0) {
        best = result;
      }
    }
    return best;
  }

  /**
   * 评估手牌强度 (0-1 之间的值)
   * 用于 AI 决策参考
   */
  function estimateHandStrength(holeCards, communityCards, numOpponents) {
    if (communityCards.length === 0) {
      // 翻牌前：基于起手牌评分
      return getStartingHandStrength(holeCards[0], holeCards[1]);
    }

    // 翻牌后：基于当前最佳牌型评分
    const allCards = [...holeCards, ...communityCards];
    const best = evaluateBest(allCards);
    if (!best) return 0;

    // 基础强度
    let strength = 0;
    switch (best.type) {
      case HandType.ROYAL_FLUSH:    strength = 1.0; break;
      case HandType.STRAIGHT_FLUSH: strength = 0.98; break;
      case HandType.FOUR_OF_A_KIND: strength = 0.95; break;
      case HandType.FULL_HOUSE:     strength = 0.90; break;
      case HandType.FLUSH:          strength = 0.82; break;
      case HandType.STRAIGHT:       strength = 0.75; break;
      case HandType.THREE_OF_A_KIND: strength = 0.65; break;
      case HandType.TWO_PAIR:       strength = 0.52; break;
      case HandType.ONE_PAIR:       strength = 0.35; break;
      case HandType.HIGH_CARD:      strength = 0.15; break;
    }

    // 根据关键牌点数微调
    if (best.score.length > 1) {
      strength += (best.score[1] - 2) / 12 * 0.08;
    }

    // 检查手牌是否参与了牌型（增加置信度）
    const holeRanks = holeCards.map(c => c.rank);
    const communityRanks = communityCards.map(c => c.rank);

    // 如果一对来自手牌（口袋对），比公共牌对更强
    if (best.type === HandType.ONE_PAIR) {
      if (holeRanks[0] === holeRanks[1] && holeRanks[0] === best.score[1]) {
        strength += 0.08; // 口袋对加分
      }
      // 如果对子大于公共牌最大值，加分
      if (best.score[1] > Math.max(...communityRanks)) {
        strength += 0.05;
      }
    }

    // 检查听牌 (draws)
    if (communityCards.length < 5) {
      const flushDraw = checkFlushDraw(holeCards, communityCards);
      const straightDraw = checkStraightDraw(holeCards, communityCards);
      if (flushDraw) strength += 0.10;
      if (straightDraw) strength += 0.08;
    }

    return Math.min(1.0, Math.max(0, strength));
  }

  /**
   * 起手牌强度评估 (0-1)
   */
  function getStartingHandStrength(card1, card2) {
    const r1 = Math.max(card1.rank, card2.rank);
    const r2 = Math.min(card1.rank, card2.rank);
    const suited = card1.suit === card2.suit;
    const pair = r1 === r2;
    const gap = r1 - r2;

    let score = 0;

    if (pair) {
      // 对子基础分
      score = 0.5 + (r1 - 2) / 24;
      // 高对加分
      if (r1 >= 10) score += 0.15;
      if (r1 >= 12) score += 0.1;
      if (r1 >= 14) score += 0.05;
    } else {
      // 非对子
      score = (r1 + r2 - 4) / 48;

      // A 加分
      if (r1 === 14) score += 0.15;
      // K 加分
      else if (r1 === 13) score += 0.08;

      // 同花加分
      if (suited) score += 0.08;

      // 相连性
      if (gap === 1) score += 0.06;
      else if (gap === 2) score += 0.03;
      else if (gap >= 4) score -= gap * 0.02;

      // 百老汇牌 (T+)
      if (r1 >= 10 && r2 >= 10) score += 0.08;
    }

    return Math.min(1.0, Math.max(0, score));
  }

  /**
   * 检查同花听牌
   */
  function checkFlushDraw(holeCards, communityCards) {
    const allCards = [...holeCards, ...communityCards];
    const suitCounts = {};
    for (const c of allCards) {
      suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
    }
    // 检查手牌是否参与了4张同花
    for (const suit of Object.keys(suitCounts)) {
      if (suitCounts[suit] === 4) {
        if (holeCards.some(c => c.suit === suit)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 检查顺子听牌
   */
  function checkStraightDraw(holeCards, communityCards) {
    const allCards = [...holeCards, ...communityCards];
    const ranks = [...new Set(allCards.map(c => c.rank))].sort((a, b) => a - b);
    if (ranks.includes(14)) ranks.unshift(1); // A 也可以做1

    // 检查是否有4张连续的牌
    for (let i = 0; i <= ranks.length - 4; i++) {
      let consecutive = 1;
      for (let j = i + 1; j < ranks.length && consecutive < 4; j++) {
        if (ranks[j] === ranks[j - 1] + 1) {
          consecutive++;
        } else if (ranks[j] !== ranks[j - 1]) {
          break;
        }
      }
      if (consecutive >= 4) {
        // 确保手牌参与了听牌
        const holeRanks = holeCards.map(c => c.rank);
        const segment = ranks.slice(i, i + 4);
        if (segment.some(r => holeRanks.includes(r) || (r === 1 && holeRanks.includes(14)))) {
          return true;
        }
      }
    }
    return false;
  }

  window.TH = window.TH || {};
  window.TH.HandEvaluator = {
    evaluate5,
    evaluateBest,
    compareScores,
    estimateHandStrength,
    getStartingHandStrength,
    HandType,
    HAND_NAMES,
    getCombinations
  };
})();
