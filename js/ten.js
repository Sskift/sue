// js/ten.js — 十连抽（纯键盘）

(function () {
  'use strict';

  const stageHint = document.getElementById('stage-hint');
  const toast = document.getElementById('toast');
  const grid = document.getElementById('grid');

  const params = new URLSearchParams(location.search);
  const prize = params.get('prize') === 'second' ? 'second' : 'third';
  const prizeLabel = prize === 'second' ? '二等奖' : '三等奖';
  document.getElementById('prize-label').textContent = prizeLabel;

  // 三等奖编号跨轮累计（01-10 → 11-20 → 21-30），二等奖固定 01-10
  // 初始构建一次，之后只就地更新 data-idx，不重建 DOM 以避免闪烁
  const INITIAL_DIGITS = [0x7, 0xE, 0xA];
  const cells = [];

  function updateCellIndices() {
    const numberOffset = prize === 'third' ? State.count('third') : 0;
    cells.forEach((c, i) => {
      const num = numberOffset + i + 1;
      c.el.setAttribute('data-idx', String(num).padStart(2, '0'));
    });
  }

  function buildCells() {
    grid.innerHTML = '';
    cells.length = 0;
    for (let i = 0; i < 10; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.innerHTML = `
        <div class="cell-display">
          <div class="cell-line cell-line-top">
            <span>公元</span>
            <span class="era-reel"></span>
          </div>
          <div class="cell-line cell-line-bottom">
            <span>0x</span>
            <span class="hex-reel"></span>
            <span class="hex-reel"></span>
            <span class="hex-reel"></span>
          </div>
        </div>
      `;
      grid.appendChild(cell);
      const eraEl = cell.querySelector('.era-reel');
      const hexEls = cell.querySelectorAll('.hex-reel');
      cells.push({
        el: cell,
        era: new Roller.EraReel(eraEl),
        hex: [
          new Roller.HexReel(hexEls[0], INITIAL_DIGITS[0]),
          new Roller.HexReel(hexEls[1], INITIAL_DIGITS[1]),
          new Roller.HexReel(hexEls[2], INITIAL_DIGITS[2]),
        ],
      });
    }
    updateCellIndices();
  }

  buildCells();

  let stage = 'ready'; // ready | rolling | done
  let result = null;
  let locked = false;

  function setHint(t) { stageHint.textContent = t; }
  function showToast(msg, danger) {
    toast.textContent = msg;
    toast.className = 'toast show' + (danger ? ' danger' : '');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.className = 'toast', 2200);
  }

  function handleAction() {
    if (locked) return;

    if (stage === 'ready') {
      if (State.remaining() < 10) {
        showToast('剩余号码不足 10 个，无法开始', true);
        return;
      }
      stage = 'rolling';
      setHint(`${prizeLabel} · 穿梭中`);
      cells.forEach((c, i) => {
        setTimeout(() => {
          c.era.start();
          c.hex.forEach((r, j) => r.start(26 + j * 2 + Math.random() * 4));
        }, i * 25);
      });
      return;
    }

    if (stage === 'rolling') {
      locked = true;
      result = Hex.pickMany(State.drawnSet(), 10);
      if (!result) { showToast('号码池不足', true); locked = false; return; }

      const promises = [];
      cells.forEach((c, i) => {
        const n = result[i];
        const digits = Roller.hexDigits(n.hex);
        const baseDelay = i * 80;
        promises.push(c.era.stopAt(n.era, baseDelay));
        digits.forEach((d, j) => {
          promises.push(c.hex[j].stopAt(d, baseDelay + 80 + j * 120));
        });
        setTimeout(() => c.el.classList.add('locked'), baseDelay + 80 + 2 * 120 + 900);
      });

      Promise.all(promises).then(() => {
        stage = 'done';
        locked = false;
        setHint('号码已锁定 · 待归档');
      });
      return;
    }
  }

  function confirm() {
    if (stage !== 'done' || !result || locked) return;
    locked = true;
    State.markDrawn(result, prize);
    showToast(`已归档 ${result.length} 个${prizeLabel}号码`, false);
    setHint('归零中 · 准备下一轮');
    // 号码池不足则直接显示完成，不再进入下一轮
    const nextRemain = State.remaining();
    const tasks = [];
    cells.forEach(c => {
      c.el.classList.remove('locked');
      // 每格都归零到 0x7EA
      tasks.push({ reel: c.era });
      tasks.push({ reel: c.hex[0], target: INITIAL_DIGITS[0] });
      tasks.push({ reel: c.hex[1], target: INITIAL_DIGITS[1] });
      tasks.push({ reel: c.hex[2], target: INITIAL_DIGITS[2] });
    });
    Roller.resetReels(tasks).then(() => {
      // 三等奖：就地更新 data-idx 到下一段编号（11-20 / 21-30），不重建 DOM
      if (prize === 'third') {
        updateCellIndices();
      }
      result = null;
      stage = 'ready';
      locked = false;
      setHint(`${prizeLabel} · 待命`);
      if (nextRemain < 10) showToast(`警告：剩余号码仅 ${nextRemain} 个`, true);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); handleAction(); }
    else if (e.key === 'Enter') { e.preventDefault(); confirm(); }
    else if (e.key === 'b' || e.key === 'B') location.href = 'index.html';
    else if (e.key === 'a' || e.key === 'A') location.href = 'admin.html';
  });

  setHint(`${prizeLabel} · 待命`);

  const remain = State.remaining();
  if (remain < 10) showToast(`警告：剩余号码仅 ${remain} 个`, true);
})();
