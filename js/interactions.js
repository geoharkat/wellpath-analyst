/* =============================================================
   WellPath Analyst — interactions.js
   Start-up: file inputs, keyboard shortcuts, resize handling.
   ============================================================= */

window.addEventListener('load', () => {
  const year = new Date().getFullYear();
  $('footerYear').textContent = year; $('copyYear').textContent = year;
  if(!window.d3){ document.querySelector('.plots-area').textContent = 'Could not load the D3 library. Check your network connection and reload.'; return; }

  WELL_KEYS.forEach(key => {
    $(`file-${key}`).addEventListener('change', ev => { if(ev.target.files[0]) handleFile(key, ev.target.files[0]); });
    const card = $(`card-${key}`);                       // drag a file onto its card
    card.addEventListener('dragover', ev => { ev.preventDefault(); card.classList.add('dragging'); });
    card.addEventListener('dragleave', () => card.classList.remove('dragging'));
    card.addEventListener('drop', ev => {
      ev.preventDefault(); card.classList.remove('dragging');
      if(ev.dataTransfer.files[0]) handleFile(key, ev.dataTransfer.files[0]);
    });
  });
  ['queryValue'].forEach(id => $(id).addEventListener('keydown', ev => { if(ev.key === 'Enter') runQuery(); }));
  ['rangeMin', 'rangeMax'].forEach(id => $(id).addEventListener('keydown', ev => { if(ev.key === 'Enter') applyRange(); }));
  ['addMD', 'addInc', 'addAzi'].forEach(id => $(id).addEventListener('keydown', ev => { if(ev.key === 'Enter') addManualStation(); }));

  applyUnitLabels();
  WELL_KEYS.forEach(renderImportCard);
  renderFormationCards();
  refresh(true);

  let frame = 0, lastSize = '';
  new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const size = Object.values(CHART_NODES).map(id => `${$(id).parentElement.clientWidth}x${$(id).parentElement.clientHeight}`).join();
      if(size !== lastSize){ if(lastSize) resetZoom(); lastSize = size; drawCharts(); }
    });
  }).observe(document.querySelector('.plots-area'));
});
