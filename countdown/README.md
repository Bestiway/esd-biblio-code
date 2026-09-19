# Compte à rebours sur fond transparent

Génère une animation où un nombre dégringole (100 → 0 par défaut) sur un fond
**réellement transparent**, à poser en surimpression dans CapCut, Premiere,
DaVinci, Final Cut, etc.

## Utilisation

```bash
pip install pillow imageio-ffmpeg     # imageio-ffmpeg inutile si ffmpeg est déjà installé
python3 make_countdown.py
```

Par défaut : 100 → 0, 10 secondes, 30 fps, 1080×1920, chiffre blanc avec ombre
portée et petit rebond à chaque changement.

## Options utiles

| Option | Effet |
| --- | --- |
| `--start` / `--end` | bornes du compte à rebours (`--start 60 --end 0`) |
| `--duration` | durée totale en secondes |
| `--fps` | images par seconde (30 par défaut) |
| `--size` | dimensions, ex. `1920x1080`, `1080x1080` |
| `--color` | couleur du chiffre, ex. `--color "#FF3B30"` |
| `--font-size` | taille en px (0 = automatique) |
| `--shadow` | opacité de l'ombre portée, 0–255 (`--shadow 0` pour l'enlever) |
| `--glow` | halo coloré autour du chiffre |
| `--ring` | anneau de progression autour du nombre |
| `--ease` | défile vite au début puis ralentit vers 0 |
| `--no-pop` | supprime le rebond à chaque chiffre |
| `--offset-y` | décale le chiffre verticalement (px) |
| `--formats` | liste de formats de sortie, séparés par des virgules |

## Formats de sortie

| Valeur | Fichier | Alpha | Usage |
| --- | --- | --- | --- |
| `mov` | ProRes 4444 `.mov` | oui | le format d'alpha le plus universel en montage ; gros fichier |
| `webm` | VP9 `.webm` | oui | très léger, lu par CapCut desktop et les navigateurs |
| `pngmov` | PNG dans `.mov` | oui | sans perte, ~3× plus léger que ProRes |
| `qtrle` | QuickTime Animation `.mov` | oui | sans perte, très lourd |
| `green` | `.mp4` fond vert | non | secours quand l'app ne gère pas l'alpha : incrustation chroma |
| `preview` | `.mp4` fond gris | non | juste pour vérifier le rendu avant import |

Le rendu `green` est fait dans une passe séparée, sans ombre portée : une ombre
noire sur du vert laisse un halo que la clé chroma ne retire pas.

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
