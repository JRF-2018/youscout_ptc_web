# SmileBASIC (プチコンmkII) 言語仕様リファレンス

> 出典: プチコンmkII 取扱説明書 (© 2012 SmileBoom Co.Ltd.)  
> 対象: 易双六PTC Web移植プロジェクト向けメモ

---

## 基本仕様

| 項目 | 仕様 |
|------|------|
| 数値型 | 32ビット固定小数点 (4096 = 1.0) |
| 整数範囲 | ±524287 |
| 16進 | `&H` プレフィックス |
| 2進 | `&B` プレフィックス |
| 変数名 | 英字始まり、最大16文字、`_` 使用可 |
| 文字列変数 | 末尾に `$` (例: `A$`, `NAME$`) |
| 配列 | 最大2次元、合計262144要素、添字は0始まり |
| 文字列変数最大 | 4096個 |
| 複数命令区切り | `:` (コロン) |
| 行番号 | テキストエディタ用のみ (1〜9999)、GOTOには使用不可 |
| ラベル分岐 | `@ラベル名` を使用 |
| 等値比較 | `==` (C言語風)、不等値は `!=` |
| 条件分岐 | `IF ... THEN ... ELSE ...` または `IF ... GOTO @ラベル` |
| 文字列最大長 | 256文字 (ラベルは8文字) |
| テキスト最大 | 約52万文字、最大9999行、1行100文字 |
| 同時発音 | BGM+効果音+音声合成 合計16音 (PSG除く) |

---

## 演算子

### 算術
| 演算子 | 意味 |
|--------|------|
| `+` | 加算 (文字列連結も可) |
| `-` | 減算 |
| `*` | 乗算 (文字列繰り返しも可: `"ABC"*3` → `"ABCABCABC"`) |
| `/` | 除算 (0除算はエラー) |
| `%` | 剰余 (0除算はエラー) |

### 比較
| 演算子 | 意味 |
|--------|------|
| `==` | 等しい |
| `!=` | 等しくない |
| `>` | より大きい |
| `<` | より小さい |
| `>=` | 以上 |
| `<=` | 以下 |

### ビット / 論理
| 演算子 | 意味 |
|--------|------|
| `AND` | 論理積 |
| `OR` | 論理和 |
| `XOR` | 排他的論理和 |
| `NOT` | 否定 |
| `!` | 真偽反転 (`!TRUE` == `FALSE`) |

### 優先順位 (高→低)
1. `()` `[]`
2. 単項マイナス / `NOT` / `!`
3. 関数
4. `*` `/` `%`
5. `+` `-`
6. `==` `!=` `<` `<=` `>` `>=`
7. `AND` `OR` `XOR`

---

## 画面構成

### 上画面 (256×192px) ― 奥→手前
```
背景色 → グラフィック面 → BG後 → BG前 → コンソール
```
### 下画面 (256×192px) ― 奥→手前
```
背景色 → グラフィック面 → BG後 → BG前 → キーボード/パネル
```

| 要素 | 詳細 |
|------|------|
| 解像度 | 256×192 px |
| コンソール | 32文字×24行 |
| 1フレーム | 1/60秒 |
| BGバンク | BGU0〜BGU3 (上画面ユーザー用) |
| SPRITEバンク | SPU0〜SPU7 (上画面ユーザー用) |
| グラフィック | 256色 (0番=透明)、4ページ (GRP0〜GRP3) |
| BGパレット | 16色×16種 (0番=透明) |
| SPRITE最大 | 100個 |

---

## FOR 文の注意
```basic
' 初期値 > 終了値 のとき中身を実行せずスキップ (既存BASICと違う!)
FOR I = 0 TO -1   ' ← スキップされる
  PRINT I
NEXT
```
`STEP` 省略時は `STEP 1`。

---

## ファイル・リソース操作

### LOAD / SAVE
```basic
LOAD "PRG:FILENAME"         ' プログラム読み込み
LOAD "GRP0:FILENAME"        ' グラフィック読み込み (GRP0〜GRP3)
LOAD "SPU0:FILENAME"        ' SPRITEキャラ読み込み (SPU0〜SPU7)
LOAD "BGU0:FILENAME"        ' BGキャラ読み込み (BGU0〜BGU3)
LOAD "SCU0:FILENAME"        ' BGスクリーン (SCU0=手前, SCU1=奥)
LOAD "COL0:FILENAME"        ' カラー (COL0=BG, COL1=SPRITE, COL2=GRP)
LOAD "MEM:FILENAME"         ' メモリー文字列
LOAD "PRG:FILENAME", FALSE  ' ダイアログ表示なし (第2引数FALSE)
```
`RESULT`: `TRUE`=成功, `FALSE`=失敗, `CANCEL`=中止

