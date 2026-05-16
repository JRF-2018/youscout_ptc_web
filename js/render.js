/**
 * render.js — YOUSCOUT 描画処理
 * youscout.prg の @DRAW_* / @LOAD_* / @MAIN_PNL_* 等の逆コンパイル
 */

'use strict';

import {
  gcls, gfill, gbox, gline, gpset, gcopy, gputchr, gpage,
  bgput, bgofs, bgclr, bgpage,
  spset, spofs, spclr, spangle, spscale, sphome,
  vsync, touch, getTouchEvent, clearTouchQueue, button,
  bgmset, bgmplay, beep,
  BTN_A, BTN_B, BTN_UP, BTN_DOWN, BTN_LEFT, BTN_RIGHT,
  SCREEN_U, SCREEN_L, GRP_W, GRP_H, CON_W, CON_H,
  loadImage, getSpuImage, setSpriteBitmap, clearSpriteBitmap, _setSpritePri,
} from './emu.js';
import {
  conState, conCls, conPrint, pushCwin, popCwin, conCtxL, CON_SCALE,
  popupMenu, MnuCtrl, TchCtrl, waitClick,
  sarrayToArray, arrayToSarray,
} from './lib.js';

import {
  COL_BOARD, COL_BLACK, COL_WHITE, COL_GREY, COL_DARK_GREY,
  COL_S, COL_D, COL_H, COL_C,
  BGU1_SRBN_TL, BGU1_SRBN_TR, BGU1_SRBN_BL, BGU1_SRBN_BR,
  BGU1_SRBN_L, BGU1_SRBN_R, BGU1_SRBN_T, BGU1_SRBN_B,
  BGU1_SRBN_JIKUL, BGU1_SRBN_JIKUR, BGU1_SRBN_HARI, BGU1_SRBN_TEN,
  BGU1_SRBN_TAMAL, BGU1_SRBN_TAMAR,
  BGU1_B00, BGU1_DISCARDED, BGU1_TOKEN,
  BGU1_WHCD_C, BGU1_WHCD_TL, BGU1_WHCD_T, BGU1_WHCD_TR,
  BGU1_WHCD_L, BGU1_WHCD_R, BGU1_WHCD_BL, BGU1_WHCD_B, BGU1_WHCD_BR,
  BGU1_MINI_CD,
  SPU7_B00, SPU7_A00, SPU7_A13, SPU7_TOKEN,
  SPU6_CDTL_S_OFS, SPU6_CDTL_D_OFS, SPU6_CDTL_H_OFS, SPU6_CDTL_C_OFS,
  SPU5_WHCD, SPU5_WHCD_PTL, SPU5_WHCD_PT, SPU5_WHCD_PL,
  SPU4_RDLN_CD,
  SP_B00, SP_DRAWN, SP_TOKEN, SP_A00, SP_A13,
  SP_TMP_OFFSET, SP_RDLN_OFFSET, SP_SPG_OFFSET, SP_SPG_MAX,
  SPPL_B00, SPPL_DRAWN, SPPL_TOKEN, SPPL_A00, SPPL_A13, SPPL_DISCARDED,
  CARD_WIDTH, CARD_HEIGHT, CARD_HW, CARD_HH, GRP_ROWS,
  CARD_X, CARD_Y, CARDS_X, CARDS_Y, CARDS_ANCHOR, CARDS_W, CARDS_H, CARDS_CENTER_X, CARDS_CENTER_Y,
  BOARD_ORDER,
  TALON_X, TALON_Y, TALON_NUM_CX, TALON_NUM_CY,
  DISCARDED_X, DISCARDED_Y,
  DRAWN_X, DRAWN_Y,
  SRBN_CX, SRBN_CY, SRBN_CW, SRBN_CH,
  MINI_CDS_X, MINI_CDS_Y, MINI_CDS_W, MINI_CDS_H,
  MINI_CD_X, MINI_CD_Y, MINI_CD_W, MINI_CD_H,
  GAME_CON_CX, GAME_CON_CY, GAME_CON_CW, GAME_CON_CH,
  FONT_W, FONT_H,
  NUM_TO_BIT, SUIT_CHARS,
  TABLE_MAJOR, RULE_COMP, RULE_MOVE, RULE_STAY, RULE_MOVE_C, RULE_STAY_C,
  RULES_CX, RULES_CY,
  LBG1_CX, LBG1_CY, LBG1_CW, LBG1_CH,
  LBG1_M_OFS_X, LBG1_M_OFS_Y, LBG1_N_OFS_X, LBG1_N_OFS_Y,
  GRP_S_TALON, GRP_S_DISCARDED, GRP_S_B00, GRP_D_A00, GRP_D_A13,
  GRP_R_BOARD, GRP_R_FST_CD, GRP_R_DRAWN, GRP_R_I8, GRP_R_I11,
  MOVE_TOKEN_TM, DISPLAY_MSG_TM, MISSING_X, MISSING_TM_U, MISSING_TM_L,
  DRAW_CD_TM_U, DRAW_CD_TM_A,
  ANIM_B00_ANGLE, ANIM_B00_ANGLE_R, ANIM_TOKEN_MAG,
  PM_TALON_W, PM_TALON_H, PM_DISCARDED_W, PM_DISCARDED_H,
  CARD_CW, CARD_CH, DISCARDED_CX, DISCARDED_CW, DISCARDED_CH, TALON_CX,
  BEEP_SELECT, BEEP_CANCEL, BEEP_CLICK, BEEP_POPUP,
  BGM_BEEP, SND_SRBN, SND_SRBN_CLR,
} from './const.js';

import { MSG_WORDS, MSG_TRTMJ, MSG_HXG, MSG, JRFTAROT_CMAP } from './data.js';
import { gs, checkClick, lang } from './game.js';
import { msg, words, trtmj } from './utils.js';;

// ============================================================
// GRPシート画像 (Canvas上での描画用)
// ============================================================
const _grpImages = {};  // key: 'A','R','S','D','H','C','RS','RD','RH','RC','T'
const YOUSCOUT_VER = '0.04';

export async function loadGrpImages(basePath = './') {
  const keys = {
    A:'JRFTRT_A', R:'JRFTRT_R',
    S:'JRFTRT_S', D:'JRFTRT_D', H:'JRFTRT_H', C:'JRFTRT_C',
    RS:'JRFTRT_RS', RD:'JRFTRT_RD', RH:'JRFTRT_RH', RC:'JRFTRT_RC',
    T:'JRFTRT_T',
  };
  await Promise.all(Object.entries(keys).map(async ([k, name]) => {
    _grpImages[k] = await loadImage(basePath + name + '.png');
  }));
}

/** GRPシートのインデックス→(sx,sy) */
function _grpIdx(idx) {
  const col = Math.floor(idx / GRP_ROWS);
  const row = idx % GRP_ROWS;
  return [col * CARD_WIDTH, row * CARD_HEIGHT];
}

// ============================================================
// DRAW_LOGO — タイトル画面の上画面描画
// ============================================================
export function drawLogo() {
  // タイトル背景GRPをキャンバスに描画
  gpage(SCREEN_U);
  if (_grpImages['T']) {
    const ctx = _upperCtx();
    ctx.drawImage(_grpImages['T'], 0, 0);
  } else {
    gcls(COL_BOARD);
  }

  // W=32 (タイル幅), LOGO_STR_JA$="ヨウスコウ" (各文字を縦に並べる)
  const W = 32;
  const col0x = 5 + Math.floor(W / 8);  // = 9 列目あたり

  // ヨウスコウを縦書きで表示
  const logoJA = 'ヨウスコウ';
  for (let i = 0; i < logoJA.length; i++) {
    conPrint(SCREEN_U, col0x, 2 + i * 2, logoJA[i]);
  }

  // "Youscout"
  conPrint(SCREEN_U, col0x, 24 - 9 + 1, 'Youscout');

  // " ◆ Tarot Solitaire ◆"
  conPrint(SCREEN_U, col0x, 24 - 9 + 3, '\u00a0Tarot Solitaire\u00a0');

  // バージョン
  const ver = YOUSCOUT_VER ? `PTC  Web Edition` : 'PTC  Web Edition';
  conPrint(SCREEN_U, col0x, 24 - 9 + 5, `  ${ver}`);
}

// ============================================================
// DRAW_BOARD — 大アルカナ6枚をGRPからCanvasに描画
// ============================================================
export function drawBoard() {
  gpage(SCREEN_U);
  const ctx = _upperCtx();
  for (let i = 0; i < 6; i++) {
    const cd = gs.board[i];
    if (!cd) continue;
    const num = parseInt(cd.slice(1, 3));
    const orient = cd[3];  // 'U'=正位置, 'R'=逆位置
    const isRev = (orient === 'R') !== !!gs.urev;  // 逆位置XOR画面反転（!!でboolean変換）

    // GRPシートを選択: 正位置='A', 逆位置='R'
    const sheet = isRev ? _grpImages['R'] : _grpImages['A'];
    if (!sheet) continue;

    // シート内のインデックス: A01-A12=idx0-11, A14-A21=idx12-19
    let idx = num - 1;
    if (num >= 14) idx = num - 2;  // A13をスキップ

    const [sx, sy] = _grpIdx(idx);
    let dx = CARD_X[i];
    let dy = CARD_Y[i];
    if (gs.urev) { dx = GRP_W - dx - CARD_WIDTH; dy = GRP_H - dy - CARD_HEIGHT; }
    ctx.drawImage(sheet, sx, sy, CARD_WIDTH, CARD_HEIGHT, dx, dy, CARD_WIDTH, CARD_HEIGHT);
  }
}

// ============================================================
// LOAD_BOARD — ボード状態をGRPシートから読み込む
// ============================================================
export function loadBoard() {
  // Web版では描画と読み込みを統合して直接描画
  drawBoard();
}

// ============================================================
// DRAW_FST_CD — 小アルカナスロットの先頭カードを描画
// ============================================================
export function drawFstCd() {
  gpage(SCREEN_U);
  const ctx = _upperCtx();

  for (let order = 0; order <= 7; order++) {
    const i = BOARD_ORDER[order];
    const cds = gs.cards[i];
    if (!cds) continue;

    const fst = cds.slice(0, 3);  // 先頭カード名
    const suit = fst[0];
    const num  = parseInt(fst.slice(1));
    const urev = gs.urev;

    // シートを選択
    const sheetKey = urev ? suit + 'R'.replace('SR','RS').replace('DR','RD')
                                         .replace('HR','RH').replace('CR','RC')
                          : suit;
    // 逆位置シートキー正規化
    const revKey = { S:'RS', D:'RD', H:'RH', C:'RC' };
    const sheet = urev ? _grpImages[revKey[suit]] : _grpImages[suit];
    if (!sheet) continue;

    const idx = num - 1;
    const [sx, sy] = _grpIdx(idx);

    // NTH_CD_XY: 先頭カードの表示オフセット計算
    const {x: offX, y: offY} = _nthCdXY(0, cds, CARDS_ANCHOR[i]);
    let dx = CARDS_X[i] + offX;
    let dy = CARDS_Y[i] + offY;
    if (urev) { dx = GRP_W - dx - CARD_WIDTH; dy = GRP_H - dy - CARD_HEIGHT; }

    ctx.drawImage(sheet, sx, sy, CARD_WIDTH, CARD_HEIGHT, dx, dy, CARD_WIDTH, CARD_HEIGHT);

    // スタック数インジケータ（グレーピクセル）
    const n = Math.floor((cds.length + 1) / 4);
    if (n > 1) {
      _gpset(dx, dy, COL_GREY);
      if (n % 5 !== 1) _gpset(dx, dy + CARD_HEIGHT - 1, COL_GREY);
      if (n > 5)       _gpset(dx + CARD_WIDTH - 1, dy, COL_GREY);
    }
  }
}

