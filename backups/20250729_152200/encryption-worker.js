// Web Worker for Libsodium encryption
importScripts('https://unpkg.com/libsodium-wrappers@0.7.13/dist/browsers/combined/libsodium-wrappers.js');

// Initialize sodium
sodium.ready.then(() => {
  console.log('Libsodium Web Worker ready');
}).catch(error => {
  console.error('Failed to initialize Libsodium in Web Worker:', error);
});

// Generate encryption key from wallet address (deterministic)
function generateKeyFromAddress(address) {
  const hash = sodium.crypto_generichash(32, address.toLowerCase());
  return hash;
}

// Handle messages from main thread
self.onmessage = async function(e) {
  const { fileData, address, fileName, fileType, messageId } = e.data;
  
  try {
    console.log('Web Worker: Starting encryption for', fileName, 'Size:', fileData.length, 'bytes');
    
    // Wait for sodium to be ready
    await sodium.ready;
    
    // Generate key from wallet address
    const key = generateKeyFromAddress(address);
    
    // Generate random nonce (use the correct constant for ChaCha20-Poly1305)
    const nonce = sodium.randombytes_buf(sodium.crypto_aead_chacha20poly1305_NPUBBYTES);
    
    // Encrypt the file using ChaCha20-Poly1305
    console.log('Web Worker: Encrypting with Libsodium ChaCha20-Poly1305...');
    const encryptedData = sodium.crypto_aead_chacha20poly1305_encrypt(
      fileData,
      null, // No additional data
      null, // No secret key (uses the key parameter)
      nonce,
      key
    );
    
    console.log('Web Worker: File encrypted successfully');
    console.log('Web Worker: Original size:', fileData.length, 'bytes');
    console.log('Web Worker: Encrypted size:', encryptedData.length, 'bytes');
    
    // Send result back to main thread
    self.postMessage({
      type: 'success',
      messageId,
      encryptedData: encryptedData,
      nonce: nonce,
      originalSize: fileData.length,
      encryptedSize: encryptedData.length
    });
    
  } catch (error) {
    console.error('Web Worker: Encryption error:', error);
    self.postMessage({
      type: 'error',
      messageId,
      error: error.message || 'Unknown encryption error'
    });
  }
}; 