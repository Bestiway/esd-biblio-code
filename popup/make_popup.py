#!/usr/bin/env python3
"""Fait apparaitre une video en "pop", dans un cadre arrondi colore.

La video est decodee image par image, composee dans un cadre a coins arrondis,
puis animee d'un zoom avec petit rebond au demarrage. Le fond reste transparent
dans les sorties qui gerent l'alpha.

Exemple :
    python3 make_popup.py ma_video.mp4 --out sortie
"""

import argparse
import os
import shutil
import subprocess
import sys

from PIL import Image, ImageDraw

SS = 4  # facteur de suréchantillonnage pour lisser les coins arrondis


def ffmpeg_bin():
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("ffmpeg introuvable : installe-le ou fais `pip install imageio-ffmpeg`.")


def ffprobe_bin():
    found = shutil.which("ffprobe")
    if found:
        return found
    guess = os.path.join(os.path.dirname(ffmpeg_bin()), "ffprobe")
    return guess if os.path.exists(guess) else None


def probe(path):
    """Duree, cadence et presence d'une piste audio du fichier source."""
    ff = ffmpeg_bin()
    out = subprocess.run([ff, "-hide_banner", "-i", path],
                         capture_output=True, text=True).stderr
    fps, has_audio = None, "Audio:" in out
    for line in out.splitlines():
        if "Video:" in line:
            for part in line.split(","):
                part = part.strip()
                if part.endswith(" fps"):
                    fps = float(part[:-4])
    if fps is None:
        sys.exit("Impossible de lire la cadence de la video source.")
    return fps, has_audio


def hex_to_rgb(value):
    value = value.lstrip("#")
    if len(value) == 3:
        value = "".join(c * 2 for c in value)
    return tuple(int(value[i: i + 2], 16) for i in (0, 2, 4))


def rounded_mask(size, radius):
    """Masque de rectangle arrondi, lisse par surechantillonnage."""
    big = Image.new("L", (size[0] * SS, size[1] * SS), 0)
    ImageDraw.Draw(big).rounded_rectangle(
        (0, 0, big.size[0] - 1, big.size[1] - 1), radius=radius * SS, fill=255
    )
    return big.resize(size, Image.LANCZOS)


