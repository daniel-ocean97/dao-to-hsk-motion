// West Lake, Hangzhou (西湖) at dawn: the Leifeng pagoda on its hill across the water, seen
// through a curtain of willow twigs that the camera leaves behind; warm morning light
// on the water, lotus by the near bank, a covered boat. Slot: day.
// Probe: videos/probe-places/?place=xihu
(function () {
  const HZ = 700; // the far shore of the lake
  const PX = 1100; // the pagoda
  const GLOW = [1420, HZ - 30]; // where the morning light comes from (the sun itself is not in the frame)

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

    // ---------- lotus ----------

    // A lotus leaf: a round blade with a wavy rim and a notch, seen at a low angle; veins
    // run from the middle to the rim; the far rim catches the morning light, the near
    // half is deeper. A lifted leaf stands on a stem and shows more of its face.
    function leaf(c, x, y, rx, q, lifted) {
      const ry = rx * (lifted ? 0.42 : 0.27), ph = q() * 6.28, notch = q() * 6.28, rot = (q() - 0.5) * (lifted ? 0.5 : 0.12);
      const rim = [];
      for (let i = 0; i < 40; i++) {
        const a = i / 40 * Math.PI * 2, dn = Math.abs(Math.atan2(Math.sin(a - notch), Math.cos(a - notch)));
        const r = (1 + 0.05 * Math.sin(5 * a + ph) + 0.03 * Math.sin(11 * a + ph * 2)) * (dn < 0.11 ? 0.35 + dn * 6 : 1);
        const px = Math.cos(a) * rx * r, py = Math.sin(a) * ry * r;
        rim.push([x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot)]);
      }
      if (lifted) {
        c.strokeStyle = rgba('#4f5c4c', 0.85); c.lineWidth = Math.max(2, rx * 0.05);
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + rx * 0.12, y + lifted * 0.5, x - rx * 0.05, y + lifted); c.stroke();
      }
      const tone = q();
      c.fillStyle = rgba(tone < 0.5 ? '#6b7a64' : '#5a6a57', 0.94);
      fillPoly(c, rim);
      c.save();
      c.beginPath(); rim.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.clip();
      wash(c, rim.map(([a, b]) => [a, b + ry * 0.75, 0.25]), '#34423a', { layers: 5, alpha: 0.09, seed: Math.floor(q() * 1e4) });
      wash(c, rim.map(([a, b]) => [a, b - ry * 1.25, 0.25]), '#c9bb8a', { layers: 5, alpha: 0.08, seed: Math.floor(q() * 1e4) });
      c.strokeStyle = rgba('#2f3b32', 0.3); c.lineWidth = Math.max(0.8, rx * 0.012);
      for (let i = 0; i < 14; i++) { const p2 = rim[Math.floor((i + 0.5) / 14 * 40)]; c.beginPath(); c.moveTo(x, y); c.lineTo(p2[0], p2[1]); c.stroke(); }
      c.restore();
      c.fillStyle = rgba('#2f3b32', 0.5);
      c.beginPath(); c.ellipse(x, y, rx * 0.05, ry * 0.07, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = rgba('#2a332c', 0.45); c.lineWidth = 1.2;
      c.beginPath(); rim.slice(2, 19).forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.stroke(); // the near rim
    }
    // One petal from its base, pointing along angle a (0 is up).
    function petal(c, x, y, a, len, wid, col, alpha) {
      c.save(); c.translate(x, y); c.rotate(a);
      const g = c.createLinearGradient(0, 0, 0, -len);
      g.addColorStop(0, rgba('#f6e6dc', alpha)); g.addColorStop(1, rgba(col, alpha));
      c.fillStyle = g;
      c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(wid, -len * 0.25, wid * 0.9, -len * 0.75, 0, -len); c.bezierCurveTo(-wid * 0.9, -len * 0.75, -wid, -len * 0.25, 0, 0); c.fill();
      c.strokeStyle = rgba('#9c5f66', 0.35 * alpha); c.lineWidth = 1; c.stroke();
      c.restore();
    }
    // A lotus flower or bud on its stem, on its own canvas so it can sway about its foot.
    // open: 0 a bud, 1 a full flower.
    function flower(hh, s, open, seed) {
      const w = Math.ceil(150 * s), h = Math.ceil(hh + 90 * s), c = W.canvas(w, h), x = c.getContext('2d'), q = rng(seed);
      const fx = w / 2, fy = h - 2, tx = fx + (q() - 0.5) * 16 * s, ty = 78 * s;
      x.strokeStyle = rgba('#4f5c4c', 0.9); x.lineWidth = 3.2 * s;
      x.beginPath(); x.moveTo(fx, fy); x.quadraticCurveTo(fx + (q() - 0.5) * 30 * s, (fy + ty) / 2, tx, ty); x.stroke();
      const len = (46 + 14 * q()) * s, pink = ['#d79aa0', '#e3b1b0', '#cf8c95'];
      if (open < 0.3) {
        for (const a of [-0.22, 0.22, 0]) petal(x, tx, ty, a, len * 0.95, len * 0.24, pink[0], 0.95);
      } else {
        for (const a of [-1.25, 1.25, -0.9, 0.9]) petal(x, tx, ty, a * open, len * 0.9, len * 0.3, pink[1], 0.9);
        x.fillStyle = rgba('#c9a46a', 0.95);
        x.beginPath(); x.ellipse(tx, ty - len * 0.2, len * 0.16, len * 0.12, 0, 0, Math.PI * 2); x.fill();
        for (const a of [-0.55, 0.55, -0.28, 0.28, 0]) petal(x, tx, ty, a * open, len * (1 - Math.abs(a) * 0.15), len * 0.3, pink[Math.abs(a) < 0.1 ? 2 : 0], 0.93);
      }
      return { c, ax: fx, ay: fy };
    }

    // ---------- the boat ----------

    // A covered West Lake rowing boat, painted like the hull washes of the other places:
    // a long hull with lifted ends, a cloth roof on four thin posts, a passenger under it,
    // the boatman standing at the stern with a long sculling oar. Returns the oar tip.
    function boat(c, x, y, s) {
      const r = rng(700), L = 250 * s, H = 17 * s;
      const sheer = (u) => Math.pow(Math.abs(u * 2 - 1), 2.6) * 20 * s + (u > 0.5 ? (u - 0.5) * 8 * s : 0);
      const top = [], bot = [];
      for (let i = 0; i <= 26; i++) {
        const u = i / 26, px = x - L / 2 + u * L;
        top.push([px, y - sheer(u) + (r() - 0.5) * s]);
        bot.push([px, y - sheer(u) * 0.7 + H * Math.pow(Math.sin(u * Math.PI), 0.7)]);
      }
      const hull = [...top, ...bot.slice().reverse()].map(([a, b]) => [a, b, 0.04]);
      // its soft reflection first
      const wl = y + H * 0.8;
      c.save(); c.filter = `blur(${1.6 * s}px)`; c.fillStyle = rgba('#3b2f33', 0.22);
      fillPoly(c, hull.map(([a, b]) => [a, wl + (wl - b) * 0.8]));
      c.restore();
      c.fillStyle = rgba('#a48d76', 0.9);
      fillPoly(c, hull);
      wash(c, hull, '#6a5140', { layers: 12, alpha: 0.09, seed: 701 });
      wash(c, [...top.map(([a, b], i) => [a, b + (bot[i][1] - b) * 0.5, 0.05]), ...bot.slice().reverse().map(([a, b]) => [a, b, 0.05])], '#35282a', { layers: 9, alpha: 0.09, seed: 702 });
      dryStroke(c, top, 2.6 * s, INK, { alpha: 0.75, hairs: 2, dry: 0.3, seed: 703 });
      dryStroke(c, bot, 1.5 * s, INK, { alpha: 0.35, hairs: 1, dry: 0.55, seed: 704 });
      for (let i = 0; i < 3; i++) dryStroke(c, top.slice(3, 24).map(([a, b], j) => [a, b + (bot[j + 3][1] - b) * (0.3 + 0.22 * i)]), 1.1 * s, INK, { alpha: 0.22, hairs: 1, dry: 0.7, seed: 705 + i });
      // the passenger under the roof
      const px = x - L * 0.1, py = y - 3 * s;
      c.fillStyle = rgba('#3a3038', 0.8);
      fillPoly(c, taper([[px - 3 * s, py], [px, py - 14 * s], [px + 2 * s, py - 24 * s]], (u) => (15 - 6 * u) * s));
      c.beginPath(); c.arc(px + 3 * s, py - 29 * s, 5 * s, 0, Math.PI * 2); c.fill();
      // posts, a little out of true, and the cloth roof sagging between them
      const x0 = x - L * 0.3, x1 = x + L * 0.14, ry = y - 50 * s;
      for (const [qx, lean] of [[x0, -2], [x0 + (x1 - x0) * 0.36, 1], [x0 + (x1 - x0) * 0.68, -1], [x1, 2]]) {
        c.fillStyle = rgba('#3b2c24', 0.9);
        fillPoly(c, taper([[qx, y - 2 * s], [qx + lean * s * 0.5, y - 26 * s], [qx + lean * s, ry + 6 * s]], () => 3 * s));
      }
      const roofTop = [], roofBot = [];
      for (let i = 0; i <= 16; i++) {
        const u = i / 16, qx = x0 - 14 * s + u * (x1 - x0 + 28 * s);
        roofTop.push([qx, ry - Math.sin(u * Math.PI) * 9 * s + (r() - 0.5) * s]);
        roofBot.push([qx, ry + 6 * s - Math.sin(u * Math.PI) * 4 * s + Math.sin(u * 19) * 1.4 * s]);
      }
      const roof = [...roofTop, ...roofBot.slice().reverse()].map(([a, b]) => [a, b, 0.05]);
      c.fillStyle = rgba('#d2c0a0', 0.92);
      fillPoly(c, roof);
      wash(c, roof, '#8e7650', { layers: 10, alpha: 0.08, seed: 710 });
      wash(c, roof.map(([a, b, v]) => [a - 30 * s, b + 4 * s, v]), '#5d4a3a', { layers: 6, alpha: 0.07, seed: 711 });
      dryStroke(c, roofTop, 2 * s, INK, { alpha: 0.7, hairs: 2, dry: 0.3, seed: 712 });
      dryStroke(c, roofBot, 1.3 * s, INK, { alpha: 0.45, hairs: 1, dry: 0.5, seed: 713 });
      // the boatman: he leans on the oar, one leg forward; a straw hat
      const bx = x + L * 0.33, byy = y - sheer(0.83) * 0.5 - 2 * s;
      c.fillStyle = rgba('#2a2420', 0.9);
      fillPoly(c, taper([[bx - 7 * s, byy], [bx - 3 * s, byy - 14 * s], [bx + 1 * s, byy - 22 * s]], (u) => (6 - 1 * u) * s));
      fillPoly(c, taper([[bx + 6 * s, byy], [bx + 3 * s, byy - 14 * s], [bx + 1 * s, byy - 22 * s]], (u) => (6 - 1 * u) * s));
      fillPoly(c, taper([[bx + 1 * s, byy - 20 * s], [bx + 5 * s, byy - 32 * s], [bx + 11 * s, byy - 42 * s]], (u) => (12 - 3 * u) * s));
      c.beginPath(); c.arc(bx + 13 * s, byy - 47 * s, 4.6 * s, 0, Math.PI * 2); c.fill();
      fillPoly(c, taper([[bx + 9 * s, byy - 38 * s], [bx + 20 * s, byy - 31 * s], [bx + 29 * s, byy - 27 * s]], (u) => (4.5 - 1.5 * u) * s));
      const hat = [[bx - 2 * s, byy - 49 * s, 0.05], [bx + 13 * s, byy - 58 * s, 0.03], [bx + 28 * s, byy - 48 * s, 0.05], [bx + 13 * s, byy - 46 * s, 0.05]];
      c.fillStyle = rgba('#d8c59a', 0.9);
      fillPoly(c, hat);
      wash(c, hat, '#a38652', { layers: 7, alpha: 0.1, seed: 720 });
      dryStroke(c, hat.slice(0, 3), 1.6 * s, INK, { alpha: 0.7, hairs: 1, dry: 0.2, seed: 721 });
      const tip = [bx + 78 * s, y + 30 * s];
      dryStroke(c, [[bx + 18 * s, byy - 38 * s], [bx + 44 * s, byy - 6 * s], tip], 2.6 * s, INK, { alpha: 0.85, hairs: 1, dry: 0.15, seed: 722 });
      return tip;
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
      const glow = ctx.createRadialGradient(GLOW[0], GLOW[1], 20, GLOW[0], GLOW[1], 760);
      glow.addColorStop(0, rgba('#fdebc8', 0.7)); glow.addColorStop(0.35, rgba('#f7cf92', 0.26)); glow.addColorStop(1, rgba('#f7cf92', 0));
      ctx.fillStyle = glow;
      ctx.fillRect(LX, LY, LW, 1300);
    }
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
        const x = PX + q.gauss() * 90, y = yAt(mid, x) + 6 + q() * 8, r = 9 + q() * 13, crown = [];
        for (let j = 0; j < 9; j++) { const a = j / 9 * Math.PI * 2; crown.push([x + Math.cos(a) * r * (0.8 + 0.4 * q()), y - r * 0.5 + Math.sin(a) * r * 0.75 * (0.8 + 0.4 * q()), 0.3]); }
        wash(ctx, crown, ['#4f584f', '#5e6656', '#6f6872'][Math.floor(q() * 3)], { layers: 5, alpha: 0.11, seed: 300 + i });
        wash(ctx, crown.map(([a, b, v]) => [a + r * 0.15, b + r * 0.35, v]), '#343d38', { layers: 3, alpha: 0.08, seed: 400 + i });
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
    wash(ctx, k.densify([[-240, HZ], [2160, HZ], [2160, HZ + 250], [-240, HZ + 230]], 30).map(([x, y]) => [x, y, y > HZ + 10 ? 0.25 : 0.02]), '#f3c9a8', { layers: 10, alpha: 0.07, seed: 8 });
    {
      const q = rng(9);
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 60; i++) {
        const y = HZ + 8 + Math.pow(q(), 1.5) * 420, x = -240 + q() * 2400, len = 50 + q() * 240;
        dryStroke(ctx, [[x, y], [x + len / 2, y + 1], [x + len, y]], 2 + q() * 3, '#000000', { alpha: 0.5, hairs: 2, dry: 0.5, seed: 100 + i });
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // the lotus by the near bank: small far leaves first, big ones by the lens; a few
    // flowers and buds stand on their own stems and sway
    begin('lotus', 1);
    const FLOWERS = [];
    {
      const q = rng(36), items = [];
      for (let i = 0; i < 95; i++) { const v = Math.pow(q(), 0.75); items.push([-240 + q() * 2400, 890 + v * 280, v]); }
      items.sort((a, b) => a[1] - b[1]);
      for (const [x, y, v] of items) {
        const rx = (34 + 62 * v) * (0.8 + 0.5 * q()), up = q() < 0.2 && v > 0.25, lift = up ? (50 + 60 * q()) * (0.5 + v) : 0;
        leaf(ctx, x, y - lift, rx, q, lift);
      }
      for (let i = 0; i < 9; i++) {
        const v = 0.35 + 0.65 * q(), s = 0.7 + 0.8 * v;
        FLOWERS.push({ ...flower((60 + 70 * q()) * s, s, q() < 0.35 ? 0 : 0.7 + 0.3 * q(), 500 + i), x: -180 + (i + q() * 0.8) * 250, y: 960 + v * 200, ph: q() * 6.28 });
      }
      FLOWERS.sort((a, b) => a.y - b.y);
    }
    const BOAT = W.canvas(460, 220), TIP = boat(BOAT.getContext('2d'), 210, 120, 1.25);
    const FLOCK = D.flock({ n: 5, seed: 31, spread: [70, 24], size: 8 });

    // sparks of the sun on the water: short streaks in a path that widens towards us
    const SPARKS = [];
    { const q = rng(41); for (let i = 0; i < 60; i++) { const v = Math.pow(q(), 1.4); SPARKS.push({ v, dx: (q() - 0.5) * (120 + 420 * v), len: 14 + 70 * v * q() + 10 * q(), ph: q() * 6.28, sp: 2 + q() * 3, warm: q() < 0.7 }); } }

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
        NEAR.push({ ...bunch(61 + i, { len: (300 + 400 * q()) * edge, n: 4 + Math.floor(q() * 7), s: 1.15, tone: q() * 0.4, spread: 40 + 120 * q() }), x: x + (q() - 0.5) * 30, y: y + 6, ph: x / 260, amp: 0.022 + 0.014 * q() });
      }
      for (let i = 0; i < 15; i++) {
        const x = -420 + 1340 * (i + q() * 0.7) / 15, edge = Math.min(1, (920 - x) / 400 + 0.3);
        FARB.push({ ...bunch(81 + i, { len: (260 + 360 * q()) * edge, n: 3 + Math.floor(q() * 6), s: 0.8, tone: 0.8 + q() * 0.4, spread: 50 + 120 * q() }), x, y: -40 - q() * 60, ph: x / 260 + 1, amp: 0.016 + 0.012 * q() });
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
      // sparks under the glow of the sky (the sky is far, the water nearer: keep them in line)
      {
        const z5 = view(cam, 0.5), z1 = 1 + (cam.zoom - 1) * 0.1, sx = 960 + cam.x * 0.5 + (z1 / z5) * (GLOW[0] - 960 - cam.x * 0.1);
        for (const s of SPARKS) {
          const a = 0.3 + 0.5 * Math.max(0, Math.sin(t * s.sp + s.ph));
          out.fillStyle = rgba(s.warm ? '#fbe2b8' : '#f8efe2', a * (0.55 + 0.45 * (1 - s.v)));
          out.beginPath(); out.ellipse(sx + s.dx, HZ + 10 + s.v * 330, s.len / 2, 1.3 + 2.2 * s.v, 0, 0, Math.PI * 2); out.fill();
        }
      }
      show('mist', cam, 1, (t * 12) % 200);
      // the boat rows to the left, bobbing; rings spread where the oar works
      view(cam, 0.8);
      {
        const bx = 1560 - t * 34, by = 800 + Math.sin(t * 2) * 1.4;
        out.strokeStyle = '#6d6a7c'; out.lineWidth = 1.3;
        for (let i = 0; i < 3; i++) {
          const a = (t / 0.9 + i / 3) % 1;
          out.globalAlpha = 0.4 * (1 - a);
          out.beginPath(); out.ellipse(bx - 210 + TIP[0], 800 - 120 + TIP[1], 8 + 58 * a, 2 + 12 * a, 0, 0, Math.PI * 2); out.stroke();
        }
        out.globalAlpha = 1;
        out.drawImage(BOAT, bx - 210, by - 120);
      }
      view(cam, 0.9);
      D.ring(out, 700, 880, t - 0.9, { size: 40, alpha: 0.3, color: '#6d6a7c' });
      show('lotus', cam);
      view(cam, 1);
      const base = out.getTransform();
      for (const F of FLOWERS) {
        out.setTransform(base);
        out.translate(F.x, F.y);
        out.rotate(Math.sin(t * 1.3 + F.ph) * 0.035);
        out.drawImage(F.c, -F.ax, -F.ay);
      }
      bunches(FARB, cam, 1.3, t, 0.9);
      view(cam, 1.6);
      out.drawImage(LIMB, -520, -120);
      bunches(NEAR, cam, 1.6, t, 1);
    }
    // the crest for the cuts: the hills with the pagoda standing on them
    const sky = k.skylineOf('mid').pts;
    const crestLine = mid.map(([x, y]) => {
      let top = Math.min(y, HZ);
      if (Math.abs(x - PX) < 140) for (const [sx, sy] of sky) if (Math.abs(sx - x) < 5 && sy < top) top = sy;
      return [x, top];
    });
    return { frame, ridge: { pts: crestLine, p: 0.35 } };
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
