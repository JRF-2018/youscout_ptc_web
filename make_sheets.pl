#!/usr/bin/perl
use strict;
use warnings;
use Compress::Zlib;
use File::Path qw(make_path);

# ============================================================
# make_sheets.pl
# extract_chars.pl で生成した個別PNG を読み込み、
# mkjrftrt.prg に忠実にスプライトシートPNGを生成する
#
# 使い方:
#   perl make_sheets.pl [--src out_png] [--out out_png]
#
# 生成ファイル:
#   JRFTRT_A.png   大アルカナ正位置
#   JRFTRT_R.png   大アルカナ逆位置
#   JRFTRT_S.png   スペード (S01-S14 + B00/DSC/TLN)
#   JRFTRT_D.png   ダイヤ  (D01-D14 + A00/A13)
#   JRFTRT_H.png   ハート  (H01-H14)
#   JRFTRT_C.png   クラブ  (C01-C14)
#   JRFTRT_RS.png  スペード逆位置
#   JRFTRT_RD.png  ダイヤ逆位置
#   JRFTRT_RH.png  ハート逆位置
#   JRFTRT_RC.png  クラブ逆位置
#   JRFTRT_T.png   タイトル背景
#   JRFTRTS7.png   SPU7: B00/A00/A13/TOKEN 64x64px
# ============================================================

my $src_dir = "out_png";
my $out_dir = "out_png";

for (my $i = 0; $i < @ARGV; $i++) {
    if ($ARGV[$i] eq '--src' && $i+1 < @ARGV) { $src_dir = $ARGV[++$i] }
    if ($ARGV[$i] eq '--out' && $i+1 < @ARGV) { $out_dir = $ARGV[++$i] }
}

make_path($out_dir) unless -d $out_dir;

# ============================================================
# 定数 (trtconst.prg より)
# ============================================================
use constant CARD_WIDTH  => 36;
use constant CARD_HEIGHT => 56;
use constant GRP_ROWS    => 3;
use constant GRP_W       => 256;
use constant GRP_H       => 192;

# 特殊スロットインデックス
use constant GRP_S_B00       => 5 * GRP_ROWS + 0;  # 15
use constant GRP_S_DISCARDED => 5 * GRP_ROWS + 1;  # 16
use constant GRP_S_TALON     => 5 * GRP_ROWS + 2;  # 17
use constant GRP_D_A00       => 5 * GRP_ROWS + 0;  # 15
use constant GRP_D_A13       => 5 * GRP_ROWS + 1;  # 16

