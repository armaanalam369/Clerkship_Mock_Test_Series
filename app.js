/* =====================================================================
   Clerkship · Wise Choice — app.js  (redesigned)
   Needs: data/manifest.js  (RULES, SET_LIST, QUOTES)
          data/set-N.js     (window.SETS['set-N'])  — loaded on demand
   ===================================================================== */
(function () {
'use strict';
const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
window.SETS = window.SETS || {};

/* ---------- config (tiny demo if manifest.js is missing) ---------- */
let R = window.RULES, SL = window.SET_LIST;
const demo = !(R && SL && SL.length);
if (demo) {
  R = { examName: 'Clerkship', minPerQ: .6, negative: .25, drillQuestions: 10, drillMinutes: 10,
        topics: [{ n: 'English', i: '🔤', k: 'ENG' }, { n: 'Indian Polity', i: '🏛️', k: 'POL' }, { n: 'General Mental Ability', i: '🧠', k: 'GMA' }] };
  SL = [{ id: 'demo', title: 'Demo Set', file: '' }];
  window.SETS.demo = { id: 'demo', title: 'Demo Set', questions: [
    { s: 'English', c: 'Synonyms', q: 'Synonym of "RAPID"?', o: ['Slow', 'Quick', 'Late', 'Weak'], a: 1, e: 'Rapid means quick.' },
    { s: 'Indian Polity', c: 'Constitution', q: 'Who chaired the Drafting Committee of the Constituent Assembly?', o: ['Nehru', 'Gandhi', 'B. R. Ambedkar', 'Patel'], a: 2, e: 'Dr B. R. Ambedkar chaired it.' },
    { s: 'General Mental Ability', c: 'Number Series', q: 'Next term: 2, 6, 12, 20, ?', o: ['28', '30', '32', '36'], a: 1, e: 'Differences 4, 6, 8, 10 → 30.' }] };
}
R.minPerQ = R.minPerQ || .6;
const TOPICS = R.topics.map(t => t.n), ICON = {}, CODE = {};
R.topics.forEach(t => { ICON[t.n] = t.i; CODE[t.n] = t.k || t.n.slice(0, 3).toUpperCase(); });
const QUOTES = (window.QUOTES && window.QUOTES.length) ? window.QUOTES : ['Small steps every day beat big plans someday.'];
const ti = s => { const i = TOPICS.indexOf(s); return i < 0 ? 999 : i; };
const app = $('#app'), root = document.documentElement;
const DAY = 864e5, INT = [1, 3, 7, 14];   /* spaced-repetition gaps (days), Leitner boxes 1-4 */

/* ---------- storage ---------- */
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const get = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
const del = k => { try { localStorage.removeItem(k); } catch (e) {} };
const SET = Object.assign({ font: 1, motion: true, showTimer: true, autoNext: false, shuffleQ: false, shuffleO: false, confirmSubmit: true,
  autoWrong: true, haptic: true, wake: false, defMins: 30, defNeg: true, tools: true, fullscreen: true, name: '' }, get('cl_set', {}));
let ATT = get('cl_att', []), SAV = get('cl_sav', {}), DAYM = get('cl_days', {}), SEEN = get('cl_seen', {}),
    DRILL = get('cl_drill', {}), DONE = get('cl_done', {}), PLAN = get('cl_plan', null);
root.dataset.theme = get('cl_t', 'dark'); root.dataset.pal = get('cl_p', 'violet');
const prefs = () => { root.style.setProperty('--fs', ['14.5px', '16px', '18px'][SET.font]); root.dataset.motion = SET.motion ? 'on' : 'off'; };
const saveSet = () => { put('cl_set', SET); prefs(); };
prefs();

/* ---------- helpers ---------- */
const pad = n => String(n).padStart(2, '0');
const dkey = d => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const pdate = s => { const a = s.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]).getTime(); };
const fmt = s => { s = Math.max(0, s | 0); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const tone = p => p >= 75 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444';
const lab = p => p >= 75 ? 'Strong' : p >= 50 ? 'Average' : 'Weak';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = s => String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const fd = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const bar = p => '<div class="bar"><i style="width:' + p + '%;background:' + tone(p) + '"></i></div>';
const inTest = () => document.body.classList.contains('intest');
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const label = q => (ICON[q.s] || '') + ' ' + esc(q.s) + (q.c ? ' · ' + esc(q.c) : '');
const buzz = () => { if (SET.haptic && navigator.vibrate) try { navigator.vibrate(10); } catch (e) {} };
const ask = m => SET.confirmSubmit ? confirm(m) : true;
const FL = { s: '🟢 Sure', g: '🟡 Guess', c: '🔴 Confused', u: '⚪ Not flagged' };
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2600); }
function download(name, txt, mime) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: mime || 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
function getWake() { if (SET.wake && navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { S.wl = l; }).catch(() => {}); }
function relWake() { try { if (S.wl) S.wl.release(); } catch (e) {} S.wl = null; }
function flip(el) { if (el && el.classList.contains('sw') && el.id !== 'tgl') { el.classList.toggle('on'); el.setAttribute('aria-checked', el.classList.contains('on')); } }
function sw(on, act, v) { return '<button class="sw ' + (on ? 'on' : '') + '" role="switch" aria-checked="' + !!on + '" data-act="' + act + '" data-v="' + esc(v || '') + '"><i></i></button>'; }
function seg(act, val, opts, cls) {
  const i = Math.max(0, opts.findIndex(o => String(o[0]) === String(val)));
  return '<div class="seg ' + (cls || '') + '" style="--n:' + opts.length + ';--i:' + i + '"><i></i>' + opts.map(o => '<button class="' + (String(o[0]) === String(val) ? 'on' : '') + '" data-act="' + act + '" data-v="' + esc(o[0]) + '">' + o[1] + '</button>').join('') + '</div>';
}
function stat(l, v, dec, suf) {
  const val = typeof v === 'number' ? '<b data-count="' + v + '" data-dec="' + (dec || 0) + '" data-suf="' + (suf || '') + '">0</b>' : '<b>' + v + '</b>';
  return '<div class="stat"><span>' + l + '</span>' + val + '</div>';
}
function empty(i, t, d) { return '<div class="empty"><b>' + i + '</b><div style="color:var(--tx);font-weight:700">' + t + '</div><div>' + d + '</div></div>'; }
function countUps() {
  $$('[data-count]').forEach(el => {
    const v = parseFloat(el.dataset.count) || 0, d = +el.dataset.dec || 0, suf = el.dataset.suf || '';
    if (!SET.motion || !v) { el.textContent = v.toFixed(d) + suf; return; }
    const t0 = performance.now();
    (function f(t) { const k = Math.min(1, (t - t0) / 900); el.textContent = (v * (1 - Math.pow(1 - k, 3))).toFixed(d) + suf; if (k < 1) requestAnimationFrame(f); })(t0);
  });
}
function render(h, keep) {
  const y = window.scrollY; app.innerHTML = h;
  if (keep) { window.scrollTo(0, y); return; }
  app.classList.remove('in'); void app.offsetWidth; app.classList.add('in'); window.scrollTo(0, 0); countUps();
}
function flame(lit, w) {
  return '<svg class="flame ' + (lit ? '' : 'off') + '" style="width:' + w + 'px;height:' + Math.round(w * 1.25) + 'px" viewBox="0 0 64 80"><path fill="url(#fg)" d="M32 4C34 22 52 30 52 52a20 20 0 0 1-40 0c0-12 6-18 12-26 1 8 4 11 7 12-3-14 0-26 1-34z"/><path fill="#fff4c2" opacity=".85" d="M32 40c6 7 10 12 10 18a10 10 0 0 1-20 0c0-6 4-11 10-18z"/></svg>';
}

/* ---------- state ---------- */
const S = { view: 'home', kind: 'test', scope: 'set', setId: SL[0].id, secs: {}, pool: 'all', cnt: 20, neg: SET.defNeg, mins: SET.defMins, tab: 'last', sf: 'all', planEdit: false,
  run: 'test', mode: 'set', setRef: null, src: '', qs: [], ans: [], qt: [], mk: {}, fl: [], cur: 0, left: 0, total: 0, el: 0, tneg: true, t: null, grid: false,
  paused: false, fs: false, fsx: 0, tabx: 0, tabNote: false, wl: null, peek: {}, ttab: 'pad', tourN: 0 };
TOPICS.forEach(t => { S.secs[t] = false; });
let LOADED = false;

/* ---------- question pool / sets ---------- */
const nQ = id => { const s = window.SETS[id]; return s ? s.questions.length : 0; };
const setTitle = id => { const p = SL.find(x => x.id === id); return p ? p.title : id; };
const setMins = p => { const s = window.SETS[p.id]; return (s && s.minutes) || p.minutes || Math.max(5, Math.ceil(nQ(p.id) * R.minPerQ)); };
function poolQs() { const o = []; SL.forEach(p => { const s = window.SETS[p.id]; if (s) s.questions.forEach((q, i) => o.push({ s: q.s, k: p.id + '#' + i, y: p.id })); }); return o; }
function counts(id, unseen) {
  const c = {}; TOPICS.forEach(t => { c[t] = 0; });
  poolQs().forEach(x => { if (id !== 'all' && x.y !== id) return; if (unseen && SEEN[x.k]) return; if (c[x.s] !== undefined) c[x.s]++; });
  return c;
}
const sumC = (c, only) => Object.keys(c).reduce((n, k) => n + (!only || only[k] ? c[k] : 0), 0);
function load(p) {
  return new Promise((res, rej) => {
    if (window.SETS[p.id]) return res(window.SETS[p.id]);
    const s = document.createElement('script'); s.src = p.file;
    s.onload = () => window.SETS[p.id] ? res(window.SETS[p.id]) : rej(); s.onerror = rej; document.body.appendChild(s);
  });
}
function preload() {
  return Promise.all(SL.map(p => load(p).then(() => p, () => null))).then(r => {
    const ok = r.filter(Boolean);
    if (ok.length && ok.length < SL.length) { SL = ok; if (!SL.find(p => p.id === S.setId)) S.setId = SL[0].id; }
    LOADED = true; if (!inTest() && S.view !== 'result') go(S.view, true);
  });
}

/* ---------- saved questions · smart notes · spaced repetition ---------- */
function ent(q) { const k = q._k || q.k; return SAV[k] || (SAV[k] = { k, s: q.s, c: q.c || '', q: q.q, o: q.o, a: q.a, e: q.e || '', src: q._src || q.src || '' }); }
const keep = (q, f) => { ent(q)[f] = true; };
function persist() { Object.keys(SAV).forEach(k => { const e = SAV[k]; if (!e.b && !e.w && !e.n) delete SAV[k]; }); put('cl_sav', SAV); }
const dueList = () => Object.keys(SAV).map(k => SAV[k]).filter(e => e.w && (e.due || 0) <= today0());
const dueText = e => { const d = Math.round(((e.due || 0) - today0()) / DAY); return d <= 0 ? 'Due today' : 'Review in ' + d + 'd'; };
const noteLine = k => { const e = SAV[k]; return e && e.n ? '<div class="trick">🧠 <b>Your trick:</b> ' + esc(e.n) + '</div>' : ''; };

/* ---------- streaks / analytics aggregates ---------- */
function streakOf(map) { let n = 0; const x = new Date(); if (!map[dkey(x)]) x.setDate(x.getDate() - 1); while (map[dkey(x)]) { n++; x.setDate(x.getDate() - 1); } return n; }
const streak = () => streakOf(DAYM), drillStreak = () => streakOf(DRILL);
function bestStreak() { let b = 0, c = 0, prev = null; Object.keys(DAYM).sort().forEach(k => { const d = new Date(k + 'T00:00'); c = (prev && Math.round((d - prev) / DAY) === 1) ? c + 1 : 1; if (c > b) b = c; prev = d; }); return b; }
function agg() {
  const s = {}; ATT.forEach(a => Object.keys(a.secs).forEach(k => { const v = a.secs[k], x = s[k] || (s[k] = { c: 0, w: 0, n: 0, t: 0 }); x.c += v.c; x.w += v.w; x.n += v.n; x.t += v.t; })); return s;
}
function aggConf() {
  const s = {}; ATT.forEach(a => Object.keys(a.conf || {}).forEach(k => { const v = a.conf[k], x = s[k] || (s[k] = { c: 0, w: 0, n: 0 }); x.c += v.c; x.w += v.w; x.n += v.n; })); return s;
}
const weakFirst = g => Object.keys(g).sort((a, b) => pct(g[a].c, g[a].t) - pct(g[b].c, g[b].t) || ti(a) - ti(b));
function coachInfo() { const g = agg(), ks = weakFirst(g).filter(k => g[k].t >= 3); return ks.length ? { k: ks[0], p: pct(g[ks[0]].c, g[ks[0]].t) } : null; }
const drillTopics = () => { const g = agg(); return weakFirst(g).filter(k => g[k].t >= 2 && TOPICS.indexOf(k) > -1).slice(0, 3); };
const daysLeft = () => PLAN ? Math.round((pdate(PLAN.date) - today0()) / DAY) : null;

/* ---------- Exam Countdown plan (re-computed live, so new sets/questions re-balance it) ---------- */
function buildPlan() {
  const left = daysLeft(); if (left === null) return null;
  if (left < 0) return { expired: true, days: [], st: {} };
  const t0 = today0(), g = agg(), tot = {}, un = {};
  TOPICS.forEach(t => { tot[t] = 0; un[t] = 0; });
  const pq = poolQs(); pq.forEach(x => { if (tot[x.s] !== undefined) { tot[x.s]++; if (!SEEN[x.k]) un[x.s]++; } });
  const order = TOPICS.filter(t => tot[t] > 0).sort((a, b) => {
    const pa = g[a] && g[a].t ? pct(g[a].c, g[a].t) : 45, pb = g[b] && g[b].t ? pct(g[b].c, g[b].t) : 45;
    return pa - pb || un[b] - un[a] || ti(a) - ti(b);
  });
  const seq = order.concat(order.slice(0, Math.ceil(order.length / 3)));      /* weak third gets a second pass */
  const todo = SL.filter(p => window.SETS[p.id] && !DONE[p.id]);
  const unseen = sumC(un), N = left, revN = N >= 5 ? 2 : N >= 3 ? 1 : 0, workN = N - revN;
  const nT = Math.max(2, Math.min(4, Math.ceil(order.length / Math.max(1, workN))));
  const setAt = {}; todo.forEach((s, i) => { if (!workN) return; const k = Math.min(workN - 1, Math.floor((i + 1) * workN / (todo.length + 1))); (setAt[k] = setAt[k] || []).push(s.id); });
  const target = unseen > 0 && workN ? Math.max(10, Math.min(60, Math.ceil(unseen / workN))) : 10;
  const days = [];
  for (let i = 0; i < N; i++) {
    const ts = t0 + i * DAY;
    if (i >= workN) { days.push({ ts, type: 'rev', topics: [], sets: [], q: 15 }); continue; }
    const tp = []; for (let k = 0; tp.length < nT && k < seq.length * 2; k++) { const t = seq[(i * nT + k) % seq.length]; if (tp.indexOf(t) < 0) tp.push(t); }
    days.push({ ts, type: 'study', topics: tp, sets: setAt[i] || [], q: target });
  }
  days.push({ ts: t0 + N * DAY, type: 'exam', topics: [], sets: [], q: 0 });
  return { days, st: { setsLeft: todo.length, sets: SL.length, unseen, total: pq.length, workN, revN } };
}

