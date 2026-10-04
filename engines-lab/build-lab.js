// build-lab.js — 같은 시험 덱(저글링 4장)을 엔진마다 만든다.  사용: node engines-lab/build-lab.js
// 내용(그림·글·대본)은 여기 한 곳에만 있고, 엔진별로 "단계 표시 문법"만 바꿔 끼운다.
//   current: data-s="n"   reveal: class="fragment"   impress: class="substep"   marp/slidev: 마크다운 + HTML
const fs = require('fs'), path = require('path');
const here = __dirname;
const out = (p, s) => { const f = path.join(here, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); console.log('만듦:', p); };
const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

/* ── 공통 색 (지금 엔진 DESIGN.md · juggling1 의미 색) ── */
const COLORS = `--ball-a:#FF5C8A;--ball-b:#A78BFA;--ball-c:#FFA64D;--skin:#E8B796;--action:#2997ff;--warn:#FFD60A;--ink:#f5f5f7;--ink-2:#a1a1a6;--card:#272729;--bg:#1d1d1f;`;

/* ── 공통 그림 (SVG, 스크립트 없이 SMIL 로 움직임 → 어느 엔진에서나 동작) ── */
const hand = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="70" ry="26" style="fill:var(--skin)"/>`;
const SVG = {
  cover: `<svg viewBox="0 0 600 380" class="lab-svg" style="width:900px">
    <path id="PFX-loop" d="M150 320 Q300 -60 450 320 Q300 360 150 320Z" fill="none" stroke="#3a3a3c" stroke-width="3" stroke-dasharray="6 10"/>
    ${['a', 'b', 'c'].map((k, i) => `<circle r="26" style="fill:var(--ball-${k})"><animateMotion dur="2.4s" repeatCount="indefinite" begin="-${i * 0.8}s"><mpath href="#PFX-loop"/></animateMotion></circle>`).join('')}
    ${hand(150, 340)}${hand(450, 340)}</svg>`,
  arc: (step) => `<svg viewBox="0 0 1160 500" class="lab-svg" style="width:1370px">
    <path id="PFX-arc" d="M330 400 Q550 -40 770 400" fill="none" stroke="#6e6e73" stroke-width="4" stroke-dasharray="6 12"/>
    <circle r="28" style="fill:var(--ball-a)"><animateMotion dur="2.2s" repeatCount="indefinite" keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1"><mpath href="#PFX-arc"/></animateMotion></circle>
    ${hand(330, 425)}${hand(770, 425)}
    <g ${step(1)}><circle cx="330" cy="300" r="12" style="fill:var(--warn)"/><path d="M316 300H250" stroke="#a1a1a6" stroke-width="3"/>
      <text x="240" y="310" text-anchor="end" class="lab-t" style="fill:var(--warn)">명치 근처에서 놓기</text></g>
    <g ${step(2)}><path d="M846 425H880" stroke="#a1a1a6" stroke-width="3"/>
      <text x="890" y="436" class="lab-t">받는 손은 그대로</text></g></svg>`,
  rhythm: `<svg viewBox="0 0 600 460" class="lab-svg" style="width:640px">
    <path d="M180 60V400M420 60V400" stroke="#3a3a3c" stroke-width="3" stroke-dasharray="6 10"/>
    <circle cx="180" r="26" style="fill:var(--ball-a)"><animate attributeName="cy" values="390;80;390;390" keyTimes="0;.25;.5;1" dur="2.4s" repeatCount="indefinite" calcMode="spline" keySplines=".2 .6 .4 1;.6 0 .8 .4;0 0 1 1"/></circle>
    <circle cx="420" r="26" style="fill:var(--ball-b)"><animate attributeName="cy" values="390;390;80;390" keyTimes="0;.25;.5;.75" dur="2.4s" repeatCount="indefinite" calcMode="spline" keySplines="0 0 1 1;.2 .6 .4 1;.6 0 .8 .4"/></circle>
    ${hand(180, 420)}${hand(420, 420)}</svg>`
};
const RULES = [['적당한 높이', '정수리 ~ 정수리 위 30cm'], ['치우치지 않기', '좌·우·앞·뒤로 흔들리지 않게'], ['기다리기', '받는 손이 마중 나가지 않기'], ['힘 빼기', '움켜쥐지 말고 올려 두듯이']];
const CHIPS = ['던지고', '던지고', '받고', '받고'];
const NOTES = [
  '(표지) 공 세 개가 두 손을 오가고 있죠? 오늘은 이 3볼 토스 저글링까지 가는 연습 단계를 배웁니다. 발문: 저글링을 해 본 적 있나요?',
  '(1~4단계) 모든 연습에서 지킬 네 가지입니다. 높이, 방향, 기다리기, 힘 빼기. 발문: 이 중 가장 어려울 것 같은 것은?',
  '(3) 반대 손으로. (1단계) 공은 명치 근처에서 놓습니다. (2단계) 받는 손은 거의 움직이지 않도록, 던지기를 잘하는 것이 포인트입니다.',
  '(7) 첫 공이 정점에 도달할 때 두 번째 공을 던집니다. (1~4단계) 던지고, 던지고, 받고, 받고 — 소리 내어 리듬을 맞춰요.'
];

/* ── 공통 레이아웃 CSS (1920×1080 기준, 엔진마다 감싸는 선택자만 다름) ── */
const LAYOUT = (S) => `
${S}{${COLORS}font-family:"Pretendard Variable",Pretendard,"Apple SD Gothic Neo",sans-serif;color:var(--ink);word-break:keep-all;text-align:left}
${S} .lab-h1{font-size:128px;font-weight:700;letter-spacing:-.025em;line-height:1.1;margin:0;text-align:center}
${S} .lab-lead{font-size:44px;color:var(--ink-2);margin:0;text-align:center}
${S} .lab-eye{font-size:30px;font-weight:600;color:var(--ink-2);margin:0}
${S} .lab-h2{font-size:76px;font-weight:700;letter-spacing:-.02em;line-height:1.15;margin:8px 0 0}
${S} .lab-h2 b{color:var(--action)}
${S} .lab-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:26px;margin-top:60px}
${S} .lab-card{background:var(--card);border-radius:28px;padding:40px 36px;min-height:360px}
${S} .lab-card .n{display:inline-flex;width:56px;height:56px;border-radius:50%;background:var(--action);color:#000;font-size:30px;font-weight:700;line-height:56px;justify-content:center}
${S} .lab-card h3{font-size:44px;margin:26px 0 12px;font-weight:700}
${S} .lab-card p{font-size:30px;color:var(--ink-2);margin:0;line-height:1.4}
${S} .lab-row{display:flex;align-items:center;gap:60px;margin-top:40px}
${S} .lab-chips{display:flex;flex-direction:column;gap:22px}
${S} .lab-chip{font-size:56px;font-weight:800;padding:16px 44px;border-radius:999px;background:var(--card)}
${S} .lab-chip.c{color:var(--warn)}
${S} .lab-t{font:600 30px "Pretendard Variable",Pretendard,sans-serif;fill:var(--ink)}
${S} .lab-svg{display:block;max-width:100%;height:auto;margin:0 auto}
`;

/* 장면 본문 4개 — st = {attr(n), cls}: 엔진별 단계 속성과 단계 클래스 */
const bodies = (st) => { const step = n => `${st.cls ? `class="${st.cls}" ` : ''}${st.attr(n)}`; return [
  `<div style="padding-top:40px">${SVG.cover}</div><p class="lab-eye" style="text-align:center;margin-top:10px">저글링 연습 · 시험 덱</p><h1 class="lab-h1">3볼 토스 저글링</h1><p class="lab-lead">단계별로 연습하면 누구나 할 수 있어요</p>`,
  `<p class="lab-eye">모든 연습에서 지킬 것</p><h2 class="lab-h2">연습의 <b>4가지</b> 세부사항</h2>
   <div class="lab-cards">${RULES.map((r, i) => `<div class="lab-card ${st.cls}" ${st.attr(i + 1)}><span class="n">${i + 1}</span><h3>${r[0]}</h3><p>${r[1]}</p></div>`).join('')}</div>`,
  `<p class="lab-eye">가. 공 1개 연습법</p><h2 class="lab-h2">(3) <b>반대 손</b>으로</h2><div style="margin-top:30px">${SVG.arc(step)}</div>`,
  `<p class="lab-eye">나. 공 2개 연습법</p><h2 class="lab-h2">(7) 던지고, 던지고, <b>받고, 받고</b></h2>
   <div class="lab-row">${SVG.rhythm}<div class="lab-chips">${CHIPS.map((c, i) => `<span class="lab-chip ${i > 1 ? 'c' : ''} ${st.cls}" ${st.attr(i + 1)}>${c}</span>`).join('')}</div></div>`
]; };
const uniq = (s, i) => s.replace(/PFX/g, 'p' + i);      // SVG id 가 장마다 겹치지 않게

/* ═════ 1. 지금 엔진 ═════ */
{
  const B = bodies({ attr: n => `data-s="${n}"`, cls: '' });
  const tiles = ['black', 'dark', 'graphite', 'dark'];
  out('current/index.html', `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>시험 덱 · 지금 엔진</title>
<link rel="stylesheet" href="../vendor/current/deck-engine.css"><script src="../vendor/current/deck-engine.js"></script>
<style>${LAYOUT('.lab')} .lab{position:absolute;inset:0;padding:84px 100px}</style></head><body>
${B.map((b, i) => `<section class="slide" id="s0${i + 1}_lab" data-tile="${tiles[i]}" data-title="${['표지', '4가지 세부사항', '(3) 반대 손으로', '(7) 리듬'][i]}" data-notes="${NOTES[i]}"><div class="lab">${uniq(b, i)}</div></section>`).join('\n')}
</body></html>`);
}

/* ═════ 2. reveal.js (+ 판서 chalkboard, 확대 zoom, 발표자 화면 notes) ═════ */
{
  const B = bodies({ attr: n => `data-fragment-index="${n}"`, cls: 'fragment' });
  out('reveal/index.html', `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>시험 덱 · reveal.js</title>
<link rel="stylesheet" href="${FONT}">
<link rel="stylesheet" href="../vendor/reveal/reset.css"><link rel="stylesheet" href="../vendor/reveal/reveal.css">
<link rel="stylesheet" href="../vendor/reveal-plugins/chalkboard/style.css"><link rel="stylesheet" href="../vendor/reveal-plugins/customcontrols/style.css">
<style>body{background:#1d1d1f}.reveal{${COLORS}}.reveal .slides section{background:transparent;height:100%;box-sizing:border-box;padding:84px 100px}
${LAYOUT('.reveal .slides section')}
.reveal .lab-card.fragment{transform:translateY(28px)}.reveal .fragment.visible{transform:none}
.reveal .lab-chip.fragment{display:inline-block}.reveal .lab-chips .fragment{display:block}</style></head><body>
<div class="reveal"><div class="slides">
${B.map((b, i) => `<section data-background-color="${i ? '#1d1d1f' : '#000'}">${uniq(b, i)}<aside class="notes">${NOTES[i]}</aside></section>`).join('\n')}
</div></div>
<script src="../vendor/reveal/reveal.js"></script><script src="../vendor/reveal/plugin/notes.js"></script><script src="../vendor/reveal/plugin/zoom.js"></script>
<script src="../vendor/reveal-plugins/chalkboard/plugin.js"></script><script src="../vendor/reveal-plugins/customcontrols/plugin.js"></script>
<script>
Reveal.initialize({ width:1920, height:1080, margin:0, center:false, hash:true, transition:'fade',
  chalkboard:{ boardmarkerWidth:4, chalkWidth:5, theme:'whiteboard' },
  customcontrols:{ controls:[
    { icon:'✏️', title:'판서 (C)', action:'RevealChalkboard.toggleNotesCanvas();' },
    { icon:'🧽', title:'판서 지우기 (Del)', action:'RevealChalkboard.clear();' } ] },
  plugins:[ RevealNotes, RevealZoom, RevealChalkboard, RevealCustomControls ] });
</script></body></html>`);
}

/* ═════ 3. impress.js (프레지 같은 확대·이동, substep 으로 단계) ═════ */
{
  const B = bodies({ attr: () => '', cls: 'substep' });
  const pos = [[0, 0, 0, 1], [2400, 0, 0, 1], [2400, 1500, 90, 1], [0, 1500, 0, 1]];
  out('impress/index.html', `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>시험 덱 · impress.js</title>
<link rel="stylesheet" href="${FONT}">
<style>html,body{margin:0;background:#000;height:100%;overflow:hidden}
.step{width:1920px;height:1080px;box-sizing:border-box;padding:84px 100px;background:#1d1d1f;border-radius:28px;opacity:.25;transition:opacity 1s}
.step.active{opacity:1}
${LAYOUT('.step')}
.substep{opacity:0;transition:opacity .6s}.substep.substep-visible{opacity:1}
.notes{display:none}#overview{background:none}</style></head><body>
<div id="impress" data-width="1920" data-height="1080" data-transition-duration="1000">
${B.map((b, i) => `<div class="step" data-x="${pos[i][0]}" data-y="${pos[i][1]}" data-rotate="${pos[i][2]}">${uniq(b, i)}<div class="notes">${NOTES[i]}</div></div>`).join('\n')}
<div id="overview" class="step" data-x="1200" data-y="750" data-scale="3"></div>
</div>
<script src="../vendor/impress/impress.js"></script><script>impress().init();</script></body></html>`);
}

/* ═════ 4. Marp (마크다운 → HTML, 목록은 * 로 쓰면 하나씩 등장) ═════ */
{
  const B = bodies({ attr: () => '', cls: '' });
  const md = `---
marp: true
theme: lab
paginate: true
style: |
  section{width:1920px;height:1080px;padding:84px 100px;background:#1d1d1f;justify-content:flex-start}
  ${LAYOUT('section').replace(/\n/g, '\n  ')}
  section ul{list-style:none;padding:0;display:flex;flex-direction:column;gap:22px}
  section li{font-size:56px;font-weight:800;padding:16px 44px;border-radius:999px;background:var(--card);width:max-content}
---

<!-- _backgroundColor: #000 -->
${uniq(B[0], 0)}

<!-- ${NOTES[0]} -->

---

${uniq(B[1], 1)}

<!-- ${NOTES[1]} -->

---

${uniq(B[2], 2)}

<!-- ${NOTES[2]} -->

---

<p class="lab-eye">나. 공 2개 연습법</p><h2 class="lab-h2">(7) 던지고, 던지고, <b>받고, 받고</b></h2>
<div class="lab-row">${uniq(SVG.rhythm, 3)}<div>

* 던지고
* 던지고
* 받고
* 받고

</div></div>

<!-- ${NOTES[3]} -->
`;
  out('marp/slides.md', md);
  out('marp/lab-theme.css', `/* @theme lab */\n@import 'default';\nsection{width:1920px;height:1080px}\n`);   // Marp 기본 크기(1280×720)를 1920×1080 으로
}

/* ═════ 5. Slidev (마크다운 + v-click, 판서·발표자 화면 내장) ═════ */
{
  const B = bodies({ attr: n => `v-click="${n}"`, cls: '' });
  const md = `---
theme: default
title: 시험 덱 · Slidev
routerMode: hash
canvasWidth: 1920
aspectRatio: 16/9
drawings:
  enabled: true
class: lab
---

${uniq(B[0], 0)}

<!-- ${NOTES[0]} -->

---
class: lab
---

${uniq(B[1], 1)}

<!-- ${NOTES[1]} -->

---
class: lab
---

${uniq(B[2], 2)}

<!-- ${NOTES[2]} -->

---
class: lab
---

${uniq(B[3], 3)}

<!-- ${NOTES[3]} -->
`;
  out('slidev/slides.md', md);
  out('slidev/style.css', `.slidev-layout.lab{background:#1d1d1f !important;padding:84px 100px !important}\n${LAYOUT('.slidev-layout.lab')}`);
}
