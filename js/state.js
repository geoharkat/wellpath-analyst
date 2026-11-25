/* =============================================================
   WellPath Analyst — state.js
   Global application state and shared constants.
   Lengths are stored in metres whatever the display unit.
   ============================================================= */

const APP_VERSION = '2.0.0';
const WELL_KEYS = ['plan', 'survey'];
const WELL_LABELS = { plan:'Plan', survey:'Survey' };
const WELL_COLORS = { plan:'#257de0', survey:'#f47230' };
const FORMATION_COLORS = ['#6a4ce2', '#00b894', '#ee7fac', '#008a17', '#f2a600', '#ec4647'];

function emptyWell(){
  return { source:null,          // { fileName, sheets, sheet, headerRow, cols, unit, unitGuessed }
           fileStations:[], skipped:[], manual:[],
           tie:{ mode:'vertical', tvd:0, north:0, east:0 },
           results:[], warnings:[] };
}

const S = {
  units: (() => { try { return localStorage.getItem('wpa-units') === 'ft' ? 'ft' : 'm'; } catch(e){ return 'm'; } })(),
  wells: { plan:emptyWell(), survey:emptyWell() },
  vsAzimuth: 0,
  wellName: '', wellField: '', preparedBy: '',
  formations: [], nextId: 1,
  reference: null,               // well used for formation picks: 'survey' or 'plan'
  comparison: { rows:[], outside:0 },
  range: { by:'md', min:null, max:null },
  view: { trueScale:true, fill:true, d3Full:false },
  table: 'comparison'
};
