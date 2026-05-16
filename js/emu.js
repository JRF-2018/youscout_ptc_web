/**
 * emu.js — SmileBASIC (プチコンmkII) エミュレーション層
 *
 * カバー範囲:
 *   Canvas描画: GCLS, GFILL, GLINE, GBOX, GCOPY, GPSET, GPUTCHR, GPAGE
 *   SPRITE:     SPSET, SPOFS, SPCHR, SPCLR, SPANGLE, SPSCALE, SPHOME
 *   BG:         BGPUT, BGOFS, BGCLR, BGFILL, BGPAGE
 *   コンソール: LOCATE, COLOR, PRINT (CON_PRINT相当)
 *   パレット:   COLSET, CMAP
 *   入力:       タッチ/クリック/キーボード → TCH*, BUTTON()
 *   BGM/SE:     Tone.jsベース MML簡易再生
 *   VSYNC:      requestAnimationFrameベース
 */

'use strict';

// ============================================================
// 定数
// ============================================================
export const GRP_W = 256;
export const GRP_H = 192;
export const CON_W = 32;
export const CON_H = 24;
export const FONT_W = 8;
export const FONT_H = 8;

// 画面番号
export const SCREEN_U = 0;  // 上画面
export const SCREEN_L = 1;  // 下画面

// ============================================================
// Canvas セットアップ
// ============================================================
/** @type {HTMLCanvasElement} */
let cvU, cvL;
/** @type {CanvasRenderingContext2D} */
let ctxU, ctxL;

// GRP描画ページ (D_GPAGE=描画先, U/L_GPAGE=表示)
// プチコンはダブルバッファ的に使うが、Web版では単純に1つのcanvasで対応
let _gDrawScreen = SCREEN_U;  // 現在の描画対象画面

/**
 * emu初期化。HTMLにcanvasが必要。
 * @param {HTMLCanvasElement} upperCanvas
 * @param {HTMLCanvasElement} lowerCanvas
 */

function _spriteInit() {
  // _sprites は宣言時に初期化済み
}

function _bgInit() {
  // _bg は宣言時に初期化済み
}

// GRP canvas (background graphics)
let cvUgrp, cvLgrp, ctxUgrp, ctxLgrp;
// BGレイヤー別canvas: layer1=奥(固定BG), layer0=手前(可変BG)
let ctxUbg1, ctxUbg0, ctxLbg1, ctxLbg0;
// SPRITE canvas (sprite overlay, cleared each frame)
let cvUspr, cvLspr, ctxUspr, ctxLspr;


function _makeOverlayCanvas(refCanvas) {
  const cv = document.createElement('canvas');
  cv.width = GRP_W; cv.height = GRP_H;
  cv.style.cssText = `position:absolute;top:0;left:0;width:${refCanvas.style.width || '100%'};height:${refCanvas.style.height || '100%'};image-rendering:pixelated;pointer-events:none;`;
  refCanvas.parentElement?.appendChild(cv);
  return cv;
}

export function emuInit(upperGrpCanvas, lowerGrpCanvas, upperConCanvas, lowerConCanvas) {
  // GRP層
  cvUgrp = upperGrpCanvas; cvLgrp = lowerGrpCanvas;
  ctxUgrp = cvUgrp.getContext('2d');
  ctxLgrp = cvLgrp.getContext('2d');
  ctxUgrp.imageSmoothingEnabled = false;
  ctxLgrp.imageSmoothingEnabled = false;
  // BGレイヤー別canvas
  const cvUbg1 = document.getElementById('cv-upper-bg1');
  const cvUbg0 = document.getElementById('cv-upper-bg0');
  const cvLbg1 = document.getElementById('cv-lower-bg1');
  const cvLbg0 = document.getElementById('cv-lower-bg0');
  if (cvUbg1) { ctxUbg1 = cvUbg1.getContext('2d'); ctxUbg1.imageSmoothingEnabled = false; }
  if (cvUbg0) { ctxUbg0 = cvUbg0.getContext('2d'); ctxUbg0.imageSmoothingEnabled = false; }
  if (cvLbg1) { ctxLbg1 = cvLbg1.getContext('2d'); ctxLbg1.imageSmoothingEnabled = false; }
  if (cvLbg0) { ctxLbg0 = cvLbg0.getContext('2d'); ctxLbg0.imageSmoothingEnabled = false; }

  // SPRITE専用canvas（GRPの上に重ねる、毎フレームクリア）
  cvUspr = document.getElementById('cv-upper-spr');
  cvLspr = document.getElementById('cv-lower-spr');
  if (!cvUspr) {
    // HTMLになければ動的生成
    cvUspr = _makeOverlayCanvas(upperGrpCanvas);
    cvLspr = _makeOverlayCanvas(lowerGrpCanvas);
  }
  ctxUspr = cvUspr.getContext('2d');
  ctxLspr = cvLspr.getContext('2d');
  ctxUspr.imageSmoothingEnabled = false;
  ctxLspr.imageSmoothingEnabled = false;

  // CON層はlib.jsが管理（upperConCanvas/lowerConCanvas）
  // 後方互換性のためcvU/cvLはGRP canvasを指す
  cvU = cvUgrp; cvL = cvLgrp;
  ctxU = ctxUgrp; ctxL = ctxLgrp;

  // 入力はGRP canvasとCON canvas両方に登録
  _inputInit(upperGrpCanvas, lowerGrpCanvas, upperConCanvas, lowerConCanvas);
  _spriteInit();
  _bgInit();
  _consoleInit();
}

function _ctx() { return _gDrawScreen === SCREEN_U ? ctxU : ctxL; }

// ============================================================
// パレット (COLSET / CMAP)
// ============================================================
// 256色テーブル。各エントリは '#rrggbb' または null(透明)
const _pal = new Array(256).fill(null);
// BGパレット: 16グループ×16色
const _bgPal = Array.from({length: 256}, () => null);
// SPパレット: 同上
const _spPal = Array.from({length: 256}, () => null);
// GRPパレット: 単純な256色テーブル（別名=_pal）

/**
 * JRFTAROT_CMAPの最初の16色を初期化（起動時）
 * trtconst.prgの CMAP$[i] に相当
 */
export function colmapInit(cmapEntries) {
  // cmapEntries: [{idx, rgb:'rrggbb'}, ...]
  for (const {idx, rgb} of cmapEntries) {
    _pal[idx] = rgb ? '#' + rgb : null;
    // BG/SPパレット: 各16グループにも同じ色を設定
    for (let g = 0; g < 16; g++) {
      _bgPal[g * 16 + idx] = _pal[idx];
      _spPal[g * 16 + idx] = _pal[idx];
    }
  }
}

