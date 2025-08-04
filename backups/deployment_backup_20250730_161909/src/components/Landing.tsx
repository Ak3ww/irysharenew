import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { supabase } from '../utils/supabase';

interface LandingProps {
  onLoginSuccess: () => void;
}

export function Landing({ onLoginSuccess }: LandingProps) {
  const { address, isConnected } = useAccount();
  const [showRegister, setShowRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [checkingUser, setCheckingUser] = useState(false);

  // Check if user is already registered when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      checkExistingUser();
    }
  }, [isConnected, address]);

  const checkExistingUser = async () => {
    if (!address) return;
    
    setCheckingUser(true);
    try {
      const { data, error } = await supabase
        .from('usernames')
        .select('username')
        .eq('address', address.toLowerCase().trim())
        .single();

      if (error && error.code === 'PGRST116') {
        // User not found - show registration
        setShowRegister(true);
      } else if (data) {
        // User exists - login successful
        console.log('User found:', data.username);
        onLoginSuccess();
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setShowRegister(true);
    } finally {
      setCheckingUser(false);
    }
  };

  const handleRegister = async () => {
    if (!username.trim()) {
      setUsernameError('Username is required');
      return;
    }
    if (!address) {
      setUsernameError('Wallet address is required');
      return;
    }

    setUsernameLoading(true);
    setUsernameError('');

    try {
      // Step 1: Check if username is taken
      const { data: existing } = await supabase
        .from('usernames')
        .select('id')
        .eq('username', username.trim())
        .single();

      if (existing) {
        setUsernameError('Username is already taken');
        return;
      }

      // Step 2: Request MetaMask signature to prove wallet ownership
      if (!(window as any).ethereum) {
        setUsernameError('MetaMask is required for registration');
        return;
      }

      const message = `Iryshare Registration\n\nWallet: ${address}\nUsername: ${username.trim()}\n\nSign this message to register your account.`;
      
      const signature = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });

      if (!signature) {
        setUsernameError('Signature required for registration');
        return;
      }

      console.log('MetaMask signature received:', signature);

      // Step 3: Save username to Supabase with signature verification
      const { error } = await supabase
        .from('usernames')
        .insert([{
          address: address.toLowerCase().trim(),
          username: username.trim(),
          registration_signature: signature
        }]);

      if (error) {
        setUsernameError('Error saving username');
        return;
      }

      // Step 4: Update any existing file_shares for this address
      // This is handled automatically by the database trigger
      console.log('Registration successful with signature verification');
      console.log('Any existing shared files will now be available');
      onLoginSuccess();
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error && error.message.includes('User rejected')) {
        setUsernameError('Registration cancelled - signature required');
      } else {
        setUsernameError('Registration failed');
      }
    } finally {
      setUsernameLoading(false);
    }
  };

  if (checkingUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#67FFD4] text-xl mb-4" style={{ fontFamily: 'Irys2' }}>
            Checking your account...
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#67FFD4] mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-6xl text-white mb-4" style={{ fontFamily: 'Irys' }}>
            IRYSHARE
          </h1>
          <p className="text-[#67FFD4] text-lg" style={{ fontFamily: 'Irys2' }}>
            Decentralized File Sharing
          </p>
        </div>

        {/* Connect Wallet */}
        {!isConnected && (
          <div className="text-center">
            <div className="text-white text-xl mb-6" style={{ fontFamily: 'Irys2' }}>
              Connect your wallet to get started
            </div>
            <ConnectButton />
          </div>
        )}

        {/* Registration Form */}
        {isConnected && showRegister && (
          <div className="bg-[#111] border border-[#67FFD4] rounded-lg p-8">
            <h2 className="text-2xl text-[#67FFD4] mb-6 text-center" style={{ fontFamily: 'Irys2' }}>
              Create Your Account
            </h2>
            
            <div className="mb-4">
              <label className="text-white block mb-2" style={{ fontFamily: 'Irys2' }}>
                Choose a Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full bg-[#222] border border-[#67FFD4] text-white p-3 rounded-lg"
                style={{ fontFamily: 'Irys2' }}
                disabled={usernameLoading}
                autoFocus
              />
            </div>

            {usernameError && (
              <div className="text-red-400 mb-4 text-center" style={{ fontFamily: 'Irys2' }}>
                {usernameError}
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={usernameLoading}
              className="w-full bg-[#67FFD4] text-black font-bold py-3 rounded-lg hover:bg-[#8AFFE4] transition-colors disabled:opacity-50"
              style={{ fontFamily: 'Irys2' }}
            >
              {usernameLoading ? 'Signing with MetaMask...' : 'Create Account & Sign'}
            </button>

            <div className="text-center mt-4">
              <div className="text-sm text-gray-400" style={{ fontFamily: 'Irys2' }}>
                Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
              <div className="text-xs text-[#67FFD4] mt-2" style={{ fontFamily: 'Irys2' }}>
                You'll need to sign a message with MetaMask to register
              </div>
            </div>
          </div>
        )}

        {/* Already Connected */}
        {isConnected && !showRegister && (
          <div className="text-center">
            <div className="text-white text-xl mb-6" style={{ fontFamily: 'Irys2' }}>
              Welcome back!
            </div>
            <div className="text-[#67FFD4] mb-6" style={{ fontFamily: 'Irys2' }}>
              Checking your account...
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 