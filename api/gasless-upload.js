import { Uploader } from "@irys/upload";
import { Ethereum } from "@irys/upload-ethereum";
import { ethers } from "ethers";

// Dev wallet configuration
const DEV_WALLET_ADDRESS = "0xEbe5E0C25a5F7EA6b404A74b6bb78318Cc295148";

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      fileData, 
      fileName, 
      fileType, 
      userAddress, 
      uploadType, // 'public', 'private', 'share'
      recipients = [] // for share files
    } = req.body;

    if (!fileData || !fileName || !userAddress || !uploadType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!process.env.PRIVATE_KEY) {
      console.error('PRIVATE_KEY not found in environment');
      return res.status(500).json({ error: "Server configuration error." });
    }

    // Connect to Irys with dev wallet
    const uploader = await Uploader(Ethereum)
      .withWallet(process.env.PRIVATE_KEY)
      .withRpc("https://1rpc.io/sepolia")
      .devnet();

    // Prepare file data
    const fileBuffer = Buffer.from(fileData, 'base64');
    
    // Create tags based on upload type
    const tags = [
      { name: "Content-Type", value: fileType },
      { name: "App-Name", value: "IryShare" },
      { name: "File-Name", value: fileName },
      { name: "Upload-Type", value: uploadType },
      { name: "User-Address", value: userAddress.toLowerCase() },
      { name: "Uploaded-By", value: DEV_WALLET_ADDRESS }
    ];

    // Add recipients for share files
    if (uploadType === 'share' && recipients.length > 0) {
      tags.push({ name: "Recipients", value: recipients.join(',') });
    }

    // Upload file (dev wallet pays)
    console.log(`📤 Uploading ${uploadType} file: ${fileName} for user: ${userAddress}`);
    const receipt = await uploader.upload(fileBuffer, { tags });
    
    const fileUrl = `https://gateway.irys.xyz/${receipt.id}`;
    
    console.log(`✅ File uploaded successfully: ${fileUrl}`);
    
    res.status(200).json({ 
      success: true,
      fileUrl,
      transactionId: receipt.id,
      uploadType,
      message: `File uploaded successfully via gasless upload`
    });

  } catch (error) {
    console.error("Gasless upload error:", error);
    res.status(500).json({ 
      error: "Gasless upload failed",
      details: error.message 
    });
  }
} 