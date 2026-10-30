import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './landing.css';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const $ = (s: string): HTMLElement | null => root.querySelector(s);
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    /* ---- shared ad creative (shows brand issues via classes) ---- */
    const AD = (c: string) => `
      <div class="ad ${c}">
        <span class="lg">fernwood</span>
        <span class="ci"></span>
        <h4>Steep into<br>spring.</h4>
        <span class="bt">Shop the blends</span>
      </div>
    `;

    interface IssueItem {
      id: string;
      t: string;
      sev: string;
      h: number;
      x: number;
      y: number;
      e: string;
      f: string;
    }

    const ISS: IssueItem[] = [
      { id: 'logo', t: 'Incorrect logo variation', sev: 'High', h: 1, x: 5, y: 10, e: 'The italic outlined wordmark is not an approved variant.', f: 'Use the primary bold wordmark.' },
      { id: 'color', t: 'Off-brand color', sev: 'High', h: 1, x: 68, y: 36, e: 'The accent circle is #FF6A3D, which is not in the palette.', f: 'Replace with brand green #14532D.' },
      { id: 'type', t: 'Inconsistent typography', sev: 'Medium', h: 0, x: 5, y: 68, e: 'The headline uses an italic serif instead of Bricolage Grotesque.', f: 'Set the headline in Bricolage Grotesque 800.' },
      { id: 'align', t: 'Misaligned brand element', sev: 'Medium', h: 0, x: 12, y: 90, e: 'The button sits 7% right of the text margin.', f: 'Align the button to the 8% left margin.' }
    ];

    /* ---- hero audit tool ---- */
    const fixed = new Set<string>();

    function renderHero() {
      const heroAdEl = $('#heroad');
      const heroIssEl = $('#heroiss');
      if (!heroAdEl || !heroIssEl) return;

      const bad = ISS.filter(i => !fixed.has(i.id)).map(i => 'b-' + i.id).join(' ');
      heroAdEl.innerHTML = AD(bad) + ISS.map((i, k) => `
        <button class="pin ${fixed.has(i.id) ? 'ok' : ''}" style="left:${i.x}%;top:${i.y}%" aria-label="Issue ${k + 1}: ${i.t}" data-pin-id="i-${i.id}">
          ${fixed.has(i.id) ? '✓' : k + 1}
        </button>
      `).join('');

      heroIssEl.innerHTML = ISS.map((i, k) => `
        <div class="iss ${fixed.has(i.id) ? 'ok' : ''}" id="i-${i.id}">
          <span class="n">${k + 1}</span>
          <span><strong>${i.t}</strong><span class="sev ${i.h ? 'hi' : ''}">${i.sev}</span></span>
          <span>${i.e}</span>
          <span class="mut">Fix: ${i.f}</span>
          <button type="button" data-tog-id="${i.id}">${fixed.has(i.id) ? 'Applied · Undo' : 'Apply fix'}</button>
        </div>
      `).join('') + `<p class="sum">${ISS.length - fixed.size} of ${ISS.length} issues open. Sample creative with sample findings.</p>`;

      // Attach event listeners for pins and toggle buttons
      heroAdEl.querySelectorAll<HTMLButtonElement>('[data-pin-id]').forEach(btn => {
        btn.onclick = () => {
          const targetId = btn.getAttribute('data-pin-id');
          if (targetId && root) {
            root.querySelector(`#${targetId}`)?.scrollIntoView({ block: 'nearest' });
          }
        };
      });

      heroIssEl.querySelectorAll<HTMLButtonElement>('[data-tog-id]').forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute('data-tog-id');
          if (id) {
            if (fixed.has(id)) fixed.delete(id);
            else fixed.add(id);
            renderHero();
          }
        };
      });
    }

    renderHero();

    /* ---- before / after ---- */
    const FXN: Record<string, string> = {
      logo: 'Approved logo',
      color: 'Brand green',
      type: 'Brand typeface',
      align: 'Button aligned to the grid'
    };
    const FX = new Set<string>(ISS.map(i => i.id));
    const cmpOpen = () => ISS.filter(i => !FX.has(i.id)).map(i => 'b-' + i.id).join(' ');
    const cmp = $('#cmp');
    const fixes = $('#fixes');

    if (cmp && fixes) {
      cmp.innerHTML = AD('b-logo b-color b-type b-align') + `
        <div class="top" id="cmptop">${AD(cmpOpen())}</div>
        <span class="tag" style="left:8px">Original</span>
        <span class="tag" id="cmptag" style="right:8px">Corrected (illustrative)</span>
        <div id="hdl" role="slider" tabindex="0" aria-label="Reveal corrected version" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"></div>
      ` + ISS.map((i, k) => `<span class="pin" style="left:${i.x}%;top:${i.y}%;z-index:2">${k + 1}</span>`).join('');

      fixes.innerHTML = ISS.map((i, k) => `
        <label class="fx">
          <input type="checkbox" data-fx="${i.id}" checked>
          <span class="n">${k + 1}</span>
          <span><strong>${FXN[i.id]}</strong><span class="mut fh" data-h="${i.id}"></span></span>
        </label>
      `).join('');

      const syncFx = () => {
        const n = FX.size;
        const cmptop = $('#cmptop');
        const cmptag = $('#cmptag');
        const fxs = $('#fxs');
        if (cmptop) cmptop.innerHTML = AD(cmpOpen());
        if (cmptag) cmptag.textContent = n === ISS.length ? 'Corrected (illustrative)' : n ? 'Your selected fixes' : 'No fixes applied';
        ISS.forEach(i => {
          const hint = $(`[data-h="${i.id}"]`);
          if (hint) hint.textContent = FX.has(i.id) ? i.f : 'Keeping your original.';
        });
        if (fxs) fxs.textContent = `${n} of ${ISS.length} suggested fixes applied`;
      };

      fixes.onchange = (e: Event) => {
        const target = (e.target as HTMLElement)?.closest('input[data-fx]') as HTMLInputElement | null;
        if (!target) return;
        const fxKey = target.dataset.fx;
        if (!fxKey) return;
        if (target.checked) FX.add(fxKey);
        else FX.delete(fxKey);
        syncFx();
      };
      syncFx();

      const sx = (v: number) => {
        v = Math.max(0, Math.min(100, v));
        cmp.style.setProperty('--x', v + '%');
        $('#hdl')?.setAttribute('aria-valuenow', Math.round(v).toString());
      };

      let drag = 0;
      const mv = (e: PointerEvent) => {
        if (drag) {
          const r = cmp.getBoundingClientRect();
          sx(((e.clientX - r.left) / r.width) * 100);
        }
      };

      cmp.onpointerdown = (e: PointerEvent) => {
        drag = 1;
        cmp.setPointerCapture(e.pointerId);
        mv(e);
      };
      cmp.onpointermove = mv;
      cmp.onpointerup = () => { drag = 0; };

      const hdl = $('#hdl');
      if (hdl) {
        hdl.onkeydown = (e: KeyboardEvent) => {
          const v = +(hdl.getAttribute('aria-valuenow') || 50);
          if (e.key === 'ArrowLeft') sx(v - 5);
          if (e.key === 'ArrowRight') sx(v + 5);
        };
      }
    }

    /* ---- upload + MOCK audit service ---- */
    const MockAuditService = {
      async analyze(_file: File) {
        await sleep(1400);
        return {
          mock: true,
          findings: [
            { t: 'Logo clear space too small', sev: 'Medium', x: 15, y: 12, fix: 'Increase clear space around the logo.' },
            { t: 'Color may be off-palette', sev: 'High', x: 70, y: 45, fix: 'Compare the accent with your brand palette.' },
            { t: 'Text near edge', sev: 'Medium', x: 30, y: 85, fix: 'Keep text inside the safe margin.' }
          ]
        };
      }
    };

    const OK = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
    let up: File | null = null;

    function pick(f: File | null | undefined) {
      const er = $('#err');
      const drop = $('#drop');
      const upv = $('#upv');
      const upi = $('#upi') as HTMLImageElement | null;
      const upc = $('#upc');
      const upres = $('#upres');
      if (er) er.textContent = '';
      if (!f) return;
      if (!OK.includes(f.type)) {
        if (er) er.textContent = 'Unsupported file. Use PNG, JPG, WebP, GIF, or SVG.';
        return;
      }
      if (f.size > 10 * 1048576) {
        if (er) er.textContent = 'File is larger than 10 MB. Export a smaller image.';
        return;
      }
      up = f;
      if (drop) drop.hidden = true;
      if (upv) upv.hidden = false;
      if (upi) upi.src = URL.createObjectURL(f);
      if (upc) upc.querySelectorAll('.pin').forEach(p => p.remove());
      if (upres) upres.innerHTML = '<p class="mut">Ready. Select “Run audit”.</p>';
    }

    const fileInput = $('#file') as HTMLInputElement | null;
    if (fileInput) {
      fileInput.onchange = (e: Event) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files[0]) pick(files[0]);
      };
    }

    const upiEl = $('#upi') as HTMLImageElement | null;
    if (upiEl) {
      upiEl.onerror = () => {
        const er = $('#err');
        const upv = $('#upv');
        const drop = $('#drop');
        if (er) er.textContent = 'This file could not be read as an image.';
        if (upv) upv.hidden = true;
        if (drop) drop.hidden = false;
        up = null;
      };
    }

    const repBtn = $('#rep');
    if (repBtn) repBtn.onclick = () => fileInput?.click();

    const dz = $('#drop');
    if (dz) {
      dz.ondragover = (e: DragEvent) => {
        e.preventDefault();
        dz.classList.add('dg');
      };
      dz.ondragleave = () => dz.classList.remove('dg');
      dz.ondrop = (e: DragEvent) => {
        e.preventDefault();
        dz.classList.remove('dg');
        if (e.dataTransfer && e.dataTransfer.files[0]) {
          pick(e.dataTransfer.files[0]);
        }
      };
    }

    const runBtn = $('#run');
    if (runBtn) {
      runBtn.onclick = async () => {
        if (!up) return;
        const R = $('#upres');
        const upc = $('#upc');
        if (R) R.innerHTML = '<p class="mut" role="status">Running audit…</p>';
        try {
          const r = await MockAuditService.analyze(up);
          if (upc) {
            upc.insertAdjacentHTML(
              'beforeend',
              r.findings.map((f, k) => `<span class="pin" style="left:${f.x}%;top:${f.y}%">${k + 1}</span>`).join('')
            );
          }
          if (R) {
            R.innerHTML = `
              <div class="note">Sample findings from a mock service. This is not real AI analysis of your image.</div>
              ${r.findings.map((f, k) => `
                <div class="iss">
                  <span class="n">${k + 1}</span>
                  <span><strong>${f.t}</strong><span class="sev ${f.sev === 'High' ? 'hi' : ''}">${f.sev}</span></span>
                  <span class="mut">Suggested: ${f.fix}</span>
                </div>
              `).join('')}
              <p class="sum">Audit complete.</p>
            `;
          }
        } catch {
          if (R) R.innerHTML = '<p style="color:#e5484d" role="alert">The audit failed. Try again.</p>';
        }
      };
    }

    /* ---- intro: analog signal + repair sequence ---- */
    const intro = $('#intro');
    const cam = $('#cam');
    const M = $('#m');
    const spr = $('#spr');
    const k1 = $('#k1');
    const k2 = $('#k2');
    const tv = $('#tv');
    const scr = $('#scr');
    const cv = $('#st') as HTMLCanvasElement | null;
    const tvad = $('#tvad');
    const sk = $('#skip');
    const rp = $('#replay');

    if (!intro || !cam || !M || !spr || !k1 || !k2 || !tv || !scr || !cv || !tvad) {
      return;
    }

    const introEl: HTMLElement = intro;
    const camEl: HTMLElement = cam;
    const mEl: HTMLElement = M;
    const sprEl: HTMLElement = spr;
    const k1El: HTMLElement = k1;
    const k2El: HTMLElement = k2;
    const tvEl: HTMLElement = tv;
    const scrEl: HTMLElement = scr;
    const cvEl: HTMLCanvasElement = cv;
    const tvadEl: HTMLElement = tvad;

    const cx = cvEl.getContext('2d');
    if (!cx) return;

    const W = 160;
    const H = 120;
    const img = cx.createImageData(W, H);
    const S = { n: 1, g: 0, b: 2, l: 1 };

    let skip = 0;
    let jit: any;
    let raf: number;
    let last = 0;
    let done = 0;
    let amb = 1;
    let ambT = 0;
    let lastG = -1;
    let lastF = '';
    let run = 0;
    let isUnmounted = false;

    const FR = (i: number) => {
      sprEl.style.backgroundPosition = `${(i % 10) / 9 * 100}% ${((i / 10) | 0) / 2 * 100}%`;
    };
    FR(0);

    const ease = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const cls = (removeClasses: string[], addClass?: string) => {
      mEl.classList.remove(...removeClasses);
      if (addClass) mEl.classList.add(addClass);
    };

    const turn = (a: number, b: number, ms: number) => new Promise<void>((resolve, reject) => {
      const id = run;
      const t0 = performance.now();
      const f = (t: number) => {
        if (isUnmounted || id !== run) return reject(0);
        if (skip) return resolve();
        const p = Math.min(1, (t - t0) / ms);
        FR(Math.round(a + (b - a) * ease(p)));
        if (p < 1) requestAnimationFrame(f);
        else resolve();
      };
      requestAnimationFrame(f);
    });

    function draw(t: number) {
      if (isUnmounted || done) return;
      raf = requestAnimationFrame(draw);
      if (t - last < 42) return;
      last = t;

      const d = img.data;
      const bar = ((t / 7) % (H * 1.7)) - H * 0.35;
      const rb = Math.sin(t / 430) * 0.04;

      for (let y = 0; y < H; y++) {
        const nb = Math.abs(y - bar);
        const band = nb < 9 ? 1 - nb / 9 : 0;
        const gap = y > bar + 12 && y < bar + 19 ? 0.3 : 1;
        const tear = (band * 16 * (S.g ? 1 : 0.3) * (Math.random() - 0.25)) | 0;
        const jt = S.g && Math.random() < 0.05 ? ((Math.random() * 36) | 0) : 0;
        const rowl = 0.08 * Math.sin(y * 0.7 + t / 60);

        for (let x = 0; x < W; x++) {
          const v = Math.min(255, (Math.random() * 0.72 + 0.12 + band * 0.38 + rowl + rb) * S.l * gap * 255);
          const i = (y * W + ((x + tear + jt + W) % W)) * 4;
          d[i] = v * 0.82 + Math.random() * 26;
          d[i + 1] = v * 0.93;
          d[i + 2] = Math.min(255, v * 1.06 + Math.random() * 18);
          d[i + 3] = 255;
        }
      }

      if (amb && t - ambT > 700) {
        ambT = t;
        S.g = Math.random() < 0.18 ? 1 : 0;
        S.l = 0.85 + Math.random() * 0.25;
      }

      cx?.putImageData(img, 0, 0);
      cvEl.style.opacity = S.n.toString();
      const f = `blur(${S.b.toFixed(1)}px) saturate(.45) hue-rotate(${S.g ? 25 : 0}deg) brightness(${(0.7 + S.l * 0.4).toFixed(2)})`;
      if (f !== lastF) {
        tvadEl.style.filter = f;
        lastF = f;
      }
      const g = +(0.25 + 0.6 * S.n * S.l).toFixed(2);
      if (Math.abs(g - lastG) > 0.04) {
        lastG = g;
        introEl.style.setProperty('--glow', g.toString());
      }
    }

    function unstable() {
      clearInterval(jit);
      jit = setInterval(() => {
        S.n = 0.35 + Math.random() * 0.65;
        S.g = Math.random() < 0.5 ? 1 : 0;
        S.b = 1 + Math.random() * 3.5;
        S.l = 0.55 + Math.random() * 0.7;
      }, 95);
    }

    const bump = () => {
      tvEl.classList.remove('bump');
      void tvEl.offsetWidth;
      tvEl.classList.add('bump');
    };

    function ctl(finished: boolean) {
      if (sk) sk.hidden = finished;
      if (rp) rp.hidden = !finished;
    }

    function final() {
      mEl.classList.remove('thumb');
      ctl(true);
      done = 1;
      cancelAnimationFrame(raf);
      clearInterval(jit);
      introEl.classList.add('fixed');
      scrEl.classList.remove('blank');
      tvadEl.style.filter = 'none';
      cls(['idle', 'walk', 'lean', 'nudge'], 'idle');
      mEl.style.left = '56cqw';
      FR(0);
      k1El.style.transform = 'rotate(200deg)';
      k2El.style.transform = 'rotate(95deg)';
      camEl.classList.remove('push');
      $('#c1')?.classList.add('off');
      $('#c2')?.classList.add('on');
    }

    function reset() {
      run++;
      skip = 0;
      done = 0;
      amb = 1;
      ambT = 0;
      last = 0;
      lastG = -1;
      lastF = '';
      cancelAnimationFrame(raf);
      clearInterval(jit);
      Object.assign(S, { n: 1, g: 0, b: 2, l: 1 });

      introEl.classList.add('rs');
      introEl.classList.remove('fixed');
      scrEl.classList.remove('blank');
      tvEl.classList.remove('bump');
      camEl.classList.remove('push');
      mEl.className = 'idle';
      mEl.style.left = '';
      k1El.style.transform = '';
      k2El.style.transform = 'rotate(-35deg)';
      tvadEl.style.filter = '';
      introEl.style.setProperty('--glow', '.5');
      const c1 = $('#c1');
      const c2 = $('#c2');
      if (c1) c1.className = '';
      if (c2) c2.className = '';
      cvEl.style.opacity = '';
      FR(0);
      void introEl.offsetWidth;
      introEl.classList.remove('rs');
    }

    async function play(id: number) {
      const w = async (ms: number) => {
        await sleep(ms);
        if (isUnmounted || skip || id !== run) throw 0;
      };

      try {
        raf = requestAnimationFrame(draw);
        await w(700);
        $('#c1')?.classList.add('on');
        await w(1000);
        await turn(0, 4, 300);
        await w(350);
        await turn(4, 15, 1200); // notices, turns toward TV
        await w(150);
        cls(['idle'], 'walk');
        mEl.style.left = '52cqw';
        await w(1950);
        cls(['walk'], 'lean'); // approaches
        await turn(15, 16, 300);
        camEl.classList.add('push');
        await w(700); // studies screen
        cls(['lean'], 'nudge');
        await w(450);
        k1El.style.transform = 'rotate(95deg)';
        bump();
        amb = 0;
        unstable();
        await w(1200); // first adjustment
        clearInterval(jit);
        S.n = 0.12;
        S.g = 0;
        S.b = 0.8;
        S.l = 1;
        await w(330);
        unstable();
        await w(550); // nearly resolves
        cls(['nudge'], 'lean');
        await w(350);
        cls(['lean'], 'nudge');
        k2El.style.transform = 'rotate(125deg)';
        k1El.style.transform = 'rotate(190deg)';
        bump();
        await w(800); // final adjustment
        clearInterval(jit);
        S.g = 1;
        S.n = 1;
        S.l = 1.3;
        S.b = 4;
        await w(300);
        scrEl.classList.add('blank');
        introEl.style.setProperty('--glow', '0.05');
        await w(700); // pause
        done = 1;
        cancelAnimationFrame(raf);
        scrEl.classList.remove('blank');
        introEl.classList.add('fixed');
        tvadEl.style.filter = '';
        $('#c1')?.classList.add('off'); // lock
        await w(700);
        cls(['nudge'], '');
        camEl.classList.remove('push');
        mEl.style.left = '56cqw';
        await turn(16, 0, 1300);
        cls([], 'idle'); // steps back, faces us
        await w(250);
        mEl.classList.add('thumb');
        await w(1250);
        mEl.classList.remove('thumb');
        await w(350); // thumbs up
        mEl.classList.add('nod');
        await w(400);
        $('#c2')?.classList.add('on');
        ctl(true);
      } catch {
        if (id === run && !isUnmounted) final();
      }
    }

    if (sk) sk.onclick = () => { skip = 1; final(); };
    if (rp) rp.onclick = () => { reset(); ctl(false); play(run); };

    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) {
      skip = 1;
      final();
    } else {
      play(run);
    }

    return () => {
      isUnmounted = true;
      cancelAnimationFrame(raf);
      clearInterval(jit);
    };
  }, []);

  return (
    <div ref={rootRef} className="brandguard-landing">
      <header id="intro" aria-label="BrandGuard introduction">
        <button id="skip" type="button">Skip intro</button>
        <button id="replay" type="button" hidden>
          <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 .8v8.4L9 5z"/></svg>Replay intro
        </button>
        <div id="grain"></div>
        <div id="cam">
          <div id="stage" role="img" aria-label="A small orange robot notices a broken television, walks over, turns its knobs, and the static becomes a clear advertisement.">
            <div className="wall"></div>
            <div className="base"></div>
            <div className="floor"></div>
            <div id="lamp"></div>
            <div id="shd"></div>
            <div id="stand" className="stand">
              <div className="top"></div>
              <div className="bd"><i style={{ left: '6cqw' }}></i><i style={{ right: '6cqw' }}></i></div>
              <div className="lg" style={{ left: '2cqw', transform: 'skewX(8deg)' }}></div>
              <div className="lg" style={{ right: '2cqw', transform: 'skewX(-8deg)' }}></div>
            </div>
            <div id="tv">
              <div id="tvsh"></div>
              <div id="ant"><i></i><i></i><b></b></div>
              <div id="cs">
                <div id="bz">
                  <div id="scr">
                    <div className="tvad" id="tvad">
                      <svg viewBox="0 0 100 100" aria-hidden="true">
                        <circle cx="56" cy="46" r="40" fill="#a3e635"/>
                        <path d="M30 70C30 38 52 20 82 20 82 52 62 72 30 70z" fill="#14532d"/>
                        <path d="M34 66C48 52 62 40 78 26" stroke="#a3e635" strokeWidth="2" fill="none"/>
                      </svg>
                      <s>fernwood</s>
                      <b>Steep into<br/>spring.</b>
                      <u>Shop the blends</u>
                    </div>
                    <canvas id="st" width="160" height="120"></canvas>
                    <div className="gl"></div>
                  </div>
                </div>
                <div id="pn">
                  <div className="bg"></div>
                  <div className="gr"></div>
                  <div className="kw" style={{ top: '12.7cqw' }}>
                    <svg viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="49" fill="none" stroke="#6a5a45" strokeWidth="2" strokeDasharray="1.5 6.6" opacity=".8"/>
                    </svg>
                    <svg className="r" id="k1" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="#0b0704"/>
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#7a6a56" strokeWidth="5" strokeDasharray="2.4 3"/>
                      <circle cx="50" cy="50" r="33" fill="url(#kg)"/>
                      <rect x="47.5" y="21" width="5" height="22" rx="2.5" fill="#f1e2c4"/>
                    </svg>
                  </div>
                  <div className="kw" style={{ top: '20.3cqw' }}>
                    <svg viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="49" fill="none" stroke="#6a5a45" strokeWidth="2" strokeDasharray="1.5 6.6" opacity=".8"/>
                    </svg>
                    <svg className="r" id="k2" viewBox="0 0 100 100" style={{ transform: 'rotate(-35deg)' }}>
                      <circle cx="50" cy="50" r="40" fill="#0b0704"/>
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#7a6a56" strokeWidth="5" strokeDasharray="2.4 3"/>
                      <circle cx="50" cy="50" r="33" fill="url(#kg)"/>
                      <rect x="47.5" y="21" width="5" height="22" rx="2.5" fill="#f1e2c4"/>
                    </svg>
                  </div>
                  <i className="led"></i>
                </div>
              </div>
            </div>
            <svg width="0" height="0" style={{ position: 'absolute' }}>
              <defs>
                <radialGradient id="kg" cx=".32" cy=".28" r=".85">
                  <stop offset="0" stopColor="#cbbba2"/>
                  <stop offset=".5" stopColor="#5a4a3a"/>
                  <stop offset="1" stopColor="#1a130d"/>
                </radialGradient>
              </defs>
            </svg>
            <div id="spill"></div>
            <div id="m" className="idle">
              <div id="msh"></div>
              <div id="mi">
                <div id="spr" role="presentation"></div>
                <svg id="thumb" viewBox="0 0 335 477" aria-hidden="true">
                  <defs>
                    <linearGradient id="tg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#9a9da1"/>
                      <stop offset=".45" stopColor="#5f6164"/>
                      <stop offset="1" stopColor="#2b2c2e"/>
                    </linearGradient>
                    <linearGradient id="tc" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#4a4541"/>
                      <stop offset="1" stopColor="#1d1a18"/>
                    </linearGradient>
                  </defs>
                  <rect x="60" y="266" width="17" height="48" rx="6" fill="url(#tc)"/>
                  <rect x="15" y="250" width="56" height="62" rx="21" fill="url(#tg)"/>
                  <rect x="29" y="218" width="22" height="48" rx="11" fill="url(#tg)"/>
                  <path d="M30 241Q40 245 50 241" fill="none" stroke="#1c1c1e" strokeWidth="1.6" opacity=".6"/>
                  <g fill="none" stroke="#1c1c1e" strokeWidth="1.7" strokeLinecap="round" opacity=".65">
                    <path d="M20 273Q40 279 62 273"/>
                    <path d="M19 287Q40 293 62 287"/>
                    <path d="M20 300Q40 306 62 300"/>
                  </g>
                  <ellipse cx="33" cy="262" rx="9" ry="6" fill="#fff" opacity=".16"/>
                  <ellipse cx="38" cy="228" rx="4" ry="6" fill="#fff" opacity=".2"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div id="cap">
          <div id="c1" aria-live="polite">Something’s not right.</div>
          <div id="c2">
            <div className="wm">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2l9 3v7c0 5-4 8-9 10-5-2-9-5-9-10V5z" fill="#e98a2e"/>
                <circle cx="9" cy="11" r="2" fill="#7ff"/>
                <circle cx="15" cy="11" r="2" fill="#7ff"/>
              </svg>
              BrandGuard
            </div>
            <h1>Catch brand mistakes before they go live.</h1>
            <a 
              href="/app/dashboard?tour=true" 
              className="btn p" 
              onClick={(e) => {
                e.preventDefault();
                try {
                  sessionStorage.setItem('brandguard_start_tour', 'true');
                } catch {}
                window.location.href = '/app/dashboard?tour=true';
              }}
              style={{ cursor: 'pointer', zIndex: 30, position: 'relative' }}
            >
              BrandGuard Review
            </a>
            <a className="btn" href="#product" style={{ cursor: 'pointer', zIndex: 30, position: 'relative' }}>See demo below</a>
          </div>
        </div>
        <div className="fade"></div>
      </header>

      <nav>
        <a className="wm" href="#intro">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2l9 3v7c0 5-4 8-9 10-5-2-9-5-9-10V5z" fill="#e98a2e"/>
            <circle cx="9" cy="11" r="2" fill="#22d3ee"/>
            <circle cx="15" cy="11" r="2" fill="#22d3ee"/>
          </svg>
          BrandGuard
        </a>
        <a className="h" href="#product">Product</a>
        <a className="h" href="#how">How it works</a>
        <a 
          href="/app/dashboard?tour=true"
          className="btn p" 
          onClick={(e) => {
            e.preventDefault();
            try {
              sessionStorage.setItem('brandguard_start_tour', 'true');
            } catch {}
            window.location.href = '/app/dashboard?tour=true';
          }}
          style={{ fontSize: '15px', cursor: 'pointer' }}
        >
          BrandGuard Review
        </a>
      </nav>

      <main>
        <section id="product">
          <div className="w hero">
            <div>
              <h2>Great brands deserve better than mistakes.</h2>
              <p className="mut">Catch off-brand logos, colors, typography, and creative inconsistencies before your next campaign goes live.</p>
              <p>
                <a className="btn p" href="#try">Audit a creative</a>{' '}
                <a className="btn" href="#how">See how it works</a>
              </p>
            </div>
            <div className="tool" id="hero-tool">
              <div>
                <div className="cv" id="heroad"></div>
              </div>
              <div id="heroiss"></div>
            </div>
          </div>
        </section>

        <section style={{ background: 'color-mix(in srgb,var(--line) 35%,transparent)' }}>
          <div className="w cmpgrid">
            <div id="cmp" aria-label="Before and after comparison"></div>
            <div>
              <h2>Drag to see the corrected creative.</h2>
              <p className="mut">Same layout, four fixes: the approved logo, the brand green, the brand typeface, and the button aligned to the grid. Use the handle, or focus it and press the arrow keys. Each fix is optional: switch one off to keep your original element.</p>
              <div id="fixes" role="group" aria-label="Choose which suggested fixes to apply"></div>
              <p className="fxs mut" id="fxs" aria-live="polite"></p>
              <div className="note">Illustrative comparison. The corrected version was drawn by hand for this demo, not generated by an AI model.</div>
              <p className="sum"><b style={{ color: 'var(--ink)' }}>Audit summary:</b> 4 issues found · 2 high · 2 medium · 4 fixes suggested</p>
            </div>
          </div>
        </section>

        <section id="how">
          <div className="w" style={{ display: 'grid', gap: '3rem', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
            <div>
              <h2>From upload to audit in three steps.</h2>
            </div>
            <ol className="steps" style={{ padding: 0 }}>
              <li data-n="1">
                <h3>Upload your creative</h3>
                <p>Drop in a PNG, JPG, WebP, GIF, or SVG.</p>
              </li>
              <li data-n="2">
                <h3>Detect brand inconsistencies</h3>
                <p>Logo, color, type, and alignment are checked against your guidelines.</p>
              </li>
              <li data-n="3">
                <h3>Review fixes and export the audit</h3>
                <p>Apply each correction and share a clear report.</p>
              </li>
            </ol>
          </div>
        </section>

        <section style={{ paddingTop: 0 }}>
          <div className="w feat">
            <div className="f f1">
              <h3>Logo and color validation</h3>
              <p>Every logo variant and hex value is compared with the approved set.</p>
              <div className="sw">
                <i style={{ background: '#14532d' }}></i>
                <i style={{ background: '#a3e635' }}></i>
                <i style={{ background: '#f4efe3' }}></i>
                <span className="mut">Approved</span>
                <i style={{ background: '#ff6a3d' }}></i>
                <span style={{ color: '#e5484d', fontSize: '14px' }}>#FF6A3D not in palette</span>
              </div>
            </div>
            <div className="f f2">
              <h3>Typography consistency</h3>
              <div className="ty" style={{ fontWeight: 800, letterSpacing: '-.03em' }}>
                Aa <span style={{ font: 'italic 400 38px Georgia' }}>Aa</span>
              </div>
              <p>Flags a serif where your brand uses Bricolage.</p>
            </div>
            <div className="f f3">
              <h3>Visual issue detection</h3>
              <p>Misaligned elements and off-grid spacing, pinned to the exact spot.</p>
              <div className="rp">
                <b>Pin 4</b> · 15% from left, 95% from top<br/>
                Button sits 7% right of the text margin
              </div>
            </div>
            <div className="f f4">
              <h3>Suggested corrections and audit reports</h3>
              <p>Each issue comes with a fix you can apply, then export.</p>
              <div className="rp">
                <b>Audit report · Spring campaign</b><br/>
                1 Logo variant → use primary wordmark<br/>
                2 Accent color → #14532D<br/>
                3 Headline → Bricolage Grotesque 800<br/>
                4 CTA → align to 8% margin
              </div>
            </div>
          </div>
        </section>

        <section id="try">
          <div className="w">
            <h2>Try it on your own creative.</h2>
            <div className="tool">
              <div>
                <div id="drop">
                  <p><b>Drop an image here</b> or</p>
                  <label className="btn p" tabIndex={0} htmlFor="file">Choose a file</label>
                  <input id="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden/>
                  <div id="err" role="alert"></div>
                </div>
                <div id="upv" hidden>
                  <div className="cv" id="upc">
                    <img id="upi" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" alt="Your uploaded creative" style={{ width: '100%', display: 'block', borderRadius: '6px' }}/>
                  </div>
                  <p>
                    <button className="btn" id="rep" type="button">Replace image</button>{' '}
                    <button className="btn p" id="run" type="button">Run audit</button>
                  </p>
                </div>
              </div>
              <div id="upres">
                <p className="mut">Results appear here after you run an audit.</p>
              </div>
            </div>
          </div>
        </section>

        <section style={{ paddingTop: 0, paddingBottom: 'clamp(40px,6vw,72px)' }}>
          <div className="w fin">
            <h2>Make every creative feel unmistakably yours.</h2>
            <a className="btn p" href="#try">Start your first audit</a>
          </div>
        </section>
      </main>

      <footer>© BrandGuard</footer>
    </div>
  );
};

export default LandingPage;