/**
 * COLSET "BG"|"SP"|"GRP", palIdx, 'rrggbb'
 * palIdx: 0-15=通常パレット, 16-255=拡張パレット
 */
export function colset(plane, palIdx, rgb) {
  const color = rgb ? '#' + rgb : null;
  if (plane === 'GRP') {
    _pal[palIdx] = color;
  } else if (plane === 'BG') {
    _bgPal[palIdx] = color;
  } else if (plane === 'SP') {
    _spPal[palIdx] = color;
  }
}

/** GRPパレット色取得 */
export function palColor(idx) {
  if (idx === 0) return null;  // 0=透明（BGパレットの透明色）
  return _pal[idx] ?? null;
}

/** BGパレット: group=パレット番号(0-15), colorIdx=色インデックス(0-15) */
export function bgPalColor(group, colorIdx) {
  return _bgPal[group * 16 + colorIdx] ?? 'transparent';
}
export function spPalColor(group, colorIdx) {
  return _spPal[group * 16 + colorIdx] ?? 'transparent';
}

// ============================================================
// GPAGE: 描画対象画面の切り替え
// ============================================================
/** GPAGE screen, drawPage, showPage (drawPage/showPageは無視してscreenのみ) */
export function gpage(screen) { _gDrawScreen = screen; }

// ============================================================
// GRP描画命令
// ============================================================
/** GCLS [col] */
export function gcls(col = 0) {
  const ctx = _ctx();
  const color = _pal[col];
  if (color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, GRP_W, GRP_H);
  } else {
    ctx.clearRect(0, 0, GRP_W, GRP_H);
  }
}

/** GPSET x, y, col */
export function gpset(x, y, col) {
  const color = _pal[col]; if (!color) return;
  const ctx = _ctx();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

/** GFILL x, y, x2, y2, col */
export function gfill(x, y, x2, y2, col) {
  const color = _pal[col]; if (!color) return;
  const ctx = _ctx();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, x2 - x + 1, y2 - y + 1);
}

/** GBOX x, y, x2, y2, col */
export function gbox(x, y, x2, y2, col) {
  const color = _pal[col]; if (!color) return;
  const ctx = _ctx();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, x2 - x, y2 - y);
}

/** GLINE x, y, x2, y2, col */
export function gline(x, y, x2, y2, col) {
  const color = _pal[col]; if (!color) return;
  const ctx = _ctx();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y + 0.5);
  ctx.lineTo(x2 + 0.5, y2 + 0.5);
  ctx.stroke();
}

/**
 * GCOPY srcPage, sx, sy, ex, ey, dx, dy, transparent
 * Web版: srcPage は無視（Canvasは1枚）
 * transparent=false → 0番色(null/透明)をスキップ
 */
export function gcopy(srcScreen, sx, sy, ex, ey, dx, dy, transparent = false) {
  const srcCtx = srcScreen === SCREEN_U ? ctxU : ctxL;
  const dstCtx = _ctx();
  const sw = ex - sx + 1, sh = ey - sy + 1;
  if (transparent) {
    dstCtx.drawImage(srcCtx.canvas, sx, sy, sw, sh, dx, dy, sw, sh);
  } else {
    // コピー先を一時canvasに描画してαを保持
    dstCtx.drawImage(srcCtx.canvas, sx, sy, sw, sh, dx, dy, sw, sh);
  }
}

/**
 * GPUTCHR x, y, "BGU1", chrIdx, palGroup, scale
 * BGU1バンク(JRFTRT_B.png)から指定CHRを描画
 */
let _bgu1Image = null;  // JRFTRT_B.png
export function setBgu1Image(img) { _bgu1Image = img; }

export function gputchr(x, y, bank, chrIdx, palGroup, scale = 1) {
  if (bank !== 'BGU1' || !_bgu1Image) return;
  // JRFTRT_B.png: 32列×8行, 各8×8px
  const srcX = (chrIdx % 32) * 8;
  const srcY = Math.floor(chrIdx / 32) * 8;
  const ctx = _ctx();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_bgu1Image, srcX, srcY, 8, 8, x, y, 8 * scale, 8 * scale);
}

// ============================================================
// SPRITE 管理
// ============================================================
const MAX_SPRITES = 128;

// SPRITEシート画像 (SPU4-7)
const _spuImages = {};  // key: 4,5,6,7 → HTMLImageElement

export function setSpuImage(bankNo, img) { _spuImages[bankNo] = img; }
export function getSpuImage(bankNo) { return _spuImages[bankNo] || null; }

/**
 * SPRITEデータ
 * @typedef {Object} Sprite
 * @property {boolean} active
 * @property {number} chr     バンク込みCHR番号 (例: 7*64+0)
 * @property {number} pal     パレット番号
 * @property {boolean} hrev
 * @property {boolean} vrev
 * @property {number} pri     優先度 0-3
 * @property {number} w       幅px (8,16,32,64)
 * @property {number} h       高さpx
 * @property {number} x       表示X
 * @property {number} y       表示Y
 * @property {number} angle   角度(度)
 * @property {number} scale   スケール (100=等倍)
 * @property {number} homeX   原点X
 * @property {number} homeY   原点Y
 */

/** @type {Sprite[]} */
const _sprites = Array.from({length: MAX_SPRITES}, (_, i) => ({
  no: i,  // SPRITE番号
  active: false, chr: 0, pal: 0,
  hrev: false, vrev: false, pri: 2,
  w: 16, h: 16,
  x: -1024, y: -1024,
  angle: 0, scale: 100,
  homeX: 0, homeY: 0,
  screen: SCREEN_U,
  imgOfsX: 0, imgOfsY: 0,
  _targetX: null, _targetY: null, _targetAngle: null, _targetScale: null,
  _moveFrames: 0, _angleFrames: 0, _scaleFrames: 0,
}));

function _sprite(n) { return _sprites[n < MAX_SPRITES ? n : 0]; }

/**
 * SPSET n, chr, pal, hrev, vrev, pri [, w, h]
 * chr: バンク込みCHR番号 = bankNo*64 + chrInBank
 */
export function spset(n, chr, pal, hrev=0, vrev=0, pri=2, w=16, h=16, screen=SCREEN_U) {
  const sp = _sprite(n);
  sp.active = true;
  sp.chr = chr; sp.pal = pal;
  sp.hrev = !!hrev; sp.vrev = !!vrev; sp.pri = pri;
  sp.w = w; sp.h = h;
  sp.angle = 0; sp.scale = 100;
  sp.homeX = 0; sp.homeY = 0;
  sp.screen = screen;
  sp.imgOfsX = 0; sp.imgOfsY = 0;
  // アニメ状態を完全リセット（途中キャンセル後の残存防止）
  sp._targetX = null; sp._targetY = null; sp._moveFrames = 0;
  sp._targetAngle = null; sp._angleFrames = 0;
  sp._targetScale = null; sp._scaleFrames = 0;
}

