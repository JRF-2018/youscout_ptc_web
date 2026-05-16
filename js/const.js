/**
 * const.js — YOUSCOUT 定数定義
 * trtconst.prg + yscconst.prg の完全な JS 変換
 */

'use strict';

// ============================================================
// trtconst.prg
// ============================================================

// --- 基本 ---
export const TAROT_NAME   = 'JRFTAROT';
export const TAROT_BASE   = 'JRFTRT';
export const CARD_WIDTH   = 36;
export const CARD_HEIGHT  = 56;
export const BOARD_RGB    = '10431F';
export const COL_BOARD    = 255;

// --- カラーパレットインデックス ---
export const COL_S          = 2;   // ♠ 青
export const COL_D          = 3;   // ♦ 金
export const COL_H          = 4;   // ♥ 赤
export const COL_C          = 5;   // ♣ 緑
export const COL_WHITE      = 15;
export const COL_BLACK      = 14;
export const COL_GREY       = 1;
export const COL_DARK_GREY  = 7;
export const COL_BLUE       = COL_S;
export const COL_GOLD       = COL_D;
export const COL_RED        = COL_H;
export const COL_GREEN      = COL_C;

// --- BGU1 キャラクタバンクオフセット ---
export const BGU1_NUM_OFFSET  = 0;
export const BGU1_ALP_OFFSET  = 22;  // A,J,C,Q,K
export const BGU1_SUIT_OFFSET = 27;  // CIRCLE,BOX,SPADE,DIA,HEART,CLUB
export const BGU1_SUIT_CIRCLE = 27;
export const BGU1_SUIT_BOX    = 28;
export const BGU1_SUIT_S      = 29;
export const BGU1_SUIT_D      = 30;
export const BGU1_SUIT_H      = 31;
export const BGU1_SUIT_C      = 32;
export const BGU1_WHCD_OFFSET = 33;
export const BGU1_WHCD_C      = 33;
export const BGU1_WHCD_TL     = 34;
export const BGU1_WHCD_T      = 35;
export const BGU1_WHCD_TR     = 36;
export const BGU1_WHCD_L      = 37;
export const BGU1_WHCD_R      = 38;
export const BGU1_WHCD_BL     = 39;
export const BGU1_WHCD_B      = 40;
export const BGU1_WHCD_BR     = 41;
export const BGU1_WHCD_TLP    = 42;
export const BGU1_WHCD_TRP    = 43;
export const BGU1_WHCD_BLP    = 44;
export const BGU1_WHCD_TLWP   = 45;
export const BGU1_WHCD_TRWP   = 46;
export const BGU1_WHCD_BLWP   = 47;
export const BGU1_RDLN_OFFSET = 48;
export const BGU1_RDLN_TL     = 48;
export const BGU1_RDLN_T      = 49;
export const BGU1_RDLN_L      = 50;
export const BGU1_SRBN_OFFSET = 51;
export const BGU1_SRBN_TAMAL  = 51;
export const BGU1_SRBN_TAMAR  = 52;
export const BGU1_SRBN_HARI   = 53;
export const BGU1_SRBN_TEN    = 54;
export const BGU1_SRBN_JIKUL  = 55;
export const BGU1_SRBN_JIKUR  = 56;
export const BGU1_SRBN_TL     = 57;
export const BGU1_SRBN_T      = 58;
export const BGU1_SRBN_TR     = 59;
export const BGU1_SRBN_BR     = 60;  // make_sheets.pl実測値
export const BGU1_SRBN_L      = 61;
export const BGU1_SRBN_BL     = 62;
export const BGU1_SRBN_R      = 63;
export const BGU1_SRBN_B      = 64;
export const BGU1_MINI_CD     = 65;
export const BGU1_B00         = 66;
export const BGU1_A00         = 66 + 5*7;       // 101
export const BGU1_A13         = 66 + 5*7*2;     // 136
export const BGU1_DISCARDED   = 66 + 5*7*3;     // 171
export const BGU1_TOKEN       = 66 + 5*7*3 + 7*7; // 220
export const BGU1_MISC_END    = 66 + 5*7*3 + 7*7 + 4*4; // 236

