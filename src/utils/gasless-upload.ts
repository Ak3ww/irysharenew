import { Buffer } from "buffer";

export interface GaslessUploadResult {
  success: boolean;
  fileUrl?: string;
  transactionId?: string;
  uploadType?: string;
  message?: string;
  error?: string;
  details?: string;
}

export interface GaslessUploadOptions {
  file: File;
  userAddress: string;
  uploadType: 'public' | 'private' | 'share';
  recipients?: string[];
}

export async function uploadFileGasless(options: GaslessUploadOptions): Promise<GaslessUploadResult> {
  const { file, userAddress, uploadType, recipients = [] } = options;
  
  try {
    // Convert file to base64
    const fileBuffer = await file.arrayBuffer();
    const fileData = Buffer.from(fileBuffer).toString('base64');
    
    // Prepare upload data
    const uploadData = {
      fileData,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      userAddress,
      uploadType,
      recipients
    };
    
    console.log(`🚀 Starting gasless upload for ${uploadType} file: ${file.name}`);
    
    // Send to gasless upload API
    const response = await fetch('/api/gasless-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(uploadData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Gasless upload successful: ${result.fileUrl}`);
      return {
        success: true,
        fileUrl: result.fileUrl,
        transactionId: result.transactionId,
        uploadType: result.uploadType,
        message: result.message
      };
    } else {
      console.error(`❌ Gasless upload failed:`, result);
      return {
        success: false,
        error: result.error,
        details: result.details
      };
    }
    
  } catch (error) {
    console.error('Gasless upload error:', error);
    return {
      success: false,
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to check if gasless upload is available
export function isGaslessUploadAvailable(): boolean {
  return true; // Always available since we're using server-side uploads
} 