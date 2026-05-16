/**
 * lib.js — JRFライブラリ JS実装
 *
 * stacklib / stdlib / ctrllib の核心機能を JavaScript に移植。
 *
 * 設計方針:
 *   - GOSUB @PUSH_R / GOSUB @POP_R パターン → 関数引数・戻り値に直接変換
 *   - グローバルレジスタ (R, R$, RT$, RR$, RA$, RN) を state オブジェクトで管理
 *   - CON_PRINT のエスケープシーケンスを JS で再現
 *   - POPUP_MNU_RA はシングルクリックで確定（DS文化のダブルクリックを廃止）
 */

'use strict';

import {
  SCREEN_U, SCREEN_L, GRP_W, GRP_H, CON_W, CON_H, FONT_W, FONT_H, beep, BEEP_POPUP, BEEP_SELECT, BEEP_CLICK, BEEP_CANCEL,
  gfill, gbox, palColor, bgPalColor, spPalColor,
  touch, getTouchEvent, clearTouchQueue, button,
  vsync, BTN_A, BTN_B, BTN_UP, BTN_DOWN, BTN_LEFT, BTN_RIGHT, BTN_X, BTN_Y, BTN_START, BTN_L, BTN_R,
} from './emu.js';

// ============================================================
// グローバルレジスタ (stacklib 相当)
// ============================================================
export const reg = {
  R: 0, R$: '', RT$: 'NONE', RN: 0,
  RR$: new Array(64).fill(''),
  RA$: Array.from({length:64}, () => ['','']),
};

// ============================================================
// コンソール状態 (stdlib)
// ============================================================
export const conState = {
  // クリッピング: [上画面, 下画面]
  clipCX: [0, 0], clipCY: [0, 0],
  clipCW: [CON_W, CON_W], clipCH: [CON_H, CON_H],
  lastCX: [0, 0], lastCY: [0, 0],
  // 現在の文字色・背景色
  col:   [15, 14],  // 上=白, 下=黒
  bgCol: [0,  0],
  // CON_DECORATEフラグ（スーツ記号に自動色付け）
  decorate: true,
};

// DECORATE_CHARS$ / DECORATE_COLS$（trtconst.prg準拠）
// ♠=2(青) ♦=3(金) ♥=4(赤) ♣=5(緑) ✚=2 ★=3 ♩=6 ♫=6 →←↑↓=7 等
const DECORATE_MAP = {
  '♠': 2, '♦': 3, '♥': 4, '♣': 5,
  '✚': 2, '★': 3, '♩': 6, '♫': 6,
  '→': 7, '←': 7, '↑': 7, '↓': 7,
  'Ⓐ': 4,  // A=赤
  'Ⓑ': 3,  // B=黄(GOLD)
  'Ⓧ': 2,  // X=青
  'Ⓨ': 5,  // Y=緑
};

// 名前付き文字 \N[NAME] → 文字
const CHR_NAME = {
  SQ:"'", DQ:'"', YEN:'¥', TILDA:'~', BACKSLASH:'\\',
  A:'Ⓐ', B:'Ⓑ', X:'Ⓧ', Y:'Ⓨ', L:'Ⓛ', R:'Ⓡ',
  CROSS:'✚', STAR:'★', NOTE:'♩', NOTE2:'♫',
  RIGHT:'→', LEFT:'←', UP:'↑', DOWN:'↓',
  BOX:'■', CIRCLE:'●', TRIANGLE:'▲',
  SPADE:'♠', DIA:'♦', HEART:'♥', CLUB:'♣',
};

// ============================================================
// コンソール描画キャンバス参照
// ============================================================
let _cvU, _cvL, _ctxU, _ctxL;
export const CON_SCALE = 2;  // CON canvasの解像度倍率（文字を鮮明に）

