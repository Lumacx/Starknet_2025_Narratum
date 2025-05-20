document.addEventListener('DOMContentLoaded', () => {
    const textDescription = document.getElementById('textDescription');
    const sketchCanvas = document.getElementById('sketchCanvas');
    const ctx = sketchCanvas.getContext('2d');
    const clearSketchBtn = document.getElementById('clearSketchBtn');
    const strokeColorInput = document.getElementById('strokeColor');
    const strokeWidthInput = document.getElementById('strokeWidth');

    const generateImageBtn = document.getElementById('generateImageBtn');
    const imageOutputContainer = document.getElementById('imageOutputContainer');
    const placeholderText = document.getElementById('placeholderText');
    const generatedImage = document.getElementById('generatedImage');
    const loadingSpinner = document.getElementById('loadingSpinner');

    const retryBtn = document.getElementById('retryBtn');
    const saveImageBtn = document.getElementById('saveImageBtn');
    const generateGifBtn = document.getElementById('generateGifBtn');

    const gifOutputContainer = document.getElementById('gifOutputContainer');
    const generatedGif = document.getElementById('generatedGif');
    const gifLoadingSpinner = document.getElementById('gifLoadingSpinner');


    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // Canvas Setup
    ctx.strokeStyle = strokeColorInput.value;
    ctx.lineWidth = strokeWidthInput.value;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    function getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        // For touch events, use evt.touches[0]
        const clientX = evt.clientX || (evt.touches && evt.touches[0].clientX);
        const clientY = evt.clientY || (evt.touches && evt.touches[0].clientY);
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDrawing(e) {
        isDrawing = true;
        const pos = getMousePos(sketchCanvas, e);
        [lastX, lastY] = [pos.x, pos.y];
        e.preventDefault(); // Prevent page scrolling on touch
    }

    function draw(e) {
        if (!isDrawing) return;
        const pos = getMousePos(sketchCanvas, e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        [lastX, lastY] = [pos.x, pos.y];
        e.preventDefault(); // Prevent page scrolling on touch
    }

    function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;
        ctx.beginPath(); // Reset path to prevent connecting next line
    }

    sketchCanvas.addEventListener('mousedown', startDrawing);
    sketchCanvas.addEventListener('mousemove', draw);
    sketchCanvas.addEventListener('mouseup', stopDrawing);
    sketchCanvas.addEventListener('mouseout', stopDrawing); // Stop if mouse leaves canvas

    // Touch events for mobile
    sketchCanvas.addEventListener('touchstart', startDrawing);
    sketchCanvas.addEventListener('touchmove', draw);
    sketchCanvas.addEventListener('touchend', stopDrawing);
    sketchCanvas.addEventListener('touchcancel', stopDrawing);


    clearSketchBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
    });

    strokeColorInput.addEventListener('change', (e) => {
        ctx.strokeStyle = e.target.value;
    });

    strokeWidthInput.addEventListener('input', (e) => {
        ctx.lineWidth = e.target.value;
    });

    // --- API Call Mocks & Logic ---

    generateImageBtn.addEventListener('click', async () => {
        const description = textDescription.value.trim();
        const sketchDataUrl = sketchCanvas.toDataURL('image/png'); // Get sketch as base64

        if (!description && isCanvasBlank(sketchCanvas)) {
            alert('Please provide a text description or a sketch.');
            return;
        }

        // UI updates for loading
        setLoadingState(true);
        generatedImage.style.display = 'none';
        placeholderText.style.display = 'none';
        gifOutputContainer.style.display = 'none'; // Hide previous GIF if any

        // **MOCK GEMINI API CALL**
        console.log('Sending to Gemini (mock):');
        console.log('Description:', description);
        console.log('Sketch (first 100 chars):', sketchDataUrl.substring(0, 100) + '...');

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2500));

        // **MOCK RESPONSE**
        // In a real app, you'd get an image URL or base64 from your backend
        const mockImageUrls = [
            'https://picsum.photos/seed/narratum1/500/350',
            'https://picsum.photos/seed/narratum2/500/350',
            'https://picsum.photos/seed/narratum3/500/350',
            'https://source.unsplash.com/random/500x350?fantasy',
            'https://source.unsplash.com/random/500x350?character'
        ];
        // Use a different image each time for variety in mock
        generatedImage.src = mockImageUrls[Math.floor(Math.random() * mockImageUrls.length)];

        generatedImage.onload = () => {
            setLoadingState(false);
            generatedImage.style.display = 'block';
            retryBtn.disabled = false;
            saveImageBtn.disabled = false;
            generateGifBtn.disabled = true; // Only enable after save
        };
        generatedImage.onerror = () => {
            setLoadingState(false);
            placeholderText.textContent = "Error loading image. Please try again.";
            placeholderText.style.display = 'block';
            retryBtn.disabled = false;
        }
    });

    retryBtn.addEventListener('click', () => {
        // Optionally clear inputs or just the output
        generatedImage.style.display = 'none';
        generatedImage.src = '#'; // Clear src to avoid showing old image if next load fails
        placeholderText.textContent = 'Your generated image will appear here.';
        placeholderText.style.display = 'block';
        gifOutputContainer.style.display = 'none';

        retryBtn.disabled = true;
        saveImageBtn.disabled = true;
        generateGifBtn.disabled = true;
        generateImageBtn.disabled = false; // Re-enable generation
    });

    saveImageBtn.addEventListener('click', () => {
        if (!generatedImage.src || generatedImage.src === '#' || generatedImage.src.startsWith('http://localhost')) { // check if src is valid image
             alert("No image to save or image source is invalid.");
             return;
        }
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = generatedImage.src;

        // Try to get a filename from description or a default
        let filename = "narratum_image.png";
        const description = textDescription.value.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (description) {
            filename = `narratum_${description.substring(0,20)}.png`;
        }

        // If the image is from a different origin (like picsum.photos),
        // we can't directly trigger a download with a custom name due to CORS.
        // The browser's default "Save Image As..." will work, but programmatic naming won't.
        // For images served from your own domain or base64 data URLs, this works:
        if (generatedImage.src.startsWith('data:')) {
            link.download = filename;
        } else {
            // For cross-origin, can try 'download' but it might be ignored.
            // Best user experience is to inform them to right-click and save.
            // Or, your backend could proxy the image.
            link.download = filename; // May not work for cross-origin
            // To ensure download for cross-origin without backend proxy, you'd need to fetch it,
            // convert to blob, then create object URL. This is more complex.
            // For now, this will attempt download, or user can right-click.
            console.warn("Attempting to download cross-origin image. Browser may handle this differently or require right-click 'Save Image As'.");
        }

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Enable GIF generation after saving
        generateGifBtn.disabled = false;
        alert(`Image download initiated as "${filename}". The 'Generate GIF' button is now enabled.`);
    });

    generateGifBtn.addEventListener('click', async () => {
        if (!generatedImage.src || generatedImage.src === '#') {
            alert("Please generate and save an image first.");
            return;
        }

        gifOutputContainer.style.display = 'block';
        generatedGif.style.display = 'none';
        gifLoadingSpinner.style.display = 'block';
        generateGifBtn.disabled = true; // Disable while processing

        // **MOCK VEO2 API CALL**
        console.log('Sending to Veo2 (mock) with image:', generatedImage.src);
        // In a real app, you'd send the image data (URL or base64) to your backend,
        // which then calls the Veo2 API.

        // Simulate API delay for GIF generation
        await new Promise(resolve => setTimeout(resolve, 3500));

        // **MOCK VEO2 RESPONSE**
        // Replace with an actual GIF URL or a placeholder animated GIF
        const mockGifUrl = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ2lvdzBqc3Jxd3Rmb21jNW9xdHFtdzR6cnM2bWpvaXlhZHF6eWRmcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKtnr78xY93DqBG/giphy.gif"; // Example GIF
        generatedGif.src = mockGifUrl;

        generatedGif.onload = () => {
            gifLoadingSpinner.style.display = 'none';
            generatedGif.style.display = 'block';
            alert("GIF generation (mock) complete!");
            // generateGifBtn.disabled = false; // Re-enable if they can generate another or modify
        };
        generatedGif.onerror = () => {
            gifLoadingSpinner.style.display = 'none';
            alert("Error generating GIF (mock).");
            generateGifBtn.disabled = false;
        }
    });


    function setLoadingState(isLoading) {
        if (isLoading) {
            loadingSpinner.style.display = 'block';
            generateImageBtn.disabled = true;
            retryBtn.disabled = true;
            saveImageBtn.disabled = true;
            generateGifBtn.disabled = true;
        } else {
            loadingSpinner.style.display = 'none';
            generateImageBtn.disabled = false;
            // Other buttons enabled based on state
        }
    }

    function isCanvasBlank(canvas) {
        const blank = document.createElement('canvas');
        blank.width = canvas.width;
        blank.height = canvas.height;
        return canvas.toDataURL() === blank.toDataURL();
    }

    // Initial state
    retryBtn.disabled = true;
    saveImageBtn.disabled = true;
    generateGifBtn.disabled = true;
});