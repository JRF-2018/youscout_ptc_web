# JRF ライブラリ リファレンス (易双六PTC)

> 出典: youscout_ptc/src/*.prg (JRF作, パブリックドメイン)  
> URL: http://jrf.cocolog-nifty.com/software/2013/02/  
> 対象バージョン: stacklib 0.01, stdlib 0.04, ctrllib 0.03?, gputlib 0.0?, hlpview 0.06

---

## 全体アーキテクチャ

```
stacklib.prg  ← 最基礎: スタックとレジスタ規約
  └ stdlib.prg  ← 標準ライブラリ: 画面・文字列・メモリ管理
      └ ctrllib.prg  ← コントローラ: メニュー・タッチ処理
          └ hlpview.prg  ← HELPビューワー: エスケープシーケンス付きテキスト表示
      └ gputlib.prg  ← グラフィック: ビットマップ・パレット描画
```

---

## stacklib.prg ― スタック/レジスタ規約

### レジスタ一覧

| 変数 | 種別 | 用途 |
|------|------|------|
| `A`, `A$` | アキュムレータ | 汎用 |
| `TMP`, `TMP$`, `TMP$[]` | アキュムレータ | 汎用 |
| `R` | 数値レジスタ | PUSH/POPで受け渡す数値 |
| `R$` | 文字列レジスタ | PUSH/POPで受け渡す文字列 |
| `RR$[]` | 配列レジスタ | 複数値を返す関数の出力 |
| `RA$[,2]` | 連想配列レジスタ | KEY/VALUE対の配列 |
| `RN` | 配列要素数 | `RR$[]` や `RA$[]` の要素数 |
| `RT$` | 型レジスタ | 戻り値の型: `"NUMBER"` `"STRING"` `"ARRAY"` `"ASSOC"` `"NONE"` `"ERROR"` |
| `RE$` | エラーレジスタ | エラーメッセージ |
| `ARGNUM` | 引数カウンタ | ENTER/LEAVEでスタック整合チェック |

### スタック操作 (基本)

```basic
' 数値をスタックに積む
R = 42: GOSUB @PUSH_R

' 文字列をスタックに積む
R$ = "Hello": GOSUB @PUSH_RS

' 数値をスタックから取り出す → R に
GOSUB @POP_R

' 文字列をスタックから取り出す → R$ に
GOSUB @POP_RS

' 配列 RR$[] をスタックに積む / 取り出す
' ※ RN に要素数をセットしてから
GOSUB @PUSH_RR   ' RR$[0..RN-1] を積む
GOSUB @POP_RR    ' RR$[0..RN-1] に取り出す

' 連想配列 RA$[,2] をスタックに積む / 取り出す
GOSUB @PUSH_RA
GOSUB @POP_RA
```

### 関数呼び出し規約

```basic
' ====== 呼び出し元 ======
' 1. 引数を逆順でスタックに積む (最後の引数から先に)
R$ = "arg2": GOSUB @PUSH_RS
R  = 10:     GOSUB @PUSH_R
' 2. GOSUB で呼び出す
GOSUB @MY_FUNC
' 3. 戻り値は R, R$, RR$[], RT$ で受け取る

' ====== 関数本体 ======
@MY_FUNC '(N:NUMBER, S$:STRING): STRING
  R$ = "@MY_FUNC": ARGNUM = 2: GOSUB @ENTER
  ' スタック上の引数にアクセス
  N  = VAL(STACK$[BP + 1])   ' 1番目の引数 (最後にPUSHされたもの)
  S$ = STACK$[BP + 2]        ' 2番目の引数
  ' ...処理...
  ARGNUM = 2: GOSUB @LEAVE
  R$ = "result": RT$ = "STRING"
  RETURN
```

**引数の順序:** `PUSH_RS`/`PUSH_R` の逆順で積む → `BP+1` が最後にPUSHしたもの (= 第1引数)

### 連想配列操作

```basic
' GET (キーで値を取得)
R$ = "key": GOSUB @PUSH_RS
R$ = assoc$: GOSUB @PUSH_RS   ' 連想配列文字列を積む
GOSUB @GET_RA
' → R$ に値, RT$ == "NONE" なら存在しない

' SET (キーに値をセット)
R$ = "value": GOSUB @PUSH_RS
R$ = "key":   GOSUB @PUSH_RS
R$ = assoc$:  GOSUB @PUSH_RS
GOSUB @SET_RA
' → R$ に更新後の連想配列文字列

' DELETE
R$ = "key":   GOSUB @PUSH_RS
R$ = assoc$:  GOSUB @PUSH_RS
GOSUB @DELETE_RA
```

### その他

```basic
' 文字列をエスケープ/アンエスケープ
R$ = "文字列": GOSUB @PUSH_RS
GOSUB @ESCAPE    ' → R$ にエスケープ済み文字列
GOSUB @UNESCAPE  ' → R$ にアンエスケープ済み文字列

' スタック上の数値に加減算
R = 5: GOSUB @PUSH_R
GOSUB @ADD_STACK      ' スタック上の数値 + R
GOSUB @SUBTRACT_STACK ' スタック上の数値 - R
```

---

## stdlib.prg ― 標準ライブラリ

### 重要定数

```basic
GRP_WIDTH  = 256    ' グラフィック幅
GRP_HEIGHT = 192    ' グラフィック高さ
CON_WIDTH  = 32     ' コンソール文字幅
CON_HEIGHT = 24     ' コンソール文字高さ
FONT_WIDTH = 8      ' フォント幅 (px)
FONT_HEIGHT= 8      ' フォント高さ (px)

' グラフィックページ割り当て
R_GPAGE = 0   ' Reserve (予備)
D_GPAGE = 1   ' Drawing (描画用、SHIPOUTで変化)
U_GPAGE = 2   ' Upper display (上画面表示用)
L_GPAGE = 3   ' Lower display (下画面表示用)

' ボタン定数
BUTTON_UP = 1, BUTTON_DOWN = 2, BUTTON_LEFT = 4, BUTTON_RIGHT = 8
BUTTON_A = 16, BUTTON_B = 32, BUTTON_X = 64, BUTTON_Y = 128
BUTTON_L = 256, BUTTON_R = 512, BUTTON_START = 1024
```

### グラフィックページ管理

```basic
' 上画面のD_GPAGEに切り替えてから描画し、U_GPAGEに出力
GOSUB @SWITCH_U_GPAGE   ' D_GPAGE を上画面用に設定
' ... GCLSやGLINE等で描画 ...
GOSUB @SHIPOUT_U_GPAGE  ' 描画結果を U_GPAGE に転送して表示

' 下画面版
GOSUB @SWITCH_L_GPAGE
' ... 描画 ...
GOSUB @SHIPOUT_L_GPAGE

' ショートカット (SWITCHせずに直接ページ設定)
GOSUB @GPAGE_U   ' GPAGE 0, D_GPAGE, U_GPAGE
GOSUB @GPAGE_L   ' GPAGE 1, D_GPAGE, L_GPAGE
GOSUB @BGPAGE_U  ' BGPAGE 0
GOSUB @BGPAGE_L  ' BGPAGE 1
GOSUB @SPPAGE_U  ' SPPAGE 0
GOSUB @SPPAGE_L  ' SPPAGE 1
```

### カラーマップ読み込み

```basic
' DISP: 0=上画面, 1=下画面, -1=両方
' PLANE$: "BG", "GRP", "SP"
' LABEL$: DATAラベル (先頭に色数をDATA)
R = -1:       GOSUB @PUSH_R    ' DISP = -1 (両方)
R$ = "BG":    GOSUB @PUSH_RS   ' PLANE$
R$ = "@CMAP": GOSUB @PUSH_RS   ' LABEL$
GOSUB @READ_CMAP
```

### コンソール出力

```basic
' CON_PRINT: 指定位置に文字列を出力 (エスケープシーケンス付き)
R  = 1:    GOSUB @PUSH_R    ' DISP (0=上, 1=下)
R  = CX:   GOSUB @PUSH_R    ' X座標
R  = CY:   GOSUB @PUSH_R    ' Y座標
R$ = S$:   GOSUB @PUSH_RS   ' 文字列
R$ = "":   GOSUB @PUSH_RS   ' PARAM$
GOSUB @CON_PRINT
' 出力後: LAST_CX[DISP], LAST_CY[DISP] に現在カーソル位置
```

**CON_PRINT のエスケープシーケンス:**

| エスケープ | 効果 |
|-----------|------|
| `\\` | バックスラッシュ文字 |
| `\xNN` | 16進文字コード |
| `\n` | 改行 |
| `\t` | タブ |
| `\0` | 文字列終端 (以降無視) |
| `\cN` | 文字色変更 (Nは16進1文字) |
| `\CN` | 背景色変更 |
| `\cR` | 文字色リストア |
| `\CR` | 背景色リストア |
| `\N[NAME]` | 名前付き文字 (CHR_NAME_*$で定義) |
| `\[I]` | PARAM$[I] に置換 |

```basic
' コンソール消去
R = 1: GOSUB @PUSH_R   ' DISP
GOSUB @CON_CLS
```

### クリッピングウィンドウ

```basic
' 出力範囲をクリッピング (PUSH で入れ子可能)
R  = 1:  GOSUB @PUSH_R   ' DISP
R  = CX: GOSUB @PUSH_R
R  = CY: GOSUB @PUSH_R
R  = CW: GOSUB @PUSH_R
R  = CH: GOSUB @PUSH_R
GOSUB @PUSH_CWIN
' ... 描画 ...
GOSUB @POP_CWIN   ' 元のクリッピングに戻す

' yschlp.prgでの設定 (1文字分の余白)
CLIP_CX[1] = 1
CLIP_CY[1] = 1
CLIP_CW[1] = CON_WIDTH - 2
CLIP_CH[1] = CON_HEIGHT - 2
```

### 動的メモリ

```basic
GOSUB @M_ALLOC   ' → R に M$[] のポインタ
R = ptr: GOSUB @PUSH_R
GOSUB @M_FREE    ' ポインタを解放
```

### 文字列ユーティリティ

```basic
' SARRAY (文字列で表現した配列) の操作
R$ = sarray$: GOSUB @PUSH_RS
R  = 2:       GOSUB @PUSH_R     ' インデックス
GOSUB @NTH_SR                   ' → R$ に sarray[2]

' SASSOC (文字列で表現した連想配列) の操作
R$ = sassoc$: GOSUB @PUSH_RS
R$ = "key":   GOSUB @PUSH_RS
GOSUB @GET_SA                   ' → R$, RT$=="NONE"なら存在しない

R$ = "val":   GOSUB @PUSH_RS
R$ = "key":   GOSUB @PUSH_RS
R$ = sassoc$: GOSUB @PUSH_RS
GOSUB @SET_SA                   ' → R$ に更新後の sassoc$

' 文字列反転
R$ = "ABCDE": GOSUB @PUSH_RS
GOSUB @REVERSE_S               ' → R$ = "EDCBA"
```

### 名前付き文字 (`\N[NAME]`)

`CHR_NAME_0$` / `CHR_NAME_1$` で定義される特殊文字:

| NAME | 文字 | 用途 |
|------|------|------|
| `A`,`B`,`X`,`Y`,`L`,`R` | Ⓐ等 | ボタン記号 |
| `SPADE`,`DIA`,`HEART`,`CLUB` | ♠♦♥♣ | スーツ |
| `CROSS` | ✚ | 十字ボタン |
| `STAR` | ★ | 星 |
| `NOTE`,`NOTE2` | ♩♫ | 音符 |
| `RIGHT`,`LEFT`,`UP`,`DOWN` | →←↑↓ | 矢印 |
| `BOX`,`CIRCLE`,`TRIANGLE` | ■●▲ | 図形 |
| `SQ`,`DQ` | `'` `"` | クォート |
| `YEN` | ¥ | 円記号 |
| `BACKSLASH` | `\` | バックスラッシュ |

---

## ctrllib.prg ― コントローラ/メニュー

### メニュー制御 (MNU_CTRL系)

コンソール上の文字列を「クリック可能な領域」として登録し、タッチまたはボタンで選択できるメニューシステム。

```basic
' 初期化
GOSUB @MNU_CTRL_NEW

' 文字列を描画済みとして、その領域をクリック可能に登録
' (テキストの描画は自分でやる)
R  = CX: GOSUB @PUSH_R    ' コンソールX
R  = CY: GOSUB @PUSH_R    ' コンソールY
R  = CW: GOSUB @PUSH_R    ' 幅
R  = 1:  GOSUB @PUSH_R    ' 高さ
R$ = "@TARGET_LABEL": GOSUB @PUSH_RS  ' 選択時に返す値
GOSUB @MNU_CTRL_ADD

' ボタン登録 (物理ボタンに値を割り当て)
R$ = "B":      GOSUB @PUSH_RS  ' ボタン名 ("A","B","X","Y","L","R","START")
R$ = "@BACK":  GOSUB @PUSH_RS  ' 選択時に返す値
GOSUB @MNU_CTRL_BUTTON

' メインループ (選択待ち)
GOSUB @MNU_CTRL_LOOP
' → R$ に選択された値 (VALUE$)
```

```basic
' 長押し領域 (ロングタッチ)
R  = CX: GOSUB @PUSH_R
R  = CY: GOSUB @PUSH_R
R  = CW: GOSUB @PUSH_R
R  = CH: GOSUB @PUSH_R
R  = 60: GOSUB @PUSH_R    ' 長押し時間 (フレーム数)
R$ = "@LONG": GOSUB @PUSH_RS
GOSUB @MNU_CTRL_LONG

' MNU_CTRLの状態をスタックに退避/復帰 (ネスト対応)
GOSUB @PUSH_MNU_CTRL
GOSUB @POP_MNU_CTRL
```

### ポップアップメニュー

```basic
' RA$[] に選択肢を設定して呼び出す
RA$[0, 0] = "はい (Y)":   RA$[0, 1] = "YES"
RA$[1, 0] = "いいえ (X)": RA$[1, 1] = "NO"
RA$[2, 0] = "\B[Y]":      RA$[2, 1] = "YES"   ' Yボタン
RA$[3, 0] = "\B[X]":      RA$[3, 1] = "NO"    ' Xボタン
RN = 4

' サイズ自動 (CW<=0, CH<=0)
R = -1: GOSUB @PUSH_R   ' CW
R = -1: GOSUB @PUSH_R   ' CH
GOSUB @POPUP_MNU_RA
' → R$ に選択値、RT$ == "NONE" でキャンセル
```

### メッセージウィンドウ

```basic
R = -1:      GOSUB @PUSH_R    ' CW (自動)
R = -1:      GOSUB @PUSH_R    ' CH (自動)
R$ = "メッセージ": GOSUB @PUSH_RS
GOSUB @OPEN_MSG_WIN
' ... ポップアップメニュー表示 ...
GOSUB @CLOSE_MSG_WIN
```

### タッチ制御 (TCH_CTRL系)

```basic
' 絶対ピクセル座標でタッチ領域を登録
GOSUB @TCH_CTRL_NEW

R  = X: GOSUB @PUSH_R    ' ピクセルX
R  = Y: GOSUB @PUSH_R    ' ピクセルY
R  = W: GOSUB @PUSH_R    ' 幅
R  = H: GOSUB @PUSH_R    ' 高さ
R$ = "VALUE": GOSUB @PUSH_RS
GOSUB @TCH_CTRL_ADD

GOSUB @TCH_CTRL_LOOP_R
' → RR$[0] = 選択値, RT$=="NONE" なら選択なし
' RR$[1] = タッチX, RR$[2] = タッチY
```

### メッセージ文字列初期化

```basic
' システムメッセージを言語に合わせて初期化
R$ = "EN": GOSUB @PUSH_RS   ' "EN" または "JA"
GOSUB @LOAD_MSG_BASIC
' → MSG_YES$, MSG_NO$, MSG_PREV$, MSG_BACK$, MSG_NEXT$ 等が設定される
```

---

## gputlib.prg ― グラフィック描画

### G_PUT_PM ― パレットマップ描画

```basic
' ピクセルごとに色番号を持つ画像を描画
R  = X:       GOSUB @PUSH_R   ' 描画先X (px)
R  = Y:       GOSUB @PUSH_R   ' 描画先Y (px)
R$ = "@LABEL": GOSUB @PUSH_RS ' DATAラベル (PM形式)
R  = 0:       GOSUB @PUSH_R   ' REV (1=左右反転)
R  = 0:       GOSUB @PUSH_R   ' ROT (0,90,180,270)
GOSUB @G_PUT_PM
```

**PM形式のDATA:**
```basic
@MY_IMAGE_SZ
DATA 16, 8    ' 幅, 高さ

@MY_IMAGE_PM
DATA "0123456789ABCDEF"   ' 1文字=1ピクセルの色番号 (16進)
DATA "0000FFFF0000FFFF"   ' 幅×高さ分の行
' ...
```

### G_PUT_BM ― ビットマップ描画

```basic
' 1bitビットマップを指定色で描画
R  = X:       GOSUB @PUSH_R
R  = Y:       GOSUB @PUSH_R
R  = COL:     GOSUB @PUSH_R   ' 色番号 (0〜255)
R$ = "@LABEL": GOSUB @PUSH_RS ' DATAラベル (BM形式)
R  = 0:       GOSUB @PUSH_R   ' REV (現在未対応)
R  = 0:       GOSUB @PUSH_R   ' ROT (現在未対応)
GOSUB @G_PUT_BM
```

**BM形式のDATA:**
```basic
@MY_BMP_SZ
DATA 32, 32   ' 幅, 高さ (必ず8の倍数)

@MY_BMP_BM
DATA "00000000"   ' 1行 = 幅÷4文字の16進 (1bit/pixel)
DATA "003C3C00"   ' 例: 32px幅なら8文字
' ...
```

### PM_TO_CHR_R / ROTATE_CHR ― BGキャラ変換

```basic
' PMデータをBGキャラ文字列に変換
R$ = "@LABEL": GOSUB @PUSH_RS
R  = BW:       GOSUB @PUSH_R  ' ブロック幅 (コンソール単位)
R  = BH:       GOSUB @PUSH_R  ' ブロック高さ
GOSUB @PM_TO_CHR_R
' → RR$[0..RN-1] にキャラ文字列 (CHRSETで使用可)

' キャラを90度回転
R$ = CHR_STR$: GOSUB @PUSH_RS
GOSUB @ROTATE_CHR
' → R$ に回転後のキャラ文字列
```

---

## hlpview.prg ― HELPビューワー

### 初期化と起動

```basic
' 必要な初期化
GOSUB @STACKLIB_INIT
GOSUB @STDLIB_INIT
GOSUB @CTRLLIB_INIT
GOSUB @HLPVIEW_INIT

' カスタム初期化 (THIS_HLP_INIT内で設定)
HLP_START_L$ = "@HLP_START_EN"  ' 開始ラベル
HLP_DRAW_BG_L$ = "@MY_DRAW_BG"  ' 背景描画関数
HLP_TEXT_COL = COL_BLACK         ' 通常文字色
HLP_LINK_COL = COL_C             ' リンク色
HLP_OMIT_COL = COL_GREY          ' 無効ボタン色
HLP_DEL_DBLNL = 1                ' 連続改行を1つにまとめる
HLP_SWAP_DQSQ = 1                ' "と'を入れ替え (デフォルト無効)
HLP_SAVE_GRP$ = "SAVE_GRP_FILE"  ' セーブデータGRPファイル名

' 起動
R$ = "@HLP_START_EN": GOSUB @PUSH_RS
GOSUB @HLP_VIEW
' → R$ に終了時の値
```

### エスケープシーケンス完全仕様

#### フラグ操作

| エスケープ | 効果 |
|-----------|------|
| `\F[FLAG]` | FLAG をセット (真にする) |
| `\F[!FLAG]` | FLAG をクリア (偽にする) |
| `\C[FLAG]` | FLAG が偽なら**残りの行を全部スキップ** |
| `\C[!FLAG]` | FLAG が真なら残りの行を全部スキップ |
| `\C[G:FILENAME]` | GRP:FILENAME が存在すれば真、なければ偽 |

**重要:** `\C[]` は行単位で作用する。偽の場合は `S$ = ""` として処理が打ち切られる。

#### リンク

```
\L[SPEC]テキスト\0
```

テキストは `\0` または次のエスケープ命令で終端。`\0` で終わると改行なし、`\n` で終わると改行あり。

**SPEC の形式:**

| SPEC | 意味 |
|------|------|
| `@LABEL` | @LABEL にジャンプ |
| `@LABEL:FLAG` | @LABEL にジャンプし FLAG をセット |
| `F1@LABEL` | F1が真なら @LABEL にジャンプ |
| `F1@L1,F2@L2,@L3` | 条件付きリンク (最初に真になったものへ) |
| `B:@LABEL` | BACKボタンに割り当て |
| `L:@LABEL` | PREVボタン (◀) に割り当て |
| `R:@LABEL` | NEXTボタン (▶) に割り当て |
| `L:@LABEL:FLAG` | PREVボタン + FLAG セット |
| `@PREV` | 履歴を1つ戻る |
| `@SAVE` | 現在位置とフラグを保存 (ダイアログ) |
| `@LOAD` | 保存データを読み込み (ダイアログ) |
| `@` | HLP_VIEW を終了 |
| `@:VALUE` | HLP_VIEW を終了し R$ = VALUE で返る |

#### 画像表示

```
\I[FILE,D,sx,sy,ex,ey,dx,dy]   → 上画面(D=0)または下画面(D=1)にGCOPY
\I[FILE,sx,sy,ex,ey,dx,dy]     → 下画面(D=1)にGCOPY (D省略)
\I[FILE,D]                     → 指定画面にGRP全体をコピー
\I[FILE]                       → 下画面にGRP全体をコピー
```

実装: `GCOPY D_GPAGE, sx, sy, ex, ey, dx, dy, FALSE`  
(`FALSE` = 0番色(透明)をコピーしない)

**上画面に表示した画像はページ遷移後も残る。下画面はページ遷移のたびにクリアされる。**

#### BGMと音声

```
\M[N]        → BGMPLAY N  (プリセット番号)
\M[@STOP]    → BGMSTOP
```

#### プロシージャ (上級)

```
\P[@PROC:PARAM]
```

`@PROC` が呼ばれ、戻り値の文字列によって動作が変わる:
- `"@LABEL:FLAG"` → @LABEL にジャンプし FLAG をセット
- `"#TEXT"` → TEXT をその場に表示
- `""` → 何もしない

### ページデータの書き方

```basic
@MY_PAGE
DATA "\M[21]"                              ' BGM開始
DATA "[\L[@SAVE]Save\0][\L[@LOAD]Load\0]\n\n"  ' Saveボタン (改行なし\0で終端)
DATA "本文のテキストです。\n\n"
DATA "●\L[@PAGE_A]選択肢A\n\n"            ' ●の後にインラインリンク
DATA "●\L[F1@PAGE_B,@PAGE_C]条件分岐\n\n" ' フラグF1があればPAGE_B、なければPAGE_C
DATA "\C[K1]●\L[@PAGE_D]フラグ依存\n\n"  ' K1フラグがあるときだけ表示
DATA "\L[B:@PREV]"                         ' BACKボタン = 履歴を戻る
DATA "\L[L:@PREV_PAGE]"                    ' PREVボタン
DATA "\L[R:@NEXT_PAGE]"                    ' NEXTボタン
DATA ""                                    ' ← ページ終端 (必須)
```

**重要:** `DATA ""` がページの終端。これがないと次のラベルのデータも読み込まれてしまう。

### フラグ操作関数

```basic
' フラグをセット
R$ = "FLAG_NAME": GOSUB @PUSH_RS
GOSUB @HLP_SET_FLAG   ' "!" 始まりなら削除

' フラグを取得
R$ = "FLAG_NAME": GOSUB @PUSH_RS
GOSUB @HLP_GET_FLAG
' → R = 1(真) または R = 0(偽)
```

### セーブデータ

セーブデータはGRPファイルとして保存される。`HLP_SAVE_GRP$` で指定したファイル名に書き込まれる。セーブには現在のラベルとフラグ一覧が含まれる (履歴は含まれない)。

---

## yschlp_p.prg ― 易双六HELPビューワー設定

### 定数一覧

```basic
TAROT_NAME$ = "JRFTAROT"       ' タロット画像ファイルのベース名
BOARD_RGB$ = "10431F"          ' ボード背景色 (RGB16進)
COL_BOARD = 255                ' ボード色の色番号

' 色番号定数
COL_S = 2     ' スペード色 (青)
COL_D = 3     ' ダイヤ色 (金)
COL_H = 4     ' ハート色 (赤)
COL_C = 5     ' クラブ色 (緑)、リンク色にも使用
COL_WHITE = 15
COL_BLACK = 14
COL_GREY = 1
COL_DARK_GREY = 7

' ロゴキャラクタ
CHAR_LOGO_LEN = 3
CHAR_LOGO$[0] = "@CHAR_EKI"   ' 易
CHAR_LOGO$[1] = "@CHAR_SOU"   ' 双
CHAR_LOGO$[2] = "@CHAR_ROKU"  ' 六

LOGO_STR_EN$ = "Youscout"
LOGO_STR_JA$ = "ヨウスコウ"
LOGO_SUB_STR$ = "♦ Tarot Solitaire ♦"
```

### カードスプライトシート仕様

各ファイルは 256×192px (プチコン標準GRP1ページ分)。

| ファイル | 内容 | 追加コンテンツ |
|---------|------|--------------|
| `JRFTRT_A.png` | 大アルカナ正位置 A01-A12, A14-A21 (20枚) | — |
| `JRFTRT_S.png` | ♠ スペード S01-S14 (14枚) | **idx15(180,0): B00(カード裏面)**, **idx16(180,56): DSC(捨て札)**, **idx17(180,112): TLN(タリスマン)** |
| `JRFTRT_D.png` | ♦ ダイヤ D01-D14 (14枚) | **idx15(180,0): A00(グシャ)**, **idx16(180,56): A13(シニガミ)** |
| `JRFTRT_H.png` | ♥ ハート H01-H14 (14枚) | — |
| `JRFTRT_C.png` | ♣ クラブ C01-C14 (14枚) | — |

カード1枚のサイズ: 36×56px  
配置: `col = idx ÷ 3`, `row = idx mod 3`, `x = col×36`, `y = row×56`

---

## Web移植における対応表

### PRG → JavaScript

| PRG | JavaScript相当 |
|-----|---------------|
| `GOSUB @PUSH_RS` / `GOSUB @POP_RS` | 引数渡し / 返り値 |
| `MEM$` | `localStorage` |
| `HLP_FLAG$[]` | `Set<string>` |
| `HLP_HISTORY$[]` | `Array<string>` |
| `BGMPLAY N` | `Tone.Player` |
| `GCOPY page, sx,sy,ex,ey, dx,dy, FALSE` | `ctx.drawImage(img, sx,sy, w,h, dx,dy, w,h)` |
| `GPAGE 0, D_GPAGE, U_GPAGE` | `ctxU` (上画面Canvas) |
| `GPAGE 1, D_GPAGE, L_GPAGE` | `ctxL` (下画面Canvas) |
| `RESTORE @LABEL: READ ...` | JSONデータとして事前展開 |

### \I コマンドの引数解析

```
\I[FILE, D, sx, sy, ex, ey, dx, dy]   ← RN=8 (D指定あり)
\I[FILE, sx, sy, ex, ey, dx, dy]      ← RN=7 (D省略=下画面)
```

```javascript
// RN=8: D=0なら上画面(ctxU), D=1なら下画面(ctxL)
// RN=7: 下画面(ctxL)
const ctx = (D === 0) ? ctxU : ctxL;
const w = ex - sx + 1, h = ey - sy + 1;
ctx.drawImage(img, sx, sy, w, h, dx, dy, w, h);
```

---

## Tips (実装での注意点)

1. **連続ラベルはページ共有**: `@HLP_START_EN` の直後に `@YSC_START_EN` があれば、同じDATAブロックを参照する。JSONパーサで正確に分離すること。

2. **`\C[]` は行単位**: 偽の場合は「その行の文字列残り全部」が空になる。次の行には影響しない。

3. **`""` でページ終端**: `DATA ""` が来たら処理を止め、次の行以降は読まない。

4. **リンクテキストと `\0`**: `\L[SPEC]TEXT\0` の TEXT は `\0` または次のエスケープ命令まで。`\0` で終わると改行なし、`\n` を含めると改行あり。

5. **ナビリンクはテキストなし**: `\L[B:@LABEL]` や `\L[R:@NEXT]` はテキストを持たず、フッターボタンに割り当てるだけ。

6. **上画面は維持、下画面はクリア**: 画像命令で上画面(D=0)に描いた内容はページ遷移後も消えない。下画面(D=1)はページ表示のたびにクリアされる。

7. **`HLP_SWAP_DQSQ = 1`**: yschlp.prgでは有効。DATAの `"` と `'` を入れ替えて処理する。Webでは不要だが、元のDATAが `'` でクォートされている行が存在する場合の対策。

8. **`HLP_DEL_DBLNL = 1`**: 連続する空行 (`\n\n` の連続) を1つにまとめる。行頭が `CLIP_CX` と同じ場合のみ。

9. **Tone.js使用時**: モバイルではユーザーインタラクション後に `Tone.start()` を呼ぶ必要がある。スプラッシュのボタンクリックで `ensureAudio()` を呼ぶこと。

---

## スプライト・BGキャラ・GRPファイル 完全レイアウト

> 出典: `trtconst.prg`, `yscconst.prg`, `mkjrftrt.prg`

---

### 基本定数

```
TAROT_NAME$ = "JRFTAROT"   個別カードPNGのプレフィックス
TAROT_BASE$ = "JRFTRT"     スプライトシートのプレフィックス
CARD_WIDTH  = 36px
CARD_HEIGHT = 56px
GRP_ROWS    = 3             スプライトシートの行数
BOARD_RGB$  = "10431F"      ボード背景色
```

---

### GRP ファイル（カード画像シート, 256×192px RGBA PNG）

カード配置: `col = idx ÷ 3`, `row = idx mod 3`, `x = col×36`, `y = row×56`

| ファイル | 定数 | 内容 | 特記 |
|---------|------|------|------|
| `JRFTRT_A.png` | `GRP_FILE_A$` | 大アルカナ正位置 A01-A12,A14-A21 (idx 0-19) | A00/A13は JRFTRT_D に格納 |
| `JRFTRT_R.png` | `GRP_FILE_R$` | 大アルカナ逆位置 (同、180度回転) | ST_UREV=1のとき使用 |
| `JRFTRT_S.png` | `GRP_FILE_S$` | スペード S01-S14 (idx 0-13) + B00(idx15) + DSC(idx16) + TLN(idx17) | |
| `JRFTRT_D.png` | `GRP_FILE_D$` | ダイヤ D01-D14 (idx 0-13) + A00(idx15) + A13(idx16) | |
| `JRFTRT_H.png` | `GRP_FILE_H$` | ハート H01-H14 (idx 0-13) | |
| `JRFTRT_C.png` | `GRP_FILE_C$` | クラブ C01-C14 (idx 0-13) | |
| `JRFTRT_RS.png` | `GRP_FILE_RS$` | スペード逆位置 + B00逆/DSC正/TLN正 | |
| `JRFTRT_RD.png` | `GRP_FILE_RD$` | ダイヤ逆位置 + A00逆/A13逆 | |
| `JRFTRT_RH.png` | `GRP_FILE_RH$` | ハート逆位置 | |
| `JRFTRT_RC.png` | `GRP_FILE_RC$` | クラブ逆位置 | |
| `JRFTRT_T.png`  | `GRP_FILE_T$`  | タイトル背景（ボード色＋易双六縦書きロゴ）| |

#### 特殊スロットのインデックス

```
GRP_S_B00       = 5*3+0 = 15  → JRFTRT_S の (180,0)  : カード裏面(B00)
GRP_S_DISCARDED = 5*3+1 = 16  → JRFTRT_S の (180,56) : 捨て札(DSC)
GRP_S_TALON     = 5*3+2 = 17  → JRFTRT_S の (180,112): タリスマン(TLN)
GRP_D_A00       = 5*3+0 = 15  → JRFTRT_D の (180,0)  : グシャ(A00)
GRP_D_A13       = 5*3+1 = 16  → JRFTRT_D の (180,56) : シニガミ(A13)
```

---

### BGU1 キャラクタバンク（CHR_FILE_B$ = `JRFTRT_B`, BGU1にLOAD）

各キャラ 8×8px。プチコンのBGU1バンクに格納される。

| オフセット | 定数 | 内容 |
|-----------|------|------|
| 0〜21     | `BGU1_NUM_OFFSET` | 数字キャラ CHAR_0〜CHAR_21 |
| 22〜26    | `BGU1_ALP_OFFSET` | 英字キャラ A,J,C,Q,K |
| 27        | `BGU1_SUIT_CIRCLE` | ○記号 (黒) |
| 28        | `BGU1_SUIT_BOX`    | □記号 (黒) |
| 29        | `BGU1_SUIT_S`      | ♠スペード (青 #0000FF) |
| 30        | `BGU1_SUIT_D`      | ♦ダイヤ (金 #D4AA00) |
| 31        | `BGU1_SUIT_H`      | ♥ハート (赤 #FF0000) |
| 32        | `BGU1_SUIT_C`      | ♣クラブ (緑 #008000) |
| 33        | `BGU1_WHCD_C`      | 白カード中央塗り(白8×8) |
| 34        | `BGU1_WHCD_TL`     | 白カード左上コーナー |
| 35        | `BGU1_WHCD_T`      | 白カード上辺 |
| 36        | `BGU1_WHCD_TR`     | 白カード右上コーナー |
| 37        | `BGU1_WHCD_L`      | 白カード左辺 |
| 38        | `BGU1_WHCD_R`      | 白カード右辺 |
| 39        | `BGU1_WHCD_BL`     | 白カード左下コーナー |
| 40        | `BGU1_WHCD_B`      | 白カード下辺 |
| 41        | `BGU1_WHCD_BR`     | 白カード右下コーナー |
| 42〜44    | `BGU1_WHCD_TLP/TRP/BLP` | コーナー点付きバリエーション |
| 45〜47    | `BGU1_WHCD_TLWP/TRWP/BLWP` | コーナー点なしバリエーション |
| 48        | `BGU1_RDLN_TL`     | 赤フレーム左上 |
| 49        | `BGU1_RDLN_T`      | 赤フレーム上辺 |
| 50        | `BGU1_RDLN_L`      | 赤フレーム左辺 |
| 51〜64    | `BGU1_SRBN_*`      | ソロバン各パーツ(玉/軸/針/天/角/枠) |
| 65        | `BGU1_MINI_CD`     | ミニカード(6×7px相当) |
| 66〜100   | `BGU1_B00`         | カード裏面B00(5×7チャンク=35ch) |
| 101〜135  | `BGU1_A00`         | グシャA00(5×7チャンク=35ch) |
| 136〜170  | `BGU1_A13`         | シニガミA13(5×7チャンク=35ch) |
| 171〜219  | `BGU1_DISCARDED`   | 捨て札DSC(7×7チャンク=49ch) |
| 220〜235  | `BGU1_TOKEN`       | トークン(4×4チャンク=16ch) |
| 236       | `BGU1_MISC_END`    | 以降は未使用 (最大256まで) |

---

### SPU7 キャラクタバンク（CHR_FILE_S7$ = `JRFTRTS7`, SPU7にLOAD）

各キャラ 8×8px。64×64pxのスプライト = 8×8 = 64キャラ使用。

| チャンクIdx | 定数 | 内容 | SPSETでの使用 |
|------------|------|------|--------------|
| 0〜63      | `SPU7_B00 = 0`     | カード裏面B00 (64×64px) | `SPSET SP_B00, 7*64+0/4, SPPL_B00, ..., 64, 64` |
| 64〜127    | `SPU7_A00 = 64`    | グシャA00 (64×64px)    | `SPSET SP_A00, 7*64+64/4, SPPL_A00, ..., 64, 64` |
| 128〜191   | `SPU7_A13 = 128`   | シニガミA13 (64×64px)  | `SPSET SP_A13, 7*64+128/4, SPPL_A13, ..., 64, 64` |
| 192〜207   | `SPU7_TOKEN = 192` | トークン (4×4チャンク=32×32px) | |
| 208〜223   | `SPU7_RDLN_TL = 208` | 赤フレーム左上 (4×4チャンク) | |
| 224〜227   | `SPU7_RDLN_T = 224`  | 赤フレーム上辺 (4チャンク) | |
| 228〜231   | `SPU7_NONE = 228`    | 空白(透明) | |
| 232        | `SPU7_END = 232`     | 終端 | |

**SPSET の CHR引数**: `バンク番号 * 64 + バンク内CHR番号 / 4`  
例: SPU7のSPU7_B00(=0) → `7*64 + 0/4 = 448`

---

### SPU6 キャラクタバンク（CHR_FILE_S6$ = `JRFTRTS6`, SPU6にLOAD）

各キャラ 8×8px。カードスタック表示時の左上タイトル部分（16×8px = 2チャンク使用）。

| チャンクIdx | 定数 | 内容 |
|------------|------|------|
| 0〜55      | `SPU6_CDTL_S_OFS = 0`   | スペード S01-S14 の左上タイトル (各4チャンク) |
| 56〜111    | `SPU6_CDTL_D_OFS = 56`  | ダイヤ  D01-D14 の左上タイトル (各4チャンク) |
| 112〜167   | `SPU6_CDTL_H_OFS = 112` | ハート  H01-H14 の左上タイトル (各4チャンク) |
| 168〜223   | `SPU6_CDTL_C_OFS = 168` | クラブ  C01-C14 の左上タイトル (各4チャンク) |
| 224        | `SPU6_END = 224` | 終端 |

**タイトルチャンクの内容** (MAKE_CD_TL_R, 16×8px):  
- 左8×8: 白カード左上コーナー(WHCD_TL) + 数字キャラ(黒, x=1+I, y=1+J)  
- 右8×8: 白カード上辺(WHCD_T) + スーツマーク(スーツ色, x=10+I, y=1+J)  
- 数字はI=0〜7まで(右タイルにはみ出してもフレームより数字が優先)

---

### SPU5 キャラクタバンク（CHR_FILE_S5$ = `JRFTRTS5`, SPU5にLOAD）

各キャラ 8×8px。白カードフレーム（64×64px = 64チャンク）の4パターン。

| チャンクIdx | 定数 | 内容 |
|------------|------|------|
| 0〜63      | `SPU5_WHCD = 0`     | 白カード基本フレーム (64×64px) |
| 64〜127    | `SPU5_WHCD_PTL = 64`  | 白カードフレーム + 左上点 |
| 128〜191   | `SPU5_WHCD_PT = 128`  | 白カードフレーム + 上辺点 |
| 192〜255   | `SPU5_WHCD_PL = 192`  | 白カードフレーム + 左辺点 |
| 256        | `SPU5_END = 256` | 終端 |

**白カードフレームの構造** (36×56px, 四隅透明):  
- y=0: [透明, グレー×34, 透明] ← 上辺  
- y=1: [グレー×2, 白×32, グレー×2]  
- y=2〜53: [グレー, 白×34, グレー] ← 左右辺  
- y=54: [グレー×2, 白×32, グレー×2]  
- y=55: [透明, グレー×34, 透明] ← 下辺

---

### SPU4 キャラクタバンク（CHR_FILE_S4$ = `JRFTRTS4`, SPU4にLOAD）

各キャラ 8×8px。カードスタック・ストリップ表示用パーツ。

| チャンクIdx | 定数 | 内容 |
|------------|------|------|
| 0〜15      | `SPU4_CDSTR_OFS = 0`  | カード上辺ストリップ (16×8px × 2パターン) |
| 16〜143    | `SPU4_CDSBL_OFS = 16` | カードスタック左側 (8×64px × 4パターン) |
| 144〜207   | `SPU4_RDLN_CD = 144`  | 赤フレームカード (64×64px) |
| 208        | `SPU4_END = 208` | 終端 |

---

### SPRITE 管理番号（yscconst.prg より）

| 管理番号 | 定数 | 内容 | CHR | パレット |
|---------|------|------|-----|---------|
| 0       | `SP_B00`     | カード裏面 (64×64) | `7*64 + SPU7_B00/4` | `SPPL_B00 = 13` |
| 1       | `SP_DRAWN`   | 引いたカード (64×64) | `1*64 + 0` | `SPPL_DRAWN = 8` |
| 2〜15   | `SP_TMP_OFFSET` | アニメーション用一時SP | | |
| 16      | `SP_TOKEN`   | トークン | `7*64 + SPU7_TOKEN/4` | `SPPL_TOKEN = 15` |
| 20〜27  | `SP_RDLN_*`  | 赤フレーム8分割 | | |
| 30      | `SP_A00`     | グシャ (64×64) | `7*64 + SPU7_A00/4` | `SPPL_A00 = 11` |
| 31      | `SP_A13`     | シニガミ (64×64) | `7*64 + SPU7_A13/4` | `SPPL_A13 = 10` |
| 32〜    | `SPRITE_ALLOC_MIN` | カードスタック用 (動的割当) | SPU4/5/6 | |
| 112     | `SPS_CURSOR` | カーソル (16×16) | | |

---

### ゲームボード座標（yscconst.prg より）

`CARDS_BASE_X = 32` (4×8), `CARDS_BASE_Y = 0`

**大アルカナスロット 6枚** (CARD_X/Y[0-5], 36×56px):

| idx | x | y | 用途 |
|-----|---|---|------|
| 0 | 222 | 120 | 右下 |
| 1 | 120 | 104 | 中右 |
| 2 |  44 | 120 | 左下 |
| 3 | 166 |  16 | 右上 |
| 4 | 120 |  32 | 中上 |
| 5 |  78 |  16 | 左上 |

**小アルカナスロット 8枚** (CARDS_X/Y[0-7], 68×72px):

| idx | x | y | アンカー | 用途 |
|-----|---|---|---------|------|
| 0 | 192 | 104 | NE | カップ下 |
| 1 | 144 |  56 | SW | カップ中 |
| 2 |  48 | 104 | NW | カップ上 |
| 3 | 176 |   8 | NW | コイン下 |
| 4 |  64 |  64 | NE | コイン中 |
| 5 |  32 |   8 | NE | コイン上 |
| 6 | 104 | 120 | S  | 下タリスマン(コイン)  |
| 7 | 104 |   0 | N  | 上タリスマン(ソード)  |

**その他の座標:**

```
DRAWN_X    = 256-36-4 = 216   引いたカード X
DRAWN_Y    = 96-28    = 68    引いたカード Y
TALON_X    = 256-8-43 = 205   タリスマン X
DISCARDED_X = 205-8-56-5=136  捨て札 X
MISSING_X  = 128              画面外退避 X
```

---

### カラーパレット（JRFTAROT_CMAP, パレットインデックス対応）

| インデックス | 定数 | RGB | 用途 |
|------------|------|-----|------|
| 0  | — | 透明 | 透明 |
| 1  | `COL_GREY`      | `#DCDCDC` | グレー |
| 2  | `COL_S / COL_BLUE`  | `#0000FF` | スペード色 |
| 3  | `COL_D / COL_GOLD`  | `#D4AA00` | ダイヤ色 |
| 4  | `COL_H / COL_RED`   | `#FF0000` | ハート色 |
| 5  | `COL_C / COL_GREEN` | `#008000` | クラブ色 |
| 6  | — | `#ACACAC` | (グレー系) |
| 7  | `COL_DARK_GREY` | `#787878` | 暗グレー |
| 14 | `COL_BLACK`     | `#000000` | 黒 |
| 15 | `COL_WHITE`     | `#FFFFFF` | 白 |
| 255| `COL_BOARD`     | `#10431F` | ボード背景色 |

---

## スプライトシート生成ツールチェーン

> 今週（2026-05-09）確立。

### 使い方

```bash
# ステップ1: jrftarot.prg から個別PNG生成（Compress::Zlibのみ必要）
perl extract_chars.pl \
    --src youscout_ptc/src/jrftarot.prg \
    --out out_png

# ステップ2: 個別PNG をスプライトシートに合成
perl make_sheets.pl \
    --src out_png \
    --out out_png
```

両スクリプトは `Compress::Zlib` のみ依存（外部画像モジュール不要、Pure Perl PNG実装）。

### make_sheets.plの処理内容

`load_card(name)` で `$src_dir/$name.png` を読み込み、`paste_card(sheet, img, idx, rot)` でシートに配置する。`rot=1` で180度回転（逆位置カード）。

**PNG読み込み**: フィルタタイプ0〜4（None/Sub/Up/Average/Paeth）に対応。  
**PNG書き込み**: `write_png(path, w, h, pixels_ref)` で RGBA PNG を生成。

### JRFTRTS6 生成の実装ポイント（MAKE_CD_TL_R の再現）

カードグラフィック（JRFTAROT_S10等）を実測して確認した正確なオフセット：

```
左8×8タイル: 白カードコーナーフレーム + 数字（黒）
  数字 x = 1 + I  (I=0〜7, 合計8列)
  数字 y = 1 + J  (J=0〜6, 合計7行)
  ※ I=7のとき x=8 → 右タイルにはみ出すが許容（フレームより数字が優先）

右8×8タイル: 白カード上辺フレーム + スーツマーク（スーツ色）
  スーツ x = 8 + 2 + I = 10 + I  (I=0〜5, 最大6列)
  スーツ y = 1 + J  (J=0〜6)

描画順序: フレーム → 数字（上書き）→ スーツ（上書き）
```

### JRFTRT_B 生成の実装ポイント（BM_TO_CHR の再現）

```
BM_TO_CHR(LABEL$, COL, X, Y):
  BMビットマップを8×8CHRデータに変換
  X=0, Y=0: 左上から8×8ピクセルを取得
  X=-2:     ビットマップを右に2px移動して8×8に収める
            → I=0,1のとき X+I<0 → 透明
            → I=2〜7のとき X+I=0〜5 → BMデータを読む
  → スーツキャラはX=-2で呼ばれるため、8×8内でx=2〜7に描画される

スーツキャラの実際の配置（8×8CHR内）:
  x=0,1: 透明（空き）
  x=2〜6: スーツ記号（CHAR_SPADEは5px幅なのでx=2〜6）
```

### スーツキャラの正しい色（extract_chars.pl修正済み）

`trtconst.prg` の `BG_SUIT_DATA_C` 定義に準拠:

```perl
# 旧（誤り）
SPADE => [0,0,0],           # 黒（×）
DIA   => [0x8B,0x6D,0x26],  # 暗金（×）

# 新（正しい）
SPADE  => [0x00,0x00,0xFF],  # 青  CMAP[2]=#0000FF
DIA    => [0xD4,0xAA,0x00],  # 金  CMAP[3]=#D4AA00
HEART  => [0xFF,0x00,0x00],  # 赤  CMAP[4]=#FF0000（変更なし）
CLUB   => [0x00,0x80,0x00],  # 緑  CMAP[5]=#008000（変更なし）
CIRCLE => [0x00,0x00,0x00],  # 黒  CMAP[14]=#000000（変更なし）
BOX    => [0x00,0x00,0x00],  # 黒  CMAP[14]=#000000（変更なし）
```

### JRFTRT_D に A00/A13 が必要な理由

`trtconst.prg` より:
```
GRP_D_A00 = 5 * GRP_ROWS + 0 = 5*3+0 = 15 → col=5, row=0 → (180,0)
GRP_D_A13 = 5 * GRP_ROWS + 1 = 5*3+1 = 16 → col=5, row=1 → (180,56)
```

`mkjrftrt.prg` がダイヤシートの生成後に A00/A13 をこの位置に追加で書き込む。  
`extract_chars.pl` 単独では生成されないため `make_sheets.pl` で明示的に配置する。  
同様に JRFTRT_S には B00/DSC/TLN が idx15〜17 に格納される。

