// @ts-expect-error - libsodium-wrappers has no type definitions
import sodium from 'libsodium-wrappers';

// Initialize sodium
await sodium.ready;

// Generate encryption key from wallet address (deterministic)
function generateKeyFromAddress(address: string): Uint8Array {
  return sodium.crypto_generichash(32, address.toLowerCase());
}

// Generate shared encryption key for multiple recipients
function generateSharedKey(ownerAddress: string, recipientAddresses: string[]): Uint8Array {
  // Normalize all addresses to lowercase for consistency
  const normalizedOwner = ownerAddress.toLowerCase().trim();
  const normalizedRecipients = recipientAddresses.map(addr => addr.toLowerCase().trim());
  
  // Sort addresses for deterministic key generation
  const sortedAddresses = [...normalizedRecipients, normalizedOwner].sort();
  const combinedAddresses = sortedAddresses.join('|');
  
  console.log('Generating shared key with addresses:', sortedAddresses);
  console.log('Combined string:', combinedAddresses);
  
  const key = sodium.crypto_generichash(32, combinedAddresses);
  console.log('Generated key length:', key.length);
  
  return key;
}

// Generate individual recipient keys for access control (unused but kept for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateRecipientKey(ownerAddress: string, recipientAddress: string): Uint8Array {
  const combined = `${ownerAddress.toLowerCase()}|${recipientAddress.toLowerCase()}`;
  return sodium.crypto_generichash(32, combined);
}

// Optimized encryption function for sharing (supports multiple recipients)
export async function encryptFileForSharing(
  file: File,
  ownerAddress: string,
  recipientAddresses: string[],
  onProgress?: (progress: number) => void
): Promise<{ encryptedData: Uint8Array; nonce: Uint8Array; sharedKey: Uint8Array }> {
  console.log('Starting encryption for sharing:', file.name, 'Recipients:', recipientAddresses.length);
  console.log('Owner address:', ownerAddress);
  console.log('Recipient addresses:', recipientAddresses);
  
  // Generate shared key for all recipients
  const sharedKey = generateSharedKey(ownerAddress, recipientAddresses);
  
  // Read file as ArrayBuffer for better performance
  const fileBuffer = await file.arrayBuffer();
  const fileData = new Uint8Array(fileBuffer);
  
  console.log('File loaded, starting encryption...');
  if (onProgress) onProgress(25);
  
  // Generate random nonce
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_chacha20poly1305_NPUBBYTES);
  
  // Encrypt the file using ChaCha20-Poly1305 with shared key
  console.log('Encrypting with shared key for multiple recipients...');
  const encryptedData = sodium.crypto_aead_chacha20poly1305_encrypt(
    fileData,
    null, // No additional data
    null, // No secret key (uses the key parameter)
    nonce,
    sharedKey
  );
  
  console.log('Encryption completed successfully');
  console.log('Original size:', fileData.length, 'bytes');
  console.log('Encrypted size:', encryptedData.length, 'bytes');
  
  if (onProgress) onProgress(100);
  
  return { encryptedData, nonce, sharedKey };
}

// Legacy encryption function (for backward compatibility)
export async function encryptFile(
  file: File,
  address: string,
  onProgress?: (progress: number) => void
): Promise<{ encryptedData: Uint8Array; nonce: Uint8Array }> {
  console.log('Starting legacy encryption for file:', file.name, 'Size:', file.size);
  
  // Generate key from wallet address
  const key = generateKeyFromAddress(address);
  
  // Read file as ArrayBuffer for better performance
  const fileBuffer = await file.arrayBuffer();
  const fileData = new Uint8Array(fileBuffer);
  
  console.log('File loaded, starting encryption...');
  if (onProgress) onProgress(25);
  
  // Generate random nonce (use the correct constant for ChaCha20-Poly1305)
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_chacha20poly1305_NPUBBYTES);
  
  // Encrypt the file using ChaCha20-Poly1305
  console.log('Encrypting with Libsodium ChaCha20-Poly1305...');
  const encryptedData = sodium.crypto_aead_chacha20poly1305_encrypt(
    fileData,
    null, // No additional data
    null, // No secret key (uses the key parameter)
    nonce,
    key
  );
  
  console.log('Encryption completed successfully');
  console.log('Original size:', fileData.length, 'bytes');
  console.log('Encrypted size:', encryptedData.length, 'bytes');
  
  if (onProgress) onProgress(100);
  
  return { encryptedData, nonce };
}

