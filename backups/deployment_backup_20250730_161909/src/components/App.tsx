import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Landing } from './Landing';
import { Home } from './Home';

export function App() {
  const { address, isConnected } = useAccount();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Reset login state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setIsLoggedIn(false);
    }
  }, [isConnected]);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  // Show landing page if not logged in
  if (!isLoggedIn) {
    return <Landing onLoginSuccess={handleLoginSuccess} />;
  }

  // Show main app if logged in
  return <Home onLogout={handleLogout} />;
} 