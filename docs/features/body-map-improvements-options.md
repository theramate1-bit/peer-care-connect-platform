# Body map improvements: third-party accurate illustrations (KAN-192)

**Constraint:** Use **third-party, accurate anatomical assets only**. No React body-map libraries (e.g. no react-muscle-highlighter, react-body-highlighter, or any in-app React anatomy component). The artwork must come from established anatomical/medical illustration sources.

The current body map in `src/components/forms/BodyMap.tsx` uses simple geometric SVG shapes (ellipse, rect, basic paths). The goal is a **human-like, accurate** body map with **complete, specific** region mappings, using **third-party illustrations** as the visual layer and our own region logic on top.

---

## 1. Third-party anatomical SVG assets (recommended)

### Injurymap – Free human anatomy illustrations
- **URL:** https://www.injurymap.com/free-human-anatomy-illustrations  
- **License:** CC-BY-4.0 (free, commercial use with attribution).  
- **Content:** Professional vector illustrations (e.g. full body, regional: wrist, upper back, trapezius, rotator cuff, spine). Anatomically accurate, human-like.  
- **Use:** Download front/back (or composite) SVGs; host in our repo or CDN; use **only as the visual layer** in `BodyMap.tsx`. We keep our own clickable region definitions (paths or hit areas) and marker/notes logic.  
- **Attribution:** Required (e.g. “Body illustrations: Injurymap” + link to the URL above).

### Wikimedia Commons
- **Example:** [Dermatomes labeled, female front-back 3d-shaded.svg](https://commons.wikimedia.org/wiki/File:Dermatomes_labeled,_female_front-back_3d-shaded.svg) – anatomical, detailed.  
- **License:** Check each file (often CC-BY or similar).  
- **Use:** Same as above – download, host, use as visual; we add our own region mappings.

### Other third-party sources (no React)
- **NIH / NLM (National Library of Medicine)** – public domain anatomy images (e.g. Visible Human, anatomical atlases). Verify format (SVG/PNG) and terms.  
- **OpenStax Anatomy and Physiology** – CC-BY figures; check for body outline/front-back views.  
- **Biodigital Human** (biodigital.com) – commercial 3D anatomy; API/license for embedding if budget allows; not React component, third-party service.

---

## 2. Integration in our app (no React anatomy libraries)

- **Visual layer:** In `BodyMap.tsx`, replace the current hand-drawn outline with the chosen third-party asset:
  - Option A: Embed the third-party SVG inline (e.g. `<img src="/assets/body-front.svg" alt="Body front" />` or inject the SVG markup) so we can overlay our regions in the same coordinate space.
  - Option B: Use the SVG as a background or underlay and position our existing `<path>` elements (or new paths) as invisible hit areas aligned to the new figure.
- **Region mappings:** All region definitions stay in our code: `BODY_PARTS_FRONT` / `BODY_PARTS_BACK` (or expanded lists). We do **not** rely on any third party for region IDs or paths—only for the **image/illustration**.
- **Data model:** No change to `BodyMapMarker` or `body_map_markers`; we keep `bodyPart`, `side`, notes, etc. We can add more `bodyPart` IDs and paths to support “complete” and “very specific” mappings.

---

## 3. More granular regions (optional)

- To support “very specific” and “complete” coverage: **expand** our body part lists and paths (e.g. upper/mid/lower chest, spine segments, finer shoulder/hip/knee).  
- Paths can be authored in a vector editor (Figma, Illustrator, Inkscape) by tracing or aligning to the third-party illustration, then export path `d` values and add to `BODY_PARTS_*`.  
- All mapping logic remains first-party; only the **artwork** is third-party.

---

## 4. Paid / custom third-party assets (optional)

- **IconScout, Shutterstock, etc.:** Purchase commercial anatomical body illustrations (SVG/PNG) with a license that allows use in our product. Use as the visual layer only; we define regions ourselves.  
- **Commission:** Commission an anatomical body map from a medical illustrator; deliverable = front/back SVGs (and optionally a region list we can align to our `bodyPart` IDs). Still no React library—just assets we integrate.

---

## Implementation status (KAN-192)

- **Visual layer:** `BodyMap.tsx` loads body art from `/body-map/body-front.svg` and `/body-map/body-back.svg` via SVG `<image>`. No React anatomy libraries; artwork is third-party–ready.  
- **Assets:** `public/body-map/` contains `body-front.svg` and `body-back.svg` (viewBox `0 0 200 520`). Current files are placeholders; replace with Injurymap or Commons SVGs for full anatomical accuracy (see `public/body-map/README.md`).  
- **Regions:** All clickable regions remain in our code (`BODY_PARTS_FRONT` / `BODY_PARTS_BACK`). Paths are aligned to the shared viewBox; replace only the SVG assets to upgrade the figure.  
- **Attribution:** The body map UI links to Injurymap and instructs users to replace assets for third-party art.

## Suggested next steps (optional)

1. **Upgrade artwork:** Download front/back SVGs from Injurymap or Commons; resize/crop to viewBox `0 0 200 520`; overwrite `public/body-map/body-front.svg` and `body-back.svg`.  
2. **Attribution:** If using a different source, update the attribution link and text in `BodyMap.tsx`.  
3. **Finer regions:** To support more specific mappings, add parts and paths to `BODY_PARTS_FRONT` / `BODY_PARTS_BACK` (e.g. in a vector editor, then export path `d` values).

---

## References (third-party only; no React anatomy libraries)

- [Injurymap – Free human anatomy illustrations (CC-BY-4.0)](https://www.injurymap.com/free-human-anatomy-illustrations)  
- [Wikimedia Commons – Dermatomes SVG](https://commons.wikimedia.org/wiki/File:Dermatomes_labeled,_female_front-back_3d-shaded.svg)  
- Current implementation: `peer-care-connect/src/components/forms/BodyMap.tsx`
