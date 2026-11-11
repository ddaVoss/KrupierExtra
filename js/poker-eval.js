/* Krupier Extra — ocena układów pokerowych (5–7 kart, joker, dwa układy w Royal) */
(function () {
  'use strict';
  const KE = window.KE;
  const { randInt, pick, shuffle } = KE;

  // kategorie: 0 brak, 1 para, 2 dwie pary, 3 trójka, 4 strit, 5 kolor, 6 ful, 7 kareta, 8 mały poker, 9 duży poker, 10 piątka
  const CAT_KEYS = ['none', 'pair', 'two', 'trips', 'straight', 'flush', 'full', 'quads', 'sf', 'royal', 'five'];
  const LABEL = { none: 'Brak układu', ak: 'As i król', pair: 'Para', two: 'Dwie pary', trips: 'Trójka', straight: 'Strit', flush: 'Kolor', full: 'Ful', quads: 'Kareta', sf: 'Mały poker', royal: 'Duży poker', five: 'Piątka' };
  const SHORT = { none: 'Brak', ak: 'As i król', pair: 'Para', two: '2 pary', trips: 'Trójka', straight: 'Strit', flush: 'Kolor', full: 'Ful', quads: 'Kareta', sf: 'Mały poker', royal: 'Duży poker', five: 'Piątka' };
  const RN = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: '10', 9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2' };
  const SUITS = ['S', 'H', 'D', 'C'];
  const JOKER = { r: 0, s: 'X', joker: true };

  const comboCache = {};
  function combos(n, k) {
    const key = n + ':' + k;
    if (comboCache[key]) return comboCache[key];
    const out = [];
    (function rec(start, acc) {
      if (acc.length === k) { out.push(acc.slice()); return; }
      for (let i = start; i < n; i++) { acc.push(i); rec(i + 1, acc); acc.pop(); }
    })(0, []);
    comboCache[key] = out;
    return out;
  }
  function subsets(arr, k) { return combos(arr.length, k).map((ix) => ix.map((i) => arr[i])); }

  function eval5(cs) {
    const counts = {};
    cs.forEach((c) => { counts[c.r] = (counts[c.r] || 0) + 1; });
    const groups = Object.keys(counts).map((r) => [+r, counts[r]]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const flush = cs.every((c) => c.s === cs[0].s);
    const uniq = groups.map((g) => g[0]).sort((a, b) => b - a);
    let sh = 0;
    if (uniq.length === 5) {
      if (uniq[0] - uniq[4] === 4) sh = uniq[0];
      else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) sh = 5;
    }
    let cat, tb;
    if (groups[0][1] === 5) { cat = 10; tb = [groups[0][0]]; }
    else if (sh && flush) { cat = sh === 14 ? 9 : 8; tb = [sh]; }
    else if (groups[0][1] === 4) { cat = 7; tb = [groups[0][0], groups[1][0]]; }
    else if (groups[0][1] === 3 && groups[1][1] === 2) { cat = 6; tb = [groups[0][0], groups[1][0]]; }
    else if (flush) { cat = 5; tb = cs.map((c) => c.r).sort((a, b) => b - a); }
    else if (sh) { cat = 4; tb = [sh]; }
    else if (groups[0][1] === 3) { cat = 3; tb = groups.map((g) => g[0]); }
    else if (groups[0][1] === 2 && groups[1][1] === 2) { cat = 2; tb = groups.map((g) => g[0]); }
    else if (groups[0][1] === 2) { cat = 1; tb = groups.map((g) => g[0]); }
    else { cat = 0; tb = uniq; }
    return { cat, tb };
  }
  function score(e) { let s = e.cat; for (let i = 0; i < 5; i++) s = s * 16 + (e.tb[i] || 0); return s; }

  function withJoker(hand, j) {
    let b = null;
    for (const s of SUITS) {
      for (let r = 2; r <= 14; r++) {
        const h = hand.slice(); h[j] = { r, s };
        const e = eval5(h); e.score = score(e);
        if (!b || e.score > b.score) { b = e; b.jokerAs = { r, s }; }
      }
    }
    return b;
  }

  /** najlepszy układ 5 z 5–7 kart */
  function best(cards) {
    let b = null;
    const list = cards.length === 5 ? [[0, 1, 2, 3, 4]] : combos(cards.length, 5);
    list.forEach((ix) => {
      const hand = ix.map((i) => cards[i]);
      const j = hand.findIndex((c) => c.joker);
      let e;
      if (j < 0) { e = eval5(hand); e.score = score(e); } else e = withJoker(hand, j);
      if (!b || e.score > b.score) { e.idx = ix; b = e; }
    });
    b.key = CAT_KEYS[b.cat];
    return b;
  }
  const rankOf = (c, e) => (c.joker ? (e.jokerAs ? e.jokerAs.r : 0) : c.r);
  const isAK = (e) => e.cat === 0 && e.tb[0] === 14 && e.tb[1] === 13;
  function labelKey(e, ak) { if (e.cat === 0) return ak && isAK(e) ? 'ak' : 'none'; return CAT_KEYS[e.cat]; }
  /** indeksy kart tworzących układ (bez kickerów) */
  function coreIdx(cards, e, ak) {
    const ix = e.idx;
    if ([4, 5, 6, 8, 9, 10].indexOf(e.cat) >= 0) return ix.slice();
    if (e.cat === 0) {
      if (!(ak && isAK(e))) return [];
      const a = ix.find((i) => rankOf(cards[i], e) === 14), k = ix.find((i) => rankOf(cards[i], e) === 13);
      return [a, k];
    }
    const ranks = e.cat === 2 ? [e.tb[0], e.tb[1]] : [e.tb[0]];
    return ix.filter((i) => ranks.indexOf(rankOf(cards[i], e)) >= 0);
  }
  function describe(e, ak) {
    const t = e.tb, k = labelKey(e, ak);
    switch (k) {
      case 'none': return `Brak układu (najwyższa ${RN[t[0]]})`;
      case 'ak': return 'As i król';
      case 'pair': return `Para ${RN[t[0]]}`;
      case 'two': return `Dwie pary: ${RN[t[0]]} i ${RN[t[1]]}`;
      case 'trips': return `Trójka ${RN[t[0]]}`;
      case 'straight': return `Strit do ${RN[t[0]]}`;
      case 'flush': return `Kolor (najwyższa ${RN[t[0]]})`;
      case 'full': return `Ful: trzy ${RN[t[0]]} + dwie ${RN[t[1]]}`;
      case 'quads': return `Kareta ${RN[t[0]]}`;
      case 'sf': return `Mały poker do ${RN[t[0]]}`;
      case 'royal': return 'Duży poker';
      case 'five': return `Piątka ${RN[t[0]]}`;
    }
    return LABEL[k];
  }
  function compare(a, b) { return a.score === b.score ? 0 : a.score > b.score ? 1 : -1; }

  /* ---------- Royal: dwa układy ---------- */
  const ROYAL_ODDS = { ak: 1, pair: 1, two: 2, trips: 3, straight: 4, flush: 5, full: 7, quads: 20, sf: 50, royal: 100 };
  /**
   * Wszystkie układy w ręce (zbiory kart bez kickerów). Dwa układy są płacone, gdy każdy
   * ma co najmniej jedną kartę, której nie ma drugi. Zwraca najlepszą łączną wypłatę.
   */
  function royalCombos(cards, allow5) {
    const n = cards.length;
    const list = [];
    const byRank = {};
    cards.forEach((c, i) => { (byRank[c.r] = byRank[c.r] || []).push(i); });
    const mask = (arr) => arr.reduce((m, i) => m | (1 << i), 0);
    const pairs = [], trips = [];
    Object.keys(byRank).forEach((rs) => {
      const r = +rs, ix = byRank[r];
      subsets(ix, 2).forEach((s) => pairs.push({ r, m: mask(s) }));
      subsets(ix, 3).forEach((s) => trips.push({ r, m: mask(s) }));
      subsets(ix, 4).forEach((s) => list.push({ key: 'quads', m: mask(s) }));
    });
    pairs.forEach((p) => list.push({ key: 'pair', m: p.m }));
    trips.forEach((t) => list.push({ key: 'trips', m: t.m }));
    for (let i = 0; i < pairs.length; i++) for (let j = i + 1; j < pairs.length; j++) if (pairs[i].r !== pairs[j].r) list.push({ key: 'two', m: pairs[i].m | pairs[j].m });
    trips.forEach((t) => pairs.forEach((p) => { if (p.r !== t.r) list.push({ key: 'full', m: t.m | p.m }); }));
    (n === 5 ? [[0, 1, 2, 3, 4]] : combos(n, 5)).forEach((ix) => {
      const e = eval5(ix.map((i) => cards[i]));
      if (e.cat === 4 || e.cat === 5 || e.cat === 8 || e.cat === 9) list.push({ key: CAT_KEYS[e.cat], m: mask(ix) });
    });
    (byRank[14] || []).forEach((a) => (byRank[13] || []).forEach((k) => list.push({ key: 'ak', m: (1 << a) | (1 << k) })));

    let total = 0;
    const sols = {};
    const add = (parts) => {
      const sum = parts.reduce((a, p) => a + ROYAL_ODDS[p.key], 0);
      if (sum < total) return;
      if (sum > total) { total = sum; for (const k in sols) delete sols[k]; }
      const keys = parts.map((p) => p.key).sort();
      const id = keys.join('+');
      if (!sols[id]) sols[id] = { keys, parts };
    };
    list.forEach((c) => add([c]));
    if (n >= 6 || allow5) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          if ((a.m & ~b.m) && (b.m & ~a.m)) add([a, b]);
        }
      }
    }
    // para i „As i król” płacą tyle samo — jako pojedynczy układ liczy się wyższy (para)
    if (sols.pair && sols.ak) delete sols.ak;
    const answers = Object.keys(sols).map((k) => sols[k]);
    const top = (s) => Math.max.apply(null, s.keys.map((k) => ROYAL_ODDS[k]));
    answers.sort((x, y) => x.keys.length - y.keys.length || top(y) - top(x));
    const best = answers[0] || null;
    let core = [];
    if (best) best.parts.forEach((p) => { for (let i = 0; i < n; i++) if ((p.m >> i) & 1 && core.indexOf(i) < 0) core.push(i); });
    return { total, answers, best, core };
  }
  function comboText(rc) {
    if (!rc.best) return 'Brak układu';
    const keys = rc.best.keys.slice().sort((a, b) => ROYAL_ODDS[b] - ROYAL_ODDS[a]);
    if (keys.length === 1) return `${LABEL[keys[0]]} (${rc.total}:1)`;
    return `${LABEL[keys[0]]} + ${LABEL[keys[1]]} (${ROYAL_ODDS[keys[0]]} + ${ROYAL_ODDS[keys[1]]} = ${rc.total}:1)`;
  }

  /* ---------- talia i generowanie rąk ---------- */
  const ckey = (c) => (c.joker ? 'JK' : c.r + c.s);
  class Deck {
    constructor(joker) {
      this.cards = [];
      SUITS.forEach((s) => { for (let r = 2; r <= 14; r++) this.cards.push({ r, s }); });
      if (joker) this.cards.push(JOKER);
      this.used = {};
    }
    has(c) { return !this.used[ckey(c)] && (!c.joker || this.cards.indexOf(JOKER) >= 0); }
    take(cs) { cs.forEach((c) => { this.used[ckey(c)] = true; }); return cs; }
    give(c) { delete this.used[ckey(c)]; }
    free() { return this.cards.filter((c) => !this.used[ckey(c)]); }
    randomCards(n) { return shuffle(this.free()).slice(0, n); }
  }
  const allRanks = () => [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const distinct = (n, ex) => shuffle(allRanks().filter((r) => !ex || ex.indexOf(r) < 0)).slice(0, n);
  const suitsN = (n) => shuffle(SUITS.slice()).slice(0, n);
  const anySuit = () => pick(SUITS);
  function build(want) {
    let cs = [];
    switch (want) {
      case 'none': case 'high': cs = distinct(5).map((r) => ({ r, s: anySuit() })); break;
      case 'ak': cs = [14, 13].concat(distinct(3, [14, 13])).map((r) => ({ r, s: anySuit() })); break;
      case 'pair': { const p = randInt(2, 14); const ss = suitsN(2); cs = [{ r: p, s: ss[0] }, { r: p, s: ss[1] }].concat(distinct(3, [p]).map((r) => ({ r, s: anySuit() }))); break; }
      case 'two': { const [a, b] = distinct(2); const s1 = suitsN(2), s2 = suitsN(2); cs = [{ r: a, s: s1[0] }, { r: a, s: s1[1] }, { r: b, s: s2[0] }, { r: b, s: s2[1] }, { r: distinct(1, [a, b])[0], s: anySuit() }]; break; }
      case 'trips': { const t = randInt(2, 14); const ss = suitsN(3); cs = ss.map((s) => ({ r: t, s })).concat(distinct(2, [t]).map((r) => ({ r, s: anySuit() }))); break; }
      case 'straight': { const h = randInt(5, 14); const rs = h === 5 ? [14, 2, 3, 4, 5] : [h - 4, h - 3, h - 2, h - 1, h]; cs = rs.map((r) => ({ r, s: anySuit() })); break; }
      case 'flush': { const s = anySuit(); cs = distinct(5).map((r) => ({ r, s })); break; }
      case 'full': { const [t, p] = distinct(2); cs = suitsN(3).map((s) => ({ r: t, s })).concat(suitsN(2).map((s) => ({ r: p, s }))); break; }
      case 'quads': { const q = randInt(2, 14); cs = SUITS.map((s) => ({ r: q, s })).concat([{ r: distinct(1, [q])[0], s: anySuit() }]); break; }
      case 'sf': { const h = randInt(5, 13); const s = anySuit(); const rs = h === 5 ? [14, 2, 3, 4, 5] : [h - 4, h - 3, h - 2, h - 1, h]; cs = rs.map((r) => ({ r, s })); break; }
      case 'royal': { const s = anySuit(); cs = [10, 11, 12, 13, 14].map((r) => ({ r, s })); break; }
      case 'five': { const q = randInt(2, 14); cs = SUITS.map((s) => ({ r: q, s })).concat([JOKER]); break; }
    }
    return cs;
  }
  /** 5 kart dokładnie wskazanej kategorii (bez zabierania z talii) */
  function genCat(deck, want) {
    for (let tries = 0; tries < 500; tries++) {
      const cand = build(want);
      if (!cand.length || !cand.every((c) => deck.has(c))) continue;
      const keys = cand.map(ckey);
      if (keys.some((k, i) => keys.indexOf(k) !== i)) continue;
      const e = best(cand);
      const k = labelKey(e, true);
      const ok = want === 'high' ? e.cat === 0 : want === 'none' ? k === 'none' : k === want;
      if (ok) return shuffle(cand.slice());
    }
    return deck.randomCards(5);
  }

  KE.PE = { CAT_KEYS, LABEL, SHORT, RN, JOKER, SUITS, combos, eval5, best, labelKey, coreIdx, describe, compare, isAK, royalCombos, comboText, ROYAL_ODDS, Deck, genCat, ckey };
})();
