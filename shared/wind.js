// Ink strokes carried by the wind, and wine-red petals: shared by the scenes of intro-01
// (the gust carries strands off as petals; on the way back the city lights fly home).
// A stroke s: { P: waypoints, t0, dur, w: width, len: share of the curve its body covers,
// wave: how much it ripples, seed, color (default ink) }. All pure functions of time.
(function (g) {
  const DH = g.DH, W = DH.wc;
  const { ease, lerp, progress } = DH;
  const INK = '#24170f';

  // Smooth curve through the waypoints P (Catmull-Rom), u in 0..1 over all of them.
  function bez(P, u) {
    const n = P.length - 1, f = Math.min(n - 1e-9, Math.max(0, u * n)), i = Math.floor(f), k = f - i;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n, i + 2)];
    const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * k + (2 * a - 5 * b + 4 * c2 - d) * k * k + (-a + 3 * b - 3 * c2 + d) * k * k * k);
    return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
  }

  // Points of the curve between u0 and u1, rippled across the path by a wave that travels
  // along the stroke (the wind shakes it like a ribbon). q: 0 at the tail, 1 at the head.
  function segment(s, u0, u1, t, n = 40) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const q = i / n, u = lerp(u0, u1, q);
      const a = bez(s.P, Math.max(0, u - 0.004)), b = bez(s.P, Math.min(1, u + 0.004)), c = bez(s.P, u);
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1;
      const off = s.wave * Math.sin(u * 14 - t * 9 + s.seed) * (0.3 + 0.7 * (1 - q));
      pts.push([c[0] + (nx / l) * off, c[1] + (ny / l) * off]);
    }
    return pts;
  }

  // A dry-brush ribbon (飞白): a pale wash under many brush hairs that break up towards the
  // tail; the ribbon turns edge-on now and then as it twists in the wind.
  function ribbon(ctx, pts, s, a, t) {
    const n = pts.length - 1;
    const width = (q) => s.w * Math.pow(Math.sin(Math.PI * Math.min(1, q * 0.95 + 0.03)), 0.5) * (0.35 + 0.65 * q) *
      (0.45 + 0.55 * Math.abs(Math.cos(q * 3.2 + t * 4 + s.seed)));
    const ink = s.color || INK;
    ctx.fillStyle = W.rgba(ink, a * 0.16);
    W.fillPoly(ctx, W.taper(pts, width));
    // normals along the ribbon
    const N = pts.map((p, i) => {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(n, i + 1)];
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
      return [-dy / l, dx / l];
    });
    const r = W.rng(s.seed);
    ctx.lineCap = 'round';
    for (let h = 0; h < 14; h++) {
      const o = r() - 0.5, lw = 0.6 + r() * 2.6 * (s.w / 50), ha = a * (0.25 + 0.6 * r()), seedH = r() * 50;
      ctx.strokeStyle = W.rgba(ink, ha);
      ctx.lineWidth = lw;
      ctx.beginPath();
      let on = false;
      for (let i = 0; i <= n; i++) {
        const q = i / n;
        // dry towards the tail: the hair skips more often there
        const wet = DH.noise(q * 9 + seedH, s.seed + h) * 0.5 + 0.5 > 0.62 - 0.55 * q;
        const x = pts[i][0] + N[i][0] * o * width(q), y = pts[i][1] + N[i][1] * o * width(q);
        if (wet && on) ctx.lineTo(x, y);
        else if (wet) { ctx.moveTo(x, y); on = true; } else on = false;
      }
      ctx.stroke();
    }
    // the wet head: a darker blot where the brush still holds ink
    ctx.fillStyle = W.rgba(ink, a * 0.45);
    W.fillPoly(ctx, W.taper(pts.slice(Math.floor(n * 0.82)), (q) => width(0.82 + 0.18 * q) * 0.8 * Math.sin(Math.PI * Math.min(1, q * 0.9 + 0.1))));
  }

  // The head rushes in and then flies on more slowly, but never stops: the body stays on the
  // curve to the end and the strokes keep leading the camera.
  const pace = (k) => 0.65 * ease.out(k) + 0.35 * k;
  function strokeHead(s, t) {
    const k = progress(t, s.t0, s.t0 + s.dur);
    return [k, pace(k) * (s.screen ? 1 + s.len : 1)];
  }

  // Wine-red petals (brand `wine`, docs/brand.md).
  const WINE = ['#7b1e2b', '#5e1520', '#8c2f3c', '#9a4150'];


  // Watercolour petal sprites: a rounded petal with a small notch at the tip, a wash with a
  // ragged edge, the dried darker rim, paler at the base.
  function paintPetals(n = 8) {
    const out = [], r = W.rng(301);
    for (let i = 0; i < n; i++) {
      const c = W.canvas(72, 72), x = c.getContext('2d');
      x.translate(36, 36);
      const len = 24 + r() * 6, wid = 14 + r() * 6, poly = [];
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2, sa = Math.sin(a), ca = Math.cos(a);
        // narrow at the base (bottom), round at the top, a notch at the very top
        const narrow = 0.45 + 0.55 * (1 - ca) / 2, notch = 1 - 0.18 * Math.exp(-((a - Math.PI) ** 2) * 18);
        poly.push([sa * wid * narrow, ca * len * 0.5 * notch + len * 0.05, 0.06]);
      }
      const col = WINE[Math.floor(r() * WINE.length)];
      const base = W.wash(x, poly, col, { layers: 14, alpha: 0.11 + r() * 0.05, rough: 0.06, seed: 310 + i });
      x.strokeStyle = W.rgba(WINE[1], 0.35);
      x.lineWidth = 1.1;
      x.beginPath(); base.forEach(([px, py], k) => (k ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); x.stroke();
      // paler towards the base: lift some paint
      x.globalCompositeOperation = 'destination-out';
      const g = x.createRadialGradient(0, len * 0.42, 0, 0, len * 0.42, len * 0.55);
      g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(-36, -36, 72, 72);
      out.push(c);
    }
    return out;
  }

  DH.wind = { bez, segment, ribbon, pace, strokeHead, paintPetals, WINE };
})(window);
