// Huangshan (黄山): the welcoming pine on a near granite cliff, its long boughs reaching out
// over the sea of clouds; granite spires stand in the clouds like islands. Slot: day.
// WORK IN PROGRESS (skill `location`, stage 3): the cloud sea and the pine are painted for
// real, the spires and the cliff are still sketches.
// Probe: videos/probe-places/?place=huangshan
(function () {
  const PAPER = '#f4f2ed', SEA_LOW = '#eceeed';
  const HZ = 720; // the top of the cloud sea in front of the main row of spires

  function setup(k) {
    const { W, D, out, INK, INK2, view, show, sky, densify, caption, camera } = k;
    const { rgba, wash, dryStroke, taper, fillPoly, rng, noise1, fbm } = W;
    let ctx;
    const begin = (...a) => { const layer = k.begin(...a); ctx = layer.c.getContext('2d'); return layer; };

    // ---------- granite (sketch) ----------

    // A crest of granite: massifs carrying tight groups of narrow teeth with steep sides.
    function spires({ x0, x1, base, hMin, hMax, gap, seed, thin = 1 }) {
      const r = rng(seed), teeth = [];
      for (let x = x0 + r() * gap; x < x1; x += gap * (0.6 + r() * 0.9)) {
        const h = hMin + (hMax - hMin) * r(), w = h * (0.55 + r() * 0.35);
        teeth.push({ x, h: h * 0.72, w, e: 0.8 });
        const n = 3 + Math.floor(r() * 4);
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) / n - 0.5 + (r() - 0.5) * 0.15;
          teeth.push({ x: x + u * w * 1.3, h: h * (1 - Math.abs(u) * 0.7) * (0.75 + r() * 0.25), w: (34 + r() * 46) * thin * (h / 300), e: 0.24 + r() * 0.2 });
        }
      }
      const n = noise1(seed), pts = [];
      for (let x = x0; x <= x1; x += 4) {
        let hgt = 0;
        for (const p of teeth) {
          const a = Math.abs((x - p.x) / p.w);
          if (a < 1) hgt = Math.max(hgt, p.h * Math.min(0.9 + 0.06 * Math.sin(p.x), Math.pow(1 - a, p.e)));
        }
        pts.push([x, base - hgt + fbm(n, x / 30) * 5]);
      }
      return pts;
    }
    function granite({ ridge, color, deep, fadeTo, under, seed, cracks = 0 }) {
      const c = W.mountains({ w: 2400, h: 1100, ox: -240, oy: 0, ridge, color, deep, fadeTo, seed, under });
      const lc = c.getContext('2d'), r = rng(seed + 50);
      lc.globalCompositeOperation = 'source-atop';
      lc.translate(240, 0);
      for (let i = 0; i < cracks; i++) {
        const p = ridge[Math.floor(r() * ridge.length)], len = 40 + r() * 200, pts = [];
        for (let j = 0; j <= 6; j++) pts.push([p[0] + Math.sin(j * 1.7 + i) * 3, p[1] + 8 + len * j / 6]);
        dryStroke(lc, pts, 2.2, INK2, { alpha: 0.28, hairs: 2, dry: 0.5, seed: seed + 60 + i });
      }
      ctx.drawImage(c, -240, 0);
    }
    function cliff(poly, seed) {
      const body = densify(poly, 14);
      ctx.fillStyle = '#9a938e';
      fillPoly(ctx, body);
      wash(ctx, body, '#6a615c', { layers: 22, alpha: 0.06, seed });
      wash(ctx, body.map(([x, y]) => [x + 30, y + 60]), '#453d39', { layers: 12, alpha: 0.05, seed: seed + 1 });
      const r = rng(seed + 2), xs = poly.map((p) => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
      ctx.save();
      ctx.beginPath(); body.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.clip();
      for (let i = 0; i < 26; i++) {
        const x = x0 + r() * (x1 - x0), y = 300 + r() * 700, len = 80 + r() * 260;
        dryStroke(ctx, [[x, y], [x + 4, y + len / 2], [x - 2, y + len]], 2.6, INK, { alpha: 0.3, hairs: 2, dry: 0.5, seed: seed + 3 + i });
      }
      ctx.restore();
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

    // Huangshan pine (the welcoming pine, 迎客松 Yíngkèsōng): a stout trunk, a flat crown
    // and flat pads of needles on level boughs; two long lower boughs reach out to one
    // side. Painted in parts on canvases of one size, so the long boughs can sway around
    // the points where they leave the trunk.
    const GREENS = ['#1f2a24', '#2c3830', '#3d4a3f', '#56655a'];
    function makePine(h, dir, seed) {
      const cw = Math.ceil(h * 2.6), chh = Math.ceil(h * 1.3), fx = h * 1.1, fy = h * 1.25, s = h / 470;
      const part = () => { const c = W.canvas(cw, chh); return { c, x: c.getContext('2d') }; };
      const r = rng(seed);
      const at = (u) => [fx + dir * h * (0.13 * Math.sin(u * 2.6) - 0.09 * u + 0.03 * Math.sin(u * 9)), fy - h * u * 0.9];

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
      const trunk = [];
      for (let i = 0; i <= 18; i++) trunk.push(at(i / 18));
      wood(still.x, trunk, h * 0.085, h * 0.02, seed + 1);
      // roots gripping the rock
      for (const o of [-1, 1]) wood(still.x, [[fx + o * 2 * s, fy - 14 * s], [fx + o * 16 * s, fy - 4 * s], [fx + o * 36 * s, fy + 5 * s]], 11 * s, 3 * s, seed + 5 + o);
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

    const far = spires({ x0: -240, x1: 2160, base: HZ + 50, hMin: 300, hMax: 560, gap: 330, seed: 51, thin: 0.9 });
    const mid = spires({ x0: -240, x1: 2160, base: HZ + 50, hMin: 240, hMax: 470, gap: 300, seed: 53 }).map(([x, y]) => [x + 300, y + 70]);
    begin('sky', 0); sky('#f3f2ee', '#e4e8ea', HZ);
    begin('far', 0.2); granite({ ridge: far, color: '#c9c8ca', deep: '#b0b0b6', fadeTo: HZ + 110, seed: 52, under: '#eeeeec', cracks: 20 });
    begin('mid', 0.5); granite({ ridge: mid, color: '#8d8580', deep: '#5b524d', fadeTo: HZ + 260, seed: 54, under: '#e9e8e5', cracks: 110 });
    begin('near', 1);
    cliff([[-240, 1190], [-240, 250], [-100, 200], [20, 260], [90, 420], [200, 470], [300, 600], [470, 620], [560, 700], [600, 860], [720, 960], [800, 1190]], 56);
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
      drawPine(PINE, cam, 400, 622, t);
      bank(SEA[4], cam, 1.3, 985 + swell(4), -420 - t * 52);
    }
    return { frame, ridge: { pts: mid, p: 0.5 } };
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
