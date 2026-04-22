// js/single.js — 一等奖抽奖流程（纯键盘 · 无可见按键提示）

(function () {
  'use strict';

  const stageHint = document.getElementById('stage-hint');
  const toast = document.getElementById('toast');

  const eraEl = document.getElementById('era-reel');
  const hexEls = [
    document.getElementById('hex-0'),
    document.getElementById('hex-1'),
    document.getElementById('hex-2'),
  ];

  const eraReel = new Roller.EraReel(eraEl);
  const hexReels = hexEls.map(el => new Roller.HexReel(el));

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
      showToast('号码池已空', true);
      return false;
    }
    return true;
  }

  function handleAction() {
    if (locked) return;

    if (stage === 'era-ready') {
      if (!checkPool()) return;
      stage = 'era-rolling';
      setHint('方向抽取 · 穿梭中');
      eraReel.start();
      return;
    }

    if (stage === 'era-rolling') {
      locked = true;
      chosenEra = Hex.pickEra(State.drawnSet());
      if (!chosenEra) { showToast('无可用号码', true); return; }
      eraReel.stopAt(chosenEra, 0).then(() => {
        setHint(chosenEra === 'BC' ? '方向锁定：公元前 · 准备年份' : '方向锁定：公元后 · 准备年份');
        // 自动进入年份阶段，无需再按 Enter
        setTimeout(() => {
          stage = 'hex-ready';
          locked = false;
          setHint('年份抽取 · 待命');
        }, 600);
      });
      return;
    }

    if (stage === 'hex-ready') {
      stage = 'hex-rolling';
      setHint('年份抽取 · 穿梭中');
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
        setHint('中奖号码 · ' + Hex.formatFull(chosenNumber));
        celebrate();
      });
      return;
    }
  }

  function next() {
    if (stage === 'hex-done') {
      Roller.fadeReload('// RESET · 再抽一个');
    }
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

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); handleAction(); }
    else if (e.key === 'Enter') { e.preventDefault(); next(); }
    else if (e.key === 'b' || e.key === 'B') location.href = 'index.html';
    else if (e.key === 'a' || e.key === 'A') location.href = 'admin.html';
  });

  setHint('方向抽取 · 待命');
})();
