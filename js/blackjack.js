/* Krupier Extra — blackjack: wypłaty 3:2, pełne rozdania, gra krupiera (stoi na miękkiej 17) */
(function () {
  'use strict';
  const KE = window.KE;
  const { el, fmt, randInt, pick, shuffle, weighted, Scene, randBet } = KE;

  const W = 360, H = 500;
  const SUITS = ['S', 'H', 'D', 'C'];
  const drawR = (r) => ({ r, s: pick(SUITS) });
  const draw = () => drawR(randInt(2, 14));
  const ten = () => drawR(pick([10, 11, 12, 13]));
  const cv = (c) => (c.r === 14 ? 11 : Math.min(c.r, 10));
  function val(cards) {
    let t = 0, a = 0;
    cards.forEach((c) => { t += cv(c); if (c.r === 14) a++; });
    while (t > 21 && a) { t -= 10; a--; }
    return { total: t, soft: a > 0 };
  }
  const isBJ = (cards, split) => !split && cards.length === 2 && val(cards).total === 21;
  const BOXES = { 1: [[180, 440]], 2: [[252, 428], [108, 428]], 3: [[292, 412], [180, 442], [68, 412]] };
  const TRAY = [180, 2];
  const bandY = (x, R) => -70 + Math.sqrt((R || 271) * (R || 271) - (x - 180) * (x - 180));
  const cvText = (c) => (c.r === 14 ? 'A' : c.r > 10 ? KE.RANK[c.r] + '(10)' : String(c.r));

  function tableSVG(boxes) {
    const ry = 300, yc = H - 6 - ry;
    const arc = (R, dx) => { const y = bandY(180 - dx, R); return `M ${180 - dx} ${y.toFixed(1)} A ${R} ${R} 0 0 0 ${180 + dx} ${y.toFixed(1)}`; };
    let s = `<svg class="table" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`;
    s += `<defs><radialGradient id="bjF" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#1b8f53"/><stop offset=".6" stop-color="#0f683a"/><stop offset="1" stop-color="#083e22"/></radialGradient>`;
    s += `<linearGradient id="bjR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b3f22"/><stop offset="1" stop-color="#2b160b"/></linearGradient>`;
    s += `<path id="bjT1" d="${arc(232, 150)}"/><path id="bjT2" d="${arc(249, 158)}"/><path id="bjT3" d="${arc(276, 168)}"/></defs>`;
    s += `<path d="M -140 18 H ${W + 140} V ${yc} A 320 ${ry} 0 0 1 -140 ${yc} Z" fill="url(#bjF)"/>`;
    s += `<path d="M -126 ${yc} A 306 ${ry - 14} 0 0 0 ${W + 126} ${yc}" fill="none" stroke="rgba(242,216,143,.3)" stroke-width="1.2"/>`;
    s += `<path d="M -140 ${yc} A 320 ${ry} 0 0 0 ${W + 140} ${yc}" fill="none" stroke="url(#bjR)" stroke-width="18"/>`;
    s += `<path d="M -131 ${yc} A 311 ${ry - 9} 0 0 0 ${W + 131} ${yc}" fill="none" stroke="rgba(255,220,180,.18)" stroke-width="1.5"/>`;
    s += tray();
    s += `<text class="felt-print" font-size="15"><textPath href="#bjT1" xlink:href="#bjT1" startOffset="50%" text-anchor="middle">BLACKJACK PŁACI 3 DO 2</textPath></text>`;
    s += `<text class="felt-print sm" font-size="9"><textPath href="#bjT2" xlink:href="#bjT2" startOffset="50%" text-anchor="middle">KRUPIER STOI NA KAŻDEJ 17, TAKŻE MIĘKKIEJ</textPath></text>`;
    s += `<path d="${arc(258, 172)}" fill="none" stroke="rgba(246,236,205,.7)" stroke-width="1.3"/><path d="${arc(284, 178)}" fill="none" stroke="rgba(246,236,205,.7)" stroke-width="1.3"/>`;
    s += `<text class="felt-print sm" font-size="9.5"><textPath href="#bjT3" xlink:href="#bjT3" startOffset="50%" text-anchor="middle">UBEZPIECZENIE PŁACI 2 DO 1</textPath></text>`;
    boxes.forEach((b, i) => {
      s += `<g class="spot" data-k="box${i}"><circle class="ring" cx="${b[0]}" cy="${b[1]}" r="27"/></g>`;
    });
    return s + '</svg>';
  }
  function tray() {
    let s = `<rect x="74" y="-6" width="212" height="24" rx="6" fill="#0d0d0d" stroke="rgba(242,216,143,.35)"/>`;
    KE.CHIPS.forEach((c, i) => {
      const x = 82 + i * 28.5;
      s += `<rect x="${x}" y="-2" width="22" height="15" rx="3" fill="${c.base}"/><rect x="${x}" y="-2" width="22" height="3" rx="1.5" fill="#fff" opacity=".25"/>`;
      s += `<rect x="${x + 5}" y="1" width="2" height="12" fill="${c.edge}" opacity=".7"/><rect x="${x + 15}" y="1" width="2" height="12" fill="${c.edge}" opacity=".7"/>`;
    });
    return s;
  }
  KE.drawTray = tray;

  /* ---------- generowanie ---------- */
  function genDealer(forceAce) {
    const cards = [forceAce ? drawR(14) : Math.random() < 0.14 ? drawR(14) : draw(), draw()];
    while (val(cards).total < 17) cards.push(draw());
    return cards;
  }
  function playTo(cards, target) { while (val(cards).total < target) cards.push(draw()); return cards; }
  function genBox(cfg, dealer, dBJ, allowSplit) {
    const bet = randBet(cfg.min, cfg.max);
    let kind = weighted(dBJ ? { normal: 70, bj: 30 } : { normal: 46, double: 16, split: allowSplit ? 14 : 0, bj: 14, bust: 13 });
    if (kind === 'split' && !allowSplit) kind = 'normal';
    const box = { bet, kind, hands: [], ins: 0 };
    if (dealer[0].r === 14 && kind !== 'bj' && Math.random() < 0.5) box.ins = bet / 2;
    if (kind === 'bj') box.hands.push({ cards: shuffle([drawR(14), ten()]), bet });
    else if (kind === 'double') {
      const tot = randInt(9, 11), a = randInt(2, Math.min(9, tot - 2));
      box.hands.push({ cards: [drawR(a), drawR(tot - a), draw()], bet: bet * 2, doubled: true, base: bet });
    } else if (kind === 'split') {
      const r = pick([2, 3, 6, 7, 8, 8, 9, 14, 14]);
      for (let h = 0; h < 2; h++) {
        const cards = [drawR(r), draw()];
        if (r !== 14) playTo(cards, randInt(13, 18));
        box.hands.push({ cards, bet, split: true });
      }
    } else if (kind === 'bust') {
      const a = randInt(2, 10), b = Math.max(2, Math.min(10, randInt(12, 16) - a));
      box.hands.push({ cards: [drawR(a === 10 ? pick([10, 11, 12, 13]) : a), drawR(b === 10 ? pick([10, 11, 12, 13]) : b), ten()], bet });
    } else {
      let cards;
      do { cards = [draw(), draw()]; } while (isBJ(cards));
      playTo(cards, randInt(12, 19));
      box.hands.push({ cards, bet });
    }
    return box;
  }
  function settle(hand, dealer) {
    const p = val(hand.cards), d = val(dealer);
    const pBJ = isBJ(hand.cards, hand.split), dBJ = isBJ(dealer);
    const b = hand.bet;
    if (pBJ && dBJ) return { pay: 0, res: 'push', lines: ['Blackjack u gracza i u krupiera → remis (zwrot)', 'Wypłata: <b>0</b>'] };
    if (pBJ) return { pay: b * 1.5, res: 'win', lines: ['Blackjack → płaci 3:2', `${fmt(b)} × 1,5 = <b>${fmt(b * 1.5)}</b>`] };
    if (dBJ) return { pay: 0, res: 'lose', lines: ['Krupier ma blackjacka → przegrana', 'Wypłata: <b>0</b>'] };
    const dbl = hand.doubled ? [`Podwojenie: stawka ${fmt(hand.base)} × 2 = ${fmt(b)}`] : [];
    if (p.total > 21) return { pay: 0, res: 'lose', lines: [`Gracz ma ${p.total} — fura → przegrana`, 'Wypłata: <b>0</b>'] };
    if (d.total > 21) return { pay: b, res: 'win', lines: dbl.concat([`Krupier ma ${d.total} — fura → wygrana 1:1`, `Wypłata: <b>${fmt(b)}</b>`]) };
    if (p.total > d.total) return { pay: b, res: 'win', lines: dbl.concat([`${p.total} przeciw ${d.total} → wygrana 1:1`, `Wypłata: <b>${fmt(b)}</b>`]) };
    if (p.total === d.total) return { pay: 0, res: 'push', lines: [`${p.total} przeciw ${d.total} → remis (zwrot)`, 'Wypłata: <b>0</b>'] };
    return { pay: 0, res: 'lose', lines: [`${p.total} przeciw ${d.total} → przegrana`, 'Wypłata: <b>0</b>'] };
  }
  function totalLines(cards) {
    const v = val(cards);
    const raw = cards.reduce((a, c) => a + cv(c), 0);
    const lines = [`${cards.map(cvText).join(' + ')}`];
    if (cards.some((c) => c.r === 14)) {
      if (raw !== v.total) lines.push(`As liczony jako 1 → ${v.total}`);
      else lines.push(`As liczony jako 11 → ${v.total}${v.total <= 21 ? ' (miękka)' : ''}`);
    } else lines.push(`Suma: ${v.total}`);
    if (isBJ(cards)) lines.push('To blackjack (as + dziesiątka w dwóch kartach)');
    else if (v.total > 21) lines.push('Powyżej 21 — fura');
    return lines;
  }

  /* ---------- rysowanie ---------- */
  function dealerXY(i, n) { const x0 = 180 - (54 + (n - 1) * 24) / 2; return [x0 + i * 24, 30]; }
  function handXY(hx, by, i, n, step, vstep) {
    const x0 = hx - 27 - ((n - 1) * step) / 2;
    return [x0 + i * step, by - 116 - vstep * i];
  }

  async function dealRound(ctx, sc, boxes, pos, dealer, opts) {
    const T = ctx.T;
    let t = 0;
    const dEls = [];
    boxes.forEach((box, bi) => {
      const [bx, by] = pos[bi];
      box.els = [];
      box.hands.forEach((h, hi) => {
        const split = box.hands.length === 2;
        const hx = split ? bx + (hi === 0 ? 38 : -38) : bx;
        h.els = h.cards.map((c, i) => {
          const p = handXY(hx, by, i, h.cards.length, split ? 10 : 16, split ? 15 : 16);
          const e = sc.card(c, p[0], p[1], { delay: t, up: true, z: 10 + i });
          t += 70;
          return e;
        });
      });
    });
    const nD = opts && opts.dealerCount ? opts.dealerCount : dealer.length;
    for (let i = 0; i < nD; i++) {
      const p = dealerXY(i, dealer.length);
      dEls.push(sc.card(dealer[i], p[0], p[1], { delay: t, up: true, z: 10 + i }));
      t += 120;
    }
    await T.wait(t + 600);
    return dEls;
  }
  function placeBets(sc, box, bx, by) {
    box.stacks = [];
    if (box.hands.length === 2) {
      box.stacks.push(sc.stack(box.hands[0].bet, bx + 15, by + 10, { d: 28 }));
      box.stacks.push(sc.stack(box.hands[1].bet, bx - 15, by + 10, { d: 28 }));
    } else if (box.hands[0].doubled) {
      box.stacks.push(sc.stack(box.hands[0].base, bx - 15, by + 10, { d: 28 }));
      box.stacks.push(sc.stack(box.hands[0].base, bx + 15, by + 10, { d: 28 }));
    } else box.stacks.push(sc.stack(box.bet, bx, by + 10, { d: 32 }));
    if (box.ins) box.insStack = sc.stack(box.ins, bx, bandY(bx) + 10, { d: 24 });
  }
  const spot = (stage, i, on) => { const g = stage.querySelector(`.spot[data-k="box${i}"]`); if (g) g.classList.toggle('on', on); };

  /* ---------- tryby ---------- */
  async function roundQuick(ctx) {
    const T = ctx.T, cfg = ctx.cfg;
    T.startRound();
    const stage = ctx.setFixed(W, H);
    const pos = BOXES[1];
    stage.innerHTML = tableSVG(pos);
    const sc = new Scene(stage, [330, -120]);
    const kind = weighted({ bj: 72, ins: 16, bj10: 12 });
    const bet = randBet(cfg.min, cfg.max);
    let dealer, hand, box;
    if (kind === 'ins') {
      dealer = [drawR(14), ten()];
      let cards; do { cards = [draw(), draw()]; } while (isBJ(cards));
      hand = { cards, bet };
      box = { bet, hands: [hand], ins: bet / 2 };
    } else {
      hand = { cards: shuffle([drawR(14), ten()]), bet };
      box = { bet, hands: [hand], ins: 0 };
      if (kind === 'bj10') { const up = Math.random() < 0.5 ? drawR(14) : ten(); dealer = [up]; do { dealer[1] = draw(); } while (isBJ(dealer)); playTo(dealer, 17); }
      else dealer = [drawR(randInt(2, 9))];
    }
    placeBets(sc, box, pos[0][0], pos[0][1]);
    await dealRound(ctx, sc, [box], pos, dealer);
    spot(stage, 0, true);
    if (kind === 'ins') {
      await T.ask({
        type: 'number', title: 'Wypłata — ubezpieczenie', sub: `ubezp. ${fmt(box.ins)} zł`, unit: 'zł', expected: box.ins * 2,
        tag: 'bj:ins', tagLabel: 'Blackjack · ubezpieczenie 2:1',
        solution: () => ({ answer: fmt(box.ins * 2) + ' zł', lines: ['Krupier ma blackjacka → ubezpieczenie płaci 2:1', `${fmt(box.ins)} × 2 = <b>${fmt(box.ins * 2)}</b>`] }),
      });
      sc.stack(box.ins * 2, 220, bandY(220) + 10, { d: 24, from: TRAY, cls: 'pay' });
      sc.take(box.stacks[0], TRAY);
    } else {
      await T.ask({
        type: 'number', title: 'Wypłata za blackjacka', sub: `stawka ${fmt(bet)} zł`, unit: 'zł', expected: bet * 1.5,
        tag: 'bj:bj', tagLabel: 'Blackjack · wypłata 3:2',
        solution: () => ({ answer: fmt(bet * 1.5) + ' zł', lines: ['Blackjack płaci 3:2, czyli stawka + połowa stawki', `${fmt(bet)} + ${fmt(bet / 2)} = <b>${fmt(bet * 1.5)}</b>`] }),
      });
      sc.stack(bet * 1.5, pos[0][0] + 46, pos[0][1] + 10, { d: 30, from: TRAY, cls: 'pay' });
    }
    spot(stage, 0, false);
    await T.wait(350);
    await T.roundEnd();
  }

  async function roundFull(ctx) {
    const T = ctx.T, cfg = ctx.cfg;
    T.startRound();
    const stage = ctx.setFixed(W, H);
    const nBoxes = randInt(1, Math.max(1, Math.min(3, cfg.boxes || 3)));
    const pos = BOXES[nBoxes];
    stage.innerHTML = tableSVG(pos);
    const sc = new Scene(stage, [330, -120]);
    const dealer = genDealer(Math.random() < 0.22);
    const dBJ = isBJ(dealer);
    const boxes = pos.map(() => genBox(cfg, dealer, dBJ, nBoxes <= 2));
    boxes.forEach((b, i) => { placeBets(sc, b, pos[i][0], pos[i][1]); sc.tag('BOX ' + (i + 1), pos[i][0], pos[i][1] + 34); });
    await dealRound(ctx, sc, boxes, pos, dealer);
    const dv = val(dealer);
    await T.ask({
      type: 'number', title: 'Ile ma krupier?', unit: 'pkt', expected: dv.total,
      tag: 'bj:dealer', tagLabel: 'Blackjack · suma krupiera',
      solution: () => ({ answer: String(dv.total), lines: totalLines(dealer) }),
    });
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (!box.ins) continue;
      spot(stage, i, true);
      const pay = dBJ ? box.ins * 2 : 0;
      await T.ask({
        type: 'number', title: `Ubezpieczenie — box ${i + 1}`, sub: `ubezp. ${fmt(box.ins)} zł`, unit: 'zł', expected: pay,
        tag: 'bj:ins', tagLabel: 'Blackjack · ubezpieczenie 2:1',
        solution: () => ({ answer: fmt(pay) + ' zł', lines: dBJ ? ['Krupier ma blackjacka → ubezpieczenie płaci 2:1', `${fmt(box.ins)} × 2 = <b>${fmt(pay)}</b>`] : ['Krupier nie ma blackjacka → ubezpieczenie przegrywa', 'Wypłata: <b>0</b>'] }),
      });
      if (pay) sc.stack(pay, pos[i][0] + 30, bandY(pos[i][0] + 30) + 10, { d: 24, from: TRAY, cls: 'pay' });
      else sc.take(box.insStack, TRAY);
      spot(stage, i, false);
    }
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      for (let h = 0; h < box.hands.length; h++) {
        const hand = box.hands[h];
        const r = settle(hand, dealer);
        spot(stage, i, true);
        const others = boxes.flatMap((b, j) => b.hands.flatMap((hh, k) => (j === i && k === h ? [] : hh.els)));
        others.forEach((e) => e.classList.add('dim'));
        const sub = box.hands.length === 2 ? `ręka ${h + 1} · stawka ${fmt(hand.bet)} zł` : `stawka ${fmt(hand.bet)} zł${hand.doubled ? ' (podwojona)' : ''}`;
        const kindTag = isBJ(hand.cards, hand.split) ? 'bj:bj' : hand.doubled ? 'bj:double' : hand.split ? 'bj:split' : 'bj:hand';
        const kindLabel = { 'bj:bj': 'wypłata 3:2', 'bj:double': 'podwojenie', 'bj:split': 'split', 'bj:hand': 'zwykła ręka' }[kindTag];
        await T.ask({
          type: 'number', title: `Wypłata — box ${i + 1}`, sub, unit: 'zł', expected: r.pay,
          tag: kindTag, tagLabel: 'Blackjack · ' + kindLabel,
          solution: () => ({ answer: fmt(r.pay) + ' zł', lines: [`Gracz: ${totalLines(hand.cards)[0]} = ${val(hand.cards).total}`].concat(r.lines) }),
        });
        others.forEach((e) => e.classList.remove('dim'));
        const bx = pos[i][0], by = pos[i][1];
        const stackIdx = box.hands.length === 2 ? h : 0;
        if (r.pay > 0) sc.stack(r.pay, bx + (box.hands.length === 2 ? (h === 0 ? 48 : -48) : 46), by + 10, { d: 28, from: TRAY, cls: 'pay' });
        else if (r.res === 'lose') { if (box.hands.length === 2) sc.take(box.stacks[stackIdx], TRAY); else box.stacks.forEach((s) => sc.take(s, TRAY)); }
        spot(stage, i, false);
        await T.wait(200);
      }
    }
    await T.roundEnd();
  }

  async function roundCount(ctx) {
    const T = ctx.T;
    T.startRound();
    const stage = ctx.setFixed(W, H);
    stage.innerHTML = tableSVG([]);
    const sc = new Scene(stage, [330, -120]);
    let cards = [Math.random() < 0.3 ? drawR(14) : draw(), Math.random() < 0.25 ? drawR(14) : draw()];
    if (isBJ(cards) && Math.random() < 0.7) cards[1] = drawR(randInt(2, 9));
    const els = [];
    const lay = () => cards.forEach((c, i) => { const p = dealerXY(i, cards.length); if (els[i]) sc.move(els[i], p[0], p[1]); });
    for (let i = 0; i < 2; i++) { const p = dealerXY(i, 2); els.push(sc.card(cards[i], p[0], p[1], { delay: i * 160, up: true, z: 10 + i })); }
    await T.wait(800);
    for (;;) {
      const v = val(cards);
      if (v.total > 21 || isBJ(cards)) break;
      const should = v.total < 17 ? 'hit' : 'stand';
      await T.ask({
        type: 'choice', cols: 2, big: true, title: 'Krupier: dobiera czy stoi?', sub: `${cards.length} karty`,
        options: [{ key: 'hit', label: 'Dobieram' }, { key: 'stand', label: 'Stoję' }], correct: [should],
        tag: 'bj:action' + (v.soft && v.total === 17 ? ':s17' : ''), tagLabel: v.soft && v.total === 17 ? 'Blackjack · miękka 17' : 'Blackjack · dobiera czy stoi',
        solution: () => ({ answer: should === 'hit' ? 'Dobieram' : 'Stoję', lines: totalLines(cards).concat([should === 'hit' ? `${v.total} to mniej niż 17 → krupier dobiera` : `${v.total}${v.soft && v.total === 17 ? ' (miękka 17)' : ''} → krupier stoi na każdej 17`]) }),
      });
      if (should === 'stand') break;
      cards.push(draw());
      const p = dealerXY(cards.length - 1, cards.length);
      els.push(sc.card(cards[cards.length - 1], p[0], p[1], { up: true, z: 10 + cards.length }));
      lay();
      await T.wait(650);
    }
    const v = val(cards);
    await T.ask({
      type: 'number', title: 'Ile ma krupier?', unit: 'pkt', expected: v.total,
      tag: 'bj:total', tagLabel: 'Blackjack · liczenie kart',
      solution: () => ({ answer: String(v.total), lines: totalLines(cards) }),
    });
    await T.roundEnd();
  }

  KE.BJ = { val, isBJ, settle };

  KE.games.blackjack = {
    id: 'blackjack', title: 'Blackjack', sub: '3:2 · rozdania · gra krupiera',
    spec: [
      { type: 'modes', key: 'mode', label: 'Tryb', options: [
        { v: 'payouts', t: 'Wypłaty 3:2', d: 'Szybkie liczenie blackjacka (25 → 37,50) i ubezpieczenia 2:1' },
        { v: 'full', t: 'Pełne rozdania', d: 'Kilka boxów: wygrane, remisy, fury, podwojenia, splity, ubezpieczenie' },
        { v: 'count', t: 'Gra krupiera', d: 'Dobierasz czy stoisz (stoi na miękkiej 17) i ile ma krupier' },
      ] },
      { type: 'range', keys: ['min', 'max'], label: 'Stawki (min / maks)', unit: 'zł', step: 5, min: 5, max: 100000, show: (c) => c.mode !== 'count' },
      { type: 'select', key: 'boxes', label: 'Maksymalna liczba boxów', options: [{ v: 1, t: '1' }, { v: 2, t: '2' }, { v: 3, t: '3' }], show: (c) => c.mode === 'full' },
    ],
    modeLabel: (c) => ({ payouts: 'Wypłaty 3:2', full: 'Pełne rozdania', count: 'Gra krupiera' })[c.mode],
    start(ctx) {
      (async () => {
        try {
          for (;;) {
            const m = ctx.cfg.mode;
            if (m === 'full') await roundFull(ctx); else if (m === 'count') await roundCount(ctx); else await roundQuick(ctx);
          }
        } catch (e) { if (e !== KE.ABORT) { console.error(e); ctx.fail(e); } }
      })();
    },
  };
})();
