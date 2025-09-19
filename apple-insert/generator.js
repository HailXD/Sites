function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeId(str) {
  return String(str).replace(/[^A-Za-z0-9]+/g, '');
}

function formatCurrency(amount, currency) {
  const fixed = (isFinite(amount) ? Number(amount) : 0).toFixed(2);
  return `${currency}&nbsp;${fixed}`;
}

function formatDisplayDate(isoDate) {
  try {
    const d = isoDate ? new Date(isoDate) : new Date();
    const parts = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    // Ensure month is three-letter with capitalized first letter (e.g., 9 Jun 2017)
    return parts.replace(/\./g, '');
  } catch {
    return isoDate || '';
  }
}

function getState() {
  const publisher = $('#publisher').value.trim();
  const currency = $('#currency').value.trim() || 'S$';
  const dateIso = $('#date').value; // yyyy-mm-dd
  const dateDisplay = formatDisplayDate(dateIso);

  const entries = $all('#entries .entry').map((row) => {
    const image = row.querySelector('[data-field="image"]').value.trim();
    const purchaseLabel = row.querySelector('[data-field="purchaseLabel"]').value.trim();
    const gameName = row.querySelector('[data-field="gameName"]').value.trim();
    const priceRaw = row.querySelector('[data-field="price"]').value;
    const price = parseFloat(priceRaw || '0');
    return { image, purchaseLabel, gameName, price };
  });

  const total = entries.reduce((sum, e) => sum + (isFinite(e.price) ? e.price : 0), 0);

  return { publisher, currency, dateDisplay, entries, total };
}

// Export/import helpers
function getConfig() {
  return {
    publisher: $('#publisher').value.trim(),
    currency: $('#currency').value.trim() || 'S$',
    date: $('#date').value, // ISO yyyy-mm-dd
    entries: $all('#entries .entry').map((row) => ({
      image: row.querySelector('[data-field="image"]').value.trim(),
      purchaseLabel: row.querySelector('[data-field="purchaseLabel"]').value.trim(),
      gameName: row.querySelector('[data-field="gameName"]').value.trim(),
      price: parseFloat(row.querySelector('[data-field="price"]').value || '0')
    }))
  };
}

function clearEntries() {
  const container = $('#entries');
  while (container.firstChild) container.removeChild(container.firstChild);
}

function applyConfig(cfg = {}) {
  try {
    if (typeof cfg !== 'object' || !cfg) return;
    if (typeof cfg.publisher === 'string') $('#publisher').value = cfg.publisher;
    if (typeof cfg.currency === 'string') $('#currency').value = cfg.currency;
    if (typeof cfg.date === 'string') $('#date').value = cfg.date;

    clearEntries();
    const list = Array.isArray(cfg.entries) && cfg.entries.length ? cfg.entries : [{}];
    list.forEach((e, idx) => {
      addEntry({
        image: e && e.image,
        purchaseLabel: e && e.purchaseLabel,
        gameName: e && e.gameName,
        price: e && isFinite(e.price) ? Number(e.price) : (idx === 0 ? 2.98 : 0)
      });
    });
    render();
  } catch (e) {
    console.error('Failed to apply config:', e);
  }
}

function importConfigFromTextarea() {
  const ta = document.getElementById('config-text');
  if (!ta) return;
  const json = ta.value.trim();
  if (!json) return;
  try {
    const cfg = JSON.parse(json);
    applyConfig(cfg);
  } catch (e) {
    alert('Invalid JSON in textarea.');
  }
}

