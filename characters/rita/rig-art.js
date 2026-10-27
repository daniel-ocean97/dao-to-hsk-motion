// Rig settings for the generated art in characters/rita/art/ (docs/rita-generation.md).
// Coordinates are px of the image (all poses: 2000x1116). Open a scene with ?debug to see
// the regions (red: bent, blue: swapped) and the mesh.
// solid: regions always inside the figure; soft: regions cut by paint density (fine hair).
(function (g) {
  const DIR = 'characters/rita/art/';

  const a = {
    size: [2000, 1116],
    anchor: [980, 1085], // bottom of the hem, between the hidden feet
    images: { base: DIR + 'pose-a.webp' },
    regions: {
      // only parts that hang in the air: bending a part painted over the body drags the body
      // kept clear of the back sleeve, so the sleeve does not move with the hair
      hair: { feather: 22, poly: [[920, 60], [970, 40], [960, 200], [940, 250], [920, 330], [890, 400], [850, 440], [790, 465], [690, 420], [670, 350], [780, 250], [870, 170]] },
      sleeve: { feather: 20, poly: [[860, 445], [925, 450], [935, 545], [870, 548], [848, 500]] },
      // front sleeve: only the loose back corner of the cuff; the hand and the sash stay still
      sleeveFront: { feather: 15, poly: [[975, 470], [1040, 480], [1050, 530], [1040, 570], [980, 572], [968, 530]] },
      sash: { feather: 25, poly: [[910, 520], [940, 560], [880, 640], [800, 700], [720, 760], [680, 790], [620, 720], [640, 650], [760, 620], [860, 560]] },
      hem: { feather: 45, poly: [[900, 700], [910, 800], [810, 900], [780, 1000], [740, 1090], [620, 1050], [625, 940], [730, 840], [840, 720]] },
      chest: { feather: 40, poly: [[830, 0], [1140, 0], [1140, 430], [830, 430]] },
      eyes: { feather: 8, poly: [[1025, 80], [1065, 80], [1065, 108], [1025, 108]] },
      // lit front of the bodice: almost paper-white, the cut-out bit into it
      bodice: { poly: [[1020, 200], [1100, 280], [1105, 400], [1050, 400], [1020, 300]] },
    },
    deformers: [
      { type: 'flow', region: 'hair', root: [990, 80], tip: [680, 400], amp: 0.008, freq: 0.55, lag: 2.2, gust: 0.05, seed: 1 },
      { type: 'flow', region: 'sash', root: [940, 540], tip: [640, 700], amp: 0.008, freq: 0.8, lag: 2.5, gust: 0.04, seed: 2 },
      { type: 'flow', region: 'hem', root: [910, 600], tip: [640, 1000], amp: 0.006, freq: 0.45, lag: 1.8, gust: 0.025, power: 2, seed: 3 },
      { type: 'flow', region: 'sleeve', root: [920, 380], tip: [870, 545], amp: 0.004, freq: 0.7, lag: 1.5, seed: 7 },
      { type: 'flow', region: 'sleeveFront', root: [1040, 330], tip: [985, 565], amp: 0.003, freq: 0.65, lag: 1.4, seed: 8 },
      { type: 'breath', region: 'chest', pivotY: 430, topY: 40, amp: 0.0065, period: 4.2 },
    ],
    swaps: {},
    solid: ['bodice'],
    soft: ['hair'],
  };

  const b = {
    size: [2000, 1116],
    anchor: [970, 1085],
    // pose-b-turn.webp is an edit of pose-b.webp: everything matches except the head, the hair
    // on the shoulders and the sash ends (shifted). Only the head region is taken from it.
    images: { base: DIR + 'pose-b.webp', turn: DIR + 'pose-b-turn.webp' },
    regions: {
      hair: { feather: 22, poly: [[940, 120], [900, 250], [870, 320], [840, 420], [820, 470], [780, 470], [790, 380], [850, 280], [900, 180]] },
      sash: { feather: 25, poly: [[880, 560], [900, 620], [840, 680], [770, 760], [740, 800], [680, 720], [700, 660], [790, 610]] },
      hem: { feather: 45, poly: [[840, 760], [860, 850], [780, 950], [760, 1050], [700, 1060], [695, 980], [760, 860]] },
      sleeveL: { feather: 15, poly: [[825, 520], [880, 530], [890, 600], [835, 600]] },
      sleeveR: { feather: 15, poly: [[1150, 510], [1205, 540], [1200, 600], [1140, 595]] },
      chest: { feather: 40, poly: [[840, 0], [1200, 0], [1200, 440], [840, 440]] },
      // above the sash knot, so the sash always comes from pose-b.webp
      head: { feather: 25, poly: [[880, 20], [1130, 20], [1145, 250], [1130, 425], [890, 425], [860, 300]] },
    },
    deformers: [
      { type: 'flow', region: 'hair', root: [980, 150], tip: [800, 450], amp: 0.007, freq: 0.5, lag: 2.0, seed: 4 },
      { type: 'flow', region: 'sash', root: [940, 500], tip: [690, 700], amp: 0.008, freq: 0.75, lag: 2.5, seed: 5 },
      { type: 'flow', region: 'hem', root: [870, 650], tip: [710, 1020], amp: 0.006, freq: 0.4, lag: 1.8, power: 2, seed: 6 },
      { type: 'flow', region: 'sleeveL', root: [890, 300], tip: [840, 590], amp: 0.004, freq: 0.7, lag: 1.5, seed: 7 },
      { type: 'flow', region: 'sleeveR', root: [1150, 300], tip: [1190, 590], amp: 0.003, freq: 0.62, lag: 1.4, seed: 8 },
      { type: 'breath', region: 'chest', pivotY: 440, topY: 50, amp: 0.0065, period: 4.4, seed: 1 },
    ],
    swaps: { turn: 'head' },
    soft: ['hair'],
  };

  g.DH.ritaArt = { a, b };
})(window);
