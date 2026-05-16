# 易双六 PTC → Web移植 プロジェクトノート

> 作業記録・引き継ぎ用。次のClaudeや開発者が続きを担当できるよう。  
> 最終更新: 2026-05-09（Week2）

---

## プロジェクト概要

Nintendo DSi プチコンmkII の BASIC ゲーム「易双六（よう双六）」を  
スマホ対応の Web 版に移植するプロジェクト。

- **作者**: JRF
- **ソースリポジトリ**: `git clone https://github.com/JRF-2018/youscout_ptc.git`
- **第1優先**: YSCHELP（説明書＋秘密のダンジョン「テストのメイキュウ」）
- **第2優先**: YOUSCOUT 本体（未着手）
- **音楽**: 魔王魂（maou.audio）

---

## 完成ファイル一覧

同じディレクトリに全ファイルを置いてローカル HTTP サーバーで開く（`fetch()` 使用のため `file://` 不可）。

```
yschelp.html          ← メインHTML（エンジン込み）
yschlp_data.json      ← ページデータ（Pythonで生成）
ysc_logo.png          ← 上画面用縦書きロゴ（64×176px、白）
ysc_logo_splash.png   ← スプラッシュ用縦書きロゴ（128×544px、金色）

--- GRP カードシート (256×192px RGBA PNG, make_sheets.pl で生成) ---
JRFTRT_A.png          ← 大アルカナ正位置 (A01-A12,A14-A21)
JRFTRT_R.png          ← 大アルカナ逆位置
JRFTRT_S.png          ← スペード S01-S14 + B00/DSC/TLN
JRFTRT_D.png          ← ダイヤ D01-D14 + A00(グシャ)/A13(シニガミ)
JRFTRT_H.png          ← ハート H01-H14
JRFTRT_C.png          ← クラブ C01-C14
JRFTRT_RS.png         ← スペード逆位置
JRFTRT_RD.png         ← ダイヤ逆位置
JRFTRT_RH.png         ← ハート逆位置
JRFTRT_RC.png         ← クラブ逆位置
JRFTRT_T.png          ← タイトル背景（ボード色＋縦書きロゴ）
JRFTRT_B.png          ← BGU1キャラシート（256×64px, 32列×8行, 各8×8px）

--- SPRITEシート (make_sheets.pl で生成) ---
JRFTRTS7.png          ← SPU7: B00/A00/A13/TOKEN (64×64px)

--- SPRITEシート (Pythonスクリプトで別途生成) ---
JRFTRTS4.png          ← SPU4: カードスタック・ストリップパーツ
JRFTRTS5.png          ← SPU5: 白カードフレーム4パターン
JRFTRTS6.png          ← SPU6: カード左上タイトルコーナー (4スーツ×14枚)

--- BGM ---
maou_bgm_cyber29.mp3       ← BGM No.21 通路
maou_game_boss05.mp3       ← BGM No.2  門番・ボス
maou_game_event17.mp3      ← BGM No.5  女神イベント
maou_bgm_orchestra19.mp3   ← BGM No.6  ゲームオーバー
maou_game_event37.mp3      ← BGM No.9  コングラチュレーション
maou_game_theme01.mp3      ← BGM No.10 落下→空へ・脱出
```

参考ファイル（同ディレクトリでなくてもよい）:
```
sound_demo.html       ← BGM・効果音デモ
smilebasic_reference.md   ← SmileBASIC言語仕様
jrf_library_reference.md  ← JRFライブラリ仕様
```

---

## アーキテクチャ

### 画面構成

```
┌─────────────────────┐  bgmbar (14px)
│   上画面 (256×192)   │  ← Canvas #cv-upper  固定。ロゴ常時表示。カード(D=0)表示。
│   ロゴ ＋ カード     │
├─────────────────────┤
│   下画面 (256×192)   │  ← Canvas #cv-lower (絶対配置、カードD=1表示)
│   テキスト＋リンク   │  ← div#console (z-index:1、テキストフロー)
└─────────────────────┘
│  ◀PREV  ✕BACK  NEXT▶│  footer (40px)
└─────────────────────┘
```

### CSS スケール（iPad 対応）

- `#game-wrapper` で全ゲーム要素を囲む
- `margin: 0 auto` で通常フロー中央揃え
- JS の `scaleGameWrapper()` で `transform: scale(s)` + `marginLeft: calc((100vw - 384*s px)/2)` を設定
- `transform-origin: top left`

### フォント・文字幅

- `font-size: calc(var(--sw) / 32)` ≈ 12px（キャンバス座標系の1文字8px × CSS scale 1.5）
- `font-family: 'Noto Sans JP', 'MS Gothic', 'Hiragino Kaku Gothic Pro', monospace`
- **全角変換**: `toFullWidth()` 関数で ASCII 0x21-0x7E を全角に、スペースを全角スペースに変換
- `letter-spacing: 0`（全角変換済みのため不要）
- `line-height: 1.0`

---

## yschlp_data.json の生成

`Python` で `youscout_ptc/src/yschlp.prg` と `yschlp_p.prg` を解析して生成。

