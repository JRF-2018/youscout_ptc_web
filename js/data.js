/**
 * data.js — YOUSCOUT ゲームデータ
 * yscmsg.prg の完全な JS 変換
 *
 * 含まれるデータ:
 *   MSG       — ゲームシステムメッセージ (EN/JA)
 *   MSG_TRTMJ — タロット大アルカナ名 (EN/JA)
 *   MSG_HXG   — 易64卦名 (EN/JA共通)
 *   MENUS     — 各種メニュー定義
 */

'use strict';

// ============================================================
// システム単語メッセージ (LOAD_MSG_YSCWDS相当)
// ============================================================
export const MSG_WORDS = {
  EN: {
    move: 'Move', stay: 'Stay', obliged: 'obliged', chose: 'chose', none: 'none',
    cards: 'Cards', mjtrt: 'Major arcanum', inv: 'Inv.',
    utrg: 'upper trigram', ltrg: 'lower trigram',
    sword: 'Sword', coin: 'Coin', cup: 'Cup', wand: 'Wand',
    ace: 'Ace', jack: 'Page', caballero: 'Knight', queen: 'Queen', king: 'King',
  },
  JA: {
    move: 'ウゴク', stay: 'トドマル', obliged: 'シカナイ', chose: 'エランダ', none: 'ナシ',
    cards: 'カード', mjtrt: 'ダイ アルカナ', inv: 'ギャク',
    utrg: 'ジョウカ', ltrg: 'シモカ',
    sword: 'ツルギ', coin: 'カネ', cup: 'ハイ', wand: 'シャクジョウ',
    ace: 'ハジメ', jack: 'ワラシ', caballero: 'モノノフ', queen: 'ヒメ', king: 'オオキミ',
  },
};

// ============================================================
// タロット大アルカナ名 (MSG_TRTMJ)
// ============================================================
export const MSG_TRTMJ = {
  EN: [
    'The Fool',
    'The Magician', 'The High Priestess', 'The Empress', 'The Emperor', 'The Hierophant',
    'The Lovers', 'The Chariot', 'Strength', 'The Hermit', 'Wheel of Fortune',
    'Justice', 'The Hanged Man', 'Death', 'Temperance', 'The Devil',
    'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World',
  ],
  JA: [
    'オロカモノ',
    'マジナイシ', 'ミコ', 'スメラミ', 'スメラギ', 'ホッス',
    'コイビト ドモ', 'シチョウ', 'チカラ', 'インジャ', 'メグリアワセ',
    'ギ', 'ツルシ オトド', 'シ', 'セツ', 'マ',
    'ウテナ', 'ホシ', 'ツキ', 'ヒ', 'ミ サバキ', 'ヨ',
  ],
};

// ============================================================
// 易64卦 + 特殊4卦 (MSG_HXG, EN/JA共通)
// ============================================================
export const MSG_HXG = [
  'コン Field', 'ハク Stripping', 'ヒ Grouping', 'カン Viewing',
  'ヨ Providing-For', 'シン Prospering', 'スイ Clustering', 'ヒ Obstruction',
  'ケン Humbling', 'ゴン Bound', 'ケン Limping', 'ゼン Infiltrating',
  'ショウカ Small Exceeding', 'リョ Sojourning', 'カン Conjoining', 'トン Retiring',
  'シ Leading', 'モウ Enveloping', 'カン Gorge', 'カン Dispersing',
  'カイ Taking-Apart', 'ビセイ Not-Yet Fording', 'コン Confining', 'ショウ Arguing',
  'ショウ Ascending', 'コ Corrupting', 'セイ Welling', 'ソン Ground',
  'コウ Persevering', 'テイ Holding', 'タイカ Great Exceeding', 'コウ Coupling',
  'フク Returning', 'イ Swallowing', 'チュン Sprouting', 'エキ Augmenting',
  'シン Shake', 'ゼイゴウ Gnawing Bite', 'ズイ Following', 'ムボウ Without Embroiling',
  'メイイ Brightness Hiding', 'ヒ Adorning', 'キセイ Already Fording', 'カジン Dwelling People',
  'ホウ Abounding', 'リ Radiance', 'カク Skinning', 'ドウジン Concording People',
  'リン Nearing', 'ソン Diminishing', 'セツ Articulating', 'チュウフ Centre Confirming',
  'キマイ Converting The Maiden', 'ケイ Polarising', 'ダ Open', 'リ Treading',
  'タイ Pervading', 'ダイチク Great Accumulating', 'ジュ Attending', 'ショウチク Small Accumulating',
  'タイソウ Great Invigorating', 'タイユウ Great Possessing', 'カイ Parting', 'ケン Force',
  // 特殊4卦 (idx 64-67)
  'セン ケン Force Whirl', 'セン コン Field Whirl',
  'ジュウ ケン Force Eclipse', 'ジュウ コン Field Eclipse',
];