// ============================================================
// LOAD_FST_CD — 先頭カードの再描画
// ============================================================
export function loadFstCd() {
  // Web版ではredrawCds()がSPRITEで管理するため不要
}

// ============================================================
// NTH_CD_XY — カードスタックのN番目カードの表示オフセット計算
// ============================================================
function _nthCdXY(i, cds, anchor) {
  const n = typeof cds === 'number' ? cds :
    (typeof cds === 'string' ? cds.split(',').filter(Boolean).length : cds.length);
  if (n === 0 || i >= n) return { x: -1, y: -1 };

  if (n <= 5) {
    // PRG @MAKE_CDS_SPG N<=5:
    // AX=(5-N)*8/2, W→0, E→(5-N)*8
    // AY=8, N→0, S→16
    // SX = AX + (N-I-1)*8, SY = AY
    let a = anchor || '', r = '';
    if (a[0] === 'S' || a[0] === 'N') { r = a[0]; a = a.slice(1); }
    let AX = (5 - n) * 8 / 2;
    if (a === 'W') AX = 0;
    if (a === 'E') AX = (5 - n) * 8;
    let AY = 8;
    if (r === 'N') AY = 0;
    if (r === 'S') AY = 16;
    return { x: AX + (n - i - 1) * 8, y: AY };
  }

  // PRG @_MK_CDS_SPG_G5: N>5
  // AX=0, AY=0 (anchorS && N<=10 → AY=8)
  // SY = (floor(N/5) + !!(N%5) - 1) * 8
  // A = N>10 ? N-10 : N-5
  // i<A: SX=(5-I-1)*8
  // i>=A: SY-=8, SX=(5-(I-A)-1)*8
  // i>=A+5: SY-=8, SX=(5-(I-A-5)-1)*8
  let AX = 0;
  let AY = (anchor && anchor[0] === 'S' && n <= 10) ? 8 : 0;
  const A = n > 10 ? n - 10 : n - 5;
  let SY = (Math.floor(n / 5) + (n % 5 ? 1 : 0) - 1) * 8;
  let SX = (5 - i - 1) * 8;
  if (i >= A)     { SY -= 8; SX = (5 - (i - A)     - 1) * 8; }
  if (i >= A + 5) { SY -= 8; SX = (5 - (i - A - 5) - 1) * 8; }
  return { x: SX + AX, y: SY + AY };
}

// ============================================================
// DRAW_PURPOSE — A00/A13スプライトの配置
// ============================================================
export function drawPurpose() {
  // PRG @DRAW_PURPOSE 完全準拠
  // home=(32-CARD_HW, 32-CARD_HH)=(14,4) → spofs引数=カード左上座標 = PRGと同じ値

  if (!gs.purpose || gs.purpose.length > 3) {
    // @_DRAW_PURPOSE_2: A00/A13 両方表示
    const angle = gs.urev ? 180 : 0;
    let x = 2, y = CARDS_CENTER_Y - CARD_HH - 8;
    spangle(SP_A00, angle);
    let px = gs.urev ? GRP_W - x - 1 : x;
    let py = gs.urev ? GRP_H - y - 1 : y;
    spofs(SP_A00, px, py);
    x = 2 + 8;  // PRG: X = 2 + 8
    spangle(SP_A13, angle);
    px = gs.urev ? GRP_W - x - 1 : x;
    py = gs.urev ? GRP_H - y - 1 : y;
    spofs(SP_A13, px, py);
    return;
  }

  const sp = gs.purpose === 'A00' ? SP_A00 : SP_A13;
  const deg = gs.purposeDeg;

  if (deg === 0) {
    // PRG: SPANGLE R, 0/180; X=2; Y=CARDS_CENTER_Y-CARD_HH-8
    const angle = gs.urev ? 180 : 0;
    let x = 2, y = CARDS_CENTER_Y - CARD_HH - 8;
    if (gs.urev) { x = GRP_W - x - 1; y = GRP_H - y - 1; }
    spangle(sp, angle); spofs(sp, x, y);
  } else if (deg === 90) {
    // PRG: SPANGLE R, 90/270; X=2+CARD_HEIGHT; Y=CARDS_CENTER_Y-CARD_HW-12
    const angle = gs.urev ? 270 : 90;
    let x = 2 + CARD_HEIGHT, y = CARDS_CENTER_Y - CARD_HW - 12;
    if (gs.urev) { x = GRP_W - x - 1; y = GRP_H - y - 1; }
    spangle(sp, angle); spofs(sp, x, y);
  } else if (deg === 270) {
    // PRG: SPANGLE R, 270/90; X=2; Y=CARDS_CENTER_Y+CARD_HW-12
    const angle = gs.urev ? 90 : 270;
    let x = 2, y = CARDS_CENTER_Y + CARD_HW - 12;
    if (gs.urev) { x = GRP_W - x - 1; y = GRP_H - y - 1; }
    spangle(sp, angle); spofs(sp, x, y);
  }
}

// ============================================================
// DRAW_TOKEN — トークンSPRITEを所定スロットへ移動
// ============================================================
export function drawToken(tm = 0) {
  // SP_TOKEN: sphome=(32,32), spofs=カード論理中心(CARD_X+CARD_HW, CARD_Y+CARD_HH)
  let dx = CARD_X[gs.token] + CARD_HW;
  let dy = CARD_Y[gs.token] + CARD_HH;
  if (gs.urev) { dx = GRP_W - dx - 1; dy = GRP_H - dy - 1; }
  spofs(SP_TOKEN, dx, dy, tm);
}

// ============================================================
// RELOAD_SPRITE — 起動時のSPRITE再構築
// ============================================================
export function reloadSprite() {
  // JRFTRTS7.png: 256x192px、各64x64スプライトが(0,64,128,192)px位置に横並び
  // 16x16CHR基準: chr = b + SPU7_xxx/16
  // B00=b+0, A00=b+4, A13=b+8, TOKEN=b+12+1+16*1(src:208,16)
  const b = 7 * 64;
  spset(SP_B00,   b + 0,  SPPL_B00,   0, 0, 2, 64, 64, SCREEN_U);
  sphome(SP_B00,  32, 32);  // B00のカード部分中心 = (32,32) in 64x64
  spangle(SP_B00, gs.urev ? 180 : 0);
  spofs(SP_B00, -1024, -1024);

  // A00/A13: PRG home=(0,0)が元。imgOfsXY=(14,4)補正でhome=(32-CARD_HW,32-CARD_HH)=(14,4)
  // → spofs引数 = カード左上座標（PRGのspofs=スプライト左上と等価）
  spset(SP_A00,   b + 4,  SPPL_A00,   0, 0, 3, 64, 64, SCREEN_U);
  sphome(SP_A00,  32 - CARD_HW, 32 - CARD_HH);  // (14,4)
  spangle(SP_A00, gs.urev ? 180 : 0);
  spofs(SP_A00, -1024, -1024);

  spset(SP_A13,   b + 8,  SPPL_A13,   0, 0, 3, 64, 64, SCREEN_U);
  sphome(SP_A13,  32 - CARD_HW, 32 - CARD_HH);  // (14,4)
  spangle(SP_A13, gs.urev ? 180 : 0);
  spofs(SP_A13, -1024, -1024);

  // TOKEN: 32x32本体が64x64枠の(16,16)位置にある
  // chr = b + 12 + 1 + 16*1 → chrInBank=29 → srcX=208,srcY=16 → 正しいTOKEN位置
  spset(SP_TOKEN, b + 12 + 1 + 16 * 1, SPPL_TOKEN, 0, 0, 1, 32, 32, SCREEN_U);
  sphome(SP_TOKEN, 16, 16);  // PRG: home=(PM_TOKEN_W/2,PM_TOKEN_H/2)=(16,16)
  spangle(SP_TOKEN, gs.urev ? 180 : 0);
  spofs(SP_TOKEN, -1024, -1024);
}

// ============================================================
// DRAW_SRBN — ソロバン枠をGPUTCHRで描画
// ============================================================
export function drawSrbn() {
  gpage(SCREEN_L);
  // 四隅
  gputchr((SRBN_CX + 0)  * 8, (SRBN_CY + 0) * 8, 'BGU1', BGU1_SRBN_TL, 0, 1);
  gputchr((SRBN_CX + 13) * 8, (SRBN_CY + 0) * 8, 'BGU1', BGU1_SRBN_TR, 0, 1);
  gputchr((SRBN_CX + 13) * 8, (SRBN_CY + 9) * 8, 'BGU1', BGU1_SRBN_BR, 0, 1);
  gputchr((SRBN_CX + 0)  * 8, (SRBN_CY + 9) * 8, 'BGU1', BGU1_SRBN_BL, 0, 1);
  // 左右辺
  for (let i = 0; i < 8; i++) {
    gputchr((SRBN_CX + 0)  * 8, (SRBN_CY + 1 + i) * 8, 'BGU1', BGU1_SRBN_L, 0, 1);
    gputchr((SRBN_CX + 13) * 8, (SRBN_CY + 1 + i) * 8, 'BGU1', BGU1_SRBN_R, 0, 1);
  }
  // 6桁分の軸・針
  for (let i = 0; i < 6; i++) {
    const x1 = (SRBN_CX + i*2 + 1) * 8;
    const x2 = (SRBN_CX + i*2 + 2) * 8;
    gputchr(x1, (SRBN_CY + 0) * 8, 'BGU1', BGU1_SRBN_T, 0, 1);
    gputchr(x2, (SRBN_CY + 0) * 8, 'BGU1', BGU1_SRBN_T, 0, 1);
    for (const row of [1, 2, 4, 5, 6, 7, 8]) {
      gputchr(x1, (SRBN_CY + row) * 8, 'BGU1', BGU1_SRBN_JIKUL, 0, 1);
      gputchr(x2, (SRBN_CY + row) * 8, 'BGU1', BGU1_SRBN_JIKUR, 0, 1);
    }
    gputchr(x1, (SRBN_CY + 3) * 8, 'BGU1', BGU1_SRBN_HARI, 0, 1);
    gputchr(x2, (SRBN_CY + 3) * 8, 'BGU1', BGU1_SRBN_HARI, 0, 1);
    if (i === 2) gputchr(x1 + 4, (SRBN_CY + 3) * 8, 'BGU1', BGU1_SRBN_TEN, 0, 1);
    gputchr(x1, (SRBN_CY + 9) * 8, 'BGU1', BGU1_SRBN_B, 0, 1);
    gputchr(x2, (SRBN_CY + 9) * 8, 'BGU1', BGU1_SRBN_B, 0, 1);
  }
}