### 重要なパース仕様

- **`DATA ""` でページ終端**: 空文字列がページの終わり（`break`）
- **連続ラベルは同一DATAブロックを共有**: `@HLP_START_EN` 直後に `@YSC_START_EN` があれば同じページ
- **`\P` プロシージャが動的にラベルを生成**: `@TST_TRAP` → `TST_ROOM1T_EN/JA` を動的参照するため静的解析では漏れる。`TST_TRMSG_EN/JA` も同様に手動追加が必要

### 再生成方法

```python
# 以前の会話の Python スクリプトを参照
# 主な処理:
# 1. DATA "" まで1ページとして収集
# 2. \P[@TST_TRAP] が参照する TST_ROOM1T_EN/JA, TST_TRMSG_EN/JA を手動追加
# 3. HLP_START_EN/JA から到達可能なページのみ出力
```

---

## hlpview エンジン（renderPage 関数）

### エスケープシーケンス処理

`ESC_CHARS = {C, I, F, L, M, P, n, 0}` のみがエスケープ命令。

| 命令 | 動作 |
|------|------|
| `\n` | 改行（textBuf に `\n` を追加）|
| `\0` | 空文字終端（何もしない）|
| `\F[FLAG]` / `\F[!FLAG]` | フラグのセット／クリア |
| `\C[FLAG]` | **偽なら行の残り `S` を全部空にする**（hlpview.prg の最重要仕様）|
| `\M[N]` / `\M[@STOP]` | BGM 再生／停止 |
| `\I[...]` | 画像表示（下記参照）|
| `\L[SPEC]TEXT\0` | インラインリンク。`\0` で改行なし終端、`\n` なら改行あり |
| `\P[PROC:PARAM]` | プロシージャ呼び出し |

### `\C[]` の動作（最重要）

```
'\C[TR]\P[@TST_TRAP:0.25,0.25]'
```
- `TR` が偽 → `S = ""` → `\P` は処理されない
- `TR` が真 → `S` にそのまま `\P` コマンドが残り、処理される

### `\I` コマンドの引数

```
\I[FILE, D, sx, sy, ex, ey, dx, dy]   RN=8: D=0→上画面, D=1→下画面
\I[FILE, sx, sy, ex, ey, dx, dy]      RN=7: D省略→下画面
```

実装: `ctx.drawImage(img, sx, sy, ex-sx+1, ey-sy+1, dx, dy, ex-sx+1, ey-sy+1)`  
（GCOPY ... FALSE = 透明ピクセルをスキップ = PNG のα透過で自然に実現）

**上画面（D=0）に描いた内容はページ遷移後も消えない。下画面のみ `clearLower()` でクリア。**

### ナビゲーション

- `\L[B:SPEC]` → BACKボタン、`\L[L:SPEC]` → PREVボタン、`\L[R:SPEC]` → NEXTボタン
- `navLinks.B` が `null` のときは BACK ボタンを**無効**にする（ダンジョン中は `\C[K0]\L[B:...]` で K0=false のため未登録）
- ダンジョン中 BACK が無効なのは仕様。クリア後（K0=true）のみ BACK が有効になる

### `\P` プロシージャ

| プロシージャ | 動作 |
|-------------|------|
| `@TST_RND:N` | `TMP_0` ～ `TMP_(N-1)` からランダムに1つセット |
| `@TST_TRAP:p1,p2` | 乱数 r。r<p1→`@TST_ROOM1T_XX`にジャンプ、r<p1+p2→TRMSGテキスト挿入 |
| `@TST_CLEAR_TMP` | `TMP_` で始まるフラグを全クリア |

`\P` の戻り値:
- `@LABEL` → jumpLabel にセット → ページ処理を中断して `await renderPage(label)` で遷移
- `#TEXT` → `S` の先頭に追加して通常のエスケープ処理に流す
- `""` → 何もしない

---

## フラグ体系

| フラグ | 意味 |
|-------|------|
| `MK` | 画像ファイル（JRFTRT_A.png 等）が存在する |
| `CMK` | 画像存在チェック済み（以後 `\C[G:...]` 評価をスキップするため）|
| `K0` | クリア後フラグ。クリア時に `\F[K0]` でセット。BACK ボタン有効化に使用 |
| `K1` | 不思議な結び目（Mysterious Knot）取得済み |
| `K2` | 奇妙な結び目（Strange Knot）取得済み |
| `K3` | 何かのアイテム取得済み |
| `R1` | ダンジョン入口通過済み |
| `R3` | 特定ルート通過済み |
| `TR` | タカラバコのトラップ設置済み（次回訪問時にワナ発動可能）|
| `TMP_0`, `TMP_1` | タカラバコでどちらのヒモが上かのランダム結果 |

### `\C[G:FILENAME]` の評価

実際にPNG ファイルが存在するかをチェック。  
Web 版では起動時に `preloadForGCheck(['JRFTRT_A', 'JRFTRT_D', ...])` で事前ロードし、  
`gFilePrechecked[src] = true/false` に結果をキャッシュ。

