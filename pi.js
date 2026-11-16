// Finca Ottero — Portfolio Intelligence (DEMO / PAPER TRADING ONLY).
// Separate module, loaded only when opened (More → Extras → Portfolio). No brokerage connection, no real trades, no credentials.
// Prices: Twelve Data quotes (free plan, owner's own key kept in Home Assistant) + ECB euro rates, fetched by Home Assistant into /local/finca-ottero/pi/. Never invented.
// Ledger: append-only, kept in Home Assistant per-user storage (frontend user data, key "finca_pi"). History is never rewritten.
(() => {
  "use strict";
  const F = window.FincaAPI;               // helpers handed over by app.js
  const KEY = "finca_pi";
  const START = { cash: 0, target: 200, created: null };
  const pi = { ledger: null, quotes: {}, fx: null, quotesAt: 0, err: "", busy: false };

  // ---------- storage (Home Assistant user data; demo keeps it in memory) ----------
  async function load() {
    if (F.store.mode === "demo") { pi.ledger = pi.ledger || { v: 1, target: 200, entries: [] }; return; }
    try { const r = await F.store.conn.sendMessagePromise({ type: "frontend/get_user_data", key: KEY }); pi.ledger = (r && r.value) || { v: 1, target: 200, entries: [] }; }
    catch (e) { pi.err = "Couldn't read the virtual portfolio from Home Assistant."; pi.ledger = { v: 1, target: 200, entries: [] }; }
  }
  async function save() {
    if (F.store.mode === "demo") return;
    await F.store.conn.sendMessagePromise({ type: "frontend/set_user_data", key: KEY, value: pi.ledger });
  }
  // append-only: entries are never edited or removed
  async function append(entry) { pi.ledger.entries.push({ ...entry, at: new Date().toISOString() }); await save(); }

  // ---------- market data ----------
  const base = () => (F.store.mode === "demo" ? "pi-demo/" : "/local/finca-ottero/pi/");
  async function fetchQuotes() {
    try {
      const [q, x] = await Promise.all([
        fetch(base() + "quotes.json?t=" + Date.now(), { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).catch(() => null),
        fetch(base() + "ecb.xml?t=" + Date.now(), { cache: "no-store" }).then(r => (r.ok ? r.text() : "")).catch(() => "")]);
      // Twelve Data batch quote: { TSLA: {...}, TTWO: {...} } (or a single object). Validate every number; skip errors.
      const items = q && q.symbol ? { [q.symbol]: q } : (q || {});
      Object.values(items).forEach(o => {
        if (!o || o.status === "error" || !o.symbol) return;
        const price = parseFloat(o.close);
        if (!isFinite(price) || price <= 0) return;
        const ts = +o.last_quote_at || +o.timestamp;
        pi.quotes[o.symbol.toUpperCase()] = { price, ccy: o.currency || "USD", ex: o.exchange || "", name: o.name || "",
          when: ts ? new Date(ts * 1000) : null, open: !!o.is_market_open, prev: parseFloat(o.previous_close), src: F.store.mode === "demo" ? "sample prices (demo mode, not real)" : "Twelve Data (free plan)" };
      });
      if (q && q.code && q.message) pi.err = "Market data: " + q.message;
      pi.keyMissing = !q;
      const m = x.match(/currency=['"]USD['"]\s+rate=['"]([\d.]+)['"]/), dt = x.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/);
      if (m) pi.fx = { usdPerEur: parseFloat(m[1]), date: dt ? dt[1] : "", src: "ECB reference rate" };
      pi.quotesAt = Date.now();
    } catch (e) { pi.err = "Market data unavailable right now; showing the last verified prices."; }
  }
  const status = q => {
    if (!q || !q.when) return { label: "No price", cls: "warn" };
    const age = (Date.now() - q.when) / 3600000;
    return q.open && age < 0.6 ? { label: "Market open", cls: "ok" } : age < 80 ? { label: "Last close", cls: "ok" } : { label: "Stale", cls: "warn" };
  };
  const eur = usd => (pi.fx && isFinite(usd) ? usd / pi.fx.usdPerEur : null);
  const fmt = (n, d = 2) => (n === null || !isFinite(n) ? "—" : n.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d }));

  // ---------- portfolio maths (derived from the ledger) ----------
  function positions() {
    const pos = {}; let cash = 0, invested = 0, realised = 0;
    for (const e of pi.ledger.entries) {
      if (e.kind === "deposit") { cash += e.eur; invested += e.eur; }
      if (e.kind === "buy") { const p = pos[e.sym] || (pos[e.sym] = { units: 0, costEur: 0 }); p.units += e.units; p.costEur += e.eur + (e.feeEur || 0); cash -= e.eur + (e.feeEur || 0); }
      if (e.kind === "sell") { const p = pos[e.sym]; if (!p) continue; const avg = p.costEur / p.units; p.units -= e.units; p.costEur -= avg * e.units; realised += e.eur - (e.feeEur || 0) - avg * e.units; cash += e.eur - (e.feeEur || 0); }
    }
    return { pos, cash, invested, realised };
  }
  const started = () => pi.ledger.entries.some(e => e.kind === "deposit");

  async function startPortfolio() {
    const t = pi.quotes.TSLA, g = pi.quotes.TTWO;
    if (!t || !g || !pi.fx) { F.toast("Waiting for verified prices before starting the virtual portfolio."); return; }
    await append({ kind: "deposit", eur: 200, note: "Virtual starting money (not real)" });
    for (const [sym, q] of [["TSLA", t], ["TTWO", g]]) {
      const pxEur = eur(q.price);
      await append({ kind: "buy", sym, eur: 100, units: 100 / pxEur, priceUsd: q.price, priceEur: pxEur, usdPerEur: pi.fx.usdPerEur, priceTime: q.when && q.when.toISOString(), feeEur: 0,
        note: "Starting holding (simulated)", src: q.src });
    }
    F.toast("Virtual portfolio started: €100 Tesla + €100 Take-Two (simulated)");
    draw();
  }

  // ---------- view ----------
  const COMPANY = { TSLA: "Tesla", TTWO: "Take-Two Interactive" };
  function html() {
    const p = positions(), rows = Object.entries(p.pos).filter(([, v]) => v.units > 1e-9);
    let value = p.cash;
    const holdings = rows.map(([sym, v]) => {
      const q = pi.quotes[sym], px = q ? eur(q.price) : null, val = px !== null ? v.units * px : null;
      if (val !== null) value += val;
      return { sym, v, q, px, val, pl: val !== null ? val - v.costEur : null };
    });
    const total = value, pl = started() ? total - p.invested : null, plPct = pl !== null && p.invested ? pl / p.invested * 100 : null;
    const tgt = pi.ledger.target || 200;
    return `
      <div class="pi-banner">${F.icon("info")}<span><b>Demo · paper trading only.</b> Virtual money, real prices where available. Nothing here is connected to a broker, and nothing here is financial advice.</span></div>
      ${pi.keyMissing && F.store.mode !== "demo" ? `<article class="card" style="margin-bottom:16px"><div class="card-head"><span class="ico">${F.icon("info")}</span><div class="grow"><h3>Connect free market data</h3><div class="row-sub">One-time, about 3 minutes</div></div></div>
        <p class="row-sub">Real prices come from Twelve Data's free plan (no card, no subscription). 1) Sign up at twelvedata.com and copy your API key. 2) In Home Assistant: Settings → Devices &amp; services → Helpers → Create helper → <b>Text</b>, name it <b>Finca market data key</b>, max length 255, and paste the key as its value there. Prices appear within a few minutes.</p></article>` : ""}
      ${pi.err ? `<p class="note">${F.icon("info")}<span>${F.esc(pi.err)}</span></p>` : ""}
      <div class="grid g-2">
        <article class="card"><div class="card-head"><span class="ico">${F.icon("gauge")}</span><div class="grow"><h3>Virtual portfolio</h3><div class="row-sub">Started with €200 (simulated)</div></div></div>
          <div class="pi-big">${started() ? "€" + fmt(total) : "—"}</div>
          <div class="row-sub">${pl === null ? "Not started yet" : `${pl >= 0 ? "▲" : "▼"} €${fmt(Math.abs(pl))} (${fmt(plPct, 1)}%) since start · cash €${fmt(p.cash)}`}</div>
          ${!started() ? `<div class="acts" style="grid-template-columns:1fr;margin-top:12px"><button class="btn btn-primary" data-pi="start">Start: €100 Tesla + €100 Take-Two (virtual)</button></div>` : ""}
        </article>
        <article class="card"><div class="card-head"><span class="ico">${F.icon("sun")}</span><div class="grow"><h3>Growth ambition</h3><div class="row-sub">A target, never a reason to take more risk</div></div></div>
          <div class="pi-big">${tgt}%<small> a year</small></div>
          <p class="row-sub">Exceptionally ambitious and possibly unrealistic. Change it any time: <button class="btn btn-sm" data-pi="target">Change</button></p>
        </article>
      </div>
      <h2 class="section">Holdings</h2>
      <div class="grid g-2">${holdings.map(h => { const s = status(h.q); return `<article class="card">
          <div class="card-head"><span class="ico">${F.icon("chart")}</span><div class="grow"><h3>${F.esc(COMPANY[h.sym] || h.sym)} <small class="row-sub">${h.sym}</small></h3>
            <div class="row-sub">${fmt(h.v.units, 4)} shares (virtual) · cost €${fmt(h.v.costEur)}</div></div><span class="pill ${s.cls}">${s.label}</span></div>
          <div class="pi-row"><div><div class="row-sub">Value</div><b>€${fmt(h.val)}</b></div><div><div class="row-sub">Profit / loss</div><b class="${h.pl >= 0 ? "pi-up" : "pi-down"}">${h.pl === null ? "—" : (h.pl >= 0 ? "+" : "−") + "€" + fmt(Math.abs(h.pl))}</b></div>
            <div><div class="row-sub">Price</div><b>${h.q && eur(h.q.price) != null ? "€" + fmt(eur(h.q.price)) : "—"}</b><div class="row-sub">per share${h.q ? ` (US price $${fmt(h.q.price)})` : ""} · ${h.q && h.q.when ? h.q.when.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""} · ${F.esc(h.q && h.q.ex ? h.q.ex : "")}</div></div></div>
        </article>`; }).join("") || '<p class="empty">No holdings yet.</p>'}</div>
      <p class="note">${F.icon("info")}<span>Prices: ${F.esc(Object.values(pi.quotes)[0] ? Object.values(pi.quotes)[0].src : "not loaded")}; all amounts in euros, converted from US dollars at ${pi.fx ? `€1 = $${fmt(pi.fx.usdPerEur, 4)} (European Central Bank, ${F.esc(pi.fx.date)})` : "— (exchange rate not loaded, so euro values can't be shown yet)"}. Personal use. Last checked ${pi.quotesAt ? new Date(pi.quotesAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}.</span></p>
      <h2 class="section">Coming next</h2>
      <article class="card"><p class="row-sub" style="margin:0">Research and news engine · up to three ideas with risks · portfolio rebalancing suggestions · exit checks for Tesla and Take-Two · simulated trades · performance vs simply holding · Jarvis questions. Built in stages, each tested.</p></article>
      <h2 class="section">History</h2>
      <article class="card">${pi.ledger.entries.slice().reverse().slice(0, 12).map(e => `<div class="row"><div class="row-body"><div class="row-title">${F.esc(e.kind === "deposit" ? "Virtual deposit" : e.kind === "buy" ? "Simulated buy " + e.sym : e.kind === "sell" ? "Simulated sell " + e.sym : e.kind)}</div>
        <div class="row-sub">${new Date(e.at).toLocaleString("en-GB")} · €${fmt(e.eur)}${e.priceEur ? ` at €${fmt(e.priceEur)} a share` : ""}${e.priceUsd ? ` ($${fmt(e.priceUsd)})` : ""}${e.note ? " · " + F.esc(e.note) : ""}</div></div></div>`).join("") || '<p class="row-sub">Nothing yet.</p>'}</article>`;
  }
  function draw() { const el = document.getElementById("pi-root"); if (el) el.innerHTML = html(); }

  document.addEventListener("click", async ev => {
    const b = ev.target.closest("[data-pi]"); if (!b) return;
    if (b.dataset.pi === "start") { if (!started()) await startPortfolio(); }
    if (b.dataset.pi === "target") {
      const v = prompt("Yearly growth ambition in %, e.g. 20, 50 or 200", String(pi.ledger.target || 200));
      const n = parseFloat(v); if (isFinite(n) && n > 0 && n < 10000) { pi.ledger.target = n; await save(); draw(); }
    }
  });

  window.FincaPI = {
    async mount() {
      if (!pi.ledger) await load();
      if (Date.now() - pi.quotesAt > 5 * 60000) await fetchQuotes();
      draw();
    }
  };
})();
