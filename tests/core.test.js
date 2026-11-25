// Unit tests for the calculation core. Run with:  node --test tests/core.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = { console };
vm.createContext(context);
const source = ['mincurve', 'parsers', 'formations'].map(n => fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8')).join('\n;\n');
vm.runInContext(source + `\n;globalThis.W = { calcMC, interpAtMD, interpAtTVD, interpAtVS, computeWell, mergeStations, compareWells, comparisonStats,
    deviation, trajectoryStats, densify, toLen, fromLen, toDls, DEG, detectSurveyColumns, extractSurvey, parseNumber, lasToRows, compareWithFile, sampleData,
    resolveFormation, crossingOnWell, calcFormationThickness, thicknessRows, horizonSection, averageDls };`, context);
const W = context.W;

const near = (a, b, tol = 1e-6, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} expected ${b}, got ${a}`);
const plain = v => JSON.parse(JSON.stringify(v));
const st = (md, inc, azi) => ({ md, inc, azi });
const last = a => a[a.length - 1];
const sample = W.sampleData();
const plan = W.calcMC(sample.plan, 45), survey = W.calcMC(sample.survey, 45);

test('unit conversions use exact factors', () => {
    near(W.toLen(0.3048, 'ft'), 1);
    near(W.fromLen(1000, 'ft'), 304.8);
    near(W.toDls(3, 'ft'), 3.048);
    near(W.toLen(12, 'm'), 12);
});

test('minimum curvature matches the circular arc, between stations too', () => {
    const r = W.calcMC([st(0, 0, 0), st(900, 90, 0)]), R = 900 / (Math.PI / 2);
    near(last(r).tvd, R, 1e-9); near(last(r).north, R, 1e-9);
    const mid = W.interpAtMD(r, 450);
    near(mid.inc, 45, 1e-9); near(mid.tvd, R * Math.sin(Math.PI / 4), 1e-9); near(mid.north, R * (1 - Math.cos(Math.PI / 4)), 1e-9);
});

test('azimuth interpolates correctly across north', () => {
    const r = W.calcMC([st(0, 0, 350), st(300, 30, 350), st(600, 30, 10)]);
    const azi = W.interpAtMD(r, 450).azi;
    assert.ok(azi < 1 || azi > 359, `got ${azi}`);
});

test('nothing is extrapolated outside the surveyed interval', () => {
    assert.strictEqual(W.interpAtMD(plan, 2600), null);
    assert.strictEqual(W.interpAtTVD(plan, 9000), null);
    assert.strictEqual(W.interpAtVS(plan, 99999), null);
    assert.strictEqual(W.calcFormationThickness(plan, 5000, 6000, 0, 0), null);
});

test('TVD and VS queries return the requested value', () => {
    near(W.interpAtTVD(plan, 700, 45).tvd, 700, 1e-6);
    near(W.interpAtVS(plan, 800, 45).vs, 800, 1e-6);
});

test('a survey starting below surface is tied in rather than placed at TVD 0', () => {
    const s = [st(1000, 0, 0), st(1030, 0, 0)];
    const assumed = W.computeWell(s, { mode:'vertical' });
    near(assumed.results[1].tvd, 1000);
    assert.strictEqual(assumed.warnings.length, 1);
    const tied = W.computeWell(s, { mode:'values', tvd:990, north:5, east:-3 });
    near(tied.results[0].tvd, 990); near(tied.results[1].tvd, 1020); near(tied.results[1].north, 5);
    assert.strictEqual(tied.warnings.length, 0);
    const base = W.computeWell(sample.plan, null, 45).results;
    const fromPlan = W.computeWell(sample.survey.filter(p => p.md >= 900), { mode:'plan' }, 45, base);
    near(fromPlan.results[0].tvd, W.interpAtMD(base, 900).tvd);
    near(W.compareWells(base, fromPlan.results, 45).rows[0].cc, 0, 1e-9);
});

test('manual stations replace file stations at the same depth', () => {
    const m = W.mergeStations([st(0, 0, 0), st(100, 1, 10)], [st(100, 2, 20), st(50, 0, 0)]);
    assert.deepStrictEqual(plain(m.map(s => [s.md, s.inc])), [[0, 0], [50, 0], [100, 2]]);
});

test('comparison signs: below, right and ahead of plan', () => {
    const p = { tvd:1000, north:500, east:0 };
    const d = W.deviation({ tvd:1002, north:503, east:4 }, p, 0);       // heading north
    near(d.aboveBelow, -2); near(d.leftRight, 4); near(d.frontBehind, 3); near(d.cc, Math.hypot(2, 3, 4));
    near(W.deviation({ tvd:1000, north:500, east:-1 }, p, 180).leftRight, 1);
});

test('comparison skips stations beyond plan TD and reports closest distance', () => {
    const long = W.calcMC([...sample.survey, st(3200, 77, 60)], 45);
    const c = W.compareWells(plan, long, 45);
    assert.strictEqual(c.outside, 1);
    assert.strictEqual(c.rows.length, sample.survey.length);
    c.rows.forEach(r => assert.ok(r.closest <= r.cc + 1e-6, `closest ${r.closest} > cc ${r.cc}`));
    const s = W.comparisonStats(c.rows);
    near(s.endCC, last(c.rows).cc);
    const same = W.compareWells(plan, plan, 45);
    same.rows.forEach(r => { near(r.cc, 0, 1e-9); near(r.closest, 0, 1e-9); });
});

test('left/right in the vertical part of the plan uses the kick-off heading', () => {
    const p = W.calcMC([st(0, 0, 0), st(100, 0, 0), st(400, 30, 90)]);
    const s = W.calcMC([st(0, 0, 0), st(100, 3, 180)]);                  // drifted south: right of an east-heading plan
    const row = last(W.compareWells(p, s, 0).rows);
    assert.ok(row.leftRight > 0 && Math.abs(row.frontBehind) < 1e-6, JSON.stringify(row));
});

test('thickness of flat beds in a vertical well, and of dipping beds', () => {
    const v = W.calcMC([st(0, 0, 0), st(1000, 0, 0)]);
    const flat = W.calcFormationThickness(v, 200, 500, 0, 0);
    ['MT', 'AVT', 'TVT', 'TST'].forEach(k => near(flat[k], 300, 1e-6, k));
    const dip = W.calcFormationThickness(v, 200, 500, 30, 90);
    near(dip.TST, 300 * Math.cos(30 * W.DEG), 1e-6); near(dip.TVT, 300, 1e-6); near(dip.Psi, 30, 1e-6);
});

test('average DLS is weighted by measured depth', () => {
    const r = W.calcMC([st(0, 0, 0), st(300, 30, 0), st(900, 30, 0)]);
    near(W.averageDls(r, 0, 900), 1, 1e-9);
    near(W.averageDls(r, 300, 900), 0, 1e-9);
});

test('formation surface passes through the pick and the section horizon too', () => {
    const f = W.resolveFormation({ name:'x', tvd:850, dip:12, dipAzi:150 }, survey, 10);
    near(f.pick.tvd, 850, 1e-6);
    near(f.tvdAt(f.pick.north, f.pick.east), 850, 1e-6);
    const trace = W.horizonSection(f, W.densify(survey, 5, 10), 10, -500, 3000);
    assert.ok(trace.some(p => Math.abs(p.vs - f.pick.vs) < 1e-9 && Math.abs(p.tvd - 850) < 1e-6));
    const onPlan = W.crossingOnWell(f, plan, 10);
    near(onPlan.tvd, f.tvdAt(onPlan.north, onPlan.east), 1e-6);
    assert.strictEqual(W.resolveFormation({ tvd:9999, dip:0, dipAzi:0 }, survey).planeValid, false);
});

test('import detects headers, units and decimal commas', () => {
    const rows = [['Rig report'], ['Measured Depth', 'Incl', 'Azim Grid'], ['(ft)', '(deg)', '(deg)'], ['0,00', '0,00', ''], ['100,50', '1,50', '45,0']];
    const d = W.detectSurveyColumns(rows);
    assert.strictEqual(d.headerRow, 1); assert.strictEqual(d.unit, 'ft'); assert.ok(d.complete);
    const r = W.extractSurvey(rows, d.headerRow, d.cols, d.unit);
    assert.strictEqual(r.stations.length, 2);
    near(r.stations[1].md, W.fromLen(100.5, 'ft')); near(r.stations[1].inc, 1.5);
});

test('import sorts by depth and reports bad or repeated rows', () => {
    const rows = [['MD', 'INC', 'AZI'], [60, 2, 10], [0, 0, 0], [30, 1, 400], [30, 1, 10], [30, 1.1, 10], [90, 200, 10], [120, 'x', 10]];
    const r = W.extractSurvey(rows, 0, { md:0, inc:1, azi:2 }, 'm');
    assert.deepStrictEqual(plain(r.stations.map(s => s.md)), [0, 30, 60]);
    assert.deepStrictEqual(plain(r.skipped.map(s => s.line)), [4, 6, 7, 8]);
});

test('LAS files: curve units, NULL values and wrapped data', () => {
    const las = ['~V', 'WRAP. NO : one line per depth', '~W', 'NULL.  -999.25 : null', '~C', 'DEPT.FT : depth', 'INCL.DEG : inclination', 'AZIM.DEG : azimuth',
        '~A', '0 0 0', '100 1.5 -999.25', '200 3 45'].join('\n');
    const rows = W.lasToRows(las), d = W.detectSurveyColumns(rows);
    assert.deepStrictEqual(plain(d.cols), { md:0, inc:1, azi:2 });
    assert.strictEqual(d.unit, 'ft');
    const r = W.extractSurvey(rows, d.headerRow, d.cols, d.unit);
    assert.strictEqual(r.stations.length, 2);
    assert.strictEqual(r.skipped.length, 1);
    const wrapped = W.lasToRows(['~V', 'WRAP. YES :', '~C', 'DEPT.M :', 'INCL.DEG :', 'AZIM.DEG :', '~A', '0', '0 0', '50', '2 90'].join('\n'));
    assert.deepStrictEqual(plain(wrapped.slice(1)), [['0', '0', '0'], ['50', '2', '90']]);
});

test('file TVD check reports the difference from computed positions', () => {
    const stations = plan.map(p => ({ md:p.md, inc:p.inc, azi:p.azi, fileTvd:p.tvd + (p.md === 900 ? 0.4 : 0), fileNorth:p.north + 3500000, fileEast:p.east + 800000 }));
    const c = W.compareWithFile(plan, stations);
    near(c.tvd.diff, 0.4, 1e-9); near(c.tvd.md, 900); near(c.horizontal.diff, 0, 1e-6);
});
