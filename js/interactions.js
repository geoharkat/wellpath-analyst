/* =============================================================
   WellPath Analyst — interactions.js
   DOM-ready initialisation: resize handling, keyboard shortcuts,
   drag-to-zoom rectangles, and hover tooltips on canvases.
   ============================================================= */

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('footerYear').textContent = new Date().getFullYear();
  renderFormationTops();
  renderFormationStats();
  updateRangeIndicator();
  updateZoomButtons();

  /* ----- Resize handler (debounced) ----- */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { drawPlanView(); drawVS(); }, 200);
  });

  /* ----- Keyboard shortcuts ----- */
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape') closeAbout();
    if(e.key === 'Enter' && document.getElementById('tab-import').classList.contains('active')) processData();
  });

  /* ----- Canvas interactions: zoom rectangle + hover tooltip ----- */
  let isZooming = false, zoomStartX = 0, zoomStartY = 0, activeZoomCanvasId = null;

  ['planViewCanvas','vsCanvas'].forEach(id => {
    const canvas = document.getElementById(id);
    const plotId = id === 'planViewCanvas' ? 'planView' : 'vsView';
    const selRectId = plotId === 'planView' ? 'selRectPlan' : 'selRectVS';
    const tooltipId = plotId === 'planView' ? 'tooltipPlan' : 'tooltipVS';

    canvas.addEventListener('mousedown', e => {
      if(!zoomMode[plotId]) return;
      isZooming = true;
      activeZoomCanvasId = id;
      const rect = canvas.getBoundingClientRect();
      zoomStartX = e.clientX - rect.left;
      zoomStartY = e.clientY - rect.top;
    });

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;

      if(isZooming && activeZoomCanvasId === id){
        const selRect = document.getElementById(selRectId);
        const parentRect = canvas.parentElement.getBoundingClientRect();
        selRect.style.display = 'block';
        selRect.style.left  = (Math.min(zoomStartX, curX) + rect.left - parentRect.left) + 'px';
        selRect.style.top   = (Math.min(zoomStartY, curY) + rect.top  - parentRect.top)  + 'px';
        selRect.style.width  = Math.abs(curX - zoomStartX) + 'px';
        selRect.style.height = Math.abs(curY - zoomStartY) + 'px';
        return;
      }

      // ----- hover tooltip (only when NOT in zoom mode) -----
      if(zoomMode[plotId]) return;
      const hit = findNearestStation(plotId, curX, curY);
      const tooltip = document.getElementById(tooltipId);
      if(!hit){ tooltip.style.display = 'none'; return; }
      const parentRect = canvas.parentElement.getBoundingClientRect();
      const offX = rect.left - parentRect.left;
      const offY = rect.top  - parentRect.top;
      tooltip.style.display = 'block';
      const src = hit.source === 'plan' ? 'PLAN' : 'SURVEY';
      const color = hit.source === 'plan' ? '#3e9fff' : '#e8a000';
      tooltip.innerHTML =
        '<div class="tt-head" style="color:'+color+'">' + src + ' · Station ' + (hit.idx + 1) + '</div>'
      + '<div class="tt-row"><span class="tt-key">MD</span><span class="tt-val">'  + hit.r.md.toFixed(2)  + ' m</span></div>'
      + '<div class="tt-row"><span class="tt-key">TVD</span><span class="tt-val">' + hit.r.tvd.toFixed(2) + ' m</span></div>'
      + '<div class="tt-row"><span class="tt-key">Inc</span><span class="tt-val">' + hit.r.inc.toFixed(2) + '°</span></div>'
      + '<div class="tt-row"><span class="tt-key">Azi</span><span class="tt-val">' + hit.r.azi.toFixed(2) + '°</span></div>'
      + '<div class="tt-row"><span class="tt-key">N</span><span class="tt-val">'   + hit.r.north.toFixed(2) + ' m</span></div>'
      + '<div class="tt-row"><span class="tt-key">E</span><span class="tt-val">'   + hit.r.east.toFixed(2)  + ' m</span></div>'
      + '<div class="tt-row"><span class="tt-key">VS</span><span class="tt-val">'  + hit.r.vs.toFixed(2)    + ' m</span></div>'
      + '<div class="tt-row"><span class="tt-key">DLS</span><span class="tt-val">' + hit.r.dls.toFixed(2)   + ' °/30m</span></div>';
      // Position smartly to avoid going off-canvas
      const tW = tooltip.offsetWidth || 150;
      const tH = tooltip.offsetHeight || 120;
      let tx = offX + curX + 14;
      let ty = offY + curY + 14;
      if(tx + tW > parentRect.width)  tx = offX + curX - tW - 14;
      if(ty + tH > parentRect.height) ty = offY + curY - tH - 14;
      tooltip.style.left = tx + 'px';
      tooltip.style.top  = ty + 'px';
    });

    canvas.addEventListener('mouseup', e => {
      if(!isZooming || activeZoomCanvasId !== id) return;
      isZooming = false;
      document.getElementById(selRectId).style.display = 'none';
      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
      const stX = zoomStartX;
      const stY = zoomStartY;
      if(Math.abs(endX - stX) < 10 || Math.abs(endY - stY) < 10) return;
      const lb = lastDrawn[plotId];
      if(!lb || !lb.dW) return;

      if(plotId === 'planView'){
        const { padL, W, padB, H, minE, maxE, minN, maxN, dW, dH } = lb;
        const e1 = minE + (Math.min(stX, endX) - padL)/dW * (maxE - minE);
        const e2 = minE + (Math.max(stX, endX) - padL)/dW * (maxE - minE);
        const n1 = minN + (H - padB - Math.max(stY, endY))/dH * (maxN - minN);
        const n2 = minN + (H - padB - Math.min(stY, endY))/dH * (maxN - minN);
        plotZoom.planView = { eMin:e1, eMax:e2, nMin:Math.min(n1, n2), nMax:Math.max(n1, n2) };
        drawPlanView();
      } else {
        const { padL, padT, minVS, maxVS, minTVD, maxTVD, dW, dH } = lb;
        const vs1  = minVS  + (Math.min(stX, endX) - padL)/dW * (maxVS  - minVS);
        const vs2  = minVS  + (Math.max(stX, endX) - padL)/dW * (maxVS  - minVS);
        const tvd1 = minTVD + (Math.min(stY, endY) - padT)/dH * (maxTVD - minTVD);
        const tvd2 = minTVD + (Math.max(stY, endY) - padT)/dH * (maxTVD - minTVD);
        plotZoom.vsView = {
          vsMin:Math.min(vs1, vs2), vsMax:Math.max(vs1, vs2),
          tvdMin:Math.min(tvd1, tvd2), tvdMax:Math.max(tvd1, tvd2)
        };
        drawVS();
      }
      updateZoomButtons();
      toast('Zoom applied','success');
    });

    canvas.addEventListener('mouseleave', () => {
      if(isZooming && activeZoomCanvasId === id){
        isZooming = false;
        document.getElementById(selRectId).style.display = 'none';
      }
      document.getElementById(tooltipId).style.display = 'none';
    });
  });
});

