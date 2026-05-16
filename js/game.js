/**
 * game.js — YOUSCOUT ゲームロジック
 * youscout.prg の逆コンパイル (stacklib GOSUB → JS 関数呼び出し)
 *
 * モード遷移:
 *   modeTitle → modeStart | modeOpt | modeHelp | modeSetLang | '@END'
 *   modeStart → modeWToken | modeTitle
 *   modeWToken → modeWDraw | modeTitle
 *   modeWDraw → modeWCalc | modeTerminal | modeTitle
 *   modeTerminal → modeWDraw | modeTitle
 *   modeWCalc → modeWDraw | modeTitle
 */

'use strict';

import {
  gcls, gfill, gpage, bgclr, bgpage, spclr, spset, spofs, spangle, sphome, spscale,
  bgofs,
  vsync, touch, getTouchEvent, clearTouchQueue, button, palColor,
  bgmset, bgmplay, bgmstop, beep, loadAllSheets, loadImage, setBgu1Image, setSpuImage,
  sppage, colmapInit, setRenderCallback,
  setSndConsts, setSpriteBitmap, clearSpriteBitmap,
  BTN_A, BTN_B, BTN_UP, BTN_DOWN,
  SCREEN_U, SCREEN_L, GRP_W, GRP_H, CON_W, CON_H,
} from './emu.js';
import { _spriteDrawAll,
  drawSrbnTama, placeRdlnCd, placeRdln, omitRdln, cardToDchr,
} from './render.js';
import {
  conState, conCls, conPrint, conPrintL, pushCwin, popCwin,
  popupMenu, MnuCtrl, TchCtrl, waitClick, saveSettings, loadSettings,
  shuffleCards, sarrayToArray, arrayToSarray, nthSr,
} from './lib.js';

import {
  COL_BOARD, COL_BLACK, COL_WHITE, COL_GREY,
  SP_B00, SP_DRAWN, SP_TOKEN, SP_A00, SP_A13,
  SP_TMP_OFFSET, SP_RDLN_OFFSET,
  SPPL_B00, SPPL_DRAWN, SPPL_TOKEN, SPPL_A00, SPPL_A13,
  SPU7_B00, SPU7_A00, SPU7_A13, SPU7_TOKEN,
  CARD_X, CARD_Y, CARD_HW, CARD_HH,
  CARDS_X, CARDS_Y, CARDS_ANCHOR, CARDS_W, CARDS_H,
  MISSING_X, MISSING_TM_U, MISSING_TM_L,
  DRAWN_X, DRAWN_Y,
  TALON_X, TALON_Y, DISCARDED_X, DISCARDED_Y,
  GAME_CON_CX, GAME_CON_CY, GAME_CON_CW, GAME_CON_CH,
  DRAW_CD_TM_U, DRAW_CD_TM_L, DRAW_CD_TM_A,
  ANIM_B00_ANGLE, ANIM_B00_ANGLE_R, ANIM_TOKEN_MAG,
  DISPLAY_MSG_TM, FLASH_MSG_TM, MOVE_TOKEN_TM,
  SND_CD, SND_CD_SHUFFLE, SND_SRBN, SND_SRBN_CLR, SND_CD_SH_T, SND_SRBN_CLR_T,
  BGM_BEEP, BEEP_SELECT, BEEP_CANCEL, BEEP_CLICK,
  GRP_ROWS, LBG1_M_OFS_X, LBG1_M_OFS_Y, LBG1_N_OFS_X, LBG1_N_OFS_Y,
  BOARD_ORDER, TABLE_MAJOR, COURT_CD_TABLE,
  DEF_LANG, DEF_TERMINALS, DEF_COURT_CD, DEF_MA_INF, DEF_SWAP_8_11, DEF_UREV,
  CARD_WIDTH, CARD_HEIGHT,
  RULE_COMP, RULE_MOVE, RULE_STAY, RULE_MOVE_C, RULE_STAY_C, CARDS_TYPE_U, CARDS_TYPE_L,
} from './const.js';

import {
  MSG_WORDS, MSG_TRTMJ, MSG_HXG,
  MENU_MAIN, MENU_OPT, OPT_CHOICES, MSG,
  makeDeck, cardSuit, cardNum, suitName, numName,
  JRFTAROT_CMAP,
} from './data.js';

import { msg, words, trtmj } from './utils.js';

// render.jsから描画関数をインポート（後で実装）
import {
  drawLogo, drawBoard, drawFstCd, drawToken,
  drawMainPnl, drawPurpose,
  drawMiniCds2, redrawCds, loadFstCd, loadBoard,
  displayTlnNum, omitTlnNum, lbg1B00, lbg1Clr, lbg1Discarded,
  shipoutUGpage, shipoutLGpage,
  reloadSprite, floatSpg,
  drawRdlnIfVisible,
  makeCdSpg, makeCdsSpg, spgOfs,
  mainPnlNew, mainPnlLoopR,
  drawDrawnCard,
} from './render.js';

// ============================================================
// ゲーム状態 (グローバル)
// ============================================================
export const gs = {
  // 設定
  lang:      DEF_LANG,
  stTerminals: DEF_TERMINALS,  // 設定値（何回まで）
  courtCd:   DEF_COURT_CD,
  maInf:     DEF_MA_INF,
  swap811:   DEF_SWAP_8_11,
  urev:      DEF_UREV,

  // ゲーム進行状態
  board:     ['','','','','',''],  // CUR_BOARD$[6]: 大アルカナスロット
  cards:     ['','','','','','','',''],  // CUR_CARDS$[8]: 小アルカナ
  talon:     '',    // CUR_TALON$: 山札（カンマ区切り）
  discarded: '',    // CUR_DISCARDED$
  drawn:     '',    // CUR_DRAWN$
  token:     0,     // CUR_TOKEN: 0-7
  terminals: 0,     // CUR_TERMINALS (消費済みターミナル数)
  purpose:   '',    // CUR_PURPOSE$: 'A00' or 'A13'
  purposeDeg: 0,    // CUR_PURPOSE_DEG

  sorobanL:  0,     // CUR_SOROBAN_L
  sorobanR:  0,     // CUR_SOROBAN_R

  // SPG管理
  curSpg:    new Array(8).fill(''),
  prevFstCd: new Array(9).fill(''),
};

// 設定のショートカット
export function lang()    { return gs.lang; }

// ============================================================
// 初期化
// ============================================================
let _cvU, _cvL;  // GRP canvas（_drawCwin用）

export async function gameInit(upperCanvas, lowerCanvas) {
  _cvU = upperCanvas; _cvL = lowerCanvas;  // GRP canvas

  // 設定ロード
  const saved = loadSettings();
  if (saved) {
    if (saved.lang)      gs.lang      = saved.lang;
    if (saved.stTerminals !== undefined) gs.stTerminals = saved.stTerminals;
  else if (saved.terminals !== undefined) gs.stTerminals = saved.terminals;
    if (saved.courtCd)   gs.courtCd   = saved.courtCd;
    if (saved.maInf !== undefined)     gs.maInf     = saved.maInf;
    if (saved.swap811)   gs.swap811   = saved.swap811;
    if (saved.urev !== undefined)      gs.urev      = saved.urev;
  }

  // URLパラメータ ?lang=en/ja でlocalStorageより優先して言語設定
  const urlLang = new URLSearchParams(location.search).get('lang');
  if (urlLang) {
    const l = urlLang.toUpperCase();
    if (l === 'EN' || l === 'JA') gs.lang = l;
  }

  // スプライトシート一括ロード
  await loadAllSheets('./');

  // CMAPパレット初期化
  colmapInit(JRFTAROT_CMAP);

  // SPRITEとBGの描画をrenderCallbackに登録
  const cvUspr = document.getElementById('cv-upper-spr');
  const ctxUspr = cvUspr ? cvUspr.getContext('2d') : null;
  setRenderCallback((ctxLspr) => {
    _spriteDrawAll(ctxLspr);
    if (ctxUspr) drawRdlnIfVisible(ctxUspr);
  });
  // SND定数をemu.jsに登録（bgmplayが正しい効果音を鳴らすために）
  setSndConsts(SND_CD, SND_CD_SHUFFLE, SND_SRBN, SND_SRBN_CLR);
  console.log('gameInit complete');
}

// ============================================================
// CHECK_CLICK — PRG @CHECK_CLICK相当
// frames フレーム待って、CLICK/RESET/NONEを返す
// ============================================================
export async function checkClick(frames) {
  // PRG @CHECK_CLICK 準拠:
  // 指定フレーム待つ間、毎フレームMAIN_PNL_CHECK_R相当をチェック
  // RESET/TALON/CLICKが来たら即返す（アニメーション中断）
  clearTouchQueue();
  let f = frames;
  while (true) {
    await vsync(1);
    // Bボタン → RESET（タイトルへ）
    const btn = button(2);
    if (btn & BTN_B) return 'RESET';
    // Aボタン → CLICK（アニメーション中断）
    if (btn & BTN_A) return 'CLICK';
    // タッチ → CLICK
    const ev = getTouchEvent();
    if (ev) return 'CLICK';
    f--;
    if (f <= 0) return 'NONE';
  }
}

// ============================================================
// メインループ
// ============================================================
export async function gameMain() {
  let mode = 'modeTitle';
  let arg  = undefined;
  while (mode !== '@END') {
    const result = await gameModes[mode](arg);
    [mode, arg] = result;
    await vsync(1);
  }
}

const gameModes = {
  modeTitle:    () => modeTitle(),
  modeSetLang:  (lang) => modeSetLang(lang),
  modeOpt:      () => modeOpt(),
  modeHelp:     () => modeHelp(),
  modeStart:    () => modeStart(),
  modeWToken:   () => modeWToken(),
  modeWDraw:    () => modeWDraw(),
  modeTerminal: () => modeTerminal(),
  modeWCalc:    () => modeWCalc(),
};

// ============================================================
// MODE_TITLE — タイトル画面
// ============================================================
async function modeTitle() {
  // コンソール・画面クリア（canvas未初期化の場合はスキップ）
  _resetClip();
  conCls(SCREEN_U); conCls(SCREEN_L);

  // 上下GRP/BG/SPRITEクリア
  gpage(SCREEN_U); gcls(COL_BOARD);
  bgpage(SCREEN_U); bgclr();
  gpage(SCREEN_L); gcls(COL_BOARD);
  bgpage(SCREEN_L); bgclr();

  // SPRITEクリア（全番号: bitmap・アニメ状態も含めて完全リセット）
  for (let i = 0; i < 128; i++) {
    spclr(i);
    clearSpriteBitmap(i);
  }

  reloadSprite();
  spofs(0, -1024, -1024);  // カーソルを非表示

  // ロゴ描画（上画面）
  gpage(SCREEN_U);
  drawLogo();
  shipoutUGpage();

  // メニュー表示
  const items = [...MENU_MAIN[gs.lang]];
  // \B[B] (Bボタン=終了) を先頭に追加（PRG準拠）
  const menuItems = [
    ['\\B[B]', ''],
    ['\\B[START]', '@MODE_START'],
    [`\\B[touch(${SCREEN_U},0,0,${GRP_W},${GRP_H})]`, '@MODE_START'],
    ...items,
  ];

  const result = await popupMenu(menuItems, { disp: SCREEN_L });

  return _parseMode(result);
}