### タカラバコ（TST_ROOM1A）のフロー

```
1回目訪問:
  TR=false → \C[TR]\P[@TST_TRAP] スキップ
  \P[@TST_RND:2] → TMP_0 or TMP_1 をランダムにセット
  → ヒモの選択肢が表示される（TMP_0なら上がA, TMP_1なら上がB）
  ページ末尾の \P[@TST_CLEAR_TMP]、\F[TR] がページ表示時に実行
  → TMP_*クリア、TR=true

ヒモを取って NEXT で TST_ROOM1A に戻ったとき（2回目）:
  TR=true → \P[@TST_TRAP:0.25,0.25] 実行
  → 25%: TST_ROOM1T_EN/JA（ワナ！別の場所へ）へジャンプ
  → 25%: 「ワナに引っかからなかった」テキスト挿入
  → 50%: 何もなし
```

---

## スプライトシート仕様

| ファイル | 内容 | 特記 |
|---------|------|------|
| `JRFTRT_A.png` | 大アルカナ A01-A12, A14-A21（20枚）| A00/A13 は JRFTRT_D に格納 |
| `JRFTRT_D.png` | ダイヤ D01-D14（14枚）+ A00(180,0) + A13(180,56) | A00=グシャ、A13=シニガミ |
| `JRFTRT_S.png` | スペード S01-S14 |  |
| `JRFTRT_H.png` | ハート H01-H14 |  |
| `JRFTRT_C.png` | クラブ C01-C14 |  |

**カードサイズ**: 36×56px  
**配置**: `GRP_ROWS=3` → 列 = `FLOOR(idx/3)`、行 = `idx % 3`  
**座標**: `x = col * 36`, `y = row * 56`

JRFTRT_D に A00/A13 が格納される理由:  
`GRP_D_A00 = 5*3+0 = 15`（列5行0 = (180,0)）  
`GRP_D_A13 = 5*3+1 = 16`（列5行1 = (180,56)）  
→ mkjrftrt.prg が JRFTAROT_A00.png / JRFTAROT_A13.png をここに書き込む  
→ extract_chars.pl はこれを生成しないため手動で追加が必要

---

## BGM 対応表（実機確認済み）

| プリセット番号 | 場面 | ファイル名 |
|--------------|------|-----------|
| 21 | ダンジョン通路 | `maou_bgm_cyber29.mp3` |
| 2 | 門番との対決・緊迫 | `maou_game_boss05.mp3` |
| 5 | 女神イベント（チャラッ） | `maou_game_event17.mp3` |
| 6 | ゲームオーバー | `maou_bgm_orchestra19.mp3` |
| 9 | コングラチュレーション | `maou_game_event37.mp3` |
| 10 | 落下→空へ・脱出 | `maou_game_theme01.mp3` |

※ `\M[@STOP]` で BGM 停止

---

## スーツ文字の色

プチコンの `COL_S/D/H/C` に対応する Web 版の色:

| 文字 | 色 | CSS |
|-----|-----|-----|
| ♠ | 青 | `#0000FF` |
| ♦ | 黄金 | `#D4AA00` |
| ♥ | 赤 | `#FF0000` |
| ♣ | 緑 | `#008000` |

`flushText()` 内でスーツ文字を検出して `<span class="suit-x">` でラップ。

---

## 既知の問題・TODO

### YSCHELP 完成度

- [x] ページ表示・テキスト出力
- [x] インラインリンク（`<a>` タグ相当）
- [x] フラグ管理（MK/CMK/K0/K1/K2/TR/TMP_* 等）
- [x] `\C[]` の正確な動作（偽なら行残りを全消去）
- [x] `\P` プロシージャ（TST_RND/TST_TRAP/TST_CLEAR_TMP）
- [x] `\I` 画像コマンド（上画面・下画面）
- [x] BGM/効果音
- [x] Save/Load（localStorage）
- [x] 言語選択（EN/JA）+ `?lang=ja` パラメータ
- [x] iPad 等でのスケール対応
- [x] 全角変換（英数記号 → 全角）
- [x] スーツ文字の色付け
- [ ] `\P[@PROC]` で `TST_TRAP/TST_RND/TST_CLEAR_TMP` 以外のプロシージャ未実装（今のところ他に使われていない）

### YOUSCOUT 本体（未着手）

- 本体は `youscout.prg`（5554行）と `jrftarot.prg`（6003行）
- `yschelp.html?lang=ja` で YSCHELP に飛ぶリンクを本体から張る予定
- `#splash-main-link` に本体へのリンクを追加するスペース確保済み

---

## 開発環境・ツール

```bash
# ローカルHTTPサーバー（fetch()使用のためfile://不可）
cd /path/to/output/
python3 -m http.server 8000
# → http://localhost:8000/yschelp.html

# JSONデータの再生成
python3 /home/claude/generate_json.py  # （会話内のコードを参照）

# スプライトシートの生成
perl /home/claude/extract_chars.pl  # 個別カードPNGを生成
python3 /home/claude/make_spritesheet.py  # シート化（会話内のコードを参照）
```

