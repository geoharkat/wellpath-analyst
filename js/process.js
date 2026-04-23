/* =============================================================
   WellPath Analyst — process.js
   Orchestrates processing, comparison, range filter and manual
   station entry.
   ============================================================= */

/* ===== PROCESS DATA ===== */
function processData(){
  ['plan','survey'].forEach(type => {
    const mdCol  = parseInt(document.getElementById(type+'MD').value);
    const incCol = parseInt(document.getElementById(type+'Inc').value);
    const aziCol = parseInt(document.getElementById(type+'Azi').value);
    if(S[type].raw.length > 0){
      if(mdCol < 0 || incCol < 0 || aziCol < 0){ toast('Map all columns for ' + type, 'error'); return; }
      const stations = [];
      S[type].raw.forEach(row => {
        const md  = parseFloat(row[mdCol]);
        const inc = parseFloat(row[incCol]);
        const azi = parseFloat(row[aziCol]);
        if(!isNaN(md) && !isNaN(inc) && !isNaN(azi) && md >= 0) stations.push({ md, inc, azi });
      });
      stations.sort((a,b) => a.md - b.md);
      const unique = [stations[0]];
      for(let i=1; i<stations.length; i++){
        if(Math.abs(stations[i].md - unique[unique.length-1].md) > 0.001) unique.push(stations[i]);
      }
      S[type].stations = unique;
    }
  });
  S.vsAzimuth = parseFloat(document.getElementById('vsAzimuth').value) || 0;
  S.wellName  = document.getElementById('wellName').value.trim();
  S.wellField = document.getElementById('wellField').value.trim();
  if(S.plan.stations.length >= 2)   S.plan.results   = calcMC(S.plan.stations);
  if(S.survey.stations.length >= 2) S.survey.results = calcMC(S.survey.stations);
  if(!S.plan.results.length && !S.survey.results.length){ toast('No valid data.','error'); return; }
  calculateComparison();
  renderDataTables();
  renderComparison();
  renderFormationStats();
  plotZoom.planView = null; plotZoom.vsView = null;
  updateZoomButtons();
  setTimeout(() => { drawPlanView(); drawVS(); }, 200);

  const pC = S.plan.results.length, sC = S.survey.results.length;
  const badge = document.getElementById('statusBadge');
  const lbl = S.wellName ? (S.wellName + ' · ') : '';
  badge.innerHTML = '<i class="fas fa-check-circle" style="margin-right:4px"></i>' + lbl + 'Plan: ' + pC + ' | Survey: ' + sC;
  badge.className = 'badge badge-plan';
  toast('Processed. Plan: ' + pC + ', Survey: ' + sC, 'success');
}

/* ===== COMPARISON (Survey vs Plan) ===== */
function calculateComparison(){
  S.comparison = [];
  if(!S.survey.results.length || !S.plan.results.length) return;
  S.survey.results.forEach(sv => {
    const pl = interpAtMD(S.plan.results, sv.md);
    if(!pl) return;
    const dTVD = sv.tvd - pl.tvd;
    const dN = sv.north - pl.north;
    const dE = sv.east - pl.east;
    const planAziRad = pl.azi * Math.PI / 180;
    const fb = dN*Math.cos(planAziRad) + dE*Math.sin(planAziRad);
    const lr = -dN*Math.sin(planAziRad) + dE*Math.cos(planAziRad);
    const cc = Math.sqrt(dTVD*dTVD + dN*dN + dE*dE);
    S.comparison.push({
      md:sv.md, planTVD:pl.tvd, surveyTVD:sv.tvd,
      planN:pl.north, surveyN:sv.north, planE:pl.east, surveyE:sv.east,
      planVS:pl.vs, surveyVS:sv.vs,
      planInc:pl.inc, surveyInc:sv.inc,
      planAzi:pl.azi, surveyAzi:sv.azi,
      surveyDLS:sv.dls,
      aboveBelow:-dTVD, leftRight:lr, frontBehind:fb, cc
    });
  });
}

/* ===== RANGE FILTER ===== */
function applyRange(){
  const by = document.getElementById('rangeBy').value;
  const minV = document.getElementById('rangeMin').value;
  const maxV = document.getElementById('rangeMax').value;
  const min = minV === '' ? null : parseFloat(minV);
  const max = maxV === '' ? null : parseFloat(maxV);
  if(min !== null && max !== null && min >= max){ toast('Min must be < Max','error'); return; }
  S.displayRange = { by, min, max };
  updateRangeIndicator();
  plotZoom.planView = null; plotZoom.vsView = null;
  updateZoomButtons();
  drawPlanView(); drawVS();
  toast('Range filter applied','success');
}

function resetRange(){
  S.displayRange = { by:'md', min:null, max:null };
  document.getElementById('rangeMin').value = '';
  document.getElementById('rangeMax').value = '';
  document.getElementById('rangeBy').value  = 'md';
  updateRangeIndicator();
  plotZoom.planView = null; plotZoom.vsView = null;
  updateZoomButtons();
  drawPlanView(); drawVS();
  toast('Range reset','info');
}

function updateRangeIndicator(){
  const ind = document.getElementById('rangeIndicator');
  const { by, min, max } = S.displayRange;
  if(min === null && max === null){ ind.className = 'range-indicator empty'; ind.textContent = 'Full range'; }
  else { ind.className = 'range-indicator'; ind.textContent = by.toUpperCase() + ': ' + (min===null?'−∞':min) + '→' + (max===null?'+∞':max) + ' m'; }
}

/* Returns filtered Plan / Survey arrays plus an "active" flag */
function getDataBounds(){
  let planF = S.plan.results, svyF = S.survey.results, active = false;
  if(S.displayRange.min !== null || S.displayRange.max !== null){
    active = true;
    const { by, min, max } = S.displayRange;
    const filterFn = r => { const v = by==='tvd' ? r.tvd : r.md; return (min===null || v>=min) && (max===null || v<=max); };
    planF = planF.filter(filterFn);
    svyF = svyF.filter(filterFn);
  }
  return { planF, svyF, active };
}

/* ===== MANUAL STATION ===== */
function addManualStation(){
  const target = document.getElementById('addTarget').value;
  const md  = parseFloat(document.getElementById('addMD').value);
  const inc = parseFloat(document.getElementById('addInc').value);
  const azi = parseFloat(document.getElementById('addAzi').value);
  if(isNaN(md) || isNaN(inc) || isNaN(azi)){ toast('Enter valid MD, Inc, Azi','error'); return; }
  if(md < 0){ toast('MD must be >= 0','error'); return; }
  S[target].stations.push({ md, inc, azi });
  S[target].stations.sort((a,b) => a.md - b.md);
  S[target].results = calcMC(S[target].stations);
  calculateComparison();
  renderDataTables();
  renderComparison();
  renderFormationStats();
  setTimeout(() => { drawPlanView(); drawVS(); }, 100);
  document.getElementById('addMD').value = '';
  document.getElementById('addInc').value = '';
  document.getElementById('addAzi').value = '';
  toast('Station added to ' + target + ' at MD=' + md.toFixed(1) + 'm','success');
}
