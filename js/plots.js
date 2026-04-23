/* =============================================================
   WellPath Analyst — plots.js
   High-DPI canvas rendering for Plan View and Vertical Section,
   plus shared plot chrome (legend, compass, range banner) and
   PNG export.

   Bug fixes addressed in this module
   ----------------------------------
   #2  vsCanvas resized when editing Formation Tops
       Cause:  drawVS() was being called while the VS canvas was
               on a hidden tab; getBoundingClientRect() returns 0,
               and the previous fallback (HTML width/height attrs)
               then locked canvas.style.width to "700px", breaking
               the responsive CSS width:100%.
       Fix:    drawPlanView() and drawVS() now abort early when
               the canvas has no layout size. The tab switch
               handler in utils.js already redraws on tab entry,
               so nothing visible is lost.

   #3  Formation names need to sit ABOVE each dipping line, not in
       a right-edge pill.
       Fix:    The pill is kept on the right edge (TVD readout),
               but the formation NAME is now drawn as a rotated
               label riding on top of the line itself, inside the
               plot rectangle, clipped with Liang–Barsky so it is
               always visible and flipped when it would otherwise
               render upside-down.
   ============================================================= */

/* ===== HIGH-DPI CANVAS SETUP =====
   Backing store is scaled by devicePixelRatio so lines stay crisp
   on retina/HiDPI screens; drawing code remains in CSS pixels. */
function setupHiDPICanvas(canvas, cssW, cssH){
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const needW = Math.round(cssW * dpr);
  const needH = Math.round(cssH * dpr);
  if(canvas.width !== needW || canvas.height !== needH){
    canvas.width = needW;
    canvas.height = needH;
  }
  // NOTE (bug #2): we intentionally do NOT set canvas.style.width/height here.
  // The CSS already sets width:100% and height:auto; forcing pixel sizes
  // here would override the responsive layout the first time a draw
  // happens on a freshly-visible tab.
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  return { ctx, W: cssW, H: cssH };
}

/* Read the live CSS size of a canvas. Returns null when the canvas
   is not currently laid out (e.g. sits on a hidden tab). */
function getCanvasCssSize(canvas){
  const rect = canvas.getBoundingClientRect();
  if(rect.width < 10 || rect.height < 10) return null;
  return { w: rect.width, h: rect.height };
}

/* ===== PUBLIC DRAW ENTRY POINTS ===== */
function drawPlanView(){
  const canvas = document.getElementById('planViewCanvas');
  const size = getCanvasCssSize(canvas);
  if(!size) return;                 // bug #2: skip when canvas is not visible
  const { ctx, W, H } = setupHiDPICanvas(canvas, size.w, size.h);
  drawPlanViewToCtx(ctx, W, H);
}

function drawVS(){
  const canvas = document.getElementById('vsCanvas');
  const size = getCanvasCssSize(canvas);
  if(!size) return;                 // bug #2: skip when canvas is not visible
  const { ctx, W, H } = setupHiDPICanvas(canvas, size.w, size.h);
  drawVSToCtx(ctx, W, H);
}

