// Rig settings for the generated art in characters/rita/art/ (docs/rita-generation.md).
// Coordinates are px of the image (pose A: 2000x1116). Open a scene with ?debug to see
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
      { type: 'breath', region: 'chest', pivotY: 430, topY: 40, amp: 0.0065, period: 4.2 },
    ],
    swaps: {},
    solid: ['bodice'],
    soft: ['hair'],
  };

  g.DH.ritaArt = { a };
})(window);
