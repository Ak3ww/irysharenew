import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { ethers } from "ethers";
import { Buffer } from "buffer";

// This helper type correctly gets the type of the WebUploader instance.
type IrysUploader = Awaited<ReturnType<typeof getIrysUploader>>;

// Auto-approve user if they're not already approved
export async function ensureUserApproved(userAddress: string) {
  try {
    console.log('🔐 Checking if user is approved:', userAddress);
    const response = await fetch('/api/approve-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress: userAddress
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ User approved successfully:', result);
      return true;
    } else {
      console.error('❌ User approval failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ User approval error:', error);
    return false;
  }
}

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
  
  // Ensure user is approved before upload
  await ensureUserApproved(userAddress);
  
  // Use original file type for public files, fallback to octet-stream if needed
  const contentType = file.type || "application/octet-stream";
  const safeTags = [
    { name: "Content-Type", value: contentType },
    { name: "App-Name", value: "IryShare" },
    { name: "File-Name", value: file.name },
  ];
  
  // Direct upload for all files (no chunked upload)
  try {
    const dataToUpload = Buffer.from(await file.arrayBuffer());
    const receipt = await irysUploader.upload(dataToUpload, { tags: safeTags });
    return `https://gateway.irys.xyz/${receipt.id}`;
  } catch (uploadError) {
    const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error';
    throw new Error(`Upload failed for file (${fileSizeMB.toFixed(2)}MB). Error: ${errorMessage}`);
  }
}
