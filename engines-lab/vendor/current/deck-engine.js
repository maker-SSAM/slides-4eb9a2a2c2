/* deck-engine.js v1 · 자동 생성: node kit.js — 원본은 Lecture-Notes/src/ */
/* ═══════════════════════════════════════════════════════════════
   core.js — 강의 덱 엔진
   · 1920×1080 무대를 화면에 맞춰 배율(레터박스)
   · 장면(scene) = 도입(enter, 저절로) + 빌드 단계(클릭마다 한 단계)
   · 모든 모습은 "단계 k 의 함수"다. 되돌아가기·건너뛰기는 k 로 즉시 그려서 언제나 같은 모습
   · 애니메이션 도구(ctx)는 장면을 떠나면 저절로 정리됨
   ───────────────────────────────────────────────────────────────
   Deck.scene(id, {
     steps?,            // 클릭 단계 수 (생략하면 data-s 의 최댓값)
     build(root),       // 처음 보일 때 한 번: SVG/DOM 조립
     enter(ctx),        // 장면에 들어올 때마다: 반복 애니메이션 시작 (ctx.loop 등)
     go(k, ctx, instant)// 단계 k 가 되었을 때(앞·뒤 모두): k 에 맞게 그리기
   })
   · HTML 쪽: data-s="n" → n단계에 나타남 / 슬라이드에 클래스 ge1..geN → 단계 ≥ n 이면 붙음
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const SW = 1920, SH = 1080, MAXSTEP = 12;
  const Q = new URLSearchParams(location.search);
  const STILL = Q.get('still') === '1';
  const defs = {}, ctxs = {};
  let slides = [], cur = -1, step = 0, buf = '';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function makeCtx(root) {
    const loops = new Set(), timers = new Set(); let dead = false;
    return {
      root, state: {},
      $: s => root.querySelector(s), $$: s => [...root.querySelectorAll(s)],
      /** 매 프레임 fn(경과ms) 호출. 반환값을 부르면 멈춤 */
      loop(fn) {
        let on = true, id; const t0 = performance.now();
        const tick = n => { if (!on || dead) return; fn(n - t0); id = requestAnimationFrame(tick); };
        id = requestAnimationFrame(tick);
        const stop = () => { on = false; cancelAnimationFrame(id); loops.delete(stop); };
        loops.add(stop); return stop;
      },
      after(fn, ms) { const id = setTimeout(fn, ms); timers.add(id); return id; },
      dispose() { dead = true; loops.forEach(s => s()); timers.forEach(clearTimeout); }
    };
  }

  function maxStep(el) {
    const d = defs[el.id];
    if (d && typeof d.steps === 'number') return d.steps;
    return $$('[data-s]', el).reduce((m, n) => Math.max(m, +n.dataset.s || 0), 0);
  }

  function apply(el, k, instant) {
    const d = defs[el.id] || {};
    if (instant) el.classList.add('instant');
    $$('[data-s]', el).forEach(n => n.classList.toggle('on', +n.dataset.s <= k));
    for (let n = 1; n <= MAXSTEP; n++) el.classList.toggle('ge' + n, n <= k);
    el.dataset.step = k;
    if (d.go) d.go(k, ctxs[el.id], !!instant);
    if (instant) { void el.offsetWidth; setTimeout(() => el.classList.remove('instant'), 80); }
    hud();
  }

  function show(i, k, instant) {
    i = clamp(i, 0, slides.length - 1);
    const el = slides[i], d = defs[el.id] || {};
    const max = maxStep(el);
    if (STILL) { k = max; instant = true; }
    k = clamp(k, 0, max);
    if (i !== cur) {
      if (cur >= 0) {
        const old = slides[cur];
        if (ctxs[old.id]) ctxs[old.id].dispose();
        old.classList.remove('is-on');
      }
      cur = i;
      el.classList.add('is-on');
      if (!el._built) { if (d.build) d.build(el); el._built = true; }
      ctxs[el.id] = makeCtx(el);
      if (d.enter) d.enter(ctxs[el.id]);
      history.replaceState(null, '', '#' + (i + 1));
      renderNotes();
    }
    step = k;
    apply(el, k, instant);
  }

  function next() {
    const el = slides[cur];
    if (step < maxStep(el)) show(cur, step + 1);
    else if (cur < slides.length - 1) show(cur + 1, 0);
  }
  function prev() {
    if (step > 0) show(cur, step - 1);
    else if (cur > 0) show(cur - 1, 999, true);
  }
  const go = n => show(n - 1, 0);

  function fit() {
    const s = Math.min(innerWidth / SW, innerHeight / SH);
    $('#stage').style.transform = 'scale(' + s + ') translate(' + (-SW / 2) + 'px,' + (-SH / 2) + 'px)';
  }
  function hud() {
    $('#hud').textContent = (cur + 1) + ' / ' + slides.length;
    const el = slides[cur], m = maxStep(el) || 1;
    $('#bar').style.width = ((cur + (maxStep(el) ? step / m : 1) * 0.999) / slides.length * 100) + '%';
  }
  function renderNotes() {
    $('#notes').textContent = slides[cur].dataset.notes || '(이 장에는 대본이 없습니다)';
  }
  function toggle(id) {
    const n = $(id); const on = !n.classList.contains('on');
    $$('#overview,#help').forEach(x => { if (x !== n) x.classList.remove('on'); });
    n.classList.toggle('on', on);
    return on;
  }
  function buildOverview() {
    const ov = $('#overview');
    ov.innerHTML = slides.map((s, i) =>
      '<button data-i="' + i + '"><b>' + (i + 1) + '</b>' + (s.dataset.title || s.id) + '</button>').join('');
    ov.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      ov.classList.remove('on'); go(+b.dataset.i + 1);
    });
  }
  function markCur() { $$('#overview button').forEach(b => b.classList.toggle('cur', +b.dataset.i === cur)); }

  function keys(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (/^[0-9]$/.test(k)) { buf += k; return; }
    if (k === 'Enter' && buf) { go(+buf); buf = ''; return; }
    buf = '';
    if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'Enter') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); prev(); }
    else if (k === 'Home') go(1);
    else if (k === 'End') go(slides.length);
    else if (k === 'n' || k === 'N') $('#notes').classList.toggle('on');
    else if (k === 'o' || k === 'O') { markCur(); toggle('#overview'); }
    else if (k === 'h' || k === 'H' || k === '?') toggle('#help');
    else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
    else if (k === 'b' || k === 'B') $('#blank').className = $('#blank').className === 'b' ? '' : 'b';
    else if (k === 'w' || k === 'W') $('#blank').className = $('#blank').className === 'w' ? '' : 'w';
    else if (k === 'r' || k === 'R') { const s = step; show(cur, 0, true); setTimeout(() => show(cur, s), 120); }
    else if (k === 'Escape') { $$('#overview,#help').forEach(x => x.classList.remove('on')); $('#blank').className = ''; }
  }

  window.Deck = {
    scene(id, def) { defs[id] = def; },
    next, prev, go,
    start() {
      slides = $$('#stage > .slide');
      if (STILL) document.body.classList.add('still');
      fit(); addEventListener('resize', fit);
      buildOverview();
      addEventListener('keydown', keys);
      /* 클릭 = 다음, 오른쪽 클릭 = 이전 */
      $('#viewport').addEventListener('click', e => { if (!e.target.closest('#notes,#overview,#help')) next(); });
      $('#viewport').addEventListener('contextmenu', e => { e.preventDefault(); prev(); });
      /* 전자칠판 좌우 밀기 */
      let tx = 0, ty = 0;
      addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
      addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { dx < 0 ? next() : prev(); }
      }, { passive: true });
      addEventListener('hashchange', () => { const n = +location.hash.slice(1); if (n && n - 1 !== cur) go(n); });
      show(clamp((+location.hash.slice(1) || 1) - 1, 0, slides.length - 1), 0);
    }
  };
})();
/* ═══════════════════════════════════════════════════════════════
   objects.js — 오브젝트(OBJ) 라이브러리 · 공용 효과(FX)
   규약:
   · OBJ.def(name, {box:[w,h], svg(o)}) — svg(o) 는 문자열. 좌표는 (0,0)~box 안(조금 넘어도 됨)
   · 그라데이션·필터 id 는 `${o.id}-무엇` 으로 (같은 오브젝트가 여러 장에 나와도 안 겹치게)
   · 움직이는 부품에는 class="p-부품" 을 붙인다 → 장면 CSS/JS 에서 이 이름으로 잡음
   · 색은 var(--fil) 같은 의미 색 변수만 쓴다 (밝은 면/어두운 면에서 자동 전환)
   · 쓰는 법: OBJ.place('hotend', {id, x, y, s})  → <g transform=...> 문자열
   ═══════════════════════════════════════════════════════════════ */
