# 🎬 StageControl

**Régie de spectacle pour un jeu TV comptabilisant le nombre de rire par joueurs — Application Electron macOS.**

StageControl pilote en temps réel un écran de scène (caméra, overlays, mini-jeux, replay, sons, memes, scores…) depuis une interface de régie dédiée. Pensé pour les animateurs et directeurs d'activités en colo, centre de loisirs ou entre potes.

> **Version 0.2 beta** — Fonctionne sous macOS. `.dmg` généré via `npm run dist`.

---

## ✨ Fonctionnalités

### 📷 Caméra & Vidéo
- Sélection et changement de caméra en direct
- Mosaïque multi-caméras (2 à 6 vues, dispositions au choix)
- Résolution jusqu'à 4K, 30 fps, ratio paysage forcé
- Aperçu temps réel dans la régie

### ⏪ Replay
- Buffer circulaire permanent (~20 secondes)
- Replay instantané avec pause / reprise
- Dessin en overlay (crayon, flèche, cercle, texte avec couleurs)
- Export replay en fichier vidéo

### 🎮 9 Mini-Jeux
Chaque jeu a un panneau de configuration (contenu, timer dédié, audio…) :

| Jeu | Description |
|-----|-------------|
| ❓ Question Piège | Poser une question sans faire rire |
| 🎭 Imitation | Imiter sans se trahir |
| 🚫 Mot Interdit | Éviter le mot banni (masqué à l'écran) |
| 💪 Défi Physique | Tenir un défi sans sourire |
| 🎵 Blind Test | Trouver la chanson (upload audio) |
| 🤫 Le Mime | Faire deviner sans parler |
| 📖 Histoire Collective | Continuer une histoire à tour de rôle |
| 👅 Virelangue | Répéter 3 fois vite |
| 🎲 Jeu Libre | Mode créatif personnalisable |

### 👥 Joueurs
- Ajout / suppression / renommage en direct
- Score, compteur de rires, élimination automatique (seuil configurable)
- Photo de profil avec recadrage circulaire
- Anneau de joueurs affiché sur l'écran de scène avec code couleur

### 🔊 Sons
- 10 sons intégrés (buzzer, fanfare, élimination, applaudissements, tic-tac, suspense, fail, roulement, gong, ding)
- Soundboard custom (upload MP3, persistant)
- Bouton stop global pour couper tous les sons
- Micro live (choix entrée/sortie, passthrough vers display)

### 🎭 Memes
- Upload images et vidéos, affichage popup plein écran
- Transparence PNG native (pas d'ombre sur les images alpha)
- Bouton pour masquer le meme en cours

### 🎥 Enregistrement vidéo
- Capture de la fenêtre Display via `getDisplayMedia`
- Audio mixé (sons synthé + micro) dans une seule piste
- Enregistrement par chunks vers fichier temporaire
- Bouton télécharger avec dialogue de sauvegarde

### 📊 Session de jeu
- Démarrage / arrêt de session avec chrono
- Chronologie complète (rires, élims, jeux, replays, memes…)
- Export du bilan en Markdown, Excel, Word et PDF

### ⏱ Timer & Animations
- Timer configurable (10–300 s) avec alerte visuelle urgente
- Compte à rebours 3-2-1 animé
- Intro animée « STAGECONTROL »
- Messages flash à l'écran
- Confettis lors des éliminations

### 💾 Configuration persistante
- Sauvegarde automatique : joueurs, photos, memes, sons custom, timer
- Export / Import via menu **Configuration** (fichier `.scconfig`)
- Stocké dans `~/Library/Application Support/StageControl/`

---

## 🏗 Architecture

Deux fenêtres Electron, une seule page HTML chacune (CSS + JS inline, zéro framework) :

```
┌─────────────────┐      IPC relay      ┌──────────────────┐
│  control.html   │◄────────────────────►│   display.html   │
│  (Régie)        │   main.js + preload  │  (Écran scène)   │
│  ┌───────────┐  │                      │                  │
│  │ preview   │◄─┼──BroadcastChannel───►│                  │
│  └───────────┘  │                      │                  │
└─────────────────┘                      └──────────────────┘
```

- **control.html** — Interface de commande (régie)
- **display.html** — Écran projeté en plein écran (frameless, pas de throttling)
- **main.js** — Process principal : fenêtres, IPC relay, protocol `app://`, recording I/O, config, menus
- **preload.js** — Bridge `contextIsolation` : IPC + BroadcastChannel pour la preview iframe

---

## 🚀 Utilisation

### Prérequis
- [Node.js](https://nodejs.org/) v18+
- macOS

### Développement

```bash
cd electron
npm install
npm start
```

### Build (DMG installable)

```bash
npm run dist
```

Le `.dmg` est généré dans `electron/dist/`. Double-clic → glisser dans Applications.

---

## 📂 Structure

```
electron/
├── main.js          # Process principal Electron
├── preload.js       # Bridge IPC
├── control.html     # Régie (~1700 lignes, autonome)
├── display.html     # Display (~980 lignes, autonome)
├── package.json
├── icone/
│   └── stagecontrol.icns
└── fonts/
    └── local-fonts.css + fichiers .woff2
```

---

## 📜 Licence

Open source — [MIT](https://opensource.org/licenses/MIT).
