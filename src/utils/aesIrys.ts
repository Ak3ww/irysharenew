import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { ethers } from "ethers";
import { encryptFileData, decryptFileData, decryptFileDataWithSharedKey } from "./encryption";
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
    const { encryptedFile, fileHash, decryptionKey } = await encryptFileData(
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
      decryptionKey, // Include the decryption key for sharing
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
    // Error handled silently
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
      // Error handled silently
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    if (onProgress) onProgress(30);

    // Check if response is JSON (AES format) or HTML (old Lit format)
    const contentType = response.headers.get('content-type');
    let data;
    
    try {
      data = await response.json();

    } catch (jsonError) {
      // Error handled silently
      // If JSON parsing fails, it might be an old Lit Protocol file
      throw new Error('Legacy file format detected. This file was encrypted with the old system and cannot be decrypted with the new AES system.');
    }

    const { encryptedFile, metadata } = data;

    if (onProgress) onProgress(50);

    // Decrypt the file data

    let decryptedData: ArrayBuffer;
    
    // Try to use the shared decryption key first (for shared files)
    if (metadata.decryptionKey) {
      try {
        decryptedData = await decryptFileDataWithSharedKey(encryptedFile, metadata.decryptionKey);
        } catch (error) {
          // Error handled silently
          decryptedData = await decryptFileData(encryptedFile, userAddress);
        }
    } else {
      // Fall back to address-based decryption (for private files)
      decryptedData = await decryptFileData(encryptedFile, userAddress);
    }
    
    if (onProgress) onProgress(100);

    return decryptedData;

  } catch (error) {
    // Error handled silently
    throw new Error(`Download/Decrypt failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Update file access control (add/remove recipients) for AES-256-GCM files
export async function updateFileAccessControl(
  transactionId: string,
  newRecipientAddresses: string[],
  ownerAddress: string
): Promise<string> {
  try {
    // Download current encrypted file
    const response = await fetch(`https://gateway.irys.xyz/${transactionId}`);
    if (!response.ok) {
      const errorText = await response.text();
      // Error handled silently
      throw new Error(`Failed to download file: ${response.statusText} - ${errorText}`);
    }

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      // Error handled silently// Error handled silently// Check if this is an old Lit Protocol file
      if (responseText.includes('<!doctype') || responseText.includes('<html')) {
        throw new Error('Legacy file format detected. This file was encrypted with the old Lit Protocol system and cannot be updated with the new AES system. Please re-upload the file.');
      }
      
      throw new Error(`Invalid JSON response from gateway: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    const { encryptedFile, metadata } = data;
    // Check if this is a new AES file (version 3.0+) with shared key
    if (encryptedFile.version && encryptedFile.version >= "3.0") {
      // For version 3.0+, we simply update the metadata with new recipients
      // The shared key approach means all recipients use the same decryptionKey
      const updatedMetadata = {
        ...metadata,
        recipientAddresses: [...new Set([...(metadata.recipientAddresses || []), ...newRecipientAddresses.map(addr => addr.toLowerCase())])],
        updatedAt: new Date().toISOString(),
      };

      // Upload the file with updated metadata (same encrypted file, updated recipient list)
      const rpcURL = "https://1rpc.io/sepolia";
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const irysUploader = await WebUploader(WebEthereum)
        .withAdapter(EthersV6Adapter(provider))
        .withRpc(rpcURL)
        .devnet();
      
      await irysUploader.ready();
      const dataToUpload = JSON.stringify({
        encryptedFile, // Keep the same encrypted file
        metadata: updatedMetadata // Update metadata with new recipients
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
      
    } else {
      // Handle legacy files (version < 3.0) with individual keys
      if (!encryptedFile.encryptedKeys || typeof encryptedFile.encryptedKeys !== 'object') {
        throw new Error('Legacy file format: encryptedKeys not found or invalid');
      }

      // Get the original AES key by decrypting it with the owner's signature
      const originalEncryptedKey = encryptedFile.encryptedKeys[ownerAddress.toLowerCase()];
      if (!originalEncryptedKey) {
        // Error handled silently);
        // Error handled silently);
        throw new Error('Cannot find original AES key for owner');
      }
      // Decrypt the original AES key using the owner's address-based key derivation
      const originalKeyBytes = base64ToArrayBuffer(originalEncryptedKey);
      const iv = new Uint8Array(base64ToArrayBuffer(encryptedFile.iv));
      
      // Use the same address-based key derivation approach used in encryption
      const addressKey = `file_key:${ownerAddress.toLowerCase()}`;
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
      // Create updated encrypted file with new recipients
      const updatedEncryptedFile: EncryptedFile = {
        encryptedData: encryptedFile.encryptedData,
        encryptedKey: encryptedFile.encryptedKey,
        iv: encryptedFile.iv,
        algorithm: encryptedFile.algorithm,
        version: encryptedFile.version || "2.0",
        encryptedKeys: { ...encryptedFile.encryptedKeys }
      };

      // Add new recipients with individual key derivation
      for (const address of newRecipientAddresses) {
        // Create a unique key derivation for each address
        const addressKey = `file_key:${address.toLowerCase()}`;
        const keyBytes = new TextEncoder().encode(addressKey);
        
        // Use a hash-based approach for key derivation
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
        
        if (updatedEncryptedFile.encryptedKeys) {
          updatedEncryptedFile.encryptedKeys[address.toLowerCase()] = arrayBufferToBase64(encryptedKey);
        }
        }

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
        recipientAddresses: [...new Set([...(metadata.recipientAddresses || []), ...newRecipientAddresses.map(addr => addr.toLowerCase())])],
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
    }

  } catch (error) {
    // Error handled silently
    throw new Error(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper functions

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