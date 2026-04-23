/* =============================================================
   WellPath Analyst — mincurve.js
   Minimum Curvature Method, segment math, interpolation, and
   trajectory summary statistics.
   ============================================================= */

/* ===== MINIMUM CURVATURE — full pass over station list ===== */
function calcMC(stations){
  if(!stations.length) return [];
  const results = [];
  let tvd=0, north=0, east=0;
  const vsRad = S.vsAzimuth * Math.PI / 180;
  for(let i=0; i<stations.length; i++){
    const inc1 = stations[i].inc * Math.PI/180;
    const azi1 = stations[i].azi * Math.PI/180;
    if(i===0){
      results.push({ md:stations[i].md, inc:stations[i].inc, azi:stations[i].azi,
                     tvd:0, north:0, east:0, vs:0, dls:0, dogleg:0, closure:0, closureAzi:0 });
      continue;
    }
    const inc0 = stations[i-1].inc * Math.PI/180;
    const azi0 = stations[i-1].azi * Math.PI/180;
    const dmd  = stations[i].md - stations[i-1].md;
    if(dmd <= 0){
      results.push({ ...results[results.length-1], md:stations[i].md, inc:stations[i].inc, azi:stations[i].azi });
      continue;
    }
    let cosDL = Math.cos(inc1-inc0) - Math.sin(inc0)*Math.sin(inc1)*(1-Math.cos(azi1-azi0));
    cosDL = Math.max(-1, Math.min(1, cosDL));
    const dogleg = Math.acos(cosDL);
    let rf = 1;
    if(dogleg > 1e-8) rf = (2/dogleg) * Math.tan(dogleg/2);
    tvd   += (dmd/2) * (Math.cos(inc0) + Math.cos(inc1)) * rf;
    north += (dmd/2) * (Math.sin(inc0)*Math.cos(azi0) + Math.sin(inc1)*Math.cos(azi1)) * rf;
    east  += (dmd/2) * (Math.sin(inc0)*Math.sin(azi0) + Math.sin(inc1)*Math.sin(azi1)) * rf;
    const vs = north*Math.cos(vsRad) + east*Math.sin(vsRad);
    const closure = Math.sqrt(north*north + east*east);
    let closureAzi = Math.atan2(east, north) * 180/Math.PI;
    if(closureAzi < 0) closureAzi += 360;
    const dls = dogleg > 1e-8 ? (dogleg*180/Math.PI)/dmd*30 : 0;
    results.push({ md:stations[i].md, inc:stations[i].inc, azi:stations[i].azi,
                   tvd, north, east, vs, dls, dogleg:dogleg*180/Math.PI, closure, closureAzi });
  }
  return results;
}

/* ===== Single-segment MC (used for interpolation) ===== */
function calcMCSegment(r1, s2){
  const inc0 = r1.inc * Math.PI/180, azi0 = r1.azi * Math.PI/180;
  const inc1 = s2.inc * Math.PI/180, azi1 = s2.azi * Math.PI/180;
  const dmd = s2.md - r1.md;
  if(dmd <= 0) return { dtvd:0, dn:0, de:0, dls:0 };
  let cosDL = Math.cos(inc1-inc0) - Math.sin(inc0)*Math.sin(inc1)*(1-Math.cos(azi1-azi0));
  cosDL = Math.max(-1, Math.min(1, cosDL));
  const dogleg = Math.acos(cosDL);
  let rf = 1;
  if(dogleg > 1e-8) rf = (2/dogleg) * Math.tan(dogleg/2);
  return {
    dtvd: (dmd/2)*(Math.cos(inc0) + Math.cos(inc1))*rf,
    dn:   (dmd/2)*(Math.sin(inc0)*Math.cos(azi0) + Math.sin(inc1)*Math.cos(azi1))*rf,
    de:   (dmd/2)*(Math.sin(inc0)*Math.sin(azi0) + Math.sin(inc1)*Math.sin(azi1))*rf,
    dls:  dogleg > 1e-8 ? (dogleg*180/Math.PI)/dmd*30 : 0
  };
}

