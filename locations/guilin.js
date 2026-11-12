// Guilin (桂林): karst peaks come out of the mist, a boat glides on the Li river, ripples
// spread; the caption over the water, mirrored in it. Slot: day.
// Probe: videos/probe-places/?place=guilin
(function () {
  function setup(k) {
    const { W, D, out, LX, LY, LW, LH, LAYERS, DURATION, INK, INK2, place, view, show, masked, smooth, sky, range, mist, skylineOf, caption, camera } = k;
    const { rgba, wash, dryStroke, taper, fillPoly, rng } = W;
    let ctx; // the context of the layer being painted
    const begin = (...a) => { const layer = k.begin(...a); ctx = layer.c.getContext('2d'); return layer; };

    function karstRow({ x0, x1, base, hMin, hMax, gap, seed }) {
      const r = rng(seed), peaks = [];
      for (let x = x0 + r() * gap; x < x1; x += gap * (0.5 + r() * 0.8)) {
        const h = hMin + (hMax - hMin) * r();
        peaks.push({ x, h, w: h * (0.32 + r() * 0.2), dome: 1.8 + r() * 1.6 });
      }
      return W.ridge({ x0, x1, base, jag: 6, seed, step: 6, peaks });
    }

    // Li river fishing boat, painted rather than cut out: the hull is a few glazes darker
    // towards the keel with a broken ink line along the gunwale, the canopy a ragged wash
    // with uneven ribs, the fisherman a couple of brush strokes under a conical hat.
    function boat(c, x, y, s) {
      const r = rng(300);
      const L = 230 * s, H = 16 * s;
      const curve = (u) => Math.pow(Math.abs(u * 2 - 1), 3) * 26 * s; // ends rise
      const top = [], bot = [];
      for (let i = 0; i <= 24; i++) {
        const u = i / 24, px = x - L / 2 + u * L;
        top.push([px, y - curve(u) + (r() - 0.5) * s]);
        bot.push([px, y - curve(u) * 0.75 + H * Math.sin(u * Math.PI) * 0.9]);
      }
      const hull = [...top, ...bot.slice().reverse()].map(([a, b]) => [a, b, 0.04]);
      c.fillStyle = rgba('#b5a189', 0.85);
      fillPoly(c, hull);
      wash(c, hull, '#6b5444', { layers: 14, alpha: 0.09, seed: 301 });
      // darker towards the keel
      const keel = [...top.map(([a, b], i) => [a, b + (bot[i][1] - b) * 0.45, 0.05]), ...bot.slice().reverse().map(([a, b]) => [a, b, 0.05])];
      wash(c, keel, '#3b2f26', { layers: 10, alpha: 0.08, seed: 305 });
      dryStroke(c, top, 2.4 * s, INK, { alpha: 0.75, hairs: 2, dry: 0.3, seed: 302 });
      dryStroke(c, bot, 1.4 * s, INK, { alpha: 0.35, hairs: 1, dry: 0.55, seed: 306 });
      // canopy: arched bamboo cover over the middle third
      const cx = x - L * 0.05, cw = L * 0.34, ch = 30 * s;
      const arch = [];
      for (let i = 0; i <= 16; i++) { const u = i / 16; arch.push([cx - cw / 2 + u * cw, y - 2 * s - Math.sin(u * Math.PI) * ch + (r() - 0.5) * s]); }
      const canopy = [...arch, [cx + cw / 2, y + 2 * s], [cx - cw / 2, y + 2 * s]].map(([a, b]) => [a, b, 0.05]);
      c.fillStyle = rgba('#cbb894', 0.8);
      fillPoly(c, canopy);
      wash(c, canopy, '#7d6646', { layers: 12, alpha: 0.08, seed: 303 });
      wash(c, canopy.map(([a, b, v]) => [a + cw * 0.12, b + ch * 0.15, v]), '#4f3f2e', { layers: 6, alpha: 0.07, seed: 307 });
      for (let k = 1; k < 6; k++) {
        const u = k / 6 + (r() - 0.5) * 0.04, px = cx - cw / 2 + u * cw;
        dryStroke(c, [[px, y - 2 * s - Math.sin(u * Math.PI) * ch], [px + (r() - 0.5) * 2 * s, y + 1 * s]], 1.3 * s, INK, { alpha: 0.4, hairs: 1, dry: 0.4, seed: 310 + k });
      }
      dryStroke(c, arch, 2 * s, INK, { alpha: 0.7, hairs: 2, dry: 0.25, seed: 304 });
      // fisherman at the stern: body as one tapered stroke, head, hat as a wash under ink
      const fx = x + L * 0.32, fy = y - curve(0.82) * 0.4;
      const bodyPts = [];
      for (let k = 0; k <= 8; k++) bodyPts.push([fx + Math.sin(k / 8 * 2) * 1.5 * s, fy - k / 8 * 32 * s]);
      c.fillStyle = rgba('#2a2420', 0.85);
      fillPoly(c, taper(bodyPts, (u) => (13 - 5 * u) * s));
      c.beginPath(); c.arc(fx + 0.5 * s, fy - 36 * s, 4.5 * s, 0, Math.PI * 2); c.fill();
      const hat = [[fx - 18 * s, fy - 35 * s, 0.05], [fx + 0.5 * s, fy - 49 * s, 0.03], [fx + 19 * s, fy - 35 * s, 0.05], [fx, fy - 32 * s, 0.05]];
      c.fillStyle = rgba('#d2bf94', 0.85);
      fillPoly(c, hat);
      wash(c, hat, '#a38652', { layers: 8, alpha: 0.1, seed: 320 });
      dryStroke(c, [[fx - 18 * s, fy - 35 * s], [fx + 0.5 * s, fy - 49 * s], [fx + 19 * s, fy - 35 * s]], 1.8 * s, INK, { alpha: 0.75, hairs: 1, dry: 0.15, seed: 321 });
      dryStroke(c, [[fx + 4 * s, fy - 26 * s], [fx + 37 * s, fy + 4 * s], [fx + 70 * s, fy + 34 * s]], 2.2 * s, INK, { alpha: 0.8, hairs: 1, dry: 0.2, seed: 322 });
      // a cormorant on the bow (the fishermen of the Li river fish with them): a dark bird
      // standing upright, its neck in an S, the beak forward
      const cbx = x - L / 2 + 0.1 * L, cby = y - curve(0.1) - s;
      c.fillStyle = rgba('#241d1a', 0.88);
      c.save();
      c.translate(cbx, cby - 9 * s); c.rotate(1.0);
      c.beginPath(); c.ellipse(0, 0, 10 * s, 4.6 * s, 0, 0, Math.PI * 2); c.fill();
      c.restore();
      const neck = [];
      for (let k = 0; k <= 8; k++) { const u = k / 8; neck.push([cbx - (4 + 3.5 * u - Math.sin(u * Math.PI) * 3.5) * s, cby - (15 + 15 * u) * s]); }
      fillPoly(c, taper(neck, (u) => (4.4 - 1.8 * u) * s));
      c.beginPath(); c.ellipse(cbx - 8.6 * s, cby - 30.6 * s, 3.5 * s, 2.5 * s, -0.2, 0, Math.PI * 2); c.fill();
      fillPoly(c, [[cbx - 10 * s, cby - 32 * s], [cbx - 18.5 * s, cby - 29.4 * s], [cbx - 10 * s, cby - 29.2 * s]]);
      fillPoly(c, taper([[cbx + 4 * s, cby - 4 * s], [cbx + 8 * s, cby], [cbx + 11 * s, cby + 3 * s]], (u) => (5 - 3 * u) * s));
      // reflection at the waterline, soft, and ripples from the pole
      const wl = Math.max(...hull.map(([, b0]) => b0));
      c.save();
      c.filter = `blur(${2.5 * s}px)`;
      c.fillStyle = rgba('#3b2f26', 0.12);
      fillPoly(c, hull.map(([a0, b0]) => [a0, 2 * wl - b0 - 3 * s]));
      c.restore();
      return { tip: [fx + 70 * s, fy + 34 * s], s };
    }

    // Ripples spreading from the pole tip: rings grow and fade, a new one every 0.8 s.
    function ripples(c, [x, y], s, t) {
      c.strokeStyle = '#5d6670';
      c.lineWidth = 1.3;
      for (let k = 0; k < 3; k++) {
        const a = ((t / 0.8 + k / 3) % 1);
        c.globalAlpha = 0.4 * (1 - a);
        c.beginPath(); c.ellipse(x, y, (6 + 46 * a) * s, (1.5 + 10 * a) * s, 0, 0, Math.PI * 2); c.stroke();
      }
      c.globalAlpha = 1;
    }

    function paintGuilin() {
      begin('sky', 0);
      sky('#f3f2ee', '#e3e7ea', 700);
      const HZ = 690;
      // tall peaks far away in the haze, lower hills in front of them (as along the Li river)
      const far = karstRow({ x0: -240, x1: 2160, base: HZ, hMin: 230, hMax: 470, gap: 200, seed: 91 });
      const mid = karstRow({ x0: -240, x1: 2160, base: HZ + 6, hMin: 90, hMax: 230, gap: 170, seed: 93 });
      RIDGE = { pts: far, p: 0.2 }; // the tall peaks: the silhouette for the cut
      begin('far', 0.2);
      const L1 = range({ oy: 100, h: 800, ridge: far, color: '#c3c9cf', deep: '#a7b0b8', fadeTo: HZ + 10, seed: 92, under: '#ebeceb' });
      ctx.drawImage(L1.c, L1.ox, L1.oy);
      begin('mistA', 0.3);
      mist(HZ - 60, 110, '#f2f2ef', 94);
      begin('mid', 0.5);
      const L2 = W.mountains({ w: 2400, h: 700, ox: -240, oy: 160, ridge: mid, color: '#7f8a86', deep: '#56625d', fadeTo: HZ + 20, ink: 40, inkColor: INK2, seed: 95, under: '#e6e8e6' });
      // green dabs of vegetation on the peaks
      const lc = L2.getContext('2d'), r = rng(96);
      lc.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 260; i++) {
        const p = mid[Math.floor(r() * mid.length)];
        const x = p[0] + 240 + (r() - 0.5) * 30, y = p[1] - 160 + 10 + r() * 140;
        lc.fillStyle = rgba(r() < 0.6 ? '#5c6e5a' : '#3d4a3f', 0.12 + 0.18 * r());
        lc.beginPath(); lc.ellipse(x, y, 4 + r() * 9, 2 + r() * 4, r() * 3, 0, Math.PI * 2); lc.fill();
      }
      ctx.drawImage(L2, -240, 160);
      // river: pale wash, reflections of the peaks, light streaks
      begin('water', 0.8);
      const wcv = W.canvas(2400, 1190 - HZ), wx = wcv.getContext('2d');
      wx.translate(240, -HZ);
      wash(wx, [[-240, HZ, 0.01], [2160, HZ, 0.01], [2160, 1190, 0.05], [-240, 1190, 0.05]], '#b9c4cc', { layers: 16, alpha: 0.07, seed: 97 });
      wx.setTransform(1, 0, 0, -0.85, 0, 0.85 * (HZ - 160));
      wx.globalAlpha = 0.28;
      wx.filter = 'blur(4px)';
      wx.drawImage(L2, 0, 0);
      wx.filter = 'none';
      wx.globalAlpha = 1;
      wx.setTransform(1, 0, 0, 1, 240, -HZ);
      wx.globalCompositeOperation = 'destination-out';
      const r2 = rng(98);
      for (let i = 0; i < 70; i++) {
        const y = HZ + 6 + Math.pow(r2(), 1.5) * 380, x = -240 + r2() * 2400, len = 40 + r2() * 220;
        dryStroke(wx, [[x, y], [x + len / 2, y + 1], [x + len, y]], 2 + r2() * 3, '#000000', { alpha: 0.6, hairs: 2, dry: 0.5, seed: 99 + i });
      }
      ctx.drawImage(wcv, -240, HZ);
      begin('mistB', 0.75);
      mist(HZ + 4, 60, '#eef0ef', 101, 0.8);
      const bl = begin('boat', 1);
      Object.assign(bl, boat(ctx, 760, 905, 1.4));
      FLOCK = D.flock({ n: 6, seed: 61, spread: [80, 26], size: 8 });
      BAMBOO = D.bamboo({ seed: 7 });
    }
    let FLOCK, BAMBOO, HAWK;

    // Peaks come out of the mist one after another from left to right; the camera glides low
    // over the river; the boat moves slowly to the left, bobbing, ripples spread from the pole.
    function frameGuilin(t) {
      const cam = camera(t);
      const front = DH.lerp(-200, 2600, DH.ease.draw(DH.progress(t, 0, 2.2)));
      show('sky', cam);
      const img = masked('far', (m) => {
        const g = m.createLinearGradient(front - 600, 0, front, 0);
        g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
        m.fillStyle = g;
        m.fillRect(LX, LY, LW, LH);
      });
      place(img, LX, LY, cam, LAYERS.far.p);
      // far birds cross the sky in front of the tall peaks
      view(cam, 0.25);
      D.birds(out, FLOCK, 520 + 50 * t, 250 - 8 * t, t, { color: INK2, alpha: 0.42 });
      show('mistA', cam, 1, (t * 12) % 200);
      show('mid', cam);
      // water: the reflection wavers in thin horizontal slices
      const Wt = LAYERS.water, z = 1 + (cam.zoom - 1) * Wt.p, top = 690 - LY;
      place(Wt.c, LX, LY, cam, Wt.p); // full layer first (above the horizon it is empty)
      for (let y = top; y < LH; y += 3) {
        const dx = Math.sin(y * 0.13 + t * 2.4) * (0.6 + (y - top) * 0.012);
        out.setTransform(z, 0, 0, z, 960 + z * (LX + dx - 960 - cam.x * Wt.p), 540 + z * (LY + y - 540 - cam.y * Wt.p));
        out.drawImage(Wt.c, 0, y, LW, 3, 0, 0, LW, 3);
      }
      // a second boat far off under the peaks, a pale silhouette half in the mist
      view(cam, 0.6);
      {
        out.translate(1150 + t * 14, 728 + Math.sin(t * 1.7 + 1) * 0.6);
        out.scale(1.5, 1.5);
        const x = 0, y = 0;
        out.filter = 'blur(0.7px)';
        out.fillStyle = out.strokeStyle = rgba('#4a5356', 0.5);
        out.beginPath();
        out.moveTo(x - 27, y - 4); out.quadraticCurveTo(x, y + 5, x + 27, y - 4);
        out.lineTo(x + 22, y); out.quadraticCurveTo(x, y + 7, x - 22, y);
        out.closePath(); out.fill();
        out.fillRect(x + 11, y - 13, 2.6, 12);
        fillPoly(out, [[x + 6, y - 12], [x + 12.3, y - 17], [x + 18.6, y - 12]]);
        out.lineWidth = 1;
        out.beginPath(); out.moveTo(x + 13, y - 9); out.lineTo(x + 31, y + 4); out.stroke();
        out.filter = 'none';
      }
      show('mistB', cam, 1, -((t * 16) % 200));
      caption(cam, t); // over the water, the boat passes in front
      // a fish rises now and then
      view(cam, 0.9);
      D.ring(out, 1150, 990, t - 0.7, { size: 46, alpha: 0.35 });
      D.ring(out, 400, 830, t - 1.5, { size: 30, alpha: 0.3 });
      const B = LAYERS.boat, bx = DH.lerp(60, -110, t / DURATION), by = Math.sin(t * 2.1) * 1.6;
      place(B.c, LX + bx, LY + by, cam, B.p);
      const zb = 1 + (cam.zoom - 1) * B.p;
      out.setTransform(zb, 0, 0, zb, 960 + zb * (bx - 960 - cam.x * B.p), 540 + zb * (-540 - cam.y * B.p));
      ripples(out, B.tip, B.s, t);
      // bamboo by the lens in the top right corner, out of focus, swaying a little
      const zn = 1 + (cam.zoom - 1) * 1.6;
      out.setTransform(zn, 0, 0, zn, 960 + zn * (2010 - 960 - cam.x * 1.6), 540 + zn * (-70 - 540 - cam.y * 1.6));
      out.rotate(Math.sin(t * 1.3) * 0.012 - 0.01);
      out.drawImage(BAMBOO.canvas, -BAMBOO.ax, -BAMBOO.ay);
    }

    let RIDGE;
    paintGuilin();
    return { frame: frameGuilin, ridge: RIDGE };
  }

  DH.location.define('guilin', {
    name: 'Гуйлинь',
    time: 'day',
    // low over the river on the right (the boat is on the left), mirrored in the water
    caption: { hanzi: '桂林', pinyin: 'Guìlín', x: 1440, y: 770, p: 0.8, t0: 0.15, tOut: 2.05, wind: [560, -30],
      reflect: { below: 16, alpha: 0.3, waver: 4, depth: 240 } },
    camera: DH.location.glide({ x: -40, y: 20, zoom: 1.0 }, { x: 90, y: 0, zoom: 1.1 }),
    setup,
  });
})();