export function libInit(upperCanvas, lowerCanvas) {
  _cvU = upperCanvas; _cvL = lowerCanvas;
  _ctxU = _cvU.getContext('2d'); _ctxL = _cvL.getContext('2d');
  // CON canvasはスムージングON（アンチエイリアスで文字を鮮明に）
  _ctxU.imageSmoothingEnabled = true;
  _ctxL.imageSmoothingEnabled = true;
}

function _conCtx(disp) {
  return disp === SCREEN_U ? _ctxU : _ctxL;
}
export function conCtxL() { return _ctxL; }  // render.jsのdisplayTlnNum用

/** 1文字をCanvas上のコンソール座標(cx,cy)に描画 */
function _putChar(disp, cx, cy, ch, fgIdx, bgIdx) {
  const ctx = _conCtx(disp);
  const cs = conState;
  const FW = FONT_W * CON_SCALE;  // = 16px
  const FH = FONT_H * CON_SCALE;  // = 16px
  const x = cx * FW, y = cy * FH;
  ctx.save();
  // Canvas clipでclip領域外への描画を防ぐ
  ctx.beginPath();
  ctx.rect(
    cs.clipCX[disp] * FW, cs.clipCY[disp] * FH,
    cs.clipCW[disp] * FW, cs.clipCH[disp] * FH
  );
  ctx.clip();
  // 背景色
  if (bgIdx > 0) {
    const bg = palColor(bgIdx);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(x, y, FW, FH); }
  }
  // 文字描画: 実際の文字幅を測ってFW(16px)に収まるようスケール
  const fg = (fgIdx && palColor(fgIdx)) || '#ffffff';  // 0=透明→白
  ctx.fillStyle = fg;
  ctx.font = `bold ${FH}px monospace`;
  ctx.textBaseline = 'top';
  const measured = ctx.measureText(ch).width;
  if (measured > FW) {
    ctx.translate(x, y);
    ctx.scale(FW / measured, 1);
    ctx.fillText(ch, 0, 0);
  } else {
    ctx.fillText(ch, x, y);
  }
  ctx.restore();
}

// ============================================================
// CON_PRINT (stdlib.prg @CON_PRINT の JS移植)
// ============================================================
/**
 * CON_PRINT(disp, cx, cy, s, params=[])
 *
 * エスケープシーケンス:
 *   \\ → バックスラッシュ
 *   \n → 改行 (CY++, CX=CLIP_CX)
 *   \t → タブ
 *   \0 → 無視
 *   \xNN → 16進文字コード
 *   \cN  → 文字色変更 (1桁16進)
 *   \cR  → 文字色リストア
 *   \CN  → 背景色変更
 *   \CR  → 背景色リストア
 *   \N[NAME] → 名前付き文字
 *   \[I]     → params[I] に置換
 *   \B[X]    → ボタン記号（スキップ）
 *
 * @param {number} disp  0=上画面, 1=下画面
 * @param {number} cx    開始コンソールX
 * @param {number} cy    開始コンソールY
 * @param {string} s     出力文字列
 * @param {string[]} params  \[I]置換用
 */
