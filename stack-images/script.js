const imgFileInput = document.getElementById('img-file');
const orientationSelect = document.getElementById('orientation');
const outputPanel = document.getElementById('output-panel');
const downloadCompositeButton = document.getElementById('download-composite');

function createImageWrapper(src) {
  const wrapper = document.createElement('div');
  wrapper.className = 'image-wrapper';

  const img = document.createElement('img');
  img.src = src;
  img.alt = 'Uploaded Image';
  wrapper.appendChild(img);

  const removeButton = document.createElement('button');
  removeButton.className = 'remove-button';
  removeButton.textContent = 'X';
  removeButton.addEventListener('click', function (e) {
    e.stopPropagation();
    wrapper.remove();
  });
  wrapper.appendChild(removeButton);

  return wrapper;
}

imgFileInput.addEventListener('change', function () {
  const files = imgFileInput.files;
  if (!files.length) return;
  Array.from(files).forEach(file => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const wrapper = createImageWrapper(e.target.result);
        outputPanel.appendChild(wrapper);
      };
      reader.readAsDataURL(file);
    } else {
      alert("File is not an image: " + file.name);
    }
  });
  imgFileInput.value = "";
});

function downloadComposite() {
  const orientation = orientationSelect.value;
  const imgElements = outputPanel.querySelectorAll('img');
  if (imgElements.length === 0) {
    alert("No images to Stack.");
    return;
  }

  if (orientation === 'column') {
    let commonWidth = Infinity;
    const imageData = [];
    imgElements.forEach(img => {
      if (!img.complete) return;
      const w = img.naturalWidth;
      if (w < commonWidth) commonWidth = w;
    });
    let totalHeight = 0;
    imgElements.forEach(img => {
      if (!img.complete) return;
      const scale = commonWidth / img.naturalWidth;
      const newHeight = img.naturalHeight * scale;
      imageData.push({ img, scale, newWidth: commonWidth, newHeight });
      totalHeight += newHeight;
    });
    const canvas = document.createElement('canvas');
    canvas.width = commonWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    let yOffset = 0;
    imageData.forEach(data => {
      ctx.drawImage(
        data.img,
        0, 0, data.img.naturalWidth, data.img.naturalHeight,
        0, yOffset, data.newWidth, data.newHeight
      );
      yOffset += data.newHeight;
    });
    triggerDownload(canvas, 'Vert.png');
  } else if (orientation === 'row') {
    let commonHeight = Infinity;
    const imageData = [];
    imgElements.forEach(img => {
      if (!img.complete) return;
      const h = img.naturalHeight;
      if (h < commonHeight) commonHeight = h;
    });
    let totalWidth = 0;
    imgElements.forEach(img => {
      if (!img.complete) return;
      const scale = commonHeight / img.naturalHeight;
      const newWidth = img.naturalWidth * scale;
      imageData.push({ img, scale, newWidth, newHeight: commonHeight });
      totalWidth += newWidth;
    });
    const canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = commonHeight;
    const ctx = canvas.getContext('2d');
    let xOffset = 0;
    imageData.forEach(data => {
      ctx.drawImage(
        data.img,
        0, 0, data.img.naturalWidth, data.img.naturalHeight,
        xOffset, 0, data.newWidth, data.newHeight
      );
      xOffset += data.newWidth;
    });
    triggerDownload(canvas, 'Hori.png');
  }
}

function triggerDownload(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

downloadCompositeButton.addEventListener('click', downloadComposite);