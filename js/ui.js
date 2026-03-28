/**
 * ui.js - UI 渲染与交互层
 * 处理所有 DOM 操作、动画和用户交互
 */
(function () {
  'use strict';

  const { SUIT_SYMBOLS, SUIT_COLORS, RANK_DISPLAY } = window.TH;
  const { AI } = window.TH;
  const { Phase } = window.TH;

  // 位置名称中文映射
  const POSITION_NAMES = {
    'BTN': '庄家',
    'SB': '小盲',
    'BB': '大盲',
    'UTG': '枪口',
    'CO': '关煞'
  };

  // 5 名玩家的座位位置 (CSS %)
  const SEAT_POSITIONS = [
    { top: '78%', left: '50%', transform: 'translate(-50%, -50%)' },   // 0: 用户 (底部中间)
    { top: '50%', left: '5%', transform: 'translate(0, -50%)' },      // 1: 左侧
    { top: '8%', left: '22%', transform: 'translate(0, 0)' },         // 2: 左上
    { top: '8%', left: '78%', transform: 'translate(-100%, 0)' },     // 3: 右上
    { top: '50%', left: '95%', transform: 'translate(-100%, -50%)' }, // 4: 右侧
  ];

  // 筹码下注的位置（靠近牌桌中心方向）
  const BET_POSITIONS = [
    { top: '62%', left: '50%' },   // 0
    { top: '48%', left: '22%' },   // 1
    { top: '28%', left: '32%' },   // 2
    { top: '28%', left: '68%' },   // 3
    { top: '48%', left: '78%' },   // 4
  ];

  class GameUI {
    constructor() {
      this.game = null;
      this.animationQueue = [];
      this.isAnimating = false;
    }

    /**
     * 初始化 UI
     */
    init(game) {
      this.game = game;
      this.buildGameScreen();
    }

    /**
     * 构建游戏界面
     */
    buildGameScreen() {
      const gameScreen = document.getElementById('game-screen');
      gameScreen.innerHTML = '';

      // 牌桌
      const table = document.createElement('div');
      table.id = 'poker-table';
      table.innerHTML = `
        <div class="table-felt">
          <div class="table-logo">TEXAS HOLD'EM</div>
          <div id="community-cards" class="community-cards"></div>
          <div id="pot-display" class="pot-display">
            <span class="pot-icon">💰</span>
            <span id="pot-amount">0</span>
          </div>
          <div id="phase-display" class="phase-display"></div>
        </div>
      `;
      gameScreen.appendChild(table);

      // 玩家座位
      for (let i = 0; i < 5; i++) {
        const seat = this.createSeatElement(i);
        gameScreen.appendChild(seat);
      }

      // 下注区
      for (let i = 0; i < 5; i++) {
        const betArea = document.createElement('div');
        betArea.className = 'bet-area';
        betArea.id = `bet-area-${i}`;
        betArea.style.top = BET_POSITIONS[i].top;
        betArea.style.left = BET_POSITIONS[i].left;
        gameScreen.appendChild(betArea);
      }

      // 操作面板
      const actionPanel = this.createActionPanel();
      gameScreen.appendChild(actionPanel);

      // 游戏日志
      const logPanel = this.createLogPanel();
      gameScreen.appendChild(logPanel);

      // 对白气泡容器
      const dialogueContainer = document.createElement('div');
      dialogueContainer.id = 'dialogue-container';
      gameScreen.appendChild(dialogueContainer);

      // 手牌信息区
      const handInfo = document.createElement('div');
      handInfo.id = 'hand-info';
      handInfo.className = 'hand-info';
      gameScreen.appendChild(handInfo);
    }

    /**
     * 创建座位元素
     */
    createSeatElement(index) {
      const seat = document.createElement('div');
      seat.className = 'player-seat';
      seat.id = `seat-${index}`;
      seat.style.top = SEAT_POSITIONS[index].top;
      seat.style.left = SEAT_POSITIONS[index].left;
      seat.style.transform = SEAT_POSITIONS[index].transform;

      seat.innerHTML = `
        <div class="seat-inner">
          <div class="player-avatar" id="avatar-${index}"></div>
          <div class="player-info">
            <div class="player-name" id="name-${index}"></div>
            <div class="player-chips" id="chips-${index}"></div>
            <div class="player-style" id="style-${index}"></div>
          </div>
          <div class="player-position" id="position-${index}"></div>
          <div class="player-cards" id="cards-${index}"></div>
          <div class="player-action-label" id="action-label-${index}"></div>
          <div class="seat-bet" id="seat-bet-${index}"></div>
        </div>
      `;

      return seat;
    }

    /**
     * 创建操作面板
     */
    createActionPanel() {
      const panel = document.createElement('div');
      panel.id = 'action-panel';
      panel.className = 'action-panel hidden';

      panel.innerHTML = `
        <div class="action-buttons">
          <button id="btn-fold" class="action-btn btn-fold" onclick="TH.App.onAction('fold')">
            <span class="btn-icon">🚫</span>
            <span class="btn-text">弃牌</span>
          </button>
          <button id="btn-check" class="action-btn btn-check" onclick="TH.App.onAction('check')">
            <span class="btn-icon">✋</span>
            <span class="btn-text">过牌</span>
          </button>
          <button id="btn-call" class="action-btn btn-call" onclick="TH.App.onAction('call')">
            <span class="btn-icon">📞</span>
            <span class="btn-text">跟注</span>
            <span class="btn-amount" id="call-amount"></span>
          </button>
          <div class="raise-section">
            <div class="raise-control">
              <input type="range" id="raise-slider" class="raise-slider"
                     min="0" max="2000" step="10" value="40">
              <span class="raise-value" id="raise-value">40</span>
            </div>
            <button id="btn-raise" class="action-btn btn-raise" onclick="TH.App.onAction('raise')">
              <span class="btn-icon">📈</span>
              <span class="btn-text">加注</span>
            </button>
          </div>
          <button id="btn-allin" class="action-btn btn-allin" onclick="TH.App.onAction('allin')">
            <span class="btn-icon">🔥</span>
            <span class="btn-text">全押</span>
          </button>
        </div>
      `;

      return panel;
    }

    /**
     * 创建日志面板
     */
    createLogPanel() {
      const panel = document.createElement('div');
      panel.id = 'log-panel';
      panel.className = 'log-panel';

      panel.innerHTML = `
        <div class="log-header">
          <span>📋 游戏日志</span>
          <button class="log-toggle" onclick="TH.UI.toggleLog()">▼</button>
        </div>
        <div class="log-content" id="log-content"></div>
      `;

      return panel;
    }

    /**
     * 更新所有座位信息
     */
    updateSeats() {
      if (!this.game) return;

      for (let i = 0; i < this.game.players.length; i++) {
        const p = this.game.players[i];
        const seat = document.getElementById(`seat-${i}`);
        if (!seat) continue;

        // 名称
        document.getElementById(`name-${i}`).textContent = p.name;

        // 头像
        document.getElementById(`avatar-${i}`).textContent = p.avatar;

        // 筹码
        const chipsEl = document.getElementById(`chips-${i}`);
        chipsEl.textContent = `💰 ${p.chips}`;
        if (p.chips <= 200) chipsEl.classList.add('low-chips');
        else chipsEl.classList.remove('low-chips');

        // 风格标签
        const styleEl = document.getElementById(`style-${i}`);
        if (p.style && AI.AI_STYLES[p.style]) {
          const s = AI.AI_STYLES[p.style];
          styleEl.textContent = s.label;
          styleEl.style.color = s.color;
          styleEl.style.display = 'block';
        } else {
          styleEl.style.display = 'none';
        }

        // 位置（显示中文名）
        const posEl = document.getElementById(`position-${i}`);
        posEl.textContent = POSITION_NAMES[p.position] || p.position;
        if (p.position === 'BTN') {
          posEl.classList.add('is-dealer');
        } else {
          posEl.classList.remove('is-dealer');
        }

        // 状态样式
        seat.classList.remove('folded', 'active', 'all-in', 'winner');
        if (p.folded) {
          seat.classList.add('folded');
        }
        if (p.allIn) {
          seat.classList.add('all-in');
        }
        if (i === this.game.currentPlayerIndex &&
          this.game.phase !== Phase.SHOWDOWN &&
          this.game.phase !== Phase.HAND_OVER) {
          seat.classList.add('active');
        }

        // 补充次数
        if (p.rebuyCount > 0 && !p.isHuman) {
          const rebuyBadge = seat.querySelector('.rebuy-badge');
          if (!rebuyBadge) {
            const badge = document.createElement('div');
            badge.className = 'rebuy-badge';
            badge.textContent = `补充×${p.rebuyCount}`;
            seat.querySelector('.seat-inner').appendChild(badge);
          } else {
            rebuyBadge.textContent = `补充×${p.rebuyCount}`;
          }
        }
      }
    }

    /**
     * 更新手牌显示
     */
    updateCards() {
      if (!this.game) return;

      for (let i = 0; i < this.game.players.length; i++) {
        const p = this.game.players[i];
        const cardsContainer = document.getElementById(`cards-${i}`);
        if (!cardsContainer) continue;

        cardsContainer.innerHTML = '';

        if (p.holeCards.length === 0) continue;

        if (p.isHuman || this.game.phase === Phase.SHOWDOWN || this.game.phase === Phase.HAND_OVER) {
          // 显示正面
          if (p.folded && !p.isHuman) continue;
          for (const card of p.holeCards) {
            cardsContainer.appendChild(this.createCardElement(card, false));
          }
        } else {
          // 显示背面
          if (p.folded) continue;
          for (let j = 0; j < p.holeCards.length; j++) {
            cardsContainer.appendChild(this.createCardElement(null, true));
          }
        }
      }
    }

    /**
     * 创建扑克牌元素
     */
    createCardElement(card, faceDown) {
      const el = document.createElement('div');
      el.className = 'poker-card';

      if (faceDown || !card) {
        el.classList.add('face-down');
        el.innerHTML = `
          <div class="card-back">
            <div class="card-back-pattern"></div>
          </div>
        `;
      } else {
        const colorClass = card.isRed ? 'red' : 'black';
        el.classList.add(`card-${colorClass}`);
        el.innerHTML = `
          <div class="card-front">
            <div class="card-corner top-left">
              <span class="card-rank">${card.rankDisplay}</span>
              <span class="card-suit">${card.suitSymbol}</span>
            </div>
            <div class="card-center">
              <span class="card-suit-large">${card.suitSymbol}</span>
            </div>
            <div class="card-corner bottom-right">
              <span class="card-rank">${card.rankDisplay}</span>
              <span class="card-suit">${card.suitSymbol}</span>
            </div>
          </div>
        `;
      }

      return el;
    }

    /**
     * 更新公共牌
     */
    updateCommunityCards() {
      const container = document.getElementById('community-cards');
      if (!container) return;

      // 只添加新的公共牌
      const currentCount = container.children.length;
      for (let i = currentCount; i < this.game.communityCards.length; i++) {
        const card = this.game.communityCards[i];
        const cardEl = this.createCardElement(card, false);
        cardEl.classList.add('community-card');
        cardEl.style.animationDelay = `${(i - currentCount) * 0.15}s`;
        cardEl.classList.add('card-deal-in');
        container.appendChild(cardEl);
      }
    }

    /**
     * 清空公共牌
     */
    clearCommunityCards() {
      const container = document.getElementById('community-cards');
      if (container) container.innerHTML = '';
    }

    /**
     * 更新底池显示
     */
    updatePot() {
      const potEl = document.getElementById('pot-amount');
      if (potEl) {
        const oldValue = parseInt(potEl.textContent) || 0;
        const newValue = this.game.pot;
        if (oldValue !== newValue) {
          this.animateNumber(potEl, oldValue, newValue, 500);
        }
      }
    }

    /**
     * 数字动画
     */
    animateNumber(element, from, to, duration) {
      const startTime = Date.now();
      const diff = to - from;

      function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const current = Math.round(from + diff * eased);
        element.textContent = current;
        if (progress < 1) {
          requestAnimationFrame(update);
        }
      }
      requestAnimationFrame(update);
    }

    /**
     * 更新阶段显示
     */
    updatePhase() {
      const phaseEl = document.getElementById('phase-display');
      if (phaseEl) {
        phaseEl.textContent = this.game.getPhaseName();
      }
    }

    /**
     * 更新下注区显示
     */
    updateBets() {
      for (let i = 0; i < 5; i++) {
        const betArea = document.getElementById(`bet-area-${i}`);
        const seatBet = document.getElementById(`seat-bet-${i}`);
        const bet = this.game.roundBets[i] || 0;

        // 浮动下注区（桌面模式）
        if (betArea) {
          if (bet > 0) {
            betArea.innerHTML = `<div class="bet-chips"><span class="chip-icon">🪙</span>${bet}</div>`;
            betArea.style.display = 'block';
          } else {
            betArea.innerHTML = '';
            betArea.style.display = 'none';
          }
        }

        // 座位内下注显示（手机模式）
        if (seatBet) {
          if (bet > 0) {
            seatBet.innerHTML = `<span class="chip-icon">🪙</span>${bet}`;
            seatBet.style.display = 'flex';
          } else {
            seatBet.innerHTML = '';
            seatBet.style.display = 'none';
          }
        }
      }
    }

    /**
     * 显示/隐藏操作面板
     */
    showActions(actions) {
      const panel = document.getElementById('action-panel');
      if (!panel) return;

      const btnFold = document.getElementById('btn-fold');
      const btnCheck = document.getElementById('btn-check');
      const btnCall = document.getElementById('btn-call');
      const btnRaise = document.getElementById('btn-raise');
      const btnAllin = document.getElementById('btn-allin');
      const raiseSlider = document.getElementById('raise-slider');
      const raiseValue = document.getElementById('raise-value');
      const callAmount = document.getElementById('call-amount');

      // 隐藏所有按钮
      btnFold.style.display = 'none';
      btnCheck.style.display = 'none';
      btnCall.style.display = 'none';
      btnRaise.style.display = 'none';
      btnAllin.style.display = 'none';
      raiseSlider.parentElement.parentElement.style.display = 'none';

      for (const action of actions) {
        switch (action.type) {
          case 'fold':
            btnFold.style.display = 'flex';
            break;
          case 'check':
            btnCheck.style.display = 'flex';
            break;
          case 'call':
            btnCall.style.display = 'flex';
            callAmount.textContent = action.amount;
            break;
          case 'raise':
            btnRaise.style.display = 'flex';
            raiseSlider.parentElement.parentElement.style.display = 'flex';
            raiseSlider.min = action.minAmount;
            raiseSlider.max = action.maxAmount;
            raiseSlider.value = action.minAmount;
            raiseSlider.step = Math.max(10, Math.floor((action.maxAmount - action.minAmount) / 20));
            raiseValue.textContent = action.minAmount;
            raiseSlider.oninput = function () {
              raiseValue.textContent = this.value;
            };
            break;
          case 'allin':
            btnAllin.style.display = 'flex';
            break;
        }
      }

      panel.classList.remove('hidden');
    }

    /**
     * 隐藏操作面板
     */
    hideActions() {
      const panel = document.getElementById('action-panel');
      if (panel) panel.classList.add('hidden');
    }

    /**
     * 显示行动标签
     */
    showActionLabel(playerIndex, action, amount) {
      const label = document.getElementById(`action-label-${playerIndex}`);
      if (!label) return;

      const actionTexts = {
        fold: '弃牌',
        check: '过牌',
        call: `跟注 ${amount}`,
        raise: `加注 ${amount}`,
        allin: `全押 ${amount}`
      };

      label.textContent = actionTexts[action] || action;
      label.className = `player-action-label action-${action} show`;

      // 3秒后隐藏
      setTimeout(() => {
        label.classList.remove('show');
      }, 2500);
    }

    /**
     * 显示对白气泡
     */
    showDialogue(playerIndex, text) {
      if (!text) return;

      const seat = document.getElementById(`seat-${playerIndex}`);
      if (!seat) return;

      // 移除旧的气泡
      const oldBubble = seat.querySelector('.dialogue-bubble');
      if (oldBubble) oldBubble.remove();

      const bubble = document.createElement('div');
      bubble.className = 'dialogue-bubble show';
      bubble.textContent = text;

      seat.appendChild(bubble);

      // 7秒后移除（给用户充分时间阅读）
      setTimeout(() => {
        bubble.classList.remove('show');
        setTimeout(() => bubble.remove(), 300);
      }, 9000);
    }

    /**
     * 更新手牌信息（用户手牌的牌型提示）
     */
    updateHandInfo() {
      const handInfo = document.getElementById('hand-info');
      if (!handInfo) return;

      const player = this.game.players[0];
      if (!player || player.holeCards.length === 0 || player.folded) {
        handInfo.style.display = 'none';
        return;
      }

      if (this.game.communityCards.length > 0) {
        const { HandEvaluator } = window.TH;
        const allCards = [...player.holeCards, ...this.game.communityCards];
        const best = HandEvaluator.evaluateBest(allCards);
        if (best) {
          handInfo.innerHTML = `<span class="hand-type">当前最佳牌型：</span><span class="hand-name">${best.name}</span>`;
          handInfo.style.display = 'block';
        }
      } else {
        handInfo.style.display = 'none';
      }
    }

    /**
     * 更新日志
     */
    updateLog() {
      const logContent = document.getElementById('log-content');
      if (!logContent) return;

      logContent.innerHTML = '';
      const logs = this.game.actionLog.slice(-100); // 最近100条
      for (const log of logs) {
        const line = document.createElement('div');
        line.className = 'log-line';
        line.textContent = log.message;
        logContent.appendChild(line);
      }
      logContent.scrollTop = logContent.scrollHeight;
    }

    /**
     * 切换日志显示
     */
    toggleLog() {
      const logContent = document.getElementById('log-content');
      const logToggle = document.querySelector('.log-toggle');
      if (logContent) {
        logContent.classList.toggle('collapsed');
        if (logToggle) {
          logToggle.textContent = logContent.classList.contains('collapsed') ? '▲' : '▼';
        }
      }
    }

    /**
     * 全面刷新 UI
     */
    render() {
      if (!this.game) return;
      this.updateSeats();
      this.updateCards();
      this.updateCommunityCards();
      this.updatePot();
      this.updatePhase();
      this.updateBets();
      this.updateHandInfo();
      this.updateLog();
    }

    /**
     * 显示赢家效果（含详细牌型说明）
     */
    showWinnerEffect(winners, showdownResults, game) {
      for (const w of winners) {
        const seat = document.getElementById(`seat-${w.player.id}`);
        if (seat) {
          seat.classList.add('winner');
        }
      }

      const winnerIds = new Set(winners.map(w => w.player.id));

      // 显示结果信息
      const resultOverlay = document.createElement('div');
      resultOverlay.id = 'result-overlay';
      resultOverlay.className = 'result-overlay';

      let resultHTML = '<div class="result-content">';
      resultHTML += '<h2 class="result-title">🏆 本局结果 🏆</h2>';

      // 公共牌展示
      if (game && game.communityCards && game.communityCards.length > 0) {
        resultHTML += '<div class="result-community">';
        resultHTML += '<div class="result-section-label">公共牌</div>';
        resultHTML += '<div class="result-cards-row">';
        for (const card of game.communityCards) {
          const colorClass = card.isRed ? 'red' : 'black';
          resultHTML += `<span class="result-card card-${colorClass}">${card.rankDisplay}${card.suitSymbol}</span>`;
        }
        resultHTML += '</div></div>';
      }

      // 详细牌型展示
      resultHTML += '<div class="result-details">';

      if (showdownResults && showdownResults.length > 0) {
        // 摊牌情况：展示所有未弃牌玩家的手牌和牌型
        // 先展示赢家，再展示输家
        const sortedResults = [...showdownResults].sort((a, b) => {
          const aWin = winnerIds.has(a.player.id) ? 0 : 1;
          const bWin = winnerIds.has(b.player.id) ? 0 : 1;
          return aWin - bWin;
        });

        for (const r of sortedResults) {
          const isWinner = winnerIds.has(r.player.id);
          const winAmount = winners.find(w => w.player.id === r.player.id);
          resultHTML += `
            <div class="result-player ${isWinner ? 'is-winner' : 'is-loser'}">
              <div class="result-player-header">
                <span class="result-avatar">${r.player.avatar}</span>
                <span class="result-player-name">${r.player.name}</span>
                ${isWinner ? '<span class="result-crown">👑</span>' : ''}
                ${isWinner && winAmount ? `<span class="result-win-amount">+${winAmount.amount} 💰</span>` : ''}
              </div>
              <div class="result-player-cards">
                <span class="result-label">手牌：</span>`;

          // 显示手牌
          for (const card of r.player.holeCards) {
            const colorClass = card.isRed ? 'red' : 'black';
            resultHTML += `<span class="result-card card-${colorClass}">${card.rankDisplay}${card.suitSymbol}</span>`;
          }

          resultHTML += `</div>
              <div class="result-hand-type">
                <span class="result-label">牌型：</span>
                <span class="result-hand-name ${isWinner ? 'winning-hand' : ''}">${r.hand ? r.hand.name : '-'}</span>
              </div>`;

          // 显示最佳5张牌组合
          if (r.hand && r.hand.cards) {
            resultHTML += '<div class="result-best-cards"><span class="result-label">最佳组合：</span>';
            for (const card of r.hand.cards) {
              const colorClass = card.isRed ? 'red' : 'black';
              resultHTML += `<span class="result-card result-card-small card-${colorClass}">${card.rankDisplay}${card.suitSymbol}</span>`;
            }
            resultHTML += '</div>';
          }

          resultHTML += '</div>';
        }

        // 展示已弃牌的玩家（只显示名字和"已弃牌"）
        if (game) {
          const foldedPlayers = game.players.filter(p => p.folded);
          if (foldedPlayers.length > 0) {
            resultHTML += '<div class="result-folded-section">';
            resultHTML += '<div class="result-section-label">已弃牌</div>';
            resultHTML += '<div class="result-folded-list">';
            for (const p of foldedPlayers) {
              resultHTML += `<span class="result-folded-player">${p.avatar} ${p.name}</span>`;
            }
            resultHTML += '</div></div>';
          }
        }
      } else {
        // 非摊牌（所有对手弃牌）
        for (const w of winners) {
          resultHTML += `
            <div class="result-player is-winner">
              <div class="result-player-header">
                <span class="result-avatar">${w.player.avatar}</span>
                <span class="result-player-name">${w.player.name}</span>
                <span class="result-crown">👑</span>
                <span class="result-win-amount">+${w.amount} 💰</span>
              </div>
              <div class="result-hand-type">
                <span class="result-hand-name">${w.reason || '其他玩家弃牌'}</span>
              </div>
            </div>
          `;
        }
      }

      resultHTML += '</div>';
      resultHTML += '<button class="btn-next-hand" onclick="TH.App.nextHand()">下一局</button>';
      resultHTML += '</div>';

      resultOverlay.innerHTML = resultHTML;
      document.getElementById('game-screen').appendChild(resultOverlay);

      // 显示动画
      requestAnimationFrame(() => {
        resultOverlay.classList.add('show');
      });
    }

    /**
     * 移除结果覆盖层
     */
    removeResultOverlay() {
      const overlay = document.getElementById('result-overlay');
      if (overlay) overlay.remove();

      // 清除赢家样式
      for (let i = 0; i < 5; i++) {
        const seat = document.getElementById(`seat-${i}`);
        if (seat) seat.classList.remove('winner');
      }
    }

    /**
     * 显示玩家补充筹码信息
     */
    showRebuyMessage(player) {
      this.showDialogue(player.id,
        `筹码耗尽！自动补充 2000 筹码（第 ${player.rebuyCount} 次）`
      );
    }
  }

  window.TH = window.TH || {};
  window.TH.UI = new GameUI();
})();