def ease_out_back(p, overshoot):
    """Zoom qui depasse legerement la taille finale avant de se caler dessus."""
    c1 = overshoot
    c3 = c1 + 1
    return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("input", help="video source")
    p.add_argument("--out", default="popup", help="prefixe des fichiers de sortie")
    p.add_argument("--size", default="1920x1080", help="dimensions de sortie")
    p.add_argument("--fill", type=float, default=0.86,
                   help="part de la largeur occupee par la video (0-1)")
    p.add_argument("--border", type=int, default=0,
                   help="epaisseur du cadre en px (0 = auto, ~0,8 %% de la largeur)")
    p.add_argument("--radius", type=int, default=0,
                   help="rayon des coins en px (0 = auto)")
    p.add_argument("--color", default="#FF2626", help="couleur du cadre")
    p.add_argument("--pop", type=float, default=0.45,
                   help="duree de l'apparition en secondes")
    p.add_argument("--overshoot", type=float, default=1.5,
                   help="ampleur du rebond (0 = pas de depassement)")
    p.add_argument("--start-scale", type=float, default=0.0,
                   help="echelle de depart de l'apparition")
    p.add_argument("--formats", default="webm,black,white",
                   help="webm (alpha), mov (alpha, lourd), black, white, none")
    args = p.parse_args()

    ff = ffmpeg_bin()
    canvas_w, canvas_h = (int(v) for v in args.size.lower().split("x"))
    fps, has_audio = probe(args.input)

    # la video occupe --fill de la largeur ; le cadre se dessine autour d'elle
    inner_w = int(canvas_w * args.fill) // 2 * 2
    inner_h = int(inner_w * canvas_h / canvas_w) // 2 * 2
    border = args.border or max(2, round(canvas_w * 0.008))
    radius = args.radius or max(4, round(canvas_w * 0.022))
    elem_w, elem_h = inner_w + 2 * border, inner_h + 2 * border

    if elem_w > canvas_w or elem_h > canvas_h:
        sys.exit("Le cadre deborde du canevas : baisse --fill ou --border.")

    # cadre et masque sont identiques sur toute la duree : calcules une fois
    frame_rgba = Image.new("RGBA", (elem_w, elem_h), hex_to_rgb(args.color) + (0,))
    frame_rgba.putalpha(rounded_mask((elem_w, elem_h), radius))
    inner_mask = rounded_mask((inner_w, inner_h), max(1, radius - border))

    pop_frames = max(1, round(args.pop * fps))
    raw_path = args.out + "_raw.rgba"
    frame_bytes = inner_w * inner_h * 3

    decode = subprocess.Popen(
        [ff, "-hide_banner", "-loglevel", "error", "-i", args.input,
         "-vf", "scale=%d:%d" % (inner_w, inner_h),
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE)

    print("Composition (%dx%d, video %dx%d, cadre %d px, coins %d px)..."
          % (canvas_w, canvas_h, inner_w, inner_h, border, radius))

    n = 0
    with open(raw_path, "wb") as raw:
        while True:
            buf = decode.stdout.read(frame_bytes)
            if len(buf) < frame_bytes:
                break

            video = Image.frombytes("RGB", (inner_w, inner_h), buf).convert("RGBA")
            video.putalpha(inner_mask)
            element = frame_rgba.copy()
            element.alpha_composite(video, (border, border))

            if n < pop_frames:
                progress = (n + 1) / pop_frames
                eased = ease_out_back(progress, args.overshoot)
                scale = max(0.001, args.start_scale + (1 - args.start_scale) * eased)
            else:
                scale = 1.0

            canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
            if scale != 1.0:
                sw = max(1, round(elem_w * scale))
                sh = max(1, round(elem_h * scale))
                element = element.resize((sw, sh), Image.LANCZOS)
                # une apparition trop brutale "flashe" : on fond le tout au demarrage
                fade = min(1.0, (n + 1) / max(1, pop_frames * 0.35))
                if fade < 1.0:
                    alpha = element.getchannel("A").point(lambda v: int(v * fade))
                    element.putalpha(alpha)
            else:
                sw, sh = elem_w, elem_h

            canvas.alpha_composite(element, ((canvas_w - sw) // 2, (canvas_h - sh) // 2))
            raw.write(canvas.tobytes())
            n += 1
            if n % 25 == 0:
                print("  %d images" % n, end="\r", flush=True)

    decode.stdout.close()
    decode.wait()
    print("  %d images composees" % n)
    if n == 0:
        sys.exit("Aucune image lue depuis la source.")

    raw_in = ["-f", "rawvideo", "-pix_fmt", "rgba",
              "-s", "%dx%d" % (canvas_w, canvas_h), "-framerate", "%g" % fps,
              "-i", raw_path]
    audio_in = ["-i", args.input] if has_audio else []
    maps = ["-map", "0:v"] + (["-map", "1:a"] if has_audio else [])

    outputs = []
    for fmt in [f.strip() for f in args.formats.split(",") if f.strip()]:
        if fmt == "webm":
            out = args.out + "_transparent.webm"
            cmd = ([ff, "-y", "-hide_banner", "-loglevel", "error"] + raw_in + audio_in
                   + maps + ["-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0",
                             "-crf", "30", "-auto-alt-ref", "0", "-row-mt", "1"]
                   + (["-c:a", "libopus", "-b:a", "128k"] if has_audio else []) + [out])
        elif fmt == "mov":
            out = args.out + "_transparent.mov"
            cmd = ([ff, "-y", "-hide_banner", "-loglevel", "error"] + raw_in + audio_in
                   + maps + ["-c:v", "prores_ks", "-profile:v", "4444",
                             "-pix_fmt", "yuva444p10le", "-alpha_bits", "16"]
                   + (["-c:a", "pcm_s16le"] if has_audio else []) + [out])
        elif fmt in ("black", "white"):
            color = "black" if fmt == "black" else "white"
            out = "%s_fond_%s.mp4" % (args.out, "noir" if fmt == "black" else "blanc")
            bg = ["-f", "lavfi", "-i",
                  "color=c=%s:s=%dx%d:r=%g" % (color, canvas_w, canvas_h, fps)]
            a_idx = 2 if has_audio else None
            cmd = ([ff, "-y", "-hide_banner", "-loglevel", "error"] + raw_in + bg
                   + (["-i", args.input] if has_audio else [])
                   + ["-filter_complex", "[1][0]overlay=shortest=1,format=yuv420p[v]",
                      "-map", "[v]"]
                   + (["-map", "%d:a" % a_idx] if has_audio else [])
                   + ["-c:v", "libx264", "-crf", "18", "-preset", "medium"]
                   + (["-c:a", "aac", "-b:a", "192k"] if has_audio else []) + [out])
        elif fmt == "none":
            continue
        else:
            sys.exit("Format inconnu : %s" % fmt)

        print("Encodage %s..." % out)
        subprocess.run(cmd, check=True)
        outputs.append(out)

    os.remove(raw_path)
    for out in outputs:
        print("%s  (%.1f Mo)" % (out, os.path.getsize(out) / 1e6))


if __name__ == "__main__":
    main()