// ============================================================
// メニュー定義 (POPUP_MNU_RA用)
// item: [表示文字列, 値]  値が '@MODE_XXX' の場合は次のモード
// ============================================================

/** タイトルメニュー (MSG_MAINMNU) */
export const MENU_MAIN = {
  EN: [
    ['Start',              '@MODE_START'],
    ['\\c4English\\cR/ニホンゴ', '@MODE_SET_LANG,JA'],
    ['Options',            '@MODE_OPT'],
    ['Help',               '@MODE_HELP'],
    ['End',                '@END'],
  ],
  JA: [
    ['ハジメル',           '@MODE_START'],
    ['\\c4ニホンゴ\\cR/English', '@MODE_SET_LANG,EN'],
    ['セッテイ',           '@MODE_OPT'],
    ['セツメイ',           '@MODE_HELP'],
    ['シュウリョウ',       '@END'],
  ],
};

/** オプションメニュー (MSG_OPTMNU) */
export const MENU_OPT = {
  EN: [
    ['Terminal Card Appears',    '@MSG_OPTTERM_EN,terminals'],
    ['Values of Court Cards',    '@MSG_OPTCCD_EN,court_cd'],
    ['Influence of Major Arcana','@MSG_OPTMAI_EN,ma_inf'],
    ['Exchange of 8 and 11',     '@MSG_OPTSWAP_EN,swap_8_11'],
    ['Upper Display',            '@MSG_OPTUREV_EN,urev'],
    ['Language',                 '@MSG_OPTLANG_EN,lang'],
  ],
  JA: [
    ['シュウリョウ カード ノ クリカエシ', '@MSG_OPTTERM_JA,terminals'],
    ['コートカード ノ スコア',            '@MSG_OPTCCD_JA,court_cd'],
    ['ダイ アルカナ ノ エイキョウ',       '@MSG_OPTMAI_JA,ma_inf'],
    ['8 ト 11 ノ イレカエ',               '@MSG_OPTSWAP_JA,swap_8_11'],
    ['ウエガメン',                        '@MSG_OPTUREV_JA,urev'],
    ['コトバ',                            '@MSG_OPTLANG_JA,lang'],
  ],
};

/** 各オプションの選択肢 [[値, 表示文字列], ...] */
export const OPT_CHOICES = {
  terminals: {
    EN: [['0','No Game'],['1','Once'],['3','3 times'],['5','5 times'],['10','10 times']],
    JA: [['0','ゲーム ナシ'],['1','1 カイ'],['3','3 カイ'],['5','5 カイ'],['10','10 カイ']],
  },
  court_cd: {
    EN: [['K14','K=14,Q=13,C=12,J=11'],['K13a','K=13,Q=12,C=12,J=11'],
         ['K13b','K=13,Q=12,C=11,J=11'],['K10','K=10,Q=10,C=10,J=10']],
    JA: [['K14','K=14,Q=13,C=12,J=11'],['K13a','K=13,Q=12,C=12,J=11'],
         ['K13b','K=13,Q=12,C=11,J=11'],['K10','K=10,Q=10,C=10,J=10']],
  },
  ma_inf: {
    EN: [['3','3'],['2.5','2.5'],['2','2'],['1.5','1.5'],['1','1']],
    JA: [['3','3'],['2.5','2.5'],['2','2'],['1.5','1.5'],['1','1']],
  },
  swap_8_11: {
    EN: [['memorial','Memorial Method'],['expansive','Expansive Method'],['solid','Solid Method']],
    JA: [['memorial','キネン シキ'],['expansive','カイ シキ'],['solid','コ シキ']],
  },
  urev: {
    EN: [['0','Upright'],['1','Reversal']],
    JA: [['0','セイ イチ'],['1','タイメン']],
  },
  lang: {
    EN: [['EN','English'],['JA','Japanese']],
    JA: [['JA','ニホンゴ'],['EN','エイゴ']],
  },
};