# ============================================================
# PNG読み込み (Pure Perl + Compress::Zlib)
# ============================================================
sub read_png {
    my ($filename) = @_;
    open(my $fh, '<', $filename) or die "Cannot open $filename: $!";
    binmode $fh;
    my $data; { local $/; $data = <$fh>; } close $fh;

    # シグネチャ確認
    die "Not a PNG: $filename" unless substr($data, 0, 8) eq "\x89PNG\r\n\x1a\n";

    my $pos = 8;
    my ($width, $height, $bitdepth, $colortype) = (0, 0, 0, 0);
    my $idat = '';

    while ($pos < length($data)) {
        my $len  = unpack('N', substr($data, $pos, 4)); $pos += 4;
        my $type = substr($data, $pos, 4); $pos += 4;
        my $chunk = substr($data, $pos, $len); $pos += $len;
        my $crc  = substr($data, $pos, 4); $pos += 4;

        if ($type eq 'IHDR') {
            ($width, $height, $bitdepth, $colortype) = unpack('NNCC', $chunk);
        } elsif ($type eq 'IDAT') {
            $idat .= $chunk;
        } elsif ($type eq 'IEND') {
            last;
        }
    }

    # IDAT展開
    my $inflated = Compress::Zlib::uncompress($idat);
    my $status = defined($inflated) ? Compress::Zlib::Z_OK() : 1;
    die "zlib error: $status in $filename" if $status != Compress::Zlib::Z_OK();

    # フィルタ適用してピクセル取得
    # colortype: 2=RGB, 6=RGBA
    my $channels = ($colortype == 6) ? 4 : 3;
    my $stride = $width * $channels;
    my @pixels;

    my @prev_row = (0) x $stride;
    for my $y (0 .. $height-1) {
        my $filter = ord(substr($inflated, $y * ($stride+1), 1));
        my @row = map { ord($_) } split //, substr($inflated, $y * ($stride+1) + 1, $stride);

        # フィルタ解除
        if ($filter == 1) {  # Sub
            for my $x ($channels .. $#row) {
                $row[$x] = ($row[$x] + $row[$x-$channels]) & 0xFF;
            }
        } elsif ($filter == 2) {  # Up
            for my $x (0 .. $#row) {
                $row[$x] = ($row[$x] + $prev_row[$x]) & 0xFF;
            }
        } elsif ($filter == 3) {  # Average
            for my $x (0 .. $#row) {
                my $a = ($x >= $channels) ? $row[$x-$channels] : 0;
                $row[$x] = ($row[$x] + int(($a + $prev_row[$x]) / 2)) & 0xFF;
            }
        } elsif ($filter == 4) {  # Paeth
            for my $x (0 .. $#row) {
                my $a = ($x >= $channels) ? $row[$x-$channels] : 0;
                my $b = $prev_row[$x];
                my $c = ($x >= $channels) ? $prev_row[$x-$channels] : 0;
                my $p = $a + $b - $c;
                my $pa = abs($p-$a); my $pb = abs($p-$b); my $pc = abs($p-$c);
                my $pr = ($pa<=$pb && $pa<=$pc) ? $a : ($pb<=$pc) ? $b : $c;
                $row[$x] = ($row[$x] + $pr) & 0xFF;
            }
        }
        @prev_row = @row;

        for my $x (0 .. $width-1) {
            my $base = $x * $channels;
            if ($channels == 4) {
                push @pixels, [$row[$base], $row[$base+1], $row[$base+2], $row[$base+3]];
            } else {
                push @pixels, [$row[$base], $row[$base+1], $row[$base+2], 255];
            }
        }
    }

    return { w => $width, h => $height, pixels => \@pixels };
}

# ============================================================
# PNG書き込み (extract_chars.plと同じ)
# ============================================================
sub write_png {
    my ($filename, $width, $height, $pixels_ref) = @_;
    my $png = "\x89PNG\r\n\x1a\n";
    $png .= make_chunk("IHDR", pack("NNCCCCC", $width, $height, 8, 6, 0, 0, 0));
    my $raw = "";
    for my $y (0 .. $height-1) {
        $raw .= "\x00";
        for my $x (0 .. $width-1) {
            my $p = $pixels_ref->[$y * $width + $x];
            $raw .= pack("CCCC", $p->[0], $p->[1], $p->[2], $p->[3]);
        }
    }
    my $compressed = Compress::Zlib::compress($raw);
    $png .= make_chunk("IDAT", $compressed);
    $png .= make_chunk("IEND", "");
    open(my $out, '>', $filename) or die "Cannot write $filename: $!";
    binmode $out; print $out $png; close $out;
}

sub make_chunk {
    my ($type, $data) = @_;
    my $len = length($data);
    my $crc = Compress::Zlib::crc32($type . $data);
    return pack("N", $len) . $type . $data . pack("N", $crc);
}

# ============================================================
# シート操作
# ============================================================
# 空シート生成 (256x192 RGBA、全透明)
sub make_sheet {
    my @px;
    for my $i (0 .. GRP_W * GRP_H - 1) {
        push @px, [0, 0, 0, 0];
    }
    return { w => GRP_W, h => GRP_H, pixels => \@px };
}

# インデックス → (x, y) 座標
sub idx_to_xy {
    my ($idx) = @_;
    my $col = int($idx / GRP_ROWS);
    my $row = $idx % GRP_ROWS;
    return ($col * CARD_WIDTH, $row * CARD_HEIGHT);
}

