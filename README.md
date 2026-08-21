# College Access — animations

Animations de marque pour College Access, conformes à la charte (`CLAUDE.md`).

## Carton titre — `animations/carton-titre.html`

Carton titre animé pour vos vidéos et Reels : le numéro de chapitre, le double
filet rouge/beige, puis le titre tranché en diagonale — un rappel du « A » barré
du logo. Séquence de 2,7 s.

Ouvrez simplement le fichier dans un navigateur (aucune installation, aucune
dépendance : le logo est embarqué dans la page).

| Réglage | Détail |
|---|---|
| Texte | Numéro, titre et sous-titre modifiables — `1/ LA NCAA`, `2/ LA NAIA`, `3/ LA NJCAA`… |
| Formats | 9:16 (1080×1920) · 4:5 (1080×1350) · 16:9 (1920×1080) · 1:1 (1080×1080) |
| Fonds | Ink, Navy, damier de transparence, vert d'incrustation, ou votre propre image / vidéo |
| Raccourcis | `R` rejouer · `L` boucle · `H` masquer l'interface · `Échap` la réafficher |

Le titre est mis à l'échelle par mesure de la ligne rendue : il reste dans la
safe zone quel que soit le texte. Au-delà d'une ligne, la coupe diagonale laisse
place à une entrée simple.

**Export vidéo** — masquez l'interface (`H`), puis capturez l'écran ; ou passez
le fond en vert pour une incrustation au montage. Le vert et le damier sont des
outils de production, ils ne font pas partie de la charte et ne sont jamais
diffusés.

## Socle réutilisable

| Fichier | Rôle |
|---|---|
| `src/styles/tokens.css` | Tokens de la charte (§10.2) + couche motion : durées, courbes, distances, stagger |
| `src/styles/motion.css` | Bibliothèque d'animations `ca-*` : reveal au scroll, texte découpé, cartes glass, compteurs, jauges, marquee, rideau |
| `src/scripts/ca-motion.js` | Moteur sans dépendance : observation du scroll, découpe de texte, comptage, longueurs SVG, tilt, parallaxe |

Tout le système respecte `prefers-reduced-motion` : le déplacement disparaît,
l'information reste.

## Logos — `public/logos/`

Les six fichiers d'origine portaient l'extension `.png` mais étaient des JPEG :
les variantes « transparentes » avaient donc un fond noir opaque. Ils ont été
convertis en PNG réels, et le fond noir des variantes `*_TRANSPARENT.png` a été
détouré en couche alpha.

## Note de contraste

Rouge `#D2053A` sur Navy `#001057` mesure 3,1:1 — sous le seuil WCAG AA pour du
texte courant. Réservez-le aux éléments graphiques (filets, chiffres de
chapitre) ou aux labels ≥ 18,66 px en semibold ; pour du texte courant sur navy,
utilisez le blanc.