/* ---------- navigation ---------- */
const NAV = [['home', '🏠', 'Home'], ['practice', '📚', 'Practice'], ['plan', '🗓️', 'Plan'], ['insights', '📊', 'Insights'], ['revise', '🔁', 'Revise'], ['settings', '⚙️', 'Settings']];
function go(v, keep_) {
  if (inTest()) return;
  S.view = v; document.body.dataset.view = v;
  render(VIEWS[v](), keep_); profile(); dock();
}
function dock() {
  const due = dueList().length;
  $('#dock').innerHTML = NAV.map(n => '<button class="' + (S.view === n[0] ? 'on' : '') + '" data-act="nav" data-v="' + n[0] + '" aria-label="' + n[2] + '"><span>' + n[1] + '</span><em>' + n[2] + '</em>' + (n[0] === 'revise' && due ? '<i class="dotb"></i>' : '') + '</button>').join('');
  $('#fabDrill').classList.toggle('done', !!DRILL[dkey()]);
}
function setTest(on) {
  document.body.classList.toggle('intest', on);
  if (on) { $('#tPause').style.display = S.run === 'test' ? '' : 'none'; $('#tPad').style.display = $('#tCalc').style.display = SET.tools ? '' : 'none'; }
}

/* ---------- profile column ---------- */
function heat(W) {
  W = W || 20; const cell = 11, gap = 3, L = 15, today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(today.getDate() - ((W - 1) * 7 + today.getDay()));
  const op = [0, .3, .55, .8, 1], mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; let lastM = -1, act = 0;
  let s = '<svg viewBox="0 0 ' + (L + W * (cell + gap)) + ' ' + (7 * (cell + gap) + 14) + '" style="width:100%;height:auto" role="img" aria-label="Daily practice heatmap">';
  [[1, 'M'], [3, 'W'], [5, 'F']].forEach(x => { s += '<text x="0" y="' + (14 + x[0] * (cell + gap) + 9) + '" font-size="8" style="fill:var(--mu)">' + x[1] + '</text>'; });
  for (let w = 0; w < W; w++) for (let d = 0; d < 7; d++) {
    const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d); if (dt > today) continue;
    const k = dkey(dt), rec = DAYM[k], q = rec ? rec.q : 0, lv = !q ? 0 : q < 10 ? 1 : q < 25 ? 2 : q < 50 ? 3 : 4; if (q) act++;
    if (d === 0 && dt.getMonth() !== lastM) { lastM = dt.getMonth(); s += '<text x="' + (L + w * (cell + gap)) + '" y="9" font-size="8.5" style="fill:var(--mu)">' + mn[lastM] + '</text>'; }
    const x = L + w * (cell + gap), y = 14 + d * (cell + gap);
    s += '<rect class="hc" style="--d:' + (w * 22 + d * 6) + 'ms;fill:' + (lv ? 'var(--a)' : 'var(--bd)') + '" x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" rx="3" fill-opacity="' + (lv ? op[lv] : 1) + '"><title>' + k + ': ' + q + ' question(s)' + (DRILL[k] ? ' · Wise Drill ✔' : '') + '</title></rect>';
    if (DRILL[k]) s += '<circle cx="' + (x + cell / 2) + '" cy="' + (y + cell / 2) + '" r="1.9" fill="#ffd166" stroke="#ff7a1a" stroke-width=".6"/>';
  }
  return { svg: s + '</svg><div class="legend"><span style="margin-right:auto">' + act + ' active day' + (act === 1 ? '' : 's') + ' · 🟡 = drill</span>Less ' + op.map((o, i) => '<i style="' + (i ? 'opacity:' + o : 'background:var(--bd)') + '"></i>').join('') + ' More</div>', act };
}
function profile() {
  const s = streak(), ds = drillStreak(), left = daysLeft(), done = !!DRILL[dkey()], g = agg();
  let c = 0, w = 0, q = 0; Object.keys(g).forEach(k => { c += g[k].c; w += g[k].w; }); Object.keys(DAYM).forEach(k => { q += DAYM[k].q; });
  let cd;
  if (left === null) cd = '<div class="card cdc" data-act="nav" data-v="plan"><div class="cring"><svg viewBox="0 0 84 84"><circle class="t" cx="42" cy="42" r="36"/></svg><div><b>🗓️</b></div></div><div><b>Exam countdown</b><p class="mu" style="margin-top:3px">Set your exam date and get an auto-planned schedule.</p></div></div>';
  else if (left < 0) cd = '<div class="card cdc" data-act="nav" data-v="plan"><div class="cring"><div><b>✓</b></div></div><div><b>Exam date passed</b><p class="mu">Tap to set a new date.</p></div></div>';
  else {
    const total = Math.max(1, Math.round((pdate(PLAN.date) - pdate(PLAN.start || dkey())) / DAY)), p = Math.min(1, Math.max(0, 1 - left / total));
    cd = '<div class="card cdc" data-act="nav" data-v="plan"><div class="cring"><svg viewBox="0 0 84 84"><circle class="t" cx="42" cy="42" r="36"/><circle class="f" cx="42" cy="42" r="36" style="--o:' + (226.2 * (1 - p)).toFixed(1) + '"/></svg><div><b>' + left + '</b><small>days</small></div></div><div><b>' + (left === 0 ? 'Exam day — all the best!' : 'to your exam') + '</b><p class="mu" style="margin-top:3px">' + fd(pdate(PLAN.date)) + ' · tap to view plan</p></div></div>';
  }
  $('#hCd').textContent = left === null ? '🗓️ Set exam date' : left < 0 ? '🗓️ New date' : left === 0 ? '🎯 Exam day' : '⏳ ' + left + ' day' + (left === 1 ? '' : 's');
  const hm = heat(20);
  $('#profile').innerHTML =
    '<div class="card pcard"><div class="avatar"><img src="logo.png" alt="" onerror="this.style.visibility=\'hidden\'"></div><b class="pname" data-act="nav" data-v="settings">' + esc(SET.name || 'Aspirant') + '</b><span class="mu">' + esc(R.examName) + ' aspirant</span>' +
    '<div class="pstats"><div class="ps"><b>' + ATT.length + '</b><small>Tests</small></div><div class="ps"><b>' + q + '</b><small>Questions</small></div><div class="ps"><b>' + (c + w ? pct(c, c + w) + '%' : '–') + '</b><small>Accuracy</small></div></div></div>' +
    '<div class="card flames"><div class="fl">' + flame(ds > 0 || done, 30) + '<span><b>' + ds + '</b><small>drill streak</small></span></div><div class="fl"><span style="font-size:1.6rem">📚</span><span><b>' + s + '</b><small>study streak</small></span></div></div>' +
    cd + '<div class="card heatw"><b style="font-size:.95rem">Activity calendar</b><div style="height:8px"></div>' + hm.svg + '</div>';
}

/* ---------- home ---------- */
const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Late-night grind' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Night owl mode'; };
function miniRing(p, txt) { return '<div class="mring"><svg viewBox="0 0 64 64"><circle class="t" cx="32" cy="32" r="27"/><circle class="f" cx="32" cy="32" r="27" style="--o:' + (169.6 * (1 - p)).toFixed(1) + '"/></svg><b>' + txt + '</b></div>'; }
function missionCard(P) {
  const d = P && P.days[0]; if (!d) return '';
  const done = (DAYM[dkey()] || { q: 0 }).q;
  if (d.type === 'exam') return '<div class="card mission"><div class="mh"><div class="big" style="font-size:2.4rem">🎯</div><div><span class="eyebrow">Exam day</span><h3>Stay calm. You\'ve prepared for this.</h3><p class="mu">Light glance at your trick notes, then go and ace it.</p></div></div></div>';
  const p = Math.min(1, done / Math.max(1, d.q));
  let h = '<div class="card mission"><div class="mh">' + miniRing(p, Math.round(p * 100) + '%') + '<div><span class="eyebrow">' + (d.type === 'rev' ? 'Revision day' : "Today's mission") + '</span><h3>' + (d.type === 'rev' ? 'Revise & consolidate' : d.q + ' questions · ' + d.topics.length + ' focus topics') + '</h3><p class="mu">' + done + ' practised today</p></div></div>';
  if (d.type === 'study') h += '<div class="row" style="margin:10px 0 2px">' + d.topics.map(t => '<span class="tag">' + ICON[t] + ' ' + esc(t) + '</span>').join('') + '</div>';
  h += '<div class="row" style="margin-top:12px">';
  if (d.type === 'study') h += '<button class="btn s" data-act="planstart">▶ Start today\'s practice</button>';
  d.sets.forEach(id => { h += '<button class="btn s" data-act="planset" data-v="' + esc(id) + '">📝 Take ' + esc(setTitle(id)) + '</button>'; });
  if (d.type === 'rev') h += '<button class="btn s" data-act="revdue">🔁 Revise due</button>';
  h += '<button class="btn g s" data-act="drill">⚡ Wise Drill</button></div></div>';
  return h;
}
function vHome() {
  const run = get('cl_run', null), due = dueList().length, c = coachInfo(), dn = !!DRILL[dkey()], ds = drillStreak(), wk = drillTopics(), P = buildPlan();
  let h = '<section class="hero"><span class="eyebrow">' + esc(greet()) + (SET.name ? ', ' + esc(SET.name) : '') + ' 👋</span><h1>Your shortcut to <em>' + esc(R.examName) + '</em> success</h1><p class="mu">Set-wise PYQ mocks, a 10-minute daily drill and a study plan that adapts as you grow.</p></section>';
  h += '<div class="card quote"><span class="mu">💬 Today\'s motivation</span><p>' + esc(QUOTES[Math.floor(today0() / DAY) % QUOTES.length]) + '</p></div>';
  h += '<div class="card drill ' + (dn ? 'done' : '') + '"><div class="dl">' + flame(dn || ds > 0, 62) + '</div><div class="dr"><span class="eyebrow">⚡ Wise Drill · ' + (R.drillMinutes || 10) + ' min</span><h3>' + (dn ? 'Drill done today — streak ' + ds + ' 🔥' : ds ? 'Keep your ' + ds + '-day flame alive' : 'Light your flame today') + '</h3><p class="mu">' + (wk.length ? 'Built from your weakest chapters: ' + wk.map(esc).join(', ') + '.' : 'A quick mixed set. Take a few tests and it will target your weak chapters.') + '</p><div class="row"><button class="btn" data-act="drill">' + (dn ? 'Another drill' : 'Start drill') + ' →</button></div></div></div>';
  if (P && !P.expired) h += missionCard(P);
  else if (!PLAN) h += '<div class="card hint lift"><span><b>🗓️ Exam Countdown plan</b><br><span class="mu">Enter your exam date and get a day-by-day schedule of sets and topics.</span></span><button class="btn s" data-act="nav" data-v="plan">Set date</button></div>';
  if (run && get('cl_run_q', null)) {
    const dn2 = run.ans.filter(x => x !== null).length;
    h += '<div class="card" style="border-color:var(--a)"><b>⏯ Unfinished ' + (run.run === 'quiz' ? 'quiz' : 'test') + '</b><p class="mu" style="margin:4px 0 10px">' + esc(run.src) + ' · Q' + (run.cur + 1) + ' · ' + dn2 + ' answered' + (run.run === 'test' ? ' · ' + fmt(run.left) + ' left' : '') + '</p><div class="row"><button class="btn s" data-act="resume">▶ Resume</button><button class="btn g s" data-act="discard">Discard</button></div></div>';
  }
  if (due) h += '<div class="card hint lift"><span><b>🔁 Revision due: ' + due + '</b><br><span class="mu">Wrong answers (and your memory tricks) are ready for review</span></span><button class="btn s" data-act="revdue">Revise</button></div>';
  h += c ? '<div class="card hint lift"><span><b>🎯 Weak-area coach</b><br><span class="mu">Weakest topic: <b style="color:' + tone(c.p) + '">' + esc(c.k) + ' (' + c.p + '%)</b>. Try 10 questions?</span></span><button class="btn s" data-act="coach" data-v="' + esc(c.k) + '">Practise</button></div>' : '';
  h += '<h2>Question sets</h2><div class="hscroll">' + SL.map(p => {
    const d = DONE[p.id]; return '<button class="setc" data-act="pickset" data-v="' + esc(p.id) + '"><b>' + esc(p.title) + '</b><span class="mu">' + (LOADED ? nQ(p.id) + ' questions' : '…') + '<br>' + (LOADED ? setMins(p) + ' min' : '') + '</span><span class="badge ' + (d ? 'ok' : '') + '">' + (d ? '✓ best ' + d.best + '%' : 'New') + '</span></button>';
  }).join('') + '</div>';
  if (ATT.length) h += '<h2>Recent tests</h2><div class="card">' + ATT.slice(-4).reverse().map(a => '<div class="line"><span>' + esc(a.src) + '<small>' + fd(a.ts) + '</small></span><b>' + a.sc.toFixed(1) + '/' + a.max + '</b></div>').join('') + '</div>';
  return h;
}

