#!/usr/bin/env python3
"""Genere une animation de compte a rebours sur fond transparent.

Sortie : .mov (QuickTime Animation ou ProRes 4444) et/ou .webm (VP9 alpha),
les deux avec un vrai canal alpha, pretes a etre posees en surimpression
dans CapCut, Premiere, DaVinci, Final Cut...

Exemple :
    python3 make_countdown.py --start 100 --end 0 --duration 10 --size 1080x1920
"""

import argparse
import math
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, "fonts")
FONT_FILE = os.path.join(FONT_DIR, "InterDisplay-Black.ttf")
FONT_URL = (
    "https://github.com/google/fonts/raw/main/ofl/inter/"
    "Inter%5Bopsz%2Cwght%5D.ttf"
)
FONT_FALLBACKS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]


# --------------------------------------------------------------------------- #
# outils
# --------------------------------------------------------------------------- #
def ffmpeg_bin():
    """Chemin vers ffmpeg : celui du systeme, sinon celui d'imageio-ffmpeg."""
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("ffmpeg introuvable : installe-le ou fais `pip install imageio-ffmpeg`.")


def load_font(size):
    if os.path.exists(FONT_FILE):
        return ImageFont.truetype(FONT_FILE, size)
    os.makedirs(FONT_DIR, exist_ok=True)
    try:
        urllib.request.urlretrieve(FONT_URL, FONT_FILE)
        return ImageFont.truetype(FONT_FILE, size)
    except Exception:
        if os.path.exists(FONT_FILE):
            os.remove(FONT_FILE)
    for path in FONT_FALLBACKS:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    sys.exit("Aucune police utilisable trouvee.")


def hex_to_rgb(value):
    value = value.lstrip("#")
    if len(value) == 3:
        value = "".join(c * 2 for c in value)
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def ease_out_cubic(t):
    return 1 - (1 - t) ** 3


# --------------------------------------------------------------------------- #
# rendu
# --------------------------------------------------------------------------- #
def render_number(text, font, color, glow, shadow_offset, shadow_blur, shadow_alpha):
    """Dessine un nombre blanc (ou colore) avec son ombre portee, sur transparent."""
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    left, top, right, bottom = probe.textbbox((0, 0), text, font=font)
    pad = shadow_blur * 4 + abs(shadow_offset) + 12
    w = (right - left) + pad * 2
    h = (bottom - top) + pad * 2
    origin = (pad - left, pad - top)

    # masque du texte, sert a la fois pour l'ombre et pour le remplissage
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).text(origin, text, font=font, fill=255)

    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    if shadow_alpha > 0:
        shadow_mask = mask.filter(ImageFilter.GaussianBlur(shadow_blur))
        shadow_mask = shadow_mask.point(lambda v: int(v * shadow_alpha / 255))
        shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        shadow.putalpha(shadow_mask)
        layer.alpha_composite(shadow, (0, shadow_offset))

    if glow > 0:
        glow_mask = mask.filter(ImageFilter.GaussianBlur(glow))
        glow_mask = glow_mask.point(lambda v: int(v * 0.55))
        halo = Image.new("RGBA", (w, h), color + (0,))
        halo.putalpha(glow_mask)
        layer.alpha_composite(halo)

    fill = Image.new("RGBA", (w, h), color + (0,))
    fill.putalpha(mask)
    layer.alpha_composite(fill)
    return layer


