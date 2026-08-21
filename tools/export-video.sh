#!/usr/bin/env bash
# College Access — encode la séquence d'images en fichiers vidéo prêts au montage.
#
#   node tools/render-frames.js --title "LA NCAA" --index "1/" --out ./build
#   tools/export-video.sh ./build
#
# Produit deux fichiers :
#   *-alpha.mov      ProRes 4444, vraie couche alpha — CapCut iOS, Premiere,
#                    DaVinci, After Effects, Final Cut.
#   *-fond-vert.mp4  H.264 sur vert d'incrustation — la voie qui fonctionne
#                    partout, y compris CapCut Android : incruster avec
#                    l'outil « Chroma key » de l'app.
#
# Le VP9/WebM alpha n'est pas produit : de nombreux ffmpeg sont compilés sans
# le support alpha de libvpx, et CapCut mobile ne lit pas le WebM de façon
# fiable. Vérifiez toujours la sortie avec la commande de contrôle en fin de
# fichier.

set -euo pipefail

BUILD="${1:-./build}"
FRAMES="$BUILD/frames"
NAME="${2:-carton-titre}"
FPS="${FPS:-30}"
GREEN="${GREEN:-0x00B140}"

[ -d "$FRAMES" ] || { echo "Images introuvables dans $FRAMES"; exit 1; }

ffmpeg -hide_banner -loglevel error -y -framerate "$FPS" -i "$FRAMES/f%04d.png" \
  -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le -vendor apl0 -qscale:v 12 \
  "$BUILD/$NAME-alpha.mov"

ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "color=c=$GREEN:s=1080x1920:r=$FPS" \
  -framerate "$FPS" -i "$FRAMES/f%04d.png" \
  -filter_complex "[0][1]overlay=shortest=1,format=yuv420p" \
  -c:v libx264 -preset slow -crf 18 -movflags +faststart \
  "$BUILD/$NAME-fond-vert.mp4"

# Contrôle : la transparence a-t-elle survécu à l'encodage ?
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt \
  -of default=nw=1 "$BUILD/$NAME-alpha.mov"

ls -lh "$BUILD/$NAME-alpha.mov" "$BUILD/$NAME-fond-vert.mp4"