export function conPrint(disp, cx, cy, s, params = []) {
  const cs = conState;
  let col   = cs.col[disp];
  let bgCol = cs.bgCol[disp];
  let colQ  = false;  // 色固定中

  // クリップ領域
  const clipX = cs.clipCX[disp], clipY = cs.clipCY[disp];
  const clipW = cs.clipCW[disp], clipH = cs.clipCH[disp];

  function putStr(str) {
    for (const ch of str) {
      const code = ch.codePointAt(0);
      if (code === 13 || code === 10) { cy++; cx = clipX; continue; }
      if (code === 9) { cx = Math.floor((cx + 4) / 4) * 4; continue; }
      // クリップチェック
      if (cx < clipX || cy < clipY || cx >= clipX + clipW || cy >= clipY + clipH) {
        cx++; if (cx >= clipX + clipW) { cx = clipX; cy++; } continue;
      }
      // DECORATE
      const dCol = (cs.decorate && !colQ) ? DECORATE_MAP[ch] : undefined;
      _putChar(disp, cx, cy, ch, dCol !== undefined ? dCol : col, bgCol);
      cx++;
      if (cx >= clipX + clipW) { cx = clipX; cy++; }
    }
  }

  let i = 0;
  while (i < s.length) {
    if (s[i] !== '\\') {
      // 非エスケープ文字を集めて一括出力
      let j = i;
      while (j < s.length && s[j] !== '\\') j++;
      putStr(s.slice(i, j));
      i = j;
      continue;
    }
    i++;  // \ を消費
    if (i >= s.length) { putStr('\\'); break; }
    const esc = s[i]; i++;
    if (esc === '\\') { putStr('\\'); }
    else if (esc === 'n') { cy++; cx = clipX; }
    else if (esc === 't') { cx = Math.floor((cx + 4) / 4) * 4; }
    else if (esc === '0') { /* 無視 */ }
    else if (esc === 'x' || esc === 'X') {
      const hex = s.slice(i, i+2); i += 2;
      const code = parseInt(hex, 16);
      if (!isNaN(code)) putStr(String.fromCodePoint(code));
    }
    else if (esc === 'c') {
      const n = s[i]; i++;
      if (n === 'R') { col = cs.col[disp]; colQ = false; }
      else { const v = parseInt(n, 16); if (!isNaN(v)) { col = v; colQ = true; } }
    }
    else if (esc === 'C') {
      const n = s[i]; i++;
      if (n === 'R') bgCol = cs.bgCol[disp];
      else { const v = parseInt(n, 16); if (!isNaN(v)) bgCol = v; }
    }
    else if (esc === 'N') {
      // \N[NAME]
      if (s[i] === '[') {
        i++;
        const end = s.indexOf(']', i);
        if (end !== -1) {
          const name = s.slice(i, end); i = end + 1;
          putStr(CHR_NAME[name] || `\\N[${name}]`);
        }
      }
    }
    else if (esc === 'B') {
      // \B[X] — ボタン記号（名前付き文字として処理）
      if (s[i] === '[') {
        i++;
        const end = s.indexOf(']', i);
        if (end !== -1) {
          const name = s.slice(i, end); i = end + 1;
          putStr(CHR_NAME[name] || `[${name}]`);
        }
      }
    }
    else if (esc === '[') {
      // \[I] → params[I]
      const end = s.indexOf(']', i);
      if (end !== -1) {
        const idx = parseInt(s.slice(i, end)); i = end + 1;
        if (!isNaN(idx) && idx >= 0 && idx < params.length) putStr(params[idx]);
      }
    }
    else if (esc === 'S') {
      // \S — スペース飾りなし（無視）
    }
    else {
      putStr('\\' + esc);
    }
  }

  cs.lastCX[disp] = cx;
  cs.lastCY[disp] = cy;
}

/** CON_PRINT_L: 前のconPrintの終端(lastCX/lastCY)から続けて表示
 * PRG @CON_PRINT_L 相当: LAST_CX[1]/LAST_CY[1]から続けてCON_PRINT
 */
export function conPrintL(disp, s, params = []) {
  const cs = conState;
  const cx = cs.lastCX[disp];
  const cy = cs.lastCY[disp];
  conPrint(disp, cx, cy, s, params);
}

/** CON_CLS: コンソール領域を背景色で塗りつぶす */
export function conCls(disp) {
  const cs = conState;
  const ctx = _conCtx(disp);
  // CON canvasは独立層なのでclearRectで完全消去
  // メニュー等でbgColが指定されている場合は塗りつぶし
  const bgIdx = cs.bgCol[disp];
  const FW = FONT_W * CON_SCALE, FH = FONT_H * CON_SCALE;
  const x = cs.clipCX[disp] * FW, y = cs.clipCY[disp] * FH;
  const w = cs.clipCW[disp] * FW, h = cs.clipCH[disp] * FH;
  ctx.clearRect(x, y, w, h);
  if (bgIdx > 0) {
    const bgCol = palColor(bgIdx);
    if (bgCol) { ctx.fillStyle = bgCol; ctx.fillRect(x, y, w, h); }
  }
  cs.lastCX[disp] = cs.clipCX[disp];
  cs.lastCY[disp] = cs.clipCY[disp];
}

