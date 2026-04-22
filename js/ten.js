// js/ten.js — 十连抽

(function () {
  'use strict';

  const stageHint = document.getElementById('stage-hint');
  const btnStart = document.getElementById('btn-start');
  const btnConfirm = document.getElementById('btn-confirm');
  const btnBack = document.getElementById('btn-back');
  const toast = document.getElementById('toast');
  const grid = document.getElementById('grid');

  const params = new URLSearchParams(location.search);
  const prize = params.get('prize') === 'second' ? 'second' : 'third';
  const prizeLabel = prize === 'second' ? '二等奖' : '三等奖';
  document.getElementById('prize-label').textContent = prizeLabel;

  // 构建 10 个 cell（两行结构：上行「公元 + 前/后」，下行「0x + 三位」）
  // 三等奖：编号跨轮累计。例如第一轮 01-10、第二轮 11-20、第三轮 21-30。
  // 基于 state 里已有的 third 记录数推导起始偏移，刷新 / 重进也能接着编号。
  const numberOffset = prize === 'third' ? State.count('third') : 0;
  const cells = [];
  for (let i = 0; i < 10; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const num = numberOffset + i + 1;
    cell.setAttribute('data-idx', String(num).padStart(2, '0'));
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
      hex: [new Roller.HexReel(hexEls[0]), new Roller.HexReel(hexEls[1]), new Roller.HexReel(hexEls[2])],
    });
  }

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
      setHint(`十连抽 · ${prizeLabel} · SPACE 或 点击 停止`);
      btnStart.textContent = '停 止';
      btnStart.classList.add('danger');
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
      // 从左上到右下顺位停止，每个 cell 约 80ms 间隔
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
        setHint('号码已锁定 · 点「确认并归档」完成本轮');
        btnStart.style.display = 'none';
        btnConfirm.style.display = '';
      });
      return;
    }
  }

  function confirm() {
    if (!result) return;
    State.markDrawn(result, prize);
    showToast(`已归档 ${result.length} 个${prizeLabel}号码`, false);
    setTimeout(() => location.reload(), 1200);
  }

  btnStart.addEventListener('click', handleAction);
  btnConfirm.addEventListener('click', confirm);
  btnBack.addEventListener('click', () => location.href = 'index.html');

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); handleAction(); }
    else if (e.key === 'Enter' && stage === 'done') { e.preventDefault(); confirm(); }
    else if (e.key === 'Escape') location.href = 'index.html';
  });

  // 初始化
  setHint(`就绪 · 本轮：${prizeLabel}（10 个）· SPACE 或 点击 开始`);
  btnConfirm.style.display = 'none';

  // 剩余数量提醒
  const remain = State.remaining();
  if (remain < 10) showToast(`警告：剩余号码仅 ${remain} 个`, true);
})();
