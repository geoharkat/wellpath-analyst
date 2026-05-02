# WellPath Analyst

**Minimum Curvature Survey vs Plan comparison tool — runs entirely in your browser.**

[![Live Demo](https://img.shields.io/badge/live--demo-online-success)](https://geoharkat.github.io/wellpath-analyst/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![No Backend](https://img.shields.io/badge/backend-none-blue.svg)](#)
[![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=flat&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/geoharkat/wellpath-analyst)

WellPath Analyst is a single-page web application for directional drillers, wellsite geologists, and petroleum engineers who need a fast, private, and portable way to compare a well's **planned trajectory** against the **actual survey** — with full minimum-curvature geometry, centre-to-centre deviation, displacement breakdown (Above/Below, Left/Right, Ahead/Behind), VS plots, and formation-top statistics.

It reconstructs well trajectories with the **Minimum Curvature Method (MCM)** — the same algorithm that powers industry-standard survey-management packages such as Landmark Compass, Halliburton WellPlan, Schlumberger DrillingOffice, and ROGII StarSteer. Each pair of survey stations is joined by a smooth circular arc, yielding TVD, North, East, Vertical Section, DLS, and Closure that match commercial software to the centimetre. On top of that core geometry the app adds station-by-station deviation analysis versus plan, interpolation at any MD/TVD/VS, and formation-thickness analysis (MT, AVT, TVT, TST) with true-dip corrections.

All computation is client-side. Your survey data never leaves your browser.

> **Live app:** <https://geoharkat.github.io/wellpath-analyst/>

---

## Who should use it

- **Wellsite geologists** — QC surveys coming off the rig and annotate geological observations alongside them.
- **Directional drillers** — verify tool-face steering is keeping the well inside the plan corridor.
- **Drilling engineers** — pre-compute morning-meeting deviations and anti-collision sanity checks.
- **Operations & JV partner reviews** — export a publication-quality PDF for joint-venture reporting, regulator submissions, or internal archives.
- **Geosteering QC** — cross-check commercial geosteering output against an independent MCM reconstruction from raw survey data.
- **Universities & training courses** — a transparent, readable JavaScript implementation of MCM for teaching directional-survey mathematics.

Because everything runs client-side, the tool is safe to use on confidential well data that cannot be uploaded to cloud services.

---

## Features

- **Multi-format import** — CSV, LAS, XLSX, XLS with auto-detection for MD / Inc / Azi columns.
- **Minimum Curvature computation** — TVD, North, East, VS, DLS, dogleg, closure, closure azimuth.
- **Side-by-side comparison** — station-by-station Survey vs Plan with interpolation at every survey MD.
- **Displacement labels** — readable direction words (`2.34 Above`, `0.85 Right`, `3.21 Ahead`, `3.45 C-C`) instead of raw signed numbers.
- **Interactive plots** — Plan View (North vs East) and Vertical Section (VS vs TVD) rendered on high-DPI HTML5 canvas, with rectangle-drag zoom, hover tooltips, and PNG export.
- **Formation-aware VS plot** — dipping formation traces drawn as true dip lines in the VS plane, with coloured depth bands and inline formation labels.
- **PDF report export** — multi-page report covering executive summary, both plots (each on its own landscape page), formation thickness tables, and the full comparison table.
- **Query tool** — interpolate any station by MD, TVD, or VS; get survey-vs-plan differences at any depth.
- **Formation tops** — add tops by TVD with dip and dip-azimuth; automatic MT/AVT/TVT/TST, Ψ (well-axis angle to formation normal), average DLS, and MD/Inc/Azi at top & bottom.
- **Manual station entry** — inject points on the fly without re-uploading.
- **100% offline-capable** — open `index.html` directly from disk (CDN assets cache after the first load).
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

### PDF report layout

1. **Page 1 — Cover + Summary.** Header banner, well metadata, Trajectory Overview (Plan vs Survey statistics), Deviation Summary (max/avg/end C-C, max A/B, L/R, F/B).
2. **Page 2 — Plan View** on its own landscape page, sized to fill the page.
3. **Page 3 — Vertical Section** on its own landscape page, sized to fill the page.
4. **Page 4 — Formations.** Formation tops table + thickness statistics (MT / AVT / TVT / TST / Ψ / DLS avg).
5. **Page 5 — Detailed Comparison.** Full station-by-station table, paginated automatically.
6. Every page footer includes the well name, page number, and contact line.

Filename convention: `WellPath_Report_<WellName>_YYYY-MM-DD.pdf`.

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

Formation thickness definitions used in the app:

| Symbol | Meaning |
|---|---|
| **MT**  | Measured Thickness — along-hole distance between top and bottom picks |
| **AVT** | Apparent Vertical Thickness — ΔTVD between picks |
| **TVT** | True Vertical Thickness — TST / cos(dip) |
| **TST** | True Stratigraphic Thickness — integrated projection of trajectory onto the formation normal |
| **Ψ**   | Angle between the well axis and the formation normal (steering geometry) |

---

## Deploy to GitHub Pages

1. Create a new GitHub repository named **`wellpath-analyst`**.
2. Commit the project files to the `main` branch:
   - `index.html`
   - `styles.css`
   - the `js/` folder (all eleven modules)
   - `README.md`
3. Go to **Settings → Pages**.
4. Under **Source**, select **Deploy from a branch** → `main` → `/ (root)`.
5. Save. Your site will be live at:

   ```
   https://<your-username>.github.io/wellpath-analyst/
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
| Plots     | Native HTML5 Canvas (device-pixel-ratio aware) |
| Math      | Vanilla JS — no numerical library required |
| Architecture | 11 plain-script modules under `js/`, loaded sequentially — no bundler, no framework |

No framework. No bundler. No server. One HTML file, one stylesheet, eleven JS modules.

### Project structure

```
wellpath-analyst/
├── index.html
├── styles.css
├── README.md
└── js/
    ├── state.js         # global state + formation-band palette
    ├── utils.js         # toasts, tabs, formatters, about modal
    ├── mincurve.js      # minimum curvature math + interpolation + trajectory stats
    ├── parsers.js       # CSV / LAS / XLSX parsers + sample data
    ├── process.js       # orchestration, range filter, manual station
    ├── tables.js        # data + comparison tables
    ├── plots.js         # Plan View + VS drawing + PNG export
    ├── formations.js    # formation tops CRUD + thickness stats
    ├── query.js         # point-query tab
    ├── pdf.js           # multi-page PDF report generator
    └── interactions.js  # DOM-ready, zoom drag, hover tooltips
```

Each module owns a single concern and exposes functions as globals so that inline `onclick=` handlers in the HTML keep working without a build step. Dependencies flow downward in the order above — leaf modules (`state`, `utils`, `mincurve`) load first so everything else can rely on them.

---

## Roadmap

- [ ] ISCWSA error-model ellipses of uncertainty
- [ ] Tortuosity metrics and build/turn-rate diagnostics
- [ ] Target 3D-proximity analysis (lease lines, offset wells)
- [ ] Multi-well overlay mode
- [ ] Export to WITSML 2.0 trajectory format
- [ ] Anti-collision scan with configurable separation factor

Pull requests welcome.

---

## About the Developer

**Ismail Harkat** — Senior Wellsite / Operations Geologist at Sonatrach, currently at the Rhourde Nouss field in Algeria — brings around fifteen years of Algerian petroleum-operations experience covering HPHT Cambrian reservoirs, Aptian–Albian carbonates, geosteering with ROGII StarSteer, DST / PFD well-testing, and offshore work on North Field jackup rigs with QatarEnergy LNG. In parallel he is completing a PhD in geological sciences on Mississippi Valley-Type (MVT) mineralisation and hydrothermal activity in the Eastern Saharan Atlas.

WellPath Analyst is part of a broader open-source toolkit he builds to put modern numerical methods directly in the hands of field geologists — without centralised IT, cloud accounts, or commercial licences in the way. The same motivation drives his Python work on pressure-transient analysis, empirical Bayesian kriging, Landsat remote-sensing pipelines for geological mapping, multi-vendor well-log processing (LAS / DLIS / LIS), and formation-top detection with deep learning.

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
