import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { ethers } from "ethers";
import { encryptFileData, decryptFileData } from "./encryption";
import type { EncryptedFile } from "./encryption";

// Upload encrypted file to Irys using AES-256-GCM
export async function uploadEncryptedToIrys(
  fileData: ArrayBuffer,
  fileName: string,
  fileType: string,
  ownerAddress: string,
  recipientAddresses: string[] = [],
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    if (onProgress) onProgress(5);

    // Encrypt the file data with AES-256-GCM
    const { encryptedFile, fileHash } = await encryptFileData(
      fileData,
      recipientAddresses,
      (progress) => {
        if (onProgress) onProgress(5 + (progress * 0.7)); // Encryption takes 70% of progress
      },
      ownerAddress
    );

    if (onProgress) onProgress(75);

    // Initialize Irys using WebUploader
    const rpcURL = "https://1rpc.io/sepolia";
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    const irysUploader = await WebUploader(WebEthereum)
      .withAdapter(EthersV6Adapter(provider))
      .withRpc(rpcURL)
      .devnet();
    
    await irysUploader.ready();

    if (onProgress) onProgress(80);

    // Create metadata for the encrypted file
    const metadata = {
      fileName,
      fileType,
      ownerAddress: ownerAddress.toLowerCase(),
      recipientAddresses: recipientAddresses.map(addr => addr.toLowerCase()),
      encryptionAlgorithm: "AES-256-GCM",
      fileHash,
      encryptedAt: new Date().toISOString(),
    };

    if (onProgress) onProgress(85);

    // Upload the encrypted file to Irys
    const dataToUpload = JSON.stringify({
      encryptedFile,
      metadata
    });
    
    const receipt = await irysUploader.upload(dataToUpload, {
      tags: [
        { name: "Content-Type", value: "application/json" },
        { name: "Encryption-Algorithm", value: "AES-256-GCM" },
        { name: "Owner-Address", value: ownerAddress.toLowerCase() },
        { name: "File-Name", value: fileName },
        { name: "File-Type", value: fileType },
      ]
    });

    if (onProgress) onProgress(100);

    return receipt.id;

  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Download and decrypt file from Irys using AES-256-GCM
export async function downloadAndDecryptFromIrys(
  transactionId: string,
  userAddress: string,
  onProgress?: (progress: number) => void
): Promise<ArrayBuffer> {
  try {
    if (onProgress) onProgress(10);

    // Download the encrypted file from Irys
    const response = await fetch(`https://gateway.irys.xyz/${transactionId}`);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    if (onProgress) onProgress(30);

    // Check if response is JSON (AES format) or HTML (old Lit format)
    const contentType = response.headers.get('content-type');
    let data;
    
    try {
      data = await response.json();
    } catch (jsonError) {
      // If JSON parsing fails, it might be an old Lit Protocol file
      throw new Error('Legacy file format detected. This file was encrypted with the old system and cannot be decrypted with the new AES system.');
    }

    const { encryptedFile, metadata } = data;

    if (onProgress) onProgress(50);

    // Decrypt the file data
    const decryptedData = await decryptFileData(encryptedFile, userAddress);

    if (onProgress) onProgress(100);

    return decryptedData;

  } catch (error) {
    console.error('Download/decrypt error:', error);
    throw new Error(`Download/Decrypt failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Update file access control (add/remove recipients)
export async function updateFileAccessControl(
  transactionId: string,
  newRecipientAddresses: string[],
  ownerAddress: string
): Promise<string> {
  try {
    console.log('🔍 Starting updateFileAccessControl for transaction:', transactionId);
    console.log('📋 New recipients:', newRecipientAddresses);
    console.log('👤 Owner address:', ownerAddress);
    
    // Download current encrypted file
    const response = await fetch(`https://gateway.irys.xyz/${transactionId}`);
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gateway error response:', errorText);
      throw new Error(`Failed to download file: ${response.statusText} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log('📄 Response text length:', responseText.length);
    console.log('📄 Response text preview:', responseText.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Response text:', responseText);
      
      // Check if this is an old Lit Protocol file
      if (responseText.includes('<!doctype') || responseText.includes('<html')) {
        throw new Error('Legacy file format detected. This file was encrypted with the old Lit Protocol system and cannot be updated with the new AES system. Please re-upload the file.');
      }
      
      throw new Error(`Invalid JSON response from gateway: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    const { encryptedFile, metadata } = data;
    console.log('✅ Successfully parsed encrypted file data');
    console.log('🔐 Encrypted keys count:', Object.keys(encryptedFile.encryptedKeys).length);
    console.log('🔑 Available addresses:', Object.keys(encryptedFile.encryptedKeys));

    // Get the original AES key by decrypting it with the owner's signature
    const originalEncryptedKey = encryptedFile.encryptedKeys[ownerAddress.toLowerCase()];
    if (!originalEncryptedKey) {
      console.error('❌ Owner address not found in encrypted keys:', ownerAddress.toLowerCase());
      console.error('❌ Available addresses:', Object.keys(encryptedFile.encryptedKeys));
      throw new Error('Cannot find original AES key for owner');
    }
    console.log('🔑 Found original encrypted key for owner');

    // Decrypt the original AES key using the owner's signature
    const originalKeyBytes = base64ToArrayBuffer(originalEncryptedKey);
    const iv = new Uint8Array(base64ToArrayBuffer(encryptedFile.iv));
    
    const originalMessage = `Encrypt file for sharing`;
    const originalSignature = await getWalletSignature(originalMessage);
    
    // Create the same key derivation approach used in encryption
    const addressKey = `${originalSignature}:${ownerAddress.toLowerCase()}`;
    const keyBytes = new TextEncoder().encode(addressKey);
    const keyHash = await window.crypto.subtle.digest("SHA-256", keyBytes);
    const derivedKey = await window.crypto.subtle.importKey(
      "raw",
      keyHash,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    
    // Decrypt the original AES key
    const rawKey = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      derivedKey,
      originalKeyBytes
    );
    console.log('✅ Original AES key decrypted successfully');

    // Create updated encrypted file with new recipients
    const updatedEncryptedFile: EncryptedFile = {
      encryptedData: encryptedFile.encryptedData, // Keep same encrypted data
      encryptedKeys: { ...encryptedFile.encryptedKeys }, // Copy existing keys
      iv: encryptedFile.iv, // Keep same IV
      algorithm: encryptedFile.algorithm
    };

    // Add new recipients with unique encrypted keys
    for (const address of newRecipientAddresses) {
      console.log(`🔐 Creating unique encrypted key for address: ${address}`);
      
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
      
      const encryptedKey = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        derivedKey,
        rawKey
      );
      
      updatedEncryptedFile.encryptedKeys[address.toLowerCase()] = arrayBufferToBase64(encryptedKey);
      console.log(`✅ Created unique encrypted key for ${address}`);
    }

    console.log('📦 Updated encrypted file object created');

    // Upload the updated encrypted file
    const rpcURL = "https://1rpc.io/sepolia";
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    const irysUploader = await WebUploader(WebEthereum)
      .withAdapter(EthersV6Adapter(provider))
      .withRpc(rpcURL)
      .devnet();
    
    await irysUploader.ready();
    console.log('🚀 Irys uploader ready');

    const updatedMetadata = {
      ...metadata,
      recipientAddresses: [...(metadata.recipientAddresses || []), ...newRecipientAddresses.map(addr => addr.toLowerCase())],
      updatedAt: new Date().toISOString(),
    };

    const dataToUpload = JSON.stringify({
      encryptedFile: updatedEncryptedFile,
      metadata: updatedMetadata
    });
    console.log('📤 Uploading updated file to Irys...');
    
    const receipt = await irysUploader.upload(dataToUpload, {
      tags: [
        { name: "Content-Type", value: "application/json" },
        { name: "Encryption-Algorithm", value: "AES-256-GCM" },
        { name: "Owner-Address", value: ownerAddress.toLowerCase() },
        { name: "File-Name", value: metadata.fileName },
        { name: "File-Type", value: metadata.fileType },
        { name: "Updated", value: "true" },
      ]
    });

    console.log('✅ File uploaded successfully with ID:', receipt.id);
    return receipt.id;

  } catch (error) {
    console.error('❌ Update access control error:', error);
    throw new Error(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper functions
async function getWalletSignature(message: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }
  
  const { ethers } = await import('ethers');
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return await signer.signMessage(message);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
} 