const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🚀 Setting up Linktree Backend...');

// Check if linktree-api directory exists
const apiPath = path.join(__dirname, '../../linktree-api');
if (!fs.existsSync(apiPath)) {
  console.error('❌ linktree-api directory not found!');
  console.log('Please ensure the linktree-api folder is in the project root.');
  process.exit(1);
}

// Check if package.json exists in linktree-api
const packageJsonPath = path.join(apiPath, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found in linktree-api!');
  process.exit(1);
}

// Install dependencies if node_modules doesn't exist
const nodeModulesPath = path.join(apiPath, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing API dependencies...');
  exec('npm install', { cwd: apiPath }, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Failed to install dependencies:', error);
      return;
    }
    console.log('✅ Dependencies installed successfully!');
    startServer();
  });
} else {
  console.log('✅ Dependencies already installed.');
  startServer();
}

function startServer() {
  console.log('🔧 Starting Linktree API server...');
  
  // Create .env file if it doesn't exist
  const envPath = path.join(apiPath, '.env');
  if (!fs.existsSync(envPath)) {
    const envContent = `PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
`;
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file with default settings.');
  }
  
  // Start the server
  const serverProcess = exec('npm start', { cwd: apiPath });
  
  serverProcess.stdout.on('data', (data) => {
    console.log(`📡 API: ${data.toString().trim()}`);
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`❌ API Error: ${data.toString().trim()}`);
  });
  
  serverProcess.on('close', (code) => {
    console.log(`🔴 API server stopped with code ${code}`);
  });
  
  // Give the server time to start
  setTimeout(() => {
    console.log('\n🎉 Backend setup complete!');
    console.log('📡 API Server: http://localhost:3001');
    console.log('🧪 Test endpoint: http://localhost:3001/api/test');
    console.log('\n💡 Demo credentials:');
    console.log('   Email: demo@example.com');
    console.log('   Password: demo123 (if you create this user)');
  }, 2000);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down backend setup...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Backend setup terminated.');
  process.exit(0);
});
