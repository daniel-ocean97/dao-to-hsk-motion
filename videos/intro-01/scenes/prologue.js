// intro-01, scenes 1-2 (0-5 s): the prologue and the gust, one continuous shot
// (docs/intro-01-storyboard.md). Probe: videos/probe-gust/ shows 2.5-5.0.
//   0.0-0.95 a drop of ink lands on bare paper and the place comes through as it spreads
//   0.0-3.0  Rita (pose A) on the rock above the water, wind, breath, a blink at 2.2;
//            the camera arcs slowly round her
//   3.0-5.0  the gust: the wind brings ink strokes from the right; they sweep through
//            Rita's hair, catch strands that turn into wine-red petals, curl up into the sky
//            and the camera flies after them; Rita leaves the frame at the bottom;
//            big strokes rush past the lens (and, with opt.wipe, white paper closes the frame)
// SCENES.prologue(opt) loads and paints everything once and resolves to
// { DURATION, frame(out, T) }: frame draws scene time T (0..5) into the 2D context out.
// opt: { base: path to the repo root, wipe: close with the paper (true for the probe) }.
(function (g) {
  g.SCENES = g.SCENES || {};
  g.SCENES.prologue = async function (opt = {}) {
    const { ease, lerp, progress } = DH;
    const W = DH.wc;
    const { bez, segment, ribbon, pace, strokeHead, paintPetals } = DH.wind;
    // Gust times below are in "gust time" t = T - 2.5 (T: scene time, 0..5), as in the probe:
    // the gust hits at t = G = 0.5, i.e. T = 3.0, the video's 3.0.
    const DURATION = 2.5, G = 0.5;
    const back = W.canvas(1920, 1080), fx = W.canvas(1920, 1080);
    const bctx = back.getContext('2d'), fctx = fx.getContext('2d');

    const PAL = LAKE.PALETTES.morning, { view, place } = LAKE;
    const INK = '#24170f', HAIR = '#3a2820', PAPER = '#f5f2ec';
    const paintPlace = () => LAKE.paint(PAL, { x: 1250, w: 520, seed: 3 });
    const drawPlace = (L, cam, T) => LAKE.draw(bctx, L, cam, T); // video time: always >= 0

    // ---------- the gust and the camera ----------

    // 0..1 strength of the gust: hits at G, peaks quickly, stays strong.
    const gust = (t) => ease.out(progress(t, G, G + 0.35)) * (1 - 0.15 * progress(t, 1.4, 2.5));

    function camera(t) {
      // scene 1: a slow arc round Rita with a slight push-in (t from -2.5 to G); then the flight
      // after the strokes: up into the sky and forward, Rita drops out of the frame at the bottom
      const a = ease.draw(progress(t, -2.5, G)), f = ease.draw(progress(t, G + 0.25, DURATION));
      const fu = f * f * (3 - 2 * f);
      return { x: lerp(-70, 22, a) + 160 * f, y: lerp(0, -8, a) - 640 * fu, zoom: lerp(1.0, 1.06, a) + 0.5 * fu };
    }

    // ---------- strokes ----------

    // Rita's art maps to world: anchor (980, 1085) of the 2000x1116 image at (1250, 1012),
    // 675 units tall. Hair tips are around image (680-800, 300-470).
    const RITA = { x: 1250, y: 1012, h: 675 };
    const S = RITA.h / 1116;
    const art = (ix, iy) => [RITA.x + (ix - 980) * S, RITA.y + (iy - 1085) * S];
    // the gust bends the hair along its root->tip direction by up to ~0.05 of the image height
    const HAIR_DIR = (() => { const dx = 680 - 990, dy = 400 - 80, l = Math.hypot(dx, dy); return [dx / l, dy / l]; })();

    // Each stroke: a curve through waypoints in world coords at depth p, the time it enters (t0) and how long it
    // takes to fly the curve (dur), its width, the share of the curve it covers (len), how much
    // it ripples across its path (wave). catch: image point of the hair tip it pulls a strand
    // from. screen: a stroke right at the lens, given in frame coords.
    const STROKES = [
      // at Rita's depth: over her head (her face stays clear), down through the hair where they
      // catch the strands, then a curl up into the sky. Head ~(1290, 380-470), tips ~(1075-1120, 540-630)
      { P: [[2000, 300], [1550, 285], [1300, 290], [1160, 420], [1078, 568], [960, 570], [880, 390], [740, 20], [480, -480]], p: 1, t0: 0.55, dur: 1.75, w: 56, len: 0.3, wave: 14, seed: 11, catch: [700, 360] },
      { P: [[2040, 250], [1600, 245], [1310, 265], [1200, 420], [1112, 628], [990, 640], [900, 450], [790, 90], [600, -540]], p: 1, t0: 0.7, dur: 1.7, w: 44, len: 0.28, wave: 12, seed: 12, catch: [760, 455] },
      { P: [[2000, 340], [1560, 320], [1320, 300], [1170, 400], [1070, 532], [950, 505], [850, 300], [680, -80], [380, -460]], p: 1, t0: 0.85, dur: 1.6, w: 48, len: 0.28, wave: 12, seed: 13, catch: [690, 300] },
      // behind her, smaller and paler
      { P: [[2050, 300], [1700, 320], [1100, 380], [900, -700]], p: 0.6, t0: 0.5, dur: 1.9, w: 34, len: 0.3, wave: 18, seed: 14, alpha: 0.55 },
      { P: [[2050, 560], [1800, 520], [1300, 480], [1150, -650]], p: 0.7, t0: 0.72, dur: 1.75, w: 30, len: 0.3, wave: 16, seed: 15, alpha: 0.6 },
      { P: [[2040, 200], [1700, 260], [1250, 300], [1000, -800]], p: 0.85, t0: 0.95, dur: 1.55, w: 38, len: 0.3, wave: 20, seed: 16, alpha: 0.7 },
      // in front of her, big and soft (out of focus)
      { P: [[2080, 1000], [1500, 990], [1000, 870], [780, 500], [560, 0], [300, -500]], p: 1.3, t0: 0.85, dur: 1.65, w: 80, len: 0.34, wave: 34, seed: 17, blur: 5 },
      { P: [[2080, 150], [1700, 140], [1200, 110], [900, -800]], p: 1.25, t0: 1.15, dur: 1.35, w: 70, len: 0.34, wave: 30, seed: 18, blur: 4 },
      // the rush past the lens that fills the frame before the paper closes it
      { P: [[2300, 1150], [1500, 800], [800, 500], [-300, -200]], screen: true, t0: 1.7, dur: 0.75, w: 260, len: 0.45, wave: 40, seed: 20, blur: 9, alpha: 0.65 },
      { P: [[2300, 350], [1500, 250], [700, 150], [-300, -300]], screen: true, t0: 1.82, dur: 0.7, w: 220, len: 0.45, wave: 36, seed: 21, blur: 8, alpha: 0.55 },
      { P: [[2300, 800], [1400, 700], [600, 700], [-400, 300]], screen: true, t0: 1.95, dur: 0.6, w: 300, len: 0.45, wave: 30, seed: 22, blur: 12, alpha: 0.5 },
    ];

    // One stroke at time t: its head flies along the curve, the body is the stretch behind it.
    function drawStroke(ctx, s, t) {
      const [k, head] = strokeHead(s, t);
      if (k <= 0) return;
      const u1 = Math.min(1, head), u0 = Math.max(0, head - s.len);
      if (u1 - u0 < 0.004) return;
      const pts = segment(s, u0, u1, t);
      const a = (s.alpha ?? 0.9) * Math.min(1, k * 6);
      if (s.screen) ctx.setTransform(1, 0, 0, 1, 0, 0);
      else view(ctx, cam, s.p);
      ctx.filter = s.blur ? `blur(${s.blur}px)` : 'none';
      ribbon(ctx, pts, s, a, t);
      ctx.filter = 'none';
    }

    // The strand a stroke pulls out of the hair: a few loose hairs from the hair tip to the
    // stroke's head. They stretch while the root holds, then tear off and trail the stroke;
    // soon after the tear the strand turns into petals (see PETALS).
    // Returns { root, end, tear } at time t, or null before the stroke reaches the hair.
    function strandAt(s, t) {
      if (!s.catch) return null;
      const [tx0, ty0] = art(...s.catch);
      // the curve point nearest to the tip, and when the head gets there
      let best = 0, bd = 1e9;
      for (let i = 0; i <= 80; i++) { const q = bez(s.P, i / 80), d = Math.hypot(q[0] - tx0, q[1] - ty0); if (d < bd) { bd = d; best = i / 80; } }
      // when the head reaches `best`
      let kc = 0;
      while (kc < 1 && pace(kc) < best) kc += 0.002;
      const tCatch = s.t0 + s.dur * kc;
      if (t < tCatch) return null;
      const [, head] = strokeHead(s, t);
      const gd = 0.05 * 1116 * S * gust(t);
      const tip = [tx0 + HAIR_DIR[0] * gd, ty0 + HAIR_DIR[1] * gd];
      // the head hooks the strand as it passes the tip and drags it; the strand stretches up to
      // MAXL, then tears off and flies after the hook with the same length
      const MAXL = 160, hookAt = (h) => bez(s.P, Math.max(0, Math.min(1, h) - 0.03));
      const hook = hookAt(head);
      let tear = s.t0 + s.dur;
      for (let tt = tCatch; tt < s.t0 + s.dur; tt += 0.005) {
        const q = hookAt(strokeHead(s, tt)[1]);
        if (Math.hypot(q[0] - tip[0], q[1] - tip[1]) > MAXL) { tear = tt; break; }
      }
      // after the tear the root slides onto the curve, MAXL behind the hook
      let u = Math.max(0, Math.min(1, head) - 0.03), q = hook;
      while (u > 0 && Math.hypot(q[0] - hook[0], q[1] - hook[1]) < MAXL) { u -= 0.004; q = bez(s.P, u); }
      const fr = ease.out(progress(t, tear, tear + 0.25));
      return { root: [lerp(tip[0], q[0], fr), lerp(tip[1], q[1], fr)], end: hook, tear };
    }
    // tear time of each catching stroke (computed once, it does not depend on t)
    const tearOf = (s) => strandAt(s, s.t0 + s.dur - 1e-3)?.tear ?? Infinity;

    function drawStrand(ctx, s, t) {
      if (!s.catch) return;
      const g = strandAt(s, t);
      if (!g) return;
      const { root, end, tear } = g;
      const free = ease.out(progress(t, tear, tear + 0.3));
      // the strand dissolves while its petals open (from the far end back to the root)
      const fade = 1 - progress(t, tear + PETAL_DELAY, tear + PETAL_DELAY + 0.4);
      if (fade <= 0) return;
      view(ctx, cam, s.p);
      ctx.lineCap = 'round';
      const r = W.rng(s.seed + 100);
      for (let j = 0; j < 4; j++) {
        const spread = (r() - 0.5) * 10, bow = 10 + r() * 16, wav = 3 + r() * 4;
        ctx.strokeStyle = W.rgba(j % 2 ? '#5a4033' : HAIR, (0.55 + 0.3 * r()) * fade);
        ctx.lineWidth = 0.8 + r() * 0.9;
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) {
          const u = i / 24, v = 1 - u;
          const mx = (root[0] + end[0]) / 2, my = (root[1] + end[1]) / 2 + bow * (1 - free * 0.6);
          const x = v * v * root[0] + 2 * v * u * mx + u * u * end[0];
          const y = v * v * root[1] + 2 * v * u * my + u * u * end[1] + spread * u + wav * Math.sin(u * 9 - t * 12 + j);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    }

    // ---------- petals ----------

    // Wine-red petals (brand `wine`, docs/brand.md): the strands the wind carries off turn into
    // petals, and a few tear off the hair tips in the gust. Few of them and painted like the
    // landscape, so they read as petals and not as particles. Each petal is a pure function of
    // the time since it opened: the wind picks it up and it rides the curve of one of the
    // strokes, some way behind its head and off to one side, so the petals spread out along the
    // wind's paths instead of bunching; it tumbles and turns edge-on.
    const PETAL_DELAY = 0.1; // after the tear, the strand starts turning into petals
    // Where and when each petal opens. From a strand: 4 petals along it, from the far end
    // to the root; from the hair tips: 3 petals at the gust.
    const RIDERS = STROKES.filter((s) => !s.screen);
    function planPetals() {
      const list = [], r = W.rng(320);
      for (const s of STROKES) {
        if (!s.catch) continue;
        const tear = tearOf(s);
        for (let j = 0; j < 4; j++) {
          const tb = tear + PETAL_DELAY + 0.07 * j, g = strandAt(s, tb);
          const f = 1 - (j + 0.5) / 4; // far end first
          const at = [lerp(g.root[0], g.end[0], f), lerp(g.root[1], g.end[1], f)];
          // fly where the stroke flies, but slower
          const d = [g.end[0] - g.root[0], g.end[1] - g.root[1]], l = Math.hypot(...d) || 1;
          list.push({ tb, at, dir: [d[0] / l, d[1] / l], speed: 220 + 120 * r(), sprite: Math.floor(r() * 8), size: 0.95 + 0.45 * r(),
            spin: (r() - 0.5) * 5, flip: 4 + r() * 5, ph: r() * 6.28, blur: 0, alpha: 0.85 + 0.15 * r(),
            ...ride(at, tb, r) });
        }
      }
      // straight from the hair tips as the gust hits; one big and soft, near the lens
      for (const [ix, iy, tb, big] of [[720, 330, 0.62, 0], [780, 430, 0.7, 0], [700, 400, 0.78, 1]]) {
        list.push({ tb, at: art(ix, iy), dir: [-0.85, -0.5], speed: 150 + 80 * r(), sprite: Math.floor(r() * 8), size: big ? 1.9 : 0.8 + 0.3 * r(),
          spin: (r() - 0.5) * 4, flip: 4 + r() * 4, ph: r() * 6.28, blur: big ? 3 : 0, alpha: big ? 0.7 : 0.9,
          ...ride(art(ix, iy), tb, r) });
      }
      return list;
    }
    // Where a petal rides in the wind: one of the three strokes passing nearest to where it
    // opens (so the wind never carries it back against itself), its lag behind the stroke's
    // head (share of the curve), how far off the curve, either side, and how much it rises on
    // its own.
    function ride(at, tb, r) {
      const lag = 0.02 + 0.16 * r();
      const near = RIDERS.map((R) => {
        const c = bez(R.P, Math.max(0, Math.min(1, strokeHead(R, tb + 0.2)[1]) - lag));
        return [Math.hypot(c[0] - at[0], c[1] - at[1]), R];
      }).sort((a, b) => a[0] - b[0]);
      return { ride: near[Math.floor(r() * 3)][1], lag, off: (r() < 0.5 ? -1 : 1) * (30 + 120 * r()), rise: 60 + 80 * r() };
    }

    // World point at depth p to frame coords, and the zoom there (the maths of view()).
    function toScreen([x, y], p) {
      const z = 1 + (cam.zoom - 1) * p;
      return [960 + z * (x - 960 - cam.x * p), 540 + z * (y - 540 - cam.y * p), z];
    }

    function drawPetals(ctx, t) {
      for (const q of PETALS) {
        const tau = t - q.tb;
        if (tau <= 0) continue;
        // first it drifts off where it opened (at Rita's depth)
        const push = q.speed * (1 - Math.exp(-tau * 1.6)) / 1.6;
        const free = toScreen([q.at[0] + q.dir[0] * push, q.at[1] + q.dir[1] * push], 1);
        // then the wind picks it up: it slides onto its place in the wake of its stroke, at the
        // stroke's depth (smaller far away, bigger and softer near the lens)
        const R = q.ride, u = Math.max(0, Math.min(1, strokeHead(R, t)[1]) - q.lag);
        const a = bez(R.P, Math.max(0, u - 0.004)), b = bez(R.P, Math.min(1, u + 0.004)), c = bez(R.P, u);
        const nl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / nl, ny = (b[0] - a[0]) / nl;
        const off = q.off + R.wave * Math.sin(u * 14 - t * 9 + R.seed); // the same ripple as the ribbon
        // lighter than the ink, it keeps rising a little where the stroke slows down
        const rode = toScreen([c[0] + nx * off, c[1] + ny * off - q.rise * tau * tau], R.p);
        const pick = ease.draw(clamp01(tau / 0.45));
        const x = lerp(free[0], rode[0], pick) + 16 * Math.sin(tau * 5.3 + q.ph);
        const y = lerp(free[1], rode[1], pick) + 9 * Math.sin(tau * 7.1 + q.ph * 1.7);
        const z = lerp(free[2], rode[2], pick), blur = q.blur + Math.max(0, (R.p - 1.1) * 12) * pick;
        const open = ease.out(clamp01(tau / 0.18)); // it opens out of the strand
        const flip = Math.cos(tau * q.flip + q.ph); // turning edge-on and back
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(x, y);
        ctx.rotate(q.ph + tau * q.spin);
        ctx.scale(z * q.size * open * (0.15 + 0.85 * Math.abs(flip)), z * q.size * open);
        ctx.globalAlpha = q.alpha * Math.min(1, tau / 0.1) * (R.p < 0.9 ? lerp(1, 0.75, pick) : 1);
        ctx.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none';
        ctx.drawImage(PETAL_ART[q.sprite], -36, -36);
      }
      ctx.globalAlpha = 1;
      ctx.filter = 'none';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    const clamp01 = (x) => Math.min(1, Math.max(0, x));
    let PETAL_ART, PETALS;

    // White paper closes the frame from the right with a ragged wet edge.
    function paperWipe(ctx, t) {
      if (!opt.wipe) return;
      const k = ease.draw(progress(t, 2.08, 2.48));
      if (k <= 0) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const edge = lerp(2150, -250, k), r = W.rng(77), pts = [];
      for (let y = -40; y <= 1120; y += 40) pts.push([edge + 120 * Math.sin(y * 0.006 + 1.3) + 60 * (r() - 0.5) - (y / 1080) * 180, y]);
      const poly = [...pts, [2200, 1120], [2200, -40]];
      ctx.fillStyle = PAPER;
      ctx.filter = 'blur(10px)';
      W.fillPoly(ctx, poly);
      ctx.filter = 'none';
      W.fillPoly(ctx, poly.map(([x, y], i) => (i < pts.length ? [x + 28, y] : [x, y])));
    }

    // ---------- the ink drop that opens the video ----------

    // A drop falls onto bare paper (0-0.1 s), spreads as a blot and the place comes through
    // from it (to 0.95 s): paper with a ragged hole that grows from the drop.
    const DROP = [1180, 560];
    function inkDrop(ctx, T) {
      if (T >= 1.0) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const k = ease.draw(progress(T, 0.08, 0.95)), r = W.rng(91);
      const pts = [];
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const rad = k * 1500 * (0.8 + 0.35 * (0.5 + 0.5 * DH.noise(i * 0.7, 3)) + 0.12 * r());
        pts.push([DROP[0] + Math.cos(a) * rad, DROP[1] + Math.sin(a) * rad * 0.8]);
      }
      // paper everywhere except the growing hole (even-odd: frame rectangle minus the blot)
      ctx.beginPath();
      ctx.rect(-100, -100, 2120, 1280); // past the frame: the blur would thin the paper at the border
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = PAPER;
      ctx.filter = 'blur(14px)';
      ctx.fill('evenodd');
      ctx.filter = 'none';
      // the drop itself: falls in (big and soft, then small and sharp), then spreads into a
      // pale soft blot over the place coming through and thins out
      const f = Math.min(1, T / 0.1), spread = ease.out(progress(T, 0.1, 0.6));
      const rad = T < 0.1 ? lerp(40, 9, f) : lerp(9, 260, spread);
      const a = T < 0.1 ? 0.3 + 0.6 * f : 0.9 * (1 - spread);
      if (a > 0.01) {
        ctx.fillStyle = W.rgba(INK, a);
        ctx.filter = `blur(${T < 0.1 ? lerp(10, 0.5, f) : lerp(0.5, 60, spread)}px)`;
        ctx.beginPath(); ctx.arc(DROP[0], DROP[1], rad, 0, Math.PI * 2); ctx.fill();
        ctx.filter = 'none';
      }
    }

    // Soft blink: the closed-eyes picture fades in over the lids for ~0.45 s from t0.
    function lids(T, t0) {
      const s3 = (x) => x * x * (3 - 2 * x);
      if (T < t0 || T > t0 + 0.46) return 0;
      if (T < t0 + 0.14) return s3((T - t0) / 0.14);
      if (T < t0 + 0.22) return 1;
      return 1 - s3((T - t0 - 0.22) / 0.24);
    }

    // Rita drawn into the 2D frame (the maths of rig.drawAt, which places the WebGL canvas
    // with CSS instead).
    function drawRita(ctx, o) {
      const z = 1 + (cam.zoom - 1), scale = (z * RITA.h) / rig.H;
      const c = rig.render({ ...o, scale });
      const sx = 960 + z * (RITA.x - 960 - cam.x), sy = 540 + z * (RITA.y - 540 - cam.y);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(c, sx - (rig.anchor[0] + rig.pad) * scale, sy - (rig.anchor[1] + rig.pad) * scale);
    }

    // ---------- frame ----------

    let L, rig, cam;
    function frame(out, T) {
      T = Math.min(Math.max(T, 0), 5 - 1e-6);
      const t = T - 2.5;
      cam = camera(t);
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      drawPlace(L, cam, T);
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.clearRect(0, 0, 1920, 1080);
      const order = STROKES.filter((s) => !s.screen).sort((a, b) => a.p - b.p);
      // strokes behind her go on the back canvas over the place, the rest above her
      for (const s of order) {
        const ctx = s.p < 1 ? bctx : fctx;
        drawStroke(ctx, s, t);
        drawStrand(ctx, s, t);
      }
      drawPetals(fctx, t);
      place(fctx, L.pine.canvas, L.pine.ox, L.pine.oy, cam, 1.7);
      for (const s of STROKES) if (s.screen) drawStroke(fctx, s, t);
      paperWipe(fctx, t);
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.drawImage(back, 0, 0);
      const gk = gust(t);
      drawRita(out, { t: T, gust: gk, wind: 1 + 0.8 * gk, swap: { to: 'blink', k: lids(T, 2.2) } });
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.drawImage(fx, 0, 0);
      inkDrop(out, T);
      out.setTransform(1, 0, 0, 1, 0, 0);
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    rig = await DH.rig.load(DH.ritaArt.a, { base: opt.base ?? '../../', paper: PAPER });
    L = paintPlace();
    PETAL_ART = paintPetals();
    PETALS = planPetals();
    return { DURATION: 5, frame };
  };
})(window);
