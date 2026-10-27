// Place captions: Chinese characters with pinyin underneath (brand rule), one "grammar"
// for the whole video (docs/intro-01-storyboard.md):
//   in   the characters come through one after another like ink soaking into wet paper:
//        a soft bleed first, then the sharp glyph; the pinyin follows;
//   out  the wind carries it off: it stretches, blurs along the way and melts.
// Pinyin is set in Onest, as on the course site: its tone marks are clear at small
// sizes (Cormorant draws the grave and the caron as thin ticks). Fonts are local
// (fonts/), so a frame never depends on the network. Wait for
// DH.caption.ready before the first frame: canvas text drawn before the font has loaded
// silently falls back to another font.
(function (g) {
  const DH = g.DH;
  const { clamp, progress, ease } = DH;

  const HANZI_FONT = 'DH Noto Serif SC', PINYIN_FONT = 'DH Onest';
  const base = new URL('../fonts/', document.currentScript.src);
  const css = document.createElement('style');
  css.textContent = `
    @font-face { font-family: "${HANZI_FONT}"; src: url("${new URL('NotoSerifSC-subset.ttf', base)}"); font-weight: 200 900; }
    @font-face { font-family: "${PINYIN_FONT}"; src: url("${new URL('Onest.ttf', base)}"); font-weight: 100 900; }`;
  document.head.appendChild(css);

  // A rough, slightly bleeding ink edge for the glyphs (seeded, so frames repeat).
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', 0); svg.setAttribute('height', 0);
  svg.style.position = 'absolute';
  svg.innerHTML = `<filter id="dhCaptionEdge" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="2" seed="11" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="1.8"/></filter>`;
  document.body.appendChild(svg);

  const ready = Promise.all([
    document.fonts.load(`500 100px "${HANZI_FONT}"`, '道'),
    document.fonts.load(`500 40px "${PINYIN_FONT}"`, 'dào'),
  ]).then(() => {
    if (!document.fonts.check(`500 100px "${HANZI_FONT}"`, '道')) throw new Error('caption fonts did not load');
  });

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w); c.height = Math.ceil(h);
    return c;
  }

  // Prepare a caption once: every glyph and the pinyin as separate images. The caption is centred on (0, 0) = the middle of
  // the baseline gap between characters and pinyin.
  function make({ hanzi, pinyin, size = 140, ink = '#24170f', ink2 = '#3e3a36', pinyinSize = size * 0.3,
    weight = 500, gap = size * 0.22, edge = true }) {
    const chars = [...hanzi];
    const step = size * 1.08, pad = Math.ceil(size * 0.25);
    const glyph = (ch) => {
      const c = canvas(size + 2 * pad, size * 1.3 + 2 * pad), x = c.getContext('2d');
      if (edge) x.filter = 'url(#dhCaptionEdge)';
      x.font = `${weight} ${size}px "${HANZI_FONT}"`;
      x.fillStyle = ink;
      x.textAlign = 'center';
      x.textBaseline = 'alphabetic';
      x.fillText(ch, c.width / 2, pad + size * 0.98);
      return c;
    };
    const glyphs = chars.map(glyph);
    const gw = glyphs[0].width, gh = glyphs[0].height;
    const width = step * (chars.length - 1) + gw;
    // glyph i: its image's top-left relative to the caption centre; the ideographic box
    // ends about 0.12 em under the baseline, so the ink ends at pad + 1.1 * size
    const slots = chars.map((_, i) => [-width / 2 + i * step, -gap / 2 - pad - size * 1.1]);

    const pf = `500 ${pinyinSize}px "${PINYIN_FONT}"`;
    const meas = canvas(1, 1).getContext('2d');
    meas.font = pf;
    const pw = meas.measureText(pinyin).width + 2 * pad, ph = pinyinSize * 1.5 + pad;
    const py = canvas(pw, ph), px = py.getContext('2d');
    px.font = pf;
    px.fillStyle = ink2;
    px.textAlign = 'center';
    px.textBaseline = 'alphabetic';
    px.fillText(pinyin, pw / 2, pinyinSize * 1.05 + pad / 2);
    // the top of the tone marks is about 0.8 em above the pinyin baseline
    const pySlot = [-pw / 2, gap / 2 - (pinyinSize * 0.25 + pad / 2)];

    // bounds of the caption at rest, and its foot: just under the pinyin descenders
    const box = [Math.min(slots[0][0], pySlot[0]), slots[0][1],
      Math.max(slots.at(-1)[0] + gw, pySlot[0] + pw), pySlot[1] + ph];
    const foot = pySlot[1] + pinyinSize * 1.35 + pad / 2;
    return { chars, glyphs, slots, py, pySlot, size, box, foot };
  }

  // Timing of a caption shown at t0 and blown away from tOut (seconds, scene time).
  // Scratch canvas for the wind: an image squeezed into a narrow strip and stretched
  // back out is blurred along x only, like motion blur.
  const streak = canvas(64, 400), sx2 = streak.getContext('2d');
  const CHAR_GAP = 0.14, CHAR_IN = 0.55, PY_DELAY = 0.25, PY_IN = 0.5, OUT = 0.5;

  // Draw caption cap at (x, y) in the current transform of c at time t.
  // wind: direction the fibres fly, in px at the end of the exit.
  function draw(c, cap, t, { x, y, t0, tOut = Infinity, wind = [520, -60], alpha = 1 }) {
    if (t < t0) return;
    c.save();
    c.translate(x, y);
    if (t < tOut) {
      cap.glyphs.forEach((gc, i) => {
        const k = progress(t, t0 + i * CHAR_GAP, t0 + i * CHAR_GAP + CHAR_IN);
        if (k <= 0) return;
        const [sx, sy] = cap.slots[i], w = gc.width, h = gc.height;
        // the bleed: a wide soft blot that blooms first and soaks away as the glyph sharpens
        // (gone by the end, so the hold and the wind start from the bare glyph)
        const bloom = clamp(k * 2.2) * (1 - ease.out(progress(k, 0.35, 1)));
        c.globalAlpha = alpha * 0.22 * bloom;
        c.filter = `blur(${(cap.size * 0.09).toFixed(1)}px)`;
        c.drawImage(gc, sx - w * 0.03, sy - h * 0.03, w * 1.06, h * 1.06);
        // the glyph comes into focus and settles to its size
        const e = ease.out(k), s = 1.05 - 0.05 * e;
        c.globalAlpha = alpha * clamp(k * 1.6);
        c.filter = e < 0.995 ? `blur(${(6 * (1 - e)).toFixed(2)}px)` : 'none';
        c.drawImage(gc, sx + w * (1 - s) / 2, sy + h * (1 - s) / 2, w * s, h * s);
      });
      const tp = t0 + (cap.chars.length - 1) * CHAR_GAP + PY_DELAY;
      const k = progress(t, tp, tp + PY_IN);
      if (k > 0) {
        const e = ease.out(k);
        c.globalAlpha = alpha * e;
        c.filter = e < 0.995 ? `blur(${(3 * (1 - e)).toFixed(2)}px)` : 'none';
        c.drawImage(cap.py, cap.pySlot[0], cap.pySlot[1] + 10 * (1 - e));
      }
    } else {
      // the wind: each glyph, then the pinyin, flies downwind, stretches, blurs along
      // the way and melts away (the glyph nearest the wind's target leaves first)
      const n = cap.chars.length;
      const items = cap.glyphs.map((gc, i) => [gc, cap.slots[i], (n - 1 - i) * 0.07]);
      items.push([cap.py, cap.pySlot, 0.05]);
      for (const [img, [sx, sy], d] of items) {
        const k = progress(t, tOut + d, tOut + d + OUT - 0.14);
        const e = ease.draw(k), a = alpha * (1 - k) * (1 - 0.4 * k);
        if (a <= 0.003) continue;
        const w = img.width, h = img.height, dx = wind[0] * e, dy = wind[1] * e;
        // squeezed and stretched back: a blur along x that grows as the glyph speeds up
        const sw = Math.max(4, Math.round(w / (1 + 5 * e)));
        if (streak.width < w) streak.width = w;
        if (streak.height < h) streak.height = h;
        sx2.clearRect(0, 0, streak.width, streak.height);
        sx2.drawImage(img, 0, 0, sw, h);
        c.filter = `blur(${(4 * e).toFixed(2)}px)`;
        c.globalAlpha = a;
        c.drawImage(streak, 0, 0, sw, h, sx + dx, sy + dy, w * (1 + 0.6 * e), h * (1 - 0.12 * e));
      }
      c.filter = 'none';
    }
    c.restore();
  }

  // The caption mirrored in water: drawn into a buffer, flipped about the water line
  // (`below` px under its foot) and laid down in thin rows that waver and fade with depth.
  const buf = canvas(16, 16), bx = buf.getContext('2d');
  function reflect(c, cap, t, o, { below = 14, alpha = 0.3, waver = 3, depth = 260 } = {}) {
    const wind = o.wind || [520, -60], m = 30;
    const [x0, y0, x1, y1] = cap.box;
    // room for the wind: the glyphs fly up to wind * (1 + stretch) away
    const ox = m - x0 - Math.min(0, wind[0] * 1.7), oy = m - y0 - Math.min(0, wind[1] * 1.2);
    const w = Math.ceil(x1 - x0 + Math.abs(wind[0]) * 1.7 + 2 * m), h = Math.ceil(y1 - y0 + Math.abs(wind[1]) * 1.2 + 2 * m);
    if (buf.width < w) buf.width = w;
    if (buf.height < h) buf.height = h;
    bx.setTransform(1, 0, 0, 1, 0, 0);
    bx.clearRect(0, 0, buf.width, buf.height);
    draw(bx, cap, t, { ...o, x: ox, y: oy });
    bx.filter = 'none';
    bx.globalAlpha = 1;
    const line = cap.foot + below; // water line, caption coordinates
    c.save();
    c.filter = 'blur(1.5px)';
    for (let yb = 0, row = 3; yb < h; yb += row) {
      const ly = yb - oy; // caption y of this buffer row
      const dist = line - ly; // the row is this far above the water line, its image as far below
      if (dist <= 0) continue;
      const fade = 1 - dist / depth;
      if (fade <= 0) continue;
      const dx = Math.sin(dist * 0.11 + t * 2.4) * (0.5 + waver * dist / depth);
      c.globalAlpha = alpha * fade;
      c.drawImage(buf, 0, yb, w, row, o.x - ox + dx, o.y + line + dist - row, w, row);
    }
    c.restore();
  }

  DH.caption = { ready, make, draw, reflect, CHAR_GAP, CHAR_IN, PY_DELAY, PY_IN, OUT };
})(window);
