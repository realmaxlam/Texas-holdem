/**
 * app.js - 应用入口
 * 初始化游戏、绑定事件、管理游戏流程
 */
(function () {
  'use strict';

  const { Game, Phase } = window.TH;
  const { AI } = window.TH;
  const { HandEvaluator } = window.TH;
  const UI = window.TH.UI;

  let game = null;
  let aiActionTimeout = null;

  /**
   * 开始游戏
   */
  function startGame() {
    const nameInput = document.getElementById('player-name');
    const playerName = (nameInput && nameInput.value.trim()) || '玩家';

    game = new Game();
    game.setupPlayers(playerName);

    // 设置回调
    game.onHandEnd = handleHandEnd;
    game.onShowdown = handleShowdown;

    // 初始化 UI
    UI.init(game);

    // 切换界面
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    // 开始第一手牌
    startNewHand();
  }

  /**
   * 开始新一手牌
   */
  function startNewHand() {
    UI.removeResultOverlay();
    UI.clearCommunityCards();
    game.startNewHand();
    UI.render();

    // 开始游戏循环
    setTimeout(() => advanceGame(), 500);
  }

  /**
   * 游戏推进（核心循环）
   */
  function advanceGame() {
    if (!game || game.phase === Phase.HAND_OVER || game.phase === Phase.SHOWDOWN) return;

    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer) {
      // 无法行动的玩家，推进阶段
      const result = game.advance();
      UI.render();
      if (result === 'CONTINUE' || result === 'PHASE_CHANGE') {
        setTimeout(() => advanceGame(), 600);
      }
      return;
    }

    if (currentPlayer.isHuman) {
      // 用户回合 - 显示操作面板
      const actions = game.getAvailableActions();
      if (actions.length > 0) {
        UI.showActions(actions);
      } else {
        // 用户没有可用操作（不应该发生）
        game.processAction('check');
        handleAfterAction(0, 'check', 0);
      }
    } else {
      // AI 回合
      UI.hideActions();
      const delay = 800 + Math.random() * 800; // 0.8-1.6秒延迟

      aiActionTimeout = setTimeout(() => {
        const gameState = game.getGameState();
        const decision = AI.makeDecision(currentPlayer, gameState);

        // 显示对白
        UI.showDialogue(currentPlayer.id, decision.dialogue);

        // 执行行动
        let amount = decision.amount;
        if (decision.action === 'raise') {
          amount = decision.amount;
        }

        game.processAction(decision.action, amount);
        handleAfterAction(currentPlayer.id, decision.action, amount);
      }, delay);
    }
  }

  /**
   * 用户操作回调
   */
  function onAction(actionType) {
    if (!game) return;
    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.isHuman) return;

    let amount = 0;

    switch (actionType) {
      case 'fold':
        break;
      case 'check':
        break;
      case 'call': {
        const playerBet = game.roundBets[currentPlayer.id] || 0;
        amount = game.currentBet - playerBet;
        break;
      }
      case 'raise': {
        const slider = document.getElementById('raise-slider');
        amount = parseInt(slider.value);
        break;
      }
      case 'allin':
        amount = currentPlayer.chips;
        break;
    }

    UI.hideActions();
    game.processAction(actionType, amount);
    handleAfterAction(currentPlayer.id, actionType, amount);
  }

  /**
   * 处理行动后的流程
   */
  function handleAfterAction(playerIndex, action, amount) {
    // 显示行动标签
    UI.showActionLabel(playerIndex, action, amount);

    // 更新 UI
    UI.render();

    // 推进游戏
    const result = game.advance();

    if (result === 'HAND_OVER' || result === 'SHOWDOWN') {
      // 手牌结束
      UI.render();
      return;
    }

    // 继续下一个玩家
    UI.render();
    setTimeout(() => advanceGame(), 400);
  }

  /**
   * 处理摊牌
   */
  function handleShowdown(results, winners) {
    // 更新 UI 显示所有手牌
    UI.render();
  }

  /**
   * 处理手牌结束
   */
  function handleHandEnd(winners) {
    setTimeout(() => {
      UI.render();
      UI.showWinnerEffect(winners);
    }, 800);
  }

  /**
   * 下一手牌
   */
  function nextHand() {
    startNewHand();
  }

  // 导出到全局
  window.TH = window.TH || {};
  window.TH.App = {
    startGame,
    onAction,
    nextHand
  };
})();
