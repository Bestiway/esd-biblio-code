# CLAUDE.md — College Access

> Ce fichier est lu automatiquement par Claude Code au démarrage de chaque session dans ce dossier. Il définit l'identité de marque et les règles à suivre pour toute création visuelle ou textuelle.

---

## 🎯 À propos de l'agence

**College Access** est une agence de conseil stratégique qui accompagne les jeunes athlètes français vers les universités américaines (NCAA / NAIA / NJCAA). Notre mission : transformer le talent sportif en levier financier via les bourses d'études.

**Positionnement** : Le pont entre performance sportive et excellence académique.

**Ton de voix** : rigoureux, ambitieux, factuel, aspirationnel — jamais racoleur. On parle à des joueurs sérieux et à leurs parents.

---

## 🎨 Identité visuelle — RÈGLES ABSOLUES

### Couleurs

N'utilise **JAMAIS** d'autres couleurs que celles-ci pour l'identité de marque :

| Rôle | Nom | HEX | RGB | Usage |
|---|---|---|---|---|
| Primary | Navy Blue | `#001057` | `0, 16, 87` | Fonds principaux, titres corporate, autorité |
| Accent | Red | `#D2053A` | `210, 5, 58` | CTA, highlights, énergie sportive |
| Neutral | Beige | `#F4F7E6` | `244, 247, 230` | Fonds neutres, cartes, respiration |
| Base | White | `#FFFFFF` | `255, 255, 255` | Texte sur fonds sombres, fonds clairs |
| Ink | Deep Black | `#0A0D17` | `10, 13, 23` | Texte premium, fonds ultra-sombres |

**Neutres autorisés** (pour UI/data visualization) : gris dérivés des couleurs primaires uniquement.

### Typographie

- **Sakana** → titres à forte identité, headlines uniques, logo lockups (rare, effet signature)
- **Montserrat** → tout le reste (titres courants, sous-titres, corps de texte, UI)

**Fallbacks web** : `'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

**Contraste de graisses recommandé** (style Apple / EF) :
- Titre en `Thin` (100) ou `Light` (300) + label en `Bold` (700) ou `Black` (900)
- Éviter d'utiliser 3 graisses différentes dans un même écran

### Logos

Assets dans `assets/logos/` :
- `LOGO_COLLEGE_ACCESS_FOND_BLEU.png` → version pleine sur fond navy
- `LOGO_COLLEGE_ACCESS_FOND_TRANSPARENT.png` → version pleine transparente
- `LOGO_COLLEGE_ACCESS_MAIL.png` → version compacte email
- `LOGO_COLLEGE_ACCESS_MAIL_TRANSPARENT.png` → version compacte transparente
- `LOGO_COLLEGE_ACCESS_SOCIALMEDIA.png` → icône seule "A" fond navy
- `LOGO_COLLEGE_ACCESS_SOCIALMEDIA_TRANSPARENT.png` → icône seule transparente

**Règles logo** :
- Espacement minimum autour du logo = hauteur de la lettre "A"
- Ne jamais déformer, changer les couleurs, ajouter d'effet
- Sur fond sombre → version blanche ou transparente
- Sur fond clair → version navy
- Pour favicon / app icon → utiliser l'icône `SOCIALMEDIA`

---

## 🧬 Principes de design (inspirations DA)

Le style visuel s'inspire de **trois références premium** :

1. **Apple** — Minimalisme, espace négatif, contraste typographique extrême (Thin + Black), profondeur discrète
2. **EF Education First** — Aspiration éducative, color-blocking élégant, respiration
3. **Eyeball** — Data-driven, statistiques en avant, glassmorphism, crédibilité par les chiffres

### Techniques signature à utiliser

- **Glassmorphism** : cartes en `background-blur: 30-40px` + fond `white 10% opacity` + border `white 20% opacity`
- **Contraste de graisses extrême** : `Thin 96px` à côté de `SemiBold 18px` avec letter-spacing élevé
- **Chiffres "fantômes"** : gros nombres décoratifs à `opacity 0.04` en arrière-plan
- **Gradients sophistiqués** : radial + linéaires multi-stops (jamais de gradients criards)
- **Espace négatif maîtrisé** : ne pas remplir les vides, les laisser respirer
- **Détails fins** : lignes d'accent 2-3px, letter-spacing sur les small caps (18-22%)
- **Data-viz honnête** : barres de progression, cartes stat en glassmorphism

### À éviter absolument

- ❌ Emojis dans les designs finaux (utiliser des icônes vectorielles)
- ❌ Ombres portées agressives (opter pour drop-shadow subtile `y=30 blur=60 opacity=0.35`)
- ❌ Gradients arc-en-ciel ou couleurs hors palette
- ❌ Comic Sans, Impact, ou autres polices non brand
- ❌ Textes justifiés (préférer left-align ou centered)
- ❌ Bordures épaisses (max 2px)
- ❌ Effets de biseau, néon, chromé, "3D" cheap

---

## 📱 Formats standards

| Support | Dimensions | Safe zone |
|---|---|---|
| Instagram Post | 1080 × 1350 | 80px sur tous les côtés |
| Instagram Story / Reel | 1080 × 1920 | Top 120 · Bottom 300 · Sides 80 · Right icons 160 |
| TikTok | 1080 × 1920 | Top 120 · Bottom 300 · Sides 80 · Right icons 160 |
| LinkedIn Post | 1200 × 627 | 60px sur tous les côtés |
| Email signature | 600 × 200 | 40px sur tous les côtés |

---

## 📁 Structure du projet

```
college-access-brand/
├── CLAUDE.md                     ← ce fichier
├── README.md                     ← vue d'ensemble humaine
├── BRAND_GUIDELINES.md           ← charte détaillée
├── assets/
│   └── logos/                    ← tous les logos PNG
├── tokens/
│   ├── colors.json               ← design tokens JSON
│   ├── colors.css                ← CSS custom properties
│   ├── colors.scss               ← variables SCSS
│   ├── tailwind.config.js        ← config Tailwind prête
│   └── typography.json           ← tokens typographiques
└── prompts/
    ├── generate-post.md          ← prompt pour post réseaux
    ├── generate-website.md       ← prompt pour site web
    └── generate-component.md     ← prompt pour composant UI
```

---

## ✅ Checklist avant de livrer

Avant de valider n'importe quel visuel ou code, vérifie :

- [ ] Palette respectée (aucune couleur hors charte)
- [ ] Typographie correcte (Montserrat, avec fallbacks web)
- [ ] Contraste WCAG AA respecté sur les textes
- [ ] Safe zones respectées si format social
- [ ] Logo utilisé dans sa bonne variation selon le fond
- [ ] Ton de voix aligné (rigoureux, jamais racoleur)
- [ ] Aucun élément visuel à éviter (voir liste plus haut)

---

## 🚀 Cas d'usage typiques

Quand l'utilisateur te demande :

- **"Génère un post pour X"** → charger `prompts/generate-post.md`
- **"Crée un site pour Y"** → charger `prompts/generate-website.md`
- **"Fais-moi un composant Z"** → charger `prompts/generate-component.md`

Si aucun prompt spécifique n'existe, applique les règles de ce fichier par défaut.
