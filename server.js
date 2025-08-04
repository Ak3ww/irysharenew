import express from "express";
import cors from "cors";
import "dotenv/config";
import { Uploader } from "@irys/upload";
import { Ethereum } from "@irys/upload-ethereum";

// --- Server Setup ---
const app = express();
app.use(cors());
app.use(express.json());
const PORT = 3001;

// --- Automatic Approval Logic ---
const grantUserAllowance = async (userAddress) => {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Server is missing PRIVATE_KEY in .env");
  }
  
  const amountToApproveInEth = "0.05";
  
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

// --- API Endpoint ---
app.post("/api/approve-user", async (req, res) => {
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
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`✅ Approval server is running and listening on http://localhost:${PORT}`);
});