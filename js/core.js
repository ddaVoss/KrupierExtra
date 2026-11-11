/* Krupier Extra — rdzeń: narzędzia, ustawienia, statystyki, karty, żetony i trener pytań */
(function () {
  'use strict';
  const KE = (window.KE = window.KE || {});
  KE.games = KE.games || {};
  const ABORT = (KE.ABORT = new Error('przerwano'));

  /* ---------------- DOM ---------------- */
  function el(tag, attrs) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : String(v));
      }
    }
    const kids = Array.prototype.slice.call(arguments, 2);
    (function add(list) {
      list.forEach((kid) => {
        if (kid == null || kid === false) return;
        if (Array.isArray(kid)) return add(kid);
        n.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
      });
    })(kids);
    return n;
  }

  /* ---------------- losowanie ---------------- */
  const rnd = () => Math.random();
  const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function weighted(obj) {
    let total = 0;
    for (const k in obj) total += obj[k];
    let x = Math.random() * total;
    for (const k in obj) { x -= obj[k]; if (x < 0) return k; }
    return Object.keys(obj)[0];
  }
  /** losowa kwota zakładu w krokach (domyślnie co 5), często „okrągła” */
  function randBet(min, max, step) {
    step = step || 5;
    let lo = Math.max(step, Math.ceil(min / step) * step);
    let hi = Math.floor(max / step) * step;
    if (hi < lo) hi = lo;
    if (Math.random() < 0.45) {
      const l25 = Math.ceil(lo / 25) * 25, h25 = Math.floor(hi / 25) * 25;
      if (h25 >= l25 && h25 > 0) return Math.max(l25, 25) + 25 * randInt(0, Math.max(0, (h25 - Math.max(l25, 25)) / 25));
    }
    return lo + step * randInt(0, Math.round((hi - lo) / step));
  }

  /* ---------------- liczby ---------------- */
  function groupInt(s) { return s.length > 4 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : s; }
  function fmt(x) {
    const neg = x < 0;
    const cents = Math.round(Math.abs(x) * 100);
    const i = Math.floor(cents / 100), f = cents % 100;
    return (neg ? '−' : '') + groupInt(String(i)) + (f ? ',' + String(f).padStart(2, '0') : '');
  }
  const fmtOdds = (o) => (o === 1.5 ? '3:2' : groupInt(String(o)) + ':1');
  const fmtMul = (o) => (Number.isInteger(o) ? groupInt(String(o)) : String(o).replace('.', ','));
  function parseNum(s) {
    const v = parseFloat(String(s).replace(/[\s ]/g, '').replace(',', '.'));
    return isNaN(v) ? NaN : v;
  }
  const approx = (a, b) => Math.abs(a - b) < 0.005;
  function fmtBuf(buf) {
    const parts = buf.split(',');
    return groupInt(parts[0] || '0') + (parts.length > 1 ? ',' + parts[1] : '');
  }

  /* ---------------- pamięć ---------------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* brak miejsca lub tryb prywatny */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* nic */ } },
  };

  /* ---------------- ustawienia ---------------- */
  const DEFAULTS = {
    showAmounts: true,
    fastAnim: false,
    vibrate: true,
    payMode: 'spots',
    ruletka: { mode: 'numbers', minChips: 1, maxChips: 5, values: [5, 10, 25], seriesMin: 50, seriesMax: 2000, series: ['voisins', 'tiers', 'orphelins', 'zero', 'neighbours'], losers: false },
    blackjack: { mode: 'payouts', min: 25, max: 300, boxes: 3 },
    royal: { min: 25, max: 300, sixCards: true, twoCombos5: true, antePay6: true },
    lvp: { min: 25, max: 300 },
    holdem: { min: 25, max: 300, qualify: 'pair4' },
    holdemBonus: { min: 25, max: 300 },
    american: { min: 25, max: 300 },
  };
  function merge(base, over) {
    if (Array.isArray(base)) return Array.isArray(over) ? over.slice() : base.slice();
    if (base && typeof base === 'object') {
      const out = {};
      for (const k in base) out[k] = merge(base[k], over && typeof over === 'object' ? over[k] : undefined);
      return out;
    }
    return over === undefined || over === null || typeof over !== typeof base ? base : over;
  }
  const SKEY = 'ke.settings.v2'; // v2: nowe domyślne limity 25–300 zł
  const settings = merge(DEFAULTS, store.get(SKEY, {}));
  KE.settings = settings;
  KE.DEFAULTS = DEFAULTS;
  KE.saveSettings = () => store.set(SKEY, settings);
  const speed = () => (settings.fastAnim ? 0.5 : 1);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms * speed()));
  function vibrate(p) { try { if (settings.vibrate && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* nic */ } }

  /* ---------------- statystyki ---------------- */
  const STKEY = 'ke.stats.v1';
  let stats = store.get(STKEY, null);
  if (!stats || !stats.modes) stats = { modes: {}, tags: {} };
  let saveTimer = 0;
  function saveStats() { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set(STKEY, stats), 300); }
  const Stats = {
    data: () => stats,
    add(mode, tag, label, result, ms, streak) {
      const m = stats.modes[mode] || (stats.modes[mode] = { steps: 0, first: 0, second: 0, fail: 0, ms: 0, rounds: 0, perfect: 0, best: 0 });
      m.steps++; m[result]++; m.ms += Math.min(ms, 120000);
      if (streak > m.best) m.best = streak;
      if (tag) {
        const t = stats.tags[tag] || (stats.tags[tag] = { n: 0, first: 0, label: label || tag, mode });
        t.n++; if (result === 'first') t.first++;
        if (label) t.label = label;
      }
      saveStats();
    },
    round(mode, perfect) {
      const m = stats.modes[mode] || (stats.modes[mode] = { steps: 0, first: 0, second: 0, fail: 0, ms: 0, rounds: 0, perfect: 0, best: 0 });
      m.rounds++; if (perfect) m.perfect++;
      saveStats();
    },
    reset() { stats = { modes: {}, tags: {} }; store.set(STKEY, stats); },
  };

  /* ---------------- ikony ---------------- */
  const S = (d, extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra || ''}>${d}</svg>`;
  const ICON = {
    back: S('<path d="M15 18l-6-6 6-6"/>'),
    next: S('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    chev: S('<path d="M9 6l6 6-6 6"/>'),
    check: S('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    x: S('<path d="M6 6l12 12M18 6L6 18"/>', ' stroke-width="3"'),
    backspace: S('<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M12 9l6 6M18 9l-6 6"/>'),
    flame: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.6 2.2c.5 3.3 4.9 5.6 4.9 10.6a5.5 5.5 0 0 1-11 0c0-2.3 1.1-4 2.4-5.1.1 2 .9 3.3 2.3 3.6-.5-3.6.3-6.6 1.4-9.1z"/></svg>',
    target: S('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
    book: S('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5v-16M8 7h8M8 11h6"/>'),
    chart: S('<path d="M4 20V11M10 20V5M16 20v-6M2.5 20.5h19"/>'),
    sliders: S('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),
    play: S('<path d="M7 5l12 7-12 7z" fill="currentColor"/>'),
  };

  /* ---------------- kolory ---------------- */
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  /* ---------------- karty ---------------- */
  const SUIT_PATH = {
    H: 'M50 90C22 66 5 50 5 30 5 15 16 5 30 5c9 0 16 5 20 13 4-8 11-13 20-13 14 0 25 10 25 25 0 20-17 36-45 60z',
    D: 'M50 3 88 50 50 97 12 50z',
    S: 'M50 4C38 24 6 40 6 62c0 13 10 22 22 22 8 0 14-3 18-9-1 9-5 15-12 21h32c-7-6-11-12-12-21 4 6 10 9 18 9 12 0 22-9 22-22C94 40 62 24 50 4z',
    C: 'M50 6a20 20 0 0 0-19.5 24.6A20 20 0 1 0 44 62c-1 12-5 22-12 30h36c-7-8-11-18-12-30a20 20 0 1 0 13.5-31.4A20 20 0 0 0 50 6z',
  };
  const suitSVG = (s) => `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${SUIT_PATH[s]}"/></svg>`;
  const RANK = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  const SUIT_CH = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const cardName = (c) => (c.joker ? 'Joker' : RANK[c.r] + SUIT_CH[c.s]);
  function cardFace(c) {
    if (c.joker) return '<div class="jk"><span>J<br>O<br>K<br>E<br>R</span><i>★</i></div>';
    const r = RANK[c.r], s = suitSVG(c.s);
    const rk = `<b${c.r === 10 ? ' class="ten"' : ''}>${r}</b>`;
    let mid;
    if (c.r >= 11 && c.r <= 13) mid = `<span class="mid court"><b>${r}</b>${s}</span>`;
    else if (c.r === 14) mid = `<span class="mid ace">${s}</span>`;
    else mid = `<span class="mid">${s}</span>`;
    return `<span class="crn tl">${rk}${s}</span>${mid}<span class="crn br">${rk}${s}</span>`;
  }
  function cardEl(c, down) {
    const red = c.s === 'H' || c.s === 'D';
    const n = el('div', { class: 'card' + (down ? ' down' : '') + (red ? ' red' : '') + (c.joker ? ' joker' : '') },
      el('div', { class: 'inner' },
        el('div', { class: 'face front', html: cardFace(c) }),
        el('div', { class: 'face back' })));
    n._card = c;
    return n;
  }

  /* ---------------- żetony ---------------- */
  const CHIPS = [
    { v: 1000, base: '#1f4fb2', edge: '#ffffff', text: '#ffffff', name: 'niebiesko-biały' },
    { v: 500, base: '#e66ead', edge: '#fff2f8', text: '#ffffff', name: 'różowy' },
    { v: 100, base: '#18181b', edge: '#ffffff', text: '#ffffff', name: 'czarno-biały' },
    { v: 25, base: '#1f8f45', edge: '#f2fff5', text: '#ffffff', name: 'zielony' },
    { v: 10, base: '#7b4a29', edge: '#f3e2cc', text: '#ffffff', name: 'brązowy' },
    { v: 5, base: '#cf2f2f', edge: '#ffffff', text: '#ffffff', name: 'czerwony' },
    { v: 2.5, base: '#f2c42f', edge: '#fffbe8', text: '#4a3500', name: 'żółty' },
  ];
  const chipLabel = (v) => (v === 2.5 ? '2,5' : String(v));
  function breakdown(amount) {
    let cents = Math.round(amount * 100);
    const out = [];
    CHIPS.forEach((c) => {
      const cv = Math.round(c.v * 100);
      while (cents >= cv) { out.push(c); cents -= cv; }
    });
    return out;
  }
  /* --- geometria żetonu w rzucie z ukosa: walec, którego wierzch i spód to elipsy --- */
  const DEG = Math.PI / 180;
  const f2c = (v) => Math.round(v * 100) / 100;
  let gradSeq = 0;
  const ept = (cx, cy, rx, ry, a) => `${f2c(cx + rx * Math.cos(a * DEG))} ${f2c(cy + ry * Math.sin(a * DEG))}`;
  /** widoczny bok walca: od przedniego łuku wierzchu do przedniego łuku spodu */
  function sidePath(cx, rx, ry, yTop, yBot) {
    return `M${f2c(cx - rx)} ${f2c(yTop)}L${f2c(cx - rx)} ${f2c(yBot)}A${f2c(rx)} ${f2c(ry)} 0 0 0 ${f2c(cx + rx)} ${f2c(yBot)}L${f2c(cx + rx)} ${f2c(yTop)}A${f2c(rx)} ${f2c(ry)} 0 0 1 ${f2c(cx - rx)} ${f2c(yTop)}Z`;
  }
  const frontArc = (cx, rx, ry, y) => `M${f2c(cx - rx)} ${f2c(y)}A${f2c(rx)} ${f2c(ry)} 0 0 0 ${f2c(cx + rx)} ${f2c(y)}`;
  /**
   * Paski na boku: 8 łatek dookoła żetonu, widać te z przedniej połowy. Każda łatka ma górną
   * i dolną krawędź po łuku żetonu, a przy bokach naturalnie się zwęża (perspektywa walca).
   */
  function sideSpots(cx, rx, ry, yt, t, phase, fill) {
    let s = '';
    const y1 = yt + t * 0.1, y2 = yt + t * 0.9;
    for (let k = 0; k < 8; k++) {
      const a1 = (((phase + k * 45) % 360) + 360) % 360, a2 = a1 + 22.5;
      const segs = a2 > 360 ? [[a1, 360], [0, a2 - 360]] : [[a1, a2]];
      segs.forEach((sg) => {
        const p = Math.max(sg[0], 0), q = Math.min(sg[1], 180);
        if (q - p < 0.5) return;
        s += `<path d="M${ept(cx, y1, rx, ry, p)}A${f2c(rx)} ${f2c(ry)} 0 0 1 ${ept(cx, y1, rx, ry, q)}L${ept(cx, y2, rx, ry, q)}A${f2c(rx)} ${f2c(ry)} 0 0 0 ${ept(cx, y2, rx, ry, p)}Z" fill="${fill}"/>`;
      });
    }
    return s;
  }
  /** łatki na obrzeżu wierzchu — te same kąty co paski na boku, więc „zawijają się” przez krawędź */
  function topSpots(cx, cy, rx, ry, phase, fill, ro, ri) {
    let s = '';
    for (let k = 0; k < 8; k++) {
      const a1 = phase + k * 45, a2 = a1 + 22.5;
      s += `<path d="M${ept(cx, cy, rx * ro, ry * ro, a1)}A${f2c(rx * ro)} ${f2c(ry * ro)} 0 0 1 ${ept(cx, cy, rx * ro, ry * ro, a2)}L${ept(cx, cy, rx * ri, ry * ri, a2)}A${f2c(rx * ri)} ${f2c(ry * ri)} 0 0 0 ${ept(cx, cy, rx * ri, ry * ri, a1)}Z" fill="${fill}"/>`;
    }
    return s;
  }
  /** cieniowanie boku walca: ciemniej przy krawędziach, lekki połysk bliżej środka */
  const shadeDefs = (id) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".2" stop-color="#000" stop-opacity=".1"/><stop offset=".42" stop-color="#fff" stop-opacity=".14"/><stop offset=".75" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".48"/></linearGradient></defs>`;
  /**
   * Stos żetonów w rzucie bocznym (największe nominały na dole). Przy `perCol` wysoka stawka
   * układa się w 2–3 słupkach, żeby nie zasłaniała sąsiednich pól.
   */
  function stackSVG(amount, d, perCol) {
    d = d || 34;
    let chips = breakdown(amount);
    let cols = 1, per;
    if (perCol && chips.length > perCol) {
      cols = Math.min(3, Math.ceil(chips.length / perCol));
      per = Math.min(perCol, Math.ceil(chips.length / cols));
      chips = chips.slice(0, cols * per);
    } else {
      if (chips.length > 14) chips = chips.slice(0, 14);
      per = chips.length;
    }
    const columns = [];
    for (let c = 0; c < cols; c++) columns.push(chips.slice(c * per, (c + 1) * per));
    // cienkie żetony; powyżej 5 sztuk co piąty żeton jest „otwarty” (przesunięty), żeby liczyć piątkami
    const rx = d / 2, ry = d * 0.31, t = d * 0.075, gap = 3;
    const shift = per > 5 ? d * 0.13 : 0;
    const W = cols * (d + shift) + (cols - 1) * gap + 2, H = 2 * ry + t * per + 2;
    const gid = 'cg' + (++gradSeq);
    let s = `<svg width="${f2c(W)}" height="${f2c(H)}" viewBox="0 0 ${f2c(W)} ${f2c(H)}" aria-hidden="true">${shadeDefs(gid)}`;
    columns.forEach((col, ci) => { s += stackColumn(col, 1 + rx + ci * (d + shift + gap), H, d, rx, ry, t, gid, shift); });
    return { svg: s + '</svg>', w: W, h: H };
  }
  function stackColumn(chips, cx0, H, d, rx, ry, t, gid, shift) {
    let s = '';
    const n = chips.length;
    const topOf = (i) => H - 1 - ry - t * (i + 1);
    const offOf = (i) => (n > 5 && Math.floor(i / 5) % 2 === 1 ? shift : 0);
    chips.forEach((c, i) => {
      const yt = topOf(i), yb = yt + t, cx = cx0 + offOf(i), ph = (i * 19 + 7) % 45;
      s += `<path d="${sidePath(cx, rx, ry, yt, yb)}" fill="${shade(c.base, -0.28)}"/>`;
      s += sideSpots(cx, rx, ry, yt, t, ph, c.edge);
      s += `<path d="${frontArc(cx, rx, ry, yb)}" fill="none" stroke="${shade(c.base, -0.6)}" stroke-width=".4" stroke-opacity=".85"/>`;
      s += `<ellipse cx="${f2c(cx)}" cy="${f2c(yt)}" rx="${f2c(rx)}" ry="${f2c(ry)}" fill="${c.base}"/>`;
      // cieniowanie boku dla każdej piątki osobno (górny żeton piątki albo całego stosu)
      if (i % 5 === 4 || i === n - 1) s += `<path d="${sidePath(cx, rx, ry, yt, topOf(i - (i % 5)) + t)}" fill="url(#${gid})"/>`;
      if (i === n - 1) {
        s += topSpots(cx, yt, rx, ry, ph, c.edge, 0.96, 0.72);
        s += `<ellipse cx="${f2c(cx)}" cy="${f2c(yt)}" rx="${f2c(rx)}" ry="${f2c(ry)}" fill="none" stroke="${shade(c.base, -0.5)}" stroke-width=".6"/>`;
        s += `<ellipse cx="${f2c(cx)}" cy="${f2c(yt)}" rx="${f2c(rx * 0.58)}" ry="${f2c(ry * 0.58)}" fill="${shade(c.base, 0.1)}" stroke="${c.edge}" stroke-opacity=".6" stroke-width=".8"/>`;
        const fs = d * (c.v >= 1000 ? 0.2 : 0.25);
        s += `<text x="${f2c(cx)}" y="${f2c(yt + fs * 0.36)}" font-size="${f2c(fs)}" font-weight="800" text-anchor="middle" fill="${c.text}" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif" transform="matrix(1 0 0 .62 0 ${f2c(yt * 0.38)})">${chipLabel(c.v)}</text>`;
        s += `<ellipse cx="${f2c(cx - rx * 0.3)}" cy="${f2c(yt - ry * 0.35)}" rx="${f2c(rx * 0.35)}" ry="${f2c(ry * 0.22)}" fill="#fff" opacity=".13"/>`;
      }
    });
    return s;
  }
  /** pojedynczy żeton z góry (do legend i ściągi) */
  function chipTopSVG(v, size) {
    const c = CHIPS.find((x) => x.v === v) || CHIPS[3];
    size = size || 30;
    const r = 14, C = 2 * Math.PI * 11.6;
    return `<svg viewBox="-15 -15 30 30" width="${size}" height="${size}" aria-hidden="true"><circle r="${r}" fill="${c.base}" stroke="rgba(0,0,0,.35)"/><circle r="11.6" fill="none" stroke="${c.edge}" stroke-width="3.4" stroke-dasharray="${C / 16} ${C / 16}"/><circle r="8.2" fill="${shade(c.base, 0.1)}" stroke="${c.edge}" stroke-opacity=".6" stroke-width=".7"/><text y="3" font-size="${v >= 1000 ? 6.5 : 8}" font-weight="800" text-anchor="middle" fill="${c.text}" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif">${chipLabel(v)}</text></svg>`;
  }
  /**
   * Stosik żetonów koloru gracza (ruletka). Stos STOI na polu zakładu jak na prawdziwym stole:
   * dolny żeton leży dokładnie na miejscu zakładu (x, y), kolejne idą w górę, a liczba jest
   * na wierzchu górnego żetonu. Na boku białe paski po łuku, co druga piątka „otwarta”.
   */
  function unitStackG(x, y, r, color, count, label, maxN) {
    const n = Math.max(1, Math.min(count, maxN || 30));
    // Wieża nigdy nie jest wyższa niż 5 zwykłych żetonów — inaczej zasłaniałaby zakład leżący
    // tuż za nią (np. cheval nad numerem). Do 5 sztuk normalna grubość, powyżej żetony cieńsze.
    const ry = r * 0.72, tFull = r * 0.13, shift = r * 0.3;
    const t = Math.min(tFull, (tFull * 5) / n);
    const dense = n > 5; // ściśnięta wieża: paski idą przez całą piątkę, łączenia delikatniejsze
    const side = shade(color, -0.28), seam = shade(color, -0.6);
    // piątki liczone od dołu: dolna piątka leży na polu, co druga wyżej jest przesunięta
    const offOf = (k) => (Math.floor(k / 5) % 2 === 1 ? shift : 0);
    const phOf = (k) => (dense ? (Math.floor(k / 5) * 19 + 7) % 45 : (k * 19 + 7) % 45);
    const gid = 'ug' + (++gradSeq);
    let g = `<g class="uchip" transform="translate(${f2c(x)} ${f2c(y)})">${shadeDefs(gid)}`;
    g += `<ellipse cy="${f2c(ry * 0.2)}" rx="${f2c(r * 1.04)}" ry="${f2c(ry)}" fill="rgba(0,0,0,.38)"/>`;
    for (let k = 0; k < n; k++) {
      const first = k - (k % 5), groupTop = k % 5 === 4 || k === n - 1;
      const yb = -k * t, yt = yb - t, cx = offOf(k);
      g += `<path d="${sidePath(cx, r, ry, yt, yb)}" fill="${side}"/>`;
      if (!dense) g += sideSpots(cx, r, ry, yt, t, phOf(k), '#fff');
      else if (groupTop) g += sideSpots(cx, r, ry, yt, (k - first + 1) * t, phOf(k), '#fff');
      const strong = !dense || k === first;
      g += `<path d="${frontArc(cx, r, ry, yb)}" fill="none" stroke="${seam}" stroke-width="${strong ? '.4' : '.25'}" stroke-opacity="${strong ? '.85' : '.35'}"/>`;
      g += `<ellipse cx="${f2c(cx)}" cy="${f2c(yt)}" rx="${f2c(r)}" ry="${f2c(ry)}" fill="${color}"/>`;
      // cieniowanie boku dla każdej piątki (rysowane przy jej górnym żetonie)
      if (groupTop) g += `<path d="${sidePath(cx, r, ry, yt, -first * t)}" fill="url(#${gid})"/>`;
    }
    const top = -n * t, tcx = offOf(n - 1), tph = phOf(n - 1);
    g += topSpots(tcx, top, r, ry, tph, '#fff', 0.96, 0.72);
    g += `<ellipse cx="${f2c(tcx)}" cy="${f2c(top)}" rx="${f2c(r)}" ry="${f2c(ry)}" fill="none" stroke="${seam}" stroke-width=".6"/>`;
    g += `<ellipse cx="${f2c(tcx)}" cy="${f2c(top)}" rx="${f2c(r * 0.6)}" ry="${f2c(ry * 0.6)}" fill="#fff"/>`;
    const txt = label != null ? String(label) : String(count);
    const fs = r * (txt.length >= 3 ? 0.52 : txt.length === 2 ? 0.68 : 0.8);
    g += `<text x="${f2c(tcx)}" y="${f2c(top + fs * 0.36)}" font-size="${f2c(fs)}" text-anchor="middle" fill="${shade(color, -0.62)}" font-weight="900" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif">${txt}</text>`;
    return g + '</g>';
  }
  /** ten sam żeton jako samodzielna ikona (legenda, ustawienia) */
  function unitStackSVG(count, size, label, maxN) {
    const r = 14, ry = r * 0.72, n = Math.max(1, Math.min(count, maxN || 3)), t = Math.min(r * 0.13, (r * 0.65) / n);
    const w = 2 * r + 3, h = n * t + 2.25 * ry + 3, y0 = -n * t - ry - 1.5;
    return `<svg viewBox="${-r - 1.5} ${y0.toFixed(2)} ${w} ${h.toFixed(2)}" width="${size}" height="${Math.round((size * h) / w)}" aria-hidden="true">${unitStackG(0, 0, r, PLAYER_CHIP, count, label, maxN || 3)}</svg>`;
  }
  const PLAYER_CHIP = '#2a86ee';

  /* ---------------- scena (karty i żetony na stole) ---------------- */
  function fitStage(wrap, stage, W, H, max) {
    max = max || 1.75;
    stage.style.width = W + 'px';
    stage.style.height = H + 'px';
    const apply = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      const k = Math.min(w / W, h / H, max);
      stage.style.transform = `translate(-50%, -50%) scale(${k})`;
    };
    apply();
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(apply); ro.observe(wrap); } else window.addEventListener('resize', apply);
    return { apply, disconnect() { if (ro) ro.disconnect(); else window.removeEventListener('resize', apply); } };
  }

  class Scene {
    constructor(stage, shoe) { this.stage = stage; this.shoe = shoe || [320, -120]; }
    card(c, x, y, o) {
      o = o || {};
      const n = cardEl(c, !o.up);
      const from = o.from || this.shoe;
      n.style.transition = 'none';
      n.style.transform = `translate(${from[0]}px, ${from[1]}px) rotate(-28deg)`;
      if (o.z) n.style.zIndex = o.z;
      this.stage.appendChild(n);
      n.getBoundingClientRect();
      n.style.transition = '';
      const go = () => { n.style.transform = `translate(${x}px, ${y}px) rotate(${o.rot || 0}deg)`; };
      setTimeout(go, Math.max(16, (o.delay || 0) * speed()));
      n._x = x; n._y = y;
      return n;
    }
    move(n, x, y, rot) { n.style.transform = `translate(${x}px, ${y}px) rotate(${rot || 0}deg)`; n._x = x; n._y = y; }
    stack(amount, x, y, o) {
      o = o || {};
      const st = stackSVG(amount, o.d || 34, o.perCol);
      const n = el('div', { class: 'stack' + (o.cls ? ' ' + o.cls : ''), html: st.svg });
      if (o.label !== false && settings.showAmounts) n.appendChild(el('span', { class: 'amt', text: fmt(amount) }));
      n._w = st.w; n._h = st.h; n._amount = amount;
      const off = o.align === 'left' ? 0 : o.align === 'right' ? st.w : st.w / 2;
      const tx = x - off, ty = y - st.h;
      if (o.from) {
        n.style.transition = 'none';
        n.style.transform = `translate(${o.from[0] - off}px, ${o.from[1] - st.h}px)`;
        n.style.opacity = '0';
        this.stage.appendChild(n);
        n.getBoundingClientRect();
        n.style.transition = '';
        setTimeout(() => { n.style.transform = `translate(${tx}px, ${ty}px)`; n.style.opacity = '1'; }, 20);
      } else {
        n.style.transform = `translate(${tx}px, ${ty}px)`;
        this.stage.appendChild(n);
      }
      return n;
    }
    take(n, to) {
      if (!n) return;
      n.style.transform = `translate(${to[0] - n._w / 2}px, ${to[1] - n._h}px)`;
      n.style.opacity = '0';
      setTimeout(() => n.remove(), 700);
    }
    tag(text, x, y, cls) {
      const n = el('div', { class: 'seat-tag' + (cls ? ' ' + cls : ''), text });
      n.style.left = x + 'px'; n.style.top = y + 'px';
      this.stage.appendChild(n);
      return n;
    }
    clear() { this.stage.querySelectorAll('.card, .stack, .seat-tag').forEach((n) => n.remove()); }
  }
  function highlight(els, idx) {
    if (!idx || !idx.length) { els.forEach((c) => c.classList.remove('hl', 'dim')); return; }
    els.forEach((c, i) => { const on = idx.indexOf(i) >= 0; c.classList.toggle('hl', on); c.classList.toggle('dim', !on); });
  }
  const clearHL = (els) => els.forEach((c) => c.classList.remove('hl', 'dim'));

  /* ---------------- trener: pytania, druga szansa, rozwiązanie ---------------- */
  class Trainer {
    constructor(o) {
      this.panel = o.panel; this.mode = o.mode; this.scoreEl = o.scoreEl;
      this.stopped = false; this.pending = null; this.keyFn = null;
      this.sess = { steps: 0, first: 0, streak: 0 };
      this.round = { steps: 0, first: 0 };
      this.renderScore();
    }
    stop() {
      this.stopped = true; this._unkeys();
      if (this.pending) { const p = this.pending; this.pending = null; p.reject(ABORT); }
    }
    check() { if (this.stopped) throw ABORT; }
    async wait(ms) { this.check(); await sleep(ms); this.check(); }
    startRound() { this.check(); this.round = { steps: 0, first: 0 }; }
    _keys(fn) { this._unkeys(); this.keyFn = fn; document.addEventListener('keydown', fn); }
    _unkeys() { if (this.keyFn) document.removeEventListener('keydown', this.keyFn); this.keyFn = null; }
    _promise(build) {
      this.check();
      return new Promise((resolve, reject) => {
        this.pending = { resolve, reject };
        const done = (v) => { if (!this.pending) return; this.pending = null; this._unkeys(); resolve(v); };
        build(done);
      });
    }
    _frame(cls) {
      this.panel.innerHTML = '';
      const f = el('div', { class: 'q ' + (cls || '') }, Array.prototype.slice.call(arguments, 1));
      this.panel.appendChild(f);
      return f;
    }
    _head(step) {
      return el('div', { class: 'q-head' },
        el('div', { class: 'q-title', html: step.title }),
        step.sub ? el('div', { class: 'q-sub', html: step.sub }) : null);
    }
    status(text) {
      this._frame('q-status', el('div', { class: 'q-wait' }, el('span', { class: 'spin' }), el('span', { text })));
    }
    info(html, opts) {
      opts = opts || {};
      return this._promise((done) => {
        const btn = el('button', { class: 'btn primary wide', type: 'button', html: (opts.button || 'Dalej') + ' ' + ICON.next, onclick: () => done(true) });
        this._frame('q-info', el('div', { class: 'q-msg', html }), btn);
        this._keys((e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); done(true); } });
      });
    }
    ask(step) {
      const t0 = Date.now();
      return this._promise((done) => {
        let attempts = 0, locked = false;
        const frame = this._frame('q-' + step.type, this._head(step));
        if (step.pre) frame.appendChild(el('div', { class: 'q-pre', html: step.pre }));
        const line = el('div', { class: 'q-line', html: step.hint || '' });
        frame.appendChild(line);
        const finishOk = () => {
          locked = true;
          this._record(step, attempts === 1 ? 'first' : 'second', Date.now() - t0);
          frame.classList.add('ok');
          vibrate(12);
          if (step.after) step.after(true);
          setTimeout(() => done({ ok: true, attempts }), 450 * speed());
        };
        const finishFail = () => {
          locked = true;
          this._record(step, 'fail', Date.now() - t0);
          vibrate([40, 60, 40]);
          if (step.after) step.after(false);
          setTimeout(() => this._solution(step, () => done({ ok: false, attempts })), 280);
        };
        const submit = (ok) => {
          if (locked) return true;
          attempts++;
          if (ok) { finishOk(); return true; }
          if (attempts >= 2) { finishFail(); return true; }
          frame.classList.remove('shake'); void frame.offsetWidth; frame.classList.add('shake');
          line.textContent = 'Źle — masz jeszcze jedną szansę';
          line.className = 'q-line bad';
          vibrate(30);
          return false;
        };
        const isLocked = () => locked;
        if (step.type === 'number') this._numberUI(frame, step, submit, isLocked);
        else if (step.type === 'choice') this._choiceUI(frame, step, submit, isLocked);
        else if (step.type === 'multi') this._multiUI(frame, step, submit, isLocked);
      });
    }
    _numberUI(frame, step, submit, isLocked) {
      let buf = '';
      const val = el('span', { class: 'val', text: '0' });
      const disp = el('div', { class: 'disp empty' }, val, step.unit ? el('span', { class: 'unit', text: step.unit }) : null);
      const upd = () => { val.textContent = buf ? fmtBuf(buf) : '0'; disp.classList.toggle('empty', !buf); };
      const press = (k) => {
        if (isLocked()) return;
        disp.classList.remove('wrong');
        if (k === 'ok') {
          if (!buf) return;
          const v = parseNum(buf);
          const ok = approx(v, step.expected);
          const final = submit(ok);
          if (!ok && !final) { buf = ''; upd(); disp.classList.add('wrong'); }
          return;
        }
        if (k === 'del') buf = buf.slice(0, -1);
        else if (k === 'clr') buf = '';
        else if (k === ',') { if (buf.indexOf(',') < 0) buf = (buf || '0') + ','; }
        else {
          const parts = buf.split(',');
          if (parts.length > 1) { if (parts[1].length >= 2) return; } else if (parts[0].length >= 9) return;
          buf = buf === '0' ? k : buf + k;
        }
        upd();
      };
      const pad = el('div', { class: 'keypad' });
      ['7', '8', '9', 'del', '4', '5', '6', 'clr', '1', '2', '3', 'ok', '0', ','].forEach((k) => {
        const label = k === 'del' ? ICON.backspace : k === 'clr' ? 'C' : k === 'ok' ? 'OK' : k;
        const cls = 'key k-' + (k === ',' ? 'comma' : k);
        pad.appendChild(el('button', { class: cls, type: 'button', html: label, 'aria-label': k === 'del' ? 'Usuń' : k === 'clr' ? 'Wyczyść' : null, onclick: () => press(k) }));
      });
      frame.appendChild(disp);
      frame.appendChild(pad);
      this._keys((e) => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (/^[0-9]$/.test(e.key)) press(e.key);
        else if (e.key === ',' || e.key === '.') press(',');
        else if (e.key === 'Backspace') press('del');
        else if (e.key === 'Escape') press('clr');
        else if (e.key === 'Enter') press('ok');
        else return;
        e.preventDefault();
      });
    }
    _choiceUI(frame, step, submit, isLocked) {
      const grid = el('div', { class: 'choices' + (step.cols === 2 ? ' cols-2' : '') });
      const btns = step.options.map((o, i) => {
        const b = el('button', { class: 'choice' + (step.big ? ' big' : ''), type: 'button', html: o.label });
        b.onclick = () => {
          if (isLocked() || b.disabled) return;
          const ok = step.correct.indexOf(o.key) >= 0;
          if (ok) b.classList.add('right'); else { b.classList.add('wrong'); b.disabled = true; }
          const final = submit(ok);
          if (final && !ok) btns.forEach((x, j) => { if (step.correct.indexOf(step.options[j].key) >= 0) x.classList.add('right'); });
        };
        grid.appendChild(b);
        return b;
      });
      frame.appendChild(grid);
      this._keys((e) => {
        const i = parseInt(e.key, 10);
        if (i >= 1 && i <= btns.length) { e.preventDefault(); btns[i - 1].click(); }
      });
    }
    _multiUI(frame, step, submit, isLocked) {
      const max = step.max || 2;
      let counts = {};
      const total = () => Object.keys(counts).reduce((a, k) => a + counts[k], 0);
      const grid = el('div', { class: 'choices' });
      const btns = {};
      const paint = () => {
        step.options.forEach((o) => {
          const b = btns[o.key], c = counts[o.key] || 0;
          b.classList.toggle('sel', c > 0);
          const old = b.querySelector('.cnt'); if (old) old.remove();
          if (c > 1) b.appendChild(el('span', { class: 'cnt', text: '×' + c }));
        });
        confirm.disabled = total() === 0;
      };
      step.options.forEach((o) => {
        const b = el('button', { class: 'choice', type: 'button', html: o.label });
        b.onclick = () => {
          if (isLocked()) return;
          if (o.key === 'none') counts = counts.none ? {} : { none: 1 };
          else {
            delete counts.none;
            const c = counts[o.key] || 0;
            if (total() < max) counts[o.key] = c + 1;
            else if (c > 0) delete counts[o.key];
          }
          paint();
        };
        btns[o.key] = b;
        grid.appendChild(b);
      });
      const clear = el('button', { class: 'btn', type: 'button', text: 'Wyczyść', onclick: () => { if (!isLocked()) { counts = {}; paint(); } } });
      const confirm = el('button', { class: 'btn primary', type: 'button', html: 'Zatwierdź ' + ICON.check });
      confirm.onclick = () => {
        if (isLocked() || !total()) return;
        const sel = [];
        Object.keys(counts).forEach((k) => { for (let i = 0; i < counts[k]; i++) sel.push(k); });
        sel.sort();
        const id = sel.join('+');
        const ok = step.correct.some((arr) => arr.slice().sort().join('+') === id);
        const final = submit(ok);
        if (!final) { counts = {}; paint(); }
      };
      frame.appendChild(grid);
      frame.appendChild(el('div', { class: 'multi-actions' }, clear, confirm));
      paint();
      this._keys((e) => { if (e.key === 'Enter') { e.preventDefault(); confirm.click(); } });
    }
    _solution(step, next) {
      const sol = (typeof step.solution === 'function' ? step.solution() : step.solution) || {};
      const lines = sol.lines || [];
      this._frame('q-solution',
        el('div', { class: 'sol-head' },
          el('span', { class: 'sol-badge', html: ICON.x }),
          el('div', null, el('div', { class: 'sol-k', text: 'Poprawna odpowiedź' }), el('div', { class: 'sol-v', html: sol.answer || '' }))),
        lines.length ? el('div', { class: 'sol-lines', html: lines.map((l) => `<div class="ln">${l}</div>`).join('') }) : null,
        el('button', { class: 'btn primary wide', type: 'button', html: 'Dalej ' + ICON.next, onclick: next }));
      this._keys((e) => { if (e.key === 'Enter') { e.preventDefault(); next(); } });
    }
    roundEnd() {
      const r = this.round;
      const perfect = r.steps > 0 && r.first === r.steps;
      Stats.round(this.mode, perfect);
      return this._promise((done) => {
        this._frame('q-end',
          el('div', { class: 'end-row' + (perfect ? ' perfect' : ''), html: (perfect ? ICON.check : '') + `<b>${r.first}/${r.steps}</b> za pierwszym razem` }),
          el('button', { class: 'btn primary wide big', type: 'button', html: 'Następne rozdanie ' + ICON.next, onclick: () => done(true) }));
        this._keys((e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); done(true); } });
      });
    }
    _record(step, result, ms) {
      this.sess.steps++; this.round.steps++;
      if (result === 'first') { this.sess.first++; this.round.first++; this.sess.streak++; } else this.sess.streak = 0;
      Stats.add(this.mode, step.tag, step.tagLabel, result, ms, this.sess.streak);
      this.renderScore(result === 'first');
    }
    renderScore(bump) {
      if (!this.scoreEl) return;
      const s = this.sess;
      const acc = s.steps ? Math.round((s.first / s.steps) * 100) + '%' : '–';
      this.scoreEl.innerHTML = `<span class="pill streak${bump ? ' bump' : ''}" title="Seria poprawnych odpowiedzi">${ICON.flame}${s.streak}</span><span class="pill acc" title="Trafność za pierwszym razem">${ICON.target}${acc}</span>`;
    }
  }

  function toast(text, ms) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), ms || 2200);
  }

  Object.assign(KE, {
    el, rnd, randInt, pick, shuffle, weighted, randBet,
    fmt, fmtOdds, fmtMul, parseNum, approx, groupInt,
    store, Stats, ICON, shade, sleep, speed, vibrate, toast,
    SUIT_PATH, suitSVG, RANK, SUIT_CH, cardName, cardEl, cardFace,
    CHIPS, breakdown, stackSVG, chipTopSVG, unitStackG, unitStackSVG, PLAYER_CHIP,
    fitStage, Scene, Trainer, highlight, clearHL,
  });
})();