// Optimized decryption function for shared files
export async function decryptSharedFile(
  encryptedData: Uint8Array,
  nonce: Uint8Array,
  ownerAddress: string,
  recipientAddresses: string[],
  currentUserAddress: string
): Promise<Uint8Array> {
  console.log('Decrypting shared file with:');
  console.log('Owner address:', ownerAddress);
  console.log('Recipient addresses:', recipientAddresses);
  console.log('Current user address:', currentUserAddress);
  
  // Check if current user is authorized
  const allAddresses = [...recipientAddresses, ownerAddress];
  const isAuthorized = allAddresses.some(addr => addr.toLowerCase() === currentUserAddress.toLowerCase());
  
  console.log('All addresses for authorization check:', allAddresses);
  console.log('Is authorized:', isAuthorized);
  
  if (!isAuthorized) {
    throw new Error('You are not authorized to decrypt this file');
  }
  
  // Generate the same shared key used for encryption
  const sharedKey = generateSharedKey(ownerAddress, recipientAddresses);
  
  console.log('Attempting decryption with shared key...');
  
  const decryptedData = sodium.crypto_aead_chacha20poly1305_decrypt(
    null, // No secret key
    encryptedData,
    null, // No additional data
    nonce,
    sharedKey
  );
  
  console.log('Decryption successful!');
  return decryptedData;
}

// Legacy decryption function (for backward compatibility)
export async function decryptFile(
  encryptedData: Uint8Array,
  nonce: Uint8Array,
  address: string
): Promise<Uint8Array> {
  const key = generateKeyFromAddress(address);
  
  const decryptedData = sodium.crypto_aead_chacha20poly1305_decrypt(
    null, // No secret key
    encryptedData,
    null, // No additional data
    nonce,
    key
  );
  
  return decryptedData;
}

// Upload encrypted file with recipient metadata
export async function uploadEncryptedToIrys(
  encryptedData: Uint8Array,
  nonce: Uint8Array,
  fileName: string,
  fileType: string,
  ownerAddress: string,
  recipientAddresses: string[] = []
): Promise<string> {
  console.log('Preparing encrypted data for upload with recipients:', recipientAddresses);
  
  // Create metadata with recipient information
  const metadata = {
    fileName,
    fileType,
    nonce: Array.from(nonce), // Convert to array for JSON serialization
    encrypted: true,
    ownerAddress: ownerAddress.toLowerCase(),
    recipientAddresses: recipientAddresses.map(addr => addr.toLowerCase()),
    timestamp: Date.now(),
    version: '2.0' // Version for shared encryption
  };
  
  // Convert metadata to JSON and then to bytes
  const metadataJson = JSON.stringify(metadata);
  const metadataBytes = new TextEncoder().encode(metadataJson);
  
  // Create optimized binary format: [4 bytes metadata length][metadata][encrypted data]
  const metadataLength = metadataBytes.length;
  const lengthBuffer = new ArrayBuffer(4);
  const lengthView = new DataView(lengthBuffer);
  lengthView.setUint32(0, metadataLength, false); // Big-endian
  
  // Combine all data efficiently
  const combinedData = new Uint8Array(4 + metadataLength + encryptedData.length);
  combinedData.set(new Uint8Array(lengthBuffer), 0);
  combinedData.set(metadataBytes, 4);
  combinedData.set(encryptedData, 4 + metadataLength);
  
  console.log('Combined data size:', combinedData.length, 'bytes');
  console.log('Metadata size:', metadataLength, 'bytes');
  console.log('Encrypted data size:', encryptedData.length, 'bytes');
  
  // Upload to Irys - always use regular upload for speed
  const irysUploader = await getIrysUploader();
  
  console.log('Using regular upload for encrypted file (simplified for speed)...');
  const tags = [
    { name: "Content-Type", value: "application/octet-stream" },
    { name: "App-Name", value: "IryShare" },
    { name: "File-Name", value: fileName },
    { name: "File-Type", value: recipientAddresses.length > 0 ? "shared" : "private" },
    { name: "Encrypted", value: "true" },
    { name: "Shared", value: recipientAddresses.length > 0 ? "true" : "false" },
    { name: "Owner-Address", value: ownerAddress.toLowerCase() },
    { name: "Recipient-Count", value: recipientAddresses.length.toString() },
    { name: "Upload-Date", value: new Date().toISOString() },
    { name: "Version", value: "2.0" }
  ];
  
  // Convert Uint8Array to Buffer for Irys
  const buffer = Buffer.from(combinedData);
  const result = await irysUploader.upload(buffer, { tags });
  console.log('Regular upload completed:', result);
  return `https://gateway.irys.xyz/${result.id}`;
}

// Generate a deterministic key for any recipient combination


