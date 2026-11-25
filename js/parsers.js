/* =============================================================
   WellPath Analyst — parsers.js
   File reading (CSV / TXT / LAS / Excel), header and column
   detection, station extraction, and the sample data set.
   Files are read in the browser and never uploaded.
   ============================================================= */

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAP_COORDINATE_LIMIT = 20000;      // m: larger N/E values are map-grid coordinates, not wellhead offsets
const IMPORT_COLUMNS = ['md', 'inc', 'azi', 'tvd', 'north', 'east'];

/* ===== COLUMN DETECTION ("rows" = sheet as an array of arrays) ===== */
const IMPORT_FIELDS = {
  md:    [/^(md|measureddepth|measdepth|mdepth|depthmd|mddepth)$/, /^(depth|dept|surveydepth)$/],
  inc:   [/^(inc|incl|inclination|inclinationangle|incangle|holeangle|holeinclination)$/, /^(dev|devi|deviation|drift|angle)$/],
  azi:   [/^(az|azi|azm|azim|azimuth|azimuthangle|holeazimuth|(azi|azim|azimuth)(true|grid|mag|magnetic|tn|gn)|(true|grid|magnetic)azimuth)$/, /^(hazi|holedirection|direction|bearing)$/],
  tvd:   [/^(tvd|trueverticaldepth|verticaldepth|tvdrkb|tvdkb|tvdbrt|tvdrt|tvdmd)$/],
  north: [/^(northing|north|ns|northsouth|localnorthing|localnorth|nsoffset|northoffset)$/, /^n$/],
  east:  [/^(easting|east|ew|eastwest|localeasting|localeast|ewoffset|eastoffset)$/, /^e$/]
};
const headerKey = cell => String(cell ?? '').toLowerCase()
  .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')                       // drop "(ft)" or "[deg]"
  .replace(/[^a-z0-9]+/g, ' ').trim()
  .replace(/ (m|ft|feet|meters?|metres?|deg|degs|degrees?)$/, '')
  .replace(/ /g, '');

function matchColumns(row){
  const cols = {}, taken = new Set();
  Object.entries(IMPORT_FIELDS).forEach(([field, patterns]) => {
    for(const re of patterns){
      const i = row.findIndex((c, k) => !taken.has(k) && re.test(headerKey(c)));
      if(i >= 0){ cols[field] = i; taken.add(i); break; }
    }
  });
  return cols;
}
function detectDepthUnit(rows, headerRow, mdCol){
  if(headerRow < 0 || mdCol === undefined) return null;
  const text = [rows[headerRow], rows[headerRow + 1]].map(r => String((r || [])[mdCol] ?? '')).join(' ').toLowerCase();
  if(/(^|[^a-z])(ft|feet|foot|f)([^a-z]|$)/.test(text)) return 'ft';
  if(/(^|[^a-z])(m|meters?|metres?)([^a-z]|$)/.test(text)) return 'm';
  return null;
}
/* Finds the header row (reports often have title lines above it) and the columns. */
function detectSurveyColumns(rows){
  let best = { headerRow:-1, cols:{}, score:0 };
  for(let r = 0; r < Math.min(rows.length, 80); r++){
    const cols = matchColumns(rows[r] || []);
    const score = ['md','inc','azi'].filter(k => cols[k] !== undefined).length * 10 + Object.keys(cols).length;
    if(score > best.score && cols.md !== undefined) best = { headerRow:r, cols, score };
    if(best.score >= 33) break;
  }
  const complete = ['md','inc','azi'].every(k => best.cols[k] !== undefined);
  return { headerRow:best.headerRow, cols:best.cols, complete, unit:detectDepthUnit(rows, best.headerRow, best.cols.md) };
}

/* ===== NUMBERS ===== */
/* A comma followed by anything but three digits can only be a decimal separator. */
function usesDecimalComma(cells){
  return cells.some(c => typeof c === 'string' && /^\s*[+-]?(\d+,(\d{1,2}|\d{4,})|\d{4,},\d+|0,\d+|\d{1,3}(\.\d{3})+,\d+)\s*$/.test(c));
}
function parseNumber(cell, decimalComma){
  if(typeof cell === 'number') return Number.isFinite(cell) ? cell : NaN;
  let s = String(cell ?? '').replace(/[\s  °]/g, '');
  if(!s) return NaN;
  if(decimalComma) s = s.replace(/\./g, '').replace(',', '.');
  else if(/^[+-]?\d{1,3}(,\d{3})+(\.\d*)?$/.test(s)) s = s.replace(/,/g, '');
  return /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s) ? Number(s) : NaN;
}

