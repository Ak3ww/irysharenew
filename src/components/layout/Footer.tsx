import { Twitter } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-black/20 backdrop-blur-sm border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and Description */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-[#67FFD4] to-[#8AFFE4] rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm">I</span>
              </div>
              <span className="text-white font-bold text-xl" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
                IRYSHARE
              </span>
            </div>
            <p className="text-white/60 text-sm text-center md:text-left max-w-md">
              Decentralized file sharing and token distribution on the Irys Network
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-6">
            <a
              href="https://x.com/iryshare"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white/60 hover:text-[#67FFD4] transition-colors group"
            >
              <Twitter size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">@iryshare</span>
            </a>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="text-white/40 text-xs text-center md:text-right">
              <p>Built on Irys Network</p>
              <p>Powered by Lit Protocol</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-6 pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40">
            <div className="flex items-center gap-6">
              <span>© 2024 Iryshare</span>
              <span>•</span>
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Version 1.0.0</span>
              <span>•</span>
              <span>Testnet</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 