/* =============================================================
   WellPath Analyst — parsers.js
   File-format parsers (CSV / LAS / Excel), preview rendering,
   manual-column mapping UI, and built-in sample dataset.
   ============================================================= */

/* ===== FILE UPLOAD ENTRY POINT ===== */
async function handleFileUpload(type, input) {
  const file = input.files[0]; if(!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  let data;
  try {
    if(ext==='csv')          data = await parseCSV(file);
    else if(ext==='las')     data = await parseLAS(file);
    else if(ext==='xlsx'||ext==='xls') data = await parseExcel(file);
    else { toast('Unsupported format','error'); return; }
    S[type].raw = data.rows;
    S[type].headers = data.headers;
    showPreview(type, data);
    document.getElementById(type+'Zone').classList.add('loaded');
    document.getElementById(type+'Zone').querySelector('p').textContent = file.name;
    toast(type.charAt(0).toUpperCase() + type.slice(1) + ' loaded: ' + file.name, 'success');
  } catch(e){ toast('Error: ' + e.message, 'error'); }
}

/* ===== CSV ===== */
function parseCSV(file){
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: r => {
        const rows = r.data.filter(row => row.some(c => c !== ''));
        if(rows.length < 2) { reject(new Error('Insufficient data')); return; }
        resolve({ headers: rows[0].map(h => h.trim()), rows: rows.slice(1) });
      },
      error: e => reject(e),
      skipEmptyLines: true
    });
  });
}

/* ===== LAS (curve names + ~A data block) ===== */
function parseLAS(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const lines = e.target.result.split(/\r?\n/);
      let section = '', curves = [], dataRows = [];
      for(let line of lines){
        const t = line.trim();
        if(!t || t.startsWith('#')) continue;
        if(t.startsWith('~')) { section = t.substring(0,2).toUpperCase(); continue; }
        if(section==='~C'){
          const ci = t.indexOf(':');
          const spec = ci >= 0 ? t.substring(0,ci).trim() : t;
          const di = spec.indexOf('.');
          const name = (di >= 0 ? spec.substring(0,di) : spec).split(/\s+/)[0].trim();
          curves.push({ name });
        } else if(section==='~A'){
          const vals = t.split(/\s+/).map(Number);
          if(vals.length >= curves.length && vals.every(v => !isNaN(v))) dataRows.push(vals);
        }
      }
      if(!curves.length) { reject(new Error('No curves')); return; }
      resolve({ headers: curves.map(c => c.name), rows: dataRows.map(r => r.map(v => String(v))) });
    };
    reader.onerror = () => reject(new Error('Read error'));
    reader.readAsText(file);
  });
}

/* ===== Excel (xlsx / xls) ===== */
function parseExcel(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type:'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
        const rows = raw.filter(r => r.some(c => c !== ''));
        if(rows.length < 2) { reject(new Error('Insufficient data')); return; }
        resolve({
          headers: rows[0].map(h => String(h).trim()),
          rows: rows.slice(1).map(r => r.map(c => String(c)))
        });
      } catch(err){ reject(err); }
    };
    reader.onerror = () => reject(new Error('Read error'));
    reader.readAsArrayBuffer(file);
  });
}

/* ===== PREVIEW + COLUMN MAPPING ===== */
function showPreview(type, data){
  const container = document.getElementById(type+'Preview');
  const tableDiv  = document.getElementById(type+'PreviewTable');
  container.style.display = 'block';
  let html = '<table><thead><tr>';
  data.headers.forEach(h => html += '<th>' + esc(h) + '</th>');
  html += '</tr></thead><tbody>';
  data.rows.slice(0,10).forEach(row => {
    html += '<tr>';
    row.forEach(c => html += '<td class="mono">' + esc(c) + '</td>');
    html += '</tr>';
  });
  html += '</tbody></table>';
  tableDiv.innerHTML = html;

  ['MD','Inc','Azi'].forEach(param => {
    const sel = document.getElementById(type + param);
    sel.innerHTML = '<option value="-1">-- Select --</option>';
    data.headers.forEach((h,i) => sel.innerHTML += '<option value="'+i+'">' + esc(h) + '</option>');
    const lower = data.headers.map(h => h.toLowerCase());
    let idx = -1;
    if(param==='MD')       idx = lower.findIndex(h => /md|depth|meas/i.test(h));
    else if(param==='Inc') idx = lower.findIndex(h => /inc|incl/i.test(h));
    else if(param==='Azi') idx = lower.findIndex(h => /azi|azim/i.test(h));
    if(idx >= 0) sel.value = idx;
  });
}

