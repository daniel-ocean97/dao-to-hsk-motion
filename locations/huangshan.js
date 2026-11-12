// Huangshan (黄山): granite spires above a sea of clouds, a pine growing out of the rock.
// Slot: day. DRAFT: composition sketches, chosen by k.variant (skill `location`, stage 2):
//   1  panorama: rows of spires over the cloud sea, the camera glides along
//   2  the welcoming pine large on a near cliff, spires and clouds far away
//   3  the camera rises out of the clouds and the spires come through
//   4  a gate of two cliffs, clouds pour over the saddle between them
// Probe: videos/probe-places/?place=huangshan&variant=2
(function () {
  let CAM = () => ({ x: 0, y: 0, zoom: 1 });
  const PAPER = '#f4f2ed', SEA_LOW = '#eceeed';

  function setup(k) {
    const { W, D, out, LX, LY, LW, LH, LAYERS, DURATION, INK, INK2, place, view, show, sky, densify, caption } = k;
    const { rgba, wash, dryStroke, taper, fillPoly, rng, noise1, fbm } = W;
    const V = k.variant || '1';
    let ctx;
    const begin = (...a) => { const layer = k.begin(...a); ctx = layer.c.getContext('2d'); return layer; };

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
      return crest(teeth, { x0, x1, base, seed });
    }
    function crest(teeth, { x0, x1, base, seed, step = 4 }) {
      const n = noise1(seed), pts = [];
      for (let x = x0; x <= x1; x += step) {
        let hgt = 0;
        for (const p of teeth) {
          const a = Math.abs((x - p.x) / p.w);
          if (a < 1) hgt = Math.max(hgt, p.h * Math.min(0.9 + 0.06 * Math.sin(p.x), Math.pow(1 - a, p.e)));
        }
        pts.push([x, base - hgt + fbm(n, x / 30) * 5]);
      }
      return pts;
    }
    // A range of spires on the current layer, with vertical cracks in ink.
    function granite({ ridge, color, deep, fadeTo, under, seed, cracks = 0, oy = 0 }) {
      const c = W.mountains({ w: 2400, h: 1100, ox: -240, oy, ridge, color, deep, fadeTo, seed, under });
      const lc = c.getContext('2d'), r = rng(seed + 50);
      lc.globalCompositeOperation = 'source-atop';
      lc.translate(240, -oy);
      for (let i = 0; i < cracks; i++) {
        const p = ridge[Math.floor(r() * ridge.length)], len = 40 + r() * 200, pts = [];
        for (let j = 0; j <= 6; j++) pts.push([p[0] + Math.sin(j * 1.7 + i) * 3, p[1] + 8 + len * j / 6]);
        dryStroke(lc, pts, 2.2, INK2, { alpha: 0.28, hairs: 2, dry: 0.5, seed: seed + 60 + i });
      }
      ctx.drawImage(c, -240, oy);
    }

    // A near rock: an opaque body, dark washes, cracks.
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

    // A Huangshan pine: a bent trunk, boughs in flat tiers, the long lowest bough reaching
    // out to the side `dir`. (x, y) is the foot, h the height.
    function hsPine(c, x, y, h, dir, seed) {
      const r = rng(seed), at = (u) => [x + dir * h * 0.16 * Math.sin(u * 2.4) - dir * h * 0.06 * u, y - h * u * 0.92];
      const trunk = [];
      for (let i = 0; i <= 12; i++) trunk.push(at(i / 12));
      c.fillStyle = rgba(INK, 0.9);
      fillPoly(c, taper(trunk, (u) => Math.max(1, h * 0.06 * (1 - u * 0.75))));
      const pad = (cx, cy, w) => {
        for (let i = 0; i < 9; i++) {
          c.fillStyle = rgba(r() < 0.5 ? '#2c3830' : '#3d4a3f', 0.45 + 0.3 * r());
          c.beginPath();
          c.ellipse(cx + (r() - 0.5) * w, cy - h * 0.03 + (r() - 0.5) * h * 0.02, w * (0.3 + 0.3 * r()), h * (0.022 + 0.018 * r()), 0, 0, Math.PI * 2);
          c.fill();
        }
      };
      for (const [u, side, len] of [[0.36, dir, 0.8], [0.56, -dir, 0.36], [0.72, dir, 0.46], [0.88, -dir, 0.24]]) {
        const [sx, sy] = at(u), ex = sx + side * len * h, ey = sy - len * h * 0.05;
        const bough = [[sx, sy], [sx + side * len * h * 0.5, sy + len * h * 0.05], [ex, ey]];
        c.fillStyle = rgba(INK, 0.85);
        fillPoly(c, taper(bough, (v) => Math.max(0.8, h * 0.028 * (1 - v * 0.7))));
        pad(sx + side * len * h * 0.72, ey + len * h * 0.02, len * h * 0.5);
        if (len > 0.6) pad(sx + side * len * h * 0.34, sy + len * h * 0.04, len * h * 0.3);
      }
      const [tx, ty] = at(1);
      pad(tx, ty, h * 0.34);
    }
    function pineSprite(h, dir, seed) {
      const c = W.canvas(h * 2.2, h * 1.25), x = c.getContext('2d');
      hsPine(x, h * 1.1, h * 1.2, h, dir, seed);
      return { c, ax: h * 1.1, ay: h * 1.2 };
    }
    function drawPine(P, cam, x, y, t, p = 1) {
      view(cam, p);
      out.translate(x, y);
      out.rotate(Math.sin(t * 1.5) * 0.008);
      out.drawImage(P.c, -P.ax, -P.ay);
    }

    // The cloud sea: a strip with a lumpy top (soft white lumps, a cool shade under each),
    // solid below. Drawn per frame so it can drift; the frame fills everything under it.
    function seaStrip(seed, { lump = 1, shade = 0.22 } = {}) {
      const w = 3200, h = 420, c = W.canvas(w, h), x = c.getContext('2d'), r = rng(seed);
      const g = x.createLinearGradient(0, 130, 0, h);
      g.addColorStop(0, PAPER); g.addColorStop(1, SEA_LOW);
      x.fillStyle = g;
      x.fillRect(0, 150, w, h);
      const lumps = [];
      for (let i = 0; i < 80; i++) lumps.push([r() * w, 130 + r.gauss() * 24 * lump, (70 + r() * 190) * lump, (24 + r() * 34) * lump]);
      lumps.sort((a, b) => a[1] - b[1]);
      for (const [lx, ly, rx, ry] of lumps) {
        x.filter = 'blur(9px)';
        x.fillStyle = PAPER;
        x.beginPath(); x.ellipse(lx, ly, rx, ry, 0, 0, Math.PI * 2); x.fill();
        x.filter = 'blur(16px)';
        x.fillStyle = rgba('#aab4be', shade);
        x.beginPath(); x.ellipse(lx + rx * 0.1, ly + ry * 0.75, rx * 0.75, ry * 0.45, 0, 0, Math.PI * 2); x.fill();
      }
      x.filter = 'none';
      return c;
    }
    function drawSea(S, cam, p, yTop, dx = 0, alpha = 1) {
      view(cam, p);
      out.globalAlpha = alpha;
      out.drawImage(S, -640 + dx, yTop - 130);
      out.fillStyle = SEA_LOW;
      out.fillRect(-640, yTop + 285, 3200, 2400);
      out.globalAlpha = 1;
    }

    const rows = (HZ, s) => ({
      far: spires({ x0: -240, x1: 2160, base: HZ - 10, hMin: 300, hMax: 560, gap: 330, seed: s, thin: 0.9 }),
      mid: spires({ x0: -240, x1: 2160, base: HZ + 50, hMin: 240, hMax: 470, gap: 300, seed: s + 2 }),
    });
    const farRange = (ridge, HZ, seed) => granite({ ridge, color: '#c9c8ca', deep: '#b0b0b6', fadeTo: HZ + 160, seed, under: '#eeeeec', cracks: 20 });
    const midRange = (ridge, HZ, seed) => granite({ ridge, color: '#8d8580', deep: '#5b524d', fadeTo: HZ + 260, seed, under: '#e9e8e5', cracks: 110 });

    let RIDGE, FRAME, FLOCK = D.flock({ n: 5, seed: 23, spread: [70, 24], size: 8 });
    const SEA = [seaStrip(11), seaStrip(12), seaStrip(13, { lump: 1.5, shade: 0.28 })];
    const def = DH.location.get('huangshan');
    const cap = (o) => Object.assign(def.caption, { t0: 0.15, tOut: 2.05, wind: [560, -60], ...o });

    if (V === '1') {
      // panorama: far pale spires, the main row across the frame, a small pine rock by the lens
      const HZ = 700, R = rows(HZ, 41);
      begin('sky', 0); sky('#f3f2ee', '#e4e8ea', 700);
      begin('far', 0.2); farRange(R.far, HZ - 60, 42);
      begin('mid', 0.5); midRange(R.mid, HZ, 44);
      begin('near', 1);
      cliff([[-240, 1190], [-240, 820], [-60, 760], [80, 752], [170, 700], [260, 716], [320, 800], [440, 850], [520, 960], [610, 1190]], 46);
      hsPine(ctx, 200, 706, 230, 1, 47);
      RIDGE = { pts: R.mid, p: 0.5 };
      CAM = DH.location.glide({ x: -120, y: 10, zoom: 1.02 }, { x: 140, y: -6, zoom: 1.1 });
      cap({ x: 1420, y: 240, p: 0.3 });
      FRAME = (t) => {
        const cam = CAM(t);
        show('sky', cam); show('far', cam);
        view(cam, 0.25); D.birds(out, FLOCK, 700 + 40 * t, 300 - 6 * t, t, { color: INK2, alpha: 0.4 });
        drawSea(SEA[0], cam, 0.3, HZ - 80, t * 10, 0.9);
        caption(cam, t);
        show('mid', cam);
        drawSea(SEA[1], cam, 0.7, HZ + 30, -t * 18);
        show('near', cam);
        drawSea(SEA[2], cam, 1.3, 1010, t * 30);
      };
    } else if (V === '2') {
      // the welcoming pine: a tall near cliff on the left, its long bough over the cloud sea
      const HZ = 720, R = rows(HZ, 51);
      begin('sky', 0); sky('#f3f2ee', '#e4e8ea', 720);
      begin('far', 0.2); farRange(R.far.map(([x, y]) => [x, y + 60]), HZ - 50, 52);
      begin('mid', 0.5); midRange(R.mid.map(([x, y]) => [x + 300, y + 70]), HZ, 54);
      begin('near', 1);
      cliff([[-240, 1190], [-240, 250], [-100, 200], [20, 260], [90, 420], [200, 470], [300, 600], [470, 620], [560, 700], [600, 860], [720, 960], [800, 1190]], 56);
      const P = pineSprite(470, 1, 57);
      RIDGE = { pts: R.mid.map(([x, y]) => [x + 300, y + 70]), p: 0.5 };
      CAM = DH.location.glide({ x: -30, y: 14, zoom: 1.0 }, { x: 50, y: -4, zoom: 1.09 });
      cap({ x: 1430, y: 250, p: 0.3 });
      FRAME = (t) => {
        const cam = CAM(t);
        show('sky', cam); show('far', cam);
        drawSea(SEA[0], cam, 0.3, HZ - 70, t * 10, 0.9);
        caption(cam, t);
        show('mid', cam);
        view(cam, 0.45); D.birds(out, FLOCK, 1250 - 30 * t, 430 - 5 * t, t, { color: INK2, alpha: 0.4 });
        drawSea(SEA[1], cam, 0.7, HZ + 40, -t * 20);
        show('near', cam);
        drawPine(P, cam, 400, 622, t);
        drawSea(SEA[2], cam, 1.3, 1030, t * 30);
      };
    } else if (V === '3') {
      // rising out of the clouds: the frame starts white, the cloud layers sink and the
      // spires come through one row after another
      const HZ = 760, R = rows(HZ, 61);
      begin('sky', 0); sky('#f3f2ee', '#e4e8ea', 760);
      begin('far', 0.2); farRange(R.far, HZ - 70, 62);
      begin('mid', 0.5); midRange(R.mid.map(([x, y]) => [x, y - 40]), HZ, 64);
      RIDGE = { pts: R.mid.map(([x, y]) => [x, y - 40]), p: 0.5 };
      CAM = (t) => { const e = DH.ease.draw(DH.progress(t, 0, DURATION)); return { x: 0, y: DH.lerp(330, 0, e), zoom: DH.lerp(1.0, 1.06, e) }; };
      cap({ x: 960, y: 215, p: 0.25, t0: 0.9, tOut: 2.1 });
      FRAME = (t) => {
        const cam = CAM(t);
        show('sky', cam); show('far', cam);
        drawSea(SEA[0], cam, 0.35, HZ - 90, t * 10, 0.92);
        caption(cam, t);
        show('mid', cam);
        drawSea(SEA[1], cam, 0.8, HZ + 20, -t * 18);
        drawSea(SEA[2], cam, 1.5, 900, t * 30);
      };
    } else {
      // a gate: two near cliffs frame the view, clouds pour over the saddle between them;
      // far in the gap, spires with the Flown-in Rock (飞来石 Fēiláishí) on a ledge
      const HZ = 640, R = rows(HZ, 71);
      begin('sky', 0); sky('#f3f2ee', '#e4e8ea', 640);
      begin('far', 0.2); farRange(R.far, HZ - 40, 72);
      begin('mid', 0.5);
      const mid = R.mid.map(([x, y]) => [x, y + 20 + 110 * Math.exp(-Math.pow((x - 1000) / 300, 2))]); // a dip: the saddle
      midRange(mid, HZ + 30, 74);
      // the Flown-in Rock: a narrow boulder standing on end on a flat ledge
      ctx.fillStyle = rgba('#5b524d', 0.85);
      fillPoly(ctx, [[1290, 500], [1380, 500], [1384, 512], [1286, 512]]);
      fillPoly(ctx, [[1326, 500], [1329, 462], [1337, 452], [1345, 464], [1347, 500]]);
      begin('near', 1);
      cliff([[-240, 1190], [-240, 120], [-60, 90], [60, 200], [130, 420], [260, 520], [330, 700], [470, 800], [540, 1000], [600, 1190]], 76);
      cliff([[1420, 1190], [1470, 960], [1600, 860], [1650, 640], [1760, 560], [1850, 380], [2000, 330], [2160, 380], [2160, 1190]], 78);
      const P = pineSprite(250, -1, 79);
      RIDGE = { pts: mid, p: 0.5 };
      CAM = DH.location.glide({ x: 0, y: 10, zoom: 1.0 }, { x: 10, y: -10, zoom: 1.13 });
      cap({ x: 960, y: 205, p: 0.3 });
      FRAME = (t) => {
        const cam = CAM(t);
        show('sky', cam); show('far', cam);
        drawSea(SEA[0], cam, 0.3, HZ - 90, t * 10, 0.9);
        caption(cam, t);
        show('mid', cam);
        // the cloud fall: lumps slide from the saddle down into the lower sea
        view(cam, 0.6);
        out.filter = 'blur(14px)';
        for (let i = 0; i < 16; i++) {
          const ph = (i / 16 + t * 0.22) % 1;
          out.fillStyle = rgba(PAPER, Math.sin(Math.PI * ph) * 0.75 + 0.15);
          out.beginPath();
          out.ellipse(1000 + Math.sin(i * 7.3) * 90 * (0.5 + ph), 650 + ph * 240, 70 + ph * 150, 30 + ph * 34, 0, 0, Math.PI * 2);
          out.fill();
        }
        out.filter = 'none';
        drawSea(SEA[1], cam, 0.75, 860, -t * 18);
        show('near', cam);
        drawPine(P, cam, 1770, 566, t);
        drawSea(SEA[2], cam, 1.3, 1040, t * 30);
      };
    }
    return { frame: FRAME, ridge: RIDGE };
  }

  DH.location.define('huangshan', {
    name: 'Хуаншань',
    time: 'day',
    horizon: 700, // the top of the cloud sea
    hasWater: false, // clouds, not water, under the peaks
    caption: { hanzi: '黄山', pinyin: 'Huángshān', x: 1420, y: 240, p: 0.3, t0: 0.15, tOut: 2.05, wind: [560, -60] },
    camera: (t) => CAM(t),
    setup,
  });
})();