window.OBJ = (function () {
  const reg = {}; let n = 0;
  return {
    def(name, d) { reg[name] = d; },
    box(name) { return reg[name].box; },
    place(name, o) {
      o = o || {}; const d = reg[name];
      if (!d) throw new Error('OBJ 없음: ' + name);
      const id = o.id || (name + '-' + (++n));
      return '<g class="o-' + name + '" id="' + id + '" transform="translate(' + (o.x || 0) + ' ' + (o.y || 0) +
        ') scale(' + (o.s == null ? 1 : o.s) + ')">' + d.svg(Object.assign({}, o, { id })) + '</g>';
    }
  };
})();

/* ── 핫엔드(노즐 조립체). 노즐 끝 = (60,170). 필라멘트 굵은 선이 위로 들어옴 ── */
OBJ.def('hotend', {
  box: [120, 170],
  svg(o) {
    const fil = o.fil || 70;
    return `
      <rect class="p-fil" x="55" y="${-fil}" width="10" height="${fil + 60}" rx="5" style="fill:var(--fil)"/>
      <rect x="28" y="0" width="64" height="46" rx="8" fill="#48484a"/>
      <path d="M34 12H86M34 24H86M34 36H86" stroke="#2c2c2e" stroke-width="3" stroke-linecap="round"/>
      <rect class="p-heater" x="16" y="46" width="88" height="62" rx="10" style="fill:var(--heater,#5a5a5e);transition:fill .8s"/>
      <path d="M40 108H80L66 170H54Z" style="fill:var(--metal)"/>
      <path d="M54 170H66" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>`;
  }
});

