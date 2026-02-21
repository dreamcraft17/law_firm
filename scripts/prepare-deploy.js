/**
 * Menyiapkan folder deploy untuk upload ke cPanel.
 * Jalankan setelah: npm run build
 * Hasil: folder deploy/ berisi file yang harus di-upload ke Application root.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const deployDir = path.join(root, 'deploy');

const standaloneDir = path.join(root, '.next', 'standalone');
const staticDir = path.join(root, '.next', 'static');
const publicDir = path.join(root, 'public');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function main() {
  if (!fs.existsSync(standaloneDir)) {
    console.error('Folder .next/standalone tidak ada. Jalankan dulu: npm run build');
    process.exit(1);
  }

  if (fs.existsSync(deployDir)) {
    fs.rmSync(deployDir, { recursive: true });
  }
  fs.mkdirSync(deployDir, { recursive: true });

  // Copy isi .next/standalone ke deploy/
  for (const name of fs.readdirSync(standaloneDir)) {
    copyRecursive(path.join(standaloneDir, name), path.join(deployDir, name));
  }

  // Copy .next/static ke deploy/.next/static
  if (fs.existsSync(staticDir)) {
    const destStatic = path.join(deployDir, '.next', 'static');
    copyRecursive(staticDir, destStatic);
    console.log('OK: .next/static -> deploy/.next/static');
  }

  // Copy public ke deploy/public
  if (fs.existsSync(publicDir)) {
    copyRecursive(publicDir, path.join(deployDir, 'public'));
    console.log('OK: public -> deploy/public');
  }

  console.log('');
  console.log('Selesai. Folder "deploy" siap di-upload.');
  console.log('Upload SEMUA ISI folder deploy/ ke Application root di cPanel.');
  console.log('(Bukan folder deploy-nya, tapi isi di dalamnya: server.js, node_modules, .next, dll.)');
}

main();