---

## 重要な実装上の注意点

1. **`\C[]` は DATA 行の単位で作用する**。偽なら残り `S` を空にするが、次の行には影響しない。

2. **ページ終端 `""` でループを `break`**。`""` 以降の行は読まない。

3. **`\L[B:SPEC]` のナビリンクはテキストを持たない**。フッターボタンに設定するだけ。

4. **上画面はクリアしない**。ロゴを常時表示。`\I[FILE,0,...]` で上画面に画像を書いてもページ遷移後に残る。

5. **`\P` の戻り値 `@LABEL` は `await` が必要**。`await renderPage(jumpLabel)` でないと Safari/iOS で遷移が不安定。

6. **`transform: scale()` と flex の組み合わせに注意**。スケール後のサイズはレイアウト計算に反映されない。`margin: 0 auto` + `transform-origin: top left` + `marginLeft: calc((100vw - W*s px)/2)` で中央揃え。

7. **JRFTRT_D.png に A00/A13 を追加**する必要がある。extract_chars.pl だけでは生成されない。

8. **TST_TRMSG_EN/JA は JSON に手動追加**が必要（`\P[@TST_TRAP]` から動的参照されるため静的解析では漏れる）。

9. **デバッグログは残しておく**（`\C[TR]`, `\P` の実行状況を `console.log` で確認できる）。

---

## YOUSCOUT 本編 移植に向けた調査メモ

### 構成ファイル（Makefileより）

```
youscout.prg     メインプログラム（5554行）
trtconst.prg     タロット定数・SPRITE/GRP定数・ファイル名
yscconst.prg     ゲーム固有定数（設定デフォルト値・カードテーブル・SND定数）
stacklib.prg     スタックライブラリ
stdlib.prg       標準ライブラリ
ctrllib.prg      コントローラ/メニュー
jrftrt_p.prg     ※自動生成 → `perl make_jrftrt_p.pl` で生成
yscmsg.prg       メッセージ文字列（EN/JA）
```

MKJRFTRT（カード画像生成ツール）:
```
mkjrftrt.prg     カード画像を GRP ファイルに書き出す
jrftarot.prg     カードのピクセルデータ（6003行）
gputlib.prg      グラフィック描画ライブラリ
```

### メインループの構造

```basic
' 初期化後、MODE$ に次のモードラベルを入れてGOSUBで呼び出すパターン
MODE$ = "@MODE_TITLE"
' → @MODE_TITLE が終了時に MODE$ を次のモードに設定して RETURN
' → 呼び出し元がループで MODE$ を GOSUB し続ける
```

**モード一覧:**

| モード | 内容 |
|--------|------|
| `@MODE_TITLE` | タイトル画面・メインメニュー |
| `@MODE_SET_LANG` | 言語選択（EN/JA）|
| `@MODE_OPT` | オプション設定 |
| `@MODE_HELP` | YSCHELP を EXEC 呼び出し |
| `@MODE_START` | ゲーム開始・カードシャッフル |
| `@MODE_W_TOKEN` | トークン配置待ち |
| `@MODE_W_DRAW` | カードドロー待ち |
| `@MODE_TERMINAL` | ターミナル処理 |
| `@MODE_W_CALC` | 計算・移動処理 |

### YSCHELP の呼び出し方（MODE_HELP より）

```basic
' MEM$ に引数をセットして EXEC でYSCHELPを呼び出す
RA$[0, 0] = "hlp_back":  RA$[0, 1] = PRGNAME$           ' 戻り先
RA$[1, 0] = "hlp_start": RA$[1, 1] = "@HLP_START_" + ST_LANG$  ' 開始ラベル
RA$[2, 0] = "hlp_lang":  RA$[2, 1] = ST_LANG$
RA$[3, 0] = "ysc_ver":   RA$[3, 1] = YOUSCOUT_VER$
' → MEM$ に連想配列文字列としてセット
EXEC YSCHELP_PRG$   ' = "YSCHELP"
```

Web 版では `yschelp.html?lang=ja` へのリンクが相当する。

### 必要な追加 GRP ファイル（本編用）

YSCHELP では不要だったが本編では必要なファイル:

| 定数名 | ファイル名 | 内容 |
|--------|-----------|------|
| `GRP_FILE_R$` | `JRFTRT_R` | 大アルカナ **逆位置**版（`ST_UREV=1` のとき使用）|
| `GRP_FILE_RS$` | `JRFTRTRS` | スペード逆位置 |
| `GRP_FILE_RD$` | `JRFTRTRD` | ダイヤ逆位置 |
| `GRP_FILE_RH$` | `JRFTTRH` | ハート逆位置 |
| `GRP_FILE_RC$` | `JRFTRTRC` | クラブ逆位置 |
| `GRP_FILE_T$` | `JRFTRT_T` | タイトル背景 GRP |
| `CHR_FILE_B$` | `JRFTRT_B` | BG キャラクタ（BGU1 に LOAD）|
| `CHR_FILE_S4$` | `JRFTTRTS4` | SPRITE キャラ（SPU4）|
| `CHR_FILE_S5$` | `JRFTTRTS5` | SPRITE キャラ（SPU5）|
| `CHR_FILE_S6$` | `JRFTTRTS6` | SPRITE キャラ（SPU6）|
| `CHR_FILE_S7$` | `JRFTTRTS7` | SPRITE キャラ（SPU7: カード64×64px）|