/* ── 필라멘트 스풀. 중심 (100,100). 돌아가면 구멍 3개가 보임(class p-spool) ── */
OBJ.def('spool', {
  box: [200, 200],
  svg(o) {
    const holes = [0, 120, 240].map(a => {
      const r = a * Math.PI / 180; return `<circle cx="${100 + 58 * Math.sin(r)}" cy="${100 - 58 * Math.cos(r)}" r="11" fill="#1d1d1f"/>`;
    }).join('');
    return `<g class="p-spool" style="transform-box:fill-box;transform-origin:center">
      <circle cx="100" cy="100" r="96" fill="#2c2c2e"/>
      <circle cx="100" cy="100" r="84" style="fill:var(--fil)"/>
      <circle cx="100" cy="100" r="70" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="3"/>
      <circle cx="100" cy="100" r="54" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="3"/>
      <circle cx="100" cy="100" r="38" fill="#2c2c2e"/>
      ${holes.replace(/r="11"/g, 'r="9"')}
      <circle cx="100" cy="100" r="12" fill="#6e6e73"/></g>`;
  }
});

/* ── 출력판(베드). 윗면 중심이 (0,0). 좌우 ±260 ── */
OBJ.def('bed', {
  box: [520, 22],
  svg() {
    return `<rect x="-260" y="0" width="520" height="22" rx="6" fill="#3a3a3c"/>
      <rect x="-260" y="0" width="520" height="4" rx="2" fill="#6e6e73"/>`;
  }
});

/* ═══════════════════════════════════════════════════════════════
   FX — 공용 효과
   FX.printLoop(ctx, o)  3D 프린터가 한 층씩 쌓는 모습(노즐 고정, 베드가 좌우·아래로 움직임)
     o.bed      베드 그룹(<g>) — 안에 베드와 층(rect)이 들어 있음. 좌표 원점 = 베드 윗면 중심
     o.layers   층 rect 배열(아래층부터). 각 rect 는 베드 좌표계에서 y = -(j+1)*h
     o.tipX/tipY 노즐 끝의 화면 좌표        o.h 한 층 두께(px)
     o.wAt(j)   j번째 층의 너비            o.per 한 층 걸리는 시간(ms)   o.hold 다 쌓고 멈춤(ms)
     o.glow     (선택) 노즐 끝 불빛 요소 — 쌓는 동안 깜박임
   반환: stop() — 호출하면 멈추고 빈 베드로 되돌림
   ═══════════════════════════════════════════════════════════════ */
