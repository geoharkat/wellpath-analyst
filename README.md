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

- **Multi-format import** — CSV, TSV, TXT, LAS, XLSX and XLS, with detection of the header row, columns and depth units. Each file can use its own units.
- **Metric or field units** — switch between m with deg/30m and ft with deg/100ft at any time.
- **Minimum curvature** — TVD, North, East, vertical section, DLS, closure and closure azimuth. Positions between stations follow the same arc.
- **Tie-in** — for data that starts below surface: assume vertical from surface, type the position, or tie the survey to the plan.
- **Comparison** — at every survey station: Above/Below, Left/Right, Ahead/Behind, centre-to-centre distance at equal MD, and closest distance to the plan.
- **D3.js plots** — plan view, vertical section (1:1 or stretched), rotatable 3D view, deviation from plan and inclination / azimuth / dogleg profiles, with hover read-outs and zoom.
- **Formation tops** — dip and dip azimuth; MT, AVT, TVT, TST, Ψ, average DLS, and where the plan crosses each surface.
- **Depth range filter** — limits the figures, plots, tables and exports to an MD or TVD interval.
- **Query** — interpolate both wells at any MD, TVD or VS.
- **Manual stations** — add or remove stations without re-uploading.
- **Output files** — PDF report with vector plots, Excel workbook, CSV, and PNG or SVG of every plot.
- **Private** — files are read in your browser; no server, no analytics, no tracking.

---

## Quick Start

### Option 1 — Use the live demo

Open <https://geoharkat.github.io/wellpath-analyst/> and load your files.

### Option 2 — Run locally

```bash
git clone https://github.com/geoharkat/wellpath-analyst.git
cd wellpath-analyst
# open index.html in your browser, or:
python3 -m http.server 8000
# then browse to http://localhost:8000
```

There is no build step. The libraries load from public CDNs, so the first load needs a network connection.

### Option 3 — Quick tour with sample data

1. Open the app and click **Load sample data**.
2. Browse the plots and switch tables with **Show** under the plots.
3. Click **PDF report** in the header.

Plot controls: drag to pan (rotate in 3D), `Ctrl` + scroll to zoom, `Shift` + drag to zoom to a box, double-click to reset.

---

## Input Data Format

| Column | Required | Notes |
|---|---|---|
| **MD** | Yes | Metres or feet |
| **Inc** | Yes | Degrees, 0 to 180 |
| **Azi** | Yes | Degrees from north. May be blank where inclination is 0 |
| TVD, North, East | No | Used to check the calculated positions and to prefill the tie-in |

- Check the detected sheet, header row, columns and units under **Column mapping and units**.
- Title lines above the header, a units row below it, comma, semicolon or tab separators and decimal commas are accepted.
- LAS curve units and the `NULL` value are honoured, including wrapped files.
- Rows are sorted by MD. Rows that cannot be used, and repeated depths, are skipped and listed.

```csv
MD (m),Inc (deg),Azi (deg)
0,0,0
500,0,0
530,1.5,45
560,3.0,46
```

Azimuths are used as given: no magnetic declination or grid convergence is applied.

---

## Output & Reports

| File | Contents |
|---|---|
| **PDF report** | Key figures, data sources, trajectory overview, deviation summary, warnings, plan view, vertical section, 3D view, profiles, deviation plot, formation tops and thickness, comparison listing, disclaimer |
| **Excel** | Sheets: Summary, Comparison, Plan, Survey, Formation Tops, Thickness |
| **CSV** | The table currently shown |
| **PNG / SVG** | Any plot, with title, units and date |

The built-in PDF fonts cover Western European characters only. Other characters in names are transliterated or shown as `?` in the PDF.

### Comparison columns

| Column | Meaning |
|---|---|
| **MD** | Survey station measured depth |
| **Plan TVD / Svy TVD** | TVD of plan (interpolated) and survey at that MD |
| **Above/Below** | Vertical offset from the plan |
| **Left/Right** | Lateral offset, looking along the plan |
| **Front/Behind** | Horizontal offset along the plan heading |
| **C-C** | 3D distance to the plan point at the **same MD** |
| **Closest** | 3D distance to the **nearest** point of the plan |
| **Svy DLS** | Survey dogleg severity |

Where the plan is vertical (inclination below 0.5°) the heading for Left/Right and Ahead/Behind is the plan's kick-off azimuth. Survey stations outside the planned MD interval are listed in a warning and not compared.

---

## Calculations

```
ΔTVD = (ΔMD/2) · (cos I₁ + cos I₂) · RF
ΔN   = (ΔMD/2) · (sin I₁·cos A₁ + sin I₂·cos A₂) · RF
ΔE   = (ΔMD/2) · (sin I₁·sin A₁ + sin I₂·sin A₂) · RF
RF   = (2/β) · tan(β/2),   β = dogleg angle between the two station directions
VS   = N · cos(φ_VS) + E · sin(φ_VS)
```

Nothing is extrapolated: queries, comparisons and formation picks outside a well's surveyed interval return no value.

### Formation tops

A top is entered as the TVD at which the reference well picks it (the survey when loaded, otherwise the plan). Its surface is a plane through that pick with the given dip and dip azimuth. On the vertical section each horizon is drawn along the reference well track, so the pick sits on it even when the well turns.

| Symbol | Meaning |
|---|---|
| **MT** | Measured thickness — along-hole distance between top and base picks |
| **AVT** | Apparent vertical thickness — difference in TVD between the picks |
| **TST** | True stratigraphic thickness — offset between the picks projected on the bed normal, using the upper top's dip |
| **TVT** | True vertical thickness — TST / cos(dip) |
| **Ψ** | Angle between the well axis and the bed normal |

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | Vanilla HTML, CSS and JavaScript (design shared with [Directional Well Planner](https://github.com/geoharkat/Directional-Well-Planner)) |
| Plots | D3.js (SVG) |
| Parsing | SheetJS (CSV and Excel), built-in LAS reader |
| Reports | jsPDF, jsPDF-AutoTable, svg2pdf.js |

### Project structure

```
wellpath-analyst/
├── index.html
├── styles.css
├── js/
│   ├── state.js         # application state and constants
│   ├── utils.js         # DOM helpers, formatting, toasts
│   ├── mincurve.js      # units, minimum curvature, interpolation, tie-in, comparison
│   ├── parsers.js       # CSV / LAS / Excel reading, column detection, sample data
│   ├── formations.js    # formation planes, thickness, formation controls
│   ├── process.js       # import, recalculation, range filter, settings
│   ├── query.js         # depth query
│   ├── tables.js        # summary figures and tables
│   ├── plots.js         # D3 charts
│   ├── export.js        # CSV, Excel, PNG / SVG
│   ├── pdf.js           # PDF report
│   └── interactions.js  # start-up and events
└── tests/core.test.js   # node --test tests/core.test.js
```

---

## Deploy to GitHub Pages

In **Settings → Pages**, choose **Deploy from a branch** → `main` → `/ (root)`.

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
