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
    // Download current encrypted file
    const response = await fetch(`https://gateway.irys.xyz/${transactionId}`);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const data = await response.json();
    const { encryptedFile, metadata } = data;

    // First, decrypt the original file data using the owner's signature
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
    
    // Get the original AES key
    const originalEncryptedKey = encryptedFile.encryptedKeys[ownerAddress.toLowerCase()];
    if (!originalEncryptedKey) {
      throw new Error('Cannot find original AES key for owner');
    }

    const originalKeyBytes = base64ToArrayBuffer(originalEncryptedKey);
    const iv = new Uint8Array(base64ToArrayBuffer(encryptedFile.iv));
    
    // Decrypt the original AES key
    const rawKey = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      derivedKey,
      originalKeyBytes
    );
    
    // Import the AES key
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    
    // Decrypt the file data
    const encryptedData = base64ToArrayBuffer(encryptedFile.encryptedData);
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      encryptedData
    );

    // Now re-encrypt the file data with the new recipients
    const allAddresses = [...newRecipientAddresses, ownerAddress];
    
    // Generate new AES key for the updated file
    const newAesKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    
    // Generate new IV
    const newIv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the file data with the new AES key
    const newEncryptedData = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: newIv },
      newAesKey,
      decryptedData
    );
    
    // Export the new AES key as raw bytes
    const newRawKey = await window.crypto.subtle.exportKey("raw", newAesKey);
    
    // Encrypt the new AES key for all addresses
    const newEncryptedKeys: Record<string, string> = {};
    const currentUserMessage = `Encrypt file for sharing`;
    const currentUserSignature = await getWalletSignature(currentUserMessage);
    
    for (const address of allAddresses) {
      // Create a unique key for each address using the current user's signature
      const addressKey = `${currentUserSignature}:${address.toLowerCase()}`;
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
        { name: "AES-GCM", iv: newIv },
        derivedKey,
        newRawKey
      );
      
      newEncryptedKeys[address.toLowerCase()] = arrayBufferToBase64(encryptedKey);
    }

    // Create the updated encrypted file object
    const updatedEncryptedFile: EncryptedFile = {
      encryptedData: arrayBufferToBase64(newEncryptedData),
      encryptedKeys: newEncryptedKeys,
      iv: arrayBufferToBase64(newIv),
      algorithm: "AES-256-GCM"
    };

    // Upload the updated encrypted file
    const rpcURL = "https://1rpc.io/sepolia";
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    const irysUploader = await WebUploader(WebEthereum)
      .withAdapter(EthersV6Adapter(provider))
      .withRpc(rpcURL)
      .devnet();
    
    await irysUploader.ready();

    const updatedMetadata = {
      ...metadata,
      recipientAddresses: newRecipientAddresses.map(addr => addr.toLowerCase()),
      updatedAt: new Date().toISOString(),
    };

    const dataToUpload = JSON.stringify({
      encryptedFile: updatedEncryptedFile,
      metadata: updatedMetadata
    });
    
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

    return receipt.id;

  } catch (error) {
    console.error('Update access control error:', error);
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