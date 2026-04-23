/* =============================================================
   WellPath Analyst — query.js
   Point-query: given MD / TVD / VS, return interpolated survey
   and plan positions and their relative deviations.
   ============================================================= */

function runQuery(){
  const type = document.getElementById('queryType').value;
  const val  = parseFloat(document.getElementById('queryValue').value);
  const source = document.getElementById('querySource').value;
  if(isNaN(val)){ toast('Enter a numeric value','error'); return; }
  let planRes = null, svyRes = null;
  const label = type.toUpperCase();

  if(source==='both' || source==='plan'){
    if(!S.plan.results.length) toast('No plan data','error');
    else {
      if(type==='md')      planRes = interpAtMD(S.plan.results, val);
      else if(type==='tvd') planRes = interpAtTVD(S.plan.results, val);
      else if(type==='vs')  planRes = interpAtVS(S.plan.results, val);
      if(planRes && (type==='tvd' || type==='vs')) planRes = interpAtMD(S.plan.results, planRes.md);
    }
  }
  if(source==='both' || source==='survey'){
    if(!S.survey.results.length) toast('No survey data','error');
    else {
      if(type==='md')      svyRes = interpAtMD(S.survey.results, val);
      else if(type==='tvd') svyRes = interpAtTVD(S.survey.results, val);
      else if(type==='vs')  svyRes = interpAtVS(S.survey.results, val);
      if(svyRes && (type==='tvd' || type==='vs')) svyRes = interpAtMD(S.survey.results, svyRes.md);
    }
  }

  const div = document.getElementById('queryResults');
  let html = '';
  if(planRes){
    html += '<div class="card"><div class="section-title"><span class="badge badge-plan">PLAN</span> at '+label+' = '+val+'</div>';
    html += renderQueryResult(planRes);
    html += '</div>';
  }
  if(svyRes){
    html += '<div class="card"><div class="section-title"><span class="badge badge-survey">SURVEY</span> at '+label+' = '+val+'</div>';
    html += renderQueryResult(svyRes);
    html += '</div>';
  }
  if(planRes && svyRes){
    const dTVD = svyRes.tvd - planRes.tvd;
    const dN = svyRes.north - planRes.north;
    const dE = svyRes.east - planRes.east;
    const pAziRad = planRes.azi * Math.PI/180;
    const fb = dN*Math.cos(pAziRad) + dE*Math.sin(pAziRad);
    const lr = -dN*Math.sin(pAziRad) + dE*Math.cos(pAziRad);
    const cc = Math.sqrt(dTVD*dTVD + dN*dN + dE*dE);
    html += '<div class="card" style="border-color:var(--accent)"><div class="section-title"><i class="fas fa-exchange-alt" style="color:var(--accent)"></i> Differences</div><div class="query-result">';
    html += diffCard('Above/Below', -dTVD, 'Above', 'Below');
    html += diffCard('Left/Right', lr, 'Right', 'Left');
    html += diffCard('Front/Behind', fb, 'Ahead', 'Behind');
    html += diffCardAbs('C-C Distance', cc);
    html += '</div></div>';
  }
  if(!planRes && !svyRes) html = '<div class="card" style="text-align:center;color:var(--muted);padding:40px">No results found.</div>';
  div.innerHTML = html;
}

function renderQueryResult(r){
  const items = [
    { label:'MD',     val:r.md.toFixed(2),     unit:'m' },
    { label:'TVD',    val:r.tvd.toFixed(2),    unit:'m' },
    { label:'Inc',    val:r.inc.toFixed(2),    unit:'deg' },
    { label:'Azi',    val:r.azi.toFixed(2),    unit:'deg' },
    { label:'North',  val:r.north.toFixed(2),  unit:'m' },
    { label:'East',   val:r.east.toFixed(2),   unit:'m' },
    { label:'VS',     val:r.vs.toFixed(2),     unit:'m' },
    { label:'DLS',    val:r.dls.toFixed(2),    unit:'deg/30m' },
    { label:'Closure',val:r.closure.toFixed(2),unit:'m' }
  ];
  return '<div class="query-result">'
    + items.map(i => '<div class="query-item"><div class="q-label">'+i.label+'</div><div class="q-val">'+i.val+' <span style="font-size:10px;color:var(--muted);font-weight:400">'+i.unit+'</span></div></div>').join('')
    + '</div>';
}

function diffCard(l, v, p, n){
  const d = Math.abs(v) < 0.005 ? '—' : (v > 0 ? p : n);
  return '<div class="query-item"><div class="q-label">'+l+'</div><div class="q-val">'+Math.abs(v).toFixed(2)+' <span style="font-size:11px;color:var(--muted);font-weight:600">'+d+'</span></div></div>';
}
function diffCardAbs(l, v){
  return '<div class="query-item"><div class="q-label">'+l+'</div><div class="q-val">'+v.toFixed(2)+' <span style="font-size:10px;color:var(--muted)">m</span></div></div>';
}