window.FX = {
  printReset(o) {
    o.layers.forEach(r => { r.setAttribute('width', 0); r.setAttribute('x', 0); });
    o.bed.setAttribute('transform', 'translate(' + o.tipX + ' ' + o.tipY + ')');
    o.bed.style.opacity = 1;
  },
  printLoop(ctx, o) {
    const N = o.layers.length, cyc = N * o.per + o.hold, FADE = 500;
    const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    const stopLoop = ctx.loop(t => {
      const tt = t % cyc, p = Math.min(tt / o.per, N);
      const L = Math.min(Math.floor(p), N - 1), f = p >= N ? 1 : p - L;
      o.layers.forEach((r, j) => {
        const w = o.wAt(j);
        if (j < L || (j === L && f >= 1)) { r.setAttribute('x', -w / 2); r.setAttribute('width', w); }
        else if (j === L) {
          r.setAttribute('width', w * f);
          r.setAttribute('x', L % 2 === 0 ? -w / 2 : w / 2 - w * f);
        } else { r.setAttribute('width', 0); }
      });
      const w = o.wAt(L);
      const xloc = f >= 1 ? 0 : (L % 2 === 0 ? -w / 2 + w * f : w / 2 - w * f);
      o.bed.setAttribute('transform', 'translate(' + (o.tipX - xloc) + ' ' + (o.tipY + o.h * (L + sm(f / 0.15))) + ')');
      o.bed.style.opacity = tt > cyc - FADE ? Math.max(0, (cyc - tt) / FADE) : 1;
      if (o.glow) o.glow.style.opacity = p >= N ? 0.25 : 0.7 + 0.3 * Math.sin(t / 60);
    });
    const stop = () => { stopLoop(); FX.printReset(o); if (o.glow) o.glow.style.opacity = 0; };
    return stop;
  }
};

/* ── 파라메트릭 꽃병 ── FX.vase(h,R,amp,cnt) → {body, rim, rx, ry}  (원점 = 윗면 중심, 아래로 h)
   h 높이(px) · R 최대 반지름 · amp 물결 크기(0~1) · cnt 물결 개수. body 는 <path d>, rim 은 윗면 타원의 rx/ry */
FX.vase = function (h, R, amp, cnt) {
  const N = 48, r = t => R * (0.3 + 0.7 * Math.sin(Math.PI * (0.08 + 0.84 * Math.pow(t, 0.8)))) *
    (1 + amp * 0.12 * Math.sin(t * cnt * 2 * Math.PI));
  const L = [], Rt = [];
  for (let i = 0; i <= N; i++) { const t = i / N, y = (t * h).toFixed(1), x = r(t); L.push((-x).toFixed(1) + ' ' + y); Rt.push(x.toFixed(1) + ' ' + y); }
  const rb = r(1), rt = r(0);
  const d = 'M' + L.join('L') + 'A' + rb.toFixed(1) + ' ' + (rb * 0.25).toFixed(1) + ' 0 0 0 ' + Rt[N] + 'L' + Rt.reverse().join('L') + 'Z';
  return { body: d, rx: rt, ry: rt * 0.25 };
};

/* ── 자동 시작: 본문에 <section class="slide"> 만 있어도 무대·대본 창·목차를 만들고 시작한다 ── */
(function () {
  const start = Deck.start; let started = false;
  Deck.start = function () { if (started) return; started = true; start(); };
  const HELP = "<h3>강의 조작</h3>\n  <dl>\n    <dt>→ · Space · 클릭</dt><dd>다음 (빌드 단계 → 다음 장)</dd>\n    <dt>← · 오른쪽 클릭</dt><dd>이전</dd>\n    <dt>R</dt><dd>이 단계 애니메이션 다시 보기</dd>\n    <dt>N</dt><dd>발표자 노트(대본)</dd>\n    <dt>O</dt><dd>전체 보기(목차)</dd>\n    <dt>F</dt><dd>전체 화면</dd>\n    <dt>B / W</dt><dd>검은 화면 / 흰 화면</dd>\n    <dt>숫자 + Enter</dt><dd>그 장으로 이동</dd>\n    <dt>좌우로 밀기</dt><dd>전자칠판에서 넘기기</dd>\n    <dt>?still=1</dt><dd>주소 뒤에 붙이면 모든 단계를 펼친 정지 화면(인쇄·캡처용)</dd>\n  </dl>";
  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('stage')) {
      const vp = document.createElement('div'), st = document.createElement('div');
      vp.id = 'viewport'; st.id = 'stage'; vp.appendChild(st);
      document.querySelectorAll('body > section.slide').forEach(function (s) { st.appendChild(s); });
      document.body.prepend(vp);
    }
    ['bar', 'hud', 'notes', 'overview', 'help', 'blank'].forEach(function (id) {
      if (document.getElementById(id)) return;
      const d = document.createElement('div'); d.id = id; if (id === 'help') d.innerHTML = HELP;
      document.body.appendChild(d);
    });
    Deck.start();
  });
})();
