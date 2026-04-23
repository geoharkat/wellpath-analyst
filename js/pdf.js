/* =============================================================
   WellPath Analyst — pdf.js
   Multi-page PDF report (jsPDF + AutoTable).

   Bug fix in this module
   ----------------------
   #1  Each plot must be on its own page.
       Before: Page 2 held both the Plan View and the Vertical
               Section stacked vertically, often squashing them.
       After:  Dedicated page per plot (landscape layout for
               each), sized to fill the page while keeping the
               canvas aspect ratio.
   ============================================================= */

function exportPDFReport(){
  if(!S.plan.results.length && !S.survey.results.length){
    toast('Process data first', 'error'); return;
  }
  if(typeof window.jspdf === 'undefined'){
    toast('PDF library failed to load', 'error'); return;
  }
  toast('Generating PDF...', 'info');

  // Make sure both canvases are freshly rendered before we snapshot them
  drawPlanView(); drawVS();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });

  // Portrait page metrics
  const pageW  = doc.internal.pageSize.getWidth();   // 210 mm
  const pageH  = doc.internal.pageSize.getHeight();  // 297 mm
  const margin = 14;
  const colW   = pageW - 2*margin;

  // ----- utilities -----
  function sectionHeader(y, title, opts){
    const w = (opts && opts.width) ? opts.width : colW;
    doc.setFillColor(232,160,0);
    doc.rect(margin, y, w, 6, 'F');
    doc.setTextColor(10,15,30);
    doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text(title.toUpperCase(), margin + 2, y + 4.1);
    doc.setTextColor(40,40,40);
    return y + 9;
  }
  function ensureSpace(y, need){
    if(y + need > pageH - margin){ doc.addPage(); return margin + 4; }
    return y;
  }

  /* ========== PAGE 1 — COVER + SUMMARY ========== */
  doc.setFillColor(232,160,0);
  doc.rect(0, 0, pageW, 16, 'F');
  doc.setTextColor(10,15,30);
  doc.setFont('helvetica','bold'); doc.setFontSize(16);
  doc.text('WellPath Analyst — Comparison Report', margin, 10);

  doc.setTextColor(40,40,40);
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  const wellName  = S.wellName  || '—';
  const wellField = S.wellField || '—';
  let y = 22;
  doc.text('Well: ' + wellName, margin, y);
  doc.text('Field: ' + wellField, margin + 70, y);
  y += 5;
  doc.text('Generated: ' + new Date().toLocaleString(), margin, y);
  doc.text('VS Ref Azi: ' + S.vsAzimuth.toFixed(2) + '°', margin + 70, y);
  y += 5;
  doc.text('Plan stations: ' + S.plan.results.length, margin, y);
  doc.text('Survey stations: ' + S.survey.results.length, margin + 70, y);
  y += 2;

  // Trajectory overview
  y = sectionHeader(y + 3, 'Trajectory Overview');
  const pStats = trajectoryStats(S.plan.results);
  const sStats = trajectoryStats(S.survey.results);

  const trajRows = [
    ['Metric', 'Plan', 'Survey'],
    ['Start MD (m)', pStats ? pStats.startMD.toFixed(2) : '—', sStats ? sStats.startMD.toFixed(2) : '—'],
    ['End MD (m)',   pStats ? pStats.endMD.toFixed(2) : '—',   sStats ? sStats.endMD.toFixed(2) : '—'],
    ['Final TVD (m)', pStats ? pStats.endTVD.toFixed(2) : '—', sStats ? sStats.endTVD.toFixed(2) : '—'],
    ['Final VS (m)',  pStats ? pStats.endVS.toFixed(2) : '—',  sStats ? sStats.endVS.toFixed(2) : '—'],
    ['Final Closure (m)', pStats ? pStats.endClosure.toFixed(2) : '—', sStats ? sStats.endClosure.toFixed(2) : '—'],
    ['Closure Azi (°)',   pStats ? pStats.endClosureAzi.toFixed(2) : '—', sStats ? sStats.endClosureAzi.toFixed(2) : '—'],
    ['Max Inc (°) @ MD',  pStats ? (pStats.maxInc.toFixed(2) + ' @ ' + pStats.maxIncMD.toFixed(1)) : '—',
                          sStats ? (sStats.maxInc.toFixed(2) + ' @ ' + sStats.maxIncMD.toFixed(1)) : '—'],
    ['Max DLS (°/30m) @ MD', pStats ? (pStats.maxDLS.toFixed(2) + ' @ ' + pStats.maxDLSMD.toFixed(1)) : '—',
                             sStats ? (sStats.maxDLS.toFixed(2) + ' @ ' + sStats.maxDLSMD.toFixed(1)) : '—'],
    ['Avg DLS (°/30m)', pStats ? pStats.avgDLS.toFixed(2) : '—', sStats ? sStats.avgDLS.toFixed(2) : '—'],
    ['Kick-off MD / TVD', pStats && pStats.kickoffMD !== null ? (pStats.kickoffMD.toFixed(1) + ' / ' + pStats.kickoffTVD.toFixed(1)) : '—',
                          sStats && sStats.kickoffMD !== null ? (sStats.kickoffMD.toFixed(1) + ' / ' + sStats.kickoffTVD.toFixed(1)) : '—'],
    ['Landing (85°) MD / TVD', pStats && pStats.landingMD !== null ? (pStats.landingMD.toFixed(1) + ' / ' + pStats.landingTVD.toFixed(1)) : '—',
                               sStats && sStats.landingMD !== null ? (sStats.landingMD.toFixed(1) + ' / ' + sStats.landingTVD.toFixed(1)) : '—']
  ];
  doc.autoTable({
    startY: y,
    head: [trajRows[0]],
    body: trajRows.slice(1),
    styles: { fontSize:8, cellPadding:1.8 },
    headStyles: { fillColor:[22,32,53], textColor:[232,160,0], fontStyle:'bold' },
    columnStyles: { 0:{ fontStyle:'bold', cellWidth: 60 } },
    margin: { left: margin, right: margin }
  });
  y = doc.lastAutoTable.finalY + 4;

  // Deviation summary (only when comparison is available)
  if(S.comparison.length){
    y = ensureSpace(y, 40);
    y = sectionHeader(y, 'Deviation Summary (Survey vs Plan)');
    const maxCC = Math.max(...S.comparison.map(c => c.cc));
    const avgCC = S.comparison.reduce((s, c) => s + c.cc, 0) / S.comparison.length;
    const maxAB = Math.max(...S.comparison.map(c => Math.abs(c.aboveBelow)));
    const maxLR = Math.max(...S.comparison.map(c => Math.abs(c.leftRight)));
    const maxFB = Math.max(...S.comparison.map(c => Math.abs(c.frontBehind)));
    const endCC = S.comparison[S.comparison.length - 1].cc;
    const devRows = [
      ['Max Centre-Centre (m)', maxCC.toFixed(2)],
      ['Avg Centre-Centre (m)', avgCC.toFixed(2)],
      ['End Centre-Centre (m)', endCC.toFixed(2)],
      ['Max Above/Below (m)',   maxAB.toFixed(2)],
      ['Max Left/Right (m)',    maxLR.toFixed(2)],
      ['Max Front/Behind (m)',  maxFB.toFixed(2)]
    ];
    doc.autoTable({
      startY: y,
      head: [['Metric','Value']],
      body: devRows,
      styles: { fontSize:8, cellPadding:1.8 },
      headStyles: { fillColor:[22,32,53], textColor:[232,160,0], fontStyle:'bold' },
      columnStyles: { 0:{ fontStyle:'bold', cellWidth: 80 } },
      margin: { left: margin, right: margin }
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  /* ========== PLOT PAGES — each plot on its own landscape page ========== */
  // Helper: add one landscape page that fills with a header + the canvas image
  function addPlotPage(canvasId, title){
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    let dataURL;
    try { dataURL = canvas.toDataURL('image/png'); } catch(e){ return; }

    // Landscape A4
    doc.addPage('a4', 'landscape');
    const pW = doc.internal.pageSize.getWidth();   // 297 mm
    const pH = doc.internal.pageSize.getHeight();  // 210 mm
    const m  = 12;
    const availW = pW - 2*m;
    const availH = pH - 2*m;

    // Header band (same look as portrait pages, but adjusted to landscape width)
    doc.setFillColor(232,160,0);
    doc.rect(m, m, availW, 6, 'F');
    doc.setTextColor(10,15,30);
    doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text(title.toUpperCase(), m + 2, m + 4.1);

    // Fit image under the header, keep aspect ratio
    const headerH = 6 + 3;                       // band + small gap
    const imgAreaW = availW;
    const imgAreaH = availH - headerH;
    const imgAspect = (canvas.height / canvas.width) || (560/700);
    let imgW = imgAreaW;
    let imgH = imgW * imgAspect;
    if(imgH > imgAreaH){
      imgH = imgAreaH;
      imgW = imgH / imgAspect;
    }
    const imgX = m + (imgAreaW - imgW)/2;
    const imgY = m + headerH;
    doc.addImage(dataURL, 'PNG', imgX, imgY, imgW, imgH);
  }

  addPlotPage('planViewCanvas', 'Plan View — North vs East');
  addPlotPage('vsCanvas',       'Vertical Section — VS vs TVD');

  /* ========== FORMATIONS PAGE ========== */
  if(S.formations.length){
    doc.addPage('a4', 'portrait');
    let yf = margin;
    yf = sectionHeader(yf, 'Formation Tops');
    const fmTopsRows = S.formations.map((fm, i) => {
      const strike = ((fm.dipAzi - 90) % 360 + 360) % 360;
      return [String(i+1), fm.name, fm.tvd.toFixed(2), fm.dip.toFixed(1), fm.dipAzi.toFixed(1), strike.toFixed(1)];
    });
    doc.autoTable({
      startY: yf,
      head: [['#','Name','TVD (m)','Dip (°)','Dip Azi (°)','Strike (°)']],
      body: fmTopsRows,
      styles: { fontSize:8, cellPadding:1.8 },
      headStyles: { fillColor:[22,32,53], textColor:[232,160,0], fontStyle:'bold' },
      margin: { left: margin, right: margin }
    });
    yf = doc.lastAutoTable.finalY + 5;

    // Formation thickness stats
    const fmStatsRows = [];
    for(let i=0; i<S.formations.length; i++){
      const fm = S.formations[i];
      const nextFm = i < S.formations.length - 1 ? S.formations[i+1] : null;
      if(!nextFm){
        fmStatsRows.push([fm.name, fm.tvd.toFixed(2), '—', fm.dip.toFixed(1), fm.dipAzi.toFixed(1),
                          '—','—','—','—','—','—']);
        continue;
      }
      const res = calcFormationThickness(fm.tvd, nextFm.tvd, fm.dip, fm.dipAzi);
      if(!res){
        fmStatsRows.push([fm.name, fm.tvd.toFixed(2), nextFm.tvd.toFixed(2), fm.dip.toFixed(1), fm.dipAzi.toFixed(1),
                          '—','—','—','—','—','—']);
        continue;
      }
      fmStatsRows.push([
        fm.name,
        fm.tvd.toFixed(2),
        nextFm.tvd.toFixed(2),
        fm.dip.toFixed(1),
        fm.dipAzi.toFixed(1),
        res.MT.toFixed(2),
        res.AVT.toFixed(2),
        isFinite(res.TVT) ? res.TVT.toFixed(2) : '∞',
        res.TST.toFixed(2),
        res.Psi.toFixed(1),
        res.dlsAvg.toFixed(2)
      ]);
    }
    yf = ensureSpace(yf, 30);
    yf = sectionHeader(yf, 'Formation Thickness Statistics');
    doc.setFont('helvetica','italic'); doc.setFontSize(7);
    // jsPDF standard fonts are Latin-1 only → use roman "Psi" for the Greek letter.
    const legendTxt = 'MT = Measured Thickness  |  AVT = Apparent Vertical Thickness  |  '
                    + 'TVT = True Vertical Thickness  |  TST = True Stratigraphic Thickness  |  '
                    + 'Psi = angle between well axis and formation normal';
    const legendLines = doc.splitTextToSize(legendTxt, colW);
    doc.text(legendLines, margin, yf);
    yf += legendLines.length * 3.2 + 1.5;
    doc.setFont('helvetica','normal');
    doc.autoTable({
      startY: yf,
      head: [['Formation','Top TVD','Bot TVD','Dip','Dip Azi','MT','AVT','TVT','TST','Psi (deg)','DLS avg']],
      body: fmStatsRows,
      styles: { fontSize:7, cellPadding:1.3 },
      headStyles: { fillColor:[22,32,53], textColor:[232,160,0], fontStyle:'bold', fontSize:7 },
      columnStyles: {
        0:{ fontStyle:'bold' },
        5:{ fillColor:[245,230,255] },
        6:{ fillColor:[245,230,255] },
        7:{ fillColor:[245,230,255] },
        8:{ fillColor:[245,230,255] }
      },
      margin: { left: margin, right: margin }
    });
  }

  /* ========== COMPARISON TABLE ========== */
  if(S.comparison.length){
    doc.addPage('a4', 'portrait');
    let yc = margin;
    yc = sectionHeader(yc, 'Survey vs Plan — Detailed Comparison');
    const tableBody = S.comparison.map(c => [
      c.md.toFixed(1),
      c.planTVD.toFixed(2),
      c.surveyTVD.toFixed(2),
      fmtDir(c.aboveBelow,'Above','Below'),
      fmtDir(c.leftRight,'Right','Left'),
      fmtDir(c.frontBehind,'Ahead','Behind'),
      c.cc.toFixed(2),
      c.planInc.toFixed(1),
      c.surveyInc.toFixed(1),
      c.surveyDLS.toFixed(2)
    ]);
    doc.autoTable({
      startY: yc,
      head: [['MD','Pl TVD','Sv TVD','A/B','L/R','F/B','C-C','Pl Inc','Sv Inc','DLS']],
      body: tableBody,
      styles: { fontSize:7, cellPadding:1.5 },
      headStyles: { fillColor:[22,32,53], textColor:[232,160,0], fontStyle:'bold', fontSize:7 },
      margin: { left: margin, right: margin }
    });
  }

  /* ========== FOOTERS (use per-page size so landscape pages work) ========== */
  const pageCount = doc.internal.getNumberOfPages();
  for(let p = 1; p <= pageCount; p++){
    doc.setPage(p);
    const pSz = doc.internal.pageSize;
    const pW = pSz.getWidth();
    const pH = pSz.getHeight();
    doc.setDrawColor(200,200,200); doc.setLineWidth(0.2);
    doc.line(margin, pH - 10, pW - margin, pH - 10);
    doc.setFont('helvetica','normal'); doc.setFontSize(7);
    doc.setTextColor(120,120,120);
    doc.text('WellPath Analyst  |  ' + (S.wellName || 'Unnamed well'), margin, pH - 6);
    doc.text('Page ' + p + ' / ' + pageCount, pW/2, pH - 6, { align:'center' });
    doc.text('(c) Ismail Harkat  |  geoharkat@gmail.com', pW - margin, pH - 6, { align:'right' });
  }

  const fname = 'WellPath_Report_' + (S.wellName ? S.wellName.replace(/\s+/g,'_') + '_' : '') + new Date().toISOString().slice(0,10) + '.pdf';
  doc.save(fname);
  toast('PDF saved: ' + fname, 'success');
}
