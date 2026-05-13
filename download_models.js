const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { finished } = require('stream/promises');

const baseUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
const modelsDir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

const files = [
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1'
];

async function downloadFile(file) {
    const dest = path.join(modelsDir, file);
    const url = baseUrl + file;
    console.log(`Fetching ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Unexpected response ${res.statusText}`);
    const fileStream = fs.createWriteStream(dest, { flags: 'w' });
    await finished(Readable.fromWeb(res.body).pipe(fileStream));
    console.log(`Downloaded ${file}`);
}

Promise.all(files.map(downloadFile)).then(() => console.log('All downloads complete!')).catch(console.error);