/** SPCLR [n] — n省略時は全クリア */
export function spclr(n = null) {
  const reset = (sp) => {
    sp.active = false; sp.x = -1024; sp.y = -1024;
    sp.chr = 0;  // chr=-1(bitmap使用フラグ)をリセット
    sp._targetX = null; sp._targetY = null; sp._moveFrames = 0;
    sp._targetAngle = null; sp._angleFrames = 0;
    sp._targetScale = null; sp._scaleFrames = 0;
  };
  if (n === null) { _sprites.forEach(reset); }
  else { reset(_sprite(n)); }
}

/**
 * SPOFS n, x, y [, time]
 * time>0: 指定フレーム数かけてスライド
 */
export function spofs(n, x, y, time = 0) {
  const sp = _sprite(n);
  if (time <= 0) { sp.x = x; sp.y = y; sp._targetX = null; sp._targetY = null; }
  else { sp._targetX = x; sp._targetY = y; sp._moveFrames = time; }
}

/** SPCHR n, chr [, pal, hrev, vrev, pri] */
export function spchr(n, chr, pal, hrev, vrev, pri) {
  const sp = _sprite(n);
  sp.chr = chr;
  if (pal   !== undefined) sp.pal  = pal;
  if (hrev  !== undefined) sp.hrev = !!hrev;
  if (vrev  !== undefined) sp.vrev = !!vrev;
  if (pri   !== undefined) sp.pri  = pri;
}

/** SPANGLE n, angle [, time, dir] */
export function spangle(n, angle, time = 0) {
  const sp = _sprite(n);
  if (time <= 0) { sp.angle = angle; sp._targetAngle = null; }
  else { sp._targetAngle = angle; sp._angleFrames = time; }
}

/** SPSCALE n, scale [, time] */
export function spscale(n, scale, time = 0) {
  const sp = _sprite(n);
  if (time <= 0) { sp.scale = scale; sp._targetScale = null; }
  else { sp._targetScale = scale; sp._scaleFrames = time; }
}

/** SPHOME n, x, y */
export function sphome(n, x, y) {
  const sp = _sprite(n); sp.homeX = x; sp.homeY = y;
}

/** SPIMGOFS n, ox, oy — シート内の実際のコンテンツ開始オフセットを設定 */
export function spimgofs(n, ox, oy) {
  const sp = _sprite(n); sp.imgOfsX = ox; sp.imgOfsY = oy;
}

/** SPREAD n → {x, y, angle, scale} */
export function spread(n) {
  const sp = _sprite(n);
  return { x: sp.x, y: sp.y, angle: sp.angle, scale: sp.scale };
}

/** SPRITEのアニメーション進行（毎フレーム呼ぶ） */
function _spriteAnimate() {
  for (const sp of _sprites) {
    if (!sp.active) continue;
    if (sp._targetX !== null && sp._moveFrames > 0) {
      sp._moveFrames--;
      const t = sp._moveFrames <= 0 ? 1 : 1 / (sp._moveFrames + 1);
      sp.x += (sp._targetX - sp.x) * t;
      sp.y += (sp._targetY - sp.y) * t;
      if (sp._moveFrames <= 0) { sp.x = sp._targetX; sp.y = sp._targetY; sp._targetX = null; }
    }
    if (sp._targetAngle !== null && sp._angleFrames > 0) {
      sp._angleFrames--;
      const t = sp._angleFrames <= 0 ? 1 : 1 / (sp._angleFrames + 1);
      sp.angle += (sp._targetAngle - sp.angle) * t;
      if (sp._angleFrames <= 0) { sp.angle = sp._targetAngle; sp._targetAngle = null; }
    }
    if (sp._targetScale !== null && sp._scaleFrames > 0) {
      sp._scaleFrames--;
      const t = sp._scaleFrames <= 0 ? 1 : 1 / (sp._scaleFrames + 1);
      sp.scale += (sp._targetScale - sp.scale) * t;
      if (sp._scaleFrames <= 0) { sp.scale = sp._targetScale; sp._targetScale = null; }
    }
  }
}

/** SPRITEを描画 (毎フレーム, 優先度順) */
// SP_DRAWNなど動的カスタムbitmapのマップ
const _spBitmaps = {};  // spNo → {bitmap, w, h}
export function setSpriteBitmap(spNo, bitmap, w, h) { _spBitmaps[spNo] = {bitmap, w, h}; }
export function clearSpriteBitmap(spNo) { delete _spBitmaps[spNo]; }
export function _setSpritePri(spNo, pri) {
  if (spNo >= 0 && spNo < _sprites.length) _sprites[spNo].pri = pri;
}

function _spriteDraw(ctx, screen) {
  const sorted = _sprites.filter(sp => sp.active && sp.x > -512 && sp.screen === screen);
  sorted.sort((a, b) => b.pri - a.pri);  // 大きいpriが背面（先に描画）

  for (const sp of sorted) {
    // カスタムbitmapがあれば優先使用
    if (sp.chr === -1 && _spBitmaps[sp.no]) {
      const {bitmap, w, h} = _spBitmaps[sp.no];
      const dx = sp.x - sp.homeX, dy = sp.y - sp.homeY;
      ctx.save();
      ctx.translate(dx + sp.homeX, dy + sp.homeY);
      if (sp.angle) ctx.rotate(sp.angle * Math.PI / 180);
      ctx.drawImage(bitmap, -sp.homeX, -sp.homeY, w, h);
      ctx.restore();
      continue;
    }
    // バンク番号: chr / 64
    const bankNo = Math.floor(sp.chr / 64);
    const img = _spuImages[bankNo];
    if (!img) continue;

    // バンク内CHRインデックス（16x16単位: プチコンの基本SPRITE単位）
    const chrInBank = sp.chr % 64;
    // SPUシートは16x16CHRグリッド (1バンク=256x64px=16列×4行=64個)
    const sheetChr16Cols = Math.floor(img.width / 16);  // 16x16CHR単位の列数(=16)
    const chr16X = chrInBank % sheetChr16Cols;
    const chr16Y = Math.floor(chrInBank / sheetChr16Cols);
    const srcX = chr16X * 16;
    const srcY = chr16Y * 16;

    ctx.save();
    const s = sp.scale / 100;
    ctx.translate(sp.x, sp.y);
    if (sp.angle !== 0) ctx.rotate(sp.angle * Math.PI / 180);
    if (s !== 1) ctx.scale(s, s);
    ctx.translate(-sp.homeX, -sp.homeY);
    if (sp.hrev || sp.vrev) {
      ctx.scale(sp.hrev ? -1 : 1, sp.vrev ? -1 : 1);
      if (sp.hrev) ctx.translate(-sp.w, 0);
      if (sp.vrev) ctx.translate(0, -sp.h);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, srcX, srcY, sp.w, sp.h, 0, 0, sp.w, sp.h);
    ctx.restore();
  }
}

