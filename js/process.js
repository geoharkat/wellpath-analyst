/* =============================================================
   WellPath Analyst — process.js
   Imports into the two wells, recalculation, depth-range filter,
   manual stations, units and view options.
   ============================================================= */

/* ===== IMPORT ===== */
function pickFile(key){ const input = $(`file-${key}`); input.value = ''; input.click(); }

async function handleFile(key, file){
  try {
    const { sheets } = await readWellFile(file);
    const found = sheets.findIndex(s => detectSurveyColumns(s.rows).complete);
    const well = S.wells[key];
    well.source = { fileName:file.name, sheets, sheet:Math.max(0, found) };
    autoDetect(key);
    applyMapping(key);
    renderImportCard(key);
    refresh(true);
    const n = well.fileStations.length;
    if(n) toast(`${WELL_LABELS[key]} loaded: ${n} stations from ${file.name}`);
    else toast(`Check the column mapping for ${file.name}`, 'error');
  } catch(err){
    console.error(err);
    toast(`Could not read the file: ${err.message}`, 'error');
  }
}
function autoDetect(key){
  const src = S.wells[key].source;
  const d = detectSurveyColumns(src.sheets[src.sheet].rows);
  src.headerRow = Math.max(0, d.headerRow);
  src.cols = d.cols;
  src.unit = d.unit || S.units;
  src.unitGuessed = !d.unit;
  src.tieFromFile = true;
}
/* Reads the stations with the current mapping and prefills the tie-in. */
function applyMapping(key){
  const well = S.wells[key], src = well.source;
  if(!src) return;
  const r = extractSurvey(src.sheets[src.sheet].rows, src.headerRow, src.cols, src.unit);
  well.fileStations = r.stations;
  well.skipped = r.skipped;
  const first = r.stations[0];
  if(src.tieFromFile && first && first.md > MD_TOL){
    const known = first.fileTvd !== null;
    const offset = v => v === null || Math.abs(v) > MAP_COORDINATE_LIMIT ? 0 : v;
    well.tie = known ? { mode:'values', tvd:first.fileTvd, north:offset(first.fileNorth), east:offset(first.fileEast) }
                     : { mode:'vertical', tvd:0, north:0, east:0 };
  }
}
function setMapping(key, field, value){
  const src = S.wells[key].source;
  if(!src) return;
  if(field === 'sheet'){ src.sheet = +value; autoDetect(key); }
  else if(field === 'headerRow'){
    src.headerRow = Math.max(0, (parseInt(value, 10) || 1) - 1);
    src.cols = matchColumns(src.sheets[src.sheet].rows[src.headerRow] || []);
    src.tieFromFile = true;
  }
  else if(field === 'unit'){ src.unit = value; src.unitGuessed = false; src.tieFromFile = true; }
  else { if(+value < 0) delete src.cols[field]; else src.cols[field] = +value; src.tieFromFile = true; }
  applyMapping(key); renderImportCard(key); refresh(true);
}
function setTie(key, field, value){
  const well = S.wells[key];
  if(well.source) well.source.tieFromFile = false;
  if(field === 'mode'){
    const start = mergeStations(well.fileStations, well.manual)[0];
    const now = start && interpAtMD(well.results, start.md);
    if(value === 'values' && now) well.tie = { mode:value, tvd:now.tvd, north:now.north, east:now.east };
    else well.tie.mode = value;
  }
  else {
    const v = parseFloat(value);
    if(!Number.isFinite(v)) return renderImportCard(key);
    well.tie[field] = fromLen(v, S.units);
  }
  renderImportCard(key); refresh(true);
}
function clearWell(key){ S.wells[key] = emptyWell(); renderImportCard(key); refresh(true); }

