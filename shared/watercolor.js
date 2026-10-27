// Watercolour painting in Canvas 2D for landscapes. A wash is many translucent glazes of
// one shape whose edge is deformed differently each time (after Tyler Hobbs' polygon
// deformation), so the edge comes out soft and ragged and the colour uneven. On top:
// pigment pooling along the edge, granulation, a wet fade into mist, dry-brush ink.
// Everything is seeded: a layer paints the same every time. Layers are painted once
// and then moved by the camera; only mist, water and light change per frame.
(function (g) {
  const DH = g.DH;
  const { clamp } = DH;

  // ---------- Randomness ----------

  function rng(seed) {
    let a = (seed * 2654435761) >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.gauss = () => {
      const u = Math.max(1e-9, next()), v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    next.range = (a0, a1) => a0 + (a1 - a0) * next();
    return next;
  }

  // Smooth 1D noise in about [-1, 1], from seeded lattice values.
  function noise1(seed) {
    const r = rng(seed), vals = Array.from({ length: 512 }, () => r() * 2 - 1);
    return (x) => {
      const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
      return vals[i & 511] * (1 - s) + vals[(i + 1) & 511] * s;
    };
  }
  function fbm(n, x, oct = 4) {
    let v = 0, amp = 0.5, fr = 1;
    for (let i = 0; i < oct; i++) { v += amp * n(x * fr); amp *= 0.5; fr *= 2.1; }
    return v;
  }

  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w); c.height = Math.ceil(h);
    return c;
  };
  const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const rgba = (hex, a) => { const [r, gg, b] = hexRgb(hex); return `rgba(${r},${gg},${b},${a})`; };

  // ---------- Glazes ----------

  // Split every edge at a displaced midpoint, depth times. v: [x, y, variance].
  function deform(poly, depth, r) {
    let p = poly;
    for (let d = 0; d < depth; d++) {
      const out = [];
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        out.push(a);
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const v = (a[2] + b[2]) / 2;
        out.push([(a[0] + b[0]) / 2 + r.gauss() * len * v, (a[1] + b[1]) / 2 + r.gauss() * len * v,
          clamp(v * (0.6 + 0.3 * r()), 0, 1)]);
      }
      p = out;
    }
    return p;
  }

  function fillPoly(ctx, p) {
    ctx.beginPath();
    p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  }

  // A wash: the base shape deformed once, then many glazes deformed again on top.
  // poly points may carry a third value: how ragged the edge is there (default 0.35).
  function wash(ctx, poly, color, { layers = 30, alpha = 0.04, rough = 0.35, seed = 1 } = {}) {
    const r = rng(seed);
    const base = deform(poly.map(([x, y, v]) => [x, y, v ?? rough]), 3, r);
    ctx.fillStyle = rgba(color, alpha);
    for (let i = 0; i < layers; i++) fillPoly(ctx, deform(base, 3, r));
    return base;
  }

  // Grain and blotches shared by all layers, tiled.
  let grainTile = null;
  function grain() {
    if (grainTile) return grainTile;
    const n = 256, c = canvas(n, n), ctx = c.getContext('2d'), id = ctx.createImageData(n, n), r = rng(7);
    for (let i = 0; i < n * n; i++) {
      const v = 200 + r() * 55;
      id.data.set([v, v, v, 255], i * 4);
    }
    ctx.putImageData(id, 0, 0);
    // soften to granulation, then add larger soft blotches
    const c2 = canvas(n, n), x2 = c2.getContext('2d');
    x2.filter = 'blur(0.7px)';
    x2.drawImage(c, 0, 0);
    x2.filter = 'blur(10px)';
    for (let i = 0; i < 14; i++) {
      x2.fillStyle = `rgba(${r() < 0.5 ? '120,120,120' : '255,255,255'},${0.18 * r()})`;
      x2.beginPath();
      x2.arc(r() * n, r() * n, 12 + r() * 30, 0, Math.PI * 2);
      x2.fill();
    }
    grainTile = c2;
    return c2;
  }

  // Granulation: pigment settles unevenly, so some of it is lifted off in a grainy,
  // blotchy pattern. Only removes paint, never adds it to empty paper.
  let liftTile = null;
  function granulate(ctx, w, h, amount = 0.5) {
    if (!liftTile) {
      const src = grain(), n = src.width, c = canvas(n, n), x = c.getContext('2d');
      const d = src.getContext('2d').getImageData(0, 0, n, n), id = x.createImageData(n, n);
      for (let i = 0; i < n * n; i++) id.data.set([0, 0, 0, Math.min(255, (d.data[i * 4] - 150) * 2.4)], i * 4);
      x.putImageData(id, 0, 0);
      liftTile = c;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = amount;
    ctx.fillStyle = ctx.createPattern(liftTile, 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Backruns ("cauliflowers"): pale spots with a darker rim where water crept back into
  // a drying wash. Lift pigment in a soft disc, then add a thin ring around it.
  function blooms(ctx, ridge, seed, count = 7) {
    const r = rng(seed);
    for (let i = 0; i < count; i++) {
      const p = ridge[Math.floor(r() * ridge.length)];
      const x = p[0] + (r() - 0.5) * 60, y = p[1] + 40 + r() * 90, rad = 18 + r() * 40;
      const ring = deform(Array.from({ length: 10 }, (_, k) => [x + Math.cos(k / 10 * 6.283) * rad, y + Math.sin(k / 10 * 6.283) * rad * 0.7, 0.12]), 3, r);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.filter = 'blur(4px)';
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      fillPoly(ctx, ring);
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.filter = 'blur(0.8px)';
      ctx.strokeStyle = 'rgba(60,60,80,0.18)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ring.forEach(([a0, b0], k) => (k ? ctx.lineTo(a0, b0) : ctx.moveTo(a0, b0)));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Wet fade: alpha falls off from y0 (full) to y1 (none) — a wash dissolving into mist.
  function fadeDown(ctx, w, y0, y1) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    const gr = ctx.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.55, 'rgba(0,0,0,0.45)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    // destination-in clears whatever the fill does not cover: cover everything
    ctx.fillRect(-1e5, -1e5, 2e5, 2e5);
    ctx.restore();
  }

  // ---------- Brush ----------

  // Closed outline of a stroke along pts with width w(s), s in 0..1.
  function taper(pts, w) {
    const L = [], R = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const ww = w(i / (n - 1)) / 2;
      L.push([pts[i][0] - dy * ww, pts[i][1] + dx * ww]);
      R.push([pts[i][0] + dy * ww, pts[i][1] - dx * ww]);
    }
    return L.concat(R.reverse());
  }

  // Dry-brush ink stroke: a few hairs of the brush, each breaking up along the way.
  function dryStroke(ctx, pts, width, color, { alpha = 0.8, hairs = 4, dry = 0.35, seed = 1 } = {}) {
    const r = rng(seed);
    for (let hI = 0; hI < hairs; hI++) {
      const off = (hI / Math.max(1, hairs - 1) - 0.5) * width * 0.7;
      const hw = width * (0.35 + 0.4 * r());
      let run = [];
      const flush = () => {
        if (run.length > 2) {
          ctx.fillStyle = rgba(color, alpha * (0.5 + 0.5 * r()));
          fillPoly(ctx, taper(run, (s) => hw * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.15 + 0.05)), 0.6)));
        }
        run = [];
      };
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        let nx = -(b[1] - a[1]), ny = b[0] - a[0];
        const l = Math.hypot(nx, ny) || 1;
        nx /= l; ny /= l;
        if (r() < dry * 0.18) flush();
        else run.push([pts[i][0] + nx * off, pts[i][1] + ny * off]);
      }
      flush();
    }
  }

  // ---------- Landscape pieces ----------

  // Ridge line for a mountain layer: shan-shui peaks (steep, rounded tops) plus noise.
  function ridge({ x0, x1, base, peaks, jag = 10, seed = 1, step = 10 }) {
    const n = noise1(seed), pts = [];
    for (let x = x0; x <= x1; x += step) {
      let hgt = 0;
      for (const p of peaks) {
        // asymmetric: each side has its own width; rounded top, concave flanks
        const u = (x - p.x) / (x < p.x ? (p.wl ?? p.w) : (p.wr ?? p.w));
        const a = Math.abs(u);
        if (a < 1) {
          // dome: steep sides, round top (karst towers); default: concave flanks
          const f = p.dome ? Math.pow(1 - Math.pow(a, p.dome), 0.5) : Math.pow(1 - a, p.k ?? 1.5) * (1 - 0.3 * Math.pow(1 - a, 10));
          hgt = Math.max(hgt, p.h * f);
        }
      }
      // shoulders and gullies along the slope, finer jitter on top
      pts.push([x, base - hgt * (1 + 0.12 * fbm(n, x / 140 + 7)) + fbm(n, x / 45) * jag]);
    }
    return pts;
  }

  // A row of peaks for ridge(): irregular spacing, heights and slopes, seeded.
  function peakRow({ x0, x1, hMin, hMax, gap, seed }) {
    const r = rng(seed), peaks = [];
    for (let x = x0 + r() * gap; x < x1; x += gap * (0.55 + r() * 0.9)) {
      const h = hMin + (hMax - hMin) * Math.pow(r(), 0.8), w = h * (0.8 + r() * 0.9);
      peaks.push({ x, h, wl: w * (0.6 + r() * 0.8), wr: w * (0.6 + r() * 0.8), k: 1.1 + r() * 0.8 });
      if (r() < 0.55) peaks.push({ x: x + (r() - 0.5) * w * 0.9, h: h * (0.45 + r() * 0.35), w: w * 0.55, k: 1.3 });
    }
    return peaks;
  }

  // A mountain range painted on its own canvas (world coords offset by ox, oy).
  // o: { w, h, ox, oy, ridge, color, deep, fadeTo, ink, inkColor, seed }
  function mountains(o) {
    const c = canvas(o.w, o.h), ctx = c.getContext('2d');
    ctx.translate(-o.ox, -o.oy);
    const top = Math.min(...o.ridge.map((p) => p[1]));
    const bottom = o.fadeTo + 40;
    const body = [...o.ridge.map(([x, y]) => [x, y, 0.18]), [o.ridge.at(-1)[0], bottom, 0.05], [o.ridge[0][0], bottom, 0.05]];
    // optional opaque underlay in the sky colour: the sun behind must not show through
    if (o.under) { ctx.fillStyle = o.under; fillPoly(ctx, body.map(([x, y]) => [x, y + 3])); }
    // main wash, then a darker glaze near the ridge (wet-in-wet, pigment settles high)
    wash(ctx, body, o.color, { layers: 28, alpha: 0.05, seed: o.seed });
    if (o.deep) {
      const band = [...o.ridge.map(([x, y]) => [x, y, 0.22]), ...o.ridge.slice().reverse().map(([x, y]) => [x, y + 70 + 40 * Math.sin(x / 90), 0.4])];
      wash(ctx, band, o.deep, { layers: 22, alpha: 0.035, seed: o.seed + 11 });
    }
    // pigment pooling along the ridge edge
    ctx.save();
    ctx.filter = 'blur(1.2px)';
    ctx.strokeStyle = rgba(o.deep || o.color, 0.22);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    // deform() closes the loop; keep only the points up to the last ridge point
    deform(o.ridge.map(([x, y]) => [x, y, 0.02]), 2, rng(o.seed + 3)).slice(0, (o.ridge.length - 1) * 4 + 1).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
    granulate(ctx, o.w, o.h, 0.35);
    blooms(ctx, o.ridge, o.seed + 17);
    fadeDown(ctx, o.w + o.ox, top + 30, o.fadeTo);
    // ink: broken dry-brush line along the ridge, and a few texture strokes down the slopes
    if (o.ink) {
      // ink only here and there along the ridge, thin and broken
      const r = rng(o.seed + 5);
      let seg = [], on = false;
      o.ridge.forEach((p, i) => {
        if (r() < 0.07) { if (on && seg.length > 3) dryStroke(ctx, seg, 2.2, o.inkColor, { alpha: 0.4, hairs: 2, dry: 0.5, seed: o.seed + i }); seg = []; on = r() < 0.45; }
        if (on) seg.push(p);
      });
      for (let i = 0; i < o.ink; i++) {
        const p = o.ridge[Math.floor(r() * o.ridge.length)];
        const len = 25 + r() * 55, ang = Math.PI / 2 + (r() - 0.5) * 0.9;
        const pts = [];
        for (let k = 0; k <= 8; k++) pts.push([p[0] + Math.cos(ang) * len * k / 8 + Math.sin(k) * 2, p[1] + 6 + Math.sin(ang) * len * k / 8]);
        dryStroke(ctx, pts, 2.4, o.inkColor, { alpha: 0.3, hairs: 2, dry: 0.6, seed: o.seed + 200 + i });
      }
    }
    return c;
  }

  // The rock Rita stands on: flat top at y (her feet), ink outline, texture strokes.
  function rock({ x, y, w, seed = 3, dawn = false }) {
    const h = 420, c = canvas(w + 260, h + 120), ctx = c.getContext('2d');
    const ox = x - w / 2 - 100, oy = y - 40;
    ctx.translate(-ox, -oy);
    const r = rng(seed);
    const top = [];
    for (let i = 0; i <= 12; i++) top.push([x - w / 2 + (w * i) / 12, y + 4 + Math.sin(i * 1.7) * 4 + (i < 2 || i > 10 ? 18 : 0)]);
    // lumpy body that widens and runs off the bottom of the frame
    const poly = [[x - w / 2 - 110, y + h, 0.2], [x - w / 2 - 70, y + 190, 0.3], [x - w / 2 - 20, y + 70, 0.3],
      ...top.map(([a, b]) => [a, b, 0.06]), [x + w / 2 + 30, y + 60, 0.3], [x + w / 2 + 90, y + 210, 0.3], [x + w / 2 + 130, y + h, 0.2]];
    wash(ctx, poly, dawn ? '#5a4c52' : '#4c535e', { layers: 26, alpha: 0.07, seed });
    wash(ctx, poly.map(([a, b, v]) => [a + 30, b + 25, v]), '#a8835a', { layers: 14, alpha: 0.04, seed: seed + 1 });
    granulate(ctx, c.width, c.height, 0.3);
    // light on the top face: lift some pigment off
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    wash(ctx, [[x - w / 2 + 40, y + 10, 0.2], [x + w / 2 - 60, y + 8, 0.2], [x + w / 2 - 120, y + 50, 0.3], [x - w / 2 + 80, y + 46, 0.3]], '#000000', { layers: 10, alpha: 0.06, seed: seed + 2 });
    ctx.restore();
    // ink: outline of the top edge and the left face, broken
    dryStroke(ctx, top, 4.5, '#24170f', { alpha: 0.75, hairs: 4, dry: 0.4, seed: seed + 3 });
    dryStroke(ctx, [[x - w / 2 + 6, y + 22], [x - w / 2 - 6, y + 70], [x - w / 2 - 20, y + 150], [x - w / 2 - 28, y + 240]], 5, '#24170f', { alpha: 0.6, hairs: 4, dry: 0.5, seed: seed + 4 });
    // hemp-fibre texture strokes
    for (let i = 0; i < 26; i++) {
      const sx = x - w / 2 + 30 + r() * (w - 40), sy = y + 30 + r() * 170, len = 20 + r() * 40;
      const pts = [];
      for (let k = 0; k <= 6; k++) pts.push([sx - k * len / 6 * 0.35, sy + k * len / 6 + Math.sin(k + i) * 2]);
      dryStroke(ctx, pts, 2.2, '#24170f', { alpha: 0.28, hairs: 2, dry: 0.6, seed: seed + 10 + i });
    }
    return { canvas: c, ox, oy };
  }

  // Foreground pine branch in ink, painted blurred (out of focus). Needles grow in
  // dense brush-like tufts on the ends of twigs, pointing up and forward.
  function pineBranch({ x, y, scale = 1, seed = 5, blur = 5 }) {
    const w = 1100 * scale, h = 640 * scale, c = canvas(w, h), ctx = c.getContext('2d');
    const r = rng(seed);
    ctx.filter = `blur(${blur}px)`;
    ctx.translate(40 * scale, 80 * scale);
    ctx.scale(scale, scale);
    // main limb: a bent, knotty line, thicker at the trunk side
    const main = [];
    for (let i = 0; i <= 24; i++) main.push([i * 36, 40 + Math.sin(i / 4) * 22 + i * 5 + (r() - 0.5) * 6]);
    ctx.fillStyle = rgba('#2a1d14', 0.9);
    fillPoly(ctx, taper(main, (s) => 30 * Math.pow(1 - s, 0.7) + 4));
    const tips = [main.at(-1)];
    for (let k = 0; k < 6; k++) {
      const at = main[3 + k * 3 + Math.floor(r() * 2)];
      const dir = r() < 0.6 ? 1 : -1, len = 90 + r() * 110;
      const twig = [];
      for (let i = 0; i <= 10; i++) {
        const s0 = i / 10;
        twig.push([at[0] + len * s0 * 0.9, at[1] + dir * len * s0 * 0.55 + Math.sin(s0 * 3 + k) * 8]);
      }
      fillPoly(ctx, taper(twig, (s) => 10 * (1 - s * 0.85)));
      tips.push(twig.at(-1), twig[6]);
    }
    // needle tufts: many thin slightly curved strokes from a short stretch of twig
    for (const [tx, ty] of tips) {
      const n = 70;
      for (let i = 0; i < n; i++) {
        const along = (r() - 0.5) * 50;
        const a = -Math.PI / 2 + (r() - 0.5) * 2.4 + (r() < 0.3 ? Math.PI * 0.9 : 0);
        const len = 45 + r() * 50, bend = (r() - 0.5) * 0.5;
        const pts = [];
        for (let k = 0; k <= 6; k++) {
          const s0 = k / 6, aa = a + bend * s0;
          pts.push([tx + along * 0.6 + Math.cos(aa) * len * s0, ty + along * 0.25 + Math.sin(aa) * len * s0]);
        }
        ctx.fillStyle = rgba(r() < 0.7 ? '#23302a' : '#3d4a3f', 0.35 + 0.4 * r());
        fillPoly(ctx, taper(pts, (s) => 2.6 * (1 - s * 0.9)));
      }
    }
    return { canvas: c, ox: x - 40 * scale, oy: y - 80 * scale };
  }

  // Sun: a wet blob of wine pigment with a soft bloom.
  function sun({ x, y, rad, seed = 9 }) {
    const c = canvas(rad * 6, rad * 6), ctx = c.getContext('2d');
    const ox = x - rad * 3, oy = y - rad * 3;
    ctx.translate(-ox, -oy);
    const glow = ctx.createRadialGradient(x, y, rad * 0.5, x, y, rad * 3);
    glow.addColorStop(0, 'rgba(214,150,140,0.35)');
    glow.addColorStop(1, 'rgba(243,227,229,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(ox, oy, rad * 6, rad * 6);
    const circle = Array.from({ length: 16 }, (_, i) => [x + Math.cos(i / 16 * Math.PI * 2) * rad, y + Math.sin(i / 16 * Math.PI * 2) * rad, 0.06]);
    wash(ctx, circle, '#a0303f', { layers: 24, alpha: 0.07, seed });
    return { canvas: c, ox, oy };
  }

  // Soft paper-coloured mist band, wider than the screen so it can drift and wrap.
  function mistBand({ w, h, color, seed = 13 }) {
    const c = canvas(w, h), ctx = c.getContext('2d'), r = rng(seed);
    ctx.filter = 'blur(18px)';
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = rgba(color, 0.12 + 0.18 * r());
      ctx.beginPath();
      ctx.ellipse(r() * w, h / 2 + r.gauss() * h * 0.15, 80 + r() * 220, 10 + r() * 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  }

  // Paper texture over the whole frame (multiply).
  function paperSheet(w, h, seed = 21) {
    const c = canvas(w, h), ctx = c.getContext('2d'), r = rng(seed);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = ctx.createPattern(grain(), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    // a few faint fibres
    ctx.strokeStyle = 'rgba(150,140,125,0.08)';
    for (let i = 0; i < 120; i++) {
      const x = r() * w, y = r() * h, a = r() * Math.PI;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
      ctx.stroke();
    }
    return c;
  }

  DH.wc = { rng, noise1, fbm, canvas, rgba, hexRgb, fillPoly, deform, wash, granulate, blooms, fadeDown, taper, dryStroke, ridge, peakRow, mountains, rock, pineBranch, sun, mistBand, paperSheet };
})(window);
