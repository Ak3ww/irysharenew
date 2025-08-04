import { Uploader } from "@irys/upload";
import { Ethereum } from "@irys/upload-ethereum";

// --- Automatic Approval Logic ---
const grantUserAllowance = async (userAddress) => {
  console.log('🔐 Starting approval for address:', userAddress);
  
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Server is missing PRIVATE_KEY in environment variables");
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
    await uploader.approval.createApproval({
      amount: amountInAtomicUnits,
      approvedAddress: userAddress,
    });
    
    console.log(`✅ Successfully approved ${userAddress} for ${amountToApproveInEth} ETH`);
  } catch (error) {
    console.error('❌ Approval failed:', error);
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userAddress } = req.body;
    
    console.log('🔐 Approve-user API called with address:', userAddress);
    
    if (!userAddress) {
      console.error('❌ Missing userAddress in request body');
      return res.status(400).json({ error: "userAddress is required." });
    }

    if (!process.env.PRIVATE_KEY) {
      console.error('❌ PRIVATE_KEY environment variable is missing');
      return res.status(500).json({ error: "Server configuration error: PRIVATE_KEY not found." });
    }
    
    console.log('✅ Starting approval process for:', userAddress);
    await grantUserAllowance(userAddress);
    console.log('✅ Approval completed successfully');
    res.status(200).json({ success: true, message: 'User approved successfully' });
  } catch (error) {
    console.error("❌ API Error:", error);
    res.status(500).json({ 
      error: "Server failed to grant allowance.",
      details: error.message 
    });
  }
} 