function renderImportCard(key){
  const well = S.wells[key], src = well.source, body = $(`import-${key}`);
  const stations = mergeStations(well.fileStations, well.manual);
  const first = stations[0];
  let html = '';
  if(src){
    const rows = src.sheets[src.sheet].rows, header = rows[src.headerRow] || [];
    const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
    const letter = i => (i >= 26 ? letter(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + i % 26);
    const colSelect = (field, label) => `<div class="form-group"><label>${label}</label><select onchange="setMapping('${key}','${field}',this.value)">
      <option value="-1">— none —</option>${Array.from({ length:width }, (_, i) =>
        `<option value="${i}" ${src.cols[field] === i ? 'selected' : ''}>${letter(i)}: ${esc(String(header[i] ?? '').slice(0, 30))}</option>`).join('')}</select></div>`;
    const ok = well.fileStations.length > 0;
    html += `<div class="file-name">${esc(src.fileName)}</div>
      <div class="import-status ${ok ? '' : 'bad'}">${ok ? `${well.fileStations.length} stations, MD ${fmtLen(well.fileStations[0].md, 1)} to ${fmtLen(well.fileStations[well.fileStations.length-1].md, 1)}`
        : 'No usable stations. Choose the header row and the MD, Inc and Azi columns.'}</div>`;
    if(src.unitGuessed) html += `<div class="import-status warn">⚠ The file does not state its depth units. Confirm them below.</div>`;
    if(well.skipped.length) html += `<div class="import-status warn">⚠ ${well.skipped.length} row(s) skipped: ${well.skipped.slice(0, 3).map(s => `row ${s.line} (${esc(s.reason)})`).join(', ')}${well.skipped.length > 3 ? ', …' : ''}</div>`;
    html += `<details class="mapping" ${ok && !src.unitGuessed ? '' : 'open'}><summary>Column mapping and units</summary>
      <div class="form-row">
        ${src.sheets.length > 1 ? `<div class="form-group"><label>Sheet</label><select onchange="setMapping('${key}','sheet',this.value)">${src.sheets.map((s, i) => `<option value="${i}" ${i === src.sheet ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>` : ''}
        <div class="form-group"><label>Header row</label><input type="number" min="1" step="1" value="${src.headerRow + 1}" onchange="setMapping('${key}','headerRow',this.value)"></div>
        <div class="form-group"><label>Depth units in file</label><select onchange="setMapping('${key}','unit',this.value)"><option value="m" ${src.unit === 'm' ? 'selected' : ''}>Metres</option><option value="ft" ${src.unit === 'ft' ? 'selected' : ''}>Feet</option></select></div>
      </div>
      <div class="form-row">${colSelect('md', 'MD *')}${colSelect('inc', 'Inc (deg) *')}${colSelect('azi', 'Azi (deg) *')}</div>
      <div class="form-row">${colSelect('tvd', 'TVD (check)')}${colSelect('north', 'North (check)')}${colSelect('east', 'East (check)')}</div>
    </details>`;
  }
  if(first && first.md > MD_TOL){
    const t = well.tie, canUsePlan = key === 'survey' && S.wells.plan.results.length > 1;
    const num = (field, label) => `<div class="form-group"><label>${label} (${U().len})</label><input type="number" step="any" value="${+toLen(t[field], S.units).toFixed(3)}" onchange="setTie('${key}','${field}',this.value)"></div>`;
    html += `<div class="tie-box"><div class="form-group"><label>Tie-in at first station (MD ${fmtLen(first.md, 1)})</label>
      <select onchange="setTie('${key}','mode',this.value)">
        <option value="vertical" ${t.mode === 'vertical' ? 'selected' : ''}>Assume vertical from surface</option>
        <option value="values" ${t.mode === 'values' ? 'selected' : ''}>Enter TVD, North, East</option>
        ${canUsePlan || t.mode === 'plan' ? `<option value="plan" ${t.mode === 'plan' ? 'selected' : ''}>Tie in to the plan position</option>` : ''}
      </select></div>
      ${t.mode === 'values' ? `<div class="form-row">${num('tvd', 'TVD')}${num('north', 'North')}${num('east', 'East')}</div>` : ''}</div>`;
  }
  if(well.manual.length){
    html += `<div class="manual-list"><b>Added by hand</b>${well.manual.map((m, i) => `<div>MD ${fmtLen(m.md)} | ${m.inc.toFixed(2)}° | ${m.azi.toFixed(2)}°
      <button class="link-btn" onclick="removeManualStation('${key}',${i})">remove</button></div>`).join('')}</div>`;
  }
  if(src || well.manual.length) html += `<button class="link-btn" onclick="clearWell('${key}')">Clear ${WELL_LABELS[key].toLowerCase()} data</button>`;
  body.innerHTML = html;
}

/* ===== MANUAL STATION ===== */
function addManualStation(){
  const key = $('addTarget').value;
  const md = parseFloat($('addMD').value), inc = parseFloat($('addInc').value), azi = parseFloat($('addAzi').value);
  if(![md, inc, azi].every(Number.isFinite)) return toast('Enter MD, inclination and azimuth', 'error');
  if(md < 0) return toast('MD cannot be negative', 'error');
  if(inc < 0 || inc > 180) return toast('Inclination must be between 0 and 180', 'error');
  if(azi < -360 || azi > 360) return toast('Azimuth must be between -360 and 360', 'error');
  const mdM = fromLen(md, S.units), well = S.wells[key];
  well.manual = well.manual.filter(m => Math.abs(m.md - mdM) > 0.001);
  well.manual.push({ md:mdM, inc, azi:normAz(azi) });
  well.manual.sort((a, b) => a.md - b.md);
  $('addMD').value = ''; $('addInc').value = ''; $('addAzi').value = '';
  renderImportCard(key); refresh(true);
  toast(`Station added to ${WELL_LABELS[key].toLowerCase()} at MD ${md.toFixed(1)} ${U().len}`);
}
function removeManualStation(key, i){ S.wells[key].manual.splice(i, 1); renderImportCard(key); refresh(true); }

/* ===== SAMPLE ===== */
function loadSample(){
  const d = sampleData();
  WELL_KEYS.forEach(key => {
    const well = emptyWell();
    well.fileStations = d[key].map(s => ({ ...s, fileTvd:null, fileNorth:null, fileEast:null }));
    well.sample = true;
    S.wells[key] = well;
  });
  S.formations = []; d.formations.forEach(pushFormation);
  if(!$('wellName').value) $('wellName').value = 'DEMO-01';
  if(!$('wellField').value) $('wellField').value = 'Sample Field';
  onDetails();
  S.vsAzimuth = 0; resetRangeInputs();
  WELL_KEYS.forEach(renderImportCard);
  renderFormationCards();
  refresh(true);
  autoVsAzimuth();
  toast('Sample data loaded');
}
function clearAll(){
  S.wells = { plan:emptyWell(), survey:emptyWell() };
  S.formations = []; S.vsAzimuth = 0; $('vsAzimuth').value = 0;
  resetRangeInputs();
  WELL_KEYS.forEach(renderImportCard); renderFormationCards(); $('queryResults').innerHTML = '';
  refresh(true);
}

/* ===== RECALCULATION ===== */
function recalculate(){
  WELL_KEYS.forEach(key => {
    const well = S.wells[key];
    const r = computeWell(mergeStations(well.fileStations, well.manual), well.tie, S.vsAzimuth, key === 'survey' ? S.wells.plan.results : null);
    well.results = r.results.length >= 2 ? r.results : [];
    well.warnings = r.warnings;
  });
  S.reference = S.wells.survey.results.length ? 'survey' : S.wells.plan.results.length ? 'plan' : null;
  S.comparison = compareWells(S.wells.plan.results, S.wells.survey.results, S.vsAzimuth);
}
const refResults = () => S.reference ? S.wells[S.reference].results : [];
const resolvedFormations = () => S.formations.map(f => resolveFormation(f, refResults(), S.vsAzimuth));

/* geometryChanged resets zoom when the trajectories themselves moved */
function refresh(geometryChanged){
  recalculate();
  if(geometryChanged) resetZoom();
  const warnings = [];
  WELL_KEYS.forEach(k => S.wells[k].warnings.forEach(w => warnings.push(`${WELL_LABELS[k]}: ${w}`)));
  if(S.comparison.outside) warnings.push(`${S.comparison.outside} survey station(s) lie outside the planned MD interval and are not compared.`);
  $('warnings').innerHTML = warnings.map(w => `<div>⚠ ${esc(w)}</div>`).join('');
  const loaded = WELL_KEYS.filter(k => S.wells[k].results.length);
  $('statusBadge').textContent = loaded.length ? loaded.map(k => `${WELL_LABELS[k]}: ${S.wells[k].results.length}`).join(' | ') : 'No data loaded';
  updateFormationReadouts(resolvedFormations());
  updateRangeIndicator();
  renderKpis(); drawCharts(); renderTable();
}

/* ===== DEPTH RANGE FILTER ===== */
const rangeActive = () => S.range.min !== null || S.range.max !== null;
function inRange(md, tvd){
  const v = S.range.by === 'tvd' ? tvd : md;
  return (S.range.min === null || v >= S.range.min - 1e-6) && (S.range.max === null || v <= S.range.max + 1e-6);
}
const filteredComparison = () => S.comparison.rows.filter(r => inRange(r.md, r.surveyTVD));
function rangeText(){
  if(!rangeActive()) return 'Full range';
  const f = v => v === null ? null : +toLen(v, S.units).toFixed(2);
  return `${S.range.by.toUpperCase()}: ${f(S.range.min) ?? 'start'} to ${f(S.range.max) ?? 'end'} ${U().len}`;
}
function applyRange(){
  const read = id => { const v = parseFloat($(id).value); return Number.isFinite(v) ? fromLen(v, S.units) : null; };
  const min = read('rangeMin'), max = read('rangeMax');
  if(min !== null && max !== null && min >= max) return toast('Min must be smaller than Max', 'error');
  S.range = { by:$('rangeBy').value, min, max };
  refresh(true);
}
function resetRangeInputs(){
  S.range = { by:'md', min:null, max:null };
  $('rangeMin').value = ''; $('rangeMax').value = ''; $('rangeBy').value = 'md';
}
function resetRange(){ resetRangeInputs(); refresh(true); }
function updateRangeIndicator(){
  const ind = $('rangeIndicator');
  ind.textContent = rangeText();
  ind.classList.toggle('active', rangeActive());
}

/* ===== SETTINGS ===== */
function onDetails(){
  S.wellName = $('wellName').value.trim();
  S.wellField = $('wellField').value.trim();
  S.preparedBy = $('preparedBy').value.trim();
}
function onDetailsChanged(){ onDetails(); clearTimeout(window._detailTimer); window._detailTimer = setTimeout(drawCharts, 250); }
function onVsAzimuth(value){
  const v = parseFloat(value);
  if(!Number.isFinite(v)){ $('vsAzimuth').value = S.vsAzimuth; return; }
  S.vsAzimuth = normAz(v);
  $('vsAzimuth').value = +S.vsAzimuth.toFixed(2);
  refresh(true);
}
/* Closure azimuth of the plan target (or of the survey when there is no plan). */
function autoVsAzimuth(){
  const r = S.wells.plan.results.length ? S.wells.plan.results : S.wells.survey.results;
  if(!r.length) return toast('Load a well first', 'error');
  onVsAzimuth(r[r.length-1].closureAzi.toFixed(2));
}
function setUnits(u){
  if(!UNITS[u]) return;
  S.units = u;
  try { localStorage.setItem('wpa-units', u); } catch(e){ /* storage may be unavailable */ }
  applyUnitLabels();
  WELL_KEYS.forEach(renderImportCard);
  renderFormationCards();
  const f = v => v === null ? '' : +toLen(v, u).toFixed(2);
  $('rangeMin').value = f(S.range.min); $('rangeMax').value = f(S.range.max);
  $('queryResults').innerHTML = '';
  refresh();
}
function applyUnitLabels(){
  document.querySelectorAll('.u-len').forEach(el => { el.textContent = U().len; });
  document.querySelectorAll('.unit-switch button').forEach(b => {
    const on = b.dataset.unit === S.units;
    b.classList.toggle('active', on); b.setAttribute('aria-pressed', on);
  });
}
function onViewToggle(key, value){ S.view[key] = value; resetZoom(); drawCharts(); }
