import React from 'react';
import { useLocation } from 'react-router-dom';
import { LinktreeProvider } from './context/LinktreeContext';
import AdminIndex from './pages/AdminIndex';
import AdminApperance from './pages/AdminApperance';
import HeaderSaveTrigger from './components/HeaderSaveTrigger';

export default function LinktreeDashboard() {
  const location = useLocation();
  
  // Extract the sub-path after /linktree/admin/
  const subPath = location.pathname.replace('/linktree/admin', '') || '/';
  
  // Clean conditional rendering
  if (subPath === '/apperance') {
    return (
      <LinktreeProvider>
        <div className="bg-black min-h-screen">
          <AdminApperance />
          <HeaderSaveTrigger />
        </div>
      </LinktreeProvider>
    );
  }
  
  // Default to AdminIndex for all other paths (/, empty, etc.)
  return (
    <LinktreeProvider>
      <div className="bg-black min-h-screen">
        <AdminIndex />
        <HeaderSaveTrigger />
      </div>
    </LinktreeProvider>
  );
}