/**
 * Cross-platform start script for Next.js.
 * Uses PORT from env (Vercel, Railway set this) or defaults to 3000.
 */
const { spawn } = require('child_process');
const port = process.env.PORT || '3000';
const child = spawn('npx', ['next', 'start', '-p', port, '-H', '0.0.0.0'], {
  stdio: 'inherit',
  shell: true,
});
child.on('exit', (code) => process.exit(code ?? 0));
