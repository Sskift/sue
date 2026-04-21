// js/single.js — 一等奖抽奖流程

(function () {
  'use strict';

  const stageHint = document.getElementById('stage-hint');
  const display = document.getElementById('display');
  const btnStart = document.getElementById('btn-start');
  const btnNext = document.getElementById('btn-next');
  const btnAgain = document.getElementById('btn-again');
  const btnBack = document.getElementById('btn-back');
  const toast = document.getElementById('toast');

  // DOM 预置：
  //   .number-display:
  //     <span class="prefix">公元</span>
  //     <span class="era-reel" id="era-reel"></span>
  //     <span class="hex-reels"> <reel/> <reel/> <reel/> </span>
  //     <span class="suffix">纪元</span>

  const eraEl = document.getElementById('era-reel');
  const hexEls = [
    document.getElementById('hex-0'),
    document.getElementById('hex-1'),
    document.getElementById('hex-2'),
  ];

  const eraReel = new Roller.EraReel(eraEl);
  const hexReels = hexEls.map(el => new Roller.HexReel(el));

  // 状态机：stage = 'era-ready' | 'era-rolling' | 'era-done' | 'hex-ready' | 'hex-rolling' | 'hex-done'
  let stage = 'era-ready';
  let chosenEra = null;
  let chosenNumber = null;
  let locked = false;

  function setHint(text) { stageHint.textContent = text; }
  function showToast(msg, danger) {
    toast.textContent = msg;
    toast.className = 'toast show' + (danger ? ' danger' : '');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.className = 'toast', 2000);
  }

  function checkPool() {
    if (State.remaining() <= 0) {
      setHint('号码池已空');
      btnStart.disabled = true;
      showToast('号码池已空，请先在管理页重置', true);
      return false;
    }
    if (State.count('first') >= 2) {
      showToast('提醒：一等奖已抽满 2 名（仍可继续抽）', false);
    }
    return true;
  }

  function handleAction() {
    if (locked) return;

    if (stage === 'era-ready') {
      if (!checkPool()) return;
      stage = 'era-rolling';
      setHint('穿梭中 · SPACE 或 点击 停止');
      btnStart.textContent = '停 止';
      btnStart.classList.add('danger');
      eraReel.start();
      return;
    }

    if (stage === 'era-rolling') {
      locked = true;
      chosenEra = Hex.pickEra(State.drawnSet());
      if (!chosenEra) { showToast('无可用号码', true); return; }
      eraReel.stopAt(chosenEra, 0).then(() => {
        stage = 'era-done';
        locked = false;
        setHint(chosenEra === 'BC' ? '方向锁定：公元前' : '方向锁定：公元后');
        btnStart.style.display = 'none';
        btnStart.classList.remove('danger');
        btnStart.textContent = '开 始';
        btnNext.style.display = '';
      });
      return;
    }

    if (stage === 'hex-ready') {
      stage = 'hex-rolling';
      setHint('抽取年份 · SPACE 或 点击 停止');
      btnStart.textContent = '停 止';
      btnStart.classList.add('danger');
      hexReels.forEach((r, i) => r.start(26 + i * 3));
      return;
    }

    if (stage === 'hex-rolling') {
      locked = true;
      chosenNumber = Hex.pickHexInEra(State.drawnSet(), chosenEra);
      if (!chosenNumber) { showToast('该方向无可用号码', true); locked = false; return; }
      const digits = Roller.hexDigits(chosenNumber.hex);
      Promise.all(hexReels.map((r, i) => r.stopAt(digits[i], i * 220))).then(() => {
        stage = 'hex-done';
        locked = false;
        State.markDrawn(chosenNumber, 'first');
        setHint('中奖号码确认 · ' + Hex.formatFull(chosenNumber));
        btnStart.style.display = 'none';
        btnStart.classList.remove('danger');
        btnAgain.style.display = '';
        celebrate();
      });
      return;
    }
  }

  function next() {
    if (stage !== 'era-done') return;
    stage = 'hex-ready';
    setHint('SPACE 或 点击 开始抽取年份');
    btnNext.style.display = 'none';
    btnStart.style.display = '';
    btnStart.textContent = '开 始';
  }

  function again() {
    // 重置到初始 era-ready
    location.reload();
  }

  function celebrate() {
    const box = document.getElementById('confetti');
    const colors = ['#3df5ff', '#a05cff', '#ff3ea6', '#ffffff'];
    for (let i = 0; i < 120; i++) {
      const piece = document.createElement('div');
      piece.className = 'piece';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = (Math.random() * 1.2) + 's';
      piece.style.animationDuration = (2 + Math.random() * 2) + 's';
      piece.style.width = (6 + Math.random() * 6) + 'px';
      piece.style.height = (10 + Math.random() * 10) + 'px';
      box.appendChild(piece);
    }
    setTimeout(() => box.innerHTML = '', 5000);
  }

  btnStart.addEventListener('click', handleAction);
  btnNext.addEventListener('click', next);
  btnAgain.addEventListener('click', again);
  btnBack.addEventListener('click', () => location.href = 'index.html');

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); handleAction(); }
    else if (e.key === 'Enter' && stage === 'era-done') { e.preventDefault(); next(); }
    else if (e.key === 'Escape') location.href = 'index.html';
  });

  // 初始化 UI
  setHint('SPACE 或 点击 开始');
  btnNext.style.display = 'none';
  btnAgain.style.display = 'none';
})();
