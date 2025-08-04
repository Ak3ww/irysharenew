import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAccount, useDisconnect } from 'wagmi';

interface DisconnectButtonProps {
  className?: string;
  variant?: 'default' | 'minimal';
}

export function DisconnectButton({ className = '', variant = 'default' }: DisconnectButtonProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  if (!isConnected || !address) {
    return null;
  }

  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (variant === 'minimal') {
    return (
      <button
        onClick={() => disconnect()}
        className={`flex items-center gap-2 px-3 py-2 text-[#67FFD4] hover:text-[#8AFFE4] transition-colors ${className}`}
        title="Disconnect wallet"
      >
        <LogOut size={16} />
        <span className="text-sm font-medium">Disconnect</span>
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
        <User size={16} className="text-[#67FFD4]" />
        <span className="text-white text-sm font-medium">{shortAddress}</span>
      </div>
      <button
        onClick={() => disconnect()}
        className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        title="Disconnect wallet"
      >
        <LogOut size={16} />
        <span className="text-sm font-medium">Disconnect</span>
      </button>
    </div>
  );
} 