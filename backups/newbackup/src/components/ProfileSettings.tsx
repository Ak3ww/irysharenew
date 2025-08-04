import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Save, Eye, EyeOff, User } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface ProfileSettingsProps {
  address: string;
  isConnected: boolean;
  usernameSaved: boolean;
}

export function ProfileSettings({ address, isConnected, usernameSaved }: ProfileSettingsProps) {
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [profileVisible, setProfileVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);

  // Fetch current profile data
  useEffect(() => {
    if (!address || !isConnected || !usernameSaved) return;
    
    const fetchProfile = async () => {
      setUsernameLoading(true);
      const normalizedAddress = address.toLowerCase().trim();
      
      try {
        // Fetch username
        const { data: usernameData, error: usernameError } = await supabase
          .from('usernames')
          .select('username')
          .eq('address', normalizedAddress)
          .single();
        
        if (usernameError) {
          console.error('Error fetching username:', usernameError);
        } else if (usernameData) {
          setCurrentUsername(usernameData.username);
          setUsername(usernameData.username);
        }

        // Fetch profile visibility from files (check if any files are profile visible)
        const { data: filesData, error: filesError } = await supabase
          .from('files')
          .select('profile_visible')
          .eq('owner_address', normalizedAddress)
          .limit(1);
        
        if (!filesError && filesData && filesData.length > 0) {
          setProfileVisible(filesData[0].profile_visible);
        }
        
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setUsernameLoading(false);
      }
    };
    
    fetchProfile();
  }, [address, isConnected, usernameSaved]);

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!address) {
      setError('Wallet address is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check if username is taken (excluding current user)
      if (username.trim() !== currentUsername) {
        const { data: existing } = await supabase
          .from('usernames')
          .select('id')
          .eq('username', username.trim())
          .neq('address', address.toLowerCase().trim())
          .single();

        if (existing) {
          setError('Username is already taken');
          setLoading(false);
          return;
        }
      }

      // Request MetaMask signature to prove wallet ownership
      if (!(window as any).ethereum) {
        setError('MetaMask is required for username update');
        setLoading(false);
        return;
      }

      const message = `Iryshare Username Update\n\nWallet: ${address}\nNew Username: ${username.trim()}\n\nSign this message to update your username.`;

      const signature = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });

      if (!signature) {
        setError('Signature required for username update');
        setLoading(false);
        return;
      }

      // Update username in Supabase
      const { error: updateError } = await supabase
        .from('usernames')
        .update({
          username: username.trim(),
          registration_signature: signature
        })
        .eq('address', address.toLowerCase().trim());

      if (updateError) {
        setError('Error updating username');
        setLoading(false);
        return;
      }

      setCurrentUsername(username.trim());
      setSuccess('Username updated successfully!');
    } catch (error) {
      console.error('Username update error:', error);
      if (error instanceof Error && error.message.includes('User rejected')) {
        setError('Username update cancelled - signature required');
      } else {
        setError('Username update failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfileVisibility = async () => {
    if (!address) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Update profile visibility for all user's files
      const { error } = await supabase
        .from('files')
        .update({ profile_visible: profileVisible })
        .eq('owner_address', address.toLowerCase().trim());

      if (error) {
        setError('Error updating profile visibility');
        setLoading(false);
        return;
      }

      setSuccess('Profile visibility updated successfully!');
    } catch (error) {
      console.error('Profile visibility update error:', error);
      setError('Profile visibility update failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected || !usernameSaved) {
    return (
      <div className="bg-[#111] border border-[#67FFD4] rounded-lg p-6">
        <p className="text-[#67FFD4] text-center">Please connect your wallet and set a username to access profile settings.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-[#67FFD4] rounded-lg p-6">
      <h3 className="text-xl text-white font-semibold mb-6">Profile Settings</h3>

      {usernameLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#67FFD4] mx-auto"></div>
          <p className="text-[#67FFD4] mt-2">Loading profile...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Username Section */}
          <div className="bg-[#222] rounded-lg p-4">
            <h4 className="text-lg text-white font-medium mb-4 flex items-center gap-2">
              <User size={20} />
              Username
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="text-[#67FFD4] text-sm font-medium block mb-2">
                  Current Username
                </label>
                <div className="text-white bg-[#333] px-3 py-2 rounded border border-gray-600">
                  @{currentUsername}
                </div>
              </div>
              
              <div>
                <label className="text-[#67FFD4] text-sm font-medium block mb-2">
                  New Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter new username"
                  className="w-full bg-[#333] border border-[#67FFD4] text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#67FFD4]"
                  disabled={loading}
                />
              </div>
              
              <Button
                variant="irys"
                onClick={handleSaveUsername}
                disabled={loading || username.trim() === currentUsername}
                className="flex items-center gap-2"
              >
                <Save size={16} />
                Update Username
              </Button>
            </div>
          </div>

          {/* Profile Visibility Section */}
          <div className="bg-[#222] rounded-lg p-4">
            <h4 className="text-lg text-white font-medium mb-4 flex items-center gap-2">
              {profileVisible ? <Eye size={20} /> : <EyeOff size={20} />}
              Profile Visibility
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="profileVisible"
                  checked={profileVisible}
                  onChange={(e) => setProfileVisible(e.target.checked)}
                  className="w-4 h-4 text-[#67FFD4] bg-[#333] border-[#67FFD4] rounded focus:ring-[#67FFD4]"
                  disabled={loading}
                />
                <label htmlFor="profileVisible" className="text-white">
                  Make my profile and files publicly searchable
                </label>
              </div>
              
              <p className="text-sm text-gray-400">
                {profileVisible 
                  ? "Your profile and files will be visible to other users and searchable by username."
                  : "Your profile and files will be private and not searchable by other users."
                }
              </p>
              
              <Button
                variant="outline"
                onClick={handleSaveProfileVisibility}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Save size={16} />
                Update Visibility
              </Button>
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-900/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 