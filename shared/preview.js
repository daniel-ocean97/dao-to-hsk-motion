// Preview controls for a scene page: play/pause, a time slider and fit-to-window.
// The renderer opens pages with ?render and calls window.renderAt(t) itself, so the
// controls hide then. ?t= opens the preview at that time.
(function (g) {
  g.DH.preview = function (renderAt, duration) {
    const params = new URLSearchParams(location.search);
    if (params.has('render')) { document.body.classList.add('render'); return; }
    const ui = document.createElement('div');
    ui.id = 'ui';
    ui.innerHTML = `<button id="play">▶</button><input id="scrub" type="range" min="0" max="${duration}" step="0.01" value="0"><span id="time">0.00</span>`;
    document.body.appendChild(ui);
    const css = document.createElement('style');
    css.textContent = `#ui { position: fixed; left: 12px; right: 12px; bottom: 10px; display: flex; gap: 10px; align-items: center;
      font: 14px/1 "Segoe UI", sans-serif; color: #ece6dc; } #ui input { flex: 1; } body.render #ui { display: none; }`;
    document.head.appendChild(css);
    const stage = document.getElementById('stage');
    const fit = () => { stage.style.transform = `scale(${Math.min(innerWidth / 1920, (innerHeight - 40) / 1080)})`; };
    addEventListener('resize', fit); fit();
    const scrub = ui.querySelector('#scrub'), label = ui.querySelector('#time'), btn = ui.querySelector('#play');
    let playing = false, startClock = 0, startT = 0;
    const show = (t) => { renderAt(t); scrub.value = t; label.textContent = t.toFixed(2); };
    scrub.oninput = () => { playing = false; btn.textContent = '▶'; show(+scrub.value); };
    btn.onclick = () => {
      playing = !playing; btn.textContent = playing ? '❚❚' : '▶';
      startClock = performance.now(); startT = +scrub.value;
      if (playing) tick();
    };
    function tick() { if (!playing) return; show((startT + (performance.now() - startClock) / 1000) % duration); requestAnimationFrame(tick); }
    show(+(params.get('t') || 0));
  };
})(window);