/* ===== INTERPOLATION ===== */
function interpAtMD(results, targetMD){
  if(!results.length) return null;
  if(results.length === 1){
    const r = results[0];
    return { md:targetMD, inc:r.inc, azi:r.azi, tvd:r.tvd, north:r.north, east:r.east,
             vs:r.vs, dls:r.dls, closure:r.closure, closureAzi:r.closureAzi };
  }
  const vsRad = S.vsAzimuth * Math.PI / 180;
  if(targetMD < results[0].md){
    const frac = (results[1].md - results[0].md) > 0 ? (targetMD - results[0].md)/(results[1].md - results[0].md) : 0;
    const inc = results[0].inc + frac*(results[1].inc - results[0].inc);
    const azi = results[0].azi + frac*(results[1].azi - results[0].azi);
    const mc = calcMCSegment(results[0], { md:targetMD, inc, azi });
    const nE = results[0].north + mc.dn, eE = results[0].east + mc.de;
    return { md:targetMD, inc, azi, tvd:results[0].tvd + mc.dtvd, north:nE, east:eE,
             vs: nE*Math.cos(vsRad) + eE*Math.sin(vsRad), dls:mc.dls,
             closure: Math.sqrt(nE*nE + eE*eE), closureAzi:0 };
  }
  if(targetMD > results[results.length-1].md){
    const n = results.length;
    const frac = (results[n-1].md - results[n-2].md) > 0 ? (targetMD - results[n-1].md)/(results[n-1].md - results[n-2].md) : 0;
    const inc = results[n-1].inc + frac*(results[n-1].inc - results[n-2].inc);
    const azi = results[n-1].azi + frac*(results[n-1].azi - results[n-2].azi);
    const mc = calcMCSegment(results[n-1], { md:targetMD, inc, azi });
    const nE = results[n-1].north + mc.dn, eE = results[n-1].east + mc.de;
    return { md:targetMD, inc, azi, tvd:results[n-1].tvd + mc.dtvd, north:nE, east:eE,
             vs: nE*Math.cos(vsRad) + eE*Math.sin(vsRad), dls:mc.dls,
             closure: Math.sqrt(nE*nE + eE*eE), closureAzi:0 };
  }
  for(let i=0; i<results.length-1; i++){
    if(targetMD >= results[i].md && targetMD <= results[i+1].md){
      const dmd = results[i+1].md - results[i].md;
      if(dmd < 1e-10) continue;
      const frac = (targetMD - results[i].md)/dmd;
      const inc = results[i].inc + frac*(results[i+1].inc - results[i].inc);
      const azi = results[i].azi + frac*(results[i+1].azi - results[i].azi);
      const mc = calcMCSegment(results[i], { md:targetMD, inc, azi });
      const nE = results[i].north + mc.dn, eE = results[i].east + mc.de;
      return { md:targetMD, inc, azi, tvd:results[i].tvd + mc.dtvd, north:nE, east:eE,
               vs: nE*Math.cos(vsRad) + eE*Math.sin(vsRad), dls:mc.dls,
               closure: Math.sqrt(nE*nE + eE*eE), closureAzi:0 };
    }
  }
  return null;
}

function interpAtTVD(results, targetTVD){
  if(!results.length || results.length < 2) return null;
  for(let i=0; i<results.length-1; i++){
    const t1 = results[i].tvd, t2 = results[i+1].tvd;
    if((targetTVD >= t1 && targetTVD <= t2) || (targetTVD <= t1 && targetTVD >= t2)){
      if(Math.abs(t2-t1) < 1e-10) continue;
      const frac = (targetTVD - t1)/(t2 - t1);
      const md = results[i].md + frac*(results[i+1].md - results[i].md);
      return interpAtMD(results, md);
    }
  }
  if(targetTVD < results[0].tvd){
    const frac = Math.abs(results[1].tvd - results[0].tvd) > 1e-10 ? (targetTVD - results[0].tvd)/(results[1].tvd - results[0].tvd) : 0;
    return interpAtMD(results, results[0].md + frac*(results[1].md - results[0].md));
  }
  const n = results.length;
  const frac = Math.abs(results[n-1].tvd - results[n-2].tvd) > 1e-10 ? (targetTVD - results[n-1].tvd)/(results[n-1].tvd - results[n-2].tvd) : 0;
  return interpAtMD(results, results[n-1].md + frac*(results[n-1].md - results[n-2].md));
}

function interpAtVS(results, targetVS){
  if(!results.length || results.length < 2) return null;
  for(let i=0; i<results.length-1; i++){
    const v1 = results[i].vs, v2 = results[i+1].vs;
    if((targetVS >= v1 && targetVS <= v2) || (targetVS <= v1 && targetVS >= v2)){
      if(Math.abs(v2-v1) < 1e-10) continue;
      const frac = (targetVS - v1)/(v2 - v1);
      const md = results[i].md + frac*(results[i+1].md - results[i].md);
      return interpAtMD(results, md);
    }
  }
  return null;
}

/* ===== TRAJECTORY STATISTICS (used by the PDF executive summary) ===== */
function trajectoryStats(results){
  if(!results || results.length < 2) return null;
  const last = results[results.length - 1];
  let maxInc = -Infinity, maxIncMD = 0;
  let maxDLS = 0, maxDLSMD = 0;
  let kickoffMD = null, kickoffTVD = null;
  let landingMD = null, landingTVD = null;
  for(const r of results){
    if(r.inc > maxInc){ maxInc = r.inc; maxIncMD = r.md; }
    if(r.dls > maxDLS){ maxDLS = r.dls; maxDLSMD = r.md; }
    if(kickoffMD === null && r.inc > 2){ kickoffMD = r.md; kickoffTVD = r.tvd; }
    if(landingMD === null && r.inc >= 85){ landingMD = r.md; landingTVD = r.tvd; }
  }
  // Average DLS weighted by MD interval
  let totalMD = 0, weightedDLS = 0;
  for(let i=1; i<results.length; i++){
    const dmd = results[i].md - results[i-1].md;
    if(dmd > 0){ totalMD += dmd; weightedDLS += results[i].dls * dmd; }
  }
  const avgDLS = totalMD > 0 ? weightedDLS / totalMD : 0;
  return {
    startMD: results[0].md,
    startTVD: results[0].tvd,
    endMD: last.md,
    endTVD: last.tvd,
    maxInc, maxIncMD,
    maxDLS, maxDLSMD,
    avgDLS,
    kickoffMD, kickoffTVD,
    landingMD, landingTVD,
    endVS: last.vs,
    endClosure: last.closure,
    endClosureAzi: last.closureAzi
  };
}
