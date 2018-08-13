// based on http://www.entropicparticles.com/leaflet/

// RGB and scale values for the color palette
const cRed = [0, 0.7, 0.2, 0.1333, 0.2, 0.35, 0.7, 0.7, 1, 1];
const cGreen = [0.1, 0.6, 0.3, 0.2, 0.3, 0.3, 0.6, 0.6, 1, 1];
const cBlue = [0.24, 0.4, 0.1, 0.0666, 0.1, 0.2, 0.4, 0.4, 1, 1];
const colorThresholds = [0., 1e-6, 1e-4, 1e-3, 0.1, 0.3, 0.8, 0.9, 1, 10];

const perlinOctavesParams = Array.from([0, 2, 4, 6, 8, 10], (v) => 1 << v).map(v => [v, Math.sqrt(v)]);

noise.seed(300); // [1, 65536]

function pickColor(value) {
    let colorIndex = 0;
    while (value >= colorThresholds[colorIndex]) {
        colorIndex++;
    }
    colorIndex--;
    const r = (value - colorThresholds[colorIndex]) / (colorThresholds[colorIndex+1] - colorThresholds[colorIndex]) *
        (cRed[colorIndex+1] - cRed[colorIndex]) + cRed[colorIndex];
    const g = (value - colorThresholds[colorIndex]) / (colorThresholds[colorIndex+1] - colorThresholds[colorIndex]) *
        (cGreen[colorIndex+1] - cGreen[colorIndex]) + cGreen[colorIndex];
    const b = (value - colorThresholds[colorIndex]) / (colorThresholds[colorIndex+1] - colorThresholds[colorIndex]) *
        (cBlue[colorIndex+1] - cBlue[colorIndex]) + cBlue[colorIndex];
    return [~~(255 * r), ~~(255 * g), ~~(255 * b)];
}

function createTile(coords) {
    // ToDo memoize canvases using LRU cache to improve loading speed
    // ToDo find out if asynchronous tile loading is of any help here (see https://leafletjs.com/reference-1.3.2.html#gridlayer)

    const canvas = document.createElement('canvas');

    const tileSize = this.getTileSize();
    canvas.width = tileSize.x;
    canvas.height = tileSize.y;
    
    const zoom = coords.z;
    const zoomScale = 1 << zoom;

    console.info(`Tile coords=[${coords.x},${coords.y},${zoom}], size=[${tileSize.x},${tileSize.y}]`);

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const buffer = imageData.data;

    let bufferRowPosition = 0;
    for (let j = 0; j < canvas.height; j++) {
        for (let i = 0; i < canvas.width; i++) {
            // (x,y) absolute coordinates from local ones
            const xx = (coords.x / zoomScale + i / canvas.width / zoomScale);
            const yy = (coords.y / zoomScale + j / canvas.height / zoomScale);

            // ToDo add more octaves as user zooms in
            let sum = 0;
            perlinOctavesParams.forEach(([q, sqrtQ]) => {
                sum += (noise.perlin2(xx * q, yy * q) + 1) / 2 / sqrtQ;
            });

            // Perlin plus some extra elevation for making an island (arbitrary)
            let value = ((noise.perlin2(xx, yy) + 1) / 2 + sum) + 0.25 * Math.sin(xx * Math.PI) * Math.sin(yy * Math.PI);
            // delimiting range
            value = Math.pow(Math.abs(Math.max(1.85, value) - 1.85), 3) * 27;

            const [r, g, b] = pickColor(value);
            const bufferIndex = bufferRowPosition + i * 4;
            buffer[bufferIndex] = r;
            buffer[bufferIndex + 1] = g;
            buffer[bufferIndex + 2] = b;
            buffer[bufferIndex + 3] = 255;
        }
        bufferRowPosition += canvas.width * 4;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

const CanvasLayer = L.GridLayer.extend({
    createTile: createTile
});

const map = L.map('map', {
    center: [0, 0],
    zoom: 2
});

map.addLayer(new CanvasLayer());
