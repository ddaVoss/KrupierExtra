/* Krupier Extra — pokery kasynowe: Royal, Las Vegas (LVP), Hold'em, Hold'em Bonus, American */
(function () {
  'use strict';
  const KE = window.KE, PE = KE.PE;
  const { fmt, fmtOdds, fmtMul, randInt, pick, shuffle, weighted, Scene, randBet, highlight, clearHL } = KE;

  /* ---------- tabele wypłat (ze zdjęcia) ---------- */
  const PAY = {
    royal: {
      bet: { ak: 1, pair: 1, two: 2, trips: 3, straight: 4, flush: 5, full: 7, quads: 20, sf: 50, royal: 100 },
      bonus: { straight: 50, flush: 100, full: 200, quads: 500, sf: 2000, royal: 10000 },
    },
    lvp: {
      bet: { pair: 1, two: 2, trips: 3, straight: 4, flush: 5, full: 7, quads: 20, sf: 50, royal: 100 },
      bonus: { straight: 50, flush: 100, full: 200, quads: 500, sf: 2000, royal: 10000 },
    },
    holdem: {
      bet: { pair: 1, two: 1, trips: 1, straight: 1, flush: 2, full: 3, quads: 10, sf: 25, royal: 50 },
      bonus: { full: 20, quads: 100, sf: 400, royal: 4000 },
    },
    holdemBonus: {
      ante: { pair: 1, two: 1, trips: 1, straight: 1, flush: 1, full: 3, quads: 10, sf: 50, royal: 100 },
      bonus: { pair: 2, two: 3, trips: 5, straight: 10, flush: 20, full: 30, quads: 100, sf: 500, royal: 1000 },
    },
    american: {
      blind: { straight: 1, flush: 1.5, full: 3, quads: 10, sf: 50, royal: 500 },
      bonus: { trips: 3, straight: 4, flush: 7, full: 9, quads: 30, sf: 40, royal: 50 },
    },
  };
  const HOLD_PICKS = ['none', 'pair', 'two', 'trips', 'straight', 'flush', 'full', 'quads', 'sf', 'royal'];
  const GAMES = {
    royal: { id: 'royal', name: 'Royal Poker', short: 'Royal', kind: 'stud', layout: 'stud', ak: true, joker: false, spots: ['insur', 'bonus', 'ante', 'bet'], payOrder: ['ante', 'bet', 'insur', 'bonus'], picks: ['none', 'ak', 'pair', 'two', 'trips', 'straight', 'flush', 'full', 'quads', 'sf', 'royal'] },
    lvp: { id: 'lvp', name: 'Las Vegas Poker', short: 'LVP', kind: 'stud', layout: 'stud', ak: false, joker: false, spots: ['bonus', 'ante', 'bet'], payOrder: ['ante', 'bet', 'bonus'], picks: ['none', 'pair', 'two', 'trips', 'straight', 'flush', 'full', 'quads', 'sf', 'royal'] },
    holdem: { id: 'holdem', name: "Hold'em", short: "Hold'em", kind: 'holdem', layout: 'holdem', ak: false, spots: ['insur', 'bonus', 'ante', 'bet'], payOrder: ['ante', 'bet', 'bonus'], picks: HOLD_PICKS },
    holdemBonus: { id: 'holdemBonus', name: "Hold'em Bonus", short: "Hold'em Bonus", kind: 'holdem', layout: 'holdem', ak: false, spots: ['insur', 'bonus', 'ante', 'bet'], payOrder: ['ante', 'bet', 'bonus'], picks: HOLD_PICKS },
    american: { id: 'american', name: 'American Poker', short: 'American', kind: 'holdem', layout: 'american', ak: false, spots: ['bonus', 'ante', 'blind', 'bet'], payOrder: ['blind', 'bet', 'ante', 'bonus'], picks: HOLD_PICKS },
  };
  const SPOT_NAME = { ante: 'Ante', bet: 'Bet', bonus: 'Bonus', insur: 'Ubezpieczenie', blind: 'Blind' };
  const SPOT_LABEL = { ante: 'ANTE', bet: 'BET', bonus: 'BONUS', insur: 'INSUR.', blind: 'BLIND' };
  const LAYOUTS = {
    stud: { W: 360, H: 520, dealerY: 34, playerY: 372, spots: {
      insur: { x: 180, y: 152, r: 16 }, bonus: { x: 180, y: 196, r: 19 }, ante: { x: 180, y: 248, r: 24 }, bet: { x: 180, y: 310, r: 28 } } },
    holdem: { W: 360, H: 540, dealerY: 32, boardY: 122, playerY: 414, spots: {
      insur: { x: 180, y: 232, r: 15 }, bonus: { x: 180, y: 272, r: 17 }, ante: { x: 180, y: 318, r: 22 }, bet: { x: 180, y: 372, r: 26 } } },
    american: { W: 360, H: 540, dealerY: 32, boardY: 122, playerY: 410, spots: {
      bonus: { x: 180, y: 240, r: 17 }, ante: { x: 132, y: 300, r: 23, pay: 'L', lab: 'B' }, blind: { x: 228, y: 300, r: 23, lab: 'B' }, bet: { x: 180, y: 362, r: 26, payDy: 12 } } },
  };
  const TRAY = [180, 2];
  const CW = 54;

  /* ---------- stół ---------- */
  function tableSVG(L, G) {
    const W = L.W, H = L.H, ry = 270, yc = H - 6 - ry;
    let s = `<svg class="table" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
    s += '<defs><radialGradient id="pkF" cx="50%" cy="34%" r="80%"><stop offset="0" stop-color="#1b8f53"/><stop offset=".6" stop-color="#0f683a"/><stop offset="1" stop-color="#083e22"/></radialGradient>';
    s += '<linearGradient id="pkR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b3f22"/><stop offset="1" stop-color="#2b160b"/></linearGradient></defs>';
    s += `<path d="M -130 18 H ${W + 130} V ${yc} A 310 ${ry} 0 0 1 -130 ${yc} Z" fill="url(#pkF)"/>`;
    s += `<path d="M -116 ${yc} A 296 ${ry - 14} 0 0 0 ${W + 116} ${yc}" fill="none" stroke="rgba(242,216,143,.3)" stroke-width="1.2"/>`;
    s += `<path d="M -130 ${yc} A 310 ${ry} 0 0 0 ${W + 130} ${yc}" fill="none" stroke="url(#pkR)" stroke-width="18"/>`;
    s += `<path d="M -121 ${yc} A 301 ${ry - 9} 0 0 0 ${W + 121} ${yc}" fill="none" stroke="rgba(255,220,180,.18)" stroke-width="1.5"/>`;
    s += KE.drawTray();
    G.spots.forEach((k) => {
      const p = L.spots[k];
      // napisy z boku (albo pod polem), tak żeby nie wchodziły pod stawki ani wypłaty
      let lx = p.x - 42, ly = p.y + 3.5, anchor = 'end';
      if (p.lab === 'B') { lx = p.x; ly = p.y + p.r + 18; anchor = 'middle'; }
      else if (p.lab === 'R') { lx = p.x + 42; anchor = 'start'; }
      s += `<g class="spot" data-k="${k}"><circle class="ring" cx="${p.x}" cy="${p.y}" r="${p.r}"/><text x="${lx}" y="${ly}" text-anchor="${anchor}">${SPOT_LABEL[k]}</text></g>`;
    });
    if (G.layout === 'american') s += `<text x="180" y="306" text-anchor="middle" fill="rgba(246,236,205,.85)" font-size="18" font-weight="800">=</text>`;
    return s + '</svg>';
  }
  function rowXs(n, gap, W) { const total = n * CW + (n - 1) * gap, x0 = (W - total) / 2; const out = []; for (let i = 0; i < n; i++) out.push(x0 + i * (CW + gap)); return out; }
  const chipD = (r) => Math.max(22, Math.min(36, Math.round(r * 1.3)));
  const baseY = (p) => p.y + p.r * 0.5;
  const payX = (p) => (p.pay === 'L' ? p.x - 36 : p.x + 36);
  const payAlign = (p) => (p.pay === 'L' ? 'right' : 'left');
  const spotOn = (stage, k, on) => { const g = stage.querySelector(`.spot[data-k="${k}"]`); if (g) g.classList.toggle('on', on); };

  /* ---------- zasady ---------- */
  function qualifies(G, S, e) {
    switch (G.id) {
      case 'royal': return e.cat >= 1 || PE.isAK(e);
      case 'lvp': return e.cat >= 1;
      case 'holdem': return S.qualify === 'pair' ? e.cat >= 1 : e.cat >= 2 || (e.cat === 1 && e.tb[0] >= 4);
      case 'american': return e.cat >= 1;
      default: return true;
    }
  }
  function qualText(G, S) {
    switch (G.id) {
      case 'royal': return 'krupier gra od AK';
      case 'lvp': return 'krupier gra od pary';
      case 'holdem': return S.qualify === 'pair' ? 'krupier gra od pary' : 'krupier gra od pary 4';
      case 'american': return 'otwarcie od pary';
      default: return '';
    }
  }

  const win = (spot, stake, odds, why) => ({ spot, stake, amount: stake * odds, res: 'win', lines: [why, `${fmt(stake)} × ${fmtMul(odds)} = <b>${fmt(stake * odds)}</b>`] });
  const push = (spot, stake, why) => ({ spot, stake, amount: 0, res: 'push', lines: [why, 'Wypłata: <b>0</b>'] });
  const lose = (spot, stake, why) => ({ spot, stake, amount: 0, res: 'lose', lines: [why, 'Wypłata: <b>0</b>'] });
  function bonusPay(stake, key, table, note, odds) {
    const o = odds !== undefined ? odds : table[key];
    if (o) return win('bonus', stake, o, `Bonus (${note}): ${PE.LABEL[key]} → ${fmtOdds(o)}`);
    return lose('bonus', stake, `Bonus (${note}): ${PE.LABEL[key]} — nie płaci`);
  }

  function studPays(G, S, R, outcome, pE, rc) {
    const b = R.bets, P = [];
    const pk = PE.labelKey(pE, G.ak);
    const bought = !!R.buy;
    if (outcome === 'noqual' && bought) {
      P.push(push('ante', b.ante, 'Gracz dokupił otwarcie za ante, a krupier dalej bez gry → nic nie płacimy'));
      P.push(push('bet', b.bet, 'Bet wraca do gracza'));
    } else if (outcome === 'noqual') {
      P.push(win('ante', b.ante, 1, 'Krupier bez gry → ante płaci 1:1'));
      P.push(push('bet', b.bet, 'Krupier bez gry → bet wraca do gracza'));
      if (b.insur) P.push(win('insur', b.insur, 1, 'Krupier bez gry → ubezpieczenie płaci 1:1'));
    } else if (outcome === 'player') {
      if (bought) P.push(push('ante', b.ante, 'Gracz dokupił otwarcie za ante → płacimy tylko bet'));
      else if (G.id === 'royal' && R.player.length === 6 && !S.antePay6) P.push(push('ante', b.ante, 'Gracz dokupił kartę → ante tylko wraca'));
      else P.push(win('ante', b.ante, 1, 'Gracz wygrywa → ante płaci 1:1'));
      if (G.id === 'royal') P.push(win('bet', b.bet, rc.total, `Gracz: ${PE.comboText(rc)}`));
      else { const o = PAY.lvp.bet[pk] || 1; P.push(win('bet', b.bet, o, `Gracz: ${PE.LABEL[pk]} → ${fmtOdds(o)}`)); }
      if (b.insur) P.push(lose('insur', b.insur, 'Krupier ma grę → ubezpieczenie przegrywa'));
    } else if (outcome === 'tie') {
      P.push(push('ante', b.ante, 'Remis → ante wraca'));
      P.push(push('bet', b.bet, 'Remis → bet wraca'));
      if (b.insur) P.push(lose('insur', b.insur, 'Krupier ma grę → ubezpieczenie przegrywa'));
    } else {
      P.push(lose('ante', b.ante, 'Krupier wygrywa'));
      P.push(lose('bet', b.bet, 'Krupier wygrywa'));
      if (b.insur) P.push(lose('insur', b.insur, 'Krupier ma grę → ubezpieczenie przegrywa'));
    }
    if (b.bonus) {
      const be = PE.best(R.player.slice(0, 5));
      const bk = PE.labelKey(be, false);
      P.push(bonusPay(b.bonus, bk, PAY[G.id].bonus, R.player.length === 6 ? 'pierwsze 5 kart' : '5 kart gracza'));
    }
    return P;
  }

  /** Hold'em Bonus: bonus tylko z pierwszych 5 kart (2 karty gracza + flop), para płaci od 10 */
  function hbBonus(R) {
    const e5 = PE.best(R.hole.concat(R.board.slice(0, 3)));
    const bk = PE.labelKey(e5, false);
    let o = PAY.holdemBonus.bonus[bk] || 0;
    if (bk === 'pair' && e5.tb[0] < 10) o = 0;
    const p = bonusPay(R.bets.bonus, bk, PAY.holdemBonus.bonus, '2 karty gracza + flop', o);
    if (bk === 'pair' && !o) p.lines[0] = `Bonus (2 karty gracza + flop): para ${PE.RN[e5.tb[0]]} — płaci dopiero od pary 10`;
    return p;
  }
  function holdemPays(G, S, R, outcome, pE, dE, q) {
    const b = R.bets, P = [];
    const pk = PE.labelKey(pE, false);
    if (G.id === 'holdem') {
      if (outcome === 'noqual') {
        P.push(win('ante', b.ante, 1, `Krupier bez gry (${PE.describe(dE)}) → ante płaci 1:1`));
        P.push(push('bet', b.bet, 'Krupier bez gry → bet wraca do gracza'));
      } else if (outcome === 'player') {
        P.push(win('ante', b.ante, 1, 'Gracz wygrywa → ante płaci 1:1'));
        const o = PAY.holdem.bet[pk] || 1;
        P.push(win('bet', b.bet, o, `Gracz: ${PE.LABEL[pk]} → bet ${fmtOdds(o)}`));
      } else if (outcome === 'tie') {
        P.push(push('ante', b.ante, 'Remis → ante wraca'));
        P.push(push('bet', b.bet, 'Remis → bet wraca'));
      } else {
        P.push(lose('ante', b.ante, 'Krupier wygrywa'));
        P.push(lose('bet', b.bet, 'Krupier wygrywa'));
      }
      if (b.bonus) P.push(bonusPay(b.bonus, pk, PAY.holdem.bonus, 'najlepszy układ z 7 kart'));
    } else if (G.id === 'holdemBonus') {
      if (outcome === 'player') {
        if (pk === 'none') P.push(push('ante', b.ante, 'Wygrana bez układu → ante remis'));
        else P.push(win('ante', b.ante, PAY.holdemBonus.ante[pk], `Gracz: ${PE.LABEL[pk]} → ante ${fmtOdds(PAY.holdemBonus.ante[pk])}`));
        P.push(win('bet', b.bet, 1, 'Gracz wygrywa → bet płaci 1:1'));
      } else if (outcome === 'tie') {
        P.push(push('ante', b.ante, 'Remis → ante wraca'));
        P.push(push('bet', b.bet, 'Remis → bet wraca'));
      } else {
        P.push(lose('ante', b.ante, 'Krupier wygrywa'));
        P.push(lose('bet', b.bet, 'Krupier wygrywa'));
      }
      if (b.bonus) P.push(hbBonus(R));
    } else if (G.id === 'american') {
      if (outcome === 'player') {
        P.push(q ? win('ante', b.ante, 1, 'Krupier ma otwarcie → ante płaci 1:1') : push('ante', b.ante, 'Krupier bez otwarcia → ante remis'));
        const bo = PAY.american.blind[pk];
        P.push(bo ? win('blind', b.blind, bo, `Gracz: ${PE.LABEL[pk]} → blind ${fmtOdds(bo)}`) : push('blind', b.blind, `Gracz: ${PE.LABEL[pk]} → blind remis (płaci od strita)`));
        P.push(win('bet', b.bet, 1, 'Gracz wygrywa → bet płaci 1:1'));
      } else if (outcome === 'tie') {
        P.push(push('ante', b.ante, 'Remis → ante wraca'));
        P.push(push('blind', b.blind, 'Remis → blind wraca'));
        P.push(push('bet', b.bet, 'Remis → bet wraca'));
      } else {
        P.push(q ? lose('ante', b.ante, 'Krupier wygrywa') : push('ante', b.ante, 'Krupier bez otwarcia → ante remis'));
        P.push(lose('blind', b.blind, 'Krupier wygrywa'));
        P.push(lose('bet', b.bet, 'Krupier wygrywa'));
      }
      if (b.bonus) P.push(bonusPay(b.bonus, pk, PAY.american.bonus, 'najlepszy układ z 7 kart'));
    }
    return P;
  }

  /* ---------- losowanie rozdań ---------- */
  const P_W = {
    royal: { none: 3, ak: 8, pair: 20, two: 18, trips: 14, straight: 11, flush: 10, full: 8, quads: 4, sf: 2.5, royal: 1.5 },
    lvp: { none: 2, pair: 20, two: 18, trips: 14, straight: 11, flush: 10, full: 9, quads: 6, sf: 3, royal: 2 },
    holdem: { none: 3, pair: 22, two: 22, trips: 14, straight: 11, flush: 11, full: 9, quads: 4, sf: 2, royal: 1 },
    holdemBonus: { none: 6, pair: 24, two: 22, trips: 13, straight: 11, flush: 10, full: 8, quads: 3, sf: 2, royal: 1 },
    american: { none: 6, pair: 20, two: 18, trips: 13, straight: 13, flush: 12, full: 10, quads: 4, sf: 2.5, royal: 1.5 },
  };
  const D_W = { ak: 16, pair: 38, two: 22, trips: 11, straight: 5, flush: 4, full: 3, quads: 1 };
  const BONUS_BETS = [5, 10, 25];
  /** Royal: bonus tylko 2,50 / 5 / 10 zł, najwyżej 1/10 ante (25 → 2,50; 100 → do 10) */
  function royalBonus(ante) {
    const ok = [2.5, 5, 10].filter((v) => v <= ante / 10 + 1e-9);
    return pick(ok.length ? ok : [2.5]);
  }

  function pickSixth(deck, five, S) {
    const free = shuffle(deck.free());
    if (Math.random() < 0.55) {
      const base = PE.royalCombos(five, S.twoCombos5).total;
      for (const c of free) {
        const rc = PE.royalCombos(five.concat([c]), S.twoCombos5);
        if (rc.best && rc.best.keys.length === 2 && rc.total > base) return c;
      }
    }
    return free[0];
  }
  function genStud(G, S) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const deck = new PE.Deck(G.joker);
      let player = PE.genCat(deck, weighted(P_W[G.id]));
      deck.take(player);
      if (G.joker && Math.random() < 0.2 && player.every((c) => !c.joker)) {
        const i = randInt(0, 4);
        deck.give(player[i]);
        player[i] = PE.JOKER;
        deck.take([PE.JOKER]);
      }
      if (G.id === 'royal' && S.sixCards && Math.random() < 0.32) {
        const c = pickSixth(deck, player, S);
        deck.take([c]);
        player = player.concat([c]);
      }
      const pE = PE.best(player);
      const want = weighted({ noqual: 22, player: 58, dealer: 20 });
      let dealer = null;
      for (let k = 0; k < 160 && !dealer; k++) {
        const cat = want === 'noqual' ? (G.ak ? 'none' : 'high') : weighted(G.ak ? D_W : Object.assign({}, D_W, { ak: 0 }));
        const d = PE.genCat(deck, cat);
        const dE = PE.best(d), q = qualifies(G, S, dE);
        if (want === 'noqual') { if (!q) dealer = d; }
        else if (q) { const c = PE.compare(pE, dE); if ((want === 'player' && c > 0) || (want === 'dealer' && c < 0)) dealer = d; }
      }
      if (!dealer) continue;
      deck.take(dealer);
      const ante = randBet(S.min, S.max);
      const bets = { ante, bet: ante * 2 };
      if (Math.random() < 0.5) bets.bonus = G.id === 'royal' ? royalBonus(ante) : pick(BONUS_BETS);
      // ubezpieczenie jest tylko w Royal (w Las Vegas go nie ma)
      if (G.id === 'royal') {
        const odds = PE.royalCombos(player, S.twoCombos5).total;
        if (pE.cat >= 3 && odds >= 3 && Math.random() < 0.5) bets.insur = randBet(ante, ante * odds);
      }
      let buy = null;
      if (G.id === 'royal' && want === 'noqual' && !bets.insur && pE.cat >= 1 && Math.random() < 0.45) {
        let idx = 0;
        dealer.forEach((c, i) => { if (c.r > dealer[idx].r) idx = i; });
        const wantQ = Math.random() < 0.65;
        const cands = shuffle(deck.free().filter((c) => c.r !== dealer[idx].r));
        let card = cands[0];
        for (const c of cands) {
          const nd = dealer.slice(); nd[idx] = c;
          if (qualifies(G, S, PE.best(nd)) === wantQ) { card = c; break; }
        }
        deck.take([card]);
        buy = { idx, card };
      }
      return { player, dealer, bets, buy };
    }
    // awaryjnie: zwykłe losowe rozdanie
    const deck = new PE.Deck(G.joker);
    const player = deck.randomCards(5); deck.take(player);
    const dealer = deck.randomCards(5); deck.take(dealer);
    const ante = randBet(S.min, S.max);
    return { player, dealer, bets: { ante, bet: ante * 2 }, buy: null };
  }

  function holdemBets(G, S) {
    const ante = randBet(S.min, S.max);
    const b = { ante };
    if (G.id === 'holdem') b.bet = ante * 2;
    else if (G.id === 'holdemBonus') b.bet = ante * pick([2, 3, 3, 4]);
    else { b.blind = ante; b.bet = ante * pick([4, 4, 3, 2, 2, 1]); }
    if (Math.random() < 0.55) b.bonus = G.id === 'american' ? randBet(S.min, ante) : pick(BONUS_BETS);
    return b;
  }
  function holdemOutcome(G, S, pE, dE) {
    const q = qualifies(G, S, dE), c = PE.compare(pE, dE);
    if (G.id === 'holdem' && !q) return 'noqual';
    if (G.id === 'american' && c > 0) return q ? 'player' : 'playerNQ';
    return c > 0 ? 'player' : c < 0 ? 'dealer' : 'tie';
  }
  function genHoldem(G, S) {
    const OUT = {
      holdem: { noqual: 20, player: 52, dealer: 22, tie: 6 },
      holdemBonus: { player: 64, dealer: 28, tie: 8 },
      american: { player: 46, playerNQ: 16, dealer: 28, tie: 10 },
    }[G.id];
    let fallback = null;
    for (let attempt = 0; attempt < 14; attempt++) {
      const deck = new PE.Deck(false);
      const target = weighted(P_W[G.id]);
      const five = PE.genCat(deck, target === 'none' ? 'high' : target);
      deck.take(five);
      const e5 = PE.best(five);
      const core = PE.coreIdx(five, e5, false);
      const order = shuffle([0, 1, 2, 3, 4]);
      const h1 = core.length ? pick(core) : order[0];
      const rest = order.filter((i) => i !== h1);
      const hole = [five[h1], five[rest[0]]];
      const extra = deck.randomCards(2);
      deck.take(extra);
      // w Hold'em Bonus najczęściej układ gracza powstaje już na flopie (wtedy jest z czego płacić bonus)
      const board = G.id === 'holdemBonus' && Math.random() < 0.7
        ? shuffle(rest.slice(1).map((i) => five[i])).concat(shuffle(extra))
        : shuffle(rest.slice(1).map((i) => five[i]).concat(extra));
      const pE = PE.best(hole.concat(board));
      const want = weighted(OUT);
      for (let k = 0; k < 260; k++) {
        const dh = deck.randomCards(2);
        const res = holdemOutcome(G, S, pE, PE.best(dh.concat(board)));
        if (!fallback) fallback = { hole, board, dealer: dh };
        if (res === want) return { hole, board, dealer: dh, bets: holdemBets(G, S) };
      }
    }
    return Object.assign(fallback, { bets: holdemBets(G, S) });
  }

  /* ---------- kroki pytań ---------- */
  function askHand(T, G, S, who, e, cards, els, title, sub) {
    const key = PE.labelKey(e, G.ak);
    const core = PE.coreIdx(cards, e, G.ak);
    return T.ask({
      type: 'choice', title: title || (who === 'dealer' ? 'Jaki układ ma krupier?' : 'Jaki układ ma gracz?'),
      sub: sub != null ? sub : who === 'dealer' ? qualText(G, S) : '',
      options: G.picks.map((k) => ({ key: k, label: PE.SHORT[k] })), correct: [key],
      tag: `pk:${G.id}:${who}:${key}`, tagLabel: `${G.short} · ${who === 'dealer' ? 'krupier' : 'gracz'}: ${PE.LABEL[key]}`,
      solution: () => ({ answer: PE.describe(e, G.ak), lines: e.jokerAs ? [`Joker liczony jako ${KE.cardName(e.jokerAs)}`] : [] }),
      after: () => highlight(els, core),
    });
  }
  function askRoyalPlayer(T, G, rc, els) {
    const correct = rc.total === 0 ? [['none']] : rc.answers.map((a) => a.keys);
    const id = rc.best ? rc.best.keys.join('+') : 'none';
    const lines = [];
    if (rc.best && rc.best.keys.length === 2) lines.push('Dwa różne układy (każdy ma kartę, której nie ma drugi) — płacimy oba.');
    if (rc.answers.length > 1) lines.push('Równie dobrze: ' + rc.answers.slice(1).map((a) => a.keys.map((k) => PE.LABEL[k]).join(' + ')).join(' lub '));
    return T.ask({
      type: 'multi', max: 2, title: 'Jaki układ ma gracz?', sub: 'można zaznaczyć 2 układy',
      options: G.picks.map((k) => ({ key: k, label: PE.SHORT[k] })), correct,
      tag: `pk:royal:player:${id}`, tagLabel: `Royal · gracz: ${rc.best ? rc.best.keys.map((k) => PE.LABEL[k]).join(' + ') : 'brak układu'}`,
      solution: () => ({ answer: PE.comboText(rc), lines }),
      after: () => highlight(els, rc.core),
    });
  }
  function askWinner(T, G, outcome, pE, dE) {
    const key = outcome === 'player' || outcome === 'playerNQ' ? 'player' : outcome;
    const verdict = { player: 'Wygrywa gracz', dealer: 'Wygrywa krupier', tie: 'Remis' }[key];
    return T.ask({
      type: 'choice', title: 'Kto wygrywa?', big: true,
      options: [{ key: 'player', label: 'Gracz' }, { key: 'tie', label: 'Remis' }, { key: 'dealer', label: 'Krupier' }], correct: [key],
      tag: `pk:${G.id}:winner`, tagLabel: `${G.short} · kto wygrywa`,
      solution: () => ({ answer: verdict, lines: [`Gracz: ${PE.describe(pE, G.ak)}`, `Krupier: ${PE.describe(dE, G.ak)}`, key === 'tie' ? 'Takie same układy i karty dodatkowe → remis' : 'Przy tym samym układzie decydują wyższe karty (kickery)'] }),
    });
  }
  function settleAnim(sc, L, stacks, p) {
    const s = L.spots[p.spot];
    if (p.amount > 0) sc.stack(p.amount, payX(s), baseY(s) + (s.payDy || 0), { d: chipD(s.r), from: TRAY, cls: 'pay', perCol: 10, align: payAlign(s) });
    else if (p.res === 'lose' && stacks[p.spot]) sc.take(stacks[p.spot], TRAY);
  }
  async function askPays(ctx, G, L, sc, stacks, pays, outcome) {
    const T = ctx.T;
    const list = G.payOrder.map((k) => pays.find((p) => p.spot === k)).filter(Boolean);
    const lossy = outcome === 'dealer' || outcome === 'tie';
    const askable = list.filter((p) => !lossy || p.spot === 'bonus');
    list.filter((p) => askable.indexOf(p) < 0).forEach((p) => settleAnim(sc, L, stacks, p));
    if (!askable.length) { await T.wait(500); return; }
    if (KE.settings.payMode === 'total' && askable.length > 1) {
      const total = askable.reduce((a, p) => a + p.amount, 0);
      askable.forEach((p) => spotOn(ctx.stage, p.spot, true));
      await T.ask({
        type: 'number', title: 'Wypłata razem', sub: askable.map((p) => SPOT_NAME[p.spot]).join(' + '), unit: 'zł', expected: total,
        tag: `pk:${G.id}:pay:total`, tagLabel: `${G.short} · wypłata razem`,
        solution: () => ({ answer: fmt(total) + ' zł', lines: askable.map((p) => `<b>${SPOT_NAME[p.spot]}</b> (${fmt(p.stake)}): ${p.lines.join(' · ')}`).concat([`<span class="sum">Razem: ${fmt(total)} zł</span>`]) }),
      });
      askable.forEach((p) => { spotOn(ctx.stage, p.spot, false); settleAnim(sc, L, stacks, p); });
      await T.wait(300);
      return;
    }
    for (const p of askable) {
      spotOn(ctx.stage, p.spot, true);
      await T.ask({
        type: 'number', title: `Wypłata — ${SPOT_NAME[p.spot]}`, sub: `stawka ${fmt(p.stake)} zł`, unit: 'zł', expected: p.amount,
        tag: `pk:${G.id}:pay:${p.spot}`, tagLabel: `${G.short} · wypłata ${SPOT_NAME[p.spot]}`,
        solution: () => ({ answer: fmt(p.amount) + ' zł', lines: p.lines }),
      });
      spotOn(ctx.stage, p.spot, false);
      settleAnim(sc, L, stacks, p);
      await T.wait(220);
    }
  }
  function placeBets(sc, L, G, bets) {
    const stacks = {};
    G.spots.forEach((k) => { if (bets[k]) { const s = L.spots[k]; stacks[k] = sc.stack(bets[k], s.x, baseY(s), { d: chipD(s.r), perCol: 10 }); } });
    return stacks;
  }
  async function flipAll(T, els) {
    for (const e of els) { if (e.classList.contains('down')) { e.classList.remove('down'); await T.wait(110); } }
    await T.wait(380);
  }

  /* ---------- rundy ---------- */
  async function roundStud(ctx, G) {
    const T = ctx.T, S = ctx.cfg, L = LAYOUTS[G.layout];
    T.startRound();
    const stage = ctx.setFixed(L.W, L.H);
    stage.innerHTML = tableSVG(L, G);
    const sc = new Scene(stage, [330, -130]);
    const R = genStud(G, S);
    const stacks = placeBets(sc, L, G, R.bets);
    T.status('Rozdawanie kart…');
    const nP = R.player.length;
    const dXs = rowXs(5, 6, L.W), pXs = rowXs(nP, nP > 5 ? 4 : 6, L.W);
    const dEls = [], pEls = [];
    let t = 0;
    for (let i = 0; i < 5; i++) {
      pEls.push(sc.card(R.player[i], pXs[i], L.playerY, { delay: t })); t += 85;
      dEls.push(sc.card(R.dealer[i], dXs[i], L.dealerY, { delay: t, up: i === 4 })); t += 85;
    }
    await T.wait(t + 450);
    if (nP === 6) {
      const c6 = sc.card(R.player[5], pXs[5], L.playerY, {});
      c6.appendChild(KE.el('span', { class: 'tag6', text: '+1 KARTA' }));
      pEls.push(c6);
      await T.wait(550);
    }
    await flipAll(T, dEls);
    let dE = PE.best(R.dealer);
    await askHand(T, G, S, 'dealer', dE, R.dealer, dEls);
    let qual = qualifies(G, S, dE);
    if (!qual && G.id === 'royal') {
      if (R.buy) {
        await T.info(`<b>Krupier nie ma gry.</b> Gracz dokupuje otwarcie i płaci ante (${fmt(R.bets.ante)} zł) — krupier wymienia najwyższą kartę.`, { button: 'Wymień kartę' });
        clearHL(dEls);
        const fee = sc.stack(R.bets.ante, L.spots.ante.x - 70, L.playerY - 6, { d: chipD(L.spots.ante.r), label: false });
        setTimeout(() => sc.take(fee, TRAY), 60);
        const i = R.buy.idx, old = dEls[i];
        sc.move(old, old._x - 40, -120, -30);
        old.style.opacity = '0';
        setTimeout(() => old.remove(), 700);
        await T.wait(380);
        R.dealer[i] = R.buy.card;
        dEls[i] = sc.card(R.buy.card, dXs[i], L.dealerY, {});
        await T.wait(600);
        dEls[i].classList.remove('down');
        await T.wait(500);
        dE = PE.best(R.dealer);
        await askHand(T, G, S, 'dealer', dE, R.dealer, dEls, 'Jaki układ ma teraz krupier?');
        qual = qualifies(G, S, dE);
      } else {
        await T.info('<b>Krupier nie ma gry.</b> Gracz nie kupuje gry.');
      }
    }
    clearHL(dEls);
    await flipAll(T, pEls);
    const pE = PE.best(R.player);
    let rc = null;
    if (G.id === 'royal') {
      rc = PE.royalCombos(R.player, S.twoCombos5);
      await askRoyalPlayer(T, G, rc, pEls);
    } else await askHand(T, G, S, 'player', pE, R.player, pEls);
    let outcome = 'noqual';
    if (qual) {
      const c = PE.compare(pE, dE);
      outcome = c > 0 ? 'player' : c < 0 ? 'dealer' : 'tie';
      await askWinner(T, G, outcome, pE, dE);
    }
    const pays = studPays(G, S, R, outcome, pE, rc);
    await askPays(ctx, G, L, sc, stacks, pays, outcome);
    clearHL(pEls);
    await T.roundEnd();
  }

  async function roundHoldem(ctx, G) {
    const T = ctx.T, S = ctx.cfg, L = LAYOUTS[G.layout];
    T.startRound();
    const stage = ctx.setFixed(L.W, L.H);
    stage.innerHTML = tableSVG(L, G);
    const sc = new Scene(stage, [330, -130]);
    const R = genHoldem(G, S);
    const stacks = placeBets(sc, L, G, R.bets);
    T.status('Rozdawanie kart…');
    const hX = rowXs(2, 8, L.W), bX = rowXs(5, 6, L.W);
    const pEls = [], dEls = [], bEls = [];
    let t = 0;
    // po 2 karty dla gracza i krupiera, potem flop — 3 karty na środek
    for (let i = 0; i < 2; i++) {
      pEls.push(sc.card(R.hole[i], hX[i], L.playerY, { delay: t })); t += 90;
      dEls.push(sc.card(R.dealer[i], hX[i], L.dealerY, { delay: t })); t += 90;
    }
    for (let i = 0; i < 3; i++) { bEls.push(sc.card(R.board[i], bX[i], L.boardY, { delay: t })); t += 90; }
    await T.wait(t + 450);
    await flipAll(T, bEls);
    let bonusDone = false;
    if (G.id === 'holdemBonus' && R.bets.bonus) {
      // bonus jest tylko z pierwszych 5 kart (2 karty gracza + flop), więc rozliczamy go od razu po flopie
      await flipAll(T, pEls);
      const five = R.hole.concat(R.board.slice(0, 3)), fiveEls = pEls.concat(bEls.slice(0, 3));
      await askHand(T, G, S, 'player', PE.best(five), five, fiveEls, 'Bonus: jaki układ ma gracz?', '2 karty + flop');
      const bp = hbBonus(R);
      spotOn(stage, 'bonus', true);
      await T.ask({
        type: 'number', title: 'Wypłata — Bonus', sub: `stawka ${fmt(bp.stake)} zł · 2 karty + flop`, unit: 'zł', expected: bp.amount,
        tag: 'pk:holdemBonus:pay:bonus', tagLabel: "Hold'em Bonus · wypłata Bonus",
        solution: () => ({ answer: fmt(bp.amount) + ' zł', lines: bp.lines }),
      });
      spotOn(stage, 'bonus', false);
      settleAnim(sc, L, stacks, bp);
      clearHL(fiveEls);
      bonusDone = true;
    }
    // reszta kart na środek: turn i river
    t = 0;
    for (let i = 3; i < 5; i++) { bEls.push(sc.card(R.board[i], bX[i], L.boardY, { delay: t })); t += 120; }
    await T.wait(t + 450);
    await flipAll(T, bEls.slice(3));
    await flipAll(T, dEls);
    const dCards = R.dealer.concat(R.board), dAll = dEls.concat(bEls);
    const dE = PE.best(dCards);
    await askHand(T, G, S, 'dealer', dE, dCards, dAll);
    clearHL(dAll);
    await flipAll(T, pEls);
    const pCards = R.hole.concat(R.board), pAll = pEls.concat(bEls);
    const pE = PE.best(pCards);
    await askHand(T, G, S, 'player', pE, pCards, pAll);
    const q = qualifies(G, S, dE);
    let outcome = holdemOutcome(G, S, pE, dE);
    if (outcome === 'playerNQ') outcome = 'player';
    clearHL(pAll);
    if (outcome !== 'noqual') await askWinner(T, G, outcome, pE, dE);
    let pays = holdemPays(G, S, R, outcome, pE, dE, q);
    if (bonusDone) pays = pays.filter((p) => p.spot !== 'bonus');
    await askPays(ctx, G, L, sc, stacks, pays, outcome);
    await T.roundEnd();
  }

  /* ---------- opisy zasad (ściąga i ekran startowy) ---------- */
  const RULES = {
    royal: [
      'Gracz i krupier mają po 5 kart. Gracz może wymienić karty albo dokupić 6. kartę.',
      'Krupier gra od <b>asa i króla</b> (AK). As i król to też układ gracza (1:1).',
      'Krupier bez gry: ante 1:1, bet wraca, ubezpieczenie 1:1.',
      'Gracz może <b>dokupić otwarcie</b> — płaci za to ante, a krupier wymienia najwyższą kartę. Dalej bez otwarcia: nic nie płacimy. Z otwarciem: płacimy tylko bet.',
      'Gracz wygrywa: ante 1:1, bet według tabeli. <b>Dwa układy</b> (np. przy 6 kartach) — płacimy oba, jeśli każdy ma kartę, której nie ma drugi.',
      'Ubezpieczenie: od ante do ante × wypłata układu; płaci 1:1 tylko gdy krupier nie ma gry.',
      'Bonus: 2,50 / 5 / 10 zł, najwyżej 1/10 ante (ante 25 → 2,50; ante 100 → do 10). Liczony z pierwszych 5 kart gracza.',
    ],
    lvp: [
      'Jak Royal: gracz i krupier mają po 5 kart.',
      'Krupier gra od <b>pary</b>; as i król nie jest układem.',
      'Bez ubezpieczenia.',
      'Krupier bez gry: ante 1:1, bet wraca.',
      'Gracz wygrywa: ante 1:1, bet według tabeli. Bonus z 5 kart gracza.',
    ],
    holdem: [
      'Gracz i krupier mają po 2 karty, na stole 5 wspólnych. Gracz po flopie wykupuje turn i river betem (2 × ante).',
      'Krupier gra od <b>pary 4</b> (można zmienić w ustawieniach gry).',
      'Krupier bez gry: ante 1:1, bet wraca.',
      'Gracz wygrywa: ante 1:1, bet według tabeli. Bonus: najlepszy układ gracza z 7 kart (od fula).',
    ],
    holdemBonus: [
      'Gracz i krupier dostają po 2 karty, potem idą 3 karty na środek (flop), a na końcu turn i river. Bet to suma dopłat gracza (2–4 × ante).',
      '<b>Bonus rozliczasz zaraz po flopie</b> — liczy się tylko z pierwszych 5 kart: 2 karty gracza + 3 z flopa; para płaci dopiero od 10.',
      'Bez kwalifikacji krupiera — porównujemy układy.',
      'Gracz wygrywa: bet 1:1, ante według tabeli (bez układu ante remis).',
    ],
    american: [
      'Ante = Blind. Gracz ma 2 karty, krupier 2, na stole 5 wspólnych. Bet: 1–4 × ante.',
      'Krupier otwiera od <b>pary</b>. Bez otwarcia ante remis, reszta rozliczana normalnie.',
      'Gracz wygrywa: bet 1:1, ante 1:1 (gdy krupier otwiera), blind według tabeli — poniżej strita remis.',
      'Kolejność wypłat: <b>blind, bet, ante, bonus</b>.',
      'Bonus: od minimum stołu do wysokości ante; najlepszy układ gracza z 7 kart (od trójki), niezależnie od krupiera.',
    ],
  };
  KE.POKER = { PAY, GAMES, RULES, SPOT_NAME, _t: { genStud, genHoldem, studPays, holdemPays, qualifies, holdemOutcome } };

  const SPECS = {
    royal: [
      { type: 'range', keys: ['min', 'max'], label: 'Ante (min / maks)', unit: 'zł', step: 5, min: 5, max: 100000 },
      { type: 'toggle', key: 'sixCards', label: 'Gracz czasem ma 6 kart', hint: 'Dokupiona karta — okazja na dwa układy' },
      { type: 'toggle', key: 'twoCombos5', label: 'Dwa układy także przy 5 kartach', hint: 'Np. para + as i król płaci 1 + 1 = 2:1' },
      { type: 'toggle', key: 'antePay6', label: 'Ante płaci 1:1 po dokupieniu karty', hint: 'Wyłącz, jeśli u Was po dokupieniu ante tylko wraca' },
    ],
    lvp: [{ type: 'range', keys: ['min', 'max'], label: 'Ante (min / maks)', unit: 'zł', step: 5, min: 5, max: 100000 }],
    holdem: [
      { type: 'range', keys: ['min', 'max'], label: 'Ante (min / maks)', unit: 'zł', step: 5, min: 5, max: 100000 },
      { type: 'select', key: 'qualify', label: 'Krupier gra od', options: [{ v: 'pair4', t: 'Pary 4' }, { v: 'pair', t: 'Dowolnej pary' }] },
    ],
    holdemBonus: [{ type: 'range', keys: ['min', 'max'], label: 'Ante (min / maks)', unit: 'zł', step: 5, min: 5, max: 100000 }],
    american: [{ type: 'range', keys: ['min', 'max'], label: 'Ante (min / maks)', unit: 'zł', step: 5, min: 5, max: 100000 }],
  };
  const SUBS = { royal: '5–6 kart · dwa układy · AK', lvp: 'jak Royal · krupier gra od pary', holdem: '2 karty + 5 na stole', holdemBonus: 'bonus od pary 10', american: 'ante = blind · otwarcie od pary' };

  Object.keys(GAMES).forEach((id) => {
    const G = GAMES[id];
    KE.games[id] = {
      id, title: G.name, sub: SUBS[id], poker: true, rules: RULES[id], spec: SPECS[id],
      modeLabel: () => 'Układy i wypłaty',
      start(ctx) {
        (async () => {
          try { for (;;) { if (G.kind === 'stud') await roundStud(ctx, G); else await roundHoldem(ctx, G); } }
          catch (e) { if (e !== KE.ABORT) { console.error(e); ctx.fail(e); } }
        })();
      },
    };
  });
})();
