/* =============================================================
   WellPath Analyst — tables.js
   Summary tiles and the table panel. The same table builders
   feed the screen, CSV, Excel and the PDF report.
   Each builder returns { title, head, body, text } where body
   holds numbers where possible and text the on-screen strings.
   ============================================================= */

const round2 = v => { const r = Math.round(v * 100) / 100; return r === 0 ? 0 : r; };

function comparisonTableData(rows){
  const u = UNITS[S.units], L = v => toLen(v, S.units);
  const head = [`MD (${u.len})`, `Plan TVD (${u.len})`, `Svy TVD (${u.len})`, `Above/Below (${u.len})`, `Left/Right (${u.len})`, `Front/Behind (${u.len})`,
    `C-C (${u.len})`, `Closest (${u.len})`, 'Plan Inc', 'Svy Inc', 'Plan Azi', 'Svy Azi', `Svy DLS (${u.dls})`];
  const body = rows.map(r => [round2(L(r.md)), round2(L(r.planTVD)), round2(L(r.surveyTVD)),
    fmtDir(L(r.aboveBelow), 'Above', 'Below'), fmtDir(L(r.leftRight), 'Right', 'Left'), fmtDir(L(r.frontBehind), 'Ahead', 'Behind'),
    round2(L(r.cc)), round2(L(r.closest)), round2(r.planInc), round2(r.surveyInc), round2(r.planAzi), round2(r.surveyAzi), round2(toDls(r.surveyDLS, S.units))]);
  return { title:'Survey vs Plan Comparison', head, body };
}
/* Signed deviations as numbers (for spreadsheets): + above, + right, + ahead. */
function signedDeviationData(rows){
  const u = UNITS[S.units], L = v => round2(toLen(v, S.units));
  return { head:[`MD (${u.len})`, `Above+/Below- (${u.len})`, `Right+/Left- (${u.len})`, `Ahead+/Behind- (${u.len})`, `C-C (${u.len})`, `Closest (${u.len})`],
    body:rows.map(r => [L(r.md), L(r.aboveBelow), L(r.leftRight), L(r.frontBehind), L(r.cc), L(r.closest)]) };
}
function stationTableData(key){
  const u = UNITS[S.units], L = v => round2(toLen(v, S.units));
  const head = [`MD (${u.len})`, 'Inc (deg)', 'Azi (deg)', `TVD (${u.len})`, `North (${u.len})`, `East (${u.len})`, `VS (${u.len})`, `DLS (${u.dls})`,
    `Closure (${u.len})`, 'Closure azi', 'Note'];
  const body = S.wells[key].results.filter(r => inRange(r.md, r.tvd)).map(r => [L(r.md), round2(r.inc), round2(r.azi), L(r.tvd), L(r.north), L(r.east), L(r.vs),
    round2(toDls(r.dls, S.units)), L(r.closure), round2(r.closureAzi), r.assumed ? 'assumed' : r.manual ? 'added by hand' : '']);
  return { title:`${WELL_LABELS[key]} Stations`, head, body };
}
function formationTableData(resolved){
  const u = UNITS[S.units], L = v => round2(toLen(v, S.units));
  const ref = S.reference ? WELL_LABELS[S.reference] : 'Reference';
  const other = S.reference === 'survey' && S.wells.plan.results.length > 1;
  const head = ['Formation', `TVD (${u.len})`, 'Dip (deg)', 'Dip azi (deg)', 'Strike (deg)', 'Apparent dip on VS (deg)',
    `${ref} pick MD (${u.len})`, 'Inc at pick', `VS at pick (${u.len})`, ...(other ? [`Plan MD at surface (${u.len})`, `Plan TVD at surface (${u.len})`] : [])];
  const body = resolved.map(f => {
    const p = f.pick, o = other ? crossingOnWell(f, S.wells.plan.results, S.vsAzimuth) : null;
    return [f.name, L(f.tvd), round2(f.dip), round2(f.dipAzi), round2(normAz(f.dipAzi - 90)), p ? round2(f.apparentDip) : '',
      p ? L(p.md) : 'Not reached', p ? round2(p.inc) : '', p ? L(p.vs) : '', ...(other ? [o ? L(o.md) : '', o ? L(o.tvd) : ''] : [])];
  });
  return { title:'Formation Tops', head, body };
}
function thicknessTableData(){
  const u = UNITS[S.units], L = v => round2(toLen(v, S.units));
  const head = ['Formation', `Top TVD (${u.len})`, `Base TVD (${u.len})`, 'Dip (deg)', 'Dip azi (deg)', `MT (${u.len})`, `AVT (${u.len})`, `TVT (${u.len})`, `TST (${u.len})`,
    'Psi (deg)', `Avg DLS (${u.dls})`, `MD top (${u.len})`, `MD base (${u.len})`, 'Inc top', 'Inc base', 'Azi top', 'Azi base'];
  const body = thicknessRows(S.formations, refResults()).map(({ fm, next, res }) => {
    const base = [fm.name, L(fm.tvd), next ? L(next.tvd) : '', round2(fm.dip), round2(fm.dipAzi)];
    if(!res) return [...base, next ? 'Not reached' : 'Last marker', '', '', '', '', '', '', '', '', '', '', ''];
    return [...base, L(res.MT), L(res.AVT), Number.isFinite(res.TVT) ? L(res.TVT) : 'infinite', L(res.TST), round2(res.Psi), round2(toDls(res.dlsAvg, S.units)),
      L(res.top.md), L(res.bot.md), round2(res.top.inc), round2(res.bot.inc), round2(res.top.azi), round2(res.bot.azi)];
  });
  return { title:'Formation Thickness Statistics', head, body };
}
const TABLES = {
  comparison: () => comparisonTableData(filteredComparison()),
  survey:     () => stationTableData('survey'),
  plan:       () => stationTableData('plan'),
  thickness:  () => thicknessTableData()
};
const EMPTY_TEXT = { comparison:'Load both a plan and a survey to compare them.', survey:'No survey data loaded.', plan:'No plan data loaded.', thickness:'Add formation tops and load a well.' };

