// The Great Wall (长城): the brush writes the wall along the ridges, the camera flies along,
// a hawk circles over the valley. Slot: day. Probe: videos/probe-places/?place=wall
(function () {
  function setup(k) {
    const { W, D, out, LX, LY, LW, LH, LAYERS, DURATION, INK, INK2, place, view, show, masked, smooth, sky, range, mist, skylineOf, caption, camera } = k;
    const { rgba, wash, dryStroke, taper, fillPoly, rng } = W;
    let ctx; // the context of the layer being painted
    const begin = (...a) => { const layer = k.begin(...a); ctx = layer.c.getContext('2d'); return layer; };

    // The wall runs along a ridge and shrinks with distance: thick(x) gives its height in px.
    // Seen from the side and a little above: a lit walkway on top, the outer face in shade
    // with a few courses of masonry, battlements as merlons along the outer edge.
    function greatWall(c, ridge, { thick, towers, seed }) {
      const r = rng(seed);
      const top = ridge.map(([x, y]) => [x, y + thick(x) * 0.15]);
      // towers first, so the wall passes in front of their foot
      for (const tx of towers) {
        const at = top.reduce((bb, p) => (Math.abs(p[0] - tx) < Math.abs(bb[0] - tx) ? p : bb)), t = thick(tx);
        const tc = W.canvas(c.canvas.width, c.canvas.height), tcx = tc.getContext('2d');
        tcx.setTransform(c.getTransform());
        watchtower(tcx, at, t, seed + tx);
        // the foot dissolves along the slope it stands on: erase below a ragged line that
        // follows the ground a little under the wall, with a soft wet edge
        const rr = rng(seed + tx + 7), cut = [];
        for (const [x, y] of top) if (Math.abs(x - at[0]) < t * 3) cut.push([x, y + t * (0.9 + 0.25 * rr())]);
        tcx.globalCompositeOperation = 'destination-out';
        tcx.filter = `blur(${Math.max(2, t * 0.35)}px)`;
        tcx.fillStyle = '#000';
        tcx.beginPath();
        cut.forEach(([x, y], i) => (i ? tcx.lineTo(x, y) : tcx.moveTo(x, y)));
        tcx.lineTo(cut.at(-1)[0], at[1] + t * 40);
        tcx.lineTo(cut[0][0], at[1] + t * 40);
        tcx.closePath();
        tcx.fill();
        c.save();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.drawImage(tc, 0, 0);
        c.restore();
      }
      const walk = top.map(([x, y]) => [x, y + thick(x) * 0.28]);
      const foot = top.map(([x, y]) => [x, y + thick(x)]);
      // outer face (shade), then the walkway (light)
      const face = [...walk.map(([x, y]) => [x, y, 0.01]), ...foot.slice().reverse().map(([x, y]) => [x, y, 0.02])];
      c.fillStyle = '#d9c7a8';
      fillPoly(c, face);
      wash(c, face, '#9c7c56', { layers: 18, alpha: 0.09, seed });
      wash(c, face.map(([x, y, v]) => [x, y + 4, v]), '#5f4c3b', { layers: 10, alpha: 0.05, seed: seed + 1 });
      const path = [...top.map(([x, y]) => [x, y, 0.01]), ...walk.slice().reverse().map(([x, y]) => [x, y, 0.01])];
      c.fillStyle = '#efe5d2';
      fillPoly(c, path);
      wash(c, path, '#c9a978', { layers: 10, alpha: 0.07, seed: seed + 2 });
      // masonry courses: broken thin strokes along the face
      for (let k = 1; k <= 3; k++) {
        const course = top.map(([x, y]) => [x, y + thick(x) * (0.28 + k * 0.18)]);
        let seg = [];
        course.forEach((p, i) => {
          if (r() < 0.12) { if (seg.length > 3) dryStroke(c, seg, 1.1, INK, { alpha: 0.28, hairs: 1, dry: 0.4, seed: seed + k * 100 + i }); seg = []; }
          seg.push(p);
        });
      }
      // battlements: merlons along the top, spaced by the local thickness
      let nextX = top[0][0];
      for (const [x, y] of top) {
        if (x < nextX) continue;
        const t = thick(x), mw = t * 0.17, mh = t * 0.22;
        c.fillStyle = rgba('#cdb48c', 0.95);
        c.fillRect(x - mw / 2, y - mh, mw, mh + 1);
        c.fillStyle = rgba('#6b553f', 0.4);
        c.fillRect(x + mw * 0.1, y - mh, mw * 0.4, mh + 1);
        c.fillStyle = rgba(INK, 0.5);
        c.fillRect(x - mw / 2, y - mh, mw, Math.max(1, t * 0.025));
        nextX = x + t * 0.3;
      }
      // ink: the top edge firm, the foot of the wall broken
      dryStroke(c, top, Math.max(1.4, 2.4), INK, { alpha: 0.7, hairs: 2, dry: 0.2, seed: seed + 3 });
      dryStroke(c, walk, 1.4, INK, { alpha: 0.4, hairs: 1, dry: 0.4, seed: seed + 4 });
      dryStroke(c, foot, 1.6, INK, { alpha: 0.45, hairs: 2, dry: 0.55, seed: seed + 5 });
    }

    // A watchtower standing on the wall, drawn by hand rather than with a ruler: walls that
    // lean in a little and wobble, merlons of uneven size, ragged washes, a broken outline.
    function watchtower(c, [x, y], t, seed) {
      const r = rng(seed);
      const w = t * 3.2, h = t * 2.6, yTop = y - h, yBase = y + t * 1.6;
      const j = () => (r() - 0.5) * t * 0.16; // hand jitter
      const bl = [x - w / 2 + j(), yBase], tl = [x - w * 0.47 + j(), yTop + j() * 0.5];
      const tr = [x + w * 0.47 + j(), yTop + j() * 0.5], br = [x + w / 2 + j(), yBase];
      const side = (a, b) => {
        const pts = [];
        for (let i = 0; i <= 8; i++) {
          const u = i / 8;
          pts.push([a[0] + (b[0] - a[0]) * u + Math.sin(u * 5 + seed) * t * 0.03, a[1] + (b[1] - a[1]) * u]);
        }
        return pts;
      };
      const left = side(bl, tl), top = side(tl, tr), right = side(tr, br);
      const body = [...left, ...top.slice(1), ...right.slice(1)].map(([a, b]) => [a, b, 0.03]);
      c.fillStyle = rgba('#eadcc2', 0.92);
      fillPoly(c, body);
      wash(c, body, '#b08a5c', { layers: 14, alpha: 0.08, seed });
      wash(c, body.map(([a, b, v]) => [a, b + t * 0.4, v]), '#8a6a48', { layers: 8, alpha: 0.05, seed: seed + 9 });
      // shade: a ragged glaze over the right third
      wash(c, [[x + w * 0.16, yTop + t * 0.1, 0.06], [tr[0] - t * 0.05, yTop + t * 0.1, 0.03], [br[0] - t * 0.05, yBase, 0.03], [x + w * 0.2, yBase, 0.06]], '#5f4b38', { layers: 9, alpha: 0.07, seed: seed + 3 });
      // merlons: uneven widths and heights, inside the top edge
      const n = 5;
      for (let i = 0; i < n; i++) {
        const u0 = (2 * i) / (2 * n - 1), u1 = (2 * i + 1) / (2 * n - 1);
        const xa = tl[0] + (tr[0] - tl[0]) * u0, xb = tl[0] + (tr[0] - tl[0]) * u1;
        const ya = tl[1] + (tr[1] - tl[1]) * u0, mh = t * (0.38 + r() * 0.18);
        const m = [[xa + 0.5, ya + 1, 0.04], [xa + r() * 1.2, ya - mh, 0.04], [xb - r() * 1.2, ya - mh + j() * 0.3, 0.04], [xb - 0.5, ya + 1, 0.04]];
        c.fillStyle = rgba('#dcc7a2', 0.95);
        fillPoly(c, m);
        wash(c, m, '#9c7c56', { layers: 5, alpha: 0.08, seed: seed + 20 + i });
        dryStroke(c, [[m[1][0], m[1][1]], [m[2][0], m[2][1]]], Math.max(1, t * 0.06), INK, { alpha: 0.6, hairs: 1, dry: 0.1, seed: seed + 30 + i });
      }
      // arched openings, not quite equal
      c.fillStyle = rgba('#2b211a', 0.72);
      for (const ox of [-0.22, 0.22]) {
        const cx = x + ox * w + j() * 0.4, ow = t * (0.38 + r() * 0.08), oh = t * (0.7 + r() * 0.12), oy = yTop + h * 0.3;
        c.beginPath();
        c.moveTo(cx - ow / 2, oy + oh);
        c.lineTo(cx - ow / 2, oy + ow / 2);
        c.arc(cx, oy + ow / 2, ow / 2, Math.PI, 0);
        c.lineTo(cx + ow / 2, oy + oh);
        c.closePath();
        c.fill();
      }
      // outline: separate broken strokes for each side, the band under the parapet faint
      const lw = Math.max(1.1, t * 0.07);
      dryStroke(c, left, lw, INK, { alpha: 0.7, hairs: 1, dry: 0.35, seed: seed + 1 });
      dryStroke(c, top, lw, INK, { alpha: 0.75, hairs: 1, dry: 0.2, seed: seed + 2 });
      dryStroke(c, right, lw, INK, { alpha: 0.7, hairs: 1, dry: 0.35, seed: seed + 4 });
      dryStroke(c, top.map(([a, b]) => [a, b + t * 0.2]), lw * 0.6, INK, { alpha: 0.35, hairs: 1, dry: 0.5, seed: seed + 5 });
    }

    function paintWall() {
      begin('sky', 0);
      sky('#f5f2ec', '#e9e6df');
      const far = W.ridge({ x0: -240, x1: 2160, base: 560, jag: 10, seed: 71, peaks: W.peakRow({ x0: -240, x1: 2160, hMin: 90, hMax: 210, gap: 300, seed: 72 }) });
      const midR = W.ridge({ x0: -240, x1: 2160, base: 700, jag: 14, seed: 73, step: 8, peaks: [
        { x: 80, h: 200, wl: 300, wr: 220, k: 1.3 }, { x: 520, h: 290, wl: 240, wr: 260, k: 1.25 }, { x: 980, h: 210, wl: 220, wr: 260, k: 1.4 },
        { x: 1420, h: 320, wl: 260, wr: 300, k: 1.2 }, { x: 1880, h: 230, w: 260 },
      ] });
      const near = W.ridge({ x0: -240, x1: 2160, base: 1010, jag: 16, seed: 75, step: 8, peaks: [
        { x: 260, h: 260, wl: 420, wr: 300, k: 1.15 }, { x: 900, h: 160, w: 300 }, { x: 1600, h: 330, wl: 360, wr: 420, k: 1.1 },
      ] });
      RIDGE = { pts: midR, p: 0.5 }; // the ridge the wall runs on: the silhouette for the cut
      begin('far', 0.2);
      const L1 = range({ oy: 260, ridge: far, color: '#c9cbc6', deep: '#b0b5b0', fadeTo: 640, seed: 74, under: '#ece9e2' });
      ctx.drawImage(L1.c, L1.ox, L1.oy);
      begin('mistA', 0.3);
      mist(600, 120, '#f1efe9', 76);
      // middle range: muted green slopes; the wall along its crest on its own layer
      begin('mid', 0.5);
      ctx.drawImage(W.mountains({ w: 2400, h: 760, ox: -240, oy: 300, ridge: midR, color: '#9aa391', deep: '#6f7a68', fadeTo: 900, ink: 18, inkColor: INK2, seed: 77, under: '#ebe8e0' }), -240, 300);
      // small pines scattered over the slopes under the wall, pale with distance
      const rp = rng(83);
      for (let i = 0; i < 60; i++) {
        const q = midR[Math.floor(rp() * midR.length)];
        if (q[1] > 600) continue;
        const x = q[0] + (rp() - 0.5) * 40, y = q[1] + 40 + rp() * Math.min(150, 640 - q[1]);
        D.pine(ctx, x, y, 16 + rp() * 14, { seed: 840 + i, color: '#3f4a3c', alpha: 0.3 + 0.2 * rp() });
      }
      const wallRidge = midR.filter(([x]) => x > -80 && x < 2080);
      begin('wall', 0.5, { ridge: wallRidge, drops: spatter(wallRidge, 90) });
      greatWall(ctx, wallRidge, { thick: (x) => 17 - 3 * (x / 2000), towers: [320, 784, 1400, 1856], seed: 80 });
      begin('mistB', 0.7);
      mist(820, 140, '#f3f1ec', 78, 0.9);
      begin('near', 1);
      const L3 = W.mountains({ w: 2400, h: 600, ox: -240, oy: 640, ridge: near, color: '#55574f', deep: '#2f312b', fadeTo: 1200, ink: 26, inkColor: INK, seed: 79, under: '#e7e3da' });
      ctx.drawImage(L3, -240, 640);
      // pines on the near ridge, dark against the mist
      for (const [i, x] of [170, 330, 1010, 1500, 1790].entries()) {
        const q = near.reduce((a, b) => (Math.abs(b[0] - x) < Math.abs(a[0] - x) ? b : a));
        D.pine(ctx, q[0], q[1] + 6, 62 + ((i * 37) % 40), { seed: 860 + i, color: INK, alpha: 0.8 });
      }
      HAWK = D.flock({ n: 1, seed: 62, spread: [0, 0], size: 17 });
      FLOCK = D.flock({ n: 4, seed: 63, spread: [60, 18], size: 6 });
    }

    // A calligraphy brush seen from the side, held slanting back and up: a dark tapered tuft
    // whose tip touches (x, y), a ferrule, a bamboo handle with nodes. It leans with the
    // direction of the stroke and trembles a little, as in a hand.
    function brush(c, x, y, dir, t) {
      const lean = 1.0 + dir * 0.35 + Math.sin(t * 9) * 0.03; // handle up and back
      c.save();
      c.translate(x, y);
      c.rotate(lean);
      // tuft: from the tip (0, 0) back along -x, wet and dark
      const tuft = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12; tuft.push([-u * 78, Math.sin(u * 2.4) * 1.5]); }
      c.fillStyle = rgba('#1a120c', 0.92);
      fillPoly(c, taper(tuft, (u) => 2 + 22 * Math.pow(Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.62), 1.2)));
      c.fillStyle = rgba('#6b5a4a', 0.35);
      fillPoly(c, taper(tuft.slice(6), (u) => 3 + 6 * u).map(([a, b0]) => [a, b0 - 5]));
      // ferrule and handle
      c.fillStyle = rgba('#4a3828', 0.95);
      fillPoly(c, [[-76, -11], [-96, -10], [-96, 10], [-76, 11]]);
      const handle = [[-96, -8, 0.01], [-330, -6, 0.01], [-330, 6, 0.01], [-96, 8, 0.01]];
      c.fillStyle = '#c9a874';
      fillPoly(c, handle);
      wash(c, handle, '#8a6a44', { layers: 6, alpha: 0.12, seed: 701, rough: 0.005 });
      c.fillStyle = rgba('#6b5032', 0.45);
      c.fillRect(-330, 1, 234, 5);
      for (const nx of [-170, -260]) { c.fillStyle = rgba('#5a4128', 0.7); c.fillRect(nx, -7.5, 4, 15); }
      dryStroke(c, [[-96, -8], [-330, -6]], 1.4, INK, { alpha: 0.5, hairs: 1, dry: 0.3, seed: 702 });
      dryStroke(c, [[-96, 8], [-330, 6]], 1.4, INK, { alpha: 0.5, hairs: 1, dry: 0.3, seed: 703 });
      c.restore();
    }

    // Ink spatter flung off the brush as it moves: small drops land just ahead and below the
    // stroke, a few longer flecks; each appears when the brush passes and stays on the paper.
    function spatter(ridge, seed) {
      const r = rng(seed), drops = [];
      for (let i = 0; i < 90; i++) {
        const q = ridge[Math.floor(r() * ridge.length)];
        const big = r() < 0.15;
        drops.push({ x0: q[0], x: q[0] + 6 + r() * 40, y: q[1] + (r() - 0.35) * 46, rad: big ? 2.2 + r() * 2.5 : 0.7 + r() * 1.6,
          fleck: r() < 0.2 ? (r() - 0.5) * 1.2 : null, a: 0.35 + 0.5 * r() });
      }
      return drops;
    }

    // The brush runs ahead of the camera and writes the wall from left to right; towers appear
    // as the line reaches them. The camera flies along with a slight push-in.
    function frameWall(t) {
      const cam = camera(t);
      // even pace, so the brush is seen writing the whole way, not dashing off at the start
      const head = DH.lerp(-120, 2120, DH.ease.draw(DH.progress(t, 0.05, 2.3)));
      show('sky', cam); show('far', cam);
      // a hawk soars in a slow circle over the valley; far behind it a few birds
      view(cam, 0.3);
      D.birds(out, HAWK, 1380 + Math.cos(t * 0.9) * 130, 215 + Math.sin(t * 0.9) * 34, t, { color: INK2, alpha: 0.55, glide: true });
      D.birds(out, FLOCK, 900 - 30 * t, 330 + 4 * t, t, { color: INK2, alpha: 0.3 });
      show('mistA', cam, 1, (t * 14) % 200);
      caption(cam, t); // in the sky, behind the ridges and the brush
      show('mid', cam);
      const img = masked('wall', (m) => {
        const g = m.createLinearGradient(head - 70, 0, head, 0);
        g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
        m.fillStyle = g;
        m.fillRect(LX, LY, LW, LH);
      });
      place(img, LX, LY, cam, LAYERS.wall.p);
      // the brush itself writes the wall: its tip on the ridge, fresh dark ink just behind it
      if (head < 2080) {
        const R = LAYERS.wall.ridge, i = R.findIndex((q) => q[0] >= head);
        const pt = R[Math.max(0, i)], prev = R[Math.max(0, i - 4)];
        const z = 1 + (cam.zoom - 1) * LAYERS.wall.p;
        out.setTransform(z, 0, 0, z, 960 + z * (-960 - cam.x * LAYERS.wall.p), 540 + z * (-540 - cam.y * LAYERS.wall.p));
        // wet ink: the last stretch of the line still dark, fading as it dries
        const wet = R.filter((q) => q[0] > head - 90 && q[0] <= head);
        for (let k = 1; k < wet.length; k++) {
          const a = k / wet.length;
          out.strokeStyle = rgba(INK, 0.7 * a);
          out.lineWidth = 5 * (0.5 + 0.5 * a);
          out.lineCap = 'round';
          out.beginPath(); out.moveTo(wet[k - 1][0], wet[k - 1][1] + 3); out.lineTo(wet[k][0], wet[k][1] + 3); out.stroke();
        }
        brush(out, pt[0], pt[1] + 2, Math.atan2(pt[1] - prev[1], pt[0] - prev[0]), t);
      }
      // spatter left behind by the brush (drawn in the same world transform)
      const zs = 1 + (cam.zoom - 1) * LAYERS.wall.p;
      out.setTransform(zs, 0, 0, zs, 960 + zs * (-960 - cam.x * LAYERS.wall.p), 540 + zs * (-540 - cam.y * LAYERS.wall.p));
      for (const d of LAYERS.wall.drops) {
        const age = (head - d.x0) / 60; // in units of brush travel
        if (age <= 0) continue;
        const k = Math.min(1, age); // the drop flies out to its place
        const x = d.x0 + (d.x - d.x0) * k, y = d.y;
        out.fillStyle = rgba(INK, d.a * Math.min(1, age * 2));
        if (d.fleck !== null) {
          out.save(); out.translate(x, y); out.rotate(d.fleck);
          out.beginPath(); out.ellipse(0, 0, d.rad * 3, d.rad * 0.6, 0, 0, Math.PI * 2); out.fill();
          out.restore();
        } else {
          out.beginPath(); out.arc(x, y, d.rad, 0, Math.PI * 2); out.fill();
        }
      }
      show('mistB', cam, 1, -((t * 20) % 200));
      show('near', cam);
    }

    let RIDGE, HAWK, FLOCK;
    paintWall();
    return { frame: frameWall, ridge: RIDGE };
  }

  DH.location.define('wall', {
    name: 'Великая стена',
    time: 'day',
    horizon: 700, // frame y of the foot of the ridge (for the cut to night)
    hasWater: false, // land down to the bottom of the frame
    caption: { hanzi: '长城', pinyin: 'Chángchéng', x: 400, y: 250, p: 0.35, t0: 0.15, tOut: 2.05, wind: [560, -70] },
    camera: DH.location.glide({ x: -110, y: 10, zoom: 1.03 }, { x: 130, y: -10, zoom: 1.12 }),
    setup,
  });
})();