/* ===== HOVER HELPER =====
   Find the station closest to the cursor (within ~18 CSS px) on a given plot. */
function findNearestStation(plotId, mx, my){
  const lb = lastDrawn[plotId];
  if(!lb || !lb.dW) return null;
  const threshold = 18;
  const candidates = [];

  if(plotId === 'planView'){
    const { padL, padB, H, minE, maxE, minN, maxN, dW, dH } = lb;
    const tx = e => padL + (e - minE)/(maxE - minE) * dW;
    const ty = n => H - padB - (n - minN)/(maxN - minN) * dH;
    S.plan.results.forEach((r, i) => {
      if(r.east < minE || r.east > maxE || r.north < minN || r.north > maxN) return;
      const px = tx(r.east), py = ty(r.north);
      const d = Math.hypot(px - mx, py - my);
      if(d <= threshold) candidates.push({ r, idx:i, source:'plan', d });
    });
    S.survey.results.forEach((r, i) => {
      if(r.east < minE || r.east > maxE || r.north < minN || r.north > maxN) return;
      const px = tx(r.east), py = ty(r.north);
      const d = Math.hypot(px - mx, py - my);
      if(d <= threshold) candidates.push({ r, idx:i, source:'survey', d });
    });
  } else {
    const { padL, padT, minVS, maxVS, minTVD, maxTVD, dW, dH } = lb;
    const tx = vs  => padL + (vs - minVS)/(maxVS - minVS) * dW;
    const ty = tvd => padT + (tvd - minTVD)/(maxTVD - minTVD) * dH;
    S.plan.results.forEach((r, i) => {
      if(r.vs < minVS || r.vs > maxVS || r.tvd < minTVD || r.tvd > maxTVD) return;
      const px = tx(r.vs), py = ty(r.tvd);
      const d = Math.hypot(px - mx, py - my);
      if(d <= threshold) candidates.push({ r, idx:i, source:'plan', d });
    });
    S.survey.results.forEach((r, i) => {
      if(r.vs < minVS || r.vs > maxVS || r.tvd < minTVD || r.tvd > maxTVD) return;
      const px = tx(r.vs), py = ty(r.tvd);
      const d = Math.hypot(px - mx, py - my);
      if(d <= threshold) candidates.push({ r, idx:i, source:'survey', d });
    });
  }

  if(!candidates.length) return null;
  candidates.sort((a, b) => a.d - b.d);
  return candidates[0];
}
