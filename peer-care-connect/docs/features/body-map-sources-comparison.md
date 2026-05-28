# Full-body map sources: comparison (entire body, third-party)

Comparison of **third-party** sources for a **full-body** anatomical map (entire body, front and back). No React libraries; artwork only.

---

## 1. Wikimedia Commons – Female-male front-back 3D-shaded (RECOMMENDED)

| | |
|---|---|
| **File** | [Female-male front-back 3d-shaded human illustration.svg](https://commons.wikimedia.org/wiki/File:Female-male_front-back_3d-shaded_human_illustration.svg) |
| **Direct URL** | `https://upload.wikimedia.org/wikipedia/commons/6/66/Female-male_front-back_3d-shaded_human_illustration.svg` |
| **Layout** | Single SVG, 1723 × 947 px. **Four full-body figures** in a row: Female front | Male front | Female back | Male back. |
| **Content** | Full body (head to toe), 3D-shaded, anatomically accurate. One figure = entire body. |
| **License** | CC-BY-SA-4.0. Attribution required. |
| **Use in app** | Use one file; crop by viewBox to show front (e.g. left quarter) or back (e.g. third quarter). Or use female only: 1st quarter = front, 3rd quarter = back. |
| **Pros** | One asset, full body, professional, stable URL. |
| **Cons** | CC-BY-SA (share-alike). Single body per view. |

---

## 2. Wikimedia Commons – Dermatomes labeled, female front-back 3D-shaded

| | |
|---|---|
| **File** | [Dermatomes labeled, female front-back 3d-shaded.svg](https://commons.wikimedia.org/wiki/File:Dermatomes_labeled,_female_front-back_3d-shaded.svg) |
| **Direct URL** | `https://upload.wikimedia.org/wikipedia/commons/5/55/Dermatomes_labeled,_female_front-back_3d-shaded.svg` |
| **Layout** | 903 × 951 (or up to 1945 × 2048). Female body, front and back, with dermatome labels. |
| **Content** | Full body; nerve-region labels may be busy for a generic body map. |
| **License** | CC-BY-SA-4.0. |
| **Pros** | Full body, female only, high res. |
| **Cons** | Labels may need hiding or a cleaner variant (e.g. unlabeled) if available. |

---

## 3. Wikimedia Commons – Woman surface diagram ahead-behind

| | |
|---|---|
| **File** | [Woman surface diagram ahead-behind.svg](https://commons.wikimedia.org/wiki/File:Woman_surface_diagram_ahead-behind.svg) |
| **Layout** | ~442 × 665 (original); up to 1361 × 2048. Front and back in one file. |
| **Content** | Surface/anatomical diagram, full body. |
| **License** | Check file page (often CC or PD). |
| **Pros** | Full body, simple diagram style. |
| **Cons** | Confirm exact license and layout (single figure vs multiple). |

---

## 4. Injurymap – Free human anatomy illustrations

| | |
|---|---|
| **URL** | https://www.injurymap.com/free-human-anatomy-illustrations |
| **Content** | **Regional** illustrations (upper back, spine, shoulder, neck, knee, hip, elbow, etc.). No single “entire body front + entire body back” in one image; multiple downloads per region. |
| **License** | CC-BY-4.0. Attribution required. |
| **Pros** | High quality, commercial use, clear license. |
| **Cons** | Not a single full-body map; need to composite or use multiple images for “entire body” front/back. |

---

## 5. FreeSVG.org

| | |
|---|---|
| **Human anatomy diagram** | https://freesvg.org/human-anatomy-diagram – Internal organs (brain, digestive, etc.), not a full-body surface map for marking regions. |
| **Human body man and woman with numbers** | https://freesvg.org/rmx-oc-human-body-man-and-woman-with-numbers – Full-body style with numbers; check if full figure (head to toe) and license (Public Domain stated). |
| **Pros** | Public domain options, small file size. |
| **Cons** | First is organ-focused; second needs verification for full-body coverage and suitability. |

---

## Recommendation for “map of the entire body”

- **Best fit:** **Wikimedia Commons – Female-male front-back 3d-shaded**. One SVG, four full-body figures (female front, male front, female back, male back). Use viewBox to show one figure at a time (e.g. female front + female back for a single full-body map).
- **Alternative:** **Dermatomes labeled, female front-back 3d-shaded** if you want one female full body and can use or hide the dermatome labels.
- **Injurymap:** Use for **regional** accuracy or future detail; not as the single “entire body” map unless you composite multiple images.

---

## Implementation note (current app)

- Asset **commons-female-male-front-back.svg** is saved in `public/body-map/`.
- The app can show **entire body** front/back by loading this SVG and using a different **viewBox** per view:
  - Front (e.g. female): `viewBox="0 0 430 947"` (first quarter).
  - Back (e.g. female): `viewBox="860 0 430 947"` (third quarter).
- Our clickable regions (`BODY_PARTS_*`) are defined in our viewBox `0 0 200 520`; for the Commons asset we either scale the image to fit that space or map coordinates (e.g. overlay our paths on the cropped figure).