// ============================================================
// MODE_SET_LANG — 言語切り替え
// ============================================================
async function modeSetLang(newLang) {
  gs.lang = newLang || (gs.lang === 'EN' ? 'JA' : 'EN');
  _saveSettings();
  return ['modeTitle'];
}

// ============================================================
// MODE_OPT — オプション設定
// ============================================================
async function modeOpt() {
  _setClip(SCREEN_L, 0, 0, 32, 24);
  const savedBgCol = conState.bgCol[SCREEN_L];
  conState.bgCol[SCREEN_L] = COL_BOARD;
  conCls(SCREEN_L);
  conState.bgCol[SCREEN_L] = savedBgCol;
  _drawCwin(SCREEN_L, 1, 1, 30, 22);

  const optKeys = ['terminals','courtCd','maInf','swap811','urev','lang'];
  const optMsgKeys = ['terminals','court_cd','ma_inf','swap_8_11','urev','lang'];
  const menuOpt = MENU_OPT[gs.lang];

  // 現在値マップ
  const cur = {
    terminals: String(gs.stTerminals),
    courtCd:   gs.courtCd,
    maInf:     String(gs.maInf),
    swap811:   gs.swap811,
    urev:      String(gs.urev),
    lang:      gs.lang,
  };

  const n = menuOpt.length;
  // MnuCtrlはループ外で作成してカーソル位置を保持
  const mnuCtrl = new MnuCtrl();
  menuOpt.forEach(([,val], i) => {
    mnuCtrl.add(3, 2 + i * 3, 25, 2, val, SCREEN_L);
  });
  mnuCtrl.add(3,  2 + n * 3, 8, 1, '@SET',     SCREEN_L);
  mnuCtrl.add(13, 2 + n * 3, 8, 1, '@DEFAULT', SCREEN_L);
  mnuCtrl.add(23, 2 + n * 3, 8, 1, '@CANCEL',  SCREEN_L);
  mnuCtrl.setButton('B', '@CANCEL');

  const _redrawOpt = () => {
    conState.bgCol[SCREEN_L] = COL_BOARD;
    conCls(SCREEN_L);
    conState.bgCol[SCREEN_L] = savedBgCol;
    _drawCwin(SCREEN_L, 1, 1, 30, 22);
    menuOpt.forEach(([label], i) => {
      conPrint(SCREEN_L, 2, 2 + i * 3, label);
      const key = optKeys[i];
      const dataKey = optMsgKeys[i];
      const internalVal = cur[key];
      const choices = OPT_CHOICES[dataKey]?.[gs.lang] || [];
      const choice = choices.find(([v]) => String(v) === String(internalVal));
      const dispVal = choice ? choice[1] : internalVal;
      conPrint(SCREEN_L, 3, 2 + i * 3 + 1, `\\c4${dispVal}`);
    });
    conPrint(SCREEN_L, 2,  2 + n * 3, `[${words().set}]`);
    conPrint(SCREEN_L, 12, 2 + n * 3, `[${words().def}]`);
    conPrint(SCREEN_L, 21, 2 + n * 3, `[\\N[B]${words().cancel}]`);
    mnuCtrl._highlight(mnuCtrl._cursor, true);  // カーソル再表示
  };
  mnuCtrl.setOnRedraw(_redrawOpt);
  _redrawOpt();

  while (true) {
    const result = await mnuCtrl.loop();

    if (result === '@CANCEL') break;

    if (result === '@DEFAULT') {
      cur.terminals = String(DEF_TERMINALS);  // reset to default
      cur.courtCd   = DEF_COURT_CD;
      cur.maInf     = String(DEF_MA_INF);
      cur.swap811   = DEF_SWAP_8_11;
      cur.urev      = String(DEF_UREV);
      cur.lang      = DEF_LANG;
      _redrawOpt();
      continue;
    }

    if (result === '@SET') {
      // 設定を確定して保存
      gs.stTerminals = parseInt(cur.terminals);
      gs.courtCd   = cur.courtCd;
      gs.maInf     = parseFloat(cur.maInf);
      gs.swap811   = cur.swap811;
      gs.urev      = parseInt(cur.urev);
      gs.lang      = cur.lang;
      _saveSettings();
      break;
    }

    // 個別オプション選択 → POPUPで選択肢を表示
    // result は '@MSG_OPTTERM_EN,terminals' 等の形式
    const m = result.match(/@MSG_OPT(\w+)_(?:EN|JA),(\w+)/);
    if (m) {
      const choiceKey = m[2].replace('court_cd','courtCd').replace('ma_inf','maInf')
                             .replace('swap_8_11','swap811');
      const dataKey   = m[2];  // OPT_CHOICESのキー
      const choices   = OPT_CHOICES[dataKey]?.[gs.lang] || [];
      const items     = choices.map(([val, label]) => [label, val]);
      const sel = await popupMenu(items, { disp: SCREEN_L });
      if (sel && sel !== 'NONE') {
        cur[choiceKey] = sel;
      }
      _redrawOpt();
    }
  }

  _resetClip();
  return ['modeTitle'];
}

// ============================================================
// MODE_HELP — yschelp.htmlへ遷移
// ============================================================
async function modeHelp() {
  // sessionStorageに戻り先を保存してyschelp.htmlへ
  sessionStorage.setItem('youscout_return', location.href);
  location.href = `yschelp.html?lang=${gs.lang}`;
  // 遷移後は戻らないのでここには来ない
  return ['modeTitle'];
}

// ============================================================
// MODE_START — ゲーム開始・シャッフル
// ============================================================
async function modeStart() {
  // BGM: シャッフル音
  bgmset(BGM_BEEP, SND_CD_SHUFFLE);
  bgmplay(BGM_BEEP);

  // ゲーム状態リセット
  gs.purpose    = '';
  gs.purposeDeg = 0;
  gs.talon      = '';
  gs.discarded  = '';
  gs.drawn      = '';
  gs.token      = 0;
  gs.terminals = 0;   // 消費済みターミナル数リセット
  gs.sorobanL   = 0;
  gs.sorobanR   = 0;
  for (let i = 0; i < 8; i++) {
    gs.cards[i]     = '';
    gs.curSpg[i]    = '';
    gs.prevFstCd[i] = '';
  }
  gs.prevFstCd[8] = '';

  // 大アルカナをシャッフル（A00/A13除く: A01-A12, A14-A21）
  const major = 'A01,A02,A03,A04,A05,A06,A07,A08,A09,A10,A11,A12,A14,A15,A16,A17,A18,A19,A20,A21'.split(',');
  const shuffled = shuffleCards(major);

  // ボード6枚配置（各カードに正位置/逆位置をランダム付与）
  let oddCount = 0;
  let swapScore = 0;
  for (let i = 0; i < 6; i++) {
    const upright = Math.random() < 0.5;
    const orient = upright ? 'U' : 'R';
    gs.board[i] = shuffled[i] + orient;
    const n = parseInt(shuffled[i].slice(1));
    if (n % 2 === 1) oddCount++;
    if (shuffled[i] === 'A08') swapScore += 1 * (2 + (upright ? 1 : 0));
    if (shuffled[i] === 'A11') swapScore += 4 * (2 + (upright ? 1 : 0));
  }

  // 8/11入れ替え判定 (swap_8_11設定による)
  let needSwap = _calcNeedSwap(oddCount, swapScore);

  // 上下CON canvasを全クリア（タイトルメニュー等を消す）
  for (const s of [SCREEN_U, SCREEN_L]) {
    conState.clipCX[s]=0; conState.clipCY[s]=0;
    conState.clipCW[s]=32; conState.clipCH[s]=24;
    conCls(s);
  }

  // 下画面初期化（パネル表示）
  gpage(SCREEN_L); gcls(COL_BOARD);
  drawMainPnl();
  drawSrbnTama();
  shipoutLGpage();

  // 上画面はボード色のみ（カードはアニメーション後に表示）
  gpage(SCREEN_U); gcls(COL_BOARD);
  shipoutUGpage();

  // メッセージ表示
  _gameCon();
  conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY, msg('start'));

  // シャッフル完了待ち
  await _waitBgm();

  // カード配置アニメーション（B00スプライトを使って飛ばしてくる）
  bgmset(BGM_BEEP, SND_CD);
  let dealInterrupted = false;
  for (let i = 0; i < 6; i++) {
    const sp = SP_TMP_OFFSET + i;
    spset(sp, 7 * 64 + Math.floor(SPU7_B00/16), SPPL_B00, 0, 0, 2, 64, 64);
    sphome(sp, 32, 32);
    if (gs.urev) spangle(sp, 180);
    const startY = gs.urev ? GRP_H + CARD_HH : GRP_H;
    spofs(sp, MISSING_X, startY);
    let dx = CARD_X[i] + CARD_HW;
    const dy = gs.urev ? GRP_H - CARD_Y[i] - CARD_HH : CARD_Y[i] + CARD_HH;
    if (gs.urev) dx = GRP_W - dx;
    if (!dealInterrupted) {
      spofs(sp, dx, dy, DRAW_CD_TM_U);
      const r = await checkClick(DRAW_CD_TM_U);
      if (r === 'RESET') { _clrTmpSp(); return ['modeTitle']; }
      if (r === 'CLICK') {
        // 中断: 残りのカードを即座に配置
        dealInterrupted = true;
        for (let j = i; j < 6; j++) {
          const sp2 = SP_TMP_OFFSET + j;
          spset(sp2, 7 * 64 + Math.floor(SPU7_B00/16), SPPL_B00, 0, 0, 2, 64, 64);
          sphome(sp2, 32, 32);
          if (gs.urev) spangle(sp2, 180);
          let dx2 = CARD_X[j] + CARD_HW;
          const dy2 = gs.urev ? GRP_H - CARD_Y[j] - CARD_HH : CARD_Y[j] + CARD_HH;
          if (gs.urev) dx2 = GRP_W - dx2;
          spofs(sp2, dx2, dy2);
        }
        break;
      }
    }
    bgmplay(BGM_BEEP);
  }

  // ボード描画
  gpage(SCREEN_U); gcls(COL_BOARD);
  drawBoard();
  shipoutUGpage();

  // カードを回転させながら消す（裏→表への変化を表現）
  if (!dealInterrupted) {
    for (let i = 0; i < 6; i++) {
      const angle = gs.urev ? ANIM_B00_ANGLE_R : ANIM_B00_ANGLE;
      spangle(SP_TMP_OFFSET + i, angle, DRAW_CD_TM_A);
      const r = await checkClick(DRAW_CD_TM_A);
      if (r === 'RESET') { _clrTmpSp(); return ['modeTitle']; }
      if (r === 'CLICK') { dealInterrupted = true; break; }
      spofs(SP_TMP_OFFSET + i, -1024, -1024);
      bgmplay(BGM_BEEP);
    }
  }
  // ※ spclrはここでしない: needSwap時は _doSwap811Anim でSP_TMPを再利用
  // swap_8_11メッセージ表示
  _gameCon();
  const swapMsgKey = gs.swap811 === 'expansive' ? 'swapExp'
                   : gs.swap811 === 'solid'      ? 'swapSol'
                   :                               'swapMem';
  const noSwapStr = needSwap ? '' : '→' + msg('swapNo');
  conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY, msg(swapMsgKey), [noSwapStr]);

  if (!needSwap) {
    // swapなし: メッセージ待ち → AE相当
    if (!dealInterrupted) {
      const r = await checkClick(DISPLAY_MSG_TM);
      if (r === 'RESET') return ['modeTitle'];
    }
    _clrTmpSp();
    gpage(SCREEN_U); gcls(COL_BOARD);
    drawBoard();
    shipoutUGpage();
  } else if (dealInterrupted) {
    // 配布中断: アニメスキップ → SKIPPED相当 (データswap + drawBoard)
    _clrTmpSp();
    _swapBoard811();
    gpage(SCREEN_U); gcls(COL_BOARD);
    drawBoard();
    shipoutUGpage();
  } else {
    // swapあり: アニメーション
    const animResult = await _doSwap811Anim();
    if (animResult === 'RESET') return ['modeTitle'];
    if (animResult === 'SKIPPED') {
      // 中断: NEED_SWAPが残っているのでデータswap + drawBoard (PRG MODE_START_AE相当)
      _swapBoard811();
      gpage(SCREEN_U); gcls(COL_BOARD);
      drawBoard();
      shipoutUGpage();
    }
    // 'DONE': 内部でswap+drawBoard済み → 追加処理不要
  }

  return ['modeWToken'];
}

