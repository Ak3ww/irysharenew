import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting Iryshare development environment...\n');

// Start local approval server
const server = spawn('node', ['local-server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

console.log('✅ Local approval server started on http://localhost:3001');

// Start frontend dev server
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

console.log('✅ Frontend dev server starting...\n');

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development servers...');
  server.kill();
  frontend.kill();
  process.exit(0);
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Local server error:', error);
});

frontend.on('error', (error) => {
  console.error('❌ Frontend error:', error);
}); 