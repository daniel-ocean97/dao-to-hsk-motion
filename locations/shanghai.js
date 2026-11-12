// Shanghai (上海): the camera moves to Pudong at night, windows light up, the lamps of the
// embankment come on in a wave, the sky pales to dawn; 上海 in light ink in the night sky.
// Slot: night. Probe: videos/probe-places/?place=shanghai
(function () {
  function setup(k) {
    const { W, D, out, LX, LY, LW, LH, LAYERS, DURATION, INK, INK2, place, view, show, masked, smooth, sky, range, mist, skylineOf, caption, camera } = k;
    const { rgba, wash, dryStroke, taper, fillPoly, rng } = W;
    let ctx; // the context of the layer being painted
    const begin = (...a) => { const layer = k.begin(...a); ctx = layer.c.getContext('2d'); return layer; };

    // Pudong silhouettes (approximate, to be checked against photos):
    //   Oriental Pearl: three legs, a big sphere low and a smaller one high, a spire;
    //   Jin Mao: stepped pagoda-like tower with a spire;
    //   Shanghai World Financial Center: tapering slab with a trapezoid opening at the top;
    //   Shanghai Tower: twisting, tapering cylinder, the tallest.
    // Every building is painted like the mountains: an opaque underlay so the sky does not
    // show through, glazes with a slightly ragged edge, the shaded side darker, warm city
    // glow at the foot, then granulation, a few backruns and a broken ink outline.

    const lit = new Path2D();
    function addLit(poly) {
      poly.forEach(([x, y], i) => (i ? lit.lineTo(x, y) : lit.moveTo(x, y)));
      lit.closePath();
    }

    // Split long edges into short ones: wash() roughens an edge in proportion to its length,
    // so a 500 px side of a tower would otherwise spill a wide pale halo into the sky.
    function densify(poly, step = 14) {
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
        for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
      }
      return out;
    }

    // Lights of buildings behind must not shine through one in front: before painting a
    // front building, erase its shape from the window and glow buckets.
    function hideLights(poly) {
      for (const b of [...winB, ...glowB]) {
        b.x.save();
        b.x.globalCompositeOperation = 'destination-out';
        b.x.fillStyle = '#000';
        fillPoly(b.x, poly);
        b.x.restore();
      }
    }

    function building(c, poly, { color, shade, seed, under = '#3d4459', edge = 0.06, ink = true }) {
      addLit(poly);
      if (ink) hideLights(poly);
      const xs = poly.map(([x]) => x), ys = poly.map(([, y]) => y);
      const xMin = Math.min(...xs), xMax = Math.max(...xs), yMin = Math.min(...ys), yMax = Math.max(...ys);
      c.fillStyle = under;
      fillPoly(c, poly);
      wash(c, densify(poly).map(([x, y]) => [x, y, edge]), color, { layers: 14, alpha: 0.1, seed });
      // shaded side: the right part of the building, its own ragged glaze
      const sx = xMin + (xMax - xMin) * 0.58;
      c.save();
      c.beginPath(); poly.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip();
      wash(c, [[sx, yMin - 10, 0.05], [xMax + 10, yMin - 10, 0.05], [xMax + 10, yMax, 0.05], [sx + 4, yMax, 0.05]], shade, { layers: 10, alpha: 0.09, seed: seed + 1 });
      // warm glow of the streets at the foot
      const gl = c.createLinearGradient(0, yMax - (yMax - yMin) * 0.45, 0, yMax);
      gl.addColorStop(0, 'rgba(224,183,125,0)');
      gl.addColorStop(1, 'rgba(224,183,125,0.22)');
      c.fillStyle = gl;
      c.fillRect(xMin - 10, yMin, xMax - xMin + 20, yMax - yMin);
      c.restore();
      if (ink) {
        // broken ink outline: each edge a separate one-hair stroke with gaps
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i], b = poly[(i + 1) % poly.length];
          if (Math.abs(a[1] - b[1]) < 1 && a[1] > yMax - 2) continue; // no line along the ground
          const pts = [];
          for (let k = 0; k <= 10; k++) pts.push([a[0] + (b[0] - a[0]) * k / 10, a[1] + (b[1] - a[1]) * k / 10]);
          dryStroke(c, pts, 1.6, '#1d2130', { alpha: 0.55, hairs: 1, dry: 0.45, seed: seed + 10 + i });
        }
      }
    }

    // Windows go into a few buckets that light up one after another. Each bucket keeps the
    // sharp lights and a copy for the glow, blurred once after painting.
    const NB = 4;
    const winB = Array.from({ length: NB }, () => { const c = W.canvas(LW, LH), x = c.getContext('2d'); x.translate(-LX, -LY); return { c, x }; });
    const glowB = Array.from({ length: NB }, () => { const c = W.canvas(LW, LH), x = c.getContext('2d'); x.translate(-LX, -LY); return { c, x }; });
    const gx = glowB[0].x; // the Pearl and other steady lights
    // Small life of the night, drawn per frame: windows that go on and off, stars, the red
    // warning lights on the tops of the towers (world coords, the depth of the city).
    const TWINKLE = [];
    const STARS = (() => {
      const r = rng(950), a = [];
      for (let i = 0; i < 60; i++) a.push({ x: -100 + r() * 2120, y: -40 + 470 * Math.pow(r(), 1.6), r: 0.7 + r() * 0.9, a: 0.2 + 0.35 * r(), ph: r() * 6.283, rate: 2 + r() * 3 });
      return a;
    })();
    const BEACONS = [[640, 160], [1090, 320], [1241, 120], [1402, 240], [1438, 240]];

    // Lit windows in floors: dabs on a grid inside the building, some floors dark.
    function windows(c, poly, { seed, density = 0.35, step = [8, 11] }) {
      const r = rng(seed), path = new Path2D();
      poly.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
      path.closePath();
      const xs = poly.map(([x]) => x), ys = poly.map(([, y]) => y);
      for (let y = Math.min(...ys) + 8; y < Math.max(...ys) - 4; y += step[1]) {
        const floorOn = r() < 0.8;
        for (let x = Math.min(...xs) + 5; x < Math.max(...xs) - 3; x += step[0]) {
          if (!floorOn || r() > density || !c.isPointInPath(path, x - LX, y - LY)) continue;
          const col = r() < 0.75 ? '#f2c886' : '#f6ddd2', a = 0.45 + 0.5 * r();
          const ex = x + (r() - 0.5) * 1.5, rx = 1.9 + r() * 1.3, ry = 1.4 + r() * 0.6;
          // nearer the bottom-centre lights come on first, as the camera approaches
          const b = Math.min(NB - 1, Math.floor(r() * NB));
          winB[b].x.fillStyle = rgba(col, a);
          winB[b].x.beginPath(); winB[b].x.ellipse(ex, y, rx, ry, 0, 0, Math.PI * 2); winB[b].x.fill();
          glowB[b].x.fillStyle = rgba(col, a);
          glowB[b].x.beginPath(); glowB[b].x.ellipse(ex, y, rx * 1.4, ry * 1.6, 0, 0, Math.PI * 2); glowB[b].x.fill();
        }
      }
      // a few more windows that go on and off while we look (their own random sequence, so
      // the painted ones stay as they were)
      const r2 = rng(seed + 7000);
      for (let y = Math.min(...ys) + 8; y < Math.max(...ys) - 4; y += step[1]) {
        for (let x = Math.min(...xs) + 5; x < Math.max(...xs) - 3; x += step[0]) {
          if (r2() > 0.022 || !c.isPointInPath(path, x - LX, y - LY)) continue;
          TWINKLE.push({ x, y, rx: 1.9 + r2() * 1.3, ry: 1.4 + r2() * 0.6, col: r2() < 0.75 ? '#f2c886' : '#f6ddd2', ph: r2() * 6.283, period: 1.3 + r2() * 1.8 });
        }
      }
    }

    function paintShanghai() {
      const HZ = 760;
      // two skies: night, and the same night beginning to pale towards dawn
      for (const [name, top, low, band, haze] of [['sky', '#3b4560', '#8c8597', '#2f3852', '#b69aa0'], ['skyDawn', '#5a6582', '#c9aeb1', '#4b5672', '#e6c3bd']]) {
        begin(name, 0);
        sky(top, low, HZ);
        const skc = W.canvas(LW, HZ + 150), sx = skc.getContext('2d');
        sx.translate(-LX, -LY);
        for (let i = 0; i < 4; i++) {
          const y0 = i * 170 - 40;
          wash(sx, [[-300, y0, 0.05], [2220, y0 + 30, 0.05], [2220, y0 + 260, 0.08], [-300, y0 + 230, 0.08]], i < 2 ? band : '#7b7290', { layers: 10, alpha: 0.05, seed: 200 + i });
        }
        wash(sx, [[-300, HZ - 220, 0.08], [2220, HZ - 260, 0.08], [2220, HZ + 40, 0.03], [-300, HZ + 40, 0.03]], haze, { layers: 12, alpha: 0.05, seed: 210 });
        // soft, so the bands read as haze and clouds, not as mountain ridges
        ctx.filter = 'blur(26px)';
        ctx.drawImage(skc, LX, LY);
        ctx.filter = 'none';
      }

      begin('city', 0.45);
      const sk = W.canvas(LW, LH), c = sk.getContext('2d'), r = rng(111);
      c.translate(-LX, -LY);
      // far mass of buildings in the haze, pale, no outline
      for (let i = 0; i < 52; i++) {
        const x = -200 + r() * 2320, w = 30 + r() * 70, h = 60 + r() * 210;
        const poly = [[x, HZ], [x, HZ - h], [x + w, HZ - h], [x + w, HZ]];
        building(c, poly, { color: '#6a6b80', shade: '#4e5068', seed: 120 + i * 3, under: '#5b5d72', edge: 0.02, ink: false });
        windows(c, poly, { seed: 400 + i, density: 0.32 });
      }
      W.granulate(c, LW, LH, 0.2);
      ctx.drawImage(sk, LX, LY);
      mist(HZ - 110, 170, '#9d95a3', 113, 0.65);

      const fg = W.canvas(LW, LH), f = fg.getContext('2d');
      f.translate(-LX, -LY);
      // Jin Mao: stepped tower with a spire
      const jm = { x: 1090, h: 440 }, steps = [];
      for (let k = 0; k < 8; k++) { const y0 = HZ - k * 45, w = 96 - k * 9; steps.push([jm.x - w / 2, y0], [jm.x - w / 2, y0 - 45]); }
      const jmPoly = [...steps, [jm.x, HZ - jm.h], ...steps.slice().reverse().map(([x, y]) => [2 * jm.x - x, y])];
      building(f, jmPoly, { color: '#6f6f86', shade: '#3f4258', seed: 133 });
      windows(f, jmPoly, { seed: 501, density: 0.55, step: [7, 9] });
      // Shanghai Tower: tapering, twisting, with a spiral seam
      const st = { x: 1240, w0: 120, w1: 52, h: 640 }, stL = [], stR = [];
      for (let i = 0; i <= 20; i++) {
        const u = i / 20, w = st.w0 + (st.w1 - st.w0) * u;
        stL.push([st.x - w / 2 + Math.sin(u * 3) * 6, HZ - u * st.h]);
        stR.push([st.x + w / 2 + Math.sin(u * 3) * 6, HZ - u * st.h]);
      }
      const stPoly = [...stL, ...stR.reverse()];
      building(f, stPoly, { color: '#6c7a93', shade: '#3d4a62', seed: 131 });
      windows(f, stPoly, { seed: 502, density: 0.5, step: [7, 10] });
      const seam = [];
      for (let i = 0; i <= 30; i++) { const u = i / 30, w = st.w0 + (st.w1 - st.w0) * u; seam.push([st.x + Math.sin(u * 3) * 6 + Math.sin(u * 7) * w * 0.45, HZ - u * st.h]); }
      dryStroke(f, seam, 1.8, '#c9cad6', { alpha: 0.4, hairs: 1, dry: 0.3, seed: 509 });
      // SWFC: slab tapering to a top with a trapezoid opening
      const sw = { x: 1420, w0: 130, w1: 40, h: 520 };
      const swPoly = [[sw.x - sw.w0 / 2, HZ], [sw.x - sw.w1 / 2, HZ - sw.h], [sw.x + sw.w1 / 2, HZ - sw.h], [sw.x + sw.w0 / 2, HZ]];
      building(f, swPoly, { color: '#77809a', shade: '#454d66', seed: 132 });
      windows(f, swPoly, { seed: 503, density: 0.5, step: [7, 10] });
      const hy = HZ - sw.h + 22, hole = [[sw.x - 17, hy], [sw.x - 12, hy + 36], [sw.x + 12, hy + 36], [sw.x + 17, hy]];
      f.save();
      f.globalCompositeOperation = 'destination-out';
      fillPoly(f, hole);
      f.restore();
      hideLights(hole); // no windows inside the opening
      dryStroke(f, [...hole, hole[0]], 1.6, '#1d2130', { alpha: 0.6, hairs: 1, dry: 0.1, seed: 510 });
      // Oriental Pearl: tapered legs and shaft, painted spheres with a light side
      const op = { x: 640 };
      const pole = (a, b, w0, w1, sd) => {
        const pts = [];
        for (let k = 0; k <= 10; k++) pts.push([a[0] + (b[0] - a[0]) * k / 10, a[1] + (b[1] - a[1]) * k / 10]);
        const poly = taper(pts, (u) => w0 + (w1 - w0) * u).map(([x, y]) => [x, y, 0.01]);
        hideLights(poly);
        f.fillStyle = '#2b3140';
        fillPoly(f, poly);
        wash(f, poly, '#55506a', { layers: 8, alpha: 0.12, seed: sd, rough: 0.005 });
      };
      // the legs and the shaft stand on the ground of the embankment (its park hides their
      // feet), not on the old waterline: the legs spread a little wider on the way down
      for (const [dx, sd] of [[-62, 601], [62, 602]]) pole([op.x + dx * 1.18, PROM - 4], [op.x + dx * 0.12, HZ - 235], 16, 9, sd);
      pole([op.x, PROM - 4], [op.x, HZ - 235], 18, 14, 603);
      pole([op.x, HZ - 235], [op.x, HZ - 470], 20, 14, 604);
      pole([op.x, HZ - 470], [op.x, HZ - 600], 6, 2, 605);
      for (const [y, rad, sd] of [[HZ - 232, 62, 611], [HZ - 432, 36, 612], [HZ - 506, 14, 613]]) {
        const circle = Array.from({ length: 16 }, (_, i) => [op.x + Math.cos(i / 16 * 6.283) * rad, y + Math.sin(i / 16 * 6.283) * rad, 0.02]);
        hideLights(circle);
        f.fillStyle = '#3a3346';
        fillPoly(f, circle);
        wash(f, circle, '#a0566e', { layers: 16, alpha: 0.12, seed: sd });
        // light side: lift pigment on the upper left
        f.save();
        f.globalCompositeOperation = 'destination-out';
        f.filter = `blur(${rad * 0.25}px)`;
        f.fillStyle = 'rgba(0,0,0,0.35)';
        f.beginPath(); f.ellipse(op.x - rad * 0.35, y - rad * 0.35, rad * 0.45, rad * 0.35, -0.6, 0, Math.PI * 2); f.fill();
        f.restore();
        f.fillStyle = rgba('#f0d4cf', 0.18);
        f.beginPath(); f.ellipse(op.x - rad * 0.35, y - rad * 0.35, rad * 0.35, rad * 0.25, -0.6, 0, Math.PI * 2); f.fill();
        dryStroke(f, [...circle, circle[0]].map(([x, yy]) => [x, yy]), 1.8, '#1d2130', { alpha: 0.5, hairs: 1, dry: 0.35, seed: sd + 20 });
        // the spheres are lit: their glow is steady (bucket 0)
        gx.fillStyle = 'rgba(214,120,150,0.55)';
        gx.beginPath(); gx.arc(op.x, y, rad, 0, Math.PI * 2); gx.fill();
      }
      W.granulate(f, LW, LH, 0.18);
      W.blooms(f, [[1090, HZ - 300], [1240, HZ - 420], [1420, HZ - 320], [640, HZ - 260]], 520, 5);
      ctx.drawImage(fg, LX, LY);

      // windows and glows: each bucket a layer of its own at the depth of the city
      winB.forEach((b, i) => { LAYERS['win' + i] = { c: b.c, p: 0.45 }; });
      glowB.forEach((b, i) => {
        // tint warm: blurred mixed dots otherwise turn milky white
        b.x.save();
        b.x.setTransform(1, 0, 0, 1, 0, 0);
        b.x.globalCompositeOperation = 'source-atop';
        b.x.fillStyle = 'rgba(240,160,95,0.55)';
        b.x.fillRect(0, 0, LW, LH);
        b.x.restore();
        for (const [name, blur] of [['glowW', 30], ['glowN', 6]]) {
          const c2 = W.canvas(LW, LH), x2 = c2.getContext('2d');
          x2.filter = `blur(${blur}px)`;
          x2.drawImage(b.c, 0, 0);
          LAYERS[name + i] = { c: c2, p: 0.45 };
        }
        // reflection in the river: flipped and squashed, the foot of the city at the
        // waterline under the embankment, very soft
        const c3 = W.canvas(LW, LH), x3 = c3.getContext('2d');
        x3.filter = 'blur(22px)';
        x3.setTransform(1, 0, 0, -0.7, 0, (WL - LY) + 0.7 * (HZ - LY));
        x3.drawImage(b.c, 0, 0);
        LAYERS['refl' + i] = { c: c3, p: 0.8 };
      });

      // the warm haze rising from the streets: steady
      begin('haze', 0.45);
      const haze = ctx.createLinearGradient(0, HZ - 360, 0, HZ + 20);
      haze.addColorStop(0, 'rgba(232,170,120,0)');
      haze.addColorStop(1, 'rgba(232,170,120,0.28)');
      ctx.fillStyle = haze;
      ctx.fillRect(LX, HZ - 360, LW, 380);

      // the Huangpu: dark water glazes, broken reflections of the lights, light streaks.
      // It starts under the embankment (paintShore) and its top edge stays hidden behind it.
      begin('water', 0.8);
      const wpoly = densify([[-300, WL - 22], [2220, WL - 22], [2220, 1220], [-300, 1220]], 40).map(([x, y]) => [x, y, y < 1000 ? 0.01 : 0.03]);
      ctx.fillStyle = '#434a60';
      fillPoly(ctx, wpoly);
      wash(ctx, wpoly, '#2f3650', { layers: 14, alpha: 0.08, seed: 160 });
      const r3 = rng(150);
      for (let i = 0; i < 60; i++) {
        const y = WL + 8 + Math.pow(r3(), 1.4) * 280, x = -240 + r3() * 2400, len = 60 + r3() * 260;
        dryStroke(ctx, [[x, y], [x + len / 2, y + 1], [x + len, y]], 2 + r3() * 2, '#9aa0b4', { alpha: 0.22, hairs: 2, dry: 0.5, seed: 170 + i });
      }
      begin('dabs', 0.8);
      for (const [cx, spread] of [[640, 70], [1090, 40], [1240, 50], [1420, 50], [900, 260], [1700, 160], [300, 200]]) {
        for (let i = 0; i < 46; i++) {
          const y = WL + 6 + Math.pow(r3(), 1.3) * 200, x = cx + r3.gauss() * spread * (0.4 + (y - WL) / 260);
          const len = 6 + r3() * 26;
          ctx.fillStyle = rgba(r3() < 0.7 ? '#efc485' : '#f3d8cf', 0.12 + 0.3 * r3() * (1 - (y - WL) / 260));
          ctx.beginPath(); ctx.ellipse(x, y, len, 1.4, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      paintShore(HZ);
      begin('mistW', 0.8);
      mist(WL + 6, 60, '#9a93a6', 115, 0.32);
      RIDGE = skylineOf('city'); // the Pudong skyline: the silhouette for the cut
    }

    // The Pudong embankment, so the towers stand on land, not on the water: low buildings
    // and the trees of the riverside park at their feet, a promenade with street lamps, a
    // stone wall down to the water. Layer depth 0.5, just in front of the city (0.45); it
    // is drawn over the top edge of the water (0.8), which the camera moves a little more.
    // The lamps are layers of their own: they light up in a wave along the river.
    const WL = 812, PROM = 792; // the waterline at the foot of the wall; the promenade
    const LAMP_X = [];
    function paintShore(HZ) {
      begin('shore', 0.5);
      const sh = W.canvas(LW, LH), c = sh.getContext('2d'), r = rng(700);
      c.translate(-LX, -LY);
      // street-level light behind the trees: a warm haze over the feet of the towers
      const warm = c.createLinearGradient(0, HZ - 60, 0, PROM);
      warm.addColorStop(0, 'rgba(214,160,118,0)');
      warm.addColorStop(1, 'rgba(214,160,118,0.35)');
      c.fillStyle = warm;
      c.fillRect(LX, HZ - 60, LW, PROM - HZ + 60);
      // low buildings: blocks of shops and offices, a few lit windows; none at the Pearl,
      // which stands in its park with only trees around its legs
      const low = [];
      for (let x = -260; x < 2180;) {
        const w = 50 + r() * 100, h = 36 + r() * 58;
        if (x + w > 540 && x < 740) { x = 740 + r() * 20; continue; }
        low.push([x, w, h]);
        x += w + (r() < 0.3 ? 10 + r() * 30 : -6);
      }
      low.forEach(([x, w, h], i) => {
        const poly = [[x, PROM + 2], [x, PROM - h], [x + w, PROM - h], [x + w, PROM + 2]];
        building(c, poly, { color: '#57586a', shade: '#3b3c4f', under: '#454657', edge: 0.02, seed: 720 + i * 3, ink: false });
        for (let y = PROM - h + 7; y < PROM - 14; y += 8) {
          for (let wx = x + 5; wx < x + w - 4; wx += 7) {
            if (r() > 0.28) continue;
            c.fillStyle = rgba(r() < 0.8 ? '#f2c886' : '#f6ddd2', 0.4 + 0.45 * r());
            c.beginPath(); c.ellipse(wx, y, 1.8, 1.3, 0, 0, Math.PI * 2); c.fill();
          }
        }
        // lit shopfronts along the street
        c.fillStyle = rgba('#e9b98a', 0.3 + 0.25 * r());
        c.fillRect(x + 3, PROM - 12, w - 6, 6);
        dryStroke(c, [[x - 2, PROM - h], [x + w / 2, PROM - h - 0.5], [x + w + 2, PROM - h]], 1.4, '#1d2130', { alpha: 0.5, hairs: 1, dry: 0.45, seed: 760 + i });
      });
      // the riverside park: a low hedge all along, trees in groups with gaps between them
      // (the low buildings show through), round crowns of two or three blobs and a few taller
      // poplar-like ones. Edges split short: a long edge would spill a wide ragged wash.
      const hedge = [];
      for (let x = -300; x <= 2220; x += 22) hedge.push([x, PROM - 10 - r() * 9, 0.12]);
      const hedgePoly = [...hedge];
      for (let x = 2220; x >= -300; x -= 30) hedgePoly.push([x, PROM + 4, 0.01]);
      c.fillStyle = '#2d3535';
      fillPoly(c, hedgePoly);
      wash(c, hedgePoly, '#46524c', { layers: 8, alpha: 0.1, seed: 701 });
      const crown = (cx, cy, rx, ry, sd) => {
        const poly = Array.from({ length: 12 }, (_, k) => [cx + Math.cos(k / 12 * 6.283) * rx, cy + Math.sin(k / 12 * 6.283) * ry, 0.22]);
        c.fillStyle = rgba('#2a3231', 0.85);
        fillPoly(c, poly);
        wash(c, poly, r() < 0.5 ? '#465049' : '#525a4d', { layers: 8, alpha: 0.11, seed: sd });
      };
      for (let x = -280; x < 2200;) {
        const n = 2 + Math.floor(r() * 4);
        for (let k = 0; k < n; k++, x += 18 + r() * 14) {
          const sd = 800 + Math.round(x);
          dryStroke(c, [[x, PROM], [x + r.gauss(), PROM - 20]], 2, '#1d2130', { alpha: 0.6, hairs: 1, dry: 0.2, seed: sd });
          if (r() < 0.2) {
            crown(x, PROM - 42, 7 + r() * 3, 22 + r() * 8, sd);
          } else {
            const rad = 11 + r() * 10, cy = PROM - 20 - rad * 0.8;
            for (let b = 0; b < 3; b++) crown(x + (b - 1) * rad * 0.55, cy - (b === 1 ? rad * 0.35 : 0), rad * 0.75, rad * 0.65, sd + b);
            // lamplight from below on the underside of the crown
            c.fillStyle = 'rgba(214,170,120,0.1)';
            c.beginPath(); c.ellipse(x, cy + rad * 0.45, rad * 0.8, rad * 0.3, 0, 0, Math.PI * 2); c.fill();
          }
        }
        x += 40 + r() * 90;
      }
      W.granulate(c, LW, LH, 0.12);
      // the promenade: pale pavement under the lamps, the railing, the wall into the water
      const wall = densify([[-300, PROM - 1], [2220, PROM - 1], [2220, WL], [-300, WL]], 30).map(([x, y]) => [x, y, 0.01]);
      c.fillStyle = '#383d50';
      fillPoly(c, wall);
      wash(c, wall, '#2c3145', { layers: 10, alpha: 0.1, seed: 702, rough: 0.01 });
      c.fillStyle = rgba('#a59cab', 0.5);
      c.fillRect(LX, PROM - 2, LW, 3);
      for (let i = 0; i < 3; i++) {
        const y = PROM + 6 + i * 5;
        dryStroke(c, [[-240, y], [960, y + 0.6], [2160, y]], 1.1, '#1d2130', { alpha: 0.35, hairs: 1, dry: 0.6, seed: 710 + i });
      }
      dryStroke(c, [[-240, PROM - 7], [960, PROM - 7.5], [2160, PROM - 7]], 1.4, '#1d2130', { alpha: 0.6, hairs: 1, dry: 0.3, seed: 714 });
      c.fillStyle = rgba('#1d2130', 0.45);
      for (let x = -236; x < 2160; x += 14) c.fillRect(x, PROM - 7, 1.2, 6);
      // lamp posts: thin ink, the lamps themselves come later
      for (let x = -230; x < 2160; x += 34 + r() * 8) {
        LAMP_X.push(x);
        dryStroke(c, [[x, PROM], [x, PROM - 22]], 1.6, '#1d2130', { alpha: 0.7, hairs: 1, dry: 0.15, seed: 900 + LAMP_X.length });
      }
      ctx.drawImage(sh, LX, LY);

      // the lamps: a warm dot on each post, the glow around it, a broken column of light on
      // the water under it (the reflection reaches down from the foot of the wall)
      const lamps = begin('lamps', 0.5).c.getContext('2d');
      const lampG = begin('lampGlow', 0.5).c.getContext('2d');
      const lampR = begin('lampRefl', 0.5).c.getContext('2d');
      for (const g of [lamps, lampG, lampR]) g.setTransform(1, 0, 0, 1, -LX, -LY);
      const r2 = rng(901);
      lampG.filter = 'blur(9px)';
      for (const x of LAMP_X) {
        lamps.fillStyle = rgba('#f6ddb0', 0.95);
        lamps.beginPath(); lamps.arc(x, PROM - 23, 2.6, 0, Math.PI * 2); lamps.fill();
        lampG.fillStyle = rgba('#f0b070', 0.75);
        lampG.beginPath(); lampG.arc(x, PROM - 22, 9, 0, Math.PI * 2); lampG.fill();
        lampG.fillStyle = rgba('#f0b070', 0.35);
        lampG.beginPath(); lampG.ellipse(x, PROM - 2, 16, 4, 0, 0, Math.PI * 2); lampG.fill();
        for (let y = WL + 3; y < WL + 70; y += 3 + r2() * 4) {
          const fade = 1 - (y - WL) / 70, w = (2 + r2() * 7) * (0.6 + fade * 0.6);
          lampR.fillStyle = rgba(r2() < 0.8 ? '#efc485' : '#f3d8cf', (0.3 + 0.5 * r2()) * fade);
          lampR.beginPath(); lampR.ellipse(x + r2.gauss() * 2.5, y, w, 1.2, 0, 0, Math.PI * 2); lampR.fill();
        }
      }
      lampG.filter = 'none';
    }

    // Where the wave of lamps has reached at time t (world x), and the mask behind it.
    const lampFront = (t) => DH.lerp(-320, 2240, smooth(DH.progress(t, 0.45, 1.3)));
    // a soft front, so a lamp half way does not cut its own glow in half
    const behind = (x) => (m) => {
      const g = m.createLinearGradient(x - 50, 0, x, 0);
      g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
      m.fillStyle = g; m.fillRect(LX, LY, LW, LH);
    };
    function flash(x) {
      return (m) => {
        const g = m.createLinearGradient(x - 160, 0, x, 0);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.75, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
        m.fillStyle = g; m.fillRect(x - 160, LY, 160, LH);
      };
    }

    // The camera moves towards Pudong with a slow rise; windows light up bucket by bucket and
    // the glow grows with them, the street lamps of the embankment come on in a wave; near
    // the end the sky pales towards dawn and the lights soften.
    function frameShanghai(t) {
      const cam = camera(t);
      const dawn = smooth(DH.progress(t, 1.6, 2.5));
      const on = (i) => smooth(DH.progress(t, 0.1 + i * 0.32, 0.55 + i * 0.32)) * (1 - 0.4 * dawn);
      show('sky', cam);
      show('skyDawn', cam, dawn);
      // the last stars, fading as the sky pales
      view(cam, 0.05);
      for (const s of STARS) {
        out.fillStyle = rgba('#efe6d8', s.a * (1 - dawn) * (0.7 + 0.3 * Math.sin(t * s.rate + s.ph)));
        out.beginPath(); out.arc(s.x, s.y, s.r, 0, Math.PI * 2); out.fill();
      }
      caption(cam, t); // in the sky, behind the towers
      show('city', cam);
      for (let i = 0; i < NB; i++) show('win' + i, cam, i === 0 ? Math.max(0.6, on(0)) : on(i));
      // some windows go on and off
      view(cam, 0.45);
      for (const w of TWINKLE) {
        const a = smooth((Math.sin((t * 6.283) / w.period + w.ph) - 0.2) / 0.5) * on(1);
        if (a < 0.01) continue;
        out.fillStyle = rgba(w.col, 0.8 * a);
        out.beginPath(); out.ellipse(w.x, w.y, w.rx, w.ry, 0, 0, Math.PI * 2); out.fill();
      }
      out.globalCompositeOperation = 'screen';
      show('haze', cam, 0.7 + 0.3 * on(1));
      for (let i = 0; i < NB; i++) {
        const a = i === 0 ? Math.max(0.6, on(0)) : on(i);
        show('glowW' + i, cam, 0.8 * a);
        show('glowN' + i, cam, 0.6 * a);
      }
      // red warning lights on the tops of the towers blink slowly, out of step
      view(cam, 0.45);
      for (const [i, [x, y]] of BEACONS.entries()) {
        const a = Math.pow(Math.max(0, Math.sin(t * 5.2 + i * 1.9)), 3) * (1 - 0.5 * dawn);
        if (a < 0.01) continue;
        const gr = out.createRadialGradient(x, y, 0, x, y, 13);
        gr.addColorStop(0, rgba('#e0705e', 0.75 * a)); gr.addColorStop(1, rgba('#e0705e', 0));
        out.fillStyle = gr;
        out.fillRect(x - 13, y - 13, 26, 26);
      }
      out.globalCompositeOperation = 'source-over';
      show('water', cam);
      show('dabs', cam, 0.3 + 0.7 * on(2));
      out.globalCompositeOperation = 'screen';
      for (let i = 0; i < NB; i++) show('refl' + i, cam, 0.45 * (i === 0 ? Math.max(0.6, on(0)) : on(i)));
      out.globalCompositeOperation = 'source-over';
      // the embankment over the top of the water; its lamps light up in a wave along the
      // river, each one flaring a little as it comes on
      show('shore', cam);
      const front = lampFront(t), soft = 1 - 0.4 * dawn, p = LAYERS.shore.p;
      out.globalCompositeOperation = 'screen';
      place(masked('lampGlow', behind(front)), LX, LY, cam, p, soft);
      place(masked('lampGlow', flash(front)), LX, LY, cam, p, 0.8 * soft);
      place(masked('lampRefl', behind(front)), LX, LY, cam, p, 0.8 * soft);
      out.globalCompositeOperation = 'source-over';
      place(masked('lamps', behind(front)), LX, LY, cam, p, soft);
      // a ferry crosses the river: a low hull, a row of warm windows, their broken
      // reflection, a pale wake behind it
      view(cam, 0.8);
      {
        const x = 1760 - 44 * t, y = WL + 64 + Math.sin(t * 1.9) * 0.5;
        const wake = out.createLinearGradient(x + 40, 0, x + 220, 0);
        wake.addColorStop(0, rgba('#9aa0b4', 0.3)); wake.addColorStop(1, rgba('#9aa0b4', 0));
        out.fillStyle = wake;
        out.fillRect(x + 40, y - 0.5, 180, 1.4);
        out.fillRect(x + 70, y + 3, 120, 1);
        // muted colours, so it is not a black cut-out: a wine hull with an ochre stripe, a
        // cabin in the lilac grey of the sky
        const FC = { hull: '#5e2a33', stripe: '#c9a46a', cabin: '#8c8597', roof: '#3b3346' };
        // its dark reflection under the hull
        out.fillStyle = rgba('#1d2130', 0.3);
        out.beginPath(); out.ellipse(x - 2, y + 4, 50, 3.5, 0, 0, Math.PI * 2); out.fill();
        out.fillStyle = rgba(FC.hull, 0.95);
        fillPoly(out, [[x - 54, y - 7], [x + 50, y - 7], [x + 44, y], [x - 46, y]]);
        out.fillStyle = rgba(FC.stripe, 0.7);
        out.fillRect(x - 52, y - 7, 101, 1.3);
        out.fillStyle = rgba(FC.cabin, 0.95);
        fillPoly(out, [[x - 30, y - 15], [x + 26, y - 15], [x + 30, y - 7], [x - 34, y - 7]]);
        out.fillStyle = rgba(FC.roof, 0.95);
        fillPoly(out, [[x - 32, y - 17], [x + 28, y - 17], [x + 27, y - 14.6], [x - 31, y - 14.6]]);
        out.fillRect(x - 4, y - 23, 3.2, 6);
        for (let k = 0; k < 6; k++) {
          out.fillStyle = rgba('#f6ddb0', 0.9 * soft);
          out.beginPath(); out.ellipse(x - 25 + k * 10, y - 10.6, 1.9, 1.5, 0, 0, Math.PI * 2); out.fill();
        }
        for (let k = 0; k < 9; k++) {
          const u = k / 9, rx = x - 2 + Math.sin(k * 2.1 + t * 3.1) * (10 + 12 * u);
          out.fillStyle = rgba('#efc485', 0.5 * soft * (1 - u));
          out.beginPath(); out.ellipse(rx, y + 5 + k * 3.4, 16 - 8 * u, 1.2, 0, 0, Math.PI * 2); out.fill();
        }
      }
      show('mistW', cam, 1, (t * 10) % 200);
    }

    let RIDGE;
    paintShanghai();
    return { frame: frameShanghai, ridge: RIDGE };
  }

  DH.location.define('shanghai', {
    name: 'Шанхай',
    time: 'night',
    // light ink in the night sky left of the Pearl, behind the towers
    caption: { hanzi: '上海', pinyin: 'Shànghǎi', x: 330, y: 300, p: 0.35, t0: 0.15, tOut: 2.05, wind: [560, -70],
      ink: '#f1e8da', ink2: '#ddd3c4' },
    camera: DH.location.glide({ x: -30, y: 40, zoom: 1.0 }, { x: 40, y: -30, zoom: 1.13 }),
    setup,
  });
})();