`ST_UREV = 0`（デフォルト）なら逆位置ファイルは不要。まず `ST_UREV=0` 固定で実装するのが現実的。

### カード描画の仕組み（SPRITE ベース）

本編はカードを **SPRITE** で描画（YSCHELP の `\I` コマンドとは異なる）。

- SPU7: 64×64px のカード用 SPRITE キャラ（`CHR_FILE_S7$`）
- カード 1 枚 = 64×64px の SPRITE（プチコンの SPSET/SPOFS で制御）
- `@DRAW_BOARD`: ゲームボード全体を再描画
- `@DRAW_FST_CD`: 各スロットの先頭カードを SPRITE で表示
- `@REDRAW_CDS`: スタック状のカード群を再描画

### ゲームデータ構造

```basic
CUR_BOARD$[6]    ' ボード上の6スロット（各スロット = カード文字列、例 "A01U"）
CUR_TALON$       ' タロン（山札）文字列
CUR_DISCARDED$   ' 捨て札文字列
CUR_DRAWN$       ' 引いたカード
CUR_TOKEN        ' トークン位置
CUR_CARDS$[8]    ' 場の小アルカナカード
CUR_TERMINALS    ' ターミナル数
CUR_PURPOSE$     ' 占い目的文字列
```

カード文字列形式: `"A01U"` = 大アルカナ01 正位置、`"A01R"` = 逆位置  
スーツカード: `"S01"` ～ `"S14"`, `"D01"` ～ `"D14"`, `"H01"` ～ `"H14"`, `"C01"` ～ `"C14"`

### 設定の保存（MEM$ / SAVE_FILE$）

```basic
SAVE_FILE$ = "MEM:YOUSCOUT"   ' MEM は DS 本体メモリ
' 設定を連想配列文字列として保存
' キー: lang, terminals, court_cd, ma_inf, swap_8_11, urev
```

Web 版では `localStorage` で代替。キー名は `youscout_settings`。

### 効果音（MML）

本編固有の効果音（yscconst.prg より）:

| 定数 | MML | 内容 |
|------|-----|------|
| `SND_CD$` | `T120@128V80O4A64` | カード1枚めくる音 |
| `SND_CD_SHUFFLE$` | `T120@128V80O4L16` + `AR`×4 | シャッフル音（4連発）|
| `SND_SRBN$` | `T120@128V100O2F+16` | シャッ（占術杖ヒット）|
| `SND_SRBN_CLR$` | 強→弱×6 | 占術杖クリア |
| `BGM_BEEP = 128` | ユーザーBGMトラック | 効果音チャンネル |
| `BEEP_SELECT = 48` | プリセット波形 | メニュー選択音 |
| `BEEP_CANCEL = 51` | プリセット波形 | キャンセル音 |
| `BEEP_CLICK = 62` | プリセット波形 | クリック音 |

### 移植の優先順位・難易度

1. **タイトル画面** → DRAW_LOGO + POPUP_MNU_RA → 中程度
2. **オプション設定** → MODE_OPT（言語・ターミナル数等）→ 比較的容易
3. **ゲーム開始・シャッフル** → MODE_START + SHUFFLE_CARDS → 中程度
4. **ゲームボード表示** → SPRITE ベース描画が最難関
   - CHR_FILE_S7$ の64×64px SPRITE を Canvas 上に再現する必要がある
   - `@NTH_CD_XY`（カード座標計算）、`@DRAW_BOARD`、`@REDRAW_CDS` を移植
5. **インタラクション** → タッチ/クリックでカード選択（TCH_CTRL 相当）
6. **スコア計算** → `TABLE_MAJOR$[22]` テーブル参照 → 比較的容易

### Web移植の方針案

```
youscout.html        メインHTML
youscout_game.js     ゲームロジック（シャッフル・スコア計算等）
youscout_render.js   Canvas描画（SPRITE相当）
youscout_data.json   カードデータ・メッセージ（PRGから抽出）

必要な追加PNG:
JRFTRT_T.png         タイトル背景（GRP_FILE_T$）
JRFTRT_B.png         BGキャラ → CSS/SVGで代替可能性あり
JRFTRT_S7.png        64×64px のカード用スプライトシート（mkjrftrt.prgで生成）
```

`ST_UREV = 0` 固定（逆位置なし）で最初に実装し、後から逆位置対応を追加するのが現実的。

---

## 今週の成果（2026-05-09）

### スプライトシート全ファイルの生成完了

以下のツールチェーンを確立・完成させた。