// BG ウィンドウCHR定数
export const CWIN_CHR_BG_TL = 256 + BGU1_WHCD_TL;
export const CWIN_CHR_BG_T  = 256 + BGU1_WHCD_T;
export const CWIN_CHR_BG_L  = 256 + BGU1_WHCD_L;
export const CWIN_CHR_BG_C  = 256 + BGU1_WHCD_C;

// --- SPU7 キャラクタバンクオフセット ---
export const SPU7_B00     = 0;
export const SPU7_A00     = 64;
export const SPU7_A13     = 128;
export const SPU7_TOKEN   = 192;
export const SPU7_RDLN_TL = 208;
export const SPU7_RDLN_T  = 224;
export const SPU7_NONE    = 228;
export const SPU7_END     = 232;

// --- SPU6 キャラクタバンクオフセット ---
export const SPU6_CDTL_S_OFS = 0;
export const SPU6_CDTL_D_OFS = 56;
export const SPU6_CDTL_H_OFS = 112;
export const SPU6_CDTL_C_OFS = 168;
export const SPU6_END        = 224;

// --- SPU4/5 キャラクタバンクオフセット ---
export const SPU4_CDSTR_OFS = 0;
export const SPU4_CDSBL_OFS = 16;
export const SPU4_RDLN_CD   = 144;
export const SPU4_END       = 208;
export const SPU5_WHCD      = 0;
export const SPU5_WHCD_PTL  = 64;
export const SPU5_WHCD_PT   = 128;
export const SPU5_WHCD_PL   = 192;
export const SPU5_END       = 256;

// --- GRPファイル インデックス ---
export const GRP_ROWS       = 3;
export const GRP_S_B00      = 15;  // 5*3+0
export const GRP_S_DISCARDED = 16; // 5*3+1
export const GRP_S_TALON    = 17;  // 5*3+2
export const GRP_D_A00      = 15;
export const GRP_D_A13      = 16;

// GRPファイル名
export const GRP_FILES = {
  A:  'JRFTRT_A',   // 大アルカナ正位置
  R:  'JRFTRT_R',   // 大アルカナ逆位置（対面表示用）
  S:  'JRFTRT_S',   // スペード + B00/DSC/TLN
  D:  'JRFTRT_D',   // ダイヤ + A00/A13
  H:  'JRFTRT_H',
  C:  'JRFTRT_C',
  RS: 'JRFTRT_RS',
  RD: 'JRFTRT_RD',
  RH: 'JRFTRT_RH',
  RC: 'JRFTRT_RC',
  T:  'JRFTRT_T',   // タイトル背景
  B:  'JRFTRT_B',   // BGU1キャラシート
  S4: 'JRFTRTS4',
  S5: 'JRFTRTS5',
  S6: 'JRFTRTS6',
  S7: 'JRFTRTS7',
};

// ============================================================
// yscconst.prg
// ============================================================

// --- デフォルト設定 ---
export const DEF_LANG       = 'JA';
export const DEF_TERMINALS  = 3;
export const DEF_COURT_CD   = 'K14';
export const DEF_MA_INF     = 2.0;
export const DEF_SWAP_8_11  = 'memorial';
export const DEF_UREV       = 0;

// --- サウンドMML ---
export const SND_SRBN_CLR   = 'T120@128O2V120F+32F+8R8V80' + 'F+64'.repeat(6);
export const SND_SRBN       = 'T120@128V100O2F+16';
export const SND_CD         = 'T120@128V80O4A64';
export const SND_CD_SHUFFLE = 'T120@128V80O4L16' + 'AR'.repeat(4);
export const SND_SRBN_CLR_T = 45;
export const SND_CD_SH_T    = 60;
export const BGM_BEEP       = 128;
export const BEEP_SELECT    = 48;
export const BEEP_CANCEL    = 51;
export const BEEP_CLICK     = 62;
export const BEEP_POPUP     = 61;

