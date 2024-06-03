const dropZone = document.getElementById('dropZone');
const playButton = document.getElementById('playButton');
const pauseButton = document.getElementById('pauseButton');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 512; // Reduce the FFT size to decrease the number of frequency bins
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

let audioBufferSourceNode = null;
let audioBuffer = null;

// Generate a set of subdued colors
const generateColors = (numColors) => {
    const colors = [];
    for (let i = 0; i < numColors; i++) {
        const hue = Math.random() * 360;
        const saturation = 50 + Math.random() * 20; // Subdued saturation
        const lightness = 30 + Math.random() * 20; // Subdued lightness
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    return colors;
};

const colors = generateColors(150);

dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.style.borderColor = 'green';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#ccc';
});

dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.style.borderColor = '#ccc';

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const audioData = e.target.result;
            audioCtx.decodeAudioData(audioData, (buffer) => {
                audioBuffer = buffer;
                playButton.disabled = false;
                pauseButton.disabled = false;
            });
        };

        reader.readAsArrayBuffer(file);
    }
});

playButton.addEventListener('click', () => {
    if (audioBuffer) {
        if (audioBufferSourceNode) {
            audioBufferSourceNode.stop();
        }
        audioBufferSourceNode = audioCtx.createBufferSource();
        audioBufferSourceNode.buffer = audioBuffer;
        audioBufferSourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        audioBufferSourceNode.start(0);

        audioBufferSourceNode.onended = () => {
            playButton.disabled = false;
            pauseButton.disabled = true;
        };

        draw();
        playButton.disabled = true;
        pauseButton.disabled = false;
    }
});

pauseButton.addEventListener('click', () => {
    if (audioBufferSourceNode) {
        audioBufferSourceNode.stop();
        playButton.disabled = false;
        pauseButton.disabled = true;
    }
});

const shapePositions = Array(bufferLength).fill().map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    speed: Math.random() * 0.5 + 0.2,
    sway: Math.random() * 2 - 1
}));

function drawKaleidoscope() {
    const radius = Math.min(canvas.width, canvas.height) / 2;
    const numSegments = 6;
    const angleStep = (Math.PI * 2) / numSegments;

    analyser.getByteFrequencyData(dataArray);

    const averageAmplitude = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const pulse = (averageAmplitude / 256) * 20;

    for (let i = 0; i < numSegments; i++) {
        const angle = i * angleStep;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        canvasCtx.save();
        canvasCtx.translate(canvas.width / 2, canvas.height / 2);
        canvasCtx.rotate(angle);

        canvasCtx.globalAlpha = 0.1; // Low opacity for a faded effect
        canvasCtx.fillStyle = `hsl(${(angle / Math.PI) * 180}, 50%, 50%)`;
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, 0);
        canvasCtx.lineTo(x + pulse, y + pulse);
        canvasCtx.lineTo(-x - pulse, -y - pulse);
        canvasCtx.closePath();
        canvasCtx.fill();

        canvasCtx.restore();
    }

    canvasCtx.globalAlpha = 1; // Reset opacity for shapes
}

function draw() {
    if (!audioBufferSourceNode) {
        return;
    }

    requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    drawKaleidoscope(); // Draw the pulsing kaleidoscope background

    const lowFreqRange = Math.floor(bufferLength * 0.3);
    const midFreqRange = Math.floor(bufferLength * 0.6);

    for (let i = 0; i < bufferLength; i += 4) { // Increase step to reduce number of shapes
        const barHeight = dataArray[i] * 1.5;
        const color = colors[i % colors.length];

        let shapeSize;
        let shapeType;
        if (i < lowFreqRange) {
            shapeSize = barHeight / 6; // Small size for low frequencies
            shapeType = 'triangle';
        } else if (i < midFreqRange) {
            shapeSize = barHeight / 4; // Medium size for mid frequencies
            shapeType = 'square';
        } else {
            shapeSize = barHeight / 2; // Large size for high frequencies
            shapeType = 'circle';
        }

        shapePositions[i].x += shapePositions[i].speed * (dataArray[i] / 256); // Movement tied to frequency amplitude
        if (shapePositions[i].x > canvas.width + shapeSize) {
            shapePositions[i].x = -shapeSize;
            shapePositions[i].y = Math.random() * canvas.height;
        }

        const swayAmount = dataArray[i] / 256 * 20;
        const x = shapePositions[i].x + Math.sin(shapePositions[i].sway) * swayAmount;
        const y = shapePositions[i].y + Math.cos(shapePositions[i].sway) * swayAmount;

        shapePositions[i].sway += 0.02; // Adjust the speed of swaying

        canvasCtx.fillStyle = color;
        canvasCtx.shadowBlur = 20; // Add blur effect
        canvasCtx.shadowColor = color; // Shadow color same as shape color

        if (shapeType === 'circle') {
            canvasCtx.beginPath();
            canvasCtx.arc(x, y, shapeSize, 0, Math.PI * 2);
            canvasCtx.fill();
        } else if (shapeType === 'square') {
            canvasCtx.fillRect(x - shapeSize / 2, y - shapeSize / 2, shapeSize, shapeSize);
        } else if (shapeType === 'triangle') {
            canvasCtx.beginPath();
            canvasCtx.moveTo(x, y - shapeSize / 2);
            canvasCtx.lineTo(x - shapeSize / 2, y + shapeSize / 2);
            canvasCtx.lineTo(x + shapeSize / 2, y + shapeSize / 2);
            canvasCtx.closePath();
            canvasCtx.fill();
        }
    }
}
