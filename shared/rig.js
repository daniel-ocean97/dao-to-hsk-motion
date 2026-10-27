// Rig: animates a flat illustration (a PNG on plain paper) by bending a mesh in WebGL.
// The art comes from an image generator (docs/rita-generation.md); the rig only moves it.
//
// - Cut-out: the plain paper around the figure becomes transparent; paper inside the
//   silhouette stays, so the landscape never shows through the figure.
// - Deformers bend parts of the mesh: "flow" for hair, hem and sash ends in the wind,
//   "breath" for a slow rise of the shoulders. Bend only what hangs in the air: a part
//   painted over the body drags the body with it.
// - Swaps change a region to another image of the same pose (blink, head turn).
//
// Every frame is a pure function of its inputs, as everywhere in this project.
// Pages must be served over HTTP: canvas pixels of file:// images cannot be read.
(function (g) {
  const DH = g.DH;
  const { clamp, noise } = DH;

  const loadImage = (src) => new Promise((ok, fail) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => fail(new Error(`rig: cannot load ${src}`));
    im.src = src;
  });

  const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const smooth = (x) => x * x * (3 - 2 * x);

  // ---------- Cut-out ----------

  // Paper colour of the art: per-channel median of a thin border strip.
  function borderColor(d, w, h) {
    const ch = [[], [], []];
    const take = (x, y) => { const i = (y * w + x) * 4; for (let c = 0; c < 3; c++) ch[c].push(d[i + c]); };
    for (let x = 0; x < w; x += 3) { take(x, 2); take(x, h - 3); }
    for (let y = 0; y < h; y += 3) { take(2, y); take(w - 3, y); }
    return ch.map((a) => a.sort((p, q) => p - q)[a.length >> 1]);
  }

  // Binary dilation by a (2r+1)^2 square: two passes of a sliding count.
  function dilate(m, w, h, r) {
    const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let c = 0;
      for (let x = -r; x < w; x++) {
        if (x + r < w && m[row + x + r]) c++;
        if (x - r - 1 >= 0 && m[row + x - r - 1]) c--;
        if (x >= 0) tmp[row + x] = c > 0 ? 1 : 0;
      }
    }
    for (let x = 0; x < w; x++) {
      let c = 0;
      for (let y = -r; y < h; y++) {
        if (y + r < h && tmp[(y + r) * w + x]) c++;
        if (y - r - 1 >= 0 && tmp[(y - r - 1) * w + x]) c--;
        if (y >= 0) out[y * w + x] = c > 0 ? 1 : 0;
      }
    }
    return out;
  }
  const invert = (m) => m.map((v) => 1 - v);
  const erode = (m, w, h, r) => invert(dilate(invert(m), w, h, r));

  // Pixels of pass reachable from the seed indices (4-connected).
  function flood(pass, w, h, seeds) {
    const reached = new Uint8Array(w * h), stack = new Int32Array(w * h);
    let n = 0;
    const visit = (i) => { if (pass[i] && !reached[i]) { reached[i] = 1; stack[n++] = i; } };
    seeds.forEach(visit);
    while (n) {
      const i = stack[--n], x = i % w;
      if (x > 0) visit(i - 1);
      if (x < w - 1) visit(i + 1);
      if (i >= w) visit(i - w);
      if (i < (h - 1) * w) visit(i + w);
    }
    return reached;
  }

  // Inside = what the outer paper cannot reach once gaps up to 2*r px are bridged.
  function enclosed(ink, w, h, r, solid) {
    const wall = erode(dilate(ink, w, h, r), w, h, r);
    if (solid) for (let i = 0; i < w * h; i++) wall[i] |= solid[i];
    const border = [];
    for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
    return invert(flood(invert(wall), w, h, border));
  }

  // Alpha of the figure: pixels that differ from the paper and what they enclose.
  // A tight closing follows thin strands of hair. A wide one (gaps up to 2*close px)
  // also seals breaks in a faint outline, but would fill the gaps between strands
  // with paper. So the wide fill is kept only where it is thicker than 2*close px:
  // lit areas of the dress stay, slivers of paper between wisps go.
  // solid (optional) marks pixels that are inside anyway.
  function silhouette(d, w, h, bg, threshold, close, solid) {
    const ink = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const k = i * 4;
      const diff = Math.max(Math.abs(d[k] - bg[0]), Math.abs(d[k + 1] - bg[1]), Math.abs(d[k + 2] - bg[2]));
      ink[i] = diff > threshold ? 1 : 0;
    }
    const tight = enclosed(ink, w, h, 2, solid), wide = enclosed(ink, w, h, close, solid);
    const extra = wide.map((v, i) => v & (1 - tight[i]));
    const core = erode(extra, w, h, close), seeds = [];
    for (let i = 0; i < w * h; i++) if (core[i]) seeds.push(i);
    const kept = flood(extra, w, h, seeds);
    const outside = tight.map((v, i) => 1 - (v | kept[i]));
    // soft 3x3 edge
    const a = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0, c = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            s += 1 - outside[yy * w + xx]; c++;
          }
        }
        a[y * w + x] = (255 * s) / c;
      }
    }
    return a;
  }

  // Regions rasterised to a 0..255 mask; edges blurred over about +-feather px when soft.
  function polyMask(regions, w, h, soft) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    for (const { poly, feather } of regions) {
      ctx.filter = soft ? `blur(${feather / 2}px)` : 'none';
      ctx.beginPath();
      poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
    }
    const md = ctx.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) m[i] = md[i * 4 + 3];
    return m;
  }

  // Image -> ImageData with the figure cut out and the art's paper tinted to the scene paper.
  // opt.solid: regions that are inside anyway (lit paper with no outline around it).
  // opt.soft: regions where alpha follows the density of paint instead of the outline:
  // fine strands of hair, where paper between the strands must turn transparent.
  function cutOut(im, opt) {
    const w = im.naturalWidth, h = im.naturalHeight;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(im, 0, 0);
    const data = ctx.getImageData(0, 0, w, h), d = data.data;
    const bg = borderColor(d, w, h), paper = hexRgb(opt.paper);
    const solid = opt.solid && opt.solid.length ? polyMask(opt.solid, w, h, false).map((v) => (v > 127 ? 1 : 0)) : null;
    const soft = opt.soft && opt.soft.length ? polyMask(opt.soft, w, h, true) : null;
    const alpha = silhouette(d, w, h, bg, opt.threshold, opt.close, solid);
    const gain = paper.map((p, c) => p / Math.max(1, bg[c]));
    const t0 = opt.threshold * 0.5, t1 = opt.threshold * 5;
    for (let i = 0; i < w * h; i++) {
      const k = i * 4;
      let a = alpha[i] / 255;
      if (soft && soft[i]) {
        const diff = Math.max(Math.abs(d[k] - bg[0]), Math.abs(d[k + 1] - bg[1]), Math.abs(d[k + 2] - bg[2]));
        const s = soft[i] / 255, paint = smooth(clamp((diff - t0) / (t1 - t0)));
        a = a * (1 - s) + Math.min(a, paint) * s;
      }
      // unmix the paper out of semi-transparent pixels: pixel = a * paint + (1 - a) * paper
      for (let c = 0; c < 3; c++) {
        const f = a > 0.02 ? (d[k + c] - (1 - a) * bg[c]) / a : bg[c];
        d[k + c] = f * gain[c];
      }
      d[k + 3] = a * 255;
    }
    return data;
  }

  // ---------- Regions ----------

  // Signed distance from p to a polygon, positive inside.
  function polyDistance(poly, x, y) {
    let inside = false, best = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      const ex = xj - xi, ey = yj - yi;
      const k = clamp(((x - xi) * ex + (y - yi) * ey) / (ex * ex + ey * ey || 1));
      best = Math.min(best, Math.hypot(x - xi - ex * k, y - yi - ey * k));
    }
    return inside ? best : -best;
  }

  // 0 outside, 1 deep inside; the edge is blurred over +-feather px.
  const regionWeight = (poly, feather, x, y) => smooth(clamp((polyDistance(poly, x, y) + feather) / (2 * feather)));

  // Soft region mask as a canvas, for swaps.
  function regionMask(poly, feather, w, h) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.filter = `blur(${feather / 2}px)`;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    return cv;
  }

  // ---------- WebGL ----------

  const VS = `#version 300 es
  in vec2 aPos; in vec2 aUv; in float aW;
  uniform vec2 uSize; uniform float uPad;
  out vec2 vUv; out float vW;
  void main() {
    vec2 p = (aPos + uPad) / (uSize + 2.0 * uPad);
    gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
    vUv = aUv; vW = aW;
  }`;

  // Textures hold premultiplied colour, so mixing and mipmaps stay clean at the edges.
  const FS = `#version 300 es
  precision highp float;
  in vec2 vUv; in float vW;
  uniform sampler2D uA, uB, uM;
  uniform float uK, uDebug;
  out vec4 o;
  void main() {
    float m = texture(uM, vUv).r * uK;
    vec4 c = mix(texture(uA, vUv), texture(uB, vUv), m);
    if (uDebug > 0.5) {
      float swap = texture(uM, vUv).r;
      c = mix(c, vec4(0.85, 0.1, 0.1, 1.0) * max(c.a, 0.35), 0.55 * vW);
      c = mix(c, vec4(0.1, 0.3, 0.9, 1.0) * max(c.a, 0.35), 0.45 * swap);
    }
    o = c;
  }`;

  const LINE_FS = `#version 300 es
  precision highp float;
  out vec4 o;
  void main() { o = vec4(0.1, 0.5, 0.2, 0.5); }`;

  function program(gl, vs, fs) {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.bindAttribLocation(p, 1, 'aUv');
    gl.bindAttribLocation(p, 2, 'aW');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  function texture(gl, source, premultiply) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  // ---------- Deformers ----------
  // Lengths in config are px of cfg.size; amplitudes are fractions of the image height.

  function prepareDeformer(d, region, verts, H) {
    const n = verts.length / 2, w = new Float32Array(n), s = new Float32Array(n);
    for (let i = 0; i < n; i++) w[i] = regionWeight(region.poly, region.feather, verts[2 * i], verts[2 * i + 1]);
    if (d.type === 'flow') {
      // s: 0 at the root, 1 at the tip, measured along the root -> tip axis
      const [rx, ry] = d.root, [tx, ty] = d.tip, L = Math.hypot(tx - rx, ty - ry);
      const ux = (tx - rx) / L, uy = (ty - ry) / L;
      for (let i = 0; i < n; i++) s[i] = clamp(((verts[2 * i] - rx) * ux + (verts[2 * i + 1] - ry) * uy) / L, 0, 1.3);
      const wind = d.wind || [-1, -0.15], wl = Math.hypot(wind[0], wind[1]);
      Object.assign(d, { u: [ux, uy], v: [-uy, ux], windDir: [wind[0] / wl, wind[1] / wl] });
    } else if (d.type === 'breath') {
      for (let i = 0; i < n; i++) s[i] = clamp((d.pivotY - verts[2 * i + 1]) / (d.pivotY - d.topY));
    }
    return { ...d, weight: w, s, H };
  }

  function displace(rig, o, out) {
    const { verts, deformers } = rig;
    out.set(verts);
    const t = o.t, windK = o.wind ?? 1, gust = o.gust ?? 0;
    for (const d of deformers) {
      const { weight, s, H } = d;
      if (d.type === 'flow') {
        const seed = d.seed || 0, amp = d.amp * H * windK * (1 + 0.8 * gust);
        for (let i = 0; i < weight.length; i++) {
          const w = weight[i];
          if (w < 1e-3) continue;
          const si = s[i], phase = 2 * Math.PI * d.freq * t + seed - si * d.lag;
          const sp = Math.pow(si, d.power || 1.5);
          const sway = 0.65 * Math.sin(phase) + 0.35 * noise(d.freq * t * 2.3 - si * d.lag * 0.6, seed);
          const dv = amp * sp * sway, du = 0.12 * amp * sp * Math.sin(2 * phase);
          const dg = gust * (d.gust || 0) * H * Math.pow(si, 1.2);
          out[2 * i] += w * (d.v[0] * dv + d.u[0] * du + d.windDir[0] * dg);
          out[2 * i + 1] += w * (d.v[1] * dv + d.u[1] * du + d.windDir[1] * dg);
        }
      } else if (d.type === 'breath') {
        const k = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / d.period + (d.seed || 0));
        for (let i = 0; i < weight.length; i++) {
          if (weight[i] < 1e-3) continue;
          out[2 * i + 1] -= weight[i] * d.amp * H * s[i] * k;
        }
      }
    }
  }

  // ---------- Rig ----------

  // cfg: { size: [w, h], anchor: [x, y], images: { name: url }, regions: { name: { poly, feather } },
  //        deformers: [...], swaps: { image: region }, solid: [region], soft: [region],
  //        cell, threshold, close }
  async function load(cfg, opt = {}) {
    const base = opt.base || '';
    const names = Object.keys(cfg.images);
    const imgs = await Promise.all(names.map((k) => loadImage(base + cfg.images[k])));
    const W = imgs[0].naturalWidth, H = imgs[0].naturalHeight;
    // config coordinates are px of cfg.size; rescale them to the real image
    const kx = W / cfg.size[0], ky = H / cfg.size[1];
    const pt = ([x, y]) => [x * kx, y * ky];
    const regions = {};
    for (const [k, r] of Object.entries(cfg.regions)) regions[k] = { poly: r.poly.map(pt), feather: (r.feather || 30) * kx };

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: true });
    if (!gl) throw new Error('rig: WebGL2 is not available');
    const prog = program(gl, VS, FS), lineProg = program(gl, VS, LINE_FS);

    const cut = {
      paper: opt.paper || '#f5f2ec', threshold: cfg.threshold ?? 14, close: cfg.close ?? 10,
      solid: (cfg.solid || []).map((k) => regions[k]),
      soft: (cfg.soft || []).map((k) => regions[k]),
    };
    const tex = {};
    names.forEach((k, i) => { tex[k] = texture(gl, cutOut(imgs[i], cut), true); });
    const swapTex = {};
    for (const [k, rname] of Object.entries(cfg.swaps || {})) {
      const r = regions[rname];
      swapTex[k] = texture(gl, regionMask(r.poly, r.feather, W, H), false);
    }
    const blank = texture(gl, regionMask([[0, 0], [1, 0], [1, 1]], 1, 2, 2), false);

    // mesh: a regular grid over the image
    const cell = (cfg.cell || 16) * kx;
    const nx = Math.ceil(W / cell) + 1, ny = Math.ceil(H / cell) + 1;
    const verts = new Float32Array(nx * ny * 2), uvs = new Float32Array(nx * ny * 2);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = 2 * (j * nx + i), x = Math.min(W, i * cell), y = Math.min(H, j * cell);
        verts[k] = x; verts[k + 1] = y; uvs[k] = x / W; uvs[k + 1] = y / H;
      }
    }
    const tris = [], lines = [];
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
        tris.push(a, b, c, b, d, c);
        lines.push(a, b, a, c);
      }
    }

    const deformers = (cfg.deformers || []).map((d) => prepareDeformer({
      ...d,
      root: d.root && pt(d.root), tip: d.tip && pt(d.tip),
      pivotY: d.pivotY != null ? d.pivotY * ky : undefined, topY: d.topY != null ? d.topY * ky : undefined,
    }, regions[d.region], verts, H));
    const weightSum = new Float32Array(verts.length / 2);
    for (const d of deformers) d.weight.forEach((w, i) => { weightSum[i] = Math.min(1, weightSum[i] + w); });

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const attr = (loc, data, size, usage) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      return b;
    };
    const pos = attr(0, verts, 2, gl.DYNAMIC_DRAW);
    attr(1, uvs, 2, gl.STATIC_DRAW);
    attr(2, weightSum, 1, gl.STATIC_DRAW);
    const triBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(tris), gl.STATIC_DRAW);
    const lineBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(lines), gl.STATIC_DRAW);

    const pad = 0.08 * H; // room for parts bent outside the image
    const anchor = pt(cfg.anchor);
    const moved = new Float32Array(verts.length);
    const rig = { canvas, W, H, pad, anchor, verts, deformers };

    // o: { t, wind, gust, state, swap: { to, k }, scale, debug }
    // state: image name; swap: blend another image into its swap region by k (0..1).
    rig.render = (o) => {
      const scale = o.scale || 1;
      const cw = Math.max(1, Math.round((W + 2 * pad) * scale)), ch = Math.max(1, Math.round((H + 2 * pad) * scale));
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      displace(rig, o, moved);
      gl.viewport(0, 0, cw, ch);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, pos);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, moved);

      const state = o.state || names[0], swap = o.swap && o.swap.k > 0 ? o.swap : null;
      gl.useProgram(prog);
      const u = (n) => gl.getUniformLocation(prog, n);
      gl.uniform2f(u('uSize'), W, H);
      gl.uniform1f(u('uPad'), pad);
      gl.uniform1f(u('uK'), swap ? clamp(swap.k) : 0);
      gl.uniform1f(u('uDebug'), o.debug ? 1 : 0);
      [[tex[state], 'uA'], [tex[swap ? swap.to : state], 'uB'], [swap ? swapTex[swap.to] : (o.debug && swapTex[o.debug]) || blank, 'uM']]
        .forEach(([tx, name], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tx); gl.uniform1i(u(name), i); });
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triBuf);
      gl.drawElements(gl.TRIANGLES, tris.length, gl.UNSIGNED_INT, 0);

      if (o.debug) {
        gl.useProgram(lineProg);
        gl.uniform2f(gl.getUniformLocation(lineProg, 'uSize'), W, H);
        gl.uniform1f(gl.getUniformLocation(lineProg, 'uPad'), pad);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineBuf);
        gl.drawElements(gl.LINES, lines.length, gl.UNSIGNED_INT, 0);
      }
      return canvas;
    };

    // Draw and place the canvas so that the anchor (between the feet) lands on scene
    // point (x, y) and the whole image is h scene units tall, seen by camera cam on depth layer p
    // (the same maths as DH.ink.layer). Assumes the canvas sits in a 1920x1080 stage.
    rig.drawAt = (o, { cam, p = 1, x, y, h }) => {
      const z = 1 + (cam.zoom - 1) * p;
      const scale = (z * h) / H;
      rig.render({ ...o, scale });
      const sx = 960 + z * (x - 960 - cam.x * p), sy = 540 + z * (y - 540 - cam.y * p);
      const left = sx - (anchor[0] + pad) * scale, top = sy - (anchor[1] + pad) * scale;
      Object.assign(canvas.style, {
        position: 'absolute', left: '0', top: '0', transformOrigin: '0 0',
        transform: `translate(${left.toFixed(2)}px, ${top.toFixed(2)}px)`,
      });
      return canvas;
    };

    return rig;
  }

  DH.rig = { load, regionWeight, cutOut };
})(window);