// ============================================================
// swap_8_11 判定
// ============================================================
function _calcNeedSwap(oddCount, swapScore) {
  if ((swapScore & 10) === 0) return false;
  if (gs.swap811 === 'memorial') return true;
  if (gs.swap811 === 'solid' && oddCount >= 2 && oddCount <= 4) return true;
  if (gs.swap811 !== 'expansive') return false;
  if ((swapScore & 10) === 10) return true;
  if (oddCount > 3 && (swapScore & 2) !== 0) return true;
  if (oddCount === 3 && (swapScore & 2) !== 0 && (swapScore & 1) !== 0) return true;
  if (oddCount < 3 && (swapScore & 8) !== 0) return true;
  if (oddCount === 3 && (swapScore & 8) !== 0 && (swapScore & 4) !== 0) return true;
  return false;
}

function _swapBoard811() {
  for (let i = 0; i < 6; i++) {
    const cd = gs.board[i];
    const num = cd.slice(0, 3);
    const ori = cd[3];
    if (num === 'A08') gs.board[i] = 'A11' + ori;
    else if (num === 'A11') gs.board[i] = 'A08' + ori;
  }
}

async function _doSwap811Anim() {
  // PRG @_MODE_START_3 完全準拠
  // 戻り値: 'DONE'=swap完了, 'SKIPPED'=アニメ中断(swapまだ), 'RESET'=タイトルへ

  // ① 8/11スプライトを即座にカード位置へ (ANIM_B00_ANGLE のまま)
  //    SPANGLE(正位置, DRAW_CD_TM_A, -1) → カード裏がカードを「覆う」
  for (let i = 0; i < 6; i++) {
    const num = gs.board[i].slice(0, 3);
    if (num !== 'A08' && num !== 'A11') continue;
    let dx = CARD_X[i] + CARD_HW;
    const dy = gs.urev ? GRP_H - CARD_Y[i] - CARD_HH : CARD_Y[i] + CARD_HH;
    if (gs.urev) dx = GRP_W - dx;
    spofs(SP_TMP_OFFSET + i, dx, dy);
    spangle(SP_TMP_OFFSET + i, gs.urev ? 180 : 0, DRAW_CD_TM_A, -1);
  }
  let r = await checkClick(DRAW_CD_TM_A);
  if (r === 'RESET') { _clrTmpSp(); return 'RESET'; }
  if (r !== 'NONE')  { _clrTmpSp(); return 'SKIPPED'; }
  bgmplay(BGM_BEEP);

  // ② カード裏で覆われた状態で 8↔11 を入れ替え + drawBoard + NEED_SWAP=0相当
  _swapBoard811();
  gpage(SCREEN_U); gcls(COL_BOARD);
  drawBoard();
  shipoutUGpage();
  // ここでNEED_SWAPを0にした(DONE)

  // ③ SPANGLE(ANIM_B00_ANGLE) → カード裏が「退く」→ 入れ替え後のカードが見える
  for (let i = 0; i < 6; i++) {
    const num = gs.board[i].slice(0, 3);
    if (num !== 'A08' && num !== 'A11') continue;
    const angle = gs.urev ? ANIM_B00_ANGLE_R : ANIM_B00_ANGLE;
    spangle(SP_TMP_OFFSET + i, angle, DRAW_CD_TM_A);
  }
  r = await checkClick(DRAW_CD_TM_A);
  if (r === 'RESET') { _clrTmpSp(); return 'RESET'; }
  bgmplay(BGM_BEEP);

  _clrTmpSp();
  return 'DONE';
}
// ============================================================
// MODE_W_TOKEN — トークン配置
// ============================================================
async function modeWToken() {
  sppage(SCREEN_U);
  bgpage(SCREEN_L);

  // PURPOSE表示
  drawPurpose();

  // メッセージ表示
  _gameCon();
  conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY, msg('chstkn'));

  // purposeDeg!=0ならchsplssも表示
  if (gs.purposeDeg !== 0) {
    let hxg = '', trg = '';
    if (gs.purposeDeg === 90  && gs.purpose === 'A00') { hxg = MSG_HXG[64]; trg = words().ltrg; }
    if (gs.purposeDeg === 90  && gs.purpose === 'A13') { hxg = MSG_HXG[65]; trg = words().utrg; }
    if (gs.purposeDeg === 270 && gs.purpose === 'A00') { hxg = MSG_HXG[66]; trg = words().ltrg; }
    if (gs.purposeDeg === 270 && gs.purpose === 'A13') { hxg = MSG_HXG[67]; trg = words().utrg; }
    if (hxg) conPrintL(SCREEN_L, msg('chsplss'), [hxg, trg]);
  }

  // トークン配置選択
  const result = await mainPnlLoopR('PLACE');
  if (result.action === 'RESET') return ['modeTitle'];

  gs.token = parseInt(result.val);
  drawToken(0);

  // DRAW_MINI_CDS2（下卦スロットのミニカード再描画）
  drawMiniCds2();

  // terminals==0: ゲーム終了確認
  if (gs.stTerminals === 0) {
    _gameCon();
    conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY, msg('term0'));
    const r0 = await checkClick(DISPLAY_MSG_TM);
    if (r0 === 'RESET') return ['modeTitle'];
    // OKポップアップ → タイトルへ
    const choice = await popupMenu([
      ['\\B[B]', ''],
      [msg('rstqyn_yes') || 'Yes', 'Y'],
    ], { disp: SCREEN_L });
    return ['modeTitle'];
  }

  // タロン作成: purpose決定 + シャッフル
  // PRG: CUR_TOKEN < 3 → CUR_PURPOSE$ = "A00"（A$ = "A13"をfloat）
  //      CUR_TOKEN >= 3 → CUR_PURPOSE$ = "A13"（A$ = "A00"をfloat）
  gs.purpose = gs.token < 3 ? 'A00' : 'A13';

  // PRG準拠: purpose外カード + 小アルカナ56枚をシャッフル
  const deckCards = [
    (gs.purpose === 'A13' ? 'A00' : 'A13'),
    ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14].flatMap(n =>
      'SDHC'.split('').map(s => s + String(n).padStart(2,'0'))
    )
  ];
  gs.talon = shuffleCards(deckCards).join(',');

  // 相手purpose(A00/A13)のSPRITEをfloatSpgして画面外へアニメ
  const floatSp = gs.purpose === 'A00' ? SP_A13 : SP_A00;
  floatSpg(floatSp);
  // PRG: ST_UREV → GRP_HEIGHT+CARD_HEIGHT（逆位置時は画面上方向への退場）
  //      通常    → GRP_HEIGHT
  const exitY = gs.urev ? GRP_H + CARD_HEIGHT : GRP_H;
  spofs(floatSp, MISSING_X, exitY, MISSING_TM_U);
  {
    const r = await checkClick(MISSING_TM_U);
    if (r !== 'NONE') {
      _clrTmpSp(2); lbg1Clr();
      spofs(floatSp, -1024, -1024);
      drawPurpose();
      return r === 'RESET' ? ['modeTitle'] : ['modeWDraw'];
    }
  }

  // LBG1_B00 → LBG1スライドアニメ (MISSING_TM_L)
  bgofs(1, LBG1_M_OFS_X, LBG1_M_OFS_Y);
  await lbg1B00();
  bgofs(1, LBG1_N_OFS_X, LBG1_N_OFS_Y, MISSING_TM_L);
  {
    const r = await checkClick(MISSING_TM_L);
    if (r !== 'NONE') {
      lbg1Clr();
      spofs(floatSp, -1024, -1024);
      drawPurpose();
      return r === 'RESET' ? ['modeTitle'] : ['modeWDraw'];
    }
  }
  lbg1Clr();

  // シャッフル音
  bgmset(BGM_BEEP, SND_CD_SHUFFLE);
  bgmplay(BGM_BEEP);
  {
    const r = await checkClick(SND_CD_SH_T);
    if (r !== 'NONE') {
      spofs(floatSp, -1024, -1024);
      drawPurpose();
      return r === 'RESET' ? ['modeTitle'] : ['modeWDraw'];
    }
  }

  // condu/condlメッセージ + placeRdlnCd×2
  _gameCon();
  conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY,
    msg(gs.purpose === 'A13' ? 'condu' : 'condl'));
  const [slotA, slotB] = gs.purpose === 'A13' ? [5, 4] : [1, 4];
  sppage(SCREEN_U);
  placeRdlnCd(slotA, SP_TMP_OFFSET + 0);
  placeRdlnCd(slotB, SP_TMP_OFFSET + 1);
  {
    const r = await checkClick(DISPLAY_MSG_TM);
    _clrTmpSp(2);
    spofs(floatSp, -1024, -1024);
    drawPurpose();
    if (r === 'RESET') return ['modeTitle'];
  }

  return ['modeWDraw'];
}


