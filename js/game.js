/**
 * game.js - 游戏引擎
 * 管理完整的德州扑克游戏流程
 */
(function () {
  'use strict';

  const { Deck, Card } = window.TH;
  const { HandEvaluator } = window.TH;
  const { AI } = window.TH;

  // 游戏阶段
  const Phase = {
    WAITING: 'WAITING',
    PRE_FLOP: 'PRE_FLOP',
    FLOP: 'FLOP',
    TURN: 'TURN',
    RIVER: 'RIVER',
    SHOWDOWN: 'SHOWDOWN',
    HAND_OVER: 'HAND_OVER'
  };

  // 位置名称 (5人桌)
  const POSITIONS_5 = ['BTN', 'SB', 'BB', 'UTG', 'CO'];

  class Player {
    constructor(id, name, isHuman, style, avatar) {
      this.id = id;
      this.name = name;
      this.isHuman = isHuman;
      this.style = style || null;
      this.avatar = avatar || '🎮';
      this.chips = 2000;
      this.holeCards = [];
      this.folded = false;
      this.allIn = false;
      this.position = '';
      this.currentBet = 0;   // 本轮已下注
      this.totalBetThisHand = 0;
      this.rebuyCount = 0;   // 补充筹码次数
      this.isActive = true;
    }

    reset() {
      this.holeCards = [];
      this.folded = false;
      this.allIn = false;
      this.currentBet = 0;
      this.totalBetThisHand = 0;
    }

    bet(amount) {
      const actual = Math.min(amount, this.chips);
      this.chips -= actual;
      this.currentBet += actual;
      this.totalBetThisHand += actual;
      if (this.chips === 0) {
        this.allIn = true;
      }
      return actual;
    }
  }

  class Game {
    constructor() {
      this.players = [];
      this.deck = new Deck();
      this.communityCards = [];
      this.pot = 0;
      this.sidePots = [];
      this.phase = Phase.WAITING;
      this.dealerIndex = 0;
      this.currentPlayerIndex = -1;
      this.currentBet = 0;         // 当前轮最高下注
      this.roundBets = {};         // 每个玩家本轮已下注
      this.minRaise = 20;          // 最小加注额
      this.smallBlind = 10;
      this.bigBlind = 20;
      this.lastAggressor = -1;     // 最后加注者
      this.actedPlayers = new Set(); // 本轮已行动玩家
      this.handNumber = 0;
      this.actionLog = [];         // 行动日志

      // 回调
      this.onStateChange = null;
      this.onPlayerAction = null;
      this.onPhaseChange = null;
      this.onHandEnd = null;
      this.onShowdown = null;
    }

    /**
     * 初始化玩家
     */
    setupPlayers(playerName) {
      this.players = [];
      // 用户玩家
      this.players.push(new Player(0, playerName, true, null, '🎮'));

      // AI 玩家
      for (let i = 0; i < AI.AI_CHARACTERS.length; i++) {
        const char = AI.AI_CHARACTERS[i];
        this.players.push(new Player(
          i + 1, char.name, false, char.style, char.avatar
        ));
      }
    }

    /**
     * 开始新一手牌
     */
    startNewHand() {
      this.handNumber++;
      this.deck.reset();
      this.communityCards = [];
      this.pot = 0;
      this.sidePots = [];
      this.currentBet = 0;
      this.roundBets = {};
      this.minRaise = this.bigBlind;
      this.lastAggressor = -1;
      this.actedPlayers = new Set();
      this.actionLog = [];

      // 检查筹码并补充
      for (const p of this.players) {
        if (p.chips <= 0) {
          p.chips = 2000;
          p.rebuyCount++;
          this.addLog(`${p.name} 筹码耗尽，已自动补充至 2000 筹码（第 ${p.rebuyCount} 次补充）`);
        }
        p.reset();
      }

      // 设置位置
      this.assignPositions();

      // 盲注
      this.postBlinds();

      // 发手牌
      this.dealHoleCards();

      // 设定翻牌前阶段
      this.phase = Phase.PRE_FLOP;

      // 设置第一个行动玩家（UTG）
      this.setFirstActor();

      this.addLog(`=== 第 ${this.handNumber} 手牌开始 ===`);
      this.addLog(`庄家: ${this.players[this.dealerIndex].name}`);
    }

    /**
     * 分配位置
     */
    assignPositions() {
      const n = this.players.length;
      for (let i = 0; i < n; i++) {
        const posIndex = (i - this.dealerIndex + n) % n;
        this.players[i].position = POSITIONS_5[posIndex];
      }
    }

    /**
     * 发盲注
     */
    postBlinds() {
      const n = this.players.length;
      const sbIndex = (this.dealerIndex + 1) % n;
      const bbIndex = (this.dealerIndex + 2) % n;

      const sbPlayer = this.players[sbIndex];
      const bbPlayer = this.players[bbIndex];

      // 小盲注
      const sbAmount = sbPlayer.bet(this.smallBlind);
      this.roundBets[sbPlayer.id] = sbAmount;
      this.pot += sbAmount;

      // 大盲注
      const bbAmount = bbPlayer.bet(this.bigBlind);
      this.roundBets[bbPlayer.id] = bbAmount;
      this.pot += bbAmount;

      this.currentBet = this.bigBlind;

      this.addLog(`${sbPlayer.name} 下小盲注 ${sbAmount}`);
      this.addLog(`${bbPlayer.name} 下大盲注 ${bbAmount}`);
    }

    /**
     * 发手牌
     */
    dealHoleCards() {
      for (let round = 0; round < 2; round++) {
        for (const player of this.players) {
          player.holeCards.push(this.deck.deal());
        }
      }
    }

    /**
     * 设置第一个行动玩家
     */
    setFirstActor() {
      const n = this.players.length;
      if (this.phase === Phase.PRE_FLOP) {
        // UTG: 大盲注之后
        this.currentPlayerIndex = (this.dealerIndex + 3) % n;
      } else {
        // 翻牌后: 小盲注开始（或之后最近的活跃玩家）
        this.currentPlayerIndex = (this.dealerIndex + 1) % n;
      }
      // 跳过已弃牌或全押的玩家
      this.skipInactivePlayers();
    }

    /**
     * 跳过不能行动的玩家
     */
    skipInactivePlayers() {
      const n = this.players.length;
      let attempts = 0;
      while (attempts < n) {
        const p = this.players[this.currentPlayerIndex];
        if (!p.folded && !p.allIn) return;
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % n;
        attempts++;
      }
    }

    /**
     * 获取当前玩家
     */
    getCurrentPlayer() {
      return this.players[this.currentPlayerIndex];
    }

    /**
     * 获取可用行动
     */
    getAvailableActions() {
      const player = this.getCurrentPlayer();
      if (!player || player.folded || player.allIn) return [];

      const playerBet = this.roundBets[player.id] || 0;
      const toCall = this.currentBet - playerBet;
      const actions = [];

      // 弃牌（如果需要跟注时）
      if (toCall > 0) {
        actions.push({ type: 'fold', label: '弃牌', amount: 0 });
      }

      // 过牌
      if (toCall === 0) {
        actions.push({ type: 'check', label: '过牌', amount: 0 });
      }

      // 跟注
      if (toCall > 0 && toCall < player.chips) {
        actions.push({ type: 'call', label: `跟注 ${toCall}`, amount: toCall });
      }

      // 加注
      const minRaiseTotal = this.currentBet + this.minRaise;
      if (player.chips > toCall && player.chips + playerBet > minRaiseTotal) {
        actions.push({
          type: 'raise',
          label: '加注',
          minAmount: minRaiseTotal,
          maxAmount: player.chips + playerBet,
          currentChips: player.chips
        });
      }

      // 全押
      if (player.chips > 0) {
        actions.push({ type: 'allin', label: `全押 ${player.chips}`, amount: player.chips });
      }

      return actions;
    }

    /**
     * 处理玩家行动
     */
    processAction(action, amount) {
      const player = this.getCurrentPlayer();
      if (!player) return false;

      const playerBet = this.roundBets[player.id] || 0;

      switch (action) {
        case 'fold':
          player.folded = true;
          this.addLog(`${player.name} 弃牌`);
          break;

        case 'check':
          this.addLog(`${player.name} 过牌`);
          break;

        case 'call': {
          const toCall = Math.min(this.currentBet - playerBet, player.chips);
          const betted = player.bet(toCall);
          this.roundBets[player.id] = (this.roundBets[player.id] || 0) + betted;
          this.pot += betted;
          this.addLog(`${player.name} 跟注 ${betted}`);
          break;
        }

        case 'raise': {
          const raiseTotal = amount; // 总下注额
          const needToBet = raiseTotal - playerBet;
          const betted = player.bet(needToBet);
          this.roundBets[player.id] = (this.roundBets[player.id] || 0) + betted;
          this.pot += betted;
          this.currentBet = this.roundBets[player.id];
          this.minRaise = Math.max(this.minRaise, raiseTotal - this.currentBet + this.minRaise);
          this.lastAggressor = this.currentPlayerIndex;
          this.actedPlayers = new Set(); // 重置已行动列表
          this.actedPlayers.add(player.id);
          this.addLog(`${player.name} 加注到 ${this.roundBets[player.id]}`);
          break;
        }

        case 'allin': {
          const allInAmount = player.chips;
          const betted = player.bet(allInAmount);
          this.roundBets[player.id] = (this.roundBets[player.id] || 0) + betted;
          this.pot += betted;
          if (this.roundBets[player.id] > this.currentBet) {
            this.currentBet = this.roundBets[player.id];
            this.lastAggressor = this.currentPlayerIndex;
            this.actedPlayers = new Set();
          }
          this.actedPlayers.add(player.id);
          this.addLog(`${player.name} 全押 ${betted}！`);
          break;
        }
      }

      if (action !== 'raise') {
        this.actedPlayers.add(player.id);
      }

      // 触发回调
      if (this.onPlayerAction) {
        this.onPlayerAction(player, action, amount);
      }

      return true;
    }

    /**
     * 推进到下一步（下一个玩家或下一个阶段）
     */
    advance() {
      // 检查是否只剩一个玩家
      const activePlayers = this.players.filter(p => !p.folded);
      if (activePlayers.length === 1) {
        this.handleSingleWinner(activePlayers[0]);
        return 'HAND_OVER';
      }

      // 检查本轮下注是否完成
      if (this.isBettingRoundComplete()) {
        return this.advancePhase();
      }

      // 移到下一个可行动玩家
      this.moveToNextPlayer();
      return 'CONTINUE';
    }

    /**
     * 检查下注轮是否完成
     */
    isBettingRoundComplete() {
      const activePlayers = this.players.filter(p => !p.folded && !p.allIn);

      if (activePlayers.length === 0) return true;
      if (activePlayers.length === 1) {
        // 只剩一个活跃玩家（非全押或弃牌），但还有全押玩家
        const lastActive = activePlayers[0];
        const playerBet = this.roundBets[lastActive.id] || 0;
        if (playerBet >= this.currentBet && this.actedPlayers.has(lastActive.id)) {
          return true;
        }
      }

      // 所有能行动的玩家都已行动且下注相同
      for (const p of activePlayers) {
        if (!this.actedPlayers.has(p.id)) return false;
        const pBet = this.roundBets[p.id] || 0;
        if (pBet < this.currentBet) return false;
      }

      return true;
    }

    /**
     * 移到下一个玩家
     */
    moveToNextPlayer() {
      const n = this.players.length;
      let nextIndex = (this.currentPlayerIndex + 1) % n;
      let attempts = 0;

      while (attempts < n) {
        const p = this.players[nextIndex];
        if (!p.folded && !p.allIn) {
          this.currentPlayerIndex = nextIndex;
          return;
        }
        nextIndex = (nextIndex + 1) % n;
        attempts++;
      }

      // 所有人都全押或弃牌了
      this.currentPlayerIndex = -1;
    }

    /**
     * 推进到下一阶段
     */
    advancePhase() {
      // 重置轮次下注跟踪
      this.roundBets = {};
      this.currentBet = 0;
      this.actedPlayers = new Set();
      this.lastAggressor = -1;
      this.minRaise = this.bigBlind;

      // 重置玩家本轮下注
      for (const p of this.players) {
        p.currentBet = 0;
      }

      const activePlayers = this.players.filter(p => !p.folded);
      const canAct = activePlayers.filter(p => !p.allIn);

      switch (this.phase) {
        case Phase.PRE_FLOP:
          this.phase = Phase.FLOP;
          this.communityCards.push(...this.deck.dealMultiple(3));
          this.addLog(`--- 翻牌 ---`);
          this.addLog(`公共牌: ${this.communityCards.map(c => c.displayName).join(' ')}`);
          break;

        case Phase.FLOP:
          this.phase = Phase.TURN;
          this.communityCards.push(this.deck.deal());
          this.addLog(`--- 转牌 ---`);
          this.addLog(`公共牌: ${this.communityCards.map(c => c.displayName).join(' ')}`);
          break;

        case Phase.TURN:
          this.phase = Phase.RIVER;
          this.communityCards.push(this.deck.deal());
          this.addLog(`--- 河牌 ---`);
          this.addLog(`公共牌: ${this.communityCards.map(c => c.displayName).join(' ')}`);
          break;

        case Phase.RIVER:
          this.phase = Phase.SHOWDOWN;
          return this.handleShowdown();
      }

      // 如果只有0或1个玩家可以行动，直接跳到下一阶段
      if (canAct.length <= 1) {
        // 所有人都全押或弃牌，直接发完公共牌
        if (this.phase !== Phase.SHOWDOWN) {
          return this.advancePhase();
        }
      }

      // 设定行动起始玩家（翻牌后：SB或之后第一个活跃玩家）
      this.setFirstActor();

      if (this.onPhaseChange) {
        this.onPhaseChange(this.phase);
      }

      return 'PHASE_CHANGE';
    }

    /**
     * 处理只剩一个玩家（其他人都弃牌）
     */
    handleSingleWinner(winner) {
      this.phase = Phase.HAND_OVER;
      winner.chips += this.pot;
      this.addLog(`${winner.name} 赢得底池 ${this.pot}！（所有对手弃牌）`);

      // 轮换庄家
      this.dealerIndex = (this.dealerIndex + 1) % this.players.length;

      if (this.onHandEnd) {
        this.onHandEnd([{
          player: winner,
          amount: this.pot,
          hand: null,
          reason: '其他玩家弃牌'
        }]);
      }
    }

    /**
     * 摊牌判定
     */
    handleShowdown() {
      this.phase = Phase.SHOWDOWN;
      this.addLog(`=== 摊牌 ===`);

      const activePlayers = this.players.filter(p => !p.folded);
      const results = [];

      // 评估每个玩家的最佳牌型
      for (const p of activePlayers) {
        const allCards = [...p.holeCards, ...this.communityCards];
        const best = HandEvaluator.evaluateBest(allCards);
        results.push({
          player: p,
          hand: best,
          score: best ? best.score : [0]
        });
        if (best) {
          this.addLog(`${p.name}: ${p.holeCards.map(c => c.displayName).join(' ')} → ${best.name}`);
        }
      }

      // 排序找出赢家
      results.sort((a, b) => {
        return HandEvaluator.compareScores(b.score, a.score);
      });

      // 分配底池（简化版：不处理复杂边池）
      const winners = this.calculateWinners(results);

      // 保存摊牌结果供 UI 展示
      this.showdownResults = results;
      this.showdownWinners = winners;

      // 轮换庄家
      this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
      this.phase = Phase.HAND_OVER;

      if (this.onShowdown) {
        this.onShowdown(results, winners);
      }
      if (this.onHandEnd) {
        this.onHandEnd(winners, results);
      }

      return 'SHOWDOWN';
    }

    /**
     * 计算赢家和底池分配
     */
    calculateWinners(sortedResults) {
      const winners = [];
      const activePlayers = this.players.filter(p => !p.folded);

      // 检查是否有全押玩家需要边池
      const allInPlayers = activePlayers.filter(p => p.allIn);

      if (allInPlayers.length === 0) {
        // 简单情况：无全押，找最大手牌赢家
        const topScore = sortedResults[0].score;
        const topWinners = sortedResults.filter(r =>
          HandEvaluator.compareScores(r.score, topScore) === 0
        );

        const shareAmount = Math.floor(this.pot / topWinners.length);
        for (const w of topWinners) {
          w.player.chips += shareAmount;
          winners.push({
            player: w.player,
            amount: shareAmount,
            hand: w.hand,
            reason: w.hand ? w.hand.name : '最后存活'
          });
          this.addLog(`${w.player.name} 赢得 ${shareAmount}！(${w.hand ? w.hand.name : '-'})`);
        }
        // 余数给第一个赢家
        const remainder = this.pot - shareAmount * topWinners.length;
        if (remainder > 0) {
          topWinners[0].player.chips += remainder;
        }
      } else {
        // 有全押玩家 - 需要计算边池
        this.calculateSidePots(sortedResults, winners);
      }

      return winners;
    }

    /**
     * 计算边池
     */
    calculateSidePots(sortedResults, winners) {
      const activePlayers = this.players.filter(p => !p.folded);
      // 按照总下注从小到大排序
      const byBet = [...activePlayers].sort((a, b) => a.totalBetThisHand - b.totalBetThisHand);

      let processedAmount = 0;
      let remainingPlayers = [...activePlayers];

      for (let i = 0; i < byBet.length; i++) {
        const currentBetLevel = byBet[i].totalBetThisHand;
        if (currentBetLevel <= processedAmount) continue;

        const contribution = currentBetLevel - processedAmount;
        let potAmount = 0;

        // 每个参与这个级别的玩家贡献
        for (const p of this.players) {
          if (p.folded) {
            // 弃牌玩家也可能已经下注了
            const contributed = Math.min(p.totalBetThisHand - processedAmount, contribution);
            if (contributed > 0) potAmount += contributed;
          } else {
            const contributed = Math.min(p.totalBetThisHand - processedAmount, contribution);
            if (contributed > 0) potAmount += contributed;
          }
        }

        // 这个边池的争夺者
        const eligible = sortedResults.filter(r =>
          r.player.totalBetThisHand >= currentBetLevel && !r.player.folded
        );

        if (eligible.length > 0) {
          const topScore = eligible[0].score;
          const potWinners = eligible.filter(r =>
            HandEvaluator.compareScores(r.score, topScore) === 0
          );

          const share = Math.floor(potAmount / potWinners.length);
          for (const w of potWinners) {
            w.player.chips += share;
            const existing = winners.find(x => x.player.id === w.player.id);
            if (existing) {
              existing.amount += share;
            } else {
              winners.push({
                player: w.player,
                amount: share,
                hand: w.hand,
                reason: w.hand ? w.hand.name : '最后存活'
              });
            }
          }
          // 余数
          const remainder = potAmount - share * potWinners.length;
          if (remainder > 0) potWinners[0].player.chips += remainder;

          this.addLog(`边池 ${potAmount}: ${potWinners.map(w => w.player.name).join(', ')} 赢得`);
        }

        processedAmount = currentBetLevel;
      }
    }

    /**
     * 获取活跃玩家数量（未弃牌）
     */
    get activePlayers() {
      return this.players.filter(p => !p.folded).length;
    }

    /**
     * 获取当前游戏状态（供 AI 使用）
     */
    getGameState() {
      return {
        phase: this.phase,
        communityCards: [...this.communityCards],
        pot: this.pot,
        currentBet: this.currentBet,
        roundBets: { ...this.roundBets },
        activePlayers: this.activePlayers,
        players: this.players.map(p => ({
          id: p.id,
          name: p.name,
          chips: p.chips,
          folded: p.folded,
          allIn: p.allIn,
          position: p.position,
          currentBet: this.roundBets[p.id] || 0
        })),
        dealerIndex: this.dealerIndex,
        smallBlind: this.smallBlind,
        bigBlind: this.bigBlind
      };
    }

    /**
     * 添加日志
     */
    addLog(message) {
      this.actionLog.push({
        time: Date.now(),
        message
      });
    }

    /**
     * 获取阶段中文名
     */
    getPhaseName() {
      const names = {
        WAITING: '等待中',
        PRE_FLOP: '翻牌前',
        FLOP: '翻牌',
        TURN: '转牌',
        RIVER: '河牌',
        SHOWDOWN: '摊牌',
        HAND_OVER: '本局结束'
      };
      return names[this.phase] || this.phase;
    }
  }

  window.TH = window.TH || {};
  window.TH.Game = Game;
  window.TH.Player = Player;
  window.TH.Phase = Phase;
  window.TH.POSITIONS_5 = POSITIONS_5;
})();