# 画像をシートの指定インデックス位置に貼り付け
# rot=0: 正位置, rot=1: 180度回転 (逆位置)
sub paste_card {
    my ($sheet, $card_img, $idx, $rot) = @_;
    $rot //= 0;
    my ($dst_x, $dst_y) = idx_to_xy($idx);
    my $cw = $card_img->{w};
    my $ch = $card_img->{h};

    for my $y (0 .. $ch-1) {
        for my $x (0 .. $cw-1) {
            # rot=1 なら180度回転
            my $src_x = $rot ? ($cw - 1 - $x) : $x;
            my $src_y = $rot ? ($ch - 1 - $y) : $y;

            my $src_px = $card_img->{pixels}[$src_y * $cw + $src_x];
            next if $src_px->[3] == 0;  # 透明はスキップ

            my $px = $dst_x + $x;
            my $py = $dst_y + $y;
            next if $px < 0 || $px >= GRP_W || $py < 0 || $py >= GRP_H;
            $sheet->{pixels}[$py * GRP_W + $px] = $src_px;
        }
    }
}

# PNG読み込みのキャッシュ
my %img_cache;
sub load_card {
    my ($name) = @_;
    return $img_cache{$name} if exists $img_cache{$name};
    my $path = "$src_dir/${name}.png";
    unless (-f $path) {
        warn "  WARNING: $path not found\n";
        $img_cache{$name} = undef;
        return undef;
    }
    $img_cache{$name} = read_png($path);
    return $img_cache{$name};
}

# ============================================================
# 各シートを生成
# ============================================================

# --- JRFTRT_A: 大アルカナ正位置 ---
# idx 0-19 → J=1..12, 14..21 (A00/A13除く)
print "Generating JRFTRT_A.png ...\n";
{
    my $sheet = make_sheet();
    for my $i (0 .. 22-2-1) {  # 20枚
        my $j = $i + 1;
        $j++ if $i >= 12;
        my $img = load_card(sprintf("JRFTAROT_A%02d", $j));
        paste_card($sheet, $img, $i, 0) if $img;
    }
    write_png("$out_dir/JRFTRT_A.png", GRP_W, GRP_H, $sheet->{pixels});
}

# --- JRFTRT_R: 大アルカナ逆位置 ---
print "Generating JRFTRT_R.png ...\n";
{
    my $sheet = make_sheet();
    for my $i (0 .. 22-2-1) {
        my $j = $i + 1;
        $j++ if $i >= 12;
        my $img = load_card(sprintf("JRFTAROT_A%02d", $j));
        paste_card($sheet, $img, $i, 1) if $img;  # rot=1: 180度回転
    }
    write_png("$out_dir/JRFTRT_R.png", GRP_W, GRP_H, $sheet->{pixels});
}