async function modeWDraw() {
  // PRG @MODE_W_DRAW 完全準拠
  sppage(SCREEN_U);
  bgpage(SCREEN_L);
  displayTlnNum();

  // 先頭カードに変更があればredrawCdsで更新（SPRITEで管理）
  let changed = false;
  for (let i = 0; i < 9; i++) {
    const cd = i === 8 ? gs.talon : gs.cards[i];
    const fst = cd && cd.length > 0 ? cd.slice(0, 3) : '';
    if (fst !== gs.prevFstCd[i]) { changed = true; gs.prevFstCd[i] = fst; }
  }
  if (changed) redrawCds();

  // 山札から1枚引く
  const talonArr = gs.talon ? gs.talon.split(',').filter(Boolean) : [];
  gs.drawn = talonArr.shift() || '';
  gs.talon = talonArr.join(',');

  // SP_DRAWNを事前にセットアップ（クリックで中断されても表示できるように）
  // urev時: sphome=(W-1,H-1)なので spofs = 左上座標 + (W-1, H-1)
  //         左上座標 = GRP_W - DRAWN_X - CARD_WIDTH
  //         spofs    = GRP_W - DRAWN_X - CARD_WIDTH + (CARD_WIDTH-1) = GRP_W - DRAWN_X - 1
  const drawnX = gs.urev ? GRP_W - DRAWN_X - 1 : DRAWN_X;
  const drawnY = gs.urev ? GRP_H - DRAWN_Y - 1 : DRAWN_Y;
  drawDrawnCard(gs.drawn);  // 座標なし → spofs(-1024,-1024)のまま非表示
  spofs(SP_DRAWN, -1024, -1024);  // 明示的に非表示確認

  // SP_B00をセットアップ
  spset(SP_B00, 7*64+Math.floor(SPU7_B00/16), SPPL_B00, 0, 0, 2, 64, 64, SCREEN_U);
  sphome(SP_B00, 32, 32);
  spangle(SP_B00, gs.urev ? 180 : 0);
  spofs(SP_B00, -1024, -1024);

  // コンソール
  _gameCon();
  conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY, msg('clkTln'));

  // TALON待機
  const result = await mainPnlLoopR('TALON');
  if (result.action === 'RESET') return ['modeTitle'];
  omitTlnNum();

  // ① BGレイヤー1をN位置(0,0)にリセットしてlbg1B00で山札BG描画
  bgpage(SCREEN_L);
  bgofs(1, LBG1_N_OFS_X, LBG1_N_OFS_Y);
  await lbg1B00();
  // BGレイヤー1をM位置へスライド(DRAW_CD_TM_L フレーム)
  bgofs(1, LBG1_M_OFS_X, LBG1_M_OFS_Y, DRAW_CD_TM_L);
  const r1 = await checkClick(DRAW_CD_TM_L);
  if (r1 !== 'NONE') return _modeWDrawEnd(r1, drawnX, drawnY);

  // ② SP_B00を画面下からDRAWN位置へ
  const startY = gs.urev ? GRP_H + CARD_HH : GRP_H;
  spofs(SP_B00, MISSING_X, startY);
  const dx = gs.urev ? GRP_W - DRAWN_X - CARD_HW : DRAWN_X + CARD_HW;
  const dy = gs.urev ? GRP_H - DRAWN_Y - CARD_HH : DRAWN_Y + CARD_HH;
  spofs(SP_B00, dx, dy, DRAW_CD_TM_U);
  spangle(SP_B00, gs.urev ? 180 : 0);
  const r2 = await checkClick(DRAW_CD_TM_U);
  if (r2 !== 'NONE') return _modeWDrawEnd(r2, drawnX, drawnY);

  // ③ SP_DRAWNを表示してSP_B00を回転させながら退場
  spofs(SP_DRAWN, drawnX, drawnY);  // 事前セットアップ済みのSP_DRAWNを表示位置へ
  const angle = gs.urev ? 180 + ANIM_B00_ANGLE : ANIM_B00_ANGLE;
  spangle(SP_B00, angle, DRAW_CD_TM_A);
  const r3 = await checkClick(DRAW_CD_TM_A);
  if (r3 !== 'NONE') return _modeWDrawEnd(r3, drawnX, drawnY);

  bgmset(BGM_BEEP, SND_CD);
  bgmplay(BGM_BEEP);

  return _modeWDrawEnd('NONE', drawnX, drawnY);

  function _modeWDrawEnd(r, drawnX, drawnY) {
    const nextMode = (gs.drawn === 'A00' || gs.drawn === 'A13')
                   ? 'modeTerminal' : 'modeWCalc';
    const mode = r === 'RESET' ? 'modeTitle' : nextMode;
    spofs(SP_B00, -1024, -1024);
    spangle(SP_B00, gs.urev ? 180 : 0);
    lbg1Clr();
    // B00退場後: SP_DRAWNをカードスタック(pri=2)より前面(pri=1)に
    spset(SP_DRAWN, -1, 0, 0, 0, 1, CARD_WIDTH, CARD_HEIGHT, SCREEN_U);
    sphome(SP_DRAWN, gs.urev ? CARD_WIDTH - 1 : 0, gs.urev ? CARD_HEIGHT - 1 : 0);
    // クリックでアニメが飛んだ場合もSP_DRAWNを表示位置に
    spofs(SP_DRAWN, drawnX, drawnY);
    return [mode];
  }
}



// ============================================================
// MODE_W_CALC — スコア計算・移動判定
// ============================================================
// ============================================================
// CARD_TO_SCORE / REDUCE_EXP_* — PRG完全準拠実装
// ============================================================

// TABLE_MAJORの列インデックス: suffix→col
// 0=♠/ 1=/♠ 2=♦/ 3=/♦ 4=♥/ 5=/♥ 6=♣/ 7=/♣
const _SUFFIX_TO_COL = {
  '♠/': 0, '/♠': 1, '♦/': 2, '/♦': 3,
  '♥/': 4, '/♥': 5, '♣/': 6, '/♣': 7,
};

// PRG @CARD_TO_SCORE 完全準拠
// CD$ 形式: 小アルカナ="S03" 大アルカナ="A08U[♠/]"
function cardToScore(cd) {
  if (!cd) return 0;
  const suit = cd[0];

  if (suit !== 'A') {
    // 小アルカナ
    let n = parseInt(cd.slice(1, 3));
    if (n <= 10) return n;
    const courtCd = gs.courtCd || 'K14';
    if (courtCd === 'K14') return n;
    if (courtCd === 'K10') return 10;
    if (courtCd === 'K13a') return n >= 13 ? n - 1 : n;
    if (courtCd === 'K13b') return n >= 12 ? n - 1 : n;
    return n;
  }

  // 大アルカナ: 形式 "A08U[♠/]" または "A08U[♠/]" など
  // PRG: A$ = MID$(CD$,5,2) → "[♠/]" の中身2文字
  // Web版: cd='A08U[♠/]' → suffix=cd.slice(5,7) だが文字幅に注意
  // suffixは "♠/" "/♠" "♦/" "/♦" "♥/" "/♥" "♣/" "/♣" (各2文字、ただし♠等はUnicode1文字)
  const bracketOpen = cd.indexOf('[');
  if (bracketOpen < 0) return 0;
  const suffix = cd.slice(bracketOpen + 1, cd.indexOf(']'));
  let col = _SUFFIX_TO_COL[suffix];
  if (col === undefined) return 0;

  const num = parseInt(cd.slice(1, 3));
  const rev = cd[3] === 'R';  // 逆位置

  // 逆位置のとき列を入れ替え: floor(col/2)*2 + !(col%2)
  if (rev) col = Math.floor(col / 2) * 2 + (1 - col % 2);

  const row = TABLE_MAJOR[num];
  if (!row) return 0;
  const sc = row[col];

  // ST_MA_INF: gs.maInf は数値(DEF_MA_INF=2.0)
  const val = sc * gs.maInf;
  // PRG: FLOOR(A) + !!(A - FLOOR(A)) → 小数部があれば切り上げ
  return Math.floor(val) + (val - Math.floor(val) > 0 ? 1 : 0);
}

