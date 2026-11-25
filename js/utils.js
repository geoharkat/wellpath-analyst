/* =============================================================
   WellPath Analyst — utils.js
   DOM helpers, escaping, formatting, toasts, About dialog.
   ============================================================= */

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

const U = () => UNITS[S.units];
const fmtLen = (m, d = 2) => `${toLen(m, S.units).toFixed(d)} ${U().len}`;

/* Deviation written as magnitude + direction word, e.g. "2.34 Above". */
function fmtDir(val, posLabel, negLabel){
  if(Math.abs(val) < 0.005) return '0.00';
  return Math.abs(val).toFixed(2) + ' ' + (val > 0 ? posLabel : negLabel);
}

function toast(message, type = 'info'){
  const t = $('toast');
  t.textContent = message;
  t.className = 'toast show' + (type === 'error' ? ' error' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 4500);
}

function openAbout(){ const d = $('aboutDialog'); if(!d.open) d.showModal(); }
function closeAbout(){ $('aboutDialog').close(); }
