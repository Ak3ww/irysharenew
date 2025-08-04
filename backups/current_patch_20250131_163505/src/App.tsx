import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

import { useAccount } from 'wagmi';
import { supabase } from './utils/supabase';
import { Landing } from './components/pages/Landing';
import { Homepage } from './components/pages/Homepage';
import { MyFiles } from './components/pages/MyFiles';
import { SharedWithMe } from './components/pages/SharedWithMe';
import { ProfileSettings } from './components/pages/ProfileSettings';
import { Profile } from './components/pages/Profile';
import { SendTokens } from './components/pages/SendTokens';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { AnalyticsDashboard } from './components/admin/AnalyticsDashboard';

import { BackToTop } from './components/ui/back-to-top';
import { ProfileWidget } from './components/layout/ProfileWidget';

import { Toaster } from './components/ui/toaster';

function AppContent() {
  const { address, isConnected } = useAccount();
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Determine active page from location
  const getActivePage = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path === '/myfiles') return 'myfiles';
    if (path === '/shared') return 'shared';
    if (path === '/sendtokens') return 'sendtokens';
    if (path === '/profile') return 'profile';
    if (path === '/api-docs') return 'api-docs';
    if (path.startsWith('/profile/')) return 'profile';
    return 'home';
  };
  
  const activePage = getActivePage();
  
  const setActivePage = (page: string) => {
    switch (page) {
      case 'home':
        navigate('/');
        break;
      case 'myfiles':
        navigate('/myfiles');
        break;
      case 'shared':
        navigate('/shared');
        break;
      case 'sendtokens':
        navigate('/sendtokens');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'api-docs':
        navigate('/api-docs');
        break;
    }
  };



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

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto pb-20 pt-16">
          <Routes>
            <Route path="/" element={
              <Homepage 
                address={address || ''}
                isConnected={isConnected}
                usernameSaved={usernameSaved}
                onFileUpload={handleFileUpload}
                refreshTrigger={refreshTrigger}
              />
            } />
            
            <Route path="/myfiles" element={
              <div className="p-4">
                <MyFiles 
                  address={address || ''}
                  isConnected={isConnected}
                  usernameSaved={usernameSaved}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            } />
            
            <Route path="/shared" element={
              <div className="p-4">
                <SharedWithMe 
                  address={address || ''}
                  isConnected={isConnected}
                  usernameSaved={usernameSaved}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            } />
            
            <Route path="/sendtokens" element={
              <SendTokens 
                onBack={() => setActivePage('home')}
              />
            } />
            
            <Route path="/profile" element={
              <div className="p-4">
                <ProfileSettings 
                  address={address || ''}
                  isConnected={isConnected}
                  usernameSaved={usernameSaved}
                />
              </div>
            } />
            
            <Route path="/profile/:username" element={<div className="p-4"><Profile /></div>} />
          </Routes>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <MobileNav 
          activePage={activePage} 
          onPageChange={setActivePage} 
          address={address}
        />
        
        {/* Back to Top Button */}
        <BackToTop />
        
        {/* Floating Profile Widget - mobile version */}
        <ProfileWidget 
          address={address || ''} 
          isConnected={isConnected} 
          usernameSaved={usernameSaved} 
          isMobile={true}
        />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar 
        activePage={activePage} 
        onPageChange={setActivePage} 
        address={address}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
      />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-0 pb-20' : 'ml-[280px] md:ml-[280px]'}`}>
        <div className="flex-1 overflow-auto pt-16">
          <Routes>
            <Route path="/" element={
              <Homepage 
                address={address || ''}
                isConnected={isConnected}
                usernameSaved={usernameSaved}
                onFileUpload={handleFileUpload}
                refreshTrigger={refreshTrigger}
                onPageChange={setActivePage}
              />
            } />
            
            <Route path="/myfiles" element={
              <div className="p-6">
                <MyFiles 
                  address={address || ''}
                  isConnected={isConnected}
                  usernameSaved={usernameSaved}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            } />
            
            <Route path="/shared" element={
              <div className="p-6">
                <SharedWithMe 
                  address={address || ''}
                  isConnected={isConnected}
                  usernameSaved={usernameSaved}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            } />
            
            <Route path="/sendtokens" element={
              <SendTokens 
                onBack={() => setActivePage('home')}
              />
            } />
            
            <Route path="/profile" element={
              <div className="p-6">
                <ProfileSettings 
                  address={address || ''}
                  isConnected={isConnected}
                  usernameSaved={usernameSaved}
                />
              </div>
            } />
            
            <Route path="/profile/:username" element={<div className="p-6"><Profile /></div>} />
            
            {/* Admin Analytics Dashboard */}
            <Route path="/admin/analytics" element={
              <AnalyticsDashboard refreshTrigger={refreshTrigger} />
            } />
            

          </Routes>
        </div>
        

      </div>
      
      {/* Back to Top Button */}
      <BackToTop />
      
      {/* Floating Profile Widget - desktop version */}
      <div className={`fixed top-0 z-[9999] ${sidebarCollapsed ? 'left-0 right-0' : 'left-[280px] right-0'}`}>
        <ProfileWidget 
          address={address || ''} 
          isConnected={isConnected} 
          usernameSaved={usernameSaved} 
          isMobile={false}
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
      <Toaster />
    </Router>
  );
}

export default App;