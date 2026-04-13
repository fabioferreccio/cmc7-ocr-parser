#!/usr/bin/env node
/**
 * Ensures OpenCV WASM assets are available at dist/wasm for tests/runtime.
 *
 * Resolution order:
 * 1) tools/opencv/assets (project-local, deterministic)
 * 2) node_modules/@techstark/opencv-js (if installed)
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const root = process.cwd();
const outDir = path.join(root, 'dist', 'wasm');

const assetNames = ['opencv.js', 'opencv_js.wasm'];

function copyAssetsFrom(sourceDir) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const asset of assetNames) {
    const src = path.join(sourceDir, asset);
    if (!fs.existsSync(src)) return false;
  }
  for (const asset of assetNames) {
    const src = path.join(sourceDir, asset);
    const dstName = asset === 'opencv_js.wasm' ? 'opencv.wasm' : asset;
    const dst = path.join(outDir, dstName);
    fs.copyFileSync(src, dst);
  }
  return true;
}

function fromToolsAssets() {
  const sourceDir = path.join(root, 'tools', 'opencv', 'assets');
  return copyAssetsFrom(sourceDir);
}

function fromNodeModules() {
  try {
    const pkgPath = require.resolve('@techstark/opencv-js/package.json', { paths: [root] });
    const pkgDir = path.dirname(pkgPath);
    const candidates = [
      pkgDir,
      path.join(pkgDir, 'dist'),
      path.join(pkgDir, 'build'),
    ];
    for (const dir of candidates) {
      if (copyAssetsFrom(dir)) return true;
    }
  } catch {
    // dependency not installed, ignore and continue
  }
  return false;
}

if (fromToolsAssets() || fromNodeModules()) {
  console.log('OpenCV assets prepared in dist/wasm.');
  process.exit(0);
}

console.error('Unable to prepare OpenCV assets.');
console.error('Expected one of these sources:');
console.error('- tools/opencv/assets/{opencv.js, opencv_js.wasm}');
console.error('- node_modules/@techstark/opencv-js');
process.exit(1);
