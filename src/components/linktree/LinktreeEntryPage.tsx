import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, Palette, Share2 } from 'lucide-react';

export default function LinktreeEntryPage() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isConnected && address) {
      navigate('/linktree/admin');
    } else {
      // Handle not connected state
      console.log('Please connect your wallet first');
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
            CREATE YOUR <span style={{ fontFamily: 'IrysItalic', letterSpacing: '0.1em' }} className="ml-1">LINKTREE</span>
          </h1>
          <p className="text-[#67FFD4] text-lg md:text-xl mb-4" style={{ fontFamily: 'Irys2' }}>
            Share all your important links in one place
          </p>
        </div>

        {!isConnected ? (
          <div className="text-center mb-8">
            <div className="text-white text-lg mb-6" style={{ fontFamily: 'Irys2' }}>
              Connect your wallet to get started
            </div>
            <ConnectButton />
            <p className="text-white/50 mt-4" style={{ fontFamily: 'Irys2' }}>
              Connect with MetaMask or any Web3 wallet
            </p>
          </div>
        ) : (
          <div className="text-center mb-8">
            <button
              onClick={() => navigate('/linktree/create')}
              className="btn-irys px-8 py-4 text-lg font-bold rounded-xl transform hover:scale-105 transition-all duration-300 shadow-lg"
              style={{ fontFamily: 'Irys2' }}
            >
              CREATE YOUR LINKTREE
            </button>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 group">
            <Link className="w-8 h-8 text-[#67FFD4] mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-white font-bold mb-3 text-sm" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
              CUSTOMIZE LINKS
            </h3>
            <p className="text-white/60 text-xs" style={{ fontFamily: 'Irys2' }}>
              Add, edit, and organize your links with ease
            </p>
          </div>
          <div className="text-center p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 group">
            <Palette className="w-8 h-8 text-[#67FFD4] mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-white font-bold mb-3 text-sm" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
              BEAUTIFUL TEMPLATES
            </h3>
            <p className="text-white/60 text-xs" style={{ fontFamily: 'Irys2' }}>
              Choose from multiple stunning design templates
            </p>
          </div>
          <div className="text-center p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 group">
            <Share2 className="w-8 h-8 text-[#67FFD4] mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-white font-bold mb-3 text-sm" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
              SHARE EVERYWHERE
            </h3>
            <p className="text-white/60 text-xs" style={{ fontFamily: 'Irys2' }}>
              Share your linktree on any platform or website
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
            HOW IT WORKS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-[#67FFD4] rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-black font-bold text-xl">1</span>
              </div>
              <h3 className="text-white font-bold mb-3 text-xl" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
                CONNECT WALLET
              </h3>
              <p className="text-white/60 text-xs" style={{ fontFamily: 'Irys2' }}>
                Connect your Web3 wallet to get started
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-[#67FFD4] rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-black font-bold text-xl">2</span>
              </div>
              <h3 className="text-white font-bold mb-3 text-xl" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
                ADD YOUR LINKS
              </h3>
              <p className="text-white/60 text-xs" style={{ fontFamily: 'Irys2' }}>
                Add all your important links and customize them
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-[#67FFD4] rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-black font-bold text-xl">3</span>
              </div>
              <h3 className="text-white font-bold mb-3 text-xl" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
                SHARE & GROW
              </h3>
              <p className="text-white/60 text-xs" style={{ fontFamily: 'Irys2' }}>
                Share your linktree and grow your online presence
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

