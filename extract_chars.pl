#!/usr/bin/perl
use strict;
use warnings;
use Compress::Zlib;
use File::Path qw(make_path);
use Encode qw(decode);

# ============================================================
# extract_chars.pl
# jrftarot.prg から _PM / _BM キャラクタデータを読み込み PNG へ書き出す
#
# 使い方:
#   perl extract_chars.pl [--src jrftarot.prg] [--out out_png]
#
# 出力: out_png/JRFTAROT_S01.png  ... タロットカード（_PM形式 36x56）
#       out_png/JRFTAROT_B00.png  ... カード裏面
#       out_png/JRFTAROT_DSC.png  ... ディスク（説明）画像
#       out_png/YSCTOKEN.png      ... トークン
#       out_png/CHAR_EKI.png      ... 易のロゴ文字
#       out_png/CHAR_0.png        ... 数字・記号ビットマップ
#       ... etc.
# ============================================================

# --- 引数解析 ---
my $src_file = "youscout_ptc/src/jrftarot.prg";
my $out_dir  = "out_png";

for (my $i = 0; $i < @ARGV; $i++) {
    if ($ARGV[$i] eq '--src' && $i+1 < @ARGV) { $src_file = $ARGV[++$i] }
    if ($ARGV[$i] eq '--out' && $i+1 < @ARGV) { $out_dir  = $ARGV[++$i] }
}

make_path($out_dir) unless -d $out_dir;

# ============================================================
# PRGファイルをパースしてラベルとDATAブロックを収集
# ============================================================
open(my $fh, '<', $src_file) or die "Cannot open $src_file: $!";
my @lines = <$fh>;
close $fh;

# ラベルとデータの辞書: $label_data{LABEL} = [ "str1", "str2", ... ]
# 数値DATAは文字列として保存
my %label_data;
# ラベルとDATAの紐付けルール:
#   連続するラベル行 @A, @B, @C の後にDATAが来た場合、
#   最後のラベル @C のみにDATAを割り当てる。
#   ただし @A, @B もエントリポイントとして登録はする（データなし）。
# 例: @CHAR_EKI / @CHAR_EKI_SZ / DATA 32,32
#   → CHAR_EKI_SZ に [32, 32] が入る。CHAR_EKI は空。
my @pending_labels;  # まだDATAが来ていないラベル群
my $active_label;    # 現在DATAを受け取るラベル

for my $line (@lines) {
    chomp $line;
    $line =~ s/\r//g;
    next if $line =~ /^\s*'/;

    # ラベル行
    if ($line =~ /^@(\w+)/) {
        my $lbl = $1;
        # 前のラベル群を確定（DATAなし）
        for my $pl (@pending_labels) {
            $label_data{$pl} = [] unless exists $label_data{$pl};
        }
        push @pending_labels, $lbl;
        $label_data{$lbl} = [] unless exists $label_data{$lbl};
        $active_label = $lbl;  # 最後のラベルがアクティブ
        next;
    }

    # DATA行: アクティブラベルにのみ追加
    if ($line =~ /^DATA\s+(.+)$/i) {
        my @items = parse_data_items($1);
        if (defined $active_label) {
            push @{$label_data{$active_label}}, @items;
        }
        next;
    }

    # DATA行以外の命令はラベル集積をリセット
    if ($line =~ /\S/ && $line !~ /^@/) {
        @pending_labels = ();
        $active_label = undef;
    }
}

# DATA要素パーサ
sub parse_data_items {
    my ($str) = @_;
    my @result;
    while ($str =~ /\S/) {
        $str =~ s/^\s+//;
        if ($str =~ /^"((?:[^"]*)*)"/) {
            push @result, $1;
            $str = substr($str, length($&));
        } elsif ($str =~ /^(-?\d+)/) {
            push @result, $1;
            $str = substr($str, length($&));
        } elsif ($str =~ /^,/) {
            $str = substr($str, 1);
        } else {
            last;
        }
    }
    return @result;
}

# ============================================================
# PNG書き出しユーティリティ
# ============================================================
sub write_png {
    my ($filename, $width, $height, $pixels_ref) = @_;
    # $pixels_ref は [r,g,b,a] の配列 (width*height 個)

    # PNGシグネチャ
    my $png = "\x89PNG\r\n\x1a\n";

    # IHDRチャンク
    my $ihdr_data = pack("NNCCCCC", $width, $height, 8, 2, 0, 0, 0);
    # カラータイプ2=RGB、8bit... アルファも使うのでtype=6
    $ihdr_data = pack("NNCCCCCC", $width, $height, 8, 6, 0, 0, 0);
    $png .= make_chunk("IHDR", pack("NNCCCCC", $width, $height, 8, 6, 0, 0, 0));

    # IDATチャンク: フィルタバイト0x00 + RGB/RGBA行データ
    my $raw = "";
    for my $y (0 .. $height-1) {
        $raw .= "\x00"; # filter type = None
        for my $x (0 .. $width-1) {
            my $p = $pixels_ref->[$y * $width + $x];
            $raw .= pack("CCCC", $p->[0], $p->[1], $p->[2], $p->[3]);
        }
    }
    my $compressed = Compress::Zlib::compress($raw);
    $png .= make_chunk("IDAT", $compressed);

    # IENDチャンク
    $png .= make_chunk("IEND", "");

    open(my $out, '>', $filename) or die "Cannot write $filename: $!";
    binmode $out;
    print $out $png;
    close $out;
}