// ============================================================
// BG管理
// ============================================================
// BG: レイヤー0(手前),1(奥) × 画面0(上),1(下)
// 各レイヤーは 64×64 のCHRグリッド (各CHR=8×8px → 512×512の仮想面)
// BGOFSでスクロール

const BG_TILE_W = 64, BG_TILE_H = 64;

function _makeBgLayer() {
  return {
    tiles: new Array(BG_TILE_W * BG_TILE_H).fill(null),
    ofsX: 0, ofsY: 0,
    _targetOfsX: null, _targetOfsY: null, _ofsFrames: 0,
  };
}
// [screen][layer]
const _bg = [[_makeBgLayer(), _makeBgLayer()], [_makeBgLayer(), _makeBgLayer()]];
let _bgDrawScreen = SCREEN_L;

export function bgpage(screen) { _bgDrawScreen = screen; }

/** SPPAGE screen — SPRITE操作対象画面の設定（Web版では各SPRITEがscreen属性を持つため実質no-op） */
export function sppage(screen) { /* SPRITEはspset時にscreenを指定するため不要 */ }

/** BGCLR [layer] */
export function bgclr(layer = null) {
  const layers = _bg[_bgDrawScreen];
  const clear = (l) => { l.tiles.fill(null); };
  if (layer === null) { layers.forEach(clear); }
  else clear(layers[layer]);
}

/** BGPUT layer, x, y, chr, pal, hrev=0, vrev=0 */
export function bgput(layer, x, y, chr, pal, hrev=0, vrev=0) {
  const l = _bg[_bgDrawScreen][layer];
  const idx = (y % BG_TILE_H) * BG_TILE_W + (x % BG_TILE_W);
  // chr=0はプチコン準拠でセルクリア（透明）
  if (chr === 0) { l.tiles[idx] = null; }
  else           { l.tiles[idx] = {chr, pal, hrev: !!hrev, vrev: !!vrev}; }

}

/** BGFILL layer, x,y, x2,y2, chr, pal */
export function bgfill(layer, x, y, x2, y2, chr, pal) {
  for (let ty = y; ty <= y2; ty++)
    for (let tx = x; tx <= x2; tx++)
      bgput(layer, tx, ty, chr, pal);
}

/** BGOFS layer, x, y [, time] */
export function bgofs(layer, x, y, time = 0) {
  const l = _bg[_bgDrawScreen][layer];
  if (time <= 0) { l.ofsX = x; l.ofsY = y; l._targetOfsX = null; }
  else { l._targetOfsX = x; l._targetOfsY = y; l._ofsFrames = time; }
}

function _bgAnimate() {
  for (const screen of _bg) for (const l of screen) {
    if (l._targetOfsX !== null && l._ofsFrames > 0) {
      l._ofsFrames--;
      const t = l._ofsFrames <= 0 ? 1 : 1 / (l._ofsFrames + 1);
      l.ofsX += (l._targetOfsX - l.ofsX) * t;
      l.ofsY += (l._targetOfsY - l.ofsY) * t;
      if (l._ofsFrames <= 0) { l.ofsX = l._targetOfsX; l.ofsY = l._targetOfsY; l._targetOfsX = null; }
    }
  }
}

/** BGの1レイヤーをcanvasに描画 */
function _bgDrawLayer(ctx, l) {
  if (!ctx || !_bgu1Image) return;
  ctx.clearRect(0, 0, GRP_W, GRP_H);
  const ox = Math.round(l.ofsX), oy = Math.round(l.ofsY);
  const startTX = Math.floor(ox / 8), startTY = Math.floor(oy / 8);
  for (let ty = startTY; ty < startTY + Math.ceil(GRP_H / 8) + 1; ty++) {
    for (let tx = startTX; tx < startTX + Math.ceil(GRP_W / 8) + 1; tx++) {
      const idx = ((ty % BG_TILE_H) + BG_TILE_H) % BG_TILE_H * BG_TILE_W +
                  ((tx % BG_TILE_W) + BG_TILE_W) % BG_TILE_W;
      const tile = l.tiles[idx];
      if (!tile || tile.chr === 0) continue;  // nullまたはchr=0は描画しない（透明）
      const dx = tx * 8 - ox, dy = ty * 8 - oy;
      const srcX = (tile.chr % 32) * 8;
      const srcY = Math.floor(tile.chr / 32) * 8;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (tile.hrev || tile.vrev) {
        ctx.translate(dx + (tile.hrev ? 8 : 0), dy + (tile.vrev ? 8 : 0));
        ctx.scale(tile.hrev ? -1 : 1, tile.vrev ? -1 : 1);
        ctx.drawImage(_bgu1Image, srcX, srcY, 8, 8, 0, 0, 8, 8);
      } else {
        ctx.drawImage(_bgu1Image, srcX, srcY, 8, 8, dx, dy, 8, 8);
      }
      ctx.restore();
    }
  }
}

/** BGをCanvasに描画（レイヤーごとに別canvas） */
function _bgDraw(ctx, screenIdx) {
  // layer1(奥)とlayer0(手前)を別canvasに描画
  const [bg1ctx, bg0ctx] = screenIdx === SCREEN_U
    ? [ctxUbg1, ctxUbg0]
    : [ctxLbg1, ctxLbg0];
  _bgDrawLayer(bg1ctx, _bg[screenIdx][1]);
  _bgDrawLayer(bg0ctx, _bg[screenIdx][0]);
}

// ============================================================
// コンソール (CON_PRINT相当の簡易版)
// ============================================================
// CON_PRINTはlib.jsのstdlibが使うが、emu.jsでLOCATE/COLOR/CLSの基盤を提供

const _conState = [
  { cx: 0, cy: 0, fgCol: 15, bgCol: 0 },  // 上画面
  { cx: 0, cy: 0, fgCol: 14, bgCol: 0 },  // 下画面
];

function _consoleInit() {
  // フォントはブラウザのmonospaceを使用（ピクセルフォント希望だがまずこれで）
}

/** LOCATE x, y (下画面デフォルト) */
export function locate(x, y, screen = SCREEN_L) {
  _conState[screen].cx = x; _conState[screen].cy = y;
}

