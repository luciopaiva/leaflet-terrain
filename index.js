// based on http://www.entropicparticles.com/leaflet/

// RGB and scale values for the color palette
// const cRed = [0, 0.7, 0.2, 0.1333, 0.2, 0.35, 0.7, 0.7, 1, 1];
// const cGreen = [0.1, 0.6, 0.3, 0.2, 0.3, 0.3, 0.6, 0.6, 1, 1];
// const cBlue = [0.24, 0.4, 0.1, 0.0666, 0.1, 0.2, 0.4, 0.4, 1, 1];
const cRed = [0, 0.1, 0.4];
const cGreen = [0, 0.3, 0.6];
const cBlue = [0.24, 0.1, 0.4];
// const colorThresholds = [0., 1e-6, 1e-4, 1e-3, 0.1, 0.3, 0.8, 0.9, 1, 10];

noise.seed(3); // [1, 65536]

const lerp = (left, right, value) => (value - left) / (right - left);

const normalizator = 1 + 1/2 + 1/4 + 1/8 + 1/16 + 1/32 + 1/64;

function pickColor(value) {
    // let colorIndex = 0;
    // while (value >= colorThresholds[colorIndex]) {
    //     colorIndex++;
    // }
    // colorIndex--;
    // value = lerp(colorThresholds[colorIndex], colorThresholds[colorIndex + 1], value);
    const r = cRed[Math.floor(value * cRed.length)];
    const g = cGreen[Math.floor(value * cGreen.length)];
    const b = cBlue[Math.floor(value * cBlue.length)];
    // const r = value * (cRed[colorIndex+1] - cRed[colorIndex]) + cRed[colorIndex];
    // const g = value * (cGreen[colorIndex+1] - cGreen[colorIndex]) + cGreen[colorIndex];
    // const b = value * (cBlue[colorIndex+1] - cBlue[colorIndex]) + cBlue[colorIndex];
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

            let value = 0;
            const map = (v) => (v + 1) / 2;  // from [-1, 1] to [0, 1]
            value += map(noise.perlin2(xx, yy));
            // value += map(noise.perlin2(xx * 4, yy * 4)) / 2;  // 2^2
            // value += map(noise.perlin2(xx * 16, yy * 16)) / 4;  // 2^4
            // value += map(noise.perlin2(xx * 64, yy * 64)) / 8;  // 2^6
            // value += map(noise.perlin2(xx * 256, yy * 256)) / 16;  // 2^8
            // value += map(noise.perlin2(xx * 1024, yy * 1024)) / 32;  // 2^10
            // value += map(noise.perlin2(xx * 4096, yy * 4096)) / 64;  // 2^12
            value += map(noise.perlin2(xx * 2, yy * 2)) / 2;  // 2^2
            value += map(noise.perlin2(xx * 4, yy * 4)) / 4;  // 2^4
            value += map(noise.perlin2(xx * 8, yy * 8)) / 8;  // 2^6
            value += map(noise.perlin2(xx * 16, yy * 16)) / 16;  // 2^8
            value += map(noise.perlin2(xx * 32, yy * 32)) / 32;  // 2^10
            value += map(noise.perlin2(xx * 64, yy * 64)) / 64;  // 2^12
            value += map(noise.perlin2(xx * 128, yy * 128)) / 128;  // 2^12
            value /= normalizator * 1.85;

            // ToDo add more octaves as user zooms in
            value = .9 * value + .1 * Math.sin(xx * Math.PI) * Math.sin(yy * Math.PI);

            // value += 0.001;

            // delimiting range
            // value = Math.max(1.85, value);
            // value = value - 1.85;
            // value = Math.pow(value, 3);
            // value = value * 270;

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
