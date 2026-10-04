# Animations College Access

Animations texte rendues en vidéo, pensées pour être glissées dans **CapCut** sur téléphone.
Le rendu passe par Chromium (HTML/CSS, vraie typo Montserrat) puis ffmpeg.

## Fabriquer / modifier une animation

```bash
cd animations
npm install
node tools/render.mjs src/titre-trois-piliers.html --nom titre-trois-piliers
```

Animations existantes :

- `src/titre.html` — **gabarit paramétrable** de carton de titre. « | » sépare
  les lignes, `sub` ajoute le filet rouge et le qualificatif en small caps :

```bash
node tools/render.mjs src/titre.html --nom et-voila-le-resultat \
  --params "light=ET VOILÀ LE&black=RÉSULTAT"

node tools/render.mjs src/titre.html --nom titre-presaison \
  --params "light=3 CONSEILS POUR|PRÉPARER SA&black=PRÉSAISON&sub=AUX USA&duree=5.2"
```

- `src/titre-trois-piliers.html`, `src/titre-conseils-presaison.html` — les deux
  premiers titres, écrits avant le gabarit
- `src/conseil.html` — **gabarit paramétrable** de carte de point numéroté :

```bash
node tools/render.mjs src/conseil.html --nom conseil-2-anglais \
  --params "n=2&titre=L'ANGLAIS"
```

Le surtitre accepte aussi un libellé libre, pour les cartes qui ne sont pas
des conseils :

```bash
node tools/render.mjs src/conseil.html --nom etape-1-carrelage \
  --params "over=ÉTAPE 1&titre=RAYER LE CARRELAGE"
```

Le titre passe à la ligne, et son corps ne se réduit que si un mot seul est
trop large pour la safe zone.

- `src/heure.html` — **gabarit paramétrable** d'horodatage, le chiffre en
  « data hero number » de la charte :

```bash
node tools/render.mjs src/heure.html --nom heure-8h-matin \
  --params "over=IL EST&heure=8H&moment=DU MATIN"
```

Le livrable sort dans `out/` (dossier ignoré par git, les vidéos ne sont pas versionnées) :
**`<nom>_ALPHA.mov`** — ProRes 4444, fond transparent, à incruster directement.

La qualité d'encodage descend automatiquement d'un cran tant que le fichier
dépasse 29 Mo (`--max-mo` pour changer la cible), sinon il devient pénible à
transférer sur le téléphone. Sur de l'aplat, la perte est invisible.

En ajoutant `--tout`, on obtient aussi trois variantes de secours :

| Fichier | Quand l'utiliser |
|---|---|
| `*_FOND-NOIR.mp4` | Si un appareil avale mal le ProRes : incruster puis **Mélange → Écran**, le noir devient transparent. ~150 Ko. |
| `*_NAVY.mov` | Plan plein écran autonome (carton de titre sur navy). |
| `*_apercu.mp4` | Aperçu 540×960 pour valider sans importer. |

## Changer le texte

Tout est dans le `.html` : le texte dans le corps de page, le minutage en bas du fichier.

```js
CA.revealUp($('l1'), { at: 0.16, dur: 0.95 });  // at = seconde de démarrage
```

`window.CA_DURATION` fixe la durée totale exportée.

## Règles de marque appliquées

- Palette : navy `#001057`, rouge `#D2053A`, beige `#F4F7E6`, ink `#0A0D17`, blanc.
- Typo Montserrat embarquée en local (`fonts/`, 9 graisses) — aucun appel réseau au rendu.
- Contraste de graisses signature : Light 300 au-dessus de Black 900.
- Qualificatif en small caps, `letter-spacing` 18 %, accents rouges en filets fins.
- Jamais de rouge en texte sur navy (combinaison interdite par la charte) : le rouge
  reste sur les filets d'accent.

## Note technique

Les animations sont créées **en pause** (Web Animations API) et le script de rendu
appelle `CA.seek(t)` frame par frame. L'export est donc identique à chaque fois,
sans image sautée — contrairement à une capture d'écran en temps réel.

Le rendu désactive l'anticrénelage sous-pixel (`--disable-lcd-text`) : indispensable
pour obtenir des bords de texte propres sur fond transparent.
