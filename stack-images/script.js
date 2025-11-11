const imgFileInput = document.getElementById('img-file');
const dropZone = document.getElementById('drop-zone');
const browseBtn = document.getElementById('browse-btn');
const queueList = document.getElementById('image-queue');
const queueCount = document.getElementById('queue-count');
const orientationToggle = document.getElementById('orientation-toggle');
const downloadCompositeButton = document.getElementById('download-composite');
const clearAllButton = document.getElementById('clear-all');
const previewCanvas = document.getElementById('preview-canvas');
const previewPlaceholder = document.getElementById('preview-placeholder');
const metaDimensions = document.getElementById('meta-dimensions');
const metaCount = document.getElementById('meta-count');
const outputPanel = document.getElementById('output-panel');
const toggleGalleryBtn = document.getElementById('toggle-gallery');

const state = {
  orientation: 'column',
  images: []
};

const MAX_BATCH = 12;
const MAX_QUEUE = 50;

const previewCtx = previewCanvas.getContext('2d');

browseBtn.addEventListener('click', () => imgFileInput.click());

imgFileInput.addEventListener('change', () => {
  handleFiles(imgFileInput.files);
  imgFileInput.value = '';
});

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('drag-over');
});

['dragleave', 'dragend'].forEach(evt =>
  dropZone.addEventListener(evt, () => dropZone.classList.remove('drag-over'))
);

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('drag-over');
  if (event.dataTransfer?.files?.length) {
    handleFiles(event.dataTransfer.files);
  }
});

dropZone.addEventListener('click', (event) => {
  if (event.target === browseBtn) return;
  imgFileInput.click();
});

orientationToggle.addEventListener('click', (event) => {
  const button = event.target.closest('.toggle');
  if (!button) return;
  state.orientation = button.dataset.orientation;
  [...orientationToggle.querySelectorAll('.toggle')].forEach((btn) =>
    btn.classList.toggle('active', btn === button)
  );
  updatePreview();
});

queueList.addEventListener('click', (event) => {
  const actionBtn = event.target.closest('button[data-action]');
  if (!actionBtn) return;
  const { action, id } = actionBtn.dataset;
  if (!id) return;
  if (action === 'remove') {
    removeImage(id);
  } else if (action === 'up') {
    moveImage(id, -1);
  } else if (action === 'down') {
    moveImage(id, 1);
  }
});

toggleGalleryBtn.addEventListener('click', () => {
  const hidden = outputPanel.classList.toggle('hidden');
  toggleGalleryBtn.textContent = hidden ? 'Show' : 'Hide';
});

clearAllButton.addEventListener('click', () => {
  state.images = [];
  refreshUI();
});

downloadCompositeButton.addEventListener('click', () => {
  const composite = buildComposite(state.images, state.orientation);
  if (!composite) {
    alert('Add at least one image to download a stack.');
    return;
  }
  const filename =
    state.orientation === 'column'
      ? 'stack-vertical.png'
      : 'stack-horizontal.png';
  triggerDownload(composite.canvas, filename);
});

function handleFiles(fileList) {
  if (!fileList.length) return;
  const files = Array.from(fileList)
    .filter((file) => file.type.startsWith('image/'))
    .slice(0, MAX_BATCH);

  if (!files.length) {
    alert('Only image files are supported.');
    return;
  }

  const remainingSlots = MAX_QUEUE - state.images.length;
  if (remainingSlots <= 0) {
    alert(`You already have ${MAX_QUEUE} images queued. Please remove a few before adding more.`);
    return;
  }

  files.slice(0, remainingSlots).forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const imageElement = new Image();
      imageElement.onload = () => {
        state.images.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: file.name,
          size: file.size,
          src: reader.result,
          width: imageElement.naturalWidth,
          height: imageElement.naturalHeight,
          element: imageElement
        });
        refreshUI();
      };
      imageElement.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function moveImage(id, direction) {
  const index = state.images.findIndex((image) => image.id === id);
  if (index < 0) return;
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= state.images.length) return;
  const [image] = state.images.splice(index, 1);
  state.images.splice(targetIndex, 0, image);
  refreshUI();
}

function removeImage(id) {
  state.images = state.images.filter((image) => image.id !== id);
  refreshUI();
}

function refreshUI() {
  renderQueue();
  renderGallery();
  updateCounts();
  updatePreview();
}

