# Compte à rebours sur fond transparent

Génère une animation où un nombre dégringole (100 → 0 par défaut) sur un fond
**réellement transparent**, à poser en surimpression dans CapCut, Premiere,
DaVinci, Final Cut, etc.

## Utilisation

```bash
pip install pillow imageio-ffmpeg     # imageio-ffmpeg inutile si ffmpeg est déjà installé
python3 make_countdown.py
```

Par défaut : 100 → 0 en 10 secondes puis 1 seconde sur le 0, 30 fps, 1080×1920,
chiffre blanc cerné d'un contour sombre, avec un rebond sur les nombres qui
restent assez longtemps à l'écran pour qu'il se voie.

## Options utiles

| Option | Effet |
| --- | --- |
| `--start` / `--end` | bornes du compte à rebours (`--start 60 --end 0`) |
| `--duration` | durée du défilement en secondes (hors maintien final) |
| `--hold` | secondes pendant lesquelles le dernier nombre reste affiché (1 s par défaut) |
| `--fps` | images par seconde (30 par défaut) |
| `--size` | dimensions, ex. `1920x1080`, `1080x1080` |
| `--color` | couleur du chiffre, ex. `--color "#FF3B30"` |
| `--font-size` | taille en px (0 = automatique) |
| `--outline` | épaisseur du contour, en % de la taille de police (0 = aucun) |
| `--outline-color` / `--outline-alpha` | couleur et opacité du contour |
| `--shadow` | opacité d'une ombre portée floue, 0–255 (0 par défaut, voir ci-dessous) |
| `--glow` | halo coloré autour du chiffre |
| `--ring` | anneau de progression autour du nombre |
| `--ease` | défile vite au début puis ralentit vers 0 |
| `--no-pop` | supprime le rebond à chaque chiffre |
| `--offset-y` | décale le chiffre verticalement (px) |
| `--formats` | liste de formats de sortie, séparés par des virgules |

## Formats de sortie

| Valeur | Fichier | Alpha | Usage |
| --- | --- | --- | --- |
| `mov` | QuickTime Animation `.mov` | oui | **le choix par défaut** : sans perte, et c'est le codec alpha que lisent le plus d'applications, CapCut compris |
| `webm` | VP9 `.webm` | oui | très léger, lu par CapCut desktop et les navigateurs |
| `prores` | ProRes 4444 `.mov` | oui | standard des suites de montage, mais ~3× plus lourd ici |
| `pngmov` | PNG dans `.mov` | oui | léger, **mais beaucoup d'applications (dont CapCut) ne le décodent pas et affichent une image vide** |
| `green` | `.mp4` fond vert | non | secours quand l'app ne gère pas l'alpha : incrustation chroma |
| `preview` | `.mp4` fond gris | non | juste pour vérifier le rendu avant import |

Si l'option `--shadow` est utilisée, le rendu `green` est fait dans une passe
séparée sans ombre : une ombre noire sur du vert laisse un halo que la clé
chroma ne retire pas.

## Pourquoi un contour plutôt qu'une ombre portée

Les codecs `.mov` sans perte compressent par plages de pixels identiques. Un
dégradé d'ombre rend presque chaque pixel unique, et un rebond appliqué à un
nombre qui ne dure que 2–3 images rend presque chaque *image* unique. Mesuré
sur le rendu 1080×1920 de 11 s, en QuickTime Animation :

| Rendu | Poids |
| --- | --- |
| ombre portée + rebond partout | 117 Mo |
| contour + rebond partout | 33 Mo |
| contour, rebond seulement sur les nombres tenus | **7 Mo** |

D'où les réglages par défaut. `--shadow 170` reste disponible si le poids n'est
pas un problème.

## Exemples

```bash
# 60 → 0 en 6 s, horizontal, chiffre rouge
python3 make_countdown.py --start 60 --end 0 --duration 6 --size 1920x1080 --color "#FF3B30"

# 10 → 0 avec anneau de progression et ralenti sur la fin
python3 make_countdown.py --start 10 --end 0 --duration 5 --ring --ease

# uniquement le webm léger
python3 make_countdown.py --formats webm
```

## Police

Le script utilise `fonts/InterDisplay-Black.ttf` s'il la trouve, sinon il tente
de télécharger Inter, sinon il retombe sur une police grasse du système
(DejaVu Sans Bold, Liberation Sans Bold). Le dossier `fonts/` n'est pas versionné.
