# 🧩 Connect Puzzle – Mobile Connect Tile Puzzle

Connect Puzzle is a mobile-friendly tile matching puzzle game built with Phaser, Vite, and TypeScript.

The project was developed around classic connect-puzzle rules where the player clears matching tiles by linking them with a valid path while new mechanics are introduced throughout a 90-level campaign.

---

## 🚀 Features

### 🎮 Gameplay
- Classic pair-matching connect puzzle gameplay
- Match two identical tiles to clear them from the board
- Valid path detection with up to two turns
- Border-space routing around the outside of the board
- 90-level campaign progression
- Timed levels with win and lose states
- Score gain for each successful match
- XP progression after level clears
- Level unlock and resume system
- No-move detection
- Fast retry after failed levels
- Campaign completion state

---

### 🧱 Levels & Mechanics
- Procedural level generation
- Progressive board sizes across the campaign
- Increasing tile variety over time
- Gravity-based board settling
- Gravity directions: down, up, left, and right
- Random gravity shifts in harder stages
- Frozen tiles that unlock through nearby matches
- Solid blocker cells
- Jumping monkey blockers that move after matches
- Mixed and nightmare level phases that combine multiple mechanics
- Auto-reshuffle support for playable board creation

---

### ✨ Visuals & Effects
- Phaser scene structure with a custom canvas board renderer
- Animated match paths
- Tile merge and clear animations
- Gravity slide animations
- Jumping blocker flight animations
- Low-time warning feedback
- Themed board backgrounds
- Food tile theme
- Landmark tile theme
- Planet tile theme
- Special monkey and ice overlay assets
- Responsive full-screen game canvas

---

### 🧭 UI & Progression
- Main menu
- Play button
- Level selection menu
- Tutorial mode
- Settings modal
- Home button
- Replay button
- Hint button
- HUD with level, score, timer, and XP progress
- Result overlay for level complete and time-up states
- 30-photo album collection
- Locked and unlocked album photo states
- Album viewer with zoom, drag, wheel, and pinch support
- Progress saved in local storage

---

### ⚙️ Settings & Audio
- Music toggle
- Sound effects toggle
- Haptics toggle
- Settings saved in local storage
- Background gameplay music
- Button, tile, match, hint, gravity, frozen, shuffle, warning, XP, and level-complete sound effects
- Browser audio unlock handling for mobile devices
- Oasiz score and haptic platform hooks

---

## 🧰 Tech Stack

- Phaser
- Vite
- TypeScript
- HTML / CSS
- JavaScript
- Canvas 2D rendering
- Web Audio
- Browser local storage

---

## 📱 Mobile Optimization

The game is designed for mobile web browsers while still supporting desktop keyboard play.

Rendering and layout are mobile-focused with a full-screen fixed canvas, disabled page scrolling, viewport-fit support, safe-area aware UI placement, responsive menus, touch-friendly buttons, and device pixel ratio handling.

Touch controls are supported through direct tile and UI interaction:

- Tap a tile to select it
- Tap a matching tile to connect and clear the pair
- Tap Hint to reveal a valid match
- Tap Replay to restart the current level
- Tap Home to return to the main menu
- Pinch or use the album viewer controls to zoom unlocked photos

---

## 🎯 Project Purpose

This project was developed to build a polished mobile connect-puzzle prototype with progressive mechanics and a lightweight campaign structure.

Main goals:

- Creating a replayable tile matching puzzle experience
- Building a browser game with Phaser and TypeScript
- Implementing custom connect-path detection without a physics engine
- Designing progressive level difficulty across 90 stages
- Combining gravity, frozen tiles, blockers, and jumping obstacles
- Building clean gameplay, level, rendering, UI, audio, settings, and progress boundaries
- Supporting both touch and keyboard input
- Practicing mobile-friendly web game rendering and layout
- Adding a collectible photo album reward loop

---

## 🕹️ Controls

### Keyboard
- `Arrow Left`: Move keyboard cursor left
- `Arrow Right`: Move keyboard cursor right
- `Arrow Up`: Move keyboard cursor up
- `Arrow Down`: Move keyboard cursor down
- `Enter` / `Space`: Select tile or continue tutorial prompts
- `H`: Show hint
- `Escape`: Close open menus, settings, or album viewer

### Touch / Pointer
- Tap a tile: Select tile
- Tap a matching tile: Connect and clear pair
- Tap Hint: Reveal a valid match
- Tap Replay: Restart current level
- Tap Home: Return to main menu
- Tap result overlay: Continue, retry, or restart campaign
- Pinch / drag in album viewer: Zoom and pan unlocked photos

---

## 🛠️ Installation & Setup

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Run the development server for testing on another device in the same network:

```bash
npm run dev:host
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run the environment doctor:

```bash
npm run doctor
```

---

## 📸 Screenshots
<img width="376" height="816" alt="image" src="https://github.com/user-attachments/assets/01d33bd0-1a3b-4444-95b1-a6753128a8ff" />
<img width="377" height="816" alt="image" src="https://github.com/user-attachments/assets/54a9b928-31b0-4811-afa2-9326541fbb16" />
<img width="378" height="816" alt="image" src="https://github.com/user-attachments/assets/03b02a2e-320e-454f-bcf6-af05bc16b511" />
<img width="376" height="811" alt="image" src="https://github.com/user-attachments/assets/777fef84-36e5-479c-854a-beaf7885c526" />


---

## 👤 Developer

Muhammet Emir Yılmaz  
Full Stack Developer  

LinkedIn: https://www.linkedin.com/in/emir-y/  
GitHub: https://github.com/Emiryz-162