function renderQueue() {
  queueList.innerHTML = '';
  if (!state.images.length) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty';
    emptyItem.textContent = 'Waiting for images…';
    queueList.appendChild(emptyItem);
    return;
  }

  state.images.forEach((image, index) => {
    const item = document.createElement('li');
    item.dataset.id = image.id;

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const thumbImg = document.createElement('img');
    thumbImg.src = image.src;
    thumbImg.alt = image.name;
    thumb.appendChild(thumbImg);

    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('strong');
    title.textContent = `${index + 1}. ${image.name}`;
    const dims = document.createElement('span');
    dims.textContent = `${image.width}×${image.height}px · ${formatBytes(image.size)}`;
    meta.appendChild(title);
    meta.appendChild(dims);

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    actions.appendChild(createActionButton('↑', 'up', image.id));
    actions.appendChild(createActionButton('↓', 'down', image.id));
    actions.appendChild(createActionButton('✕', 'remove', image.id, 'danger'));

    item.appendChild(thumb);
    item.appendChild(meta);
    item.appendChild(actions);
    queueList.appendChild(item);
  });
}

function createActionButton(label, action, id, extraClass) {
  const button = document.createElement('button');
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.id = id;
  if (extraClass) button.classList.add(extraClass);
  return button;
}

function renderGallery() {
  outputPanel.innerHTML = '';
  if (!state.images.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No thumbnails yet.';
    outputPanel.appendChild(empty);
    return;
  }

  state.images.forEach((image) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'image-wrapper';
    const img = document.createElement('img');
    img.src = image.src;
    img.alt = image.name;

    const removeButton = document.createElement('button');
    removeButton.className = 'remove-button';
    removeButton.type = 'button';
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => removeImage(image.id));

    wrapper.appendChild(img);
    wrapper.appendChild(removeButton);
    outputPanel.appendChild(wrapper);
  });
}

function updateCounts() {
  if (state.images.length) {
    queueCount.textContent = `${state.images.length} image${state.images.length > 1 ? 's' : ''} ready`;
  } else {
    queueCount.textContent = 'No images yet';
  }
  metaCount.textContent = `Images: ${state.images.length}`;
}

function updatePreview() {
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  if (!state.images.length) {
    previewPlaceholder.classList.remove('hidden');
    metaDimensions.textContent = 'Dimensions: —';
    return;
  }
  previewPlaceholder.classList.add('hidden');
  const composite = buildComposite(state.images, state.orientation);
  if (!composite) return;

  const maxWidth = 560;
  const maxHeight = 560;
  const scale = Math.min(
    1,
    maxWidth / composite.canvas.width,
    maxHeight / composite.canvas.height
  );

  previewCanvas.width = composite.canvas.width * scale;
  previewCanvas.height = composite.canvas.height * scale;
  previewCtx.drawImage(
    composite.canvas,
    0,
    0,
    composite.canvas.width,
    composite.canvas.height,
    0,
    0,
    previewCanvas.width,
    previewCanvas.height
  );
  metaDimensions.textContent = `Dimensions: ${Math.round(
    composite.canvas.width
  )} × ${Math.round(composite.canvas.height)} px`;
}

function buildComposite(images, orientation) {
  if (!images.length) return null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (orientation === 'column') {
    let commonWidth = Math.min(...images.map((img) => img.width));
    if (!Number.isFinite(commonWidth)) return null;
    const segments = images.map((img) => {
      const scale = commonWidth / img.width;
      return {
        element: img.element,
        newWidth: commonWidth,
        newHeight: img.height * scale
      };
    });
    const totalHeight = segments.reduce((sum, seg) => sum + seg.newHeight, 0);
    canvas.width = Math.round(commonWidth);
    canvas.height = Math.round(totalHeight);
    let offsetY = 0;
    segments.forEach((segment) => {
      ctx.drawImage(
        segment.element,
        0,
        0,
        segment.element.naturalWidth,
        segment.element.naturalHeight,
        0,
        offsetY,
        segment.newWidth,
        segment.newHeight
      );
      offsetY += segment.newHeight;
    });
  } else {
    let commonHeight = Math.min(...images.map((img) => img.height));
    if (!Number.isFinite(commonHeight)) return null;
    const segments = images.map((img) => {
      const scale = commonHeight / img.height;
      return {
        element: img.element,
        newWidth: img.width * scale,
        newHeight: commonHeight
      };
    });
    const totalWidth = segments.reduce((sum, seg) => sum + seg.newWidth, 0);
    canvas.width = Math.round(totalWidth);
    canvas.height = Math.round(commonHeight);
    let offsetX = 0;
    segments.forEach((segment) => {
      ctx.drawImage(
        segment.element,
        0,
        0,
        segment.element.naturalWidth,
        segment.element.naturalHeight,
        offsetX,
        0,
        segment.newWidth,
        segment.newHeight
      );
      offsetX += segment.newWidth;
    });
  }

  return { canvas };
}

function triggerDownload(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

refreshUI();
