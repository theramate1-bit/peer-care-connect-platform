# Body map assets — third-party SVGs only (no React design)

The body diagram is **not** drawn in React. The app loads images from this folder only. The files below are **sourced from public third-party providers** (downloaded from the web).

## Current files (as of 2026)

| File | Source | License |
|------|--------|--------|
| **body-front.svg** | New silhouette front (from project `Silhoette front.svg`). 1024×1536 outline style. | Project asset. |
| **body-back.svg** | New silhouette back (from project `Silhoette back.svg`). 1024×1536 outline style. | Project asset. |
| **silhouette-front-back-commons.svg** | (Optional reference.) Commons front+back; not used when body-front.svg / body-back.svg are present. | Public domain. Christophe Dang Ngoc Chan; based on Mikael Häggström. |

## Coordinate system

The app uses a single SVG with **viewBox `0 0 200 520`**. The images are scaled to fit (`preserveAspectRatio="xMidYMid meet"`). Click-to-place dots record X/Y in that space. Your own SVGs can use any viewBox; they will be scaled to fit.

## Replacing with other third-party assets

1. Download front and back body outline SVGs from a source you have rights to use (e.g. [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Human_body_silhouettes), [Injurymap](https://www.injurymap.com/free-human-anatomy-illustrations) CC-BY-4.0).
2. Overwrite **body-front.svg** and **body-back.svg** in `public/body-map/`.
3. No code changes are required.

See also: `docs/features/body-map-sources-comparison.md`, `docs/features/body-map-improvements-options.md`.
