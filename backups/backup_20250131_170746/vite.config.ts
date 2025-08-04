import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Enable polyfills for specific globals.
      globals: {
        Buffer: true,
        global: true,
process: true,
},
// Enable polyfill for node protocol imports.
protocolImports: true,
}),
],
resolve: {
alias: {
// You can add other aliases here if needed
},
},
});