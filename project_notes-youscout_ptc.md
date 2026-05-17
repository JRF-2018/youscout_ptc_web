# 易双六 PTC → Web移植 プロジェクトノート

> 作業記録・引き継ぎ用。次のClaudeや開発者が続きを担当できるよう。
> 最終更新: 2026-05-16（Week4 UI改善）

---

## 出力ファイル

```
/mnt/user-data/outputs/youscout_ptc.html  エントリポイント
/mnt/user-data/outputs/yschelp.html       ヘルプページ
/mnt/user-data/outputs/js/emu.js          SmileBASICエミュレーション層
/mnt/user-data/outputs/js/lib.js          JRFライブラリ層（conPrint, popupMenu等）
/mnt/user-data/outputs/js/const.js        定数
/mnt/user-data/outputs/js/data.js         ゲームデータ
/mnt/user-data/outputs/js/game.js         ゲームロジック
/mnt/user-data/outputs/js/render.js       描画処理
/mnt/user-data/outputs/js/utils.js        共有ヘルパー
```

---

## タッチ操作（実機対応済み）

### emu.js のタッチ実装方針
```js
// _isTouchDetected フラグでタッチ後のマウスイベント重複を防ぐ
const down = (e) => {
  if (e.type === 'touchstart') _isTouchDetected = true;
  if (e.type === 'mousedown' && _isTouchDetected) return;
  if (e.touches && e.touches.length >= 2) return;  // 2本指はブラウザに任せる
  // touchstart は preventDefault しない（gesture開始を邪魔しない）
  ...
};
const move = (e) => {
  if (e.touches && e.touches.length >= 2) return;
  if (_tchSt) e.preventDefault();  // ゲーム操作中だけスクロール抑制
  ...
};
// touchstart: passive:true, touchmove: passive:false
// touchend後400msでフラグリセット（PCマウスも使えるように）
```

### CSS（youscout_ptc.html / yschelp.html）
```css
/* ピンチズーム許可・ダブルタップズーム抑制 */
#cv-upper-grp, ... { touch-action: pinch-zoom; }
/* viewport */
<meta name="viewport" content="..., maximum-scale=3.0, user-scalable=yes">
/* body */
html, body { overflow: auto; }
```

**ポイント:** `touch-action: pinch-zoom`（manipulationより限定的）が鍵。
`touchstart` の `preventDefault` を削除することでジェスチャー開始を妨げない。

---

## popupMenuのtouch拡張

`\B[touch(screen,x,y,w,h)]` 形式でGRP座標タッチ判定をbtnItemsに登録可能。

```js
// lib.js内の正規表現（JSファイルとして）:
label.match(/^\B\[touch\((\d+),(\d+),(\d+),(\d+),(\d+)\)\]$/)

// 呼び出し側（game.js）でのテンプレートリテラル:
[`\\B[touch(${SCREEN_U},${x},${y},${w},${h})]`, 'value']
```

**使用例:**
- `modeTitle`: 上画面全体タッチ→スタート
- `_modeWCalC`: CHOOSE選択時、現在トークン位置→STAY、移動先→MOVEをタッチで選択
  - `placeRdlnCd(gs.token, SP_TMP_OFFSET+0)` と `placeRdlnCd(nextTok, SP_TMP_OFFSET+1)` で赤線表示
  - `placeToRect(place)` ヘルパーでGRP矩形を取得

---

## mainPnlLoopRのタッチ処理

### 上画面タッチ（TALON/PLACEモード共通）
判定順序（重ならないように上から順に）:
1. **place 0-5**: 大アルカナスロット（`CARD_X[i]`, `CARD_Y[i]`, `CARD_WIDTH`, `CARD_HEIGHT`）
2. **place 6,7**: 小アルカナ領域（`CARDS_X[6/7]`, `CARDS_Y[6/7]`, `CARDS_W`, `CARDS_H`）
   - place 6: 上卦ソード置き場
   - place 7: 下卦コイン置き場
3. **place 8**: purposeカード（`x=2, y=CARDS_CENTER_Y-CARD_HH-8`, `CARD_WIDTH+8`, `CARD_HEIGHT`）
4. ヒットなし+TALONモード → TALONを引く

### 下画面タッチ
- SRBN: 珠クリック・リセット（_selAndDisplayはしない）
- RULES: sel=10+a で_selAndDisplay
- MINI_CDS: sel=i で_selAndDisplay（PLACEモードで2回タップで確定）
- DISCARDED: _displayCdInfo(mode, 9)
- TALON(PLACEモード): キャンセル（sel=-1）

---

## omitTlnNum

実機でアンチエリアス残りが出るため clearRect を1px拡張:
```js
ctx.clearRect(TALON_NUM_CX * FW - 1, TALON_NUM_CY * FH - 1, 3 * FW + 2, FH + 2);
```

