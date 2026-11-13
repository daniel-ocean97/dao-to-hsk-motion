// West Lake, Hangzhou (西湖): the Leifeng pagoda on its hill across the water, willows,
// lotus, a covered boat. Slot: day. DRAFT: composition sketches chosen by k.variant
// (skill `location`, stage 2):
//   1  the classic view: the pagoda across the lake, willow twigs by the lens, lotus below
//   2  the pagoda large on its hill, mirrored in the water; a willow on the near bank
//   3  through a willow curtain: the camera pans and the pagoda comes out from behind it
//   4  low over the lotus: a field of leaves and flowers, a causeway with a bridge, the pagoda far
// Probe: videos/probe-places/?place=xihu&variant=2
(function () {
  let CAM = () => ({ x: 0, y: 0, zoom: 1 });

  function setup(k) {
    const { W, D, out, DURATION, INK, INK2, view, show, sky, mist, range, caption } = k;
    const { rgba, wash, dryStroke, taper, fillPoly, rng } = W;
    const V = k.variant || '1';
    let ctx;
    const begin = (...a) => { const layer = k.begin(...a); ctx = layer.c.getContext('2d'); return layer; };

    // Low rolling hills; `extra` adds single hills (the one under the pagoda).
    function hills({ base, hMin, hMax, gap, seed, extra = [] }) {
      const peaks = W.peakRow({ x0: -300, x1: 2200, hMin, hMax, gap, seed }).map((p) => ({ ...p, wl: (p.wl ?? p.w) * 2.3, wr: (p.wr ?? p.w) * 2.3, w: p.w * 2.3 }));
      return W.ridge({ x0: -240, x1: 2160, base, jag: 4, seed, step: 8, peaks: [...peaks, ...extra] });
    }
    function paintHills(ridge, HZ, color, deep, seed) {
      const L = range({ oy: 100, h: 800, ridge, color, deep, fadeTo: HZ + 14, seed, under: '#eceeec' });
      ctx.drawImage(L.c, L.ox, L.oy);
    }
    // The Leifeng pagoda: eight-sided, five storeys, each a body under a roof with
    // upturned corners; a stone base, a spire. (x, y) is the middle of its foot.
    function pagoda(c, x, y, h) {
      const th = h * 0.8 / 5, w0 = h * 0.3;
      c.fillStyle = rgba('#8f8882', 0.95);
      c.fillRect(x - w0 * 0.8, y - h * 0.05, w0 * 1.6, h * 0.05);
      for (let i = 0; i < 5; i++) {
        const w = w0 * (1 - i * 0.11), by = y - h * 0.05 - i * th, y1 = by - th * 0.62;
        c.fillStyle = rgba('#8a5d4b', 0.95);
        c.fillRect(x - w / 2, y1, w, th * 0.62);
        c.fillStyle = rgba('#5e3f33', 0.6);
        c.fillRect(x + w * 0.12, y1, w * 0.38, th * 0.62); // the sides turned away from the light
        c.fillStyle = rgba('#3a3532', 0.95);
        fillPoly(c, [[x - w * 0.9, y1 - th * 0.12], [x - w * 0.62, y1 + th * 0.05], [x + w * 0.62, y1 + th * 0.05], [x + w * 0.9, y1 - th * 0.12], [x + w * 0.44, y1 - th * 0.38], [x - w * 0.44, y1 - th * 0.38]]);
      }
      c.fillStyle = rgba('#3a3532', 0.95);
      fillPoly(c, taper([[x, y - h * 0.85], [x, y - h]], (u) => Math.max(1.2, h * 0.022 * (1 - u * 0.8))));
      c.beginPath(); c.arc(x, y - h * 0.9, h * 0.016, 0, Math.PI * 2); c.fill();
    }
    function water(HZ, color = '#b9c9cc') {
      wash(ctx, [[-240, HZ, 0.01], [2160, HZ, 0.01], [2160, 1190, 0.05], [-240, 1190, 0.05]], color, { layers: 16, alpha: 0.07, seed: 7 });
    }
    function mirror(HZ, fn) {
      ctx.save();
      ctx.translate(0, 2 * HZ); ctx.scale(1, -0.9); ctx.translate(0, HZ * 0.1 / 0.9 * 0);
      ctx.globalAlpha = 0.28; ctx.filter = 'blur(4px)';
      fn();
      ctx.restore();
    }
    // One hanging willow twig with its leaves.
    function twig(c, x, y, len, q, s = 1) {
      const dx = (q() - 0.5) * len * 0.12, pts = [];
      for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push([x + dx * u * u + Math.sin(u * 5 + x) * 3 * s, y + len * u]); }
      c.strokeStyle = rgba('#4f5f4d', 0.7); c.lineWidth = 1.6 * s;
      c.beginPath(); pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.stroke();
      for (let i = 1; i < pts.length; i++) for (const side of [-1, 1]) {
        if (q() < 0.25) continue;
        c.fillStyle = rgba(q() < 0.5 ? '#5c6e5a' : '#7c8f70', 0.55 + 0.3 * q());
        c.save(); c.translate(pts[i][0], pts[i][1] - q() * len * 0.05); c.rotate(side * (0.35 + q() * 0.3));
        c.beginPath(); c.ellipse(side * 2 * s, 9 * s, 2.6 * s, 11 * s, 0, 0, Math.PI * 2); c.fill(); c.restore();
      }
    }
    // Willow boughs entering from the top with twigs hanging off them; (0, 0) is the corner
    // they come from, dir the side they spread to. Returns a canvas to hang by its top.
    function willowHang(w, h, dir, seed, s = 1) {
      const c = W.canvas(w, h), x = c.getContext('2d'), q = rng(seed);
      const ox = dir > 0 ? 0 : w;
      for (let b = 0; b < 4; b++) {
        const pts = [], reach = w * (0.45 + 0.18 * b), drop = h * (0.06 + 0.07 * b);
        for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([ox + dir * reach * u, drop * Math.sin(u * 2.2) + 8 + b * 6]); }
        x.fillStyle = rgba(INK, 0.8);
        fillPoly(x, taper(pts, (u) => Math.max(1.5, 13 * s * (1 - u * 0.85))));
        for (let i = 2; i <= 14; i++) for (let j = 0; j < 2; j++) twig(x, pts[i][0] + (q() - 0.5) * 40, pts[i][1], h * (0.35 + 0.5 * q()), q, s);
      }
      return c;
    }
    // A whole willow on a bank: a leaning trunk, boughs arching out, twigs down to the water.
    function willowTree(c, x, y, h, seed) {
      const q = rng(seed), s = h / 500;
      const trunk = [];
      for (let i = 0; i <= 10; i++) { const u = i / 10; trunk.push([x + h * 0.12 * Math.sin(u * 2.2), y - h * 0.5 * u]); }
      c.fillStyle = rgba(INK, 0.88);
      fillPoly(c, taper(trunk, (u) => Math.max(2, h * 0.07 * (1 - u * 0.6))));
      const [tx, ty] = trunk.at(-1);
      for (let b = 0; b < 9; b++) {
        const a = -Math.PI * (0.08 + 0.84 * b / 8), R = h * (0.3 + 0.16 * q()), pts = [];
        for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push([tx + Math.cos(a) * R * u, ty + Math.sin(a) * R * u * (1 - 0.45 * u) - h * 0.1 * Math.sin(u * Math.PI)]); }
        c.fillStyle = rgba(INK, 0.8);
        fillPoly(c, taper(pts, (u) => Math.max(1.2, 9 * s * (1 - u * 0.85))));
        for (let i = 3; i <= 10; i++) for (let j = 0; j < 2; j++) twig(c, pts[i][0] + (q() - 0.5) * 30 * s, pts[i][1], h * (0.3 + 0.35 * q()), q, s);
      }
    }
    // Lotus: flat round leaves on the water, a few lifted on stems, buds and open flowers.
    function lotus(c, x0, x1, y0, y1, n, s, seed) {
      const q = rng(seed), items = [];
      for (let i = 0; i < n; i++) items.push([x0 + q() * (x1 - x0), y0 + Math.pow(q(), 0.8) * (y1 - y0), q(), q()]);
      items.sort((a, b) => a[1] - b[1]);
      for (const [x, y, a, b] of items) {
        const d = s * (0.6 + 0.6 * (y - y0) / (y1 - y0 || 1)), rx = (46 + 34 * a) * d;
        if (b < 0.16) { // a flower on a stem
          const top = y - (90 + 60 * a) * d;
          c.strokeStyle = rgba('#56655a', 0.8); c.lineWidth = 3 * d;
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 8 * d, (y + top) / 2, x, top); c.stroke();
          for (const r of [-0.5, 0.5, -0.2, 0.2, 0]) {
            c.fillStyle = rgba(r === 0 ? '#e3c9c4' : '#cfa5a2', 0.85);
            c.save(); c.translate(x, top); c.rotate(r);
            c.beginPath(); c.ellipse(0, -18 * d, 9 * d, 22 * d, 0, 0, Math.PI * 2); c.fill(); c.restore();
          }
          continue;
        }
        const lift = b > 0.8 ? (40 + 50 * a) * d : 0;
        if (lift) { c.strokeStyle = rgba('#56655a', 0.8); c.lineWidth = 3 * d; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 4 * d, y - lift); c.stroke(); }
        c.fillStyle = rgba(a < 0.5 ? '#6f8270' : '#5c6e5a', 0.9);
        c.beginPath(); c.ellipse(x, y - lift, rx, rx * (lift ? 0.42 : 0.3), (a - 0.5) * 0.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = rgba('#3d4a3f', 0.45);
        c.beginPath(); c.ellipse(x + rx * 0.1, y - lift + rx * 0.04, rx * 0.5, rx * 0.12, 0, 0, Math.PI * 2); c.fill();
      }
    }
    // A covered West Lake rowing boat with a boatman at the stern.
    function boat(c, x, y, s) {
      c.fillStyle = rgba('#3b2f26', 0.9);
      fillPoly(c, [[x - 80 * s, y - 10 * s], [x - 60 * s, y + 6 * s], [x + 60 * s, y + 6 * s], [x + 86 * s, y - 14 * s], [x + 60 * s, y - 4 * s], [x - 60 * s, y - 4 * s]]);
      c.fillStyle = rgba('#9a7f5f', 0.9);
      c.fillRect(x - 46 * s, y - 30 * s, 70 * s, 5 * s);
      c.fillStyle = rgba('#3b2f26', 0.8);
      for (const o of [-44, -12, 20]) c.fillRect(x + o * s, y - 26 * s, 2.5 * s, 22 * s);
      fillPoly(c, taper([[x + 48 * s, y - 6 * s], [x + 50 * s, y - 34 * s]], () => 8 * s));
      c.beginPath(); c.arc(x + 50 * s, y - 40 * s, 5 * s, 0, Math.PI * 2); c.fill();
      c.strokeStyle = rgba('#3b2f26', 0.8); c.lineWidth = 2 * s;
      c.beginPath(); c.moveTo(x + 52 * s, y - 24 * s); c.lineTo(x + 96 * s, y + 14 * s); c.stroke();
    }
    const foot = (ridge, px) => ridge.reduce((a, b) => (Math.abs(b[0] - px) < Math.abs(a[0] - px) ? b : a))[1] + 8;
    const sprite = (w, h, fn) => { const c = W.canvas(w, h); fn(c.getContext('2d')); return c; };
    // draw a sprite hung by its top edge at world (x, y), swaying
    function hang(S, cam, p, x, y, t, amp = 0.02) {
      view(cam, p);
      out.translate(x, y);
      out.transform(1, 0, Math.sin(t * 1.4) * amp, 1, 0, 0);
      out.drawImage(S, 0, 0);
    }
    function sail(B, cam, p, x, y, t) {
      view(cam, p);
      out.drawImage(B, x - 120, y - 70 + Math.sin(t * 2) * 1.2);
    }

    const def = DH.location.get('xihu');
    const cap = (o) => Object.assign(def.caption, { t0: 0.15, tOut: 2.05, wind: [560, -60], ...o });
    const BOAT = sprite(240, 120, (c) => boat(c, 120, 70, 1));
    const FLOCK = D.flock({ n: 5, seed: 31, spread: [70, 24], size: 8 });
    let RIDGE, FRAME;

    if (V === '1') {
      const HZ = 690, px = 1300;
      const far = hills({ base: HZ, hMin: 90, hMax: 190, gap: 300, seed: 11 });
      const mid = hills({ base: HZ + 4, hMin: 50, hMax: 110, gap: 260, seed: 13, extra: [{ x: px, h: 150, w: 420, k: 1.3 }] });
      begin('sky', 0); sky('#f3f2ee', '#e3e8ea', HZ);
      begin('far', 0.15); paintHills(far, HZ, '#c6ced2', '#aab5bb', 12);
      begin('mid', 0.35); paintHills(mid, HZ, '#8a9790', '#62716a', 14); pagoda(ctx, px, foot(mid, px), 230);
      begin('mist', 0.45); mist(HZ - 10, 70, '#f1f2ef', 15);
      begin('water', 0.7); water(HZ); mirror(HZ, () => pagoda(ctx, px, foot(mid, px), 230));
      begin('lotus', 1); lotus(ctx, -240, 900, 900, 1150, 46, 1.2, 16);
      const WIL = willowHang(900, 620, -1, 17);
      RIDGE = { pts: mid, p: 0.35 };
      CAM = DH.location.glide({ x: -60, y: 10, zoom: 1.02 }, { x: 80, y: 0, zoom: 1.08 });
      cap({ x: 520, y: 250, p: 0.3 });
      FRAME = (t) => {
        const cam = CAM(t);
        show('sky', cam); show('far', cam);
        view(cam, 0.2); D.birds(out, FLOCK, 760 + 40 * t, 330 - 6 * t, t, { color: INK2, alpha: 0.4 });
        caption(cam, t);
        show('mid', cam); show('mist', cam, 1, (t * 10) % 200); show('water', cam);
        sail(BOAT, cam, 0.8, 760 - t * 40, 800, t);
        show('lotus', cam);
        hang(WIL, cam, 1.5, 1180, -130, t);
      };
    } else if (V === '2') {
      const HZ = 760, px = 1330;
      const far = hills({ base: HZ, hMin: 90, hMax: 200, gap: 300, seed: 21 });
      const mid = hills({ base: HZ + 4, hMin: 50, hMax: 120, gap: 300, seed: 23, extra: [{ x: px, h: 250, w: 620, k: 1.25 }] });
      begin('sky', 0); sky('#f3f2ee', '#e3e8ea', HZ);
      begin('far', 0.15); paintHills(far, HZ, '#c6ced2', '#aab5bb', 22);
      begin('mid', 0.4); paintHills(mid, HZ, '#84928a', '#5d6c65', 24); pagoda(ctx, px, foot(mid, px), 370);
      begin('mist', 0.5); mist(HZ - 6, 60, '#f1f2ef', 25);
      begin('water', 0.7); water(HZ); mirror(HZ, () => pagoda(ctx, px, foot(mid, px), 370));
      begin('near', 1);
      wash(ctx, [[-240, 1190], [-240, 930], [60, 900], [330, 930], [470, 1010], [560, 1190]].map(([a, b]) => [a, b, 0.1]), '#6f7a70', { layers: 14, alpha: 0.08, seed: 26 });
      willowTree(ctx, 140, 930, 760, 27);
      lotus(ctx, 420, 1100, 990, 1150, 22, 1.1, 28);
      RIDGE = { pts: mid, p: 0.4 };
      CAM = DH.location.glide({ x: -40, y: 20, zoom: 1.0 }, { x: 60, y: -10, zoom: 1.1 });
      cap({ x: 760, y: 270, p: 0.3 });
      FRAME = (t) => {
        const cam = CAM(t);
        show('sky', cam); show('far', cam);
        caption(cam, t);
        show('mid', cam); show('mist', cam, 1, (t * 10) % 200); show('water', cam);
        sail(BOAT, cam, 0.8, 1180 - t * 60, 890, t);
        show('near', cam);
      };
    } else if (V === '3') {
      const HZ = 700, px = 1080;
      const far = hills({ base: HZ, hMin: 90, hMax: 190, gap: 300, seed: 31 });
      const mid = hills({ base: HZ + 4, hMin: 50, hMax: 110, gap: 260, seed: 33, extra: [{ x: px, h: 140, w: 400, k: 1.3 }] });
      begin('sky', 0); sky('#f3f2ee', '#e3e8ea', HZ);
      begin('far', 0.15); paintHills(far, HZ, '#c6ced2', '#aab5bb', 32);
      begin('mid', 0.35); paintHills(mid, HZ, '#8a9790', '#62716a', 34); pagoda(ctx, px, foot(mid, px), 220);
      begin('mist', 0.45); mist(HZ - 10, 70, '#f1f2ef', 35);
      begin('water', 0.7); water(HZ); mirror(HZ, () => pagoda(ctx, px, foot(mid, px), 220));
      begin('lotus', 1); lotus(ctx, -240, 2160, 930, 1160, 80, 1.2, 36);
      const WIL = willowHang(1700, 760, 1, 37, 1.3);
      RIDGE = { pts: mid, p: 0.35 };
      CAM = DH.location.glide({ x: -170, y: 10, zoom: 1.03 }, { x: 130, y: 0, zoom: 1.08 });
      cap({ x: 1560, y: 280, p: 0.3, t0: 0.5 });
      FRAME = (t) => {
        const cam = CAM(t);
        show('sky', cam); show('far', cam);
        caption(cam, t);
        show('mid', cam); show('mist', cam, 1, (t * 10) % 200); show('water', cam);
        sail(BOAT, cam, 0.8, 1500 - t * 30, 790, t);
        show('lotus', cam);
        hang(WIL, cam, 1.6, -420, -130, t, 0.03);
      };
    } else {
      const HZ = 600, px = 1450;
      const far = hills({ base: HZ, hMin: 80, hMax: 170, gap: 300, seed: 41 });
      const mid = hills({ base: HZ + 4, hMin: 40, hMax: 90, gap: 260, seed: 43, extra: [{ x: px, h: 120, w: 360, k: 1.3 }] });
      begin('sky', 0); sky('#f3f2ee', '#e3e8ea', HZ);
      begin('far', 0.15); paintHills(far, HZ, '#c6ced2', '#aab5bb', 42);
      begin('mid', 0.3); paintHills(mid, HZ, '#8a9790', '#62716a', 44); pagoda(ctx, px, foot(mid, px), 170);
      begin('water', 0.6); water(HZ); mirror(HZ, () => pagoda(ctx, px, foot(mid, px), 170));
      // a causeway with an arched bridge and willows along it
      begin('dike', 0.45);
      ctx.fillStyle = rgba('#6d7a72', 0.85);
      ctx.fillRect(-240, HZ + 26, 1100, 12);
      ctx.beginPath(); ctx.moveTo(560, HZ + 38); ctx.quadraticCurveTo(700, HZ - 26, 840, HZ + 38); ctx.lineTo(800, HZ + 38); ctx.quadraticCurveTo(700, HZ, 600, HZ + 38); ctx.fill();
      for (let i = 0; i < 9; i++) willowTree(ctx, -200 + i * 90 + (i % 2) * 20, HZ + 30, 120 + (i % 3) * 20, 45 + i);
      begin('lotus', 1); lotus(ctx, -240, 2160, 760, 1170, 150, 1.5, 46);
      RIDGE = { pts: mid, p: 0.3 };
      CAM = DH.location.glide({ x: -50, y: 50, zoom: 1.1 }, { x: 60, y: 0, zoom: 1.02 });
      cap({ x: 560, y: 230, p: 0.3 });
      FRAME = (t) => {
        const cam = CAM(t);
        show('sky', cam); show('far', cam);
        view(cam, 0.2); D.birds(out, FLOCK, 900 + 40 * t, 300 - 6 * t, t, { color: INK2, alpha: 0.4 });
        caption(cam, t);
        show('mid', cam); show('water', cam); show('dike', cam);
        sail(BOAT, cam, 0.7, 1050 + t * 50, 700, t);
        show('lotus', cam);
      };
    }
    return { frame: FRAME, ridge: RIDGE };
  }

  DH.location.define('xihu', {
    name: 'Западное озеро',
    time: 'day',
    horizon: 700, // the far shore of the lake
    hasWater: true,
    caption: { hanzi: '西湖', pinyin: 'Xīhú', x: 520, y: 250, p: 0.3, t0: 0.15, tOut: 2.05, wind: [560, -60] },
    camera: (t) => CAM(t),
    setup,
  });
})();
