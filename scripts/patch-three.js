#!/usr/bin/env node
/**
 * Patches globe.gl's nested three@0.182 package.json to remove the
 * ./webgpu export entry that causes Vite/Rollup to fail.
 * Run automatically via postinstall.
 */
const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(__dirname, '../node_modules/globe.gl/node_modules/three/package.json');

if (!fs.existsSync(pkgPath)) {
  console.log('patch-three: globe.gl nested three not found, skipping.');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

if (pkg.exports && pkg.exports['./webgpu']) {
  delete pkg.exports['./webgpu'];
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log('patch-three: removed ./webgpu from globe.gl/node_modules/three exports ✓');
} else {
  console.log('patch-three: ./webgpu already removed, nothing to do.');
}
