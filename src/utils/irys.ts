import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { ethers } from "ethers";
import { Buffer } from "buffer";
import { updateUserStorage, hasEnoughStorage } from './storageManagement';

// This helper type correctly gets the type of the WebUploader instance.
type IrysUploader = Awaited<ReturnType<typeof getIrysUploader>>;

export async function getIrysUploader() {
  if (!(window as any).ethereum) {
    throw new Error("MetaMask not found. Please install a browser wallet.");
  }
  const rpcURL = "https://1rpc.io/sepolia";
  const provider = new ethers.BrowserProvider((window as any).ethereum);
  const uploader = await WebUploader(WebEthereum)
    .withAdapter(EthersV6Adapter(provider))
    .withRpc(rpcURL)
    .devnet();
  await uploader.ready();
  return uploader;
}

export async function uploadFile(
  irysUploader: IrysUploader,
  file: File,
  userAddress: string,
  tags: { name: string; value: string }[] = []
) {
  const fileSizeMB = file.size / 1024 / 1024;
  
  // 25MB limit for uploads
  if (fileSizeMB > 25) {
    throw new Error(`File too large (${fileSizeMB.toFixed(2)}MB). Maximum supported size is 25MB.`);
  }
  
  // Check if user has enough storage
  try {
    console.log(`🔍 Checking storage for user: ${userAddress}, file size: ${file.size} bytes`);
    const hasStorage = await hasEnoughStorage(userAddress, file.size);
    console.log(`✅ Storage check result:`, hasStorage);
    
    if (!hasStorage) {
      // For now, allow uploads even if storage check fails (temporary fix)
      console.warn('⚠️ Storage check failed, but allowing upload to continue...');
      // throw new Error('Insufficient storage space. You have used your 12GB free storage allowance.');
    }
  } catch (storageError) {
    console.error('❌ Storage check error:', storageError);
    
    // If it's a storage limit error, re-throw it
    if (storageError instanceof Error && storageError.message.includes('Insufficient storage space')) {
      throw storageError;
    }
    
    // For other storage errors, try to continue with upload (graceful degradation)
    console.warn('⚠️ Storage check failed, continuing with upload...');
  }
  
  // Use original file type for public files, fallback to octet-stream if needed
  const contentType = file.type || "application/octet-stream";
  const safeTags = [
    { name: "Content-Type", value: contentType },
    { name: "App-Name", value: "IryShare" },
    { name: "File-Name", value: file.name },
    ...tags // Include any additional tags passed in
  ];
  
  // Ensure user is approved for sponsored uploads
  try {
    console.log(`🔐 Checking approval for user: ${userAddress}`);
    const apiUrl = import.meta.env.DEV ? 'http://localhost:3001/api/approve-user' : '/api/approve-user';
    const approvalResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress: userAddress
      })
    });
    
    if (!approvalResponse.ok) {
      throw new Error('User approval failed - please try again');
    }
    
    console.log(`✅ User approved for sponsored uploads`);
  } catch (approvalError) {
    console.error('Approval error:', approvalError);
    throw new Error('Failed to get upload approval. Please try again.');
  }
  
  // Upload with approval system (user just signs, no gas fees)
  try {
    const dataToUpload = Buffer.from(await file.arrayBuffer());
    const transactionOptions = {
      tags: safeTags,
      // No paidBy - will use approval system
    };
    const receipt = await irysUploader.upload(dataToUpload, transactionOptions);
    
    // Update user storage after successful upload
    try {
      await updateUserStorage(userAddress, file.size);
      console.log(`✅ Storage updated for user: ${userAddress}, file size: ${file.size} bytes`);
    } catch (storageUpdateError) {
      console.error('Failed to update storage:', storageUpdateError);
      // Don't fail the upload if storage update fails
    }
    
    return `https://gateway.irys.xyz/${receipt.id}`;
  } catch (uploadError) {
    const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error';
    throw new Error(`Upload failed for file (${fileSizeMB.toFixed(2)}MB). Error: ${errorMessage}`);
  }
}