// ============================================================
// ゲーム内メッセージ (各種場面で表示するテキスト)
// ============================================================
export const MSG = {
  EN: {
    rstq:     "Do you go back to the title?",
    rstq_yes: "Go back to the title.",
    rstq_no:  "No, continue.",

    thisHxg:  "The hexagram is '\\[0]'.",
    noPlsl:   "This place cannot be selected.",
    moveq:    "Choose stay or move.",
    clkTln:   "Click the talon or push \\N[A].\n",
    chspls:   "Choose the first place of the token.\n",
    chsplss:  "But '\\[0]' restricts you onto the \\[1].",
    start:    "Sort out 8 and 11 from the major arcana.\nShuffle the rest and make a board by 6 cards of them.",
    swapMem:  "Swap 8 and 11 after memory of the history of Tarot.\n \\[0]",
    swapExp:  "Swap 8 and 11 by the Expansive Method, after memory of the history of Tarot.\n \\[0]",
    swapSol:  "Swap 8 and 11 by the Solid Method, after memory of the history of Tarot.\n \\[0]",
    swapNo:   "No need for the swap.",
    chstkn:   "Determine the first place of the token.\n",
    term0:    "Go back to the title, because you chose 'No Game'.",
    termU:    "You must win at the end if the token places in the senior or in the fifth.",
    termL:    "You must win at the end if the token places in the second or in the fifth.",
    condu:    "You win at the end if the token places in the senior or in the fifth.",
    condl:    "You win at the end if the token places in the second or in the fifth.",
    ywin:     "The board shows that YOU WIN.",
    ylose:    "The board shows that YOU LOSE.",
    drew:     "You drew the card '\\[2] of \\[1]s' in the \\[0].\\n",
    termn:    "Drew the terminal card.(\\[0]/\\[1])\nShuffle the cards except for those on the board.",
    terme:    "Drew the terminal card.(\\[0]/\\[0])\nThe game is over.",
    termu:    "You must win at the end if the token places in the senior or in the fifth.",
    terml:    "You must win at the end if the token places in the second or in the fifth.",
    rstqyn_yes: "Go back to the title.",
    rstqyn_no:  "No, continue.",
    ostay:    "You must stay.",
    omove:    "You must move.",
    crule:    "Changing rule of this time:\n",
    gmove:    "\\[0] > \\[1]?\n → Yes, MOVE.",
    gchse:    "\\[0] > \\[1]?\n → Yes, CHOOSE.",
    lstay:    "\\[0] > \\[1]?\n → No, STAY.",
    cdneed:   "No necessary card.\n → STAY.",
    cdnsut:   "No suitable card.\n → STAY.",
    cdnone:   "No card = 0",
  },
  JA: {
    rstq:     "タイトル ニ モドリマスカ?",
    rstq_yes: "タイトル ニ モドル。",
    rstq_no:  "イイエ。ツヅケル。",

    thisHxg:  "エキ ノ カ ハ 「\\[0]」 デス。",
    noPlsl:   "ココ ハ センタク デキマセン。",
    moveq:    "ウゴク カ トドマル カ エランデ クダサイ。",
    clkTln:   "カード ヤマ ヲ クリック スル カ、\\N[A] ヲ オシテ クダサイ。\n",
    chspls:   "トークン ノ ハジメ ノ バショ ヲ エランデ クダサイ。\n",
    chsplss:  "タダシ 「\\[0]」 ノ タメ、\\[1] ニ シカ オケマセン。",
    start:    "ダイ アルカナ カラ 8 ト 11 ヲ ノゾキ、ノコリ ヲ シャッフル。\n6 マイ ヒイテ バン ヲ ツクリマス。",
    swapMem:  "タロット ノ レキシ ヲ キネン シ、8 ト 11 ガ アレバ イレカエマス。\n \\[0]",
    swapExp:  "タロット ノ レキシ ヲ キネン シ、8 ト 11 ガ アレバ カイシキ ニ シタガッテ イレカエマス。\n \\[0]",
    swapSol:  "タロット ノ レキシ ヲ キネン シ、8 ト 11 ガ アレバ コシキ ニ シタガッテ イレカエマス。\n \\[0]",
    swapNo:   "イレカエ ノ ヒツヨウ ハ アリマセン。",
    chstkn:   "ハジメ ニ トークン ヲ オク バショ ヲ キメテクダサイ。\n",
    term0:    "「ゲーム ナシ」ニ セッテイ サレテイルタメ ココデ シュウリョウ デス。",
    termU:    "ジョウ コウ カ 5 コウ ニ トークン ガ アレバ、アナタ ノ「カチ」デシタ。",
    termL:    "2 コウ カ 5 コウ ニ トークン ガ アレバ、アナタ ノ「カチ」デシタ。",
    condu:    "サイゴ ニ ジョウ コウ カ 5 コウ ニ トークン ガ アレバ、アナタ ノ「カチ」デス。",
    condl:    "サイゴ ニ 2 コウ カ 5 コウ ニ トークン ガ アレバ、アナタ ノ「カチ」デス。",
    ywin:     "アナタ ノ「カチ」ノ ヨウデス。",
    ylose:    "アナタ ノ「マケ」ノ ヨウデス。",
    drew:     "\\[0] デ「\\[1] ノ \\[2]」ノ カード ヲ ヒキマシタ。\\n",
    termn:    "シュウリョウ カード ヲ ヒキマシタ。(\\[0]/\\[1])\nバン ニ アルモノ イガイ ノ カード ヲ シャッフル シマス。",
    terme:    "\\[0]ドメ ノ シュウリョウ カード ヲ ヒキマシタ。\nゲーム シュウリョウ デス。",
    termu:    "ジョウ コウ カ 5 コウ ニ トークン ガ アレバ、アナタ ノ「カチ」デシタ。",
    terml:    "2 コウ カ 5 コウ ニ トークン ガ アレバ、アナタ ノ「カチ」デシタ。",
    rstqyn_yes: "タイトル ニ モドル。",
    rstqyn_no:  "イイエ。ツヅケル。",
    ostay:    "トドマル シカ アリマセン。",
    omove:    "ウゴク シカ アリマセン。",
    crule:    "コンカイ ノ コウカン ルール:\n",
    gmove:    "\\[0] > \\[1]?\n → ダイ ナリ。ウゴク。",
    gchse:    "\\[0] > \\[1]?\n → ダイ ナリ。エラブ。",
    lstay:    "\\[0] > \\[1]?\n → ショウ ナリ。トドマル。",
    cdneed:   "ヒツヨウ ナ カード ガ アリマセン。\n → トドマル。",
    cdnsut:   "テキトウ ナ カード ガ アリマセン。\n → トドマル。",
    cdnone:   "カード ナシ = 0",
  },
};

