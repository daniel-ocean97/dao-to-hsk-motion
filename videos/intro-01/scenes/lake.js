// intro-01: the lake with the rock and the pine, where Rita stands in the prologue (morning)
// and in the return and the finale (dawn). As in videos/probe-landscape, painted by code with
// shared/watercolor.js; each layer is painted once, the camera moves the layers at their depth.
(function (g) {
  const DH = g.DH, W = DH.wc;

  const HORIZON = 700, X0 = -400, X1 = 2400;
  // the palettes of videos/probe-landscape; skyHigh: the sky above the frame (the camera
  // flies up into it in the gust)
  const PALETTES = {
    morning: {
      skyHigh: '#f6f4ef', skyTop: '#f5f2ec', skyLow: '#e4e6e8', far: ['#aeb6c2', '#8f9aab'], mid: ['#7d8593', '#5b6370'],
      water: '#c3cad2', mist: '#f2f1ee',
    },
    dawn: {
      skyHigh: '#f2ece8', skyTop: '#f3ece6', skyLow: '#efd7d2', far: ['#c6b3b4', '#ab9599'], mid: ['#8c7d84', '#6b5c64'],
      water: '#d6c3c0', mist: '#f6e6e2', sun: { x: 900, y: 612, rad: 52 },
    },
  };

  // Paint the layers once. rock: { x, w, seed, dawn } of W.rock under Rita.
  function paint(PAL, rock) {
    const L = {}, ox = X0, w = X1 - X0;
    // the sky is painted taller than the frame: the camera flies up into it
    const sc = W.canvas(1920 * 2, 2600), sx = sc.getContext('2d');
    const g = sx.createLinearGradient(0, 0, 0, 2600);
    g.addColorStop(0, PAL.skyHigh); g.addColorStop(0.62, PAL.skyTop); g.addColorStop(0.92, PAL.skyLow);
    sx.fillStyle = g; sx.fillRect(0, 0, sc.width, sc.height);
    L.sky = { c: sc, ox: -960, oy: -1700, p: 0.05 };
    const far = W.ridge({ x0: X0, x1: X1, base: 615, jag: 10, seed: 3, peaks: W.peakRow({ x0: X0, x1: X1, hMin: 110, hMax: 290, gap: 320, seed: 53 }) });
    const mid = W.ridge({ x0: X0, x1: X1, base: 695, jag: 14, seed: 5, peaks: W.peakRow({ x0: X0, x1: X1, hMin: 70, hMax: 250, gap: 380, seed: 65 }) });
    L.far = { c: W.mountains({ w, h: 520, ox, oy: 260, ridge: far, color: PAL.far[0], under: PAL.skyLow, deep: PAL.far[1], fadeTo: 700, seed: 3 }), ox, oy: 260, p: 0.25, ridge: far };
    if (PAL.sun) L.sun = { ...W.sun(PAL.sun), p: 0.15 };
    L.mid = { c: W.mountains({ w, h: 560, ox, oy: 380, ridge: mid, color: PAL.mid[0], under: PAL.skyLow, deep: PAL.mid[1], fadeTo: 770, ink: 16, inkColor: '#3e3a36', seed: 5 }), ox, oy: 380, p: 0.55 };
    const wc = W.canvas(w, 520), wx = wc.getContext('2d');
    wx.translate(-ox, -HORIZON);
    W.wash(wx, [[X0, HORIZON, 0.01], [X1, HORIZON, 0.01], [X1, HORIZON + 520, 0.05], [X0, HORIZON + 520, 0.05]], PAL.water, { layers: 18, alpha: 0.06, seed: 31 });
    const r = W.rng(32);
    wx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 90; i++) {
      const y = HORIZON + 8 + Math.pow(r(), 1.6) * 400, x = X0 + r() * w, len = 60 + r() * 260;
      W.dryStroke(wx, [[x, y], [x + len * 0.5, y + 1], [x + len, y]], 2 + r() * 4, '#000000', { alpha: 0.5, hairs: 2, dry: 0.5, seed: 40 + i });
    }
    // a soft top edge: when the camera flies up, the water slides away from the mountains
    // (parallax) and a hard edge would show
    wx.globalCompositeOperation = 'destination-out';
    wx.setTransform(1, 0, 0, 1, 0, 0);
    const fade = wx.createLinearGradient(0, 0, 0, 70);
    fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    wx.fillStyle = fade; wx.fillRect(0, 0, w, 70);
    L.water = { c: wc, ox, oy: HORIZON, p: 0.8 };
    // reflection of the mountains, flipped at the horizon, soft (as in probe-landscape)
    const rc = W.canvas(w, 360), rx = rc.getContext('2d');
    rx.filter = 'blur(5px)';
    rx.globalAlpha = 0.22;
    for (const k of ['far', 'mid']) {
      // a row at world y lands at (HORIZON - y) * 0.75 below the horizon
      const l = L[k];
      rx.setTransform(1, 0, 0, -0.75, l.ox - ox, 0.75 * (HORIZON - l.oy));
      rx.drawImage(l.c, 0, 0);
    }
    L.reflect = { c: rc, ox, oy: HORIZON, p: 0.8 };
    L.mistFar = { c: W.mistBand({ w: w + 800, h: 120, color: PAL.mist, seed: 13 }), ox: ox - 400, oy: 600, p: 0.35, speed: 9 };
    L.mistLow = { c: W.mistBand({ w: w + 800, h: 130, color: PAL.mist, seed: 17 }), ox: ox - 400, oy: 640, p: 0.8, speed: -14 };
    L.rock = W.rock({ y: 1012, ...rock });
    L.pine = W.pineBranch({ x: -160, y: -60, scale: 1.2, seed: 5, blur: 4 });
    L.pal = PAL;
    return L;
  }

  // Transform for world point space seen by camera cam at depth p (the same maths as DH.ink.layer).
  function view(ctx, cam, p) {
    const z = 1 + (cam.zoom - 1) * p;
    ctx.setTransform(z, 0, 0, z, 960 + z * (-960 - cam.x * p), 540 + z * (-540 - cam.y * p));
    return z;
  }
  function place(ctx, img, ox, oy, cam, p) {
    view(ctx, cam, p);
    ctx.transform(1, 0, 0, 1, ox, oy);
    ctx.drawImage(img, 0, 0);
  }

  // World points at depth p -> frame coords for camera cam.
  function toFrame(pts, cam, p) {
    const z = 1 + (cam.zoom - 1) * p;
    return pts.map(([x, y]) => [960 + z * (x - 960 - cam.x * p), 540 + z * (y - 540 - cam.y * p)]);
  }

  // The sun goes behind the far ridge: the ridge's wash fades into the mist downwards and
  // would let it show through like glass, so the sun is cut along the crest (soft, as a
  // wet edge). sunFrame: the sun drawn alone into a frame-sized canvas.
  const sunFrame = W.canvas(1920, 1080), sf = sunFrame.getContext('2d');
  function sunBehindRidge(ctx, L, cam, sunY) {
    sf.setTransform(1, 0, 0, 1, 0, 0);
    sf.clearRect(0, 0, 1920, 1080);
    place(sf, L.sun.canvas, L.sun.ox, L.sun.oy + sunY, cam, L.sun.p);
    sf.setTransform(1, 0, 0, 1, 0, 0);
    sf.globalCompositeOperation = 'destination-out';
    sf.filter = 'blur(1.5px)';
    sf.fillStyle = '#000';
    W.fillPoly(sf, [...toFrame(L.far.ridge.map(([x, y]) => [x, y + 4]), cam, L.far.p), [2400, 1200], [-400, 1200]]);
    sf.filter = 'none';
    sf.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(sunFrame, 0, 0);
  }

  // Backlight: where the sun is behind the crest, the crest glows, a warm rim of light that
  // is brightest next to the sun and strongest while the sun is still low (it is clearing
  // the ridge); a faint bloom spills over the crest into the sky.
  function rimLight(ctx, L, cam, sunY) {
    const s = L.pal.sun, z = 1 + (cam.zoom - 1) * L.sun.p;
    const cx = 960 + z * (s.x - 960 - cam.x * L.sun.p), cy = 540 + z * (s.y + sunY - 540 - cam.y * L.sun.p), R = s.rad * z;
    const ridge = toFrame(L.far.ridge, cam, L.far.p), reach = R * 3.2;
    // h: how much of the sun is behind the crest under it (0: its lower edge touches the
    // crest, 1: hidden). The rim burns while it is hidden or half out, and fades as the sun
    // clears the crest by half its size.
    let crest = Infinity;
    for (const [x, y] of ridge) if (Math.abs(x - cx) < R) crest = Math.min(crest, y);
    if (crest === Infinity) return;
    const h = (cy + R - crest) / (2 * R);
    const k = h >= 0 ? DH.clamp(1 - (h - 1.2) / 0.8) : DH.clamp(1 + h * 2);
    if (k <= 0.01) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineJoin = ctx.lineCap = 'round';
    for (const [width, blur, color, alpha] of [[16, 9, '#f3d4c4', 0.35], [3.2, 0.8, '#fbeee4', 0.9]]) {
      ctx.filter = `blur(${blur}px)`;
      ctx.lineWidth = width;
      for (let i = 0; i < ridge.length - 1; i++) {
        const [ax, ay] = ridge[i], [bx, by] = ridge[i + 1];
        const d = Math.hypot((ax + bx) / 2 - cx, (ay + by) / 2 - cy);
        if (d > reach) continue;
        const a = alpha * k * Math.pow(1 - d / reach, 1.6);
        ctx.strokeStyle = W.rgba(color, a);
        ctx.beginPath(); ctx.moveTo(ax, ay + 1); ctx.lineTo(bx, by + 1); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Draw the place for camera cam at time t (mist drifts; the reflection ripples).
  // sunY: how far below its painted place the sun is (it rises in the finale).
  function draw(ctx, L, cam, t, sunY = 0) {
    const PAL = L.pal;
    // start from the low sky colour, as probe-landscape: the sky does not reach the bottom
    // of the frame, and where the water and the rock are thin the last frame showed through
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PAL.skyLow;
    ctx.fillRect(0, 0, 1920, 1080);
    place(ctx, L.sky.c, L.sky.ox, L.sky.oy, cam, L.sky.p);
    if (L.sun) {
      // only above the water line (seen at the water's depth): lowered, the sun would show
      // through the thin water
      const zw = 1 + (cam.zoom - 1) * 0.8, hz = 540 + zw * (HORIZON - 540 - cam.y * 0.8);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath(); ctx.rect(0, 0, 1920, hz); ctx.clip();
      sunBehindRidge(ctx, L, cam, sunY);
      ctx.restore();
    }
    place(ctx, L.far.c, L.far.ox, L.far.oy, cam, L.far.p);
    if (L.sun) rimLight(ctx, L, cam, sunY);
    // mist drifts slowly; no wrap-around: the bands are 1700 px wider than the frame and in
    // 20 s they move at most ~280 px (a modulo made the band jump when t changed sign)
    { const m = L.mistFar; place(ctx, m.c, m.ox + t * m.speed, m.oy, cam, m.p); }
    place(ctx, L.mid.c, L.mid.ox, L.mid.oy, cam, L.mid.p);
    place(ctx, L.water.c, L.water.ox, L.water.oy, cam, L.water.p);
    // reflection ripples: thin slices drawn with a small sideways wave
    const R = L.reflect, z = 1 + (cam.zoom - 1) * R.p;
    for (let y = 0; y < R.c.height; y += 4) {
      const dx = Math.sin(y * 0.11 + t * 2.2) * (1 + y * 0.02) + Math.sin(y * 0.031 - t * 1.3) * 2;
      ctx.setTransform(z, 0, 0, z, 960 + z * (R.ox + dx - 960 - cam.x * R.p), 540 + z * (R.oy + y - 540 - cam.y * R.p));
      ctx.drawImage(R.c, 0, y, R.c.width, 4, 0, 0, R.c.width, 4);
    }
    { const m = L.mistLow; place(ctx, m.c, m.ox + t * m.speed, m.oy, cam, m.p); }
    place(ctx, L.rock.canvas, L.rock.ox, L.rock.oy, cam, 1);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }


  g.LAKE = { PALETTES, paint, draw, view, place, HORIZON };
})(window);
