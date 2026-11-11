/* Krupier Extra — ruletka: zakłady na numery oraz serie z sąsiadami */
(function () {
  'use strict';
  const KE = window.KE;
  const { el, fmt, randInt, pick, shuffle, weighted, unitStackG, PLAYER_CHIP } = KE;

  const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const colorOf = (n) => (n === 0 ? 'g' : RED.indexOf(n) >= 0 ? 'r' : 'b');
  const COLOR_NAME = { g: 'zielone', r: 'czerwone', b: 'czarne' };
  const ODDS = { plein: 35, cheval: 17, street: 11, trio: 11, carre: 8, first4: 8, sixain: 5 };
  const G = { X0: 104, Y0: 80, W: 64, H: 56 };
  const rowOf = (n) => Math.floor((n - 1) / 3);
  const colOf = (n) => (n - 1) % 3;
  let uidSeq = 0;

  /* ---------- zakłady na numerach ---------- */
  function betsWith(n) {
    const out = [];
    const add = (type, nums) => out.push({ type, nums: nums.slice().sort((a, b) => a - b), odds: ODDS[type] });
    if (n === 0) {
      add('plein', [0]); add('cheval', [0, 1]); add('cheval', [0, 2]); add('cheval', [0, 3]);
      add('trio', [0, 1, 2]); add('trio', [0, 2, 3]); add('first4', [0, 1, 2, 3]);
      return out;
    }
    const r = rowOf(n), c = colOf(n);
    add('plein', [n]);
    if (c < 2) add('cheval', [n, n + 1]);
    if (c > 0) add('cheval', [n - 1, n]);
    if (r < 11) add('cheval', [n, n + 3]);
    if (r > 0) add('cheval', [n - 3, n]);
    if (r === 0) add('cheval', [0, n]);
    add('street', [3 * r + 1, 3 * r + 2, 3 * r + 3]);
    if (r === 0) {
      if (n <= 2) add('trio', [0, 1, 2]);
      if (n >= 2) add('trio', [0, 2, 3]);
      add('first4', [0, 1, 2, 3]);
    }
    [r - 1, r].forEach((rr) => [c - 1, c].forEach((cc) => {
      if (rr < 0 || rr > 10 || cc < 0 || cc > 1) return;
      const a = 3 * rr + cc + 1;
      add('carre', [a, a + 1, a + 3, a + 4]);
    }));
    [r - 1, r].forEach((rr) => {
      if (rr < 0 || rr > 10) return;
      const a = 3 * rr + 1;
      add('sixain', [a, a + 1, a + 2, a + 3, a + 4, a + 5]);
    });
    return out;
  }
  const betKey = (b) => b.type + ':' + b.nums.join('-');
  function betPos(b) {
    const { X0, Y0, W, H } = G, ns = b.nums;
    const cx = (n) => X0 + colOf(n) * W + W / 2, cy = (n) => Y0 + rowOf(n) * H + H / 2;
    switch (b.type) {
      case 'plein': return ns[0] === 0 ? [X0 + 1.5 * W, Y0 - 30] : [cx(ns[0]), cy(ns[0])];
      case 'cheval':
        if (ns[0] === 0) return [cx(ns[1]), Y0];
        if (ns[1] - ns[0] === 1) return [X0 + (colOf(ns[0]) + 1) * W, cy(ns[0])];
        return [cx(ns[0]), Y0 + (rowOf(ns[0]) + 1) * H];
      case 'street': return [X0, cy(ns[0])];
      case 'trio': return [X0 + (ns[1] === 1 ? 1 : 2) * W, Y0];
      case 'first4': return [X0, Y0];
      case 'carre': return [X0 + (colOf(ns[0]) + 1) * W, Y0 + (rowOf(ns[0]) + 1) * H];
      case 'sixain': return [X0, Y0 + (rowOf(ns[0]) + 1) * H];
    }
    return [0, 0];
  }
  function betName(b) {
    const ns = b.nums;
    switch (b.type) {
      case 'plein': return `Plein ${ns[0]}`;
      case 'cheval': return `Cheval ${ns.join('/')}`;
      case 'street': return `Ulica ${ns.join('-')}`;
      case 'trio': return `Trio ${ns.join('-')}`;
      case 'first4': return 'Pierwsza czwórka 0-1-2-3';
      case 'carre': return `Carré ${ns.join('/')}`;
      case 'sixain': return `Linia ${ns[0]}–${ns[5]}`;
    }
    return '';
  }

  /** rozpiska: jakie zakłady leżą na stole i po ile żetonów (bez wypłat) */
  const TYPE_ORDER = { plein: 0, cheval: 1, street: 2, trio: 2, carre: 3, first4: 3, sixain: 4 };
  const TYPE_SHORT = { plein: 'Plein', cheval: 'Cheval', street: 'Ulica', trio: 'Trio', carre: 'Carré', first4: 'Czwórka', sixain: 'Linia' };
  function breakdownHTML(bets) {
    const nums = (b) => (b.type === 'sixain' ? `${b.nums[0]}–${b.nums[5]}` : b.type === 'street' || b.type === 'trio' || b.type === 'first4' ? b.nums.join('-') : b.nums.join('/'));
    const list = bets.slice().sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.nums[0] - b.nums[0] || a.nums[a.nums.length - 1] - b.nums[b.nums.length - 1]);
    return `<div class="rl-break">${list.map((b) => `<span class="bk"><em>${TYPE_SHORT[b.type]}</em>${nums(b)}<b>${b.chips}</b></span>`).join('')}</div>`;
  }

  function viewFor(n) {
    const { X0, Y0, W, H } = G;
    // u góry zapas na kulkę z wygranym numerem, żeby nie zasłaniała żetonów
    const x = X0 - 62, w = 62 + 3 * W + 14, top = 46;
    if (n === 0) return [x, Y0 - 76 - top, w, 76 + top + 2 * H + 20];
    const r = rowOf(n), r0 = Math.max(0, r - 1), r1 = Math.min(11, r + 1);
    const y0 = (r0 === 0 ? Y0 - 76 : Y0 + r0 * H - 16) - top;
    const y1 = Y0 + (r1 + 1) * H + (r1 === 11 ? 52 : 20);
    return [x, y0, w, y1 - y0];
  }
  function layoutSVG(n, chipsSvg, view) {
    const { X0, Y0, W, H } = G;
    const uid = ++uidSeq;
    let s = `<svg class="rl-svg" viewBox="${view.join(' ')}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">`;
    s += `<defs><radialGradient id="rf${uid}" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#17874d"/><stop offset="1" stop-color="#0a4d2b"/></radialGradient></defs>`;
    s += `<rect x="${X0 - 160}" y="${Y0 - 140}" width="${3 * W + 240}" height="${12 * H + 300}" fill="url(#rf${uid})"/>`;
    // szanse proste
    const xE = X0 - 92, xD = X0 - 46;
    const ev = ['1–18', 'PARZ.', 'R', 'B', 'NIEP.', '19–36'];
    ev.forEach((t, i) => {
      const y = Y0 + i * 2 * H;
      s += `<rect x="${xE}" y="${y}" width="46" height="${2 * H}" class="ol"/>`;
      if (t === 'R' || t === 'B') {
        const cx = xE + 23, cy = y + H;
        s += `<path d="M${cx} ${cy - 26} L${cx + 13} ${cy} L${cx} ${cy + 26} L${cx - 13} ${cy} Z" fill="${t === 'R' ? '#b3172d' : '#111'}" stroke="#fff" stroke-width="1.2"/>`;
      } else s += `<text class="ot" transform="translate(${xE + 27} ${y + H}) rotate(-90)">${t}</text>`;
    });
    ['1–12', '13–24', '25–36'].forEach((t, d) => {
      const y = Y0 + d * 4 * H;
      s += `<rect x="${xD}" y="${y}" width="46" height="${4 * H}" class="ol"/>`;
      s += `<text class="ot" transform="translate(${xD + 27} ${y + 2 * H}) rotate(-90)">${t}</text>`;
    });
    // zero
    s += `<path d="M${X0} ${Y0} V${Y0 - 34} Q${X0 + 1.5 * W} ${Y0 - 98} ${X0 + 3 * W} ${Y0 - 34} V${Y0} Z" class="cell g"/>`;
    s += `<text class="num" x="${X0 + 1.5 * W}" y="${Y0 - 14}">0</text>`;
    for (let k = 1; k <= 36; k++) {
      const x = X0 + colOf(k) * W, y = Y0 + rowOf(k) * H;
      s += `<rect x="${x}" y="${y}" width="${W}" height="${H}" class="cell ${colorOf(k)}"/>`;
      s += `<text class="num" x="${x + W / 2}" y="${y + H / 2 + 8}">${k}</text>`;
    }
    for (let c = 0; c < 3; c++) {
      const x = X0 + c * W, y = Y0 + 12 * H;
      s += `<rect x="${x}" y="${y}" width="${W}" height="44" class="ol"/><text class="ot" x="${x + W / 2}" y="${y + 27}">2:1</text>`;
    }
    // podświetlenie wygranego numeru
    if (n === 0) s += `<path d="M${X0 + 3} ${Y0 - 3} V${Y0 - 34} Q${X0 + 1.5 * W} ${Y0 - 94} ${X0 + 3 * W - 3} ${Y0 - 34} V${Y0 - 3} Z" class="winbox"/>`;
    else s += `<rect x="${X0 + colOf(n) * W + 3}" y="${Y0 + rowOf(n) * H + 3}" width="${W - 6}" height="${H - 6}" rx="4" class="winbox"/>`;
    s += chipsSvg;
    return s + '</svg>';
  }

  function genNumbers(cfg) {
    const n = randInt(0, 36);
    const all = betsWith(n);
    const k = Math.min(all.length, +weighted({ 2: 14, 3: 24, 4: 25, 5: 18, 6: 11, 7: 8 }));
    const chosen = [];
    const plein = all.find((b) => b.type === 'plein');
    if (Math.random() < 0.8) chosen.push(plein);
    shuffle(all.filter((b) => b.type !== 'plein')).forEach((b) => { if (chosen.length < k) chosen.push(b); });
    chosen.forEach((b) => { b.chips = randInt(cfg.minChips, cfg.maxChips); });
    let losers = [];
    if (cfg.losers) {
      const view = viewFor(n);
      const seen = {};
      all.forEach((b) => { seen[betKey(b)] = 1; });
      const cand = [];
      [n - 3, n + 3, n - 1, n + 1, n - 4, n + 4].forEach((m) => {
        if (m < 1 || m > 36 || m === n) return;
        betsWith(m).forEach((b) => {
          const kk = betKey(b);
          if (seen[kk] || b.nums.indexOf(n) >= 0) return;
          const p = betPos(b);
          if (p[1] < view[1] + 62 || p[1] > view[1] + view[3] - 18) return;
          seen[kk] = 1;
          cand.push(b);
        });
      });
      losers = shuffle(cand).slice(0, randInt(1, 3));
      losers.forEach((b) => { b.chips = randInt(cfg.minChips, cfg.maxChips); });
    }
    return { n, wins: chosen, losers };
  }

  /* ---------- serie i sąsiedzi ---------- */
  const P = (type, nums, u) => ({ type, nums, u: u || 1 });
  // nazwy jak na race tracku w kasynie (w nawiasie nazwy francuskie do ściągi)
  const SERIES = {
    tiers: { name: 'Serie 5/8', alt: 'Tiers du cylindre', short: 'Serie 5/8', cost: 6, parts: [[5, 8], [10, 11], [13, 16], [23, 24], [27, 30], [33, 36]].map((x) => P('cheval', x)) },
    orphelins: { name: 'Orphelins', alt: '', short: 'Orphelins', cost: 5, parts: [P('plein', [1]), P('cheval', [6, 9]), P('cheval', [14, 17]), P('cheval', [17, 20]), P('cheval', [31, 34])] },
    voisins: { name: 'Serie 0/2/3', alt: 'Voisins du zéro', short: 'Serie 0/2/3', cost: 9, parts: [P('trio', [0, 2, 3], 2), P('cheval', [4, 7]), P('cheval', [12, 15]), P('cheval', [18, 21]), P('cheval', [19, 22]), P('carre', [25, 26, 28, 29], 2), P('cheval', [32, 35])] },
    zero: { name: 'Zero spiel', alt: 'Jeu zéro', short: 'Zero spiel', cost: 4, parts: [P('cheval', [0, 3]), P('cheval', [12, 15]), P('plein', [26]), P('cheval', [32, 35])] },
  };
  function neighbours(n) {
    const i = WHEEL.indexOf(n);
    const nums = [-2, -1, 0, 1, 2].map((d) => WHEEL[(i + d + 37) % 37]);
    return { kind: 'neighbours', center: n, name: `${n} i sąsiedzi`, short: `${n} + sąsiedzi`, cost: 5, nums, parts: nums.map((x) => P('plein', [x])) };
  }
  const partName = (p) => (p.type === 'plein' ? `Plein ${p.nums[0]}` : p.type === 'cheval' ? `Cheval ${p.nums.join('/')}` : p.type === 'trio' ? `Trio ${p.nums.join('-')}` : `Carré ${p.nums.join('/')}`);
  function seriesNums(b) { const s = {}; b.parts.forEach((p) => p.nums.forEach((x) => { s[x] = 1; })); return Object.keys(s).map(Number); }
  /** ile sztuk zwraca seria na danym numerze (przy stawce 1 na sztukę) */
  function seriesUnits(b, w) {
    let units = 0;
    const lines = [];
    b.parts.forEach((p) => {
      if (p.nums.indexOf(w) < 0) return;
      const u = p.u * ODDS[p.type];
      units += u;
      lines.push(`${partName(p)}: ${p.u} szt. × ${ODDS[p.type]} = ${u}`);
    });
    return { units, lines };
  }
  function seriesPay(b, w) { const r = seriesUnits(b, w); return { sum: r.units * (b.k || 1), lines: r.lines }; }
  /**
   * Gracz daje kwotę na JEDNĄ zapowiedź (jedną serię albo numer z sąsiadami). Stawka na sztukę
   * to wielokrotność wartości żetonu: po ile = (kwota : (sztuki × żeton)) w dół × żeton,
   * za ile = sztuki × po ile, zwrot = kwota − za ile.
   */
  function genSeries(cfg) {
    const enabled = cfg.series && cfg.series.length ? cfg.series.slice() : ['voisins', 'tiers', 'orphelins', 'zero', 'neighbours'];
    const t = pick(enabled);
    const bets = [t === 'neighbours' ? neighbours(randInt(0, 36)) : Object.assign({ kind: t }, SERIES[t])];
    const pieces = bets.reduce((a, b) => a + b.cost, 0);
    // stawka na sztukę rośnie co 5 zł, więc seria gra wielokrotnościami „najmniejszej kolejki”
    // (np. Orphelins: 5 sztuk × 5 zł = 25 zł → 1780 zł mieści 1775, po 355, zwrot 5)
    const unit = pieces * 5;
    const lo = Math.max(unit, Math.ceil((cfg.seriesMin || 50) / 5) * 5);
    const hi = Math.max(lo, Math.floor((cfg.seriesMax || 2000) / 5) * 5);
    let A;
    if (Math.random() < 0.35) {
      const step = pick([50, 100]);
      const l = Math.ceil(lo / step) * step, h = Math.floor(hi / step) * step;
      A = h >= l ? l + step * randInt(0, (h - l) / step) : lo;
    } else A = lo + 5 * randInt(0, (hi - lo) / 5);
    const m = Math.floor(A / unit), T = m * unit, p = T / pieces;
    const covered = {};
    bets.forEach((b) => seriesNums(b).forEach((x) => { covered[x] = 1; }));
    const cov = Object.keys(covered).map(Number);
    const win = Math.random() < 0.8 && cov.length ? pick(cov) : randInt(0, 36);
    return { bets, pieces, unit, m, p, T, A, Z: A - T, win };
  }

  /* ---------- race track (jak na stole: poziomy owal, numery w kolejności koła) ---------- */
  // Górny rząd od lewej 24…35, dolny 30…32, na lewym łuku 5-10-23-8, na prawym 3-26-0.
  // W środku pola SERIE 5/8 | ORPHELINS | SERIE 0/2/3 | ZERO SPIEL: ukośna linia 33|1 → 27|6,
  // proste 9|22 – 17|25 oraz 28|12 – 19|15 (tak jak na stole).
  const RT = { x0: 4, x1: 356, y0: 8, R: 50, d: 20 };
  RT.xs = RT.x0 + RT.R; RT.xe = RT.x1 - RT.R; RT.w = (RT.xe - RT.xs) / 15;
  RT.y1 = RT.y0 + 2 * RT.R; RT.yc = RT.y0 + RT.R; RT.r = RT.R - RT.d;
  RT.yi0 = RT.y0 + RT.d; RT.yi1 = RT.y1 - RT.d;
  RT.H = RT.y1 + RT.y0; // wysokość sukna z torem
  const RT_TOP_PX = 44; // miejsce nad torem na pasek z zapowiedzią
  const RT_RES_H = 50; // pole z wynikiem rzutu pod torem
  const RT_STAGE_H = RT_TOP_PX + RT.H + 8 + RT_RES_H + 4;
  const RT_ROW_TOP = [24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35]; // od lewej
  const RT_ROW_BOT = [30, 11, 36, 13, 27, 6, 34, 17, 25, 2, 21, 4, 19, 15, 32]; // od lewej
  const RT_CAP_L = [5, 10, 23, 8]; // lewy łuk, od góry
  const RT_CAP_R = [3, 26, 0]; // prawy łuk, od góry
  const DEGR = Math.PI / 180;
  const f2 = (v) => Math.round(v * 100) / 100;
  const arcPt = (cx, rad, a) => [cx + rad * Math.cos(a * DEGR), RT.yc + rad * Math.sin(a * DEGR)];
  /** pole na łuku: wycinek pierścienia od kąta a1 do a2 (0° w prawo, 90° w dół) */
  function capCell(cx, a1, a2) {
    const { R, r } = RT, sw = a2 > a1 ? 1 : 0;
    const p1 = arcPt(cx, R, a1), p2 = arcPt(cx, R, a2), p3 = arcPt(cx, r, a2), p4 = arcPt(cx, r, a1);
    const m = arcPt(cx, (R + r) / 2, (a1 + a2) / 2);
    return {
      d: `M${f2(p1[0])} ${f2(p1[1])}A${R} ${R} 0 0 ${sw} ${f2(p2[0])} ${f2(p2[1])}L${f2(p3[0])} ${f2(p3[1])}A${r} ${r} 0 0 ${1 - sw} ${f2(p4[0])} ${f2(p4[1])}Z`,
      cx: m[0], cy: m[1],
    };
  }
  const rectCell = (x, y, w, h) => ({ d: `M${f2(x)} ${f2(y)}h${f2(w)}v${f2(h)}h${f2(-w)}Z`, cx: x + w / 2, cy: y + h / 2 });
  const RT_CELLS = (() => {
    const c = {};
    const put = (n, cell, side) => { cell.side = side; c[n] = cell; };
    RT_ROW_TOP.forEach((n, i) => put(n, rectCell(RT.xs + i * RT.w, RT.y0, RT.w, RT.d), 'top'));
    RT_ROW_BOT.forEach((n, i) => put(n, rectCell(RT.xs + i * RT.w, RT.yi1, RT.w, RT.d), 'bot'));
    RT_CAP_L.forEach((n, i) => put(n, capCell(RT.xs, 270 - i * 45, 225 - i * 45), 'left'));
    RT_CAP_R.forEach((n, i) => put(n, capCell(RT.xe, -90 + i * 60, -30 + i * 60), 'right'));
    return c;
  })();
  /** pola serii w środku toru; lx – środek napisu, cx – gdzie stoi stawka (dolna część pola) */
  const RT_SECT = (() => {
    const { xs, xe, w, yi0, yi1, r, yc } = RT;
    const X = (k) => f2(xs + k * w);
    const slant = (y) => X(3) + ((X(5) - X(3)) * (y - yi0)) / (yi1 - yi0); // linia 33|1 → 27|6
    const capX = (y) => Math.sqrt(Math.max(0, r * r - (y - yc) * (y - yc)));
    const ys = yc + 16; // wysokość, na której stoi stawka
    return {
      tiers: { d: `M${X(3)} ${yi0}L${xs} ${yi0}A${r} ${r} 0 0 0 ${xs} ${yi1}L${X(5)} ${yi1}Z`, label: 'SERIE 5/8', lx: (xs - r + slant(yc)) / 2, cx: (xs - capX(ys) + slant(ys)) / 2 },
      orphelins: { d: `M${X(3)} ${yi0}L${X(8)} ${yi0}L${X(8)} ${yi1}L${X(5)} ${yi1}Z`, label: 'ORPHELINS', lx: (slant(yc) + X(8)) / 2, cx: (slant(ys) + X(8)) / 2 },
      voisins: { d: `M${X(8)} ${yi0}L${X(13)} ${yi0}L${X(13)} ${yi1}L${X(8)} ${yi1}Z`, label: 'SERIE 0/2/3', lx: (X(8) + X(13)) / 2, cx: (X(8) + X(13)) / 2 },
      zero: { d: `M${X(13)} ${yi0}L${xe} ${yi0}A${r} ${r} 0 0 1 ${xe} ${yi1}L${X(13)} ${yi1}Z`, label: 'ZERO SPIEL', lx: (X(13) + xe + r) / 2 - 2, cx: (X(13) + xe + capX(ys)) / 2 },
    };
  })();
  function trackSVG(uid) {
    const { xs, xe, y0, y1, yi0, yi1, R, r } = RT;
    let s = `<svg class="rt-svg" viewBox="0 0 360 ${RT.H}" style="position:absolute;left:0;top:${RT_TOP_PX}px;width:360px;height:${RT.H}px;overflow:visible" xmlns="http://www.w3.org/2000/svg">`;
    s += `<defs><radialGradient id="tf${uid}" cx="50%" cy="50%" r="72%"><stop offset="0" stop-color="#15663a"/><stop offset="1" stop-color="#0a3b21"/></radialGradient></defs>`;
    s += `<rect x="0" y="0" width="360" height="${RT.H}" rx="16" fill="url(#tf${uid})" stroke="rgba(242,216,143,.25)"/>`;
    Object.keys(RT_SECT).forEach((k) => { s += `<path class="tsec" data-k="${k}" d="${RT_SECT[k].d}"/>`; });
    Object.keys(RT_SECT).forEach((k) => { s += `<text class="tlab" data-k="${k}" x="${f2(RT_SECT[k].lx)}" y="${f2(RT.yc + 3.1)}">${RT_SECT[k].label}</text>`; });
    WHEEL.forEach((n) => { s += `<path class="tcell ${colorOf(n)}" data-n="${n}" d="${RT_CELLS[n].d}"/>`; });
    WHEEL.forEach((n) => { const c = RT_CELLS[n]; s += `<text class="tnum" x="${f2(c.cx)}" y="${f2(c.cy + 3.7)}">${n}</text>`; });
    // białe obramowanie toru: zewnętrzne grubsze, wewnętrzne cieńsze
    s += `<path class="tedge" d="M${xs} ${y0}H${xe}A${R} ${R} 0 0 1 ${xe} ${y1}H${xs}A${R} ${R} 0 0 1 ${xs} ${y0}Z"/>`;
    s += `<path class="tedge in" d="M${xs} ${yi0}H${xe}A${r} ${r} 0 0 1 ${xe} ${yi1}H${xs}A${r} ${r} 0 0 1 ${xs} ${yi0}Z"/>`;
    s += '<path class="tmark" d="M0 0" opacity="0"/><path class="trk-hl" d="M0 0" opacity="0"/>';
    return s + '</svg>';
  }
  /**
   * Gdzie kładę stawkę: seria na swoim polu (napis pola przesuwa się wyżej), sąsiedzi w środku toru
   * tuż przy zaznaczonym numerze. Zwraca dół stosu w pikselach sceny i czy kwota ma stać nad stosem.
   */
  function trackStake(b, h) {
    if (b.kind !== 'neighbours') return { x: f2(RT_SECT[b.kind].cx), y: RT.yi1 - 2 + RT_TOP_PX, up: true };
    const c = RT_CELLS[b.center];
    const x = c.side === 'left' ? RT.xs + 8 : c.side === 'right' ? RT.xe - 8 : c.cx;
    const upper = c.side === 'top' || (c.side !== 'bot' && c.cy < RT.yc - 1);
    return upper ? { x: f2(x), y: f2(RT.yi0 + 3 + h + RT_TOP_PX), up: false } : { x: f2(x), y: RT.yi1 - 3 + RT_TOP_PX, up: true };
  }
  /** podświetlenie biegnie po torze w kolejności koła, zwalnia i staje na wygranym numerze */
  function spinTrack(svg, win, ms, onStep) {
    return new Promise((res) => {
      const hl = svg.querySelector('.trk-hl');
      const start = randInt(0, 36), target = WHEEL.indexOf(win);
      const total = 37 * 2 + ((target - start + 37) % 37);
      const show = (idx) => { hl.setAttribute('d', RT_CELLS[WHEEL[idx]].d); if (onStep) onStep(WHEEL[idx]); };
      hl.classList.remove('win');
      hl.setAttribute('opacity', '1');
      const t0 = performance.now();
      let last = -1;
      const step = (now) => {
        const u = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - u, 3);
        const idx = (start + Math.round(e * total)) % 37;
        if (idx !== last) { show(idx); last = idx; }
        if (u < 1) requestAnimationFrame(step); else { show(target); hl.classList.add('win'); res(); }
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- wspólne ---------- */
  const chipIcon = (count, size, label) => KE.unitStackSVG(count, size || 26, label);
  function badge(n) {
    return el('div', { class: 'rl-badge', title: `Wygrał numer ${n} (${COLOR_NAME[colorOf(n)]})`, html: `<span class="rl-ball ${colorOf(n)}">${n}</span>` });
  }
  async function askValue(ctx, units, overlayHost, tagBase) {
    const cfg = ctx.cfg;
    const vals = cfg.values && cfg.values.length ? cfg.values : [5, 10, 25];
    const v = pick(vals);
    overlayHost.appendChild(el('div', { class: 'rl-value', html: `${chipIcon(1, 34)}<span>= ${v} zł</span>` }));
    await ctx.T.ask({
      type: 'number', title: `Ile to złotych? (żeton po ${v})`, sub: `${units} żet.`, unit: 'zł', expected: units * v,
      tag: `rul:val:${v}`, tagLabel: `Ruletka · przeliczenie po ${v}`,
      solution: () => ({ answer: fmt(units * v) + ' zł', lines: [`${units} × ${v} zł = <b>${fmt(units * v)} zł</b>`] }),
    });
  }

  async function roundNumbers(ctx) {
    const T = ctx.T, cfg = ctx.cfg;
    T.startRound();
    const q = genNumbers(cfg);
    const stage = ctx.setFill();
    const view = viewFor(q.n);
    // od góry do dołu, żeby niższe stosiki przykrywały „ogon” wyższych
    const chips = q.losers.concat(q.wins).map((b) => ({ b, p: betPos(b) })).sort((a, c) => a.p[1] - c.p[1])
      .map(({ b, p }) => unitStackG(p[0], p[1], 15, PLAYER_CHIP, b.chips)).join('');
    stage.innerHTML = layoutSVG(q.n, chips, view);
    stage.appendChild(badge(q.n));
    const units = q.wins.reduce((a, b) => a + b.chips * b.odds, 0);
    const lines = q.wins.slice().sort((a, b) => b.odds - a.odds).map((b) => `${betName(b)}: ${b.chips} × ${b.odds} = <b>${b.chips * b.odds}</b>`);
    lines.push(`<span class="sum">Razem: ${units} żet.</span>`);
    if (q.losers.length) lines.push('Przegrane (zbierasz): ' + q.losers.map(betName).join(', '));
    await T.wait(250);
    await T.ask({
      type: 'number', title: 'Ile żetonów wypłacasz?', sub: `numer ${q.n}`, unit: 'żet.', expected: units, pre: breakdownHTML(q.wins.concat(q.losers)),
      tag: 'rul:num', tagLabel: 'Ruletka · obrazki na numerze',
      solution: () => ({ answer: units + ' żet.', lines }),
    });
    await askValue(ctx, units, stage, 'num');
    await T.roundEnd();
  }

  async function roundSeries(ctx) {
    const T = ctx.T, cfg = ctx.cfg;
    T.startRound();
    const q = genSeries(cfg);
    const bet = q.bets[0];
    const stage = ctx.setFixed(360, RT_STAGE_H);
    const uid = ++uidSeq;
    stage.innerHTML = trackSVG(uid);
    const svg = stage.querySelector('svg.rt-svg');
    // zapowiedź: ile gracz daje i na co
    stage.appendChild(el('div', { class: 'rt-info', html:
      `<span class="pl give"><span class="cash">${KE.stackSVG(q.A, 18).svg}</span><span class="t">Gracz daje <b>${fmt(q.A)} zł</b> na <b>${bet.name}</b></span></span>` }));
    // duży wynik rzutu pod torem (numery na torze są małe)
    const res = el('div', { class: 'rt-res', html: '<span class="rl-ball q">?</span><span class="tx"><small>Wynik rzutu</small><b>—</b></span>' });
    res.style.top = `${RT_TOP_PX + RT.H + 8}px`;
    stage.appendChild(res);
    const resBall = res.querySelector('.rl-ball'), resSmall = res.querySelector('small'), resBig = res.querySelector('b');
    // zaznaczenie, gdzie leży zapowiedź (pole serii albo numer środkowy przy sąsiadach)
    if (bet.kind === 'neighbours') {
      const mk = svg.querySelector('.tmark');
      mk.setAttribute('d', RT_CELLS[bet.center].d);
      mk.setAttribute('opacity', '1');
    } else svg.querySelector(`.tsec[data-k="${bet.kind}"]`).classList.add('on');
    const sc = new KE.Scene(stage);
    const minLine = `${bet.name}: ${q.pieces} szt. → najmniej za ${q.unit} zł (${q.pieces} × 5 zł), dalej co ${q.unit} zł`;
    const divLine = `${fmt(q.A)} : ${q.unit} = ${q.m}${q.Z ? ` (zostaje ${fmt(q.Z)})` : ''} → za ile: ${q.m} × ${q.unit} = <b>${fmt(q.T)} zł</b>`;
    const poLine = `Po ile: ${fmt(q.T)} : ${q.pieces} = <b>${fmt(q.p)} zł</b> na sztukę`;
    const zwrotLine = `Zwrot: ${fmt(q.A)} − ${fmt(q.T)} = <b>${fmt(q.Z)} zł</b>`;
    await T.wait(200);
    await T.ask({
      type: 'number', title: 'Jaki jest zwrot?', sub: `gracz daje ${fmt(q.A)} zł`, unit: 'zł', expected: q.Z,
      tag: 'rul:ser:zwrot', tagLabel: 'Ruletka · serie: zwrot',
      solution: () => ({ answer: fmt(q.Z) + ' zł', lines: [minLine, divLine, zwrotLine] }),
    });
    await T.ask({
      type: 'number', title: 'Po ile gra?', sub: 'zł na sztukę', unit: 'zł', expected: q.p,
      tag: 'rul:ser:po', tagLabel: 'Ruletka · serie: po ile',
      solution: () => ({ answer: fmt(q.p) + ' zł', lines: [minLine, divLine, poLine] }),
    });
    await T.ask({
      type: 'number', title: 'Za ile gra?', sub: `po ${fmt(q.p)} zł`, unit: 'zł', expected: q.T,
      tag: 'rul:ser:za', tagLabel: 'Ruletka · serie: za ile',
      solution: () => ({ answer: fmt(q.T) + ' zł', lines: [`${q.pieces} szt. × ${fmt(q.p)} zł = <b>${fmt(q.T)} zł</b>`] }),
    });
    // stawka (gotówka „za ile”) ląduje na torze
    const st = trackStake(bet, KE.stackSVG(q.T, 22, 5).h);
    if (bet.kind === 'neighbours') svg.classList.add('dimlab');
    else svg.querySelector(`.tlab[data-k="${bet.kind}"]`).classList.add('up');
    sc.stack(q.T, st.x, st.y, { d: 22, perCol: 5, from: [24, 22], cls: st.up ? 'trk amt-up' : 'trk' });
    T.status('Kulka w grze…');
    resSmall.textContent = 'Kulka w grze…';
    await spinTrack(svg, q.win, 1900 * KE.speed(), (n) => {
      resBall.className = 'rl-ball ' + colorOf(n);
      resBall.textContent = n;
    });
    resSmall.textContent = 'Wygrał numer';
    resBig.textContent = `${q.win} ${COLOR_NAME[colorOf(q.win)]}`;
    res.classList.add('done');
    T.check();
    await T.wait(300);
    let units = 0;
    const lines = [];
    q.bets.forEach((b) => {
      const r = seriesUnits(b, q.win);
      units += r.units;
      if (r.units) lines.push(`<b>${b.name}</b><br>${r.lines.join('<br>')}`);
      else lines.push(`${b.name}: brak trafienia`);
    });
    const pay = units * q.p;
    lines.push(units ? `<span class="sum">Razem: ${units} × ${fmt(q.p)} zł = ${fmt(pay)} zł</span>` : '<span class="sum">Nic nie płacisz</span>');
    await T.ask({
      type: 'number', title: 'Ile płacę?', sub: `numer ${q.win} · po ${fmt(q.p)} zł`, unit: 'zł', expected: pay,
      tag: 'rul:ser:pay', tagLabel: 'Ruletka · serie: ile płacę',
      solution: () => ({ answer: fmt(pay) + ' zł', lines }),
    });
    await T.roundEnd();
  }

  KE.ROULETTE = { WHEEL, RED, SERIES, ODDS, colorOf, seriesPay, neighbours, betsWith, betName, betPos, layoutSVG, viewFor, genSeries, _rt: { RT, RT_CELLS, RT_SECT, RT_STAGE_H, trackStake } };

  KE.games.ruletka = {
    id: 'ruletka', title: 'Ruletka', sub: 'Numery · serie i sąsiedzi',
    spec: [
      { type: 'modes', key: 'mode', label: 'Tryb', options: [
        { v: 'numbers', t: 'Zakłady na numery', d: 'Plein, cheval, ulica, carré, linia wokół wygranego numeru' },
        { v: 'series', t: 'Serie i sąsiedzi', d: 'Gracz daje kwotę na serię: liczysz zwrot, po ile i za ile gra, a po rzucie ile płacisz' },
        { v: 'mix', t: 'Mieszane', d: 'Na zmianę numery i serie' },
      ] },
      { type: 'range', keys: ['minChips', 'maxChips'], label: 'Żetony na jednym polu (min / maks)', unit: 'żet.', step: 1, min: 1, max: 99, show: (c) => c.mode !== 'series' },
      { type: 'range', keys: ['seriesMin', 'seriesMax'], label: 'Serie: ile gracz daje (min / maks)', unit: 'zł', step: 5, min: 5, max: 100000, hint: 'Stawka na sztukę rośnie co 5 zł, np. Orphelins (5 sztuk) gra od 25 zł i dalej co 25 zł.', show: (c) => c.mode !== 'numbers' },
      { type: 'values', key: 'values', label: 'Wartość żetonu', options: [5, 10, 25], show: (c) => c.mode !== 'series' },
      { type: 'checks', key: 'series', label: 'Losowane serie', show: (c) => c.mode !== 'numbers', options: [
        { v: 'tiers', t: 'Serie 5/8' }, { v: 'orphelins', t: 'Orphelins' }, { v: 'voisins', t: 'Serie 0/2/3' }, { v: 'zero', t: 'Zero spiel' }, { v: 'neighbours', t: 'Sąsiedzi' },
      ] },
      { type: 'toggle', key: 'losers', label: 'Dokładaj przegrane zakłady', hint: 'Na stole leżą też żetony, których nie płacisz', show: (c) => c.mode !== 'series' },
    ],
    modeLabel: (c) => ({ numbers: 'Zakłady na numery', series: 'Serie i sąsiedzi', mix: 'Mieszane' })[c.mode],
    start(ctx) {
      (async () => {
        try {
          for (;;) {
            const m = ctx.cfg.mode === 'mix' ? (Math.random() < 0.5 ? 'numbers' : 'series') : ctx.cfg.mode;
            if (m === 'series') await roundSeries(ctx); else await roundNumbers(ctx);
          }
        } catch (e) { if (e !== KE.ABORT) { console.error(e); ctx.fail(e); } }
      })();
    },
  };
})();
