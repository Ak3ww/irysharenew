import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { X, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { parseRecipients, calculateTotalAmount, disperseTokens, formatAmount, validateBalance, checkNetwork, getTransactionUrl } from '../../utils/disperse';
import type { DisperseRecipient } from '../../utils/disperse';
import { ethers } from 'ethers';
import { useToast } from '../../hooks/use-toast';

interface DisperseProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Disperse({ isOpen, onClose }: DisperseProps) {
  const { toast } = useToast();
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

  const handleSend = async () => {
    if (!address || !balance || recipients.length === 0) return;

    // If user is on wrong network, try to switch
    if (isCorrectNetwork === false) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x4F6" }] // 1270 in hex
        });
        return; // Component will re-check network status
      } catch (err: any) {
        if (err.code === 4902) {
          // Chain not added, try to add it
          try {
            await (window as any).ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0x4F6",
                chainName: "Irys Testnet",
                rpcUrls: ["https://testnet-rpc.irys.xyz/v1/execution-rpc"],
                nativeCurrency: { name: "Irys", symbol: "IRYS", decimals: 18 }
              }]
            });
            return; // Component will re-check network status
          } catch {
            setError('Failed to add Irys Testnet. Please add it manually to your wallet.');
            return;
          }
        } else {
          setError('Failed to switch to Irys Testnet. Please switch manually.');
          return;
        }
      }
    }

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

      // Check if we're on the correct network
      const isCorrectNetwork = await checkNetwork(signer);
      if (!isCorrectNetwork) {
        throw new Error('Please switch to Irys Testnet (Chain ID: 1270) to use the disperse function');
      }

      const disperseResult = await disperseTokens(recipients, signer);

      if (disperseResult.success) {
        setResult({
          success: true,
          message: `Successfully dispersed IRYS to ${recipients.length} recipients in one transaction!`,
          txHash: disperseResult.txHash
        });
        
        // Show success toast with transaction link
        toast({
          title: "Disperse Successful!",
          description: `Sent IRYS to ${recipients.length} recipients`,
          variant: "success",
          action: disperseResult.txHash ? (
            <a 
              href={getTransactionUrl(disperseResult.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-500 underline"
            >
              View on Explorer
            </a>
          ) : undefined,
        });
        
        // Reset form
        setRecipientsInput('');
        setRecipients([]);
        setTotalAmount(0n);
      } else {
        const errorMessage = disperseResult.error || 'Disperse failed';
        setResult({
          success: false,
          message: errorMessage
        });
        
        // Show error toast
        toast({
          title: "Disperse Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setResult({
        success: false,
        message: errorMessage
      });
      
      // Show error toast
      toast({
        title: "Disperse Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const formatBalance = (balance: bigint) => {
    return formatAmount(balance);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[10000] flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
              <Send size={16} className="sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-[#67FFD4] font-bold text-lg sm:text-xl" style={{ fontFamily: 'Irys2' }}>
                DISPERSE IRYS TOKENS
              </h3>
              <p className="text-white/60 text-xs sm:text-sm">Send IRYS to multiple addresses instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-2 rounded-md hover:bg-white/10 touch-manipulation"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Token Selection */}
        <div className="mb-4 sm:mb-6">
          <label className="text-[#67FFD4] font-bold block mb-2 text-sm sm:text-base" style={{ fontFamily: 'Irys2' }}>
            SELECT TOKEN
          </label>
          <select className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent transition-all text-sm sm:text-base">
            <option value="IRYS">IRYS TOKEN</option>
            <option value="CUSTOM" disabled>Custom Token (Coming Soon)</option>
          </select>
        </div>

        {/* Recipients Input */}
        <div className="mb-4 sm:mb-6">
          <label className="text-[#67FFD4] font-bold block mb-2 text-sm sm:text-base" style={{ fontFamily: 'Irys2' }}>
            RECIPIENTS AND AMOUNTS
          </label>
          <textarea
            value={recipientsInput}
            onChange={(e) => setRecipientsInput(e.target.value)}
            placeholder="Enter address and amount separated by comma, space, or equals sign.&#10;Example:&#10;0x1234... 1.5&#10;0x5678... 2.0&#10;0x9abc... 0.5"
            className="w-full bg-white/5 border border-white/10 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent transition-all h-24 sm:h-32 resize-none font-mono text-xs sm:text-sm"
            disabled={sending}
          />
        </div>

        {/* Preview */}
        {recipients.length > 0 && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-1 sm:gap-0">
              <span className="text-[#67FFD4] font-bold text-xs sm:text-sm">TOTAL RECIPIENTS: {recipients.length}</span>
              <span className="text-[#67FFD4] font-bold text-xs sm:text-sm">TOTAL AMOUNT: {formatBalance(totalAmount)} IRYS</span>
            </div>
            
            {/* Recipients List */}
            <div className="space-y-2 max-h-24 sm:max-h-32 overflow-y-auto">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex justify-between items-center text-xs sm:text-sm">
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
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-xs sm:text-sm">Network:</span>
              </div>
              <span className={`font-bold text-xs sm:text-sm ${isCorrectNetwork ? 'text-[#67FFD4]' : 'text-red-400'}`}>
                {isCorrectNetwork ? 'Irys Testnet ✓' : 'Wrong Network ✗'}
              </span>
            </div>
            {!isCorrectNetwork && (
              <div className="mt-2 text-red-400 text-xs sm:text-sm flex items-center gap-2">
                <AlertCircle size={12} className="sm:w-3 sm:h-3" />
                Please switch to Irys Testnet (Chain ID: 1270)
              </div>
            )}
          </div>
        )}

        {/* Balance Check */}
        {balance && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-xs sm:text-sm">Your Balance:</span>
              </div>
              <span className={`font-bold text-xs sm:text-sm ${validateBalance(balance.value, totalAmount) ? 'text-[#67FFD4]' : 'text-red-400'}`}>
                {formatBalance(balance.value)} IRYS
              </span>
            </div>
            {!validateBalance(balance.value, totalAmount) && totalAmount > 0n && (
              <div className="mt-2 text-red-400 text-xs sm:text-sm flex items-center gap-2">
                <AlertCircle size={12} className="sm:w-3 sm:h-3" />
                Insufficient balance for this transaction
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 bg-red-500/20 border border-red-500/30 text-red-400 px-3 sm:px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={14} className="sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">{error}</span>
          </div>
        )}

        {/* Result Message */}
        {result && (
          <div className={`mb-4 sm:mb-6 px-3 sm:px-4 py-3 rounded-lg flex items-center gap-2 ${
            result.success 
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' 
              : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}>
            {result.success ? <CheckCircle size={14} className="sm:w-4 sm:h-4" /> : <AlertCircle size={14} className="sm:w-4 sm:h-4" />}
            <div>
              <div className="text-xs sm:text-sm">{result.message}</div>
              {result.txHash && (
                <a 
                  href={getTransactionUrl(result.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#67FFD4] hover:underline text-xs sm:text-sm"
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
          disabled={recipients.length === 0 || sending || !validateBalance(balance?.value || 0n, totalAmount) || isCorrectNetwork === false}
          className="w-full text-sm sm:text-base py-3 sm:py-4 touch-manipulation"
        >
          {sending ? 'Sending...' : isCorrectNetwork === false ? 'Switch to Irys Testnet' : 'SEND'}
        </Button>
      </div>
    </div>
  );
} 