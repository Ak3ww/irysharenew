const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Iryshare Linktree API...');

const apiDir = path.join(__dirname, '../api');
const packageJsonPath = path.join(apiDir, 'package.json');

// Check if API directory exists
if (!fs.existsSync(apiDir)) {
  console.error('❌ API directory not found at:', apiDir);
  process.exit(1);
}

// Check if package.json exists
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found in API directory');
  process.exit(1);
}

// Install dependencies if node_modules doesn't exist
const nodeModulesPath = path.join(apiDir, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing API dependencies...');
  
  const install = spawn('npm', ['install'], {
    cwd: apiDir,
    stdio: 'inherit',
    shell: true
  });

  install.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Failed to install dependencies');
      process.exit(code);
    }
    console.log('✅ Dependencies installed successfully!');
    startServer();
  });
} else {
  console.log('✅ Dependencies already installed');
  startServer();
}

function startServer() {
  console.log('🔧 Starting Linktree API server on port 3002...');
  
  const server = spawn('node', ['linktree-server.js'], {
    cwd: apiDir,
    stdio: 'inherit',
    shell: true
  });

  server.on('close', (code) => {
    console.log(`🔴 API server stopped with exit code ${code}`);
  });

  server.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
  });

  // Give the server time to start
  setTimeout(() => {
    console.log('\n🎉 Iryshare Linktree API Setup Complete!');
    console.log('📡 API Server: http://localhost:3002');
    console.log('🧪 Test endpoint: http://localhost:3002/api/test');
    console.log('💾 Database: ./api/linktree.db');
    console.log('📁 Uploads: ./api/uploads/');
    console.log('\n🔗 Wallet-based authentication enabled');
    console.log('   - Connect wallet in Iryshare to auto-create user');
    console.log('   - User data tied to wallet address');
  }, 2000);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Linktree API...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Linktree API terminated');
  process.exit(0);
});
