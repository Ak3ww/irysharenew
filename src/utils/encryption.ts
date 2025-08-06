

// Types for our encryption system
export interface EncryptedFile {
  encryptedData: string; // Base64 encoded encrypted file data
  encryptedKey: string; // Single encrypted key for the file
  iv: string; // Initialization vector
  algorithm: string; // Always "AES-256-GCM"
  version?: string; // Encryption version for backward compatibility
  // Legacy support
  encryptedKeys?: Record<string, string>; // Map of address -> encrypted key (legacy)
}

export interface EncryptionResult {
  encryptedFile: EncryptedFile;
  fileHash: string;
  decryptionKey: string; // The actual decryption key for sharing
}

// Generate a random AES key
async function generateAESKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

// Generate a random IV (Initialization Vector)
function generateIV(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(12));
}

// Convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Encrypt data with AES-256-GCM
async function encryptWithAES(
  data: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  return await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data
  );
}

// Decrypt data with AES-256-GCM
async function decryptWithAES(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  return await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedData
  );
}

// Encrypt file data with AES-256-GCM - single key approach
export async function encryptFileData(
  fileData: ArrayBuffer,
  recipientAddresses: string[],
  onProgress?: (progress: number) => void,
  ownerAddress?: string
): Promise<EncryptionResult> {
  try {
    if (onProgress) onProgress(10);

    // Generate a single AES key for this file
    const aesKey = await generateAESKey();
    if (onProgress) onProgress(20);

    // Generate IV
    const iv = generateIV();
    if (onProgress) onProgress(30);

    // Encrypt the file data with AES-256-GCM
    const encryptedData = await encryptWithAES(fileData, aesKey, iv);
    if (onProgress) onProgress(50);

    // Export the AES key as raw bytes for sharing
    const rawKey = await window.crypto.subtle.exportKey("raw", aesKey);
    if (onProgress) onProgress(60);

    // Create a simple encrypted key using owner's address
    const ownerAddressLower = ownerAddress?.toLowerCase() || "owner";
    const keyDerivationString = `file_key:${ownerAddressLower}`;
    const keyBytes = new TextEncoder().encode(keyDerivationString);
    
    // Use a hash-based approach for key derivation
    const keyHash = await window.crypto.subtle.digest("SHA-256", keyBytes);
    const derivedKey = await window.crypto.subtle.importKey(
      "raw",
      keyHash,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );
    
    // Encrypt the AES key with the derived key
    const encryptedKey = await encryptWithAES(rawKey, derivedKey, iv);
    const encryptedKeyBase64 = arrayBufferToBase64(encryptedKey);

    if (onProgress) onProgress(90);

    // Create the encrypted file object
    const encryptedFile: EncryptedFile = {
      encryptedData: arrayBufferToBase64(encryptedData),
      encryptedKey: encryptedKeyBase64,
      iv: arrayBufferToBase64(iv),
      algorithm: "AES-256-GCM",
      version: "3.0" // New version with single key approach
    };

    // Generate file hash for identification
    const fileHash = await window.crypto.subtle.digest("SHA-256", fileData);
    const fileHashHex = Array.from(new Uint8Array(fileHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Create the decryption key for sharing
    const decryptionKey = arrayBufferToBase64(rawKey);

    if (onProgress) onProgress(100);
    
    return {
      encryptedFile,
      fileHash: fileHashHex,
      decryptionKey
    };

  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Decrypt file data with AES-256-GCM
export async function decryptFileData(
  encryptedFile: EncryptedFile,
  userAddress: string
): Promise<ArrayBuffer> {
  try {
    console.log('🔓 Starting decryption for user:', userAddress);
    const userAddressLower = userAddress.toLowerCase();
    console.log('🔍 User address (lowercase):', userAddressLower);
    
    // Get the encrypted key
    const encryptedKeyBase64 = encryptedFile.encryptedKey;
    console.log('🔑 Found encrypted key for user');
    const encryptedKey = base64ToArrayBuffer(encryptedKeyBase64);
    
    // Get IV
    const iv = new Uint8Array(base64ToArrayBuffer(encryptedFile.iv));
    console.log('🔢 IV extracted');
    
    // Check if this is a legacy file (no version or version < 2.0)
    const isLegacyFile = !encryptedFile.version || encryptedFile.version < "2.0";
    console.log('📋 File version:', encryptedFile.version || 'legacy');
    console.log('🔄 Is legacy file:', isLegacyFile);
    
    if (isLegacyFile) {
      // Handle legacy files with the old approach
      console.log('🔄 Using legacy decryption approach...');
      
      // For legacy files, we need to check if user has access
      if (encryptedFile.encryptedKeys && encryptedFile.encryptedKeys[userAddressLower]) {
        // Use the old individual key approach
        const userEncryptedKey = encryptedFile.encryptedKeys[userAddressLower];
        const userKeyBytes = new TextEncoder().encode(`file_key:${userAddressLower}`);
        const userKeyHash = await window.crypto.subtle.digest("SHA-256", userKeyBytes);
        const userDerivedKey = await window.crypto.subtle.importKey(
          "raw",
          userKeyHash,
          { name: "AES-GCM" },
          false,
          ["decrypt"]
        );
        
        const rawKey = await decryptWithAES(base64ToArrayBuffer(userEncryptedKey), userDerivedKey, iv);
        const aesKey = await window.crypto.subtle.importKey(
          "raw",
          rawKey,
          { name: "AES-GCM" },
          false,
          ["decrypt"]
        );
        
        const encryptedData = base64ToArrayBuffer(encryptedFile.encryptedData);
        const decryptedData = await decryptWithAES(encryptedData, aesKey, iv);
        console.log('✅ Legacy decryption successful');
        
        return decryptedData;
      } else {
        throw new Error('Access denied: User not authorized for this legacy file');
      }
    } else {
      // Use new individual key derivation approach for new files
      console.log('🆕 Using new individual key derivation approach...');
      const addressKey = `file_key:${userAddressLower}`;
      console.log('🔑 Creating address key:', addressKey);
      console.log('🔍 Address key length:', addressKey.length);
      const keyBytes = new TextEncoder().encode(addressKey);
      
      // Use the same hash-based approach for key derivation
      console.log('🔐 Deriving key from address key...');
      const keyHash = await window.crypto.subtle.digest("SHA-256", keyBytes);
      console.log('🔍 Key hash length:', keyHash.byteLength);
      const derivedKey = await window.crypto.subtle.importKey(
        "raw",
        keyHash,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );
      console.log('✅ Derived key created');
      
      // Decrypt the AES key
      console.log('🔓 Decrypting AES key...');
      console.log('🔍 Encrypted key length:', encryptedKey.byteLength);
      console.log('🔍 IV length:', iv.byteLength);
      const rawKey = await decryptWithAES(encryptedKey, derivedKey, iv);
      console.log('✅ AES key decrypted successfully');
      
      // Import the AES key
      console.log('🔑 Importing AES key...');
      const aesKey = await window.crypto.subtle.importKey(
        "raw",
        rawKey,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );
      console.log('✅ AES key imported');
      
      // Decrypt the file data
      console.log('🔓 Decrypting file data...');
      const encryptedData = base64ToArrayBuffer(encryptedFile.encryptedData);
      const decryptedData = await decryptWithAES(encryptedData, aesKey, iv);
      console.log('✅ File data decrypted successfully');
      
      return decryptedData;
    }

  } catch (error) {
    console.error('❌ Decryption error:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Check if a user has access to decrypt a file
export async function checkUserAccess(
  encryptedFile: EncryptedFile,
  userAddress: string
): Promise<boolean> {
  // For new files (version 3.0+), anyone with the key can decrypt
  if (encryptedFile.version && encryptedFile.version >= "3.0") {
    return true; // Key-based access control
  }
  
  // For legacy files, check if user has an encrypted key
  const userAddressLower = userAddress.toLowerCase();
  return !!(encryptedFile.encryptedKeys && Object.prototype.hasOwnProperty.call(encryptedFile.encryptedKeys, userAddressLower));
} 