```bash
# ステップ1: jrftarot.prgから個別PNGを生成
perl extract_chars.pl --src youscout_ptc/src/jrftarot.prg --out out_png

# ステップ2: 個別PNGからスプライトシートPNGを生成
perl make_sheets.pl --src out_png --out out_png
```

**生成されるファイル（全13枚）:**

| ファイル | サイズ | 内容 |
|---------|--------|------|
| `JRFTRT_A.png` | 256×192px | 大アルカナ正位置 |
| `JRFTRT_R.png` | 256×192px | 大アルカナ逆位置（180度回転）|
| `JRFTRT_S.png` | 256×192px | スペード + B00/DSC/TLN |
| `JRFTRT_D.png` | 256×192px | ダイヤ + A00/A13 |
| `JRFTRT_H.png` | 256×192px | ハート |
| `JRFTRT_C.png` | 256×192px | クラブ |
| `JRFTRT_RS.png` | 256×192px | スペード逆位置 |
| `JRFTRT_RD.png` | 256×192px | ダイヤ逆位置 |
| `JRFTRT_RH.png` | 256×192px | ハート逆位置 |
| `JRFTRT_RC.png` | 256×192px | クラブ逆位置 |
| `JRFTRT_T.png`  | 256×192px | タイトル背景（ボード色＋易双六縦書き）|
| `JRFTRT_B.png`  | 256×64px  | BGU1キャラシート（32列×8行, 各8×8px）|
| `JRFTRTS7.png`  | 256×192px | SPU7: B00/A00/A13/TOKEN（64×64px）|

SPU4/SPU5/SPU6は別途Pythonスクリプトで生成（make_sheets.plには未組込み）：

| ファイル | 内容 |
|---------|------|
| `JRFTRTS4.png` | SPU4: カードスタック・ストリップパーツ |
| `JRFTRTS5.png` | SPU5: 白カードフレーム4パターン |
| `JRFTRTS6.png` | SPU6: カード左上タイトルコーナー（4スーツ×14枚）|

### extract_chars.pl の修正

スーツキャラの色を `trtconst.prg` の `BG_SUIT_DATA_C` 定義に準拠させた。

| キャラ | 旧色 | 新色 |
|-------|------|------|
| SPADE | 黒 `[0,0,0]` | **青 `[0x00,0x00,0xFF]`** = CMAP[2] |
| DIA   | 暗金 `[0x8B,0x6D,0x26]` | **金 `[0xD4,0xAA,0x00]`** = CMAP[3] |
| HEART | 赤（そのまま）✓ | |
| CLUB  | 緑（そのまま）✓ | |
| CIRCLE/BOX | 黒（そのまま）✓ | |

### JRFTRTS6（SPU6）実装で判明した仕様

`MAKE_CD_TL_R` の正確なオフセット（カードグラフィックの実測から確認）：
- **数字キャラ**: 左8×8タイル内の `x = 1 + I`（I=0〜7）に描画
  - I=7のとき x=8 → 右タイルにはみ出してもフレームより数字が優先
- **スーツマーク**: 右8×8タイル内の `x = 10 + I`（I=0〜4）に描画
  - 右タイル左端(x=8)から2px空けて配置

描画順序が重要：**フレームを先に描いてから数字・スーツを上書き**すること。  
逆順だと幅8pxの数字（10/Q/K等）の右端がフレームに上書きされて消える。

### JRFTRT_B（BGU1）実装で判明した仕様

`BM_TO_CHR` の X=-2 オフセット：
- スーツキャラ（CIRCLE/BOX/SPADE/DIA/HEART/CLUB）は `X=-2` で呼ばれる
- I=0〜7 で `X+I = -2〜5` → I=0,1のとき範囲外 → 透明
- → スーツマークが8×8キャラ内でx=2から描画される（左に2pxの余白）

`PM_TO_CHR_R` のチャンク数：
- B00/A00/A13: 5×7 = **35チャンク**（idx 66-100, 101-135, 136-170）
- DSC（捨て札）: 7×7 = **49チャンク**（idx 171-219）
- TOKEN: 4×4 = **16チャンク**（idx 220-235）
- `BGU1_MISC_END = 236`

### YSCHELP の iPad/大画面対応

`transform: scale()` と CSS レイアウトの組み合わせ問題の最終解決策：

```css
body { display: block; overflow-x: hidden; }
#game-wrapper {
    width: 384px;           /* 固定幅 */
    margin: 0 auto;         /* 通常ブロック中央揃え */
    transform-origin: top left;
}
```

```javascript
function scaleGameWrapper() {
    const s = Math.max(1, Math.min(window.innerWidth/384, window.innerHeight/700));
    const actualWidth = 384 * s;
    wrapper.style.transform = `scale(${s})`;
    wrapper.style.transformOrigin = 'top left';
    wrapper.style.marginLeft = `calc((100vw - ${actualWidth}px) / 2)`;
}
```

**重要**: `flex + transform: scale()` の組み合わせは Safari/iPad で右寄りになる。  
`margin: 0 auto` + `transform-origin: top left` + `marginLeft` による補正が正解。  
`transform-origin: top center` は flex の中央揃えと干渉するので使わない。