/* ===== SAMPLE DATA ===== */
function loadSampleData(){
  S.plan.stations = [
    {md:0,inc:0,azi:45},{md:50,inc:0,azi:45},{md:150,inc:15,azi:45},
    {md:300,inc:30,azi:45},{md:500,inc:45,azi:45},{md:700,inc:55,azi:48},
    {md:900,inc:60,azi:50},{md:1100,inc:65,azi:52},{md:1300,inc:70,azi:53},
    {md:1500,inc:72,azi:55},{md:1700,inc:73,azi:55},{md:1900,inc:74,azi:56},
    {md:2100,inc:75,azi:57},{md:2300,inc:75,azi:58},{md:2500,inc:76,azi:58}
  ];
  S.survey.stations = [
    {md:0,inc:0,azi:45},{md:50,inc:0.2,azi:44.8},{md:150,inc:14.5,azi:45.3},
    {md:300,inc:29.8,azi:45.8},{md:500,inc:44.2,azi:46.5},{md:700,inc:54.8,azi:49.2},
    {md:900,inc:60.3,azi:51.0},{md:1100,inc:65.5,azi:53.2},{md:1300,inc:70.8,azi:54.5},
    {md:1500,inc:72.5,azi:56.0},{md:1700,inc:73.8,azi:56.2},{md:1900,inc:74.5,azi:57.5},
    {md:2100,inc:75.3,azi:58.0},{md:2300,inc:75.6,azi:59.2},{md:2500,inc:76.5,azi:59.8}
  ];
  S.plan.raw     = S.plan.stations.map(s => [String(s.md), String(s.inc), String(s.azi)]);
  S.plan.headers = ['MD','INC','AZI'];
  S.survey.raw     = S.survey.stations.map(s => [String(s.md), String(s.inc), String(s.azi)]);
  S.survey.headers = ['MD','INC','AZI'];
  ['planMD','planInc','planAzi','surveyMD','surveyInc','surveyAzi'].forEach((id, idx) => {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="0">MD</option><option value="1">INC</option><option value="2">AZI</option>';
    sel.value = idx % 3;
  });
  ['plan','survey'].forEach(type => {
    const container = document.getElementById(type+'Preview');
    const tableDiv = document.getElementById(type+'PreviewTable');
    container.style.display = 'block';
    document.getElementById(type+'Zone').classList.add('loaded');
    document.getElementById(type+'Zone').querySelector('p').textContent = 'Sample Data Loaded';
    let html = '<table><thead><tr><th>MD</th><th>INC</th><th>AZI</th></tr></thead><tbody>';
    S[type].raw.slice(0, 10).forEach(row => {
      html += '<tr>';
      row.forEach(c => html += '<td class="mono">' + c + '</td>');
      html += '</tr>';
    });
    html += '</tbody></table>';
    tableDiv.innerHTML = html;
  });
  S.formations = [
    { name:'Overburden Shale', tvd:200, dip:5, dipAzi:45 },
    { name:'Cap Rock',        tvd:500, dip:8, dipAzi:48 },
    { name:'Reservoir A',     tvd:850, dip:12, dipAzi:50 },
    { name:'Reservoir B',     tvd:1200, dip:15, dipAzi:52 },
    { name:'Basement',        tvd:1800, dip:20, dipAzi:55 }
  ];
  if(!document.getElementById('wellName').value)  document.getElementById('wellName').value  = 'DEMO-01';
  if(!document.getElementById('wellField').value) document.getElementById('wellField').value = 'Sample Field';
  renderFormationTops();
  toast('Sample data loaded — click Process Data','info');
}