// --- SPRITE管理番号 ---
export const SP_B00          = 0;
export const SP_DRAWN        = 1;
export const SP_TMP_OFFSET   = 2;   // SP_TMP_N = 14
export const SP_TOKEN        = 16;
export const SP_RDLN_OFFSET  = 20;
export const SP_RDLN_TL      = 20;
export const SP_RDLN_T       = 21;
export const SP_RDLN_TR      = 22;
export const SP_RDLN_R       = 23;
export const SP_RDLN_BR      = 24;
export const SP_RDLN_B       = 25;
export const SP_RDLN_BL      = 26;
export const SP_RDLN_L       = 27;
export const SP_A00          = 30;
export const SP_A13          = 31;
export const SP_SPG_OFFSET   = 32;  // 動的SPG確保の開始番号 (SPRITE_ALLOC_MIN=32)
export const SP_SPG_MAX      = 80;  // SPGの最大SP番号
export const SPS_CURSOR      = 112;
export const SP_CURSOR       = 0;

// SPRITEパレット
export const SPPL_B00        = 13;
export const SPPL_DRAWN      = 8;
export const SPPL_TOKEN      = 15;
export const SPPL_A00        = 11;
export const SPPL_A13        = 10;
export const SPPL_DISCARDED  = 12;

// SPRITEパラメータ配列インデックス
export const SPR_NOTCLR = 0; export const SPR_CHR  = 1;
export const SPR_PL     = 2; export const SPR_DEPTH = 3;
export const SPR_W      = 4; export const SPR_H     = 5;
export const SPR_HOME_X = 6; export const SPR_HOME_Y = 7;
export const SPR_X      = 8; export const SPR_Y     = 9;
export const SPR_ANGLE  = 10; export const SPR_SCALE = 11;
export const SPR_INIT_N = 12;

// --- カード座標 (CARDS_BASE_X=32) ---
export const CARDS_BASE_X = 32;
export const CARDS_BASE_Y = 0;
export const CARD_HW = Math.floor(CARD_WIDTH / 2);   // 18
export const CARD_HH = Math.floor(CARD_HEIGHT / 2);  // 28

// 小アルカナスロット座標 CARDS_X/Y[0-7]
export const CARDS_X = [
  128 + CARDS_BASE_X,  // [0] = 160
  112 + CARDS_BASE_X,  // [1] = 144
  16  + CARDS_BASE_X,  // [2] = 48
  144 + CARDS_BASE_X,  // [3] = 176
  32  + CARDS_BASE_X,  // [4] = 64
  0   + CARDS_BASE_X,  // [5] = 32
  72  + CARDS_BASE_X,  // [6] = 104
  72  + CARDS_BASE_X,  // [7] = 104
];
export const CARDS_Y = [
  104, 56, 104, 8, 64, 8, 120, 0,
];
export const CARDS_ANCHOR = [
  'NE', 'SW', 'NW', 'NW', 'NE', 'NE', 'S', 'N',
];
export const CARDS_W = 68;
export const CARDS_H = 72;

// 大アルカナスロット座標 CARD_X/Y[0-5]
export const CARD_X = [
  128 + 68 + 4 - 18 + CARDS_BASE_X,  // [0] = 214
  106 - 18 + CARDS_BASE_X,            // [1] = 120
  16 - 4 - 18 + CARDS_BASE_X,         // [2] = 26
  144 - 4 - 18 + 8 + CARDS_BASE_X,    // [3] = 162
  106 - 18 + CARDS_BASE_X,            // [4] = 120
  0 + 68 + 4 - 18 - 8 + CARDS_BASE_X, // [5] = 78
];
export const CARD_Y = [
  120, 104, 120, 16, 32, 16,
];
export const CARDS_CENTER_X = 106 + CARDS_BASE_X;
export const CARDS_CENTER_Y = 96;

