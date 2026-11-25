/* =============================================================
   WellPath Analyst — query.js
   Point query: given MD / TVD / VS, interpolate both wells and
   report the survey-vs-plan difference. Nothing is extrapolated.
   ============================================================= */

function queryWell(results, type, value, vsAz){
  if(type === 'md')  return interpAtMD(results, value, vsAz);
  if(type === 'tvd') return interpAtTVD(results, value, vsAz);
  return interpAtVS(results, value, vsAz);
}

function runQuery(){
  const type = $('queryType').value, raw = parseFloat($('queryValue').value), source = $('querySource').value;
  if(!Number.isFinite(raw)) return toast('Enter a numeric value', 'error');
  if(!S.reference) return toast('Load a well first', 'error');
  const value = fromLen(raw, S.units), found = {}, parts = [];
  const label = `${type.toUpperCase()} = ${raw} ${U().len}`;
  WELL_KEYS.filter(k => source === 'both' || source === k).forEach(key => {
    const results = S.wells[key].results;
    if(!results.length){ if(source === key) parts.push(`<div class="query-block">No ${key} data loaded.</div>`); return; }
    const p = queryWell(results, type, value, S.vsAzimuth);
    if(!p){ parts.push(`<div class="query-block"><span class="badge badge-${key}">${WELL_LABELS[key]}</span> ${label} is outside this well.</div>`); return; }
    found[key] = p;
    parts.push(`<div class="query-block"><span class="badge badge-${key}">${WELL_LABELS[key]}</span> at ${label}${queryTable(p)}</div>`);
  });
  if(found.plan && found.survey){
    const d = deviation(found.survey, found.plan, planHeading(S.wells.plan.results, found.plan, S.vsAzimuth));
    const miss = (v, pos, neg) => { const x = toLen(v, S.units); return `${Math.abs(x).toFixed(2)} ${U().len}${Math.abs(x) < 0.005 ? '' : ' ' + (x > 0 ? pos : neg)}`; };
    parts.push(`<div class="query-block diff"><b>Survey vs plan</b><dl>
      <dt>Above / Below</dt><dd>${miss(d.aboveBelow, 'Above', 'Below')}</dd>
      <dt>Left / Right</dt><dd>${miss(d.leftRight, 'Right', 'Left')}</dd>
      <dt>Front / Behind</dt><dd>${miss(d.frontBehind, 'Ahead', 'Behind')}</dd>
      <dt>C-C distance</dt><dd>${fmtLen(d.cc)}</dd></dl></div>`);
  }
  $('queryResults').innerHTML = parts.join('');
}
function queryTable(r){
  const L = v => `${toLen(v, S.units).toFixed(2)} ${U().len}`;
  const items = [['MD', L(r.md)], ['TVD', L(r.tvd)], ['Inc', r.inc.toFixed(2) + '°'], ['Azi', r.azi.toFixed(2) + '°'], ['North', L(r.north)], ['East', L(r.east)],
    ['VS', L(r.vs)], ['DLS', `${toDls(r.dls, S.units).toFixed(2)} ${U().dls}`], ['Closure', `${L(r.closure)} @ ${r.closureAzi.toFixed(1)}°`]];
  return `<dl>${items.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
}