/** COLOR fg, bg (下画面デフォルト) */
export function color(fg, bg = 0, screen = SCREEN_L) {
  _conState[screen].fgCol = fg; _conState[screen].bgCol = bg;
}

/**
 * 1文字をコンソール座標(cx,cy)にCanvas直接描画
 * CON_PRINT から呼ばれる
 */
export function conPutChar(ch, cx, cy, fgCol, bgCol, screen = SCREEN_L) {
  const ctx = screen === SCREEN_U ? ctxU : ctxL;
  const x = cx * FONT_W, y = cy * FONT_H;
  // 背景
  if (bgCol > 0) {
    const bg = bgCol < 16 ? palColor(bgCol) : null;
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(x, y, FONT_W, FONT_H); }
  }
  // 文字
  const fg = palColor(fgCol);
  ctx.fillStyle = fg || '#ffffff';
  ctx.font = `${FONT_H}px monospace`;
  ctx.textBaseline = 'top';
  ctx.fillText(ch, x, y);
}

/** CLS (コンソール消去, 下画面デフォルト) */
export function conCls(screen = SCREEN_L) {
  const ctx = screen === SCREEN_U ? ctxU : ctxL;
  ctx.clearRect(0, 0, GRP_W, GRP_H);
  const s = _conState[screen]; s.cx = 0; s.cy = 0;
}

// ============================================================
// 入力システム
// ============================================================
// タッチ/クリック
let _tchX = 0, _tchY = 0, _tchSt = false, _tchTime = 0;
// 上画面も含めた統合タッチ
let _touchQueue = [];  // {x, y, screen} のキュー

// ボタン (十字キー+ABXYLRStart)
export const BTN_UP=1;
export const BTN_DOWN=2;
export const BTN_LEFT=4;
export const BTN_RIGHT=8;
export const BTN_A=16;
export const BTN_B=32;
export const BTN_X=64;
export const BTN_Y=128;
export const BTN_L=256;
export const BTN_R=512;
export const BTN_START=1024;

let _btnHeld = 0, _btnPrev = 0, _btnTriggered = 0;

// キーボード → ボタンマッピング
const _keyMap = {
  'ArrowUp': BTN_UP, 'ArrowDown': BTN_DOWN, 'ArrowLeft': BTN_LEFT, 'ArrowRight': BTN_RIGHT,
  'Enter': BTN_A, 'Escape': BTN_B,
  'a': BTN_A, 'A': BTN_A,   // AキーもAボタン
  'b': BTN_B, 'B': BTN_B,   // BキーもBボタン
  'x': BTN_X, 'X': BTN_X,   // XキーはXボタン
  'y': BTN_Y, 'Y': BTN_Y,   // YキーはYボタン
  'q': BTN_L, 'Q': BTN_L, 'w': BTN_R, 'W': BTN_R,
  ' ': BTN_START,
};

// 上下画面のcanvasスケールを考慮したクリック座標変換
let _canvasScale = 1;
export function setCanvasScale(s) { _canvasScale = s; }

function _canvasXY(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  // BoundingClientRectのサイズ（CSS上の表示サイズ）とcanvasの論理サイズの比で変換
  return {
    x: Math.floor((clientX - rect.left) / rect.width  * GRP_W),
    y: Math.floor((clientY - rect.top)  / rect.height * GRP_H),
  };
}