/* ===== STATIONS from the rows below the header. Depths are returned in metres. ===== */
function extractSurvey(rows, headerRow, cols, unit){
  const stations = [], skipped = [];
  if(['md','inc','azi'].some(k => cols[k] === undefined || cols[k] < 0)) return { stations, skipped };
  const body = rows.slice(headerRow + 1);
  const used = Object.values(cols).filter(i => i >= 0);
  const comma = usesDecimalComma(body.flatMap(r => used.map(i => r[i])));
  let started = false;
  body.forEach((row, k) => {
    const line = headerRow + k + 2;                                  // 1-based row number in the file
    const raw = f => cols[f] === undefined || cols[f] < 0 ? '' : row[cols[f]];
    const value = f => parseNumber(raw(f), comma);
    if(['md','inc','azi'].every(f => String(raw(f) ?? '').trim() === '')) return;
    const md = value('md'), inc = value('inc');
    let azi = value('azi');
    if(!Number.isFinite(md) || !Number.isFinite(inc)){
      if(started || Number.isFinite(md)) skipped.push({ line, reason:'MD or inclination is not a number' });
      return;                                                         // otherwise a units row under the header
    }
    if(!Number.isFinite(azi) && String(raw('azi') ?? '').trim() === '' && Math.abs(inc) < 0.01) azi = 0;
    started = true;
    if(md < 0)                       return skipped.push({ line, reason:'negative MD' });
    if(inc < 0 || inc > 180)         return skipped.push({ line, reason:'inclination outside 0 to 180 deg' });
    if(!(azi >= -360 && azi <= 360)) return skipped.push({ line, reason:'azimuth missing or outside -360 to 360 deg' });
    const opt = f => { const v = value(f); return Number.isFinite(v) ? fromLen(v, unit) : null; };
    stations.push({ md:fromLen(md, unit), inc, azi:normAz(azi), line, fileTvd:opt('tvd'), fileNorth:opt('north'), fileEast:opt('east') });
  });
  stations.sort((a, b) => a.md - b.md);
  const unique = [];
  stations.forEach(s => {
    if(unique.length && s.md - unique[unique.length-1].md <= 0.001) skipped.push({ line:s.line, reason:'repeated MD' });
    else unique.push(s);
  });
  skipped.sort((a, b) => a.line - b.line);
  return { stations:unique, skipped };
}
/* Largest difference between computed positions and any TVD / N / E listed in the file. */
function compareWithFile(results, stations){
  let tvd = null, horizontal = null, base = null;
  const offset = results.length - stations.length;                    // 1 when a surface station was assumed
  stations.forEach((s, i) => {
    const p = results[i + offset];
    if(!p || Math.abs(p.md - s.md) > 0.001) return;
    if(s.fileTvd !== null && s.fileTvd !== undefined){
      const d = Math.abs(p.tvd - s.fileTvd);
      if(!tvd || d > tvd.diff) tvd = { diff:d, md:s.md };
    }
    if(Number.isFinite(s.fileNorth) && Number.isFinite(s.fileEast)){
      if(!base) base = { n:p.north - s.fileNorth, e:p.east - s.fileEast };      // ignores map-grid offsets
      const d = Math.hypot(p.north - s.fileNorth - base.n, p.east - s.fileEast - base.e);
      if(!horizontal || d > horizontal.diff) horizontal = { diff:d, md:s.md };
    }
  });
  return { tvd, horizontal };
}

