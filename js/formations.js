/* =============================================================
   WellPath Analyst — formations.js
   Formation top management (add / update / remove) and the
   thickness-statistics table (MT / AVT / TVT / TST / Ψ / DLS).
   ============================================================= */

/* ===== FORMATION TOPS (CRUD) ===== */
function addFormation(){
  const name   = document.getElementById('fmName').value.trim();
  const tvd    = parseFloat(document.getElementById('fmTVD').value);
  const dip    = parseFloat(document.getElementById('fmDip').value);
  const dipAzi = parseFloat(document.getElementById('fmDipAzi').value);
  if(!name){ toast('Enter a name','error'); return; }
  if(isNaN(tvd)){ toast('Enter valid TVD','error'); return; }
  if(isNaN(dip) || dip < 0 || dip > 90){ toast('Dip must be 0-90','error'); return; }
  if(isNaN(dipAzi) || dipAzi < 0 || dipAzi >= 360){ toast('Dip Azi must be 0-360','error'); return; }
  S.formations.push({ name, tvd, dip, dipAzi });
  S.formations.sort((a,b) => a.tvd - b.tvd);
  renderFormationTops();
  renderFormationStats();
  document.getElementById('fmName').value = '';
  document.getElementById('fmTVD').value = '';
  document.getElementById('fmDip').value = '0';
  document.getElementById('fmDipAzi').value = '0';
  setTimeout(() => drawVS(), 50);
  toast('Formation "' + name + '" added','success');
}

function removeFormation(idx){
  S.formations.splice(idx, 1);
  renderFormationTops();
  renderFormationStats();
  drawVS();
}

function updateFormation(idx, field, value){
  const v = parseFloat(value);
  if(isNaN(v)) return;
  if(field==='dip'    && (v < 0 || v > 90)){ toast('Dip 0-90','error'); renderFormationTops(); return; }
  if(field==='dipAzi' && (v < 0 || v >= 360)){ toast('Dip Azi 0-360','error'); renderFormationTops(); return; }
  if(field==='tvd')    S.formations[idx].tvd    = v;
  if(field==='dip')    S.formations[idx].dip    = v;
  if(field==='dipAzi') S.formations[idx].dipAzi = v;
  if(field==='tvd') S.formations.sort((a,b) => a.tvd - b.tvd);
  renderFormationTops();
  renderFormationStats();
  drawVS();   // bug #2: drawVS() is a no-op when vsCanvas isn't laid out
}

function renderFormationTops(){
  const div = document.getElementById('formationTopsTable');
  if(!S.formations.length){
    div.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:16px">No formation tops added</p>';
    return;
  }
  let html = '<table><thead><tr><th>#</th><th>Name</th><th>TVD (m)</th><th>Dip (°)</th><th>Dip Azi (°)</th><th>Strike (°)</th><th>Action</th></tr></thead><tbody>';
  S.formations.forEach((fm, i) => {
    const strike = ((fm.dipAzi - 90) % 360 + 360) % 360;
    html += '<tr>'
          + '<td class="mono" style="color:var(--muted)">' + (i+1) + '</td>'
          + '<td style="font-weight:600">' + esc(fm.name) + '</td>'
          + '<td><input type="number" class="mono" style="width:90px;padding:4px 8px;font-size:12px" value="'+fm.tvd.toFixed(2)+'" step="0.1" onchange="updateFormation('+i+',\'tvd\',this.value)"></td>'
          + '<td><input type="number" class="mono" style="width:70px;padding:4px 8px;font-size:12px" value="'+fm.dip.toFixed(1)+'" step="0.1" min="0" max="90" onchange="updateFormation('+i+',\'dip\',this.value)"></td>'
          + '<td><input type="number" class="mono" style="width:80px;padding:4px 8px;font-size:12px" value="'+fm.dipAzi.toFixed(1)+'" step="0.1" min="0" max="360" onchange="updateFormation('+i+',\'dipAzi\',this.value)"></td>'
          + '<td class="mono" style="color:var(--muted)">' + strike.toFixed(1) + '</td>'
          + '<td><button class="btn btn-danger btn-sm" onclick="removeFormation('+i+')"><i class="fas fa-trash-alt"></i></button></td>'
          + '</tr>';
  });
  html += '</tbody></table>';
  div.innerHTML = html;
}

