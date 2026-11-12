// The library of places (locations/*.js) and the engine that runs one of them.
//
// A location file registers itself with DH.location.define(id, def):
//   name      human name, for the catalog ("Великая стена")
//   time      'day' or 'night': which slot of the route it can stand in (docs/locations.md)
//   caption   the place caption for shared/caption.js: hanzi, pinyin, position, depth p ...
//   camera(t) the camera at animation time t (0..2.5 s): { x, y, zoom }
//   setup(k)  paints the place into layers through the kit k (below) and returns
//             { frame(t), ridge }: frame draws animation time t into k.out; ridge is
//             { pts, p }, the main crest line in world coords at depth p (for the cuts)
//
// DH.location.make(id, { duration }) paints the place once (painting takes a while) and
// resolves to { id, def, DURATION, frame(dst, t), silhouette(t) }. Every location is laid
// out for 2.5 s of animation; duration stretches all of it, the caption included.
(function (g) {
  const DH = g.DH;
  const LEN = 2.5; // the animation length every location is laid out for, s
  const REGISTRY = {};

  function define(id, def) {
    REGISTRY[id] = { id, ...def };
  }

  async function make(id, { duration = LEN } = {}) {
    const def = REGISTRY[id];
    if (!def) throw new Error(`unknown location "${id}" (is locations/${id}.js loaded?)`);
    const W = DH.wc;
    const out = W.canvas(1920, 1080).getContext('2d');

    // Layers: canvases larger than the frame (world x -240..2160, y -110..1190), so the camera
    // can pan and zoom. Painting functions draw into the current layer through its context.
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
    // The transform for drawing in world coords at depth p; returns the zoom at that depth.
    function view(cam, p) {
      const z = 1 + (cam.zoom - 1) * p;
      out.setTransform(z, 0, 0, z, 960 + z * (-960 - cam.x * p), 540 + z * (-540 - cam.y * p));
      return z;
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

    // Painting helpers that draw into the current layer.
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

    // The caption hangs in the sky of its place at depth p, so the camera moves it with a
    // little parallax: it is in the scene, not glued to the screen.
    let CAP = null;
    function caption(cam, t) {
      const o = def.caption;
      if (!o || !CAP) return;
      const z = 1 + (cam.zoom - 1) * o.p;
      out.setTransform(z, 0, 0, z, 960 + z * (-960 - cam.x * o.p), 540 + z * (-540 - cam.y * o.p));
      DH.caption.draw(out, CAP, t, o);
      if (o.reflect) DH.caption.reflect(out, CAP, t, o, o.reflect);
      out.filter = 'none';
      out.globalAlpha = 1;
    }

    const kit = {
      W, D: DH.details, out, LX, LY, LW, LH, LAYERS, DURATION: LEN,
      INK: '#24170f', INK2: '#3e3a36',
      begin, place, view, show, masked, smooth, sky, range, mist, skylineOf, caption,
      camera: def.camera,
    };
    const scene = def.setup(kit);
    // the caption needs its fonts loaded before the first frame
    await DH.caption.ready;
    if (def.caption) CAP = DH.caption.make(def.caption);

    // scene time -> the time of the animation, which is laid out for LEN s
    const anim = (t) => (t * LEN) / duration;

    // The silhouette of the place at time t in frame coords: y of its main ridge at each x
    // from -100 to 2020 (step 8), or null where the ridge does not reach.
    function silhouette(t) {
      t = anim(t);
      const RIDGE = scene.ridge;
      if (!RIDGE) return null;
      const cam = def.camera(Math.min(Math.max(t, 0), LEN)), z = 1 + (cam.zoom - 1) * RIDGE.p;
      const sc = RIDGE.pts.map(([x, y]) => [960 + z * (x - 960 - cam.x * RIDGE.p), 540 + z * (y - 540 - cam.y * RIDGE.p)]);
      const ys = [];
      for (let x = -100, i = 0; x <= 2020; x += 8) {
        while (i < sc.length - 2 && sc[i + 1][0] < x) i++;
        const [ax, ay] = sc[i], [bx, by] = sc[i + 1];
        ys.push(x < ax || x > bx ? null : ay + (by - ay) * ((x - ax) / (bx - ax || 1)));
      }
      return ys;
    }

    function frame(dst, t) {
      t = Math.min(Math.max(anim(t), 0), LEN - 1e-6);
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.globalAlpha = 1;
      out.globalCompositeOperation = 'source-over';
      out.fillStyle = '#f5f2ec';
      out.fillRect(0, 0, 1920, 1080);
      scene.frame(t);
      out.setTransform(1, 0, 0, 1, 0, 0);
      dst.setTransform(1, 0, 0, 1, 0, 0);
      dst.drawImage(out.canvas, 0, 0);
    }
    return { id, def, DURATION: duration, frame, silhouette };
  }

  // The camera helper most locations use: a slow eased move from a to b over the animation.
  function glide(a, b) {
    return (t) => {
      const k = DH.ease.draw(DH.progress(t, 0, LEN));
      return { x: DH.lerp(a.x, b.x, k), y: DH.lerp(a.y, b.y, k), zoom: DH.lerp(a.zoom, b.zoom, k) };
    };
  }

  DH.location = { LEN, define, make, glide, all: () => Object.values(REGISTRY), get: (id) => REGISTRY[id] };
})(window);