/* ===== LAS ===== turns a LAS file into header + data rows, with NULL values blanked. */
function lasToRows(text){
  let section = '', nullValue = null, wrap = false;
  const curves = [], data = [];
  for(const line of text.split(/\r?\n/)){
    const t = line.trim();
    if(!t || t.startsWith('#')) continue;
    if(t.startsWith('~')){ section = t.charAt(1).toUpperCase(); continue; }
    if(section === 'V' || section === 'W'){
      const m = t.match(/^([A-Za-z]+)\s*\.\S*\s+([^:]*?)\s*:/);
      if(m && m[1].toUpperCase() === 'NULL') nullValue = Number(m[2]);
      if(m && m[1].toUpperCase() === 'WRAP') wrap = /^y/i.test(m[2]);
    } else if(section === 'C'){
      const spec = t.split(':')[0].trim();
      const m = spec.match(/^([^.\s]+)\s*(?:\.(\S*))?/);
      if(m) curves.push({ name:m[1], unit:m[2] || '' });
    } else if(section === 'A'){
      data.push(t.split(/[\s,]+/));
    }
  }
  if(!curves.length) throw new Error('No curves found in the LAS file');
  let records = data;
  if(wrap){
    const tokens = data.flat();
    records = [];
    for(let i = 0; i + curves.length <= tokens.length; i += curves.length) records.push(tokens.slice(i, i + curves.length));
  }
  const blank = v => (nullValue !== null && Number(v) === nullValue) ? '' : v;
  const header = curves.map(c => c.unit ? `${c.name} (${c.unit})` : c.name);
  return [header, ...records.map(r => r.map(blank))];
}

/* The separator that splits the most lines into three or more fields (title lines do not mislead it). */
function detectDelimiter(text){
  const lines = text.split(/\r?\n/).slice(0, 200);
  const score = d => lines.reduce((n, line) => n + (line.replace(/"[^"]*"/g, '').split(d).length >= 3 ? 1 : 0), 0);
  return ['\t', ';', ','].reduce((best, d) => score(d) > score(best) ? d : best);
}

/* ===== FILE → { sheets:[{name, rows}] } ===== */
async function readWellFile(file){
  if(file.size > MAX_FILE_BYTES) throw new Error('The file is larger than 15 MB');
  const ext = file.name.split('.').pop().toLowerCase();
  if(ext === 'las') return { sheets:[{ name:'LAS', rows:lasToRows(await file.text()) }] };
  if(!['csv','tsv','txt','xlsx','xlsm','xls'].includes(ext)) throw new Error('Unsupported file type');
  if(!window.XLSX) throw new Error('The spreadsheet library did not load');
  let book;
  if(['csv','tsv','txt'].includes(ext)){
    const text = (await file.text()).replace(/^﻿/, '');
    book = XLSX.read(text, { type:'string', raw:true, FS:detectDelimiter(text) });
  } else book = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type:'array' });
  return { sheets:book.SheetNames.map(name => ({ name, rows:XLSX.utils.sheet_to_json(book.Sheets[name], { header:1, raw:true, defval:'' }) })) };
}

/* ===== SAMPLE DATA ===== */
function sampleData(){
  const list = text => text.split(' ').map(s => { const [md, inc, azi] = s.split('/').map(Number); return { md, inc, azi }; });
  return {
    plan: list('0/0/45 50/0/45 150/15/45 300/30/45 500/45/45 700/55/48 900/60/50 1100/65/52 1300/70/53 1500/72/55 1700/73/55 1900/74/56 2100/75/57 2300/75/58 2500/76/58'),
    survey: list('0/0/45 50/0.2/44.8 150/14.5/45.3 300/29.8/45.8 500/44.2/46.5 700/54.8/49.2 900/60.3/51 1100/65.5/53.2 1300/70.8/54.5 1500/72.5/56 1700/73.8/56.2 1900/74.5/57.5 2100/75.3/58 2300/75.6/59.2 2500/76.5/59.8'),
    formations: [
      { name:'Overburden Shale', tvd:200,  dip:5,  dipAzi:45 },
      { name:'Cap Rock',         tvd:500,  dip:8,  dipAzi:48 },
      { name:'Reservoir A',      tvd:850,  dip:12, dipAzi:50 },
      { name:'Reservoir B',      tvd:1200, dip:15, dipAzi:52 },
      { name:'Basement',         tvd:1800, dip:20, dipAzi:55 }
    ]
  };
}