/* ===== THICKNESS CALCULATION =====
   MT  = Measured thickness (along-hole)
   AVT = Apparent vertical thickness (ΔTVD)
   TVT = True vertical thickness (TST / cos(dip))
   TST = True stratigraphic thickness (∫ n·dr along trajectory)
   Ψ   = angle between well axis and formation normal
*/
function calcFormationThickness(topTVD, botTVD, dip, dipAzi){
  const source = S.survey.results.length > 1 ? S.survey.results : S.plan.results;
  if(source.length < 2) return null;
  const topRes = interpAtTVD(source, topTVD);
  const botRes = interpAtTVD(source, botTVD);
  if(!topRes || !botRes) return null;

  const MT  = botRes.md  - topRes.md;
  const AVT = botRes.tvd - topRes.tvd;

  const D = dip * Math.PI / 180;
  const B = dipAzi * Math.PI / 180;
  const nN = -Math.sin(D) * Math.cos(B);
  const nE = -Math.sin(D) * Math.sin(B);
  const nD =  Math.cos(D);

  // TST = ∫ n · dr along trajectory between interpolated top & bottom
  let TST = 0, prev = topRes;
  for(const st of source){
    if(st.md > topRes.md && st.md < botRes.md){
      TST += (st.north - prev.north)*nN + (st.east - prev.east)*nE + (st.tvd - prev.tvd)*nD;
      prev = st;
    }
  }
  TST += (botRes.north - prev.north)*nN + (botRes.east - prev.east)*nE + (botRes.tvd - prev.tvd)*nD;
  TST = Math.abs(TST);

  const TVT = dip < 89.99 ? TST / Math.cos(D) : Infinity;

  // Ψ — angle between well direction and formation normal
  const avgI = (topRes.inc + botRes.inc)/2 * Math.PI/180;
  const avgA = circularMeanDeg(topRes.azi, botRes.azi) * Math.PI/180;
  const wN = Math.sin(avgI) * Math.cos(avgA);
  const wE = Math.sin(avgI) * Math.sin(avgA);
  const wD = Math.cos(avgI);
  let cosPsi = wN*nN + wE*nE + wD*nD;
  cosPsi = Math.max(-1, Math.min(1, cosPsi));
  const Psi = Math.acos(Math.abs(cosPsi)) * 180 / Math.PI;

  // Average DLS across interval
  let dlsSum = 0, dlsCnt = 0;
  const mdRange = botRes.md - topRes.md;
  const steps = Math.min(20, Math.max(2, Math.floor(mdRange/10)));
  for(let s=0; s<=steps; s++){
    const smd = topRes.md + (mdRange * s / steps);
    const rr = interpAtMD(source, smd);
    if(rr && isFinite(rr.dls)){ dlsSum += rr.dls; dlsCnt++; }
  }
  const dlsAvg = dlsCnt > 0 ? dlsSum / dlsCnt : 0;

  return { topRes, botRes, MT, AVT, TVT, TST, Psi, dlsAvg,
           incTop:topRes.inc, incBot:botRes.inc,
           aziTop:topRes.azi, aziBot:botRes.azi,
           mdTop:topRes.md, mdBot:botRes.md };
}

function renderFormationStats(){
  const div = document.getElementById('formationStatsTable');
  if(!div) return;
  if(S.formations.length < 1 || (!S.plan.results.length && !S.survey.results.length)){
    div.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:16px">Add formation tops and process survey data first</p>';
    return;
  }
  let html = '<table style="font-size:11px"><thead><tr>'
           + '<th>Formation</th><th>Top TVD</th><th>Bot TVD</th><th>Dip</th><th>Dip Azi</th>'
           + '<th style="background:rgba(192,96,255,.15);color:var(--formation)">MT</th>'
           + '<th style="background:rgba(192,96,255,.15);color:var(--formation)">AVT</th>'
           + '<th style="background:rgba(192,96,255,.15);color:var(--formation)">TVT</th>'
           + '<th style="background:rgba(192,96,255,.15);color:var(--formation)">TST</th>'
           + '<th>Ψ (°)</th><th>DLS avg</th>'
           + '<th>MD@Top</th><th>MD@Bot</th><th>Inc@Top</th><th>Inc@Bot</th><th>Azi@Top</th><th>Azi@Bot</th>'
           + '</tr></thead><tbody>';
  for(let i=0; i<S.formations.length; i++){
    const fm = S.formations[i];
    const nextFm = i < S.formations.length - 1 ? S.formations[i+1] : null;
    html += '<tr>'
          + '<td style="font-weight:600;color:var(--accent)">' + esc(fm.name) + '</td>'
          + '<td class="mono">' + fm.tvd.toFixed(2) + '</td>'
          + '<td class="mono">' + (nextFm ? nextFm.tvd.toFixed(2) : '—') + '</td>'
          + '<td class="mono">' + fm.dip.toFixed(1) + '°</td>'
          + '<td class="mono">' + fm.dipAzi.toFixed(1) + '°</td>';
    if(!nextFm){
      html += '<td colspan="12" class="mono" style="color:var(--muted);font-style:italic">— last marker —</td></tr>';
      continue;
    }
    const res = calcFormationThickness(fm.tvd, nextFm.tvd, fm.dip, fm.dipAzi);
    if(!res){
      html += '<td colspan="12" class="mono" style="color:var(--muted)">No data</td></tr>';
      continue;
    }
    html += '<td class="mono" style="color:var(--formation);font-weight:600">' + res.MT.toFixed(2) + '</td>'
          + '<td class="mono" style="color:var(--formation);font-weight:600">' + res.AVT.toFixed(2) + '</td>'
          + '<td class="mono" style="color:var(--formation);font-weight:600">' + (isFinite(res.TVT) ? res.TVT.toFixed(2) : '∞') + '</td>'
          + '<td class="mono" style="color:var(--formation);font-weight:600">' + res.TST.toFixed(2) + '</td>'
          + '<td class="mono">' + res.Psi.toFixed(1) + '°</td>'
          + '<td class="mono">' + res.dlsAvg.toFixed(2) + '</td>'
          + '<td class="mono">' + res.mdTop.toFixed(2) + '</td>'
          + '<td class="mono">' + res.mdBot.toFixed(2) + '</td>'
          + '<td class="mono">' + res.incTop.toFixed(2) + '</td>'
          + '<td class="mono">' + res.incBot.toFixed(2) + '</td>'
          + '<td class="mono">' + res.aziTop.toFixed(2) + '</td>'
          + '<td class="mono">' + res.aziBot.toFixed(2) + '</td>'
          + '</tr>';
  }
  html += '</tbody></table>';
  div.innerHTML = html;
}
