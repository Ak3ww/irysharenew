// Simplified encryption utility - using main thread for now due to CDN issues
import { encryptFile } from './libsodium';

// Encrypt file using main thread (simplified approach)
export async function encryptFileWithWorker(
  file: File,
  address: string,
  onProgress?: (progress: number) => void
): Promise<{ encryptedData: Uint8Array; nonce: Uint8Array }> {
  console.log('Using main thread encryption (Web Worker CDN unreliable)');
  
  // Use main thread encryption directly
  return await encryptFile(file, address, onProgress);
}

// Clean up function (no-op for now)
export function cleanupEncryptionWorker() {
  // No cleanup needed for main thread approach
} 