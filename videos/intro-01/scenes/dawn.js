// intro-01, scene 6 "the return" (12.5-15.0 s, docs/intro-01-storyboard.md); the finale will
// continue it as one shot.
//   0.0-0.5  (under the camera's turn from Shanghai) the lake at dawn, seen wide, in mist
//   0.5-2.5  the mist thins, the rock and Rita in pose B, her back to us; the camera eases in
//            and settles behind her shoulder, where the finale starts
//   the city lights fly home: overlay() draws, over the cut and this scene, warm strokes that
//   tear off the windows of Shanghai, sweep through the turn and weave into Rita's hair
//   (with two wine-red petals); her hair and the sash ends fly up as they arrive
// SCENES.dawn(opt) resolves to { frame(out, tau), overlay(out, T) }: tau is scene time
// (0 = 12.5 s of the video), T is video time (the strokes cross the cut).
(function (g) {
  g.SCENES = g.SCENES || {};
  g.SCENES.dawn = async function (opt = {}) {
    const { ease, lerp, progress } = DH;
    const W = DH.wc, PAL = LAKE.PALETTES.dawn;
    const { bez, segment, ribbon, paintPetals } = DH.wind;
    const PAPER = '#f5f2ec';
    const back = W.canvas(1920, 1080), bctx = back.getContext('2d');

    // Rita in pose B, as in videos/probe-pose-b; the image's anchor (970, 1085) at RITA.
    const RITA = { x: 1420, y: 1012, h: 700 };
    const L = LAKE.paint(PAL, { x: 1420, w: 560, seed: 4, dawn: true });
    const pine = W.pineBranch({ x: -160, y: -60, scale: 1.2, seed: 5, blur: 4 });
    const rig = await DH.rig.load(DH.ritaArt.b, { base: opt.base ?? '../../', paper: PAPER });

    // ---------- camera ----------

    // Wide while the turn passes, then it eases in and settles behind her shoulder at the
    // finale's first camera (videos/probe-pose-b).
    const CAM0 = { x: 260, y: -30, zoom: 0.98 }, CAM1 = { x: -20, y: 40, zoom: 1.05 };
    function camera(tau) {
      const k = ease.out(progress(tau, 0.5, 2.5));
      return { x: lerp(CAM0.x, CAM1.x, k), y: lerp(CAM0.y, CAM1.y, k), zoom: lerp(CAM0.zoom, CAM1.zoom, k) };
    }

    // The lights arrive at her hair about 14.3-14.7 s: a gust lifts hair and sash ends.
    const gust = (T) => ease.out(progress(T, 14.2, 14.55)) * (1 - 0.6 * progress(T, 14.8, 15.6));

    function drawRita(ctx, cam, o) {
      const z = cam.zoom, scale = (z * RITA.h) / rig.H;
      const c = rig.render({ ...o, scale });
      const sx = 960 + z * (RITA.x - 960 - cam.x), sy = 540 + z * (RITA.y - 540 - cam.y);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(c, sx - (rig.anchor[0] + rig.pad) * scale, sy - (rig.anchor[1] + rig.pad) * scale);
    }

    function frame(out, tau) {
      tau = Math.max(0, tau);
      const T = 12.5 + tau, cam = camera(tau);
      // the sun is still behind the ridge; it rises in the finale
      LAKE.draw(bctx, L, cam, T, lerp(190, 150, progress(T, 12.5, 15)));
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.drawImage(back, 0, 0);
      const gk = gust(T);
      drawRita(out, cam, { t: T, gust: gk, wind: 1 + 1.1 * gk });
      LAKE.place(out, pine.canvas, pine.ox, pine.oy, cam, 1.7);
      // dawn mist: thick while the turn passes, then it thins and the rock comes out
      const m = 0.8 * (1 - ease.out(progress(tau, 0.35, 1.5)));
      if (m > 0) {
        out.setTransform(1, 0, 0, 1, 0, 0);
        const gr = out.createLinearGradient(0, 0, 0, 1080);
        gr.addColorStop(0, W.rgba(PAL.mist, m * 0.8));
        gr.addColorStop(1, W.rgba(PAL.mist, m));
        out.fillStyle = gr;
        out.fillRect(0, 0, 1920, 1080);
      }
      out.setTransform(1, 0, 0, 1, 0, 0);
    }

    // ---------- the lights fly home ----------

    // In frame coords, video time. They start at lit windows of Shanghai (scenes/places.js,
    // ~1.0 s before its end), swing out through the turn, loop and end in the hair: at the
    // finale camera her hair is around (1300-1370, 520-600).
    const LIGHTS = [
      { P: [[1180, 520], [760, 420], [260, 360], [420, 180], [900, 260], [1150, 420], [1318, 548]], t0: 12.2, dur: 2.35, w: 34, len: 0.3, wave: 10, seed: 41, color: '#a8643a' },
      { P: [[1380, 430], [1000, 300], [520, 260], [360, 520], [760, 640], [1120, 560], [1340, 580]], t0: 12.28, dur: 2.3, w: 28, len: 0.28, wave: 12, seed: 42, color: '#b8834a' },
      { P: [[760, 610], [420, 560], [150, 420], [380, 300], [820, 380], [1180, 470], [1306, 590]], t0: 12.34, dur: 2.32, w: 30, len: 0.3, wave: 9, seed: 43, color: '#7b1e2b' },
      { P: [[1560, 610], [1200, 700], [700, 760], [520, 600], [880, 480], [1200, 500], [1352, 534]], t0: 12.4, dur: 2.28, w: 26, len: 0.27, wave: 11, seed: 44, color: '#c9a46a' },
    ];
    // the head eases in and out, so it settles into the hair; then the tail runs in after it
    const headOf = (s, T) => {
      const k = progress(T, s.t0, s.t0 + s.dur);
      return [k, ease.draw(k) * (1 + s.len)];
    };
    const PETAL_ART = paintPetals(4);
    const PETALS = [{ ride: 0, lag: 0.07, off: 26, sprite: 1, ph: 1.2 }, { ride: 2, lag: 0.1, off: -30, sprite: 3, ph: 4.0 }];

    function overlay(out, T) {
      out.setTransform(1, 0, 0, 1, 0, 0);
      for (const s of LIGHTS) {
        const [k, head] = headOf(s, T);
        if (k <= 0 || k >= 1) continue;
        // the light tears off its window: a warm glow that the stroke grows out of
        const glow = 1 - progress(T, s.t0, s.t0 + 0.35);
        if (glow > 0) {
          const [gx, gy] = s.P[0], gr = out.createRadialGradient(gx, gy, 0, gx, gy, 46);
          gr.addColorStop(0, W.rgba('#f3d9a8', 0.9 * glow)); gr.addColorStop(1, W.rgba('#f3d9a8', 0));
          out.fillStyle = gr;
          out.fillRect(gx - 46, gy - 46, 92, 92);
        }
        const u1 = Math.min(1, head), u0 = Math.max(0, head - s.len);
        if (u1 - u0 < 0.004) continue;
        const a = 0.9 * Math.min(1, k * 8) * (1 - progress(head, 1, 1 + s.len) * 0.5);
        ribbon(out, segment(s, u0, u1, T), s, a, T);
      }
      for (const q of PETALS) {
        const s = LIGHTS[q.ride], [k, head] = headOf(s, T);
        if (k <= 0.05 || k >= 1) continue;
        const u = Math.min(1, head) - q.lag;
        if (u <= 0) continue;
        const [x, y] = bez(s.P, u), tau = T - s.t0;
        out.setTransform(1, 0, 0, 1, 0, 0);
        out.translate(x + 14 * Math.sin(tau * 5 + q.ph), y + q.off + 8 * Math.sin(tau * 7 + q.ph));
        out.rotate(q.ph + tau * 2.4);
        out.scale(Math.max(0.15, Math.abs(Math.cos(tau * 5 + q.ph))) * 1.1, 1.1);
        out.globalAlpha = Math.min(1, (k - 0.05) * 8) * (1 - progress(head, 1, 1 + s.len));
        out.drawImage(PETAL_ART[q.sprite], -36, -36);
        out.globalAlpha = 1;
      }
      out.setTransform(1, 0, 0, 1, 0, 0);
    }

    return { frame, overlay };
  };
})(window);
