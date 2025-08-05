import { LitNodeClient } from "@lit-protocol/lit-node-client";
import type { AuthSig } from "@lit-protocol/types";
import { ethers } from "ethers";
import { SiweMessage } from "siwe";

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

// Access control conditions for file sharing
export function getAccessControlConditions(
  recipientAddresses: string[] = [],
  ownerAddress?: string
): object[] {
  const allowedAddresses = [...recipientAddresses];
  if (ownerAddress) allowedAddresses.push(ownerAddress);
  // Keep addresses in their original format (checksummed) for consistency
  const normalizedAddresses = allowedAddresses.map(addr => addr);

  if (normalizedAddresses.length === 0) {
    // If no addresses, allow any wallet (private to self)
    const cond = [{
      contractAddress: "",
      standardContractType: "",
      chain: "ethereum",
      method: "eth_getBalance",
      parameters: [":userAddress", "latest"],
      returnValueTest: {
        comparator: ">=",
        value: "000000000000000000",
      },
    }];
    console.log('[Lit] accessControlConditions (private):', cond);
    return cond;
  }

  // For shared files, use a single condition that requires the user to have a balance
  // Note: This is a temporary solution. In production, you would need to implement
  // proper address-specific access control using custom contracts or different Lit patterns
  const cond = [{
    contractAddress: "",
    standardContractType: "",
    chain: "ethereum",
    method: "eth_getBalance",
    parameters: [":userAddress", "latest"],
    returnValueTest: {
      comparator: ">=",
      value: "000000000000000000",
    },
  }];
  console.log('[Lit] accessControlConditions (shared):', cond);
  return cond;
}

// Get authentication signature for Lit Protocol using SIWE (Sign-In With Ethereum)
export async function getAuthSig(wallet: ethers.Signer): Promise<AuthSig> {
  const address = await wallet.getAddress(); // Keep original checksummed format
  const chainId = 1; // Ethereum mainnet
  const domain = window.location.host;
  const origin = window.location.origin;
  const statement = "I want to use Lit Protocol to encrypt and decrypt my files.";
  const issuedAt = new Date().toISOString();
  // Generate a random nonce
  const nonce = Math.random().toString(36).substring(2, 10);
  const siweMessage = new SiweMessage({
    domain,
    address, // Use original checksummed address for SIWE
    statement,
    uri: origin,
    version: "1",
    chainId,
    nonce,
    issuedAt,
    expirationTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
  });
  const messageToSign = siweMessage.prepareMessage();
  const signature = await wallet.signMessage(messageToSign);
  console.log('[Lit] SIWE/authSig address:', address.toLowerCase());
  return {
    sig: signature,
    derivedVia: "web3.eth.personal.sign",
    signedMessage: messageToSign,
    address: address.toLowerCase(), // Return lowercase for Lit Protocol
  };
}

// REAL LIT PROTOCOL ENCRYPTION
export async function encryptFileData(
  fileData: ArrayBuffer,
  recipientAddresses: string[],
  onProgress?: (progress: number) => void,
  ownerAddress?: string
): Promise<{ ciphertext: string; dataToEncryptHash: string; accessControlConditions: object[] }> {
  try {
    if (onProgress) onProgress(10);
    // Initialize client
    const client = await getLitClient();
    if (onProgress) onProgress(20);
    // Get wallet from window.ethereum
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    if (onProgress) onProgress(30);
    // Get auth signature for encryption
    const authSig = await getAuthSig(signer);
    // Create access control conditions
    const accessControlConditions = getAccessControlConditions(recipientAddresses, ownerAddress);
    console.log('[Lit] ENCRYPT wallet address:', (await signer.getAddress()).toLowerCase());
    console.log('[Lit] ENCRYPT accessControlConditions:', accessControlConditions);
    if (onProgress) onProgress(50);
    // Convert ArrayBuffer to Uint8Array
    const uint8Array = new Uint8Array(fileData);
    if (onProgress) onProgress(60);
    // REAL LIT PROTOCOL ENCRYPTION
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { ciphertext, dataToEncryptHash } = await (client as any).encrypt({
      dataToEncrypt: uint8Array,
      accessControlConditions,
      authSig,
      chain: "ethereum",
    });
    if (onProgress) onProgress(100);
    console.log('✅ REAL Lit Protocol encryption completed');
    return {
      ciphertext,
      dataToEncryptHash,
      accessControlConditions
    };
  } catch (error) {
    console.error('Lit Protocol encryption error:', error);
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// REAL LIT PROTOCOL DECRYPTION
export async function decryptFileData(
  ciphertext: string,
  dataToEncryptHash: string,
  accessControlConditions: object[]
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
    let address = await signer.getAddress();
    address = address.toLowerCase();
    // Get auth signature
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const authSig = await getAuthSig(signer);
    console.log('[Lit] DECRYPT wallet address:', address);
    console.log('[Lit] DECRYPT accessControlConditions:', accessControlConditions);
    
    // Log the exact addresses in the access control conditions
    console.log('[Lit] DECRYPT checking addresses in conditions:');
    accessControlConditions.forEach((condition, index) => {
      if (typeof condition === 'object' && condition !== null && 'returnValueTest' in condition) {
        const typedCondition = condition as any;
        if (typedCondition.returnValueTest && typedCondition.returnValueTest.value) {
          console.log(`[Lit] DECRYPT condition ${index} address:`, typedCondition.returnValueTest.value);
        }
      }
    });
    
    // REAL LIT PROTOCOL DECRYPTION
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decryptedData = await (client as any).decrypt({
      accessControlConditions,
      ciphertext,
      dataToEncryptHash,
      authSig,
      chain: "ethereum",
    });
    console.log('✅ REAL Lit Protocol decryption completed');
    // ... rest of your decryption type handling ...
    if (typeof decryptedData === 'string') {
      const encoder = new TextEncoder();
      return encoder.encode(decryptedData).buffer;
    } else if (decryptedData instanceof Uint8Array) {
      return decryptedData.buffer;
    } else if (decryptedData instanceof ArrayBuffer) {
      return decryptedData;
    } else if (decryptedData && typeof decryptedData === 'object' && 'buffer' in decryptedData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (decryptedData as any).buffer;
    } else if (decryptedData && typeof decryptedData === 'object' && 'data' in decryptedData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (decryptedData as any).data;
      if (data instanceof Uint8Array) {
        return data.buffer;
      } else if (typeof data === 'string') {
        const encoder = new TextEncoder();
        return encoder.encode(data).buffer;
      } else {
        throw new Error(`Unexpected data property type: ${typeof data}`);
      }
    } else if (decryptedData && typeof decryptedData === 'object' && 'decryptedData' in decryptedData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (decryptedData as any).decryptedData;
      if (data instanceof Uint8Array) {
        return data.buffer;
      } else {
        throw new Error(`Unexpected decryptedData property type: ${typeof data}`);
      }
    } else {
      console.error('Unexpected decryption result:', decryptedData);
      throw new Error(`Unexpected decryption result type: ${typeof decryptedData}`);
    }
  } catch (error) {
    console.error('Lit Protocol decryption error:', error);
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Update access control conditions for existing files (real Lit Protocol)
export async function updateAccessControlConditions(recipientAddresses: string[] = [], ownerAddress?: string): Promise<object[]> {
  return getAccessControlConditions(recipientAddresses, ownerAddress);
}

// Check if a user has access to decrypt a file
export async function checkUserAccess(
  accessControlConditions: object[]
): Promise<boolean> {
  try {
    // In a real implementation, this would verify against the blockchain
    // For now, we'll check if the user has a wallet connected
    if (!window.ethereum) {
      return false;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();
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