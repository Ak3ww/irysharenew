import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { ethers } from "ethers";
import { encryptFileData, decryptFileData, EncryptedFile } from "./encryption";

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
    console.log('[AES-Irys] Starting encryption and upload...');
    
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

    // Initialize Irys
    const irys = new Irys({
      url: "https://node2.irys.xyz",
      token: "ethereum",
      key: process.env.REACT_APP_IRYS_PRIVATE_KEY || "",
    });

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
    const receipt = await irys.upload(JSON.stringify({
      encryptedFile,
      metadata
    }), {
      tags: [
        { name: "Content-Type", value: "application/json" },
        { name: "Encryption-Algorithm", value: "AES-256-GCM" },
        { name: "Owner-Address", value: ownerAddress.toLowerCase() },
        { name: "File-Name", value: fileName },
        { name: "File-Type", value: fileType },
      ]
    });

    if (onProgress) onProgress(100);

    console.log('[AES-Irys] File uploaded successfully:', receipt.id);
    return receipt.id;

  } catch (error) {
    console.error('AES Irys upload error:', error);
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
    console.log('[AES-Irys] Downloading and decrypting file from:', transactionId);
    
    if (onProgress) onProgress(10);

    // Download the encrypted file from Irys
    const response = await fetch(`https://gateway.irys.xyz/${transactionId}`);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    if (onProgress) onProgress(30);

    const data = await response.json();
    const { encryptedFile, metadata } = data;

    if (onProgress) onProgress(50);

    console.log('[AES-Irys] Proceeding to decryption - access will be validated');

    // Decrypt the file data
    const decryptedData = await decryptFileData(encryptedFile, userAddress);

    if (onProgress) onProgress(100);

    console.log('[AES-Irys] Decryption completed successfully');
    return decryptedData;

  } catch (error) {
    console.error('AES Irys download/decrypt error:', error);
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
    console.log('[AES-Irys] Updating file access control...');

    // Download current encrypted file
    const response = await fetch(`https://gateway.irys.xyz/${transactionId}`);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const data = await response.json();
    const { encryptedFile, metadata } = data;

    // Create new encrypted file with updated recipients
    const updatedEncryptedFile: EncryptedFile = {
      encryptedData: encryptedFile.encryptedData, // Keep the same encrypted data
      encryptedKeys: {}, // Will be populated with new keys
      iv: encryptedFile.iv,
      algorithm: encryptedFile.algorithm
    };

    // Re-encrypt the AES key for all addresses (owner + new recipients)
    const allAddresses = [...newRecipientAddresses, ownerAddress];
    
    for (const address of allAddresses) {
      // Create a unique message for each address
      const message = `Decrypt file for address: ${address.toLowerCase()}`;
      
      // Get signature from the current user (file owner)
      const signature = await getWalletSignature(message);
      
      // Use the signature as a key to encrypt the AES key
      const signatureBytes = new TextEncoder().encode(signature);
      const derivedKey = await window.crypto.subtle.importKey(
        "raw",
        signatureBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
      );
      
      // Get the original AES key (we need to decrypt it first)
      const originalEncryptedKey = encryptedFile.encryptedKeys[ownerAddress.toLowerCase()];
      if (!originalEncryptedKey) {
        throw new Error('Cannot find original AES key for owner');
      }

      // Decrypt the original AES key
      const originalKeyBytes = base64ToArrayBuffer(originalEncryptedKey);
      const iv = new Uint8Array(base64ToArrayBuffer(encryptedFile.iv));
      
      const originalMessage = `Decrypt file for address: ${ownerAddress.toLowerCase()}`;
      const originalSignature = await getWalletSignature(originalMessage);
      const originalSignatureBytes = new TextEncoder().encode(originalSignature);
      const originalDerivedKey = await window.crypto.subtle.importKey(
        "raw",
        originalSignatureBytes,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );
      
      const rawKey = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        originalDerivedKey,
        originalKeyBytes
      );
      
      // Re-encrypt the AES key for this address
      const encryptedKey = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        derivedKey,
        rawKey
      );
      
      updatedEncryptedFile.encryptedKeys[address.toLowerCase()] = arrayBufferToBase64(encryptedKey);
    }

    // Upload the updated encrypted file
    const irys = new Irys({
      url: "https://node2.irys.xyz",
      token: "ethereum",
      key: process.env.REACT_APP_IRYS_PRIVATE_KEY || "",
    });

    const updatedMetadata = {
      ...metadata,
      recipientAddresses: newRecipientAddresses.map(addr => addr.toLowerCase()),
      updatedAt: new Date().toISOString(),
    };

    const receipt = await irys.upload(JSON.stringify({
      encryptedFile: updatedEncryptedFile,
      metadata: updatedMetadata
    }), {
      tags: [
        { name: "Content-Type", value: "application/json" },
        { name: "Encryption-Algorithm", value: "AES-256-GCM" },
        { name: "Owner-Address", value: ownerAddress.toLowerCase() },
        { name: "File-Name", value: metadata.fileName },
        { name: "File-Type", value: metadata.fileType },
        { name: "Updated", value: "true" },
      ]
    });

    console.log('[AES-Irys] File access control updated successfully:', receipt.id);
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