// ============================================================
// DRAW_SRBN_TAMA — ソロバンの玉をBGPUTで描画
// ============================================================
export function drawSrbnTama() {
  // PRG @DRAW_SRBN_TAMA 完全準拠
  // 空きセルは bgput chr=0 → _bgDraw で clearRect → GRPの軸が見える
  bgpage(SCREEN_L);
  const TL = BGU1_SRBN_TAMAL;
  const TR = BGU1_SRBN_TAMAR;

  for (let i = 0; i < 6; i++) {
    let a;
    if      (i === 0) a = Math.floor(gs.sorobanL / 100);
    else if (i === 1) a = Math.floor((gs.sorobanL % 100) / 10);
    else if (i === 2) a = gs.sorobanL % 10;
    else if (i === 3) a = Math.floor(gs.sorobanR / 100);
    else if (i === 4) a = Math.floor((gs.sorobanR % 100) / 10);
    else              a = gs.sorobanR % 10;

    const cx1 = SRBN_CX + 1 + i * 2;
    const cx2 = SRBN_CX + 2 + i * 2;

    // 五の玉 row=SRBN_CY+1: A<5なら玉、A>=5なら0(クリア→GRPの軸が見える)
    let lc = TL, rc = TR;
    if (a >= 5) { lc = 0; rc = 0; }
    bgput(0, cx1, SRBN_CY + 1, lc, 0);
    bgput(0, cx2, SRBN_CY + 1, rc, 0);

    // 五の玉 row=SRBN_CY+2: A>=5なら玉(A-=5)、A<5なら0(クリア)
    lc = 0; rc = 0;
    if (a >= 5) { a -= 5; lc = TL; rc = TR; }
    bgput(0, cx1, SRBN_CY + 2, lc, 0);
    bgput(0, cx2, SRBN_CY + 2, rc, 0);

    // 一の玉 row=SRBN_CY+4〜8: A==nのrowだけ0(クリア)、他は玉
    for (let n = 0; n < 5; n++) {
      lc = TL; rc = TR;
      if (a === n) { lc = 0; rc = 0; }
      bgput(0, cx1, SRBN_CY + 4 + n, lc, 0);
      bgput(0, cx2, SRBN_CY + 4 + n, rc, 0);
    }
  }
}

// ============================================================
// DRAW_MAIN_PNL — 下画面のメインパネル全体を描画
// ============================================================
export function drawMainPnl() {
  gpage(SCREEN_L);
  // まず下画面全体をボード色で塗る
  gcls(COL_BOARD);
  drawSrbn();
  drawMiniCds1();

  // ゲームコンソール枠
  const cx = GAME_CON_CX * 8 - 4;
  const cy = GAME_CON_CY * 8 - 4;
  const cw = GAME_CON_CW * 8 + 8;
  const ch = GAME_CON_CH * 8 + 4;
  gfill(cx, cy, cx+cw-1, cy+ch-1, COL_WHITE);
  gbox(cx, cy, cx+cw-1, cy+ch-1, COL_GREY);
  // 四隅の丸み
  gpset(cx, cy, COL_BOARD); gpset(cx+1, cy+1, COL_GREY);
  gpset(cx+cw-1, cy, COL_BOARD); gpset(cx+cw-2, cy+1, COL_GREY);
  gline(cx+1, cy+ch-1, cx+cw-2, cy+ch-1, COL_WHITE);

  // ルール表示枠 (スーツ8個のグリッド)
  const rx = RULES_CX * 8 - 4;
  const ry = RULES_CY * 8 - 4;
  const rw = 3 * 4 * 8;
  const rh = 3 * 8 + 8;
  gfill(rx, ry, rx+rw-1, ry+rh-1, COL_WHITE);
  gbox(rx, ry, rx+rw-1, ry+rh-1, COL_GREY);
  gline(rx, ry + Math.floor(rh/2), rx+rw-1, ry + Math.floor(rh/2), COL_GREY);
  for (let i = 0; i < 3; i++) {
    gline(rx + (i+1)*3*8, ry, rx + (i+1)*3*8, ry+rh-1, COL_GREY);
  }
  // スーツ記号
  const suits = ['♠','♦','♥','♣'];
  for (let i = 0; i < 4; i++) {
    conPrint(SCREEN_L, RULES_CX + i*3, RULES_CY,     '↑' + suits[i]);
    conPrint(SCREEN_L, RULES_CX + i*3, RULES_CY + 2, '↓' + suits[i]);
  }

  // TalonとDiscardedの画像をGRPから描画
  if (_grpImages['S']) {
    const ctx = _lowerCtx();
    // Talon
    const [tsx, tsy] = _grpIdx(GRP_S_TALON);
    ctx.drawImage(_grpImages['S'], tsx, tsy, PM_TALON_W, PM_TALON_H,
                  TALON_X, TALON_Y, PM_TALON_W, PM_TALON_H);
    // Discarded
    const [dsx, dsy] = _grpIdx(GRP_S_DISCARDED);
    ctx.drawImage(_grpImages['S'], dsx, dsy, PM_DISCARDED_W, PM_DISCARDED_H,
                  DISCARDED_X, DISCARDED_Y, PM_DISCARDED_W, PM_DISCARDED_H);
  }
}

// ============================================================
// DRAW_MINI_CDS1 / DRAW_MINI_CDS2 — ミニカード表示
// ============================================================
/** DRAW_MINI_CDS1: i=0〜6の小アルカナスロット枠を描画（白矩形＋灰枠） */
export function drawMiniCds1() {
  gpage(SCREEN_L);
  // エリア背景をボード色でクリア
  gfill(MINI_CDS_X, MINI_CDS_Y, MINI_CDS_X+MINI_CDS_W-1, MINI_CDS_Y+MINI_CDS_H-1, COL_BOARD);
  const ctx = _lowerCtx();
  // i=0〜6: 7枠（idx6はMINI_CD_X[8]/Y[8]を使用）
  for (let i = 0; i <= 6; i++) {
    let mx = MINI_CD_X[i], my = MINI_CD_Y[i];
    if (i === 6) { mx = MINI_CD_X[8]; my = MINI_CD_Y[8]; }
    let x, y;
    if (gs.urev) {
      x = MINI_CDS_X + (MINI_CDS_W - 1 - mx) - MINI_CD_W + 1;
      y = MINI_CDS_Y + (MINI_CDS_H - 1 - my) - MINI_CD_H + 1;
    } else {
      x = MINI_CDS_X + mx;
      y = MINI_CDS_Y + my;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, MINI_CD_W, MINI_CD_H);
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 1;
    ctx.strokeRect(x+0.5, y+0.5, MINI_CD_W-1, MINI_CD_H-1);
  }
}

/** DRAW_MINI_CDS2: i=6〜7の枠を描画（トークン位置更新時等） */
export function drawMiniCds2() {
  gpage(SCREEN_L);
  const ctx = _lowerCtx();
  for (let i = 6; i <= 7; i++) {
    let mx = MINI_CD_X[i], my = MINI_CD_Y[i];
    let x, y;
    if (gs.urev) {
      x = MINI_CDS_X + (MINI_CDS_W - 1 - mx) - MINI_CD_W + 1;
      y = MINI_CDS_Y + (MINI_CDS_H - 1 - my) - MINI_CD_H + 1;
    } else {
      x = MINI_CDS_X + mx;
      y = MINI_CDS_Y + my;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, MINI_CD_W, MINI_CD_H);
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 1;
    ctx.strokeRect(x+0.5, y+0.5, MINI_CD_W-1, MINI_CD_H-1);
  }
}

// ============================================================
// LBG1_CLR — BG1の山札/捨て札エリアをクリア
// ============================================================
export function lbg1Clr() {
  bgpage(SCREEN_L);
  for (let j = 0; j < LBG1_CH; j++)
    for (let i = 0; i < LBG1_CW; i++)
      bgput(1, LBG1_CX + i, LBG1_CY + j, 0, 0);
  bgofs(1, 0, 0);
}

// ============================================================
// LBG1_B00 — BG1にカード裏面(B00)を表示
// ============================================================
// PRG @LBG1_DISCARDED: 下画面BG1に捨て札カード表示
// 1枚: 白カード枠(BGU1_WHCD_*)をbgput, 複数: BGU1_DISCARDEDアイコン
export function lbg1Discarded(cdsStr) {
  if (!cdsStr) return;
  const cds = cdsStr.split(',').filter(Boolean);
  if (cds.length === 0) return;

  bgpage(SCREEN_L);
  if (cds.length === 1) {
    // 1枚: 白カード枠 (PRG @_LBG1_DSC: BGU1_WHCD_*をbgput)
    for (let j = 0; j < CARD_CH; j++) {
      for (let i = 0; i < CARD_CW; i++) {
        let a = BGU1_WHCD_C;
        if      (i === 0            && j === 0)            a = BGU1_WHCD_TL;
        else if (i === CARD_CW - 1  && j === 0)            a = BGU1_WHCD_TR;
        else if (i === CARD_CW - 1  && j === CARD_CH - 1)  a = BGU1_WHCD_BR;
        else if (i === 0            && j === CARD_CH - 1)  a = BGU1_WHCD_BL;
        else if (i === 0)                                  a = BGU1_WHCD_L;
        else if (j === 0)                                  a = BGU1_WHCD_T;
        else if (i === CARD_CW - 1)                        a = BGU1_WHCD_R;
        else if (j === CARD_CH - 1)                        a = BGU1_WHCD_B;
        bgput(1, DISCARDED_CX + 1 + i, LBG1_CY + j, a, 0);
      }
    }
  } else {
    // 複数: 捨て札アイコン (PRG @_LBG1_DSC_2: BGU1_DISCARDED)
    for (let i = 0; i < DISCARDED_CH; i++) {
      for (let j = 0; j < DISCARDED_CW; j++) {
        const a = BGU1_DISCARDED + j * DISCARDED_CW + i;
        bgput(1, DISCARDED_CX + i, LBG1_CY + j, a, 0);
      }
    }
  }
}


export function lbg1B00() {
  bgpage(SCREEN_L);
  for (let r = 0; r < CARD_CH; r++)
    for (let a = 0; a < CARD_CW; a++)
      bgput(1, TALON_CX + a, LBG1_CY + r, BGU1_B00 + r * CARD_CW + a, SPPL_B00);
}

// ============================================================
// DISPLAY_TLN_NUM / OMIT_TLN_NUM — 山札枚数表示
// ============================================================
function _withFullClipL(fn) {
  // TALON_NUM_CY=11 はGAME_CON clip(row19-23)の外なので一時的にclipを全面に戻す
  const cs = conState, s = SCREEN_L;
  const [ox,oy,ow,oh] = [cs.clipCX[s],cs.clipCY[s],cs.clipCW[s],cs.clipCH[s]];
  cs.clipCX[s]=0; cs.clipCY[s]=0; cs.clipCW[s]=32; cs.clipCH[s]=24;
  fn();
  cs.clipCX[s]=ox; cs.clipCY[s]=oy; cs.clipCW[s]=ow; cs.clipCH[s]=oh;
}

