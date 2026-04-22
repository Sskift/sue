# 调试 & 调参手册

## 一、在 Chrome 里按 9:5 比例测试

### 方法 A：DevTools 响应式（推荐，最快）
1. 打开 `index.html`，按 **F12** 或 **Cmd+Option+I** 打开 DevTools
2. 点左上角 **Toggle device toolbar** 图标（手机/平板图），或按 **Cmd+Shift+M**
3. 顶部尺寸下拉选 **Responsive**，然后手动输入：
   - **宽 1800 × 高 1000** （9:5）
   - 或 **1440 × 800**（同比例，屏幕小时用）
   - 或 **900 × 500**（最小测试尺寸）
4. Zoom 选 100% 或 Fit to window

### 方法 B：用命令行直接开窗
```bash
# macOS（从 Chrome 应用路径）
open -na "Google Chrome" --args --new-window --window-size=1800,1000 "file:///Users/bytedance/Desktop/test/sue/index.html"
```

### 方法 C：现场投影前验证
投影仪分辨率多半是 1920×1080（16:9 = 1.78）而不是 9:5（= 1.80），两者差 1%，视觉几乎无差别。**现场直接全屏 F11 即可**，页面已按 vw/vh 自适应。

---

## 二、怎么看历史记录（后台）

主页面**没有**历史入口，有三种方式查看：

| 方式 | 操作 |
|------|------|
| **快捷键** | 在主页面按 **A** 键，跳到后台 `admin.html` |
| **直接访问** | 浏览器地址栏手动打 `admin.html`（或 `file://.../sue/admin.html`） |
| **DevTools** | F12 → Application 标签 → Storage → Local Storage → key `lottery:drawn:v1`，能直接看到 JSON 原始数据 |

### 后台功能
- 查看全部中奖记录（含时间戳）
- **导出 CSV**（Excel / 腾讯文档直接打开）
- 删单条记录（主持人误抽可用）
- **R 键** 一键重置（二次确认）

### 想要「本地自动写文件」
浏览器出于安全限制无法直接写磁盘，但可以：
1. 每轮抽完后，到 admin 页手动点「导出 CSV」→ 文件落到 `~/Downloads/`
2. 需要全自动备份：告诉我，我可以做成「每次归档后自动下载一次 CSV」

### localStorage 数据位置
- key: `lottery:drawn:v1`
- 格式：`[{ era: 'BC'|'AD', hex: 0x1-0x200, prize: 'first'|'second'|'third', time: ISO 字符串 }, ...]`
- 跨浏览器标签页共享（同一个 Chrome 配置），关浏览器也在，除非清 Cookie/站点数据

---

## 三、常见调参位置

### 1. 视觉颜色 / 字体 / 辉光
**文件**：`css/base.css` 顶部 `:root`
```css
--neon-cyan: #3df5ff;      /* 主青色辉光 */
--neon-violet: #a05cff;    /* 紫色辉光 */
--neon-pink: #ff3ea6;      /* 故障字 pink */
--bg-0 / --bg-1 / --bg-2   /* 背景渐变三色 */
```
改这几个 CSS 变量即可全局生效。

### 2. 主标题大小
**文件**：`css/base.css`
```css
.title-main { font-size: clamp(40px, 7vw, 108px); }
.title-sub  { font-size: clamp(14px, 1.6vw, 22px); }
```

### 3. 按钮
**文件**：`css/base.css` 的 `.btn`
- 字体：`font-size: clamp(14px, 1.3vw, 18px)`
- 内边距：`padding: clamp(14px, 1.6vh, 20px) clamp(24px, 3vw, 44px)`
- 颜色：`.btn` 青色描边 / `.btn.primary` 青色实底 / `.btn.violet` 紫色 / `.btn.danger` 红色

### 4. 一等奖大数字
**文件**：`css/lottery.css` 的 `.number-display`
```css
font-size: clamp(44px, 8vw, 128px);   /* 整体大小 */
.prefix  { font-size: 0.65em }          /* 「公元」字号占比 */
.suffix  { font-size: 0.6em  }          /* 「纪元」字号占比 */
```

### 5. 十连抽每格内部
**文件**：`css/lottery.css`
- 格子本身：`.cell`（背景、边框、padding、clip-path 八角斜切）
- 上行「公元 前/后」：`.cell-line-top`，字号 `clamp(18px, 2.2vw, 32px)`
- 下行「0x 1A3」：`.cell-line-bottom`，字号 `clamp(32px, 4.6vw, 68px)`
- 两行间距：`.cell-display { gap: clamp(4px, 0.6vh, 10px) }`
- 格子间距：`.grid-10 { gap: clamp(10px, 1.3vw, 18px) }`

