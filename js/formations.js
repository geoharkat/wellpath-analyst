/* =============================================================
   WellPath Analyst — formations.js
   Formation planes, picks, thickness (MT / AVT / TVT / TST /
   Psi / DLS), section horizons, and the formation-top controls.

   A formation top is entered as the TVD at which the reference
   well (the survey when loaded, otherwise the plan) picks it.
   Its plane passes through that pick with the given dip and
   dip azimuth (compass bearing of the down-dip direction).
   ============================================================= */

/* ===== PURE CALCULATIONS ===== */
function resolveFormation(fm, results, vsAz = 0){
  const pick = interpAtTVD(results, fm.tvd, vsAz);
  if(!pick) return { ...fm, pick:null, planeValid:false };
  const slope = Math.tan(Math.min(fm.dip, 89) * DEG), B = fm.dipAzi * DEG;
  const tvdAt = (n, e) => fm.tvd + ((n - pick.north) * Math.cos(B) + (e - pick.east) * Math.sin(B)) * slope;
  const apparentDip = Math.atan(slope * Math.cos((vsAz - fm.dipAzi) * DEG)) * RAD;       // + = deeper along VS
  return { ...fm, pick, tvdAt, apparentDip, planeValid:true };
}

/* Where another well (normally the plan) crosses the same surface. */
function crossingOnWell(resolved, results, vsAz = 0){
  if(!resolved.planeValid) return null;
  const md = firstCrossing(results, p => p.tvd - resolved.tvdAt(p.north, p.east));
  return md === null ? null : interpAtMD(results, md, vsAz);
}

/* MD-weighted average dogleg severity between two depths. */
function averageDls(results, md0, md1){
  const lo = Math.min(md0, md1), hi = Math.max(md0, md1);
  let sum = 0;
  for(let i = 1; i < results.length; i++){
    const overlap = Math.min(hi, results[i].md) - Math.max(lo, results[i-1].md);
    if(overlap > 0) sum += results[i].dls * overlap;
  }
  return hi > lo ? sum / (hi - lo) : 0;
}

/*  MT  = measured thickness (along-hole)
    AVT = apparent vertical thickness (difference in TVD)
    TST = true stratigraphic thickness (offset between picks projected on the bed normal)
    TVT = true vertical thickness (TST / cos dip)
    Psi = angle between the well axis and the bed normal                               */
function calcFormationThickness(results, topTVD, botTVD, dip, dipAzi){
  const top = interpAtTVD(results, topTVD), bot = interpAtTVD(results, botTVD);
  if(!top || !bot) return null;
  const D = dip * DEG, B = dipAzi * DEG;
  const normal = [-Math.sin(D) * Math.cos(B), -Math.sin(D) * Math.sin(B), Math.cos(D)];    // N, E, down
  const TST = Math.abs((bot.north - top.north) * normal[0] + (bot.east - top.east) * normal[1] + (bot.tvd - top.tvd) * normal[2]);
  const TVT = dip < 89.99 ? TST / Math.cos(D) : Infinity;
  const a = tangent(top.inc, top.azi), b = tangent(bot.inc, bot.azi);
  const axis = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];                                   // mean well direction
  const len = Math.hypot(...axis) || 1;
  const cosPsi = (axis[0] * normal[0] + axis[1] * normal[1] + axis[2] * normal[2]) / len;
  const Psi = Math.acos(Math.min(1, Math.abs(cosPsi))) * RAD;
  return { top, bot, MT:bot.md - top.md, AVT:bot.tvd - top.tvd, TVT, TST, Psi, dlsAvg:averageDls(results, top.md, bot.md) };
}

/* Rows of the thickness table: each top paired with the next one down. */
function thicknessRows(formations, results){
  const sorted = [...formations].sort((a, b) => a.tvd - b.tvd);
  return sorted.map((fm, i) => {
    const next = sorted[i + 1] || null;
    return { fm, next, res: next && results && results.length > 1 ? calcFormationThickness(results, fm.tvd, next.tvd, fm.dip, fm.dipAzi) : null };
  });
}

/* Trace of a formation surface on the vertical section: the surface TVD under every point of
   the well track, plotted at that point's section departure, so the pick lies on it even when
   the well leaves the section line. Beyond both ends it continues along the section azimuth. */