function _inputInit(upperCanvas, lowerCanvas, upperConCanvas, lowerConCanvas) {
  let _isTouchDetected = false;
  
  // 下画面 (主入力)
  const addTouch = (canvas, screen) => {
    const down = (e) => {
      // タッチイベントが来たらフラグを立てる
      if (e.type === 'touchstart') _isTouchDetected = true;
      // タッチ直後のマウスイベント（ブラウザの自動生成）は無視する
      if (e.type === 'mousedown' && _isTouchDetected) return;
      
      // 2本指以上はピンチ/スクロール用にブラウザに任せる
      if (e.touches && e.touches.length >= 2) return;
      // touchstart はpreventDefaultしない（gesture開始を邪魔しない）
      const {x, y} = _canvasXY(canvas, e);
      _tchX = x; _tchY = y; _tchSt = true; _tchTime = 0;
      _touchQueue.push({x, y, screen});
    };
    const move = (e) => {
      if (e.type === 'mousemove' && _isTouchDetected) return;
      
      if (e.touches && e.touches.length >= 2) return;
      // ゲーム操作中だけスクロール抑制
      if (_tchSt) e.preventDefault();
      const {x, y} = _canvasXY(canvas, e);
      _tchX = x; _tchY = y;
    };
    const up = (e) => {
      if (e.type === 'mouseup' && _isTouchDetected) return;
      
      if (e.touches && e.touches.length >= 2) return;
      if (e.cancelable) e.preventDefault();
      _tchSt = false; _tchTime = 0;

      // タッチ終了から少し待ってフラグを解除（PCでマウスも使えるようにするため）
      if (e.type === 'touchend' || e.type === 'touchcancel') {
        setTimeout(() => { _isTouchDetected = false; }, 400);
      }
    };
    canvas.addEventListener('mousedown',  down);
    canvas.addEventListener('mousemove',  move);
    canvas.addEventListener('mouseup',    up);
    canvas.addEventListener('touchstart', down, {passive:true});   // passive:true でtouchstart高速化
    canvas.addEventListener('touchmove',  move, {passive:false});  // moveだけ非passive（preventDefault用）
    canvas.addEventListener('touchend',   up,   {passive:false});
    canvas.addEventListener('touchcancel',up,   {passive:false});
  };
  addTouch(lowerCanvas, SCREEN_L);
  addTouch(upperCanvas, SCREEN_U);  // 上画面も入力可能に
  // CON層canvasも入力を受け付ける
  if (upperConCanvas) addTouch(upperConCanvas, SCREEN_U);
  if (lowerConCanvas) addTouch(lowerConCanvas, SCREEN_L);

  // キーボード
  window.addEventListener('keydown', (e) => {
    const btn = _keyMap[e.key];
    if (btn) { _btnHeld |= btn; e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    const btn = _keyMap[e.key];
    if (btn) _btnHeld &= ~btn;
  });
}

/** 毎フレーム呼ぶ入力更新 */
function _inputUpdate() {
  if (_tchSt) _tchTime++;
  _btnTriggered = _btnHeld & ~_btnPrev;
  _btnPrev = _btnHeld;
}

/** タッチキュー取得 (最新1件) */
export function getTouchEvent() {
  return _touchQueue.length > 0 ? _touchQueue.shift() : null;
}
export function clearTouchQueue() { _touchQueue = []; }

// TCHX, TCHY, TCHST, TCHTIME
export const touch = {
  get x() { return _tchX; },
  get y() { return _tchY; },
  get st() { return _tchSt; },
  get time() { return _tchTime; },
};

/**
 * BUTTON(mode)
 * mode=0: 押している間, mode=2: 押した瞬間
 */
export function button(mode = 0) {
  return mode === 2 ? _btnTriggered : _btnHeld;
}

// ============================================================
// BGM / 効果音 (Tone.js)
// ============================================================
let _toneReady = false;
let _bgmPlayer = null;

export async function audioStart() {
  if (_toneReady) return;
  await Tone.start();
  _toneReady = true;
}


// ============================================================
// 効果音 (sound_demo.html の Tone.js 実装を移植)
// ============================================================

function makeCardSound(vel=0.6, dur=0.045, withThud=true) {
  const now = Tone.now();
  const g = new Tone.Gain(vel).toDestination();
  const hpFilt = new Tone.Filter({type:'highpass', frequency:3500, rolloff:-24});
  const fricEnv = new Tone.AmplitudeEnvelope({attack:0.001, decay:dur*0.9, sustain:0, release:0.008});
  const fricNoise = new Tone.Noise('white');
  fricNoise.connect(hpFilt); hpFilt.connect(fricEnv); fricEnv.connect(g);
  fricNoise.start(now); fricNoise.stop(now+dur+0.02);
  fricEnv.triggerAttackRelease(dur*0.85, now);
  const bpFilt = new Tone.Filter({type:'bandpass', frequency:2200, Q:0.8});
  const bodyEnv = new Tone.AmplitudeEnvelope({attack:0.001, decay:dur*0.5, sustain:0, release:0.005});
  const bodyNoise = new Tone.Noise('white');
  bodyNoise.connect(bpFilt); bpFilt.connect(bodyEnv); bodyEnv.connect(g);
  bodyNoise.start(now); bodyNoise.stop(now+dur+0.02);
  bodyEnv.triggerAttackRelease(dur*0.4, now);
  if (withThud) {
    const thudG = new Tone.Gain(0.32).connect(g);
    const thudOsc = new Tone.Oscillator(120, 'sine');
    thudOsc.frequency.setValueAtTime(120, now);
    thudOsc.frequency.exponentialRampToValueAtTime(60, now+0.018);
    const thudEnv = new Tone.AmplitudeEnvelope({attack:0.001, decay:0.022, sustain:0, release:0.005});
    thudOsc.connect(thudEnv); thudEnv.connect(thudG);
    thudOsc.start(now); thudOsc.stop(now+0.04);
    thudEnv.triggerAttackRelease(0.018, now);
    setTimeout(()=>{try{thudOsc.dispose();thudEnv.dispose();thudG.dispose();}catch(e){}},200);
  }
  setTimeout(()=>{try{fricNoise.dispose();hpFilt.dispose();fricEnv.dispose();bodyNoise.dispose();bpFilt.dispose();bodyEnv.dispose();g.dispose();}catch(e){}}, (dur+0.15)*1000);
}

function makeFlipSound(vel=0.55, dur=0.07) {
  const now = Tone.now();
  const g = new Tone.Gain(vel).toDestination();
  const bp1 = new Tone.Filter({type:'bandpass', frequency:1600, Q:0.6});
  const env1 = new Tone.AmplitudeEnvelope({attack:0.004, decay:dur*0.85, sustain:0.0, release:0.02});
  const n1 = new Tone.Noise('pink');
  n1.connect(bp1); bp1.connect(env1); env1.connect(g);
  n1.start(now); n1.stop(now+dur+0.05);
  env1.triggerAttackRelease(dur*0.8, now);
  const hp1 = new Tone.Filter({type:'highpass', frequency:4000, rolloff:-12});
  const env2 = new Tone.AmplitudeEnvelope({attack:0.001, decay:dur*0.35, sustain:0, release:0.005});
  const n2 = new Tone.Noise('white');
  n2.connect(hp1); hp1.connect(env2); env2.connect(g);
  n2.start(now); n2.stop(now+dur+0.02);
  env2.triggerAttackRelease(dur*0.3, now);
  setTimeout(()=>{try{n1.dispose();bp1.dispose();env1.dispose();n2.dispose();hp1.dispose();env2.dispose();g.dispose();}catch(e){}}, (dur+0.15)*1000);
}

function makeSrbnHit(vel=0.70) {
  const now = Tone.now();
  const dur = 0.038;
  const g = new Tone.Gain(vel).toDestination();
  const hp = new Tone.Filter({type:'highpass', frequency:3800, rolloff:-24});
  const e1 = new Tone.AmplitudeEnvelope({attack:0.001, decay:dur*0.8, sustain:0, release:0.006});
  const n1 = new Tone.Noise('white');
  n1.connect(hp); hp.connect(e1); e1.connect(g);
  n1.start(now); n1.stop(now+dur+0.02);
  e1.triggerAttackRelease(dur*0.75, now);
  const bp = new Tone.Filter({type:'bandpass', frequency:2400, Q:1.0});
  const e2 = new Tone.AmplitudeEnvelope({attack:0.001, decay:dur*0.45, sustain:0, release:0.004});
  const n2 = new Tone.Noise('white');
  n2.connect(bp); bp.connect(e2); e2.connect(g);
  n2.start(now); n2.stop(now+dur+0.02);
  e2.triggerAttackRelease(dur*0.4, now);
  const thudG = new Tone.Gain(0.18).connect(g);
  const thudOsc = new Tone.Oscillator(180, 'sine');
  thudOsc.frequency.setValueAtTime(180, now);
  thudOsc.frequency.exponentialRampToValueAtTime(90, now+0.012);
  const thudE = new Tone.AmplitudeEnvelope({attack:0.001, decay:0.014, sustain:0, release:0.003});
  thudOsc.connect(thudE); thudE.connect(thudG);
  thudOsc.start(now); thudOsc.stop(now+0.03);
  thudE.triggerAttackRelease(0.012, now);
  setTimeout(()=>{try{n1.dispose();hp.dispose();e1.dispose();n2.dispose();bp.dispose();e2.dispose();thudOsc.dispose();thudE.dispose();thudG.dispose();g.dispose();}catch(e){}}, 200);
}

// SND_* → 実際の効果音にルーティング
function _playSfx(mml) {
  if (!_toneReady || typeof Tone === 'undefined') return;
  try {
    if (mml === _SND_CD)           { makeFlipSound(0.60, 0.075); }
    else if (mml === _SND_CD_SHUFFLE) {
      const iv=0.125, params=[{v:0.58,d:0.072},{v:0.52,d:0.068},{v:0.60,d:0.078},{v:0.55,d:0.070}];
      for(let i=0;i<4;i++){const p=params[i]; setTimeout(()=>makeFlipSound(p.v,p.d), i*iv*1000);}
    }
    else if (mml === _SND_SRBN)    { makeSrbnHit(0.78); }
    else if (mml === _SND_SRBN_CLR) {
      const t32=0.0625, t8=0.25, t64=0.03125; let t=0;
      setTimeout(()=>makeSrbnHit(1.0),  t*1000); t+=t32;
      setTimeout(()=>makeSrbnHit(0.92), t*1000); t+=t8+t8;
      for(let i=0;i<6;i++){setTimeout(()=>makeSrbnHit(0.48), t*1000); t+=t64*2;}
    }
    else { _playMml(mml); }  // フォールバック
  } catch(e) { console.warn('sfx error:', e.message); }
}

// MML定数（bgmsetで登録されたMMLと照合するため）
let _SND_CD, _SND_CD_SHUFFLE, _SND_SRBN, _SND_SRBN_CLR;
// const.jsから設定される
export function setSndConsts(cd, cdShuffle, srbn, srbnClr) {
  _SND_CD=cd; _SND_CD_SHUFFLE=cdShuffle; _SND_SRBN=srbn; _SND_SRBN_CLR=srbnClr;
}

/** MMLの簡易Tone.js再生（フォールバック用） */
function _playMml(mml) {
  if (!mml || !_toneReady || typeof Tone === 'undefined') return;
  try {
    const synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.1 },
    }).toDestination();
    let tempo=120, octave=4, vol=80, defaultLen=4;
    const notes = [];
    let i = 0;
    while (i < mml.length) {
      const ch = mml[i];
      if (ch==='T'||ch==='t'){i++;let n='';while(i<mml.length&&/\d/.test(mml[i]))n+=mml[i++];tempo=parseInt(n)||120;}
      else if(ch==='O'||ch==='o'){i++;octave=parseInt(mml[i++])||4;}
      else if(ch==='V'||ch==='v'){i++;let n='';while(i<mml.length&&/\d/.test(mml[i]))n+=mml[i++];vol=parseInt(n)||80;}
      else if(ch==='L'||ch==='l'){i++;let n='';while(i<mml.length&&/\d/.test(mml[i]))n+=mml[i++];defaultLen=parseInt(n)||4;}
      else if(ch==='@'){i++;while(i<mml.length&&/\d/.test(mml[i]))i++;}
      else if('CDEFGABcdefgab'.includes(ch)){
        i++;let note=ch.toUpperCase();
        if(i<mml.length&&(mml[i]==='+'||mml[i]==='#')){note+='#';i++;}
        else if(i<mml.length&&mml[i]==='-'){note+='b';i++;}
        let lenStr='';while(i<mml.length&&/\d/.test(mml[i]))lenStr+=mml[i++];
        if(i<mml.length&&mml[i]==='.'){lenStr+='.';i++;}
        const len=lenStr?parseInt(lenStr):defaultLen;
        const dotted=lenStr.includes('.');
        const dur=(60/tempo)*(4/len)*(dotted?1.5:1);
        notes.push({note:note+octave,dur,vol});
      } else if(ch==='R'||ch==='r'){
        i++;let lenStr='';while(i<mml.length&&/\d/.test(mml[i]))lenStr+=mml[i++];
        const len=lenStr?parseInt(lenStr):defaultLen;
        notes.push({note:null,dur:(60/tempo)*(4/len),vol});
      } else i++;
    }
    let t = Tone.now()+0.01;
    for(const n of notes){if(n.note)synth.triggerAttackRelease(n.note,n.dur*0.9,t,n.vol/127);t+=n.dur;}
    setTimeout(()=>{try{synth.dispose();}catch(_){}}, (t-Tone.now()+1)*1000);
  } catch(e){ console.warn('MML error:', e.message); }
}