### GCOPY
```basic
GCOPY 転送元ページ, 始点x, 始点y, 終点x, 終点y, 転送先x, 転送先y, コピーモード
' コピーモード: FALSE = 0番色(透明)をコピーしない  TRUE = 全コピー
' 例: カード1枚を透明を保ってコピー
GCOPY 0, 72, 0, 107, 55, 140, 32, FALSE
```

### GPAGE
```basic
GPAGE 画面 [, 描画ページ, 表示ページ]
' 画面: 0=上画面, 1=下画面
' 描画ページ/表示ページ: 0〜3
' 例: 下画面を描画対象に
GPAGE 1, 1, 1
```

---

## グラフィック命令

```basic
GCLS [色]                               ' グラフィック消去
GPAGE 画面 [,描画ページ,表示ページ]
GCOLOR 色番号                           ' 省略時色指定
GPSET x, y [,色]                        ' 点を打つ
GLINE 始x,始y,終x,終y [,色]            ' 直線
GBOX 始x,始y,終x,終y [,色]             ' 矩形枠
GFILL 始x,始y,終x,終y [,色]            ' 矩形塗り
GCIRCLE x,y,半径 [,色 [,開始角,終了角]] ' 円
GPAINT x,y [,色 [,境界色]]             ' 塗りつぶし
GSPOIT(x,y)                            ' 色取得
GCOPY 元ページ,始x,始y,終x,終y,先x,先y,モード ' コピー
GDRAWMD 状態                           ' XOR描画モード
GPRIO 番号                             ' 優先順位 (0〜3)
GPUTCHR x,y,"キャラ名",番号,パレット,スケール
```

---

## コンソール命令

```basic
PRINT "文字列"             ' 改行あり出力
PRINT 変数;変数$;"文字"   ' ; で続けて出力
PRINT "文字",変数         ' , でタブ位置補正
LOCATE x, y               ' カーソル位置 (0-31, 0-23)
COLOR 文字色 [,背景色]    ' 0〜15 (背景0=透明)
CLS                        ' コンソール消去
ACLS                       ' 描画環境全初期化
CHKCHR(x,y)               ' 文字コード取得
VISIBLE コンソール,パネル,BG0,BG1,SPRITE,グラフィック
```

---

## BG命令

```basic
BGPAGE 画面                ' 0=上, 1=下
BGCLR [レイヤー]           ' 0=手前, 1=奥, 省略=両方
BGPUT レイヤー,x,y,キャラ番号,パレット,横反転,縦反転
BGFILL レイヤー,始x,始y,終x,終y,キャラ番号,パレット,横反転,縦反転
BGREAD (レイヤー,x,y),CHR,PAL,H,V
BGOFS レイヤー,x,y [,補間時間]
BGCOPY レイヤー,始x,始y,終x,終y,先x,先y
BGCLIP 始x,始y,終x,終y
```

スクリーンデータ形式 (16bit):
```
b00-b09: キャラ番号 (0〜1023)
b10:     横反転
b11:     縦反転
b12-b15: パレット番号 (0〜15)
```

---

## SPRITE命令

```basic
SPSET 管理番号,キャラ番号,パレット番号,横反転,縦反転,優先順位 [,幅,高さ]
' 優先順位: 0=コンソール前, 1=BG前前, 2=2BG間, 3=BG奥後
' 幅/高さ: 8,16,32,64 (省略=16, 禁止組合せあり)
SPCLR [管理番号]           ' 省略=全削除
SPOFS 管理番号,x,y [,補間時間]
SPCHR 管理番号,キャラ番号 [,パレット,横反転,縦反転,優先順位]
SPANIM 管理番号,枚数,時間 [,ループ]
SPANGLE 管理番号,角度 [,補間時間,変化方向]
SPSCALE 管理番号,スケール [,補間時間]
SPHOME 管理番号,x,y      ' 原点指定
SPREAD (管理番号),X,Y [,A,S,C]  ' 位置/角度/スケール取得
SPSETV 管理番号,変数番号,値  ' ユーザー変数 (0〜7)
SPGETV(管理番号,変数番号)
SPCOL 管理番号,x,y,w,h,スケール対応 [,グループ]
SPHIT(管理番号 [,開始番号])
SPHITSP(管理番号,相手番号)
SPHITRC(管理番号,x,y,w,h [,dx,dy])
```