export function displayTlnNum() {
  _withFullClipL(() => {
    // まず該当セルをclearRectで確実に消去してから描画
    const ctx = conCtxL();
    const FW = FONT_W * CON_SCALE, FH = FONT_H * CON_SCALE;
    ctx.clearRect(TALON_NUM_CX * FW, TALON_NUM_CY * FH, 3 * FW, FH);
    const n = gs.talon ? Math.floor((gs.talon.length + 1) / 4) : 0;
    const s = String(n).padStart(2, ' ');
    conPrint(SCREEN_L, TALON_NUM_CX, TALON_NUM_CY, `\\c0${s}`);
  });
}

export function omitTlnNum() {
  _withFullClipL(() => {
    const ctx = conCtxL();
    const FW = FONT_W * CON_SCALE, FH = FONT_H * CON_SCALE;
    // 実機でアンチエリアス残りが出るので上下左右1px余分にクリア
    ctx.clearRect(TALON_NUM_CX * FW - 1, TALON_NUM_CY * FH - 1, 3 * FW + 2, FH + 2);
  });
}

// ============================================================
// SHIPOUT — GRPページを表示面に転送（Web版では即時反映のためno-op）
// ============================================================
export function shipoutUGpage() { /* Canvas は即時描画 */ }
export function shipoutLGpage() { /* Canvas は即時描画 */ }

// ============================================================
// PLACE_RDLN_CD — 赤フレームをスロット位置に配置
// ============================================================
// PRG @PLACE_RDLN_CD: 大アルカナスロットに赤線をSPRITEで表示
// pos: スロット番号, sp: SPRITE番号
export function placeRdlnCd(pos, sp) {
  spset(sp, 4*64 + 8, 0, 0, 0, 1, 64, 64);
  sphome(sp, 32, 32);
  spangle(sp, gs.urev ? 180 : 0);
  // PRG: A=CARD_X[pos], IF ST_UREV THEN A=GRP_WIDTH-A-1 → SPOFS SP1,A,R
  // home=(0,0),angle=180の場合はGRP_WIDTH-CARD_X-1が起点
  // Web版: home=(32,32)方式なのでspofs=カード中心座標
  // urev時: 中心座標 = GRP_W - (CARD_X[pos] + CARD_HW) - 1
  //         = GRP_W - CARD_X[pos] - CARD_HW - 1
  let dx, dy;
  if (gs.urev) {
    dx = GRP_W - CARD_X[pos] - CARD_HW;
    dy = GRP_H - CARD_Y[pos] - CARD_HH;
  } else {
    dx = CARD_X[pos] + CARD_HW;
    dy = CARD_Y[pos] + CARD_HH;
  }
  spofs(sp, dx, dy);
}

// ============================================================
// FLOAT_SPG — 旧実装は末尾の完全版に移動
// ============================================================

// ============================================================
// MAIN_PNL_NEW — メインパネルのTCH_CTRL初期化
// ============================================================
let _mainPnlCtrl = null;

export function mainPnlNew() {
  _mainPnlCtrl = new TchCtrl();

  // STARTボタン領域 → RSTQダイアログ
  // Bボタン → RSTQ
  _mainPnlCtrl.add(0, 0, GRP_W, GRP_H, 'RSTQ', SCREEN_U);  // 上画面全体

  // Talon領域 (下画面)
  _mainPnlCtrl.add(TALON_X, TALON_Y, PM_TALON_W, PM_TALON_H, 'TALON', SCREEN_L);

  // 6スロット領域（トークン配置用）
  for (let i = 0; i < 6; i++) {
    _mainPnlCtrl.add(CARD_X[i], CARD_Y[i], CARD_WIDTH, CARD_HEIGHT, `PLACE,${i}`, SCREEN_U);
    // ST_UREV時は座標反転
    if (gs.urev) {
      const dx = GRP_W - CARD_X[i] - CARD_WIDTH;
      const dy = GRP_H - CARD_Y[i] - CARD_HEIGHT;
      _mainPnlCtrl.add(dx, dy, CARD_WIDTH, CARD_HEIGHT, `PLACE,${i}`, SCREEN_U);
    }
  }
}

// ============================================================
// MAIN_PNL_LOOP_R — タッチ入力を待ってアクションを返す
// ============================================================
/**
 * @param {string} mode  'PLACE' | 'TALON' | 'CALC' 等
 * @returns {Promise<{action:string, val:string}>}
 */
// ============================================================
// SP_CURSOR — ポインタカーソル
// ============================================================
let _cursorX = -1024, _cursorY = -1024, _cursorVisible = false;
export function _showCursor(x, y) { _cursorX = x; _cursorY = y; _cursorVisible = true; }
export function _hideCursor()      { _cursorX = -1024; _cursorY = -1024; _cursorVisible = false; }
export function drawCursorIfVisible(ctx) {
  if (!_cursorVisible || _cursorX < 0) return;
  ctx.save();
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeText('↖', _cursorX, _cursorY + 12);
  ctx.fillText('↖',   _cursorX, _cursorY + 12);
  ctx.restore();
}
export function _spriteDrawAll(ctxLspr) {
  if (ctxLspr) drawCursorIfVisible(ctxLspr);
  // 上画面の赤線と offscreenスプライトはgame.jsのsetRenderCallbackで管理
}

// ============================================================
// _setClip / _gameCon — render.js内ローカル実装（循環import回避）
// ============================================================
function _setClip(disp, cx, cy, cw, ch) {
  conState.clipCX[disp] = cx; conState.clipCY[disp] = cy;
  conState.clipCW[disp] = cw; conState.clipCH[disp] = ch;
}
function _gameCon() {
  _setClip(SCREEN_L, GAME_CON_CX, GAME_CON_CY, GAME_CON_CW, GAME_CON_CH);
  conCls(SCREEN_L);
}
// render.js内ローカルhelper（game.jsへの循環import回避）
function _msg(key)   { return MSG[gs.lang]?.[key] || ''; }
function _words()    { return MSG_WORDS[gs.lang] || {}; }
function _trtmj(i)   { return MSG_TRTMJ[gs.lang]?.[i] || ''; }

// ============================================================
// BOARD_TO_HXG — ボード→易卦名 (youscout.prg 2046行準拠)
// ============================================================
export function boardToHxg() {
  if (gs.purposeDeg !== 0) {
    if (gs.purposeDeg === 90  && gs.purpose === 'A00') return MSG_HXG[64];
    if (gs.purposeDeg === 90  && gs.purpose === 'A13') return MSG_HXG[65];
    if (gs.purposeDeg === 270 && gs.purpose === 'A00') return MSG_HXG[66];
    if (gs.purposeDeg === 270 && gs.purpose === 'A13') return MSG_HXG[67];
    return '';
  }
  let a = 0;
  for (let i = 0; i < 6; i++) {
    a += (parseInt(gs.board[i].slice(1, 3)) % 2) * NUM_TO_BIT[i];
  }
  return MSG_HXG[a] || '';
}

// ============================================================
// DISPLAY_RULE — ルール情報をゲームコンソールに表示 (3458行準拠)
// ============================================================
function _displayRule(utrgQ, suit) {
  _gameCon();
  const ruleStr  = RULE_COMP[utrgQ]?.[suit] || '';
  const arrowIdx = ruleStr.indexOf('>');
  let left, right;
  if (arrowIdx === -1) { left = words().stay; right = ''; }
  else { left = ruleStr.slice(0, arrowIdx); right = ' > ' + ruleStr.slice(arrowIdx + 1); }
  conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY,     left);
  conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY + 1, right);

  let y = GAME_CON_CY + 2;
  const moveStr = RULE_MOVE[utrgQ]?.[suit] || '';
  if (moveStr !== '') {
    let ms = moveStr;
    if (ms === 'CHOOSE') ms = RULE_MOVE_C[utrgQ]?.[suit] || '';
    conPrint(SCREEN_L, GAME_CON_CX, y,
      words().move + ms[0] + ':' + ms.slice(2));
    y++;
  }
  const stayStr = RULE_STAY[utrgQ]?.[suit] || '';
  const stayCStr = RULE_STAY_C?.[utrgQ]?.[suit] || '';
  if (moveStr === 'CHOOSE') {
    conPrint(SCREEN_L, GAME_CON_CX, y,
      words().stay + '(' + words().obliged + '):' + stayStr);
    y++;
    conPrint(SCREEN_L, GAME_CON_CX, y,
      words().stay + '(' + words().chose + '):' + stayCStr);
  } else {
    conPrint(SCREEN_L, GAME_CON_CX, y, words().stay + ':' + stayStr);
  }
}

// ============================================================
// DISPLAY_CD_INFO — カード情報をゲームコンソールに表示 (3636行準拠)
// ============================================================
// PRG @CARD_TO_DCHR: カード文字列 → 表示用短縮記号
export function cardToDchr(cd) {
  if (!cd || cd.length < 3) return '?';
  const suit = cd[0];
  const num  = parseInt(cd.slice(1, 3));
  const suitChar = {S:'♠', D:'♦', H:'♥', C:'♣'}[suit] || suit;
  let numStr = String(num);
  if (num === 1)  numStr = 'A';
  if (num === 11) numStr = 'J';
  if (num === 12) numStr = 'C';
  if (num === 13) numStr = 'Q';
  if (num === 14) numStr = 'K';
  return suitChar + numStr;
}

function cardToScore(cd) {
  if (!cd || cd.length < 3 || cd[0] === 'A') return 0;
  const n = parseInt(cd.slice(1, 3));
  const courtCd = gs.courtCd || 'K14';
  if (n <= 10) return n;
  if (courtCd === 'K14') return n;
  if (courtCd === 'K10') return 10;
  if (courtCd === 'K13a') return n >= 13 ? n - 1 : n;
  if (courtCd === 'K13b') return n >= 12 ? n - 1 : n;
  return n;
}