// PRG @SPLIT_EXP_ADD_R: '+' で分割（括弧・括弧を考慮）
function splitExpAddR(exp) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < exp.length; i++) {
    const ch = exp[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === '+' && depth === 0) {
      parts.push(exp.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(exp.slice(start));
  return parts.filter(Boolean);
}

// PRG @SPLIT_EXP_POS_R: 式からスロット番号・タイプ・suffix・notEmptyを解析
// 返値: { slot: string|'', type: suit文字, suffix: string, notEmpty: bool }
//   slot='' → 引いたカード($), slot='6'/'7' → 卦スロット, slot='0'-'5' → ボードスロット
function splitExpPosR(exp, state) {
  const { token } = state;
  let e = exp;

  // 外側のプレフィックス除去
  for (const pre of ['Min(', 'Suitable(', 'Max(', 'Sum(']) {
    if (e.startsWith(pre)) { e = e.slice(pre.length, -1); break; }
  }

  // suffix: '[...]' の内容
  let suffix = '';
  let notEmpty = false;
  const bi = e.indexOf('[');
  const bj = e.indexOf(']');
  if (bi >= 0 && bj > bi) {
    suffix = e.slice(bi + 1, bj);
    e = e.slice(0, bi) + e.slice(bj + 1);
  }
  if (e.includes('!')) { notEmpty = true; e = e.replace('!', ''); }

  // '(...)' の中身だけ取り出す
  const pi = e.indexOf('(');
  if (pi >= 0) { e = e.slice(pi + 1, e.lastIndexOf(')')); }

  const dir  = e[0];   // '$' '↑' '↓' '→' '←'
  const type = e[1] || '';  // 'A' '♠' '♦' '♥' '♣' など

  // '$' → 引いたカード
  if (dir === '$') return { slot: '', type, suffix, notEmpty };

  let slot = token;

  // 卦スロット(type='A'のみ)判定
  // PRG: IF A$=="↑" AND A>=3 THEN RR$[0]="7"
  //      IF A$=="↓" AND A<3  THEN RR$[0]="6"
  if (dir === '↑' && slot >= 3) return { slot: '7', type, suffix, notEmpty };
  if (dir === '↓' && slot < 3)  return { slot: '6', type, suffix, notEmpty };

  // 方向でスロット移動
  if (dir === '→') slot = slot - 1;
  if (dir === '←') slot = slot + 1;
  if (dir === '↑') slot = slot + 3;
  if (dir === '↓') slot = slot - 3;
  if (slot === -1) slot = 5;
  if (slot === 6)  slot = 0;

  // PRG: IF RR$[1]!="A" AND A>=3 AND CARDS_TYPE_U$!=RR$[1] THEN RR$[0]="7"
  //      IF RR$[1]!="A" AND A<3  AND CARDS_TYPE_L$!=RR$[1] THEN RR$[0]="6"
  if (type !== 'A') {
    if (slot >= 3 && type !== CARDS_TYPE_U) return { slot: '7', type, suffix, notEmpty };
    if (slot < 3  && type !== CARDS_TYPE_L) return { slot: '6', type, suffix, notEmpty };
  }

  return { slot: String(slot), type, suffix, notEmpty };
}

// PRG @REDUCE_EXP_CDS_R: 式からカード配列を返す
// 返値: 文字列配列 (NONE=null, 空=[])
function reduceExpCdsR(exp, state) {
  const { curSuitable, curDrawn, cards, board } = state;

  // Suitable(...)
  if (exp.includes('Suitable(')) {
    if (!curSuitable || curSuitable === 'NONE' || curSuitable === 'IGNORED') return null;
    // curSuitable = "cd0,cd1,cd2" (Min,Max,Suiteの3要素)
    const parts = curSuitable.split(',');
    // PRG: MID$(CUR_SUITABLE$,0,3)=parts[0], MID$(4,3)=parts[1], MID$(8,3)=parts[2]
    if (exp.startsWith('Max(Suitable')) return [parts[2]];  // MID$(8,3)
    if (exp.startsWith('Min(Suitable')) return [parts[1]];  // MID$(4,3)
    return [parts[0]];  // Suitable(...)のみ: MID$(0,3)
  }

  // Max(...): 内側を再帰評価して最高スコアのカードを返す
  if (exp.startsWith('Max(')) {
    const inner = exp.slice(4, -1);
    const cds = reduceExpCdsR(inner, state);
    if (cds === null) return null;
    if (cds.length === 0) return [];
    let maxSc = -1, maxCd = null;
    for (const cd of cds) {
      const sc = cardToScore(cd);
      if (maxSc < 0 || sc > maxSc) { maxSc = sc; maxCd = cd; }
    }
    return maxCd ? [maxCd] : [];
  }

  // Sum(...): 内側をそのまま返す（スコアは呼び出し元で合算）
  if (exp.startsWith('Sum(')) {
    return reduceExpCdsR(exp.slice(4, -1), state);
  }

  // Min(...): 内側を再帰評価して最低スコアのカードを返す
  if (exp.startsWith('Min(')) {
    const inner = exp.slice(4, -1);
    const cds = reduceExpCdsR(inner, state);
    if (cds === null) return null;
    if (cds.length === 0) return [];
    let minSc = -1, minCd = null;
    for (const cd of cds) {
      const sc = cardToScore(cd);
      if (minSc < 0 || sc < minSc) { minSc = sc; minCd = cd; }
    }
    return minCd ? [minCd] : [];
  }

  // 位置解析
  const pos = splitExpPosR(exp, state);
  if (!pos) return null;

  if (pos.type === 'A') {
    // 大アルカナスロット
    const slotNum = parseInt(pos.slot);
    const boardCd = board[slotNum] || '';  // 形式: 'A08U'
    if (!boardCd) return [];
    // 大アルカナカードにsuffixを付加（CARD_TO_SCOREで使用）
    return [`${boardCd}[${pos.suffix}]`];
  }

  if (pos.slot === '') {
    // 引いたカード($)
    return [curDrawn];
  }

  // スロット番号'6'/'7'は卦スロット（小アルカナスタック）
  const slotNum = parseInt(pos.slot);
  const slotCds = (cards[slotNum] || '').split(',').filter(Boolean);
  if (slotCds.length === 0) {
    if (pos.notEmpty) return null;
    return [];
  }
  return slotCds;
}

// PRG @REDUCE_EXP_NUM: 式を評価してスコアまたは真偽を返す
// 返値: { result: number|bool, rt: 'NUMBER'|'NONE' }
function reduceExpNum(exp, state) {
  // Suitable処理: curSuitableが未設定の場合に計算
  if (!state.curSuitable) {
    const si = exp.indexOf('Suitable(');
    if (si >= 0) {
      // Suitable(inner)の内側を取得
      const si2 = si + 9;
      let depth = 1, ei = si2;
      while (ei < exp.length && depth > 0) {
        if (exp[ei] === '(') depth++;
        else if (exp[ei] === ')') depth--;
        ei++;
      }
      const inner = exp.slice(si2, ei - 1);
      const suitableCds = reduceExpCdsR(inner, state);

      if (!suitableCds || suitableCds.length === 0) {
        state.curSuitable = 'NONE';
        return { result: 0, rt: 'NONE' };
      }

      // 各カードで式全体を評価してMin/Maxを求める
      const gtIdx2 = exp.indexOf('>');
      const isRight = (gtIdx2 >= 0 && gtIdx2 < si);  // J=1: '>'がSuitableより前=右辺

      let minSc = -1, minCd = null, maxSc = -1, maxCd = null;
      for (const cd of suitableCds) {
        const tryState = { ...state, curSuitable: `${cd},${cd},${cd}` };
        const tryResult = reduceExpNum(exp, tryState);
        if (tryResult.rt === 'NONE' || !tryResult.result) continue;
        const sc = cardToScore(cd);
        if (minSc < 0 || sc < minSc) { minSc = sc; minCd = cd; }
        if (maxSc < 0 || sc > maxSc) { maxSc = sc; maxCd = cd; }
      }

      if (minSc < 0) {
        state.curSuitable = 'NONE';
        return { result: 0, rt: 'NONE' };
      }

      // PRG: J = (SuitableのgtIdxより左にある = 左辺) → !J=右辺
      // IF J(右辺) THEN MIN_CD$+","+MIN_CD$+","+MAX_CD$
      // IF !J(左辺) THEN MAX_CD$+","+MIN_CD$+","+MAX_CD$
      if (isRight) {
        // Suitableが右辺 (J=1): MIN,MIN,MAX
        state.curSuitable = `${minCd},${minCd},${maxCd}`;
      } else {
        // Suitableが左辺 (J=0): MAX,MIN,MAX
        state.curSuitable = `${maxCd},${minCd},${maxCd}`;
      }
    } else {
      state.curSuitable = 'IGNORED';
    }
  }

  // '>' を含む: 左辺合計 > 右辺合計
  const gtIdx = exp.indexOf('>');
  if (gtIdx >= 0) {
    const leftTerms  = splitExpAddR(exp.slice(0, gtIdx));
    const rightTerms = splitExpAddR(exp.slice(gtIdx + 1));
    let lSum = 0, rSum = 0;
    for (const t of leftTerms) {
      const v = reduceExpNum(t, state);
      if (v.rt === 'NONE') return { result: false, rt: 'NONE' };
      lSum += Number(v.result);
    }
    for (const t of rightTerms) {
      const v = reduceExpNum(t, state);
      if (v.rt === 'NONE') return { result: false, rt: 'NONE' };
      rSum += Number(v.result);
    }
    return { result: lSum > rSum, rt: 'NUMBER' };
  }

  // '>'なし: カードのスコア合計を返す
  const cds = reduceExpCdsR(exp, state);
  if (cds === null) return { result: 0, rt: 'NONE' };
  if (cds.length === 0) return { result: 0, rt: 'NUMBER' };
  const sum = cds.reduce((a, cd) => a + cardToScore(cd), 0);
  return { result: sum, rt: 'NUMBER' };
}



// ============================================================
// ヘルパー関数
// ============================================================
// SP_TMP_OFFSETのSPRITEを完全リセット（angle残存防止）
// placeToRect: トークン位置(0-5)をGRP上のRect{x,y,w,h}に変換
// popupMenuのtouch拡張用
function placeToRect(place) {
  let x = CARD_X[place], y = CARD_Y[place];
  let w = CARD_WIDTH, h = CARD_HEIGHT;
  if (gs.urev) {
    x = GRP_W - x - w;
    y = GRP_H - y - h;
  }
  return { x, y, w, h };
}

function _clrTmpSp(n=6) {
  for (let j = 0; j < n; j++) {
    spclr(SP_TMP_OFFSET + j);
    spangle(SP_TMP_OFFSET + j, 0);
  }
}
function _resetClip() {
  for (let s = 0; s <= 1; s++) {
    conState.clipCX[s] = 0; conState.clipCY[s] = 0;
    conState.clipCW[s] = CON_W; conState.clipCH[s] = CON_H;
  }
  conCls(SCREEN_U);
  conCls(SCREEN_L);
}

function _setClip(disp, cx, cy, cw, ch) {
  conState.clipCX[disp] = cx; conState.clipCY[disp] = cy;
  conState.clipCW[disp] = cw; conState.clipCH[disp] = ch;
}

function _gameCon() {
  _setClip(SCREEN_L, GAME_CON_CX, GAME_CON_CY, GAME_CON_CW, GAME_CON_CH);
  conCls(SCREEN_L);
}


function _setClipGame(disp) {
  // GAME_CON領域のみ（ルール表示行を消さないようにy=GAME_CON_CYから）
  _setClip(disp, GAME_CON_CX, GAME_CON_CY, GAME_CON_CW, GAME_CON_CH);
}


function _parseMode(result) {
  if (!result || result === 'NONE') return ['modeTitle'];
  if (result === '@END') {
    // ウィンドウを閉じる試み（スマホブラウザでは動作しない場合がある）
    try { window.close(); } catch(_) {}
    // 閉じられない場合はタイトルに戻る
    return ['modeTitle'];
  }
  const m = result.match(/^@MODE_(\w+)(?:,(.*))?$/);
  if (!m) return ['modeTitle'];
  const name = 'mode' + m[1].charAt(0) + m[1].slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return [name, m[2]];
}


function _saveSettings() {
  saveSettings({
    lang:      gs.lang,
    stTerminals: gs.stTerminals,
    courtCd:   gs.courtCd,
    maInf:     gs.maInf,
    swap811:   gs.swap811,
    urev:      gs.urev,
  });
}


async function _waitBgm() {
  // BGM再生完了を待つ（簡易: 一定フレーム待つ）
  await checkClick(90);
}


async function modeTerminal() {
  sppage(SCREEN_U);
  bgpage(SCREEN_L);
  _gameCon();

  gs.terminals++;

  if (gs.terminals >= gs.stTerminals) {
    // === _MODE_TERME: ゲーム終了 ===
    // 終了メッセージ表示
    conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY,
      msg('terme'), [String(gs.stTerminals)]);

    let r = await checkClick(DISPLAY_MSG_TM);
    if (r === 'RESET') return ['modeTitle'];

    // 勝利条件スロット表示 (purpose=A13→上コウ=5,4番, purpose=A00→2コウ=1,4番)
    _gameCon();
    const termMsg = gs.purpose === 'A13' ? msg('termu') : msg('terml');
    conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY, termMsg);

    // 勝利スロットに赤線表示（sppage確認してから）
    const [slotA, slotB] = gs.purpose === 'A13' ? [5, 4] : [1, 4];
    sppage(SCREEN_U);
    placeRdlnCd(slotA, SP_TMP_OFFSET + 0);
    placeRdlnCd(slotB, SP_TMP_OFFSET + 1);

    r = await checkClick(DISPLAY_MSG_TM);
    if (r !== 'RESET') {
      // 勝敗判定
      _clrTmpSp(2);
      _gameCon();
      const win = gs.token === slotA || gs.token === slotB;
      conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY,
        win ? msg('ywin') : msg('ylose'));

      r = await checkClick(DISPLAY_MSG_TM);
      if (r !== 'RESET') {
        // 「タイトルに戻る/続ける」メニュー
        displayTlnNum();
        // MSG_RSTQYN: タイトルに戻るか確認（PRG準拠）
        // clipを全面に戻してからポップアップ表示
        const choice = await popupMenu(
          [[msg('rstqyn_yes'), 'yes'], [msg('rstqyn_no'), 'no']],
          { disp: SCREEN_L }
        );
        return ['modeTitle'];  // どちらを選んでもタイトルへ
      }
    }
    return ['modeTitle'];
  }

  // === _MODE_TERMN: 中間ターミナル（シャッフルして続行） ===
  conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY,
    msg('termn'), [String(gs.terminals), String(gs.stTerminals)]);

  // 捨て札+引いたカード+タロンをシャッフルして新タロンに
  const all = [
    ...( gs.discarded ? gs.discarded.split(',').filter(Boolean) : []),
    ...( gs.drawn     ? [gs.drawn]                               : []),
    ...( gs.talon     ? gs.talon.split(',').filter(Boolean)      : []),
  ];
  // シャッフル
  gs.talon = shuffleCards(all).join(',');
  gs.discarded  = '';
  gs.drawn      = '';

  // SP_DRAWNをアニメで画面外へ（上画面）
  bgpage(SCREEN_L);
  const exitY = gs.urev ? GRP_H + CARD_HEIGHT : GRP_H;
  spofs(SP_DRAWN, MISSING_X, exitY, MISSING_TM_U);
  let r = await checkClick(MISSING_TM_U);
  if (r !== 'NONE') return _termEnd(r);

  // 上画面をクリアしてボードを再描画
  gpage(SCREEN_U); gcls(COL_BOARD);
  drawBoard();
  redrawCds();
  shipoutUGpage();

  // BGレイヤー1をM位置→N位置へスライド（山札が戻るアニメ）
  bgofs(1, LBG1_M_OFS_X, LBG1_M_OFS_Y);
  await lbg1B00();
  bgofs(1, LBG1_N_OFS_X, LBG1_N_OFS_Y, MISSING_TM_L);
  r = await checkClick(MISSING_TM_L);
  if (r !== 'NONE') return _termEnd(r);

  // シャッフル効果音
  bgmset(BGM_BEEP, SND_CD_SHUFFLE);
  bgmplay(BGM_BEEP);
  r = await checkClick(SND_CD_SH_T);
  if (r !== 'NONE') {
    bgmstop(BGM_BEEP);
    return _termEnd(r);
  }

  return _termEnd('NONE');

  function _termEnd(r) {
    lbg1Clr();
    spofs(SP_DRAWN, -1024, -1024);
    return r === 'RESET' ? ['modeTitle'] : ['modeWDraw'];
  }
}

