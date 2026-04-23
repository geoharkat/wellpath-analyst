/* =============================================================
   WellPath Analyst — utils.js
   General helpers: toasts, escaping, formatting, tabs, modal.
   ============================================================= */

/* ===== TOASTS ===== */
function toast(msg, type='info') {
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  const icon = type==='success' ? 'check-circle' : (type==='error' ? 'exclamation-circle' : 'info-circle');
  el.innerHTML = '<i class="fas fa-' + icon + '" style="margin-right:8px"></i>' + msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>{
    el.style.opacity='0';
    el.style.transform='translateX(40px)';
    el.style.transition='all .3s';
    setTimeout(()=>el.remove(),300);
  }, 3500);
}

/* ===== TABS ===== */
function switchTab(name) {
  const tabs = ['import','data','comparison','query','formations'];
  document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active', tabs[i]===name));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  if(name==='comparison') setTimeout(()=>{ drawPlanView(); drawVS(); }, 100);
  if(name==='formations') renderFormationStats();
}

/* ===== ESCAPE ===== */
function esc(s){ return String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ===== DIRECTIONAL FORMAT ===== */
function fmtDir(val, posLabel, negLabel){
  if(Math.abs(val) < 0.005) return '0.00';
  return Math.abs(val).toFixed(2) + ' ' + (val > 0 ? posLabel : negLabel);
}

/* ===== TICK NUMBER FORMAT ===== */
function fmtTickNum(v){
  if(Math.abs(v) >= 1000) return (v/1000).toFixed(1) + 'k';
  if(Math.abs(v) >= 10)   return v.toFixed(0);
  return v.toFixed(1);
}

/* ===== NICE STEP for axis ticks ===== */
function niceStep(range, maxTicks){
  const rough = range / maxTicks;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const frac = rough / pow;
  let nice;
  if(frac <= 1.5) nice = 1;
  else if(frac <= 3) nice = 2;
  else if(frac <= 7) nice = 5;
  else nice = 10;
  return Math.max(nice * pow, 1e-10);
}

/* ===== CIRCULAR MEAN (for azimuths) ===== */
function circularMeanDeg(a1, a2){
  const r1 = a1 * Math.PI/180, r2 = a2 * Math.PI/180;
  const x = (Math.cos(r1) + Math.cos(r2))/2;
  const y = (Math.sin(r1) + Math.sin(r2))/2;
  let ang = Math.atan2(y, x) * 180/Math.PI;
  if(ang < 0) ang += 360;
  return ang;
}

/* ===== ABOUT MODAL ===== */
function openAbout(){  document.getElementById('aboutModal').classList.add('active'); }
function closeAbout(){ document.getElementById('aboutModal').classList.remove('active'); }