// ============================================================
// カードデッキ生成
// ============================================================

/** 標準デッキを生成 (大アルカナ22枚 + 小アルカナ56枚 = 78枚)
 *  カード文字列形式: 'A01' 〜 'A21' (大アルカナ), 'S01' 〜 'C14' (小アルカナ)
 *  A00=グシャ, A13=シニガミ は特殊扱い（ゲームには含まれない）
 */
export function makeDeck() {
  const deck = [];
  // 大アルカナ (A01-A21, A00/A13を除く)
  for (let i = 1; i <= 21; i++) {
    if (i !== 13) deck.push('A' + String(i).padStart(2,'0'));
  }
  // 小アルカナ
  for (const suit of ['S','D','H','C']) {
    for (let n = 1; n <= 14; n++) {
      deck.push(suit + String(n).padStart(2,'0'));
    }
  }
  return deck;  // 20 + 56 = 76枚
}

/** カード文字列からスーツを取得 ('A','S','D','H','C') */
export function cardSuit(cd) { return cd[0]; }

/** カード文字列から番号を取得 (1〜21 or 1〜14) */
export function cardNum(cd) { return parseInt(cd.slice(1)); }

/** スーツ名 (表示用) */
export function suitName(suit, lang='EN') {
  const w = MSG_WORDS[lang];
  return {A:'A', S:w.sword, D:w.coin, H:w.cup, C:w.wand}[suit] || suit;
}

/** カード番号の表示名 (Ace, 2〜10, Page, Knight, Queen, King) */
export function numName(n, lang='EN') {
  const w = MSG_WORDS[lang];
  if (n === 1)  return w.ace;
  if (n === 11) return w.jack;
  if (n === 12) return w.caballero;
  if (n === 13) return w.queen;
  if (n === 14) return w.king;
  return String(n);
}

// ============================================================
// CMAPパレット初期化データ
// ============================================================
/** JRFTAROT_CMAPの最初の16色 (BGパレット用) */
export const JRFTAROT_CMAP = [
  {idx:0,  rgb: null},      // 透明
  {idx:1,  rgb:'DCDCDC'},   // GREY
  {idx:2,  rgb:'0000FF'},   // BLUE (♠)
  {idx:3,  rgb:'D4AA00'},   // GOLD (♦)
  {idx:4,  rgb:'FF0000'},   // RED  (♥)
  {idx:5,  rgb:'008000'},   // GREEN(♣)
  {idx:6,  rgb:'ACACAC'},
  {idx:7,  rgb:'787878'},   // DARK_GREY
  {idx:8,  rgb:'585858'},
  {idx:9,  rgb:'383838'},
  {idx:10, rgb:'BA9B3E'},
  {idx:11, rgb:'836726'},
  {idx:12, rgb:'833E29'},
  {idx:13, rgb:'40372A'},
  {idx:14, rgb:'000000'},   // BLACK
  {idx:15, rgb:'FFFFFF'},   // WHITE
  {idx:255,rgb:'10431F'},   // COL_BOARD
];

// ============================================================
// words()補足 (MSG_WORDSに追加)
// ============================================================
// MSG_WORDSに不足しているキーを追加
Object.assign(MSG_WORDS.EN, {
  set: 'Set', cancel: 'Cancel', def: 'Default',
  yes: 'Yes', no: 'No',
  end: 'End',
});
Object.assign(MSG_WORDS.JA, {
  set: 'セッテイ', cancel: 'キャンセル', def: 'デフォルト',
  yes: 'ハイ', no: 'イイエ',
  end: 'シュウリョウ',
});
