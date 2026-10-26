// Ink and watercolour building blocks: palette, SVG filters, parallax camera,
// tapered brush strokes and ink-painting landscape layers.
(function (g) {
  const DH = g.DH;

  // Brand palette (docs/brand.md) plus muted watercolour tints.
  const C = {
    paper: '#f5f2ec', paper2: '#ece6dc', ink: '#141414', ink2: '#3e3a36', muted: '#6b6660',
    line: '#d6d0c6', wine: '#7b1e2b', wineStrong: '#5e1520', wineSoft: '#f3e3e5',
    ochre: '#d9b98a', pine: '#3d4a3f', water: '#d9d6cf',
    hair: '#3a2820', hairLight: '#5a4033', skin: '#efdccd', skinShade: '#d9bba8',
    linen: '#e8dfd2', linenShade: '#cfc3b3', iris: '#8ea4b0', lip: '#b77f7a',
    // watercolour tints after the owner's style reference (docs/brand.md)
    indigo: '#34496a', indigoSoft: '#8ea3bd', ochreWash: '#c9a46a', sienna: '#a8643a',
    violetGray: '#9a8fa6', skinWash: '#e8c4a6', sepia: '#5b3a28', sepiaInk: '#24170f',
  };

  const defs = `
  <defs>
    <filter id="inkEdge" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="5"/>
    </filter>
    <filter id="wash" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="16" result="d"/>
      <feGaussianBlur in="d" stdDeviation="2"/>
    </filter>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="softer" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="rim" x="-30%" y="-10%" width="160%" height="120%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="d"/>
      <feGaussianBlur in="d" stdDeviation="7" result="b"/>
      <feFlood flood-color="#f7dcc0" flood-opacity=".95"/>
      <feComposite in2="b" operator="in" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- watercolour wash: wobbly edge, dried dark rim, uneven pigment -->
    <filter id="wc" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="4" result="warp"/>
      <feDisplacementMap in="SourceGraphic" in2="warp" scale="12" xChannelSelector="R" yChannelSelector="G" result="shape"/>
      <feGaussianBlur in="shape" stdDeviation="4" result="blur"/>
      <feComposite in="shape" in2="blur" operator="arithmetic" k2="1.6" k3="-1.1" result="edge"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="9" result="pig"/>
      <feColorMatrix in="pig" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.8 0 0 0 -0.35" result="pigA"/>
      <feComposite in="shape" in2="pigA" operator="in" result="body"/>
      <feGaussianBlur in="body" stdDeviation="0.8" result="bodySoft"/>
      <feMerge><feMergeNode in="bodySoft"/><feMergeNode in="edge"/></feMerge>
    </filter>
    <!-- looser, wetter wash for big soft areas -->
    <filter id="wcWet" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="12" result="warp"/>
      <feDisplacementMap in="SourceGraphic" in2="warp" scale="26" xChannelSelector="R" yChannelSelector="G" result="shape"/>
      <feGaussianBlur in="shape" stdDeviation="3" result="soft"/>
      <feGaussianBlur in="shape" stdDeviation="9" result="blur"/>
      <feComposite in="soft" in2="blur" operator="arithmetic" k2="1.5" k3="-0.9" result="edge"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed="21" result="pig"/>
      <feColorMatrix in="pig" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.3" result="pigA"/>
      <feComposite in="soft" in2="pigA" operator="in" result="body"/>
      <feMerge><feMergeNode in="body"/><feMergeNode in="edge"/></feMerge>
    </filter>
    <!-- brush line: slight tremor -->
    <filter id="inkLine" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="5" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6"/>
    </filter>
    <filter id="paperTex" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11"/>
      <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0.08 0"/>
    </filter>
    <linearGradient id="skyMorning" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e4e2dc"/><stop offset=".6" stop-color="${C.paper}"/>
      <stop offset="1" stop-color="#eae7e0"/>
    </linearGradient>
    <linearGradient id="skyDawn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.paper2}"/><stop offset=".5" stop-color="${C.paper}"/>
      <stop offset=".8" stop-color="${C.wineSoft}"/><stop offset="1" stop-color="#ebd3c2"/>
    </linearGradient>
    <radialGradient id="sunGlow">
      <stop offset="0" stop-color="#ecc9a6" stop-opacity=".95"/>
      <stop offset=".35" stop-color="${C.wineSoft}" stop-opacity=".7"/>
      <stop offset="1" stop-color="${C.wineSoft}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.paper}" stop-opacity="0"/>
      <stop offset=".6" stop-color="${C.paper}" stop-opacity=".85"/>
      <stop offset="1" stop-color="${C.paper}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="dressBacklit" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#90867b"/><stop offset=".7" stop-color="#a99f93"/>
      <stop offset="1" stop-color="#d8c2b1"/>
    </linearGradient>
    <linearGradient id="dressLit" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.linenShade}"/><stop offset=".6" stop-color="${C.linen}"/>
      <stop offset="1" stop-color="#f1e9de"/>
    </linearGradient>
  </defs>`;

  // Parallax camera. p = depth factor: 0 = sky (static), 1 = hero plane, >1 = foreground.
  // cam = { x, y, zoom } in hero-plane pixels.
  function layer(cam, p) {
    const z = 1 + (cam.zoom - 1) * p;
    return `translate(960 540) scale(${z.toFixed(4)}) translate(${(-960 - cam.x * p).toFixed(2)} ${(-540 - cam.y * p).toFixed(2)})`;
  }

  // Closed outline of a brush stroke along pts with width w(s), s in 0..1.
  function taper(pts, w) {
    const n = pts.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const hw = w(i / (n - 1)) / 2;
      L.push([pts[i].x - dy * hw, pts[i].y + dx * hw]);
      R.push([pts[i].x + dy * hw, pts[i].y - dx * hw]);
    }
    const ring = L.concat(R.reverse());
    let d = `M ${ring[0][0].toFixed(1)} ${ring[0][1].toFixed(1)}`;
    for (let i = 1; i < ring.length; i++) {
      const [x0, y0] = ring[i - 1], [x1, y1] = ring[i];
      d += ` Q ${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`;
    }
    return d + ' Z';
  }

  // Smooth open polyline through points (for fold lines, embroidery).
  function smooth(pts) {
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    const e = pts[pts.length - 1];
    return d + ` L ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
  }

  // Mountain ridge from |sin| sums: sharp peaks typical of ink landscapes.
  function ridge(y0, amp, ph, freq, bottom = 1300, x0 = -400, x1 = 2400) {
    let d = `M ${x0} ${bottom} L ${x0} ${y0}`;
    for (let x = x0; x <= x1; x += 20) {
      const h = Math.abs(Math.sin(x * freq + ph)) * 0.65 + Math.abs(Math.sin(x * freq * 2.3 + ph * 1.7)) * 0.35;
      d += ` L ${x} ${(y0 - amp * Math.pow(h, 1.6)).toFixed(1)}`;
    }
    return d + ` L ${x1} ${bottom} Z`;
  }

  // Ink-painting landscape split into parallax layers.
  function landscape(cam, t, o) {
    const hz = o.horizon ?? 700;
    let s = `<rect width="1920" height="1080" fill="url(#${o.dawn ? 'skyDawn' : 'skyMorning'})"/>`;
    if (o.sun) {
      s += `<g transform="${layer(cam, 0.04)}"><circle cx="${o.sun.x}" cy="${o.sun.y}" r="440" fill="url(#sunGlow)"/>
        <circle cx="${o.sun.x}" cy="${o.sun.y}" r="74" fill="${C.wine}" opacity=".88" filter="url(#wash)"/></g>`;
    }
    s += `<g transform="${layer(cam, 0.12)}"><path d="${ridge(hz - 30, 180, 0.6, 0.0042, hz + 10)}" fill="#dcd6cc" filter="url(#wash)"/>
      <rect x="-400" y="${hz - 170}" width="2800" height="210" fill="url(#mist)"/></g>`;
    s += `<g transform="${layer(cam, 0.25)}"><path d="${ridge(hz + 5, 125, 2.1, 0.0061, hz + 20)}" fill="${C.muted}" opacity=".5" filter="url(#wash)"/>
      <rect x="-400" y="${hz}" width="2800" height="700" fill="${C.water}"/>`;
    if (o.sun) {
      for (let i = 0; i < 7; i++) {
        const w = 150 - i * 18, y = hz + 18 + i * 22, sx = Math.sin(t * 2.2 + i) * 10;
        s += `<rect x="${(o.sun.x - w / 2 + sx).toFixed(1)}" y="${y}" width="${w}" height="4" rx="2" fill="${C.wine}" opacity="${(0.45 - i * 0.05).toFixed(2)}"/>`;
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const x = 300 + i * 330 + Math.sin(t * 0.8 + i * 2) * 20;
        s += `<rect x="${x.toFixed(1)}" y="${hz + 30 + i * 26}" width="${120 - i * 10}" height="3" rx="1.5" fill="${C.muted}" opacity=".25"/>`;
      }
    }
    s += `</g>`;
    s += `<g transform="${layer(cam, 0.45)}"><path d="${ridge(hz + 130, 120, 4.0, 0.0035)}" fill="${C.ink2}" opacity=".38" filter="url(#wash)"/>
      <rect x="-400" y="${hz + 60}" width="2800" height="140" fill="url(#mist)" opacity=".6"/></g>`;
    return s;
  }

  // Dark rock ledge on the hero plane.
  function rock(x, y, w) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const lift = Math.sin(Math.PI * u) * 26 + Math.sin(u * 17) * 7 + Math.sin(u * 41) * 3;
      pts.push(`${(x - w / 2 + w * u).toFixed(1)} ${(y + 46 - lift - (u > 0.3 && u < 0.7 ? 8 : 0)).toFixed(1)}`);
    }
    return `<path d="M ${x - w / 2 - 30} 1400 L ${pts.join(' L ')} L ${x + w / 2 + 40} 1400 Z" fill="${C.ink}" filter="url(#inkEdge)"/>
      <path d="M ${x - w / 2.4} ${y + 70} C ${x - w / 5} ${y + 46} ${x} ${y + 80} ${x + w / 4} ${y + 58}" stroke="${C.ink2}" stroke-width="5" fill="none" opacity=".7"/>
      <path d="M ${x + w / 8} ${y + 110} C ${x + w / 4} ${y + 96} ${x + w / 3} ${y + 120} ${x + w / 2.3} ${y + 104}" stroke="${C.ink2}" stroke-width="4" fill="none" opacity=".6"/>`;
  }

  // Pine branch for the foreground layer; needles sway with the wind.
  function pine(x, y, sc, t, blur) {
    const sway = Math.sin(t * 1.6) * 2;
    let s = `<g transform="translate(${x} ${y}) scale(${sc}) rotate(${sway.toFixed(2)})" filter="url(#${blur ? 'soft' : 'inkEdge'})">`;
    s += `<path d="M -60 -20 C 80 30 180 60 330 70" stroke="${C.ink}" stroke-width="16" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M 160 50 C 200 100 230 120 280 140" stroke="${C.ink}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    const tufts = [[120, 40], [220, 64], [320, 70], [280, 140], [60, 10]];
    tufts.forEach(([tx, ty], j) => {
      for (let k = -4; k <= 4; k++) {
        const a = k * 0.28 + 1.4 + Math.sin(t * 2 + j) * 0.04;
        s += `<path d="M ${tx} ${ty} l ${(Math.cos(a) * 55).toFixed(1)} ${(Math.sin(a) * 38).toFixed(1)}" stroke="${C.pine}" stroke-width="3" opacity=".85"/>`;
      }
    });
    return s + `</g>`;
  }

  const paper = `<rect width="1920" height="1080" filter="url(#paperTex)" pointer-events="none"/>`;

  // Deterministic hash in [0, 1).
  const hash = (i, seed = 0) => {
    const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  // Transparent watercolour layer; layers glaze over each other (multiply).
  function wash(d, color, op = 0.6, filter = 'wc') {
    return `<path d="${d}" fill="${color}" fill-opacity="${op}" filter="url(#${filter})" style="mix-blend-mode:multiply"/>`;
  }

  // Broken brush contour: a dashed main line plus a faint continuous hairline.
  function inkLine(d, w = 1.6, op = 0.85, color = C.ink, dash = '70 8 30 14 110 6 45 10') {
    return `<g filter="url(#inkLine)" opacity="${op}"><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"
      stroke-linecap="round" stroke-dasharray="${dash}"/><path d="${d}" fill="none" stroke="${color}"
      stroke-width="${(w * 0.4).toFixed(2)}" stroke-linecap="round" opacity=".55"/></g>`;
  }

  // Points along an SVG path, measured by the browser (deterministic).
  let probe = null;
  function sampleD(d, n) {
    if (!probe) {
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('width', '0');
      svg.setAttribute('height', '0');
      svg.style.position = 'absolute';
      probe = document.createElementNS(NS, 'path');
      svg.appendChild(probe);
      document.body.appendChild(svg);
    }
    probe.setAttribute('d', d);
    const L = probe.getTotalLength(), pts = [];
    for (let i = 0; i <= n; i++) {
      const p = probe.getPointAtLength(L * i / n);
      pts.push({ x: p.x, y: p.y });
    }
    return pts;
  }

  // Living brush contour: pressure changes along the line and the brush lifts
  // off the paper in a few places, so the line breaks.
  function inkContour(d, o = {}) {
    const w = o.w ?? 1.8, seed = o.seed ?? 1, color = o.color ?? C.ink, n = o.n ?? 90;
    const pts = sampleD(d, n);
    const gaps = o.gaps ?? 3;
    const cuts = [];
    for (let i = 0; i < gaps; i++) {
      const c = 0.08 + 0.84 * hash(i, seed);
      cuts.push([c, c + 0.025 + 0.05 * hash(i + 20, seed)]);
    }
    const inGap = (s) => cuts.some(([a, b]) => s > a && s < b);
    let s = '', run = [];
    const flush = () => {
      if (run.length > 2) {
        const seg = run.map((r) => r.p), ws = run.map((r) => r.w);
        s += `<path d="${taper(seg, (u) => ws[Math.round(u * (ws.length - 1))] * Math.min(1, Math.sin(Math.PI * u) * 3 + 0.15))}" fill="${color}"/>`;
      }
      run = [];
    };
    pts.forEach((p, i) => {
      const u = i / n;
      if (inGap(u)) { flush(); return; }
      run.push({ p, w: w * (0.3 + 0.7 * (0.5 + 0.5 * DH.noise(u * 9, seed))) });
    });
    flush();
    return `<g filter="url(#inkLine)" opacity="${o.op ?? 0.85}">${s}</g>`;
  }

  // Ink and paint splatter around a point.
  function splatter(cx, cy, r, n, seed, color, op = 0.6) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = hash(i, seed) * Math.PI * 2, d = r * Math.sqrt(hash(i + 50, seed));
      const size = 0.6 + 2.8 * Math.pow(hash(i + 99, seed), 3);
      s += `<circle cx="${(cx + Math.cos(a) * d).toFixed(1)}" cy="${(cy + Math.sin(a) * d).toFixed(1)}" r="${size.toFixed(2)}" fill="${color}" opacity="${(op * (0.5 + 0.5 * hash(i + 7, seed))).toFixed(2)}"/>`;
    }
    return s;
  }

  DH.ink = { C, defs, layer, taper, smooth, ridge, landscape, rock, pine, paper, hash, wash, inkLine, sampleD, inkContour, splatter };
})(window);
