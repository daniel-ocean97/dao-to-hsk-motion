// intro-01, scenes 6-7: the return (12.5-15.0 s) and the finale (15.0-20.0 s), one shot
// (docs/intro-01-storyboard.md).
//   0.0-0.5  (under the camera's turn from Shanghai) the lake at dawn, seen wide, in mist
//   0.5-2.5  the mist thins, the rock and Rita in pose B, her back to us; the camera eases in
//            and settles behind her shoulder, where the finale starts
//   the city lights fly home: overlay() draws, over the cut and this scene, warm strokes that
//   tear off the windows of Shanghai, sweep through the turn and weave into Rita's hair
//   (with two wine-red petals); her hair and the sash ends fly up as they arrive
//   2.5-3.7  (15.0-16.2 s) the camera cranes up over her shoulder: she sinks into the lower
//            third, the sky opens; the sun clears the ridge, a path of light on the water;
//            the pine near the lens slides out of the frame
//   3.5      (16.0) 道 comes through like ink, as the place captions, and stays; dào under it
//   4.7      (17.2) "Dao to HSK" settles like ink; the sun beside it is the seal
//   5.0-5.5  (17.5-18.0) she turns her head over her shoulder (pose-b-turn.webp)
//   5.5-7.5  (18.0-20.0) the frame holds: only hair, sash and water move, the wind calms
// SCENES.dawn(opt) resolves to { frame(out, tau), overlay(out, T) }: tau is scene time
// (0 = 12.5 s of the video), T is video time (the strokes cross the cut).
(function (g) {
  g.SCENES = g.SCENES || {};
  g.SCENES.dawn = async function (opt = {}) {
    const { ease, lerp, progress } = DH;
    // Video times: the return starts (start), the crane of the finale (crane), 道 (dao),
    // "Dao to HSK" (title), the head turn (turn), the end. Defaults: the 20 s cut.
    const TM = { start: 12.5, crane: 15.0, dao: 16.0, title: 17.2, turn: 17.5, end: 20, ...opt.times };
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
    // In the finale it cranes up and forward over her shoulder (CAM2), then drifts a little
    // and almost stops by 18 s: the last frame must not swim.
    const CAM0 = { x: 260, y: -30, zoom: 0.98 }, CAM1 = { x: -20, y: 40, zoom: 1.05 }, CAM2 = { x: 10, y: -300, zoom: 1.08 };
    function camera(T) {
      const k = ease.out(progress(T, TM.start + 0.5, TM.crane)), c = ease.draw(progress(T, TM.crane, TM.crane + 1.2));
      const d = ease.out(progress(T, TM.crane + 1.2, TM.crane + 3.0));
      return {
        x: lerp(lerp(CAM0.x, CAM1.x, k), CAM2.x, c) + 12 * d,
        y: lerp(lerp(CAM0.y, CAM1.y, k), CAM2.y, c) - 18 * d,
        zoom: lerp(lerp(CAM0.zoom, CAM1.zoom, k), CAM2.zoom, c) + 0.01 * d,
      };
    }
    const CAM_END = camera(TM.end);
    // the world point at depth p that the final camera shows at frame point (sx, sy)
    function worldAt(sx, sy, p) {
      const z = 1 + (CAM_END.zoom - 1) * p;
      return [960 + (sx - 960) / z + CAM_END.x * p, 540 + (sy - 540) / z + CAM_END.y * p];
    }

    // The sun: behind the ridge during the return, it clears it at 15-16.2 s and keeps
    // rising very slowly. How far below its painted place it is:
    const sunY = (T) => T < TM.crane ? lerp(190, 150, progress(T, TM.start, TM.crane))
      : lerp(150, -40, ease.out(progress(T, TM.crane, TM.crane + 1.2))) - 15 * progress(T, TM.crane + 1.2, TM.end);

    // The wind calms towards the end of the hold.
    const windK = (T) => lerp(1, 0.55, progress(T, TM.dao + 1, TM.end));

    // The lights arrive at her hair about 14.3-14.7 s: a gust lifts hair and sash ends.
    const gust = (T) => ease.out(progress(T, TM.start + 1.7, TM.start + 2.05)) * (1 - progress(T, TM.start + 2.3, TM.start + 3.5));

    function drawRita(ctx, cam, o) {
      const z = cam.zoom, scale = (z * RITA.h) / rig.H;
      const c = rig.render({ ...o, scale });
      const sx = 960 + z * (RITA.x - 960 - cam.x), sy = 540 + z * (RITA.y - 540 - cam.y);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(c, sx - (rig.anchor[0] + rig.pad) * scale, sy - (rig.anchor[1] + rig.pad) * scale);
    }

    // A path of light on the water under the sun: warm streaks that shimmer, brighter as
    // the sun climbs.
    const PATH = (() => { const r = W.rng(501), a = []; for (let i = 0; i < 70; i++) a.push([r(), r(), r(), r()]); return a; })();
    function sunPath(ctx, cam, T) {
      const a = ease.out(progress(T, TM.crane + 0.3, TM.crane + 1.4));
      if (a <= 0) return;
      LAKE.view(ctx, cam, 0.8);
      const hz = LAKE.HORIZON, sx = L.sun.ox + L.sun.canvas.width / 2;
      for (const [u, v, w, ph] of PATH) {
        const y = hz + 6 + Math.pow(u, 1.5) * 300, spread = 30 + (y - hz) * 0.5;
        const x = sx + (v - 0.5) * spread * 2, len = 20 + w * 90 * (0.5 + (y - hz) / 300);
        const flick = 0.5 + 0.5 * Math.sin(T * 3 + ph * 20);
        ctx.fillStyle = W.rgba(u < 0.5 ? '#f6dcc8' : '#e9b9ad', a * 0.5 * flick * (1 - u * 0.6));
        ctx.beginPath(); ctx.ellipse(x, y, len, 1.6 + u * 1.5, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // 道 dào and the name: the caption of the finale, in the sky to the left of the sun.
    await DH.caption.ready;
    const DAO = DH.caption.make({ hanzi: '道', pinyin: 'dào', size: 250 });
    const DAO_AT = worldAt(560, 450, 0.15), NAME_AT = worldAt(560, 655, 0.15);
    function finaleText(ctx, cam, T) {
      if (T < TM.dao - 0.1) return;
      LAKE.view(ctx, cam, 0.15);
      DH.caption.draw(ctx, DAO, T, { x: DAO_AT[0], y: DAO_AT[1], t0: TM.dao });
      // "Dao to HSK" settles like ink: out of a blur, a little from above
      const k = ease.out(progress(T, TM.title, TM.title + 0.55));
      if (k > 0) {
        ctx.filter = k < 0.99 ? `blur(${(5 * (1 - k)).toFixed(2)}px)` : 'none';
        ctx.globalAlpha = k;
        ctx.font = `500 76px "${DH.caption.TITLE_FONT}"`;
        ctx.fillStyle = '#24170f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('Dao to HSK', NAME_AT[0], NAME_AT[1] - 10 * (1 - k));
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    function frame(out, tau) {
      tau = Math.max(0, tau);
      const T = TM.start + tau, cam = camera(T);
      LAKE.draw(bctx, L, cam, T, sunY(T));
      sunPath(bctx, cam, T);
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.drawImage(back, 0, 0);
      finaleText(out, cam, T);
      const gk = gust(T), turn = ease.draw(progress(T, TM.turn, TM.turn + 0.5));
      drawRita(out, cam, { t: T, gust: gk, wind: windK(T) * (1 + 1.1 * gk), swap: { to: 'turn', k: turn } });
      // the pine is near the lens: as the camera cranes up it slides out of the frame
      LAKE.place(out, pine.canvas, pine.ox, pine.oy + 700 * ease.draw(progress(T, TM.crane, TM.crane + 1.0)), cam, 1.7);
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
      { P: [[1180, 520], [760, 420], [260, 360], [420, 180], [900, 260], [1150, 420], [1318, 548]], t0: TM.start - 0.3, dur: 2.35, w: 34, len: 0.3, wave: 10, seed: 41, color: '#a8643a' },
      { P: [[1380, 430], [1000, 300], [520, 260], [360, 520], [760, 640], [1120, 560], [1340, 580]], t0: TM.start - 0.22, dur: 2.3, w: 28, len: 0.28, wave: 12, seed: 42, color: '#b8834a' },
      { P: [[760, 610], [420, 560], [150, 420], [380, 300], [820, 380], [1180, 470], [1306, 590]], t0: TM.start - 0.16, dur: 2.32, w: 30, len: 0.3, wave: 9, seed: 43, color: '#7b1e2b' },
      { P: [[1560, 610], [1200, 700], [700, 760], [520, 600], [880, 480], [1200, 500], [1352, 534]], t0: TM.start - 0.1, dur: 2.28, w: 26, len: 0.27, wave: 11, seed: 44, color: '#c9a46a' },
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
