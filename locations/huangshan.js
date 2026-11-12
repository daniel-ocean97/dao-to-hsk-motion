// Huangshan (黄山): the welcoming pine on a near granite cliff, its long boughs reaching out
// over the sea of clouds; granite spires stand in the clouds like islands. Slot: day.
// Probe: videos/probe-places/?place=huangshan
(function () {
  const PAPER = '#f4f2ed', SEA_LOW = '#eceeed';
  const HZ = 720; // the top of the cloud sea in front of the main row of spires

  function setup(k) {
    const { W, D, out, INK, INK2, view, show, sky, densify, caption, camera } = k;
    const { rgba, wash, dryStroke, taper, fillPoly, rng, noise1, fbm } = W;
    let ctx;
    const begin = (...a) => { const layer = k.begin(...a); ctx = layer.c.getContext('2d'); return layer; };

    // ---------- granite ----------

    // A row of massifs, each a tight group of granite columns: sheer sides, blunt tops of
    // uneven height, narrow notches between them; a broad skirt joins them at the foot.
    function columns({ x0, x1, hMin, hMax, gap, seed, wide = 1 }) {
      const r = rng(seed), cols = [];
      for (let x = x0 + r() * gap; x < x1; x += gap * (0.55 + r() * 0.9)) {
        const H = hMin + (hMax - hMin) * r(), n = 4 + Math.floor(r() * 5), ws = [];
        for (let i = 0; i < n; i++) ws.push((22 + Math.pow(r(), 1.6) * 105) * wide * (H / 350));
        const total = ws.reduce((a, b) => a + b, 0) * 0.7;
        cols.push({ x, h: H * (0.42 + 0.2 * r()), w: total * 0.8, skirt: true });
        let cx = x - total / 2, hh = 0.6 + 0.4 * r();
        for (let i = 0; i < n; i++) {
          hh = Math.min(1, Math.max(0.4, hh + (r() - 0.45) * 0.5));
          cols.push({ x: cx + ws[i] / 2, w: ws[i] * 0.6, h: H * hh, kl: 3 + r() * 7, kr: 3 + r() * 7, apex: (r() - 0.5) * 1.3, cut: 0.06 + 0.26 * r(), lean: (r() - 0.5) * 0.09 });
          cx += ws[i] * 0.7;
        }
      }
      return cols;
    }
    function crest(cols, { x0, x1, base, seed }) {
      const n = noise1(seed), pts = [];
      for (let x = x0; x <= x1; x += 3) {
        let hgt = 0;
        for (const p of cols) {
          if (p.skirt) { const a = Math.abs((x - p.x) / p.w); if (a < 1) hgt = Math.max(hgt, p.h * Math.pow(1 - a, 0.9)); continue; }
          // a leaning column: sheer sides (each with its own slope), a slanted top with
          // the apex off centre
          const u = (x - p.x - p.lean * p.h) / p.w, a = Math.abs(u);
          if (a >= 1) continue;
          hgt = Math.max(hgt, p.h * Math.min(1, (1 - a) * (u < 0 ? p.kl : p.kr)) * (1 - p.cut * Math.pow(Math.abs(u - p.apex), 1.3)));
        }
        pts.push([x, base - hgt + fbm(n, x / 24) * 5 + fbm(n, x / 7 + 3) * 2]);
      }
      return pts;
    }
    // A little pine far away: a bent stem under two or three flat dark pads.
    function miniPine(x, px, py, hh, sd, alpha) {
      const q = rng(sd), side = q() < 0.5 ? -1 : 1;
      x.fillStyle = rgba('#241d18', alpha);
      fillPoly(x, taper([[px, py], [px + side * hh * 0.12, py - hh * 0.5], [px + side * hh * 0.04, py - hh * 0.92]], (t) => Math.max(1, hh * 0.1 * (1 - t * 0.6))));
      for (const [u, w, o] of [[0.95, 0.5, 0.05], [0.68, 0.36, side * 0.34], [0.46, 0.3, -side * 0.3]]) {
        for (let j = 0; j < 4; j++) {
          x.fillStyle = rgba(j % 2 ? '#2c3830' : '#1f2a24', alpha * (0.5 + 0.35 * q()));
          x.beginPath(); x.ellipse(px + (o + side * 0.06 + (q() - 0.5) * 0.25) * hh, py - hh * (u + (q() - 0.5) * 0.05), hh * w * (0.5 + 0.3 * q()), hh * 0.09, 0, 0, Math.PI * 2); x.fill();
        }
      }
    }
    // Paint a row of columns on the current layer. The light comes from the upper left:
    // every column has a pale left edge and a shaded right side; joints between the columns
    // are ink lines running down from the notches; the row dissolves downwards into the
    // clouds. Little pines stand on some of the tops.
    function granite({ cols, ridge, base, tone, deep, light, fadeFrom, fadeTo, seed, detail = 1, pines = 0, ink = 0.55 }) {
      const c = W.canvas(2400, 1300), x = c.getContext('2d'), r = rng(seed);
      x.translate(240, 110);
      const yAt = (px) => ridge[Math.max(0, Math.min(ridge.length - 1, Math.round((px - ridge[0][0]) / 3)))][1];
      x.fillStyle = tone;
      fillPoly(x, [...ridge, [ridge.at(-1)[0], fadeTo + 60], [ridge[0][0], fadeTo + 60]]);
      x.globalCompositeOperation = 'source-atop';
      const thin = ridge.filter((_, i) => i % 4 === 0);
      wash(x, [...thin.map(([px, y]) => [px, y, 0.04]), ...thin.slice().reverse().map(([px, y]) => [px, y + 80 + 30 * Math.sin(px / 70), 0.25])], deep, { layers: 6, alpha: 0.05, seed });
      const crack = (px, len, alpha, sd) => {
        const y0 = yAt(px) + 3, pts = [];
        for (let j = 0; j <= 8; j++) pts.push([px + Math.sin(j * 1.3 + sd) * 2.5 * detail, y0 + len * j / 8]);
        dryStroke(x, pts, 2.6 * detail, INK2, { alpha, hairs: 2, dry: 0.45, seed: sd });
      };
      cols.forEach((p, i) => {
        if (p.skirt) return;
        const top = base - p.h, sd = seed * 31 + i * 7;
        wash(x, densify([[p.x + p.w * 0.08 + p.lean * p.h, top - 12], [p.x + p.w * 1.05 + p.lean * p.h, top - 12], [p.x + p.w * 1.1, top + p.h * 0.95], [p.x, top + p.h * 0.95]], 40), deep, { layers: 5, alpha: 0.07, rough: 0.16, seed: sd });
        wash(x, densify([[p.x - p.w * 1.05 + p.lean * p.h, top - 12], [p.x - p.w * 0.6 + p.lean * p.h, top - 12], [p.x - p.w * 0.55, top + p.h * 0.8], [p.x - p.w * 1.05, top + p.h * 0.8]], 40), light, { layers: 4, alpha: 0.1, rough: 0.16, seed: sd + 1 });
        crack(p.x + p.w * 0.97 + p.lean * p.h * 0.8, p.h * (0.45 + 0.4 * r()), 0.5 * ink / 0.55, sd + 2);
        crack(p.x - p.w * 0.97 + p.lean * p.h * 0.8, p.h * (0.3 + 0.4 * r()), 0.4 * ink / 0.55, sd + 3);
        if (detail >= 1) {
          crack(p.x + (r() - 0.5) * p.w, p.h * (0.2 + 0.3 * r()), 0.26, sd + 4);
          // a level joint or two across the column
          for (let j = 0; j < 2; j++) {
            const jy = top + p.h * (0.15 + 0.5 * r()), jx = p.x + (r() - 0.6) * p.w;
            dryStroke(x, [[jx, jy], [jx + p.w * 0.4, jy + 2], [jx + p.w * 0.8, jy - 1]], 2, INK2, { alpha: 0.22, hairs: 1, dry: 0.6, seed: sd + 5 + j });
          }
        }
      });
      x.globalCompositeOperation = 'source-over';
      W.granulate(x, 2400, 1300, 0.3);
      W.fadeDown(x, 2400, fadeFrom, fadeTo);
      // ink along the tops, broken
      let seg = [];
      const flush = (i) => { if (seg.length > 4) dryStroke(x, seg, 2.2 * detail, INK2, { alpha: ink, hairs: 2, dry: 0.35, seed: seed + i }); seg = []; };
      ridge.forEach((pt, i) => { if (pt[1] > fadeFrom + (fadeTo - fadeFrom) * 0.35 || r() < 0.012) flush(i); else seg.push(pt); });
      flush(0);
      cols.forEach((p, i) => {
        if (p.skirt || r() > pines) return;
        const px = p.x + (r() - 0.5) * p.w * 0.6;
        miniPine(x, px, yAt(px) + 4, (17 + r() * 15) * detail, seed + i, 0.85);
      });
      ctx.drawImage(c, -240, -110);
    }

    // The near cliff. poly starts at the bottom left corner and runs up the left edge,
    // along the top and down the right side; from point `turn` on it is the side turned
    // away from the light. Faces are split into columns by long joints; ledges are pale,
    // with moss on them; the foot melts into the clouds.
    function cliff(poly, turn, seed) {
      const body = densify(poly, 12), r = rng(seed), xs = poly.map((q) => q[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
      const line = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); };
      ctx.fillStyle = '#a8a19b';
      fillPoly(ctx, body);
      ctx.save();
      line(body); ctx.clip();
      wash(ctx, body, '#7d756f', { layers: 10, alpha: 0.05, seed });
      for (let xx = x0 - 20; xx < x1;) {
        const w = 34 + r() * 84, lean = (r() - 0.5) * 30;
        wash(ctx, densify([[xx, 100], [xx + w, 100], [xx + w + lean, 1250], [xx + lean, 1250]], 40), r() < 0.6 ? '#4d4641' : '#d6cfc7', { layers: 4, alpha: 0.05 + 0.09 * r(), rough: 0.14, seed: seed + Math.round(xx) });
        const pts = [];
        for (let j = 0; j <= 30; j++) pts.push([xx + lean * j / 30 + Math.sin(j * 0.9 + xx) * 3, 100 + 1150 * j / 30]);
        dryStroke(ctx, pts, 2.8, INK, { alpha: 0.3 + 0.3 * r(), hairs: 2, dry: 0.65, seed: seed + 500 + Math.round(xx) });
        xx += w;
      }
      // short level joints
      for (let i = 0; i < 40; i++) {
        const jx = x0 + r() * (x1 - x0), jy = 200 + r() * 900, w = 30 + r() * 70;
        dryStroke(ctx, [[jx, jy], [jx + w / 2, jy + 3], [jx + w, jy]], 2.2, INK, { alpha: 0.25, hairs: 1, dry: 0.6, seed: seed + 900 + i });
      }
      // the shaded side and the pale ledges
      ctx.filter = 'blur(26px)';
      ctx.strokeStyle = rgba('#3a3330', 0.62);
      ctx.lineWidth = 170;
      line(poly.slice(turn)); ctx.stroke();
      ctx.filter = 'blur(5px)';
      ctx.strokeStyle = rgba('#ebe5dc', 0.6);
      ctx.lineWidth = 22;
      line(poly.slice(1, turn + 1)); ctx.stroke();
      // mist rising over the foot
      ctx.filter = 'none';
      const g = ctx.createLinearGradient(0, 860, 0, 1150);
      g.addColorStop(0, rgba(PAPER, 0)); g.addColorStop(1, rgba(PAPER, 0.75));
      ctx.fillStyle = g;
      ctx.fillRect(x0, 860, x1 - x0, 400);
      ctx.restore();
      // moss and low shrubs on the level parts of the top
      for (let i = 1; i < turn; i++) {
        const [ax, ay] = poly[i], [bx, by] = poly[i + 1], len = Math.hypot(bx - ax, by - ay);
        if (Math.abs(by - ay) > Math.abs(bx - ax) * 0.5) continue;
        for (let j = 0; j < len / 7; j++) {
          const u = r(), w = 8 + r() * 16;
          ctx.fillStyle = rgba(r() < 0.5 ? '#5c6e5a' : '#3d4a3f', 0.3 + 0.35 * r());
          ctx.beginPath(); ctx.ellipse(ax + (bx - ax) * u, ay + (by - ay) * u + 2 - r() * 7, w, 3 + r() * 5, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      dryStroke(ctx, densify(poly, 10).filter(([x, y]) => x > -238 && y < 1185), 3, INK, { alpha: 0.7, hairs: 3, dry: 0.4, seed: seed + 3 });
    }

    // ---------- the sea of clouds ----------

    // One bank of the cloud sea on a strip wider than the frame, so it can drift. Billows
    // are groups of puffs painted from the far ones to the near ones: each puff is paper
    // white with a soft top, and carries a cool ragged wash on its underside; the next puff
    // covers part of that shade with its own lit top. Below the billows the strip is solid.
    const TOP = 190; // y of the billow tops inside a strip
    function cloudBank(seed, { scale = 1, shade = 0.3, n = 22 } = {}) {
      const w = 3200, h = 620, c = W.canvas(w, h), x = c.getContext('2d'), r = rng(seed);
      const g = x.createLinearGradient(0, TOP, 0, h);
      g.addColorStop(0, PAPER); g.addColorStop(1, SEA_LOW);
      x.fillStyle = g;
      x.filter = 'blur(10px)';
      x.fillRect(-40, TOP + 100 * scale, w + 80, h);
      const puffs = [];
      for (let i = 0; i < n; i++) {
        const cx = (i + r()) * w / n, top = TOP + r.gauss() * 16 * scale, big = (120 + r() * 170) * scale, m = 2 + Math.floor(r() * 3);
        for (let j = 0; j < m; j++) {
          const o = j - (m - 1) / 2;
          puffs.push({ x: cx + o * big * 0.5 + (r() - 0.5) * 24, y: top + Math.abs(o) * big * 0.12 + r() * 12 * scale + big * 0.2, rx: big * (0.36 + r() * 0.2), ry: big * (0.2 + r() * 0.08) });
        }
      }
      // the scalloped top of the bank
      const edge = [];
      for (let px = -40; px <= w + 40; px += 8) {
        let y = TOP + 62 * scale;
        for (const p of puffs) { const u = (px - p.x) / p.rx; if (Math.abs(u) < 1) y = Math.min(y, p.y - p.ry * Math.sqrt(1 - u * u)); }
        edge.push([px, y]);
      }
      x.filter = `blur(${3 * scale}px)`;
      x.fillStyle = PAPER;
      fillPoly(x, [...edge, [w + 40, TOP + 140 * scale], [-40, TOP + 140 * scale]]);
      x.filter = 'none';
      // the shade under the lit rim: its upper edge repeats the scallops, crisp and ragged
      // (wet on dry); downwards it dissolves (wet in wet); its strength changes along the bank
      const sh = W.canvas(w, h), sx = sh.getContext('2d'), nz = noise1(seed + 3);
      const upper = edge.map(([px, y]) => [px, y + (20 + 12 * fbm(nz, px / 160)) * scale, 0.12]);
      const band = [...upper, [w + 40, TOP + 260 * scale, 0.02], [-40, TOP + 260 * scale, 0.02]];
      wash(sx, band, '#93a0ad', { layers: 6, alpha: shade / 6, seed: seed * 100 });
      wash(sx, band.map(([px, y, v]) => [px, y + 14 * scale, v]), '#a9a39c', { layers: 3, alpha: shade / 12, seed: seed * 100 + 1 });
      sx.globalCompositeOperation = 'destination-in';
      const fg = sx.createLinearGradient(0, TOP + 20 * scale, 0, TOP + 190 * scale);
      fg.addColorStop(0, '#000'); fg.addColorStop(0.3, 'rgba(0,0,0,0.5)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      sx.fillStyle = fg;
      sx.fillRect(0, 0, w, h);
      sx.globalCompositeOperation = 'destination-out';
      sx.filter = `blur(${22 * scale}px)`;
      for (let i = 0; i < n * 1.2; i++) {
        sx.fillStyle = `rgba(0,0,0,${0.35 + 0.5 * r()})`;
        sx.beginPath(); sx.ellipse(r() * w, TOP + (50 + r() * 90) * scale, (60 + r() * 150) * scale, (16 + r() * 30) * scale, 0, 0, Math.PI * 2); sx.fill();
      }
      sx.filter = 'none';
      x.drawImage(sh, 0, 0);
      // smaller puffs lower on the bank, each a lit top over a little shade of its own
      for (let i = 0; i < n * 0.7; i++) {
        const px = r() * w, py = TOP + (80 + r() * 80) * scale, rx = (60 + r() * 110) * scale, ry = rx * (0.13 + 0.06 * r());
        const lens = [];
        for (let q = 0; q < 12; q++) { const a = q / 12 * Math.PI * 2; lens.push([px + Math.cos(a) * rx * 0.9, py + ry * 0.9 + Math.sin(a) * ry * 0.6, 0.3]); }
        wash(x, lens, '#93a0ad', { layers: 4, alpha: shade / 9, seed: seed * 100 + 10 + i });
        x.filter = `blur(${9 * scale}px)`;
        x.fillStyle = PAPER;
        x.beginPath(); x.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); x.fill();
        x.filter = 'none';
      }
      // lift the top edge here and there so it is not one hard line: wisps torn off
      x.globalCompositeOperation = 'destination-out';
      x.filter = `blur(${7 * scale}px)`;
      for (let i = 0; i < 40; i++) {
        x.fillStyle = `rgba(0,0,0,${0.25 + 0.35 * r()})`;
        x.beginPath(); x.ellipse(r() * w, TOP - 6 * scale + r.gauss() * 10 * scale, (40 + r() * 110) * scale, (5 + r() * 9) * scale, 0, 0, Math.PI * 2); x.fill();
      }
      x.filter = 'none';
      x.globalCompositeOperation = 'source-over';
      W.granulate(x, w, h, 0.12);
      return c;
    }
    // Draw a bank with its billow tops at world y, at depth p, shifted by dx; everything
    // under the strip is filled, so the bank hides what stands behind it.
    function bank(S, cam, p, y, dx, alpha = 1) {
      view(cam, p);
      out.globalAlpha = alpha;
      out.drawImage(S, -640 + dx, y - TOP);
      out.fillStyle = SEA_LOW;
      out.fillRect(-640, y - TOP + 610, 3200, 2400);
      out.globalAlpha = 1;
    }

    // ---------- the pine ----------

    // Huangshan pine (the welcoming pine, Yingkesong): a stout trunk, a flat crown
    // and flat pads of needles on level boughs; two long lower boughs reach out to one
    // side. Painted in parts on canvases of one size, so the long boughs can sway around
    // the points where they leave the trunk.
    const GREENS = ['#1f2a24', '#2c3830', '#3d4a3f', '#56655a'];
    function makePine(h, dir, seed) {
      const cw = Math.ceil(h * 2.6), chh = Math.ceil(h * 1.3), fx = h * 1.1, fy = h * 1.25, s = h / 470;
      const part = () => { const c = W.canvas(cw, chh); return { c, x: c.getContext('2d') }; };
      const r = rng(seed);
      const at = (u) => [fx + dir * h * (0.11 * Math.sin(u * 2.6) - 0.08 * u + 0.04 * Math.sin(u * 8.5 + 0.6) + 0.035 * Math.max(0, u - 0.45)), fy - h * u * 0.9];

      // a flat pad of needles: a thin green wash for the mass, then tufts of needles
      // fanning upwards from twig ends, darker underneath and lighter on top
      function pad(x, cx, cy, w, ph, sd) {
        const q = rng(sd), lens = [];
        for (let i = 0; i <= 12; i++) { const u = i / 12 * 2 - 1; lens.push([cx + u * w / 2, cy - ph * 0.8 * Math.pow(1 - u * u, 0.6), 0.2]); }
        for (let i = 12; i >= 0; i--) { const u = i / 12 * 2 - 1; lens.push([cx + u * w / 2, cy + ph * 0.12 * (1 - u * u), 0.1]); }
        wash(x, lens, '#56655a', { layers: 8, alpha: 0.1, seed: sd });
        wash(x, lens.map(([a, b, v]) => [a, cy + (b - cy) * 0.45 + ph * 0.05, v]), '#2c3830', { layers: 8, alpha: 0.1, seed: sd + 1 });
        const tufts = [];
        const nT = Math.round(w / s / 2.4);
        for (let i = 0; i < nT; i++) {
          const u = Math.pow(q(), 0.8) * (q() < 0.5 ? -1 : 1), up = q();
          tufts.push([cx + u * w / 2 * 0.94, cy - ph * 0.62 * Math.pow(1 - u * u, 0.6) * up, up]);
        }
        tufts.sort((a, b) => a[1] - b[1]);
        for (const [tx, ty, up] of tufts) {
          const nN = 9 + Math.floor(q() * 6), tone = up > 0.7 ? 2 + (q() < 0.35) : up > 0.3 ? 1 + (q() < 0.4) : (q() < 0.5 ? 0 : 1);
          for (let j = 0; j < nN; j++) {
            const a = -Math.PI / 2 + (q() - 0.5) * 2.5, len = (12 + q() * 11) * s;
            x.fillStyle = rgba(GREENS[tone], 0.5 + 0.4 * q());
            fillPoly(x, taper([[tx, ty], [tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.5 - s], [tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.85]], (v) => Math.max(0.45, 2.4 * s * (1 - v * 0.85))));
          }
        }
      }
      // wood: an ink stroke of changing width, a paler lit side, dry bark lines along it
      function wood(x, pts, w0, w1, sd) {
        const wf = (v) => Math.max(1, w0 + (w1 - w0) * v);
        x.fillStyle = rgba('#2a1e16', 0.94);
        fillPoly(x, taper(pts, wf));
        x.fillStyle = rgba('#7a6552', 0.5);
        fillPoly(x, taper(pts.map(([a, b]) => [a - wf(0.5) * 0.2, b - wf(0.5) * 0.12]), (v) => wf(v) * 0.3));
        if (w0 > 8 * s) for (let i = 0; i < 5; i++) dryStroke(x, pts.map(([a, b], j) => [a + (i - 2) * w0 * 0.16 + Math.sin(j * 1.3 + i) * s, b]), 1.6 * s, INK, { alpha: 0.5, hairs: 1, dry: 0.7, seed: sd + i });
      }
      // the trunk and the roots: a body of changing width along a bent centre line, a
      // paler lit side on the left and a dark side on the right, then bark: short dark
      // fissures along the grain, staggered like scales, with pale flecks between them
      function barkWood(x, cen, wid, n, sd) {
        const q = rng(sd), nz = noise1(sd), C = [], Nn = [], Wd = [];
        for (let i = 0; i <= n; i++) C.push(cen(i / n));
        for (let i = 0; i <= n; i++) {
          const a = C[Math.max(0, i - 1)], b = C[Math.min(n, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
          let nx = (b[1] - a[1]) / l, ny = -(b[0] - a[0]) / l;
          if (nx < 0) { nx = -nx; ny = -ny; } // the normal points to the shaded (right) side
          Nn.push([nx, ny]);
          Wd.push(wid(i / n) * (1 + 0.16 * fbm(nz, i / n * 7)));
        }
        const P = (i, v) => [C[i][0] + Nn[i][0] * Wd[i] * v, C[i][1] + Nn[i][1] * Wd[i] * v]; // v: -0.5 lit edge .. 0.5 dark edge
        const strip = (v0, v1) => [...C.map((_, i) => P(i, v0)), ...C.map((_, i) => P(n - i, v1))];
        const body = strip(-0.5, 0.5);
        x.fillStyle = '#4a382b';
        fillPoly(x, body);
        x.save();
        x.beginPath(); body.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.clip();
        wash(x, strip(-0.55, -0.12), '#a88b6c', { layers: 5, alpha: 0.1, rough: 0.12, seed: sd + 1 });
        wash(x, strip(0.1, 0.55), '#170f0b', { layers: 5, alpha: 0.11, rough: 0.12, seed: sd + 2 });
        const len = C.reduce((acc, c, i) => acc + (i ? Math.hypot(c[0] - C[i - 1][0], c[1] - C[i - 1][1]) : 0), 0);
        for (let i = 0; i < len * 0.9; i++) {
          const f = q() * (n - 3), i0 = Math.floor(f), v = q() - 0.5, m = 2 + Math.floor(q() * 2), pts = [];
          for (let j = 0; j <= m; j++) pts.push(P(Math.min(n, i0 + j), v + Math.sin(j * 2 + i) * 0.03));
          const lit = q() < 0.3 && v < 0.15;
          x.fillStyle = rgba(lit ? '#c2a685' : '#150e0a', lit ? 0.3 + 0.2 * q() : 0.35 + 0.4 * q());
          fillPoly(x, taper(pts, (t) => Math.max(0.6, (lit ? 2.2 : 2.8) * s * Math.sin(Math.PI * (0.1 + 0.8 * t)))));
        }
        x.restore();
        dryStroke(x, C.map((_, i) => P(i, -0.5)), 1.8 * s, INK, { alpha: 0.55, hairs: 1, dry: 0.5, seed: sd + 3 });
        dryStroke(x, C.map((_, i) => P(i, 0.5)), 2.6 * s, INK, { alpha: 0.85, hairs: 2, dry: 0.25, seed: sd + 4 });
      }
      // a bough: leaves the trunk at u, runs `len` to the side in a few level steps,
      // sagging by `sag` at the far end; pads sit on it at the given places
      function bough(x, u, side, len, sag, pads, sd) {
        const q = rng(sd), [sx, sy] = at(u), pts = [], n = 10;
        for (let i = 0; i <= n; i++) {
          const v = i / n;
          pts.push([sx + side * len * v, sy - len * 0.07 * Math.sin(v * Math.PI * 0.9) + sag * v * v + Math.sin(v * 11 + sd) * 2.5 * s * (v > 0.1)]);
        }
        wood(x, pts, h * 0.034 * (0.6 + len / h * 0.6), 2 * s, sd);
        for (const [v, w, ph] of pads) {
          const i = Math.round(v * n), [px, py] = pts[i];
          // twigs up into the pad
          for (let j = 0; j < 3; j++) {
            const tx = px + (j - 1) * w * 0.26 + (q() - 0.5) * 8 * s;
            x.fillStyle = rgba('#2a1e16', 0.85);
            fillPoly(x, taper([[px + (j - 1) * w * 0.08, py], [(px + tx) / 2, py - ph * 0.12], [tx, py - ph * 0.3]], (t) => Math.max(0.8, 3.2 * s * (1 - t * 0.7))));
          }
          pad(x, px, py - ph * 0.22, w, ph, sd + 10 + i);
        }
        return [sx, sy];
      }

      const still = part(), armA = part(), armB = part();
      // far-side boughs first, then the trunk, the crown, the near short boughs
      bough(still.x, 0.62, -dir, h * 0.36, h * 0.01, [[1, h * 0.36, h * 0.085]], seed + 100);
      bough(still.x, 0.83, -dir, h * 0.26, 0, [[1, h * 0.3, h * 0.08]], seed + 200);
      barkWood(still.x, (u) => at(u), (u) => h * (0.026 + 0.05 * (1 - u) + 0.1 * Math.exp(-u * 11)), 44, seed + 1);
      // roots: they spread from the flared foot, follow the rock and go into its cracks
      const root = (pts, w0, sd) => barkWood(still.x, (u) => { const f = u * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), v = f - i; return [fx + (pts[i][0] + (pts[i + 1][0] - pts[i][0]) * v) * s, fy + (pts[i][1] + (pts[i + 1][1] - pts[i][1]) * v) * s]; }, (u) => w0 * s * Math.pow(1 - u, 0.8) + 1.5 * s, 16, sd);
      root([[-6, -16], [-30, -6], [-62, -1], [-96, 3], [-128, 1], [-150, 7]], 17, seed + 21);
      root([[8, -16], [34, -5], [58, 2], [76, 14], [86, 40], [82, 72], [88, 100]], 19, seed + 22);
      root([[2, -8], [10, 8], [6, 30], [12, 52]], 13, seed + 23);
      // stones and moss over the foot, so the tree sits in the rock, not on it
      {
        const q = rng(seed + 30);
        for (let i = 0; i < 26; i++) {
          const ox = (q() * 210 - 150) * s, oy = (4 + q() * 9) * s, w = (7 + q() * 14) * s, stone = q() < 0.2;
          still.x.fillStyle = rgba(stone ? '#6f6863' : (q() < 0.5 ? '#5c6e5a' : '#3d4a3f'), stone ? 0.9 : 0.4 + 0.35 * q());
          still.x.beginPath(); still.x.ellipse(fx + ox, fy + oy, w, w * (stone ? 0.5 : 0.3), 0, 0, Math.PI * 2); still.x.fill();
        }
      }
      bough(still.x, 0.76, dir, h * 0.32, 0, [[1, h * 0.34, h * 0.085]], seed + 300);
      const [tx, ty] = at(1);
      pad(still.x, tx - dir * h * 0.02, ty + h * 0.01, h * 0.62, h * 0.12, seed + 400);
      pad(still.x, tx + dir * h * 0.1, ty - h * 0.035, h * 0.36, h * 0.09, seed + 410);
      // the two welcoming arms
      const pB = bough(armB.x, 0.53, dir, h * 0.56, h * 0.01, [[0.55, h * 0.3, h * 0.08], [1, h * 0.34, h * 0.085]], seed + 500);
      const pA = bough(armA.x, 0.41, dir, h * 0.9, h * 0.07, [[0.4, h * 0.3, h * 0.075], [0.72, h * 0.36, h * 0.085], [1, h * 0.32, h * 0.08]], seed + 600);
      return { still: still.c, arms: [{ c: armB.c, pivot: pB, ph: 0.9, amp: 0.006 }, { c: armA.c, pivot: pA, ph: 0, amp: 0.009 }], fx, fy };
    }
    // The pine at world (x, y) (its foot), at depth p: the crown barely moves, the long
    // boughs rock a little, each in its own rhythm.
    function drawPine(P, cam, x, y, t, p = 1) {
      const z = view(cam, p);
      const base = out.getTransform();
      out.translate(x - P.fx, y - P.fy);
      for (const A of P.arms.slice(0, 1)) arm(A);
      out.drawImage(P.still, 0, 0);
      arm(P.arms[1]);
      out.setTransform(base);
      function arm(A) {
        out.save();
        out.translate(A.pivot[0], A.pivot[1]);
        out.rotate(Math.sin(t * 1.9 + A.ph) * A.amp + Math.sin(t * 3.1 + A.ph * 2) * A.amp * 0.35);
        out.drawImage(A.c, -A.pivot[0], -A.pivot[1]);
        out.restore();
      }
      return z;
    }

    // ---------- the place ----------

    const farCols = columns({ x0: -240, x1: 2160, hMin: 250, hMax: 430, gap: 340, seed: 51, wide: 1.1 });
    const far = crest(farCols, { x0: -240, x1: 2160, base: HZ + 50, seed: 51 });
    const midCols = columns({ x0: 280, x1: 2160, hMin: 230, hMax: 420, gap: 330, seed: 53 });
    const mid = crest(midCols, { x0: -240, x1: 2160, base: HZ + 110, seed: 53 });
    begin('sky', 0); sky('#f3f2ee', '#e4e8ea', HZ);
    begin('far', 0.2);
    granite({ cols: farCols, ridge: far, base: HZ + 50, tone: '#d3d3d4', deep: '#aeb1b8', light: '#f0efec', fadeFrom: HZ - 260, fadeTo: HZ + 20, seed: 52, detail: 0.7, ink: 0.22 });
    begin('mid', 0.5);
    granite({ cols: midCols, ridge: mid, base: HZ + 110, tone: '#a9a29c', deep: '#5b534e', light: '#ece6de', fadeFrom: HZ - 200, fadeTo: HZ + 120, seed: 54, pines: 0.42 });
    begin('near', 1);
    const CLIFF = [[-240, 1190], [-240, 180], [-150, 150], [-60, 175], [-20, 262], [40, 290], [70, 400], [130, 430], [165, 540], [250, 578], [330, 602], [400, 614], [470, 620], [505, 652], [520, 740], [560, 790], [575, 900], [640, 960], [680, 1190]];
    cliff(CLIFF, 12, 56);
    D.pine(ctx, -90, 168, 86, { seed: 58, color: '#232a25', alpha: 0.8 });
    D.pine(ctx, 22, 284, 64, { seed: 59, color: '#232a25', alpha: 0.8 });
    const PINE = makePine(470, 1, 57);
    const FLOCK = D.flock({ n: 5, seed: 23, spread: [70, 24], size: 8 });
    const SEA = [
      cloudBank(11, { scale: 0.55, shade: 0.2, n: 34 }),
      cloudBank(12, { scale: 0.8, shade: 0.25, n: 26 }),
      cloudBank(13, { scale: 1.1, shade: 0.28, n: 20 }),
      cloudBank(14, { scale: 1.5, shade: 0.3, n: 15 }),
      cloudBank(15, { scale: 2.0, shade: 0.3, n: 11 }),
    ];
    const WISP = W.mistBand({ w: 2400, h: 120, color: PAPER, seed: 16 });

    // The camera moves in slowly towards the pine; the banks of the cloud sea drift to the
    // left, the nearer the faster, and breathe a little; the long boughs rock.
    function frame(t) {
      const cam = camera(t);
      const swell = (i) => Math.sin(t * 0.9 + i * 1.7) * 2.5;
      show('sky', cam); show('far', cam);
      bank(SEA[0], cam, 0.3, HZ - 95 + swell(0), -200 - t * 9, 0.95);
      caption(cam, t);
      show('mid', cam);
      view(cam, 0.45); D.birds(out, FLOCK, 1250 - 30 * t, 430 - 5 * t, t, { color: INK2, alpha: 0.4 });
      // wisps slide across the feet of the spires
      view(cam, 0.55);
      out.globalAlpha = 0.85;
      out.drawImage(WISP, -240 - ((t * 34) % 300), HZ - 70);
      out.globalAlpha = 1;
      bank(SEA[1], cam, 0.6, HZ + swell(1), -120 - t * 16);
      bank(SEA[2], cam, 0.75, HZ + 95 + swell(2), -300 - t * 24);
      bank(SEA[3], cam, 0.9, HZ + 205 + swell(3), -60 - t * 34);
      show('near', cam);
      drawPine(PINE, cam, 400, 620, t);
      bank(SEA[4], cam, 1.3, 985 + swell(4), -420 - t * 52);
    }
    // The crest for the cuts: the near cliff on the left, the main row of columns on the
    // right, the top of the cloud sea between them (not the feet of the rocks under the
    // clouds). The cliff stands at depth 1 and the crest lives at depth 0.5, so its points
    // are shifted to where the camera sees them at the end of the scene.
    const end = camera(k.DURATION), z1 = 1 + (end.zoom - 1), z5 = 1 + (end.zoom - 1) * 0.5;
    const toMid = ([x, y]) => [960 + end.x * 0.5 + (z1 / z5) * (x - 960 - end.x), 540 + end.y * 0.5 + (z1 / z5) * (y - 540 - end.y)];
    const edge = densify(CLIFF, 6).filter(([x, y]) => x > -238 && y < HZ + 12).map(toMid);
    const crestLine = [];
    for (let x = -240; x <= 2160; x += 6) {
      let y = HZ + 10 + 6 * Math.sin(x / 90);
      const m = mid[Math.round((x + 240) / 3)];
      if (m) y = Math.min(y, m[1]);
      for (const [ex, ey] of edge) if (Math.abs(ex - x) < 6) y = Math.min(y, ey);
      crestLine.push([x, y]);
    }
    return { frame, ridge: { pts: crestLine, p: 0.5 } };
  }

  DH.location.define('huangshan', {
    name: 'Хуаншань',
    time: 'day',
    horizon: HZ, // the top of the cloud sea
    hasWater: false, // clouds, not water, under the peaks
    caption: { hanzi: '黄山', pinyin: 'Huángshān', x: 1430, y: 250, p: 0.3, t0: 0.15, tOut: 2.05, wind: [560, -60] },
    camera: DH.location.glide({ x: -30, y: 14, zoom: 1.0 }, { x: 50, y: -4, zoom: 1.09 }),
    setup,
  });
})();