function horizonSection(f, path, vsAz, vsMin, vsMax){
  const c = Math.cos(vsAz * DEG), s = Math.sin(vsAz * DEG);
  const at = (n, e) => ({ vs:n * c + e * s, tvd:f.tvdAt(n, e) });
  if(!path.length) return [at(vsMin * c, vsMin * s), at(vsMax * c, vsMax * s)];
  const track = f.pick ? [...path, f.pick].sort((a, b) => a.md - b.md) : path;
  const first = track[0], last = track[track.length - 1];
  const heading = at(last.north, last.east).vs - at(first.north, first.east).vs >= -1e-6 ? 1 : -1;
  const extend = (p, side) => {
    const run = (side > 0 ? vsMax : vsMin) - at(p.north, p.east).vs;
    return run * side > 0 ? [at(p.north + run * c, p.east + run * s)] : [];
  };
  return [...extend(first, -heading), ...track.map(p => at(p.north, p.east)), ...extend(last, heading)];
}

/* ===== CONTROLS (sidebar) ===== */
function readFormationInput(name, tvdText, dipText, aziText){
  const tvd = parseFloat(tvdText), dip = parseFloat(dipText), dipAzi = parseFloat(aziText);
  if(!name.trim()) return { error:'Enter a formation name' };
  if(!Number.isFinite(tvd) || tvd < 0) return { error:'Enter a valid TVD' };
  if(!(dip >= 0 && dip < 90)) return { error:'Dip must be at least 0 and below 90' };
  if(!(dipAzi >= 0 && dipAzi <= 360)) return { error:'Dip azimuth must be between 0 and 360' };
  return { name:name.trim(), tvd:fromLen(tvd, S.units), dip, dipAzi:normAz(dipAzi) };
}
function addFormation(){
  const f = readFormationInput($('fmName').value, $('fmTVD').value, $('fmDip').value, $('fmDipAzi').value);
  if(f.error) return toast(f.error, 'error');
  pushFormation(f);
  $('fmName').value = ''; $('fmTVD').value = ''; $('fmDip').value = '0'; $('fmDipAzi').value = '0';
  renderFormationCards(); refresh();
}
function pushFormation(f){
  S.formations.push({ id:S.nextId++, color:FORMATION_COLORS[S.formations.length % FORMATION_COLORS.length], ...f });
  S.formations.sort((a, b) => a.tvd - b.tvd);
}
function removeFormation(id){ S.formations = S.formations.filter(f => f.id !== id); renderFormationCards(); refresh(); }
function updateFormation(id, field, value){
  const f = S.formations.find(x => x.id === id);
  if(!f) return;
  if(field === 'color') f.color = value;
  else {
    const next = readFormationInput(
      field === 'name' ? value : f.name,
      field === 'tvd' ? value : toLen(f.tvd, S.units),
      field === 'dip' ? value : f.dip,
      field === 'dipAzi' ? value : f.dipAzi);
    if(next.error){ toast(next.error, 'error'); renderFormationCards(); return; }
    if(field === 'tvd') f.tvd = next.tvd; else f[field] = next[field];
    if(field === 'tvd') S.formations.sort((a, b) => a.tvd - b.tvd);
  }
  if(field !== 'color') renderFormationCards();
  refresh();
}
function renderFormationCards(){
  $('formationCards').innerHTML = S.formations.map(f => `
    <div class="segment-card formation-card">
      <div class="segment-header"><h3>${esc(f.name)}</h3>
        <button class="btn btn-danger btn-x" aria-label="Remove ${esc(f.name)}" onclick="removeFormation(${f.id})">X</button></div>
      <div class="form-row">
        <div class="form-group"><label>Name</label><input type="text" value="${esc(f.name)}" onchange="updateFormation(${f.id},'name',this.value)"></div>
        <div class="form-group color-field"><label>Color</label><input type="color" value="${esc(f.color)}" onchange="updateFormation(${f.id},'color',this.value)"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>TVD (${U().len})</label><input type="number" step="any" value="${+toLen(f.tvd, S.units).toFixed(2)}" onchange="updateFormation(${f.id},'tvd',this.value)"></div>
        <div class="form-group"><label>Dip (deg)</label><input type="number" step="any" value="${f.dip}" onchange="updateFormation(${f.id},'dip',this.value)"></div>
        <div class="form-group"><label>Dip azi (deg)</label><input type="number" step="any" value="${f.dipAzi}" onchange="updateFormation(${f.id},'dipAzi',this.value)"></div>
      </div>
      <div class="fm-readout" id="fmReadout-${f.id}"></div>
    </div>`).join('');
}
function updateFormationReadouts(resolved){
  resolved.forEach(f => {
    const el = $(`fmReadout-${f.id}`);
    if(!el) return;
    const strike = normAz(f.dipAzi - 90).toFixed(1);
    el.innerHTML = f.pick
      ? `Strike ${strike}° | pick at MD <b>${fmtLen(f.pick.md, 1)}</b> | apparent dip on section <b>${f.apparentDip.toFixed(2)}°</b>`
      : `Strike ${strike}° | <span class="seg-warn">${S.reference ? 'Not reached by the ' + S.reference + ' well.' : 'Load a well to locate this top.'}</span>`;
  });
}
