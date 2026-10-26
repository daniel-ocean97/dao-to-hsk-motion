// Rita, drawn in layers. Origin of every pose is between the feet; y grows down.
// Wind blows from the right, so hair, hem, sleeves and belt ends drift to -x.
// See docs/character-rita.md for the agreed look.
(function (g) {
  const DH = g.DH;
  const { C, taper, smooth } = DH.ink;
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
      const gustK = wind.k + wind.gust * 0.3;
      const flutter = 1 + 0.22 * noise(t * 1.4 + phase * 0.7, phase);
      // the wave travels from root to tip
      const wave = Math.sin(7 * s - 6.5 * t + phase) * len * (0.035 + 0.05 * gustK) * Math.pow(s, 1.2);
      x += -gustK * len * Math.pow(s, 1.5) * flutter;
      y += -gustK * 0.4 * len * Math.pow(s, 2.2) - wind.gust * 0.05 * len * s * s;
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
    let m = mid(pts[n - 1], pts[0]);
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

  // Hair mass: envelope fill plus individual tapered strands with ink edges.
  function hairMass(strands, width) {
    const first = strands[0], last = strands[strands.length - 1];
    let s = `<path d="${closed(first.concat(last.slice().reverse()))}" fill="${C.hair}"/>`;
    strands.forEach((pts, i) => {
      const col = i % 4 === 1 ? C.hairLight : C.hair;
      s += `<path d="${taper(pts, (u) => width * Math.pow(1 - u, 0.55) + 1)}" fill="${col}" opacity="${i % 4 === 1 ? 0.75 : 0.95}"/>`;
    });
    return `<g filter="url(#inkEdge)">${s}</g>`;
  }

  // Skirt: front edge pressed by the wind, back edge flared, hem waving.
  function skirt(t, wind, waist, hem, fill) {
    const k = wind.k + wind.gust * 0.35;
    const pts = [];
    const front = [waist.fx, waist.y], back = [waist.bx, waist.y];
    const hemY = hem.y;
    const backHem = hem.bx - 160 * k - 14 * Math.sin(t * 2.1) - 8 * noise(t, 3);
    // front edge, top to bottom
    for (let i = 0; i <= 4; i++) {
      const s = i / 4;
      pts.push({ x: lerp(front[0], hem.fx, Math.pow(s, 0.8)) + Math.sin(t * 2.4 + s * 3) * 2 * s, y: lerp(front[1], hemY, s) });
    }
    // hem, front to back
    for (let i = 1; i <= 8; i++) {
      const s = i / 8;
      const x = lerp(hem.fx, backHem, s);
      pts.push({ x, y: hemY + 5 * Math.sin(x * 0.07 + t * 4.2) - 10 * s * k });
    }
    // back edge, bottom to top, bellied by the wind
    for (let i = 1; i < 5; i++) {
      const s = 1 - i / 5;
      const belly = Math.sin(Math.PI * s) * (18 + 30 * k) + 6 * Math.sin(t * 3 + s * 4);
      pts.push({ x: lerp(back[0], backHem, Math.pow(s, 1.4)) - belly, y: lerp(back[1], hemY - 10 * k, s) });
    }
    pts.push({ x: back[0], y: back[1] });
    let s = `<path d="${closed(pts)}" fill="${fill}" stroke="${C.ink2}" stroke-width="1.4" stroke-opacity=".75" filter="url(#inkEdge)"/>`;
    // folds
    for (let j = 1; j <= 3; j++) {
      const f = j / 4, fp = [];
      for (let i = 0; i <= 6; i++) {
        const u = i / 6;
        const top = lerp(front[0], back[0], f), bot = lerp(hem.fx, backHem, f * 0.9);
        fp.push({ x: lerp(top, bot, Math.pow(u, 1.3)) + Math.sin(t * 2.5 + u * 5 + j) * 3 * u, y: lerp(waist.y + 8, hemY - 14, u) });
      }
      s += `<path d="${smooth(fp)}" stroke="${C.ink2}" stroke-width="1.1" fill="none" opacity=".35"/>`;
    }
    // vine embroidery along the hem
    const vine = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10, x = lerp(hem.fx - 4, backHem + 10, u);
      vine.push({ x, y: hemY - 18 + 5 * Math.sin(x * 0.07 + t * 4.2) - 10 * u * k + 4 * Math.sin(i * 1.7) });
    }
    s += `<path d="${smooth(vine)}" stroke="${C.ink}" stroke-width="1.3" fill="none" opacity=".8"/>`;
    vine.forEach((p, i) => {
      if (i % 2 === 0 || i === vine.length - 1) return;
      const r = i % 4 === 1 ? 35 : -35;
      s += `<ellipse cx="${p.x.toFixed(1)}" cy="${(p.y - 3).toFixed(1)}" rx="4.5" ry="2" transform="rotate(${r} ${p.x.toFixed(1)} ${(p.y - 3).toFixed(1)})" fill="${C.ink}" opacity=".8"/>`;
    });
    return s;
  }

  // Belt ends: two ribbons from the knot.
  function beltEnds(knot, t, wind, len) {
    let s = '';
    [[0, C.wine, 7], [1.3, C.wineStrong, 5.5]].forEach(([ph, col, w], j) => {
      const pts = strand(knot, len * (1 - j * 0.15), 100 + j * 12, t * 1.2, ph + 2, { k: wind.k * 1.5 + 0.1, gust: wind.gust }, 9);
      s += `<path d="${taper(pts, (u) => w * (1 - u * 0.4))}" fill="${col}" filter="url(#inkEdge)"/>`;
    });
    return s;
  }

  // ---------- Pose A: three-quarter view facing right, full height (~760 units) ----------
  function poseA(o) {
    const t = o.t, wind = { k: o.wind ?? 0.2, gust: o.gust ?? 0 };
    const breath = Math.sin(t * 2 * Math.PI / 3.8) * 1.6;
    const HY = 16; // head sits lower than the first draft: shorter neck
    const lid = o.blink ?? 0;
    let s = '';

    // back arm (mostly hidden)
    const backArm = [{ x: -22, y: -612 + breath }, { x: -27, y: -520 }, { x: -31, y: -430 }];
    s += `<path d="${taper(backArm, (u) => 20 + u * 6)}" fill="${C.linenShade}" filter="url(#inkEdge)"/>`;

    s += skirt(t, wind, { fx: 22, bx: -24, y: -458 }, { fx: 42, bx: -96, y: -8 }, 'url(#dressLit)');

    // upper body moves with the breath
    let up = `<g transform="translate(0 ${breath.toFixed(2)})">`;
    up += `<path d="M -36 -606 C -22 -628 20 -630 34 -612 C 40 -596 38 -566 33 -548 C 30 -520 26 -490 22 -458 L -24 -458 C -32 -510 -42 -570 -36 -606 Z"
      fill="url(#dressLit)" stroke="${C.ink2}" stroke-width="1.3" stroke-opacity=".75" filter="url(#inkEdge)"/>`;
    up += `<path d="M 33 -580 C 28 -570 24 -560 26 -548" stroke="${C.linenShade}" stroke-width="2" fill="none"/>`;
    // neckline with a little vine
    up += `<path d="M -2 -626 Q 10 -606 22 -622" stroke="${C.ink2}" stroke-width="1.4" fill="none"/>`;
    up += `<path d="M 0 -620 Q 10 -603 20 -617" stroke="${C.ink}" stroke-width="1" fill="none" opacity=".7"/>`;

    // back hair: strands from the back of the skull, behind the neck, over the back
    const P0 = { x: -14, y: -772 }, P1 = { x: -52, y: -742 }, P2 = { x: -30, y: -672 };
    const strands = [];
    const N = 18;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const r = bez(P0, P1, P2, u);
      const len = lerp(330, 250, u) * (1 + 0.1 * Math.sin(i * 2.3));
      strands.push(strand({ x: r.x, y: r.y + HY }, len, 93 + u * 4 + 3 * Math.sin(i * 1.7), t, i * 0.9 + Math.sin(i) * 2, wind));
    }
    up += hairMass(strands, 10);

    // belt
    up += `<path d="M -25 -467 L 23 -468 L 23 -451 L -25 -450 Z" fill="${C.wine}"/>`;
    up += beltEnds({ x: -24, y: -459 }, t, wind, 95);

    // front arm with a bell sleeve; the cuff trails in the wind
    const k = wind.k + wind.gust * 0.35;
    const arm = [{ x: 16, y: -612 }, { x: 22, y: -540 }, { x: 24, y: -470 }, { x: 22 - 10 * k, y: -418 + Math.sin(t * 3) * 2 }];
    up += `<path d="${taper(arm, (u) => 22 - 6 * Math.sin(Math.PI * u * 0.8) + 16 * u * u)}" fill="${C.linen}" stroke="${C.ink2}" stroke-width="1.2" stroke-opacity=".7" filter="url(#inkEdge)"/>`;
    up += `<path d="M ${10 - 10 * k} -428 Q ${22 - 10 * k} -422 ${36 - 10 * k} -430" stroke="${C.ink}" stroke-width="1.1" fill="none" opacity=".7"/>`;
    up += `<path d="M ${20 - 6 * k} -424 C ${18 - 6 * k} -410 ${22 - 6 * k} -396 ${27 - 6 * k} -392 C ${32 - 6 * k} -396 ${33 - 6 * k} -412 ${31 - 6 * k} -424 Z" fill="${C.skin}" stroke="${C.skinShade}" stroke-width="1"/>`;

    // neck
    up += `<path d="M -1 -664 L 17 -656 C 15 -646 15 -634 17 -624 L -5 -622 C -3 -638 -3 -650 -1 -664 Z" fill="${C.skin}"/>`;
    up += `<path d="M -1 -664 L 8 -660 C 6 -648 5 -634 6 -623 L -5 -622 C -3 -638 -3 -650 -1 -664 Z" fill="${C.skinShade}" opacity=".6"/>`;
    up += `<g transform="translate(0 ${HY})">`;

    // face, three-quarter right
    up += `<path d="M 22 -755 C 30 -747 34 -736 34 -725 C 33 -721 35 -716 38 -710 L 45 -699 C 44 -695 40 -693 37 -693
      C 38 -690 39 -688 38 -686 C 37 -684 36 -683 37 -681 C 38 -679 36 -675 33 -671 C 27 -664 16 -662 8 -666
      C 0 -672 -6 -684 -6 -700 L -6 -742 Z" fill="${C.skin}"/>`;
    up += `<path d="M 22 -755 C 30 -747 34 -736 34 -725 C 33 -721 35 -716 38 -710 L 45 -699 C 44 -695 40 -693 37 -693
      C 38 -690 39 -688 38 -686 C 37 -684 36 -683 37 -681 C 38 -679 36 -675 33 -671 C 27 -664 16 -662 8 -666"
      stroke="${C.ink2}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".8"/>`;
    up += `<path d="M 33 -671 C 27 -664 16 -662 8 -666 C 0 -672 -6 -684 -6 -700 L 2 -700 C 4 -686 12 -674 33 -671 Z" fill="${C.skinShade}" opacity=".55"/>`;
    up += `<ellipse cx="21" cy="-702" rx="5.5" ry="3" fill="#e9c6c2" opacity=".55" filter="url(#inkEdge)"/>`;
    for (const [fx, fy] of [[21, -708], [24.5, -706], [27.5, -708.5], [18, -706]]) up += `<circle cx="${fx}" cy="${fy}" r=".75" fill="#9a6a50" opacity=".5"/>`;
    // eyes: near and far; lids close on a blink
    const open = 1 - lid;
    up += `<g transform="translate(16 -717) scale(1 ${Math.max(0.08, open).toFixed(3)}) translate(-16 717)">
      <path d="M 9 -717 Q 16 -722.5 23 -718.5 Q 16 -713 9 -717 Z" fill="#f6eee6"/>
      <circle cx="18" cy="-717.6" r="3.2" fill="${C.iris}"/><circle cx="18.3" cy="-717.6" r="1.5" fill="${C.ink}"/>
      <circle cx="17.2" cy="-718.6" r=".6" fill="#fff"/></g>`;
    up += `<path d="M 8.5 -717.5 Q 16 ${(-723 + 5 * lid).toFixed(2)} 23.5 -718.5 l 2 -1.4" stroke="${C.ink}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    up += `<g transform="translate(33 -718) scale(1 ${Math.max(0.08, open).toFixed(3)}) translate(-33 718)">
      <path d="M 30.5 -718 Q 33 -720.5 35 -719 Q 33 -716.5 30.5 -718 Z" fill="#f6eee6"/>
      <circle cx="33.3" cy="-718.3" r="1.5" fill="${C.iris}"/></g>`;
    up += `<path d="M 30 -718.4 Q 33 ${(-721 + 3 * lid).toFixed(2)} 35.4 -719.2" stroke="${C.ink}" stroke-width="1.1" fill="none"/>`;
    up += `<path d="M 7 -726 Q 15 -731 25 -727.5" stroke="#4a3528" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    up += `<path d="M 29 -728 Q 32 -729.6 35 -728.2" stroke="#4a3528" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    // nose, soft half-smile
    up += `<path d="M 37.5 -697 q 2.2 1.3 4.6 0.2" stroke="${C.skinShade}" stroke-width="1.2" fill="none"/>`;
    up += `<path d="M 29.5 -685.6 Q 34 -684 37.6 -685" stroke="${C.lip}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    up += `<path d="M 28.6 -686.6 q 0.9 1.3 2.3 0.8" stroke="${C.lip}" stroke-width="1" fill="none"/>`;
    up += `<path d="M 32 -682.6 Q 35 -681.4 37 -682.4" stroke="#c99a94" stroke-width="1.3" fill="none" opacity=".7"/>`;

    // hair cap: covers the skull and ear, centre part, side hair framing the face
    up += `<path d="M 26 -752 C 22 -772 -2 -781 -22 -772 C -42 -762 -48 -734 -44 -704 C -42 -688 -36 -676 -27 -666
      L -6 -668 C -3 -680 0 -694 2 -708 C 3 -724 8 -738 16 -746 C 19 -749 22 -750 26 -752 Z" fill="${C.hair}" filter="url(#inkEdge)"/>`;
    up += `<path d="M 26 -752 C 14 -747 6 -736 3 -716 C 1 -700 -2 -684 -6 -668" stroke="${C.hairLight}" stroke-width="1.3" fill="none" opacity=".7"/>`;
    up += `<path d="M 22 -755 C 14 -768 2 -774 -8 -775" stroke="${C.hairLight}" stroke-width="1.6" fill="none" opacity=".9"/>`;
    up += `<path d="M -30 -760 C -40 -740 -40 -714 -34 -694" stroke="${C.hairLight}" stroke-width="2.2" fill="none" opacity=".55"/>`;
    // front lock from the temple, blown back over the shoulder
    const lock = [];
    for (let i = 0; i < 3; i++) lock.push(strand({ x: 3 + i * 2, y: -728 - i * 7 }, 110 - i * 16, 104, t, 4 + i * 1.3, { k: wind.k * 0.8, gust: wind.gust * 0.6 }));
    lock.forEach((pts) => { up += `<path d="${taper(pts, (u) => 8 * Math.pow(1 - u, 0.7) + 0.8)}" fill="${C.hair}" filter="url(#inkEdge)"/>`; });
    up += `</g></g>`;
    s += up;

    const tips = strands.map((p) => ({ x: p[p.length - 1].x, y: p[p.length - 1].y + breath }));
    return { svg: s, tips };
  }

  // ---------- Pose B: from behind, backlit; turn = 0..1 turns the head over the left shoulder ----------
  function poseB(o) {
    const t = o.t, wind = { k: o.wind ?? 0.24, gust: o.gust ?? 0 }, h = clamp(o.turn ?? 0);
    const breath = Math.sin(t * 2 * Math.PI / 3.8) * 1.2;
    const lid = o.blink ?? 0;
    // head turn: the profile slides out (dx), the back of the head shifts right (cap)
    const dx = lerp(22, 0, h), cap = lerp(0, 9, h);
    const fo = progress(h, 0.15, 0.5);
    let s = '';
    s += skirt(t, wind, { fx: 36, bx: -36, y: -330 }, { fx: 62, bx: -100, y: -6 }, 'url(#dressBacklit)');

    let up = `<g transform="translate(0 ${breath.toFixed(2)})">`;
    up += `<path d="M -36 -330 C -42 -380 -52 -430 -48 -458 Q 0 -472 48 -458 C 52 -430 42 -380 36 -330 Z" fill="#978d82" filter="url(#inkEdge)"/>`;
    up += `<path d="${taper([{ x: -47, y: -452 }, { x: -56, y: -380 }, { x: -60, y: -296 }], (u) => 17 + u * 5)}" fill="#91877b" filter="url(#inkEdge)"/>`;
    up += `<path d="${taper([{ x: 47, y: -452 }, { x: 57, y: -380 }, { x: 62, y: -296 }], (u) => 17 + u * 5)}" fill="#a99e92" filter="url(#inkEdge)"/>`;
    up += `<ellipse cx="-60" cy="-284" rx="7" ry="10" fill="#c9ab98"/><ellipse cx="62" cy="-284" rx="7" ry="10" fill="#dcbca8"/>`;
    up += `<path d="M -39 -341 L 39 -341 L 39 -324 L -39 -324 Z" fill="${C.wine}"/>`;
    up += `<rect x="-11" y="-494" width="22" height="42" fill="#c9ab98"/>`;

    // hair cap and the long back hair
    up += `<path d="M ${-28 + cap} -540 C ${-25 + cap} -562 ${24 + cap} -563 ${28 + cap} -540 C ${32 + cap} -520 ${30 + cap} -500 ${24 + cap} -486
      L ${-22 + cap} -486 C ${-30 + cap * 0.5} -500 ${-31 + cap * 0.5} -520 ${-28 + cap} -540 Z" fill="${C.hair}" filter="url(#inkEdge)"/>`;
    const strands = [];
    const N = 16;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const root = { x: lerp(-24, 24, u) + cap * (0.5 + u * 0.5), y: -536 + Math.sin(u * Math.PI) * -10 };
      strands.push(strand(root, lerp(215, 205, Math.abs(u - 0.5) * 2), 90 - (u - 0.5) * 8, t, i * 1.1, wind));
    }
    up += hairMass(strands, 9);
    // profile slides out from behind the head as it turns
    up += `<g transform="translate(${dx.toFixed(2)} -522)" opacity="${fo.toFixed(3)}">
      <path d="M -6 -36 C -18 -34 -26 -24 -28 -12 C -28 -8 -30 -4 -34 4 L -36 10 L -30 12 C -31 15 -31 17 -30 19
        C -31 21 -30 24 -27 28 C -20 34 -8 34 0 30 L 6 0 Z" fill="#f2d9c4"/>
      <path d="M -28 -12 C -28 -8 -30 -4 -34 4 L -36 10 L -30 12 C -31 15 -31 17 -30 19 C -31 21 -30 24 -27 28"
        stroke="#fbe9d6" stroke-width="2" fill="none" opacity=".9"/>
      <ellipse cx="-19" cy="10" rx="4" ry="2.5" fill="#e9c6c2" opacity=".6"/>`;
    const eo = progress(h, 0.55, 0.9);
    up += `<g opacity="${eo.toFixed(3)}">
        <path d="M -27 -7 Q -23 ${(-10 + 3 * lid).toFixed(2)} -18 -7.5" stroke="${C.ink}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
        <path d="M -27 -14.5 Q -22 -17 -16 -15" stroke="#4a3528" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <circle cx="-25" cy="-5.8" r="${(1.5 * (1 - lid)).toFixed(2)}" fill="${C.iris}"/>
        <path d="M -30 17.5 q 1.5 -0.4 3.2 -1.4" stroke="${C.lip}" stroke-width="1.3" fill="none" stroke-linecap="round"/></g>`;
    up += `</g>`;

    // crown over the forehead, so the turned profile keeps a hairline
    up += `<path d="M ${-33 + cap} -535 C ${-33 + cap} -560 ${-6 + cap} -569 ${14 + cap} -565 C ${27 + cap} -561 ${32 + cap} -549 ${30 + cap} -536
      C ${18 + cap} -546 ${-14 + cap} -549 ${-33 + cap} -535 Z" fill="${C.hair}" opacity="${fo.toFixed(3)}" filter="url(#inkEdge)"/>`;
    // side hair over the ear and cheek: only the front of the profile shows
    up += `<path d="M ${-13 + cap} -557 C ${-22 + cap} -540 ${-21 + cap} -506 ${-13 + cap} -480 L ${6 + cap} -482
      C ${4 + cap} -510 ${2 + cap} -540 ${-1 + cap} -559 Z" fill="${C.hair}" opacity="${fo.toFixed(3)}" filter="url(#inkEdge)"/>`;
    up += `<path d="M ${-14 + cap} -556 C ${-2 + cap} -562 ${12 + cap} -560 ${22 + cap} -548" stroke="#f3d3b6" stroke-width="2" fill="none" opacity=".8"/>`;
    up += beltEnds({ x: -30, y: -333 }, t, wind, 120);
    up += `</g>`;
    s += up;
    return { svg: `<g filter="url(#rim)">${s}</g>` };
  }

  DH.rita = { poseA, poseB, strand };
})(window);