// Enhanced decryption that can handle metadata-based recipient lists
export async function downloadAndDecryptFromIrys(
  url: string,
  address: string,
  onProgress?: (progress: number) => void
): Promise<{ file: File; metadata: any }> {
  console.log('Downloading encrypted file from:', url);
  
  // Extract transaction ID from URL
  let txId = url;
  if (txId.startsWith('https://gateway.irys.xyz/')) {
    txId = txId.replace('https://gateway.irys.xyz/', '');
  }
  
  if (onProgress) onProgress(10);
  
  // Download the encrypted data
  const response = await fetch(`https://gateway.irys.xyz/${txId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch from Irys: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const combinedData = new Uint8Array(arrayBuffer);
  
  if (onProgress) onProgress(30);
  
  // Parse the binary format
  const lengthView = new DataView(combinedData.buffer, 0, 4);
  const metadataLength = lengthView.getUint32(0, false); // Big-endian
  
  const metadataBytes = combinedData.slice(4, 4 + metadataLength);
  const encryptedData = combinedData.slice(4 + metadataLength);
  
  if (onProgress) onProgress(50);
  
  // Parse metadata
  const metadataJson = new TextDecoder().decode(metadataBytes);
  const metadata = JSON.parse(metadataJson);
  
  console.log('Parsed metadata:', metadata);
  console.log('Metadata version:', metadata.version);
  console.log('Metadata recipientAddresses:', metadata.recipientAddresses);
  console.log('Metadata ownerAddress:', metadata.ownerAddress);
  
  // Convert nonce back to Uint8Array
  const nonce = new Uint8Array(metadata.nonce);
  
  if (onProgress) onProgress(70);
  

  
  // Fall back to standard decryption methods
  if (metadata.version === '2.0' && metadata.recipientAddresses) {
    console.log('Decrypting shared file with embedded recipients:', metadata.recipientAddresses);
    console.log('Current user address:', address);
    try {
      const decryptedData = await decryptSharedFile(
        encryptedData, 
        nonce, 
        metadata.ownerAddress, 
        metadata.recipientAddresses, 
        address
      );
      
      if (onProgress) onProgress(90);
      
      // Create file from decrypted data
      const file = new File([decryptedData], metadata.fileName, {
        type: metadata.fileType
      });
      
      if (onProgress) onProgress(100);
      
      console.log('Shared file decrypted successfully:', file.name, file.size, 'bytes');
      return { file, metadata };
    } catch (sharedError) {
      console.log('Shared decryption failed, trying legacy decryption:', sharedError);
      // Fall back to legacy decryption
    }
  }
  
  // Legacy decryption (single user) - also fallback for failed shared decryption
  console.log('Decrypting legacy file...');
  const decryptedData = await decryptFile(encryptedData, nonce, address);
  
  if (onProgress) onProgress(90);
  
  // Create file from decrypted data
  const file = new File([decryptedData], metadata.fileName, {
    type: metadata.fileType
  });
  
  if (onProgress) onProgress(100);
  
  console.log('File decrypted successfully:', file.name, file.size, 'bytes');
  return { file, metadata };
}

// Function to add new recipients to an existing shared file
export async function addRecipientsToFile(
  fileUrl: string,
  newRecipientAddresses: string[],
  ownerAddress: string
): Promise<string> {
  console.log('Adding new recipients to file:', newRecipientAddresses);
  
  // Download and decrypt the file (handles both legacy and shared files)
  const { file, metadata } = await downloadAndDecryptFromIrys(fileUrl, ownerAddress);
  
  // Get existing recipients (if any)
  const existingRecipients = metadata.recipientAddresses || [];
  
  // Combine old and new recipients
  const allRecipients = [...new Set([...existingRecipients, ...newRecipientAddresses])];
  
  console.log('Combining recipients:', { existing: existingRecipients, new: newRecipientAddresses, all: allRecipients });
  
  // Re-encrypt with all recipients using the new sharing system
  const { encryptedData, nonce } = await encryptFileForSharing(
    file,
    metadata.ownerAddress || ownerAddress,
    allRecipients
  );
  
  // Upload with updated metadata
  const newUrl = await uploadEncryptedToIrys(
    encryptedData,
    nonce,
    metadata.fileName,
    metadata.fileType,
    metadata.ownerAddress || ownerAddress,
    allRecipients
  );
  
  console.log('File re-uploaded with new recipients:', allRecipients);
  return newUrl;
}

// Test function
export async function testLibsodiumEncryption(): Promise<boolean> {
  try {
    const testData = new TextEncoder().encode('Hello, Libsodium!');
    const testAddress = '0x1234567890123456789012345678901234567890';
    
    const key = generateKeyFromAddress(testAddress);
    const nonce = sodium.randombytes_buf(sodium.crypto_aead_chacha20poly1305_NPUBBYTES);
    
    const encrypted = sodium.crypto_aead_chacha20poly1305_encrypt(
      testData,
      null,
      null,
      nonce,
      key
    );
    
    const decrypted = sodium.crypto_aead_chacha20poly1305_decrypt(
      null,
      encrypted,
      null,
      nonce,
      key
    );
    
    const result = new TextDecoder().decode(decrypted);
    return result === 'Hello, Libsodium!';
  } catch (error) {
    console.error('Libsodium test failed:', error);
    return false;
  }
}

// Import the Irys uploader function
async function getIrysUploader() {
  const { getIrysUploader } = await import('./irys');
  return getIrysUploader();
} 