// intro-01, scenes 3-5: the three places on the route, painted by code with
// shared/watercolor.js and animated, 2.5 s each, with the place caption (shared/caption.js)
// (docs/intro-01-storyboard.md). Probe: videos/probe-places/?place=...
//   wall      the brush writes the Great Wall along the ridges, the camera flies along; 长城
//   guilin    karst peaks come out of the mist, a boat glides, ripples spread; 桂林 over the
//             water, mirrored in it
//   shanghai  the camera moves to Pudong, windows light up, the sky pales to dawn; 上海 in
//             light ink in the night sky
// SCENES.place(PLACE, { duration }) paints the place once into layers (painting takes a
// while) and resolves to { DURATION, frame(dst, t), silhouette(t) }: frame moves the layers
// with the camera at their depth, animates reveals, light and water, and draws scene time t
// into dst. The animation is laid out for 2.5 s; duration stretches all of it, the caption
// included (a longer scene: the brush writes slower, the caption stays longer).
(function (g) {
  g.SCENES = g.SCENES || {};
  g.SCENES.place = async function (PLACE, { duration = 2.5 } = {}) {
    const W = DH.wc;
    const { rgba, wash, dryStroke, taper, fillPoly, rng } = W;
    const out = W.canvas(1920, 1080).getContext('2d');
    const DURATION = 2.5;

    // Layers: canvases larger than the frame (world x -240..2160, y -110..1190), so the camera
    // can pan and zoom. Painting functions draw into the current layer through ctx.
    const LX = -240, LY = -110, LW = 2400, LH = 1300;
    const LAYERS = {};
    let ctx;
    function begin(name, p, extra = {}) {
      const c = W.canvas(LW, LH);
      ctx = c.getContext('2d');
      ctx.translate(-LX, -LY);
      LAYERS[name] = { c, p, ...extra };
      return LAYERS[name];
    }

    // Draw an image whose top-left is world (ox, oy), seen by camera cam at depth p
    // (the same maths as DH.ink.layer).
    function place(img, ox, oy, cam, p, alpha = 1) {
      const z = 1 + (cam.zoom - 1) * p;
      out.setTransform(z, 0, 0, z, 960 + z * (ox - 960 - cam.x * p), 540 + z * (oy - 540 - cam.y * p));
      out.globalAlpha = alpha;
      out.drawImage(img, 0, 0);
      out.globalAlpha = 1;
    }
    const show = (name, cam, alpha = 1, dx = 0, dy = 0) => place(LAYERS[name].c, LX + dx, LY + dy, cam, LAYERS[name].p, alpha);

    // A scratch canvas for per-frame masks.
    const scratch = W.canvas(LW, LH), sc = scratch.getContext('2d');
    function masked(name, maskFn) {
      sc.setTransform(1, 0, 0, 1, 0, 0);
      sc.globalCompositeOperation = 'source-over';
      sc.clearRect(0, 0, LW, LH);
      sc.drawImage(LAYERS[name].c, 0, 0);
      sc.globalCompositeOperation = 'destination-in';
      sc.translate(-LX, -LY);
      maskFn(sc);
      sc.setTransform(1, 0, 0, 1, 0, 0);
      sc.globalCompositeOperation = 'source-over';
      return scratch;
    }
    const smooth = (x) => { x = DH.clamp(x); return x * x * (3 - 2 * x); };
    const INK = '#24170f', INK2 = '#3e3a36';

    function sky(top, low, y1 = 760) {
      const gr = ctx.createLinearGradient(0, 0, 0, y1);
      gr.addColorStop(0, top);
      gr.addColorStop(1, low);
      ctx.fillStyle = gr;
      ctx.fillRect(LX, LY, LW, LH);
    }

    function range(o) {
      const c = W.mountains({ w: 2400, h: o.h ?? 700, ox: -240, oy: o.oy, ...o });
      return { c, ox: -240, oy: o.oy };
    }

    function mist(y, h, color, seed, alpha = 1) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(W.mistBand({ w: 2400, h, color, seed }), -240, y - h / 2);
      ctx.globalAlpha = 1;
    }

    // ---------- Great Wall ----------

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
      const wallRidge = midR.filter(([x]) => x > -80 && x < 2080);
      begin('wall', 0.5, { ridge: wallRidge, drops: spatter(wallRidge, 90) });
      greatWall(ctx, wallRidge, { thick: (x) => 17 - 3 * (x / 2000), towers: [320, 784, 1400, 1856], seed: 80 });
      begin('mistB', 0.7);
      mist(820, 140, '#f3f1ec', 78, 0.9);
      begin('near', 1);
      const L3 = W.mountains({ w: 2400, h: 600, ox: -240, oy: 640, ridge: near, color: '#55574f', deep: '#2f312b', fadeTo: 1200, ink: 26, inkColor: INK, seed: 79, under: '#e7e3da' });
      ctx.drawImage(L3, -240, 640);
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
      const cam = CAMS.wall(t);
      // even pace, so the brush is seen writing the whole way, not dashing off at the start
      const head = DH.lerp(-120, 2120, DH.ease.draw(DH.progress(t, 0.05, 2.3)));
      show('sky', cam); show('far', cam);
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

    // ---------- Guilin ----------

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
    }

    // Peaks come out of the mist one after another from left to right; the camera glides low
    // over the river; the boat moves slowly to the left, bobbing, ripples spread from the pole.
    function frameGuilin(t) {
      const cam = CAMS.guilin(t);
      const front = DH.lerp(-200, 2600, DH.ease.draw(DH.progress(t, 0, 2.2)));
      show('sky', cam);
      const img = masked('far', (m) => {
        const g = m.createLinearGradient(front - 600, 0, front, 0);
        g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
        m.fillStyle = g;
        m.fillRect(LX, LY, LW, LH);
      });
      place(img, LX, LY, cam, LAYERS.far.p);
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
      show('mistB', cam, 1, -((t * 16) % 200));
      caption(cam, t); // over the water, the boat passes in front
      const B = LAYERS.boat, bx = DH.lerp(60, -110, t / DURATION), by = Math.sin(t * 2.1) * 1.6;
      place(B.c, LX + bx, LY + by, cam, B.p);
      const zb = 1 + (cam.zoom - 1) * B.p;
      out.setTransform(zb, 0, 0, zb, 960 + zb * (bx - 960 - cam.x * B.p), 540 + zb * (-540 - cam.y * B.p));
      ripples(out, B.tip, B.s, t);
    }

    // ---------- Shanghai ----------

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
      for (const [dx, sd] of [[-62, 601], [62, 602]]) pole([op.x + dx, HZ], [op.x + dx * 0.12, HZ - 235], 16, 9, sd);
      pole([op.x, HZ], [op.x, HZ - 235], 18, 14, 603);
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
        // reflection in the river: flipped and squashed at the horizon, very soft
        const c3 = W.canvas(LW, LH), x3 = c3.getContext('2d');
        x3.filter = 'blur(22px)';
        x3.setTransform(1, 0, 0, -0.7, 0, (HZ - LY) * 1.7);
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

      // the Huangpu: dark water glazes, broken reflections of the lights, light streaks
      begin('water', 0.8);
      const wpoly = [[-300, HZ, 0.01], [2220, HZ, 0.01], [2220, 1220, 0.03], [-300, 1220, 0.03]];
      ctx.fillStyle = '#434a60';
      fillPoly(ctx, wpoly);
      wash(ctx, wpoly, '#2f3650', { layers: 14, alpha: 0.08, seed: 160 });
      const r3 = rng(150);
      for (let i = 0; i < 60; i++) {
        const y = HZ + 10 + Math.pow(r3(), 1.4) * 320, x = -240 + r3() * 2400, len = 60 + r3() * 260;
        dryStroke(ctx, [[x, y], [x + len / 2, y + 1], [x + len, y]], 2 + r3() * 2, '#9aa0b4', { alpha: 0.22, hairs: 2, dry: 0.5, seed: 170 + i });
      }
      begin('dabs', 0.8);
      for (const [cx, spread] of [[640, 70], [1090, 40], [1240, 50], [1420, 50], [900, 260], [1700, 160], [300, 200]]) {
        for (let i = 0; i < 46; i++) {
          const y = HZ + 8 + Math.pow(r3(), 1.3) * 230, x = cx + r3.gauss() * spread * (0.4 + (y - HZ) / 300);
          const len = 6 + r3() * 26;
          ctx.fillStyle = rgba(r3() < 0.7 ? '#efc485' : '#f3d8cf', 0.12 + 0.3 * r3() * (1 - (y - HZ) / 300));
          ctx.beginPath(); ctx.ellipse(x, y, len, 1.4, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      begin('mistW', 0.8);
      mist(HZ, 70, '#9a93a6', 115, 0.4);
      RIDGE = skylineOf('city'); // the Pudong skyline: the silhouette for the cut
    }

    // The top edge of what is painted on a layer: for every 8th column, the first row with
    // solid paint (world coords). Columns with nothing painted go to the bottom.
    function skylineOf(name) {
      const L = LAYERS[name], c = L.c, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, pts = [];
      for (let col = 0; col < c.width; col += 8) {
        let row = 0;
        while (row < c.height && d[(row * c.width + col) * 4 + 3] < 110) row++;
        pts.push([LX + col, LY + row]);
      }
      return { pts, p: L.p };
    }

    // The camera moves towards Pudong with a slow rise; windows light up bucket by bucket and
    // the glow grows with them; near the end the sky pales towards dawn and the lights soften.
    function frameShanghai(t) {
      const cam = CAMS.shanghai(t);
      const dawn = smooth(DH.progress(t, 1.6, 2.5));
      const on = (i) => smooth(DH.progress(t, 0.1 + i * 0.32, 0.55 + i * 0.32)) * (1 - 0.4 * dawn);
      show('sky', cam);
      show('skyDawn', cam, dawn);
      caption(cam, t); // in the sky, behind the towers
      show('city', cam);
      for (let i = 0; i < NB; i++) show('win' + i, cam, i === 0 ? Math.max(0.6, on(0)) : on(i));
      out.globalCompositeOperation = 'screen';
      show('haze', cam, 0.7 + 0.3 * on(1));
      for (let i = 0; i < NB; i++) {
        const a = i === 0 ? Math.max(0.6, on(0)) : on(i);
        show('glowW' + i, cam, 0.8 * a);
        show('glowN' + i, cam, 0.6 * a);
      }
      out.globalCompositeOperation = 'source-over';
      show('water', cam);
      show('dabs', cam, 0.3 + 0.7 * on(2));
      out.globalCompositeOperation = 'screen';
      for (let i = 0; i < NB; i++) show('refl' + i, cam, 0.45 * (i === 0 ? Math.max(0.6, on(0)) : on(i)));
      out.globalCompositeOperation = 'source-over';
      show('mistW', cam, 1, (t * 10) % 200);
    }

    // ---------- Captions ----------

    // Each place caption hangs in the sky of its place at depth p, so the camera moves it
    // with a little parallax: it is in the scene, not glued to the screen.
    const CAPTIONS = {
      wall: { hanzi: '长城', pinyin: 'Chángchéng', x: 400, y: 250, p: 0.35, t0: 0.15, tOut: 2.05, wind: [560, -70] },
      // low over the river on the right (the boat is on the left), mirrored in the water
      guilin: { hanzi: '桂林', pinyin: 'Guìlín', x: 1440, y: 770, p: 0.8, t0: 0.15, tOut: 2.05, wind: [560, -30],
        reflect: { below: 16, alpha: 0.3, waver: 4, depth: 240 } },
      // light ink in the night sky left of the Pearl, behind the towers
      shanghai: { hanzi: '上海', pinyin: 'Shànghǎi', x: 330, y: 300, p: 0.35, t0: 0.15, tOut: 2.05, wind: [560, -70],
        ink: '#f1e8da', ink2: '#ddd3c4' },
    };
    let CAP = null;
    function caption(cam, t) {
      const o = CAPTIONS[PLACE];
      if (!o) return;
      const z = 1 + (cam.zoom - 1) * o.p;
      out.setTransform(z, 0, 0, z, 960 + z * (-960 - cam.x * o.p), 540 + z * (-540 - cam.y * o.p));
      DH.caption.draw(out, CAP, t, o);
      if (o.reflect) DH.caption.reflect(out, CAP, t, o, o.reflect);
      out.filter = 'none';
      out.globalAlpha = 1;
    }


    // The camera of each place at time t (the cuts between scenes need it too).
    const CAMS = {
      wall: (t) => { const k = DH.ease.draw(DH.progress(t, 0, DURATION)); return { x: DH.lerp(-110, 130, k), y: DH.lerp(10, -10, k), zoom: DH.lerp(1.03, 1.12, k) }; },
      guilin: (t) => { const k = DH.ease.draw(DH.progress(t, 0, DURATION)); return { x: DH.lerp(-40, 90, k), y: DH.lerp(20, 0, k), zoom: DH.lerp(1.0, 1.1, k) }; },
      shanghai: (t) => { const k = DH.ease.draw(DH.progress(t, 0, DURATION)); return { x: DH.lerp(-30, 40, k), y: DH.lerp(40, -30, k), zoom: DH.lerp(1.0, 1.13, k) }; },
    };
    let RIDGE = null;

    // The silhouette of the place at time t in frame coords: y of its main ridge at each x
    // from -100 to 2020 (step 8), or null where the ridge does not reach.
    // scene time -> the time of the animation, which is laid out for 2.5 s
    const anim = (t) => (t * DURATION) / duration;

    function silhouette(t) {
      t = anim(t);
      if (!RIDGE) return null;
      const cam = CAMS[PLACE](Math.min(Math.max(t, 0), DURATION)), z = 1 + (cam.zoom - 1) * RIDGE.p;
      const sc = RIDGE.pts.map(([x, y]) => [960 + z * (x - 960 - cam.x * RIDGE.p), 540 + z * (y - 540 - cam.y * RIDGE.p)]);
      const ys = [];
      for (let x = -100, i = 0; x <= 2020; x += 8) {
        while (i < sc.length - 2 && sc[i + 1][0] < x) i++;
        const [ax, ay] = sc[i], [bx, by] = sc[i + 1];
        ys.push(x < ax || x > bx ? null : ay + (by - ay) * ((x - ax) / (bx - ax || 1)));
      }
      return ys;
    }

    const PAINT = { wall: paintWall, guilin: paintGuilin, shanghai: paintShanghai };
    const FRAME = { wall: frameWall, guilin: frameGuilin, shanghai: frameShanghai };
    PAINT[PLACE]();
    // the caption needs its fonts loaded before the first frame
    await DH.caption.ready;
    if (CAPTIONS[PLACE]) CAP = DH.caption.make(CAPTIONS[PLACE]);

    function frame(dst, t) {
      t = Math.min(Math.max(anim(t), 0), DURATION - 1e-6);
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.globalAlpha = 1;
      out.globalCompositeOperation = 'source-over';
      out.fillStyle = '#f5f2ec';
      out.fillRect(0, 0, 1920, 1080);
      FRAME[PLACE](t);
      out.setTransform(1, 0, 0, 1, 0, 0);
      dst.setTransform(1, 0, 0, 1, 0, 0);
      dst.drawImage(out.canvas, 0, 0);
    }
    return { DURATION: duration, frame, silhouette };
  };
})(window);
