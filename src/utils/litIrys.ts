import { getIrysUploader } from './irys';
import { encryptFileData, decryptFileData, getAccessControlConditions } from './lit';

// Upload encrypted file data to Irys
export async function uploadEncryptedToIrys(
  fileData: ArrayBuffer,
  fileName: string,
  fileType: string,
  ownerAddress: string,
  recipientAddresses: string[] = [],
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log('Starting Lit Protocol encryption and Irys upload...');
  
  // Step 1: Encrypt the file data using Lit Protocol
  const { ciphertext, dataToEncryptHash, accessControlConditions } = await encryptFileData(
    fileData,
    recipientAddresses,
    onProgress,
    ownerAddress
  );
  
  // Step 2: Prepare data for Irys upload
  const dataToUpload = {
    ciphertext,
    dataToEncryptHash,
    accessControlConditions,
    originalFileName: fileName,
    originalFileType: fileType,
    ownerAddress: ownerAddress.toLowerCase(),
    recipientAddresses: recipientAddresses.map(addr => addr.toLowerCase()),
    encryptedAt: new Date().toISOString(),
    version: '1.0',
    encryptionMethod: 'lit-protocol'
  };
  
  // Step 3: Upload to Irys
  const irysUploader = await getIrysUploader();
  
  const tags = [
    { name: "Content-Type", value: "application/json" },
    { name: "App-Name", value: "IryShare" },
    { name: "File-Type", value: "lit-encrypted" },
    { name: "Owner-Address", value: ownerAddress.toLowerCase() },
    { name: "Recipient-Count", value: recipientAddresses.length.toString() }
  ];
  
  try {
    const receipt = await irysUploader.upload(JSON.stringify(dataToUpload), { tags });
    const fileUrl = `https://gateway.irys.xyz/${receipt.id}`;
    
    console.log('Lit Protocol encrypted file uploaded successfully:', fileUrl);
    return fileUrl;
  } catch (error) {
    console.error('Error uploading encrypted file to Irys:', error);
    throw new Error('Failed to upload encrypted file to Irys');
  }
}

// Download and decrypt file data from Irys
export async function downloadAndDecryptFromIrys(
  url: string,
  userAddress: string,
  onProgress?: (progress: number) => void
): Promise<{ file: File; metadata: any }> {
  console.log('Downloading and decrypting Lit Protocol encrypted file from:', url);
  
  // Step 1: Download from Irys
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch from Irys: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (onProgress) onProgress(25);
  
  // Step 2: Validate the data structure
  const {
    ciphertext,
    dataToEncryptHash,
    accessControlConditions,
    originalFileName,
    originalFileType,
    ownerAddress,
    recipientAddresses
  } = data as {
    ciphertext: string;
    dataToEncryptHash: string;
    accessControlConditions: Record<string, unknown>[];
    originalFileName: string;
    originalFileType: string;
    ownerAddress: string;
    recipientAddresses: string[];
  };
  
  if (!ciphertext || !dataToEncryptHash || !accessControlConditions) {
    throw new Error('Invalid encrypted data format');
  }
  
  if (onProgress) onProgress(50);
  
  // Step 3: Let Lit Protocol handle access validation during decryption
  // We don't need to pre-validate here since Lit Protocol will check access control conditions
  console.log('🔐 Proceeding to Lit Protocol decryption - access will be validated by Lit nodes');
  
  if (onProgress) onProgress(75);
  
  // Step 4: Decrypt the file data
  const decryptedData = await decryptFileData(
    ciphertext,
    dataToEncryptHash,
    accessControlConditions
  );
  
  if (onProgress) onProgress(90);
  
  // Step 5: Create file from decrypted data
  const file = new File([decryptedData], originalFileName || 'decrypted_file', {
    type: originalFileType || 'application/octet-stream'
  });
  
  if (onProgress) onProgress(100);
  
  console.log('File decrypted successfully:', file.name, file.size, 'bytes');
  
  return {
    file,
    metadata: {
      originalFileName,
      originalFileType,
      ownerAddress,
      recipientAddresses,
      encryptedAt: data.encryptedAt,
      version: data.version
    }
  };
}

// Update access control conditions for an existing file
export async function updateFileAccessControl(
  fileUrl: string,
  newRecipientAddresses: string[],
  ownerAddress: string
): Promise<string> {
  console.log('Updating access control for file:', fileUrl);
  
  // Step 1: Download the current encrypted data
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch existing file');
  }
  
  const currentData = await response.json();
  
  // Step 2: Create new access control conditions (include owner and new recipients)
  const newAccessControlConditions = getAccessControlConditions(newRecipientAddresses, ownerAddress);
  
  // Step 3: Create updated data structure
  const updatedData = {
    ...currentData,
    accessControlConditions: newAccessControlConditions,
    recipientAddresses: newRecipientAddresses.map(addr => addr.toLowerCase()),
    updatedAt: new Date().toISOString(),
    version: '1.1'
  };
  
  // Step 4: Upload the updated data to Irys
  const irysUploader = await getIrysUploader();
  
  const tags = [
    { name: "Content-Type", value: "application/json" },
    { name: "App-Name", value: "IryShare" },
    { name: "File-Type", value: "lit-encrypted" },
    { name: "Owner-Address", value: ownerAddress.toLowerCase() },
    { name: "Recipient-Count", value: newRecipientAddresses.length.toString() },
    { name: "Updated", value: "true" }
  ];
  
  try {
    const receipt = await irysUploader.upload(JSON.stringify(updatedData), { tags });
    const newFileUrl = `https://gateway.irys.xyz/${receipt.id}`;
    
    console.log('Updated access control uploaded:', newFileUrl);
    return newFileUrl;
  } catch (error) {
    console.error('Error updating access control:', error);
    throw new Error('Failed to update file access control');
  }
}

// Test function to verify Lit Protocol integration
export async function testLitIrysIntegration(): Promise<boolean> {
  try {
    console.log('Testing Lit Protocol + Irys integration...');
    
    // Create test data
    const testData = new TextEncoder().encode('Hello, Lit Protocol + Irys!');
    const testFileName = 'test.txt';
    const testFileType = 'text/plain';
    const testOwnerAddress = '0x1234567890123456789012345678901234567890';
    const testRecipients = ['0x0987654321098765432109876543210987654321'];
    
    // Test encryption and upload
    const fileUrl = await uploadEncryptedToIrys(
      testData.buffer,
      testFileName,
      testFileType,
      testOwnerAddress,
      testRecipients
    );
    
    console.log('Test upload successful:', fileUrl);
    
    // Test download and decryption
    const { file } = await downloadAndDecryptFromIrys(
      fileUrl,
      testRecipients[0]
    );
    
    const decryptedText = await file.text();
    const originalText = new TextDecoder().decode(testData);
    
    console.log('Test decryption successful:', decryptedText === originalText);
    
    return decryptedText === originalText;
  } catch (error) {
    console.error('Lit Protocol + Irys integration test failed:', error);
    return false;
  }
} 