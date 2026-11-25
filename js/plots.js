/* =============================================================
   WellPath Analyst — plots.js
   D3 (SVG) charts: plan view, vertical section, 3D view,
   deviation from plan and directional profiles. Every chart is
   drawn with presentation attributes only, so the same code
   feeds the screen, the PNG / SVG downloads and the PDF.
   ============================================================= */
const Charts = (() => {
    'use strict';

    const INK = { text:'#1e293b', muted:'#64748b', grid:'#e8edf3', axis:'#c2ccd8',
                  surface:'#ffffff', wall:'#f7f9fc', path:'#0f172a', ref:'#94a3b8', accent:'#0d9488' };
    const SCREEN_FONT = 'Helvetica, Arial, sans-serif';
    let clipSeq = 0;

    /* ---------------- helpers ---------------- */
    const fmt = (v, d = 0) => Number(v).toLocaleString('en-US', { maximumFractionDigits:d, minimumFractionDigits:d });
    const tickFmt = ticks => {
        const step = ticks.length > 1 ? Math.abs(ticks[1] - ticks[0]) : 1;
        const d = Math.max(0, Math.min(3, -Math.floor(Math.log10(step) + 1e-9)));
        return v => fmt(v, d);
    };
    const measureCtx = document.createElement('canvas').getContext('2d');
    const textWidth = (s, size, bold) => {
        measureCtx.font = `${bold ? 'bold ' : ''}${size}px Helvetica, Arial, sans-serif`;
        return measureCtx.measureText(s).width;
    };

    function base(node, o) {
        const svg = d3.select(node);
        svg.selectAll('*').remove();
        svg.attr('xmlns', 'http://www.w3.org/2000/svg').attr('width', o.width).attr('height', o.height)
           .attr('viewBox', `0 0 ${o.width} ${o.height}`).attr('font-family', o.font || SCREEN_FONT)
           .attr('font-weight', 'normal').attr('font-style', 'normal');
        const root = svg.append('g').attr('pointer-events', 'none');
        root.append('rect').attr('width', o.width).attr('height', o.height).attr('fill', INK.surface);
        return root;
    }
    function text(g, o, x, y, s, attrs = {}) {
        const t = g.append('text').attr('x', x).attr('y', y).attr('fill', attrs.fill || INK.text)
            .attr('font-size', attrs.size || 11).attr('font-weight', attrs.bold ? 'bold' : 'normal').text(o.text ? o.text(s) : s);
        if (attrs.anchor) t.attr('text-anchor', attrs.anchor);
        if (attrs.rotate !== undefined) t.attr('transform', `rotate(${attrs.rotate},${x},${y})`);
        return t;
    }
    function line(g, x1, y1, x2, y2, color, w = 1, dash) {
        const l = g.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
            .attr('stroke', color).attr('stroke-width', w);
        if (dash) l.attr('stroke-dasharray', dash);
        return l;
    }
    const pathD = pts => pts.length ? 'M' + pts.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L') : '';
    function stroke(g, pts, color, w, opacity) {
        const p = g.append('path').attr('d', pathD(pts)).attr('fill', 'none').attr('stroke', color)
            .attr('stroke-width', w).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
        if (opacity !== undefined) p.attr('stroke-opacity', opacity);
        return p;
    }
    function clip(g, x, y, w, h) {
        const id = `wpclip${++clipSeq}_${Math.random().toString(36).slice(2, 7)}`;
        g.append('defs').append('clipPath').attr('id', id).append('rect')
            .attr('x', x).attr('y', y).attr('width', w).attr('height', h);
        return g.append('g').attr('clip-path', `url(#${id})`);
    }
    function symbol(g, type, x, y, size, fill, strokeColor = INK.surface, sw = 1.6) {
        g.append('path').attr('d', d3.symbol(type, size)()).attr('transform', `translate(${x},${y})`)
            .attr('fill', fill).attr('stroke', strokeColor).attr('stroke-width', sw);
    }

    /* Legend rows below the plot; returns the height used. */
    function legendLayout(items, width, o) {
        let x = 0, row = 0;
        const placed = items.map(it => {
            const w = 24 + textWidth(o.text ? o.text(it.label) : it.label, 10.5) + 14;
            if (x + w > width && x > 0) { x = 0; row++; }
            const out = { ...it, x, row };
            x += w;
            return out;
        });
        return { placed, height: items.length ? (row + 1) * 16 + 4 : 0 };
    }
    function drawLegend(g, o, layout, x0, y0) {
        layout.placed.forEach(it => {
            const x = x0 + it.x, y = y0 + it.row * 16;
            if (it.type === 'line' || it.type === 'dash')
                line(g, x, y, x + 18, y, it.color, it.type === 'line' ? 2.5 : 1.2, it.type === 'dash' ? '3,3' : null);
            else symbol(g, it.type === 'star' ? d3.symbolStar : d3.symbolDiamond, x + 9, y, 55, it.color);
            text(g, o, x + 24, y + 3.5, it.label, { size:10.5, fill:INK.muted });
        });
    }

    /* Greedy label placement: avoids other labels, the well path and the plot edges. */
    function placeLabels(g, o, items, bounds, obstacles, reserved = []) {
        const boxes = [...reserved];
        const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
                                  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
        items.filter(it => it.x >= bounds.x - 1 && it.x <= bounds.x + bounds.w + 1 &&
                           it.y >= bounds.y - 1 && it.y <= bounds.y + bounds.h + 1)
             .forEach(it => {
            const rows = it.lines.map(s => o.text ? o.text(s) : s);
            const w = Math.max(...rows.map((s, i) => textWidth(s, 10, i === 0))) + 12;
            const h = rows.length * 12 + 6;
            let best = null;
            [12, 26, 44, 68, 96].forEach(dist => [-30, -150, 30, 150, -75, 105, 0, 180].forEach(deg => {
                const c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180);
                const cx = it.x + c * dist, cy = it.y + s * dist;
                const box = { x: c > 0.3 ? cx : c < -0.3 ? cx - w : cx - w / 2,
                              y: s < -0.3 ? cy - h : s > 0.3 ? cy : cy - h / 2, w, h };
                let cost = dist * 2 + (w * h - overlap(box, bounds)) * 20;
                boxes.forEach(b => { cost += overlap(box, { x:b.x - 2, y:b.y - 2, w:b.w + 4, h:b.h + 4 }) * 12; });
                obstacles.forEach(p => {
                    if (p[0] > box.x - 3 && p[0] < box.x + w + 3 && p[1] > box.y - 3 && p[1] < box.y + h + 3) cost += 45;
                });
                if (!best || cost < best.cost) best = { ...box, cost };
            }));
            boxes.push(best);
            const ex = Math.max(best.x, Math.min(it.x, best.x + best.w));
            const ey = Math.max(best.y, Math.min(it.y, best.y + best.h));
            line(g, it.x, it.y, ex, ey, it.color, 1);
            g.append('rect').attr('x', best.x).attr('y', best.y).attr('width', best.w).attr('height', best.h)
                .attr('rx', 3).attr('fill', '#ffffff').attr('fill-opacity', 0.94).attr('stroke', it.color).attr('stroke-width', 1);
            rows.forEach((s, i) => text(g, { }, best.x + 6, best.y + 12.5 + i * 12, s,
                { size:10, bold:i === 0, fill:i === 0 ? INK.text : INK.muted }));
        });
    }

    /* ---------------- tooltip ---------------- */
    let tipEl = null;
    function showTip(ev, title, rows) {
        if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'chart-tip'; document.body.appendChild(tipEl); }
        tipEl.textContent = '';
        const h = document.createElement('div'); h.className = 'chart-tip-title'; h.textContent = title; tipEl.appendChild(h);
        rows.forEach(([k, v]) => {
            const r = document.createElement('div'); r.className = 'chart-tip-row';
            const a = document.createElement('span'); a.textContent = k;
            const b = document.createElement('b'); b.textContent = v;
            r.append(a, b); tipEl.appendChild(r);
        });
        tipEl.style.display = 'block';
        const w = tipEl.offsetWidth, hh = tipEl.offsetHeight;
        let x = ev.clientX + 14, y = ev.clientY + 14;
        if (x + w > window.innerWidth - 8) x = ev.clientX - w - 14;
        if (y + hh > window.innerHeight - 8) y = ev.clientY - hh - 14;
        tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
    }
    const hideTip = () => { if (tipEl) tipEl.style.display = 'none'; };

    /* ---------------- read-outs ---------------- */
    const lenText = (m, v) => `${fmt(toLen(v, m.units), 1)} ${UNITS[m.units].len}`;
    function stationRows(m, key, p) {
        const L = v => lenText(m, v);
        const rows = [['MD', L(p.md)], ['TVD', L(p.tvd)], ['Inclination', `${fmt(p.inc, 2)}°`], ['Azimuth', `${fmt(p.azi, 2)}°`],
            ['DLS', `${fmt(toDls(p.dls, m.units), 2)} ${UNITS[m.units].dls}`], ['North', L(p.north)], ['East', L(p.east)], ['VS', L(p.vs)]];
        const plan = m.wells.find(w => w.key === 'plan');
        if (key === 'survey' && plan) {
            const q = interpAtMD(plan.results, p.md, m.vsAz);
            if (q) rows.push(['Distance to plan (C-C)', L(Math.hypot(p.tvd - q.tvd, p.north - q.north, p.east - q.east))]);
        }
        return rows;
    }
    /* Nearest-point read-out across every well drawn. pts = [x, y, point, well] */
    function bindPathHover(node, m, pts) {
        const svg = d3.select(node);
        svg.on('pointermove.tip', ev => {
            if (ev.buttons) { hideTip(); return; }
            const [mx, my] = d3.pointer(ev, node);
            let best = null, bd = 28 * 28;
            pts.forEach(s => { const d = (s[0] - mx) ** 2 + (s[1] - my) ** 2; if (d < bd) { bd = d; best = s; } });
            svg.select('.hover-dot').remove();
            if (!best) { hideTip(); return; }
            svg.append('circle').attr('class', 'hover-dot').attr('pointer-events', 'none').attr('cx', best[0]).attr('cy', best[1])
               .attr('r', 5).attr('fill', best[3].color).attr('stroke', '#fff').attr('stroke-width', 2);
            showTip(ev, best[3].label, stationRows(m, best[3].key, best[2]));
        }).on('pointerleave.tip', () => { hideTip(); svg.select('.hover-dot').remove(); });
    }

    /* ---------------- zoom: drag pans, Ctrl+scroll zooms, Shift+drag zooms to a box ---------------- */
    function bindZoom(node) {
        if (node.__zoom_bound) return;
        const zoom = d3.zoom().scaleExtent([0.5, 60])
            .filter(ev => ev.type === 'wheel' ? (ev.ctrlKey || ev.metaKey) : (!ev.button && !ev.shiftKey && ev.type !== 'dblclick'))
            .wheelDelta(ev => -ev.deltaY * (ev.deltaMode === 1 ? 0.05 : 0.002) * (Math.abs(ev.deltaY) < 20 ? 5 : 1))
            .on('zoom', ev => { hideTip(); node.__transform = ev.transform; if (node.__redraw) node.__redraw(); });
        d3.select(node).call(zoom).on('dblclick.reset', () => d3.select(node).call(zoom.transform, d3.zoomIdentity));
        node.__zoom_bound = zoom;
        let start = null, band = null;
        node.addEventListener('pointerdown', ev => {
            if (!ev.shiftKey || ev.button || !node.__redraw) return;
            ev.preventDefault();
            start = d3.pointer(ev, node);
            node.setPointerCapture(ev.pointerId);
            hideTip();
            band = d3.select(node).append('rect').attr('pointer-events', 'none').attr('fill', INK.accent).attr('fill-opacity', 0.08)
                .attr('stroke', INK.accent).attr('stroke-dasharray', '4,3');
        });
        node.addEventListener('pointermove', ev => {
            if (!start) return;
            const p = d3.pointer(ev, node);
            band.attr('x', Math.min(start[0], p[0])).attr('y', Math.min(start[1], p[1]))
                .attr('width', Math.abs(p[0] - start[0])).attr('height', Math.abs(p[1] - start[1]));
        });
        const finish = ev => {
            if (!start) return;
            const p = d3.pointer(ev, node), a = start, box = node.__box;
            start = null; band.remove();
            const w = Math.abs(p[0] - a[0]), h = Math.abs(p[1] - a[1]);
            if (w < 10 || h < 10 || !box) return;
            const t = node.__transform || d3.zoomIdentity;
            const centre = t.invert([(a[0] + p[0]) / 2, (a[1] + p[1]) / 2]);
            const k = Math.min(60, t.k * Math.min(box.w / w, box.h / h));
            d3.select(node).call(zoom.transform, d3.zoomIdentity
                .translate(box.x + box.w / 2 - k * centre[0], box.y + box.h / 2 - k * centre[1]).scale(k));
        };
        node.addEventListener('pointerup', finish);
        node.addEventListener('pointercancel', finish);
    }
    function axes(g, o, x, y, box, xTitle, yTitle) {
        const xt = x.ticks(Math.max(3, Math.floor(box.w / 80))), yt = y.ticks(Math.max(3, Math.floor(box.h / 48)));
        const xf = tickFmt(xt), yf = tickFmt(yt);
        xt.forEach(v => { const px = x(v); line(g, px, box.y, px, box.y + box.h, INK.grid);
            text(g, o, px, box.y + box.h + 14, xf(v), { size:10, fill:INK.muted, anchor:'middle' }); });
        yt.forEach(v => { const py = y(v); line(g, box.x, py, box.x + box.w, py, INK.grid);
            text(g, o, box.x - 6, py + 3.5, yf(v), { size:10, fill:INK.muted, anchor:'end' }); });
        g.append('rect').attr('x', box.x).attr('y', box.y).attr('width', box.w).attr('height', box.h)
            .attr('fill', 'none').attr('stroke', INK.axis);
        text(g, o, box.x + box.w / 2, box.y + box.h + 30, xTitle, { size:11, anchor:'middle' });
        text(g, o, 14, box.y + box.h / 2, yTitle, { size:11, anchor:'middle', rotate:-90 });
    }
    function titleBlock(g, o) {
        if (!o.title) return 10;
        text(g, o, 14, 20, o.title, { size:14, bold:true });
        if (o.subtitle) text(g, o, 14, 35, o.subtitle, { size:10.5, fill:INK.muted });
        return o.subtitle ? 46 : 32;
    }
    const wellLegend = m => m.wells.map(w => ({ type:'line', color:w.color, label:w.label }));
    function rangeNote(g, o, m, box) {
        if (!m.rangeLabel) return;
        const label = `Range ${m.rangeLabel}`, w = textWidth(label, 10, true) + 14;
        g.append('rect').attr('x', box.x + 6).attr('y', box.y + box.h - 24).attr('width', w).attr('height', 18).attr('rx', 4)
            .attr('fill', '#fff7ed').attr('stroke', '#ea580c');
        text(g, o, box.x + 13, box.y + box.h - 11.5, label, { size:10, bold:true });
    }
    /* Points used to fit the view: the filtered part of each well, or everything. */
    const fitPoints = m => { const f = m.wells.flatMap(w => w.focus); return f.length ? f : m.wells.flatMap(w => w.dense); };

    function drawWell(g, well, toPx) {
        const pts = well.dense.map(p => [...toPx(p), p, well]);
        stroke(g, pts, well.color, 2.5);
        if (well.results.length <= 250) well.results.forEach(r => {
            const [x, y] = toPx(r);
            g.append('circle').attr('cx', x).attr('cy', y).attr('r', 2.6).attr('fill', well.color).attr('stroke', '#fff').attr('stroke-width', 0.8);
        });
        return pts;
    }
    const endItems = (m, toPx) => m.wells.map(w => {
        const end = w.results[w.results.length - 1], [x, y] = toPx(end);
        return { x, y, color:w.color, point:end, lines:[`${w.label} TD`, `TVD ${fmt(toLen(end.tvd, m.units))} ${UNITS[m.units].len}`] };
    });
    const pickItems = (m, toPx) => m.formations.filter(f => f.pick).map(f => {
        const [x, y] = toPx(f.pick);
        return { x, y, color:f.color, kind:'top', point:f.pick, lines:[`Top ${f.name}`, `TVD ${fmt(toLen(f.pick.tvd, m.units))} ${UNITS[m.units].len}`] };
    });
    const drawMarks = (g, items) => items.forEach(it =>
        symbol(g, it.kind === 'top' ? d3.symbolDiamond : d3.symbolCircle, it.x, it.y, it.kind === 'top' ? 80 : 65, it.color));

    /* ---------------- PLAN VIEW ---------------- */
    function plan(node, m, o) {
        const g = base(node, o), U = UNITS[m.units], L = v => toLen(v, m.units);
        const legend = [...wellLegend(m), { type:'dash', color:INK.ref, label:`VS azimuth ${fmt(m.vsAz, 1)}°` },
                        { type:'star', color:INK.path, label:'Wellhead' }];
        const top = titleBlock(g, o);
        const ll = legendLayout(legend, o.width - 76, o);
        const box = { x:64, y:top, w:o.width - 80, h:o.height - top - 42 - ll.height };
        const focus = fitPoints(m), origin = m.rangeLabel ? [] : [0];
        const ex = d3.extent([...origin, ...focus.map(p => L(p.east))]), ey = d3.extent([...origin, ...focus.map(p => L(p.north))]);
        const minSpan = L(60);
        const spanX = Math.max(minSpan, ex[1] - ex[0]) * 1.3, spanY = Math.max(minSpan, ey[1] - ey[0]) * 1.3;
        const k = Math.min(box.w / spanX, box.h / spanY);                 // equal scale on both axes
        const cx = (ex[0] + ex[1]) / 2, cy = (ey[0] + ey[1]) / 2;
        let x = d3.scaleLinear([cx - box.w / 2 / k, cx + box.w / 2 / k], [box.x, box.x + box.w]);
        let y = d3.scaleLinear([cy - box.h / 2 / k, cy + box.h / 2 / k], [box.y + box.h, box.y]);
        const t = o.interactive && node.__transform;
        if (t) { x = t.rescaleX(x); y = t.rescaleY(y); }
        axes(g, o, x, y, box, `East (${U.len})`, `North (${U.len})`);
        const inner = clip(g, box.x, box.y, box.w, box.h);
        const toPx = p => [x(L(p.east)), y(L(p.north))];
        const reach = Math.max(minSpan / 2, ...m.wells.flatMap(w => w.dense.map(p => L(p.closure)))) * 1.15;
        const a = m.vsAz * Math.PI / 180;
        line(inner, x(0), y(0), x(reach * Math.sin(a)), y(reach * Math.cos(a)), INK.ref, 1.2, '4,4');
        const pts = m.wells.flatMap(w => drawWell(inner, w, toPx));
        const items = endItems(m, toPx);
        drawMarks(inner, items);
        symbol(inner, d3.symbolStar, x(0), y(0), 170, INK.path, '#ffffff', 1.5);
        const nx = box.x + box.w - 18, ny = box.y + 14;                   // north arrow
        placeLabels(inner, o, items, box, pts, [{ x:nx - 14, y:ny - 6, w:28, h:44 }]);
        g.append('path').attr('d', `M${nx},${ny}L${nx + 6},${ny + 18}L${nx},${ny + 14}L${nx - 6},${ny + 18}Z`).attr('fill', INK.text);
        text(g, o, nx, ny + 30, 'N', { size:11, bold:true, anchor:'middle' });
        rangeNote(g, o, m, box);
        drawLegend(g, o, ll, box.x, box.y + box.h + 46);
        if (o.interactive) {
            node.__box = box; node.__redraw = () => plan(node, m, o);
            bindZoom(node); bindPathHover(node, m, pts);
        }
    }

    /* ---------------- VERTICAL SECTION ---------------- */
    function section(node, m, o) {
        const g = base(node, o), U = UNITS[m.units], L = v => toLen(v, m.units), M = v => fromLen(v, m.units);
        const planes = m.formations.filter(f => f.planeValid);
        const legend = [...wellLegend(m), ...planes.map(f => ({ type:'line', color:f.color, label:`${f.name} (dip ${fmt(f.dip, 1)}°)` }))];
        const top = titleBlock(g, o);
        const ll = legendLayout(legend, o.width - 76, o);
        const box = { x:64, y:top, w:o.width - 80, h:o.height - top - 42 - ll.height };

        const focus = fitPoints(m), origin = m.rangeLabel ? [] : [0];
        let [yLo, yHi] = d3.extent([...origin, ...focus.map(p => L(p.tvd))]);
        planes.forEach(f => { const v = L(f.tvd); if (v >= yLo - L(50) && v <= yHi + L(50)) { yLo = Math.min(yLo, v); yHi = Math.max(yHi, v); } });
        const ex = d3.extent([...origin, ...focus.map(p => L(p.vs))]);
        const spanY = Math.max(L(60), yHi - yLo) * 1.08, spanX = Math.max(L(60), ex[1] - ex[0]) * 1.2, cx = (ex[0] + ex[1]) / 2;
        let xd = [cx - spanX / 2, cx + spanX / 2], yd = [yLo - spanY * 0.02, yLo + spanY];
        if (m.trueScale) {
            const k = Math.min(box.w / spanX, box.h / spanY);
            xd = [cx - box.w / 2 / k, cx + box.w / 2 / k];
            yd = [yLo - spanY * 0.02, yLo - spanY * 0.02 + box.h / k];
        }
        let x = d3.scaleLinear(xd, [box.x, box.x + box.w]), y = d3.scaleLinear(yd, [box.y, box.y + box.h]);
        const t = o.interactive && node.__transform;
        if (t) { x = t.rescaleX(x); y = t.rescaleY(y); }
        const notes = [m.trueScale ? '1:1 scale' : '', planes.some(f => f.dip > 0) ? `horizons follow the ${m.reference} track` : ''].filter(Boolean);
        axes(g, o, x, y, box, `Vertical section (${U.len})${notes.length ? `   [${notes.join(', ')}]` : ''}`, `TVD (${U.len})`);

        const inner = clip(g, box.x, box.y, box.w, box.h);
        const [x0, x1] = x.domain();
        const ref = m.wells.find(w => w.key === m.reference);
        const sorted = [...planes].sort((a, b) => a.tvd - b.tvd);
        const traces = new Map(sorted.map(f => [f, horizonSection(f, ref.dense, m.vsAz, M(x0), M(x1)).map(p => [x(L(p.vs)), y(L(p.tvd))])]));
        if (m.fill) for (let i = 0; i < sorted.length - 1; i++) {
            const a = traces.get(sorted[i]), b = traces.get(sorted[i + 1]);
            inner.append('path').attr('d', pathD([...a, ...[...b].reverse()]) + 'Z').attr('fill', sorted[i].color).attr('fill-opacity', 0.12);
        }
        const reserved = [];
        sorted.forEach(f => stroke(inner, traces.get(f), f.color, 1.6));
        const xr = box.x + box.w - 6;
        const atRight = f => {                     // height of the trace where its name is written
            const pts = traces.get(f);
            for (let i = pts.length - 1; i > 0; i--) {
                const [a, b] = [pts[i - 1], pts[i]];
                if (a[0] !== b[0] && (a[0] - xr) * (b[0] - xr) <= 0) return a[1] + (xr - a[0]) / (b[0] - a[0]) * (b[1] - a[1]) - 4;
            }
            return Infinity;
        };
        let prevY = -Infinity;
        [...sorted].sort((a, b) => atRight(a) - atRight(b)).forEach(f => {
            const yl = Math.max(atRight(f), prevY + 15); prevY = yl;
            if (yl > box.y + 8 && yl < box.y + box.h - 2) {
                const label = o.text ? o.text(f.name) : f.name, w = textWidth(label, 10.5, true);
                reserved.push({ x:xr - w - 14, y:yl - 11, w:w + 18, h:15 });
                inner.append('rect').attr('x', xr - w - 4).attr('y', yl - 10).attr('width', w + 8).attr('height', 13).attr('fill', '#ffffff').attr('fill-opacity', 0.85);
                inner.append('rect').attr('x', xr - w - 12).attr('y', yl - 7).attr('width', 6).attr('height', 6).attr('fill', f.color);
                text(inner, o, xr, yl, f.name, { size:10.5, bold:true, anchor:'end' });
            }
        });
        const toPx = p => [x(L(p.vs)), y(L(p.tvd))];
        const pts = m.wells.flatMap(w => drawWell(inner, w, toPx));
        const items = [...endItems(m, toPx), ...pickItems(m, toPx)];
        drawMarks(inner, items);
        placeLabels(inner, o, items, box, pts, reserved);
        rangeNote(g, o, m, box);
        drawLegend(g, o, ll, box.x, box.y + box.h + 46);
        if (o.interactive) {
            node.__box = box; node.__redraw = () => section(node, m, o);
            bindZoom(node); bindPathHover(node, m, pts);
        }
    }

    /* ---------------- 3D VIEW (orthographic projection) ---------------- */
    const VIEWS = { iso:{ az:35, el:24, zoom:1 }, top:{ az:0, el:90, zoom:1 }, north:{ az:0, el:0, zoom:1 }, east:{ az:90, el:0, zoom:1 } };
    function clipPoly(poly, inside, cross) {
        const out = [];
        poly.forEach((p, i) => {
            const q = poly[(i + poly.length - 1) % poly.length];
            if (inside(p)) { if (!inside(q)) out.push(cross(q, p)); out.push(p); }
            else if (inside(q)) out.push(cross(q, p));
        });
        return out;
    }
    function view3d(node, m, o) {
        const g = base(node, o), U = UNITS[m.units], L = v => toLen(v, m.units), M = v => fromLen(v, m.units);
        const cam = (o.interactive ? node.__camera : o.camera) || VIEWS.iso;
        if (o.interactive) node.__camera = cam;
        const planes = m.formations.filter(f => f.planeValid);
        const ref = m.wells.find(w => w.key === m.reference);
        const kickoff = ref.dense.find(p => p.inc > 1);
        let cropTvd = 0;
        if (m.rangeLabel) cropTvd = Math.min(...fitPoints(m).map(p => p.tvd));
        else if (!m.d3Full && kickoff) cropTvd = Math.max(0, kickoff.tvd - U.cropAbove);
        const deepestTvd = m.rangeLabel ? Math.max(...fitPoints(m).map(p => p.tvd)) : Math.max(...m.wells.flatMap(w => w.dense.map(p => p.tvd)));
        const paths = m.wells.map(w => ({ well:w, pts:w.dense.filter(p => p.tvd >= cropTvd - 1e-6 && p.tvd <= deepestTvd + 1e-6) })).filter(p => p.pts.length);
        const all = paths.flatMap(p => p.pts);

        const legend = [...wellLegend(m), { type:'dash', color:INK.ref, label:'Projections' }, ...planes.filter(f => {
            const around = all.map(p => f.tvdAt(p.north, p.east));
            return Math.min(...around) <= deepestTvd + 60 && Math.max(...around) >= cropTvd;
        }).map(f => ({ type:'diamond', color:f.color, label:f.name }))];
        const top = titleBlock(g, o);
        const ll = legendLayout(legend, o.width - 30, o);
        const box = { x:0, y:top, w:o.width, h:o.height - top - ll.height - 6 };

        const origin = m.rangeLabel ? [] : [0];
        const eE = d3.extent([...origin, ...all.map(p => L(p.east))]), eN = d3.extent([...origin, ...all.map(p => L(p.north))]);
        const dMin = L(cropTvd), dMax = Math.max(dMin + L(60), L(deepestTvd) + L(30));
        const biggest = Math.max(eE[1] - eE[0], eN[1] - eN[0], dMax - dMin);
        const widen = ([lo, hi]) => { const span = Math.max((hi - lo) * 1.16, biggest * 0.55), c = (lo + hi) / 2; return [c - span / 2, c + span / 2]; };
        const [e0, e1] = widen(eE), [n0, n1] = widen(eN);
        const c = [(e0 + e1) / 2, (n0 + n1) / 2, (dMin + dMax) / 2];

        const az = cam.az * Math.PI / 180, el = cam.el * Math.PI / 180;
        const raw = (E, N, D) => {
            const X = E - c[0], Y = N - c[1], Z = c[2] - D;
            const u = X * Math.cos(az) - Y * Math.sin(az), v = X * Math.sin(az) + Y * Math.cos(az);
            return [u, -(Z * Math.cos(el) + v * Math.sin(el))];
        };
        const rH = Math.hypot(e1 - e0, n1 - n0) / 2, rD = (dMax - dMin) / 2;
        const k = Math.min((box.w - 190) / (2 * rH), (box.h - 90) / (2 * (rD * Math.cos(el) + rH * Math.abs(Math.sin(el))))) * cam.zoom;
        const ox = box.x + box.w / 2, oy = box.y + box.h / 2;
        const P = (E, N, D) => { const r = raw(E, N, D); return [ox + r[0] * k, oy + r[1] * k]; };
        const Q = p => P(L(p.east), L(p.north), L(p.tvd));

        const inner = clip(g, box.x, box.y, box.w, box.h);
        const farE = Math.sin(az) > 0 ? e1 : e0, nearE = farE === e1 ? e0 : e1;
        const farN = Math.cos(az) > 0 ? n1 : n0, nearN = farN === n1 ? n0 : n1;
        const above = cam.el >= 0, floorD = above ? dMax : dMin, walls = Math.abs(cam.el) < 89;
        const poly = (pts, fill, fillOp, strokeColor, sw = 1, strokeOp = 1) =>
            inner.append('path').attr('d', pathD(pts) + 'Z').attr('fill', fill).attr('fill-opacity', fillOp)
                .attr('stroke', strokeColor).attr('stroke-width', sw).attr('stroke-opacity', strokeOp);
        poly([P(e0, n0, floorD), P(e1, n0, floorD), P(e1, n1, floorD), P(e0, n1, floorD)], INK.wall, 1, INK.axis);
        if (walls) {
            poly([P(farE, n0, dMin), P(farE, n1, dMin), P(farE, n1, dMax), P(farE, n0, dMax)], INK.wall, 0.65, INK.axis);
            poly([P(e0, farN, dMin), P(e1, farN, dMin), P(e1, farN, dMax), P(e0, farN, dMax)], INK.wall, 0.65, INK.axis);
        }
        const ticks = (lo, hi, n) => d3.scaleLinear([lo, hi], [0, 1]).ticks(n);
        const tE = ticks(e0, e1, 5), tN = ticks(n0, n1, 5), tD = ticks(dMin, dMax, 6);
        const seg3 = (a, b) => { const p = P(...a), q = P(...b); line(inner, p[0], p[1], q[0], q[1], INK.grid, 1); };
        tE.forEach(v => { seg3([v, n0, floorD], [v, n1, floorD]); if (walls) seg3([v, farN, dMin], [v, farN, dMax]); });
        tN.forEach(v => { seg3([e0, v, floorD], [e1, v, floorD]); if (walls) seg3([farE, v, dMin], [farE, v, dMax]); });
        if (walls) tD.forEach(v => { seg3([farE, n0, v], [farE, n1, v]); seg3([e0, farN, v], [e1, farN, v]); });

        const clipped = planes.map(f => {
            const corner = (E, N) => [E, N, L(f.tvdAt(M(N), M(E)))];
            let pl = [corner(e0, n0), corner(e1, n0), corner(e1, n1), corner(e0, n1)];
            const cut = (a, b, d) => { const t = (d - a[2]) / (b[2] - a[2]); return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), d]; };
            pl = clipPoly(pl, p => p[2] >= dMin - 1e-6, (a, b) => cut(a, b, dMin));
            pl = clipPoly(pl, p => p[2] <= dMax + 1e-6, (a, b) => cut(a, b, dMax));
            return { f, pl, centre:f.tvdAt(M(c[1]), M(c[0])) };
        }).sort((a, b) => a.centre - b.centre);
        if (m.fill && walls) for (let i = 0; i < clipped.length - 1; i++) {
            const a = clipped[i].f, b = clipped[i + 1].f;
            const d = (f, E, N) => Math.max(dMin, Math.min(dMax, L(f.tvdAt(M(N), M(E)))));
            [[[farE, n0], [farE, n1]], [[e0, farN], [e1, farN]]].forEach(([p, q]) =>
                poly([P(...p, d(a, ...p)), P(...q, d(a, ...q)), P(...q, d(b, ...q)), P(...p, d(b, ...p))], a.color, 0.14, 'none'));
        }
        paths.forEach(({ well, pts }) => {
            const shadow = fn => stroke(inner, pts.map(p => P(...fn(L(p.east), L(p.north), L(p.tvd)))), well.color, 1, 0.45).attr('stroke-dasharray', '3,3');
            shadow((E, N) => [E, N, floorD]);
            if (walls) { shadow((E, N, D) => [farE, N, D]); shadow((E, N, D) => [E, farN, D]); }
        });

        /* painter's order: path pieces and planes interleaved from the far side of the stack */
        const nP = clipped.length, fade = 1 - 0.75 * Math.max(0, Math.min(1, (cam.el - 45) / 45));
        const runs = Array.from({ length:nP + 1 }, () => []);
        paths.forEach(({ well, pts }) => {
            for (let i = 1; i < pts.length; i++) {
                const a = pts[i - 1], b = pts[i];
                const rank = clipped.filter(cp => (a.tvd + b.tvd) / 2 > cp.f.tvdAt((a.north + b.north) / 2, (a.east + b.east) / 2)).length;
                const list = runs[rank], tail = list[list.length - 1];
                if (tail && tail.well === well && tail.end === i - 1) { tail.pts.push(Q(b)); tail.end = i; }
                else list.push({ well, pts:[Q(a), Q(b)], end:i });
            }
        });
        const drawRuns = r => runs[r].forEach(run => stroke(inner, run.pts, run.well.color, 3));
        const drawPlane = i => { const cp = clipped[i]; if (cp.pl.length >= 3) poly(cp.pl.map(p => P(...p)), cp.f.color, 0.22 * fade, cp.f.color, 1.2, 0.9); };
        if (above) { drawRuns(nP); for (let i = nP - 1; i >= 0; i--) { drawPlane(i); drawRuns(i); } }
        else       { drawRuns(0);  for (let i = 0; i < nP; i++)      { drawPlane(i); drawRuns(i + 1); } }

        const centre = P(...c);
        const edgeLabels = (values, at, title) => {
            if (values.length < 2) return;
            const a = P(...at(values[0])), b = P(...at(values[values.length - 1]));
            if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 45) return;
            const mid = P(...at((values[0] + values[values.length - 1]) / 2));
            let dx = -(b[1] - a[1]), dy = b[0] - a[0];
            const len = Math.hypot(dx, dy); dx /= len; dy /= len;
            if (dx * (mid[0] - centre[0]) + dy * (mid[1] - centre[1]) < 0) { dx = -dx; dy = -dy; }
            const f = tickFmt(values), anchor = dx > 0.35 ? 'start' : dx < -0.35 ? 'end' : 'middle';
            values.forEach(v => { const p = P(...at(v)); line(inner, p[0], p[1], p[0] + dx * 5, p[1] + dy * 5, INK.axis);
                text(inner, o, p[0] + dx * 9, p[1] + dy * 11 + 3, f(v), { size:9.5, fill:INK.muted, anchor }); });
            const off = anchor === 'middle' ? 28 : 46;
            const w = textWidth(title, 10.5, true), lead = anchor === 'start' ? 0 : anchor === 'end' ? w : w / 2;
            const tx = Math.max(lead + 4, Math.min(o.width - (w - lead) - 4, mid[0] + dx * off));
            text(inner, o, tx, mid[1] + dy * off + 3, title, { size:10.5, bold:true, anchor });
        };
        edgeLabels(tE, v => [v, nearN, floorD], `East (${U.len})`);
        edgeLabels(tN, v => [nearE, v, floorD], `North (${U.len})`);
        if (Math.abs(cam.el) < 75) {
            const corners = [[e0, n0], [e1, n0], [e1, n1], [e0, n1]];
            const left = corners.reduce((a, b) => P(b[0], b[1], c[2])[0] < P(a[0], a[1], c[2])[0] ? b : a);
            edgeLabels(tD, v => [left[0], left[1], v], `TVD (${U.len})`);
        }
        const screen = paths.flatMap(({ well, pts }) => pts.map(p => [...Q(p), p, well]));
        const items = [...endItems(m, Q), ...pickItems(m, Q)].filter(it => it.point.tvd >= cropTvd - 1e-3 && it.point.tvd <= deepestTvd + 1e-3);
        drawMarks(inner, items);
        placeLabels(inner, o, items, box, screen);
        const a0 = raw(c[0], c[1], c[2]), a1 = raw(c[0], c[1] + 1, c[2]);
        const ix = o.width - 34, iy = top + 30, nx = a1[0] - a0[0], ny = a1[1] - a0[1];
        line(g, ix, iy, ix + nx * 20, iy + ny * 20, INK.text, 2);
        symbol(g, d3.symbolCircle, ix, iy, 20, INK.text);
        text(g, o, ix + nx * 29, iy + ny * 29 + 4, 'N', { size:11, bold:true, anchor:'middle' });
        rangeNote(g, o, m, { x:10, y:box.y, w:box.w, h:box.h });
        drawLegend(g, o, ll, 16, o.height - ll.height + 6);
        if (o.interactive) { node.__redraw = () => view3d(node, m, o); bind3d(node); bindPathHover(node, m, screen); }
    }
    function bind3d(node) {
        if (node.__bound3d) return;
        node.__bound3d = true;
        let drag = null, frame = 0;
        const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (node.__redraw) node.__redraw(); }); };
        node.addEventListener('pointerdown', ev => {
            if (ev.button || !node.__redraw) return;
            drag = { x:ev.clientX, y:ev.clientY, cam:{ ...node.__camera } };
            node.setPointerCapture(ev.pointerId); hideTip();
        });
        node.addEventListener('pointermove', ev => {
            if (!drag) return;
            node.__camera = { az:drag.cam.az + (ev.clientX - drag.x) * 0.45, el:Math.max(-15, Math.min(90, drag.cam.el + (ev.clientY - drag.y) * 0.35)), zoom:drag.cam.zoom };
            schedule();
        });
        const end = () => { drag = null; };
        node.addEventListener('pointerup', end);
        node.addEventListener('pointercancel', end);
        node.addEventListener('wheel', ev => {
            if (!(ev.ctrlKey || ev.metaKey) || !node.__redraw) return;
            ev.preventDefault();
            node.__camera = { ...node.__camera, zoom:Math.max(0.4, Math.min(8, node.__camera.zoom * Math.exp(-ev.deltaY * 0.0018))) };
            schedule();
        }, { passive:false });
        node.addEventListener('dblclick', () => { node.__camera = { ...VIEWS.iso }; schedule(); });
    }
    function setView(node, name) { node.__camera = { ...VIEWS[name] }; if (node.__redraw) node.__redraw(); }

    /* ---------------- stacked panels against measured depth ---------------- */
    function stackedPanels(node, m, o, panels, legend, mdDomain, hover) {
        const g = base(node, o), U = UNITS[m.units], L = v => toLen(v, m.units);
        const top = titleBlock(g, o) + 14;
        const box = { x:64, w:o.width - 80 };
        const ll = legendLayout(legend, box.w, o);
        const gap = 24, ph = (o.height - top - 38 - ll.height - gap * (panels.length - 1)) / panels.length;
        const bottom = top + panels.length * ph + gap * (panels.length - 1);
        const x = d3.scaleLinear(mdDomain.map(L), [box.x, box.x + box.w]);
        const xt = x.ticks(Math.max(4, Math.floor(box.w / 90))), xf = tickFmt(xt);
        panels.forEach((pn, i) => {
            const y0 = top + i * (ph + gap);
            const y = d3.scaleLinear(pn.dom, [y0 + ph, y0]);
            const yt = y.ticks(Math.max(4, Math.floor(ph / 30))), yf = tickFmt(yt);
            text(g, o, box.x, y0 - 6, pn.title, { size:11, bold:true });
            yt.forEach(v => { line(g, box.x, y(v), box.x + box.w, y(v), INK.grid);
                text(g, o, box.x - 6, y(v) + 3.5, yf(pn.label ? pn.label(v) : v), { size:10, fill:INK.muted, anchor:'end' }); });
            xt.forEach(v => line(g, x(v), y0, x(v), y0 + ph, INK.grid));
            line(g, box.x, y0 + ph, box.x + box.w, y0 + ph, INK.axis);
            if (pn.zero) line(g, box.x, y(0), box.x + box.w, y(0), INK.muted, 1);
            const inner = clip(g, box.x, y0 - 2, box.w, ph + 4);
            pn.series.forEach(s => {
                let run = [];
                const flush = () => { if (run.length > 1) { const p = stroke(inner, run, s.color, s.width || 2); if (s.dash) p.attr('stroke-dasharray', s.dash); } run = []; };
                s.pts.forEach(p => { if (!p) return flush(); run.push([x(p[0]), y(p[1])]); });
                flush();
                if (s.dots && s.pts.length <= 120) s.pts.forEach(p => p && inner.append('circle').attr('cx', x(p[0])).attr('cy', y(p[1])).attr('r', 2.6).attr('fill', s.color));
            });
        });
        xt.forEach(v => text(g, o, x(v), bottom + 14, xf(v), { size:10, fill:INK.muted, anchor:'middle' }));
        text(g, o, box.x + box.w / 2, bottom + 30, `Measured depth (${U.len})`, { size:11, anchor:'middle' });
        drawLegend(g, o, ll, box.x, bottom + 46);
        if (o.interactive) {
            node.__redraw = () => stackedPanels(node, m, o, panels, legend, mdDomain, hover);
            const svg = d3.select(node);
            svg.on('pointermove.tip', ev => {
                const [mx, my] = d3.pointer(ev, node);
                svg.select('.cross').remove();
                const found = mx >= box.x && mx <= box.x + box.w && my >= top && my <= bottom && hover(fromLen(x.invert(mx), m.units));
                if (!found) { hideTip(); return; }
                const px = x(L(found.md));
                svg.append('line').attr('class', 'cross').attr('pointer-events', 'none').attr('x1', px).attr('x2', px).attr('y1', top).attr('y2', bottom).attr('stroke', INK.muted);
                showTip(ev, found.title, found.rows);
            }).on('pointerleave.tip', () => { hideTip(); svg.select('.cross').remove(); });
        }
    }
    function mdExtent(m) {
        const e = d3.extent(fitPoints(m), p => p.md);
        return m.rangeLabel ? e : [0, e[1]];
    }

    function profiles(node, m, o) {
        const U = UNITS[m.units], L = v => toLen(v, m.units);
        const domain = mdExtent(m);
        let anchor = null;                      // azimuth unwrapped so each line stays continuous across north
        const azSeries = m.wells.map(w => {
            let acc = null;
            return { color:w.color, pts:w.dense.map(p => {
                if (p.inc <= VERTICAL_INC) return null;
                if (acc === null) { if (anchor === null) anchor = p.azi; acc = anchor + shortestTurn(anchor, p.azi); }
                else acc += shortestTurn(acc, p.azi);
                return [L(p.md), acc];
            }) };
        });
        const inRangeMd = p => p.md >= domain[0] - 1e-6 && p.md <= domain[1] + 1e-6;
        const shown = m.wells.flatMap(w => w.dense.filter(inRangeMd));
        const azVals = azSeries.flatMap(s => s.pts.filter(Boolean).map(p => p[1]));
        let azDom = [0, 360];
        if (azVals.length) { const [lo, hi] = d3.extent(azVals), half = Math.max(20, (hi - lo) * 1.2) / 2, mid = (lo + hi) / 2; azDom = [mid - half, mid + half]; }
        const dlsSeries = m.wells.map(w => {
            const pts = [];
            for (let i = 1; i < w.results.length; i++) { const v = toDls(w.results[i].dls, m.units); pts.push([L(w.results[i - 1].md), v], [L(w.results[i].md), v]); }
            return { color:w.color, pts };
        });
        const panels = [
            { title:'Inclination (deg)', dom:[0, Math.max(10, d3.max(shown, p => p.inc) * 1.12)], series:m.wells.map(w => ({ color:w.color, pts:w.dense.map(p => [L(p.md), p.inc]) })) },
            { title:'Azimuth (deg)', dom:azDom, label:v => normAz(v), series:azSeries },
            { title:`Dogleg severity (${U.dls})`, dom:[0, Math.max(1, (d3.max(dlsSeries.flatMap(s => s.pts), p => p[1]) || 0) * 1.15)], series:dlsSeries }
        ];
        stackedPanels(node, m, o, panels, wellLegend(m), domain, md => {
            const rows = [];
            m.wells.forEach(w => { const p = interpAtMD(w.results, md, m.vsAz);
                if (p) rows.push([`${w.label} inc / azi`, `${fmt(p.inc, 2)}° / ${fmt(p.azi, 2)}°`], [`${w.label} DLS`, `${fmt(toDls(p.dls, m.units), 2)} ${U.dls}`]); });
            return rows.length ? { md, title:`MD ${lenText(m, md)}`, rows } : null;
        });
    }

    /* ---------------- DEVIATION FROM PLAN ---------------- */
    function deviationPlot(node, m, o) {
        const U = UNITS[m.units], L = v => toLen(v, m.units), data = m.comparison;
        if (!data.length) { base(node, o); text(d3.select(node), o, o.width / 2, o.height / 2, 'No survey stations to compare in this range.', { anchor:'middle', fill:INK.muted }); return; }
        let domain = d3.extent(data, r => r.md);
        if (domain[0] === domain[1]) domain = [domain[0] - 10, domain[1] + 10];
        const color = WELL_COLORS.survey;
        const signed = (key, title) => {
            const reach = Math.max(L(0.5), ...data.map(r => Math.abs(L(r[key])))) * 1.15;
            return { title:`${title} (${U.len})`, dom:[-reach, reach], zero:true, series:[{ color, dots:true, pts:data.map(r => [L(r.md), L(r[key])]) }] };
        };
        const panels = [
            signed('aboveBelow', 'Above (+) / below (-) plan'),
            signed('leftRight', 'Right (+) / left (-) of plan'),
            signed('frontBehind', 'Ahead (+) / behind (-) plan'),
            { title:`Distance from plan (${U.len})`, dom:[0, Math.max(L(0.5), ...data.map(r => L(r.cc))) * 1.15], series:[
                { color:INK.path, dots:true, pts:data.map(r => [L(r.md), L(r.cc)]) },
                { color:INK.ref, dash:'5,4', pts:data.map(r => [L(r.md), L(r.closest)]) }] }
        ];
        const legend = [{ type:'line', color, label:'Deviation at equal MD' }, { type:'line', color:INK.path, label:'Centre-to-centre at equal MD' },
                        { type:'dash', color:INK.ref, label:'Closest distance to plan' }];
        stackedPanels(node, m, o, panels, legend, domain, md => {
            const r = data.reduce((a, b) => Math.abs(b.md - md) < Math.abs(a.md - md) ? b : a);
            const T = (v, p, n) => `${fmt(Math.abs(L(v)), 2)} ${U.len}${Math.abs(L(v)) < 0.005 ? '' : ' ' + (v > 0 ? p : n)}`;
            return { md:r.md, title:`Survey station MD ${lenText(m, r.md)}`, rows:[['Vertical', T(r.aboveBelow, 'above', 'below')], ['Lateral', T(r.leftRight, 'right', 'left')],
                ['Along plan', T(r.frontBehind, 'ahead', 'behind')], ['Centre-to-centre', lenText(m, r.cc)], ['Closest', lenText(m, r.closest)]] };
        });
    }

    return { plan, section, view3d, profiles, deviation:deviationPlot, setView, hideTip, VIEWS };
})();