// ボード描画順序
export const BOARD_ORDER = [7, 5, 3, 2, 4, 1, 6, 0];

// --- レイアウト定数 ---
const GRP_WIDTH  = 256;
const GRP_HEIGHT = 192;
const CON_WIDTH  = 32;
const CON_HEIGHT = 24;
const FONT_WIDTH = 8;
const FONT_HEIGHT = 8;

// Talon / Discarded
export const PM_DISCARDED_W = 56;
export const PM_DISCARDED_H = 56;
export const PM_TALON_W     = 43;
export const PM_TALON_H     = 64;
export const PM_TOKEN_W     = 32;
export const PM_TOKEN_H     = 32;

export const TALON_X        = GRP_WIDTH - 8 - PM_TALON_W;      // 205
export const GAME_CON_CW    = CON_WIDTH - 2;
export const GAME_CON_CH    = 5;
export const GAME_CON_CX    = 1;
export const GAME_CON_CY    = CON_HEIGHT - GAME_CON_CH;         // 19
export const TALON_Y        = GAME_CON_CY * FONT_HEIGHT - 8 - PM_TALON_H; // 80
export const TALON_NUM_CX   = CON_WIDTH - 5;
export const TALON_NUM_CY   = GAME_CON_CY - 1 - (Math.floor(PM_TALON_H/8) + (PM_TALON_H%8?1:0) + 1);
export const DISCARDED_X    = TALON_X - 8 - PM_DISCARDED_W - 5; // 136
export const DISCARDED_Y    = TALON_Y;
export const RULES_CX       = 2;
export const RULES_CY       = GAME_CON_CY - 1 - 4;

export const DRAWN_X        = GRP_WIDTH - CARD_WIDTH - 4;       // 216
export const DRAWN_Y        = Math.floor(GRP_HEIGHT/2 - CARD_HEIGHT/2) - 16; // 52

// ソロバン
export const SRBN_CX = 1; export const SRBN_CY = 2;
export const SRBN_CW = 14; export const SRBN_CH = 10;

// ミニカード表示
export const MINI_CDS_W = 80;
export const MINI_CDS_H = 64;
export const MINI_CD_W  = Math.floor(MINI_CDS_W * 103 / 1280);  // 6
export const MINI_CD_H  = Math.floor(MINI_CDS_H * 160 / 1024);  // 10
export const MINI_CDS_X = GRP_WIDTH - MINI_CDS_W - 16;          // 160
export const MINI_CDS_Y = 2;
export const MINI_CD_X  = [
  MINI_CDS_W - MINI_CD_W,  // [0]
  Math.floor(MINI_CD_W + (MINI_CDS_W - MINI_CD_W)/2 - MINI_CD_W/2), // [1]
  MINI_CD_W,                // [2]
  Math.floor(MINI_CD_W/2 + 3*(MINI_CDS_W - MINI_CD_W)/4), // [3]
  Math.floor(MINI_CD_W + (MINI_CDS_W - MINI_CD_W)/2 - MINI_CD_W/2), // [4]
  Math.floor(MINI_CD_W/2 + 1*(MINI_CDS_W - MINI_CD_W)/4), // [5]
  Math.floor(MINI_CD_W + (MINI_CDS_W - MINI_CD_W)/2 - MINI_CD_W/2), // [6]
  Math.floor(MINI_CD_W + (MINI_CDS_W - MINI_CD_W)/2 - MINI_CD_W/2), // [7]
  0,                        // [8]
];
export const MINI_CD_Y = [
  Math.floor(5*MINI_CDS_H/6 - MINI_CD_H/2),
  Math.floor(MINI_CDS_H/2 + (MINI_CDS_H - MINI_CD_H)/6 - MINI_CD_H/2),
  Math.floor(5*MINI_CDS_H/6 - MINI_CD_H/2),
  Math.floor(1*MINI_CDS_H/6 - MINI_CD_H/2),
  Math.floor(MINI_CDS_H/2 - (MINI_CDS_H - MINI_CD_H)/6 - MINI_CD_H/2),
  Math.floor(1*MINI_CDS_H/6 - MINI_CD_H/2),
  MINI_CDS_H - MINI_CD_H,
  0,
  Math.floor(MINI_CDS_H/2 - MINI_CD_H/2),
];