async function modeWCalc() {
  sppage(SCREEN_U);
  bgpage(SCREEN_L);
  _gameCon();

  const utrgQ = gs.token >= 3 ? 1 : 0;
  const suit  = 'SDHC'.indexOf(gs.drawn[0]);
  const num   = parseInt(gs.drawn.slice(1, 3));

  // drew + clkTln を GAME_CON_CXから連続表示 (PRG L1237-1243)
  const trgWord  = utrgQ ? words().utrg : words().ltrg;
  const suitWord = [words().sword, words().coin, words().cup, words().wand][suit] || '';
  let numWord = String(num);
  if (num===1)  numWord = words().ace;
  if (num===11) numWord = words().jack;
  if (num===12) numWord = words().caballero;
  if (num===13) numWord = words().queen;
  if (num===14) numWord = words().king;
  conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY,
    msg('drew'), [trgWord, suitWord, numWord]);
  conPrintL(SCREEN_L, msg('clkTln'));

  displayTlnNum();
  const r0 = await mainPnlLoopR('TALON');
  if (r0.action === 'RESET') return ['modeTitle'];
  omitTlnNum();

  // REDUCE_EXP_NUM でMOVE/STAY判定
  const ruleComp = RULE_COMP[utrgQ][suit];
  let moveQ = 0;
  const state = { curSuitable: '', curDrawn: gs.drawn,
    cards: gs.cards.slice(), board: gs.board, token: gs.token };

  if (ruleComp === 'STAY') {
    moveQ = 0;
  } else if (ruleComp === 'MOVE') {
    moveQ = 1;
  } else {
    const ev = reduceExpNum(ruleComp, state);
    moveQ = (ev.rt !== 'NONE' && ev.result) ? 1 : 0;
  }
  if (moveQ === 1 && RULE_MOVE[utrgQ][suit] === 'CHOOSE') moveQ = 2;

  // STAYのみ (PRG @_MODE_W_CAL 〜 STAY分岐)
  if (ruleComp === 'STAY') {
    _gameCon();
    conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY, msg('ostay'));
    const r = await checkClick(DISPLAY_MSG_TM);
    omitRdln();
    return r === 'RESET' ? ['modeTitle'] : _modeWCalC('NONE', utrgQ, suit, moveQ, r !== 'NONE', state.curSuitable);
  }

  // MOVEのみ (PRG @_MODE_W_CAL_NS)
  if (ruleComp === 'MOVE') {
    if (moveQ !== 2) {
      _gameCon();
      conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY, msg('omove'));
      const r = await checkClick(DISPLAY_MSG_TM);
      if (r === 'RESET') { omitRdln(); return ['modeTitle']; }
    }
    omitRdln();
    return _modeWCalC('NONE', utrgQ, suit, moveQ, false, state.curSuitable);
  }

  // 式あり: @_MODE_W_CAL_NM
  // そろばんリセット
  bgmset(BGM_BEEP, SND_SRBN_CLR);
  bgmplay(BGM_BEEP);
  gs.sorobanL = 0; gs.sorobanR = 0;
  drawSrbnTama();
  {
    const r = await checkClick(SND_SRBN_CLR_T);
    if (r !== 'NONE') { bgmstop(BGM_BEEP); omitRdln();
      return r === 'RESET' ? ['modeTitle'] : _modeWCalC('NONE', utrgQ, suit, moveQ, true, state.curSuitable); }
  }
  bgmset(BGM_BEEP, SND_SRBN);

  // 左辺・右辺の項配列と各項のスコアを蓄積する配列
  const leftTerms  = splitExpAddR(ruleComp.slice(0, ruleComp.indexOf('>')));
  const rightTerms = splitExpAddR(ruleComp.slice(ruleComp.indexOf('>') + 1));
  const leftN  = leftTerms.length;
  const rightN = rightTerms.length;

  for (let rightQ = 0; rightQ < 2; rightQ++) {
    const terms = rightQ ? rightTerms : leftTerms;
    const n     = rightQ ? rightN     : leftN;
    for (let i = 0; i < n; i++) {
      const term = (rightQ ? rightTerms : leftTerms)[i];  // 現在の値（確定後はスコア文字列）

      // GAME_CON_CLSして式を表示 (PRG L1333-1371)
      _gameCon();
      // 左辺: 現在項をハイライト
      let lStr = leftTerms.map((t, j) =>
        (!rightQ && i === j) ? '\\c4' + t + '\\cR' : t).join('+');
      // PRG: CON_PRINT with LAST_CX[1], LAST_CY[1] → _gameCon後はGAME_CON_CX,CY
      conPrint(SCREEN_L, conState.lastCX[SCREEN_L], conState.lastCY[SCREEN_L], lStr);
      // 右辺: GAME_CON_CX, LAST_CY[1]+1
      let rStr = rightTerms.map((t, j) =>
        (rightQ && i === j) ? '\\c4' + t + '\\cR' : t).join('+');
      conPrint(SCREEN_L, GAME_CON_CX, conState.lastCY[SCREEN_L] + 1, '> ' + rStr + '?');

      {
        const r = await checkClick(FLASH_MSG_TM);
        if (r !== 'NONE') { omitRdln();
          return r === 'RESET' ? ['modeTitle'] : _modeWCalC('NONE', utrgQ, suit, moveQ, true, state.curSuitable); }
      }

      // REDUCE_EXP_CDS_R
      const cds = reduceExpCdsR(term, state);
      const cdsStr = cds === null ? 'NONE' : cds.join(',');
      const pos = splitExpPosR(term, state);
      const posSlot = pos ? (pos.slot === '' ? -1 : parseInt(pos.slot)) : -1;
      const isAType = pos && pos.type === 'A';

      if (isAType) {
        // @_MODE_W_CAL_SA: 大アルカナスロット
        const boardCd = gs.board[posSlot] || '';
        const trtmjStr = trtmj(parseInt(boardCd.slice(1,3))) +
          (boardCd[3]==='R' ? '(' + (words().inv||'逆') + ')' : '');
        const cdWithSuffix = boardCd + '[' + (pos.suffix||'') + ']';
        const sc = cardToScore(cdWithSuffix);
        if (rightQ) gs.sorobanR += sc; else gs.sorobanL += sc;
        if (rightQ) rightTerms[i] = String(sc); else leftTerms[i] = String(sc);

        _gameCon();
        conPrint(SCREEN_L, conState.lastCX[SCREEN_L], conState.lastCY[SCREEN_L],
          trtmjStr + '[' + (pos.suffix||'') + '] = ' + sc);
        bgmplay(BGM_BEEP);
        placeRdln('MAJOR', posSlot, '');
        drawSrbnTama();
        const r = await checkClick(FLASH_MSG_TM);
        omitRdln(); spclr(SP_TMP_OFFSET); spangle(SP_TMP_OFFSET, 0);
        if (r !== 'NONE') { omitRdln();
          return r === 'RESET' ? ['modeTitle'] : _modeWCalC('NONE', utrgQ, suit, moveQ, true, state.curSuitable); }

      } else if (!cds || cds.length === 0) {
        // @_MODE_W_CAL_SN: カードなし
        if (rightQ) rightTerms[i] = '0'; else leftTerms[i] = '0';
        _gameCon();
        const hasSuitable = term.includes('Suitable');
        const cdKey = (cdsStr === 'NONE') ? (hasSuitable ? 'cdnsut' : 'cdneed') : 'cdnone';
        conPrintL(SCREEN_L, msg(cdKey));
        const waitTm = (cdsStr === 'NONE') ? DISPLAY_MSG_TM : FLASH_MSG_TM;
        const r = await checkClick(waitTm);
        if (r !== 'NONE' || cdsStr === 'NONE') { omitRdln();
          return r === 'RESET' ? ['modeTitle'] : _modeWCalC('NONE', utrgQ, suit, moveQ, r !== 'NONE', state.curSuitable); }

      } else if (cds.length === 1 && cds[0].length <= 3) {
        // @_MODE_W_CAL_SM: カード1枚
        const cd = cds[0];
        const j = posSlot >= 0
          ? Math.floor((gs.cards[posSlot]||'').split(',').indexOf(cd) / 1)
          : 0;
        const sc = cardToScore(cd);
        if (rightQ) gs.sorobanR += sc; else gs.sorobanL += sc;
        if (rightQ) rightTerms[i] = String(sc); else leftTerms[i] = String(sc);

        _gameCon();
        conPrint(SCREEN_L, conState.lastCX[SCREEN_L], conState.lastCY[SCREEN_L],
          cardToDchr(cd) + ' = ' + sc);
        bgmplay(BGM_BEEP);
        if (posSlot >= 0) placeRdln('CARD', posSlot, String(j || 0));
        else placeRdln('CARD', -1, '');  // DRAWN
        drawSrbnTama();
        const r = await checkClick(FLASH_MSG_TM);
        omitRdln();
        if (r !== 'NONE') { omitRdln();
          return r === 'RESET' ? ['modeTitle'] : _modeWCalC('NONE', utrgQ, suit, moveQ, true, state.curSuitable); }

      } else {
        // @_MODE_W_CAL_S3: カード複数枚
        if (rightQ) rightTerms[i] = '0'; else leftTerms[i] = '0';
        for (let j = 0; j < cds.length; j++) {
          const cd = cds[j];
          const sc = cardToScore(cd);
          if (rightQ) gs.sorobanR += sc; else gs.sorobanL += sc;
          if (rightQ) rightTerms[i] = String((Number(rightTerms[i]) || 0) + sc);
          else        leftTerms[i]  = String((Number(leftTerms[i])  || 0) + sc);

          _gameCon();
          conPrint(SCREEN_L, conState.lastCX[SCREEN_L], conState.lastCY[SCREEN_L],
            cardToDchr(cd) + ' = ' + sc);
          bgmplay(BGM_BEEP);
          if (posSlot >= 0) placeRdln('CARD', posSlot, String(j));
          else placeRdln('CARD', -1, '');  // DRAWN
          drawSrbnTama();
          const r = await checkClick(FLASH_MSG_TM);
          omitRdln();
          if (r !== 'NONE') { omitRdln();
            return r === 'RESET' ? ['modeTitle'] : _modeWCalC('NONE', utrgQ, suit, moveQ, true, state.curSuitable); }
        }
      }
    }
  }

  // @_MODE_W_CAL_S1E: 最終スコア表示
  _gameCon();
  const lScoreStr = leftTerms.join('+');
  const rScoreStr = rightTerms.join('+');
  conPrint(SCREEN_L, conState.lastCX[SCREEN_L], conState.lastCY[SCREEN_L], lScoreStr);
  conPrint(SCREEN_L, GAME_CON_CX, conState.lastCY[SCREEN_L] + 1, '> ' + rScoreStr + '?');
  {
    const r = await checkClick(FLASH_MSG_TM);
    if (r !== 'NONE') { omitRdln();
      return r === 'RESET' ? ['modeTitle'] : _modeWCalC('NONE', utrgQ, suit, moveQ, true, state.curSuitable); }
  }

  // 結果メッセージ (PRG L1540-1545: GMOVE/LSTAY/GCHSE + スコア)
  const lTotal = leftTerms.reduce((a,v) => a + (Number(v)||0), 0);
  const rTotal = rightTerms.reduce((a,v) => a + (Number(v)||0), 0);
  const resultKey = moveQ === 2 ? 'gchse' : moveQ ? 'gmove' : 'lstay';
  _gameCon();
  conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY,
    msg(resultKey), [String(lTotal), String(rTotal)]);
  {
    const r = await checkClick(DISPLAY_MSG_TM);
    omitRdln();
    if (r === 'RESET') return ['modeTitle'];
  return _modeWCalC('NONE', utrgQ, suit, moveQ, r !== 'NONE', state.curSuitable);
  }
}



