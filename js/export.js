/* =============================================================
   WellPath Analyst — export.js
   CSV, Excel workbook and PNG / SVG plot downloads.
   ============================================================= */

const fileStem = () => (S.wellName.trim().replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '') || 'well');
const todayText = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
function download(blob, filename){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* Comparison table with the signed deviations appended, for further calculation. */
function comparisonExportData(){
  const rows = filteredComparison();
  const words = comparisonTableData(rows), signed = signedDeviationData(rows);
  return { head:[...words.head, ...signed.head.slice(1, 4).map(h => 'Signed ' + h)], body:words.body.map((r, i) => [...r, ...signed.body[i].slice(1, 4)]) };
}

/* ===== CSV (the table currently shown) ===== */
function csvText(table){
  const cell = v => {
    let str = String(v ?? '');
    if(typeof v === 'string' && /^[=+\-@\t\r]/.test(str)) str = "'" + str;        // spreadsheet formula guard
    return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  return [table.head, ...table.body].map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
function currentCsv(){
  const table = S.table === 'comparison' ? comparisonExportData() : TABLES[S.table]();
  if(!table.body.length) return null;
  return { text:csvText(table), name:`${fileStem()}_${S.table}_${S.units}.csv` };
}
function exportCSV(){
  const c = S.reference && currentCsv();
  if(!c) return toast('The selected table is empty', 'error');
  download(new Blob(['﻿' + c.text], { type:'text/csv;charset=utf-8' }), c.name);
}

/* ===== SHARED SUMMARY BLOCKS (Excel and PDF) ===== */
function overviewRows(){
  const u = UNITS[S.units], L = v => toLen(v, S.units).toFixed(2);
  const stats = WELL_KEYS.map(k => trajectoryStats(S.wells[k].results));
  const row = (label, f) => [label, ...stats.map(s => s ? f(s) : '—')];
  const at = (value, md) => `${value} @ ${L(md)}`;
  return [
    row(`Start MD (${u.len})`, s => L(s.startMD)), row(`End MD (${u.len})`, s => L(s.endMD)), row(`Final TVD (${u.len})`, s => L(s.endTVD)),
    row(`Final North (${u.len})`, s => L(s.endN)), row(`Final East (${u.len})`, s => L(s.endE)), row(`Final VS (${u.len})`, s => L(s.endVS)),
    row(`Closure (${u.len})`, s => L(s.endClosure)), row('Closure azimuth (deg)', s => s.endClosureAzi.toFixed(2)),
    row('Max inclination (deg) @ MD', s => at(s.maxInc.toFixed(2), s.maxIncMD)),
    row(`Max DLS (${u.dls}) @ MD`, s => at(toDls(s.maxDLS, S.units).toFixed(2), s.maxDLSMD)),
    row(`Average DLS (${u.dls})`, s => toDls(s.avgDLS, S.units).toFixed(2)),
    row(`Kick-off MD / TVD (${u.len})`, s => s.kickoffMD === null ? '—' : `${L(s.kickoffMD)} / ${L(s.kickoffTVD)}`),
    row(`Landing (85 deg) MD / TVD (${u.len})`, s => s.landingMD === null ? '—' : `${L(s.landingMD)} / ${L(s.landingTVD)}`)
  ];
}
function deviationRows(){
  const s = comparisonStats(filteredComparison());
  if(!s) return [];
  const u = UNITS[S.units].len, L = v => round2(toLen(v, S.units)), e = s.end;
  return [['Stations compared', s.count, ''], ['End centre-to-centre', L(s.endCC), u], ['Max centre-to-centre', L(s.maxCC), u], ['Average centre-to-centre', L(s.avgCC), u],
    ['End closest distance to plan', L(s.endClosest), u], ['Max closest distance to plan', L(s.maxClosest), u],
    ['Max above / below', L(s.maxAB), u], ['Max left / right', L(s.maxLR), u], ['Max front / behind', L(s.maxFB), u],
    ['Last station: vertical', fmtDir(toLen(e.aboveBelow, S.units), 'Above', 'Below'), u], ['Last station: lateral', fmtDir(toLen(e.leftRight, S.units), 'Right', 'Left'), u]];
}
function sourceRows(){
  const u = UNITS[S.units].len, L = v => `${toLen(v, S.units).toFixed(2)} ${u}`;
  return WELL_KEYS.filter(k => S.wells[k].results.length).map(key => {
    const w = S.wells[key], src = w.source, first = mergeStations(w.fileStations, w.manual)[0];
    const check = compareWithFile(w.results, w.fileStations);
    const tie = !first || first.md <= MD_TOL ? 'Starts at surface' : w.results[0].assumed ? 'Vertical from surface assumed'
      : `${w.tie.mode === 'plan' ? 'Plan position' : 'Given'} at MD ${L(first.md)}: TVD ${L(w.results[0].tvd)}`;
    return [WELL_LABELS[key], src ? src.fileName : w.sample ? 'Sample data' : 'Entered by hand', `${w.results.length}`, src ? (src.unit === 'm' ? 'm' : 'ft') : '—', tie,
      [w.manual.length ? `${w.manual.length} added by hand` : '', w.skipped.length ? `${w.skipped.length} rows skipped` : '',
       check.tvd ? `TVD differs from file by up to ${L(check.tvd.diff)}` : ''].filter(Boolean).join('; ') || '—'];
  });
}
const SOURCE_HEAD = ['Well', 'Source', 'Stations', 'File units', 'Tie-in', 'Notes'];
const warningList = () => [...WELL_KEYS.flatMap(k => S.wells[k].warnings.map(w => `${WELL_LABELS[k]}: ${w}`)),
  ...(S.comparison.outside ? [`${S.comparison.outside} survey station(s) lie outside the planned MD interval and are not compared.`] : [])];

/* ===== EXCEL ===== */
function sheet(aoa, filter = false){
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const cols = Math.max(...aoa.map(r => r.length));
  ws['!cols'] = Array.from({ length:cols }, (_, c) => ({ wch:Math.min(60, Math.max(9, ...aoa.map(r => String(r[c] ?? '').length + 2))) }));
  const range = XLSX.utils.decode_range(ws['!ref']);
  for(let R = 1; R <= range.e.r; R++) for(let c = 0; c <= range.e.c; c++){
    const cell = ws[XLSX.utils.encode_cell({ r:R, c })];
    if(cell && cell.t === 'n' && !Number.isInteger(cell.v)) cell.z = '#,##0.00';
  }
  if(filter) ws['!autofilter'] = { ref:ws['!ref'] };
  return ws;
}
function buildWorkbook(){
  const wb = XLSX.utils.book_new();
  const add = (name, ws) => XLSX.utils.book_append_sheet(wb, ws, name);
  const deviations = deviationRows();
  add('Summary', sheet([
    ['Item', 'Value', 'Unit'],
    ['Well name', S.wellName], ['Field / project', S.wellField], ['Prepared by', S.preparedBy], ['Date', todayText()],
    ['Unit system', S.units === 'm' ? 'Metric (m, deg/30m)' : 'Field (ft, deg/100ft)'], ['Survey method', 'Minimum curvature'],
    ['VS reference azimuth', round2(S.vsAzimuth), 'deg'], ['Depth range', rangeText()], [],
    SOURCE_HEAD, ...sourceRows(), [], ['Trajectory', 'Plan', 'Survey'], ...overviewRows(),
    ...(deviations.length ? [[], ['Deviation (survey vs plan)', 'Value', 'Unit'], ...deviations] : []),
    ...warningList().map(w => ['Warning', w])
  ]));
  if(filteredComparison().length){ const t = comparisonExportData(); add('Comparison', sheet([t.head, ...t.body], true)); }
  ['plan', 'survey'].forEach(k => { const t = stationTableData(k); if(t.body.length) add(WELL_LABELS[k], sheet([t.head, ...t.body], true)); });
  if(S.formations.length){
    const f = formationTableData(resolvedFormations()); add('Formation Tops', sheet([f.head, ...f.body]));
    const t = thicknessTableData(); add('Thickness', sheet([t.head, ...t.body]));
  }
  return wb;
}
function exportExcel(){
  if(!S.reference) return toast('Load a well first', 'error');
  XLSX.writeFile(buildWorkbook(), `${fileStem()}_WellPath_${S.units}.xlsx`);
}

/* ===== PLOTS ===== */
const PLOT_SPECS = {
  plan:      { title:'Plan View',            w:900,  h:800 },
  section:   { title:'Vertical Section',     w:1000, h:740 },
  view3d:    { title:'3D Well Paths',        w:1000, h:760 },
  deviation: { title:'Deviation From Plan',  w:1000, h:820 },
  profiles:  { title:'Directional Profiles', w:1000, h:760 }
};
const chartAvailable = key => !!S.reference && (key !== 'deviation' || filteredComparison().length > 0);
function offscreenChart(key, width, height, options = {}){
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-20000px;top:0;';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  holder.appendChild(svg); document.body.appendChild(holder);
  const camera = { ...($('chart3d').__camera || Charts.VIEWS.iso) };
  Charts[key](svg, buildModel(), { width, height, interactive:false, camera, ...options });
  return { svg, remove:() => holder.remove() };
}
function plotSvgString(key){
  const spec = PLOT_SPECS[key];
  const r = offscreenChart(key, spec.w, spec.h, { title:`${spec.title}${S.wellName ? ' - ' + S.wellName : ''}`,
    subtitle:`${S.units === 'm' ? 'Metric' : 'Field'} units  |  VS azimuth ${S.vsAzimuth.toFixed(1)} deg  |  ${todayText()}` });
  const str = new XMLSerializer().serializeToString(r.svg);
  r.remove();
  return { str, w:spec.w, h:spec.h, name:`${fileStem()}_${spec.title.replace(/\s+/g, '_')}` };
}
function plotPngBlob(key, scale = 3){
  const p = plotSvgString(key);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([p.str], { type:'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = p.w * scale; cv.height = p.h * scale;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      cv.toBlob(b => b ? resolve({ blob:b, name:p.name + '.png' }) : reject(new Error('PNG encoding failed')), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not rasterise the plot')); };
    img.src = url;
  });
}
async function exportPlot(key, format){
  if(!chartAvailable(key)) return toast('There is nothing to export yet', 'error');
  try {
    if(format === 'svg'){
      const p = plotSvgString(key);
      download(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + p.str], { type:'image/svg+xml' }), p.name + '.svg');
    } else { const r = await plotPngBlob(key); download(r.blob, r.name); }
  } catch(err){ console.error(err); toast(`Export failed: ${err.message}`, 'error'); }
}
