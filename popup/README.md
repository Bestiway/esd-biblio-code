# Vidéo en pop-up dans un cadre arrondi

Fait apparaître une vidéo en « pop » (zoom avec petit rebond) à l'intérieur d'un
cadre coloré à coins arrondis. Le son de la source est conservé.

## Utilisation

```bash
pip install pillow imageio-ffmpeg     # imageio-ffmpeg inutile si ffmpeg est déjà installé
python3 make_popup.py ma_video.mp4 --out sortie
```

Par défaut : sortie 1920×1080, la vidéo occupe 86 % de la largeur, cadre rouge
de 15 px à coins de 42 px, apparition en 0,45 s avec un dépassement d'environ
7 % avant de se caler.

## Options

| Option | Effet |
| --- | --- |
| `--out` | préfixe des fichiers produits |
| `--size` | dimensions de sortie, ex. `1080x1920`, `3840x2160` |
| `--fill` | part de la largeur occupée par la vidéo (0–1) |
| `--border` | épaisseur du cadre en px (0 = auto, ~0,8 % de la largeur) |
| `--radius` | rayon des coins en px (0 = auto) |
| `--color` | couleur du cadre, ex. `--color "#FFFFFF"` |
| `--pop` | durée de l'apparition en secondes |
| `--overshoot` | ampleur du rebond (0 = zoom sans dépassement) |
| `--start-scale` | échelle de départ (0 = part de rien) |
| `--formats` | liste des sorties, séparées par des virgules |

## Formats de sortie

| Valeur | Fichier | Alpha | Usage |
| --- | --- | --- | --- |
| `webm` | VP9 `.webm` + Opus | oui | fond transparent, léger ; lu par CapCut desktop |
| `mov` | ProRes 4444 `.mov` | oui | fond transparent, compatibilité maximale, **mais ~40 Mo par seconde en 1080p** |
| `black` | `.mp4` fond noir | non | clip autonome |
| `white` | `.mp4` fond blanc | non | clip autonome |

Pour un fond transparent avec une vidéo réelle, il n'y a pas de bon compromis :
les codecs alpha sans perte (QuickTime Animation) sont inutilisables sur du
contenu photographique, et ProRes 4444 est énorme. Le `webm` VP9 est le seul
format alpha à la fois léger et de qualité correcte.

## Fonctionnement

La vidéo est décodée en brut par ffmpeg, redimensionnée à la taille intérieure
du cadre, puis composée image par image avec Pillow : masque de coins arrondis
suréchantillonné ×4 pour un bord lisse, cadre coloré dessous, zoom appliqué
pendant l'apparition. Les images composées sont écrites en RGBA brut, puis
encodées une fois par format demandé, avec l'audio remuxé depuis la source.
