/**
 * ai.js - AI 决策引擎
 * 4个AI角色各有独特的风格和个性化对白
 */
(function () {
  'use strict';

  const { HandEvaluator } = window.TH;

  // AI 风格定义
  const AI_STYLES = {
    TAG: {
      name: 'TAG',
      label: '紧凶型',
      color: '#e74c3c',
      handThreshold: 0.45,     // 起手牌进入阈值 (top ~20%)
      aggressionFactor: 0.75,  // 激进度
      bluffFrequency: 0.08,    // 诈唬频率
      foldThreshold: 0.30,     // 低于此胜率倾向弃牌
      raiseThreshold: 0.55,    // 高于此胜率倾向加注
    },
    LAG: {
      name: 'LAG',
      label: '松凶型',
      color: '#f39c12',
      handThreshold: 0.30,
      aggressionFactor: 0.85,
      bluffFrequency: 0.25,
      foldThreshold: 0.20,
      raiseThreshold: 0.40,
    },
    TP: {
      name: 'TP',
      label: '紧被动型',
      color: '#3498db',
      handThreshold: 0.50,
      aggressionFactor: 0.25,
      bluffFrequency: 0.03,
      foldThreshold: 0.35,
      raiseThreshold: 0.70,
    },
    LP: {
      name: 'LP',
      label: '松被动型',
      color: '#2ecc71',
      handThreshold: 0.20,
      aggressionFactor: 0.15,
      bluffFrequency: 0.05,
      foldThreshold: 0.15,
      raiseThreshold: 0.75,
    }
  };

  // AI 个性化对白
  const DIALOGUES = {
    TAG: {
      fold: [
        "牌太烂了，我等下一把。",
        "不值得冒险，弃了。",
        "这副牌没戏，等等。",
        "我选择保守。",
        "不是每手牌都要打的。"
      ],
      call: [
        "这牌可以跟一下。",
        "看看下一张。",
        "勉强可以跟。",
        "赔率还可以，跟了。"
      ],
      raise: [
        "该出手了。",
        "给你们点压力！",
        "我很有信心。",
        "加注，跟不跟随你。",
        "这手牌实力不错。"
      ],
      allin: [
        "全押！我不信你能赢！",
        "梭哈！这把是我的！",
        "全部压上！"
      ],
      check: [
        "先看看。",
        "暂时不动。",
        "过牌，观察一下。"
      ],
      win: [
        "实力说话。",
        "意料之中。",
        "赢了，不意外。"
      ],
      lose: [
        "运气不好。",
        "下次再来。",
        "…没关系。"
      ]
    },
    LAG: {
      fold: [
        "这次算你们赢。",
        "下次再收拾你们！",
        "哼，暂时撤退。",
        "好吧，这一手放你们。"
      ],
      call: [
        "跟着玩玩~",
        "让我看看牌面。",
        "有意思，跟了！",
        "小跟一把。"
      ],
      raise: [
        "加注！跟不跟？",
        "来点刺激的！",
        "你觉得我在诈唬？😏",
        "加！就是要凶！",
        "别怂，跟上来！",
        "这可不是诈唬哦~"
      ],
      allin: [
        "全押！谁怕谁！",
        "来吧，一决胜负！",
        "梭了！刺激！",
        "全部压上，你敢跟吗？"
      ],
      check: [
        "我先过~",
        "蓄力中...",
        "看看再说。"
      ],
      win: [
        "哈哈，钱拿来！",
        "赢麻了！",
        "太轻松了~"
      ],
      lose: [
        "不可能！",
        "运气而已！",
        "下把翻倍赢回来！"
      ]
    },
    TP: {
      fold: [
        "不行，牌太差了。",
        "我弃了。",
        "这牌打不了。",
        "安全第一，弃牌。"
      ],
      call: [
        "跟一下吧。",
        "先跟着。",
        "小心翼翼地跟。",
        "嗯...跟吧。"
      ],
      raise: [
        "这手牌不错，加注。",
        "难得加一次注。",
        "我选择加注。"
      ],
      allin: [
        "必须全押了。",
        "孤注一掷！"
      ],
      check: [
        "过牌。",
        "我过。",
        "先不动。"
      ],
      win: [
        "嗯，赢了。",
        "稳扎稳打。",
        "耐心总有回报。"
      ],
      lose: [
        "唉...",
        "下次注意。",
        "..."
      ]
    },
    LP: {
      fold: [
        "好吧，这次我退了。",
        "太大了，跟不起。",
        "算了算了。"
      ],
      call: [
        "我觉得能中，跟了！",
        "跟！",
        "反正也不多，跟！",
        "我就看看~跟！",
        "这牌有戏，跟！",
        "跟跟跟！"
      ],
      raise: [
        "偶尔也要加注嘛~",
        "这次加一点！"
      ],
      allin: [
        "都到这了，全押吧！",
        "拼了！全押！"
      ],
      check: [
        "过牌~",
        "先过~",
        "过过过~"
      ],
      win: [
        "耶！赢了！",
        "我就说能中嘛！",
        "运气真好！"
      ],
      lose: [
        "唔...没关系~",
        "下次一定！",
        "还有机会！"
      ]
    }
  };

  // AI 角色定义
  const AI_CHARACTERS = [
    { name: 'Alice', style: 'TAG', avatar: '👩‍💼' },
    { name: 'Bob',   style: 'LAG', avatar: '😎' },
    { name: 'Charlie', style: 'TP', avatar: '🤓' },
    { name: 'Diana', style: 'LP', avatar: '🎀' }
  ];

  /**
   * 获取随机对白
   */
  function getDialogue(style, action) {
    const lines = DIALOGUES[style][action];
    if (!lines || lines.length === 0) return '';
    return lines[Math.floor(Math.random() * lines.length)];
  }

  /**
   * AI 决策主函数
   * @param {Object} player - 当前AI玩家
   * @param {Object} gameState - 游戏状态
   * @returns {{ action: string, amount: number, dialogue: string }}
   */
  function makeDecision(player, gameState) {
    const style = AI_STYLES[player.style];
    const holeCards = player.holeCards;
    const communityCards = gameState.communityCards;
    const currentBet = gameState.currentBet;
    const playerBet = gameState.roundBets[player.id] || 0;
    const toCall = currentBet - playerBet;
    const pot = gameState.pot;
    const chips = player.chips;
    const activePlayers = gameState.activePlayers;
    const numOpponents = activePlayers - 1;
    const isPreFlop = communityCards.length === 0;

    // 估算胜率
    let handStrength = HandEvaluator.estimateHandStrength(
      holeCards, communityCards, numOpponents
    );

    // 位置优势调整
    const positionBonus = getPositionBonus(player, gameState);
    handStrength += positionBonus;

    // 翻牌前起手牌筛选
    if (isPreFlop) {
      const startingStrength = HandEvaluator.getStartingHandStrength(holeCards[0], holeCards[1]);
      if (startingStrength < style.handThreshold) {
        // 诈唬机会
        if (Math.random() < style.bluffFrequency && positionBonus > 0.03) {
          const raiseAmount = calculateRaiseAmount(style, pot, currentBet, chips, 'bluff');
          return {
            action: 'raise',
            amount: raiseAmount,
            dialogue: getDialogue(player.style, 'raise')
          };
        }
        // 弃牌
        if (toCall > 0) {
          return { action: 'fold', amount: 0, dialogue: getDialogue(player.style, 'fold') };
        } else {
          return { action: 'check', amount: 0, dialogue: getDialogue(player.style, 'check') };
        }
      }
    }

    // 判断可用行动
    const canCheck = toCall === 0;
    const canCall = toCall > 0 && toCall <= chips;
    const canRaise = chips > toCall;

    // 全押逻辑：筹码很少或牌力极强
    if (handStrength > 0.85 || (chips <= toCall * 2 && handStrength > 0.5)) {
      if (chips <= toCall) {
        return { action: 'allin', amount: chips, dialogue: getDialogue(player.style, 'allin') };
      }
      // 极强牌力时考虑全押
      if (handStrength > 0.90 && Math.random() < style.aggressionFactor) {
        return { action: 'allin', amount: chips, dialogue: getDialogue(player.style, 'allin') };
      }
    }

    // 牌力太弱
    if (handStrength < style.foldThreshold) {
      // 诈唬机会
      if (Math.random() < style.bluffFrequency && canRaise && pot > 0) {
        const raiseAmount = calculateRaiseAmount(style, pot, currentBet, chips, 'bluff');
        return { action: 'raise', amount: raiseAmount, dialogue: getDialogue(player.style, 'raise') };
      }
      if (canCheck) {
        return { action: 'check', amount: 0, dialogue: getDialogue(player.style, 'check') };
      }
      // 底池赔率计算
      const potOdds = toCall / (pot + toCall);
      if (potOdds < 0.2 && handStrength > 0.15) {
        return { action: 'call', amount: toCall, dialogue: getDialogue(player.style, 'call') };
      }
      return { action: 'fold', amount: 0, dialogue: getDialogue(player.style, 'fold') };
    }

    // 中等牌力
    if (handStrength < style.raiseThreshold) {
      if (canCheck) {
        // 随机决定过牌还是下注
        if (Math.random() < style.aggressionFactor * 0.5) {
          const raiseAmount = calculateRaiseAmount(style, pot, currentBet, chips, 'value');
          if (canRaise) {
            return { action: 'raise', amount: raiseAmount, dialogue: getDialogue(player.style, 'raise') };
          }
        }
        return { action: 'check', amount: 0, dialogue: getDialogue(player.style, 'check') };
      }
      if (canCall) {
        // 面对加注，根据底池赔率决定
        const potOdds = toCall / (pot + toCall);
        if (handStrength > potOdds + 0.1) {
          return { action: 'call', amount: toCall, dialogue: getDialogue(player.style, 'call') };
        }
        // LP 倾向跟注
        if (player.style === 'LP' && Math.random() < 0.6) {
          return { action: 'call', amount: toCall, dialogue: getDialogue(player.style, 'call') };
        }
        return { action: 'fold', amount: 0, dialogue: getDialogue(player.style, 'fold') };
      }
      return { action: 'fold', amount: 0, dialogue: getDialogue(player.style, 'fold') };
    }

    // 强牌力 - 倾向加注
    if (canRaise) {
      if (Math.random() < style.aggressionFactor) {
        const raiseAmount = calculateRaiseAmount(style, pot, currentBet, chips, 'value');
        return { action: 'raise', amount: raiseAmount, dialogue: getDialogue(player.style, 'raise') };
      }
      if (canCall && toCall > 0) {
        return { action: 'call', amount: toCall, dialogue: getDialogue(player.style, 'call') };
      }
    }

    if (canCall && toCall > 0) {
      return { action: 'call', amount: toCall, dialogue: getDialogue(player.style, 'call') };
    }

    if (canCheck) {
      return { action: 'check', amount: 0, dialogue: getDialogue(player.style, 'check') };
    }

    // 最后兜底
    if (toCall > 0 && toCall >= chips) {
      if (handStrength > 0.4) {
        return { action: 'allin', amount: chips, dialogue: getDialogue(player.style, 'allin') };
      }
      return { action: 'fold', amount: 0, dialogue: getDialogue(player.style, 'fold') };
    }

    return { action: 'fold', amount: 0, dialogue: getDialogue(player.style, 'fold') };
  }

  /**
   * 计算加注金额
   */
  function calculateRaiseAmount(style, pot, currentBet, chips, reason) {
    let multiplier;
    if (reason === 'bluff') {
      multiplier = 0.5 + Math.random() * 0.5; // 0.5-1x pot
    } else {
      // Value bet
      if (style.name === 'TAG') {
        multiplier = 0.66 + Math.random() * 0.84; // 0.66-1.5x pot
      } else if (style.name === 'LAG') {
        multiplier = 0.5 + Math.random() * 1.5; // 0.5-2x pot
      } else if (style.name === 'TP') {
        multiplier = 0.33 + Math.random() * 0.34; // 0.33-0.67x pot
      } else {
        multiplier = 0.33 + Math.random() * 0.34; // 0.33-0.67x pot
      }
    }

    let raiseTotal = Math.max(
      currentBet * 2,  // 最少翻倍
      currentBet + Math.floor(pot * multiplier)
    );
    raiseTotal = Math.min(raiseTotal, chips); // 不超过筹码
    raiseTotal = Math.max(raiseTotal, currentBet + 20); // 最少大盲注加注
    return Math.min(raiseTotal, chips);
  }

  /**
   * 位置优势评估
   */
  function getPositionBonus(player, gameState) {
    const pos = player.position;
    // BTN 位置最优
    if (pos === 'BTN') return 0.06;
    if (pos === 'CO') return 0.04;
    if (pos === 'UTG') return -0.02;
    if (pos === 'SB') return -0.01;
    if (pos === 'BB') return 0.0;
    return 0;
  }

  window.TH = window.TH || {};
  window.TH.AI = {
    makeDecision,
    getDialogue,
    AI_STYLES,
    AI_CHARACTERS,
    DIALOGUES
  };
})();