const _mmlPlayers = {};
export function bgmset(track, mml) { _mmlPlayers[track] = { mml }; }
export function bgmplay(track) {
  if (!_toneReady) return;
  const entry = _mmlPlayers[track];
  if (!entry) return;
  _playSfx(entry.mml);
}
export function bgmstop(track) { /* 効果音は自動終了 */ }

/** BEEP n */
export const BEEP_POPUP   = 61;
export const BEEP_SELECT  = 48;
export const BEEP_CANCEL  = 51;
export const BEEP_CLICK   = 62;

function _beepSelect() {           // カウベル2
  const now=Tone.now(), g=new Tone.Gain(0.38).toDestination();
  [840,1056].forEach(f=>{
    const osc=new Tone.Oscillator(f,'square');
    const env=new Tone.AmplitudeEnvelope({attack:.001,decay:.18,sustain:0,release:.05});
    osc.connect(env); env.connect(g);
    osc.start(now); env.triggerAttackRelease(.15,now);
    setTimeout(()=>{try{osc.stop();osc.dispose();env.dispose();}catch(e){}},400);
  });
  setTimeout(()=>{try{g.dispose();}catch(e){}},500);
}
function _beepCancel() {           // コンガ
  const now=Tone.now(), g=new Tone.Gain(0.48).toDestination();
  const osc=new Tone.Oscillator(260,'sine');
  osc.frequency.setValueAtTime(260,now);
  osc.frequency.exponentialRampToValueAtTime(155,now+.16);
  const oscEnv=new Tone.AmplitudeEnvelope({attack:.001,decay:.24,sustain:0,release:.05});
  osc.connect(oscEnv); oscEnv.connect(g);
  const nFilt=new Tone.Filter(900,'lowpass');
  const nEnv=new Tone.AmplitudeEnvelope({attack:.001,decay:.045,sustain:0,release:.01});
  const noise=new Tone.Noise('pink');
  noise.connect(nFilt); nFilt.connect(nEnv); nEnv.connect(g);
  osc.start(now); osc.stop(now+.35);
  noise.start(now); noise.stop(now+.06);
  oscEnv.triggerAttackRelease(.22,now);
  nEnv.triggerAttackRelease(.04,now);
  setTimeout(()=>{try{osc.dispose();oscEnv.dispose();noise.dispose();nFilt.dispose();nEnv.dispose();g.dispose();}catch(e){}},600);
}
function _beepClick() {            // シンセ
  const now=Tone.now(), g=new Tone.Gain(0.32).toDestination();
  const filt=new Tone.Filter(2200,'lowpass');
  filt.frequency.setValueAtTime(2200,now);
  filt.frequency.exponentialRampToValueAtTime(380,now+.08);
  const osc=new Tone.Oscillator(1100,'sawtooth');
  const env=new Tone.AmplitudeEnvelope({attack:.001,decay:.075,sustain:0,release:.02});
  osc.connect(filt); filt.connect(env); env.connect(g);
  osc.start(now); osc.stop(now+.15);
  env.triggerAttackRelease(.065,now);
  setTimeout(()=>{try{osc.dispose();filt.dispose();env.dispose();g.dispose();}catch(e){}},300);
}
function _beepPopup() {            // 太鼓
  const now=Tone.now(), g=new Tone.Gain(0.52).toDestination();
  const osc=new Tone.Oscillator(80,'sine');
  osc.frequency.setValueAtTime(165,now);
  osc.frequency.exponentialRampToValueAtTime(58,now+.13);
  const oscEnv=new Tone.AmplitudeEnvelope({attack:.001,decay:.30,sustain:0,release:.08});
  osc.connect(oscEnv); oscEnv.connect(g);
  const nFilt=new Tone.Filter(280,'lowpass');
  const nEnv=new Tone.AmplitudeEnvelope({attack:.001,decay:.065,sustain:0,release:.02});
  const noise=new Tone.Noise('brown');
  noise.connect(nFilt); nFilt.connect(nEnv); nEnv.connect(g);
  osc.start(now); osc.stop(now+.45);
  noise.start(now); noise.stop(now+.09);
  oscEnv.triggerAttackRelease(.32,now);
  nEnv.triggerAttackRelease(.06,now);
  setTimeout(()=>{try{osc.dispose();oscEnv.dispose();noise.dispose();nFilt.dispose();nEnv.dispose();g.dispose();}catch(e){}},700);
}

