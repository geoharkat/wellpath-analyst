/* =============================================================
   WellPath Analyst — state.js
   Global application state and shared constants.
   ============================================================= */

/* ===== GLOBAL STATE ===== */
const S = {
  plan:   { raw:[], headers:[], stations:[], results:[] },
  survey: { raw:[], headers:[], stations:[], results:[] },
  vsAzimuth: 0,
  wellName: '',
  wellField: '',
  comparison: [],
  formations: [],
  displayRange: { by:'md', min:null, max:null }
};

/* Plot zoom rectangles (set by user via drag-zoom) */
const plotZoom = { planView:null, vsView:null };

/* Per-plot zoom-mode toggle */
const zoomMode = { planView:false, vsView:false };

/* Last-drawn axis bounds — used by hover & zoom-release for inverse mapping */
const lastDrawn = { planView:{}, vsView:{} };

/* Palette for formation bands (cycled by index) */
const FM_BAND_COLORS = [
  'rgba(192,96,255,0.10)',  // purple
  'rgba(78,168,255,0.10)',  // blue
  'rgba(16,212,160,0.10)',  // green
  'rgba(232,160,0,0.10)',   // amber
  'rgba(240,68,68,0.10)',   // red
  'rgba(180,120,255,0.10)', // violet
  'rgba(120,200,255,0.10)', // sky
  'rgba(100,220,180,0.10)', // teal
];
