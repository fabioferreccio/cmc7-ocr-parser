#!/usr/bin/env node
/**
 * Bundle size check script (docs/05-regras.md §6.1)
 * Run: node scripts/check-bundle-size.js
 * Called by: npm run check:bundle (CI gate)
 */

import { readFileSync, statSync, existsSync } from 'fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const LIMITS = {
  'dist/esm/index.js': { gzip: 50 * 1024, label: 'Main bundle (gzip)' },
  'dist/workers/pipeline.worker.js': { gzip: 30 * 1024, label: 'Worker bundle (gzip)' },
};

const RAW_LIMITS = {
  'dist/wasm/opencv.wasm': { raw: 4 * 1024 * 1024, label: 'OpenCV.js WASM' },
  'dist/models/cmc7-cnn.onnx': { raw: 2 * 1024 * 1024, label: 'CNN model (ONNX)' },
};

async function getGzipSize(filePath) {
  const content = readFileSync(filePath);
  const chunks = [];
  const gzip = createGzip();
  const readable = Readable.from(content);
  await pipeline(readable, gzip, async (source) => {
    for await (const chunk of source) chunks.push(chunk);
  });
  return chunks.reduce((sum, c) => sum + c.length, 0);
}

let failed = false;

for (const [file, { gzip, label }] of Object.entries(LIMITS)) {
  if (!existsSync(file)) {
    console.warn(`⚠  SKIP: ${label} — ${file} not built yet`);
    continue;
  }
  const size = await getGzipSize(file);
  const kb = (size / 1024).toFixed(1);
  const limitKb = (gzip / 1024).toFixed(0);
  if (size > gzip) {
    console.error(`✗  FAIL: ${label}: ${kb} KB > ${limitKb} KB limit`);
    failed = true;
  } else {
    console.log(`✓  PASS: ${label}: ${kb} KB ≤ ${limitKb} KB`);
  }
}

for (const [file, { raw, label }] of Object.entries(RAW_LIMITS)) {
  if (!existsSync(file)) {
    console.warn(`⚠  SKIP: ${label} — ${file} not present yet`);
    continue;
  }
  const size = statSync(file).size;
  const mb = (size / 1024 / 1024).toFixed(2);
  const limitMb = (raw / 1024 / 1024).toFixed(0);
  if (size > raw) {
    console.error(`✗  FAIL: ${label}: ${mb} MB > ${limitMb} MB limit`);
    failed = true;
  } else {
    console.log(`✓  PASS: ${label}: ${mb} MB ≤ ${limitMb} MB`);
  }
}

if (failed) process.exit(1);