// GRPレイヤー優先度
export const GRP_R_BOARD   = 0;
export const GRP_R_I8      = 6;
export const GRP_R_I11     = 7;
export const GRP_R_FST_CD  = 6;
export const GRP_R_DRAWN   = 14;

// アニメーション時間 (フレーム数)
export const DISPLAY_MSG_TM  = 120;
export const FLASH_MSG_TM    = 60;
export const MOVE_TOKEN_TM   = 120;
export const MISSING_TM_U    = 60;
export const MISSING_TM_L    = 30;
export const DRAW_CD_TM_L    = 30;
export const DRAW_CD_TM_U    = 30;
export const DRAW_CD_TM_A    = 30;
export const MISSING_X       = Math.floor(GRP_WIDTH / 2);
export const ANIM_B00_ANGLE  = 150;
export const ANIM_B00_ANGLE_R = 330;
export const ANIM_TOKEN_MAG  = 120;

// LBG1 (下画面BG, Talon/Discardedのスクロール制御)
export const LBG1_CX      = Math.floor(DISCARDED_X / 8);
export const LBG1_CY      = Math.floor(TALON_Y / 8);
export const LBG1_CW      = Math.floor((TALON_X - DISCARDED_X + PM_TALON_W) / 8) + 1;
export const LBG1_CH      = Math.floor(PM_DISCARDED_W / 8) + (PM_DISCARDED_W%8?1:0);
export const LBG1_M_OFS_X = 0;
export const LBG1_M_OFS_Y = DISCARDED_Y + PM_DISCARDED_H;
export const LBG1_N_OFS_X = 0;
export const LBG1_N_OFS_Y = 0;

// カードスーツ
export const CARDS_TYPE_L = '♥';  // 下卦
export const CARDS_TYPE_U = '♦';  // 上卦

// メインパネルのコンソール設定
export const MNU_CURSOR_COL = COL_DARK_GREY;

// ルール定義 [上下卦][スーツ0=♠,1=♦,2=♥,3=♣]
export const RULE_COMP = [
  [
    '$♠+(@A)[♠/]+Sum(↓♦)>(↑A)[/♠]+Sum(↑♦)+Sum(↑♠)',
    '$♦+(@A)[♦/]>(←A)[/♦]',
    'STAY',
    '$♣+(@A)[/♣]>Suitable(@♥!)+(→A)[/♥]',
  ],
  [
    'Max(@♦)+(→A)[/♠]>$♠+(→A)[♦/]',
    'STAY',
    '$♥+(@A)[♥/]>(←A)[♣/]',
    '$♣+(@A)[♣/]+Max(↓♥!)+(↓A)[/♥]>Sum(@♦)+(@A)[/♦]',
  ],
];
export const RULE_MOVE = [
  ['CHOOSE', '←,$♦⇒(↑♦)', '', '→,$♣⇒×,Min(Suitable(@♥))⇒×'],
  ['→,$♠⇒(↑♠)', '', '←,$♥⇒(↓♥)', '↓,$♣⇒×,Max(↓♥)⇒×'],
];
export const RULE_STAY = [
  ['Max(@♥)⇒×,$♠⇒×', '$♦⇒(↓♦)', '$♥⇒(@♥)', '$♣⇒×'],
  ['$♠⇒×,Max(@♦)⇒(←♦)', '$♦⇒(@♦)', '$♥⇒(↓♥)', '$♣⇒×,Max(@♦)⇒(↓♦)'],
];
export const RULE_MOVE_C = [
  ['↑,(↓♦)⇒×,(↑♠)⇒×,$♠⇒(↑♠)', '', '', ''],
  ['', '', '', ''],
];
export const RULE_STAY_C = [
  ['(@♥)⇒×,$♠⇒×', '', '', ''],
  ['', '', '', ''],
];

