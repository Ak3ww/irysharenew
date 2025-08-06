import { ethers } from 'ethers';
// Smart Contract Configuration
const CONTRACT_ADDRESS = "0x1B2113272fd86F0fB67988003D8d3744A62278b0";
const IRYS_CHAIN_ID = "0x4F6"; // 1270 decimal
const IRYS_RPC = "https://testnet-rpc.irys.xyz/v1/execution-rpc";
const EXPLORER_BASE = "https://testnet-explorer.irys.xyz/tx/";
// Smart Contract ABI for disperseIRYS function
const DISPERSE_ABI = [
  "function disperseIRYS(address[] calldata recipients, uint256[] calldata amounts) external payable"
];
export interface DisperseRecipient {
  address: string;
  amount: string;
  amountWei: bigint;
}
export interface DisperseResult {
  success: boolean;
  txHash?: string;
  error?: string;
}
export function parseRecipients(input: string): DisperseRecipient[] {
  const lines = input.trim().split('\n').filter(line => line.trim());
  const recipients: DisperseRecipient[] = [];
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    // Try different separators: comma, space, equals sign
    let parts: string[];
    if (trimmedLine.includes(',')) {
      parts = trimmedLine.split(',').map(p => p.trim());
    } else if (trimmedLine.includes('=')) {
      parts = trimmedLine.split('=').map(p => p.trim());
    } else {
      // Split by space, but handle multiple spaces
      parts = trimmedLine.split(/\s+/).filter(p => p.trim());
    }
    if (parts.length >= 2) {
      const address = parts[0];
      const amount = parts[1];
      // Validate address
      if (!ethers.isAddress(address)) {
        throw new Error(`Invalid address: ${address}`);
      }
      // Validate amount
      if (isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new Error(`Invalid amount: ${amount}`);
      }
      // Convert to wei
      const amountWei = ethers.parseEther(amount);
      recipients.push({
        address: address.toLowerCase(),
        amount,
        amountWei
      });
    } else {
      throw new Error(`Invalid format: ${trimmedLine}. Expected: address amount`);
    }
  }
  return recipients;
}
export function calculateTotalAmount(recipients: DisperseRecipient[]): bigint {
  return recipients.reduce((total, recipient) => total + recipient.amountWei, 0n);
}
export async function disperseTokens(
  recipients: DisperseRecipient[],
  signer: ethers.Signer
): Promise<DisperseResult> {
  try {
    // Validate we have recipients
    if (recipients.length === 0) {
      throw new Error('No valid recipients provided');
    }
    // Check if we're on the correct network
    const network = await signer.provider?.getNetwork();
    if (network?.chainId !== 1270n) {
      throw new Error('Please switch to Irys Testnet (Chain ID: 1270)');
    }
    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, DISPERSE_ABI, signer);
    // Prepare arrays for the smart contract call
    const addresses = recipients.map(r => r.address);
    const amounts = recipients.map(r => r.amountWei);
    const totalAmount = calculateTotalAmount(recipients);
    // Call the smart contract's disperseIRYS function
    const tx = await contract.disperseIRYS(addresses, amounts, {
      value: totalAmount
    });
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    return {
      success: true,
      txHash: tx.hash
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Disperse failed'
    };
  }
}
export function formatAmount(amountWei: bigint): string {
  return ethers.formatEther(amountWei);
}
export function validateBalance(balance: bigint, totalAmount: bigint): boolean {
  return balance >= totalAmount;
}
// Utility function to get transaction explorer URL
export function getTransactionUrl(txHash: string): string {
  return `${EXPLORER_BASE}${txHash}`;
}
// Utility function to check if we're on the correct network
export async function checkNetwork(signer: ethers.Signer): Promise<boolean> {
  try {
    const network = await signer.provider?.getNetwork();
    return network?.chainId === 1270n;
  } catch {
    return false;
  }
} 