function buildPurchaseHTML(state) {
  const pub = escapeHtml(state.publisher || '');
  const pubId = sanitizeId(state.publisher || '');
  const date = escapeHtml(state.dateDisplay || '');
  const totalStr = formatCurrency(state.total, escapeHtml(state.currency || 'S$'));

  const billedToHtml = `
    <div class="purchaser-info">
      <div class="billed-to" data-auto-test-id="RAP2.PurchaseList.PurchaseDetails.Label.BilledTo">Billed to</div>
      <div data-auto-test-id="RAP2.PurchaseList.PurchaseDetails.Label.PaymentMethod">Store Credit</div>
      <div data-auto-test-id="RAP2.PurchaseList.PurchaseDetails.Display.Name">Name</div>
      <div data-auto-test-id="RAP2.PurchaseList.PurchaseDetails.Display.Street">Street</div>
      <div data-auto-test-id="RAP2.PurchaseList.PurchaseDetails.Display.CityStateZip">Zip</div>
      <div data-auto-test-id="RAP2.PurchaseList.PurchaseDetails.Display.Country">SGP</div>
    </div>`;

  const orderInfoHtml = `
    <div class="order-info-headers">
      <div>
        <span data-auto-test-id="RAP2.PurchaseList.PurchaseDetails.Label.OrderID">Order ID</span>
        <span class="order-info-data" data-auto-test-id="RAP2.PurchaseList.PurchaseDetails.Display.OrderID">${pub}</span>
      </div>
      <div>
        <span data-auto-test-id="RAP2.PurchaseList.PurchaseDetails.Label.DocumentNumber">Document no.</span>
        <span class="order-info-data" data-auto-test-id="RAP2.PurchaseList.PurchaseDetails.Display.DocumentNumber">174164685133</span>
      </div>
      <div>
        <span data-auto-test-id="RAP2.PurchaseList.PurchaseDetails.Label.Total">Total </span>
        <span class="order-info-data order-info-price" data-auto-test-id="RAP2.PurchaseList.PurchaseDetails.Display.Total" dir="auto">${totalStr}</span>
      </div>
      <div><button class="link-like" data-auto-test-id="RAP2.PurchaseList.PurchaseDetails.Button.ViewReceipt">View Invoice</button></div>
    </div>`;

  const itemsHtml = state.entries.map((e, idx) => {
    const idNum = 30031179730000 + idx; // simple unique-ish id per item
    const image = escapeHtml(e.image || '');
    const purchaseLabel = escapeHtml(e.purchaseLabel || '');
    const gameName = escapeHtml(e.gameName || '');
    const priceStr = formatCurrency(e.price || 0, escapeHtml(state.currency || 'S$'));
    const plId = sanitizeId(e.purchaseLabel || '');

    return `
      <li class="pli">
        <label for="${idNum}">
          <div class="pli-artwork" aria-hidden="true">
            <img src="${image}" alt="${purchaseLabel}">
          </div>
        </label>
        <div class="pli-data-fields">
          <div class="pli-title-and-publisher has-publisher">
            <div>
              <label for="${idNum}" class="pli-title" dir="auto" data-auto-test-id="RAP2.PurchaseList.PLIDetails.Display.Title.${pubId}.${plId}">
                <div aria-label="${purchaseLabel}">${purchaseLabel}</div>
              </label>
            </div>
            <div class="pli-publisher has-publisher" dir="auto" data-auto-test-id="RAP2.PurchaseList.PLIDetails.Display.Publisher.${pubId}.${plId}">${gameName}</div>
          </div>
        </div>
        <div class="pli-price" dir="auto">
          <span data-auto-test-id="RAP2.PurchaseList.PLIDetails.Display.Price.${pubId}.${plId}">${priceStr}</span>
        </div>
      </li>`;
  }).join('');

  const html = `
    <div class="purchase loaded collapsed ">
      <h3 class="purchase-header animated collapsed" data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Label">
        <button class="disclosure" aria-expanded="false" data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Button.ToggleDisclosure">
          <div class="button-content-container">
            <span class="invoice-date" data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Display.Date">${date}</span>
            <div class="second-element" data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Label.Display.WebOrder">
              <span data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Display.WebOrder">${pub}</span>
            </div>
            <div class="third-element" data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Label.Display.Invoice.Amount">
              <span data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Display.Invoice.Amount">Total <span data-auto-test-id="RAP2.PurchaseList.Display.Invoice.Amount" dir="auto">${totalStr}</span></span>
            </div>
          </div>
        </button>
      </h3>
      <div aria-hidden="true" class="purchase-details loaded">
        ${billedToHtml}
        ${orderInfoHtml}
      </div>
      <ul class="pli-list applicable-items">${itemsHtml}</ul>
      <ul class="pli-list inapplicable-items-but-free"></ul>
    </div>`;

  return html.trim();
}

function buildBookmarklet(html) {
  const htmlLiteral = JSON.stringify(html); // safest way to embed into JS string
  const code = `javascript:(function(){var d=document,newPurchase=${htmlLiteral};var latest=d.querySelector('div.purchase.loaded.collapsed');if(latest){var wrapper=d.createElement('div');wrapper.innerHTML=newPurchase;latest.parentNode.insertBefore(wrapper.firstElementChild,latest);}})();`;
  return code;
}

function render() {
  const state = getState();
  const html = buildPurchaseHTML(state);
  $('#preview').innerHTML = html;
  $('#total-display').innerHTML = formatCurrency(state.total, escapeHtml(state.currency || 'S$')).replace(/&amp;/g,'&');

  const bm = buildBookmarklet(html);
  $('#bookmarklet-output').value = bm;
  $('#drag-link').setAttribute('href', bm);

  // Keep config JSON textarea in sync with current state unless user is editing it
  const ta = document.getElementById('config-text');
  if (ta && document.activeElement !== ta) {
    try {
      const cfg = getConfig();
      ta.value = JSON.stringify(cfg, null, 2);
    } catch {}
  }
}

function addEntry(defaults = {}) {
  const tpl = $('#entry-template');
  const node = tpl.content.firstElementChild.cloneNode(true);
  const { image, purchaseLabel, gameName, price } = defaults;
  node.querySelector('[data-field="image"]').value = image ?? 'https://is3-ssl.mzstatic.com/image/thumb/Purple211/v4/14/de/be/14debe20-0bb0-ad83-666a-97f36e1767e6/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/88x88ia-85.png';
  node.querySelector('[data-field="purchaseLabel"]').value = purchaseLabel ?? 'Stack of Cash';
  node.querySelector('[data-field="gameName"]').value = gameName ?? '8 Ball Pool';
  node.querySelector('[data-field="price"]').value = (price ?? 2.98).toString();

  node.addEventListener('input', render, { capture: true });
  node.querySelector('.remove-entry').addEventListener('click', () => {
    node.remove();
    render();
  });

  $('#entries').appendChild(node);
}

function copyBookmarklet() {
  const ta = $('#bookmarklet-output');
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  try {
    const ok = document.execCommand('copy');
    if (!ok && navigator.clipboard) {
      navigator.clipboard.writeText(ta.value);
    }
  } catch (e) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(ta.value);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Defaults
  const todayIso = new Date().toISOString().slice(0, 10);
  $('#date').value = todayIso;

  // First entry (only one to start)
  addEntry();

  // Events
  $('#add-entry').addEventListener('click', () => { addEntry({ price: 0 }); render(); });
  $('#publisher').addEventListener('input', render);
  $('#currency').addEventListener('input', render);
  $('#date').addEventListener('input', render);
  $('#copy').addEventListener('click', copyBookmarklet);
  $('#import-config')?.addEventListener('click', importConfigFromTextarea);

  // Initial render
  render();
});
