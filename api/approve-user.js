import { Uploader } from "@irys/upload";
import { Ethereum } from "@irys/upload-ethereum";

// --- Automatic Approval Logic ---
const grantUserAllowance = async (userAddress) => {
  console.log('🔐 Starting approval for address:', userAddress);
  
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY environment variable is missing');
    throw new Error("Server is missing PRIVATE_KEY in environment variables");
  }
  
  const amountToApproveInEth = "0.5"; // 0.5 ETH approval for uploads
  console.log('💰 Approving user for uploads');
  console.log('🎯 Target user address:', userAddress);
  
  // Retry logic for network issues
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} for ${userAddress}`);
      
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
      console.log(`✅ Successfully approved ${userAddress} for uploads`);
      
      return approvalResult;
    } catch (error) {
      lastError = error;
      console.error(`❌ Approval attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting 2 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  console.error('❌ All approval attempts failed for:', userAddress);
  console.error('❌ Final error details:', {
    message: lastError.message,
    code: lastError.code,
    stack: lastError.stack
  });
  throw new Error(`Approval failed after ${maxRetries} attempts: ${lastError.message}`);
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

    if (!process.env.PRIVATE_KEY) {
      console.error('❌ PRIVATE_KEY environment variable is missing');
      return res.status(500).json({ error: "Server configuration error: PRIVATE_KEY not found." });
    }
    
    console.log('✅ Starting approval process for:', userAddress);
    
    // Add timeout to prevent hanging requests
    const approvalPromise = grantUserAllowance(userAddress);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Approval timeout after 30 seconds')), 30000)
    );
    
    const approvalResult = await Promise.race([approvalPromise, timeoutPromise]);
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