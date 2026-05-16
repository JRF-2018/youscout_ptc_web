# ヨウスコウ PTC Web バン

<!-- Time-stamp: "2026-05-16T10:40:22Z" -->

2013ネン ゴロ Nintendo DSi ノ [プチコンmkII](https://smileboom.com/special/ptcm2/) デ ツクラレタ タロットソリティア「[ヨウスコウ PTC](https://github.com/JRF-2018/youscout_ptc)」ヲ オモニ Claude サン ノ チカラ ニヨリ Web ニ イショク シタ。

ヨウスコウ PTC (YOUSCOUT_PTC) ハ ↓カラ プレイ デキル。

https://jrf-2018.github.io/youscout_ptc_web/youscout_ptc.html?lang=ja

ヨウスコウ ノ セツメイショ (YSCHELP) ハ  ↓カラ プレイ デキル。

https://jrf-2018.github.io/youscout_ptc_web/yschelp.html?lang=ja

「ヨウスコウ」ジタイ ハ スデニ [Web バン ガ アッタ](https://jrf-2018.github.io/youscout/youscout.html) ガ、コンカイ ノ モノ ハ スマホ ニ サイテキ ナ レトロゲーム トイウノガ ウリ。

ウエガメン タッチ ニ タイオウ シテイルノガ ジミ ニ オオキナ 変更点。タトエバ、タイトル ガメン で ウエガメン リョウイキ ニ タッチ スルト スタート デキル。

トコロデ、ジツハ YSCHELP ニハ カクシ ヨウソ トシテ ダンジョン ガ フクマレテイタ。

サイショ ニ ヒョウジ サレル「ヨウスコウ マニュアル」ノ ページ ノ 「エイゴ (English) マニュアル。」ノ「。」ヲ クリック スルト ナント、「テスト ノ メイキュウ」ニ イクコトガ デキル！

ナノデ、タダ ノ セツメイショ デハナク、ゲーム ニモ ナッテイル。モチロン、セツメイショ トシテモ ツクリコンダ。ホンペン ノ ヨウスコウ PTC トモドモ タノシンデ ホシイ。


# Youscout PTC Web Edition

"[Youscout PTC](https://github.com/JRF-2018/youscout_ptc)", a tarot solitaire game originally created around 2013 for [Petit Computer](https://smileboom.com/special/ptcm2/) on Nintendo DSi, has been ported to the web—primarily through the power of Claude.

You can play Youscout PTC (YOUSCOUT_PTC) here:

https://jrf-2018.github.io/youscout_ptc_web/youscout_ptc.html?lang=en

The manual (YSCHELP) is available here:

https://jrf-2018.github.io/youscout_ptc_web/yschelp.html?lang=en

While a [web version](https://jrf-2018.github.io/youscout/youscout.html) of "Youscout" already existed, this new release is featured as a retro game optimized specifically for smartphones.

Supporting touch inputs on the upper screen is a small but major update. For instance, tapping the upper screen area on the title screen will start the game.

By the way, YSCHELP actually contains a hidden feature: a dungeon.

If you click the period (.) at the end of "Japanese (ニホンゴ) manual." on the initial "YOUSCOUT MANUAL" page, you will be transported to the "Dungeon of Test"!

So, it is not just a manual, but a game in itself. Of course, I also put a lot of effort into making it a comprehensive guide. I hope you enjoy both the main game and the manual!


# 易双六PTC Web版

2013年ぐらいに Nintendo DSi の[プチコンmkII](https://smileboom.com/special/ptcm2/)で作られたタロットソリティア「[易双六PTC](https://github.com/JRF-2018/youscout_ptc)」を主に Claude さんの力により、Web に移植しました。

易双六PTC (YOUSCOUT_PTC) は↓からプレイできます。

https://jrf-2018.github.io/youscout_ptc_web/youscout_ptc.html?lang=ja

易双六の説明書 (YSCHELP) は↓からプレイできます。

https://jrf-2018.github.io/youscout_ptc_web/yschelp.html?lang=ja

「易双六」自体はすでに [Web 版があった](https://jrf-2018.github.io/youscout/youscout.html)のですが、今回のものは、スマホに最適なレトロゲームといったウリになります。

上画面タッチに対応しているのが地味に大きな変更点です。例えば、タイトル画面で上画面領域をタッチするとスタートできます。

ところで、実は YSCHELP には隠し要素としてダンジョンが含まれていました。

最初に表示される「ヨウスコウ マニュアル」のページの「エイゴ (English) マニュアル。」の「。」をクリックすると、なんと「テスト ノ メイキュウ」に行くことができるのです！

ですからただの説明書ではなくゲームにもなっています。もちろん、説明書としても作り込んではいました。本編の易双六PTC ともども楽しんでいただけるとうれしいです！


## プログラムの説明

Claude さんは、今回 Claude Sonnet 4.6 さんでした。`PURPOSE.md` が最初出した指示になります。

`smilebasic_reference.md` はプチコンmkIIの Smile Basic の仕様について今回使う分をまとめてもらったものなります。

`jrf_library_reference.md` は主に私の作ったライブラリの知見になります。

`project_notes-yschelp.md` と `project_notes-youscout_ptc.md` は今回のプロジェクトの知見になります。

`extract_chars.pl` は `git clone https://github.com/JRF-2018/youscout_ptc.git` したものからキャラクタなどを抽出するものです。

`make_sheets.pl` はキャラクタをまとめるものなのですが、網羅的でなくプログラムの生成に失敗した感じです。


## リンク

今回の苦労話や更新情報は↓で。

《Nintendo DSi の プチコンmkII で昔作った「易双六PTC」を主に Claude さんの力で、Web 版に移植した。スマホや PC でこの「レトロゲーム感」を味わってほしい。 - JRF のひとこと》  
http://jrf.cocolog-nifty.com/statuses/2026/05/post-151d9c.html


## Author

JRF ( http://jrf.cocolog-nifty.com/statuses , Twitter (X): @jion_rockford )

今回、音楽は↓さんの素材を使っています。

魔王魂 森田交一 ( https://maou.audio/ )


## License

基本的に「学習用に特に Public Domain になることを望んでいるが、それが気になる場合は MIT License か BSD License のお好きなもので。」でよいのですが、私が作った部分についてはそれでよいとしても、問題は、AI さん達が作った部分をどう評価するか…です。

プログラムはほぼすべて主に Claude さんが、サブとして ChatGPT さんや Gemini さんが協力して、作ってます。ただデバッグでの貢献等の細かい指示を私は出しましたが…。

あと、音楽(mp3)は JRF ではなく 魔王魂 さんの著作物で CC4 らしいです。


----
(This document is mainly written in Japanese/UTF8.)