/** PRINT_SIZE_R: 文字列の描画幅・高さを返す（POPUP_MNU_RA用）*/
export function printSizeR(s, maxW = CON_W) {
  // エスケープを除いた実際の文字幅を計算
  const stripped = s.replace(/\\[nNBcCx0\\](\[[^\]]*\])?/g, '')
                    .replace(/\\[xX][0-9A-Fa-f]{2}/g, '?')
                    .replace(/\\S/g, '');
  const w = Math.min(stripped.length, maxW);
  const lines = Math.ceil(stripped.length / maxW);
  return { w, h: lines };
}

// ============================================================
// クリッピングウィンドウ (PUSH_CWIN / POP_CWIN)
// ============================================================
const _cwinStack = [[], []];

export function pushCwin(disp, cx, cy, cw, ch) {
  const cs = conState;
  _cwinStack[disp].push({
    clipCX: cs.clipCX[disp], clipCY: cs.clipCY[disp],
    clipCW: cs.clipCW[disp], clipCH: cs.clipCH[disp],
  });
  cs.clipCX[disp] = cx; cs.clipCY[disp] = cy;
  cs.clipCW[disp] = cw; cs.clipCH[disp] = ch;
}

export function popCwin(disp) {
  const cs = conState;
  const prev = _cwinStack[disp].pop();
  if (prev) {
    // メニュー領域をclearRect（透明に戻す）
    // 角丸ボーダーも消えるよう1px余裕を持ってクリア
    const ctx = _conCtx(disp);
    if (ctx) {
      const FW = FONT_W * CON_SCALE, FH = FONT_H * CON_SCALE;
      const cx = cs.clipCX[disp], cy = cs.clipCY[disp];
      const cw = cs.clipCW[disp], ch = cs.clipCH[disp];
      // 角丸strokeが1pxはみ出す可能性があるので2px拡張してクリア
      ctx.clearRect(cx * FW - 2, cy * FH - 2, cw * FW + 4, ch * FH + 4);
    }
    cs.clipCX[disp] = prev.clipCX; cs.clipCY[disp] = prev.clipCY;
    cs.clipCW[disp] = prev.clipCW; cs.clipCH[disp] = prev.clipCH;
  }
}

