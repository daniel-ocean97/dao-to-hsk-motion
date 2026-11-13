// West Lake, Hangzhou (西湖) at dawn: the Leifeng pagoda on its hill across the water, seen
// through a curtain of willow twigs that the camera leaves behind; the low sun, warm light
// on the water, lotus by the near bank, a covered boat. Slot: day.
// WORK IN PROGRESS (skill `location`, stage 3): the willow curtain, the pagoda and the dawn
// light are painted for real; the lotus and the boat are still sketches.
// Probe: videos/probe-places/?place=xihu
(function () {
  const HZ = 700; // the far shore of the lake
  const PX = 1100; // the pagoda
  const SUN = [1400, HZ - 74];

  function setup(k) {
    const { W, D, out, LX, LY, LW, LAYERS, DURATION, INK, INK2, view, show, mist, range, caption, camera } = k;
    const { rgba, wash, dryStroke, taper, fillPoly, rng } = W;
    let ctx;
    const begin = (...a) => { const layer = k.begin(...a); ctx = layer.c.getContext('2d'); return layer; };

    // ---------- hills ----------

    // Low rolling hills; `extra` adds single hills (the one under the pagoda).
    function hills({ base, hMin, hMax, gap, seed, extra = [] }) {
      const peaks = W.peakRow({ x0: -300, x1: 2200, hMin, hMax, gap, seed }).map((p) => ({ ...p, wl: (p.wl ?? p.w) * 2.3, wr: (p.wr ?? p.w) * 2.3, w: p.w * 2.3 }));
      return W.ridge({ x0: -240, x1: 2160, base, jag: 4, seed, step: 8, peaks: [...peaks, ...extra] });
    }
    function paintHills(ridge, color, deep, under, seed) {
      const L = range({ oy: 100, h: 800, ridge, color, deep, fadeTo: HZ + 14, seed, under });
      ctx.drawImage(L.c, L.ox, L.oy);
    }
    const yAt = (ridge, x) => ridge.reduce((a, b) => (Math.abs(b[0] - x) < Math.abs(a[0] - x) ? b : a))[1];

    // ---------- the pagoda ----------

    // The Leifeng pagoda: eight-sided, five storeys. Three of its faces are seen: the one
    // turned to the low sun (side `lit`: 1 right, -1 left) is warm, the middle one is in
    // half tone, the far one in shade. Every storey is a body with a gallery rail at its
    // foot and a roof with upturned corners above it; a stone base, a pointed cap, a spire.
    // (x, y) is the middle of its foot, h its height with the spire.
    function pagoda(c, x, y, h, lit = 1) {
      const BODY = ['#c58f6a', '#9c6a52', '#6c493b'], ROOF = ['#7b6b60', '#4a4340', '#34302e'];
      const order = lit > 0 ? [2, 1, 0] : [0, 1, 2]; // tone of the left, middle, right face
      const w0 = h * 0.27, th0 = h * 0.72 / 4.5;
      const quad = (pts, col, a = 1) => { c.fillStyle = rgba(col, a); fillPoly(c, pts); };
      // the stone base, two steps
      let by = y;
      for (const [w, hh] of [[w0 * 1.95, h * 0.03], [w0 * 1.6, h * 0.035]]) {
        quad([[x - w / 2, by], [x + w / 2, by], [x + w / 2, by - hh], [x - w / 2, by - hh]], '#c2b8ad');
        quad(lit > 0 ? [[x - w / 2, by], [x - w * 0.1, by], [x - w * 0.1, by - hh], [x - w / 2, by - hh]] : [[x + w * 0.1, by], [x + w / 2, by], [x + w / 2, by - hh], [x + w * 0.1, by - hh]], '#8f857c', 0.7);
        by -= hh;
      }
      for (let i = 0; i < 5; i++) {
        const w = w0 * (1 - i * 0.1), th = th0 * (1 - i * 0.05), bh = th * 0.6, y1 = by - bh;
        const xs = [x - w / 2, x - w * 0.22, x + w * 0.22, x + w / 2];
        // the body: three faces
        for (let f = 0; f < 3; f++) quad([[xs[f], by], [xs[f + 1], by], [xs[f + 1], y1], [xs[f], y1]], BODY[order[f]]);
        // an arched opening in each face, the posts between the faces
        c.fillStyle = rgba('#2e221d', 0.75);
        for (const [cx, ow] of [[x, w * 0.11], [x - w * 0.36, w * 0.05], [x + w * 0.36, w * 0.05]]) {
          c.beginPath(); c.moveTo(cx - ow, by - bh * 0.12); c.lineTo(cx - ow, by - bh * 0.5); c.arc(cx, by - bh * 0.5, ow, Math.PI, 0); c.lineTo(cx + ow, by - bh * 0.12); c.fill();
        }
        c.fillStyle = rgba('#3a2a23', 0.7);
        for (const px of xs) c.fillRect(px - h * 0.003, y1, h * 0.006, bh);
        // the gallery rail
        quad([[x - w * 0.6, by], [x + w * 0.6, by], [x + w * 0.6, by - bh * 0.14], [x - w * 0.6, by - bh * 0.14]], '#5b4135');
        quad([[x - w * 0.6, by - bh * 0.14], [x + w * 0.6, by - bh * 0.14], [x + w * 0.6, by - bh * 0.18], [x - w * 0.6, by - bh * 0.18]], '#d9b79a', 0.7);
        // the roof: the eave sags in the middle and turns up at the corners
        const e = w * 0.92, rt = y1 - th * 0.4, top = i < 4 ? w0 * (1 - (i + 1) * 0.1) * 0.56 : w * 0.3;
        const eave = [];
        for (let j = 0; j <= 16; j++) { const u = j / 16 * 2 - 1; eave.push([x + u * e, y1 + th * 0.05 - th * 0.2 * Math.pow(Math.abs(u), 3.2)]); }
        const roof = [...eave, [x + top, rt], [x - top, rt]];
        quad(roof, ROOF[1]);
        const half = lit > 0 ? eave.slice(11) : eave.slice(0, 6);
        quad(lit > 0 ? [...half, [x + top, rt], [x + top * 0.4, rt]] : [...half, [x - top * 0.4, rt], [x - top, rt]], ROOF[0]);
        quad(lit > 0 ? [...eave.slice(0, 6), [x - top * 0.4, rt], [x - top, rt]] : [...eave.slice(11), [x + top, rt], [x + top * 0.4, rt]], ROOF[2]);
        c.strokeStyle = rgba('#241d1a', 0.8); c.lineWidth = Math.max(1, h * 0.006);
        c.beginPath(); eave.forEach(([a, b], j) => (j ? c.lineTo(a, b) : c.moveTo(a, b))); c.stroke();
        // ridges down to the corners of the middle face
        c.lineWidth = Math.max(0.8, h * 0.004);
        for (const sgn of [-1, 1]) { c.beginPath(); c.moveTo(x + sgn * top * 0.4, rt); c.lineTo(x + sgn * e * 0.36, y1 + th * 0.03); c.stroke(); }
        by = rt;
      }
      // the cap and the spire with its rings
      const capW = w0 * 0.34;
      c.fillStyle = rgba(ROOF[1], 1);
      c.beginPath(); c.moveTo(x - capW, by); c.quadraticCurveTo(x - capW * 0.25, by - h * 0.02, x, by - h * 0.075); c.quadraticCurveTo(x + capW * 0.25, by - h * 0.02, x + capW, by); c.fill();
      const sp = by - h * 0.06;
      c.fillStyle = rgba('#b9935a', 1);
      fillPoly(c, taper([[x, sp], [x, y - h]], (u) => Math.max(1, h * 0.014 * (1 - u * 0.85))));
      for (let j = 0; j < 4; j++) { c.beginPath(); c.ellipse(x, sp - h * 0.012 - j * h * 0.017, h * (0.022 - j * 0.004), h * 0.005, 0, 0, Math.PI * 2); c.fill(); }
    }
    // The pagoda as a sprite: painted flat, then pigment grain and a few ink lines.
    function pagodaSprite(h, lit) {
      const w = Math.ceil(h * 0.8), c = W.canvas(w, h + 20), x = c.getContext('2d');
      pagoda(x, w / 2, h + 10, h, lit);
      W.granulate(x, w, h + 20, 0.3);
      for (const sgn of [-1, 1]) dryStroke(x, [[w / 2 + sgn * h * 0.135, h + 4], [w / 2 + sgn * h * 0.12, h * 0.55], [w / 2 + sgn * h * 0.09, h * 0.3]], 1.6, INK, { alpha: 0.35, hairs: 1, dry: 0.6, seed: 5 + sgn });
      return c;
    }

    // ---------- the willow ----------

    const LEAF = ['#34402f', '#4f5f44', '#6d7b52', '#8e9160', '#b0a66e'];
    // A bunch of willow twigs hanging from one point: thin stems of different lengths,
    // narrow leaves in pairs all the way down, smaller towards the tips. tone shifts the
    // greens: 0 dark and near, 1 paler and farther. Returns the canvas and its hang point.
    function bunch(seed, { len = 560, n = 7, s = 1, tone = 0, spread = 80 } = {}) {
      const w = Math.ceil((spread + 170) * s), h = Math.ceil(len * s + 60), c = W.canvas(w, h), x = c.getContext('2d'), q = rng(seed);
      const ax = w / 2, ay = 8;
      for (let j = 0; j < n; j++) {
        const sx = ax + (q() - 0.5) * spread * s, L = len * s * (0.5 + 0.5 * q()), drift = (q() - 0.5) * 70 * s, wob = 3 + q() * 5, pts = [];
        for (let i = 0; i <= 28; i++) { const u = i / 28; pts.push([ax + (sx - ax) * Math.min(1, u * 6) + drift * u * u + Math.sin(u * 4.5 + j) * wob * s * u, ay + L * u]); }
        x.fillStyle = rgba('#4b4630', 0.85);
        fillPoly(x, taper(pts, (u) => Math.max(0.7, 2.4 * s * (1 - u * 0.75))));
        const step = 7.5 * s;
        for (let d = step * 2, side = 1; d < L; d += step * (0.7 + 0.6 * q()), side = -side) {
          const u = d / L, i = Math.min(27, Math.floor(u * 28)), f = u * 28 - i;
          if (q() < 0.08 + (u < 0.07 ? 0.6 : 0)) continue;
          const px = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, py = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
          const ll = (21 - 8 * u) * s * (0.75 + 0.5 * q()), lw = ll * 0.17, a = side * (0.22 + 0.4 * q());
          const ci = Math.max(0, Math.min(4, Math.floor(q() * 3.2 + tone * 1.6 + (q() < 0.12 ? 1 : 0))));
          x.fillStyle = rgba(LEAF[ci], 0.62 + 0.3 * q());
          x.save(); x.translate(px, py); x.rotate(a);
          x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(lw, ll * 0.4, 0, ll); x.quadraticCurveTo(-lw, ll * 0.4, 0, 0); x.fill();
          x.restore();
        }
      }
      return { c, ax, ay };
    }
    // A limb of the willow along a line of points: dark wood with a warm edge where the
    // low sun catches it from below.
    function limb(c, pts, w0, w1, seed) {
      const wf = (u) => Math.max(1.5, w0 + (w1 - w0) * u);
      c.fillStyle = rgba('#2b2019', 0.95);
      fillPoly(c, taper(pts, wf));
      c.fillStyle = rgba('#b98a62', 0.45);
      fillPoly(c, taper(pts.map(([a, b], i) => [a, b + wf(i / (pts.length - 1)) * 0.3]), (u) => wf(u) * 0.22));
      for (let i = 0; i < 4; i++) dryStroke(c, pts.map(([a, b], j) => [a, b + (i - 1.5) * w0 * 0.17 + Math.sin(j + i) * 1.5]), 1.6, INK, { alpha: 0.45, hairs: 1, dry: 0.7, seed: seed + i });
    }

    // ---------- sketches still: lotus, boat ----------

    function lotus(c, x0, x1, y0, y1, n, s, seed) {
      const q = rng(seed), items = [];
      for (let i = 0; i < n; i++) items.push([x0 + q() * (x1 - x0), y0 + Math.pow(q(), 0.8) * (y1 - y0), q(), q()]);
      items.sort((a, b) => a[1] - b[1]);
      for (const [x, y, a, b] of items) {
        const d = s * (0.6 + 0.6 * (y - y0) / (y1 - y0 || 1)), rx = (46 + 34 * a) * d;
        if (b < 0.16) {
          const top = y - (90 + 60 * a) * d;
          c.strokeStyle = rgba('#56655a', 0.8); c.lineWidth = 3 * d;
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 8 * d, (y + top) / 2, x, top); c.stroke();
          for (const r of [-0.5, 0.5, -0.2, 0.2, 0]) {
            c.fillStyle = rgba(r === 0 ? '#efd3c9' : '#d9a9a3', 0.85);
            c.save(); c.translate(x, top); c.rotate(r);
            c.beginPath(); c.ellipse(0, -18 * d, 9 * d, 22 * d, 0, 0, Math.PI * 2); c.fill(); c.restore();
          }
          continue;
        }
        const lift = b > 0.8 ? (40 + 50 * a) * d : 0;
        if (lift) { c.strokeStyle = rgba('#56655a', 0.8); c.lineWidth = 3 * d; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 4 * d, y - lift); c.stroke(); }
        c.fillStyle = rgba(a < 0.5 ? '#6f7d68' : '#566452', 0.9);
        c.beginPath(); c.ellipse(x, y - lift, rx, rx * (lift ? 0.42 : 0.3), (a - 0.5) * 0.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = rgba('#38443a', 0.45);
        c.beginPath(); c.ellipse(x + rx * 0.1, y - lift + rx * 0.04, rx * 0.5, rx * 0.12, 0, 0, Math.PI * 2); c.fill();
      }
    }
    function boat(c, x, y, s) {
      c.fillStyle = rgba('#3b2f26', 0.9);
      fillPoly(c, [[x - 80 * s, y - 10 * s], [x - 60 * s, y + 6 * s], [x + 60 * s, y + 6 * s], [x + 86 * s, y - 14 * s], [x + 60 * s, y - 4 * s], [x - 60 * s, y - 4 * s]]);
      c.fillStyle = rgba('#9a7f5f', 0.9);
      c.fillRect(x - 46 * s, y - 30 * s, 70 * s, 5 * s);
      c.fillStyle = rgba('#3b2f26', 0.8);
      for (const o of [-44, -12, 20]) c.fillRect(x + o * s, y - 26 * s, 2.5 * s, 22 * s);
      fillPoly(c, taper([[x + 48 * s, y - 6 * s], [x + 50 * s, y - 34 * s]], () => 8 * s));
      c.beginPath(); c.arc(x + 50 * s, y - 40 * s, 5 * s, 0, Math.PI * 2); c.fill();
      c.strokeStyle = rgba('#3b2f26', 0.8); c.lineWidth = 2 * s;
      c.beginPath(); c.moveTo(x + 52 * s, y - 24 * s); c.lineTo(x + 96 * s, y + 14 * s); c.stroke();
    }

    // ---------- the place ----------

    const far = hills({ base: HZ, hMin: 90, hMax: 190, gap: 300, seed: 31 });
    const mid = hills({ base: HZ + 4, hMin: 50, hMax: 110, gap: 260, seed: 33, extra: [{ x: PX, h: 150, w: 420, k: 1.3 }] });

    // the dawn sky: pale above, rose, then a warm band over the hills
    begin('sky', 0);
    {
      const g = ctx.createLinearGradient(0, -110, 0, HZ + 20);
      g.addColorStop(0, '#f1ede8'); g.addColorStop(0.45, '#f3e3e5'); g.addColorStop(0.8, '#f6dcc8'); g.addColorStop(1, '#f7d3b0');
      ctx.fillStyle = g;
      ctx.fillRect(LX, LY, LW, 1300);
      const glow = ctx.createRadialGradient(SUN[0], SUN[1], 20, SUN[0], SUN[1], 620);
      glow.addColorStop(0, rgba('#fbe2b8', 0.75)); glow.addColorStop(0.4, rgba('#f7cf92', 0.25)); glow.addColorStop(1, rgba('#f7cf92', 0));
      ctx.fillStyle = glow;
      ctx.fillRect(LX, LY, LW, 1300);
    }
    const SUNC = W.sun({ x: SUN[0], y: SUN[1], rad: 44, seed: 9 });
    begin('far', 0.15); paintHills(far, '#cfc0c6', '#b5a4b2', '#f4e2d6', 32);
    begin('mid', 0.35);
    paintHills(mid, '#948c98', '#6b6475', '#efdccf', 34);
    {
      // the wooded top of the hill, the pagoda rising out of the trees
      const fy = yAt(mid, PX), q = rng(35);
      ctx.filter = 'blur(0.6px)';
      ctx.drawImage(pagodaSprite(250, 1), PX - 100, fy + 16 - 260);
      ctx.filter = 'none';
      for (let i = 0; i < 60; i++) {
        const x = PX + q.gauss() * 85, y = yAt(mid, x) + 4 + q() * 10, r = 7 + q() * 10;
        for (let j = 0; j < 3; j++) {
          ctx.fillStyle = rgba(['#4f584f', '#646a5c', '#6f6872'][Math.floor(q() * 3)], 0.4 + 0.3 * q());
          ctx.beginPath(); ctx.ellipse(x + (q() - 0.5) * r, y - j * r * 0.45, r * (1 - j * 0.22), r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    // the mirror image of the hills and the pagoda, at their depth
    begin('refl', 0.35);
    ctx.save();
    ctx.translate(0, HZ + 6); ctx.scale(1, -0.9); ctx.translate(0, -HZ);
    ctx.globalAlpha = 0.34; ctx.filter = 'blur(2.5px)';
    ctx.drawImage(LAYERS.mid.c, LX, LY);
    ctx.restore();
    begin('mist', 0.45); mist(HZ - 6, 64, '#f8e8da', 35);
    // the water takes the colours of the sky: warm by the far shore, grey lilac near us
    begin('water', 0.5);
    wash(ctx, [[-240, HZ, 0.01], [2160, HZ, 0.01], [2160, 1190, 0.05], [-240, 1190, 0.05]], '#b3b1c2', { layers: 14, alpha: 0.07, seed: 7 });
    wash(ctx, k.densify([[-240, HZ], [2160, HZ], [2160, HZ + 250], [-240, HZ + 230]], 30).map(([x, y]) => [x, y, y > HZ + 10 ? 0.5 : 0.02]), '#f3c9a8', { layers: 10, alpha: 0.07, seed: 8 });
    {
      const q = rng(9);
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 60; i++) {
        const y = HZ + 8 + Math.pow(q(), 1.5) * 420, x = -240 + q() * 2400, len = 50 + q() * 240;
        dryStroke(ctx, [[x, y], [x + len / 2, y + 1], [x + len, y]], 2 + q() * 3, '#000000', { alpha: 0.5, hairs: 2, dry: 0.5, seed: 100 + i });
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    begin('lotus', 1); lotus(ctx, -240, 2160, 930, 1160, 80, 1.2, 36);
    const BOAT = W.canvas(240, 120); boat(BOAT.getContext('2d'), 120, 70, 1);
    const FLOCK = D.flock({ n: 5, seed: 31, spread: [70, 24], size: 8 });

    // sparks of the sun on the water: short streaks in a path that widens towards us
    const SPARKS = [];
    { const q = rng(41); for (let i = 0; i < 46; i++) { const v = Math.pow(q(), 1.4); SPARKS.push({ v, dx: (q() - 0.5) * (40 + 230 * v), len: 14 + 70 * v * q() + 10 * q(), ph: q() * 6.28, sp: 2 + q() * 3, warm: q() < 0.7 }); } }

    // the willow: a limb across the top of the frame, bunches of twigs off it (near), and a
    // paler row of bunches behind them (far)
    const LIMB = W.canvas(1700, 420);
    const limbPts = [], limbAt = (u) => [-470 + 1500 * u, 150 - 110 * Math.sin(u * 2.1) + 60 * u * u];
    for (let i = 0; i <= 30; i++) limbPts.push(limbAt(i / 30));
    {
      const lc = LIMB.getContext('2d');
      lc.translate(520, 120);
      limb(lc, limbPts, 34, 5, 50);
      limb(lc, [limbAt(0.3), [70, 10], [260, -40], [470, -70]], 16, 4, 55);
      limb(lc, [limbAt(0.62), [560, 100], [700, 150], [830, 170]], 11, 3, 58);
    }
    const NEAR = [], FARB = [];
    {
      const q = rng(60);
      for (let i = 0; i < 17; i++) {
        const u = 0.04 + 0.94 * (i + q() * 0.6) / 17, [x, y] = limbAt(u), edge = Math.min(1, (1 - u) * 3 + 0.35);
        NEAR.push({ ...bunch(61 + i, { len: (380 + 300 * q()) * edge, n: 6 + Math.floor(q() * 4), s: 1.15, tone: q() * 0.4 }), x: x + (q() - 0.5) * 30, y: y + 6, ph: x / 260, amp: 0.022 + 0.014 * q() });
      }
      for (let i = 0; i < 15; i++) {
        const x = -420 + 1340 * (i + q() * 0.7) / 15, edge = Math.min(1, (920 - x) / 400 + 0.3);
        FARB.push({ ...bunch(81 + i, { len: (330 + 280 * q()) * edge, n: 5 + Math.floor(q() * 4), s: 0.8, tone: 0.8 + q() * 0.4, spread: 110 }), x, y: -40 - q() * 60, ph: x / 260 + 1, amp: 0.016 + 0.012 * q() });
      }
    }
    function bunches(list, cam, p, t, alpha) {
      const z = view(cam, p), base = out.getTransform();
      out.globalAlpha = alpha;
      for (const B of list) {
        out.setTransform(base);
        out.translate(B.x, B.y);
        // the breeze runs along the limb: each bunch leans in its turn
        out.transform(1, 0, Math.sin(t * 1.5 - B.ph) * B.amp + Math.sin(t * 2.7 - B.ph * 1.6) * B.amp * 0.4, 1, 0, 0);
        out.drawImage(B.c, -B.ax, -B.ay);
      }
      out.globalAlpha = 1;
      return z;
    }

    // The camera travels to the right along the bank: the willow curtain slides away to the
    // left and opens the pagoda; the twigs lean in the breeze, the sun sparkles on the
    // water, mist drifts under the hills, the boat rows on.
    function frame(t) {
      const cam = camera(t);
      show('sky', cam);
      view(cam, 0.1);
      out.drawImage(SUNC.canvas, SUNC.ox, SUNC.oy - t * 5);
      show('far', cam);
      view(cam, 0.2); D.birds(out, FLOCK, 760 + 40 * t, 380 - 6 * t, t, { color: INK2, alpha: 0.4 });
      caption(cam, t);
      show('mid', cam);
      show('water', cam);
      // the reflection wavers in thin level slices
      {
        const R = LAYERS.refl, z = 1 + (cam.zoom - 1) * R.p, top = HZ - LY;
        for (let y = top; y < top + 330; y += 3) {
          const dx = Math.sin(y * 0.13 + t * 2.4) * (0.6 + (y - top) * 0.014);
          out.setTransform(z, 0, 0, z, 960 + z * (LX + dx - 960 - cam.x * R.p), 540 + z * (LY + y - 540 - cam.y * R.p));
          out.drawImage(R.c, 0, y, LW, 3, 0, 0, LW, 3);
        }
      }
      // sparks under the sun (the sun is at depth 0.1, the water at 0.5: keep them in line)
      {
        const z5 = view(cam, 0.5), z1 = 1 + (cam.zoom - 1) * 0.1, sx = 960 + cam.x * 0.5 + (z1 / z5) * (SUN[0] - 960 - cam.x * 0.1);
        for (const s of SPARKS) {
          const a = 0.3 + 0.5 * Math.max(0, Math.sin(t * s.sp + s.ph));
          out.fillStyle = rgba(s.warm ? '#fbe2b8' : '#f8efe2', a * (0.55 + 0.45 * (1 - s.v)));
          out.beginPath(); out.ellipse(sx + s.dx, HZ + 10 + s.v * 330, s.len / 2, 1.3 + 2.2 * s.v, 0, 0, Math.PI * 2); out.fill();
        }
      }
      show('mist', cam, 1, (t * 12) % 200);
      view(cam, 0.8);
      out.drawImage(BOAT, 1500 - t * 30 - 120, 790 - 70 + Math.sin(t * 2) * 1.2);
      show('lotus', cam);
      bunches(FARB, cam, 1.3, t, 0.9);
      view(cam, 1.6);
      out.drawImage(LIMB, -520, -120);
      bunches(NEAR, cam, 1.6, t, 1);
    }
    return { frame, ridge: { pts: mid, p: 0.35 } };
  }

  DH.location.define('xihu', {
    name: 'Западное озеро',
    time: 'day',
    horizon: HZ, // the far shore of the lake
    hasWater: true,
    caption: { hanzi: '西湖', pinyin: 'Xīhú', x: 1560, y: 280, p: 0.3, t0: 0.5, tOut: 2.05, wind: [560, -60] },
    camera: DH.location.glide({ x: -170, y: 10, zoom: 1.03 }, { x: 130, y: 0, zoom: 1.08 }),
    setup,
  });
})();