function _displayCdInfo(mode, place) {
  _gameCon();
  if (place === 6 || place === 7 || place === 9) {
    // 小アルカナスタック or 捨て札
    const cds = (place === 9) ? gs.discarded.split(',').filter(Boolean)
                               : (gs.cards[place] || '').split(',').filter(Boolean);
    if (cds.length === 0) {
      conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY,
        words().cards + ':' + words().none);
    } else {
      let s = '', sc = 0;
      for (let i = 0; i < cds.length; i++) {
        s  += cardToDchr(cds[i]);
        if (place !== 9) sc += cardToScore(cds[i]);
        if (i !== cds.length - 1) s += ',';
      }
      const scoreStr = (place === 9) ? s : s + ' = ' + sc;
      conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY,
        words().cards + ':' + scoreStr);
      if (place === 6 || place === 7) placeRdln('CARDS', place, '');
    }
    return;
  }
  if (place === 8) {
    // purpose カード → 易卦表示
    const hxg = boardToHxg();
    conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY, msg('thisHxg').replace('\\[0]', hxg));
    return;
  }
  // 大アルカナスロット (0-5)
  const cd  = gs.board[place] || '';
  const num = parseInt(cd.slice(1, 3));
  const rev = cd[3] === 'R';
  const tbl = TABLE_MAJOR[num] || [];
  let s = '(' + num + ')' + trtmj(num) + '\n ';
  // tbl[]は数値(0含む)なのでString()で変換、未定義のみ''
  const v2s = (v) => v !== undefined ? String(v) : '';
  if (!rev) {
    s += '  ';
    for (let i = 0; i < 4; i++)
      s += ' ' + SUIT_CHARS[i] + v2s(tbl[i * 2]) + '/' + v2s(tbl[i * 2 + 1]);
  } else {
    s += '(' + words().inv + ')';
    for (let i = 0; i < 4; i++)
      s += ' ' + SUIT_CHARS[3 - i] + v2s(tbl[7 - (i * 2 + 1)]) + '/' + v2s(tbl[7 - i * 2]);
  }
  conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY, s);
  // 大アルカナスロットに赤線表示 (MAJOR)
  placeRdln('MAJOR', place, '');

  if (mode === 'PLACE') {
    if (gs.purposeDeg !== 0) {
      const ok = (gs.purpose === 'A00' && place < 3) ||
                 (gs.purpose === 'A13' && place >= 3);
      if (!ok) conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY + 2, msg('noPlsl'));
    }
    return;
  }
  // TALON/CALC mode: 小アルカナカード一覧
  const mcds = (gs.cards[place] || '').split(',').filter(Boolean);
  if (mcds.length === 0) {
    conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY + 2,
      words().cards + ':' + words().none);
  } else {
    let s2 = '', sc2 = 0;
    for (let i = 0; i < mcds.length; i++) {
      s2  += cardToDchr(mcds[i]);
      sc2 += cardToScore(mcds[i]);
      if (i !== mcds.length - 1) s2 += ',';
    }
    conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY + 2,
      words().cards + ':' + s2 + ' = ' + sc2);
  }
}

// ============================================================
// _omitRdln / _gameCon ラッパー
// ============================================================
function _omitRdln() { /* 赤フレームを消す処理 (spclr等) */ }

// ============================================================
// MAIN_PNL_SELのカーソル位置計算 (_MAIN_PNL_LP_SEL準拠)
// ============================================================
function _updateSel(sel) {
  if (sel === -1) { _hideCursor(); return; }
  if (sel >= 10 && sel <= 17) {
    // ルール枠領域: _MAIN_PNL_LP_SLR
    const a = sel - 10;
    const x = ((a % 4) * 3 + RULES_CX) * FONT_W - 4 + 12;
    const y = (Math.floor(a / 4) * 2 + RULES_CY) * FONT_H - 4 + 8;
    _showCursor(x, y);
    _displayRule(Math.floor(a / 4) === 0 ? 1 : 0, a % 4);
    return;
  }
  // ミニカード領域: _MAIN_PNL_LP_SL1
  const a = sel;
  let x = MINI_CD_X[a], y = MINI_CD_Y[a];
  if (!gs.urev) {
    x = x + MINI_CDS_X + Math.floor(MINI_CD_W / 2);
    y = y + MINI_CDS_Y + Math.floor(MINI_CD_H / 2);
  } else {
    x = MINI_CDS_W - 1 - x + MINI_CDS_X - MINI_CD_W + 1 + Math.floor(MINI_CD_W / 2);
    y = MINI_CDS_H - 1 - y + MINI_CDS_Y - MINI_CD_H + 1 + Math.floor(MINI_CD_H / 2);
  }
  _showCursor(x, y);
}

function _selAndDisplay(mode, sel) {
  _updateSel(sel);
  if (sel === -1) {
    if (mode === 'TALON') {
      // TALONモード: drewメッセージはmodeWCalcで表示済み
      // clkTlnのみ lastCX/lastCY から続けて表示（drewを消さない）
      // ただし初回(lastCY==GAME_CON_CY)のみ表示、それ以外は何もしない
      // → 実際はmodeWCalcで既にdrew+clkTlnを表示しているのでここでは何もしない
    } else {
      _gameCon();
      conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY, msg('chspls'));
    }
    // purpose制限メッセージ
    if (gs.purposeDeg !== 0 && mode !== 'PLACE') {
      let hxg = '', trg = '';
      if (gs.purposeDeg === 90  && gs.purpose === 'A00') { hxg = MSG_HXG[64]; trg = words().ltrg; }
      if (gs.purposeDeg === 90  && gs.purpose === 'A13') { hxg = MSG_HXG[65]; trg = words().utrg; }
      if (gs.purposeDeg === 270 && gs.purpose === 'A00') { hxg = MSG_HXG[66]; trg = words().ltrg; }
      if (gs.purposeDeg === 270 && gs.purpose === 'A13') { hxg = MSG_HXG[67]; trg = words().utrg; }
      if (hxg) conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY + 1,
        msg('chsplss').replace('\\[0]', hxg).replace('\\[1]', trg));
    }
    return;
  }
  if (sel >= 10) return;  // ルール: _updateSelで処理済み
  _displayCdInfo(mode, sel);
}

// ============================================================
// MAIN_PNL_LOOP_R — メインパネルのインタラクションループ (3949行準拠)
// ============================================================
export async function mainPnlLoopR(mode) {
  clearTouchQueue();
  let sel = -1;
  _selAndDisplay(mode, sel);
  let prevBtn = 0;

  while (true) {
    await vsync(1);
    const btn = button(2);
    const btnPressed = btn & ~prevBtn;  // 今フレームで新たに押されたボタン
    prevBtn = btn;

    // Bボタン → タイトルへ戻る確認
    if (btnPressed & BTN_B) {
      const confirmed = await _popupRstq();
      if (confirmed) { _hideCursor(); return { action: 'RESET', val: '-1' }; }
      _selAndDisplay(mode, sel);
      continue;
    }

    // Aボタン → CLICK（TALONを引く / PLACEで選択確定）
    if (btnPressed & BTN_A) {
      if (mode === 'TALON') {
        omitRdln(); _hideCursor(); return { action: 'TALON', val: 'TALON' };
      }
      if (mode === 'PLACE' && sel >= 0 && sel <= 5 && _checkPlaceValid(sel)) {
        omitRdln(); _hideCursor(); return { action: 'PLACE', val: String(sel) };
      }
    }

    // 方向キー → sel移動 (_MAIN_PNL_LP_BTN準拠)
    if (btnPressed & (BTN_UP | BTN_DOWN | BTN_LEFT | BTN_RIGHT)) {
      const dir = (btnPressed & BTN_UP) ? 'B_UP'
                : (btnPressed & BTN_DOWN) ? 'B_DOWN'
                : (btnPressed & BTN_LEFT) ? 'B_LEFT' : 'B_RIGHT';
      beep(BEEP_SELECT);
      sel = _moveSel(sel, dir, mode);
      _selAndDisplay(mode, sel);
      continue;
    }

    // タッチイベント
    const ev = getTouchEvent();
    if (!ev) continue;

    // === TCH_CTRL_CHECK_R 相当 ===
    // RR$[0]に相当するアクション種別とその座標を判定

    // RESET (RSTQ)
    // → _popupRstqで処理済み

    // 上画面タッチ → CLICK
    if (ev.screen === SCREEN_U) {
      // 上画面タッチ: 0-5=大アルカナ優先、次に6,7=小アルカナ領域、8=purposeカード
      let hitCard = false;

      // place 0-5: 大アルカナスロット
      for (let i = 0; i < 6; i++) {
        let dx = CARD_X[i], dy = CARD_Y[i];
        if (gs.urev) { dx = GRP_W - dx - CARD_WIDTH; dy = GRP_H - dy - CARD_HEIGHT; }
        if (ev.x >= dx && ev.x < dx + CARD_WIDTH && ev.y >= dy && ev.y < dy + CARD_HEIGHT) {
          hitCard = true;
          if (mode === 'PLACE') {
            if (sel === i && _checkPlaceValid(i)) {
              omitRdln(); _hideCursor(); return { action: 'PLACE', val: String(i) };
            }
            if (sel !== i) { beep(BEEP_SELECT); sel = i; _selAndDisplay(mode, sel); }
          } else {
            if (sel !== i) { beep(BEEP_SELECT); sel = i; _selAndDisplay(mode, sel); }
          }
          break;
        }
      }

      // place 6,7: 小アルカナ領域（CARDS_X[6/7], CARDS_Y[6/7], CARDS_W, CARDS_H）
      if (!hitCard) {
        for (const i of [6, 7]) {
          let dx = CARDS_X[i], dy = CARDS_Y[i];
          if (gs.urev) { dx = GRP_W - dx - CARDS_W; dy = GRP_H - dy - CARDS_H; }
          if (ev.x >= dx && ev.x < dx + CARDS_W && ev.y >= dy && ev.y < dy + CARDS_H) {
            hitCard = true;
            if (sel !== i) { beep(BEEP_SELECT); sel = i; _selAndDisplay(mode, sel); }
            break;
          }
        }
      }

      // place 8: purposeカード（drawPurposeの基本位置: x=2, y=CARDS_CENTER_Y-CARD_HH-8）
      if (!hitCard) {
        let px = 2, py = CARDS_CENTER_Y - CARD_HH - 8;
        if (gs.urev) { px = GRP_W - px - CARD_WIDTH; py = GRP_H - py - CARD_HEIGHT; }
        if (ev.x >= px && ev.x < px + CARD_WIDTH + 8 && ev.y >= py && ev.y < py + CARD_HEIGHT) {
          hitCard = true;
          if (sel !== 8) { beep(BEEP_SELECT); sel = 8; _selAndDisplay(mode, sel); }
        }
      }

      if (!hitCard && mode === 'TALON') {
        // 何もないところをタッチ → TALONを引く
        omitRdln(); _hideCursor(); return { action: 'TALON', val: 'TALON' };
      }
      if (!hitCard) { beep(BEEP_CANCEL); }
      continue;
    }

    // 下画面タッチ
    if (ev.screen !== SCREEN_L) continue;
    const lx = ev.x, ly = ev.y;

    // SRBN (ソロバン) クリック
    const srbX0 = SRBN_CX * 8, srbY0 = SRBN_CY * 8;
    const srbX1 = (SRBN_CX + SRBN_CW) * 8, srbY1 = (SRBN_CY + SRBN_CH) * 8;
    if (lx >= srbX0 && lx < srbX1 && ly >= srbY0 && ly < srbY1) {
      const sx = Math.floor((lx - srbX0) / 8);
      const sy = Math.floor((ly - srbY0) / 4);
      // 上段(sel=6)/下段(sel=7)の判定: ソロバン縦半分で分割
      const srbMidY = srbY0 + (srbY1 - srbY0) / 2;
      const srbSel = ly < srbMidY ? 6 : 7;
      if (sx === 0 || sx === SRBN_CW - 1) {
        // 端クリック → ソロバンリセット
        gs.sorobanL = 0; gs.sorobanR = 0;
        bgmset(BGM_BEEP, SND_SRBN_CLR); bgmplay(BGM_BEEP);
        drawSrbnTama();
      } else if (sy !== 0 && sy !== 1 && sy !== 6 && sy !== 7 && sy !== 18 && sy !== 19) {
        // 珠クリック: _MAIN_PNL_LP_SB準拠
        const col  = Math.floor((sx - 1) / 2);
        const rightQ = col > 2;
        const mag  = 2 - (col - 3 * Number(rightQ));
        const fiveQ = sy < 6;
        const y2   = sy >= 8 ? sy - 8 : sy - 2;
        _clickSrbn(rightQ, mag, fiveQ, y2);
      }
      continue;
    }

    // RULES クリック: _MAIN_PNL_LP_RL準拠
    // RULES_CXから4スーツ×3CHR幅、RULES_CYから2行
    const ruleX0 = RULES_CX * 8 - 4, ruleY0 = RULES_CY * 8 - 4;
    const ruleX1 = (RULES_CX + 4 * 3) * 8, ruleY1 = (RULES_CY + 4) * 8;
    if (lx >= ruleX0 && lx < ruleX1 && ly >= ruleY0 && ly < ruleY1) {
      const a = Math.floor((lx - ruleX0) / (3 * FONT_W)) + Math.floor((ly - ruleY0) / 16) * 4;
      sel = 10 + a;
      _selAndDisplay(mode, sel);
      continue;
    }

    // MINI_CDS クリック: _MAIN_PNL_LP_MC準拠
    const mcX0 = MINI_CDS_X, mcY0 = MINI_CDS_Y;
    const mcX1 = MINI_CDS_X + MINI_CDS_W, mcY1 = MINI_CDS_Y + MINI_CDS_H;
    if (lx >= mcX0 && lx < mcX1 && ly >= mcY0 && ly < mcY1) {
      const a = lx - mcX0, r = ly - mcY0;
      for (let i = 0; i < 9; i++) {
        let cx = MINI_CD_X[i], cy = MINI_CD_Y[i];
        if (gs.urev) {
          cx = MINI_CDS_W - 1 - cx - MINI_CD_W + 1;
          cy = MINI_CDS_H - 1 - cy - MINI_CD_H + 1;
        }
        if (a >= cx && a < cx + MINI_CD_W && r >= cy && r < cy + MINI_CD_H) {
          if (mode === 'PLACE' && sel === i && _checkPlaceValid(i)) {
            omitRdln(); _hideCursor(); return { action: 'PLACE', val: String(i) };
          }
          sel = i;
          _selAndDisplay(mode, sel);
          break;
        }
      }
      continue;
    }

    // DISCARDED (捨て札) クリック: sel変更なし、カード一覧を表示
    if (lx >= DISCARDED_X && lx < DISCARDED_X + PM_DISCARDED_W &&
        ly >= DISCARDED_Y && ly < DISCARDED_Y + PM_DISCARDED_H) {
      _gameCon();
      _displayCdInfo(mode, 9);  // place=9=DISCARDED
      continue;
    }

    // TALON (山札) クリック
    if (lx >= TALON_X && lx < TALON_X + PM_TALON_W &&
        ly >= TALON_Y && ly < TALON_Y + PM_TALON_H) {
      if (mode === 'TALON') {
        omitRdln(); _hideCursor(); return { action: 'TALON', val: 'TALON' };
      }
      // PLACEモードでTalonクリック → キャンセル
      beep(BEEP_CANCEL);
      sel = -1; _selAndDisplay(mode, sel);
      continue;
    }
  }
}