// ============================================================
// ポップアップメニューウィンドウ描画（OPEN_MSG_WIN相当）
// ============================================================
function _drawMenuBox(disp, cx, cy, cw, ch) {
  const ctx = _conCtx(disp);
  const FW = FONT_W * CON_SCALE, FH = FONT_H * CON_SCALE;
  const x = cx * FW, y = cy * FH;
  const w = cw * FW, h = ch * FH;
  const r = 6;  // 角丸半径

  // 角丸矩形パス
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();

  // 白背景
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // 灰色ボーダー（細め）
  ctx.strokeStyle = '#aaaaaa';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ============================================================
// POPUP_MNU_RA — ポップアップメニュー
// ============================================================
/**
 * RA$配列から選択メニューを表示し、選択された値を返す。
 * シングルクリックで確定（DS版のダブルクリック廃止）。
 *
 * @param {Array<[string,string]>} items  [[表示文字列, 値], ...]
 * @param {object} [opts]
 * @param {number} [opts.cw]  幅(-1=自動)
 * @param {number} [opts.ch]  高さ(-1=自動)
 * @param {number} [opts.disp] 表示画面(1=下画面)
 * @returns {Promise<string>} 選択された値 ('NONE'=キャンセル)
 */
export async function popupMenu(items, opts = {}) {
  beep(BEEP_POPUP);  // ctrllib.prg: BEEP BEEP_POPUP
  const disp = opts.disp ?? SCREEN_L;
  const cs = conState;
  // PRG準拠: popupMenuは常に全画面clipで表示
  // pushCwinで現在のclipを保存してから全画面clipに切り替え
  const savedClipX = cs.clipCX[disp], savedClipY = cs.clipCY[disp];
  const savedClipW = cs.clipCW[disp], savedClipH = cs.clipCH[disp];
  cs.clipCX[disp] = 0; cs.clipCY[disp] = 0;
  cs.clipCW[disp] = CON_W; cs.clipCH[disp] = CON_H;
  const clipX = 0, clipY = 0, clipW = CON_W, clipH = CON_H;

  const btnItems  = items.filter(([label]) => label.startsWith('\\B['));
  const menuItems = items.filter(([label]) => !label.startsWith('\\B['));

  let cw = opts.cw ?? -1, ch = opts.ch ?? -1;
  if (cw <= 0) {
    cw = menuItems.reduce((m, [label]) => {
      const clean = label.replace(/\\[^[]/g,'').replace(/\\\[.*?\]/g,'');
      return Math.max(m, clean.length + 2);
    }, 8);
    cw = Math.min(cw, clipW - 2);
  }
  if (ch <= 0) { ch = Math.min(menuItems.length * 2 + 1, clipH); }

  let menuCX = Math.max(clipX, clipX + Math.floor((clipW - cw) / 2));
  let menuCY = Math.max(clipY, clipY + Math.floor((clipH - ch) / 2));

  pushCwin(disp, menuCX, menuCY, cw, ch);

  let cursor = -1;  // キーボード操作時のみ使用
  let kbMode = false;

  const render = () => {
    _drawMenuBox(disp, menuCX, menuCY, cw, ch);
    menuItems.forEach(([label], i) => {
      const isHighlit = kbMode && i === cursor;
      const cy = menuCY + 1 + i * 2, cx = menuCX + 1;
      if (isHighlit) {
        const ctx = _conCtx(disp);
        ctx.fillStyle = palColor(2) || '#0000aa';
        { const FW=FONT_W*CON_SCALE,FH=FONT_H*CON_SCALE;
          ctx.fillRect(cx*FW, cy*FH, (cw-2)*FW, FH); }
      }
      const fgSave = cs.col[disp];
      cs.col[disp] = isHighlit ? 15 : cs.col[disp];
      conPrint(disp, cx, cy, label);
      cs.col[disp] = fgSave;
    });
  };

  clearTouchQueue();
  render();

  return new Promise(resolveOrig => {
    // resolve時にclipを復元するラッパー
    const resolve = (val) => {
      cs.clipCX[disp] = savedClipX; cs.clipCY[disp] = savedClipY;
      cs.clipCW[disp] = savedClipW; cs.clipCH[disp] = savedClipH;
      resolveOrig(val);
    };
    const check = async () => {
      while (true) {
        await vsync(1);
        const btn = button(2);

        // キーボード操作: ↑↓でハイライト移動、Enterで確定
        if (btn & BTN_UP) {
          kbMode = true;
          cursor = cursor <= 0 ? menuItems.length - 1 : cursor - 1;
          beep(BEEP_SELECT);
          render(); continue;
        }
        if (btn & BTN_DOWN) {
          kbMode = true;
          cursor = (cursor + 1) % menuItems.length;
          beep(BEEP_SELECT);
          render(); continue;
        }
        if ((btn & BTN_A) && kbMode && cursor >= 0) {
          beep(BEEP_CLICK);
          popCwin(disp);
          resolve(menuItems[cursor]?.[1] ?? 'NONE');
          return;
        }
        if (btn & BTN_B) {
          const bBtn = btnItems.find(([l]) => l.includes('[B]'));
          if (bBtn) { beep(BEEP_CANCEL); popCwin(disp); resolve(bBtn[1]); return; }
          popCwin(disp); resolve('NONE'); return;
        }
        // Y/X/STARTボタン: btnItemsに登録があれば即座に返す（Aボタンより優先）
        const hwMap = { Y: BTN_Y, X: BTN_X, START: BTN_START, L: BTN_L, R: BTN_R };
        for (const [btnName, btnBit] of Object.entries(hwMap)) {
          if (btn & btnBit) {
            const found = btnItems.find(([l]) => l.includes(`[${btnName}]`));
            if (found) { beep(BEEP_CLICK); popCwin(disp); resolve(found[1]); return; }
          }
        }

        // タッチ拡張: \B[touch(screen,x,y,w,h)] でGRP座標タッチ判定
        const ev = getTouchEvent();
        if (ev) {
          // touch拡張ボタン: \B[touch(screen,x,y,w,h)]
          for (const [label, val] of btnItems) {
            const m = label.match(/^\\B\[touch\((\d+),(\d+),(\d+),(\d+),(\d+)\)\]$/);
            if (m) {
              const [, sc, tx, ty, tw, th] = m.map(Number);
              if (ev.screen === sc && ev.x >= tx && ev.x < tx+tw && ev.y >= ty && ev.y < ty+th) {
                beep(BEEP_CLICK); popCwin(disp); resolve(val); return;
              }
            }
          }

          // 通常タッチ: メニュー項目クリック（同画面のみ）
          if (ev.screen === disp) {
            const tx = Math.floor(ev.x / FONT_W);
            const ty = Math.floor(ev.y / FONT_H);
            for (let i = 0; i < menuItems.length; i++) {
              const itemY = menuCY + 1 + i * 2;
              if (ty === itemY && tx >= menuCX + 1 && tx < menuCX + cw - 1) {
                beep(BEEP_CLICK);
                popCwin(disp);
                resolve(menuItems[i][1]);
                return;
              }
            }
          }
        }
      }
    };
    check();
  });
}


export class TchCtrl {
  constructor() { this._entries = []; }

  /** タッチ可能領域を追加 */
  add(x, y, w, h, val, screen = SCREEN_L) {
    this._entries.push({x, y, w, h, val, screen});
  }

  /** タッチイベントを確認 → 値またはnull */
  check() {
    const ev = getTouchEvent();
    if (!ev) return null;
    for (const e of this._entries) {
      if (ev.screen === e.screen &&
          ev.x >= e.x && ev.x < e.x + e.w &&
          ev.y >= e.y && ev.y < e.y + e.h) {
        return { val: e.val, x: ev.x, y: ev.y };
      }
    }
    return null;
  }

  clear() { this._entries = []; }
}

// ============================================================
// MNU_CTRL — コンソール領域ベースのクリック管理
// ============================================================
/**
 * @typedef {Object} MnuEntry
 * @property {number} cx, cy, cw, ch  コンソール座標
 * @property {string} val
 */

export class MnuCtrl {
  constructor() {
    this._entries = [];
    this._buttons = {};  // 'B','L','R' → val
    this._cursor = 0;  // 現在のカーソル位置
  }

  /** コンソール座標でクリック領域を登録 */
  add(cx, cy, cw, ch, val, screen = SCREEN_L) {
    const px = cx * FONT_W, py = cy * FONT_H;
    this._entries.push({
      cx, cy, cw, ch,
      x: px, y: py, w: cw * FONT_W, h: ch * FONT_H,
      val, screen,
    });
  }

  /** ナビボタン (B/L/R) に値を割り当て */
  setButton(dir, val) { this._buttons[dir] = val; }

  /** カーソル移動時に呼ぶ再描画コールバックを設定 */
  setOnRedraw(fn) { this._onRedraw = fn; }

  /** キーボードボタンに値を割り当て (BUTTON名→値) */
  setHwButton(btnName, val) { this._hwButtons = this._hwButtons || {}; this._hwButtons[btnName] = val; }

  /** カーソル位置のエントリをハイライト描画 */
  _highlight(idx, on) {
    const e = this._entries[idx];
    if (!e) return;
    const marker = on ? '▶' : ' ';
    // clip を気にせず描画できるよう全面clipで描く
    const cs = conState;
    const s = e.screen;
    const [ox,oy,ow,oh] = [cs.clipCX[s],cs.clipCY[s],cs.clipCW[s],cs.clipCH[s]];
    cs.clipCX[s]=0; cs.clipCY[s]=0; cs.clipCW[s]=CON_W; cs.clipCH[s]=CON_H;
    if (e.cx > 0) conPrint(s, e.cx - 2, e.cy, marker);
    else conPrint(s, 0, e.cy, marker);
    cs.clipCX[s]=ox; cs.clipCY[s]=oy; cs.clipCW[s]=ow; cs.clipCH[s]=oh;
  }

  /** イベントを確認 */
  check() {
    const btn = button(2);
    if (btn & BTN_B && this._buttons['B']) return this._buttons['B'];
    if (btn & BTN_LEFT && this._buttons['L']) return this._buttons['L'];
    if (btn & BTN_RIGHT && this._buttons['R']) return this._buttons['R'];

    // タッチ（上下画面どちらも）
    const ev = getTouchEvent();
    if (!ev) return null;
    for (const e of this._entries) {
      if (ev.x >= e.x && ev.x < e.x + e.w &&
          ev.y >= e.y && ev.y < e.y + e.h) {
        return e.val;
      }
    }
    return null;
  }

  /** ループ: 選択されるまで待つ（上下キー・beep対応） */
  async loop() {
    clearTouchQueue();
    let prevBtn = 0;
    // 初期ハイライト
    this._highlight(this._cursor, true);
    while (true) {
      await vsync(1);
      const btn = button(2);
      const pressed = btn & ~prevBtn;
      prevBtn = btn;

      // Bボタン
      if (pressed & BTN_B && this._buttons['B']) {
        beep(BEEP_CANCEL);
        this._highlight(this._cursor, false);
        return this._buttons['B'];
      }

      // 上下左右キー: カーソル移動（左右も上下と同じ）
      if (pressed & (BTN_UP | BTN_LEFT)) {
        this._highlight(this._cursor, false);
        this._cursor = (this._cursor - 1 + this._entries.length) % this._entries.length;
        if (this._onRedraw) this._onRedraw(); else this._highlight(this._cursor, true);
        beep(BEEP_SELECT);
        continue;
      }
      if (pressed & (BTN_DOWN | BTN_RIGHT)) {
        this._highlight(this._cursor, false);
        this._cursor = (this._cursor + 1) % this._entries.length;
        if (this._onRedraw) this._onRedraw(); else this._highlight(this._cursor, true);
        beep(BEEP_SELECT);
        continue;
      }

      // Aボタン: 現在カーソルのエントリを選択
      if (pressed & BTN_A) {
        const e = this._entries[this._cursor];
        if (e) {
          beep(BEEP_CLICK);
          this._highlight(this._cursor, false);
          return e.val;
        }
      }

      // タッチ
      const ev = getTouchEvent();
      if (ev) {
        for (let i = 0; i < this._entries.length; i++) {
          const e = this._entries[i];
          if (ev.x >= e.x && ev.x < e.x + e.w &&
              ev.y >= e.y && ev.y < e.y + e.h) {
            beep(BEEP_CLICK);
            this._highlight(this._cursor, false);
            return e.val;
          }
        }
        beep(BEEP_CANCEL);
      }
    }
  }

  clear() { this._entries = []; this._buttons = {}; this._cursor = 0; }
}

// ============================================================
// WAIT_CLICK — 汎用クリック待ち (CHECK_CLICK相当)
// ============================================================
/**
 * 指定フレーム数待ちつつタッチを監視。
 * @param {number} frames 最大待機フレーム数 (0=無限)
 * @param {TchCtrl|MnuCtrl} [ctrl] 監視するコントローラ
 * @returns {Promise<string|null>}
 */
export async function waitClick(frames = 0, ctrl = null) {
  let f = frames;
  while (true) {
    await vsync(1);
    if (ctrl) {
      const val = ctrl.check();
      if (val !== null) return val;
    } else {
      const ev = getTouchEvent();
      if (ev) return 'CLICK';
    }
    if (frames > 0) {
      f--;
      if (f <= 0) return null;
    }
  }
}

// ============================================================
// メッセージウィンドウ (OPEN_MSG_WIN相当)
// ============================================================
/**
 * シンプルなメッセージウィンドウを表示してOKを待つ
 * @param {string} msg
 * @param {number} [disp]
 */
export async function msgWin(msg, disp = SCREEN_L) {
  const cs = conState;
  const clipX = cs.clipCX[disp], clipY = cs.clipCY[disp];
  const clipW = cs.clipCW[disp], clipH = cs.clipCH[disp];

  const lines = msg.split('\n').map(l => l.trim());
  const cw = Math.min(Math.max(...lines.map(l => l.length)) + 4, clipW - 2);
  const ch = lines.length + 4;
  const cx = clipX + Math.floor((clipW - cw) / 2);
  const cy = clipY + Math.floor((clipH - ch) / 2);

  _drawMenuBox(disp, cx, cy, cw, ch);
  lines.forEach((line, i) => conPrint(disp, cx + 2, cy + 1 + i, line));

  clearTouchQueue();
  await waitClick(0);
}

// ============================================================
// SAVE / LOAD (localStorage)
// ============================================================
const SAVE_KEY = 'youscout_ptc_';

export function saveSettings(settings) {
  try { localStorage.setItem(SAVE_KEY + 'settings', JSON.stringify(settings)); } catch(_) {}
}
export function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY + 'settings') || 'null'); } catch(_) { return null; }
}
export function saveGame(slot, data) {
  try { localStorage.setItem(SAVE_KEY + 'save' + slot, JSON.stringify(data)); } catch(_) {}
}
export function loadGame(slot) {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY + 'save' + slot) || 'null'); } catch(_) { return null; }
}

