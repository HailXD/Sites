// State model
// receipts: [ { date: string, entries: [ { item: string, price: string, iconDataUrl?: string|null } ] } ]

const DEFAULT_ICON = 'Assets/icon.png';

// Format current date like "21 JAN 2016"
function formatCurrentDate() {
  const d = new Date();
  const day = d.getDate(); // no leading zero per example
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function defaultEntry() {
  return { item: '', price: '', iconDataUrl: null };
}

function defaultReceipt() {
  return { date: formatCurrentDate(), entries: [defaultEntry()] };
}

let state = {
  receipts: [
    {
      date: formatCurrentDate(),
      entries: [
        { item: 'Limited Sale: Platinum', price: 'S$ 108.98', iconDataUrl: null }
      ]
    }
  ]
};

// ---- Helpers ----

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ---- YAML support ----
// Load a YAML parser dynamically (js-yaml) and provide serialize/deserialize helpers.
let YAML_LIB = null;

function loadYamlLib() {
  if (window.jsyaml) {
    YAML_LIB = window.jsyaml;
    return Promise.resolve(YAML_LIB);
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js';
    s.async = true;
    s.onload = () => {
      YAML_LIB = window.jsyaml || null;
      if (YAML_LIB) resolve(YAML_LIB); else reject(new Error('YAML lib loaded but not available'));
    };
    s.onerror = () => reject(new Error('Failed to load YAML library'));
    document.head.appendChild(s);
  });
}

function quoteYamlString(s) {
  // JSON string quoting is valid YAML 1.2, so we can reuse it for safety.
  return JSON.stringify(String(s ?? ''));
}

function naiveYamlDump(obj) {
  // Very small, structure-specific dumper for our config shape.
  // Produces YAML like:
  // receipts:\n  //   - date: "..."\n  //     entries:\n  //       - item: "..."\n  //         price: "..."
  const lines = [];
  const indent = (n) => '  '.repeat(n);
  lines.push('receipts:');
  const receipts = Array.isArray(obj?.receipts) ? obj.receipts : [];
  receipts.forEach((r) => {
    lines.push(indent(1) + '- date: ' + quoteYamlString(r?.date ?? ''));
    lines.push(indent(2) + 'entries:');
    const entries = Array.isArray(r?.entries) ? r.entries : [];
    entries.forEach((e) => {
      lines.push(indent(2) + '- item: ' + quoteYamlString(e?.item ?? ''));
      lines.push(indent(3) + 'price: ' + quoteYamlString(e?.price ?? ''));
    });
  });
  return lines.join('\n');
}

function serializeConfigToYAML(cfg) {
  try {
    if (YAML_LIB && typeof YAML_LIB.dump === 'function') {
      // Options: indent 2, avoid anchors, unlimited line width
      return YAML_LIB.dump(cfg, { noRefs: true, indent: 2, lineWidth: -1 });
    }
  } catch {}
  return naiveYamlDump(cfg);
}

function deserializeConfigFromYAML(text) {
  if (YAML_LIB && typeof YAML_LIB.load === 'function') {
    return YAML_LIB.load(text);
  }
  // Fallback: try JSON (valid YAML 1.2) then error
  try {
    return JSON.parse(text);
  } catch (e) {
    const err = new Error('YAML parser unavailable and content is not JSON-compatible YAML.');
    err.cause = e;
    throw err;
  }
}

function parsePriceCents(text) {
  if (!text || typeof text !== 'string') return 0;
  let s = text.trim();
  if (/^S\$/i.test(s)) s = s.slice(2).trim();
  // allow leading currency symbol like $ or £ with optional space
  if (/^[^\d\.-]+\s*/.test(s)) s = s.replace(/^[^\d\.-]+\s*/, '');
  const parts = s.split('.', 2);
  const whole = parts[0].replace(/[^\d-]/g, '') || '0';
  const frac = (parts[1] || '00').padEnd(2, '0').slice(0, 2);
  const n = parseInt(whole, 10);
  const f = parseInt(frac, 10);
  if (isNaN(n) || isNaN(f)) return 0;
  return n * 100 + f;
}

function detectCurrencyPrefix(receipt) {
  for (const e of receipt.entries) {
    const s = (e.price || '').trim();
    if (!s) continue;
    const m = s.match(/^([A-Za-z$€£¥]{1,3})\s*/);
    if (m) return m[1];
  }
  return 'S$';
}

function formatCents(cents, prefix = 'S$') {
  return `${prefix} ${(cents / 100).toFixed(2)}`;
}