/* ===== SCREEN ORCHESTRATION ===== */
const CHART_NODES = { plan:'chartPlan', section:'chartSection', view3d:'chart3d', deviation:'chartDeviation', profiles:'chartProfiles' };

function buildModel(){
    if(!S.reference) return null;
    const maxMd = Math.max(...WELL_KEYS.map(k => S.wells[k].results.length ? S.wells[k].results[S.wells[k].results.length - 1].md : 0));
    const wells = WELL_KEYS.filter(k => S.wells[k].results.length).map(key => {
        const results = S.wells[key].results;
        const dense = densify(results, Math.max(1.5, maxMd / 900), S.vsAzimuth);
        return { key, label:WELL_LABELS[key], color:WELL_COLORS[key], results, dense, focus:rangeActive() ? dense.filter(p => inRange(p.md, p.tvd)) : [] };
    });
    return { units:S.units, vsAz:S.vsAzimuth, wellName:S.wellName, wells, reference:S.reference, formations:resolvedFormations(),
             fill:S.view.fill, trueScale:S.view.trueScale, d3Full:S.view.d3Full, rangeLabel:rangeActive() ? rangeText() : null,
             comparison:filteredComparison() };
}
function drawCharts(){
    const model = buildModel();
    Object.entries(CHART_NODES).forEach(([key, id]) => {
        const node = $(id), box = node.parentElement;
        const empty = !model || (key === 'deviation' && !S.comparison.rows.length);
        if(empty){
            node.__redraw = null; d3.select(node).on('.tip', null).selectAll('*').remove();
            box.classList.add('empty'); return;
        }
        box.classList.remove('empty');
        Charts[key](node, model, { width:Math.max(280, box.clientWidth - 8), height:Math.max(260, box.clientHeight - 8), interactive:true });
    });
    Charts.hideTip();
}
function resetZoom(){
    ['chartPlan', 'chartSection'].forEach(id => { const n = $(id); n.__transform = null; n.__zoom = d3.zoomIdentity; });
}
function resetPlot(id){ const n = $(id); if(n.__zoom_bound) d3.select(n).call(n.__zoom_bound.transform, d3.zoomIdentity); }
function setView3d(name){ Charts.setView($('chart3d'), name); }
