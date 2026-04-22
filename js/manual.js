// js/manual.js — 快捷键手册弹层（所有页面通用）
// 使用：Manual.init([{ keys: ['Space'], desc: '开始/停止' }, ...])
// 自动绑定 H / ? / F1 打开；任意键关闭

(function (global) {
  'use strict';

  function init(shortcuts, sections) {
    // 创建 DOM
    const overlay = document.createElement('div');
    overlay.className = 'manual-overlay';
    const sectionsHtml = (sections || []).map(sec => `
      <div class="manual-section">
        <div class="manual-section-title">${sec.title}</div>
        <ol class="manual-section-list">
          ${sec.steps.map(s => `<li>${s}</li>`).join('')}
        </ol>
      </div>
    `).join('');
    overlay.innerHTML = `
      <div class="manual-panel">
        <div class="manual-title">KEYBOARD MANUAL // 快捷键手册</div>
        <table class="manual-table">
          <tbody>
            ${shortcuts.map(s => `
              <tr>
                <td class="manual-keys">${s.keys.map(k => `<kbd>${k}</kbd>`).join(' <span class="sep">+</span> ')}</td>
                <td class="manual-desc">${s.desc}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${sectionsHtml}
        <div class="manual-footer">按任意键关闭</div>
      </div>
    `;
    document.body.appendChild(overlay);

    function show() { overlay.classList.add('show'); }
    function hide() { overlay.classList.remove('show'); }

    document.addEventListener('keydown', (e) => {
      const key = e.key;
      if (overlay.classList.contains('show')) {
        // 任意键（包括重复按 H）关闭
        e.preventDefault();
        hide();
        return;
      }
      // 触发键
      if (key === 'h' || key === 'H' || key === '?' || key === 'F1') {
        e.preventDefault();
        show();
      }
    }, true); // 捕获阶段，避免被页面其他 handler 吃掉

    // 点击遮罩也关闭
    overlay.addEventListener('click', hide);
  }

  global.Manual = { init };
})(window);
