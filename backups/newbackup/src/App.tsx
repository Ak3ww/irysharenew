import { useState, useEffect } from 'react';

import { useAccount } from 'wagmi';
import { supabase } from './utils/supabase';
import { Landing } from './components/Landing';
import { Homepage } from './components/Homepage';
import { MyFiles } from './components/MyFiles';
import { SharedWithMe } from './components/SharedWithMe';
import { ProfileSettings } from './components/ProfileSettings';
import { Sidebar } from './components/Sidebar';
import { BackToTop } from './components/ui/back-to-top';

function App() {
  const { address, isConnected } = useAccount();
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Log when refreshTrigger changes
  useEffect(() => {
    console.log('🔄 Refresh trigger changed to:', refreshTrigger);
  }, [refreshTrigger]);

  // Check if user has a username when wallet connects
  useEffect(() => {
    if (!address || !isConnected) {
      setUsernameSaved(false);
      setCheckingUser(false);
      return;
    }

    const checkUsername = async () => {
      setCheckingUser(true);
      try {
        const { data, error } = await supabase
          .from('usernames')
          .select('username')
          .eq('address', address.toLowerCase().trim())
          .single();

        if (error && error.code === 'PGRST116') {
          setUsernameSaved(false);
        } else if (data) {
          setUsernameSaved(true);
        }
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameSaved(false);
      } finally {
        setCheckingUser(false);
      }
    };

    checkUsername();
  }, [address, isConnected]);



  const handleLoginSuccess = () => {
    setUsernameSaved(true);
  };

  const handleFileUpload = () => {
    // Trigger refresh of file lists
    console.log('🔄 Triggering file list refresh...');
    setRefreshTrigger(prev => prev + 1);
  };

  // Show loading while checking user
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

  // Show landing page if not connected or no username
  if (!isConnected || !usernameSaved) {
    return <Landing onLoginSuccess={handleLoginSuccess} />;
  }

  // Main app with fixed sidebar navigation
  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar 
        activePage={activePage} 
        onPageChange={setActivePage} 
        address={address}
      />
      
      <div className="flex-1 flex flex-col ml-[280px] md:ml-[280px]">
        <div className="flex-1 overflow-auto">
          {activePage === 'home' && (
            <Homepage 
              address={address || ''}
              isConnected={isConnected}
              usernameSaved={usernameSaved}
              onFileUpload={handleFileUpload}
              refreshTrigger={refreshTrigger}
            />
          )}
          
          {activePage === 'myfiles' && (
            <div className="p-6">
              <MyFiles 
                address={address || ''}
                isConnected={isConnected}
                usernameSaved={usernameSaved}
                refreshTrigger={refreshTrigger}
              />
            </div>
          )}
          
          {activePage === 'shared' && (
            <div className="p-6">
              <SharedWithMe 
                address={address || ''}
                isConnected={isConnected}
                usernameSaved={usernameSaved}
                refreshTrigger={refreshTrigger}
              />
              </div>
          )}
          
          {activePage === 'profile' && (
            <div className="p-6">
              <ProfileSettings 
                address={address || ''}
                isConnected={isConnected}
                usernameSaved={usernameSaved}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
}

export default App;