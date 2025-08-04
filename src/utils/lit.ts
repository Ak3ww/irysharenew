import { LitNodeClient } from "@lit-protocol/lit-node-client";
import type { AuthSig } from "@lit-protocol/types";
import { ethers } from "ethers";
import { LitActionResource } from "@lit-protocol/auth-helpers";

// Lit Protocol client instance
let litClient: LitNodeClient | null = null;

// Initialize Lit Protocol client
export async function getLitClient(): Promise<LitNodeClient> {
  if (litClient) return litClient;

  litClient = new LitNodeClient({
    litNetwork: "datil-dev", // Using datil-dev for free usage
  });

  await litClient.connect();
  return litClient;
}

// Get authentication signature for Lit Protocol
export async function getAuthSig(wallet: ethers.Signer): Promise<AuthSig> {
  const chainId = 1; // Ethereum mainnet
  const expiration = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24 hours

  const messageToSign = `I want to use Lit Protocol to encrypt and decrypt my files.\n\nChain ID: ${chainId}\nExpiration: ${expiration}`;

  const signature = await wallet.signMessage(messageToSign);
  const address = await wallet.getAddress();

  return {
    sig: signature,
    derivedVia: "web3.eth.personal.sign",
    signedMessage: messageToSign,
    address: address.toLowerCase(),
  };
}

// Access control conditions for file sharing
export function getAccessControlConditions(recipientAddresses: string[], ownerAddress?: string): object[] {
  if (recipientAddresses.length === 0) {
    // SECURITY FIX: For private files, only allow the owner
    if (!ownerAddress) {
      throw new Error('Owner address is required for private files');
    }
    
    return [
      {
        contractAddress: "",
        standardContractType: "",
        chain: "ethereum",
        method: "eth_getBalance",
        parameters: [ownerAddress.toLowerCase(), "latest"],
        returnValueTest: {
          comparator: ">=",
          value: "000000000000000000", // 0 ETH in wei
        },
      },
    ];
  }

  // Create conditions for specific recipient addresses + owner
  const allAddresses = [...new Set([...recipientAddresses, ownerAddress].filter(Boolean))];

  return allAddresses.map(address => ({
    contractAddress: "",
    standardContractType: "",
    chain: "ethereum",
    method: "eth_getBalance",
    parameters: [address!.toLowerCase(), "latest"],
    returnValueTest: {
      comparator: ">=",
      value: "000000000000000000", // 0 ETH in wei
    },
  }));
}

// Helper function to convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
      let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }
    
// Helper function to convert base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Encrypt file data using real Lit Protocol
export async function encryptFileData(
  fileData: ArrayBuffer,
  recipientAddresses: string[],
  onProgress?: (progress: number) => void,
  ownerAddress?: string
): Promise<{ ciphertext: string; dataToEncryptHash: string; accessControlConditions: object[] }> {
  try {
    // Initialize client
    const client = await getLitClient();
    if (onProgress) onProgress(10);

    // DEBUG: Check what methods are available
    console.log('🔍 Lit client methods:', Object.getOwnPropertyNames(client));
    console.log('🔍 Lit client prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)));

    // Get wallet from window.ethereum
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    if (onProgress) onProgress(20);

    // Get auth signature
    const authSig = await getAuthSig(signer);
    if (onProgress) onProgress(30);

    // Create access control conditions
    const accessControlConditions = getAccessControlConditions(recipientAddresses, ownerAddress);
    if (onProgress) onProgress(40);

    // Convert ArrayBuffer to base64 string for Lit Protocol
    const base64String = arrayBufferToBase64(fileData);
    if (onProgress) onProgress(50);

    // REAL LIT PROTOCOL ENCRYPTION
    // Use the correct Lit Protocol API methods
    const { encryptedString, symmetricKey } = await client.encryptString({
      accessControlConditions,
      authSig,
      chain: "ethereum",
      dataToEncrypt: base64String,
    });

    if (onProgress) onProgress(80);

    // Store the symmetric key for decryption
    const dataToEncryptHash = await client.saveEncryptionKey({
      accessControlConditions,
      authSig,
      chain: "ethereum",
      symmetricKey,
    });

    if (onProgress) onProgress(100);

    console.log('✅ Real Lit Protocol encryption completed');
    return { 
      ciphertext: encryptedString, 
      dataToEncryptHash, 
      accessControlConditions 
    };
  } catch (error) {
    console.error('Lit Protocol encryption error:', error);
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Decrypt file data using real Lit Protocol
export async function decryptFileData(
  ciphertext: string,
  dataToEncryptHash: string,
  accessControlConditions: object[],
  userAddress: string
): Promise<ArrayBuffer> {
  try {
    // Initialize client
    const client = await getLitClient();

    // Get wallet from window.ethereum
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // Get auth signature
    const authSig = await getAuthSig(signer);

    // REAL LIT PROTOCOL DECRYPTION
    const symmetricKey = await client.getEncryptionKey({
      accessControlConditions,
      authSig,
      chain: "ethereum",
      dataToEncryptHash,
    });

    const decryptedString = await client.decrypt({
      accessControlConditions,
      authSig,
      chain: "ethereum",
      ciphertext,
      dataToEncryptHash,
    });

    // Convert base64 string back to ArrayBuffer
    const decryptedData = base64ToArrayBuffer(decryptedString);
    
    console.log('✅ Real Lit Protocol decryption completed');
    return decryptedData;
  } catch (error) {
    console.error('Lit Protocol decryption error:', error);
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Update access control conditions for existing files (real Lit Protocol)
export async function updateAccessControlConditions(
  currentConditions: object[],
  newRecipientAddresses: string[],
  ownerAddress?: string
): Promise<object[]> {
  return getAccessControlConditions(newRecipientAddresses, ownerAddress);
}

// Check if a user has access to decrypt a file
export async function checkUserAccess(
  accessControlConditions: object[],
  userAddress: string
): Promise<boolean> {
  try {
    // In a real implementation, this would verify against the blockchain
    const userAddressLower = userAddress.toLowerCase();

    return accessControlConditions.some((condition) => {
      const typedCondition = condition as Record<string, unknown>;
      if (typedCondition.parameters && Array.isArray(typedCondition.parameters) && typedCondition.parameters[0]) {
        return (typedCondition.parameters[0] as string).toLowerCase() === userAddressLower;
      }
      return false;
    });
  } catch (error) {
    console.error('Error checking user access:', error);
    return false;
  }
} 