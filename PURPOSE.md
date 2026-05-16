# 易双六PTC Web版

## 大目的

Nintendo DSi のプチコンmkII上で作られたタロットソリティア「易双六PTC」を Web に移植し特にスマホで動かせるようにする。易双六(YOUSCOUT)がグラフィック等が複雑で難しい場合、その説明書(YSCHELP)だけでも動かせるようになりたい。

## ファイル

  * 易双六PTC は、 https://github.com/JRF-2018/youscout_ptc で公開されている。BASIC プログラム(.prg)がテキストで読めるはずである。Makefile 等もあり、構造は理解できるはず。まず git clone して欲しい。git clone できない場合は youscout_ptc.zip を提示できる。

  * プチコンmkII の Smile Basic の説明書はプロジェクトの ptc2-manual.pdf か、 https://smileboom.com/special/ptcm2/co_manual/p01.php から辿れる。それを元に Claude さん自身が要点を書き出したものが、smilebasic_reference.md である。

  * PRG が使っているライブラリの説明は↓にある。

    http://jrf.cocolog-nifty.com/software/2013/02/post-1.html
    http://jrf.cocolog-nifty.com/software/2013/02/post-2.html  
    http://jrf.cocolog-nifty.com/software/2013/02/post-3.html  
    http://jrf.cocolog-nifty.com/software/2013/02/post-4.html

    これらを元に Claude さん自身が要点をまとめたものが jrf_library_reference.md である。

## 要件

  * PRG のインタープリタを作る必要はない。動く Web 版にしてくれればいい。

  * DS は上下画面だったので、上下の画面を縦に並べた縦型の画面でスマホ用に設計する。フォント等はこだわらないが、キャラクタ(カード等)は、PRG に含まれるものから再構成してくれればベターである。必要ならカードの絵はプチコン用ではなく、易双六 PC Web 版( https://jrf-2018.github.io/youscout/youscout.html )用のものがあるためそれを用意できる。

  * 音楽は、一つだけダンジョン通路用のものだけ利用していた。それはフリー素材にあたって欲しいが、別途用意することが可能である。

  * 効果音は、カードを切る音、カードを置く音、そろばんをはじく音、そろばんを「リセット」する音等を PSG(?) で作っていたはずである。それはできればスクリプトなどで再現して欲しい。

  * 説明書(YSCHELP)だけでも動かせるようにするのが第1目標である。そこには秘密のダンジョン入り口があり、そのダンジョンをプレイできるようにしたいからである。

  * できれば易双六(YOUSCOUT)も当時の感覚でプレイできるようにしたい。

  * 全体像を見渡すときどういう音楽、効果音が必要かを調べて欲しい。そしてそれを生成などできるかを。それによって私が必要な効果音や音楽を探す。
  
  * まず PRG に入っているキャラクタを png に書き出すところからはじめるべきだろう。MKJRFTRT の解析などからはじめるのがよいと思われる。

  * 成果物は GitHub Pages で公開する。GitHub にできた html や png を置き、README.md を置く。


## 環境・制限

  * Claude Code は使えない。

  * Windows Cygwin が私の開発環境である。キャラ切り出しツールなどは Perl で作ってもらえるとうれしい。