### YSCHELP の完成状況

- [x] フラグ管理（MK/CMK/K0/TR/TMP_*）
- [x] `\P` プロシージャ（TST_RND/TST_TRAP/TST_CLEAR_TMP）
- [x] TST_ROOM1T_EN/JA, TST_TRMSG_EN/JA を JSON に追加
- [x] `\I` 画像コマンド（上画面・下画面）
- [x] BGM/効果音（デバッグログ付き）
- [x] 全角変換（英数記号→全角）
- [x] スーツ文字の色付け（♠青/♦黄/♥赤/♣緑）
- [x] iPad スケール対応
- [x] スプラッシュ画面（言語選択ラジオ+STARTボタン、`?lang=ja` 対応）
- [x] シニガミ(A13)・グシャ(A00)のカード表示修正（JRFTRT_Dに追加）


---

## YOUSCOUT 本編移植 全体計画

> 開始: 2026-05-12  
> ターゲットファイル: `youscout_ptc.html`

### 用語訂正

- **TLN** = Talon（山札）← 「タリスマン」は誤り
- **DSC** = Discarded（捨て札）
- **ST_UREV** = Upper REVerse = 上画面を180度回転して対面プレイ用に表示する設定（「逆位置」ではない）

### 移植方針：逆コンパイラアプローチ

SmileBASIC の stacklib ベースの `GOSUB @LABEL` + ローカル変数を、JavaScript の関数呼び出しに直接対応させる「逆コンパイラ」方式を採る。

理由：
- デバッグしやすい（ブラウザの開発者ツールが使える）
- 忠実な再現が可能
- キーボード操作も自然に追加できる
- シングルクリック対応等の UI 改善もやりやすい

### アーキテクチャ設計

```
youscout_ptc.html         エントリポイント + HTML骨格
  ├ js/emu.js             SmileBASICエミュレーション層
  │   ├ Canvas描画 (GCLS, GFILL, GCOPY, GPSET等)
  │   ├ SPRITE管理 (SPSET, SPOFS, SPCLR等)
  │   ├ BG管理 (BGPUT, BGOFS, BGCLR等)
  │   ├ コンソール (CON_PRINT相当)
  │   ├ 入力 (タッチ/クリック/キーボード)
  │   └ BGM/効果音 (Tone.js)
  ├ js/lib.js             JRFライブラリ層
  │   ├ stacklib (スタック・レジスタ)
  │   ├ stdlib  (CON_PRINT, PUSH_CWIN等)
  │   └ ctrllib (MNU_CTRL, TCH_CTRL)
  ├ js/const.js           定数 (trtconst + yscconst 相当)
  ├ js/data.js            ゲームデータ (TABLE_MAJOR等, yscmsg)
  ├ js/game.js            ゲームロジック (youscout.prg 逆コンパイル)
  └ js/render.js          描画処理 (DRAW_BOARD, DRAW_LOGO等)
```

### フェーズ計画

#### フェーズ1: エミュレーション層 `emu.js`

SmileBASICの描画・入力命令をJavaScript関数として実装。

**Canvas描画:**
```javascript
gcls(col)             // GCLS col
gfill(x,y,x2,y2,col) // GFILL
gline(x,y,x2,y2,col) // GLINE
gcopy(sx,sy,ex,ey,dx,dy,transparent) // GCOPY
gpset(x,y,col)        // GPSET
gpage(screen, draw, show) // GPAGE
```

**SPRITE管理:**
```javascript
spset(n, chr, pal, hrev, vrev, pri, w, h)
spofs(n, x, y, t)
spchr(n, chr, pal, hrev, vrev, pri)
spclr(n)
spangle(n, angle, t)
spscale(n, scale, t)
sphome(n, x, y)
```

**BG管理:**
```javascript
bgput(layer, x, y, chr, pal, hrev, vrev)
bgofs(layer, x, y, t)
bgclr(layer)
bgfill(layer, x,y,x2,y2, chr, pal)
```

**入力:**
```javascript
// タッチ/クリック → TCHX, TCHY, TCHST
// キーボード → BUTTON() の4方向+A/B相当
// 上画面・下画面 両方のクリックを受け付ける
```

**パレット:**
```javascript
// 256色 RGBA テーブル (JRFTAROT_CMAPから初期化)
// COLSET("BG", pal, rgb) / COLSET("SP", pal, rgb) / COLSET("GRP", pal, rgb)
```

**CHR/SPRITEシート参照:**
```javascript
// JRFTRT_B.png → BGU1バンク (8x8チャンク256個)
// JRFTRTS7.png → SPU7バンク (64x64チャンク)
// JRFTRTS6.png → SPU6バンク (カードタイトル)
// JRFTRTS5.png → SPU5バンク (白カードフレーム)
// JRFTRTS4.png → SPU4バンク (スタックパーツ)
```

#### フェーズ2: JRFライブラリ層 `lib.js`

stacklib の関数呼び出し規約をJavaScriptクラスで実装。