# 小アルカナシート生成サブルーチン
# suit_letter: S/D/H/C
# extras: [[idx, name, rot], ...]
sub make_minor_sheet {
    my ($suit_letter, $extras_ref, $rot) = @_;
    $rot //= 0;
    my $sheet = make_sheet();
    for my $i (0..13) {
        my $img = load_card(sprintf("JRFTAROT_%s%02d", $suit_letter, $i+1));
        paste_card($sheet, $img, $i, $rot) if $img;
    }
    for my $ex (@{$extras_ref // []}) {
        my ($idx, $name, $ex_rot) = @$ex;
        my $img = load_card($name);
        paste_card($sheet, $img, $idx, $ex_rot) if $img;
    }
    return $sheet;
}

# --- JRFTRT_S: スペード正位置 ---
# S01-S14 (idx0-13) + B00(idx15), DSC(idx16), TLN(idx17)
print "Generating JRFTRT_S.png ...\n";
{
    my $extras = [
        [GRP_S_B00,       'JRFTAROT_B00', 0],
        [GRP_S_DISCARDED, 'JRFTAROT_DSC', 0],
        [GRP_S_TALON,     'JRFTAROT_TLN', 0],
    ];
    my $sheet = make_minor_sheet('S', $extras, 0);
    write_png("$out_dir/JRFTRT_S.png", GRP_W, GRP_H, $sheet->{pixels});
}

# --- JRFTRT_D: ダイヤ正位置 + A00(idx15), A13(idx16) ---
print "Generating JRFTRT_D.png ...\n";
{
    my $extras = [
        [GRP_D_A00, 'JRFTAROT_A00', 0],
        [GRP_D_A13, 'JRFTAROT_A13', 0],
    ];
    my $sheet = make_minor_sheet('D', $extras, 0);
    write_png("$out_dir/JRFTRT_D.png", GRP_W, GRP_H, $sheet->{pixels});
}

# --- JRFTRT_H: ハート正位置 ---
print "Generating JRFTRT_H.png ...\n";
{
    my $sheet = make_minor_sheet('H', [], 0);
    write_png("$out_dir/JRFTRT_H.png", GRP_W, GRP_H, $sheet->{pixels});
}

# --- JRFTRT_C: クラブ正位置 ---
print "Generating JRFTRT_C.png ...\n";
{
    my $sheet = make_minor_sheet('C', [], 0);
    write_png("$out_dir/JRFTRT_C.png", GRP_W, GRP_H, $sheet->{pixels});
}

# --- JRFTRT_RS: スペード逆位置 ---
# mkjrftrt.prgより: S逆 + B00逆(rot=1), DSC正(rot=0), TLN正(rot=0)
print "Generating JRFTRT_RS.png ...\n";
{
    my $extras = [
        [GRP_S_B00,       'JRFTAROT_B00', 1],
        [GRP_S_DISCARDED, 'JRFTAROT_DSC', 0],
        [GRP_S_TALON,     'JRFTAROT_TLN', 0],
    ];
    my $sheet = make_minor_sheet('S', $extras, 1);
    write_png("$out_dir/JRFTRT_RS.png", GRP_W, GRP_H, $sheet->{pixels});
}

# --- JRFTRT_RD: ダイヤ逆位置 + A00逆, A13逆 ---
print "Generating JRFTRT_RD.png ...\n";
{
    my $extras = [
        [GRP_D_A00, 'JRFTAROT_A00', 1],
        [GRP_D_A13, 'JRFTAROT_A13', 1],
    ];
    my $sheet = make_minor_sheet('D', $extras, 1);
    write_png("$out_dir/JRFTRT_RD.png", GRP_W, GRP_H, $sheet->{pixels});
}

# --- JRFTRT_RH: ハート逆位置 ---
print "Generating JRFTRT_RH.png ...\n";
{
    my $sheet = make_minor_sheet('H', [], 1);
    write_png("$out_dir/JRFTRT_RH.png", GRP_W, GRP_H, $sheet->{pixels});
}

# --- JRFTRT_RC: クラブ逆位置 ---
print "Generating JRFTRT_RC.png ...\n";
{
    my $sheet = make_minor_sheet('C', [], 1);
    write_png("$out_dir/JRFTRT_RC.png", GRP_W, GRP_H, $sheet->{pixels});
}

# --- JRFTRT_T: タイトル背景 (DRAW_LOGO_GRP相当) ---
# G_PUT_BM(X=32, Y=16+I*(H+32), COL_WHITE) で易双六を縦書き
# CHAR_EKI/SOU/ROKU.pngはextract_chars.plが生成済み(32x32 BM PNG, 黒=文字)
print "Generating JRFTRT_T.png ...\n";
{
    my $board_r = 0x10; my $board_g = 0x43; my $board_b = 0x1f;
    my @px_arr;
    for my $i (0 .. GRP_W * GRP_H - 1) {
        push @px_arr, [$board_r, $board_g, $board_b, 255];
    }

    # 各漢字: X=32, Y=16/80/144 (H=32, 間隔64px)
    my @logo_chars = (['CHAR_EKI', 32, 16], ['CHAR_SOU', 32, 80], ['CHAR_ROKU', 32, 144]);
    for my $entry (@logo_chars) {
        my ($name, $ox, $oy) = @$entry;
        my $img = load_card($name);
        next unless $img;
        my $cw = $img->{w}; my $ch = $img->{h};
        for my $y (0 .. $ch - 1) {
            for my $x (0 .. $cw - 1) {
                my $px = $img->{pixels}[$y * $cw + $x];
                # BM PNG: 黒(r<128)が文字ピクセル、透明が背景
                next if $px->[3] == 0;
                next if $px->[0] > 128;
                my $dx = $ox + $x; my $dy = $oy + $y;
                next if $dx >= GRP_W || $dy >= GRP_H;
                $px_arr[$dy * GRP_W + $dx] = [255, 255, 255, 255];
            }
        }
    }
    write_png("$out_dir/JRFTRT_T.png", GRP_W, GRP_H, \@px_arr);
}

# --- JRFTRTS7.png: SPU7 64x64px カードSPRITEシート ---
# B00, A00, A13, TOKEN を64x64に収めて配置
# 各カード(36x56)を64x64の中央に配置
print "Generating JRFTRTS7.png ...\n";
{
    my $sheet = make_sheet();

    sub card_to_slot64 {
        my ($sheet, $card_img, $slot_x, $slot_y) = @_;
        my $cw = $card_img->{w};
        my $ch = $card_img->{h};
        my $ox = int((64 - $cw) / 2);
        my $oy = int((64 - $ch) / 2);
        for my $y (0 .. $ch-1) {
            for my $x (0 .. $cw-1) {
                my $px = $card_img->{pixels}[$y * $cw + $x];
                next if $px->[3] == 0;
                my $dx = $slot_x + $ox + $x;
                my $dy = $slot_y + $oy + $y;
                next if $dx >= GRP_W || $dy >= GRP_H;
                $sheet->{pixels}[$dy * GRP_W + $dx] = $px;
            }
        }
    }

    # SPU7_B00=0 → (0,0), SPU7_A00=64 → (64,0), SPU7_A13=128 → (128,0)
    # SPU7_TOKEN=192 → (192,0)
    for my $entry (
        ['JRFTAROT_B00', 0,   0],
        ['JRFTAROT_A00', 64,  0],
        ['JRFTAROT_A13', 128, 0],
        ['YSCTOKEN',     192, 0],
    ) {
        my ($name, $sx, $sy) = @$entry;
        my $img = load_card($name);
        card_to_slot64($sheet, $img, $sx, $sy) if $img;
    }

    write_png("$out_dir/JRFTRTS7.png", GRP_W, GRP_H, $sheet->{pixels});
}


# --- JRFTRT_B: BGU1キャラシート ---
# 256キャラ × 8x8px → 256x64px
# BM形式個別PNG(extract_chars.pl生成済み)からBM_TO_CHR/PM_TO_CHR_R相当の処理で組み立て
print "Generating JRFTRT_B.png ...\n";
{
    # CMAPパレット (BG用パレット 0-15)
    my @CMAP = (
        [0,0,0,0],          # 0: transparent
        [0xDC,0xDC,0xDC,255],  # 1: GREY
        [0x00,0x00,0xFF,255],  # 2: BLUE(SPADE)
        [0xD4,0xAA,0x00,255],  # 3: GOLD(DIA)
        [0xFF,0x00,0x00,255],  # 4: RED(HEART)
        [0x00,0x80,0x00,255],  # 5: GREEN(CLUB)
        [0xAC,0xAC,0xAC,255],  # 6
        [0x78,0x78,0x78,255],  # 7
        [0x58,0x58,0x58,255],  # 8
        [0x38,0x38,0x38,255],  # 9
        [0xBA,0x9B,0x3E,255],  # 10
        [0x83,0x67,0x26,255],  # 11
        [0x83,0x3E,0x29,255],  # 12
        [0x40,0x37,0x2A,255],  # 13
        [0x00,0x00,0x00,255],  # 14: BLACK
        [0xFF,0xFF,0xFF,255],  # 15: WHITE
    );

    # BGU1バンク: 256キャラ、各8x8=64ピクセル [[r,g,b,a]×64]
    my @bank = map { [map {[0,0,0,0]} (0..63)] } (0..255);

    # BM個別PNGから8x8CHRを生成 (BM_TO_CHR相当)
    # x_ofs: X方向オフセット (スーツは-2で2px右にずらす)
    # 非透明ピクセル → col_rgba, 透明 → 透明
    my sub bm_chr {
        my ($name, $col, $x_ofs) = @_;
        $x_ofs //= 0;
        my $img = load_card($name);
        return [map {[0,0,0,0]} (0..63)] unless $img;
        my ($iw, $ih) = ($img->{w}, $img->{h});
        my @chd;
        for my $j (0..7) {
            for my $i (0..7) {
                my $xi = $x_ofs + $i; my $yj = $j;
                if ($xi >= 0 && $xi < $iw && $yj < $ih) {
                    my $p = $img->{pixels}[$yj*$iw + $xi];
                    push @chd, ($p->[3] > 0) ? [@$col] : [0,0,0,0];
                } else { push @chd, [0,0,0,0]; }
            }
        }
        return \@chd;
    }

    # PM個別PNGから BW×BH個の8x8CHRを生成 (PM_TO_CHR_R相当)
    my sub pm_chrs {
        my ($name, $bw, $bh) = @_;
        my $img = load_card($name);
        return [map { [map {[0,0,0,0]} (0..63)] } (0..$bw*$bh-1)] unless $img;
        my ($iw, $ih) = ($img->{w}, $img->{h});
        my @result;
        for my $J (0..$bh-1) {
            for my $I (0..$bw-1) {
                my @chd;
                for my $k (0..7) {
                    for my $i (0..7) {
                        my ($x,$y) = ($I*8+$i, $J*8+$k);
                        push @chd, ($x<$iw && $y<$ih)
                            ? $img->{pixels}[$y*$iw+$x]
                            : [0,0,0,0];
                    }
                }
                push @result, \@chd;
            }
        }
        return \@result;
    }

    # 白カードフレームCHR (MAKE_FRAME_CHR_R相当: COL_GREY=1, COL_WHITE=15, 36x56)
    my sub frame_chrs {
        my ($fc, $cc, $w, $h) = @_;
        my ($bw,$bh) = (int(($w+7)/8), int(($h+7)/8));
        my @grid;
        for my $y (0..$h-1) {
            for my $x (0..$w-1) {
                my $p;
                if ($y==0 || $y==$h-1) {
                    $p = ($x==0||$x==$w-1) ? [0,0,0,0] : $fc;
                } elsif ($y==1||$y==$h-2) {
                    $p = ($x<2||$x>=$w-2)  ? $fc         : $cc;
                } else {
                    $p = ($x==0||$x==$w-1) ? $fc         : $cc;
                }
                push @grid, $p;
            }
        }
        my @result;
        for my $J (0..$bh-1) {
            for my $I (0..$bw-1) {
                my @chd;
                for my $k (0..7) {
                    for my $i (0..7) {
                        my ($x,$y) = ($I*8+$i, $J*8+$k);
                        push @chd, ($x<$w&&$y<$h) ? $grid[$y*$w+$x] : [0,0,0,0];
                    }
                }
                push @result, \@chd;
            }
        }
        return (\@result, $bw, $bh);
    }

    my ($BLK,$WHT,$GRY,$RED) = (@CMAP[14,15,1,4]);

    # 数字キャラ (idx 0-21)
    for my $i (0..21) { $bank[$i] = bm_chr("CHAR_$i", $BLK); }
    # 英字キャラ (idx 22-26)
    for my $i (0..4) {
        $bank[22+$i] = bm_chr("CHAR_".('A','J','C','Q','K')[$i], $BLK);
    }
    # スーツキャラ (idx 27-32, X=-2オフセット)
    my @sn = qw(CIRCLE BOX SPADE DIA HEART CLUB);
    my @sc = (14,14,2,3,4,5);
    for my $i (0..5) { $bank[27+$i] = bm_chr("CHAR_$sn[$i]", $CMAP[$sc[$i]], -2); }
    # 白カードフレーム (idx 33-47)
    my ($fc,$bwf,$bhf) = frame_chrs($GRY,$WHT,36,56);  # bwf=5,bhf=7
    $bank[33] = [map {[@$WHT]} (0..63)];   # WHCD_C: 白一色
    $bank[34] = $fc->[0*5+0];  $bank[35] = $fc->[0*5+1];  # TL, T
    $bank[36] = $fc->[0*5+4];  $bank[37] = $fc->[1*5+0];  # TR, L
    $bank[38] = $fc->[1*5+4];  $bank[39] = $fc->[6*5+0];  # R, BL
    $bank[40] = $fc->[6*5+1];  $bank[41] = $fc->[6*5+4];  # B, BR
    # TLP/TRP/BLP/TLWP/TRWP/BLWP (簡略: 対応コーナーと同じ)
    @bank[42..44] = ($fc->[0*5+0], $fc->[0*5+4], $fc->[6*5+0]);
    @bank[45..47] = ($fc->[0*5+0], $fc->[0*5+4], $fc->[6*5+0]);
    # 赤フレーム (idx 48-50: TL, T, L)
    for my $j (0..7) { for my $i (0..7) {
        $bank[48][$j*8+$i] = (($j==0&&$i>0)||($j>0&&$i==0)) ? [@$RED] : [0,0,0,0];
        $bank[49][$j*8+$i] = ($j==0) ? [@$RED] : [0,0,0,0];
        $bank[50][$j*8+$i] = ($i==0) ? [@$RED] : [0,0,0,0];
    }}
    # CHR 90度回転
    my sub rotate_chr90 {
        my ($chd) = @_;
        my @r;
        for my $j (0..7) { for my $i (0..7) {
            push @r, $chd->[(7-$i)*8+$j];
        }}
        return \@r;
    }
    # ソロバン (idx 51-64)
    # LOAD_SOROBANの順: TL,TR,BR,BL=KADOを90度ずつ回転
    #                   L,T,R,B=WAKUを90度ずつ回転
    { my $t=pm_chrs('SOROBAN_TAMA',2,1); @bank[51,52]=($t->[0],$t->[1]);
      my $h=pm_chrs('SOROBAN_HARI',1,1); $bank[53]=$h->[0];
      my $e=pm_chrs('SOROBAN_TEN', 1,1); $bank[54]=$e->[0];
      my $j=pm_chrs('SOROBAN_JIKU',2,1); @bank[55,56]=($j->[0],$j->[1]);
      # KADO(角): TL=0, TR=rot90, BR=rot180, BL=rot270
      my $k0=pm_chrs('SOROBAN_KADO',1,1)->[0];
      my $k1=rotate_chr90($k0);
      my $k2=rotate_chr90($k1);
      my $k3=rotate_chr90($k2);
      $bank[57]=$k0; $bank[59]=$k1; $bank[60]=$k2; $bank[62]=$k3;
      # WAKU(辺): L=0, T=rot90, R=rot180, B=rot270
      my $w0=pm_chrs('SOROBAN_WAKU',1,1)->[0];
      my $w1=rotate_chr90($w0);
      my $w2=rotate_chr90($w1);
      my $w3=rotate_chr90($w2);
      $bank[61]=$w0; $bank[58]=$w1; $bank[63]=$w2; $bank[64]=$w3; }
    # MINI_CD (idx 65)
    { my ($mfc) = frame_chrs($GRY,$WHT,6,7); $bank[65]=$mfc->[0]; }
    # B00 (idx 66-100: 5×7=35ch)
    { my $c=pm_chrs('JRFTAROT_B00',5,7); for(0..34){$bank[66+$_]=$c->[$_];} }
    # A00 (idx 101-135)
    { my $c=pm_chrs('JRFTAROT_A00',5,7); for(0..34){$bank[101+$_]=$c->[$_];} }
    # A13 (idx 136-170)
    { my $c=pm_chrs('JRFTAROT_A13',5,7); for(0..34){$bank[136+$_]=$c->[$_];} }
    # DSC (idx 171-219: 7×7=49ch)
    { my $c=pm_chrs('JRFTAROT_DSC',7,7); for(0..48){$bank[171+$_]=$c->[$_];} }
    # TOKEN (idx 220-235: 4×4=16ch)
    { my $c=pm_chrs('YSCTOKEN',4,4); for(0..15){$bank[220+$_]=$c->[$_];} }

    # シート出力: 32列 × 8行 = 256x64px
    my @px_arr;
    for (0..256*64-1) { push @px_arr, [0,0,0,0]; }
    for my $idx (0..255) {
        my ($cx,$cy) = ($idx%32, int($idx/32));
        my ($ox,$oy) = ($cx*8, $cy*8);
        for my $j (0..7) { for my $i (0..7) {
            $px_arr[($oy+$j)*256+($ox+$i)] = $bank[$idx][$j*8+$i];
        }}
    }
    write_png("$out_dir/JRFTRT_B.png", 256, 64, \@px_arr);
}

print "\n=== 完了 ===\n";
for my $name (qw(JRFTRT_A JRFTRT_R JRFTRT_S JRFTRT_D JRFTRT_H JRFTRT_C
                 JRFTRT_RS JRFTRT_RD JRFTRT_RH JRFTRT_RC JRFTRT_T JRFTRT_B JRFTRTS7)) {
    my $path = "$out_dir/${name}.png";
    if (-f $path) {
        my @stat = stat($path);
        printf "  %-15s  %d bytes\n", "${name}.png", $stat[7];
    } else {
        print "  ${name}.png  MISSING\n";
    }
}
