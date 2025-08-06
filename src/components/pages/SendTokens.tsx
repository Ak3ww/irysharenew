import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { X, Send, AlertCircle, CheckCircle, History, ArrowLeft } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { parseRecipients, calculateTotalAmount, disperseTokens, formatAmount, validateBalance, checkNetwork, getTransactionUrl } from '../../utils/disperse';
import type { DisperseRecipient } from '../../utils/disperse';
import { ethers } from 'ethers';
interface SendTokensProps {
  onBack: () => void;
}
interface TransactionHistory {
  txHash: string;
  recipientCount: number;
  totalAmount: string;
  timestamp: string;
  irysId?: string;
  recipients: Array<{
    address: string;
    amount: string;
  }>;
}
export function SendTokens({ onBack }: SendTokensProps) {
  const { address } = useAccount();
  const { data: balance } = useBalance({
    address: address as `0x${string}`,
  });
  const [recipientsInput, setRecipientsInput] = useState('');
  const [recipients, setRecipients] = useState<DisperseRecipient[]>([]);
  const [totalAmount, setTotalAmount] = useState<bigint>(0n);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistory[]>([]);
  // Parse recipients when input changes
  useEffect(() => {
    if (!recipientsInput.trim()) {
      setRecipients([]);
      setTotalAmount(0n);
      setError('');
      return;
    }
    try {
      const parsedRecipients = parseRecipients(recipientsInput);
      setRecipients(parsedRecipients);
      setTotalAmount(calculateTotalAmount(parsedRecipients));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid input format');
      setRecipients([]);
      setTotalAmount(0n);
    }
  }, [recipientsInput]);
  // Check network when component mounts or address changes
  useEffect(() => {
    const checkNetworkStatus = async () => {
      if (!address) {
        setIsCorrectNetwork(null);
        return;
      }
      try {
        if (!(window as { ethereum?: unknown }).ethereum) {
          setIsCorrectNetwork(false);
          return;
        }
        const provider = new ethers.BrowserProvider((window as { ethereum: unknown }).ethereum as ethers.Eip1193Provider);
        const signer = await provider.getSigner();
        const isCorrect = await checkNetwork(signer);
        setIsCorrectNetwork(isCorrect);
      } catch {
        setIsCorrectNetwork(false);
      }
    };
    checkNetworkStatus();
  }, [address]);
  // Load transaction history from localStorage
  useEffect(() => {
    if (address) {
      const history = JSON.parse(localStorage.getItem(`disperseHistory_${address}`) || '[]');
      setTransactionHistory(history);
    }
  }, [address]);
  const handleSend = async () => {
    if (!address || !balance || recipients.length === 0) return;
    // Check balance
    if (!validateBalance(balance.value, totalAmount)) {
      setError('Insufficient balance');
      return;
    }
    setSending(true);
    setError('');
    setResult(null);
    try {
      // Get signer from window.ethereum
      if (!(window as { ethereum?: unknown }).ethereum) {
        throw new Error('No wallet found');
      }
      const provider = new ethers.BrowserProvider((window as { ethereum: unknown }).ethereum as ethers.Eip1193Provider);
      const signer = await provider.getSigner();
      // MetaMask will automatically switch to the correct network when the transaction is sent
      // No need to manually check or switch networks
      const disperseResult = await disperseTokens(recipients, signer);
      if (disperseResult.success) {
        setResult({
          success: true,
          message: `Successfully dispersed IRYS to ${recipients.length} recipients in one transaction!`,
          txHash: disperseResult.txHash
        });
        // Save to history
        const historyData: TransactionHistory = {
          txHash: disperseResult.txHash!,
          recipientCount: recipients.length,
          totalAmount: formatAmount(totalAmount),
          timestamp: new Date().toISOString(),
          recipients: recipients.map(r => ({
            address: r.address,
            amount: r.amount
          }))
        };
        const updatedHistory = [historyData, ...transactionHistory];
        setTransactionHistory(updatedHistory);
        localStorage.setItem(`disperseHistory_${address}`, JSON.stringify(updatedHistory));
        // Reset form
        setRecipientsInput('');
        setRecipients([]);
        setTotalAmount(0n);
      } else {
        setResult({
          success: false,
          message: disperseResult.error || 'Disperse failed'
        });
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'An error occurred'
      });
    } finally {
      setSending(false);
    }
  };
  const formatBalance = (balance: bigint) => {
    return formatAmount(balance);
  };
  if (showHistory) {
    return (
      <div className="min-h-screen bg-black text-white p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(false)}
              className="text-white/60 hover:text-white transition-colors p-2 rounded-md hover:bg-white/10"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <History size={16} className="text-white" />
              </div>
              <h1 className="text-[#67FFD4] font-bold text-xl" style={{ fontFamily: 'Irys2' }}>
                TRANSACTION HISTORY
              </h1>
            </div>
          </div>
        </div>
                 {/* History List */}
         <div className="max-w-4xl mx-auto">
           {transactionHistory.length > 0 ? (
             <div className="space-y-4">
               {transactionHistory.map((tx, index) => (
                 <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
                   <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                     <div className="flex-1">
                       <div className="flex items-center gap-2 mb-2">
                         <span className="text-[#67FFD4] font-bold">Date:</span>
                         <span className="text-white/80">
                           {new Date(tx.timestamp).toLocaleString()}
                         </span>
                       </div>
                       <div className="flex items-center gap-2 mb-2">
                         <span className="text-[#67FFD4] font-bold">Total Amount:</span>
                         <span className="text-white/80">{tx.totalAmount} IRYS</span>
                       </div>
                       <div className="flex items-center gap-2 mb-2">
                         <span className="text-[#67FFD4] font-bold">Recipients:</span>
                         <span className="text-white/80">{tx.recipientCount}</span>
                       </div>
                       {/* Detailed Recipients List */}
                       {tx.recipients && tx.recipients.length > 0 && (
                         <div className="mt-3">
                           <div className="text-[#67FFD4] font-bold text-sm mb-2">Recipients Details:</div>
                           <div className="space-y-1 max-h-32 overflow-y-auto">
                             {tx.recipients.map((recipient, idx) => (
                               <div key={idx} className="flex justify-between items-center text-xs bg-white/5 p-2 rounded">
                                 <span className="text-white/70 font-mono truncate flex-1">
                                   {recipient.address.slice(0, 6)}...{recipient.address.slice(-4)}
                                 </span>
                                 <span className="text-white font-medium ml-2">
                                   {recipient.amount} IRYS
                                 </span>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                     <div className="flex flex-col gap-2">
                       <a 
                         href={getTransactionUrl(tx.txHash)}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="text-[#67FFD4] hover:underline text-sm"
                       >
                         View Transaction
                       </a>
                       {tx.irysId && (
                         <a 
                           href={`https://gateway.irys.xyz/${tx.irysId}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="text-[#67FFD4] hover:underline text-sm"
                         >
                           View on Irys
                         </a>
                       )}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="text-center py-12">
               <History size={48} className="text-white/40 mx-auto mb-4" />
               <p className="text-white/60">No transaction history found.</p>
             </div>
           )}
         </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-[10000]">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onBack}
            className="text-white/60 hover:text-white transition-colors p-2 rounded-md hover:bg-white/10 flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Send size={16} className="text-white" />
            </div>
                         <h1 className="text-white font-bold text-lg sm:text-xl truncate" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
               SEND TOKENS
             </h1>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors p-2 rounded-md hover:bg-white/10 relative z-[10000] flex-shrink-0"
        >
          <History size={16} />
          <span className="text-sm">History</span>
        </button>
      </div>
      <div className="max-w-4xl mx-auto">
        {/* Token Selection */}
        <div className="mb-6">
          <label className="text-[#67FFD4] font-bold block mb-2 text-sm sm:text-base" style={{ fontFamily: 'Irys2' }}>
            SELECT TOKEN
          </label>
          <select className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent transition-all text-sm sm:text-base">
            <option value="IRYS">IRYS TOKEN</option>
            <option value="CUSTOM" disabled>Custom Token (Coming Soon)</option>
          </select>
        </div>
        {/* Recipients Input */}
        <div className="mb-6">
          <label className="text-[#67FFD4] font-bold block mb-2 text-sm sm:text-base" style={{ fontFamily: 'Irys2' }}>
            RECIPIENTS AND AMOUNTS
          </label>
          <textarea
            value={recipientsInput}
            onChange={(e) => setRecipientsInput(e.target.value)}
            placeholder="Enter address and amount separated by comma, space, or equals sign.&#10;Example:&#10;0x1234... 1.5&#10;0x5678... 2.0&#10;0x9abc... 0.5"
            className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent transition-all h-32 sm:h-40 resize-none font-mono text-xs sm:text-sm"
            disabled={sending}
          />
        </div>
        {/* Preview */}
        {recipients.length > 0 && (
          <div className="mb-6 p-4 sm:p-6 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <span className="text-[#67FFD4] font-bold text-sm sm:text-base">TOTAL RECIPIENTS: {recipients.length}</span>
              <span className="text-[#67FFD4] font-bold text-sm sm:text-base">TOTAL AMOUNT: {formatBalance(totalAmount)} IRYS</span>
            </div>
            {/* Recipients List */}
            <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-white/80 font-mono truncate flex-1">
                    {recipient.address.slice(0, 6)}...{recipient.address.slice(-4)}
                  </span>
                  <span className="text-white font-medium ml-2">
                    {recipient.amount} IRYS
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Network Status */}
        {isCorrectNetwork !== null && (
          <div className="mb-6 p-4 sm:p-6 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-sm sm:text-base">Network:</span>
              </div>
              <span className={`font-bold text-sm sm:text-base ${isCorrectNetwork ? 'text-[#67FFD4]' : 'text-red-400'}`}>
                {isCorrectNetwork ? 'Irys Testnet ✓' : 'Wrong Network ✗'}
              </span>
            </div>
                         {!isCorrectNetwork && (
               <div className="mt-3">
                 <div className="text-blue-400 text-sm flex items-center gap-2">
                   <AlertCircle size={14} />
                   MetaMask will automatically switch to Irys Testnet when you send the transaction
                 </div>
               </div>
             )}
          </div>
        )}
        {/* Balance Check */}
        {balance && (
          <div className="mb-6 p-4 sm:p-6 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-sm sm:text-base">Your Balance:</span>
              </div>
              <span className={`font-bold text-sm sm:text-base ${validateBalance(balance.value, totalAmount) ? 'text-[#67FFD4]' : 'text-red-400'}`}>
                {formatBalance(balance.value)} IRYS
              </span>
            </div>
            {!validateBalance(balance.value, totalAmount) && totalAmount > 0n && (
              <div className="mt-2 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={14} />
                Insufficient balance for this transaction
              </div>
            )}
          </div>
        )}
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {/* Result Message */}
        {result && (
          <div className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-2 ${
            result.success 
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' 
              : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}>
            {result.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <div>
              <div className="text-sm">{result.message}</div>
              {result.txHash && (
                <a 
                  href={getTransactionUrl(result.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#67FFD4] hover:underline text-sm"
                >
                  View Transaction
                </a>
              )}
            </div>
          </div>
        )}
                 {/* Send Button */}
         <Button
           variant="irys"
           onClick={handleSend}
           disabled={recipients.length === 0 || sending || !validateBalance(balance?.value || 0n, totalAmount)}
           className="w-full text-sm sm:text-base py-4 touch-manipulation"
         >
           {sending ? 'Sending...' : 'SEND'}
         </Button>
      </div>
    </div>
  );
} 
