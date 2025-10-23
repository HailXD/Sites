(() => {
    const uploadSection = document.getElementById("uploadSection");
    const imageInput = document.getElementById("imageInput");
    const originalImageContainer = document.getElementById("originalImage");
    const processedImageContainer = document.getElementById("processedImage");
    const loadingIndicator = document.getElementById("loading");
    const downloadBtn = document.getElementById("downloadBtn");
    const clearBtn = document.getElementById("clearBtn");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    let sourceImage = null;
    let processedDataUrl = null;
    let fileName = "processed_image.png";

    function setLoading(isActive) {
        loadingIndicator.classList.toggle("is-visible", isActive);
    }

    function showPlaceholder(target, message) {
        target.innerHTML = `<div class="placeholder">${message}</div>`;
    }

    function displayOriginal(image) {
        const element = document.createElement("img");
        element.src = image.src;
        element.alt = "Uploaded source image";
        originalImageContainer.innerHTML = "";
        originalImageContainer.appendChild(element);
    }

    function displayProcessed(dataUrl) {
        const element = new Image();
        element.alt = "Processed image with yellow rows removed";
        element.onload = () => {
            processedImageContainer.innerHTML = "";
            processedImageContainer.appendChild(element);
        };
        element.src = dataUrl;
    }

    function handleImage(file) {
        if (!file || !file.type.startsWith("image/")) {
            showPlaceholder(processedImageContainer, "Unsupported file type. Please choose an image.");
            return;
        }

        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        fileName = `processed_${nameWithoutExtension || "image"}.png`;

        const reader = new FileReader();
        reader.onload = ({ target }) => {
            const img = new Image();
            img.onload = () => {
                sourceImage = img;
                displayOriginal(img);
                showPlaceholder(processedImageContainer, "Processing...");
                downloadBtn.disabled = true;
                processedDataUrl = null;

                requestAnimationFrame(processImage);
            };
            img.src = target.result;
        };
        reader.readAsDataURL(file);

        imageInput.value = "";
    }

    function processImage() {
        if (!sourceImage) {
            return;
        }

        setLoading(true);

        setTimeout(() => {
            canvas.width = sourceImage.width;
            canvas.height = sourceImage.height;

            ctx.drawImage(sourceImage, 0, 0);

            const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

            const target = { r: 254, g: 248, b: 0 };
            const tolerance = 5;

            const rowsToKeep = [];
            for (let y = 0; y < height; y += 1) {
                let hasTargetColor = false;

                for (let x = 0; x < width; x += 1) {
                    const index = (y * width + x) * 4;
                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];

                    if (
                        Math.abs(r - target.r) <= tolerance &&
                        Math.abs(g - target.g) <= tolerance &&
                        Math.abs(b - target.b) <= tolerance
                    ) {
                        hasTargetColor = true;
                        break;
                    }
                }

                if (!hasTargetColor) {
                    rowsToKeep.push(y);
                }
            }

            const newHeight = rowsToKeep.length;
            const newCanvas = document.createElement("canvas");
            newCanvas.width = width;
            newCanvas.height = Math.max(newHeight, 1);
            const newCtx = newCanvas.getContext("2d");

            rowsToKeep.forEach((originalRow, newRowIndex) => {
                const rowData = ctx.getImageData(0, originalRow, width, 1);
                newCtx.putImageData(rowData, 0, newRowIndex);
            });

            // Ensure at least one transparent row when all rows are removed
            if (newHeight === 0) {
                newCtx.clearRect(0, 0, width, 1);
            }

            processedDataUrl = newCanvas.toDataURL("image/png");
            displayProcessed(processedDataUrl);
            downloadBtn.disabled = false;
            setLoading(false);
        }, 30);
    }

    function downloadImage() {
        if (!processedDataUrl) {
            return;
        }

        const link = document.createElement("a");
        link.href = processedDataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    function clearAll() {
        sourceImage = null;
        processedDataUrl = null;
        canvas.width = 0;
        canvas.height = 0;
        showPlaceholder(originalImageContainer, "No image uploaded yet");
        showPlaceholder(processedImageContainer, "Upload an image to get started");
        downloadBtn.disabled = true;
        setLoading(false);
    }

    uploadSection.addEventListener("dragover", (event) => {
        event.preventDefault();
        uploadSection.classList.add("dragover");
    });

    uploadSection.addEventListener("dragleave", () => {
        uploadSection.classList.remove("dragover");
    });

    uploadSection.addEventListener("drop", (event) => {
        event.preventDefault();
        uploadSection.classList.remove("dragover");
        const [file] = event.dataTransfer.files;
        if (file) {
            handleImage(file);
        }
    });

    uploadSection.addEventListener("click", () => {
        imageInput.click();
    });

    uploadSection.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            imageInput.click();
        }
    });

    imageInput.addEventListener("change", (event) => {
        const [file] = event.target.files;
        if (file) {
            handleImage(file);
        }
    });

    downloadBtn.addEventListener("click", downloadImage);
    clearBtn.addEventListener("click", clearAll);

    // Initial state
    clearAll();
})();
