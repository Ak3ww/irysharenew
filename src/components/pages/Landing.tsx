import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { supabase } from '../../utils/supabase';
import { ArrowRight, Shield, Zap, Globe } from 'lucide-react';
import { trackUserRegistration, trackUserLogin, trackPageView } from '../../utils/analytics';

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
  const [animateLogo, setAnimateLogo] = useState(false);
  const [animateContent, setAnimateContent] = useState(false);

  // Animation triggers
  useEffect(() => {
    setAnimateLogo(true);
    setTimeout(() => setAnimateContent(true), 500);
    
    // Track page view
    trackPageView('landing');
  }, []);

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
        
        // Track user login
        trackUserLogin('metamask', address);
        
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

      // Step 4: Automatically approve user for future uploads
      try {
        const response = await fetch('/api/approve-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userAddress: address
          })
        });

        if (response.ok) {
          // User automatically approved for future uploads
        } else {
          console.warn('⚠️ Auto-approval failed, but registration was successful');
        }
      } catch (approvalError) {
        console.warn('⚠️ Auto-approval failed:', approvalError);
        // Don't fail registration if approval fails
      }

      // Step 5: Update any existing file_shares for this address
      // This is handled automatically by the database trigger
      
      // Track user registration
      trackUserRegistration('metamask', address);
      
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
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#67FFD4] text-xl mb-4 animate-pulse" style={{ fontFamily: 'Irys2' }}>
            Checking your account...
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#67FFD4] mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#18191a] p-4 relative">
      <div className="max-w-4xl w-full mx-auto relative z-10 py-16">
        {/* Logo with Animation - Compact */}
        <div className="text-center mb-8">
          <div className={`flex justify-center mb-4 transition-all duration-1000 ${animateLogo ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
            <img 
              src="/iryshare_logo.svg" 
              alt="Iryshare Logo" 
              className="h-32 w-auto logo-svg drop-shadow-2xl"
            />
          </div>
          <div className={`transition-all duration-1000 delay-300 ${animateContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
              WELCOME TO <span style={{ fontFamily: 'IrysItalic', letterSpacing: '0.1em' }} className="ml-1">IRYSHARE</span>
          </h1>
            <p className="text-[#67FFD4] text-lg md:text-xl mb-4" style={{ fontFamily: 'Irys2' }}>
              Decentralized File Sharing & Token Distribution
            </p>
            <p className="text-white/70 text-base max-w-lg mx-auto leading-relaxed" style={{ fontFamily: 'Irys2' }}>
              Share files securely, distribute tokens instantly, and build the future of decentralized collaboration
            </p>
          </div>
        </div>

        {/* Features Grid - Compact */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 transition-all duration-1000 delay-500 ${animateContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 group">
            <Shield className="w-8 h-8 text-[#67FFD4] mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-white font-bold mb-1 text-sm" style={{ fontFamily: 'Irys2' }}>Secure Sharing</h3>
            <p className="text-white/60 text-xs" style={{ fontFamily: 'Irys2' }}>
              End-to-end encryption with Lit Protocol
            </p>
          </div>
          <div className="text-center p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 group">
            <Zap className="w-8 h-8 text-[#67FFD4] mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-white font-bold mb-1 text-sm" style={{ fontFamily: 'Irys2' }}>Instant Tokens</h3>
            <p className="text-white/60 text-xs" style={{ fontFamily: 'Irys2' }}>
              Distribute IRYS tokens to multiple wallets
            </p>
          </div>
          <div className="text-center p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 group">
            <Globe className="w-8 h-8 text-[#67FFD4] mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-white font-bold mb-1 text-sm" style={{ fontFamily: 'Irys2' }}>Decentralized</h3>
            <p className="text-white/60 text-xs" style={{ fontFamily: 'Irys2' }}>
              Built on Irys Network for true decentralization
            </p>
          </div>
        </div>

        {/* Connect Wallet - Compact */}
        {!isConnected && (
          <div className={`text-center transition-all duration-1000 delay-700 ${animateContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-white text-lg mb-6" style={{ fontFamily: 'Irys2' }}>
              Connect your wallet to get started
            </div>
            <div className="flex justify-center">
              <div className="transform hover:scale-105 transition-transform duration-300">
            <ConnectButton />
              </div>
            </div>
            <div className="mt-4 text-white/50 text-xs" style={{ fontFamily: 'Irys2' }}>
              <ArrowRight className="w-3 h-3 inline mr-1 animate-pulse" />
              Connect with MetaMask or any Web3 wallet
            </div>
          </div>
        )}

        {/* Registration Modal - Full Screen Overlay */}
        {isConnected && showRegister && (
          <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[99999] p-4"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
          >
            <div className={`bg-white/5 backdrop-blur-xl border border-[#67FFD4]/30 rounded-2xl p-6 shadow-2xl transition-all duration-1000 delay-300 max-w-md w-full ${animateContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <h2 className="text-2xl text-[#67FFD4] mb-6 text-center font-bold" style={{ fontFamily: 'Irys2' }}>
              Create Your Account
            </h2>
            
            <div className="mb-4">
              <label className="text-white block mb-2 font-semibold text-sm" style={{ fontFamily: 'Irys2' }}>
                Choose a Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full bg-white/10 border border-[#67FFD4]/50 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#67FFD4] focus:border-transparent transition-all backdrop-blur-sm text-sm"
                style={{ fontFamily: 'Irys2' }}
                disabled={usernameLoading}
                autoFocus
              />
            </div>

            {usernameError && (
              <div className="text-red-400 mb-4 text-center animate-pulse text-sm" style={{ fontFamily: 'Irys2' }}>
                {usernameError}
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={usernameLoading}
              className="w-full bg-gradient-to-r from-[#67FFD4] to-[#8AFFE4] text-black font-bold py-3 rounded-xl hover:from-[#8AFFE4] hover:to-[#67FFD4] transition-all duration-300 disabled:opacity-50 transform hover:scale-105 shadow-lg text-sm"
              style={{ fontFamily: 'Irys2' }}
            >
              {usernameLoading ? 'Signing with MetaMask...' : 'Create Account & Sign'}
            </button>

            <div className="text-center mt-4">
              <div className="text-xs text-white/70" style={{ fontFamily: 'Irys2' }}>
                Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
              <div className="text-xs text-[#67FFD4] mt-2" style={{ fontFamily: 'Irys2' }}>
                You'll need to sign a message with MetaMask to register
              </div>
            </div>
            </div>
          </div>
        )}

        {/* Already Connected - Compact */}
        {isConnected && !showRegister && (
          <div className={`text-center transition-all duration-1000 delay-300 ${animateContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-white text-xl mb-4" style={{ fontFamily: 'Irys2' }}>
              Welcome back!
            </div>
            <div className="text-[#67FFD4] mb-4 animate-pulse text-sm" style={{ fontFamily: 'Irys2' }}>
              Checking your account...
            </div>
          </div>
        )}


      </div>
    </div>
  );
} 