// CLICK_SRBN準拠 (3536行)
function _clickSrbn(rightQ, mag, fiveQ, y) {
  let s = rightQ ? gs.sorobanR : gs.sorobanL;
  const r = Math.pow(10, mag);
  let a = Math.floor(s / r) % 10;
  if (fiveQ) {
    a = Math.floor(a / 5);
    s -= a * 5 * r;
    if (Math.floor(y / 2) === a) { a = a ? 0 : 1; }
    else { a = Math.floor(y / 2); }
    s += a * 5 * r;
  } else {
    a = a % 5;
    s -= a * r;
    const hy = Math.floor(y / 2);
    if (a === hy)      { /* toggle: そのまま */ }
    else if (a < hy)   { a = Math.floor((y - 1) / 2); }
    else               { a = Math.floor((y + 1) / 2); }
    s += a * r;
  }
  s = Math.max(0, Math.min(999, s));
  if (rightQ) gs.sorobanR = s; else gs.sorobanL = s;
  bgmset(BGM_BEEP, SND_SRBN); bgmplay(BGM_BEEP);
  drawSrbnTama();
}

function _checkPlaceValid(i) {
  if (gs.purpose === 'A00' && i >= 3) return false;
  if (gs.purpose === 'A13' && i < 3)  return false;
  return true;
}

// _MAIN_PNL_LP_BTN / _MAIN_PNL_LP_BTR 完全準拠
// sel: -1=未選択, 0-5=カードスロット(大アルカナ), 6=SRBN上, 7=SRBN下, 8=TALON, 10-17=RULES
// 正位置(urev=false): BTN, 逆位置(urev=true): BTR (方向が反転)
// BTNとBTRは構造が異なる（BTRはUP/DOWNとLEFT/RIGHTが逆）
function _moveSel(sel, dir, mode) {
  let a = sel;
  const urev = !!gs.urev;

  if (!urev) {
    // === _MAIN_PNL_LP_BTN (正位置) ===
    if (a === -1) {
      if (dir === 'B_DOWN' || dir === 'B_LEFT') a = 0;
      else a = 14;
    } else if (a >= 0 && a <= 5) {
      // _MAIN_PNL_LP_B1: カードスロット
      if      (dir === 'B_UP'    && a <= 2)                  a = a + 3;
      else if (dir === 'B_UP'    && a > 2)                   a = 7;
      else if (dir === 'B_RIGHT' && a !== 0 && a !== 3)      a = a - 1;
      else if (dir === 'B_RIGHT' && (a === 0 || a === 3))    a = 10;
      else if (dir === 'B_LEFT'  && a !== 2 && a !== 5)      a = a + 1;
      else if (dir === 'B_LEFT'  && (a === 2 || a === 5))    a = 8;
      else if (dir === 'B_DOWN'  && a <= 2)                  a = 6;
      else if (dir === 'B_DOWN'  && a > 2)                   a = a - 3;
      // PLACEモードでは0-5と8のみ有効
      if (mode === 'PLACE' && !(a >= 0 && a <= 5) && a !== 8) a = sel;
    } else if (a === 6) {
      // _MAIN_PNL_LP_BC: SRBN上
      if      (dir === 'B_UP')    a = 1;
      else if (dir === 'B_RIGHT') a = 0;
      else if (dir === 'B_LEFT')  a = 2;
    } else if (a === 7) {
      // _MAIN_PNL_LP_BS: SRBN下
      if      (dir === 'B_DOWN')  a = 4;
      else if (dir === 'B_RIGHT') a = 3;
      else if (dir === 'B_LEFT')  a = 5;
    } else if (a === 8) {
      // _MAIN_PNL_LP_BP: TALON
      if      (dir === 'B_UP')    a = 5;
      else if (dir === 'B_DOWN')  a = 2;
      else if (dir === 'B_RIGHT') a = 2;
      else if (dir === 'B_LEFT')  a = 13;
    } else if (a >= 10 && a <= 17) {
      // _MAIN_PNL_LP_BR: RULES
      if      (dir === 'B_UP'    && a === 13)              a = 8;
      else if (dir === 'B_UP'    && a >= 14)               a = a - 4;
      else if (dir === 'B_DOWN'  && a <= 13)               a = a + 4;
      else if (dir === 'B_RIGHT' && a !== 13 && a !== 17)  a = a + 1;
      else if (dir === 'B_RIGHT' && (a === 13 || a === 17)) a = 8;
      else if (dir === 'B_LEFT'  && a !== 10 && a !== 14)  a = a - 1;
      else if (dir === 'B_LEFT'  && (a === 10 || a === 14)) a = 0;
    }
  } else {
    // === _MAIN_PNL_LP_BTR (逆位置: UP/DOWNとLEFT/RIGHTを入れ替え) ===
    if (a === -1) {
      if (dir === 'B_UP' || dir === 'B_RIGHT') a = 8;
      else a = 14;
    } else if (a >= 0 && a <= 5) {
      // _MAIN_PNL_LP_BR1
      if      (dir === 'B_DOWN'  && a <= 2)                  a = a + 3;
      else if (dir === 'B_DOWN'  && a > 2)                   a = 7;
      else if (dir === 'B_LEFT'  && a !== 0 && a !== 3)      a = a - 1;
      else if (dir === 'B_LEFT'  && (a === 0 || a === 3))    a = 8;
      else if (dir === 'B_RIGHT' && a !== 2 && a !== 5)      a = a + 1;
      else if (dir === 'B_RIGHT' && (a === 2 || a === 5))    a = 14;
      else if (dir === 'B_UP'    && a <= 2)                  a = 6;
      else if (dir === 'B_UP'    && a > 2)                   a = a - 3;
      if (mode === 'PLACE' && !(a >= 0 && a <= 5) && a !== 8) a = sel;
    } else if (a === 6) {
      // _MAIN_PNL_LP_BRC
      if      (dir === 'B_DOWN')  a = 1;
      else if (dir === 'B_LEFT')  a = 0;
      else if (dir === 'B_RIGHT') a = 2;
    } else if (a === 7) {
      // _MAIN_PNL_LP_BRS
      if      (dir === 'B_UP')    a = 4;
      else if (dir === 'B_LEFT')  a = 3;
      else if (dir === 'B_RIGHT') a = 5;
    } else if (a === 8) {
      // _MAIN_PNL_LP_BRP
      if      (dir === 'B_DOWN')  a = 5;
      else if (dir === 'B_UP')    a = 2;
      else if (dir === 'B_LEFT')  a = 2;
      else if (dir === 'B_RIGHT') a = 10;
    } else if (a >= 10 && a <= 17) {
      // _MAIN_PNL_LP_BRR
      if      (dir === 'B_UP'    && a === 13)               a = 3;
      else if (dir === 'B_UP'    && a >= 14)                a = a - 4;
      else if (dir === 'B_DOWN'  && a <= 13)                a = a + 4;
      else if (dir === 'B_RIGHT' && a !== 13 && a !== 17)   a = a + 1;
      else if (dir === 'B_RIGHT' && (a === 13 || a === 17)) a = 3;
      else if (dir === 'B_LEFT'  && a !== 10 && a !== 14)   a = a - 1;
      else if (dir === 'B_LEFT'  && (a === 10 || a === 14)) a = 8;
    }
  }
  return a;
}