export function beep(n) {
  if (typeof Tone === 'undefined') return;
  const play = () => {
    try {
      if      (n === BEEP_SELECT) _beepSelect();
      else if (n === BEEP_CANCEL) _beepCancel();
      else if (n === BEEP_CLICK)  _beepClick();
      else if (n === BEEP_POPUP)  _beepPopup();
      else makeFlipSound(0.25, 0.05);  // その他
    } catch(e) {}
  };
  if (_toneReady) { play(); }
  else { Tone.start().then(() => { _toneReady = true; play(); }).catch(() => {}); }
}

// ============================================================
// VSYNC / メインループ
// ============================================================
let _frameCount = 0;
let _vsyncResolve = null;
let _rafId = null;
let _running = false;

/** 毎フレーム処理（内部）*/
function _frame() {
  if (!_running) return;
  _frameCount++;
  _inputUpdate();
  _spriteAnimate();
  _bgAnimate();

  // BG描画（SPRITE描画の前に）
  if (ctxLgrp) _bgDraw(ctxLgrp, SCREEN_L);
  if (ctxUgrp) _bgDraw(ctxUgrp, SCREEN_U);

  // SPRITE描画（毎フレーム、SPRITE専用canvasをクリアしてから描画）
  if (ctxUspr) {
    ctxUspr.clearRect(0, 0, GRP_W, GRP_H);
    _spriteDraw(ctxUspr, SCREEN_U);
  }
  if (ctxLspr) {
    ctxLspr.clearRect(0, 0, GRP_W, GRP_H);
    _spriteDraw(ctxLspr, SCREEN_L);
  }

  // ゲームのrenderコールバックがあれば呼ぶ（カーソル等の追加描画用）
  if (_renderCallback) _renderCallback(ctxLspr);

  // vsync待ちを解除
  if (_vsyncResolve) {
    const r = _vsyncResolve;
    _vsyncResolve = null;
    r();
  }
  _rafId = requestAnimationFrame(_frame);
}

let _renderCallback = null;
/** 毎フレーム描画を行うコールバックを登録 */
export function setRenderCallback(fn) { _renderCallback = fn; }

/** メインループ開始 */
// audioStartをユーザー最初のインタラクションで自動起動
export function enableAudioOnInteraction() {
  const start = async () => {
    if (_toneReady) return;
    try {
      if (typeof Tone !== 'undefined') {
        await Tone.start();
        _toneReady = true;
        console.log('Audio started');
      }
    } catch(e) { console.warn('Audio start failed:', e); }
  };
  window.addEventListener('touchstart', start, { once: true });
  window.addEventListener('mousedown',  start, { once: true });
  window.addEventListener('keydown',    start, { once: true });
  // ページがすでにフォーカスされていれば即起動試行
  if (document.hasFocus()) start();
}

export function startLoop() {
  _running = true;
  _rafId = requestAnimationFrame(_frame);
}

/** VSYNC n — nフレーム待機 */
export function vsync(n = 1) {
  // _frame()のタイミングでresolveされるPromise
  // n>1 の場合はn回_frameを待つ
  if (n <= 1) {
    return new Promise(resolve => { _vsyncResolve = resolve; });
  }
  return new Promise(resolve => {
    let remaining = n;
    const step = () => {
      remaining--;
      if (remaining <= 0) resolve();
      else _vsyncResolve = step;
    };
    _vsyncResolve = step;
  });
}

/** フレーム数取得 (MAINCNTL相当) */
export function frameCount() { return _frameCount; }

// ============================================================
// 画像ロードユーティリティ
// ============================================================
const _imgCache = {};

export function loadImage(src) {
  if (_imgCache[src]) return _imgCache[src];
  _imgCache[src] = new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => { console.warn('Image load failed:', src); res(null); };
    img.src = src;
  });
  return _imgCache[src];
}

/**
 * 全スプライトシートを一括ロード
 * @param {string} basePath 例: './'
 */
export async function loadAllSheets(basePath = './') {
  const [bgu1, spu4, spu5, spu6, spu7] = await Promise.all([
    loadImage(basePath + 'JRFTRT_B.png'),
    loadImage(basePath + 'JRFTRTS4.png'),
    loadImage(basePath + 'JRFTRTS5.png'),
    loadImage(basePath + 'JRFTRTS6.png'),
    loadImage(basePath + 'JRFTRTS7.png'),
  ]);
  if (bgu1) setBgu1Image(bgu1);
  if (spu4) setSpuImage(4, spu4);
  if (spu5) setSpuImage(5, spu5);
  if (spu6) setSpuImage(6, spu6);
  if (spu7) setSpuImage(7, spu7);
  console.log('All sprite sheets loaded');
}

// ============================================================
// デバッグ: フレームレート表示
// ============================================================
let _fpsLast = performance.now(), _fpsCnt = 0;
export let fps = 0;

export function _fpsUpdate() {
  _fpsCnt++;
  const now = performance.now();
  if (now - _fpsLast >= 1000) {
    fps = _fpsCnt;
    _fpsCnt = 0;
    _fpsLast = now;
  }
}
