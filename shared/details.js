// Small quiet details the scenes share: far birds, rings on the water, little pines, a
// bamboo spray near the lens, reeds. They fill the empty sky and water without competing
// with the main action: ink and thin washes, low contrast, slow. Every drawing is a pure
// function of time; shapes and phases are seeded.
(function (g) {
  const DH = g.DH, W = DH.wc;
  const { rgba, rng, taper, fillPoly, dryStroke } = W;

  // ---------- birds ----------

  // A flock of n far birds: offsets from the flock's centre, sizes and wing phases.
  function flock({ n = 5, seed = 1, spread = [90, 36], size = 9 } = {}) {
    const r = rng(seed);
    return Array.from({ length: n }, () => ({
      dx: (r() - 0.5) * 2 * spread[0], dy: (r() - 0.5) * 2 * spread[1],
      s: size * (0.75 + 0.5 * r()), ph: r() * 6.283, rate: 7 + r() * 3, bob: r() * 6.283,
    }));
  }

  // Draw flock F with its centre at (x, y) in the current transform. Each bird is an ink
  // tick: two curved wing strokes meeting at the body. glide: wings held out, barely moving
  // (a hawk soaring) instead of flapping.
  function birds(ctx, F, x, y, t, { color = '#3e3a36', alpha = 0.5, glide = false } = {}) {
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const b of F) {
      const lift = glide ? 0.22 + 0.1 * Math.sin(t * 1.3 + b.ph) : 0.15 + 0.55 * Math.sin(t * b.rate + b.ph);
      const bx = x + b.dx + Math.sin(t * 0.7 + b.bob) * b.s * 0.4, by = y + b.dy + Math.sin(t * 1.1 + b.bob) * b.s * 0.3;
      const s = b.s, ty = by - lift * s;
      ctx.lineWidth = Math.max(1, s * 0.17);
      ctx.beginPath();
      ctx.moveTo(bx - s, ty);
      ctx.quadraticCurveTo(bx - s * 0.45, ty - s * 0.22 + (by - ty) * 0.2, bx, by);
      ctx.quadraticCurveTo(bx + s * 0.45, ty - s * 0.22 + (by - ty) * 0.2, bx + s, ty);
      ctx.stroke();
    }
  }

  // ---------- water ----------

  // One ring spreading on still water at (x, y), age seconds after it started: two thin
  // ellipses growing and fading over `life` seconds.
  function ring(ctx, x, y, age, { size = 40, life = 2.2, color = '#5d6670', alpha = 0.3 } = {}) {
    if (age <= 0 || age >= life) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 2; k++) {
      const a = age / life - k * 0.22;
      if (a <= 0) continue;
      ctx.globalAlpha = alpha * (1 - a) * Math.min(1, a * 8);
      ctx.beginPath();
      ctx.ellipse(x, y, 4 + size * a, 1 + size * 0.22 * a, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Rings now and then at a few seeded spots of a stretch of water: plan once, draw at t.
  function ringSites({ n = 5, seed = 1, x = [0, 1920], y = [760, 1000], period = [3.5, 5.5] } = {}) {
    const r = rng(seed);
    return Array.from({ length: n }, () => ({
      x: x[0] + r() * (x[1] - x[0]), y: y[0] + r() * (y[1] - y[0]),
      period: period[0] + r() * (period[1] - period[0]), ph: r(),
    }));
  }
  function rings(ctx, sites, t, o) {
    for (const s of sites) {
      // further away (higher on the water) the rings are smaller
      const age = ((t / s.period + s.ph) % 1 + 1) % 1 * s.period;
      ring(ctx, s.x, s.y, age, { ...o, size: (o?.size ?? 40) * (0.6 + 0.4 * s.ph) });
    }
  }

  // ---------- trees ----------

  // The needles of a near pine: how many per pad, how wide the pad spreads along its
  // bough, how long they are (in units of the tree's height).
  const LUSH = { n: 90, w: 0.8, len: 0.12 };

  // A small mountain pine in ink: a crooked trunk and a few uneven pads of needles, each a
  // cluster of overlapping dabs, set off to alternate sides. (x, y) is the foot, h the height.
  function pine(ctx, x, y, h, { seed = 1, color = '#24170f', alpha = 0.7 } = {}) {
    const r = rng(seed), lean = (r() - 0.5) * 0.4, at = (u) => [x + lean * h * u + Math.sin(u * 4 + seed) * h * 0.04, y - h * u];
    const trunk = [];
    for (let i = 0; i <= 8; i++) trunk.push(at(i / 8 * 0.92));
    ctx.fillStyle = rgba(color, alpha * 0.9);
    fillPoly(ctx, taper(trunk, (u) => Math.max(0.9, h * 0.055 * (1 - u * 0.75))));
    const tiers = 3;
    let side = r() < 0.5 ? 1 : -1;
    for (let k = 0; k < tiers; k++) {
      const u = 0.5 + 0.5 * (k / (tiers - 1)), [cx, cy] = at(u);
      const w = h * (0.42 - 0.2 * (k / (tiers - 1))) * (0.85 + 0.3 * r());
      const off = k === tiers - 1 ? 0 : side * w * 0.35;
      side = -side;
      if (h > 40) {
        // a tree close enough to see its needles: a short bough to the side, a thin wash
        // for the mass of the pad and a dense fan of thin strokes standing on the bough
        const reach = off * 1.8;
        ctx.fillStyle = rgba(color, alpha * 0.85);
        fillPoly(ctx, taper([[cx, cy + h * 0.03], [cx + reach * 0.5, cy - h * 0.01], [cx + reach, cy + h * 0.02]], (v) => Math.max(0.8, h * 0.03 * (1 - v * 0.7))));
        ctx.fillStyle = rgba(color, alpha * 0.16);
        ctx.beginPath(); ctx.ellipse(cx + reach * 0.5, cy - h * 0.05, Math.abs(reach) * 0.5 + w * LUSH.w * 0.5, h * 0.075, 0, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < LUSH.n; i++) {
          const bx = cx + reach * r() + (r() - 0.5) * w * LUSH.w, by = cy + (r() - 0.5) * h * 0.04;
          const a = -Math.PI / 2 + (r() - 0.5) * 2.6, len = h * (LUSH.len + 0.1 * r());
          ctx.fillStyle = rgba(color, alpha * (0.3 + 0.45 * r()));
          fillPoly(ctx, taper([[bx, by], [bx + Math.cos(a) * len * 0.5, by + Math.sin(a) * len * 0.5], [bx + Math.cos(a) * len, by + Math.sin(a) * len * 0.9]], (q) => Math.max(0.5, h * 0.024 * (1 - q * 0.8))));
        }
        continue;
      }
      for (let i = 0; i < 7; i++) {
        const a = (r() - 0.5) * 2, dx = a * w * 0.6;
        ctx.fillStyle = rgba(color, alpha * (0.3 + 0.35 * r()));
        ctx.beginPath();
        ctx.ellipse(cx + off + dx, cy + Math.abs(a) * h * 0.05 + (r() - 0.5) * h * 0.05, w * (0.3 + 0.25 * r()), h * (0.05 + 0.035 * r()), a * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // A bamboo spray close to the lens, out of focus: thin jointed stalks drooping from the
  // top right corner of its canvas, lance-shaped leaves in bunches. Returns the canvas and
  // its hanging point (ax, ay): sway it by rotating around that point.
  function bamboo({ w = 760, h = 560, seed = 7, blur = 4, colors = ['#3d4a3f', '#5c6e5a'] } = {}) {
    const c = W.canvas(w, h), ctx = c.getContext('2d'), r = rng(seed);
    ctx.filter = `blur(${blur}px)`;
    const ax = w - 20, ay = 10;
    for (let s = 0; s < 3; s++) {
      // the stalk: from the corner, out to the left and drooping
      const len = (0.55 + 0.4 * r()) * w, droop = (0.35 + 0.5 * r()) * h, stalk = [];
      for (let i = 0; i <= 18; i++) { const u = i / 18; stalk.push([ax - len * u, ay + 20 * s + droop * u * u + Math.sin(u * 4 + s) * 6]); }
      ctx.fillStyle = rgba(colors[0], 0.7);
      fillPoly(ctx, taper(stalk, (u) => 7 * (1 - u * 0.75) + 1.5));
      // joints, and a bunch of leaves at some of them, more towards the tip
      for (let i = 3; i <= 18; i += 2) {
        const [jx, jy] = stalk[i];
        if (r() < 0.25) continue;
        const n = 3 + Math.floor(r() * 3);
        for (let k = 0; k < n; k++) {
          const a = Math.PI * (0.38 + 0.5 * r()) + (r() - 0.5) * 0.3, ll = 70 + r() * 80, bend = (r() - 0.5) * 0.5;
          const leaf = [];
          for (let q = 0; q <= 8; q++) { const u = q / 8, aa = a + bend * u; leaf.push([jx + Math.cos(aa) * ll * u, jy + Math.sin(aa) * ll * u]); }
          ctx.fillStyle = rgba(colors[r() < 0.6 ? 0 : 1], 0.4 + 0.35 * r());
          fillPoly(ctx, taper(leaf, (u) => 15 * Math.sin(Math.PI * Math.pow(u, 0.7)) + 0.6));
        }
      }
    }
    return { canvas: c, ax, ay };
  }

  // ---------- reeds ----------

  // A clump of reeds: blades that grow from the water round (x, y) and bend with the wind.
  function reeds({ x, y, n = 9, spread = 70, h = [110, 220], seed = 1 }) {
    const r = rng(seed);
    return Array.from({ length: n }, () => ({
      x: x + (r() - 0.5) * 2 * spread, y: y + r() * 14, h: h[0] + r() * (h[1] - h[0]),
      lean: (r() - 0.5) * 0.3, ph: r() * 6.283, w: 2.4 + r() * 2.2, head: r() < 0.4, a: 0.45 + 0.4 * r(),
    }));
  }

  // wind: 0 calm, 1 a steady breeze, more in a gust; the blades bend to the left with it
  // (the gusts of the film blow from the right) and tremble.
  function drawReeds(ctx, blades, t, { wind = 1, color = '#56625d', alpha = 1 } = {}) {
    for (const b of blades) {
      const sway = (Math.sin(t * 1.4 + b.ph) * 0.05 + Math.sin(t * 3.1 + b.ph * 2) * 0.015) * wind - 0.07 * (wind - 1);
      const bend = b.lean + sway, pts = [];
      for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push([b.x + bend * b.h * u * u * 1.6, b.y - b.h * u]); }
      ctx.fillStyle = rgba(color, b.a * alpha);
      fillPoly(ctx, taper(pts, (u) => b.w * (1 - u * 0.85) + 0.5));
      if (b.head) {
        // the seed head: a darker spindle just under the tip
        const [hx, hy] = pts[7], [kx, ky] = pts[6];
        ctx.save();
        ctx.translate((hx + kx) / 2, (hy + ky) / 2);
        ctx.rotate(Math.atan2(hy - ky, hx - kx));
        ctx.beginPath(); ctx.ellipse(0, 0, b.h * 0.07, b.w * 1.1, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  }

  DH.details = { flock, birds, ring, ringSites, rings, pine, bamboo, reeds, drawReeds };
})(window);
