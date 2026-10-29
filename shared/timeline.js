// Timeline helpers. Every frame is a pure function of time t (seconds):
// no requestAnimationFrame accumulation and no unseeded randomness.
(function (g) {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  // 0..1 progress of t inside [t0, t1]
  const progress = (t, t0, t1) => clamp((t - t0) / (t1 - t0));

  // CSS-style cubic-bezier(x1, y1, x2, y2) solved for y(x).
  function cubicBezier(x1, y1, x2, y2) {
    const bx = (u) => 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3;
    const by = (u) => 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let lo = 0, hi = 1, u = x;
      for (let i = 0; i < 30; i++) {
        u = (lo + hi) / 2;
        if (bx(u) < x) lo = u; else hi = u;
      }
      return by(u);
    };
  }

  // Brand curves from dao-to-hsk static/css/tokens.css
  const ease = {
    out: cubicBezier(0.22, 1, 0.36, 1),
    draw: cubicBezier(0.65, 0, 0.35, 1),
    stamp: cubicBezier(0.2, 0.9, 0.3, 1.2),
    linear: (x) => clamp(x),
  };

  // Smooth deterministic pseudo-noise in about [-1, 1].
  function noise(x, seed = 0) {
    return Math.sin(x * 1.13 + seed * 12.9) * 0.5 +
      Math.sin(x * 2.71 + seed * 3.1) * 0.3 +
      Math.sin(x * 5.37 + seed * 7.7) * 0.2;
  }

  // Eyelid closure 0..1 for a blink starting at t0 (about 0.18 s long).
  function blink(t, t0, dur = 0.18) {
    const k = progress(t, t0, t0 + dur);
    return k <= 0 || k >= 1 ? 0 : Math.sin(Math.PI * k);
  }

  g.DH = Object.assign(g.DH || {}, { clamp, lerp, progress, cubicBezier, ease, noise, blink });
})(window);