// ============================================================
// 文字列ユーティリティ (stdlib相当)
// ============================================================
/** INSTR(s, sub, start=0) → インデックス (-1=なし) */
export function instr(s, sub, start = 0) { return s.indexOf(sub, start); }

/** MID$(s, start, len) */
export function mid$(s, start, len) { return s.substr(start, len); }

/** FLOOR(x) */
export function floor(x) { return Math.floor(x); }

/** STR$(n) */
export function str$(n) { return String(n); }

/** VAL(s) */
export function val(s) { return parseFloat(s) || 0; }

/** SUBST$(s, pos, len, rep) — pos文字目からlen文字をrepで置換 */
export function subst$(s, pos, len, rep) {
  return s.slice(0, pos) + rep + s.slice(pos + len);
}

/** LEN(s) */
export function len(s) { return s.length; }

// ============================================================
// SARRAY (カンマ区切り文字列配列) ユーティリティ
// ============================================================
/** SARRAY を配列に変換 */
export function sarrayToArray(s) { return s ? s.split(',') : []; }
/** 配列を SARRAY に変換 */
export function arrayToSarray(arr) { return arr.join(','); }
/** SARRAY の n番目要素を取得 */
export function nthSr(s, n) { return sarrayToArray(s)[n] ?? ''; }

// ============================================================
// SHUFFLE_CARDS (youscout.prg @SHUFFLE_CARDS 相当)
// ============================================================
/**
 * カード文字列配列をシャッフル
 * @param {string[]} cards
 * @returns {string[]}
 */
export function shuffleCards(cards) {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ============================================================
// MEM$ 相当 (youscout.prg ↔ yschelp.html 連携)
// ============================================================
/** EXEC "YSCHELP" 相当: yschelp.html に遷移して戻ってくる */
export function execYschelp(lang = 'EN') {
  // 現在の状態をlocalStorageに保存してから遷移
  sessionStorage.setItem('youscout_return', location.href);
  location.href = `yschelp.html?lang=${lang}`;
}
