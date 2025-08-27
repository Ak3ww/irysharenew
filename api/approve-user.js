import { Uploader } from "@irys/upload";
import { Ethereum } from "@irys/upload-ethereum";

// --- Automatic Approval Logic ---
const grantUserAllowance = async (userAddress) => {
  try {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("Server is missing PRIVATE_KEY in environment");
    }
    
    const amountToApproveInEth = "0.05"; // Match original working amount
    
    // Connect to Irys DEVNET with your developer wallet
    const uploader = await Uploader(Ethereum)
      .withWallet(process.env.PRIVATE_KEY)
      .withRpc("https://1rpc.io/sepolia")
      .devnet();
    
    const amountInAtomicUnits = uploader.utils.toAtomic(amountToApproveInEth);
    
    await uploader.approval.createApproval({
      amount: amountInAtomicUnits,
      approvedAddress: userAddress,
    });
    
    console.log(`✅ Approved ${userAddress}`);
  } catch (error) {
    console.error('Approval error:', error);
    throw error;
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userAddress } = req.body;

    if (!userAddress) {
      return res.status(400).json({ error: "User address is required" });
    }

    // Debug environment variables
    console.log('🔍 Environment Debug:');
    console.log('PRIVATE_KEY exists:', !!process.env.PRIVATE_KEY);
    console.log('PRIVATE_KEY length:', process.env.PRIVATE_KEY?.length);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    if (!process.env.PRIVATE_KEY) {
      console.error('❌ PRIVATE_KEY not found in environment');
      return res.status(500).json({ 
        error: "Server configuration error - PRIVATE_KEY missing",
        debug: {
          hasPrivateKey: !!process.env.PRIVATE_KEY,
          nodeEnv: process.env.NODE_ENV
        }
      });
    }

    // Actually create the approval on Irys
    await grantUserAllowance(userAddress);
    console.log(`✅ User approved: ${userAddress}`);
    
    res.status(200).json({ 
      success: true,
      message: "User approved for sponsored uploads"
    });

  } catch (error) {
    console.error("Approval error:", error);
    res.status(500).json({ 
      error: "Approval failed",
      details: error.message 
    });
  }
}
