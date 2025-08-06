import { Uploader } from "@irys/upload";
import { Ethereum } from "@irys/upload-ethereum";

// --- Automatic Approval Logic ---
const grantUserAllowance = async (userAddress) => {
  console.log('🔐 Starting approval for address:', userAddress);
  
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY environment variable is missing');
    throw new Error("Server is missing PRIVATE_KEY in environment variables");
  }
  
  // Validate the private key format
  if (!process.env.PRIVATE_KEY.startsWith('0x') && process.env.PRIVATE_KEY.length !== 64) {
    console.error('❌ PRIVATE_KEY format is invalid');
    throw new Error("Invalid PRIVATE_KEY format");
  }
  
  const amountToApproveInEth = "0.05";
  console.log('💰 Approval amount:', amountToApproveInEth, 'ETH');
  
  try {
    // Connect to Irys DEVNET with your developer wallet
    console.log('🔗 Connecting to Irys devnet...');
    const uploader = await Uploader(Ethereum)
      .withWallet(process.env.PRIVATE_KEY)
      .withRpc("https://1rpc.io/sepolia")
      .devnet();
    
    console.log('✅ Connected to Irys devnet');
    
    const amountInAtomicUnits = uploader.utils.toAtomic(amountToApproveInEth);
    console.log('📊 Amount in atomic units:', amountInAtomicUnits.toString());
    
    console.log('📝 Creating approval transaction...');
    const approvalResult = await uploader.approval.createApproval({
      amount: amountInAtomicUnits,
      approvedAddress: userAddress,
    });
    
    console.log('📋 Approval transaction result:', approvalResult);
    console.log(`✅ Successfully approved ${userAddress} for ${amountToApproveInEth} ETH`);
    
    return approvalResult;
  } catch (error) {
    console.error('❌ Approval failed:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw new Error(`Approval failed: ${error.message}`);
  }
};

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
    console.error('❌ Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userAddress } = req.body;
    
    console.log('🔐 Approve-user API called with address:', userAddress);
    console.log('🔐 Request body:', req.body);
    
    if (!userAddress) {
      console.error('❌ Missing userAddress in request body');
      return res.status(400).json({ error: "userAddress is required." });
    }

    // Validate address format
    if (!userAddress.startsWith('0x') || userAddress.length !== 42) {
      console.error('❌ Invalid address format:', userAddress);
      return res.status(400).json({ error: "Invalid address format." });
    }

    if (!process.env.PRIVATE_KEY) {
      console.error('❌ PRIVATE_KEY environment variable is missing');
      return res.status(500).json({ error: "Server configuration error: PRIVATE_KEY not found." });
    }
    
    console.log('✅ Starting approval process for:', userAddress);
    const approvalResult = await grantUserAllowance(userAddress);
    console.log('✅ Approval completed successfully');
    
    res.status(200).json({ 
      success: true, 
      message: 'User approved successfully',
      approvalResult: approvalResult
    });
  } catch (error) {
    console.error("❌ API Error:", error);
    console.error("❌ Error stack:", error.stack);
    
    res.status(500).json({ 
      error: "Server failed to grant allowance.",
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 