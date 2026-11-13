(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  /* ---------- scroll reveals ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ---------- value noise (shared) ---------- */
  const P = new Uint8Array(512);
  { const p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
  const fade = t => t * t * (3 - 2 * t);
  const h = (x, y) => P[(P[x & 255] + y) & 511] / 255;
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    const u = fade(xf), v = fade(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fbm = (x, y) => { let s = 0, a = .5, f = 1; for (let o = 0; o < 5; o++) { s += a * vnoise(x * f, y * f); f *= 2; a *= .5; } return s / .97; };

  /* ---------- embers + ash + smoke ---------- */
  const ec = document.getElementById('embers'), ex = ec.getContext('2d');
  let W = 0, H = 0, parts = [], smoke = [];
  function sizeE() {
    W = innerWidth; H = innerHeight;
    ec.width = W * DPR; ec.height = H * DPR; ex.setTransform(DPR, 0, 0, DPR, 0, 0);
    const n = Math.round(Math.min(140, W * H / 9000));
    parts = Array.from({ length: n }, () => spawn(true));
    smoke = Array.from({ length: 7 }, (_, i) => ({ x: Math.random() * W, y: H * (0.3 + Math.random() * 0.8), r: 160 + Math.random() * 260, vx: (Math.random() - .5) * .12, vy: -.05 - Math.random() * .08, a: .035 + Math.random() * .03 }));
  }
  function spawn(any) {
    const ash = Math.random() < .35;
    return { x: Math.random() * W, y: any ? Math.random() * H : H + 10, vy: -(ash ? .15 + Math.random() * .35 : .25 + Math.random() * .9),
      vx: 0, r: ash ? .8 + Math.random() * 1.8 : .6 + Math.random() * 2, life: 0, ash, ph: Math.random() * 1e3, hue: 14 + Math.random() * 22 };
  }
  let scrollV = 0, lastY = scrollY;
  addEventListener('scroll', () => { scrollV += (scrollY - lastY) * .02; lastY = scrollY; }, { passive: true });
  let t0 = performance.now();
  function frameE(now) {
    const t = (now - t0) / 1000;
    ex.clearRect(0, 0, W, H);
    // smoke
    ex.globalCompositeOperation = 'lighter';
    for (const s of smoke) {
      s.x += s.vx + Math.sin(t * .1 + s.r) * .1; s.y += s.vy;
      if (s.y < -s.r) { s.y = H + s.r; s.x = Math.random() * W; }
      const g = ex.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
      g.addColorStop(0, `rgba(120,60,35,${s.a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ex.fillStyle = g; ex.beginPath(); ex.arc(s.x, s.y, s.r, 0, 6.283); ex.fill();
    }
    scrollV *= .92;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.life += .016;
      const n = vnoise(p.x * .004 + p.ph, t * .25) - .5;
      p.vx = p.vx * .96 + n * .12;
      p.x += p.vx + Math.sin(t + p.ph) * .15; p.y += p.vy - scrollV * (p.ash ? .4 : .8);
      if (p.y < -20 || p.x < -20 || p.x > W + 20 || p.y > H + 40) { parts[i] = spawn(false); continue; }
      const fl = .6 + .4 * Math.sin(t * 6 + p.ph * 3);
      if (p.ash) {
        ex.globalCompositeOperation = 'source-over';
        ex.fillStyle = `rgba(150,138,126,${.25 + .2 * fl})`;
        ex.save(); ex.translate(p.x, p.y); ex.rotate(t * .5 + p.ph); ex.fillRect(-p.r, -p.r * .45, p.r * 2, p.r * .9); ex.restore();
      } else {
        ex.globalCompositeOperation = 'lighter';
        const fadeTop = Math.min(1, p.y / (H * .35));
        const a = fl * fadeTop;
        ex.fillStyle = `hsla(${p.hue},100%,${55 + fl * 15}%,${a})`;
        ex.beginPath(); ex.arc(p.x, p.y, p.r, 0, 6.283); ex.fill();
        ex.fillStyle = `hsla(${p.hue},100%,50%,${a * .12})`;
        ex.beginPath(); ex.arc(p.x, p.y, p.r * 5, 0, 6.283); ex.fill();
      }
    }
    ex.globalCompositeOperation = 'source-over';
    if (!reduce) requestAnimationFrame(frameE);
  }
  sizeE(); addEventListener('resize', sizeE); requestAnimationFrame(frameE);

  /* ---------- low drone waveform ---------- */
  const wc = document.getElementById('wave'), wx = wc.getContext('2d');
  let ww = 0, wh = 0, waveOn = false;
  function sizeW() { const r = wc.getBoundingClientRect(); ww = r.width; wh = r.height; wc.width = ww * DPR; wc.height = wh * DPR; wx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  new IntersectionObserver(es => { waveOn = es[0].isIntersecting; if (waveOn) requestAnimationFrame(frameW); }).observe(wc);
  function frameW(now) {
    if (!ww) sizeW();
    const t = now / 1000;
    wx.clearRect(0, 0, ww, wh);
    const mid = wh / 2;
    for (let L = 0; L < 4; L++) {
      wx.beginPath();
      for (let x = 0; x <= ww; x += 3) {
        const u = x / ww;
        const env = Math.sin(u * Math.PI);
        const slow = Math.sin(u * 7 + t * .7 + L) * .55 + Math.sin(u * 17 - t * .45) * .25;
        const fuzz = (vnoise(x * .09 + L * 40, t * 3) - .5) * (L === 0 ? 1.1 : .5);
        const y = mid + (slow + fuzz) * env * wh * .36 * (1 - L * .18);
        x ? wx.lineTo(x, y) : wx.moveTo(x, y);
      }
      wx.strokeStyle = L === 0 ? 'rgba(255,106,31,.9)' : L === 1 ? 'rgba(201,162,74,.45)' : 'rgba(184,37,15,.35)';
      wx.lineWidth = L === 0 ? 2 : 1;
      wx.shadowColor = '#ff6a1f'; wx.shadowBlur = L === 0 ? 14 : 0;
      wx.stroke();
    }
    wx.shadowBlur = 0;
    if (waveOn && !reduce) requestAnimationFrame(frameW);
  }
  addEventListener('resize', () => { ww = 0; });

  /* ---------- burning spirit paper ---------- */
  const pc = document.getElementById('paper'), px = pc.getContext('2d');
  const RW = 180, RH = 240;              // internal burn resolution
  const off = document.createElement('canvas'); off.width = RW; off.height = RH;
  const ox = off.getContext('2d');
  const sheet = document.createElement('canvas'); sheet.width = RW; sheet.height = RH;
  const sx = sheet.getContext('2d');
  // paint the sheet: coarse paper, gold-leaf square, faint seal
  (function paintSheet() {
    const m = 14, img = sx.createImageData(RW, RH);
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
      const i = (y * RW + x) * 4, fib = fbm(x * .08, y * .5) * .5 + Math.random() * .25;
      let r = 196 + fib * 40, g = 168 + fib * 34, b = 118 + fib * 26;
      const inGold = x > RW * .22 && x < RW * .78 && y > RH * .28 && y < RH * .72;
      if (inGold) {
        const sh = fbm(x * .05 + 9, y * .05) ;
        r = 200 + sh * 55; g = 150 + sh * 50; b = 40 + sh * 30;
      }
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
    sx.putImageData(img, 0, 0);
    sx.strokeStyle = 'rgba(120,70,20,.55)'; sx.lineWidth = 1;
    sx.strokeRect(RW * .22, RH * .28, RW * .56, RH * .44);
    sx.strokeStyle = 'rgba(150,30,15,.6)'; sx.lineWidth = 1.4;
    sx.beginPath(); sx.arc(RW / 2, RH / 2, RW * .13, 0, 6.283); sx.stroke();
    sx.beginPath(); sx.moveTo(RW/2 - RW*.1, RH/2 - RW*.06); sx.lineTo(RW/2 + RW*.1, RH/2 - RW*.06); sx.lineTo(RW/2, RH/2 + RW*.11); sx.closePath(); sx.stroke();
    sx.fillStyle = 'rgba(150,30,15,.55)'; sx.fillRect(RW/2 - 4, RH/2 - 6, 8, 8);
  })();
  const sheetData = sx.getImageData(0, 0, RW, RH).data;
  // burn field: distance from a bottom-corner ignition + noise
  const field = new Float32Array(RW * RH);
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
    const dx = (x - RW * .15) / RW, dy = (y - RH * 1.02) / RH;
    field[y * RW + x] = Math.hypot(dx * .9, dy) * .78 + fbm(x * .045, y * .045) * .42;
  }
  const outImg = ox.createImageData(RW, RH), od = outImg.data;
  let prog = 0, target = 0, pOn = false;
  function updTarget() {
    const r = pc.getBoundingClientRect();
    const section = document.getElementById('ash').getBoundingClientRect();
    const span = section.height - innerHeight * .4;
    const p = (innerHeight * .55 - section.top) / Math.max(span, 1);
    target = Math.max(0, Math.min(1.05, p * 1.25));
    if (reduce) target = .45;
  }
  addEventListener('scroll', updTarget, { passive: true });
  new IntersectionObserver(es => { pOn = es[0].isIntersecting; if (pOn) requestAnimationFrame(frameP); }).observe(pc);
  function sizeP() { const r = pc.getBoundingClientRect(); pc.width = r.width * DPR; pc.height = r.height * DPR; }
  sizeP(); addEventListener('resize', sizeP);
  function frameP(now) {
    updTarget();
    prog += (target - prog) * .05;
    const t = now / 1000, thr = -.05 + prog * 1.05, band = .045;
    for (let i = 0; i < RW * RH; i++) {
      const f = field[i] + Math.sin(t * 3 + i * .37) * .004, j = i * 4;
      const d = f - thr;
      if (d < 0) { od[j + 3] = 0; continue; }
      let r = sheetData[j], g = sheetData[j + 1], b = sheetData[j + 2], a = 255;
      if (d < band) {
        const k = d / band;                  // 0 at flame front, 1 at char edge
        const fl = .75 + .25 * Math.sin(t * 9 + i);
        if (k < .35) { r = 255; g = 120 + 120 * (1 - k / .35) * fl; b = 40 * fl; a = 255 * (.4 + k * 1.7); }
        else { const c = (k - .35) / .65; r = 40 + c * (r - 40) * .6; g = 14 + c * (g - 14) * .5; b = 8 + c * (b - 8) * .4; }
      } else if (d < band * 2.2) {           // scorch
        const c = (d - band) / (band * 1.2);
        r *= .55 + .45 * c; g *= .45 + .55 * c; b *= .35 + .65 * c;
      }
      od[j] = r; od[j + 1] = g; od[j + 2] = b; od[j + 3] = a;
    }
    ox.putImageData(outImg, 0, 0);
    px.clearRect(0, 0, pc.width, pc.height);
    // slight wobble / lift as it burns
    const pad = pc.width * .08, w = pc.width - pad * 2, hh = w * RH / RW;
    const y0 = (pc.height - hh) / 2 - prog * 8 * DPR;
    px.save();
    px.translate(pc.width / 2, y0 + hh / 2); px.rotate(-.04 + Math.sin(t * .6) * .006); px.translate(-pc.width / 2, -(y0 + hh / 2));
    px.shadowColor = 'rgba(255,106,31,' + (.25 + prog * .4) + ')'; px.shadowBlur = 40 * DPR;
    px.imageSmoothingEnabled = true;
    px.drawImage(off, pad, y0, w, hh);
    px.restore();
    if (pOn && !reduce) requestAnimationFrame(frameP);
  }
})();
