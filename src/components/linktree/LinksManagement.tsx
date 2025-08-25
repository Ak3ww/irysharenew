import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useToast } from '../../hooks/use-toast';
import { 
  loadLinktreeData, 
  type Link 
} from '../../utils/linktreeStorage';
import { Plus, Link as LinkIcon } from 'lucide-react';
import AddLink from './components/AddLink';

export default function LinksManagement() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  
  const [links, setLinks] = useState<Link[]>([]);
  const [showAddLink, setShowAddLink] = useState(false);

  // Load existing data on component mount
  useEffect(() => {
    if (isConnected && address) {
      loadExistingData();
    }
  }, [isConnected, address]);

  const loadExistingData = async () => {
    if (!address) return;
    
    try {
      const data = await loadLinktreeData(address);
      if (data) {
        // Convert the storage data to match the Link interface
        const convertedLinks: Link[] = (data.links || []).map(link => ({
          ...link,
          user_id: typeof link.user_id === 'string' ? parseInt(link.user_id, 16) : link.user_id
        }));
        setLinks(convertedLinks);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load your links.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
          MANAGE YOUR LINKS
        </h2>
        <button
          onClick={() => setShowAddLink(true)}
          className="flex items-center gap-3 px-4 py-2 bg-[#67FFD4] text-black font-semibold rounded-lg hover:bg-[#8AFFE4] transition-colors"
          style={{ fontFamily: 'Irys1' }}
        >
          <Plus className="w-5 h-5" />
          ADD LINK
        </button>
      </div>

      {links.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <LinkIcon className="w-8 h-8 text-[#67FFD4]" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
            NO LINKS YET
          </h3>
          <p className="text-white/60 mb-6" style={{ fontFamily: 'Irys2' }}>
            Start building your linktree by adding your first link
          </p>
          <button
            onClick={() => setShowAddLink(true)}
            className="px-6 py-3 bg-[#67FFD4] text-black font-semibold rounded-lg hover:bg-[#8AFFE4] transition-colors"
            style={{ fontFamily: 'Irys1' }}
          >
            ADD YOUR FIRST LINK
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <div key={link.id} className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-sm" style={{ 
                        fontFamily: 'Irys1',
                        letterSpacing: '0.1em'
                      }}>{link.name.toUpperCase()}</h3>
                      <p className="text-white/80 text-sm truncate max-w-[300px]" style={{ 
                        fontFamily: 'Irys2'
                      }}>{link.url}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddLink && (
        <AddLink
          onClose={() => setShowAddLink(false)}
          onLinkAdded={() => {
            setShowAddLink(false);
            loadExistingData();
          }}
        />
      )}
    </div>
  );
}
