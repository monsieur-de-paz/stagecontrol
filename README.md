# 🎬 StageControl

**Régie de spectacle et d'animation — Application Electron gratuite et open source.**

StageControl est une application de régie tout-en-un conçue pour les animateurs, les directeurs d'activités et les organisateurs de spectacles. Elle permet de piloter en temps réel un écran de scène (caméra, overlays, mini-jeux, replay, sons, memes, scores…) depuis une interface de contrôle dédiée.

> **Version 0.1** — En développement actif. L'application n'est pas encore packagée en `.dmg` / `.exe`.

---

## ✨ Fonctionnalités

### 📷 Caméra & Vidéo
- Sélection de caméra avec hot-swap
- Mosaïque multi-caméras configurable (2 à 6 vues, dispositions multiples)
- Aperçu temps réel dans la régie (iframe synchronisée)

### ⏪ Replay
- Enregistrement circulaire permanent (~20 secondes)
- Replay instantané avec pause et reprise
- Dessin en overlay sur le replay (crayon, flèche, cercle, texte)
- Export du replay en fichier vidéo

### 🎮 Mini-Jeux (9 modes)
Chaque jeu dispose d'un panneau de configuration dédié avant lancement :

| Jeu | Description |
|-----|-------------|
| ❓ Question Piège | Poser une question sans faire rire |
| 🎭 Imitation | Imiter sans se trahir |
| 🚫 Mot Interdit | Éviter le mot banni |
| 💪 Défi Physique | Tenir un défi sans sourire |
| 🎵 Blind Test | Trouver la chanson (avec upload audio) |
| 🤫 Le Mime | Faire deviner sans parler |
| 📖 Histoire Collective | Continuer une histoire à tour de rôle |
| 👅 Virelangue | Répéter 3 fois vite |
| 🎲 Jeu Libre | Mode créatif personnalisable |

### 👥 Gestion des joueurs
- Ajout/suppression en temps réel
- Score, compteur de rires, élimination automatique
- Photo de profil avec recadrage circulaire
- Affichage en anneau sur l'écran de scène

### 🔊 Sons & Musique
- 6 sons intégrés (buzzer, fanfare, élimination, applaudissements, tic-tac, suspense)
- Soundboard custom (upload MP3)
- Gestion du chevauchement audio automatique

### 📊 Session de jeu
- Démarrage/arrêt de session
- Chronologie complète des événements
- Export du bilan en `.md`, Excel, Word et PDF

### 🎭 Autres
- Memes (images & vidéos) en popup plein écran
- Messages flash sur l'écran
- Timer configurable avec compte à rebours
- Captures d'écran avec overlay et attribution aux joueurs
- Intro animée et compte à rebours 3-2-1
- Confettis et animations visuelles

---

## 🏗 Architecture

L'application utilise **Electron** avec deux fenêtres :

```
┌─────────────────┐      IPC relay      ┌──────────────────┐
│  control.html   │◄────────────────────►│   display.html   │
│  (Fenêtre régie)│   via main.js +      │  (Écran de scène)│
│                 │   preload.js         │                  │
│  ┌───────────┐  │                      │                  │
│  │ iframe    │  │   BroadcastChannel   │                  │
│  │ preview   │◄─┼──────────────────────┤                  │
│  └───────────┘  │   (localBC)          │                  │
└─────────────────┘                      └──────────────────┘
```

- **control.html** — Interface de commande complète (régie)
- **display.html** — Écran affiché en plein écran sur un projecteur/écran externe
- **main.js** — Process principal Electron, relay IPC entre fenêtres
- **preload.js** — Bridge contextIsolation avec BroadcastChannel local pour la preview iframe

---

## 🚀 Installation

### Prérequis
- [Node.js](https://nodejs.org/) (v18+)
- npm

### Lancer en développement

```bash
cd electron
npm install
npm start
```

L'application ouvre automatiquement la régie sur l'écran principal et le display sur un écran externe (si disponible).

---

## 📂 Structure du projet

```
electron/
├── main.js          # Process principal Electron
├── preload.js       # Bridge IPC / BroadcastChannel
├── control.html     # Interface de régie (~1400 lignes, tout-en-un)
├── display.html     # Écran de scène (~820 lignes, tout-en-un)
├── package.json     # Config Electron + electron-builder
└── README.md
```

> Les deux fichiers HTML sont **autonomes** (CSS + JS inline) — aucun bundler, aucun framework. Cela permet un déploiement ultra-simple et une compatibilité maximale.

---

## 🎯 Roadmap

- [ ] Packaging macOS (`.dmg`) et Windows (`.exe`)
- [ ] Détection automatique du rire par IA (audio)
- [ ] Mode multi-régie (plusieurs tablettes)
- [ ] Thèmes visuels personnalisables
- [ ] Sauvegarde des memes et sessions entre parties
- [ ] Support mobile (régie sur tablette)

---

## 📜 Licence

Ce projet est **open source** et distribué sous licence [MIT](https://opensource.org/licenses/MIT).

Fait avec ❤️ pour les animateurs et les directeurs d'activités.
