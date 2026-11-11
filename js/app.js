/* Krupier Extra — ekrany: start, ustawienia gier, gra, ściąga, statystyki, ustawienia */
(function () {
  'use strict';
  const KE = window.KE;
  const { el, ICON, fmt, fmtOdds, Stats, settings } = KE;
  const view = document.getElementById('view');
  const backBtn = document.getElementById('backBtn');
  const titleEl = document.getElementById('title');
  const subEl = document.getElementById('subtitle');
  const titleBox = document.getElementById('titleBox');
  const topRight = document.getElementById('topRight');
  backBtn.innerHTML = ICON.back;
  let current = null;
  let parentHash = '#/';
  backBtn.addEventListener('click', () => { location.hash = parentHash; });

  function setTop(title, sub, parent) {
    titleEl.textContent = title;
    subEl.textContent = sub || '';
    subEl.hidden = !sub;
    titleBox.classList.toggle('solo', !sub);
    backBtn.hidden = !parent;
    parentHash = parent || '#/';
    topRight.innerHTML = '';
    document.getElementById('app').classList.toggle('is-home', !parent);
    document.title = parent ? `${title} · Krupier Extra` : 'Krupier Extra';
  }

  function route() {
    if (current && current.cleanup) current.cleanup();
    current = null;
    view.innerHTML = '';
    view.classList.remove('locked');
    view.scrollTop = 0;
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (!parts.length) return home();
    if (parts[0] === 'poker') return pokerList();
    if (parts[0] === 'setup' && KE.games[parts[1]]) return setup(parts[1]);
    if (parts[0] === 'play' && KE.games[parts[1]]) return play(parts[1]);
    if (parts[0] === 'sciaga') return cheat(parts[1] || 'ruletka');
    if (parts[0] === 'statystyki') return statsView();
    if (parts[0] === 'ustawienia') return settingsView();
    return home();
  }

  /* ---------------- grafiki ---------------- */
  const LOGO = `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="lgA" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#2a9a5c"/><stop offset="1" stop-color="#0b4f2c"/></radialGradient></defs><circle cx="50" cy="50" r="47" fill="#0b2a1c" stroke="#f2d88f" stroke-width="3"/><circle cx="50" cy="50" r="39" fill="none" stroke="#f2d88f" stroke-width="9" stroke-dasharray="10.21 10.21"/><circle cx="50" cy="50" r="29" fill="url(#lgA)" stroke="#f2d88f" stroke-width="2"/><text x="50" y="62" text-anchor="middle" font-family="Georgia,serif" font-size="34" font-weight="700" fill="#f2d88f">K</text></svg>`;
  function wheelArt() {
    let s = '<svg viewBox="-50 -50 100 100" aria-hidden="true"><circle r="48" fill="#3a2212" stroke="#f2d88f" stroke-width="2"/>';
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a1 = (i / n) * Math.PI * 2 - Math.PI / 2, a2 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
      const p = (r, a) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
      const fill = i === 0 ? '#0f7a40' : i % 2 ? '#b3172d' : '#161618';
      s += `<path d="M${p(44, a1)} A44 44 0 0 1 ${p(44, a2)} L${p(27, a2)} A27 27 0 0 0 ${p(27, a1)} Z" fill="${fill}" stroke="rgba(242,216,143,.6)" stroke-width=".6"/>`;
    }
    s += '<circle r="27" fill="#5a3a1e" stroke="#d8b25a" stroke-width="1.2"/>';
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 4; s += `<line x1="${(-24 * Math.cos(a)).toFixed(1)}" y1="${(-24 * Math.sin(a)).toFixed(1)}" x2="${(24 * Math.cos(a)).toFixed(1)}" y2="${(24 * Math.sin(a)).toFixed(1)}" stroke="#d8b25a" stroke-width="1.6"/>`; }
    s += '<circle r="9" fill="#f2d88f" stroke="#8a6422"/><circle cx="21" cy="-28" r="4" fill="#fff" stroke="#999" stroke-width=".5"/></svg>';
    return s;
  }
  function miniCardSVG(rank, suit, x, y, rot) {
    const red = suit === 'H' || suit === 'D';
    const col = red ? '#c4122f' : '#17171c';
    return `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-17" y="-24" width="34" height="48" rx="4" fill="#fdfcf7" stroke="rgba(0,0,0,.25)"/><text x="-12" y="-10" font-family="Georgia,serif" font-weight="700" font-size="12" fill="${col}">${rank}</text><g transform="translate(-8 4) scale(.16)" fill="${col}"><path d="${KE.SUIT_PATH[suit]}"/></g></g>`;
  }
  const bjArt = () => `<svg viewBox="0 0 100 90" aria-hidden="true"><g filter="drop-shadow(0 3px 3px rgba(0,0,0,.4))">${miniCardSVG('A', 'S', 38, 46, -12)}${miniCardSVG('K', 'H', 62, 44, 10)}</g><text x="50" y="88" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="11" fill="#f2d88f">21</text></svg>`;
  const pokerArt = () => {
    const cards = [['10', 'H'], ['J', 'H'], ['Q', 'H'], ['K', 'H'], ['A', 'H']];
    let s = '<svg viewBox="0 0 100 90" aria-hidden="true"><g filter="drop-shadow(0 3px 3px rgba(0,0,0,.4))">';
    cards.forEach((c, i) => { const rot = -28 + i * 14; s += `<g transform="rotate(${rot} 50 88)">${miniCardSVG(c[0], c[1], 50, 46, 0)}</g>`; });
    return s + '</g></svg>';
  };

  /* ---------------- ekran główny ---------------- */
  function home() {
    setTop('Krupier Extra', '', null);
    titleBox.classList.add('solo');
    const tile = (href, cls, art, title, sub) => el('a', { class: 'tile ' + cls, href },
      el('div', { class: 'art', html: art }),
      el('div', null, el('h2', { text: title }), el('p', { text: sub })),
      el('span', { class: 'go', html: ICON.chev }));
    view.appendChild(el('div', { class: 'home' },
      el('div', { class: 'hero' },
        el('div', { class: 'logo', html: LOGO }),
        el('h1', { html: 'Krupier <span>Extra</span>' }),
        el('p', { text: 'Wypłaty i układy — trening przy stole' })),
      el('div', { class: 'tiles' },
        tile('#/setup/ruletka', 'roulette', wheelArt(), 'Ruletka', 'Numery · serie i sąsiedzi · przeliczanie po 5, 10, 25'),
        tile('#/setup/blackjack', 'bj', bjArt(), 'Blackjack', 'Wypłaty 3:2 · rozdania · gra krupiera'),
        tile('#/poker', 'poker wide', pokerArt(), 'Poker', "Royal · Las Vegas · Hold'em · Hold'em Bonus · American")),
      el('div', { class: 'links' },
        el('a', { class: 'link', href: '#/sciaga', html: ICON.book + 'Ściąga' }),
        el('a', { class: 'link', href: '#/statystyki', html: ICON.chart + 'Statystyki' }),
        el('a', { class: 'link', href: '#/ustawienia', html: ICON.sliders + 'Ustawienia' })),
      el('p', { class: 'foot', text: 'Postępy zapisują się tylko na tym urządzeniu.' })));
  }

  function pokerList() {
    setTop('Poker', 'Wybierz odmianę', '#/');
    const page = el('div', { class: 'page' });
    const BADGE = { royal: 'R', lvp: 'LV', holdem: 'H', holdemBonus: 'HB', american: 'A' };
    ['royal', 'lvp', 'holdem', 'holdemBonus', 'american'].forEach((id) => {
      const g = KE.games[id];
      page.appendChild(el('a', { class: 'row-card', href: '#/setup/' + id },
        el('div', { class: 'badge', text: BADGE[id] }),
        el('div', null, el('h3', { text: g.title }), el('p', { text: g.sub })),
        el('span', { class: 'go', html: ICON.chev })));
    });
    page.appendChild(el('a', { class: 'row-card', href: '#/sciaga/poker' },
      el('div', { class: 'badge', html: '<span style="font-size:15px">%</span>' }),
      el('div', null, el('h3', { text: 'Tabele wypłat' }), el('p', { text: 'Wszystkie pokery w jednym miejscu' })),
      el('span', { class: 'go', html: ICON.chev })));
    view.appendChild(page);
  }

  /* ---------------- ustawienia gry ---------------- */
  function sec(title) { const s = el('section', { class: 'sec' }); if (title) s.appendChild(el('h3', { text: title })); return s; }
  function toggleRow(label, hint, on, onChange) {
    const sw = el('span', { class: 'switch' + (on ? ' on' : '') });
    const b = el('button', { class: 'tog', type: 'button', role: 'switch', 'aria-checked': on ? 'true' : 'false' },
      el('span', { class: 't' }, el('b', { text: label }), hint ? el('span', { text: hint }) : null), sw);
    b.onclick = () => { on = !on; sw.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); onChange(on); };
    return b;
  }
  function segmented(options, value, onChange) {
    const s = el('div', { class: 'seg', role: 'radiogroup' });
    options.forEach((o) => {
      const b = el('button', { type: 'button', class: o.v === value ? 'on' : '', text: o.t, role: 'radio' });
      b.onclick = () => { s.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); onChange(o.v); };
      s.appendChild(b);
    });
    return s;
  }
  function setup(id) {
    const g = KE.games[id];
    const cfg = settings[id];
    setTop(g.title, 'Ustawienia gry', g.poker ? '#/poker' : '#/');
    const page = el('div', { class: 'page' });
    const inputs = [];
    const save = () => KE.saveSettings();
    function render() {
      page.innerHTML = '';
      inputs.length = 0;
      let opts = null;
      g.spec.forEach((f) => {
        if (f.show && !f.show(cfg)) return;
        if (f.type === 'modes') {
          const s = sec(f.label);
          const m = el('div', { class: 'modes' });
          f.options.forEach((o) => m.appendChild(el('button', {
            class: 'mode' + (cfg[f.key] === o.v ? ' on' : ''), type: 'button',
            html: `<b>${o.t}</b><span>${o.d}</span>`, onclick: () => { cfg[f.key] = o.v; save(); render(); },
          })));
          s.appendChild(m);
          page.appendChild(s);
        } else if (f.type === 'range') {
          const s = sec(f.label);
          const mk = (key, label) => {
            const inp = el('input', { type: 'text', inputmode: f.step < 1 ? 'decimal' : 'numeric', value: String(cfg[key]).replace('.', ','), 'aria-label': label, autocomplete: 'off' });
            const fld = el('div', { class: 'field' }, el('label', { text: label }), el('div', { class: 'inp' }, inp, el('span', { class: 'u', text: f.unit })));
            inputs.push({ f, key, inp, fld });
            inp.addEventListener('focus', () => setTimeout(() => inp.select(), 0));
            return fld;
          };
          s.appendChild(el('div', { class: 'range' }, mk(f.keys[0], 'Minimum'), mk(f.keys[1], 'Maksimum')));
          if (f.unit === 'zł') s.appendChild(el('p', { class: 'hint', text: `Kwoty losowane co ${f.step} zł w tym zakresie.` }));
          if (f.hint) s.appendChild(el('p', { class: 'hint', text: f.hint }));
          page.appendChild(s);
        } else if (f.type === 'values' || f.type === 'checks') {
          const s = sec(f.label);
          const box = el('div', { class: 'pills' });
          const list = cfg[f.key];
          f.options.forEach((o) => {
            const v = f.type === 'values' ? o : o.v;
            const on = list.indexOf(v) >= 0;
            const label = f.type === 'values' ? `${KE.unitStackSVG(1, 28, '')}po ${o} zł` : o.t;
            const b = el('button', { class: 'pill-tog' + (on ? ' on' : '') + (f.type === 'checks' ? ' plain' : ''), type: 'button', html: label });
            b.onclick = () => {
              const i = list.indexOf(v);
              if (i >= 0) { if (list.length === 1) { KE.toast('Zostaw przynajmniej jedną opcję'); return; } list.splice(i, 1); } else list.push(v);
              b.classList.toggle('on', list.indexOf(v) >= 0);
              save();
            };
            box.appendChild(b);
          });
          s.appendChild(box);
          if (f.type === 'values') s.appendChild(el('p', { class: 'hint', text: 'Najpierw liczysz wypłatę w żetonach, potem ile to złotych przy wylosowanej wartości żetonu.' }));
          page.appendChild(s);
        } else if (f.type === 'toggle' || f.type === 'select') {
          if (!opts) { opts = sec('Opcje'); page.appendChild(opts); }
          if (f.type === 'toggle') opts.appendChild(toggleRow(f.label, f.hint, !!cfg[f.key], (v) => { cfg[f.key] = v; save(); }));
          else {
            opts.appendChild(el('div', { class: 'seg-label', text: f.label }));
            opts.appendChild(segmented(f.options, cfg[f.key], (v) => { cfg[f.key] = v; save(); }));
          }
        }
      });
      if (g.rules) {
        const s = sec('Jak liczy trener');
        s.appendChild(el('ul', { class: 'rules', html: g.rules.map((r) => `<li>${r}</li>`).join('') }));
        s.appendChild(el('p', { class: 'hint', html: '<a href="#/sciaga/poker">Tabele wypłat →</a>' }));
        page.appendChild(s);
      }
      page.appendChild(el('div', { class: 'start-bar' }, el('button', { class: 'btn primary wide big', type: 'button', html: ICON.play + ' Zacznij trening', onclick: start })));
    }
    function start() {
      let ok = true;
      const byField = {};
      inputs.forEach((x) => { (byField[x.f.keys.join()] = byField[x.f.keys.join()] || []).push(x); });
      Object.keys(byField).forEach((k) => {
        const pair = byField[k], f = pair[0].f;
        const vals = pair.map((x) => {
          let v = KE.parseNum(x.inp.value);
          if (isNaN(v)) { x.fld.classList.add('err'); ok = false; return null; }
          x.fld.classList.remove('err');
          v = Math.round(v / f.step) * f.step;
          return Math.max(f.min, Math.min(f.max, v));
        });
        if (vals[0] == null || vals[1] == null) return;
        if (vals[0] > vals[1]) vals.reverse();
        cfg[f.keys[0]] = vals[0];
        cfg[f.keys[1]] = vals[1];
      });
      if (!ok) { KE.toast('Wpisz poprawne kwoty min i maks'); return; }
      save();
      location.hash = '#/play/' + id;
    }
    render();
    view.appendChild(page);
  }

  /* ---------------- gra ---------------- */
  function play(id) {
    const g = KE.games[id];
    const cfg = settings[id];
    setTop(g.title, g.modeLabel ? g.modeLabel(cfg) : '', '#/setup/' + id);
    view.classList.add('locked');
    const stage = el('div', { class: 'stage' });
    const wrap = el('div', { class: 'stage-wrap' }, stage);
    const panel = el('div', { class: 'panel' });
    view.appendChild(el('section', { class: 'game' }, wrap, panel));
    const T = new KE.Trainer({ panel, mode: id, scoreEl: topRight });
    let fit = null;
    const ctx = {
      T, cfg, stage, wrap, panel,
      setFill() {
        if (fit) { fit.disconnect(); fit = null; }
        stage.className = 'stage fill'; stage.removeAttribute('style'); stage.innerHTML = '';
        return stage;
      },
      setFixed(W, H) {
        if (fit) { fit.disconnect(); fit = null; }
        stage.className = 'stage'; stage.removeAttribute('style'); stage.innerHTML = '';
        fit = KE.fitStage(wrap, stage, W, H);
        return stage;
      },
      fail(e) {
        panel.innerHTML = '';
        panel.appendChild(el('div', { class: 'q-msg', html: 'Coś poszło nie tak. Wróć i spróbuj ponownie.<br><small style="color:#9fb2a6">' + ((e && e.message) || '') + '</small>' }));
      },
    };
    current = { cleanup() { T.stop(); if (fit) fit.disconnect(); } };
    g.start(ctx);
  }

  /* ---------------- ściąga ---------------- */
  function table(head, rows, rightCols) {
    rightCols = rightCols || [];
    const th = head.map((h, i) => `<th${rightCols.indexOf(i) >= 0 ? ' class="r"' : ''}>${h}</th>`).join('');
    const tr = rows.map((r) => '<tr>' + r.map((c, i) => `<td class="${rightCols.indexOf(i) >= 0 ? 'r' : ''}${c === '—' ? ' na' : ''}">${c}</td>`).join('') + '</tr>').join('');
    return el('table', { class: 'pt', html: `<thead><tr>${th}</tr></thead><tbody>${tr}</tbody>` });
  }
  function cheat(tab) {
    setTop('Ściąga', 'Wypłaty i zasady', '#/');
    const page = el('div', { class: 'page' });
    const tabs = el('div', { class: 'tabs' });
    [['ruletka', 'Ruletka'], ['blackjack', 'Blackjack'], ['poker', 'Poker'], ['uklady', 'Układy']].forEach(([k, t]) => {
      tabs.appendChild(el('button', { type: 'button', class: k === tab ? 'on' : '', text: t, onclick: () => { location.replace('#/sciaga/' + k); } }));
    });
    page.appendChild(tabs);
    if (tab === 'blackjack') cheatBJ(page);
    else if (tab === 'poker') cheatPoker(page);
    else if (tab === 'uklady') cheatHands(page);
    else cheatRoulette(page);
    view.appendChild(page);
  }
  function cheatRoulette(page) {
    const R = KE.ROULETTE;
    const s1 = sec('Wypłaty');
    s1.appendChild(table(['Zakład', 'Numery', 'Wypłata'], [
      ['Plein (numer)', '1', '35:1'], ['Cheval (split)', '2', '17:1'], ['Ulica / trio z zerem', '3', '11:1'],
      ['Carré / pierwsza czwórka', '4', '8:1'], ['Linia (sixain)', '6', '5:1'], ['Tuzin, kolumna', '12', '2:1'], ['Szanse proste', '18', '1:1'],
    ], [1, 2]));
    page.appendChild(s1);
    const s2 = sec('Serie — skład i wypłata za 1 sztukę');
    s2.appendChild(el('p', { class: 'hint', style: { marginTop: '0' }, html: 'Przykład: gracz daje <b>1780 zł</b> na Orphelins (5 sztuk). Najmniej za 25 zł (5 × 5 zł), więc 1780 : 25 = 71, zostaje 5 → <b>za 1775</b>, <b>po 355</b>, <b>zwrot 5</b>. Wypada 17 → 2 cheval (14/17 i 17/20): 2 × 17 = 34 × 355 = <b>12 070 zł</b>.' }));
    const partTxt = (p) => (p.u > 1 ? `${p.nums.join('/')} ×${p.u}` : p.nums.join('/'));
    Object.keys(R.SERIES).forEach((k) => {
      const sr = Object.assign({ k: 1 }, R.SERIES[k]);
      const groups = {};
      for (let n = 0; n <= 36; n++) { const v = R.seriesPay(sr, n).sum; if (v) (groups[v] = groups[v] || []).push(n); }
      const pays = Object.keys(groups).map(Number).sort((a, b) => b - a).map((v) => `<b>${v}</b>: ${groups[v].join(', ')}`).join('<br>');
      s2.appendChild(el('div', { class: 'rank-row', html: `<div class="nm">${sr.name}${sr.alt ? ` (${sr.alt})` : ''} — ${sr.cost} żet.<small>${sr.parts.map(partTxt).join(' · ')}</small><small style="margin-top:4px;color:#d6dcd3">${pays}</small></div>` }));
    });
    s2.appendChild(el('div', { class: 'rank-row', html: '<div class="nm">Numer i sąsiedzi — 5 żet.<small>Plein na numerze i po dwóch sąsiadach z każdej strony na kole. Trafienie: 35 za żeton.</small></div>' }));
    page.appendChild(s2);
    const s3 = sec('Tabliczka wypłat');
    const g = el('div', { class: 'mult' });
    g.appendChild(el('div', { class: 'h k', text: '×' }));
    [35, 17, 11, 8, 5].forEach((m) => g.appendChild(el('div', { class: 'h', text: m })));
    for (let i = 1; i <= 20; i++) {
      g.appendChild(el('div', { class: 'k', text: i }));
      [35, 17, 11, 8, 5].forEach((m) => g.appendChild(el('div', { text: i * m })));
    }
    s3.appendChild(g);
    page.appendChild(s3);
  }
  function cheatBJ(page) {
    const s1 = sec('Zasady');
    s1.appendChild(el('ul', { class: 'rules', html: [
      'Blackjack płaci <b>3:2</b> (stawka + połowa), np. 25 → 37,50.',
      'Krupier dobiera do 16 i <b>stoi na każdej 17</b>, także miękkiej.',
      'Ubezpieczenie do połowy stawki, płaci <b>2:1</b> gdy krupier ma blackjacka.',
      'Po splicie as + dziesiątka to 21, a nie blackjack — płaci 1:1.',
      'Bez zakładów bocznych.',
    ].map((x) => `<li>${x}</li>`).join('') }));
    page.appendChild(s1);
    const s2 = sec('Tabela 3:2');
    const bets = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 125, 150, 175, 200, 250, 300, 350, 400, 450, 500];
    s2.appendChild(table(['Stawka', 'Blackjack', 'Ubezp.', 'Ubezp. 2:1'], bets.map((b) => [fmt(b), fmt(b * 1.5), fmt(b / 2), fmt(b)]), [0, 1, 2, 3]));
    page.appendChild(s2);
  }
  function cheatPoker(page) {
    const P = KE.POKER;
    const rows = ['ak', 'pair', 'two', 'trips', 'straight', 'flush', 'full', 'quads', 'sf', 'royal'];
    const name = { ak: 'As i król', pair: '1 para', two: '2 pary', trips: 'Trójka', straight: 'Strit', flush: 'Kolor', full: 'Ful', quads: 'Kareta', sf: 'Mały poker', royal: 'Duży poker' };
    const cell = (t, k) => (t && t[k] ? fmtOdds(t[k]) : '—');
    const games = [
      ['royal', [['Bet', 'bet'], ['Bonus', 'bonus']]],
      ['lvp', [['Bet', 'bet'], ['Bonus', 'bonus']]],
      ['holdem', [['Bet', 'bet'], ['Bonus', 'bonus']]],
      ['holdemBonus', [['Ante', 'ante'], ['Bonus', 'bonus']]],
      ['american', [['Blind', 'blind'], ['Bonus', 'bonus']]],
    ];
    games.forEach(([id, cols]) => {
      const t = P.PAY[id];
      const s = sec(P.GAMES[id].name);
      const used = rows.filter((k) => cols.some((c) => t[c[1]][k]) || id === 'royal' || (id === 'lvp' && k !== 'ak') || (id === 'american' && (k === 'pair' || k === 'two')));
      const body = used.map((k) => {
        const r = [name[k]].concat(cols.map((c) => cell(t[c[1]], k)));
        if (id === 'holdemBonus' && k === 'pair') r[2] = '2:1 (od 10)';
        if (id === 'american' && cols[0][1] === 'blind' && ['pair', 'two', 'trips', 'none'].indexOf(k) >= 0) r[1] = 'remis';
        return r;
      });
      s.appendChild(table(['Układ'].concat(cols.map((c) => c[0])), body, [1, 2]));
      if (id === 'holdemBonus') s.appendChild(el('p', { class: 'hint', text: 'Bet zawsze 1:1.' }));
      s.appendChild(el('ul', { class: 'rules', style: { marginTop: '10px' }, html: P.RULES[id].map((x) => `<li>${x}</li>`).join('') }));
      page.appendChild(s);
    });
  }
  function cheatHands(page) {
    const C = (s) => s.split(' ').map((t) => { const m = { A: 14, K: 13, Q: 12, J: 11 }; const r = t.slice(0, -1); return { r: m[r] || +r, s: t.slice(-1) }; });
    const list = [
      ['Duży poker', 'strit w kolorze od 10 do asa', 'AS KS QS JS 10S'],
      ['Mały poker', 'strit w jednym kolorze', '9H 8H 7H 6H 5H'],
      ['Kareta', 'cztery karty tej samej wartości', '7S 7H 7D 7C KS'],
      ['Ful', 'trójka + para', 'QS QH QD 4C 4S'],
      ['Kolor', '5 kart w jednym kolorze', 'AD JD 8D 6D 2D'],
      ['Strit', '5 kolejnych wartości (A może być 1)', '5C 4D 3H 2S AC'],
      ['Trójka', 'trzy karty tej samej wartości', '9S 9H 9C KD 3S'],
      ['Dwie pary', '', 'KS KH 5D 5C 2S'],
      ['Para', '', '10S 10D AH 7C 4S'],
      ['As i król', 'tylko Royal — najniższy układ, gra krupiera', 'AS KD 9H 6C 3S'],
    ];
    const s = sec('Układy od najwyższego');
    list.forEach(([n, d, cs]) => {
      const row = el('div', { class: 'rank-row' }, el('div', { class: 'nm', html: `${n}${d ? `<small>${d}</small>` : ''}` }));
      const mc = el('div', { class: 'mini-cards' });
      C(cs).forEach((c) => mc.appendChild(KE.cardEl(c, false)));
      row.appendChild(mc);
      s.appendChild(row);
    });
    page.appendChild(s);
  }

  /* ---------------- statystyki ---------------- */
  function statsView() {
    setTop('Statystyki', 'Twoje postępy', '#/');
    const page = el('div', { class: 'page' });
    const data = Stats.data();
    const order = ['ruletka', 'blackjack', 'royal', 'lvp', 'holdem', 'holdemBonus', 'american'];
    let any = false;
    order.forEach((id) => {
      const m = data.modes[id];
      if (!m || !m.steps) return;
      any = true;
      const pct = Math.round((m.first / m.steps) * 100);
      const s = sec(KE.games[id].title);
      s.appendChild(el('div', { class: 'statgrid', html:
        `<div><b>${m.steps}</b><span>pytań</span></div><div><b>${pct}%</b><span>za 1. razem</span></div>` +
        `<div><b>${m.rounds}</b><span>rozdań</span></div><div><b>${(m.ms / m.steps / 1000).toFixed(1).replace('.', ',')} s</b><span>na pytanie</span></div>` }));
      s.appendChild(el('div', { class: 'bar', html: `<i style="width:${pct}%"></i>` }));
      s.appendChild(el('p', { class: 'hint', text: `Za 2. razem: ${m.second} · błędy: ${m.fail} · najdłuższa seria: ${m.best}` }));
      page.appendChild(s);
    });
    const weak = Object.keys(data.tags).map((k) => data.tags[k]).filter((t) => t.n >= 4).map((t) => Object.assign({ pct: Math.round((t.first / t.n) * 100) }, t)).filter((t) => t.pct < 100).sort((a, b) => a.pct - b.pct || b.n - a.n).slice(0, 10);
    const sw = sec('Do poprawy');
    if (weak.length) weak.forEach((t) => sw.appendChild(el('div', { class: 'weak', html: `<span>${t.label}</span><b>${t.pct}%</b>` })));
    else sw.appendChild(el('p', { class: 'empty-note', text: any ? 'Na razie bez słabych punktów — trenuj dalej.' : 'Zagraj kilka rozdań, a tu pojawią się Twoje najsłabsze typy zadań.' }));
    page.appendChild(sw);
    if (any) {
      page.appendChild(el('button', { class: 'btn danger wide', type: 'button', text: 'Wyzeruj statystyki', onclick: () => {
        if (window.confirm('Usunąć wszystkie statystyki z tego urządzenia?')) { Stats.reset(); route(); KE.toast('Statystyki wyzerowane'); }
      } }));
    }
    view.appendChild(page);
  }

  /* ---------------- ustawienia ---------------- */
  function settingsView() {
    setTop('Ustawienia', 'Dla wszystkich gier', '#/');
    const page = el('div', { class: 'page' });
    const save = () => KE.saveSettings();
    const s1 = sec('Stół');
    s1.appendChild(toggleRow('Kwoty przy żetonach', 'Wyłącz, żeby czytać stawki tylko z kolorów żetonów', settings.showAmounts, (v) => { settings.showAmounts = v; save(); }));
    s1.appendChild(toggleRow('Szybkie animacje', 'Krótsze rozdawanie i przejścia', settings.fastAnim, (v) => { settings.fastAnim = v; save(); }));
    s1.appendChild(toggleRow('Wibracje', 'Krótka wibracja przy odpowiedzi (Android)', settings.vibrate, (v) => { settings.vibrate = v; save(); }));
    page.appendChild(s1);
    const s2 = sec('Wypłaty w pokerze');
    s2.appendChild(segmented([{ v: 'spots', t: 'Każde pole osobno' }, { v: 'total', t: 'Jedna suma' }], settings.payMode, (v) => { settings.payMode = v; save(); }));
    s2.appendChild(el('p', { class: 'hint', text: 'Pole po polu: osobno ante, bet, bonus i ubezpieczenie. Jedna suma: cała wypłata naraz.' }));
    page.appendChild(s2);
    const s3 = sec('Żetony');
    const box = el('div', { class: 'pills' });
    KE.CHIPS.slice().reverse().forEach((c) => box.appendChild(el('span', { class: 'pill-tog', html: `${KE.chipTopSVG(c.v, 30)}${KE.fmt(c.v)} · ${c.name}` })));
    s3.appendChild(box);
    page.appendChild(s3);
    const s4 = sec('O aplikacji');
    s4.appendChild(el('p', { class: 'txt', html: 'Po złym wyniku masz drugą szansę. Po drugim błędzie trener pokazuje całe obliczenie.<br><br>Wszystko działa w przeglądarce i zapisuje się tylko na tym urządzeniu. Po wrzuceniu na hosting dodaj stronę do ekranu głównego, żeby działała jak aplikacja (także offline).' }));
    page.appendChild(s4);
    view.appendChild(page);
  }

  /* ---------------- start ---------------- */
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