// ============================================================
// _MODE_W_CAL_C — PRG @_MODE_W_CAL_C 完全準拠
// moveQ!=2: RULE_STAY/MOVEをruleStrにセットして_modeWCalDへ
// moveQ==2: CHOOSE→popupMenuでウゴク/トドマルを選択
// ============================================================
async function _modeWCalC(r, utrgQ, suit, moveQ, clickQ=0, curSuitable="") {
  omitRdln();
  if (r === 'RESET') return ['modeTitle'];
  if (moveQ !== 2 && r !== 'NONE') clickQ = 1;

  // moveQ==0: STAY, moveQ==1: MOVE → RULE_STAY/MOVEをそのまま使用
  if (moveQ === 0) {
    const ruleStr = RULE_STAY[utrgQ][suit];
    return _modeWCalD('NONE', utrgQ, suit, moveQ, clickQ, ruleStr, curSuitable);
  }
  if (moveQ === 1) {
    const ruleStr = RULE_MOVE[utrgQ][suit];
    return _modeWCalD('NONE', utrgQ, suit, moveQ, clickQ, ruleStr, curSuitable);
  }

  // moveQ==2: CHOOSE(↓♠) → ウゴク/トドマルをポップアップで選択
  _gameCon();
  conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY, msg('moveq'));
  displayTlnNum();

  while (true) {
    // 現在トークン位置とMOVE先をGRPで赤線表示
    const curMove0 = RULE_MOVE_C[utrgQ][suit].slice(0, 1);
    let nextTok = gs.token;
    if (curMove0 === '←') nextTok = gs.token + 1;
    if (curMove0 === '→') nextTok = gs.token - 1;
    if (curMove0 === '↑') nextTok = gs.token + 3;
    if (curMove0 === '↓') nextTok = gs.token - 3;
    if (nextTok < 0) nextTok = 5;
    if (nextTok > 5) nextTok = 0;
    sppage(SCREEN_U);
    placeRdlnCd(gs.token, SP_TMP_OFFSET + 0);
    placeRdlnCd(nextTok,  SP_TMP_OFFSET + 1);
    const curRect  = placeToRect(gs.token);
    const nextRect = placeToRect(nextTok);
    const choice = await popupMenu([
      ['\\B[B]',     ''],
      ['\\B[Y]',     'Y'],
      ['\\B[X]',     'N'],
      ['\\B[START]', 'RSTQ'],
      [`\\B[touch(${SCREEN_U},${curRect.x},${curRect.y},${curRect.w},${curRect.h})]`, 'N'],
      [`\\B[touch(${SCREEN_U},${nextRect.x},${nextRect.y},${nextRect.w},${nextRect.h})]`, 'Y'],
      ['\\N[Y]' + (words().move || 'Move'), 'Y'],
      ['\\N[X]' + (words().stay || 'Stay'), 'N'],
    ], { disp: SCREEN_L });
    _clrTmpSp(2);

    if (choice === 'Y' || choice === 'N') {
      omitTlnNum();
      if (choice === 'Y') {
        moveQ = 1;
        const ruleStr = RULE_MOVE_C[utrgQ][suit];
        return _modeWCalD('NONE', utrgQ, suit, moveQ, 0, ruleStr, curSuitable);
      } else {
        moveQ = 0;
        const ruleStr = RULE_STAY_C[utrgQ][suit];
        return _modeWCalD('NONE', utrgQ, suit, moveQ, 0, ruleStr, curSuitable);
      }
    }
    // NONE/キャンセル → POPUP_RSTQと同等
    // Bボタン → タイトルへ確認
    const confirmed = await _popupRstqGame();
    if (confirmed) { omitTlnNum(); return ['modeTitle']; }
    // キャンセルしなかった → ループを続ける
  }
}

// _popupRstqGame: _MODE_W_CAL_CL でのRSTQ処理
async function _popupRstqGame() {
  _gameCon();
  const result = await popupMenu([
    [msg('rstqyn_yes'), 'yes'],
    [msg('rstqyn_no'),  'no'],
  ], { disp: SCREEN_L });
  return result === 'yes';
}