async function _popupRstq() {
  beep(BEEP_POPUP);  // POPUP_MNU_RA: BEEP BEEP_POPUP
  // clip全面リセット
  conState.clipCX[SCREEN_L] = 0; conState.clipCY[SCREEN_L] = 0;
  conState.clipCW[SCREEN_L] = CON_W; conState.clipCH[SCREEN_L] = CON_H;
  conCls(SCREEN_L);
  conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY, msg('rstq'));
  const result = await popupMenu(
    [[msg('rstqyn_yes'), 'yes'], [msg('rstqyn_no'), 'no']],
    { disp: SCREEN_L }
  );
  return result === 'yes';
}

// カードスタックのOffscreenCanvas幅・高さを計算
function _cdsSpgSize(n, anchor) {
  if (n <= 0) return {w: CARD_WIDTH, h: CARD_HEIGHT};
  // n枚のカードが占める最大オフセット + カード1枚分
  const maxOfs = _nthCdXY(0, n, anchor);  // i=0が最大XY
  const extra = n > 5 ? _nthCdXY(0, n, anchor) : {x: maxOfs.x, y: maxOfs.y};
  // 全カードのxy範囲を計算
  let maxX = 0, maxY = 0;
  for (let i = 0; i < n; i++) {
    const {x, y} = _nthCdXY(i, n, anchor);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return {
    w: maxX + CARD_WIDTH,
    h: maxY + CARD_HEIGHT,
  };
}

export function redrawCds() {
  // PRG REDRAW_CDS準拠:
  // 逆順でSPRITEを解放し、正順でSPRITEを作成・配置
  for (let order = 7; order >= 0; order--) {
    const i = BOARD_ORDER[order];
    if (gs.curSpg[i] !== '') {
      spclr(gs.curSpg[i]);
      clearSpriteBitmap(gs.curSpg[i]);
      gs.curSpg[i] = '';
    }
  }
  for (let order = 0; order <= 7; order++) {
    const i = BOARD_ORDER[order];
    if (!gs.cards[i]) continue;
    const arr = gs.cards[i].split(',').filter(Boolean);
    if (arr.length === 0) continue;
    const n = arr.length;
    const anchor = CARDS_ANCHOR[i];

    // CARDS_W×CARDS_H固定サイズのOffscreenCanvasに全カードを描画
    // urev時はCanvas内で位置を反転させる
    const w = CARDS_W;
    const h = CARDS_H;
    const oc = new OffscreenCanvas(w, h);
    const oct = oc.getContext('2d');
    oct.imageSmoothingEnabled = false;

    for (let ci = n - 1; ci >= 0; ci--) {
      const cd = arr[ci];
      const suit = cd[0];
      const num  = parseInt(cd.slice(1, 3));
      const revKey = {S:'RS', D:'RD', H:'RH', C:'RC'};
      const sheetKey = gs.urev ? (revKey[suit] || suit) : suit;
      const sheet = _grpImages[sheetKey] || _grpImages[suit];
      if (!sheet) continue;
      const [sx, sy] = _grpIdx(num - 1);
      let {x: offX, y: offY} = _nthCdXY(ci, n, anchor);
      if (offX < 0 && offY < 0) continue;
      if (gs.urev) {
        offX = w - offX - CARD_WIDTH;
        offY = h - offY - CARD_HEIGHT;
      }
      oct.drawImage(sheet, sx, sy, CARD_WIDTH, CARD_HEIGHT,
                    offX, offY, CARD_WIDTH, CARD_HEIGHT);
    }

    const bitmap = oc.transferToImageBitmap();
    const sp = _allocSp();
    setSpriteBitmap(sp, bitmap, w, h);
    spset(sp, -1, 0, 0, 0, 4, w, h, SCREEN_U);  // pri=4=背面
    sphome(sp, 0, 0);
    let dx = CARDS_X[i], dy = CARDS_Y[i];
    if (gs.urev) { dx = GRP_W - dx - w; dy = GRP_H - dy - h; }
    spofs(sp, dx, dy);
    gs.curSpg[i] = sp;
  }
}


export function drawDrawnCard(cdStr, x, y) {
  if (!cdStr) return;
  const suit = cdStr[0];
  const num  = parseInt(cdStr.slice(1, 3));
  const isArcana = (suit === 'A');
  const W = CARD_WIDTH;
  const H = CARD_HEIGHT;
  const oc = new OffscreenCanvas(W, H);
  const oct = oc.getContext('2d');
  oct.imageSmoothingEnabled = false;
  if (isArcana) {
    const sheet = gs.urev ? _grpImages['RD'] : _grpImages['D'];
    const idx = (num === 0) ? 15 : 16;
    const [sx, sy] = _grpIdx(idx);
    oct.drawImage(sheet, sx, sy, CARD_WIDTH, CARD_HEIGHT, 0, 0, W, H);
  } else {
    const revKey = { S:'RS', D:'RD', H:'RH', C:'RC' };
    const sheetKey = gs.urev ? (revKey[suit] || suit) : suit;
    const sheet = _grpImages[sheetKey] || _grpImages[suit];
    if (!sheet) { console.warn('drawDrawnCard: no sheet for', cdStr); return; }
    const idx = num - 1;
    const [sx, sy] = _grpIdx(idx);
    oct.drawImage(sheet, sx, sy, CARD_WIDTH, CARD_HEIGHT, 0, 0, W, H);
  }
  // SP_DRAWNにbitmapとして登録してactiveにする
  const bitmap = oc.transferToImageBitmap();
  // urev時はbitmapを180度回転して描画（sphomeは常に(0,0)）
  setSpriteBitmap(SP_DRAWN, bitmap, W, H);
  // SP_DRAWNをactiveにする（pri=3: B00(pri=2)より背面でアニメ中は隠れる）
  spset(SP_DRAWN, -1, 0, 0, 0, 3, W, H, SCREEN_U);
  // PRG: IF ST_UREV THEN SPHOME SP_DRAWN, CARD_WIDTH-1, CARD_HEIGHT-1
  sphome(SP_DRAWN, gs.urev ? W - 1 : 0, gs.urev ? H - 1 : 0);
  if (x !== undefined && y !== undefined) {
    spofs(SP_DRAWN, x, y);
  }
}

// ============================================================
// Canvas コンテキスト取得ユーティリティ
// ============================================================
// GRP canvas（SPRITEとグラフィック描画用）
let _cvU, _cvL;
export function setCanvases(upperGrp, lowerGrp) {
  _cvU = upperGrp; _cvL = lowerGrp;
}
function _upperCtx() { return _cvU?.getContext('2d'); }
function _lowerCtx() { return _cvL?.getContext('2d'); }

function _gpset(x, y, col) {
  // palColorはemu.jsから
  gpset(x, y, col);
}


// ============================================================
// PLACE_RDLN / OMIT_RDLN — 赤線四角をSPRITE canvasに直接描画
// ============================================================
// PRGはSPU7のRDLNスプライト8個で描画していたが
// Web版はCanvas 2D APIで角丸矩形を直接描画する
let _rdlnVisible = false;
let _rdlnRect = {x:0, y:0, w:0, h:0};

// PRG @DRAW_RDLN相当: 座標を直接受け取って赤線設定
function _drawRdln(x, y, w, h) {
  _rdlnVisible = true;
  _rdlnRect = {x, y, w, h};
}

// PRG @PLACE_RDLN(mode, place, pos) 完全準拠
// mode: 'CARD'|'CARDS'|'MAJOR'
// place: スロット番号(-1=DRAWN, 8=purpose)
// pos: カードインデックス文字列(CARDモード時)
export function placeRdln(mode, place, pos) {
  let x, y, w = CARD_WIDTH, h = CARD_HEIGHT;

  if (mode === 'CARD' && place === -1) {
    // _PLACE_RDLN_DR: DRAWN位置
    x = DRAWN_X; y = DRAWN_Y;

  } else if (mode === 'CARD') {
    // _PLACE_RDLN_CD: スタック内の特定カード位置
    const n = (gs.cards[place] || '').split(',').filter(Boolean).length;
    const anchor = CARDS_ANCHOR[place];
    const off = _nthCdXY(parseInt(pos) || 0, n, anchor);
    x = CARDS_X[place] + off.x;
    y = CARDS_Y[place] + off.y;

  } else if (mode === 'CARDS') {
    // _PLACE_RDLN_CDS: スタック全体を囲む
    x = CARDS_X[place]; y = CARDS_Y[place];
    const n = (gs.cards[place] || '').split(',').filter(Boolean).length;
    if (n === 0) { omitRdln(); return; }
    const anchor = CARDS_ANCHOR[place] || '';
    if (n > 5) {
      w = CARD_WIDTH + 4 * 8;
      h = CARD_HEIGHT + (1 + (n > 10 ? 1 : 0)) * 8;
      if (anchor[0] === 'S' && n <= 10) y += 8;
    } else {
      w = CARD_WIDTH + (n - 1) * 8;
      let a = anchor;
      let pfx = '';
      if (a[0] === 'S' || a[0] === 'N') { pfx = a[0]; a = a.slice(1); }
      let offX = (5 - n) * 4;  // (5-R)*8/2
      if (a === 'W') offX = 0;
      if (a === 'E') offX = (5 - n) * 8;
      let offY = 8;
      if (pfx === 'N') offY = 0;
      if (pfx === 'S') offY = 16;
      x += offX; y += offY;
    }

  } else if (mode === 'MAJOR' && place === 8) {
    // _PLACE_RDLN_PP: purpose位置
    const deg = gs.purposeDeg;
    if (!gs.purpose || gs.purpose.length > 3) {
      x = 2; y = CARDS_CENTER_Y - CARD_HH - 8;
      w = CARD_WIDTH + 8; h = CARD_HEIGHT;
    } else if (deg === 90 || deg === 270) {
      x = 2; y = CARDS_CENTER_Y - CARD_HW - 12;
      w = CARD_HEIGHT; h = CARD_WIDTH;
    } else {
      x = 2; y = CARDS_CENTER_Y - CARD_HH - 8;
    }

  } else {
    // MAJOR place=0-5: CARD_X/CARD_Y
    x = CARD_X[place]; y = CARD_Y[place];
  }

  if (gs.urev) { x = GRP_W - x - w; y = GRP_H - y - h; }
  _drawRdln(x, y, w, h);
}

export function omitRdln() {
  _rdlnVisible = false;
}

// _spriteDrawAll から毎フレーム呼ばれる
export function drawRdlnIfVisible(ctxUspr) {
  if (!_rdlnVisible || !ctxUspr) return;
  const {x, y, w, h} = _rdlnRect;
  const r = 3; // 角丸半径
  ctxUspr.save();
  ctxUspr.strokeStyle = '#ff0000';
  ctxUspr.lineWidth = 1;
  ctxUspr.beginPath();
  ctxUspr.moveTo(x + r, y);
  ctxUspr.lineTo(x + w - r, y);
  ctxUspr.arcTo(x + w, y, x + w, y + r, r);
  ctxUspr.lineTo(x + w, y + h - r);
  ctxUspr.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctxUspr.lineTo(x + r, y + h);
  ctxUspr.arcTo(x, y + h, x, y + h - r, r);
  ctxUspr.lineTo(x, y + r);
  ctxUspr.arcTo(x, y, x + r, y, r);
  ctxUspr.closePath();
  ctxUspr.stroke();
  ctxUspr.restore();
}

// ============================================================
// MAKE_CDS_SPG — カードグループをSPRITE化
// ============================================================
// PRGはSPU5/6/4の複雑な組み合わせでスプライト化していたが
// Web版はカードのタイトル部分(左上16x8 or 8x8)をGRPシートから
// drawImageして1つのOffscreenCanvasに合成し、それをSPRITEとして管理
//
// 戻り値: spList (SPRITE番号の配列) ← PRGのSPG$に相当
//
// N<=5: 横に8pxずつずらして並べる (右から左へ)
//       最左端のカードは16px幅, それ以外は8px幅
//       カードフレーム(64x64)を最後に
// N>5:  上下2段(5枚ずつ)
//
// Anchor: 'W'=左寄せ, 'E'=右寄せ, ''=中央
//         'S'=縦+8px, 'N'=縦なし(デフォルト+8px)
let _spgNextSp = SP_SPG_OFFSET;

function _allocSp() {
  // SP番号を動的確保（循環利用）
  // 確保前にspclrとbitmap/angle/scaleをリセットして前の状態を消す
  const sp = _spgNextSp;
  spclr(sp);
  clearSpriteBitmap(sp);
  spangle(sp, 0);
  spscale(sp, 100);
  _spgNextSp++;
  if (_spgNextSp >= SP_SPG_MAX) _spgNextSp = SP_SPG_OFFSET;
  return sp;
}

export function makeCdsSpg(cdsArr, anchor) {
  // cdsArr: カード文字列の配列 ['S03','D07',...]
  // anchor: 'W','E','','SW','SE','S','N','NW','NE'
  const N = cdsArr.length;
  if (N === 0) return [];

  const spList = [];

  // アンカー解析
  let anchorV = anchor[0] === 'S' ? 'S' : anchor[0] === 'N' ? 'N' : '';
  let anchorH = anchor.replace(/^[SN]/, '');
  let AX, AY;

  if (N <= 5) {
    AX = anchorH === 'W' ? 0 : anchorH === 'E' ? (5 - N) * 8 : Math.floor((5 - N) * 8 / 2);
    AY = anchorV === 'N' ? 0 : anchorV === 'S' ? 16 : 8;
  } else {
    AX = 0;
    AY = anchorV === 'S' && N <= 10 ? 8 : 0;
  }

  // カードタイトル部分(左上16x8)のdrawImage
  // GRPシートからsuit/numに対応する位置を読む
  // JRFTRT_S/D/H/Cの各カードの左上16x8px部分
  for (let i = 0; i < N; i++) {
    const cd = cdsArr[i];
    const suit = cd[0]; // S/D/H/C
    const num  = parseInt(cd.slice(1)); // 1-14

    let SX, SY, W;
    if (N <= 5) {
      SX = AX + (N - i - 1) * 8;
      SY = AY;
      W  = (i === 0) ? 16 : 8;
    } else {
      // 2段以上
      const rowSize = N > 10 ? 5 : 5;
      const A = N > 10 ? N - 10 : N - 5;
      SX = (5 - i - 1) * 8;
      SY = (Math.floor(N / 5) + (N % 5 ? 1 : 0) - 1) * 8;
      if (i >= A)     { SY -= 8; SX = (5 - (i - A) - 1) * 8; }
      if (i >= A + 5) { SY -= 8; SX = (5 - (i - A - 5) - 1) * 8; }
      SX += AX; SY += AY;
      W = (SX === 4 * 8) ? 16 : 8;
    }

    // OffscreenCanvasに描画してSPRITEとして登録
    const sp = _allocSp();
    spList.push(sp);

    // SPRITEをカードタイトル用に設定
    // カードタイトルはGRPシートの左上部分から読む
    // homeを(-SX, -SY)にしてグループの基点に合わせる
    _makeTitleSprite(sp, suit, num, W, 8, -SX, -SY);
  }

  // カードフレーム(白カード背景)
  const frameSp = _allocSp();
  spList.push(frameSp);
  let FSX, FSY;
  if (N <= 5) {
    FSX = AX + (N - 1) * 8; FSY = AY;
  } else {
    FSX = AX + 4 * 8;
    FSY = AY + (1 + (N > 10)) * 8;
  }
  _makeFrameSprite(frameSp, N, -FSX, -FSY);

  // スタック左側(CDSBL相当)
  const stackSp = _allocSp();
  spList.push(stackSp);
  let SSX, SSY, SW, SH;
  if (N <= 5) {
    SSX = AX; SSY = AY; SW = N === 1 ? 16 : 32; SH = N === 1 ? 16 : 64;
  } else {
    SSX = AX + 5 * 8; SSY = AY; SW = 32; SH = 16;
  }
  _makeStackSprite(stackSp, N, -SSX, -SSY, SW, SH);

  return spList;
}

/** カードタイトル部分のSPRITE設定 (GRPシートから直接drawImage) */
function _makeTitleSprite(sp, suit, num, w, h, homeX, homeY) {
  // GRPシートのカード左上16x8部分をsrcとして使う
  // カードの配置: col = floor(cardIdx/3), row = cardIdx%3
  // cardIdx = num-1 (0〜13)
  const cardIdx = num - 1;
  const col = Math.floor(cardIdx / 3);
  const row = cardIdx % 3;
  const srcX = col * CARD_WIDTH;
  const srcY = row * CARD_HEIGHT;

  const sheetKey = suit; // 'S','D','H','C'
  const sheet = _grpImages[sheetKey];
  if (!sheet) { spclr(sp); return; }

  // OffscreenCanvasにカードタイトル部分を描画
  const oc = new OffscreenCanvas(w, h);
  const octx = oc.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.drawImage(sheet, srcX, srcY, w, h, 0, 0, w, h);
  const bitmap = oc.transferToImageBitmap();

  // SPRITEとしてbitmapを登録
  _setSpriteOffscreen(sp, bitmap, w, h, homeX, homeY);
}

/** カードフレーム(白カード背景)のSPRITE設定 */
function _makeFrameSprite(sp, N, homeX, homeY) {
  const oc = new OffscreenCanvas(CARD_WIDTH, CARD_HEIGHT);
  const octx = oc.getContext('2d');
  // 白カードを描画
  octx.fillStyle = '#ffffff';
  octx.strokeStyle = '#aaaaaa';
  octx.lineWidth = 1;
  octx.beginPath();
  octx.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 2);
  octx.fill();
  octx.stroke();
  const bitmap = oc.transferToImageBitmap();
  _setSpriteOffscreen(sp, bitmap, CARD_WIDTH, CARD_HEIGHT, homeX, homeY);
}

