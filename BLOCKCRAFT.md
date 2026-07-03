# Blockcraft ⛏

A tiny Minecraft clone in a single, dependency-free HTML file: [`minecraft.html`](minecraft.html).

## Play

Open `minecraft.html` in any modern browser — double-click the file, or serve it:

```
npx serve .        # then visit http://localhost:3000/minecraft.html
```

Add `?seed=12345` to the URL to revisit a specific world; without it every load generates a fresh one.

## Controls

| Input | Action |
|---|---|
| `W A S D` / arrows | move |
| Mouse | look (click to capture the pointer) |
| Left click | break block |
| Right click | place block |
| `1`–`9` / wheel | choose block |
| `Space` | jump / swim up |
| `Shift` | sprint |
| `F` | toggle fly (Space/Shift = up/down) |
| `R` | respawn |
| `Esc` | pause |

On phones and tablets a joystick plus JUMP / DIG / PLACE buttons appear automatically.

## What's inside

No engine, no libraries, no assets — everything is generated at runtime in ~1000 lines:

- **Custom WebGL renderer** — chunked meshes with hidden-face culling, per-vertex ambient occlusion, distance fog, and a translucent water pass.
- **Procedural terrain** — seeded value-noise heightmap with continents, hills and occasional peaks; beaches, oceans, and deterministic cross-chunk trees.
- **Procedural textures** — the whole 13-tile atlas is painted pixel-by-pixel onto a canvas at startup.
- **Physics** — AABB collision, gravity, jumping, swimming (with shore climb-out), and creative-style flight.
- **Infinite-ish world** — chunks stream in around the player and unload behind them.