/* ===== PLAN VIEW DRAW ===== */
function drawPlanViewToCtx(ctx, W, H){
  ctx.clearRect(0, 0, W, H);
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0d1526');
  bgGrad.addColorStop(1, '#0a111f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const { planF, svyF, active } = getDataBounds();
  const padL = 72, padR = 28, padT = 42, padB = 54;
  const allN = [...planF.map(r => r.north), ...svyF.map(r => r.north)];
  const allE = [...planF.map(r => r.east),  ...svyF.map(r => r.east)];

  if(allN.length < 2){
    ctx.fillStyle = '#6b7fa0'; ctx.font = '13px DM Sans'; ctx.textAlign = 'center';
    ctx.fillText('Insufficient data', W/2, H/2);
    return;
  }
  if(!active){ allN.push(0); allE.push(0); }

  let minN, maxN, minE, maxE;
  if(plotZoom.planView){
    ({ eMin:minE, eMax:maxE, nMin:minN, nMax:maxN } = plotZoom.planView);
  } else {
    minN = Math.min(...allN); maxN = Math.max(...allN);
    minE = Math.min(...allE); maxE = Math.max(...allE);
    const rangeN = Math.max(maxN - minN, 10);
    const rangeE = Math.max(maxE - minE, 10);
    const maxRange = Math.max(rangeN, rangeE) * 1.08;
    const cnN = (minN + maxN)/2, cnE = (minE + maxE)/2;
    minN = cnN - maxRange/2; maxN = cnN + maxRange/2;
    minE = cnE - maxRange/2; maxE = cnE + maxRange/2;
  }

  const dW = W - padL - padR, dH = H - padT - padB;
  lastDrawn.planView = { padL, padR, padT, padB, W, H, dW, dH, minN, maxN, minE, maxE };

  const tx = e => padL + (e - minE)/(maxE - minE) * dW;
  const ty = n => H - padB - (n - minN)/(maxN - minN) * dH;

  drawPlotTitle(ctx, W, 'Plan View', 'E/W vs N/S' + (S.wellName ? ' — ' + S.wellName : ''));
  ctx.strokeStyle = '#2a3a5f'; ctx.lineWidth = 1;
  ctx.strokeRect(padL, padT, dW, dH);

  const maxTicksX = Math.max(4, Math.min(10, Math.floor(dW/70)));
  const maxTicksY = Math.max(4, Math.min(10, Math.floor(dH/45)));
  const stepE = niceStep(maxE - minE, maxTicksX);
  const stepN = niceStep(maxN - minN, maxTicksY);

  // Minor grid
  ctx.strokeStyle = 'rgba(30,45,74,0.5)'; ctx.lineWidth = 0.5;
  for(let v = Math.ceil(minN/(stepN/2))*(stepN/2); v <= maxN; v += stepN/2){
    ctx.beginPath(); ctx.moveTo(padL, ty(v)); ctx.lineTo(W - padR, ty(v)); ctx.stroke();
  }
  for(let v = Math.ceil(minE/(stepE/2))*(stepE/2); v <= maxE; v += stepE/2){
    ctx.beginPath(); ctx.moveTo(tx(v), padT); ctx.lineTo(tx(v), H - padB); ctx.stroke();
  }

  // Major grid
  ctx.strokeStyle = '#26355a'; ctx.lineWidth = 1;
  for(let v = Math.ceil(minN/stepN)*stepN; v <= maxN; v += stepN){
    ctx.beginPath(); ctx.moveTo(padL, ty(v)); ctx.lineTo(W - padR, ty(v)); ctx.stroke();
  }
  for(let v = Math.ceil(minE/stepE)*stepE; v <= maxE; v += stepE){
    ctx.beginPath(); ctx.moveTo(tx(v), padT); ctx.lineTo(tx(v), H - padB); ctx.stroke();
  }

  // Axes through origin
  if(0 >= minE && 0 <= maxE){
    ctx.strokeStyle = 'rgba(192,96,255,0.35)'; ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(tx(0), padT); ctx.lineTo(tx(0), H - padB); ctx.stroke();
    ctx.setLineDash([]);
  }
  if(0 >= minN && 0 <= maxN){
    ctx.strokeStyle = 'rgba(192,96,255,0.35)'; ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(padL, ty(0)); ctx.lineTo(W - padR, ty(0)); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Tick labels
  ctx.fillStyle = '#9aacc8'; ctx.font = '10px JetBrains Mono';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for(let v = Math.ceil(minE/stepE)*stepE; v <= maxE; v += stepE){
    ctx.fillText(fmtTickNum(v), tx(v), H - padB + 6);
    ctx.strokeStyle = '#3a4c74'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tx(v), H - padB); ctx.lineTo(tx(v), H - padB + 3); ctx.stroke();
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for(let v = Math.ceil(minN/stepN)*stepN; v <= maxN; v += stepN){
    ctx.fillText(fmtTickNum(v), padL - 7, ty(v));
    ctx.beginPath(); ctx.moveTo(padL - 3, ty(v)); ctx.lineTo(padL, ty(v)); ctx.stroke();
  }

  // Axis labels
  ctx.fillStyle = '#4ea8ff'; ctx.font = 'bold 11px DM Sans';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('East (m)', padL + dW/2, H - 12);
  ctx.save(); ctx.translate(18, padT + dH/2); ctx.rotate(-Math.PI/2);
  ctx.fillStyle = '#10d4a0'; ctx.textBaseline = 'top';
  ctx.fillText('North (m)', 0, 0);
  ctx.restore();

  drawCompass(ctx, W - padR - 28, padT + 28, 18);

  // Trajectories
  ctx.save(); ctx.beginPath(); ctx.rect(padL, padT, dW, dH); ctx.clip();
  if(S.plan.results.length > 1){
    ctx.shadowColor = 'rgba(62,159,255,0.35)'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.strokeStyle = '#3e9fff';
    ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    S.plan.results.forEach((r, i) => {
      i === 0 ? ctx.moveTo(tx(r.east), ty(r.north)) : ctx.lineTo(tx(r.east), ty(r.north));
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
    S.plan.results.forEach(r => {
      if(r.east >= minE && r.east <= maxE && r.north >= minN && r.north <= maxN) drawMarker(ctx, tx(r.east), ty(r.north), '#3e9fff', 3.2);
    });
  }
  if(S.survey.results.length > 1){
    ctx.shadowColor = 'rgba(232,160,0,0.4)'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.strokeStyle = '#e8a000';
    ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    S.survey.results.forEach((r, i) => {
      i === 0 ? ctx.moveTo(tx(r.east), ty(r.north)) : ctx.lineTo(tx(r.east), ty(r.north));
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
    S.survey.results.forEach(r => {
      if(r.east >= minE && r.east <= maxE && r.north >= minN && r.north <= maxN) drawMarker(ctx, tx(r.east), ty(r.north), '#e8a000', 3.2);
    });
  }
  ctx.restore();

  drawLegend(ctx, padL + 10, padT + 10, [
    { color:'#3e9fff', label:'Plan' },
    { color:'#e8a000', label:'Survey' }
  ]);

  if(active || plotZoom.planView) drawRangeBanner(ctx, W - padR - 10, H - padB - 10, S.displayRange);
}

/* ===== VS (Vertical Section) DRAW ===== */
function drawVSToCtx(ctx, W, H){
  ctx.clearRect(0, 0, W, H);
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0d1526');
  bgGrad.addColorStop(1, '#0a111f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const { planF, svyF, active } = getDataBounds();
  const padL = 72, padR = 90, padT = 42, padB = 54;
  const allTVD = [...planF.map(r => r.tvd), ...svyF.map(r => r.tvd)];
  const allVS  = [...planF.map(r => r.vs),  ...svyF.map(r => r.vs)];

  if(allTVD.length < 2){
    ctx.fillStyle = '#6b7fa0'; ctx.font = '13px DM Sans'; ctx.textAlign = 'center';
    ctx.fillText('Insufficient data', W/2, H/2);
    return;
  }
  if(!active){ allTVD.push(0); allVS.push(0); }

  let minTVD, maxTVD, minVS, maxVS;
  if(plotZoom.vsView){
    ({ vsMin:minVS, vsMax:maxVS, tvdMin:minTVD, tvdMax:maxTVD } = plotZoom.vsView);
  } else {
    minTVD = Math.min(...allTVD); maxTVD = Math.max(...allTVD);
    minVS  = Math.min(...allVS);  maxVS  = Math.max(...allVS);
    S.formations.forEach(fm => {
      if(fm.tvd >= minTVD - 50 && fm.tvd <= maxTVD + 50){
        if(fm.tvd < minTVD) minTVD = fm.tvd;
        if(fm.tvd > maxTVD) maxTVD = fm.tvd;
      }
    });
    const rangeTVD = Math.max(maxTVD - minTVD, 10);
    const rangeVS  = Math.max(maxVS  - minVS,  10);
    minTVD -= rangeTVD*0.03; maxTVD += rangeTVD*0.03;
    minVS  -= rangeVS*0.03;  maxVS  += rangeVS*0.03;
  }

  const dW = W - padL - padR, dH = H - padT - padB;
  lastDrawn.vsView = { padL, padR, padT, padB, W, H, dW, dH, minTVD, maxTVD, minVS, maxVS };

  const tx = vs  => padL + (vs  - minVS) /(maxVS  - minVS)  * dW;
  const ty = tvd => padT + (tvd - minTVD)/(maxTVD - minTVD) * dH;

  /* ------- FORMATION LINE PARAMETERS -------
     For each formation compute the slope (dVS/dTVD) of its
     intersection with the VS plane. Bands fill as dipping
     parallelograms and lines draw as true dipping traces. */
  const sortedFms = [...S.formations].sort((a,b) => a.tvd - b.tvd);
  const vsRad = S.vsAzimuth * Math.PI / 180;
  const source = S.survey.results.length > 1 ? S.survey.results : S.plan.results;

  const formationLines = sortedFms.map(fm => {
    const obj = { fm, fmRes:null, slope:NaN, tvd0:fm.tvd, vs0:0, Psi:0 };
    if(source.length < 2) return obj;
    const fmRes = interpAtTVD(source, fm.tvd);
    if(!fmRes || isNaN(fmRes.vs)) return obj;

    const incRad = fmRes.inc * Math.PI / 180;
    const aziRad = fmRes.azi * Math.PI / 180;
    const wN = Math.sin(incRad) * Math.cos(aziRad);
    const wE = Math.sin(incRad) * Math.sin(aziRad);
    const wD = Math.cos(incRad);

    const D = fm.dip    * Math.PI / 180;
    const B = fm.dipAzi * Math.PI / 180;
    const nN = -Math.sin(D) * Math.cos(B);
    const nE = -Math.sin(D) * Math.sin(B);
    const nD =  Math.cos(D);

    let cosPsi = wN*nN + wE*nE + wD*nD;
    cosPsi = Math.max(-1, Math.min(1, cosPsi));
    const Psi = Math.acos(Math.abs(cosPsi));

    const wVS  = Math.sin(incRad) * Math.cos(aziRad - vsRad);
    const wTVD = Math.cos(incRad);
    const thetaW = Math.atan2(wVS, wTVD);
    const opt1 = thetaW + (Math.PI/2 - Psi);
    const opt2 = thetaW - (Math.PI/2 - Psi);

    const nVS = nN * Math.cos(vsRad) + nE * Math.sin(vsRad);
    const thetaP = Math.atan2(nVS, nD);
    const target1 = thetaP + Math.PI/2;
    const target2 = thetaP - Math.PI/2;

    function normAngle(a){ return ((a + 3*Math.PI) % (2*Math.PI)) - Math.PI; }
    const d1 = Math.min(Math.abs(normAngle(opt1 - target1)), Math.abs(normAngle(opt1 - target2)));
    const d2 = Math.min(Math.abs(normAngle(opt2 - target1)), Math.abs(normAngle(opt2 - target2)));
    const thetaF = d1 < d2 ? opt1 : opt2;

    obj.fmRes = fmRes;
    obj.slope = Math.tan(thetaF);   // dVS / dTVD
    obj.vs0   = fmRes.vs;
    obj.Psi   = Psi;
    return obj;
  });

  function tvdOnFmLine(line, vs){
    if(!line || !line.fmRes) return line ? line.tvd0 : 0;
    if(!isFinite(line.slope)) return line.tvd0;
    if(Math.abs(line.slope) < 1e-9) return line.tvd0;
    return line.tvd0 + (vs - line.vs0) / line.slope;
  }

  /* ------- DIPPING COLOR BANDS ------- */
  if(formationLines.length >= 1){
    ctx.save(); ctx.beginPath(); ctx.rect(padL, padT, dW, dH); ctx.clip();
    const vsPad = Math.max(maxVS - minVS, 10);
    const vsL = minVS - vsPad, vsR = maxVS + vsPad;
    const tvdFar = maxTVD + (maxTVD - minTVD);
    for(let i = 0; i < formationLines.length; i++){
      const topLine = formationLines[i];
      const botLine = (i < formationLines.length - 1) ? formationLines[i+1] : null;
      const tvdTL = tvdOnFmLine(topLine, vsL);
      const tvdTR = tvdOnFmLine(topLine, vsR);
      const tvdBL = botLine ? tvdOnFmLine(botLine, vsL) : tvdFar;
      const tvdBR = botLine ? tvdOnFmLine(botLine, vsR) : tvdFar;
      ctx.fillStyle = FM_BAND_COLORS[i % FM_BAND_COLORS.length];
      ctx.beginPath();
      ctx.moveTo(tx(vsL), ty(tvdTL));
      ctx.lineTo(tx(vsR), ty(tvdTR));
      ctx.lineTo(tx(vsR), ty(tvdBR));
      ctx.lineTo(tx(vsL), ty(tvdBL));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawPlotTitle(ctx, W, 'Vertical Section', 'VS (m) @ ref azi ' + S.vsAzimuth.toFixed(1) + '°' + (S.wellName ? ' — ' + S.wellName : ''));
  ctx.strokeStyle = '#2a3a5f'; ctx.lineWidth = 1;
  ctx.strokeRect(padL, padT, dW, dH);

  const maxTicksX = Math.max(4, Math.min(10, Math.floor(dW/70)));
  const maxTicksY = Math.max(4, Math.min(10, Math.floor(dH/45)));
  const stepVS  = niceStep(maxVS  - minVS,  maxTicksX);
  const stepTVD = niceStep(maxTVD - minTVD, maxTicksY);

  // Minor grid
  ctx.strokeStyle = 'rgba(30,45,74,0.5)'; ctx.lineWidth = 0.5;
  for(let v = Math.ceil(minTVD/(stepTVD/2))*(stepTVD/2); v <= maxTVD; v += stepTVD/2){
    ctx.beginPath(); ctx.moveTo(padL, ty(v)); ctx.lineTo(W - padR, ty(v)); ctx.stroke();
  }
  for(let v = Math.ceil(minVS/(stepVS/2))*(stepVS/2); v <= maxVS; v += stepVS/2){
    ctx.beginPath(); ctx.moveTo(tx(v), padT); ctx.lineTo(tx(v), H - padB); ctx.stroke();
  }

  // Major grid
  ctx.strokeStyle = '#26355a'; ctx.lineWidth = 1;
  for(let v = Math.ceil(minTVD/stepTVD)*stepTVD; v <= maxTVD; v += stepTVD){
    ctx.beginPath(); ctx.moveTo(padL, ty(v)); ctx.lineTo(W - padR, ty(v)); ctx.stroke();
  }
  for(let v = Math.ceil(minVS/stepVS)*stepVS; v <= maxVS; v += stepVS){
    ctx.beginPath(); ctx.moveTo(tx(v), padT); ctx.lineTo(tx(v), H - padB); ctx.stroke();
  }

  // Tick labels
  ctx.fillStyle = '#9aacc8'; ctx.font = '10px JetBrains Mono';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for(let v = Math.ceil(minVS/stepVS)*stepVS; v <= maxVS; v += stepVS){
    ctx.fillText(fmtTickNum(v), tx(v), H - padB + 6);
    ctx.strokeStyle = '#3a4c74'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tx(v), H - padB); ctx.lineTo(tx(v), H - padB + 3); ctx.stroke();
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for(let v = Math.ceil(minTVD/stepTVD)*stepTVD; v <= maxTVD; v += stepTVD){
    ctx.fillText(fmtTickNum(v), padL - 7, ty(v));
    ctx.beginPath(); ctx.moveTo(padL - 3, ty(v)); ctx.lineTo(padL, ty(v)); ctx.stroke();
  }
  // Right-side TVD axis
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for(let v = Math.ceil(minTVD/stepTVD)*stepTVD; v <= maxTVD; v += stepTVD){
    ctx.fillText(fmtTickNum(v), W - padR + 6, ty(v));
    ctx.beginPath(); ctx.moveTo(W - padR, ty(v)); ctx.lineTo(W - padR + 3, ty(v)); ctx.stroke();
  }

  // Axis labels
  ctx.fillStyle = '#4ea8ff'; ctx.font = 'bold 11px DM Sans';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('VS (m)', padL + dW/2, H - 12);
  ctx.save(); ctx.translate(18, padT + dH/2); ctx.rotate(-Math.PI/2);
  ctx.fillStyle = '#10d4a0'; ctx.textBaseline = 'top';
  ctx.fillText('TVD (m)', 0, 0);
  ctx.restore();

  /* ------- FORMATION DIP LINES + LABELS (bug #3 fix) ------- */
  const visibleFms = sortedFms.filter(fm => fm.tvd >= minTVD && fm.tvd <= maxTVD);

  if(visibleFms.length && source.length > 1){
    visibleFms.forEach((fm, fmIdx) => {
      const line = formationLines.find(L => L.fm === fm);
      if(!line || !line.fmRes) return;
      const fmRes = line.fmRes;
      const Psi = line.Psi;
      const formationSlope = line.slope;

      const lineLen = 5000;
      let p1_vs, p1_tvd, p2_vs, p2_tvd;
      if(!isFinite(formationSlope)){
        p1_vs = fmRes.vs - lineLen; p1_tvd = fmRes.tvd;
        p2_vs = fmRes.vs + lineLen; p2_tvd = fmRes.tvd;
      } else {
        const norm = Math.sqrt(1 + formationSlope*formationSlope);
        p1_vs  = fmRes.vs  - lineLen * formationSlope / norm;
        p1_tvd = fmRes.tvd - lineLen / norm;
        p2_vs  = fmRes.vs  + lineLen * formationSlope / norm;
        p2_tvd = fmRes.tvd + lineLen / norm;
      }

      /* Draw the line + name inside a clip so nothing leaks into padding */
      ctx.save(); ctx.beginPath(); ctx.rect(padL, padT, dW, dH); ctx.clip();

      // Faint horizontal reference at the formation TVD
      ctx.strokeStyle = 'rgba(240,68,68,0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, ty(fm.tvd));
      ctx.lineTo(W - padR, ty(fm.tvd));
      ctx.stroke();
      ctx.setLineDash([]);

      // The true dipping formation line
      ctx.strokeStyle = 'rgba(240,68,68,0.78)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(tx(p1_vs), ty(p1_tvd));
      ctx.lineTo(tx(p2_vs), ty(p2_tvd));
      ctx.stroke();
      ctx.setLineDash([]);

      /* ---- Formation NAME above the line (bug #3) ----
         Clip the line to the plot rectangle with Liang–Barsky,
         then place the name at 25% along the visible segment,
         rotated to match the line's screen angle and offset
         perpendicular-up by 7 px so it rides above the dashes. */
      const sx1 = tx(p1_vs), sy1 = ty(p1_tvd);
      const sx2 = tx(p2_vs), sy2 = ty(p2_tvd);
      const clipped = clipSegmentToRect(sx1, sy1, sx2, sy2, padL, padT, padL + dW, padT + dH);
      if(clipped){
        const [cx1, cy1, cx2, cy2] = clipped;
        let ang = Math.atan2(cy2 - cy1, cx2 - cx1);
        // keep text readable: flip if upside-down
        if(ang >  Math.PI/2) ang -= Math.PI;
        if(ang < -Math.PI/2) ang += Math.PI;
        // anchor 25% along visible segment
        const t = 0.25;
        const ax = cx1 + (cx2 - cx1) * t;
        const ay = cy1 + (cy2 - cy1) * t;
        // perpendicular "up" offset (negative normal of line vector)
        const offset = 7;
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        // ensure "up" points toward lower Y on screen
        const ox = nx * offset * (ny < 0 ? 1 : -1);
        const oy = ny * offset * (ny < 0 ? 1 : -1);
        const label = fm.name + '  (Ψ ' + (Psi * 180/Math.PI).toFixed(1) + '°)';

        ctx.save();
        ctx.translate(ax + ox, ay + oy);
        ctx.rotate(ang);
        ctx.font = 'bold 10.5px DM Sans';
        const tw = ctx.measureText(label).width;
        const pad = 5, bh = 14;
        // translucent dark pill so text is readable against color bands
        ctx.fillStyle = 'rgba(10,15,30,0.78)';
        ctx.strokeStyle = 'rgba(240,68,68,0.55)';
        ctx.lineWidth = 0.8;
        if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(-tw/2 - pad, -bh/2, tw + 2*pad, bh, 3); ctx.fill(); ctx.stroke(); }
        else { ctx.fillRect(-tw/2 - pad, -bh/2, tw + 2*pad, bh); ctx.strokeRect(-tw/2 - pad, -bh/2, tw + 2*pad, bh); }
        ctx.fillStyle = '#ffb7b7';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }

      ctx.restore();  // clip

      /* ---- TVD pill on the right edge (kept from previous design) ---- */
      const tvdTxt = fm.tvd.toFixed(0) + 'm';
      ctx.font = '9px JetBrains Mono';
      const tvdW = ctx.measureText(tvdTxt).width;
      const pillW = Math.min(60, tvdW + 10);
      const pillH = 14;
      const bx = W - padR + 4;
      const by = ty(fm.tvd) - pillH/2;
      if(by > padT && by + pillH < H - padB && bx + pillW < W - 4){
        ctx.fillStyle = 'rgba(240,68,68,0.16)';
        ctx.strokeStyle = 'rgba(240,68,68,0.75)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        if(ctx.roundRect) ctx.roundRect(bx, by, pillW, pillH, 3);
        else ctx.rect(bx, by, pillW, pillH);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f0a0a0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(tvdTxt, bx + pillW/2, by + pillH/2);
      }
    });
  }

  // Trajectory lines
  ctx.save(); ctx.beginPath(); ctx.rect(padL, padT, dW, dH); ctx.clip();
  if(S.plan.results.length > 1){
    ctx.shadowColor = 'rgba(62,159,255,0.35)'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.strokeStyle = '#3e9fff';
    ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    S.plan.results.forEach((r, i) => {
      i === 0 ? ctx.moveTo(tx(r.vs), ty(r.tvd)) : ctx.lineTo(tx(r.vs), ty(r.tvd));
    });
    ctx.stroke(); ctx.shadowBlur = 0;
    S.plan.results.forEach(r => {
      if(r.tvd >= minTVD && r.tvd <= maxTVD && r.vs >= minVS && r.vs <= maxVS) drawMarker(ctx, tx(r.vs), ty(r.tvd), '#3e9fff', 3.2);
    });
  }
  if(S.survey.results.length > 1){
    ctx.shadowColor = 'rgba(232,160,0,0.4)'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.strokeStyle = '#e8a000';
    ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    S.survey.results.forEach((r, i) => {
      i === 0 ? ctx.moveTo(tx(r.vs), ty(r.tvd)) : ctx.lineTo(tx(r.vs), ty(r.tvd));
    });
    ctx.stroke(); ctx.shadowBlur = 0;
    S.survey.results.forEach(r => {
      if(r.tvd >= minTVD && r.tvd <= maxTVD && r.vs >= minVS && r.vs <= maxVS) drawMarker(ctx, tx(r.vs), ty(r.tvd), '#e8a000', 3.2);
    });
  }
  ctx.restore();

  const legendItems = [
    { color:'#3e9fff', label:'Plan' },
    { color:'#e8a000', label:'Survey' }
  ];
  if(visibleFms.length) legendItems.push({ color:'#f04444', label:'Formations', dashed:true });
  drawLegend(ctx, padL + 10, padT + 10, legendItems);

  if(active || plotZoom.vsView) drawRangeBanner(ctx, W - padR - 10, H - padB - 10, S.displayRange);
}

/* ===== Liang-Barsky segment clip to rectangle ===== */
function clipSegmentToRect(x1, y1, x2, y2, xmin, ymin, xmax, ymax){
  let t0 = 0, t1 = 1;
  const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - xmin, xmax - x1, y1 - ymin, ymax - y1];
  for(let i = 0; i < 4; i++){
    if(p[i] === 0){
      if(q[i] < 0) return null;
    } else {
      const t = q[i] / p[i];
      if(p[i] < 0){ if(t > t1) return null; if(t > t0) t0 = t; }
      else        { if(t < t0) return null; if(t < t1) t1 = t; }
    }
  }
  return [ x1 + t0*dx, y1 + t0*dy, x1 + t1*dx, y1 + t1*dy ];
}

/* ===== PLOT CHROME HELPERS ===== */
function drawPlotTitle(ctx, W, title, subtitle){
  ctx.fillStyle = '#dce4ef'; ctx.font = 'bold 13px DM Sans';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(title, 20, 14);
  if(subtitle){
    ctx.fillStyle = '#6b7fa0'; ctx.font = '10px JetBrains Mono';
    ctx.fillText(subtitle, 20, 30);
  }
}

function drawMarker(ctx, x, y, color, r){
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = '#0a111f'; ctx.lineWidth = 1; ctx.stroke();
}

function drawLegend(ctx, x, y, items){
  ctx.font = 'bold 11px DM Sans';
  const padP = 8, lineH = 17;
  const maxW = Math.max(...items.map(i => ctx.measureText(i.label).width)) + 30;
  const H = items.length * lineH + padP;
  ctx.fillStyle = 'rgba(10,17,31,0.85)';
  ctx.strokeStyle = '#2a3a5f'; ctx.lineWidth = 1;
  if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(x, y, maxW, H, 5); ctx.fill(); ctx.stroke(); }
  else { ctx.fillRect(x, y, maxW, H); ctx.strokeRect(x, y, maxW, H); }
  items.forEach((it, i) => {
    const ly = y + padP/2 + i*lineH + lineH/2;
    if(it.dashed){
      ctx.strokeStyle = it.color; ctx.lineWidth = 1.8; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(x + 8, ly); ctx.lineTo(x + 22, ly); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = it.color; ctx.fillRect(x + 8, ly - 2, 14, 3);
    }
    ctx.fillStyle = '#dce4ef'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(it.label, x + 26, ly);
  });
}

function drawCompass(ctx, cx, cy, r){
  ctx.save();
  ctx.strokeStyle = '#4ea8ff'; ctx.fillStyle = 'rgba(10,17,31,0.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f04444';
  ctx.beginPath(); ctx.moveTo(cx, cy - r + 3); ctx.lineTo(cx - 4, cy); ctx.lineTo(cx + 4, cy); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4ea8ff';
  ctx.beginPath(); ctx.moveTo(cx, cy + r - 3); ctx.lineTo(cx - 4, cy); ctx.lineTo(cx + 4, cy); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#dce4ef'; ctx.font = 'bold 9px DM Sans';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('N', cx, cy - r - 6);
  ctx.restore();
}

function drawRangeBanner(ctx, x, y, r){
  const lbl = r.by.toUpperCase() + ': ' + (r.min===null?'auto':r.min) + '→' + (r.max===null?'auto':r.max)
              + (plotZoom.vsView || plotZoom.planView ? ' + Zoom' : '');
  ctx.font = 'bold 10px JetBrains Mono';
  const w = ctx.measureText(lbl).width + 14;
  const h = 18;
  ctx.fillStyle = 'rgba(232,160,0,0.15)';
  ctx.strokeStyle = '#e8a000'; ctx.lineWidth = 1;
  if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(x - w, y - h, w, h, 4); ctx.fill(); ctx.stroke(); }
  else { ctx.fillRect(x - w, y - h, w, h); ctx.strokeRect(x - w, y - h, w, h); }
  ctx.fillStyle = '#e8a000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(lbl, x - w/2, y - h/2);
}

/* ===== ZOOM MODE ===== */
function toggleZoomMode(plotId){
  const wasActive = zoomMode[plotId];
  zoomMode.planView = false; zoomMode.vsView = false;
  if(!wasActive) zoomMode[plotId] = true;
  updateZoomButtons();
  toast(zoomMode[plotId] ? 'Zoom mode ON — drag to select' : 'Zoom mode OFF', 'info');
}

function resetPlotZoom(plotId){
  plotZoom[plotId] = null;
  updateZoomButtons();
  if(plotId==='planView') drawPlanView(); else drawVS();
  toast('Plot zoom reset','info');
}

function updateZoomButtons(){
  document.getElementById('zoomBtnPlan').classList.toggle('active-zoom', zoomMode.planView);
  document.getElementById('zoomBtnVS').classList.toggle('active-zoom', zoomMode.vsView);
  document.getElementById('resetBtnPlan').style.display = plotZoom.planView ? 'inline-flex' : 'none';
  document.getElementById('resetBtnVS').style.display   = plotZoom.vsView   ? 'inline-flex' : 'none';
}

/* ===== PNG EXPORT (rendered at 2x for crisp output) ===== */
function exportCanvasPNG(canvasId, filename){
  const canvas = document.getElementById(canvasId);
  if(!canvas){ toast('Canvas not found','error'); return; }
  const size = getCanvasCssSize(canvas);
  if(!size){ toast('Plot not visible yet','error'); return; }
  const { w, h } = size;
  const scale = 2;
  const tmp = document.createElement('canvas');
  tmp.width = Math.round(w * scale);
  tmp.height = Math.round(h * scale);
  const tctx = tmp.getContext('2d');
  tctx.scale(scale, scale);
  if(canvasId==='planViewCanvas') drawPlanViewToCtx(tctx, w, h);
  else if(canvasId==='vsCanvas')  drawVSToCtx(tctx, w, h);
  const link = document.createElement('a');
  link.download = filename + '_' + new Date().toISOString().slice(0,10) + '.png';
  link.href = tmp.toDataURL('image/png');
  link.click();
  toast('Exported ' + link.download, 'success');
}
