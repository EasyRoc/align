import { createWriteStream, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public', 'mediapipe');
const wasmDir = join(publicDir, 'wasm');
const packageWasmDir = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const modelPath = join(publicDir, 'pose_landmarker_lite.task');
const modelUrl =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

mkdirSync(wasmDir, { recursive: true });

if (existsSync(packageWasmDir)) {
  for (const file of readdirSync(packageWasmDir)) {
    if (file.endsWith('.wasm') || file.endsWith('.js')) {
      copyFileSync(join(packageWasmDir, file), join(wasmDir, file));
    }
  }
}

if (!existsSync(modelPath)) {
  await new Promise((resolve, reject) => {
    const file = createWriteStream(modelPath);
    https
      .get(modelUrl, (response) => {
        if (response.statusCode !== 200) {
          file.close();
          reject(new Error(`Failed to download MediaPipe model: ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      })
      .on('error', (error) => {
        file.close();
        reject(error);
      });
  });
}