// ============================================================
// _MODE_W_CAL_D — PRG @_MODE_W_CAL_D 暫定（カード移動は未実装）
// ruleStr: RULE_MOVE/STAY[utrgQ][suit] の内容
// ============================================================
// ============================================================
// _MODE_W_CAL_D — PRG @_MODE_W_CAL_D 完全準拠
// ruleStr: "→,$♠⇒(↑♠)" or "$♣⇒×,Max(↓♥)⇒×" 形式
// ============================================================
async function _modeWCalD(r, utrgQ, suit, moveQ, clickQ, ruleStr, curSuitable="") {
  // ruleStrをカンマ分割して各ルールを解析
  const ruleItems = ruleStr.split(',');
  let curMove = '';  // CUR_MOVE$ (←↑↓→の1文字)
  let srcN = ruleItems.length;

  // moveQ==1のとき最初の要素がCUR_MOVE$ (方向記号)
  let ruleStart = 0;
  if (moveQ) {
    curMove = ruleItems[0];
    ruleStart = 1;
    srcN = ruleItems.length - 1;
  }

  // CUR_SRC$[i]/CUR_DEST$[i]を解析 (⇒で分割)
  const curSrc  = [];
  const curDest = [];
  for (let i = 0; i < srcN; i++) {
    const item = ruleItems[ruleStart + i];
    const arrowIdx = item.indexOf('⇒');
    curSrc.push(item.slice(0, arrowIdx));
    curDest.push(item.slice(arrowIdx + '⇒'.length));
  }

  // 現在状態のコピー(NEXT_*)
  let nextToken   = gs.token;
  let nextDiscarded = gs.discarded;
  const nextCards = gs.cards.slice();

  // 各src/destを解析してNEXT_*を先行計算 (PRG L1607-1643)
  const state = {
    curSuitable: curSuitable || '', curDrawn: gs.drawn,
    cards: gs.cards.slice(), board: gs.board, token: gs.token,
  };

  const curSrcCds = [];  // CUR_SRC_CDS$[i]
  const curSrcPos = [];  // CUR_SRC_POS[i] (-1=DRAWN, 0-7=slot)
  const curDestPos = []; // CUR_DEST_POS[i] (-1=捨て, 0-7=slot)
  const curSrcSpg = [];  // CUR_SRC_SPG$[i] (SPRITE番号文字列)

  for (let i = 0; i < srcN; i++) {
    const pos = splitExpPosR(curSrc[i], state);
    if (!pos || pos.slot === '') {
      // DRAWN ($)
      curSrcPos.push(-1);
      curSrcCds.push(gs.drawn);
    } else {
      const slot = parseInt(pos.slot);
      curSrcPos.push(slot);
      const cds = reduceExpCdsR(curSrc[i], state);
      const cdStr = cds ? cds.join(',') : '';
      curSrcCds.push(cdStr);
      // スロットからcdStrを削除 → NEXT_CARDS$[slot]更新
      if (cdStr && slot >= 0 && slot < 8) {
        const existing = (nextCards[slot] || '').split(',').filter(Boolean);
        const toRemove = cdStr.split(',').filter(Boolean);
        const newArr = existing.filter(c => !toRemove.includes(c));
        nextCards[slot] = newArr.join(',');
        state.cards = nextCards.slice();
      }
    }

    // dest解析
    if (curDest[i] === '×') {
      curDestPos.push(-1);
      // 捨て札に追加
      if (curSrcCds[i]) {
        nextDiscarded = nextDiscarded
          ? nextDiscarded + ',' + curSrcCds[i]
          : curSrcCds[i];
      }
    } else {
      const dstPos = splitExpPosR(curDest[i], state);
      const dstSlot = dstPos ? parseInt(dstPos.slot) : -1;
      curDestPos.push(dstSlot);
      // 移動先スロットに追加
      if (curSrcCds[i] && dstSlot >= 0 && dstSlot < 8) {
        const existing2 = (nextCards[dstSlot] || '').split(',').filter(Boolean);
        existing2.push(...curSrcCds[i].split(',').filter(Boolean));
        nextCards[dstSlot] = existing2.join(',');
        state.cards = nextCards.slice();
      }
    }
    curSrcSpg.push('');
  }

  // トークン移動先
  if (curMove === '←') nextToken = gs.token + 1;
  if (curMove === '→') nextToken = gs.token - 1;
  if (curMove === '↑') nextToken = gs.token + 3;
  if (curMove === '↓') nextToken = gs.token - 3;
  if (nextToken < 0) nextToken = 5;
  if (nextToken > 5) nextToken = 0;

  // clickQなら即@_MODE_W_CAL_AEへ
  if (clickQ) {
    return _modeWCalAE('NONE', utrgQ, suit, moveQ, nextToken, nextDiscarded, nextCards, curSrcSpg, srcN);
  }

  // cruleメッセージ表示 (PRG L1648-1656)
  _gameCon();
  conPrint(SCREEN_L, GAME_CON_CX, GAME_CON_CY, msg('crule'));
  conPrint(SCREEN_L, conState.lastCX[SCREEN_L], conState.lastCY[SCREEN_L], ruleStr);

  // 各srcカードのSPRITEを準備 (PRG L1658-1696)
  for (let i = 0; i < srcN; i++) {
    if (curSrcPos[i] === -1) {
      // DRAWN
      curSrcSpg[i] = String(SP_DRAWN);
    } else if (!curSrcCds[i]) {
      curSrcSpg[i] = '';
    } else if (curSrcCds[i].length <= 3) {
      // 小アルカナ1枚: makeCdSpg
      const sp = SP_TMP_OFFSET + i * 2;
      curSrcSpg[i] = makeCdSpg(curSrcCds[i], sp);
      // 初期位置: スロットの先頭カード位置
      const slot = curSrcPos[i];
      const anchor = CARDS_ANCHOR[slot] || '';
      let a = anchor, pfx = '';
      if (a[0]==='S'||a[0]==='N') { pfx=a[0]; a=a.slice(1); }
      let sx = Math.floor(CARDS_W/2 - CARD_WIDTH/2);
      let sy = Math.floor(CARDS_H/2 - CARD_HEIGHT/2);
      if (pfx==='N') sy=0;
      if (pfx==='S') sy=CARDS_H-CARD_HEIGHT;
      if (a==='W') sx=0;
      if (a==='E') sx=CARDS_W-CARD_WIDTH;
      let px = CARDS_X[slot] + sx, py = CARDS_Y[slot] + sy;
      if (gs.urev) { px = GRP_W - px - 1; py = GRP_H - py - 1; }
      spgOfs(parseInt(curSrcSpg[i]), px, py, 0);
    } else {
      // カード複数枚 (CARDS_SPG): redrawCdsが描いたSPRITEをfloatSpg
      curSrcSpg[i] = gs.curSpg[curSrcPos[i]] || '';
      if (curSrcSpg[i]) {
        gs.curSpg[curSrcPos[i]] = '';
        floatSpg(parseInt(curSrcSpg[i]));
      }
    }
  }

  // PRG準拠: REDRAW_CDSの前にCUR_CARDS$はsrcカードを削除済み・dest追加前
  // nextCardsはsrc削除+dest追加済みの最終状態なので、src削除のみの中間状態を作る
  const cardsForRedraw = gs.cards.slice();
  for (let i = 0; i < srcN; i++) {
    const slot = curSrcPos[i];
    if (slot >= 0 && slot < 8 && curSrcCds[i]) {
      const existing = (cardsForRedraw[slot] || '').split(',').filter(Boolean);
      const toRemove = curSrcCds[i].split(',').filter(Boolean);
      cardsForRedraw[slot] = existing.filter(c => !toRemove.includes(c)).join(',');
    }
  }
  for (let i = 0; i < 8; i++) gs.cards[i] = cardsForRedraw[i];

  // redrawCds + drawBoard
  gpage(SCREEN_U); gcls(COL_BOARD);
  drawBoard();
  shipoutUGpage();
  redrawCds();

  // 各srcSPRITEをdest位置にアニメ (MISSING_TM_U)
  for (let i = 0; i < srcN; i++) {
    if (!curSrcCds[i] || !curSrcSpg[i]) continue;
    const dst = curDestPos[i];
    const isSingle = curSrcCds[i].length <= 3;
    const W = isSingle ? CARD_WIDTH  : CARDS_W;
    const H = isSingle ? CARD_HEIGHT : CARDS_H;
    let tx, ty;
    if (dst === -1) {
      // 捨て札 → 画面外へ
      tx = MISSING_X;
      ty = GRP_H + H;  // PRG: GRP_HEIGHT + H * ST_UREV（通常もurevも+H）
    } else if (dst < 6) {
      // 大アルカナスロット
      tx = CARD_X[dst] + Math.floor(CARD_WIDTH/2 - W/2);
      ty = CARD_Y[dst] + Math.floor(CARD_HEIGHT/2 - H/2);
      if (gs.urev) { tx = GRP_W - tx - 1; ty = GRP_H - ty - 1; }
    } else {
      // 小アルカナスロット
      tx = CARDS_X[dst] + Math.floor(CARDS_W/2 - W/2);
      ty = CARDS_Y[dst] + Math.floor(CARDS_H/2 - H/2);
      if (gs.urev) { tx = GRP_W - tx - 1; ty = GRP_H - ty - 1; }
    }
    spgOfs(parseInt(curSrcSpg[i]), tx, ty, MISSING_TM_U);
  }
  {
    const rc = await checkClick(MISSING_TM_U);
    if (rc !== 'NONE') {
      return _modeWCalAE(rc, utrgQ, suit, moveQ, nextToken, nextDiscarded, nextCards, curSrcSpg, srcN);
    }
  }

  // 捨て札アニメ: LBG1_DISCARDED → LBG1スライド (MISSING_TM_L)
  {
    // 捨てられるカードを集める
    let discardedStr = '';
    for (let i = 0; i < srcN; i++) {
      if (curDestPos[i] === -1 && curSrcCds[i]) {
        discardedStr = discardedStr
          ? discardedStr + ',' + curSrcCds[i]
          : curSrcCds[i];
      }
    }
    bgofs(1, LBG1_M_OFS_X, LBG1_M_OFS_Y);
    lbg1Discarded(discardedStr);
    bgofs(1, LBG1_N_OFS_X, LBG1_N_OFS_Y, MISSING_TM_L);
    const rc = await checkClick(MISSING_TM_L);
    if (rc !== 'NONE') {
      return _modeWCalAE(rc, utrgQ, suit, moveQ, nextToken, nextDiscarded, nextCards, curSrcSpg, srcN);
    }
  }

  // SND_CDを鳴らす
  bgmset(BGM_BEEP, SND_CD);
  bgmplay(BGM_BEEP);

  // トークン移動アニメ (PRG L1723-1745)
  if (!curMove) {
    return _modeWCalAE('NONE', utrgQ, suit, moveQ, nextToken, nextDiscarded, nextCards, curSrcSpg, srcN);
  }
  gs.token = nextToken;
  drawToken(MOVE_TOKEN_TM);
  spscale(SP_TOKEN, ANIM_TOKEN_MAG, Math.floor(MOVE_TOKEN_TM / 2));
  {
    const rc = await checkClick(Math.floor(MOVE_TOKEN_TM / 2));
    if (rc !== 'NONE') {
      return _modeWCalAE(rc, utrgQ, suit, moveQ, nextToken, nextDiscarded, nextCards, curSrcSpg, srcN);
    }
  }
  spscale(SP_TOKEN, 100, Math.floor(MOVE_TOKEN_TM / 2) + (MOVE_TOKEN_TM % 2));
  {
    const rc = await checkClick(Math.floor(MOVE_TOKEN_TM / 2) + (MOVE_TOKEN_TM % 2));
    if (rc !== 'NONE') {
      return _modeWCalAE(rc, utrgQ, suit, moveQ, nextToken, nextDiscarded, nextCards, curSrcSpg, srcN);
    }
  }

  return _modeWCalAE('NONE', utrgQ, suit, moveQ, nextToken, nextDiscarded, nextCards, curSrcSpg, srcN);
}

// ============================================================
// _MODE_W_CAL_AE — PRG @_MODE_W_CAL_AE 完全準拠
// NEXT_*でgsを更新、drawBoard/redrawCdsで確定描画
// ============================================================
function _modeWCalAE(r, utrgQ, suit, moveQ, nextToken, nextDiscarded, nextCards, curSrcSpg, srcN) {
  omitRdln();
  lbg1Clr();
  spofs(SP_DRAWN, -1024, -1024);

  // curSrcSpgのSPRITEをクリア
  if (curSrcSpg && srcN > 0) {
    for (let i = 0; i < srcN; i++) {
      if (curSrcSpg[i] && parseInt(curSrcSpg[i]) !== SP_DRAWN) {
        spclr(parseInt(curSrcSpg[i]));
      }
    }
  }

  // gs更新 (NEXT_*→CUR_*)
  gs.token     = (nextToken !== undefined) ? nextToken : gs.token;
  gs.discarded = (nextDiscarded !== undefined) ? nextDiscarded : gs.discarded;
  gs.drawn     = '';
  if (nextCards) {
    for (let i = 0; i < 8; i++) {
      if (nextCards[i] !== undefined) gs.cards[i] = nextCards[i];
    }
  }

  // 確定描画
  gpage(SCREEN_U); gcls(COL_BOARD);
  drawBoard();
  shipoutUGpage();
  redrawCds();

  spscale(SP_TOKEN, 100);
  drawToken(0);

  if (r === 'RESET') return ['modeTitle'];
  return ['modeWDraw'];
}



// PRG @DRAW_CWIN相当: CONキャラクタで枠線を描画、内部を白背景で塗りつぶす
function _drawCwin(disp, cx, cy, cw, ch) {
  const cs = conState;
  const saved = cs.bgCol[disp];
  // 内部を白背景(15)で塗りつぶす
  cs.bgCol[disp] = 15;
  for (let y = cy; y < cy + ch; y++) {
    for (let x = cx; x < cx + cw; x++) {
      conPrint(disp, x, y, ' ');
    }
  }
  // 枠を白背景で描く
  for (let x = cx; x < cx + cw; x++) {
    conPrint(disp, x, cy,          x === cx ? '┌' : x === cx + cw - 1 ? '┐' : '─');
    conPrint(disp, x, cy + ch - 1, x === cx ? '└' : x === cx + cw - 1 ? '┘' : '─');
  }
  for (let y = cy + 1; y < cy + ch - 1; y++) {
    conPrint(disp, cx,          y, '│');
    conPrint(disp, cx + cw - 1, y, '│');
  }
  cs.bgCol[disp] = saved;
}
