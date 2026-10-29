// Rita in ink and watercolour. Origin of every pose is between the feet; y grows down.
// About 7 heads tall (head ~92 units). Wind blows from the right, so hair, hem,
// sleeves and belt ends drift to -x. Look: docs/character-rita.md, style: docs/brand.md.
(function (g) {
  const DH = g.DH;
  const { C, taper, smooth, wash, inkLine, inkContour, splatter, hash } = DH.ink;
  const { lerp, clamp, noise, progress } = DH;

  // One hair strand: points from root to tip. wind = { k, gust } strengths.
  function strand(root, len, angle, t, phase, wind, n = 12) {
    const a0 = angle * Math.PI / 180;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1);
      const a = a0 + 0.12 * s;
      let x = root.x + Math.cos(a) * len * s;
      let y = root.y + Math.sin(a) * len * s;
      const k = wind.k + wind.gust * 0.3;
      const flutter = 1 + 0.22 * noise(t * 1.4 + phase * 0.7, phase);
      // the wave travels from root to tip
      const wave = Math.sin(7 * s - 6.5 * t + phase) * len * (0.035 + 0.05 * k) * Math.pow(s, 1.2);
      x += -k * len * Math.pow(s, 1.5) * flutter;
      y += -k * 0.4 * len * Math.pow(s, 2.2) - wind.gust * 0.05 * len * s * s;
      x += -Math.sin(a) * wave;
      y += Math.cos(a) * wave;
      pts.push({ x, y });
    }
    return pts;
  }

  // Closed smooth shape through points.
  function closed(pts) {
    const n = pts.length;
    const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
    const m = mid(pts[n - 1], pts[0]);
    let d = `M ${m.x.toFixed(1)} ${m.y.toFixed(1)}`;
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = mid(pts[i], pts[(i + 1) % n]);
      d += ` Q ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
    }
    return d + ' Z';
  }

  const bez = (p0, p1, p2, u) => ({
    x: (1 - u) ** 2 * p0.x + 2 * (1 - u) * u * p1.x + u * u * p2.x,
    y: (1 - u) ** 2 * p0.y + 2 * (1 - u) * u * p1.y + u * u * p2.y,
  });

  // Hair as locks: each pair of neighbouring strands bounds a translucent ribbon
  // of wash; overlapping ribbons darken like real glazes and their dried rims read
  // as separate locks. A few ink lines run inside the locks; tips split and taper.
  function hair(strands, o) {
    const cut = (pts, keep) => pts.slice(0, Math.max(3, Math.round(pts.length * keep)));
    const first = strands[0], last = strands[strands.length - 1];
    let s = wash(closed(cut(first, 0.8).concat(cut(last, 0.75).slice().reverse())), o.wash, 0.22, 'wcWet');
    let lines = '';
    for (let i = 0; i < strands.length - 1; i++) {
      const A = strands[i], B = strands[i + 1];
      const keepA = 0.7 + 0.3 * hash(i, o.seed), keepB = 0.7 + 0.3 * hash(i + 40, o.seed);
      // ribbon narrows to a point at the tip
      const tipA = cut(A, keepA), tipB = cut(B, keepB);
      const n = Math.min(tipA.length, tipB.length);
      const ribbon = tipA.slice(0, n).concat([{ x: (tipA[n - 1].x + tipB[n - 1].x) / 2, y: (tipA[n - 1].y + tipB[n - 1].y) / 2 }], tipB.slice(0, n - 1).reverse());
      const shade = hash(i + 80, o.seed) > 0.62 ? o.shade : o.wash;
      s += wash(closed(ribbon), shade, 0.28 + 0.3 * hash(i + 120, o.seed));
      if (hash(i + 160, o.seed) > 0.35) {
        const f = 0.3 + 0.4 * hash(i + 200, o.seed);
        const mid = cut(A.map((p, q) => ({ x: lerp(p.x, B[q].x, f), y: lerp(p.y, B[q].y, f) })), 0.5 + 0.5 * hash(i + 240, o.seed));
        const w = 0.7 + 1.8 * hash(i + 280, o.seed);
        lines += `<path d="${taper(mid, (u) => w * Math.pow(1 - u, 0.9) + 0.2)}" fill="${o.ink}" opacity="${(0.55 + 0.4 * hash(i + 320, o.seed)).toFixed(2)}"/>`;
      }
    }
    // the outer edges of the mass get a firmer brush line
    lines += `<path d="${taper(cut(last, 0.75), (u) => 1.6 * Math.pow(1 - u, 0.8) + 0.2)}" fill="${o.ink}" opacity=".7"/>`;
    return s + `<g filter="url(#inkLine)">${lines}</g>`;
  }

  // Loose flyaway hairs: short, thin and curved.
  function flyaways(roots, t, wind, ink, seed) {
    let s = '';
    roots.forEach((r, i) => {
      const pts = strand(r, r.len, r.angle, t, 10 + i * 2.3, { k: wind.k * 1.15 + 0.03, gust: wind.gust * 1.2 }, 10);
      s += `<path d="${smooth(pts)}" stroke="${ink}" stroke-width="${(0.5 + 0.5 * hash(i, seed)).toFixed(2)}" fill="none" opacity=".7"/>`;
    });
    return `<g filter="url(#inkLine)">${s}</g>`;
  }

  // Skirt outline points: front edge pressed by the wind, back edge flared, hem waving.
  function skirtPoints(t, wind, waist, hem) {
    const k = wind.k + wind.gust * 0.35;
    const pts = [];
    const backHem = hem.bx - 160 * k - 14 * Math.sin(t * 2.1) - 8 * noise(t, 3);
    for (let i = 0; i <= 5; i++) {
      const s = i / 5;
      const hip = Math.sin(Math.PI * Math.min(1, s * 2.2)) * (waist.hip ?? 6) * (1 - s);
      pts.push({ x: lerp(waist.fx, hem.fx, Math.pow(s, 0.8)) + hip + Math.sin(t * 2.4 + s * 3) * 2 * s, y: lerp(waist.y, hem.y, s) });
    }
    for (let i = 1; i <= 8; i++) {
      const s = i / 8, x = lerp(hem.fx, backHem, s);
      pts.push({ x, y: hem.y + 5 * Math.sin(x * 0.07 + t * 4.2) - 10 * s * k });
    }
    for (let i = 1; i < 6; i++) {
      const s = 1 - i / 6;
      const belly = Math.sin(Math.PI * s) * (18 + 30 * k) + 6 * Math.sin(t * 3 + s * 4);
      pts.push({ x: lerp(waist.bx, backHem, Math.pow(s, 1.4)) - belly, y: lerp(waist.y, hem.y - 10 * k, s) });
    }
    pts.push({ x: waist.bx, y: waist.y });
    return { pts, backHem, k };
  }

  // Back part of the skirt from fraction f across the hem (0 = front, 1 = back).
  function skirtRegion(pts, waist, hem, backHem, f) {
    const hemPts = pts.slice(6, 14).filter((p, i) => (i + 1) / 8 >= f);
    return [{ x: lerp(hem.fx, backHem, f), y: hem.y }].concat(hemPts, pts.slice(14), [{ x: lerp(waist.fx, waist.bx, f), y: waist.y }]);
  }

  // Linen skirt in watercolour: the lit front stays paper, ochre and a cool
  // shadow are laid only towards the back; living ink contour, dry-brush folds
  // and the vine embroidery near the hem.
  function skirt(t, wind, waist, hem, o) {
    const { pts, backHem, k } = skirtPoints(t, wind, waist, hem);
    const d = closed(pts);
    // paper underpaint: the figure is painted on paper, not on glass
    let s = `<path d="${d}" fill="${C.paper}"/>`;
    if (o.full) s += wash(d, o.base, o.baseOp ?? 0.28, 'wcWet');
    else s += wash(closed(skirtRegion(pts, waist, hem, backHem, 0.3)), o.base, o.baseOp ?? 0.3, 'wcWet');
    s += wash(closed(skirtRegion(pts, waist, hem, backHem, 0.62)), o.shadow, o.shadowOp ?? 0.3);
    s += inkContour(d, { w: 2, color: o.line, seed: o.seed ?? 3, gaps: 4, op: 0.8 });
    for (let j = 1; j <= 3; j++) {
      const f = j / 4, fp = [];
      for (let i = 0; i <= 6; i++) {
        const u = i / 6;
        const top = lerp(waist.fx, waist.bx, f), bot = lerp(hem.fx, backHem, f * 0.9);
        fp.push({ x: lerp(top, bot, Math.pow(u, 1.3)) + Math.sin(t * 2.5 + u * 5 + j) * 3 * u, y: lerp(waist.y + 10, hem.y - 30, u) });
      }
      s += `<path d="${taper(fp, (u) => 0.4 + 2.2 * Math.sin(Math.PI * u) * (0.5 + 0.5 * hash(j, 4)))}" fill="${o.line}" opacity=".35" filter="url(#inkLine)"/>`;
    }
    const vine = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10, x = lerp(hem.fx - 4, backHem + 12, u);
      vine.push({ x, y: hem.y - 18 + 5 * Math.sin(x * 0.07 + t * 4.2) - 10 * u * k + 4 * Math.sin(i * 1.7) });
    }
    let v = `<path d="${smooth(vine)}" stroke="${o.line}" stroke-width="1.2" fill="none"/>`;
    vine.forEach((p, i) => {
      if (i % 2 === 0 || i === vine.length - 1) return;
      const r = i % 4 === 1 ? 35 : -35;
      v += `<ellipse cx="${p.x.toFixed(1)}" cy="${(p.y - 3).toFixed(1)}" rx="4.5" ry="1.9" transform="rotate(${r} ${p.x.toFixed(1)} ${(p.y - 3).toFixed(1)})" fill="${o.line}"/>`;
    });
    s += `<g filter="url(#inkLine)" opacity=".75">${v}</g>`;
    return s;
  }

  // Belt ends: two wine ribbons from the knot.
  function beltEnds(knot, t, wind, len) {
    let s = '';
    [[0, C.wine, 7.5], [1.3, C.wineStrong, 6]].forEach(([ph, col, w], j) => {
      const pts = strand(knot, len * (1 - j * 0.15), 100 + j * 12, t * 1.2, ph + 2, { k: wind.k * 1.5 + 0.1, gust: wind.gust }, 9);
      s += wash(taper(pts, (u) => w * (1 - u * 0.35)), col, 0.85);
    });
    return s;
  }

  // ---------- Pose A: three-quarter view facing right ----------
  function poseA(o) {
    const t = o.t, wind = { k: o.wind ?? 0.2, gust: o.gust ?? 0 };
    const breath = Math.sin(t * 2 * Math.PI / 3.8) * 1.4;
    const lid = o.blink ?? 0;
    const k = wind.k + wind.gust * 0.35;
    let s = '';

    // back arm, mostly hidden behind the body
    s += wash(taper([{ x: -22, y: -526 + breath }, { x: -28, y: -460 }, { x: -31, y: -392 }], (u) => 19 + u * 7), C.indigoSoft, 0.3);

    s += skirt(t, wind, { fx: 18, bx: -21, y: -414, hip: 10 }, { fx: 42, bx: -88, y: -6 },
      { base: C.ochreWash, shadow: C.indigoSoft, line: C.ink2, seed: 3 });

    // upper body leans a touch back from the hips (contrapposto) and breathes
    let up = `<g transform="translate(0 ${breath.toFixed(2)}) rotate(-1.5 0 -414)">`;
    // fitted bodice: shoulder, chest, narrow waist, a slight hollow of the back
    const torso = `M -4 -546 C 6 -544 18 -542 25 -537 C 33 -528 36 -512 35 -498 C 34 -486 30 -478 26 -470
      C 22 -455 19 -436 18 -415 L -21 -415 C -24 -436 -29 -452 -31 -470 C -35 -492 -37 -515 -30 -534 C -22 -543 -12 -547 -4 -546 Z`;
    up += `<path d="${torso}" fill="${C.paper}"/>`;
    up += wash('M -30 -534 C -22 -543 -12 -547 -4 -546 C -2 -510 4 -470 4 -415 L -21 -415 C -24 -436 -29 -452 -31 -470 C -35 -492 -37 -515 -30 -534 Z', C.ochreWash, 0.26, 'wcWet');
    up += wash('M -30 -534 C -26 -540 -18 -545 -12 -546 C -14 -500 -14 -450 -12 -415 L -21 -415 C -24 -436 -29 -452 -31 -470 C -35 -492 -37 -515 -30 -534 Z', C.indigoSoft, 0.34);
    up += wash('M 34 -505 C 30 -490 26 -484 18 -480 C 24 -476 28 -474 30 -476 C 33 -484 35 -494 34 -505 Z', C.ochreWash, 0.35);
    up += inkContour(torso, { w: 1.9, color: C.ink2, seed: 7, gaps: 3, op: 0.8 });
    up += inkLine('M -4 -546 Q 8 -528 23 -539', 1.1, 0.75, C.ink2, '200 0');
    up += `<path d="M -2 -539 Q 8 -522 20 -535" stroke="${C.ink}" stroke-width=".8" fill="none" opacity=".6" filter="url(#inkLine)"/>`;

    // back hair: strands from the back of the skull over the shoulders and back
    const HY = 102;
    const P0 = { x: -14, y: -772 + HY }, P1 = { x: -52, y: -742 + HY }, P2 = { x: -30, y: -672 + HY };
    const strands = [];
    const N = 14;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const r = bez(P0, P1, P2, u);
      const len = lerp(285, 215, u) * (1 + 0.1 * Math.sin(i * 2.3));
      strands.push(strand(r, len, 93 + u * 4 + 3 * Math.sin(i * 1.7), t, i * 0.9 + Math.sin(i) * 2, wind));
    }
    up += hair(strands, { wash: C.sepia, shade: C.indigo, ink: C.sepiaInk, seed: 3 });
    up += flyaways([
      { x: -34, y: -640, len: 60, angle: 125 }, { x: -44, y: -610, len: 75, angle: 115 },
      { x: -22, y: -662, len: 45, angle: 150 },
    ], t, wind, C.sepiaInk, 5);

    // belt at the natural waist
    up += wash('M -22 -424 L 20 -425 L 19 -407 L -22 -406 Z', C.wine, 0.9);
    up += wash('M -22 -414 L 19 -415 L 19 -407 L -22 -406 Z', C.wineStrong, 0.5);
    up += beltEnds({ x: -21, y: -415 }, t, wind, 90);

    // front arm with a bell sleeve; the cuff trails in the wind
    const arm = [{ x: 14, y: -528 }, { x: 20, y: -466 }, { x: 23, y: -408 }, { x: 22 - 10 * k, y: -360 + Math.sin(t * 3) * 2 }];
    const sleeve = taper(arm, (u) => 21 - 6 * Math.sin(Math.PI * u * 0.8) + 16 * u * u);
    up += `<path d="${sleeve}" fill="${C.paper}"/>`;
    up += wash(taper(arm.map((p) => ({ x: p.x - 4, y: p.y })), (u) => 12 + 10 * u * u), C.indigoSoft, 0.3);
    up += inkContour(sleeve, { w: 1.6, color: C.ink2, seed: 12, gaps: 2, op: 0.75 });
    up += `<path d="M ${10 - 10 * k} -370 Q ${22 - 10 * k} -364 ${36 - 10 * k} -372" stroke="${C.ink}" stroke-width="1" fill="none" opacity=".7" filter="url(#inkLine)"/>`;
    const hx = -6 * k;
    up += wash(`M ${20 + hx} -366 C ${18 + hx} -352 ${22 + hx} -338 ${27 + hx} -334 C ${32 + hx} -338 ${33 + hx} -354 ${31 + hx} -366 Z`, C.skinWash, 0.7);

    // neck
    up += `<path d="M -1 -568 L 17 -560 C 15 -552 15 -544 17 -534 L -5 -532 C -3 -546 -3 -556 -1 -568 Z" fill="${C.paper}"/>`;
    up += wash('M -1 -568 L 17 -560 C 15 -552 15 -544 17 -534 L -5 -532 C -3 -546 -3 -556 -1 -568 Z', C.skinWash, 0.55);
    up += wash('M -1 -568 L 8 -564 C 6 -554 5 -544 6 -533 L -5 -532 C -3 -546 -3 -556 -1 -568 Z', C.sienna, 0.25);

    // head tilts up slightly: she looks into the distance
    up += `<g transform="rotate(-3 6 -560) translate(0 ${HY})">`;
    const face = `M 22 -755 C 30 -747 34 -736 34 -725 C 33 -721 35 -716 38 -710 L 45 -699 C 44 -695 40 -693 37 -693
      C 38 -690 39 -688 38 -686 C 37 -684 36 -683 37 -681 C 38 -679 36 -675 33 -671 C 27 -664 16 -662 8 -666
      C 0 -672 -6 -684 -6 -700 L -6 -742 Z`;
    up += `<path d="${face}" fill="${C.paper}"/>` + wash(face, C.skinWash, 0.45);
    up += wash('M 33 -671 C 27 -664 16 -662 8 -666 C 0 -672 -6 -684 -6 -700 L 4 -702 C 6 -688 14 -676 33 -671 Z', C.sienna, 0.22);
    up += wash('M 20 -712 C 26 -716 32 -714 36 -710 L 38 -704 C 30 -700 22 -702 20 -712 Z', C.sienna, 0.12);
    up += inkLine(`M 22 -755 C 30 -747 34 -736 34 -725 C 33 -721 35 -716 38 -710 L 45 -699 C 44 -695 40 -693 37 -693
      C 38 -690 39 -688 38 -686 C 37 -684 36 -683 37 -681 C 38 -679 36 -675 33 -671 C 27 -664 16 -662 8 -666`, 1, 0.7, C.sepiaInk, '40 4 18 8 60 3');
    up += `<ellipse cx="21" cy="-702" rx="5.5" ry="3" fill="${C.wine}" opacity=".16" filter="url(#wc)"/>`;
    for (const [fx, fy] of [[21, -708], [24.5, -706], [27.5, -708.5], [18, -706]]) up += `<circle cx="${fx}" cy="${fy}" r=".7" fill="${C.sienna}" opacity=".55"/>`;
    // eyes: near and far; lids close on a blink
    const open = Math.max(0.08, 1 - lid);
    up += `<g transform="translate(16 -717) scale(1 ${open.toFixed(3)}) translate(-16 717)">
      <circle cx="18" cy="-717.6" r="3" fill="${C.iris}" opacity=".9"/><circle cx="18.3" cy="-717.6" r="1.4" fill="${C.ink}"/></g>`;
    up += `<g filter="url(#inkLine)"><path d="M 8.5 -717.5 Q 16 ${(-723 + 5 * lid).toFixed(2)} 23.5 -718.5 l 2.2 -1.6" stroke="${C.ink}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M 10 -715.6 Q 16 -713.6 22 -715.8" stroke="${C.sepia}" stroke-width=".6" fill="none" opacity="${(0.7 * open).toFixed(2)}"/>
      <path d="M 30 -718.4 Q 33 ${(-721 + 3 * lid).toFixed(2)} 35.4 -719.2" stroke="${C.ink}" stroke-width="1.1" fill="none"/>
      <path d="M 7 -726 Q 15 -731 25 -727.5" stroke="${C.sepiaInk}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M 29 -728 Q 32 -729.6 35 -728.2" stroke="${C.sepiaInk}" stroke-width="1.3" fill="none" stroke-linecap="round"/></g>`;
    up += `<circle cx="33.3" cy="-718.6" r="1.3" fill="${C.iris}" opacity="${(0.9 * open).toFixed(2)}"/>`;
    // nose and a soft half-smile
    up += `<path d="M 37.5 -697 q 2.2 1.3 4.6 0.2" stroke="${C.sienna}" stroke-width="1" fill="none" opacity=".7"/>`;
    up += wash('M 29 -686 Q 34 -687.5 38 -685.5 Q 35 -680.5 31 -682.5 Z', C.wine, 0.3);
    up += `<path d="M 29.2 -685.6 Q 34 -684.2 37.6 -685" stroke="${C.wineStrong}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".8"/>`;
    up += `<path d="M 28.4 -686.6 q 0.9 1.3 2.3 0.8" stroke="${C.wineStrong}" stroke-width=".8" fill="none" opacity=".7"/>`;

    // hair over the skull and ear, centre part, side hair framing the face
    const cap = `M 26 -752 C 22 -772 -2 -781 -22 -772 C -42 -762 -48 -734 -44 -704 C -42 -688 -36 -676 -27 -666
      L -6 -668 C -3 -680 0 -694 2 -708 C 3 -724 8 -738 16 -746 C 19 -749 22 -750 26 -752 Z`;
    // hair over the skull: a wash with a cooler shadow at the back, a lifted
    // highlight along the crown and a few long locks from the part
    up += `<path d="${cap}" fill="${C.paper}"/>` + wash(cap, C.sepia, 0.5);
    up += wash('M -10 -778 C -30 -772 -44 -750 -45 -722 C -45 -700 -40 -684 -30 -668 L -18 -670 C -26 -700 -26 -740 -10 -778 Z', C.indigo, 0.38);
    up += `<path d="M 14 -760 C 2 -770 -14 -768 -24 -754" stroke="${C.paper}" stroke-width="3.5" fill="none" opacity=".55" filter="url(#wc)"/>`;
    let capLines = '';
    [[22, -756, -8, -670, 2.2], [14, -764, -22, -668, 1.6], [4, -770, -34, -676, 1.9], [-6, -775, -42, -700, 1.2], [18, -760, -2, -690, 1]].forEach(([sx, sy, ex, ey, w], i) => {
      const pts = [{ x: sx, y: sy }, { x: lerp(sx, ex, 0.35) - 14, y: lerp(sy, ey, 0.25) }, { x: lerp(sx, ex, 0.7) - 8, y: lerp(sy, ey, 0.65) }, { x: ex, y: ey }];
      capLines += `<path d="${taper(pts, (u) => w * Math.sin(Math.PI * Math.min(1, u * 1.3 + 0.1)) + 0.2)}" fill="${C.sepiaInk}" opacity="${(0.6 + 0.3 * hash(i, 9)).toFixed(2)}"/>`;
    });
    up += `<g filter="url(#inkLine)">${capLines}</g>`;
    up += inkContour('M 26 -752 C 22 -772 -2 -781 -22 -772 C -42 -762 -48 -734 -44 -704 C -42 -688 -36 -676 -27 -666', { w: 2, color: C.sepiaInk, seed: 21, gaps: 1, op: 0.8 });
    // front locks from the temple, blown back; one fine hair crosses the cheek
    for (let i = 0; i < 4; i++) {
      const pts = strand({ x: 3 + i * 2, y: -728 - i * 6 }, 112 - i * 14, 104, t, 4 + i * 1.3, { k: wind.k * 0.8, gust: wind.gust * 0.6 });
      up += `<path d="${taper(pts, (u) => (2.6 - i * 0.4) * Math.pow(1 - u, 0.7) + 0.3)}" fill="${C.sepiaInk}" opacity=".8" filter="url(#inkLine)"/>`;
    }
    up += flyaways([{ x: 18, y: -748, len: 40, angle: 125 }, { x: 10, y: -742, len: 55, angle: 115 }], t, wind, C.sepiaInk, 2);
    up += `</g></g>`;
    s += up;

    // a few loose drops of ink and paint, as on a real sheet
    s += splatter(-70, -470, 60, 10, 4, C.sepiaInk, 0.45) + splatter(-110, -60, 50, 8, 7, C.indigo, 0.35) + splatter(50, -380, 26, 4, 2, C.wine, 0.4);

    const tips = strands.map((p) => ({ x: p[p.length - 1].x, y: p[p.length - 1].y + breath }));
    return { svg: s, tips };
  }

  // ---------- Pose B: from behind, backlit; turn = 0..1 turns the head over the left shoulder ----------
  function poseB(o) {
    const t = o.t, wind = { k: o.wind ?? 0.22, gust: o.gust ?? 0 }, h = clamp(o.turn ?? 0);
    const breath = Math.sin(t * 2 * Math.PI / 3.8) * 1.2;
    const lid = o.blink ?? 0;
    // head turn: the profile slides out (dx), the back of the head shifts right (cap)
    const dx = lerp(22, 0, h), cap = lerp(0, 9, h);
    const fo = progress(h, 0.15, 0.5);
    let s = '';
    s += skirt(t, wind, { fx: 30, bx: -30, y: -306, hip: 9 }, { fx: 58, bx: -96, y: -6 },
      { full: true, base: C.violetGray, baseOp: 0.3, shadow: C.indigo, shadowOp: 0.26, line: C.ink2, seed: 9 });

    let up = `<g transform="translate(0 ${breath.toFixed(2)})">`;
    // back view: shoulders, shoulder blades, narrow waist
    const torso = 'M -30 -306 C -33 -330 -40 -350 -44 -372 C -48 -392 -50 -408 -44 -420 Q 0 -434 44 -420 C 50 -408 48 -392 44 -372 C 40 -350 33 -330 30 -306 Z';
    up += `<path d="${torso}" fill="${C.paper}"/>` + wash(torso, C.violetGray, 0.34, 'wcWet');
    up += wash('M -30 -306 C -33 -330 -40 -350 -44 -372 C -48 -392 -50 -408 -44 -420 Q -24 -428 -8 -430 C -10 -380 -10 -340 -8 -306 Z', C.indigo, 0.24);
    up += inkContour(torso, { w: 1.8, color: C.ink2, seed: 15, gaps: 3, op: 0.75 });
    const armL = taper([{ x: -43, y: -414 }, { x: -52, y: -350 }, { x: -56, y: -272 }], (u) => 15 + u * 6);
    const armR = taper([{ x: 43, y: -414 }, { x: 53, y: -350 }, { x: 58, y: -272 }], (u) => 15 + u * 6);
    up += `<path d="${armL}" fill="${C.paper}"/><path d="${armR}" fill="${C.paper}"/>`;
    up += wash(armL, C.violetGray, 0.45) + wash(armR, C.violetGray, 0.3);
    up += inkContour(armL, { w: 1.4, color: C.ink2, seed: 16, gaps: 2, op: 0.7 }) + inkContour(armR, { w: 1.4, color: C.ink2, seed: 17, gaps: 2, op: 0.7 });
    up += wash('M -64 -270 C -66 -258 -62 -250 -58 -250 C -54 -252 -53 -262 -55 -270 Z', C.sienna, 0.45);
    up += wash('M 56 -270 C 56 -258 60 -250 64 -250 C 67 -254 67 -262 65 -270 Z', C.skinWash, 0.7);
    up += wash('M -32 -316 L 32 -316 L 31 -298 L -31 -298 Z', C.wine, 0.9);
    up += wash('M -10 -452 L 10 -452 L 10 -416 L -10 -416 Z', C.sienna, 0.4);

    // head and hair: drawn in the coordinates of the first draft, lowered by 52 units
    let head = `<g transform="translate(0 52)">`;
    // back of the skull: round, narrowing into the hair at the nape
    const skull = `M ${-28 + cap} -540 C ${-26 + cap} -563 ${26 + cap} -564 ${28 + cap} -540 C ${30 + cap} -522 ${26 + cap} -506 ${20 + cap} -494
      C ${8 + cap} -499 ${-8 + cap} -499 ${-20 + cap} -494 C ${-27 + cap} -506 ${-30 + cap} -522 ${-28 + cap} -540 Z`;
    head += `<path d="${skull}" fill="${C.paper}"/>` + wash(skull, C.sepia, 0.5);
    head += wash(`M ${-28 + cap} -540 C ${-26 + cap} -563 ${-4 + cap} -566 ${-2 + cap} -560 C ${-10 + cap} -540 ${-12 + cap} -515 ${-20 + cap} -494 C ${-27 + cap} -506 ${-30 + cap} -522 ${-28 + cap} -540 Z`, C.indigo, 0.3);
    const strands = [];
    const N = 13;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const root = { x: lerp(-24, 24, u) + cap * (0.5 + u * 0.5), y: -536 + Math.sin(u * Math.PI) * -10 };
      strands.push(strand(root, lerp(190, 180, Math.abs(u - 0.5) * 2), 90 - (u - 0.5) * 8, t, i * 1.1, wind));
    }
    head += hair(strands, { wash: C.sepia, shade: C.indigo, ink: C.sepiaInk, seed: 11 });
    head += flyaways([
      { x: -20 + cap, y: -540, len: 55, angle: 130 }, { x: -24 + cap, y: -520, len: 70, angle: 118 },
      { x: 20 + cap, y: -548, len: 40, angle: 160 },
    ], t, wind, C.sepiaInk, 6);

    // the turned profile, warm in the light of the sun ahead of her
    head += `<g transform="translate(${dx.toFixed(2)} -522)" opacity="${fo.toFixed(3)}">`;
    const prof = `M -6 -36 C -18 -34 -26 -24 -28 -12 C -28 -8 -30 -4 -34 4 L -36 10 L -30 12 C -31 15 -31 17 -30 19
      C -31 21 -30 24 -27 28 C -20 34 -8 34 0 30 L 6 0 Z`;
    head += `<path d="${prof}" fill="#f7e6d6"/>` + wash(prof, C.skinWash, 0.5);
    head += inkLine('M -28 -12 C -28 -8 -30 -4 -34 4 L -36 10 L -30 12 C -31 15 -31 17 -30 19 C -31 21 -30 24 -27 28', 1, 0.75, C.sepiaInk, '200 0');
    head += `<ellipse cx="-19" cy="10" rx="4" ry="2.5" fill="${C.wine}" opacity=".15"/>`;
    const eo = progress(h, 0.55, 0.9);
    head += `<g opacity="${eo.toFixed(3)}" filter="url(#inkLine)">
        <path d="M -27 -7 Q -23 ${(-10 + 3 * lid).toFixed(2)} -18 -7.5" stroke="${C.ink}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
        <path d="M -27 -14.5 Q -22 -17 -16 -15" stroke="${C.sepiaInk}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <circle cx="-25" cy="-5.8" r="${(1.4 * (1 - lid)).toFixed(2)}" fill="${C.iris}"/>
        <path d="M -30 17.5 q 1.5 -0.4 3.2 -1.4" stroke="${C.wineStrong}" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>`;
    head += `</g>`;
    // crown over the forehead and side hair over the cheek: only the front of the profile shows
    // a lock falls from the crown over the ear and tapers below the jaw
    const lock = [{ x: -18 + cap, y: -556 }, { x: -22 + cap, y: -536 }, { x: -20 + cap, y: -510 }, { x: -12 + cap, y: -478 }];
    head += `<g opacity="${fo.toFixed(3)}">` + wash(`M ${-33 + cap} -535 C ${-33 + cap} -560 ${-6 + cap} -569 ${14 + cap} -565 C ${27 + cap} -561 ${32 + cap} -549 ${30 + cap} -536
      C ${18 + cap} -546 ${-14 + cap} -549 ${-33 + cap} -535 Z`, C.sepia, 0.35) +
      wash(taper(lock.map((p) => ({ x: p.x + 7, y: p.y })), (u) => 18 * (1 - u) + 3), C.sepia, 0.55) +
      `<g filter="url(#inkLine)"><path d="${taper(lock, (u) => 2 * (1 - u) + 0.3)}" fill="${C.sepiaInk}" opacity=".85"/>
      <path d="${taper(lock.map((p, i) => ({ x: p.x + 8 + i, y: p.y + 2 })), (u) => 1.3 * (1 - u) + 0.2)}" fill="${C.sepiaInk}" opacity=".6"/></g></g>`;
    head += `</g>`;
    up += head;
    up += beltEnds({ x: -26, y: -307 }, t, wind, 115);
    up += `</g>`;
    s += up;
    s += splatter(-90, -200, 60, 9, 13, C.sepiaInk, 0.4) + splatter(80, -120, 40, 6, 17, C.indigo, 0.3);
    return { svg: `<g filter="url(#rim)">${s}</g>` };
  }

  DH.rita = { poseA, poseB, strand };
})(window);
