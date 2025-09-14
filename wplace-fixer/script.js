const WPLACE_FREE = [
    [0, 0, 0], [60, 60, 60], [120, 120, 120], [210, 210, 210], [255, 255, 255],
    [96, 0, 24], [237, 28, 36], [255, 127, 39], [246, 170, 9], [249, 221, 59],
    [255, 250, 188], [14, 185, 104], [19, 230, 123], [135, 255, 94], [12, 129, 110],
    [16, 174, 166], [19, 225, 190], [96, 247, 242], [40, 80, 158], [64, 147, 228],
    [107, 80, 246], [153, 177, 251], [120, 12, 153], [170, 56, 185], [224, 159, 249],
    [203, 0, 122], [236, 31, 128], [243, 141, 169], [104, 70, 52], [149, 104, 42],
    [248, 178, 119]
];

const WPLACE_PAID = [
    [170, 170, 170], [165, 14, 30], [250, 128, 114], [228, 92, 26], [156, 132, 49],
    [197, 173, 49], [232, 212, 95], [74, 107, 58], [90, 148, 74], [132, 197, 115],
    [15, 121, 159], [187, 250, 242], [125, 199, 255], [77, 49, 184], [74, 66, 132],
    [122, 113, 196], [181, 174, 241], [155, 82, 73], [209, 128, 120], [250, 182, 164],
    [219, 164, 99], [123, 99, 82], [156, 132, 107], [214, 181, 148], [209, 128, 81],
    [255, 197, 165], [109, 100, 63], [148, 140, 107], [205, 197, 158], [51, 57, 65],
    [109, 117, 141], [179, 185, 209]
];

const PALETTE = [...WPLACE_FREE, ...WPLACE_PAID];

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const previewContainer = document.getElementById('previewContainer');
const downloadBtn = document.getElementById('downloadBtn');
const processing = document.getElementById('processing');

// Precompute palette for faster lookups
const paletteCache = new Map();

function getColorKey(r, g, b) {
    return (r << 16) | (g << 8) | b;
}

function findNearestColor(r, g, b) {
    const key = getColorKey(r, g, b);
    if (paletteCache.has(key)) {
        return paletteCache.get(key);
    }

    let minDist = Infinity;
    let nearest = PALETTE[0];

    for (const color of PALETTE) {
        const dist = Math.pow(r - color[0], 2) + 
                   Math.pow(g - color[1], 2) + 
                   Math.pow(b - color[2], 2);
        if (dist < minDist) {
            minDist = dist;
            nearest = color;
        }
    }

    paletteCache.set(key, nearest);
    return nearest;
}

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('active');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('active');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('active');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processImage(file);
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        processImage(file);
    }
});

function processImage(file) {
    processing.style.display = 'block';
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Process in chunks for better performance
            for (let i = 0; i < data.length; i += 4) {
                const [nr, ng, nb] = findNearestColor(data[i], data[i + 1], data[i + 2]);
                data[i] = nr;
                data[i + 1] = ng;
                data[i + 2] = nb;
            }
            
            ctx.putImageData(imageData, 0, 0);
            previewContainer.classList.add('show');
            processing.style.display = 'none';
        };
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'converted-pixel-art.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});