/** スタック左側のSPRITE設定 */
function _makeStackSprite(sp, N, homeX, homeY, w, h) {
  // シンプルな影効果
  const oc = new OffscreenCanvas(w, h);
  const octx = oc.getContext('2d');
  octx.fillStyle = 'rgba(0,0,0,0.3)';
  octx.fillRect(0, 0, w, h);
  const bitmap = oc.transferToImageBitmap();
  _setSpriteOffscreen(sp, bitmap, w, h, homeX, homeY);
}

// OffscreenCanvasベースのSPRITEを登録する仕組み
// emu.jsのSPRITEシステムに拡張として追加
const _offscreenSprites = new Map(); // sp番号 → {bitmap, w, h, homeX, homeY}

function _setSpriteOffscreen(sp, bitmap, w, h, homeX, homeY) {
  _offscreenSprites.set(sp, {bitmap, w, h, homeX, homeY});
  // emu.jsのspset相当: active=true, screen=SCREEN_U
  spset(sp, -1, 0, 0, 0, 3, w, h, SCREEN_U);
  sphome(sp, -homeX, -homeY);
  spofs(sp, -1024, -1024);
}

export function drawOffscreenSprites(ctx, screen) {
  // SPRITE描画時にoffscreen spriteも描画
  for (const [sp, data] of _offscreenSprites) {
    // SPRITEの現在位置を取得
    const {bitmap, w, h, homeX, homeY} = data;
    // spread相当が必要だが、emu.jsの内部状態を直接参照する方法がない
    // → _offscreenSpritesにx,yも保持する
    if (!data.x || data.x <= -512) continue;
    ctx.save();
    ctx.translate(data.x, data.y);
    if (data.angle) ctx.rotate(data.angle * Math.PI / 180);
    ctx.drawImage(bitmap, homeX, homeY, w, h);
    ctx.restore();
  }
}

/** SPG_OFS: SPGの全スプライトをx,yに移動 */
export function spgOfs(sp, x, y, tm=0) {
  // sp: 単一SPRITE番号
  spofs(sp, x, y, tm);
}

/** FLOAT_SPG: SPGを画面外へ退避 */
// ============================================================
// MAKE_CD_SPG — カード1枚をSPRITEとして作成 (PRG @MAKE_CD_SPG 相当)
// Web版: 2スプライト不要。OffscreenCanvasに実カード絵を描いて1SPRITEに登録。
// cdStr: カード文字列('S03'/'A08U'等)
// sp: SPRITE番号(SP_TMP_OFFSET等を使用)
// 戻り値: sp番号(文字列)
// ============================================================
export function makeCdSpg(cdStr, sp) {
  if (!cdStr) return '';
  const suit = cdStr[0];
  const num  = parseInt(cdStr.slice(1, 3));
  const W = CARD_WIDTH, H = CARD_HEIGHT;

  const oc = new OffscreenCanvas(W, H);
  const oct = oc.getContext('2d');
  oct.imageSmoothingEnabled = false;

  if (suit === 'A') {
    // 大アルカナ: JRFTRT_D.pngのidx=15(A00)/16(A13)
    const sheet = gs.urev ? _grpImages['RD'] : _grpImages['D'];
    const idx = (num === 0) ? 15 : 16;
    const [sx, sy] = _grpIdx(idx);
    if (sheet) oct.drawImage(sheet, sx, sy, W, H, 0, 0, W, H);
  } else {
    // 小アルカナ: 順逆を考慮
    const revKey = { S:'RS', D:'RD', H:'RH', C:'RC' };
    const sheetKey = gs.urev ? (revKey[suit] || suit) : suit;
    const sheet = _grpImages[sheetKey] || _grpImages[suit];
    if (sheet) {
      const [sx, sy] = _grpIdx(num - 1);
      oct.drawImage(sheet, sx, sy, W, H, 0, 0, W, H);
    }
  }

  const bitmap = oc.transferToImageBitmap();
  setSpriteBitmap(sp, bitmap, W, H);
  spset(sp, -1, 0, 0, 0, 2, W, H, SCREEN_U);  // pri=2: SP_B00と同等、前面
  sphome(sp, 0, 0);
  spofs(sp, -1024, -1024);  // 初期は画面外

  return String(sp);
}

export function floatSpg(sp) {
  // SPRITEのpriを2(前面=SP_B00と同等)に変更
  // PRGのFLOAT_SPGはdepth=2にセットする
  const sps = Array.isArray(sp) ? sp : [sp];
  for (const s of sps) {
    // emu.jsの_sprites[s].priを変更
    _setSpritePri(s, 2);
  }
}