/* ---------- practice ---------- */
function vPractice() {
  const q = S.kind === 'quiz', set = S.scope === 'set';
  if (set && S.setId === 'all') S.setId = SL[0].id;
  const un = !set && S.pool === 'unseen', cSel = counts(set ? S.setId : S.setId, un), g = agg();
  let h = '<section class="hero"><span class="eyebrow">Practice</span><h1>Build your <em>session</em></h1></section>';
  h += seg('kind', S.kind, [['test', '📝 Exam test'], ['quiz', '💡 Instant quiz']]) + seg('scope', S.scope, [['set', '📚 Full set'], ['chap', '🧩 Chapter-wise']]);
  if (set) {
    h += '<h2>Choose a set</h2><div class="sgrid">' + SL.map(p => { const d = DONE[p.id]; return '<button class="setc ' + (S.setId === p.id ? 'sel' : '') + '" data-act="setsel" data-v="' + esc(p.id) + '"><b>' + esc(p.title) + '</b><span class="mu">' + (LOADED ? nQ(p.id) + ' Qs · ' + setMins(p) + ' min' : '…') + '</span><span class="badge ' + (d ? 'ok' : '') + '">' + (d ? '✓ best ' + d.best + '%' : 'New') + '</span></button>'; }).join('') + '</div>';
    const cur = SL.find(p => p.id === S.setId);
    h += '<div class="card" style="margin-top:14px"><b>' + (q ? 'Instant-feedback quiz' : 'Standard exam pattern') + '</b><p class="mu" style="margin-top:4px">' + (q ? 'See the answer and explanation after every question. No timer.' : 'Fixed ' + (cur ? setMins(cur) : '–') + ' minutes · all subjects · −' + R.negative.toFixed(2) + ' per wrong answer.') + '</p>' +
      (LOADED ? '<div class="tgrid">' + TOPICS.map(t => { const n = counts(S.setId, false)[t]; return '<span class="tag" style="display:flex;justify-content:space-between;' + (n ? '' : 'opacity:.4') + '">' + ICON[t] + ' ' + esc(CODE[t]) + ' <b>' + n + '</b></span>'; }).join('') + '</div>' : '') + '</div>';
  } else {
    const sel = TOPICS.filter(t => S.secs[t]), selSet = {}; sel.forEach(t => { selSet[t] = 1; });
    const avail = sumC(cSel, selSet);
    h += '<h2>From which set?</h2><select class="sel" id="sfrom"><option value="all"' + (S.setId === 'all' ? ' selected' : '') + '>📚 All sets' + (LOADED ? ' · ' + sumC(counts('all', false)) + ' questions' : '') + '</option>' + SL.map(p => '<option value="' + esc(p.id) + '"' + (S.setId === p.id ? ' selected' : '') + '>' + esc(p.title) + (LOADED ? ' · ' + nQ(p.id) + ' questions' : '') + '</option>').join('') + '</select>';
    h += '<div class="card" style="margin-top:14px"><div class="line" style="padding-top:0"><b>Choose subjects</b><span class="row"><button class="btn g s" data-act="topall">All</button><button class="btn g s" data-act="topweak">🎯 Weakest 3</button><button class="btn g s" data-act="topnone">None</button></span></div>' +
      '<p class="mu"><b style="color:var(--tx)">' + sel.length + '</b> of ' + TOPICS.length + ' subjects · <b style="color:var(--tx)">' + (LOADED ? avail : '…') + '</b> questions available</p><div class="tgrid">' +
      TOPICS.map(t => { const n = cSel[t], gp = g[t] && g[t].t ? pct(g[t].c, g[t].t) : null; return '<button class="chip ' + (S.secs[t] ? 'on' : '') + '" ' + (LOADED && !n && !S.secs[t] ? 'disabled' : '') + ' data-act="sec" data-v="' + esc(t) + '">' + ICON[t] + ' ' + esc(t) + ' <span class="cn">' + (LOADED ? n : '…') + '</span>' + (gp === null ? '' : '<i class="mdot" style="background:' + tone(gp) + '" title="Your accuracy: ' + gp + '%"></i>') + '</button>'; }).join('') +
      '</div><p class="mu" style="margin-top:8px"><i class="mdot" style="background:#10b981;margin-left:0"></i> strong <i class="mdot" style="background:#f59e0b"></i> average <i class="mdot" style="background:#ef4444"></i> weak — from your past tests</p>' +
      '<div class="line"><span>Question pool</span>' + seg('pool', S.pool, [['all', 'All'], ['unseen', '🆕 Unseen']], 'sm') + '</div>' +
      '<div class="line"><span>Number of questions</span><span class="row">' + [10, 20, 30, 0].map(c => '<button class="chip ' + (S.cnt === c ? 'on' : '') + '" style="padding:6px 12px" data-act="cnt" data-v="' + c + '">' + (c || 'All') + '</button>').join('') + '</span></div>';
    if (!q) h += '<div class="line"><span>Time (minutes)</span><input type="number" id="mins" min="1" max="180" value="' + S.mins + '"></div>';
    h += '</div>';
  }
  h += '<div class="card"><div class="line" style="padding-top:0"><span>Negative marking<small>' + (set && !q ? 'Always on for full-set exams' : '−' + R.negative.toFixed(2) + ' per wrong answer') + '</small></span>' + sw(set && !q ? true : S.neg, 'neg') + '</div>' +
    '<div class="line"><span>Rough pad &amp; calculator<small>Show ✏️ and 🧮 during the test</small></span>' + sw(SET.tools, 'tg', 'tools') + '</div>' +
    (!q && set ? '<div class="line" style="padding-bottom:0"><span>Full-screen exam mode<small>Warns if you leave full-screen or switch tabs</small></span>' + sw(SET.fullscreen, 'tg', 'fullscreen') + '</div>' : '') + '</div>';
  const nStart = set ? nQ(S.setId) : Math.min(S.cnt || 1e9, sumC(cSel, (() => { const m = {}; TOPICS.forEach(t => { if (S.secs[t]) m[t] = 1; }); return m; })()));
  h += '<div class="startbar"><button class="btn big" data-act="start">' + (q ? 'Start quiz' : 'Start test') + (LOADED && nStart ? ' · ' + nStart + ' questions' : '') + ' →</button></div>';
  return h + (demo ? '<p class="note">Demo mode: <b>data/manifest.js</b> was not found, so a built-in sample is shown.</p>' : '');
}

/* ---------- plan view ---------- */
function vPlan() {
  const left = daysLeft(), P = buildPlan(), tmr = dkey(new Date(today0() + DAY));
  let h = '<section class="hero"><span class="eyebrow">Exam Countdown</span><h1>Your <em>day-by-day</em> plan</h1><p class="mu">Sets and topics are scheduled automatically — weakest chapters first, a mock set spread through the calendar, and light revision before the exam.</p></section>';
  if (!PLAN || S.planEdit || (P && P.expired)) {
    h += '<div class="card"><b>' + (P && P.expired ? 'Your exam date has passed' : 'When is your exam?') + '</b><p class="mu" style="margin:4px 0 12px">Pick the date and the plan builds itself. You can change it any time.</p><div class="row"><input type="date" id="pdate" min="' + tmr.replace(/^(\d{4}-\d{2}-\d{2})$/, '$1') + '" value="' + (PLAN && !(P && P.expired) ? PLAN.date : '') + '" style="width:auto"><button class="btn" data-act="plansave">' + (PLAN && !S.planEdit ? 'Set new date' : 'Create plan') + '</button>' + (S.planEdit ? '<button class="btn g" data-act="planedit">Cancel</button>' : '') + '</div></div>';
    return h;
  }
  const st = P.st, seen = st.total - st.unseen;
  h += '<div class="card hint"><span><b>Exam: ' + new Date(pdate(PLAN.date)).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</b><br><span class="mu">' + left + ' day' + (left === 1 ? '' : 's') + ' to go</span></span><span class="row"><button class="btn g s" data-act="planedit">✏️ Change</button><button class="btn g s" data-act="plandel">Remove</button></span></div>';
  h += '<div class="stats">' + stat('Sets completed', (st.sets - st.setsLeft) + ' / ' + st.sets) + stat('Questions seen', pct(seen, st.total), 0, '%') + stat('Unseen left', st.unseen) + '</div>';
  h += missionCard(P);
  h += '<h2>Schedule</h2><div class="days">';
  const shown = P.days.slice(0, 45);
  shown.forEach((d, i) => {
    const dt = new Date(d.ts), cls = i === 0 ? 'today' : '';
    h += '<div class="day ' + cls + ' ' + d.type + '"><div class="dd"><b>' + dt.getDate() + '</b><small>' + dt.toLocaleDateString('en-IN', { month: 'short' }) + '<br>' + dt.toLocaleDateString('en-IN', { weekday: 'short' }) + '</small></div><div class="dc">';
    if (d.type === 'exam') h += '<b>🎯 Exam day</b><p class="mu">Rest, glance at your tricks, and go.</p>';
    else if (d.type === 'rev') h += '<b>🔁 Revision day</b><p class="mu">Clear due wrong answers, replay memory tricks, one Wise Drill.</p>';
    else {
      h += '<b>' + d.q + ' questions' + (d.sets.length ? ' + mock' : '') + '</b><div class="row">' + d.topics.map(t => '<span class="tag">' + ICON[t] + ' ' + esc(CODE[t]) + '</span>').join('') + d.sets.map(id => '<span class="badge" style="margin:0;border-color:var(--a)">📝 ' + esc(setTitle(id)) + '</span>').join('') + '</div>';
    }
    h += '</div></div>';
  });
  h += '</div>';
  if (P.days.length > shown.length) h += '<p class="mu" style="text-align:center">+ ' + (P.days.length - shown.length) + ' more days — the plan extends automatically as the date gets closer.</p>';
  h += '<p class="note">♻️ This plan is re-calculated every time you open it, so new sets and questions you add (and the topics you get better at) re-balance the schedule automatically.</p>';
  return h;
}

