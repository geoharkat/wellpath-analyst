/* =============================================================
   WellPath Analyst — tables.js
   Plan / Survey station tables, summary cards, and the
   Survey vs Plan comparison table.
   ============================================================= */

function renderDataTables(){
  ['plan','survey'].forEach(type => {
    const div = document.getElementById(type+'DataTable');
    const count = document.getElementById(type+'Count');
    const r = S[type].results;
    count.textContent = '(' + r.length + ')';
    if(!r.length){ div.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:20px">No data</p>'; return; }
    let html = '<table><thead><tr><th>MD</th><th>Inc</th><th>Azi</th><th>TVD</th><th>N</th><th>E</th><th>VS</th><th>DLS</th><th>Closure</th></tr></thead><tbody>';
    r.forEach(row => {
      html += '<tr>'
            + '<td class="mono">' + row.md.toFixed(2) + '</td>'
            + '<td class="mono">' + row.inc.toFixed(2) + '</td>'
            + '<td class="mono">' + row.azi.toFixed(2) + '</td>'
            + '<td class="mono">' + row.tvd.toFixed(2) + '</td>'
            + '<td class="mono">' + row.north.toFixed(2) + '</td>'
            + '<td class="mono">' + row.east.toFixed(2) + '</td>'
            + '<td class="mono">' + row.vs.toFixed(2) + '</td>'
            + '<td class="mono">' + row.dls.toFixed(2) + '</td>'
            + '<td class="mono">' + row.closure.toFixed(2) + '</td>'
            + '</tr>';
    });
    html += '</tbody></table>';
    div.innerHTML = html;
  });
}

function renderComparison(){
  const cards = document.getElementById('summaryCards');
  if(!S.comparison.length){ cards.innerHTML = ''; return; }
  const maxCC = Math.max(...S.comparison.map(c => c.cc));
  const avgCC = S.comparison.reduce((s,c) => s + c.cc, 0) / S.comparison.length;
  const maxAB = Math.max(...S.comparison.map(c => Math.abs(c.aboveBelow)));
  const maxLR = Math.max(...S.comparison.map(c => Math.abs(c.leftRight)));
  const maxFB = Math.max(...S.comparison.map(c => Math.abs(c.frontBehind)));
  const endCC = S.comparison[S.comparison.length-1].cc;
  cards.innerHTML = [
    { val:maxCC.toFixed(2), label:'Max C-C (m)', color:'var(--danger)' },
    { val:avgCC.toFixed(2), label:'Avg C-C (m)', color:'var(--accent)' },
    { val:endCC.toFixed(2), label:'End C-C (m)', color:'var(--survey)' },
    { val:maxAB.toFixed(2), label:'Max A/B (m)', color:'var(--plan)' },
    { val:maxLR.toFixed(2), label:'Max L/R (m)', color:'var(--success)' },
    { val:maxFB.toFixed(2), label:'Max F/B (m)', color:'var(--info)' }
  ].map(c => '<div class="card stat-card"><div class="stat-val" style="color:'+c.color+'">'+c.val+'</div><div class="stat-label">'+c.label+'</div></div>').join('');

  const div = document.getElementById('comparisonTable');
  let html = '<table><thead><tr><th>MD</th><th>Plan TVD</th><th>Svy TVD</th><th>A/B</th><th>L/R</th><th>F/B</th><th>C-C</th><th>Pl Inc</th><th>Sv Inc</th><th>Svy DLS</th></tr></thead><tbody>';
  S.comparison.forEach(c => {
    html += '<tr>'
          + '<td class="mono">' + c.md.toFixed(1) + '</td>'
          + '<td class="mono">' + c.planTVD.toFixed(2) + '</td>'
          + '<td class="mono">' + c.surveyTVD.toFixed(2) + '</td>'
          + '<td class="mono">' + fmtDir(c.aboveBelow,'Above','Below') + '</td>'
          + '<td class="mono">' + fmtDir(c.leftRight,'Right','Left') + '</td>'
          + '<td class="mono">' + fmtDir(c.frontBehind,'Ahead','Behind') + '</td>'
          + '<td class="mono">' + c.cc.toFixed(2) + ' C-C</td>'
          + '<td class="mono">' + c.planInc.toFixed(1) + '</td>'
          + '<td class="mono">' + c.surveyInc.toFixed(1) + '</td>'
          + '<td class="mono">' + c.surveyDLS.toFixed(2) + '</td>'
          + '</tr>';
  });
  html += '</tbody></table>';
  div.innerHTML = html;
}
