/* =============================================================
   WellPath Analyst — pdf.js
   Landscape PDF report (jsPDF + AutoTable) with vector plots
   drawn by svg2pdf.
   ============================================================= */

/* The built-in PDF fonts only cover Windows-1252: transliterate anything else. */
const CP1252_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const SWAPS = { '→':'->', 'Ψ':'Psi', 'ψ':'psi', '−':'-', '∞':'infinite', '≥':'>=', '≤':'<=', '≈':'~' };
const pdfText = v => Array.from(String(v ?? '')).map(ch => {
  const c = ch.codePointAt(0);
  if(c === 10 || (c >= 32 && c <= 126) || (c >= 160 && c <= 255) || CP1252_EXTRA.includes(ch)) return ch;
  return SWAPS[ch] || '?';
}).join('');

async function buildPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4', compress:true });
  const W = 297, H = 210, M = 12, NAVY = [15, 23, 42], TEAL = [13, 148, 136], GREY = [100, 116, 139];
  const u = UNITS[S.units], date = todayText(), name = S.wellName || 'Unnamed well';
  const hasBoth = filteredComparison().length > 0;
  const title = hasBoth ? 'SURVEY VS PLAN REPORT' : `${WELL_LABELS[S.reference].toUpperCase()} REPORT`;
  const write = (str, x, y, o = {}) => {
    doc.setFont('helvetica', o.bold ? 'bold' : 'normal'); doc.setFontSize(o.size || 9);
    doc.setTextColor(...(o.color || NAVY)); doc.text(pdfText(str), x, y, o.align ? { align:o.align } : undefined);
  };
  const heading = (str, y, x = M) => { doc.setFillColor(...TEAL); doc.rect(x, y - 3.6, 1.4, 4.6, 'F'); write(str, x + 3.5, y, { bold:true, size:11 }); };
  const nf = v => typeof v === 'number' ? v.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }) : v;
  const baseStyles = { font:'helvetica', fontSize:7, cellPadding:1.15, textColor:NAVY, lineColor:[226, 232, 240], lineWidth:0.2, halign:'right' };
  const table = (head, body, opts = {}) => {
    doc.autoTable({
      head:[head.map(pdfText)], body:body.map(r => r.map(v => pdfText(nf(v)))), theme:'grid', margin:{ top:22, bottom:15, left:M, right:M },
      styles:baseStyles, headStyles:{ fillColor:NAVY, textColor:255, halign:'center', fontSize:7 },
      alternateRowStyles:{ fillColor:[248, 250, 252] }, columnStyles:{ 0:{ halign:'left' } }, ...opts });
    return doc.lastAutoTable.finalY;
  };
  const room = (y, need) => { if(y + need > H - 16){ doc.addPage(); return 25; } return y; };
  const chart = async (key, x, y, w, h) => {
    const PX = 3.6;                                            // SVG pixels per millimetre
    const r = offscreenChart(key, Math.round(w * PX), Math.round(h * PX), { font:'helvetica', text:pdfText });
    doc.setFont('helvetica', 'normal');
    try { await doc.svg(r.svg, { x, y, width:w, height:h }); }
    finally { r.remove(); }
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.25); doc.rect(x, y, w, h);
  };

  /* ---- 1. summary ---- */
  let y = 26;
  write(name, M, y + 2, { bold:true, size:20 });
  const facts = [['Field / project', S.wellField], ['Prepared by', S.preparedBy], ['Date', date]].filter(f => f[1]).map(f => `${f[0]}: ${f[1]}`).join('     |     ');
  write(facts, M, y + 9, { color:GREY });
  write(`Units: ${S.units === 'm' ? 'metric (m, deg/30m)' : 'field (ft, deg/100ft)'}     |     Survey method: minimum curvature     |     VS azimuth: ${S.vsAzimuth.toFixed(2)} deg     |     Depth range: ${rangeText()}`, M, y + 14, { color:GREY });
  y += 19;
  const tiles = summaryTiles(), tw = (W - 2 * M - 5 * 3) / 6;
  tiles.forEach((t, i) => {
    const x = M + i * (tw + 3);
    doc.setFillColor(240, 253, 250); doc.setDrawColor(153, 246, 228); doc.setLineWidth(0.25); doc.roundedRect(x, y, tw, 19, 1.5, 1.5, 'FD');
    write(t[0], x + 3, y + 5.5, { size:7.5, color:GREY });
    write(String(t[1]), x + 3, y + 12.5, { size:14, bold:true });
    write(t[2], x + 3, y + 16.7, { size:7, color:GREY });
  });
  y += 28;
  heading('Data sources', y);
  y = table(SOURCE_HEAD, sourceRows(), { startY:y + 3, styles:{ ...baseStyles, halign:'left' } }) + 8;
  y = room(y, 70);
  heading('Trajectory overview', y);
  const deviations = deviationRows();
  const leftWidth = deviations.length ? 160 : W - 2 * M;
  const startY = y + 3, page = doc.getNumberOfPages();
  y = table(['Metric', 'Plan', 'Survey'], overviewRows(), { startY, tableWidth:leftWidth, columnStyles:{ 0:{ halign:'left', fontStyle:'bold' } } });
  if(deviations.length){
    doc.setPage(page);
    heading('Deviation from plan', startY - 3, M + 168);
    table(['Item', 'Value', 'Unit'], deviations, { startY, margin:{ top:22, bottom:15, left:M + 168, right:M }, columnStyles:{ 0:{ halign:'left', fontStyle:'bold' }, 2:{ halign:'left' } } });
    y = Math.max(y, doc.lastAutoTable.finalY);
  }
  y += 7;
  const warnings = warningList();
  if(warnings.length){
    y = room(y, 10 + warnings.length * 4.5);
    write('Warnings', M, y, { bold:true, color:[194, 65, 12] });
    warnings.forEach(w => doc.splitTextToSize(pdfText('- ' + w), W - 2 * M).forEach(line => { y += 4.5; y = room(y, 4); write(line, M, y, { size:8 }); }));
  }

  /* ---- plots ---- */
  doc.addPage();
  heading('Plan view', 24); heading('Vertical section', 24, M + 139);
  await chart('plan', M, 28, 134, 165);
  await chart('section', M + 139, 28, 134, 165);
  doc.addPage();
  heading('3D well paths', 24); heading('Directional profiles', 24, M + 144);
  await chart('view3d', M, 28, 139, 165);
  await chart('profiles', M + 144, 28, 129, 165);
  if(hasBoth){
    doc.addPage();
    heading('Deviation from plan against measured depth', 24);
    await chart('deviation', M, 28, W - 2 * M, 165);
  }

  /* ---- formations ---- */
  if(S.formations.length){
    doc.addPage(); y = 25;
    heading('Formation tops', y);
    const f = formationTableData(resolvedFormations());
    y = table(f.head, f.body, { startY:y + 3 }) + 5;
    write('Each surface passes through the reference-well pick at the entered TVD with the given dip and dip azimuth.', M, y, { size:7.5, color:GREY });
    y = room(y + 10, 50);
    heading('Formation thickness', y);
    const t = thicknessTableData();
    y = table(t.head, t.body, { startY:y + 3, styles:{ ...baseStyles, fontSize:6.4 }, headStyles:{ fillColor:NAVY, textColor:255, halign:'center', fontSize:6.2 },
      columnStyles:{ 0:{ halign:'left', fontStyle:'bold' } } }) + 5;
    write('MT measured thickness | AVT apparent vertical thickness | TVT true vertical thickness | TST true stratigraphic thickness (uses the dip of the upper top) | Psi angle between well axis and bed normal', M, y, { size:7.5, color:GREY });
  }

  /* ---- comparison or station listing ---- */
  doc.addPage();
  const listing = hasBoth ? comparisonTableData(filteredComparison()) : stationTableData(S.reference);
  heading(listing.title, 25);
  y = table(listing.head, listing.body, { startY:28 }) + 8;
  y = room(y, 30);
  write('Disclaimer', M, y, { bold:true });
  doc.splitTextToSize(pdfText('This tool is provided "as is" for engineering and educational purposes. It has not been independently verified against a certified survey-management package. Cross-check results with your company-approved software before making decisions that affect well placement, anti-collision or target intersection.'), W - 2 * M)
    .forEach((line, i) => write(line, M, y + 5 + i * 4, { size:7.5, color:GREY }));
  write(`WellPath Analyst v${APP_VERSION}  |  (c) ${date.slice(0, 4)} Ismail Harkat  |  geoharkat@gmail.com  |  MIT License`, M, y + 18, { size:7.5, color:GREY });

  /* ---- header and footer on every page ---- */
  const pages = doc.getNumberOfPages();
  for(let p = 1; p <= pages; p++){
    doc.setPage(p);
    doc.setFillColor(...NAVY); doc.rect(0, 0, W, 14, 'F');
    doc.setFillColor(...TEAL); doc.rect(0, 14, W, 0.8, 'F');
    write(title, M, 9, { bold:true, size:10, color:[255, 255, 255] });
    write(`${name}   |   ${date}`, W - M, 9, { size:9, color:[203, 213, 225], align:'right' });
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.2); doc.line(M, H - 10, W - M, H - 10);
    write('WellPath Analyst - verify before operational use.', M, H - 6, { size:7, color:GREY });
    write(`Page ${p} of ${pages}`, W - M, H - 6, { size:7.5, color:GREY, align:'right' });
  }
  doc.setProperties({ title:pdfText(`WellPath Analyst report - ${name}`), creator:`WellPath Analyst v${APP_VERSION}`, author:pdfText(S.preparedBy) });
  return doc;
}

async function exportPDFReport(){
  if(!S.reference) return toast('Load a well first', 'error');
  const button = $('btnPdf');
  button.disabled = true; button.textContent = 'Building report…';
  try { (await buildPDF()).save(`WellPath_Report_${fileStem()}_${todayText()}.pdf`); }
  catch(err){ console.error(err); toast(`PDF export failed: ${err.message}`, 'error'); }
  finally { button.disabled = false; button.textContent = 'PDF report'; }
}
