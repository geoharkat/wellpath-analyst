# WellPath Analyst

**Minimum Curvature Survey vs Plan comparison tool — runs entirely in your browser.**

[![Live Demo](https://img.shields.io/badge/live--demo-online-success)](https://geoharkat.github.io/wellpath-analyst/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![No Backend](https://img.shields.io/badge/backend-none-blue.svg)](#)

WellPath Analyst is a single-page web application for directional drillers, wellsite geologists, and petroleum engineers who need a fast, private, and portable way to compare a well's **planned trajectory** against the **actual survey** — with full minimum-curvature geometry, center-to-center deviation, displacement breakdown (Above/Below, Left/Right, Ahead/Behind), VS plots, and formation-top statistics.

All computation is client-side. Your survey data never leaves your browser.

> **Live app:** <https://geoharkat.github.io/wellpath-analyst/>

---

## Features

- **Multi-format import** — CSV, LAS, XLSX, XLS. Column auto-detection for MD / Inc / Azi.
- **Minimum Curvature computation** — TVD, North, East, VS, DLS, dogleg, closure, closure azimuth.
- **Side-by-side comparison** — station-by-station Survey vs Plan with interpolation at every survey MD.
- **Displacement labels** — readable direction words (`2.34 Above`, `0.85 Right`, `3.21 Ahead`, `3.45 C-C`) instead of signed ± numbers and colour codes.
- **Interactive plots** — Plan View (North vs East) and Vertical Section (VS vs TVD) rendered on HTML5 canvas.
- **PDF report export** — one-click generation of a multi-page report containing summary statistics, both plots, and the full comparison table.
- **Query tool** — interpolate any station by MD, TVD, or VS; get differences between Survey and Plan at any depth.
- **Formation tops** — add tops by TVD; automatic thickness, MD@top/bot, inclination, azimuth, and average DLS per formation.
- **Manual station entry** — add points on the fly without re-uploading.
- **100% offline-capable** — open `index.html` directly from disk (CDN assets cache after first load).
- **Zero data exfiltration** — no server, no analytics, no tracking.

---

## Quick Start

### Option 1 — Use the live demo

Just open <https://geoharkat.github.io/wellpath-analyst/> and start importing files.

### Option 2 — Run locally

```bash
git clone https://github.com/geoharkat/wellpath-analyst.git
cd wellpath-analyst
# simply open index.html in your browser, or:
python3 -m http.server 8000
# then browse to http://localhost:8000
```

No build step, no `npm install`, no dependencies to resolve. Everything loads from public CDNs (Tailwind, PapaParse, SheetJS, jsPDF, Font Awesome).

### Option 3 — Quick tour with sample data

1. Open the app.
2. Click **Load Sample Data** on the Import tab.
3. Click **Process Data**.
4. Browse Data, Comparison, Query, and Formations tabs.
5. On the Comparison tab, click **Export PDF Report** to download a full report.

---

## Input Data Format

Your Plan and Survey files must contain at minimum three columns:

| Column | Description | Units |
|---|---|---|
| **MD**  | Measured depth (along-hole) | m |
| **Inc** | Inclination (hole deviation from vertical) | degrees |
| **Azi** | Azimuth (compass bearing)   | degrees |

Accepted formats: `.csv`, `.las`, `.xlsx`, `.xls`. Column names are auto-detected (any header matching `md`, `depth`, `inc`, `azi`, `azim`, etc. will be picked up), but you can re-map manually from the preview dropdowns if needed.

**VS Reference Azimuth** is a separate input (on the Import tab) — the compass bearing used to project North/East into a Vertical Section plane. Default is `0°` (due north).

---

## Output & Reports

### Comparison table columns

| Column | Meaning |
|---|---|
| **MD**       | Survey station measured depth |
| **Plan TVD** | Plan TVD interpolated at that MD |
| **Svy TVD**  | Survey TVD at that MD |
| **A/B**      | Above / Below plan (e.g. `2.34 Above`) |
| **L/R**      | Right / Left of plan (e.g. `0.85 Right`) |
| **F/B**      | Ahead / Behind plan along plan azimuth |
| **C-C**      | 3D centre-to-centre distance from plan trajectory |
| **Pl Inc**   | Plan inclination at that MD |
| **Sv Inc**   | Survey inclination at that MD |
| **Svy DLS**  | Survey dogleg severity (°/30 m) |

### PDF Report

The exported PDF contains:
1. Header banner with generation timestamp, VS azimuth, and station counts.
2. Six summary statistic boxes (Max/Avg/End C-C, Max A/B, L/R, F/B).
3. Plan View plot (North vs East).
4. Vertical Section plot (VS vs TVD).
5. Full station-by-station comparison table (paginated automatically).
6. Every page footer includes copyright and page numbers.

Filename convention: `WellPath_Report_YYYY-MM-DD.pdf`.

---

## Minimum Curvature Method

The trajectory is reconstructed by the minimum curvature method:

```
ΔTVD = (ΔMD/2) · (cos I₁ + cos I₂) · RF
ΔN   = (ΔMD/2) · (sin I₁·cos A₁ + sin I₂·cos A₂) · RF
ΔE   = (ΔMD/2) · (sin I₁·sin A₁ + sin I₂·sin A₂) · RF
```

where `I`, `A` are inclination and azimuth in radians, and the ratio factor is

```
RF = (2/β) · tan(β/2),   β = dogleg angle
cos β = cos(I₂ − I₁) − sin I₁ · sin I₂ · (1 − cos(A₂ − A₁))
```

VS is projected via the configured reference azimuth:

```
VS = N · cos(φ_VS) + E · sin(φ_VS)
```

---

## Deploy to GitHub Pages

1. Create a new GitHub repository named **`wellpath-analyst`**.
2. Commit `index.html` (and `README.md`) to the `main` branch.
3. Go to **Settings → Pages**.
4. Under **Source**, select **Deploy from a branch** → `main` → `/ (root)`.
5. Save. Your site will be live at:

   ```
   https://geoharkat.github.io/wellpath-analyst/
   ```

GitHub usually takes 1–2 minutes after the first push to publish.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI        | Vanilla HTML + TailwindCSS (CDN) |
| Icons     | Font Awesome 6 |
| Fonts     | DM Sans, JetBrains Mono (Google Fonts) |
| Parsing   | [PapaParse](https://www.papaparse.com/) (CSV), [SheetJS](https://sheetjs.com/) (Excel), custom LAS parser |
| PDF       | [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) |
| Plots     | Native HTML5 Canvas |
| Math      | Vanilla JS — no numerical library required |

No framework. No bundler. No server. A single HTML file.

---

## Roadmap

- [ ] ISCWSA error-model ellipses of uncertainty
- [ ] Tortuosity metrics and build/turn rate diagnostics
- [ ] Target 3D-proximity analysis (lease lines, offset wells)
- [ ] Multi-well overlay mode
- [ ] Export to WITSML 2.0 trajectory format

Pull requests welcome.

---

## About the Developer

**Ismail Harkat** — Senior Wellsite Geologist, Sonatrach (Rhourde Nouss field, Algeria) — with ~15 years in Algerian petroleum operations and ongoing PhD research on hydrothermal MVT mineralisation in the Eastern Saharan Atlas. Builds Python and JavaScript geoscience tooling as a bridge between field operations and modern numerical methods.

- Email: <geoharkat@gmail.com>
- GitHub: [@geoharkat](https://github.com/geoharkat)

---

## Disclaimer

This tool is provided **"as is"** for engineering and educational purposes. It has **not** been independently verified against a certified survey-management package. **Always cross-check results** with your company-approved software (Compass, WellPlan, DrillingOffice, StarSteer, etc.) before making operational decisions that affect well placement, anti-collision, or target intersection.

---

## License

Released under the **MIT License** — free to use, modify, and distribute.

```
MIT License

Copyright (c) 2026 Ismail Harkat

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

© 2026 **Ismail Harkat**. All rights reserved under the MIT License terms above.
