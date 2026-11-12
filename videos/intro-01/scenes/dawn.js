// intro-01, scenes 6-7: the return (12.5-15.0 s) and the finale (15.0-20.0 s), one shot
// (docs/intro-01-storyboard.md).
//   0.0-0.5  (under the camera's turn from Shanghai) the lake at dawn, seen wide, in mist
//   0.5-2.5  the mist thins, the rock and Rita in pose B, her back to us; the camera eases in
//            and settles behind her shoulder, where the finale starts
//   the city lights lift from Shanghai with the petals; each stream breaks off early and
//   follows its own petal across the frame. Delayed, short wind trails fade during the scatter;
//   the petals later begin to gather around Rita's head, leaving the halo open at the end.
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
    // "Dao to HSK" (title), the head turn (turn), and the end.
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

    // The sun: behind the ridge during the return (it is cut along the crest, LAKE), it
    // clears it whole at 15-16.2 s, sitting on the ridge beside the title as a seal, and keeps
    // rising very slowly. How far below its painted place it is:
    const sunY = (T) => T < TM.crane ? lerp(190, 150, progress(T, TM.start, TM.crane))
      : lerp(150, -105, ease.out(progress(T, TM.crane, TM.crane + 1.2))) - 15 * progress(T, TM.crane + 1.2, TM.end);

    // The wind calms towards the end of the hold.
    const windK = (T) => lerp(1, 0.55, progress(T, TM.dao + 1, TM.end));

    // A gust lifts hair and sash ends as the lights reach her near the end of their return.
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
      // "to HSK" settles like ink: out of a blur, a little from above
      const k = ease.out(progress(T, TM.title, TM.title + 0.55));
      if (k > 0) {
        ctx.filter = k < 0.99 ? `blur(${(5 * (1 - k)).toFixed(2)}px)` : 'none';
        ctx.globalAlpha = k;
        ctx.font = `500 76px "${DH.caption.TITLE_FONT}"`;
        ctx.fillStyle = '#24170f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('to HSK', NAME_AT[0], NAME_AT[1] - 10 * (1 - k));
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }
      const levelK = ease.out(progress(T, TM.title + 0.62, TM.title + 1.02));
      if (levelK > 0) {
        ctx.filter = levelK < 0.99 ? `blur(${(5 * (1 - levelK)).toFixed(2)}px)` : 'none';
        ctx.globalAlpha = levelK;
        ctx.font = `500 76px "${DH.caption.TITLE_FONT}"`;
        ctx.fillStyle = '#24170f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('I', NAME_AT[0], NAME_AT[1] + 92 - 10 * (1 - levelK));
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    function frame(out, tau) {
      tau = Math.max(0, tau);
      const T = TM.start + tau, cam = camera(T);
      // far birds come in from the right during the finale and reach the sun by the end
      LAKE.draw(bctx, L, cam, T, sunY(T), {
        wind: windK(T) * (1 + 1.2 * gust(T)),
        birds: [1979 - 116 * (T - TM.crane), 211 + 11.5 * (T - TM.crane)],
      });
      sunPath(bctx, cam, T);
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.drawImage(back, 0, 0);
      finaleText(out, cam, T);
      const gk = gust(T), turn = ease.draw(progress(T, TM.turn, TM.turn + 0.5));
      halo(out, T, 'back');
      drawRita(out, cam, { t: T, gust: gk, wind: windK(T) * (1 + 1.1 * gk), swap: { to: 'turn', k: turn } });
      halo(out, T, 'hair');
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

    // In frame coords, video time. Each stream starts at lit windows in Shanghai and follows
    // its linked petal only until the petal detaches over the city.
    // the first point of each stream: a light of the night place (its passport, locations/)
    const FROM = opt.lights || [[1180, 520], [1380, 430], [760, 610], [1560, 610]];
    const LIGHTS = [
      { P: [FROM[0], [760, 420], [260, 360], [420, 180], [900, 260], [1150, 420], [1318, 548]], t0: TM.start - 0.3, dur: 2.35, w: 34, len: 0.3, wave: 10, seed: 41, color: '#a8643a' },
      { P: [FROM[1], [1000, 300], [520, 260], [360, 520], [760, 640], [1120, 560], [1340, 580]], t0: TM.start - 0.22, dur: 2.3, w: 28, len: 0.28, wave: 12, seed: 42, color: '#b8834a' },
      { P: [FROM[2], [420, 560], [150, 420], [380, 300], [820, 380], [1180, 470], [1306, 590]], t0: TM.start - 0.16, dur: 2.32, w: 30, len: 0.3, wave: 9, seed: 43, color: '#7b1e2b' },
      { P: [FROM[3], [1200, 700], [700, 760], [520, 600], [880, 480], [1200, 500], [1352, 534]], t0: TM.start - 0.1, dur: 2.28, w: 26, len: 0.27, wave: 11, seed: 44, color: '#c9a46a' },
    ];
    // the head eases in and out, so it settles into the hair; then the tail runs in after it
    const headOf = (s, T) => {
      const k = progress(T, s.t0, s.t0 + s.dur);
      return [k, ease.draw(k) * (1 + s.len)];
    };
    // Petals detach from the returning ribbons instead of landing in Rita's hair. Seeded
    // values make their screen-wide scatter look loose while keeping every frame repeatable.
    const PETAL_COUNT = 24, PETAL_ART = paintPetals(5);
    const PETALS = Array.from({ length: PETAL_COUNT }, (_, i) => {
      const r = W.rng(800 + i), ride = i % LIGHTS.length, s = LIGHTS[ride];
      const slot = (i * 7) % PETAL_COUNT;
      return {
        ride, born: s.t0 + 0.04,
        lag: 0.035 + ((i * 5) % 7) * 0.045 + r() * 0.025,
        off: (r() - 0.5) * 44, ph: r() * Math.PI * 2,
        // Detach while the light is still over the city, so no stream is born at the hair.
        releaseK: 0.16,
        sprite: Math.floor(r() * PETAL_ART.length), size: 0.72 + r() * 0.56,
        alpha: 0.72 + r() * 0.25, depth: r(),
        // A wide, open-bottom arc wraps around both sides of the head.
        ring: -220 + slot * (260 / (PETAL_COUNT - 1)) + (r() - 0.5) * 7,
        rv: 0.88 + 0.24 * r(), tilt: (r() - 0.5) * 0.24,
        motionAmp: 44 + r() * 18, motionRate: 0.72 + r() * 0.34,
        motionSpeed: 0.98 + r() * 0.04,
        vortex: false, vortexPhase: r() * Math.PI * 2,
        vortexRadius: 14 + r() * 10, vortexLength: 55 + r() * 35,
        vortexDelay: 0.12, vortexTrailTime: 0.45, vortexSeed: 200 + r() * 900,
      };
    });

    // The halo: around her head, a little above its centre (world, depth 1, where the
    // finale's camera starts: the head at frame (1497, 345)); it moves with the camera and
    // a little to the left as she turns her head.
    const HEAD = [1451, 398], RING = 165;
    function headAt(T) {
      const cam = camera(T), z = cam.zoom, turn = ease.draw(progress(T, TM.turn, TM.turn + 0.5));
      return [960 + z * (HEAD[0] - 18 * turn - 960 - cam.x), 540 + z * (HEAD[1] - 540 - cam.y), z];
    }
    // Position and orientation while a petal rides its light: [x, y, rotation, flip].
    function onPath(q, T) {
      const s = LIGHTS[q.ride], [, head] = headOf(s, T), tau = T - s.t0;
      const u = Math.max(0, Math.min(1, Math.min(1, head) - q.lag));
      const [x, y] = bez(s.P, u);
      const before = bez(s.P, Math.max(0, u - 0.015)), after = bez(s.P, Math.min(1, u + 0.015));
      const a = Math.atan2(after[1] - before[1], after[0] - before[0]);
      return [x + 10 * Math.sin(tau * 2.4 + q.ph), y + q.off + 7 * Math.sin(tau * 2.8 + q.ph),
        a + 0.24 * Math.sin(tau * 2.1 + q.ph), 0.24 + 0.76 * Math.abs(Math.cos(tau * 2.7 + q.ph))];
    }
    // The halo is only a destination: petals wrap around both sides of the head but remain
    // visibly short of a complete ring at the end.
    function onRing(q, T) {
      const [hx, hy, z] = headAt(T), a = (q.ring + 7 * Math.sin(T * 0.45 + q.ph)) * Math.PI / 180;
      const r = RING * 1.12 * q.rv * z * (1 + 0.05 * Math.sin(T * 0.9 + q.ph * 2));
      return [hx + Math.cos(a) * r, hy + Math.sin(a) * r * 0.95, a + q.tilt + 0.25 * Math.sin(T * 0.7 + q.ph), 0.5 + 0.25 * Math.cos(T * 1.1 + q.ph)];
    }

    // One seeded flight model carries each petal from the city to its halo position.
    // The control points describe scatter, loose drifting and the final approach as one
    // continuous curve; there are no title-, beat- or chord-triggered position changes.
    for (const [i, q] of PETALS.entries()) {
      const s = LIGHTS[q.ride], r = W.rng(900 + i);
      q.release = s.t0 + q.releaseK * s.dur;
      q.vortexStart = q.release + q.vortexDelay;
      q.motionEnd = TM.end + 0.42 + r() * 0.24;
      q.vortexEnd = lerp(q.release, q.motionEnd, 0.34) + q.vortexDelay;
      const releasePose = onPath(q, q.release), from = [releasePose[0], releasePose[1]];
      const before = onPath(q, q.release - 0.04);
      const startAngle = releasePose[2];
      const startDir = [Math.cos(startAngle), Math.sin(startAngle)];
      const head = headAt(TM.end), end = onRing(q, TM.end);
      q.cityU = Math.max(0, Math.min(1, headOf(s, q.release)[1]) - q.lag);
      const ringDist = Math.hypot(end[0] - head[0], end[1] - head[1]);
      let target;
      for (let n = 0; n < 30; n++) {
        const candidate = [50 + 1820 * Math.pow(r(), 0.62), 85 + 900 * r()];
        if (Math.hypot(candidate[0] - head[0], candidate[1] - head[1]) > ringDist + 260) {
          target = candidate; break;
        }
        target = candidate;
      }
      q.target = target;
      const roam = [50 + 1820 * Math.pow(r(), 0.62), 85 + 900 * r()];
      const [hx, hy] = headAt(TM.end);
      const staging = [hx + (end[0] - hx) * 1.52, hy + (end[1] - hy) * 1.52];
      const nearRing = [head[0] + (end[0] - head[0]) * 1.12, head[1] + (end[1] - head[1]) * 1.12];
      const releaseLead = [from[0] + startDir[0] * 145 + (r() - 0.5) * 38,
        from[1] + startDir[1] * 145 + (r() - 0.5) * 38];
      const scatterBend = (r() - 0.5) * Math.min(520, ringDist * 1.4);
      q.motionPath = [from, releaseLead, target,
        [lerp(target[0], roam[0], 0.36) + scatterBend * 0.25,
          lerp(target[1], roam[1], 0.36) - scatterBend * 0.18],
        roam, staging, nearRing, [end[0], end[1]]];
      q.startAngle = startAngle;
      q.startFlip = releasePose[3];
      q.scatterDistance = Math.hypot(target[0] - head[0], target[1] - head[1]);
    }
    // Twelve restrained tails (of 24 petals) follow the widest-scattering petals, spread evenly across
    // the four city streams. The first in each group also carries its city's handoff.
    for (let ride = 0; ride < LIGHTS.length; ride++) {
      PETALS.filter((q) => q.ride === ride)
        .sort((a, b) => b.scatterDistance - a.scatterDistance)
        .slice(0, 3)
        .forEach((q) => { q.vortex = true; });
    }
    const VORTEX_PETALS = LIGHTS.map((_, ride) => PETALS
      .filter((q) => q.vortex && q.ride === ride)
      .sort((a, b) => b.scatterDistance - a.scatterDistance)[0]);
    function petalPathProgress(q, T) {
      const raw = progress(T, q.release, q.motionEnd);
      return Math.max(0, Math.min(1, raw * q.motionSpeed +
        Math.sin(Math.PI * raw) * 0.012 * Math.sin(T * q.motionRate + q.ph)));
    }
    function petalAt(q, T) {
      if (T < q.release) return onPath(q, T);
      const speed = petalPathProgress(q, T);
      const [x, y] = bez(q.motionPath, speed);
      const before = bez(q.motionPath, Math.max(0, speed - 0.006));
      const after = bez(q.motionPath, Math.min(1, speed + 0.006));
      const tangent = Math.atan2(after[1] - before[1], after[0] - before[0]);
      const active = progress(T, q.release, q.release + 0.24);
      const amp = q.motionAmp * active * (0.72 + 0.28 * Math.sin(Math.PI * speed));
      const windX = amp * (0.64 * Math.sin(T * q.motionRate + q.ph) +
        0.36 * Math.sin(T * q.motionRate * 1.71 + q.ph * 1.8));
      const windY = amp * (0.62 * Math.sin(T * q.motionRate * 0.83 + q.ph * 1.3) +
        0.38 * Math.sin(T * q.motionRate * 1.43 + q.ph * 2.2));
      const turn = active * (0.34 * Math.sin(T * q.motionRate * 1.4 + q.ph) +
        0.18 * Math.sin(T * q.motionRate * 2.3 + q.ph * 1.7));
      const angleBlend = ease.out(active);
      const angleDelta = Math.atan2(Math.sin(tangent - q.startAngle), Math.cos(tangent - q.startAngle));
      const flip = 0.2 + 0.8 * Math.abs(Math.cos(T * q.motionRate * 2.2 + q.ph));
      return [x + windX, y + windY, q.startAngle + angleDelta * angleBlend + turn,
        lerp(q.startFlip, flip, angleBlend)];
    }
    function drawVortex(out, q, T) {
      if (!q.vortex || T <= q.vortexStart || T >= q.vortexEnd) return;
      const appear = ease.out(progress(T, q.vortexStart, q.vortexStart + 0.28));
      const followedU = petalPathProgress(q, T);
      const scatterU = 2 / (q.motionPath.length - 1);
      const fade = 1 - ease.out(progress(followedU, scatterU * 0.78, scatterU * 1.24));
      const alpha = 0.16 * appear * fade;
      if (alpha <= 0.002) return;
      const [x, y, rot] = petalAt(q, T), c = Math.cos(rot), s = Math.sin(rot);
      const age = T - q.release;
      const swell = 0.88 + 0.12 * Math.sin(age * 2.1 + q.vortexPhase);
      out.save();
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.lineCap = 'round'; out.lineJoin = 'round';
      for (let strand = 0; strand < 2; strand++) {
        out.beginPath();
        for (let j = 0; j <= 42; j++) {
          const u = j / 42, theta = q.vortexPhase + age * 1.8 + u * Math.PI * (2.1 + strand * 0.32);
          const radius = (4 + q.vortexRadius * u) * swell * (strand ? 0.68 : 1);
          const lx = -u * q.vortexLength + Math.cos(theta) * radius;
          const ly = Math.sin(theta) * radius * 0.72;
          const px = x + c * lx - s * ly, py = y + s * lx + c * ly;
          if (j === 0) out.moveTo(px, py); else out.lineTo(px, py);
        }
        out.strokeStyle = W.rgba(LIGHTS[q.ride].color, alpha * (strand ? 0.72 : 0.42));
        out.lineWidth = strand ? 0.75 : 1.25;
        out.shadowColor = W.rgba(LIGHTS[q.ride].color, alpha * 0.45);
        out.shadowBlur = strand ? 5 : 8;
        out.stroke();
      }
      out.restore();
    }
    function drawDispersingVortex(out, s, q, T) {
      if (!q.vortex || T < q.vortexStart) return;
      const scatterU = 2 / (q.motionPath.length - 1);
      const head = petalPathProgress(q, T);
      const appear = ease.out(progress(T, q.vortexStart, q.vortexStart + 0.12));
      const fade = 1 - ease.out(progress(head, scatterU * 0.78, scatterU * 1.24));
      const alpha = 0.58 * appear * fade;
      // The tail reaches back along the petal's own path until it is long enough to be
      // seen: only its wet head is dark, and behind a slow petal that part would stay
      // hidden under the petal itself. 1.2 s back at most.
      let back = q.vortexTrailTime, len = 0, prev = petalAt(q, T);
      for (let dt = 0.05; dt <= 1.2 && T - dt >= q.release; dt += 0.05) {
        const pt = petalAt(q, T - dt);
        len += Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
        prev = pt;
        if (dt >= q.vortexTrailTime && len >= 170) { back = dt; break; }
        back = dt;
      }
      const trailStart = Math.max(q.release, T - back);
      if (alpha > 0.002 && T - trailStart > 0.025) {
        const points = [];
        for (let j = 0; j <= 32; j++) {
          const sampleT = lerp(trailStart, T, j / 32);
          const [x, y] = petalAt(q, sampleT);
          points.push([x, y]);
        }
        const trail = { ...s, w: s.w * 0.64, seed: s.seed + q.vortexSeed };
        // frame coords: the petal drawn before this one leaves its own transform on the
        // context, and the tail would land away from its petal
        out.setTransform(1, 0, 0, 1, 0, 0);
        ribbon(out, points, trail, alpha, T);
      }
      drawVortex(out, q, T);
    }
    // The glow hints at the forming shape but never resolves into a completed halo.
    function glowK(T) {
      const gather = ease.draw(progress(T, TM.dao + 0.2, TM.end + 0.8));
      const flare = Math.exp(-(((T - TM.dao - 0.25) / 0.45) ** 2));
      return 0.18 * gather + 0.06 * flare;
    }
    function drawPetal(out, q, [x, y, rot, flip], a, glow) {
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.translate(x, y);
      out.rotate(rot);
      const sc = q.size * lerp(1.05, 0.88, Math.min(1, glow));
      if (glow > 0) {
        // its own soft golden light behind it
        const gr = out.createRadialGradient(0, 0, 0, 0, 0, 34);
        gr.addColorStop(0, W.rgba('#f7cf92', 0.25 * glow)); gr.addColorStop(1, W.rgba('#f7cf92', 0));
        out.fillStyle = gr;
        out.fillRect(-34, -34, 68, 68);
      }
      out.scale(flip * sc, sc);
      out.globalAlpha = a;
      out.drawImage(PETAL_ART[q.sprite], -36, -36);
      out.globalAlpha = 1;
    }

    // Back-depth petals are drawn before Rita; front-depth petals stay in the overlay.
    function halo(out, T, side) {
      const g = glowK(T);
      const [hx, hy, z] = headAt(T);
      out.setTransform(1, 0, 0, 1, 0, 0);
      if (side === 'back' && g > 0) {
        const R = 190 * z, gr = out.createRadialGradient(hx, hy, 0, hx, hy, R);
        gr.addColorStop(0, W.rgba('#fbe2b8', 0.32 * g)); gr.addColorStop(0.5, W.rgba('#f4cf9c', 0.15 * g)); gr.addColorStop(1, W.rgba('#f3e3e5', 0));
        out.fillStyle = gr;
        out.fillRect(hx - R, hy - R, 2 * R, 2 * R);
      }
      if (side === 'hair') {
        if (g > 0) {
          const R = 120 * z, gr = out.createRadialGradient(hx, hy - 10 * z, 0, hx, hy - 10 * z, R);
          gr.addColorStop(0, W.rgba('#f2c48a', 0.12 * g)); gr.addColorStop(1, W.rgba('#f2c48a', 0));
          out.globalCompositeOperation = 'screen';
          out.fillStyle = gr;
          out.fillRect(hx - R, hy - R, 2 * R, 2 * R);
          out.globalCompositeOperation = 'source-over';
        }
        return;
      }
      for (const q of PETALS) {
        if (T < q.born || (side === 'back') !== (q.depth < 0.28)) continue;
        const fade = ease.out(progress(T, q.born, q.born + 0.2));
        const gather = ease.draw(progress(T, q.release, q.motionEnd));
        if (q.vortex) drawDispersingVortex(out, LIGHTS[q.ride], q, T);
        drawPetal(out, q, petalAt(q, T), q.alpha * fade, gather * 0.35);
      }
      out.setTransform(1, 0, 0, 1, 0, 0);
    }

    function overlay(out, T) {
      out.setTransform(1, 0, 0, 1, 0, 0);
      for (const [ride, s] of LIGHTS.entries()) {
        const [k, head] = headOf(s, T);
        const linked = VORTEX_PETALS[ride];
        if (k > 0 && k < 1) {
          // The city glow remains, but its broad stream now ends at the chosen petal.
          const glow = ease.out(progress(T, s.t0, s.t0 + 0.26)) *
            (1 - ease.out(progress(T, s.t0 + 0.5, s.t0 + 0.82)));
          if (glow > 0) {
            const [gx, gy] = s.P[0], gr = out.createRadialGradient(gx, gy, 0, gx, gy, 46);
            gr.addColorStop(0, W.rgba('#f3d9a8', 0.9 * glow)); gr.addColorStop(1, W.rgba('#f3d9a8', 0));
            out.fillStyle = gr;
            out.fillRect(gx - 46, gy - 46, 92, 92);
          }
        }
        if (linked) {
          if (T >= linked.born && T < linked.release && k > 0 && k < 1) {
            const u1 = Math.max(0, Math.min(1, head) - linked.lag), u0 = Math.max(0, u1 - s.len);
            if (u1 - u0 > 0.004) {
              const ignition = ease.out(progress(T, s.t0, s.t0 + 0.26));
              const a = 0.9 * ignition * (1 - progress(head, 1, 1 + s.len) * 0.5);
              ribbon(out, segment(s, u0, u1, T), s, a, T);
            }
          } else if (T >= linked.release && T < linked.vortexStart) {
            // Hold the city tail at the petal, then let its delayed trail take over.
            const u1 = linked.cityU, u0 = Math.max(0, u1 - s.len);
            const fade = 1 - ease.out(progress(T, linked.release, linked.vortexStart));
            if (u1 - u0 > 0.004 && fade > 0.002) {
            const ignition = ease.out(progress(T, s.t0, s.t0 + 0.26));
            const a = 0.9 * ignition * fade;
              ribbon(out, segment(s, u0, u1, linked.release), s, a, T);
            }
          }
        } else if (k > 0 && k < 1) {
          const u1 = Math.min(1, head), u0 = Math.max(0, head - s.len);
          if (u1 - u0 > 0.004) {
            const ignition = ease.out(progress(T, s.t0, s.t0 + 0.26));
            const a = 0.9 * ignition * (1 - progress(head, 1, 1 + s.len) * 0.5);
            ribbon(out, segment(s, u0, u1, T), s, a, T);
          }
        }
      }
      halo(out, T, 'front');
      out.setTransform(1, 0, 0, 1, 0, 0);
    }

    return { frame, overlay };
  };
})(window);
