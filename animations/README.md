# Animations College Access

Animations texte rendues en vidéo, pensées pour être glissées dans **CapCut** sur téléphone.
Le rendu passe par Chromium (HTML/CSS, vraie typo Montserrat) puis ffmpeg.

## Fabriquer / modifier une animation

```bash
cd animations
npm install
node tools/render.mjs src/titre-trois-piliers.html --nom titre-trois-piliers
```

Les fichiers sortent dans `out/` (dossier ignoré par git, les vidéos ne sont pas versionnées) :

| Fichier | Quoi | Quand l'utiliser |
|---|---|---|
| `*_ALPHA.mov` | ProRes 4444, **fond transparent** | Incrustation directe par-dessus ta vidéo. Gros fichier (~50 Mo pour 5 s). |
| `*_FOND-NOIR.mp4` | Texte sur fond noir | Secours universel : dans CapCut, incruste puis **Mélange → Écran**. Le noir devient transparent. ~120 Ko. |
| `*_NAVY.mov` | Aplati sur navy `#001057` | Plan plein écran autonome (carton de titre). |
| `*_apercu.mp4` | Aperçu 540×960 | Juste pour valider avant export. |

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
