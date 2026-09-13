# create-a-car-racing-game

**Apex Rush** — a fast, arcade-style pseudo-3D car racing game built with Vite + React + TypeScript + Tailwind CSS. Everything is rendered on an HTML canvas with a classic "Outrun"-style road projection, procedurally generated tracks, traffic to dodge, hills, curves, and a full lap/timer race loop. No external assets — every car, tree, and sign is drawn with canvas primitives, and all sounds are synthesized with the Web Audio API.

## Features

- 🏎️ Pseudo-3D road engine with curves, hills, rumble strips and roadside scenery
- 🚦 3·2·1·GO countdown, multi-lap races and a live lap/best-lap timer
- 🚗 Traffic cars to weave through — clip one and you lose speed
- 🎮 Keyboard (Arrow keys / WASD) **and** on-screen touch controls for mobile
- 🔊 Synthesized engine, skid and collision audio (toggleable)
- 🏆 Best lap time persisted in `localStorage`
- 📱 Responsive, polished neon HUD and menus

## Controls

| Action        | Keys                    |
| ------------- | ----------------------- |
| Accelerate    | ↑ / W                   |
| Brake/Reverse | ↓ / S                   |
| Steer         | ← → / A D               |
| Pause         | P / Esc                 |

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
```

## Preview build

```bash
npm run build:preview   # emits a single self-contained dist-single/index.html
```
