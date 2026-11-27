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
          when: ts ? new Date(ts * 1000) : null, open: !!o.is_market_open, prev: parseFloat(o.previous_close),
          hcp: o.fifty_two_week && isFinite(parseFloat(o.fifty_two_week.high_change_percent)) ? parseFloat(o.fifty_two_week.high_change_percent) : null,
          chg: isFinite(parseFloat(o.percent_change)) ? parseFloat(o.percent_change) : (isFinite(parseFloat(o.previous_close)) ? (price - parseFloat(o.previous_close)) / parseFloat(o.previous_close) * 100 : null), src: F.store.mode === "demo" ? "sample prices (demo mode, not real)" : "Twelve Data (free plan)" };
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
    syncToHA();
    draw();
  }

  // ---------- copy for Jarvis ----------
  // Jarvis can't open the app, so the holdings (numbers only) are copied into a Home Assistant Text helper:
  // "s:<start date>|TSLA:<shares>:<cost €>|TTWO:...|c:<cash €>|i:<money put in €>". The full ledger stays in user data.
  const HOLD = "input_text.finca_portfolio_holdings";
  async function syncToHA() {
    if (F.store.mode === "demo" || !F.store.conn || !started()) return;
    const p = positions(), first = pi.ledger.entries.find(e => e.kind === "deposit");
    const v = ["s:" + String(first.at).slice(0, 10),
      ...Object.entries(p.pos).filter(([, x]) => x.units > 1e-9).map(([sym, x]) => `${sym}:${x.units.toFixed(6)}:${x.costEur.toFixed(2)}`),
      "c:" + p.cash.toFixed(2), "i:" + p.invested.toFixed(2)].join("|").slice(0, 255);
    try {
      if (!F.store.states[HOLD]) {
        await F.store.conn.sendMessagePromise({ type: "input_text/create", name: "Finca portfolio holdings", icon: "mdi:chart-line", min: 0, max: 255, mode: "text" });
        await new Promise(r => setTimeout(r, 1500));
      }
      if ((F.store.states[HOLD] || {}).state !== v)
        await F.store.conn.sendMessagePromise({ type: "call_service", domain: "input_text", service: "set_value", service_data: { value: v }, target: { entity_id: HOLD } });
    } catch (e) { /* Jarvis copy only; the portfolio itself is unaffected */ }
  }

  // ===== 27 Nov (owner): trading (virtual money), search, suggested stocks and the daily suggestion =====
  // Stocks you can search for (all quoted in US dollars on the free Twelve Data plan). Tracking one fetches its price.
  const UNIVERSE = [["AAPL", "Apple"], ["MSFT", "Microsoft"], ["NVDA", "Nvidia"], ["AMZN", "Amazon"], ["GOOGL", "Alphabet (Google)"], ["META", "Meta (Facebook)"],
    ["TSLA", "Tesla"], ["TTWO", "Take-Two Interactive"], ["NFLX", "Netflix"], ["AMD", "AMD"], ["INTC", "Intel"], ["AVGO", "Broadcom"], ["ORCL", "Oracle"],
    ["CRM", "Salesforce"], ["ADBE", "Adobe"], ["CSCO", "Cisco"], ["IBM", "IBM"], ["QCOM", "Qualcomm"], ["TSM", "TSMC"], ["ASML", "ASML"], ["SAP", "SAP"],
    ["SONY", "Sony"], ["EA", "Electronic Arts"], ["RBLX", "Roblox"], ["SPOT", "Spotify"], ["UBER", "Uber"], ["ABNB", "Airbnb"], ["SHOP", "Shopify"],
    ["PYPL", "PayPal"], ["V", "Visa"], ["MA", "Mastercard"], ["JPM", "JPMorgan Chase"], ["BAC", "Bank of America"], ["GS", "Goldman Sachs"],
    ["KO", "Coca-Cola"], ["PEP", "PepsiCo"], ["MCD", "McDonald's"], ["SBUX", "Starbucks"], ["NKE", "Nike"], ["DIS", "Disney"], ["WMT", "Walmart"],
    ["COST", "Costco"], ["PG", "Procter & Gamble"], ["JNJ", "Johnson & Johnson"], ["PFE", "Pfizer"], ["LLY", "Eli Lilly"], ["NVO", "Novo Nordisk"],
    ["UNH", "UnitedHealth"], ["XOM", "ExxonMobil"], ["CVX", "Chevron"], ["SHEL", "Shell"], ["BP", "BP"], ["F", "Ford"], ["GM", "General Motors"],
    ["RIVN", "Rivian"], ["BA", "Boeing"], ["PLTR", "Palantir"], ["COIN", "Coinbase"], ["SPY", "S&P 500 fund (SPY)"], ["QQQ", "Nasdaq 100 fund (QQQ)"],
    ["VTI", "US total market fund (VTI)"], ["VOO", "S&P 500 fund (VOO)"], ["GLD", "Gold fund (GLD)"], ["IWM", "US small companies fund (IWM)"],
    ["VEA", "Developed markets fund (VEA)"], ["VWO", "Emerging markets fund (VWO)"]];
  const COMPANY = Object.fromEntries(UNIVERSE);
  const nameOf = sym => COMPANY[sym] || (pi.quotes[sym] && pi.quotes[sym].name) || sym;
  const WATCH = "input_text.finca_portfolio_watch", DEC = "input_text.finca_portfolio_decision", SUGG = "sensor.finca_portfolio_suggestion";
  const DEFAULT_WATCH = "NVDA,MSFT,AAPL,SPY", MAX_TRACK = 8;
  const ui = { q: "", trade: null };
  const helperVal = id => { const s = F.store.states[id]; return s && !["unknown", "unavailable"].includes(s.state) ? s.state : ""; };
  const watchList = () => (F.store.mode === "demo" ? (pi.demoWatch || DEFAULT_WATCH) : (helperVal(WATCH) || DEFAULT_WATCH)).split(",").map(x => x.trim().toUpperCase()).filter(Boolean);
  const heldSyms = () => Object.entries(positions().pos).filter(([, v]) => v.units > 1e-9).map(([k]) => k);
  const tracked = () => [...new Set([...heldSyms(), ...watchList()])].slice(0, MAX_TRACK);
  async function setHelper(id, name, value) {
    if (F.store.mode === "demo") return;
    if (!F.store.states[id]) { await F.store.conn.sendMessagePromise({ type: "input_text/create", name, icon: "mdi:chart-line", min: 0, max: 255, mode: "text" }).catch(() => {}); await new Promise(r => setTimeout(r, 1500)); }
    await F.store.conn.sendMessagePromise({ type: "call_service", domain: "input_text", service: "set_value", service_data: { value: String(value).slice(0, 255) }, target: { entity_id: id } }).catch(() => {});
  }
  async function setWatch(list) {
    const v = [...new Set(list)].join(",");
    if (F.store.mode === "demo") { pi.demoWatch = v; draw(); return; }
    await setHelper(WATCH, "Finca portfolio watch", v);
    F.store.conn.sendMessagePromise({ type: "fire_event", event_type: "finca_pi_fetch_now" }).catch(() => {});
    setTimeout(async () => { await fetchQuotes(); draw(); }, 20000);   // the new price arrives in about 20 seconds
  }
  function priceOk(sym) { const q = pi.quotes[sym]; const st = status(q); return q && pi.fx && st.label !== "Stale" && st.label !== "No price"; }
  // A simulated trade at the latest verified price (append-only ledger; nothing is real).
  async function trade(kind, sym, eurAmt, note) {
    const q = pi.quotes[sym], p = positions();
    if (!priceOk(sym)) { F.toast(`No up-to-date price for ${nameOf(sym)} yet, so no trade.`); return null; }
    const pxEur = eur(q.price); let units = eurAmt / pxEur;
    if (kind === "buy" && eurAmt > p.cash + 0.005) { F.toast(`Not enough virtual cash: €${fmt(p.cash)} available.`); return null; }
    if (kind === "sell") { const have = (p.pos[sym] || {}).units || 0; if (have <= 1e-9) return null; if (units > have * 0.995) units = have; eurAmt = units * pxEur; }
    if (!(eurAmt > 0.009)) return null;
    const e = { kind, sym, eur: +eurAmt.toFixed(2), units, priceUsd: q.price, priceEur: pxEur, usdPerEur: pi.fx.usdPerEur, priceTime: q.when && q.when.toISOString(), feeEur: 0, note: note || "Simulated (virtual money)", src: q.src };
    await append(e); syncToHA(); return e;
  }
  function tradeSheet(kind, sym) {
    const p = positions(), q = pi.quotes[sym], pxEur = q ? eur(q.price) : null, have = (p.pos[sym] || {}).units || 0, val = pxEur ? have * pxEur : 0;
    const max = kind === "buy" ? p.cash : val;
    ui.trade = { kind, sym, max, pxEur };
    F.sheet(`<h2>${kind === "buy" ? "Buy" : "Sell"} ${F.esc(nameOf(sym))}</h2>
      <p class="row-sub">${F.esc(sym)} · €${fmt(pxEur)} a share (${status(q).label.toLowerCase()}) · ${kind === "buy" ? `virtual cash €${fmt(p.cash)}` : `you hold €${fmt(val)}`}</p>
      ${kind === "buy" && p.cash < 1 ? `<p class="note">${F.icon("info")}<span>No virtual cash left. Sell something first, or add virtual money.</span></p><div class="acts" style="grid-template-columns:1fr"><button class="btn" data-pi="deposit">Add €100 virtual money</button></div>` : ""}
      <div class="pi-quick">${[25, 50, 100].map(x => `<button class="btn btn-sm" data-pi="amt" data-pct="${x}">${x === 100 ? (kind === "buy" ? "All cash" : "All") : x + "%"}</button>`).join("")}</div>
      <label class="row-sub" for="pi-amt">Amount in euros</label>
      <input id="pi-amt" class="sel" type="number" inputmode="decimal" min="0" step="0.01" value="${fmt(Math.min(max, kind === "buy" ? max : max * 0.25)).replace(/,/g, "")}">
      <p class="row-sub" id="pi-prev"></p>
      <div class="acts"><button class="btn" data-action="close">Cancel</button><button class="btn btn-primary" data-pi="confirm">${kind === "buy" ? "Buy" : "Sell"} (virtual)</button></div>`);
    preview();
  }
  function preview() { const t = ui.trade, i = document.getElementById("pi-amt"), o = document.getElementById("pi-prev"); if (!t || !i || !o) return;
    const a = parseFloat(i.value) || 0; o.textContent = t.pxEur ? `≈ ${fmt(a / t.pxEur, 4)} shares${a > t.max + 0.005 ? ` · more than the €${fmt(t.max)} available` : ""}` : ""; }
  // ---- the daily suggestion (worked out in Home Assistant; see tools/pi_suggest.py) ----
  function suggestion() {
    const st = (F.store.states[SUGG] || {}).state || (F.store.mode === "demo" ? "S:TTWO:20>B:NVDA|Take-Two is 66% of the portfolio, too much in one company. Nvidia is 12% below its 52-week high, the strongest of the stocks you track." : "");
    if (!st || !st.includes("|")) return null;
    const [code, ...rest] = st.split("|"), why = rest.join("|"), parts = code.split(">");
    const sell = parts[0].startsWith("S:") ? parts[0].split(":") : null, buyPart = parts.find(x => x.startsWith("B:")), buy = buyPart ? buyPart.split(":")[1] : null;
    const dec = F.store.mode === "demo" ? (pi.demoDec || "") : helperVal(DEC), [dDate, dCode] = dec.split("|");
    const answered = dCode === code && dDate && (Date.now() - Date.parse(dDate)) < 7 * 864e5;
    const p = positions(), sellAmt = sell && pi.quotes[sell[1]] ? ((p.pos[sell[1]] || {}).units || 0) * eur(pi.quotes[sell[1]].price) * (+sell[2] / 100) : 0;
    return { code, why, sell: sell ? { sym: sell[1], pct: +sell[2], eur: sellAmt } : null, buy, cash: p.cash, answered, hold: code === "HOLD" };
  }
  // total value now (cash + holdings at verified prices), for the 30% cap on any single buy
  function totalValue() { const p = positions(); let v = p.cash; Object.entries(p.pos).forEach(([k, x]) => { const q = pi.quotes[k]; if (q && pi.fx && x.units > 0) v += x.units * eur(q.price); }); return v; }
  async function acceptSuggestion(auto) {
    const s = suggestion(); if (!s || s.hold) return "";
    let money = 0; const done = [];
    if (s.sell) { const e = await trade("sell", s.sell.sym, s.sell.eur, `Suggestion: sell ${s.sell.pct}%${auto ? " (approved with Face ID)" : ""}`); if (!e) return ""; money = e.eur; done.push(`sold €${fmt(e.eur)} of ${nameOf(s.sell.sym)}`); }
    if (s.buy) { const cap = totalValue() * 0.30, want = s.sell ? money : positions().cash, amt = Math.min(want, cap);
      const e = amt > 0.5 ? await trade("buy", s.buy, amt, `Suggestion${auto ? " (approved with Face ID)" : ""}`) : null;
      if (e) done.push(`bought €${fmt(e.eur)} of ${nameOf(s.buy)}${want - amt > 0.5 ? ` (capped at 30% of the portfolio; €${fmt(want - amt)} stays as cash)` : ""}`); }
    await decide("done");
    const summary = done.length ? "Done (virtual money): " + done.join(", ") + "." : "Nothing could be traded right now (no up-to-date price).";
    if (!auto) F.toast(summary);
    draw(); return summary;
  }
  // Called by the app when the iPhone (Face ID) approval arrives. Only a Finca app that holds the portfolio acts, and only once.
  async function executeApproved() {
    if (F.store.mode === "demo" || !F.store.conn) return;
    if (!pi.ledger) await load(); if (!started()) return;
    if (Date.now() - pi.quotesAt > 5 * 60000) await fetchQuotes();
    const dec = helperVal(DEC), s = suggestion(); if (!s || s.hold || !/\|approved$/.test(dec) || dec.split("|")[1] !== s.code) return;
    const mine = `${dec.split("|")[0]}|${s.code}|executing-${Math.random().toString(36).slice(2, 7)}`;
    await setHelper(DEC, "Finca portfolio decision", mine); await new Promise(r => setTimeout(r, 1500));
    if (helperVal(DEC) !== mine) return;                       // another device took it
    const summary = await acceptSuggestion(true);
    F.store.conn.sendMessagePromise({ type: "fire_event", event_type: "finca_pi_done", event_data: { summary } }).catch(() => {});
  }
  async function decide(what) { const s = suggestion(); if (!s) return; const v = `${new Date().toISOString().slice(0, 10)}|${s.code}|${what}`;
    if (F.store.mode === "demo") pi.demoDec = v; else await setHelper(DEC, "Finca portfolio decision", v); }
  function suggestionCard() {
    const s = suggestion(); if (!s) return "";
    if (s.hold) return `<article class="card pi-sugg hold"><div class="card-head"><span class="ico">${F.icon("check")}</span><div class="grow"><h3>Today's check: hold</h3><div class="row-sub">${F.esc(s.why)}</div></div></div></article>`;
    const dec = F.store.mode === "demo" ? (pi.demoDec || "") : helperVal(DEC);
    if (dec.split("|")[1] === s.code && /approved$|executing/.test(dec)) return `<article class="card pi-sugg"><div class="card-head"><span class="ico">${F.icon("check")}</span><div class="grow"><h3>Approved on your iPhone</h3><div class="row-sub">Carrying it out…</div></div></div></article>`;
    if (s.answered) return "";
    const what = [s.sell ? `Sell ${s.sell.pct}% of ${nameOf(s.sell.sym)} (≈ €${fmt(s.sell.eur)})` : "", s.buy ? (s.sell ? `buy ${nameOf(s.buy)} with it` : `Buy ${nameOf(s.buy)} with your €${fmt(s.cash)} of virtual cash`) : ""].filter(Boolean).join(" and ");
    return `<article class="card pi-sugg"><div class="card-head"><span class="ico" style="--tint:var(--coral)">${F.icon("sun")}</span><div class="grow"><h3>Today's suggestion</h3><div class="row-sub">Worked out from your holdings and the latest prices</div></div></div>
      <p class="pi-sugg-what">${F.esc(what)}.</p><p class="row-sub">Why: ${F.esc(s.why)}</p>
      <div class="acts pi-sugg-acts"><button class="btn btn-primary" data-pi="sugg-phone">${F.icon("lock")}Send to my iPhone (Face ID)</button><button class="btn" data-pi="sugg-explain">${F.icon("mic")}Jarvis, explain</button><button class="btn btn-ghost" data-pi="sugg-no">Not today</button></div>
      <p class="row-sub" style="margin-top:6px">Simple rules, not advice: sell a holding down 15%; once up 20%, sell half if it slips 8% from its best (let winners run); trim anything oversized; buy the tracked stock nearest its 52-week high unless the news says avoid; no single buy over 30% of the portfolio; no new trades after a 10% bad week.</p></article>`;
  }
  // News check (twice a day) shown under the suggestion
  function researchHtml() {
    const r = F.store.states["sensor.finca_pi_research"], items = r && r.attributes && r.attributes.items; if (!items || !Object.keys(items).length) return "";
    return `<h2 class="section">News check</h2><article class="card"><p class="row-sub" style="margin:0 0 6px">Checked ${F.esc(r.state)} · done twice a day so the suggestion is ready before you ask</p>
      ${Object.entries(items).map(([k, x]) => `<div class="row"><div class="row-body"><div class="row-title">${F.esc(nameOf(k))} <small class="row-sub">${k}</small></div><div class="row-sub">${F.esc(x.why || "")}</div></div><span class="pill ${x.v === "AVOID" ? "warn" : "ok"}">${x.v === "AVOID" ? "Avoid" : "OK"}</span></div>`).join("")}</article>`;
  }
  function ideasHtml(held) {
    const ideas = tracked().filter(sym => !held.includes(sym)).map(sym => { const q = pi.quotes[sym]; return { sym, q, hcp: q && q.hcp !== null ? q.hcp : -999 }; })
      .sort((a, b) => b.hcp - a.hcp);
    return `<h2 class="section">Suggested stocks</h2>
      <p class="row-sub" style="margin:-4px 0 10px">Stocks you track, strongest first (nearest their 52-week high). Tap Buy to invest virtual money.</p>
      <div class="pi-ideas">${ideas.map(i => `<div class="pi-idea"><div><b>${F.esc(nameOf(i.sym))}</b> <small class="row-sub">${i.sym}</small>
          <div class="row-sub">${i.q ? `€${fmt(eur(i.q.price))} · ${i.q.chg === null ? "" : (i.q.chg >= 0 ? "▲" : "▼") + fmt(Math.abs(i.q.chg), 1) + "% today · "}${i.hcp > -999 ? fmt(Math.abs(i.hcp), 0) + "% below its 52-week high" : ""}` : "Price on its way…"}</div></div>
          <button class="btn btn-sm btn-primary" data-pi="buy" data-sym="${i.sym}" ${priceOk(i.sym) ? "" : "disabled"}>Buy</button>
          <button class="btn btn-sm btn-ghost" data-pi="untrack" data-sym="${i.sym}" aria-label="Stop tracking ${F.esc(nameOf(i.sym))}">✕</button></div>`).join("") || '<p class="row-sub">Search below to add stocks to track.</p>'}</div>`;
  }
  function searchResults() {
    const q = ui.q.trim().toLowerCase(); if (!q) return "";
    const tr = tracked(), held = heldSyms();
    const hits = UNIVERSE.filter(([s, n]) => s.toLowerCase().startsWith(q) || n.toLowerCase().includes(q)).slice(0, 8);
    return hits.map(([s, n]) => `<div class="pi-idea"><div><b>${F.esc(n)}</b> <small class="row-sub">${s}</small><div class="row-sub">${pi.quotes[s] ? "€" + fmt(eur(pi.quotes[s].price)) : tr.includes(s) ? "Price on its way…" : "Not tracked yet"}</div></div>
      ${tr.includes(s) ? (priceOk(s) ? `<button class="btn btn-sm btn-primary" data-pi="buy" data-sym="${s}">Buy</button>` : "") + (held.includes(s) ? "" : `<button class="btn btn-sm btn-ghost" data-pi="untrack" data-sym="${s}">Untrack</button>`)
        : `<button class="btn btn-sm" data-pi="track" data-sym="${s}">Track</button>`}</div>`).join("") || `<p class="row-sub">No match. Try a company name, like “Disney”.</p>`;
  }

  // ---------- view ----------
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
          ${!started() ? `<div class="acts" style="grid-template-columns:1fr;margin-top:12px"><button class="btn btn-primary" data-pi="start">Start: €100 Tesla + €100 Take-Two (virtual)</button></div>`
            : `<div class="acts" style="grid-template-columns:1fr;margin-top:12px"><button class="btn btn-sm" data-pi="deposit">Add €100 virtual money</button></div>`}
        </article>
        <article class="card"><div class="card-head"><span class="ico">${F.icon("sun")}</span><div class="grow"><h3>Growth ambition</h3><div class="row-sub">A target, never a reason to take more risk</div></div></div>
          <div class="pi-big">${tgt}%<small> a year</small></div>
          <p class="row-sub">Exceptionally ambitious and possibly unrealistic. Change it any time: <button class="btn btn-sm" data-pi="target">Change</button></p>
        </article>
      </div>
      ${started() ? suggestionCard() : ""}
      ${started() ? researchHtml() : ""}
      <h2 class="section">Holdings</h2>
      <div class="grid g-2">${holdings.map(h => { const s = status(h.q); return `<article class="card">
          <div class="card-head"><span class="ico">${F.icon("chart")}</span><div class="grow"><h3>${F.esc(COMPANY[h.sym] || h.sym)} <small class="row-sub">${h.sym}</small></h3>
            <div class="row-sub">${fmt(h.v.units, 4)} shares (virtual) · cost €${fmt(h.v.costEur)}</div></div><span class="pill ${s.cls}">${s.label}</span></div>
          <div class="pi-row"><div><div class="row-sub">Value</div><b>€${fmt(h.val)}</b></div><div><div class="row-sub">Profit / loss</div><b class="${h.pl >= 0 ? "pi-up" : "pi-down"}">${h.pl === null ? "—" : (h.pl >= 0 ? "+" : "−") + "€" + fmt(Math.abs(h.pl))}</b></div>
            <div><div class="row-sub">Price</div><b>${h.q && eur(h.q.price) != null ? "€" + fmt(eur(h.q.price)) : "—"}</b><div class="row-sub">per share${h.q ? ` (US price $${fmt(h.q.price)})` : ""} · ${h.q && h.q.when ? h.q.when.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""} · ${F.esc(h.q && h.q.ex ? h.q.ex : "")}</div></div></div>
          <div class="acts pi-trade"><button class="btn btn-sm" data-pi="sell" data-sym="${h.sym}" ${priceOk(h.sym) ? "" : "disabled"}>Sell</button><button class="btn btn-sm btn-primary" data-pi="buy" data-sym="${h.sym}" ${priceOk(h.sym) ? "" : "disabled"}>Buy more</button></div>
        </article>`; }).join("") || '<p class="empty">No holdings yet.</p>'}</div>
      ${started() ? ideasHtml(holdings.map(h => h.sym)) : ""}
      ${started() ? `<h2 class="section">Find a stock</h2><article class="card"><input id="pi-q" class="sel" type="search" placeholder="Search: company or symbol, e.g. Disney or AMZN" value="${F.esc(ui.q)}" autocomplete="off">
        <div id="pi-results" class="pi-ideas" style="margin-top:10px">${searchResults()}</div>
        <p class="row-sub" style="margin-top:8px">Tracking up to ${MAX_TRACK} stocks (your holdings count too) keeps prices inside the free data plan. Now tracking ${tracked().length}.</p></article>` : ""}
      <p class="note">${F.icon("info")}<span>Prices: ${F.esc(Object.values(pi.quotes)[0] ? Object.values(pi.quotes)[0].src : "not loaded")}; all amounts in euros, converted from US dollars at ${pi.fx ? `€1 = $${fmt(pi.fx.usdPerEur, 4)} (European Central Bank, ${F.esc(pi.fx.date)})` : "— (exchange rate not loaded, so euro values can't be shown yet)"}. Personal use. Last checked ${pi.quotesAt ? new Date(pi.quotesAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}.</span></p>
      <h2 class="section">History</h2>
      <article class="card">${pi.ledger.entries.slice().reverse().slice(0, 12).map(e => `<div class="row"><div class="row-body"><div class="row-title">${F.esc(e.kind === "deposit" ? "Virtual deposit" : e.kind === "buy" ? "Simulated buy " + e.sym : e.kind === "sell" ? "Simulated sell " + e.sym : e.kind)}</div>
        <div class="row-sub">${new Date(e.at).toLocaleString("en-GB")} · €${fmt(e.eur)}${e.priceEur ? ` at €${fmt(e.priceEur)} a share` : ""}${e.priceUsd ? ` ($${fmt(e.priceUsd)})` : ""}${e.note ? " · " + F.esc(e.note) : ""}</div></div></div>`).join("") || '<p class="row-sub">Nothing yet.</p>'}</article>`;
  }
  function draw() { const el = document.getElementById("pi-root"); if (el) el.innerHTML = html(); }

  document.addEventListener("input", ev => {
    if (ev.target.id === "pi-amt") preview();
    if (ev.target.id === "pi-q") { ui.q = ev.target.value; const r = document.getElementById("pi-results"); if (r) r.innerHTML = searchResults(); }
  });
  document.addEventListener("click", async ev => {
    const b = ev.target.closest("[data-pi]"); if (!b) return;
    const a = b.dataset.pi, sym = b.dataset.sym;
    if (a === "buy" || a === "sell") { tradeSheet(a, sym); return; }
    if (a === "amt" && ui.trade) { const i = document.getElementById("pi-amt"); if (i) { i.value = (ui.trade.max * (+b.dataset.pct) / 100).toFixed(2); preview(); } return; }
    if (a === "confirm" && ui.trade) { const t = ui.trade, amt = parseFloat((document.getElementById("pi-amt") || {}).value) || 0;
      if (amt <= 0) { F.toast("Enter an amount first"); return; }
      b.disabled = true; const e = await trade(t.kind, t.sym, Math.min(amt, t.max), t.kind === "buy" ? "Bought by hand (virtual)" : "Sold by hand (virtual)");
      if (e) { F.closeLayer(); F.toast(`${t.kind === "buy" ? "Bought" : "Sold"} €${fmt(e.eur)} of ${nameOf(t.sym)} (virtual)`); ui.trade = null; draw(); } else b.disabled = false; return; }
    if (a === "deposit") { await append({ kind: "deposit", eur: 100, note: "Virtual money added (not real)" }); syncToHA(); F.closeLayer(); F.toast("€100 of virtual money added"); draw(); return; }
    if (a === "track") { const tr = tracked(); if (tr.length >= MAX_TRACK) { F.toast(`Tracking ${MAX_TRACK} already. Untrack one first (✕ under Suggested stocks).`); return; }
      await setWatch([...watchList(), sym]); F.toast(`Tracking ${nameOf(sym)}. Its price arrives in about 20 seconds.`); draw(); return; }
    if (a === "untrack") { await setWatch(watchList().filter(x => x !== sym)); draw(); return; }
    if (a === "sugg-yes") { b.disabled = true; await acceptSuggestion(); return; }
    if (a === "sugg-phone") { if (F.store.mode === "demo") { F.toast("Demo: on the real system your iPhone gets the request; Approve needs Face ID."); return; }
      F.svc("script", "turn_on", {}, { entity_id: "script.finca_pi_request_approval" }).then(() => F.toast("Sent to your iPhone. Approve there with Face ID.")).catch(() => {}); return; }
    if (a === "sugg-explain") { F.ask("What's my stock suggestion?"); return; }
    if (a === "sugg-no") { await decide("dismissed"); F.toast("OK, not today."); draw(); return; }
    if (b.dataset.pi === "start") { if (!started()) await startPortfolio(); }
    if (b.dataset.pi === "target") {
      const v = prompt("Yearly growth ambition in %, e.g. 20, 50 or 200", String(pi.ledger.target || 200));
      const n = parseFloat(v); if (isFinite(n) && n > 0 && n < 10000) { pi.ledger.target = n; await save(); draw(); }
    }
  });

  window.FincaPI = {
    executeApproved,
    async mount() {
      if (!pi.ledger) await load();
      if (F.store.mode !== "demo") { if (!F.store.states[DEC]) setHelper(DEC, "Finca portfolio decision", "none"); if (!F.store.states[WATCH]) setHelper(WATCH, "Finca portfolio watch", DEFAULT_WATCH); }
      if (Date.now() - pi.quotesAt > 5 * 60000) await fetchQuotes();
      draw();
      syncToHA();
    }
  };
})();
