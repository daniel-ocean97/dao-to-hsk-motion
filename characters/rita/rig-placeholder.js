// Rig settings for the stand-in images (render/placeholders.py -> out/rita-placeholder/).
// Coordinates are px of a 1024x1536 image; the rig rescales them to the real size.
// When the generated art arrives, copy this file for it and redraw the regions:
// open the scene with ?debug to see the regions (red: bent, blue: swapped) and the mesh.
(function (g) {
  const DIR = 'out/rita-placeholder/';
  const size = [1024, 1536];

  const a = {
    size,
    anchor: [600, 1420], // between the feet
    images: { base: DIR + 'pose-a.png', blink: DIR + 'pose-a-blink.png' },
    regions: {
      // only parts that hang in the air: bending a part painted over the body drags the body
      hair: { feather: 30, poly: [[395, 135], [505, 110], [530, 170], [520, 330], [515, 420], [470, 560], [400, 665], [320, 670], [350, 590], [410, 440], [440, 330], [400, 260]] },
      sash: { feather: 22, poly: [[505, 640], [520, 700], [480, 770], [415, 770], [415, 705], [470, 650]] },
      hem: { feather: 45, poly: [[480, 760], [505, 800], [455, 1050], [420, 1300], [400, 1420], [330, 1420], [345, 1250], [400, 1000]] },
      chest: { feather: 40, poly: [[380, 90], [720, 90], [720, 640], [380, 640]] },
      eyes: { feather: 8, poly: [[595, 195], [665, 195], [665, 235], [595, 235]] },
      // lit front of the skirt: almost paper-white, its outline too faint to stop the cut-out
      skirtFront: { poly: [[590, 700], [655, 700], [665, 1385], [585, 1385]] },
    },
    deformers: [
      { type: 'flow', region: 'hair', root: [535, 170], tip: [335, 655], amp: 0.006, freq: 0.55, lag: 2.2, gust: 0.05, seed: 1 },
      { type: 'flow', region: 'sash', root: [540, 620], tip: [425, 740], amp: 0.005, freq: 0.8, lag: 2.5, gust: 0.03, seed: 2 },
      { type: 'flow', region: 'hem', root: [500, 700], tip: [360, 1400], amp: 0.004, freq: 0.45, lag: 1.8, gust: 0.02, power: 2, seed: 3 },
      { type: 'breath', region: 'chest', pivotY: 640, topY: 110, amp: 0.0025, period: 3.8 },
    ],
    swaps: { blink: 'eyes' },
    solid: ['skirtFront'],
  };

  const b = {
    size,
    anchor: [600, 1420],
    images: { base: DIR + 'pose-b.png', turn: DIR + 'pose-b-turn.png', 'turn-blink': DIR + 'pose-b-turn-blink.png' },
    regions: {
      hair: { feather: 25, poly: [[400, 200], [540, 175], [520, 300], [470, 340], [440, 420], [430, 580], [355, 585], [380, 470], [420, 340]] },
      sash: { feather: 22, poly: [[455, 700], [460, 760], [350, 870], [280, 840], [280, 790], [400, 730]] },
      hem: { feather: 45, poly: [[440, 800], [460, 860], [360, 1150], [300, 1470], [230, 1470], [270, 1200], [380, 900]] },
      chest: { feather: 40, poly: [[380, 80], [800, 80], [800, 620], [380, 620]] },
      head: { feather: 30, poly: [[400, 80], [720, 80], [720, 360], [640, 560], [420, 560], [390, 300]] },
      eyesTurn: { feather: 8, poly: [[520, 160], [565, 160], [565, 200], [520, 200]] },
    },
    deformers: [
      { type: 'flow', region: 'hair', root: [560, 230], tip: [380, 560], amp: 0.005, freq: 0.5, lag: 2.0, gust: 0.04, seed: 4 },
      { type: 'flow', region: 'sash', root: [470, 690], tip: [290, 800], amp: 0.005, freq: 0.75, lag: 2.5, gust: 0.03, seed: 5 },
      { type: 'flow', region: 'hem', root: [460, 700], tip: [250, 1450], amp: 0.004, freq: 0.4, lag: 1.8, gust: 0.02, power: 2, seed: 6 },
      { type: 'breath', region: 'chest', pivotY: 640, topY: 100, amp: 0.0025, period: 4.2, seed: 1 },
    ],
    swaps: { turn: 'head', 'turn-blink': 'eyesTurn' },
  };

  g.DH.ritaRig = { a, b };
})(window);
