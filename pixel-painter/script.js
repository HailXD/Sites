(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const canvas = $('#canvas');
  const wrap = $('#canvasWrap');
  const ctx = canvas.getContext('2d');

  const colorEl = $('#color');
  const widthEl = $('#width');
  const heightEl = $('#height');
  const scaleEl = $('#scale');
  const newBtn = $('#newCanvas');
  const clearBtn = $('#clear');
  const eraserBtn = $('#eraser');
  const dlBtn = $('#download');
  const gridToggle = $('#gridToggle');

  let scale = parseInt(scaleEl.value, 10) || 20; // CSS pixels per canvas pixel
  let drawing = false;
  let erasing = false;

  function setCanvasSize(w, h) {
    w = Math.max(1, Math.min(512, parseInt(w, 10) || 16));
    h = Math.max(1, Math.min(512, parseInt(h, 10) || 16));
    canvas.width = w;
    canvas.height = h;
    // Visual size via CSS scale
    canvas.style.width = (w * scale) + 'px';
    canvas.style.height = (h * scale) + 'px';
    wrap.style.setProperty('--cell', scale + 'px');
  }

  function fillWhite() {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.restore();
  }

  function newCanvas() {
    setCanvasSize(widthEl.value, heightEl.value);
    fillWhite();
  }

  function clearCanvas() { fillWhite(); }

  function setScale(v) {
    scale = Math.max(1, Math.min(40, parseInt(v, 10) || scale));
    // Reapply CSS dimensions
    canvas.style.width = (canvas.width * scale) + 'px';
    canvas.style.height = (canvas.height * scale) + 'px';
    wrap.style.setProperty('--cell', scale + 'px');
  }

  function setGrid(on) {
    wrap.classList.toggle('grid', !!on);
  }

  function getCanvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((evt.clientX - rect.left) / scale);
    const y = Math.floor((evt.clientY - rect.top) / scale);
    return {x, y};
  }

  function paint(x, y) {
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
    ctx.fillStyle = erasing ? '#ffffff' : colorEl.value;
    ctx.fillRect(x, y, 1, 1);
  }

  // Pointer events
  canvas.addEventListener('pointerdown', (e) => { drawing = true; canvas.setPointerCapture(e.pointerId); paint(...Object.values(getCanvasPos(e))); });
  canvas.addEventListener('pointermove', (e) => { if (!drawing) return; const {x,y} = getCanvasPos(e); paint(x,y); });
  canvas.addEventListener('pointerup', () => { drawing = false; });
  canvas.addEventListener('pointercancel', () => { drawing = false; });

  // Controls
  newBtn.addEventListener('click', newCanvas);
  clearBtn.addEventListener('click', clearCanvas);
  eraserBtn.addEventListener('click', () => {
    erasing = !erasing; eraserBtn.setAttribute('aria-pressed', String(erasing));
    eraserBtn.classList.toggle('accent', erasing);
  });
  scaleEl.addEventListener('input', (e) => setScale(e.target.value));
  gridToggle.addEventListener('change', (e) => setGrid(e.target.checked));
  dlBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `pixel-art_${canvas.width}x${canvas.height}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  // Init
  setCanvasSize(widthEl.value, heightEl.value);
  setScale(scale);
  setGrid(true);
  fillWhite();
})();