---

## サウンド命令

```basic
BEEP [波形番号 [,ピッチ [,音量 [,パンポット]]]]
' ピッチ: -8192=2オクターブ下, 0=原音, 8192=2オクターブ上
' 半音のピッチ P = 4096 / 12 ≒ 341.3

BGMPLAY 曲番号              ' プリセット0〜29, ユーザー128〜255
BGMPLAY トラック, 曲番号 [,音量]
BGMPLAY "MML文字列" [,"MML文字列"...]  ' 直接MML
BGMSTOP [トラック番号 [,フェード時間]]
BGMSET 曲番号, "MML" [,"MML"...]      ' 曲登録
BGMVOL [トラック,] 音量
BGMCHK([トラック])                    ' 演奏中=TRUE
BGMSETV トラック,変数番号,値
BGMGETV(トラック,変数番号)

TALK "音声文字列"
TALKSTOP
TALKCHK()                             ' 再生中=TRUE
```

### MMLコマンド主要まとめ

| コマンド | 説明 |
|---------|------|
| `T数値` | テンポ (1〜240) |
| `L数値` | デフォルト音長 (1〜192、`L4.`で付点) |
| `O数値` | オクターブ (0〜8) |
| `<` / `>` | オクターブ上/下 |
| `CDEFGAB` | 音階 (`#` or `+` で半音上、`-` で半音下) |
| `R` | 休符 |
| `V数値` | ベロシティ (0〜127) |
| `@数値` | 音色 (0〜127=GM楽器, 128-129=ドラム, 144-150=PSG, 151=ノイズ) |
| `Q数値` | ゲートタイム (0〜8) |
| `P数値` | パンポット (0=左, 64=中央, 127=右) |
| `[` … `]数値` | ループ (最大3段ネスト、0=無限) |
| `&` | タイ (2音をつなぐ) |
| `:数値` | チャンネル指定 (:0〜:7) |
| `@E A,D,S,R` | エンベロープ (各0〜127) |
| `@MP D,R,S,Delay` | ビブラート |
| `@MA D,R,S,Delay` | トレモロ |
| `{ラベル=MML}` | マクロ定義 |
| `{ラベル}` | マクロ使用 |

---

## 入力系

```basic
BUTTON([種別])
' 種別: 0=押中, 1=押瞬間(連射), 2=押瞬間, 3=離し瞬間
' 戻り値ビット: 1=↑, 2=↓, 4=←, 8=→, 16=A, 32=B, 64=X, 128=Y
'              256=L, 512=R, 1024=START

BTRIG()              ' BUTTON(2) と同じ
INKEY$()             ' 1文字取得 (TABはスペース変換、BS取得不可)
KEYBOARD             ' キースキャンコード (BSなど取得可)
TCHST                ' タッチ状態 (TRUE=触れている)
TCHX, TCHY           ' タッチ座標
TCHTIME              ' タッチ継続フレーム数
INPUT ["文字";] 変数  ' 入力待ち
LINPUT ["文字";] 変数$ ' カンマ込み入力
BREPEAT ボタンID [,開始時間,インターバル]  ' 連射設定
```

---

## ファイル通信

```basic
SENDFILE "種別:ファイル名"   ' 他DS本体へ送信
RECVFILE "種別:ファイル名"   ' 他DS本体から受信
DELETE "種別:ファイル名"
RENAME "種別:ファイル名", "新名前"
FILES [種別名...]             ' ファイル一覧表示
```

---

## システム変数

