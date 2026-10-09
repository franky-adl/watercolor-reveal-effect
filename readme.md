# Watercolor Reveal Effect

Interactive Three.js demo: watercolor paintings sit on procedural paper in greyscale, and the cursor floods colour back in with a bleeding, drying wash. Inspired by [Yuri Artiukh’s recreation](https://www.youtube.com/live/ggruH0fHPOM) of the [14islands](https://www.14islands.com/) footer; paper shading adapted from [watercolor-playground](https://github.com/msurguy/watercolor-playground).

## Features

- Procedural paper (cold press, hot press, rough, and more) with height field, lighting, and pigment response
- Cursor-driven reveal mask: flood, bleed falloff, and drying at a fixed 60 steps/sec
- Gallery of landscapes with prev/next dissolve transitions
- lil-gui debug folders for paper and reveal params (`?debug` in the URL)

## Setup

Requires [Node.js](https://nodejs.org/en/download/) and [pnpm](https://pnpm.io/).

```bash
# Install dependencies (first time only)
pnpm i

# Dev server at localhost:5173
pnpm dev

# Production build → dist/
pnpm build
```

## Project layout

```
src/
  script.js                 # entry
  ThreeJS/
    Orchestrator.js         # scene, renderer, loop, resources
    Stage/
      Paper.js              # paper generation + display
      Reveal.js             # ping-pong reveal simulation
      Gallery.js            # image navigation + dissolve
      papers.js             # paper presets
    Shaders/Paper/          # field, light, display, reveal
    Utils/                  # Debug, Pointer, Resources, Sizes
static/textures/            # watercolor images
```

More implementation notes live in [DEVLOG.md](./DEVLOG.md).
