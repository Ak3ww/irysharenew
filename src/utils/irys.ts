import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { ethers } from "ethers";
import { Buffer } from "buffer";
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
  tags: { name: string; value: string }[] = []
) {
  // Smart upload strategy based on file size
  const fileSizeMB = file.size / 1024 / 1024;
  // Use original file type for public files, fallback to octet-stream if needed
  const contentType = file.type || "application/octet-stream";
  const safeTags = [
    { name: "Content-Type", value: contentType },
    { name: "App-Name", value: "IryShare" },
    { name: "File-Name", value: file.name },
  ];
  // Strategy:
  // - Small files (< 10MB): Regular upload (fastest, most reliable)
  // - Large files (≥ 10MB): Chunked upload (required for large files)
  let uploadStrategy = fileSizeMB >= 10 ? 'chunked' : 'regular';
  if (uploadStrategy === 'chunked') {
    try {
      // Recreate chunked uploader for each transaction (per Irys docs)
      let uploader = irysUploader.uploader.chunkedUploader;
      // Configure chunked uploader settings - use proper chunk size within allowed range
      uploader.setBatchSize(5); // Default batch size
      uploader.setChunkSize(500000); // 500KB chunks (minimum allowed by Irys)
  const dataToUpload = Buffer.from(await file.arrayBuffer());
      const transactionOptions = {
        tags: safeTags,
    upload: {
      paidBy: "0xebe5e0c25a5f7ea6b404a74b6bb78318cc295148",
    },
  };
      const receipt = await uploader.uploadData(dataToUpload, transactionOptions);
      return `https://gateway.irys.xyz/${receipt.data.id}`;
    } catch (chunkedError) {
      throw new Error(`Chunked upload failed for large file (${fileSizeMB.toFixed(2)}MB). This file may be too large for the current network conditions.`);
    }
  } else {
    // Regular upload for small files
    const dataToUpload = Buffer.from(await file.arrayBuffer());
    const receipt = await irysUploader.upload(dataToUpload, { tags: safeTags });
    return `https://gateway.irys.xyz/${receipt.id}`;
  }
}