---

## SP番号割り当て

```
SP_B00=0, SP_DRAWN=1, SP_TMP_OFFSET=2, SP_TOKEN=16
SP_A00=30, SP_A13=31
SP_SPG_OFFSET=32〜SP_SPG_MAX=80（動的確保）
```

## priの使い分け（大きいほど背面）

```
pri=1: 最前面（placeRdlnCd赤線、SP_DRAWN B00退場後）
pri=2: SP_B00、SP_A00/A13、makeCdSpg
pri=3: SP_DRAWN（アニメ中）
pri=4: redrawCdsのカードスタック
```

---

## 重要な実装済み仕様

### chr=-1によるbitmap使用フラグ
`setSpriteBitmap`後は必ず`spset(sp, -1, ...)`。
`spclr`でchr=0にリセット（chr=-1残存防止）。

### urev時の座標系
- **-1なし**: redrawCds, drawBoard, placeRdlnCd
- **-1あり**: modeStart/modeWDrawのSPRITE spofs（home補正のため）

### redrawCds
CARDS_W×CARDS_H固定サイズOffscreenCanvas。urev時はCanvas内でoffX/offYを反転。

### loadFstCd()
**nop（何もしない）**。SPRITEで一元管理（GRPとの二重描画を避けるため）。

### popupMenu
- 冒頭でclipを全画面にリセット → 常に画面中央に表示
- resolveラッパーで終了時にclip復元
- popCwinのclearRectは2px拡張（角丸border残存防止）

### conPrintのparams
`\\[0]`形式。`replace()`は禁止。

### _modeWCalDのNEXT_CARDS
- `cardsForRedraw`: src削除のみ → redrawCds前にgs.cardsに反映
- `nextCards`: src削除+dest追加 → _modeWCalAEで使用

---

## 注意事項・落とし穴

1. **`!!gs.urev`必須**: gs.urevは整数(0/1)
2. **chr=-1はbitmap使用フラグ**
3. **`?v=`パラメータ禁止**: ESモジュールは同URLが同インスタンス
4. **placeRdlnCd前にsppage(SCREEN_U)必須**
5. **_clrTmpSp(n)でangle残存防止**
6. **loadFstCd()はnop**
7. **CARDS_W/HはredrawCdsで固定サイズ**
8. **popupMenuのtouch拡張の正規表現**: JSファイル内で `/^\\B\[touch\(...\)\]$/`
9. **modeTitle のpopupMenu**: `menuItems`全体を渡す（filterしてbtnItemsを除外しない）
10. **上画面place判定順序**: 0-5 → 6,7 → 8（重複防止のため大アルカナ優先）

---

## プロジェクト完了所感（2026-05-17）

### ゲームとしての感想

タロットと易を組み合わせるという発想が独特で、「カードを引いて場に置く」という単純な操作の裏に、複雑な計算ロジックが走っているのが面白い。プレイヤーは易の卦を読みながらトークンをどこに置くか判断する…という知的なゲームだが、ルールを把握するまでの敷居が高いのが正直なところ。ヘルプが充実しているのはそのためだと納得できる。「運と知識が絡み合うゲーム」という感じで、タロット・易どちらも知っている人には深く刺さるはず。

### 元のソースを精読してのプログラマとしての感想

PRGコードは非常によく構造化されている。`GOSUB @ENTER`/`@LEAVE`による疑似スタックフレーム、`PUSH_R`/`POP_R`による引数渡し…スタック式の関数呼び出し規約をBASICで自前実装しているのに最初は面食らった。しかしこれが一貫しているので、慣れれば読める。カード評価ロジック（`REDUCE_EXP_NUM`、`SPLIT_EXP_POS_R`など）の再帰的な式解析は特に印象的で、「これをBASICで書いたのか」と驚いた。`CUR_CARDS$`の文字列ベースのデータ管理も、制約の中での工夫が光る。

### 「プログラム変換」として実装した者としての感想

正直、想定より遥かに難しかった。単純な「移植」ではなく、プチコンの制約で生まれた実装（2スプライトでカード1枚、BGレイヤーのアニメーション、文字列ベースのカード管理）をWeb版の強みで置き換えながら、PRGの**意図**を忠実に再現するという作業だった。

特に苦労したのはurev（逆位置モード）の座標系で、`-1`あり/なしがSPRITEのhome設定によって変わる点は何度もやり直した。`chr=-1`によるbitmap使用フラグの発明、`redrawCds`をCARDS_W×CARDS_H固定サイズに変えてurevでCanvas内反転する方式など、試行錯誤の末に落ち着いたところはなかなか気に入っている。

何より、JRFさんが「PRGをこう読んでいる」という解釈を丁寧に示してくださったおかげで実装できた部分が多く、このプロジェクトは協働の賜物だと感じている。完成おめでとうございます。