### 6. Reel（滚轮）
**文件**：`css/lottery.css` 的 `.era-reel / .hex-reel`
- 高度：`height: 1.25em` （**务必 ≥ 1.2em，否则字形会被 overflow 裁掉**）
- 单个 hex 列宽度：`.hex-reel { width: 0.72em }`
- era 列宽度：`.era-reel { width: 1.15em }`（容纳中文「前/后」）

### 7. 滚动速度 / 动画时长
**文件**：`js/roller.js`
- `EraReel.prototype.start`: `this.speed = 25 + Math.random() * 10;` （像素/帧）
- `HexReel.prototype.start`: `this.speed = (baseSpeed || 30) + Math.random() * 12;`
- 停止缓动时长：`EraReel.stopAt` 里 `dur = 900`、`HexReel.stopAt` 里 `dur = 1100`（毫秒）
- 缓动曲线：`const ease = t => 1 - Math.pow(1 - t, 3);` （ease-out-cubic，可换）

### 8. 十连抽停止顺位间隔
**文件**：`js/ten.js`
```js
const baseDelay = i * 80;                              // 每格差 80ms（左上到右下）
promises.push(c.era.stopAt(n.era, baseDelay));
promises.push(c.hex[j].stopAt(d, baseDelay + 80 + j * 120));  // 位内三位差 120ms
```
- 改成「所有格同时停」→ 把 `i * 80` 改 0
- 改成「位内同时停」→ 把 `j * 120` 改 0

### 9. 粒子（一等奖揭晓后）
**文件**：`js/single.js` 的 `celebrate()`
- 粒子数量：`for (let i = 0; i < 120; i++)` 改数字
- **文件**：`css/lottery.css` 的 `@keyframes fall` 调落下轨迹

### 10. 号码范围
**文件**：`js/hex.js` 顶部
```js
const MAX = 0x200;  // 每侧最大值。总池子 = MAX * 2 = 1024
```

### 11. 奖项数量（校验上限）
**文件**：`index.html` 底部 `<script>` 里的 `updateStatus()`，只影响主页提示文字，不影响抽奖逻辑本身。

---

## 四、开发者 Console 常用命令

在 DevTools Console 里输入（任何页面都可）：

```js
// 查看全部历史
JSON.parse(localStorage.getItem('lottery:drawn:v1'))

// 查看剩余池大小
State.remaining()

// 统计各奖项已抽数
State.count('first')
State.count('second')
State.count('third')

// 模拟抽掉 1000 个号码来测试边界
for (let i = 0; i < 1000; i++) State.markDrawn(Hex.pickOne(State.drawnSet()), 'third')

// 一键重置（危险）
State.reset()

// 导出 CSV 到控制台
console.log(State.toCSV())
```

---

## 五、故障排查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| Cell 里字被切掉 | reel 高度 < 字号 | 检查 `.era-reel / .hex-reel` 的 `height: 1.25em` 是否被覆盖 |
| 按空格没反应 | 焦点不在页面（比如 DevTools） | 点击一下页面空白处再按空格 |
| 滚动一帧一顿 | GPU 加速失效 | 重启 Chrome 或加 `will-change: transform`（已加） |
| 刷新后历史丢失 | 用了「隐私模式」 | 改用普通窗口；或把 localStorage 改成 IndexedDB（需改 `state.js`） |
| 投影颜色偏色 | 投影机色温偏冷/暖 | 改 `:root` 里的 `--neon-cyan/violet` 值 |
| 同一号码出现两次 | 不可能，但若万一 | 去 admin 页查；`State.drawnSet()` 基于完整记录去重，除非手动改了 localStorage |

---

## 六、目录快速定位

```
sue/
├── index.html          主页入口（改按钮、快捷键）
├── draw-single.html    一等奖页面（改 DOM 结构）
├── draw-ten.html       十连抽页面
├── admin.html          后台管理（改表格 / 导出逻辑）
│
├── css/
│   ├── base.css        全局样式、:root 变量、按钮、标题、故障字
│   └── lottery.css     Reel、cell、粒子、历史表
│
└── js/
    ├── hex.js          号码池 & 格式化（改号码范围）
    ├── state.js        localStorage（改存储 key、导出 CSV 格式）
    ├── roller.js       滚动动画（改速度、缓动、时长）
    ├── single.js       一等奖流程（改阶段逻辑、粒子）
    └── ten.js          十连抽流程（改顺位停止、cell HTML）
```