| 変数 | 読/書 | 説明 |
|------|-------|------|
| `CSRX`, `CSRY` | R | カーソル位置 |
| `FREEMEM` | R | 残りユーザーメモリ容量 |
| `VERSION` | R | システムバージョン (`&HAABBCCDD`) |
| `ERR` | R | エラー番号 |
| `ERL` | R | エラー発生行番号 |
| `RESULT` | R | ファイル系命令の結果 |
| `TCHX`,`TCHY` | R | タッチ座標 |
| `TCHST` | R | タッチ状態 |
| `TCHTIME` | R | タッチ継続フレーム数 |
| `MAINCNTL` | R | 経過フレーム (最大145分) |
| `MAINCNTH` | R | 経過フレーム (145分超) |
| `TABSTEP` | R/W | TAB移動量 (0〜16) |
| `TRUE` | R | 常に1 |
| `FALSE` | R | 常に0 |
| `CANCEL` | R | 常に-1 |
| `KEYBOARD` | R | キースキャンコード |
| `SPHITNO` | R | SPRITE衝突番号 (-1=なし) |
| `SPHITX`,`SPHITY` | R | SPRITE衝突座標 |
| `SPHITT` | R | SPRITE衝突時刻 |
| `TIME$` | R | 現在時刻 `HH:MM:SS` |
| `DATE$` | R | 現在日付 `YYYY/MM/DD` |
| `MEM$` | R/W | ファイル保存可能な文字列 |
| `PRGNAME$` | R | 読み込まれたPRGファイル名 |
| `PACKAGE$` | R | 読み込まれたファイルのパッケージ情報 |
| `SYSBEEP` | R/W | システム効果音 (TRUE=あり) |
| `FUNCNO` | R | 押されているFキー番号 (0=なし) |
| `ICONPUSE` | R/W | ユーザーアイコン使用 |
| `ICONPAGE` | R/W | ユーザーアイコンページ |

---

## エラー番号表

| 番号 | 意味 |
|------|------|
| 1 | Syntax error |
| 2 | Out of range |
| 3 | Out of memory |
| 4 | Undefined label |
| 5 | NEXT without FOR |
| 6 | Out of DATA |
| 7 | Illegal function call |
| 8 | Duplicate definition |
| 9 | Can't continue |
| 10 | Missing operand |
| 11 | Duplicate label |
| 12 | Illegal resource type |
| 13 | Illegal character type |
| 14 | String too long |
| 15 | Division by zero |
| 16 | Overflow |
| 17 | Subscript out of range |
| 18 | Type mismatch |
| 19 | Formula too complex |
| 20 | RETURN without GOSUB |
| 21 | FOR without NEXT |
| 22 | Illegal MML |

---

## プリセットBGM番号

| 番号 | 説明 |
|------|------|
| 0 | 軽快な曲 |
| 1 | 湿った暗い感じ |
| 2 | 緊張感高まる曲 |
| 3 | 激しくアップテンポ |
| 4 | スタートジングル |
| 5 | クリアジングル |
| 6 | ゲームオーバー |
| 7 | メニューセレクト |
| 8 | 結果発表 |
| 9 | スタッフロール |
| 10 | スタッフロール その2 |
| 11 | 時代劇ゲーム風 |
| 12 | 軽快なマーチバンド |
| 13 | 激しいロック調 |
| 14 | 軽快な曲 その2 |
| 15〜29 | 各種曲 |
| 21 | BAL_2 (ダンジョン風) ← yschlp使用 |

---

## 重要な落とし穴 / Tips

### 固定小数点の誤差
座標計算など整数が必要な場面は `FLOOR()` を使う。
```basic
X = FLOOR(X / 8) * 8   ' 8ピクセル単位に揃える
```

### 行番号分岐は使えない
```basic
' × GOTO 100   ← エラー
' ○ GOTO @LABEL
@LABEL
  PRINT "OK"
```

### FOR の先判定
```basic
FOR I = 5 TO 1   ' ← 中身を1回も実行しない!
' STEP省略=STEP 1なので 5>1 でスキップ
```

### 文字列変数上限
文字列変数は4096個まで。配列 `DIM S$[100]` も個数に含まれる。

### INKEY$ の制限
TABはスペースに変換、BSは取得不可。全キーが必要なら `KEYBOARD` を使う。

### SAVE/RECVFILE の繰り返し
繰り返すと読み書きが遅くなることがある。

### 画面が表示されないとき
```basic
ACLS   ' 描画環境をリセット
```
それでも駄目なら `COLINIT` や `CHRINIT` で色・キャラを初期化。

### BGMと効果音の同時発音
最大16音。PSGは別カウント。超えると古い音から消える。

---

## TALKコマンド (音声合成)

```basic
TALK "カナ文字列"
' コマンド: ' (アクセント), / (区切り), | (フレーズ区切り)
'          _ (一時停止), . (文末), ? (疑問), ! (驚き)
' @H N   イントネーション (0=標準, 1=ギャル, 2=外人, 3=関西弁)
' @S N   話者 (0=若い男, 1=若い女, 2=男, 3=女, ... 11=大男)
' @T N   速度 (0〜1000)
' @V N   音量 (0〜80)
' @E N   感情 (0=怒, 1=ビジネス, 2=穏, 3=落胆, ... 16=歌)
```