// TABLE_MAJOR: 大アルカナのスコア表 [0-21][8列]
// 8列 = ↑♠ ↑♦ ↑♥ ↑♣ ↓♠ ↓♦ ↓♥ ↓♣（スコア: 0/3/5/7）
export const TABLE_MAJOR = [
  [0,5,5,5,5,5,3,5],   // 0  The Fool
  [3,3,5,7,0,3,7,5],   // 1  The Magician
  [0,5,7,3,7,5,3,3],   // 2  The High Priestess
  [3,3,0,3,7,5,5,7],   // 3  The Empress
  [3,3,0,3,5,7,7,5],   // 4  The Emperor
  [5,0,7,3,3,3,7,5],   // 5  The Hierophant
  [3,3,5,3,5,7,7,0],   // 6  The Lovers
  [7,7,3,3,0,3,5,5],   // 7  The Chariot
  [5,5,0,3,7,7,3,3],   // 8  Strength
  [0,7,7,3,3,3,5,5],   // 9  The Hermit
  [5,5,5,5,5,5,3,0],   // 10 Wheel of Fortune
  [5,5,5,5,0,3,5,5],   // 11 Justice
  [3,5,3,7,3,5,0,7],   // 12 The Hanged Man
  [5,0,5,5,5,3,5,5],   // 13 Death
  [5,5,7,3,3,7,0,3],   // 14 Temperance
  [5,3,3,7,5,0,3,7],   // 15 The Devil
  [5,7,5,3,7,0,3,3],   // 16 The Tower
  [5,3,5,7,3,3,7,0],   // 17 The Star
  [3,7,0,7,5,5,3,3],   // 18 The Moon
  [7,3,0,7,3,3,5,5],   // 19 The Sun
  [5,0,7,3,3,5,3,7],   // 20 Judgement
  [0,5,3,7,7,3,3,5],   // 21 The World
];

// コートカードのスコア設定テーブル
export const COURT_CD_TABLE = {
  'K14': { K:14, Q:13, C:12, J:11 },
  'K13a': { K:13, Q:12, C:12, J:11 },
  'K13b': { K:13, Q:12, C:11, J:11 },
  'K10':  { K:10, Q:10, C:10, J:10 },
};

// ============================================================
// チャンク数定数 (yscconst.prg より)
// ============================================================
export const CARD_CW      = Math.floor(CARD_WIDTH / 8)       + (CARD_WIDTH % 8 ? 1 : 0);   // 5
export const CARD_CH      = Math.floor(CARD_HEIGHT / 8)      + (CARD_HEIGHT % 8 ? 1 : 0);  // 7
export const DISCARDED_CW = Math.floor(PM_DISCARDED_W / 8)   + (PM_DISCARDED_W % 8 ? 1 : 0); // 7
export const DISCARDED_CH = Math.floor(PM_DISCARDED_H / 8)   + (PM_DISCARDED_H % 8 ? 1 : 0); // 7
export const TALON_CX     = Math.floor(TALON_X / 8) + 2;     // 27
export const DISCARDED_CX = Math.floor(DISCARDED_X / 8) + 1; // 18

export const NUM_TO_BIT = [1, 2, 4, 8, 16, 32];
export const SUIT_CHARS = '♠♦♥♣';

export const FONT_W = 8;  // = FONT_WIDTH
export const FONT_H = 8;  // = FONT_HEIGHT