function renderTable(){
  const t = TABLES[S.table]();
  const has = t.body.length && S.reference;
  const cell = v => typeof v === 'number' ? v.toFixed(2) : esc(v);
  $('dataTable').innerHTML = has
    ? `<table><thead><tr>${t.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.body.map(r => `<tr>${r.map(v => `<td>${cell(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : `<div class="table-empty">${EMPTY_TEXT[S.table]}</div>`;
  $('tableInfo').textContent = has ? `${t.body.length} rows | ${rangeText()}` : '';
}
function onTableChange(v){ S.table = v; renderTable(); }

/* Tiles: deviation figures when both wells exist, otherwise the single well. */
function summaryTiles(){
  const u = UNITS[S.units], L = v => toLen(v, S.units).toFixed(2);
  const stats = comparisonStats(filteredComparison());
  if(stats) return [
    ['End centre-to-centre', L(stats.endCC), u.len], ['Max centre-to-centre', L(stats.maxCC), u.len], ['Average centre-to-centre', L(stats.avgCC), u.len],
    ['Max above / below', L(stats.maxAB), u.len], ['Max left / right', L(stats.maxLR), u.len], ['Max front / behind', L(stats.maxFB), u.len]];
  const t = S.reference ? trajectoryStats(refResults()) : null;
  const v = (f, d = 2) => t ? f(t).toFixed(d) : '—';
  return [['End MD', v(x => toLen(x.endMD, S.units), 1), u.len], ['End TVD', v(x => toLen(x.endTVD, S.units), 1), u.len],
    ['Closure', v(x => toLen(x.endClosure, S.units), 1), u.len], ['Closure azimuth', v(x => x.endClosureAzi), 'deg'],
    ['Max inclination', v(x => x.maxInc), 'deg'], ['Max dogleg severity', v(x => toDls(x.maxDLS, S.units)), u.dls]];
}
function renderKpis(){
  $('kpiStrip').innerHTML = summaryTiles().map(([label, value, unit]) =>
    `<div class="kpi"><span class="kpi-label">${label}</span><span class="kpi-value">${value}</span><span class="kpi-unit">${unit}</span></div>`).join('');
}
