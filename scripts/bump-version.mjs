#!/usr/bin/env node
/**
 * Bump version — sincroniza versão entre JS e Android.
 *
 * Uso:
 *   npm run bump -- 0.0.5
 *   node scripts/bump-version.mjs 0.0.5
 *
 * O que faz:
 * - Atualiza package.json#version
 * - Atualiza android/app/build.gradle:
 *     versionName "X.Y.Z"   (string nova)
 *     versionCode N          (incrementado em 1)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const newVersion = process.argv[2];
if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('Erro: passe uma versão no formato X.Y.Z');
  console.error('Exemplo: npm run bump -- 0.0.5');
  process.exit(1);
}

// 1) package.json
const pkgPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const oldVersion = pkg.version;
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`✓ package.json: ${oldVersion} → ${newVersion}`);

// 2) android/app/build.gradle
const gradlePath = resolve(root, 'android', 'app', 'build.gradle');
let gradle;
try {
  gradle = readFileSync(gradlePath, 'utf8');
} catch {
  console.warn('⚠ android/app/build.gradle não encontrado — pulando Android');
  process.exit(0);
}

// Atualizar versionName
const nameMatch = gradle.match(/versionName\s+"([^"]+)"/);
if (nameMatch) {
  gradle = gradle.replace(nameMatch[0], `versionName "${newVersion}"`);
  console.log(`✓ versionName: ${nameMatch[1]} → ${newVersion}`);
}

// Incrementar versionCode
const codeMatch = gradle.match(/versionCode\s+(\d+)/);
if (codeMatch) {
  const oldCode = parseInt(codeMatch[1], 10);
  const newCode = oldCode + 1;
  gradle = gradle.replace(codeMatch[0], `versionCode ${newCode}`);
  console.log(`✓ versionCode: ${oldCode} → ${newCode}`);
}

writeFileSync(gradlePath, gradle);

console.log('\nPróximos passos:');
console.log('  npm run build');
console.log('  npx cap sync android');