/* ---------- analytics ---------- */
function radar(map) {
  const N = TOPICS.length, cx = 170, cy = 160, r = 96, f1 = n => n.toFixed(1);
  const pt = (i, v) => { const a = -Math.PI / 2 + 2 * Math.PI * i / N; return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v]; };
  let s = '<svg viewBox="0 0 340 320" style="width:100%;height:auto" class="rsvg" role="img" aria-label="Radar chart of topic strengths">';
  [.25, .5, .75, 1].forEach(l => { s += '<polygon points="' + TOPICS.map((_, i) => pt(i, l).map(f1).join(',')).join(' ') + '" fill="none" stroke="var(--bd)" stroke-width="1"/>'; });
  TOPICS.forEach((t, i) => {
    const e = pt(i, 1), l = pt(i, 1.17), c = Math.cos(-Math.PI / 2 + 2 * Math.PI * i / N), has = !!(map[t] && map[t].t);
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f1(e[0]) + '" y2="' + f1(e[1]) + '" stroke="var(--bd)"/><text x="' + f1(l[0]) + '" y="' + f1(l[1] + 3) + '" text-anchor="' + (c > .3 ? 'start' : c < -.3 ? 'end' : 'middle') + '" font-size="9" font-weight="700" style="fill:var(--mu)" opacity="' + (has ? 1 : .4) + '">' + esc(CODE[t]) + '</text>';
  });
  const vals = TOPICS.map((t, i) => { const m = map[t]; return pt(i, m && m.t ? pct(m.c, m.t) / 100 : 0); });
  s += '<polygon points="' + vals.map(p => p.map(f1).join(',')).join(' ') + '" style="fill:var(--a);stroke:var(--a)" fill-opacity=".28" stroke-width="2" stroke-linejoin="round"/>';
  vals.forEach((p, i) => { const m = map[TOPICS[i]]; if (m && m.t) s += '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="3" fill="' + tone(pct(m.c, m.t)) + '"/>'; });
  return s + '</svg><div class="codes">' + TOPICS.map(t => '<span><b>' + esc(CODE[t]) + '</b> ' + esc(t) + '</span>').join('') + '</div>';
}
function bars(map) {
  const rh = 19; let s = '<svg viewBox="0 0 340 ' + (TOPICS.length * rh + 6) + '" style="width:100%;height:auto" role="img" aria-label="Accuracy by topic">';
  TOPICS.forEach((t, i) => {
    const y = i * rh + 3, has = map[t] && map[t].t, p = has ? pct(map[t].c, map[t].t) : 0;
    s += '<text x="0" y="' + (y + 11) + '" font-size="9.5" style="fill:var(--tx)" opacity="' + (has ? 1 : .45) + '">' + esc(t) + '</text><rect x="132" y="' + (y + 2) + '" width="170" height="10" rx="5" style="fill:var(--bd)"/>' +
      (has ? '<rect x="132" y="' + (y + 2) + '" width="' + Math.max(4, p * 1.7) + '" height="10" rx="5" fill="' + tone(p) + '"/>' : '') +
      '<text x="340" y="' + (y + 11) + '" text-anchor="end" font-size="9.5" font-weight="700" style="fill:var(--mu)">' + (has ? p + '%' : '–') + '</text>';
  });
  return s + '</svg>';
}
function trow(k, v, btn) {
  const p = pct(v.c, v.t);
  return '<div class="card"><div class="line" style="padding:0"><b>' + (ICON[k] || '') + ' ' + esc(k) + '</b><b style="color:' + tone(p) + '">' + p + '% · ' + lab(p) + '</b></div><div class="line" style="padding:4px 0 0"><span class="mu">' + v.c + '/' + v.t + ' correct · ' + v.w + ' wrong · ' + v.n + ' skipped</span>' + (btn ? '<button class="btn g s" data-act="ptopic" data-v="' + esc(k) + '">Practise</button>' : '') + '</div>' + bar(p) + '</div>';
}
function nums(list, col, max) {
  max = max || 15; if (!list.length) return '<span class="mu">None 🎉</span>';
  return '<div class="cnum">' + list.slice(0, max).map(n => '<span style="background:' + col + '">' + n + '</span>').join('') + (list.length > max ? '<span class="mu" style="background:none;color:var(--mu)">+' + (list.length - max) + ' more</span>' : '') + '</div>';
}
function timeBlock(a) {
  const n = a.det.length, avg = a.det.reduce((s, d) => s + d.t, 0) / n || 1;
  const ids = fn => a.det.map((d, i) => fn(d) ? i + 1 : 0).filter(Boolean);
  const sw_ = ids(d => d.r === 'w' && d.t >= 1.5 * avg), fw = ids(d => d.r === 'w' && d.t <= .5 * avg), sr = ids(d => d.r === 'c' && d.t >= 1.5 * avg);
  const tm = {}; a.det.forEach(d => { const x = tm[d.s] || (tm[d.s] = { t: 0, n: 0 }); x.t += d.t; x.n++; });
  const ks = Object.keys(tm).sort((x, y) => ti(x) - ti(y)), mx = Math.max.apply(null, ks.map(k => tm[k].t / tm[k].n)) || 1;
  return '<div class="sec">Time per question</div><div class="card"><p class="mu">Average: <b style="color:var(--tx)">' + avg.toFixed(0) + 's</b> per question' + (a.total ? ' · exam pace target ' + Math.round(a.total / n) + 's' : '') + '</p>' +
    '<div class="line" style="padding-bottom:0"><b>🐢 Slow &amp; wrong</b></div><span class="mu">Took 1.5× the average and still missed — likely concept gaps.</span>' + nums(sw_, '#ef4444') +
    '<div class="line" style="padding-bottom:0"><b>⚡ Fast &amp; wrong</b></div><span class="mu">Under half the average — rushed or guessed.</span>' + nums(fw, '#f59e0b') +
    '<div class="line" style="padding-bottom:0"><b>🐌 Slow but right</b></div><span class="mu">Correct, but costly — practise for speed.</span>' + nums(sr, '#3b82f6') + '</div>' +
    '<div class="card"><b>Average time by topic</b>' + ks.map(k => { const v = tm[k].t / tm[k].n; return '<div class="line" style="padding:6px 0 0"><span>' + (ICON[k] || '') + ' ' + esc(CODE[k]) + '</span><b>' + v.toFixed(0) + 's</b></div><div class="bar" style="margin:4px 0 2px"><i style="width:' + Math.round(v / mx * 100) + '%"></i></div>'; }).join('') + '</div>';
}
function confBlock(cf) {
  const keys = ['s', 'g', 'c', 'u'].filter(k => cf[k]); if (!keys.length) return '';
  const tot = k => cf[k] ? cf[k].c + cf[k].w + cf[k].n : 0;
  if (keys.length === 1 && keys[0] === 'u') return '<div class="sec">Confidence check</div><div class="card"><p class="mu">Tap 🟢 Sure / 🟡 Guess / 🔴 Confused while answering and this section will show how well your confidence matches your results.</p></div>';
  let h = '<div class="sec">Confidence check</div><div class="card"><div class="mtx"><b></b><b>Right</b><b>Wrong</b><b>Skipped</b>' + keys.map(k => { const v = cf[k]; return '<span class="l">' + FL[k] + '</span><span style="color:#10b981">' + v.c + '</span><span style="color:#ef4444">' + v.w + '</span><span>' + v.n + '</span>'; }).join('') + '</div>';
  if (cf.s && cf.s.w) h += '<p style="margin-top:10px">⚠️ <b>' + cf.s.w + '</b> "Sure" answer(s) were wrong — overconfidence. Revise those concepts first.</p>';
  if (cf.g && cf.g.c) h += '<p style="margin-top:8px">🍀 <b>' + cf.g.c + '</b> right guess(es) — lucky, not learned. Re-check them.</p>';
  if (cf.s && tot('s') && !cf.s.w) h += '<p style="margin-top:8px">✅ Your "Sure" answers were all correct — great calibration.</p>';
  return h + '</div>';
}
function tLast() {
  const a = ATT[ATT.length - 1]; if (!a) return empty('📊', 'No test yet', 'Finish a test and its full analysis shows up here.');
  let c = 0, w = 0; Object.keys(a.secs).forEach(k => { c += a.secs[k].c; w += a.secs[k].w; });
  return '<p class="mu" style="margin-bottom:10px">' + esc(a.src) + ' · ' + new Date(a.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</p>' +
    '<div class="stats">' + stat('Score', a.sc.toFixed(2) + ' / ' + a.max) + stat('Accuracy', pct(c, c + w), 0, '%') + stat('Attempted', (c + w) + ' / ' + a.max) + stat('Negative marks', '−' + (w * (a.neg || 0)).toFixed(2)) + stat('Avg time / Q', Math.round(a.used / a.max) + 's') + stat('Time taken', fmt(a.used)) + ((a.fsx || a.tabx) ? stat('Focus lapses', '⚠️ ' + ((a.fsx || 0) + (a.tabx || 0))) : '') + '</div>' +
    '<div class="row" style="margin-bottom:12px"><button class="btn" data-act="report" data-v="test">📄 Test report (PDF)</button>' + (a.full ? '<button class="btn g" data-act="exportq">⬇ Export CSV</button>' : '') + '</div>' +
    '<div class="sec">Strength radar</div><div class="card">' + radar(a.secs) + '</div>' +
    '<div class="sec">Question map</div><div class="strip">' + a.det.map((d, i) => '<span style="background:' + (d.r === 'c' ? '#10b981' : d.r === 'w' ? '#ef4444' : '#6b7280') + '">' + (i + 1) + '</span>').join('') + '</div>' +
    timeBlock(a) + confBlock(a.conf || {}) +
    '<div class="sec">Topic-wise (this test)</div>' + Object.keys(a.secs).sort((x, y) => ti(x) - ti(y)).map(k => trow(k, a.secs[k])).join('');
}
function spark() {
  const p = ATT.slice(-12).map(a => Math.max(0, Math.min(100, a.sc / a.max * 100)));
  if (p.length < 2) return '<p class="mu">Take 2+ tests to see your trend.</p>';
  return '<svg viewBox="0 0 200 50" preserveAspectRatio="none" style="width:100%;height:70px"><polyline points="' + p.map((v, i) => (i * 200 / (p.length - 1)).toFixed(1) + ',' + (48 - v * .46).toFixed(1)).join(' ') + '" fill="none" style="stroke:var(--a)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
}
function tAll() {
  const g = agg(); let c = 0, w = 0, t = 0, best = 0, sum = 0; const s = streak();
  Object.keys(g).forEach(k => { c += g[k].c; w += g[k].w; });
  ATT.forEach(a => { const p = a.sc / a.max * 100; sum += p; if (p > best) best = p; t += a.used; });
  let h = '<div class="stats">' + stat('Tests taken', ATT.length) + stat('Avg score', ATT.length ? Math.round(sum / ATT.length) : '–', 0, ATT.length ? '%' : '') + stat('Best score', ATT.length ? Math.round(best) : '–', 0, ATT.length ? '%' : '') + stat('Accuracy', ATT.length ? pct(c, c + w) : '–', 0, ATT.length ? '%' : '') + stat('Study streak', '🔥 ' + s + 'd') + stat('Best streak', '🏆 ' + bestStreak() + 'd') + '</div>';
  if (!ATT.length) return h + empty('📈', 'No test data yet', 'Radar, bar charts and trends appear after your first test.');
  const weak = weakFirst(g).slice(0, 3);
  return h + '<div class="card"><span class="mu">Score trend (last 12 tests)</span>' + spark() + '</div>' +
    '<div class="sec">Strength radar (all tests)</div><div class="card">' + radar(g) + '</div><div class="sec">Accuracy by topic</div><div class="card">' + bars(g) + '</div>' + confBlock(aggConf()) +
    '<div class="sec">Focus on these topics</div>' + weak.map(k => trow(k, g[k], true)).join('') +
    '<div class="sec">Recent tests</div><div class="card">' + ATT.slice(-5).reverse().map(a => '<div class="line"><span>' + esc(a.src) + '<small>' + fd(a.ts) + '</small></span><b>' + a.sc.toFixed(1) + '/' + a.max + '</b></div>').join('') + '</div>' +
    '<div class="mu">Total practice time: ' + Math.round(t / 60) + ' min</div>';
}
function tTopics() {
  if (!ATT.length) return empty('📚', 'No topic data', 'Take a test and all topics will be ranked here, weakest first.');
  const g = agg(), done = weakFirst(g), un = TOPICS.filter(k => !g[k]);
  return '<div class="card">' + bars(g) + '</div><p class="mu" style="margin-bottom:10px">Weakest topics first — tap Practise to drill one.</p>' + done.map(k => trow(k, g[k], true)).join('') +
    (un.length ? '<div class="sec">Not attempted yet (' + un.length + ')</div><div class="tgrid">' + un.map(k => '<button class="chip" data-act="ptopic" data-v="' + esc(k) + '">' + ICON[k] + ' ' + esc(k) + '</button>').join('') + '</div>' : '');
}
function tReports() {
  const w = weekData(), a = ATT[ATT.length - 1];
  return '<p class="mu" style="margin-bottom:12px">One-page A4 reports you can save as PDF and share with a mentor.</p>' +
    '<div class="card lift"><span class="eyebrow">Weekly report</span><h3 style="margin:4px 0">' + fd(w.from) + ' – ' + fd(w.to) + '</h3><p class="mu">' + w.q + ' questions · ' + w.active + ' active days · ' + w.at.length + ' tests · ' + w.dd + ' drills</p><div class="row" style="margin-top:12px"><button class="btn" data-act="report" data-v="week">📄 Weekly progress report</button></div></div>' +
    '<div class="card lift"><span class="eyebrow">Latest test</span><h3 style="margin:4px 0">' + (a ? esc(a.src) : 'No test yet') + '</h3><p class="mu">' + (a ? a.sc.toFixed(1) + ' / ' + a.max + ' · ' + fd(a.ts) : 'Finish a test to unlock its report.') + '</p><div class="row" style="margin-top:12px"><button class="btn" ' + (a ? '' : 'disabled style="opacity:.4"') + ' data-act="report" data-v="test">📄 Latest test report</button></div></div>' +
    '<p class="note">Tip: in the preview press <b>Save as PDF / Print</b> and choose “Save as PDF” as the destination. Add your name in Settings so it appears on the report.</p>';
}
function vInsights() {
  return '<section class="hero"><span class="eyebrow">Insights</span><h1>Know your <em>strengths</em></h1></section>' +
    seg('tab', S.tab, [['last', '📊 Last'], ['all', '📈 Overall'], ['chap', '📚 Topics'], ['rep', '📄 Reports']], 'sm') + '<div>' + ({ last: tLast, all: tAll, chap: tTopics, rep: tReports })[S.tab]() + '</div>';
}

/* ---------- revision notebook ---------- */
function savedList() {
  return Object.keys(SAV).map(k => SAV[k]).filter(e => S.sf === 'all' || (S.sf === 'b' && e.b) || (S.sf === 'w' && e.w) || (S.sf === 'n' && e.n) || (S.sf === 'd' && e.w && (e.due || 0) <= today0()))
    .sort((a, b) => (a.due || 0) - (b.due || 0));
}
function vRevise() {
  const all = Object.keys(SAV).length, l = savedList(), due = dueList().length, nn = Object.keys(SAV).filter(k => SAV[k].n).length;
  let h = '<section class="hero"><span class="eyebrow">Revision</span><h1>Revise <em>smarter</em></h1><p class="mu">Wrong answers return after 1 → 3 → 7 → 14 days, with your memory tricks attached.</p></section>' +
    '<div class="chips sm">' + [['all', 'All (' + all + ')'], ['d', '🔁 Due (' + due + ')'], ['w', '❌ Wrong'], ['b', '🔖 Saved'], ['n', '🧠 Tricks (' + nn + ')']].map(x => '<button class="chip ' + (S.sf === x[0] ? 'on' : '') + '" data-act="sfil" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
  if (!l.length) return h + empty('🔖', 'Nothing here', S.sf === 'd' ? 'No revision due today. Nice work! 🎉' : 'Tap 🔖 Save or 🧠 Trick during a test. Wrong answers are saved automatically.');
  return h + '<button class="btn big" data-act="practice" style="margin-bottom:14px">▶ Practise these (' + l.length + ')</button>' + l.map(e =>
    '<div class="card"><div class="line" style="padding:0 0 6px"><span><span class="tag">' + esc(e.s) + (e.c ? ' · ' + esc(e.c) : '') + '</span> ' + (e.w ? '<span class="tag" style="color:#ef4444">wrong · box ' + (e.box || 1) + ' · ' + dueText(e) + '</span>' : '') + '</span><span class="row"><button class="btn g s" data-act="enote" data-v="' + esc(e.k) + '">🧠</button><button class="btn g s" data-act="delsav" data-v="' + esc(e.k) + '">🗑</button></span></div><b class="qt">' + e.q + '</b><div class="opt ok" style="margin-top:10px">✅ ' + 'ABCD'.charAt(e.a) + '. ' + e.o[e.a] + '</div>' + (e.e ? '<div class="expl">💡 ' + e.e + '</div>' : '') + noteLine(e.k) + '<span class="mu">' + esc(e.src) + '</span></div>').join('');
}

/* ---------- settings ---------- */
function setRow(l, d, c) { return '<div class="line"><span>' + l + (d ? '<small>' + d + '</small>' : '') + '</span>' + c + '</div>'; }
function vSettings() {
  const kb = Math.round((JSON.stringify(ATT).length + JSON.stringify(SAV).length) / 1024 * 10) / 10, cols = { violet: '#7b6cff', ocean: '#22b8cf', sunset: '#ff8a3d', forest: '#2fbf8f', rose: '#f0567a' };
  return '<section class="hero"><span class="eyebrow">Settings</span><h1>Make it <em>yours</em></h1></section>' +
    '<h2>Profile</h2><div class="card">' + setRow('Your name', 'Shown on the profile and PDF reports', '<input type="text" class="tin" id="nm" style="width:170px" maxlength="30" placeholder="Name" value="' + esc(SET.name) + '">') + '</div>' +
    '<h2>Appearance</h2><div class="card">' + setRow('Dark mode', '', sw(root.dataset.theme === 'dark', 'theme')) +
    '<div class="line"><span>Colour palette</span><span class="row">' + Object.keys(cols).map(k => '<button class="dot ' + (root.dataset.pal === k ? 'on' : '') + '" data-act="pick" data-v="' + k + '" style="background:' + cols[k] + '" aria-label="' + k + '"></button>').join('') + '</span></div>' +
    '<div class="line"><span>Text size</span>' + seg('font', SET.font, [[0, 'A−'], [1, 'A'], [2, 'A+']], 'sm') + '</div>' + setRow('Motion graphics', 'Turn off to save battery', sw(SET.motion, 'tg', 'motion')) + '</div>' +
    '<h2>Test experience</h2><div class="card">' +
    setRow('Rough pad &amp; calculator', 'Buttons shown during tests', sw(SET.tools, 'tg', 'tools')) + setRow('Full-screen exam mode', 'Full-set exam tests only', sw(SET.fullscreen, 'tg', 'fullscreen')) +
    setRow('Show timer', 'Hide it to reduce pressure', sw(SET.showTimer, 'tg', 'showTimer')) + setRow('Auto-next on answer', 'Jump ahead after choosing', sw(SET.autoNext, 'tg', 'autoNext')) +
    setRow('Shuffle questions', 'Within each topic', sw(SET.shuffleQ, 'tg', 'shuffleQ')) + setRow('Shuffle options', 'Stops memorising positions', sw(SET.shuffleO, 'tg', 'shuffleO')) +
    setRow('Confirm before submit', '', sw(SET.confirmSubmit, 'tg', 'confirmSubmit')) + setRow('Auto-save wrong answers', 'Builds your revision notebook', sw(SET.autoWrong, 'tg', 'autoWrong')) +
    setRow('Haptic feedback', 'Light vibration on taps', sw(SET.haptic, 'tg', 'haptic')) + setRow('Keep screen awake', 'During tests', sw(SET.wake, 'tg', 'wake')) +
    setRow('Default chapter-test time', 'Minutes', '<input type="number" id="dm" min="1" max="180" value="' + SET.defMins + '">') + setRow('Negative marking by default', 'For chapter-wise tests', sw(SET.defNeg, 'tg', 'defNeg')) + '</div>' +
    '<h2>Help</h2><div class="card"><button class="btn g s" data-act="tour">▶ Replay the app tour</button></div>' +
    '<h2>Data</h2><div class="card"><p class="mu" style="margin-bottom:10px">Stored on this device: ' + ATT.length + ' tests · ' + Object.keys(SAV).length + ' saved questions · ' + kb + ' KB</p><div class="row"><button class="btn g s" data-act="export">⬇ Backup</button><button class="btn g s" data-act="import">⬆ Restore</button><button class="btn g s" data-act="wipe" style="color:#ef4444">🗑 Clear data</button></div></div>' +
    '<p class="mu" style="text-align:center;margin-top:14px">Clerkship · Wise Choice</p>';
}
const VIEWS = { home: vHome, practice: vPractice, plan: vPlan, insights: vInsights, revise: vRevise, settings: vSettings };

/* ---------- starting sessions ---------- */
async function launch(cfg) {
  if (inTest()) return;
  const sec = cfg.mode === 'sec', list = SL.filter(p => sec ? (cfg.setId === 'all' || p.id === cfg.setId) : p.id === cfg.setId);
  if (!list.length) return alert('Please choose a set.');
  if (sec && !cfg.secs.length) return alert('Select at least one subject.');
  if (get('cl_run', null) && !confirm('You have an unfinished session. Discard it and start a new one?')) return;
  const exam = !sec && cfg.kind === 'test';
  reqFS(exam);   /* must run inside the click gesture, before any await */
  let papers; try { papers = await Promise.all(list.map(load)); } catch (e) { exitFS(); return alert('Could not load a set file. Check the paths in data/manifest.js.'); }
  let qs = []; papers.forEach((p, pi) => p.questions.forEach((q, i) => { if (!sec || cfg.secs.indexOf(q.s) > -1) qs.push(Object.assign({}, q, { _k: list[pi].id + '#' + i, _src: R.examName + ' · ' + list[pi].title })); }));
  if (sec && cfg.pool === 'unseen') qs = qs.filter(q => !SEEN[q._k]);
  if (!qs.length) { exitFS(); return alert(sec && cfg.pool === 'unseen' ? 'You have already seen every question in this selection. Switch the pool to "All".' : 'No questions found for this selection.'); }
  let total = 0; if (cfg.kind === 'test') total = exam ? setMins(list[0]) * 60 : Math.max(1, cfg.mins || 30) * 60;
  if (sec) {
    if (cfg.cnt > 0 && qs.length > cfg.cnt) qs = shuf(qs).slice(0, cfg.cnt);
    qs.sort((a, b) => ti(a.s) - ti(b.s)); S.src = R.examName + ' · Chapter practice' + (cfg.setId === 'all' ? '' : ' · ' + list[0].title);
  } else S.src = R.examName + ' · ' + list[0].title;
  S.setRef = sec ? null : list[0].id;
  begin(qs, total, cfg.kind, sec ? 'sec' : 'set', exam ? true : !!cfg.neg);
}
function startFromPractice() {
  const set = S.scope === 'set';
  launch({ mode: set ? 'set' : 'sec', setId: S.setId, secs: TOPICS.filter(t => S.secs[t]), pool: S.pool, cnt: S.cnt, kind: S.kind, neg: S.neg, mins: S.mins });
}
function mix(list, k) {
  const g = {}, o = []; list.slice().sort((a, b) => b._sc - a._sc).forEach(q => { (g[q.s] = g[q.s] || []).push(q); if (o.indexOf(q.s) < 0) o.push(q.s); });
  const out = [];
  while (out.length < k && o.length) { for (let i = 0; i < o.length && out.length < k; i++) { const q = g[o[i]].shift(); if (q) out.push(q); } for (let i = o.length - 1; i >= 0; i--) if (!g[o[i]].length) o.splice(i, 1); }
  return out;
}
async function startDrill() {
  if (inTest()) return;
  if (get('cl_run', null) && !confirm('You have an unfinished session. Discard it and start the drill?')) return;
  try { await Promise.all(SL.map(load)); } catch (e) {}
  const pool = []; SL.forEach(p => { const s = window.SETS[p.id]; if (s) s.questions.forEach((q, i) => pool.push(Object.assign({}, q, { _k: p.id + '#' + i, _src: R.examName + ' · ' + p.title }))); });
  if (!pool.length) return alert('No questions found yet.');
  const wk = drillTopics(), n = Math.min(R.drillQuestions || 10, pool.length);
  pool.forEach(q => { let s = Math.random(); const e = SAV[q._k]; if (e && e.w) s += 3; if (!SEEN[q._k]) s += 1; q._sc = s; });
  const weak = pool.filter(q => wk.indexOf(q.s) > -1), rest = pool.filter(q => wk.indexOf(q.s) < 0);
  const a = mix(weak, wk.length ? Math.ceil(n * .7) : 0), left = pool.filter(q => a.indexOf(q) < 0), b = mix(left, n - a.length);
  const qs = shuf(a.concat(b)); S.src = 'Wise Drill'; S.setRef = null; reqFS(false);
  begin(qs, (R.drillMinutes || 10) * 60, 'test', 'drill', true);
  toast(wk.length ? '⚡ Drill built from ' + wk.map(t => CODE[t]).join(' · ') : '⚡ Mixed drill — good luck!');
}
function begin(qs, total, kind, mode, tneg) {
  S.run = kind; S.mode = mode; S.tneg = tneg; S.paused = false; S.fsx = 0; S.tabx = 0; S.tabNote = false; S.peek = {};
  if (SET.shuffleQ && mode !== 'drill' && mode !== 'saved') { const g = {}, o = []; qs.forEach(q => { if (!g[q.s]) { g[q.s] = []; o.push(q.s); } g[q.s].push(q); }); qs = []; o.forEach(s => { qs = qs.concat(shuf(g[s])); }); }
  if (SET.shuffleO) qs = qs.map(q => { const ord = shuf(q.o.map((_, i) => i)); return Object.assign({}, q, { o: ord.map(i => q.o[i]), a: ord.indexOf(q.a) }); });
  S.qs = qs; S.ans = qs.map(() => null); S.qt = qs.map(() => 0); S.fl = qs.map(() => null); S.mk = {};
  S.cur = 0; S.total = total; S.left = total; S.el = 0; PAD.strokes = []; CALC = calcNew(); calcUI();
  put('cl_run_q', qs); clearInterval(S.t); S.t = setInterval(tick, 1000); getWake(); setTest(true); test();
}
function tick() {
  if (S.paused) return;
  S.el++; if (S.view === 'test') S.qt[S.cur]++;
  if (S.el % 5 === 0) saveRun();
  if (S.run === 'quiz') return;
  S.left--; const el = $('#tm'); if (el) { el.textContent = SET.showTimer ? fmt(S.left) : '⏱ ••'; el.classList.toggle('low', S.left < 300 && S.total > 900 || S.left < 60); }
  if (S.left <= 0) { toast('⏰ Time is up!'); submit(); }
}

/* ---------- autosave / resume / full-screen / pause ---------- */
function saveRun() { if (S.view !== 'test') return; put('cl_run', { run: S.run, mode: S.mode, tneg: S.tneg, src: S.src, setRef: S.setRef, ans: S.ans, qt: S.qt, mk: S.mk, fl: S.fl, cur: S.cur, left: S.left, total: S.total, el: S.el, fsx: S.fsx, tabx: S.tabx }); }
function clearRun() { del('cl_run'); del('cl_run_q'); }
function resume() {
  const r = get('cl_run', null), q = get('cl_run_q', null); if (!r || !q || inTest()) return;
  Object.assign(S, { run: r.run, mode: r.mode, tneg: r.tneg, src: r.src, setRef: r.setRef || null, qs: q, ans: r.ans, qt: r.qt, mk: r.mk, fl: r.fl || q.map(() => null), cur: r.cur, left: r.left, total: r.total, el: r.el, fsx: r.fsx || 0, tabx: r.tabx || 0, paused: false, peek: {} });
  clearInterval(S.t); S.t = setInterval(tick, 1000); getWake(); reqFS(isExam()); setTest(true); test();
}
const isExam = () => S.mode === 'set' && S.run === 'test';
function reqFS(on) { const el = document.documentElement; if (on && SET.fullscreen && el.requestFullscreen) { S.fs = true; el.requestFullscreen().catch(() => { S.fs = false; }); } else S.fs = false; }
function exitFS() { S.fs = false; if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); }
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) { $('#warn').classList.remove('show'); return; }
  if (S.fs && S.view === 'test' && !S.paused) { S.fsx++; saveRun(); $('#warn').classList.add('show'); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (S.view === 'test' && isExam() && !S.paused) { S.tabx++; S.tabNote = true; saveRun(); } }
  else if (S.tabNote) { S.tabNote = false; toast('⚠️ Tab switch recorded (' + S.tabx + ')'); }
});
function pause() { if (S.view !== 'test' || S.run !== 'test' || S.paused) return; S.paused = true; closeGrid(); closeTools(); saveRun(); $('#pLeft').textContent = fmt(S.left); $('#pause').classList.add('show'); }
function unpause() { S.paused = false; $('#pause').classList.remove('show'); if (S.fs && !document.fullscreenElement) reqFS(isExam()); }
function leave() { clearInterval(S.t); relWake(); exitFS(); closeGrid(); closeTools(); S.paused = false; ['#pause', '#warn', '#noteM'].forEach(s => $(s).classList.remove('show')); setTest(false); S.view = 'idle'; }