function exportConfig() {
  // Strip iconDataUrl when exporting
  return {
    receipts: state.receipts.map(r => ({
      date: r.date,
      entries: r.entries.map(e => ({ item: e.item, price: e.price }))
    }))
  };
}

function setState(newState) {
  state = newState;
  renderAll();
}

// ---- Editor rendering ----

function renderEditor() {
  const root = $('#editor-root');
  root.innerHTML = '';
  state.receipts.forEach((receipt, rIdx) => {
    const tpl = $('#tpl-receipt');
    const node = tpl.content.firstElementChild.cloneNode(true);
    const dateInput = $('.date', node);
    dateInput.value = receipt.date || '';
    dateInput.addEventListener('input', () => {
      state.receipts[rIdx].date = dateInput.value;
      syncConfigText();
      renderPreview();
    });

    // entries
    const entriesWrap = $('.entries', node);
    receipt.entries.forEach((entry, eIdx) => {
      const etpl = $('#tpl-entry');
      const enode = etpl.content.firstElementChild.cloneNode(true);
      const itemEl = $('.item', enode);
      const priceEl = $('.price', enode);
      const iconEl = $('.icon-file', enode);
      const uploadBtn = $('.icon-upload-btn', enode);
      const filenameEl = $('.icon-filename', enode);
      itemEl.value = entry.item || '';
      priceEl.value = entry.price || '';
      // show filename hint if custom icon already present
      if (entry.iconDataUrl) {
        filenameEl && (filenameEl.textContent = 'custom image');
      }
      itemEl.addEventListener('input', () => {
        state.receipts[rIdx].entries[eIdx].item = itemEl.value;
        syncConfigText();
        renderPreview();
      });
      priceEl.addEventListener('input', () => {
        state.receipts[rIdx].entries[eIdx].price = priceEl.value;
        syncConfigText();
        renderPreview();
      });
      uploadBtn && uploadBtn.addEventListener('click', () => iconEl && iconEl.click());
      iconEl.addEventListener('change', () => {
        const file = iconEl.files && iconEl.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          state.receipts[rIdx].entries[eIdx].iconDataUrl = reader.result;
          if (filenameEl) filenameEl.textContent = file.name || 'custom image';
          renderPreview();
        };
        reader.readAsDataURL(file);
      });

      // entry actions
      $('.duplicate-entry', enode).addEventListener('click', () => {
        const clone = deepClone(state.receipts[rIdx].entries[eIdx]);
        state.receipts[rIdx].entries.splice(eIdx + 1, 0, clone);
        renderAll();
      });
      $('.delete-entry', enode).addEventListener('click', () => {
        state.receipts[rIdx].entries.splice(eIdx, 1);
        if (state.receipts[rIdx].entries.length === 0) {
          state.receipts[rIdx].entries.push(defaultEntry());
        }
        renderAll();
      });

      entriesWrap.appendChild(enode);
    });

    // receipt actions
    $('.add-entry', node).addEventListener('click', () => {
      state.receipts[rIdx].entries.push(defaultEntry());
      renderAll();
    });
    $('.duplicate-receipt', node).addEventListener('click', () => {
      const clone = deepClone(state.receipts[rIdx]);
      state.receipts.splice(rIdx + 1, 0, clone);
      renderAll();
    });
    $('.delete-receipt', node).addEventListener('click', () => {
      state.receipts.splice(rIdx, 1);
      if (state.receipts.length === 0) state.receipts.push(defaultReceipt());
      renderAll();
    });

    root.appendChild(node);
  });
}

// ---- Preview rendering (Canvas, matching Python generator) ----