def render_ring(size, progress, color, thickness, radius, supersample=3):
    """Anneau de progression antialiase (dessine en grand puis reduit)."""
    s = supersample
    big = Image.new("RGBA", (size[0] * s, size[1] * s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(big)
    cx, cy = big.size[0] / 2, big.size[1] / 2
    r = radius * s
    box = (cx - r, cy - r, cx + r, cy + r)
    draw.ellipse(box, outline=color + (60,), width=thickness * s)
    if progress > 0:
        draw.arc(box, -90, -90 + 360 * progress, fill=color + (255,), width=thickness * s)
    return big.resize(size, Image.LANCZOS)


def build_frames(args, outdir):
    width, height = args.size
    font_size = args.font_size or int(min(width, height) * 0.42)
    font = load_font(font_size)
    color = hex_to_rgb(args.color)

    values = list(range(args.start, args.end - 1, -1)) if args.start >= args.end else list(
        range(args.start, args.end + 1)
    )
    n_values = len(values)
    count_frames = max(1, round(args.duration * args.fps))
    hold_frames = max(0, round(args.hold * args.fps))

    shadow_blur = max(1, int(font_size * 0.055))
    shadow_offset = int(font_size * 0.035)
    glow = int(font_size * 0.09) if args.glow else 0

    # un seul rendu par nombre, ensuite on ne fait que redimensionner
    cache = {
        v: render_number(
            str(v), font, color, glow, shadow_offset, shadow_blur, args.shadow
        )
        for v in set(values)
    }

    pop_frames = max(1, round(args.fps * args.pop_time))

    # index du nombre affiche pour chaque frame, et frame ou ce nombre apparait
    frame_idx = []
    for i in range(count_frames):
        t = i / count_frames                      # 0 -> 1 sur le defilement
        eased = ease_out_cubic(t) if args.ease else t
        frame_idx.append(min(n_values - 1, int(eased * n_values)))
    # on garde le dernier nombre a l'ecran, sinon il ne dure qu'une poignee de frames
    frame_idx.extend([n_values - 1] * hold_frames)
    total_frames = len(frame_idx)
    first_frame = {}
    for i, idx in enumerate(frame_idx):
        first_frame.setdefault(idx, i)

    for i in range(total_frames):
        idx = frame_idx[i]
        value = values[idx]

        frame = Image.new("RGBA", (width, height), (0, 0, 0, 0))

        if args.ring:
            remaining = 1 - (idx / max(1, n_values - 1))
            frame.alpha_composite(
                render_ring(
                    (width, height),
                    remaining,
                    color,
                    max(2, int(min(width, height) * 0.012)),
                    int(min(width, height) * 0.36),
                )
            )

        # effet "pop" : le nombre grossit legerement a chaque changement
        age = i - first_frame[idx]
        if args.pop and age < pop_frames:
            k = ease_out_cubic(age / pop_frames)
            scale = 1 + args.pop_amount * (1 - k)
        else:
            scale = 1.0

        layer = cache[value]
        if scale != 1.0:
            layer = layer.resize(
                (max(1, int(layer.width * scale)), max(1, int(layer.height * scale))),
                Image.LANCZOS,
            )

        x = (width - layer.width) // 2
        y = (height - layer.height) // 2 + args.offset_y
        frame.alpha_composite(layer, (x, y))

        frame.save(os.path.join(outdir, "f%05d.png" % i))

        if i % 30 == 0 or i == total_frames - 1:
            print("  frame %d/%d" % (i + 1, total_frames), end="\r", flush=True)

    print()
    return total_frames


# --------------------------------------------------------------------------- #
# encodage
# --------------------------------------------------------------------------- #
# formats sans canal alpha : le rendu est aplati sur une couleur de fond
FLAT_BACKGROUNDS = {"green": "0x00B140", "preview": "0x2B2B2B"}


def encode(frames_dir, fps, size, out_path, fmt):
    ff = ffmpeg_bin()
    base = [ff, "-y", "-hide_banner", "-loglevel", "error",
            "-framerate", str(fps), "-i", os.path.join(frames_dir, "f%05d.png")]

    if fmt == "mov":                       # ProRes 4444 : alpha, la reference des montages
        cmd = base + ["-c:v", "prores_ks", "-profile:v", "4444",
                      "-pix_fmt", "yuva444p10le", "-alpha_bits", "16", out_path]
    elif fmt == "qtrle":                   # QuickTime Animation : alpha sans perte, tres lourd
        cmd = base + ["-c:v", "qtrle", "-pix_fmt", "argb", out_path]
    elif fmt == "pngmov":                  # PNG dans un .mov : alpha sans perte, plus leger
        # -pred mixed : le filtrage PNG fait gagner ~10 % sur des degrades d'alpha
        cmd = base + ["-c:v", "png", "-pix_fmt", "rgba", "-pred", "mixed", out_path]
    elif fmt == "webm":                    # VP9 alpha : leger
        cmd = base + ["-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0",
                      "-crf", "24", "-auto-alt-ref", "0", "-row-mt", "1", out_path]
    elif fmt in FLAT_BACKGROUNDS:          # aplati sur fond vert (incrustation) ou gris (apercu)
        color = FLAT_BACKGROUNDS[fmt]
        cmd = base + [
            "-f", "lavfi", "-i",
            "color=c=%s:s=%dx%d:r=%d" % (color, size[0], size[1], fps),
            "-filter_complex", "[1][0]overlay=shortest=1,format=yuv420p",
            "-c:v", "libx264", "-crf", "18", "-preset", "medium", out_path,
        ]
    else:
        raise ValueError(fmt)
    subprocess.run(cmd, check=True)
    return out_path


def parse_size(text):
    w, h = text.lower().split("x")
    return int(w), int(h)


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--start", type=int, default=100, help="nombre de depart (def. 100)")
    p.add_argument("--end", type=int, default=0, help="nombre d'arrivee (def. 0)")
    p.add_argument("--duration", type=float, default=10.0,
                   help="duree du defilement en secondes (hors maintien final)")
    p.add_argument("--hold", type=float, default=1.0,
                   help="secondes pendant lesquelles le dernier nombre reste affiche")
    p.add_argument("--fps", type=int, default=30)
    p.add_argument("--size", type=parse_size, default=(1080, 1920), help="ex. 1080x1920")
    p.add_argument("--font-size", type=int, default=0, help="0 = auto")
    p.add_argument("--color", default="#FFFFFF")
    p.add_argument("--shadow", type=int, default=170,
                   help="opacite de l'ombre portee 0-255 (0 = aucune)")
    p.add_argument("--glow", action="store_true", help="halo colore autour du chiffre")
    p.add_argument("--ring", action="store_true", help="anneau de progression")
    p.add_argument("--ease", action="store_true",
                   help="defile vite au debut puis ralentit vers 0")
    p.add_argument("--pop", dest="pop", action="store_true", default=True)
    p.add_argument("--no-pop", dest="pop", action="store_false",
                   help="desactive le petit rebond a chaque chiffre")
    p.add_argument("--pop-amount", type=float, default=0.12)
    p.add_argument("--pop-time", type=float, default=0.09, help="duree du rebond (s)")
    p.add_argument("--offset-y", type=int, default=0, help="decalage vertical en px")
    p.add_argument("--formats", default="mov,webm",
                   help="mov (ProRes 4444 alpha), webm (VP9 alpha), qtrle, pngmov,\n"
                        "green (fond vert a incruster), preview (apercu sur gris)")
    p.add_argument("--out", default="countdown", help="prefixe des fichiers de sortie")
    p.add_argument("--keep-frames", action="store_true", help="garde les PNG")
    args = p.parse_args()

    formats = [f.strip() for f in args.formats.split(",") if f.strip()]
    unknown = [f for f in formats
               if f not in ("mov", "qtrle", "pngmov", "webm", "green", "preview")]
    if unknown:
        sys.exit("Format inconnu : %s" % ", ".join(unknown))

    # le fond vert s'incruste proprement seulement sans ombre portee :
    # une ombre noire sur du vert laisse un halo que la cle chroma ne retire pas.
    needs_shadowless = "green" in formats and args.shadow > 0
    passes = {"normal": [f for f in formats if f != "green"]}
    if needs_shadowless:
        passes["shadowless"] = ["green"]
    elif "green" in formats:
        passes["normal"] = formats

    dirs, outputs = {}, []
    for pass_name, pass_formats in passes.items():
        if not pass_formats:
            continue
        pass_args = argparse.Namespace(**vars(args))
        if pass_name == "shadowless":
            pass_args.shadow = 0
        tmp = tempfile.mkdtemp(prefix="countdown_")
        dirs[pass_name] = tmp
        print("Rendu des images %s (%dx%d, %g s + %g s de maintien, %d fps)..."
              % (pass_name, *args.size, args.duration, args.hold, args.fps))
        build_frames(pass_args, tmp)

        for fmt in pass_formats:
            ext = "mov" if fmt in ("mov", "qtrle", "pngmov") else (
                "webm" if fmt == "webm" else "mp4")
            suffix = {"green": "_fondvert", "preview": "_apercu"}.get(fmt, "")
            out = "%s_%d-%d_%dx%d%s.%s" % (args.out, args.start, args.end,
                                           args.size[0], args.size[1], suffix, ext)
            print("Encodage %s..." % out)
            encode(tmp, args.fps, args.size, out, fmt)
            outputs.append(out)

    for tmp in dirs.values():
        if args.keep_frames:
            print("PNG conserves dans %s" % tmp)
        else:
            shutil.rmtree(tmp, ignore_errors=True)

    for out in outputs:
        print("%s  (%.1f Mo)" % (out, os.path.getsize(out) / 1e6))


if __name__ == "__main__":
    main()