---

## 追加命令（YOUSCOUT本編調査で判明）

### EXEC — 別プログラムの実行

```basic
EXEC "プログラム名"
' 別のPRGファイルを実行して戻ってくる（サブプログラム呼び出し）
' RESULT: TRUE=正常終了, FALSE=エラー
' 呼び出し元⇔呼び出し先の引数渡しは MEM$ 変数を使う

' 例: YOUSCOUT → YSCHELP の呼び出し
MEM$ = "hlp_start,@HLP_START_JA,hlp_lang,JA"
EXEC "YSCHELP"
IF RESULT != TRUE THEN PRINT "Error!": STOP
```

### WAIT — フレーム待機

```basic
WAIT N   ' N フレーム待機 (1フレーム = 1/60秒)
WAIT 60  ' 1秒待機
WAIT 10  ' 約0.17秒
```

### COLSET — カラーパレット設定

```basic
COLSET "BG", パレット番号, RGB文字列
COLSET "SP", パレット番号, RGB文字列
COLSET "GRP", パレット番号, RGB文字列
' RGB文字列: "RRGGBB" (16進6文字)
' 例:
COLSET "BG", 2, "0000FF"   ' パレット2を青に
COLSET "GRP", 15, "FFFFFF" ' パレット15を白に
```

### PNLTYPE — 下画面パネルの設定

```basic
PNLTYPE "OFF"       ' パネルを非表示
PNLTYPE "KEYBOARD"  ' キーボードを表示
PNLTYPE "CONSOLE"   ' コンソールを表示
```

### KEY — ファンクションキー設定

```basic
KEY 番号, "文字列"
' ファンクションキー（F1〜F5）に文字列を割り当て
' CHR$(13) = Enterキー相当
KEY 1, "LIST "        ' F1でLISTコマンド
KEY 3, "FOR A=0 TO FSP:?FSTACK$[A]:NEXT" + CHR$(13)  ' デバッグ用
```

### CLEAR — 変数の初期化

```basic
CLEAR   ' 全変数をクリア（プログラム開始時に使用）
```

### SHUFFLE_CARDS（JRF独自関数）

```basic
' ycconst.prg / youscout.prg で定義
' カード文字列をカンマ区切りでシャッフル
R$ = "A01,A02,...,A21": GOSUB @PUSH_RS
GOSUB @SHUFFLE_CARDS
' → R$ にシャッフルされたカード文字列
```

---

## YOUSCOUT 本編固有の定数（trtconst.prg / yscconst.prg）

### カード文字列形式

```
"A01U"  大アルカナ01番 正位置 (U=Upright)
"A01R"  大アルカナ01番 逆位置 (R=Reversed)
"S03"   スペード3
"D14"   ダイヤ14（キング相当）
"H01"   ハートA
"C11"   クラブJ（= カバレロ、宮廷カード設定による）
""      空スロット
```

### ゲームボード座標（SPRITE位置）

```basic
' カード 36×56px、64×64pxスプライト
' CARD_X[0..5]: ボード上6スロットのX座標
' CARD_Y[0..5]: ボード上6スロットのY座標
' CARDS_X[6..7]: 小アルカナ置き場X
' CARDS_Y[6..7]: 小アルカナ置き場Y
```

### GRPファイル一覧（本編用）

| 定数 | ファイル名 | 内容 |
|------|-----------|------|
| `GRP_FILE_A$` | `JRFTRT_A` | 大アルカナ正位置（A01-A21、A00/A13除く）|
| `GRP_FILE_R$` | `JRFTRT_R` | 大アルカナ逆位置（ST_UREV=1 のとき）|
| `GRP_FILE_S/D/H/C$` | `JRFTRT_S/D/H/C` | 小アルカナ正位置 |
| `GRP_FILE_RS/RD/RH/RC$` | `JRFTRTRS/RD/RH/RC` | 小アルカナ逆位置 |
| `GRP_FILE_T$` | `JRFTRT_T` | タイトル背景GRP |
| `CHR_FILE_B$` | `JRFTRT_B` | BGキャラ（BGU1にLOAD）|
| `CHR_FILE_S7$` | `JRFTRTS7` | 64×64px カードSPRITE |
| `CHR_FILE_S4/5/6$` | `JRFTRTS4/5/6` | その他SPRITEキャラ |

※ `TAROT_BASE$ = "JRFTRT"` は jrftrt_p.prg で定義。