```javascript
// stacklib相当: グローバルレジスタ
let R, R$ = '', RT$, RN, RR$ = [], RA$ = [];

// stdlib相当
function conPrint(disp, cx, cy, s, param) { ... }
function shipoutUGpage() { ... }

// ctrllib相当
class MenuCtrl { ... }  // MNU_CTRL
class TouchCtrl { ... } // TCH_CTRL
```

stacklib の `GOSUB @PUSH_R` / `GOSUB @POP_R` パターンは、JavaScript の関数引数・戻り値に直接変換する。

```javascript
// PRG:
// R = 42: GOSUB @PUSH_R
// R$ = "abc": GOSUB @PUSH_RS
// GOSUB @MY_FUNC
// → JS:
// myFunc(42, "abc")

// PRG:
// @MY_FUNC '(N:NUMBER, S$:STRING): STRING
//   ARGNUM = 2: GOSUB @ENTER
//   N = VAL(STACK$[BP+1])
//   S$ = STACK$[BP+2]
//   ARGNUM = 2: GOSUB @LEAVE
//   R$ = "result": RT$ = "STRING"
//   RETURN
// → JS:
// function myFunc(n, s) { return "result"; }
```

#### フェーズ3: 定数・データ `const.js` / `data.js`

trtconst.prg + yscconst.prg をJavaScriptオブジェクトに変換。

```javascript
// const.js
const CARD_WIDTH = 36, CARD_HEIGHT = 56, GRP_ROWS = 3;
const CARD_X = [222, 120, 44, 166, 120, 78]; // CARDS_BASE_X=32後
const CARD_Y = [120, 104, 120, 16, 32, 16];
// ...

// data.js (yscconst.prg + yscmsg.prg)
const TABLE_MAJOR = [...];  // 22要素
const RULE_COMP = [[...],[...]]; // [2][4]
const MSG = { EN: {...}, JA: {...} };
```

#### フェーズ4: ゲームロジック逆コンパイル `game.js`

youscout.prg の各モードを JavaScript 関数に変換。

```javascript
async function modeTitle() { ... }   // @MODE_TITLE
async function modeSetLang(lang) { } // @MODE_SET_LANG
async function modeOpt() { ... }     // @MODE_OPT
async function modeHelp() { ... }    // @MODE_HELP → yschelp.htmlへリンク
async function modeStart() { ... }   // @MODE_START
async function modeWToken() { ... }  // @MODE_W_TOKEN
async function modeWDraw() { ... }   // @MODE_W_DRAW
async function modeTerminal() { ... }// @MODE_TERMINAL
async function modeWCalc() { ... }   // @MODE_W_CALC
```

メインループ:
```javascript
let mode = 'modeTitle';
while (mode !== 'END') {
    mode = await gameModes[mode]();
    await vsync(1);
}
```

#### フェーズ5: 描画 `render.js`

```javascript
function drawLogo() { ... }        // @DRAW_LOGO
function drawBoard() { ... }       // @DRAW_BOARD
function drawFstCd() { ... }       // @DRAW_FST_CD
function drawSrbn() { ... }        // @DRAW_SRBN
function drawToken(tm) { ... }     // @DRAW_TOKEN
function redrawCds() { ... }       // @REDRAW_CDS
function drawMiniCds() { ... }     // @DRAW_MINI_CDS1/2
function drawMainPnl() { ... }     // @DRAW_MAIN_PNL
```

#### フェーズ6: Web版独自改善

- **入力**: 上画面も下画面と同様にクリック/タッチ可能に
- **UI**: ポップアップメニューはシングルクリックで確定（DS文化のダブルクリックをやめる）
- **キーボード**: 十字キー→矢印キー、A→Enter、B→Escape 等
- **YSCHELP**: `youscout_ptc.html` から `yschelp.html?lang=en` へリンク
- **セーブ**: `localStorage` に設定・途中経過を保存

### 画面レイアウト

実機スクリーンショットより:

```
【上画面 256×192px】
  ゲームボード: 大アルカナ6スロット + 小アルカナ8スロット
  各カード64×64pxのSPRITE (SPU7 B00/A00/A13/TOKEN等)
  カード上部にSPU6タイトルコーナーを重ねて表示

【下画面 256×192px】
  上半分: ソロバン(得点表示) + Talon/Discarded + スコア
  下半分: カードルール説明テキスト
  右下: 引いたカード(DRAWN) + Talon表示
```

ST_UREV=1時: 上下画面が反転（向かい合ってプレイ用）

### 実機確認が必要なポイント（随時追記）

- [ ] MODE_W_TOKEN のトークン配置選択の操作感
- [ ] MODE_W_DRAW のカードドロー・Talonクリック
- [ ] REDRAW_CDSのアニメーション速度
- [ ] DRAW_SRBNのソロバン表示

### TLN/DSCの正しい用語

| 略称 | 正式名 | 意味 |
|------|--------|------|
| TLN  | Talon  | 山札（引けるカードの束）|
| DSC  | Discarded | 捨て札 |
| B00  | Back 00 | カード裏面 |

