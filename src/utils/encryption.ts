import { ethers } from "ethers";

// Types for our encryption system
export interface EncryptedFile {
  encryptedData: string; // Base64 encoded encrypted file data
  encryptedKeys: Record<string, string>; // Map of address -> encrypted key
  iv: string; // Initialization vector
  algorithm: string; // Always "AES-256-GCM"
}

export interface EncryptionResult {
  encryptedFile: EncryptedFile;
  fileHash: string;
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

// Get user's wallet signature for authentication
async function getWalletSignature(message: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return await signer.signMessage(message);
}

// Encrypt file data with AES-256-GCM for specific addresses
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

    // Export the AES key as raw bytes
    const rawKey = await window.crypto.subtle.exportKey("raw", aesKey);
    if (onProgress) onProgress(60);

    // Create list of all addresses that should have access
    const allowedAddresses = [...recipientAddresses];
    if (ownerAddress) {
      allowedAddresses.push(ownerAddress);
    }

    // Encrypt the AES key uniquely for each allowed address
    const encryptedKeys: Record<string, string> = {};
    
    for (const address of allowedAddresses) {
      // Get signature for this specific address
      const message = `Encrypt file for sharing`;
      const signature = await getWalletSignature(message);
      
      // Create a unique key for this address using their signature
      const addressKey = `${signature}:${address.toLowerCase()}`;
      const keyBytes = new TextEncoder().encode(addressKey);
      
      // Use a simple hash-based approach for key derivation
      const keyHash = await window.crypto.subtle.digest("SHA-256", keyBytes);
      const derivedKey = await window.crypto.subtle.importKey(
        "raw",
        keyHash,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
      );
      
      const encryptedKey = await encryptWithAES(rawKey, derivedKey, iv);
      encryptedKeys[address.toLowerCase()] = arrayBufferToBase64(encryptedKey);
    }

    if (onProgress) onProgress(90);

    // Create the encrypted file object
    const encryptedFile: EncryptedFile = {
      encryptedData: arrayBufferToBase64(encryptedData),
      encryptedKeys,
      iv: arrayBufferToBase64(iv),
      algorithm: "AES-256-GCM"
    };

    // Generate file hash for identification
    const fileHash = await window.crypto.subtle.digest("SHA-256", fileData);
    const fileHashHex = Array.from(new Uint8Array(fileHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (onProgress) onProgress(100);
    
    return {
      encryptedFile,
      fileHash: fileHashHex
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
    
    // Check if user has access to this file
    console.log('🔑 Available encrypted keys:', Object.keys(encryptedFile.encryptedKeys));
    if (!encryptedFile.encryptedKeys[userAddressLower]) {
      console.error('❌ User address not found in encrypted keys');
      console.error('❌ User address:', userAddressLower);
      console.error('❌ Available addresses:', Object.keys(encryptedFile.encryptedKeys));
      throw new Error(`Access denied: Address ${userAddress} not authorized to decrypt this file`);
    }
    console.log('✅ User has access to this file');

    // Get the encrypted key for this specific user
    const encryptedKeyBase64 = encryptedFile.encryptedKeys[userAddressLower];
    console.log('🔑 Found encrypted key for user');
    const encryptedKey = base64ToArrayBuffer(encryptedKeyBase64);
    
    // Get IV
    const iv = new Uint8Array(base64ToArrayBuffer(encryptedFile.iv));
    console.log('🔢 IV extracted');
    
    // Create the same unique key derivation approach used in encryption
    const currentUserMessage = `Encrypt file for sharing`;
    console.log('✍️ Getting signature for message:', currentUserMessage);
    const currentUserSignature = await getWalletSignature(currentUserMessage);
    console.log('✅ Signature obtained');
    
    // Create the same unique key for this specific address
    const addressKey = `${currentUserSignature}:${userAddressLower}`;
    console.log('🔑 Creating address key:', addressKey);
    const keyBytes = new TextEncoder().encode(addressKey);
    
    // Use the same hash-based approach for key derivation
    console.log('🔐 Deriving key from address key...');
    const keyHash = await window.crypto.subtle.digest("SHA-256", keyBytes);
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
  const userAddressLower = userAddress.toLowerCase();
  return Object.prototype.hasOwnProperty.call(encryptedFile.encryptedKeys, userAddressLower);
} 