const IMG = {
  header: null,
  entry: null,
  footer: null,
  defaultIcon: null,
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function ensureAssetsLoaded() {
  if (IMG.header && IMG.entry && IMG.footer && IMG.defaultIcon) return;
  const [header, entry, footer, icon] = await Promise.all([
    loadImage('Assets/header_covered.png'),
    loadImage('Assets/entry_covered.png'),
    loadImage('Assets/footer_covered.png'),
    loadImage(DEFAULT_ICON),
  ]);
  IMG.header = header;
  IMG.entry = entry;
  IMG.footer = footer;
  IMG.defaultIcon = icon;
}

async function loadIconForEntry(entry) {
  if (!entry.iconDataUrl) return IMG.defaultIcon;
  try {
    return await loadImage(entry.iconDataUrl);
  } catch {
    return IMG.defaultIcon;
  }
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function drawText(ctx, { text, x, y, font, color }) {
  ctx.save();
  ctx.font = font;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function measureTextWidth(ctx, text, font) {
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w;
}

async function renderEntryCanvas(entry) {
  const base = IMG.entry;
  const left_pad = 60;
  const right_pad = 108;
  const pad_color = '#2c2c2e'; // (44,44,46)

  // Base overlay (base.width + 1)
  const comp = makeCanvas(base.width + 1, base.height);
  const cctx = comp.getContext('2d');
  // Underlay pad_color for the +1 extension
  cctx.fillStyle = pad_color;
  cctx.fillRect(0, 0, comp.width, comp.height);
  cctx.drawImage(base, 0, 0);

  // Text overlay on comp
  const title = entry.item || '';
  const price = entry.price || '';
  drawText(cctx, { text: title, x: 36, y: 0, font: '53px "SF Pro Display"', color: 'rgba(255,255,255,1)' });
  const priceFont = '51px "SF Pro Display"';
  const anchor_right_x = 866;
  const price_w = measureTextWidth(cctx, price, priceFont);
  drawText(cctx, { text: price, x: anchor_right_x - price_w, y: 2, font: priceFont, color: 'rgba(160,160,160,1)' });

  // Optional icon prepend
  const iconImg = await loadIconForEntry(entry);
  const new_h = Math.max(iconImg.height, comp.height);
  const new_w = iconImg.width + comp.width;
  const withIcon = makeCanvas(new_w, new_h);
  const wctx = withIcon.getContext('2d');
  const icon_y = Math.floor((new_h - iconImg.height) / 2);
  const comp_y = Math.floor((new_h - comp.height) / 2);
  wctx.drawImage(iconImg, 0, icon_y);
  wctx.drawImage(comp, iconImg.width, comp_y);

  // Surround left/right padding (adjusted right)
  const adjusted_right_pad = Math.max(0, right_pad - 1);
  const outer_w = withIcon.width + left_pad + adjusted_right_pad;
  const outer_h = withIcon.height;
  const outer = makeCanvas(outer_w, outer_h);
  const octx = outer.getContext('2d');
  octx.fillStyle = pad_color;
  octx.fillRect(0, 0, outer_w, outer_h);
  octx.drawImage(withIcon, left_pad, 0);
  return outer;
}

async function renderReceiptCanvas(receipt) {
  const header = IMG.header;
  const footer = IMG.footer;

  // Build entry canvases
  const entryCanvases = [];
  for (const e of receipt.entries) {
    entryCanvases.push(await renderEntryCanvas(e));
  }
  const spacerH = 48;
  const pad_color = '#2c2c2e';

  // Width: max across header, entries, footer
  const contentWidth = Math.max(
    header.width,
    footer.width,
    ...entryCanvases.map(c => c.width)
  );
  const entriesHeight = entryCanvases.reduce((h, c, i) => h + c.height + (i < entryCanvases.length - 1 ? spacerH : 0), 0);
  const totalContentHeight = header.height + entriesHeight + footer.height;

  // Compose content stack (no outer border here)
  const content = makeCanvas(contentWidth, totalContentHeight);
  const cctx = content.getContext('2d');
  let y = 0;

  // Header + date text
  cctx.drawImage(header, 0, y);
  // In Pillow code y is -9; that clips in canvas. Nudge to 0 to avoid cut.
  drawText(cctx, { text: receipt.date || '', x: 61, y: y + 0, font: '38px "SF Pro Text"', color: 'rgba(153,152,158,1)' });
  y += header.height;

  // Entries with 48px spacers
  for (let i = 0; i < entryCanvases.length; i++) {
    const ec = entryCanvases[i];
    cctx.drawImage(ec, 0, y);
    y += ec.height;
    if (i < entryCanvases.length - 1) {
      cctx.fillStyle = pad_color;
      cctx.fillRect(0, y, ec.width, spacerH);
      y += spacerH;
    }
  }

  // Footer + computed total
  cctx.drawImage(footer, 0, y);
  const prefix = detectCurrencyPrefix(receipt);
  const totalCents = receipt.entries.reduce((sum, e) => sum + parsePriceCents(e.price), 0);
  const totalText = formatCents(totalCents, prefix);
  const footerFont = '51px "SF Pro Display"'; // Medium in Python; close enough visually
  const totalW = measureTextWidth(cctx, totalText, footerFont);
  drawText(cctx, { text: totalText, x: 1064 - totalW, y: y + 80, font: footerFont, color: 'rgba(255,255,255,1)' });

  return content;
}

async function renderPreview() {
  const root = $('#preview-root');
  root.innerHTML = '';
  await ensureAssetsLoaded();
  // Ensure fonts are loaded before drawing
  try {
    await document.fonts.load('53px "SF Pro Display"');
    await document.fonts.load('51px "SF Pro Display"');
    await document.fonts.load('38px "SF Pro Text"');
  } catch {}

  // Render each receipt to its own content canvas
  const receiptCanvases = [];
  for (const receipt of state.receipts) {
    receiptCanvases.push(await renderReceiptCanvas(receipt));
  }
  const interSpacerH = 100; // matches generate_two_receipts spacers
  const interSpacerColor = '#1c1c1e'; // (28,28,30)
  const contentW = Math.max(...receiptCanvases.map(c => c.width));
  const contentH = receiptCanvases.reduce((h, c, i) => h + c.height + (i < receiptCanvases.length - 1 ? interSpacerH : 0), 0);
  const content = makeCanvas(contentW, contentH);
  const cctx = content.getContext('2d');
  let y = 0;
  receiptCanvases.forEach((c, i) => {
    cctx.drawImage(c, 0, y);
    y += c.height;
    if (i < receiptCanvases.length - 1) {
      cctx.fillStyle = interSpacerColor;
      cctx.fillRect(0, y, contentW, interSpacerH);
      y += interSpacerH;
    }
  });

  // Single outer border around the full stack
  const pad = 60;
  const borderColor = '#1c1c1e';
  const finalCanvas = makeCanvas(content.width + pad * 2, content.height + pad * 2);
  const fctx = finalCanvas.getContext('2d');
  fctx.fillStyle = borderColor;
  fctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
  fctx.drawImage(content, pad, pad);

  const container = document.createElement('div');
  container.className = 'receipt-preview';
  container.appendChild(finalCanvas);
  root.appendChild(container);
}

// ---- Config text sync ----

function syncConfigText() {
  const out = exportConfig();
  $('#config-text').value = serializeConfigToYAML(out);
}

function importFromTextarea() {
  const raw = $('#config-text').value.trim();
  if (!raw) return;
  try {
    const parsed = deserializeConfigFromYAML(raw);
    let receipts = [];
    if (Array.isArray(parsed)) {
      receipts = parsed;
    } else if (parsed && Array.isArray(parsed.receipts)) {
      receipts = parsed.receipts;
    } else {
      alert('Invalid YAML: expected an array or an object with a "receipts" array.');
      return;
    }
    // normalize
    const norm = receipts.map(r => ({
      date: (r && typeof r.date === 'string') ? r.date : '',
      entries: Array.isArray(r?.entries) && r.entries.length > 0
        ? r.entries.map(e => ({ item: String(e?.item ?? ''), price: String(e?.price ?? '') }))
        : [defaultEntry()]
    }));
    // Keep any existing in-memory icons if lengths match; otherwise reset icons
    norm.forEach((r, ri) => {
      r.entries.forEach((e, ei) => {
        e.iconDataUrl = state.receipts?.[ri]?.entries?.[ei]?.iconDataUrl || null;
      });
    });
    setState({ receipts: norm });
  } catch (err) {
    console.error(err);
    alert('Failed to parse YAML. Please check the syntax.');
  }
}

function renderAll() {
  renderEditor();
  renderPreview();
  syncConfigText();
}

function setupGlobalActions() {
  $('#add-receipt-btn').addEventListener('click', () => {
    state.receipts.push(defaultReceipt());
    renderAll();
  });
  $('#import-btn').addEventListener('click', importFromTextarea);
  const downloadBtn = $('#download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const canvas = document.querySelector('#preview-root .receipt-preview canvas');
      if (!canvas) {
        alert('No preview available to download yet.');
        return;
      }
      const link = document.createElement('a');
      const x = ((f) => f(f, Math.floor(Date.now() / 10)))(
        (s, n) =>
          n < 26
            ? String.fromCharCode(97 + (n % 26))
            : s(s, Math.floor(n / 26)) + String.fromCharCode(97 + (n % 26))
      );
      link.download = `${x}-receipt.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }
}

// Init
window.addEventListener('DOMContentLoaded', async () => {
  setupGlobalActions();
  try {
    await loadYamlLib();
  } catch (e) {
    console.warn('YAML library could not be loaded; falling back to minimal YAML support.', e);
  }
  renderAll();
});