/* ---------- question screens ---------- */
function tchips(q) {
  if (S.mode === 'drill') return '';
  const secs = []; S.qs.forEach(x => { if (secs.indexOf(x.s) < 0) secs.push(x.s); });
  return '<div class="chips sm tscroll">' + secs.map(s => '<button class="chip ' + (s === q.s ? 'on' : '') + '" data-act="secjump" data-v="' + esc(s) + '">' + (ICON[s] || '') + ' ' + esc(s) + '</button>').join('') + '</div>';
}
function centerChip() { const c = $('.tscroll .on'); if (c) { const p = c.parentNode; p.scrollLeft = c.offsetLeft - p.clientWidth / 2 + c.clientWidth / 2; } }
function flagsRow(locked) {
  const f = S.fl[S.cur];
  return '<div class="flags"><span class="mu">Confidence:</span>' + [['s', '🟢 Sure'], ['g', '🟡 Guess'], ['c', '🔴 Confused']].map(x => '<button class="chip ' + (f === x[0] ? 'on' : '') + '" ' + (locked ? 'disabled' : '') + ' data-act="flag" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
}
function trickBtn(q) { const e = SAV[q._k]; return '<button class="chip tk ' + (e && e.n ? 'on' : '') + '" data-act="trick">🧠 ' + (e && e.n ? 'Trick ✓' : 'Add trick') + '</button>'; }
function peekBit(q, done) {
  const e = SAV[q._k]; if (S.mode !== 'saved' || done || !e || !e.n) return '';
  return S.peek[S.cur] ? noteLine(q._k) : '<div class="row" style="margin-top:10px"><button class="chip" data-act="peek">👁 Peek at my trick</button></div>';
}
function quizView(keepScroll) {
  const q = S.qs[S.cur], a = S.ans[S.cur], done = a !== null, sv = SAV[q._k] && SAV[q._k].b; let c = 0, w = 0;
  S.ans.forEach((x, i) => { if (x !== null) { x === S.qs[i].a ? c++ : w++; } });
  render('<div class="top2"><span class="mu">Q ' + (S.cur + 1) + ' / ' + S.qs.length + (S.mode === 'saved' ? ' · Revision' : '') + '</span><span class="timer">✅ ' + c + ' · ❌ ' + w + '</span></div><div class="bar"><i style="width:' + ((S.cur + 1) / S.qs.length * 100) + '%"></i></div>' + tchips(q) +
    '<div class="card"><div class="qh"><span class="tag">' + label(q) + '</span>' + trickBtn(q) + '</div><b class="qt">' + q.q + '</b>' +
    q.o.map((o, i) => '<button class="opt ' + (done ? (i === q.a ? 'ok' : i === a ? 'bad' : '') : '') + '" data-act="opt" data-v="' + i + '">' + 'ABCD'.charAt(i) + '. ' + o + '</button>').join('') + flagsRow(done) + peekBit(q, done) +
    (done ? '<div class="expl"><b>' + (a === q.a ? '✅ Correct!' : '❌ Incorrect') + '</b> · Answer: ' + 'ABCD'.charAt(q.a) + '<br>💡 ' + (q.e || 'No explanation added for this question yet.') + '</div>' + noteLine(q._k) : '') + '</div>' +
    '<div class="nav"><button class="btn g" data-act="prev">←</button><button class="btn g" data-act="save">' + (sv ? '🔖 Saved' : '🔖 Save') + '</button><button class="btn" data-act="next" style="margin-left:auto">' + (S.cur === S.qs.length - 1 ? 'Finish ✓' : 'Next →') + '</button></div>', keepScroll);
  centerChip(); if (S.grid) fillGrid(); saveRun();
}
function qcls(i) { if (S.run === 'quiz') return S.ans[i] === null ? '' : (S.ans[i] === S.qs[i].a ? 'ok' : 'bad'); return (S.ans[i] !== null ? 'ans' : '') + ' ' + (S.mk[i] ? 'mk' : ''); }
function test(keepScroll) {
  S.view = 'test'; document.body.dataset.view = 'test'; if (S.run === 'quiz') return quizView(keepScroll);
  const q = S.qs[S.cur], done = S.ans.filter(a => a !== null).length, sv = SAV[q._k] && SAV[q._k].b;
  render('<div class="top2"><span class="mu">' + (S.mode === 'drill' ? '⚡ Wise Drill · ' : '') + 'Q ' + (S.cur + 1) + ' / ' + S.qs.length + ' · ' + done + ' answered</span><span class="timer ' + (S.left < 60 ? 'low' : '') + '" id="tm">' + (SET.showTimer ? fmt(S.left) : '⏱ ••') + '</span></div><div class="bar"><i style="width:' + ((S.cur + 1) / S.qs.length * 100) + '%"></i></div>' + tchips(q) +
    '<div class="card"><div class="qh"><span class="tag">' + label(q) + '</span>' + trickBtn(q) + '</div><b class="qt">' + q.q + '</b>' +
    q.o.map((o, i) => '<button class="opt ' + (S.ans[S.cur] === i ? 'sel' : '') + '" data-act="opt" data-v="' + i + '">' + 'ABCD'.charAt(i) + '. ' + o + '</button>').join('') + flagsRow(false) + peekBit(q, false) + '</div>' +
    '<div class="nav"><button class="btn g" data-act="prev">←</button><button class="btn g" data-act="mark">' + (S.mk[S.cur] ? '★ Marked' : '☆ Mark') + '</button><button class="btn g" data-act="save">' + (sv ? '🔖 Saved' : '🔖 Save') + '</button><button class="btn g" data-act="clear">Clear</button><button class="btn" data-act="next" style="margin-left:auto">' + (S.cur === S.qs.length - 1 ? 'Submit ✓' : 'Next →') + '</button></div>', keepScroll);
  centerChip(); if (S.grid) fillGrid(); saveRun();
}
function fillGrid() {
  const a = S.ans.filter(x => x !== null).length, m = Object.keys(S.mk).length;
  $('#drawer').innerHTML = '<b>Questions</b><p class="mu" style="margin-top:4px">🟩 ' + a + ' answered · 🟧 ' + m + ' marked · ' + (S.qs.length - a) + ' left</p><div class="grid">' +
    S.qs.map((_, i) => '<button class="qn ' + qcls(i) + ' ' + (i === S.cur ? 'cur' : '') + '" data-act="jump" data-v="' + i + '">' + (i + 1) + '</button>').join('') +
    '</div><button class="btn big" data-act="submit">' + (S.run === 'quiz' ? 'Finish quiz' : 'Submit test') + '</button>';
}
function openGrid() { S.grid = true; fillGrid(); $('#drawer').classList.add('show'); $('#shade').classList.add('show'); }
function closeGrid() { S.grid = false; $('#drawer').classList.remove('show'); $('#shade').classList.remove('show'); }

/* ---------- smart notes (memory tricks) ---------- */
let NQ = null, NEL = null;
function openNote(q, el) {
  NQ = q; NEL = el || null; const e = SAV[q._k || q.k];
  $('#nq').textContent = strip(q.q); $('#ni').value = e && e.n ? e.n : ''; $('#noteM').classList.add('show'); setTimeout(() => $('#ni').focus(), 60);
}
const noteOpen = () => $('#noteM').classList.contains('show');
function closeNote() { $('#noteM').classList.remove('show'); NQ = null; }
function noteDone(msg) {
  const k = NQ && (NQ._k || NQ.k), e = SAV[k]; closeNote(); persist(); toast(msg);
  if (S.view === 'test') test(true);
  else if (S.view === 'revise') go('revise', true);
  else if (NEL) NEL.textContent = e && e.n ? '🧠 Trick ✓' : '🧠 Trick';
  dock();
}
function saveNote() { if (!NQ) return; const t = $('#ni').value.trim().slice(0, 120), e = ent(NQ); if (t) e.n = t; else delete e.n; noteDone(t ? '🧠 Trick saved — it will reappear in revision' : 'Trick removed'); }
function delNote() { if (!NQ) return; const e = SAV[NQ._k || NQ.k]; if (e) delete e.n; noteDone('Trick removed'); }

/* ---------- submit + result ---------- */
function submit() {
  leave(); clearRun(); S.view = 'result'; document.body.dataset.view = 'result';
  const neg = S.tneg ? R.negative : 0, st = {}, det = [], full = [], conf = {}; let sc = 0, att = 0, cor = 0, mastered = 0; const tomorrow = today0() + DAY;
  S.qs.forEach((q, i) => {
    const r = S.ans[i] === null ? 'n' : S.ans[i] === q.a ? 'c' : 'w', f = S.fl[i] || 'u';
    const x = st[q.s] = st[q.s] || { c: 0, w: 0, n: 0, t: 0 }, cf = conf[f] = conf[f] || { c: 0, w: 0, n: 0 };
    x.t++; x[r]++; cf[r]++; if (r === 'c') { sc++; cor++; } if (r === 'w') sc -= neg; if (r !== 'n') att++;
    if (r !== 'n' && q._k) SEEN[q._k] = 1;
    det.push({ s: q.s, r, t: S.qt[i] || 0, f });
    full.push({ s: q.s, c: q.c || '', q: q.q, o: q.o, a: q.a, y: S.ans[i], t: S.qt[i] || 0, f, e: q.e || '' });
    let e = SAV[q._k];
    if (r === 'w' && (SET.autoWrong || S.mode === 'saved')) { keep(q, 'w'); e = SAV[q._k]; e.box = 1; e.due = tomorrow; }
    else if (r === 'c' && S.mode === 'saved' && e && e.w) { e.box = (e.box || 1) + 1; if (e.box > 4) { e.w = false; e.box = 0; delete e.due; mastered++; } else e.due = today0() + INT[e.box - 1] * DAY; }
  });
  persist(); put('cl_seen', SEEN);
  const dk = dkey(), dd = DAYM[dk] || (DAYM[dk] = { q: 0, t: 0, c: 0 }); dd.q += att; dd.t++; dd.c = (dd.c || 0) + cor; put('cl_days', DAYM);
  let drillDone = false;
  if (S.mode === 'drill' && att >= Math.ceil(S.qs.length / 2)) { DRILL[dk] = 1; put('cl_drill', DRILL); drillDone = true; }
  if (isExam() && S.setRef) { const prev = DONE[S.setRef]; DONE[S.setRef] = { best: Math.max(prev ? prev.best : 0, Math.max(0, Math.round(sc / S.qs.length * 100))), ts: Date.now(), n: S.qs.length }; put('cl_done', DONE); }
  ATT.push({ ts: Date.now(), src: S.mode === 'saved' ? 'Revision practice' : S.src + (S.run === 'quiz' ? ' · Quiz' : ''), mode: S.mode, run: S.run, setId: S.setRef, sc, max: S.qs.length, neg, used: S.el, total: S.total, secs: st, det, conf, fsx: S.fsx, tabx: S.tabx, full });
  if (ATT.length > 40) ATT.shift();
  ATT.forEach((a, i) => { if (i < ATT.length - 5) delete a.full; }); put('cl_att', ATT);
  const ds = drillStreak();
  render('<div class="card res">' + ring(sc, S.qs.length) + '<p class="mu">Time taken: ' + fmt(ATT[ATT.length - 1].used) + (S.fsx + S.tabx ? ' · ⚠️ ' + (S.fsx + S.tabx) + ' focus lapse(s)' : '') + '</p></div>' +
    (drillDone ? '<div class="card drill done"><div class="dl">' + flame(true, 56) + '</div><div class="dr"><span class="eyebrow">Wise Drill complete</span><h3>Streak: ' + ds + ' day' + (ds === 1 ? '' : 's') + ' 🔥</h3><p class="mu">Come back tomorrow to keep the flame burning.</p></div></div>' : (S.mode === 'drill' ? '<div class="card"><b>Almost there</b><p class="mu">Attempt at least half of the drill questions to keep your streak flame.</p></div>' : '')) +
    Object.keys(st).sort((a, b) => ti(a) - ti(b)).map(k => { const v = st[k]; return '<div class="card"><b>' + (ICON[k] || '') + ' ' + esc(k) + '</b> <span class="mu">✅ ' + v.c + ' · ❌ ' + v.w + ' · ⏭ ' + v.n + '</span><div class="bar" style="margin-bottom:0"><i style="width:' + pct(v.c, v.t) + '%"></i></div></div>'; }).join('') +
    '<div class="row" style="margin:6px 0"><button class="btn" data-act="resultins">📊 Full analysis</button><button class="btn g" data-act="report" data-v="test">📄 PDF report</button><button class="btn g" data-act="exportq">⬇ CSV</button><button class="btn g" data-act="nav" data-v="home">← Home</button></div>' +
    (mastered ? '<p class="mu">🎉 ' + mastered + ' question(s) mastered and removed from your wrong notebook.</p>' : '') +
    (S.mode !== 'saved' && SET.autoWrong ? '<p class="mu">Wrong answers were added to your 🔖 notebook and scheduled for spaced revision.</p>' : '') +
    '<h2>Review</h2>' + S.qs.map((q, i) => '<div class="card"><div class="line" style="padding-top:0"><span class="mu">' + label(q) + ' · Q' + (i + 1) + ' · ⏱ ' + (S.qt[i] || 0) + 's' + (S.fl[i] ? ' · ' + FL[S.fl[i]] : '') + '</span><span class="row"><button class="btn g s" data-act="rtrick" data-v="' + i + '">🧠 ' + (SAV[q._k] && SAV[q._k].n ? 'Trick ✓' : 'Trick') + '</button><button class="btn g s" data-act="rsave" data-v="' + i + '">' + (SAV[q._k] && SAV[q._k].b ? '🔖 Saved' : '🔖 Save') + '</button></span></div><b class="qt">' + q.q + '</b>' +
      q.o.map((o, j) => '<div class="opt ' + (j === q.a ? 'ok' : S.ans[i] === j ? 'bad' : '') + '">' + o + '</div>').join('') + (q.e ? '<div class="expl">💡 ' + q.e + '</div>' : '') + noteLine(q._k) + '</div>').join(''));
  profile(); dock(); celebrate(sc / S.qs.length, sc);
}
function ring(sc, max) {
  let c = 0, w = 0, n = 0; const p = Math.max(0, Math.min(1, sc / max));
  S.ans.forEach((a, i) => { if (a === null) n++; else if (a === S.qs[i].a) c++; else w++; });
  const msg = p >= .75 ? 'Outstanding result!' : p >= .5 ? 'Good going — keep climbing' : p >= .25 ? 'Solid start — review and retry' : 'Every mistake here is a mark saved later';
  return '<div class="ringw"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="t" cx="60" cy="60" r="52"/><circle class="f" cx="60" cy="60" r="52" style="--o:' + (326.7 * (1 - p)).toFixed(1) + '"/></svg><div class="ringc"><b id="rnum">' + sc.toFixed(2) + '</b><small>out of ' + max + ' · ' + Math.round(p * 100) + '%</small></div></div><h3>' + msg + '</h3><div class="rp"><span style="color:#10b981">✅ ' + c + '</span><span style="color:#ef4444">❌ ' + w + '</span><span>⏭ ' + n + '</span></div>';
}
function celebrate(p, sc) {
  const el = $('#rnum'), t0 = performance.now();
  if (el && SET.motion) (function f(t) { const k = Math.min(1, (t - t0) / 1500); el.textContent = (sc * (1 - Math.pow(1 - k, 3))).toFixed(2); if (k < 1) requestAnimationFrame(f); })(t0);
  if (p < .25 || !SET.motion || (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches)) return;
  const cv = $('#cf'), c = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight, ps = [], cols = ['#7b6cff', '#f2b84b', '#22b8cf', '#f0567a', '#2fbf8f', '#ff8a3d'], N = Math.round(70 + p * 150), st = performance.now();
  for (let i = 0; i < N; i++) ps.push({ x: W / 2 + (Math.random() - .5) * 120, y: H * .3, vx: (Math.random() - .5) * 15, vy: -Math.random() * 15 - 4, w: 6 + Math.random() * 6, h: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % cols.length] });
  (function loop(t) {
    c.clearRect(0, 0, W, H);
    ps.forEach(q => { q.vy += .3; q.vx *= .992; q.x += q.vx; q.y += q.vy; q.r += q.vr; c.save(); c.translate(q.x, q.y); c.rotate(q.r); c.fillStyle = q.c; c.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); c.restore(); });
    if (t - st < 4200) requestAnimationFrame(loop); else c.clearRect(0, 0, W, H);
  })(st);
}
function exportQ() {
  const a = ATT[ATT.length - 1]; if (!a || !a.full) return alert('Nothing to export yet. Finish a test first.');
  const rows = [['#', 'Topic', 'Sub-topic', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Your answer', 'Correct answer', 'Result', 'Time (s)', 'Confidence', 'Explanation']];
  a.full.forEach((x, i) => { if (x.y === null || x.y === undefined) return; rows.push([i + 1, x.s, x.c, x.q, x.o[0] || '', x.o[1] || '', x.o[2] || '', x.o[3] || '', 'ABCD'.charAt(x.y) + '. ' + x.o[x.y], 'ABCD'.charAt(x.a) + '. ' + x.o[x.a], x.y === x.a ? 'Correct' : 'Wrong', x.t, FL[x.f] ? FL[x.f].replace(/^\S+\s/, '') : '', x.e]); });
  if (rows.length === 1) return alert('You did not attempt any question in the last test.');
  download('clerkship-attempted-' + dkey(new Date(a.ts)) + '.csv', '\ufeff' + rows.map(r => r.map(c => '"' + String(c).replace(/<[^>]*>/g, ' ').replace(/"/g, '""') + '"').join(',')).join('\r\n'), 'text/csv;charset=utf-8');
}

/* ---------- PDF reports (one A4 page → Save as PDF) ---------- */
let REP = null;
function weekData() {
  const t0 = today0(), from = t0 - 6 * DAY, days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(t0 - i * DAY), r = DAYM[dkey(d)] || { q: 0, t: 0, c: 0 }; days.push({ d, q: r.q, t: r.t }); }
  const at = ATT.filter(a => a.ts >= from), secs = {}; let c = 0, w = 0, n = 0, sc = 0, used = 0;
  at.forEach(a => { Object.keys(a.secs).forEach(k => { const v = a.secs[k], x = secs[k] || (secs[k] = { c: 0, w: 0, n: 0, t: 0 }); x.c += v.c; x.w += v.w; x.n += v.n; x.t += v.t; c += v.c; w += v.w; n += v.n; }); sc += a.sc / a.max * 100; used += a.used; });
  let dd = 0; for (let i = 0; i < 7; i++) if (DRILL[dkey(new Date(t0 - i * DAY))]) dd++;
  return { days, at, secs, c, w, n, used, dd, avg: at.length ? Math.round(sc / at.length) : 0, q: days.reduce((s, d) => s + d.q, 0), active: days.filter(d => d.q).length, acc: pct(c, c + w), from: new Date(from), to: new Date(t0) };
}
const rhead = (title, sub) => '<div class="rhead"><img src="logo.png" alt="" onerror="this.style.display=\'none\'"><div><h1>' + title + '</h1><p>' + sub + '</p></div><div class="rwho"><small>Student</small><b>' + esc(SET.name || '—') + '</b><small>' + esc(R.examName) + '</small></div></div>';
const rkpi = items => '<div class="rkpi">' + items.map(i => '<div><small>' + i[0] + '</small><b>' + i[1] + '</b></div>').join('') + '</div>';
function rtab(map) {
  const ks = Object.keys(map).filter(k => map[k].c + map[k].w > 0).sort((a, b) => ti(a) - ti(b)); if (!ks.length) return '<p class="rn">No attempted questions yet.</p>';
  return '<table class="rt"><tr><th>Topic</th><th>Right / Att.</th><th>Acc.</th><th></th></tr>' + ks.map(k => { const v = map[k], at = v.c + v.w, p = pct(v.c, at); return '<tr><td>' + (ICON[k] || '') + ' ' + esc(k) + '</td><td>' + v.c + '/' + at + '</td><td>' + p + '%</td><td><i class="rb" style="background:' + tone(p) + '">' + lab(p) + '</i></td></tr>'; }).join('') + '</table>';
}
function wbars(days) {
  const mx = Math.max.apply(null, [10].concat(days.map(d => d.q))), H = 80; let s = '<svg viewBox="0 0 300 ' + (H + 20) + '" class="rsvg">';
  days.forEach((d, i) => { const h = Math.round(d.q / mx * H), x = 8 + i * 41; s += '<rect x="' + x + '" y="' + (H - h) + '" width="28" height="' + Math.max(h, 2) + '" rx="4" fill="#5b4bdb" opacity="' + (d.q ? 1 : .25) + '"/><text x="' + (x + 14) + '" y="' + (H - h - 3) + '" text-anchor="middle" font-size="9" fill="#14152b">' + (d.q || '') + '</text><text x="' + (x + 14) + '" y="' + (H + 13) + '" text-anchor="middle" font-size="9" fill="#5d617c">' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.d.getDay()] + '</text>'; });
  return s + '</svg>';
}
const rnotes = () => '<div class="rbox"><b>Mentor feedback</b><div class="rline"></div><div class="rline"></div><div class="rline"></div></div>';
const rfoot = () => '<div class="rfoot"><span>Generated ' + new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</span><span>Wise Choice — Your Shortcut through the Syllabus!</span></div>';
function weeklyReport() {
  const w = weekData(), g = weakFirst(w.secs).filter(k => w.secs[k].t >= 1), weak = g.slice(0, 3), s = streak(), ds = drillStreak();
  const html = '<div class="rpage">' + rhead('Weekly Progress Report', fd(w.from) + ' – ' + fd(w.to) + ' · ' + new Date().getFullYear()) +
    rkpi([['Questions', w.q], ['Active days', w.active + '/7'], ['Tests', w.at.length], ['Accuracy', w.at.length ? w.acc + '%' : '–'], ['Avg score', w.at.length ? w.avg + '%' : '–'], ['Drill days', w.dd + '/7']]) +
    '<div class="rcols"><div><h4>Daily questions</h4>' + wbars(w.days) + '<h4>Topic performance (this week)</h4>' + rtab(w.secs) + '</div><div><h4>Strength radar</h4>' + radar(w.secs) + '</div></div>' +
    '<div class="rbox"><b>Streaks:</b> study ' + s + ' day' + (s === 1 ? '' : 's') + ' · drill ' + ds + ' day' + (ds === 1 ? '' : 's') + ' · time on tests ' + Math.round(w.used / 60) + ' min<p><b>Focus next week:</b> ' + (weak.length ? weak.map(k => esc(k) + ' (' + pct(w.secs[k].c, w.secs[k].t) + '%)').join(', ') : 'Take a few tests to find your weak chapters.') + '</p></div>' + rnotes() + rfoot() + '</div>';
  const text = 'Weekly progress — ' + (SET.name || 'Aspirant') + ' (' + fd(w.from) + ' – ' + fd(w.to) + ')\nQuestions: ' + w.q + ' · Active days: ' + w.active + '/7 · Tests: ' + w.at.length + '\nAccuracy: ' + (w.at.length ? w.acc + '%' : '–') + ' · Avg score: ' + (w.at.length ? w.avg + '%' : '–') + '\nStreak: ' + s + ' day(s) · Drill days: ' + w.dd + '/7\nFocus next: ' + (weak.length ? weak.join(', ') : '—');
  return { html, text, name: 'Weekly-Report-' + dkey() };
}
function testReport(a) {
  let c = 0, w = 0, n = 0; Object.keys(a.secs).forEach(k => { c += a.secs[k].c; w += a.secs[k].w; n += a.secs[k].n; });
  const avg = a.det.reduce((s, d) => s + d.t, 0) / a.det.length || 1, ids = fn => a.det.map((d, i) => fn(d) ? i + 1 : 0).filter(Boolean);
  const slowW = ids(d => d.r === 'w' && d.t >= 1.5 * avg), fastW = ids(d => d.r === 'w' && d.t <= .5 * avg), wrong = ids(d => d.r === 'w'), cf = a.conf || {};
  const g = weakFirst(a.secs).slice(0, 3), lst = l => l.length ? l.slice(0, 18).join(', ') + (l.length > 18 ? ' …' : '') : 'None';
  const html = '<div class="rpage">' + rhead('Test Report', esc(a.src) + ' · ' + new Date(a.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })) +
    rkpi([['Score', a.sc.toFixed(2) + '/' + a.max], ['Accuracy', pct(c, c + w) + '%'], ['Attempted', (c + w) + '/' + a.max], ['Negative', '−' + (w * (a.neg || 0)).toFixed(2)], ['Time', fmt(a.used)], ['Avg / Q', Math.round(a.used / a.max) + 's']]) +
    '<div class="rcols"><div><h4>Topic-wise performance</h4>' + rtab(a.secs) + '<h4>Question map</h4><div class="strip">' + a.det.map((d, i) => '<span style="background:' + (d.r === 'c' ? '#10b981' : d.r === 'w' ? '#ef4444' : '#8b8fa6') + '">' + (i + 1) + '</span>').join('') + '</div></div><div><h4>Strength radar</h4>' + radar(a.secs) + '</div></div>' +
    '<div class="rbox"><p><b>Wrong (' + wrong.length + '):</b> Q ' + lst(wrong) + '</p><p><b>Slow &amp; wrong (concept gaps):</b> Q ' + lst(slowW) + '</p><p><b>Fast &amp; wrong (rushed / guessed):</b> Q ' + lst(fastW) + '</p>' +
    '<p><b>Confidence:</b> ' + (cf.s ? '🟢 Sure ' + cf.s.c + '✓/' + cf.s.w + '✗ · ' : '') + (cf.g ? '🟡 Guess ' + cf.g.c + '✓/' + cf.g.w + '✗ · ' : '') + (cf.c ? '🔴 Confused ' + cf.c.c + '✓/' + cf.c.w + '✗ · ' : '') + (cf.s || cf.g || cf.c ? '' : 'not flagged · ') + 'Skipped ' + n + '</p><p><b>Revise first:</b> ' + (g.length ? g.map(k => esc(k) + ' (' + pct(a.secs[k].c, a.secs[k].t) + '%)').join(', ') : '—') + '</p></div>' + rnotes() + rfoot() + '</div>';
  const text = 'Test report — ' + (SET.name || 'Aspirant') + '\n' + a.src + ' (' + fd(a.ts) + ')\nScore: ' + a.sc.toFixed(2) + '/' + a.max + ' · Accuracy: ' + pct(c, c + w) + '% · Attempted: ' + (c + w) + '/' + a.max + '\nTime: ' + fmt(a.used) + '\nRevise first: ' + (g.length ? g.join(', ') : '—');
  return { html, text, name: 'Test-Report-' + dkey(new Date(a.ts)) };
}
function openReport(kind) {
  let r; if (kind === 'week') r = weeklyReport(); else { const a = ATT[ATT.length - 1]; if (!a) return toast('Finish a test first.'); r = testReport(a); }
  REP = r; $('#rbody').innerHTML = r.html; $('#rwrap').classList.add('show'); $('.rscroll').scrollTop = 0;
}
function printReport() { const t = document.title; document.title = (REP && REP.name) || 'Report'; const back = () => { document.title = t; window.removeEventListener('afterprint', back); }; window.addEventListener('afterprint', back); setTimeout(() => { window.print(); setTimeout(back, 1500); }, 60); }
function shareReport() {
  if (!REP) return;
  if (navigator.share) navigator.share({ title: 'Progress report', text: REP.text }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(REP.text).then(() => toast('📋 Summary copied — paste it to your mentor'), () => alert(REP.text));
  else alert(REP.text);
}

/* ---------- rough pad ---------- */
const PAD = { strokes: [], col: 'auto', erase: false, cur: null, cv: null, cx: null };
const inkColor = c => c === 'auto' ? getComputedStyle(root).getPropertyValue('--tx').trim() || '#fff' : c;
function strokeSeg(s, pts) {
  const c = PAD.cx; c.save(); c.globalCompositeOperation = s.e ? 'destination-out' : 'source-over'; c.strokeStyle = inkColor(s.c); c.lineWidth = s.e ? 18 : 2.6; c.lineCap = c.lineJoin = 'round'; c.beginPath();
  pts.forEach((p, i) => { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); if (pts.length === 1) c.lineTo(pts[0][0] + .1, pts[0][1]); c.stroke(); c.restore();
}
function padDraw() { PAD.cx.clearRect(0, 0, PAD.cv.width, PAD.cv.height); PAD.strokes.forEach(s => strokeSeg(s, s.p)); }
function padResize() { const r = PAD.cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; if (!r.width) return; PAD.cv.width = Math.round(r.width * d); PAD.cv.height = Math.round(r.height * d); PAD.cx.setTransform(d, 0, 0, d, 0, 0); padDraw(); }
function padUI() { $$('[data-pc]').forEach(b => b.classList.toggle('on', !PAD.erase && b.dataset.pc === PAD.col)); $('#bErase').classList.toggle('on', PAD.erase); }
function padInit() {
  PAD.cv = $('#pad'); PAD.cx = PAD.cv.getContext('2d');
  const pt = e => { const r = PAD.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  PAD.cv.addEventListener('pointerdown', e => { e.preventDefault(); try { PAD.cv.setPointerCapture(e.pointerId); } catch (x) {} PAD.cur = { c: PAD.col, e: PAD.erase, p: [pt(e)] }; PAD.strokes.push(PAD.cur); strokeSeg(PAD.cur, PAD.cur.p); });
  PAD.cv.addEventListener('pointermove', e => { if (!PAD.cur) return; const p = pt(e), l = PAD.cur.p[PAD.cur.p.length - 1]; PAD.cur.p.push(p); strokeSeg(PAD.cur, [l, p]); });
  const up = () => { PAD.cur = null; }; PAD.cv.addEventListener('pointerup', up); PAD.cv.addEventListener('pointercancel', up);
  window.addEventListener('resize', () => { if (toolsOpen()) padResize(); });
}

/* ---------- calculator ---------- */
const calcNew = () => ({ cur: '0', acc: null, op: null, fresh: true });
let CALC = calcNew(); const SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };
function fmtn(n) { if (!isFinite(n)) return 'Error'; const s = String(parseFloat(n.toPrecision(12))); return s.length > 14 ? n.toExponential(6) : s; }
function calcEval() { const a = CALC.acc, b = parseFloat(CALC.cur); let r = 0; if (CALC.op === '+') r = a + b; else if (CALC.op === '-') r = a - b; else if (CALC.op === '*') r = a * b; else r = b === 0 ? NaN : a / b; CALC.cur = fmtn(r); CALC.acc = isFinite(r) ? r : null; }
function calcUI() { $('#cval').textContent = CALC.cur; $('#cexp').textContent = (CALC.op && CALC.acc !== null) ? fmtn(CALC.acc) + ' ' + SYM[CALC.op] : ''; }
function calcPress(k) {
  const C = CALC; if (C.cur === 'Error' && k !== 'C') return;
  if (/^[0-9]$/.test(k)) { if (C.fresh) { C.cur = k; C.fresh = false; } else if (C.cur.replace(/[-.]/g, '').length < 14) C.cur = C.cur === '0' ? k : C.cur + k; }
  else if (k === '.') { if (C.fresh) { C.cur = '0.'; C.fresh = false; } else if (C.cur.indexOf('.') < 0) C.cur += '.'; }
  else if ('+-*/'.indexOf(k) > -1) { if (C.op && !C.fresh) calcEval(); else C.acc = parseFloat(C.cur); if (CALC.cur !== 'Error') { CALC.op = k; CALC.fresh = true; } }
  else if (k === '=') { if (C.op) { calcEval(); C.op = null; C.fresh = true; } }
  else if (k === 'C') CALC = calcNew();
  else if (k === 'B') { if (!C.fresh && C.cur.length > 1) C.cur = C.cur.slice(0, -1); else { C.cur = '0'; C.fresh = true; } }
  else if (k === '%') { C.cur = fmtn(parseFloat(C.cur) / 100); C.fresh = true; }
  else if (k === 'R') { const n = parseFloat(C.cur); C.cur = n < 0 ? 'Error' : fmtn(Math.sqrt(n)); C.fresh = true; }
  calcUI();
}
function calcInit() {
  const keys = [['C', 'C', 'op'], ['B', '⌫', 'op'], ['%', '%', 'op'], ['/', '÷', 'op'], ['7'], ['8'], ['9'], ['*', '×', 'op'], ['4'], ['5'], ['6'], ['-', '−', 'op'], ['1'], ['2'], ['3'], ['+', '+', 'op'], ['0'], ['.'], ['R', '√', 'op'], ['=', '=', 'eq']];
  $('#ckeys').innerHTML = keys.map(k => '<button class="' + (k[2] || '') + '" data-act="ck" data-v="' + k[0] + '">' + (k[1] || k[0]) + '</button>').join(''); calcUI();
}
const toolsOpen = () => $('#tools').classList.contains('show');
function openTools(tab) { if (!SET.tools) return; $('#tools').classList.add('show'); toolTab(tab || 'pad'); }
function closeTools() { $('#tools').classList.remove('show'); }
function toolTab(t) {
  S.ttab = t; $('#padWrap').style.display = t === 'pad' ? 'flex' : 'none'; $('#calcWrap').style.display = t === 'calc' ? 'flex' : 'none';
  $('#tabPad').classList.toggle('on', t === 'pad'); $('#tabCalc').classList.toggle('on', t === 'calc'); if (t === 'pad') { padResize(); padUI(); }
}

/* ---------- onboarding tour ---------- */
const TOUR = [
  { i: '👋', t: 'Welcome to Wise Choice', d: 'Practise your PYQs <b>set by set</b> (Set 1, Set 2, Set 3 …) in timed exams or instant-feedback quizzes — or chapter-wise across all sets.' },
  { i: '⚡', t: 'Daily 10-minute Wise Drill', d: 'Tap the flame button for a quick mixed set built from your <b>weakest chapters</b>. Finish it every day to grow your <b>streak flame</b>.' },
  { i: '🗓️', t: 'Exam Countdown plan', d: 'Enter your exam date and get an auto-planned schedule of sets and topics for every day. It re-balances itself when you add new questions.' },
  { i: '🧠', t: 'Smart notes', d: 'Tap <b>🧠 Trick</b> on any question to write a one-line memory trick. It reappears whenever that question comes back in revision.' },
  { i: '📄', t: 'Reports & heatmap', d: 'Your activity calendar lives in the profile column. In <b>Insights → Reports</b> save a one-page weekly or latest-test report as PDF for your mentor.' }
];
function tourShow(n) {
  const s = TOUR[n], last = n === TOUR.length - 1; S.tourN = n;
  $('#tour').innerHTML = '<div class="ovc"><div class="big">' + s.i + '</div><h2>' + s.t + '</h2><p class="mu" style="color:var(--tx)">' + s.d + '</p><div class="dots">' + TOUR.map((_, i) => '<i class="' + (i === n ? 'on' : '') + '"></i>').join('') + '</div><div class="row" style="justify-content:center">' + (n ? '<button class="btn g" data-act="tourback">←</button>' : '<button class="btn g" data-act="tourend">Skip</button>') + '<button class="btn" data-act="' + (last ? 'tourend' : 'tournext') + '">' + (last ? 'Let\'s go 🚀' : 'Next →') + '</button></div></div>';
  $('#tour').classList.add('show');
}
const tourEnd = () => { $('#tour').classList.remove('show'); put('cl_tour', 1); };

/* ---------- actions ---------- */
$('#imp').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return; const r = new FileReader();
  r.onload = () => { try { const d = JSON.parse(r.result); if (d.att) ATT = d.att; if (d.sav) SAV = d.sav; if (d.days) DAYM = d.days; if (d.set) Object.assign(SET, d.set); if (d.seen) SEEN = d.seen; if (d.drill) DRILL = d.drill; if (d.done) DONE = d.done; if (d.plan !== undefined) PLAN = d.plan;
    put('cl_att', ATT); put('cl_sav', SAV); put('cl_days', DAYM); put('cl_seen', SEEN); put('cl_drill', DRILL); put('cl_done', DONE); put('cl_plan', PLAN); saveSet(); go(S.view); alert('Backup restored.'); } catch (x) { alert('That file is not a valid backup.'); } };
  r.readAsText(f); e.target.value = '';
});
function setTopicOnly(v) { TOPICS.forEach(t => { S.secs[t] = (t === v); }); S.scope = 'chap'; S.kind = 'quiz'; S.setId = 'all'; S.pool = 'all'; }
const A = {
  nav: v => { if (S.view === 'result' || S.view !== v || true) go(v); },
  theme: (v, el) => { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; put('cl_t', root.dataset.theme); flip(el); if (toolsOpen() && S.ttab === 'pad') padDraw(); },
  pick: v => { root.dataset.pal = v; put('cl_p', v); if (S.view === 'settings') go('settings', true); },
  kind: v => { S.kind = v; go('practice', true); },
  scope: v => { S.scope = v; if (v === 'set' && S.setId === 'all') S.setId = SL[0].id; go('practice', true); },
  setsel: v => { S.setId = v; go('practice', true); },
  pickset: v => { S.scope = 'set'; S.setId = v; go('practice'); },
  sec: v => { S.secs[v] = !S.secs[v]; go('practice', true); },
  cnt: v => { S.cnt = +v; go('practice', true); },
  pool: v => { S.pool = v; go('practice', true); },
  topall: () => { const c = counts(S.setId, S.pool === 'unseen'); TOPICS.forEach(t => { S.secs[t] = !LOADED || c[t] > 0; }); go('practice', true); },
  topnone: () => { TOPICS.forEach(t => { S.secs[t] = false; }); go('practice', true); },
  topweak: () => {
    const g = agg(), c = counts(S.setId, S.pool === 'unseen'), ks = weakFirst(g).filter(k => c[k] > 0).slice(0, 3);
    if (!ks.length) return toast('Take a test first — then I can find your weakest subjects.');
    TOPICS.forEach(t => { S.secs[t] = ks.indexOf(t) > -1; }); go('practice', true);
  },
  neg: (v, el) => { if (S.scope === 'set' && S.kind === 'test') { toast('Negative marking is always on for full-set exams.'); el.classList.add('on'); return; } S.neg = !S.neg; flip(el); },
  tg: (v, el) => { SET[v] = !SET[v]; if (v === 'defNeg') S.neg = SET.defNeg; saveSet(); flip(el); },
  start: startFromPractice, drill: startDrill, resume,
  discard: () => { if (confirm('Discard your unfinished session?')) { clearRun(); go('home', true); } },
  revdue: () => { S.sf = 'd'; A.practice(); },
  coach: v => launch({ mode: 'sec', setId: 'all', secs: [v], cnt: 10, pool: 'all', kind: 'quiz', neg: true }),
  opt: v => {
    if (S.run === 'quiz') { if (S.ans[S.cur] !== null) return; buzz(); S.ans[S.cur] = +v; test(true); return; }
    buzz(); S.ans[S.cur] = +v; const c = S.cur; test(true);
    if (SET.autoNext && c < S.qs.length - 1) setTimeout(() => { if (S.view === 'test' && S.cur === c && !S.paused) { S.cur++; test(); } }, 280);
  },
  flag: v => { if (S.run === 'quiz' && S.ans[S.cur] !== null) return; S.fl[S.cur] = S.fl[S.cur] === v ? null : v; test(true); },
  prev: () => { if (S.cur > 0) { S.cur--; test(); } },
  next: () => {
    if (S.cur < S.qs.length - 1) { S.cur++; test(); return; }
    if (S.run === 'quiz') { const u = S.ans.filter(x => x === null).length; if (u && !confirm(u + ' question(s) unanswered. Finish the quiz?')) return; submit(); }
    else if (ask('Submit the test?')) submit();
  },
  mark: () => { if (S.mk[S.cur]) delete S.mk[S.cur]; else S.mk[S.cur] = 1; test(true); },
  clear: () => { S.ans[S.cur] = null; test(true); },
  save: () => { const q = S.qs[S.cur], e = SAV[q._k]; if (e && e.b) e.b = false; else keep(q, 'b'); persist(); test(true); },
  rsave: (v, el) => { const q = S.qs[+v], e = SAV[q._k]; if (e && e.b) e.b = false; else keep(q, 'b'); persist(); el.textContent = SAV[q._k] && SAV[q._k].b ? '🔖 Saved' : '🔖 Save'; },
  trick: () => { if (S.view === 'test') openNote(S.qs[S.cur]); },
  peek: () => { S.peek[S.cur] = 1; test(true); },
  rtrick: (v, el) => openNote(S.qs[+v], el),
  enote: v => { const e = SAV[v]; if (e) openNote({ _k: e.k, s: e.s, c: e.c, q: e.q, o: e.o, a: e.a, e: e.e, _src: e.src }); },
  notesave: saveNote, notedel: delNote, noteclose: closeNote,
  jump: v => { S.cur = +v; closeGrid(); test(); },
  secjump: v => { for (let i = 0; i < S.qs.length; i++) if (S.qs[i].s === v) { S.cur = i; break; } test(); },
  grid: () => { S.grid ? closeGrid() : openGrid(); }, closegrid: closeGrid,
  submit: () => { if (ask('Submit the test?')) submit(); },
  exit: () => { if (confirm('Exit this session? Your progress will be lost.')) { clearRun(); leave(); go('home'); } },
  pause, unpause,
  pauseexit: () => { saveRun(); leave(); go('home'); },
  fsback: () => { $('#warn').classList.remove('show'); reqFS(isExam()); },
  fsskip: () => { $('#warn').classList.remove('show'); S.fs = false; },
  tools: v => { if (S.view === 'test' && !S.paused) openTools(v); }, toolsclose: closeTools, ttab: v => toolTab(v),
  padcol: v => { PAD.col = v; PAD.erase = false; padUI(); }, paderase: () => { PAD.erase = !PAD.erase; padUI(); },
  padundo: () => { PAD.strokes.pop(); padDraw(); }, padclear: () => { PAD.strokes = []; padDraw(); },
  ck: v => calcPress(v),
  tab: v => { S.tab = v; go('insights', true); },
  resultins: () => { S.tab = 'last'; go('insights'); },
  sfil: v => { S.sf = v; go('revise', true); },
  delsav: v => { delete SAV[v]; persist(); go('revise', true); dock(); },
  practice: () => {
    if (inTest()) return alert('Finish or exit the current session first.');
    const l = savedList(); if (!l.length) { go('revise'); return; }
    if (get('cl_run', null) && !confirm('You have an unfinished session. Discard it and start this revision?')) return;
    S.src = 'Revision practice'; S.setRef = null;
    begin(l.map(e => ({ s: e.s, c: e.c, q: e.q, o: e.o.slice(), a: e.a, e: e.e, _k: e.k, _src: e.src })), 0, 'quiz', 'saved', true);
  },
  ptopic: v => { if (inTest()) return alert('Finish or exit the current session first.'); setTopicOnly(v); go('practice'); },
  exportq: exportQ,
  report: v => openReport(v), reportclose: () => $('#rwrap').classList.remove('show'), reportprint: printReport, reportshare: shareReport,
  planedit: () => { S.planEdit = !S.planEdit; go('plan', true); },
  plansave: () => {
    const v = ($('#pdate') || {}).value; if (!v) return alert('Please pick your exam date.');
    if (pdate(v) < today0()) return alert('Please pick a date that is today or later.');
    PLAN = { date: v, start: dkey() }; put('cl_plan', PLAN); S.planEdit = false; go('plan'); toast('🗓️ Plan created — it will adapt as you progress');
  },
  plandel: () => { if (confirm('Remove your exam date and plan?')) { PLAN = null; del('cl_plan'); S.planEdit = false; go('plan'); } },
  planstart: () => {
    const P = buildPlan(), d = P && P.days[0]; if (!d || d.type !== 'study') return; const c = counts('all', true), hasUn = d.topics.some(t => c[t] > 0);
    launch({ mode: 'sec', setId: 'all', secs: d.topics, cnt: d.q, pool: hasUn ? 'unseen' : 'all', kind: 'quiz', neg: true });
  },
  planset: v => launch({ mode: 'set', setId: v, kind: 'test' }),
  tour: () => tourShow(0), tournext: () => tourShow(S.tourN + 1), tourback: () => tourShow(S.tourN - 1), tourend: tourEnd,
  font: v => { SET.font = +v; saveSet(); go('settings', true); },
  'export': () => download('clerkship-backup.json', JSON.stringify({ att: ATT, sav: SAV, set: SET, days: DAYM, seen: SEEN, drill: DRILL, done: DONE, plan: PLAN })),
  'import': () => $('#imp').click(),
  wipe: () => { if (confirm('Delete all analytics, streaks, notes and saved questions from this device?')) { ATT = []; SAV = {}; DAYM = {}; SEEN = {}; DRILL = {}; DONE = {}; ['cl_att', 'cl_sav', 'cl_days', 'cl_seen', 'cl_drill', 'cl_done'].forEach(del); go('settings', true); } }
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
  const f = A[t.dataset.act]; if (!f) return;
  if (t.dataset.act !== 'opt') buzz();
  const sg = t.closest('.seg');   /* let the sliding highlight animate before the view re-renders */
  if (sg && SET.motion && !t.classList.contains('on')) { sg.style.setProperty('--i', Array.from(sg.querySelectorAll('button')).indexOf(t)); setTimeout(() => f(t.dataset.v, t, e), 190); return; }
  f(t.dataset.v, t, e);
});
document.addEventListener('change', e => { if (e.target.id === 'sfrom') { S.setId = e.target.value; go('practice', true); } });
document.addEventListener('input', e => {
  const id = e.target.id;
  if (id === 'mins') S.mins = +e.target.value || 1;
  if (id === 'dm') { SET.defMins = Math.max(1, Math.min(180, +e.target.value || 30)); S.mins = SET.defMins; saveSet(); }
  if (id === 'nm') { SET.name = e.target.value.slice(0, 30); saveSet(); profile(); }
});
/* keyboard: 1-4 choose · N/→ next · P/← previous · M mark · Esc closes panels · calculator keys when open */
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (noteOpen()) { if (e.key === 'Enter') { e.preventDefault(); saveNote(); } else if (e.key === 'Escape') closeNote(); return; }
  if ($('#rwrap').classList.contains('show')) { if (e.key === 'Escape') $('#rwrap').classList.remove('show'); return; }
  if (toolsOpen()) {
    if (S.ttab === 'calc') { const k = e.key, m = { Enter: '=', '=': '=', Backspace: 'B', Delete: 'C', c: 'C', C: 'C', '%': '%' }; if (/^[0-9.]$/.test(k) || '+-*/'.indexOf(k) > -1) { e.preventDefault(); calcPress(k); } else if (m[k]) { e.preventDefault(); calcPress(m[k]); } }
    if (e.key === 'Escape') closeTools(); return;
  }
  if (S.view !== 'test' || S.paused || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  const k2 = e.key.toLowerCase();
  if (k2 >= '1' && k2 <= '4') { if (S.qs[S.cur].o[+k2 - 1] !== undefined) A.opt(+k2 - 1); }
  else if (k2 === 'n' || k2 === 'arrowright') { if (S.cur < S.qs.length - 1) A.next(); }
  else if (k2 === 'p' || k2 === 'arrowleft') A.prev();
  else if (k2 === 'm' && S.run !== 'quiz') A.mark();
});

/* ---------- boot ---------- */
padInit(); calcInit();
go('home'); preload();
if (!get('cl_tour', 0)) tourShow(0);
})();