sub make_chunk {
    my ($type, $data) = @_;
    my $len = length($data);
    my $crc = Compress::Zlib::crc32($type . $data);
    return pack("N", $len) . $type . $data . pack("N", $crc);
}

# ============================================================
# 16進RGB文字列 → [r,g,b] 変換
# ============================================================
sub hex_to_rgb {
    my ($hex) = @_;
    return undef if !defined($hex) || $hex eq "";
    $hex =~ s/^\s+|\s+$//g;
    return undef if length($hex) != 6;
    my ($r,$g,$b) = map { hex($_) } ($hex =~ /(..)(..)(..)$/);
    return [$r,$g,$b];
}

# ============================================================
# _PM形式のピクセルマップ画像を描画
#   パレット: _PL ラベル (16エントリ、空文字=透明)
#   サイズ:   _SZ ラベル (W, H)
#   データ:   _PM ラベル (H行の文字列、各文字=1ピクセル=16進パレットインデックス)
# ============================================================
sub render_pm {
    my ($name) = @_;  # 例: "JRFTAROT_S01"

    my $pl_key = "${name}_PL";
    my $sz_key = "${name}_SZ";
    my $pm_key = "${name}_PM";

    unless (exists $label_data{$pl_key} && exists $label_data{$sz_key} && exists $label_data{$pm_key}) {
        warn "Missing data for $name\n";
        return undef;
    }

    # パレット取得（最大16色、インデックス0=透明）
    my @pl_data = @{$label_data{$pl_key}};
    my @palette; # [r,g,b,a]
    for my $i (0..15) {
        my $hex = $pl_data[$i] // "";
        my $rgb = hex_to_rgb($hex);
        if ($rgb) {
            push @palette, [$rgb->[0], $rgb->[1], $rgb->[2], 255];
        } else {
            push @palette, [0, 0, 0, 0]; # 透明
        }
    }

    # サイズ取得
    my ($w, $h) = @{$label_data{$sz_key}};
    $w = int($w); $h = int($h);

    # ピクセルマップ取得
    my @pm_rows = @{$label_data{$pm_key}};

    my @pixels;
    for my $row_str (@pm_rows) {
        for my $i (0 .. length($row_str)-1) {
            my $ch = substr($row_str, $i, 1);
            my $idx = hex($ch);
            push @pixels, $palette[$idx] // [0,0,0,0];
        }
    }

    # 実際の行数チェック
    my $actual_h = scalar @pm_rows;
    return { w => $w, h => $actual_h, pixels => \@pixels };
}

# ============================================================
# _BM形式のビットマップ（1bit/pixel、_SZはビット幅×高さ）
#   各行は16進文字列（1文字=4ビット）
#   COLはカラーインデックス（描画色）、0が背景(透明)
# ============================================================
sub render_bm {
    my ($name, $fg_rgb) = @_;  # 例: "CHAR_EKI", [0,0,0]
    $fg_rgb //= [0, 0, 0];

    my $sz_key = "${name}_SZ";
    my $bm_key = "${name}_BM";

    unless (exists $label_data{$sz_key} && exists $label_data{$bm_key}) {
        warn "Missing BM data for $name\n";
        return undef;
    }

    my ($w, $h) = @{$label_data{$sz_key}};
    $w = int($w); $h = int($h);

    my @bm_rows = @{$label_data{$bm_key}};
    my @pixels;

    for my $row_str (@bm_rows) {
        # 各行はビット列: 1文字=4ビット、MSBから
        my @bits;
        for my $i (0 .. length($row_str)-1) {
            my $nibble = hex(substr($row_str, $i, 1));
            for my $b (3, 2, 1, 0) {
                push @bits, ($nibble >> $b) & 1;
            }
        }
        # w ビット分を取得
        for my $x (0 .. $w-1) {
            if ($bits[$x]) {
                push @pixels, [$fg_rgb->[0], $fg_rgb->[1], $fg_rgb->[2], 255];
            } else {
                push @pixels, [255, 255, 255, 0]; # 透明
            }
        }
    }

    my $actual_h = scalar @bm_rows;
    return { w => $w, h => $actual_h, pixels => \@pixels };
}

# ============================================================
# メイン処理
# ============================================================

