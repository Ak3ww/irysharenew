import { Uploader } from "@irys/upload";
import { Ethereum } from "@irys/upload-ethereum";

// --- Automatic Approval Logic ---
const grantUserAllowance = async (userAddress) => {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Server is missing PRIVATE_KEY in .env");
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

  try {
    const { userAddress } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({ error: "userAddress is required." });
    }
    
    await grantUserAllowance(userAddress);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Server failed to grant allowance." });
  }
} 