# --- _PM形式のカード画像 ---
my @pm_targets = (
    # タロット大アルカナ (A00-A21)
    (map { sprintf("JRFTAROT_A%02d", $_) } (0..21)),
    # スート小アルカナ S=Spade,D=Diamond,H=Heart,C=Club (01-14)
    (map { my $s=$_; map { sprintf("JRFTAROT_%s%02d", $s, $_) } (1..14) } qw(S D H C)),
    # カード裏面
    "JRFTAROT_B00",
    # ディスカード(捨て札)
    "JRFTAROT_DSC",
    # タリスマン
    "JRFTAROT_TLN",
    # トークン
    "YSCTOKEN",
);

my $count_pm = 0;
for my $name (@pm_targets) {
    my $img = render_pm($name);
    unless ($img) { warn "Skipping $name\n"; next; }
    my $outfile = "$out_dir/${name}.png";
    write_png($outfile, $img->{w}, $img->{h}, $img->{pixels});
    printf "  wrote %s (%dx%d)\n", $outfile, $img->{w}, $img->{h};
    $count_pm++;
}

# --- _BM形式のキャラクタ（数字・記号・漢字ロゴ）---
# 数字 0-21（タロット番号表示用）
my @num_chars = map { "CHAR_$_" } (0..21);
# アルファベット記号
my @alp_chars = map { "CHAR_$_" } qw(A J C Q K);
# スートマーク
my @suit_chars = map { "CHAR_$_" } qw(BOX CIRCLE SPADE DIA HEART CLUB);
# 漢字ロゴ（易・爻・六）
my @logo_chars = map { "CHAR_$_" } qw(EKI SOU ROKU);

my @bm_targets = (@num_chars, @alp_chars, @suit_chars, @logo_chars);

# スートの色設定（COL_S=Blue, COL_D=Gold, COL_H=Red, COL_C=Green）
my %suit_color = (
    # BG_SUIT_DATA_C (trtconst.prg) に準拠:
    # CIRCLE=14(黒), BOX=14(黒), SPADE=2(青), DIA=3(金), HEART=4(赤), CLUB=5(緑)
    # CMAPより: 2=#0000FF, 3=#D4AA00, 4=#FF0000, 5=#008000, 14=#000000
    CIRCLE => [0x00, 0x00, 0x00],  # COL_BLACK CMAP[14]
    BOX    => [0x00, 0x00, 0x00],  # COL_BLACK CMAP[14]
    SPADE  => [0x00, 0x00, 0xFF],  # COL_S     CMAP[2]  (青)
    DIA    => [0xD4, 0xAA, 0x00],  # COL_D     CMAP[3]  (金)
    HEART  => [0xFF, 0x00, 0x00],  # COL_H     CMAP[4]  (赤)
    CLUB   => [0x00, 0x80, 0x00],  # COL_C     CMAP[5]  (緑)
);

my $count_bm = 0;
for my $name (@bm_targets) {
    # スートは固有色、それ以外は黒
    my $fg = [0,0,0];
    for my $s (keys %suit_color) {
        $fg = $suit_color{$s} if $name eq "CHAR_$s";
    }
    my $img = render_bm($name, $fg);
    unless ($img) { warn "Skipping BM $name\n"; next; }
    my $outfile = "$out_dir/${name}.png";
    write_png($outfile, $img->{w}, $img->{h}, $img->{pixels});
    printf "  wrote %s (%dx%d)\n", $outfile, $img->{w}, $img->{h};
    $count_bm++;
}

# --- スプライト/ソロバン等のPM画像も抽出 ---
my @extra_pm;
for my $key (sort keys %label_data) {
    if ($key =~ /^(SOROBAN_.+)_SZ$/) {
        push @extra_pm, $1;
    }
}
# mkjrftrt.prgも読み込む（ソロバン・白カードパーツ）
if (-f "youscout_ptc/src/mkjrftrt.prg") {
    open(my $fh2, '<', "youscout_ptc/src/mkjrftrt.prg") or die $!;
    my @lines2 = <$fh2>;
    close $fh2;
    my @clbls;
    for my $line (@lines2) {
        chomp $line; $line =~ s/\r//g;
        next if $line =~ /^\s*'/;
        if ($line =~ /^@(\w+)/) {
            push @clbls, $1;
            $label_data{$1} = [] unless exists $label_data{$1};
            next;
        }
        if ($line =~ /^DATA\s+(.+)$/i) {
            my @items = parse_data_items($1);
            for my $lbl (@clbls) { push @{$label_data{$lbl}}, @items; }
            next;
        }
        @clbls = () if $line =~ /\S/ && $line !~ /^@/;
    }
}

# ソロバン等のPMデータを探して書き出し
for my $key (sort keys %label_data) {
    next unless $key =~ /^(SOROBAN_.+)_PL$/;
    my $name = $1;
    my $img = render_pm($name);
    next unless $img;
    my $outfile = "$out_dir/${name}.png";
    write_png($outfile, $img->{w}, $img->{h}, $img->{pixels});
    printf "  wrote %s (%dx%d)\n", $outfile, $img->{w}, $img->{h};
    $count_pm++;
}

print "\nDone. $count_pm PM images, $count_bm BM images written to $out_dir/\n";
