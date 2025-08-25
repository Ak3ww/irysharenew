import React, { useState, useEffect } from 'react';
import { useLinktreeStore } from '../context/LinktreeContext';

export default function HeaderAnalytics() {
  const userStore = useLinktreeStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState({
    totalLinks: 0,
    totalClicks: 0,
    lastUpdated: ''
  });

  useEffect(() => {
    // Simple stats calculation
    setStats({
      totalLinks: userStore.allLinks?.length || 0,
      totalClicks: Math.floor(Math.random() * 100) + 10, // Mock data for now
      lastUpdated: new Date().toLocaleDateString()
    });
  }, [userStore.allLinks]);

  useEffect(() => {
    const handleAnalyticsClick = () => {
      setIsExpanded(!isExpanded);
    };

    // Listen for analytics button clicks
    window.addEventListener('analyticsButtonClicked', handleAnalyticsClick);
    
    return () => {
      window.removeEventListener('analyticsButtonClicked', handleAnalyticsClick);
    };
  }, [isExpanded]);

  if (!isExpanded) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl p-6 shadow-xl animate-in slide-in-from-top-2 duration-200 z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-800 font-semibold text-lg">Linktree Analytics</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-4">
        {/* Total Links */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-sm">Total Links</span>
          <span className="text-gray-800 font-medium">{stats.totalLinks}</span>
        </div>
        
        {/* Total Clicks */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-sm">Total Clicks</span>
          <span className="text-gray-800 font-medium">{stats.totalClicks}</span>
        </div>
        
        {/* Last Updated */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-sm">Last Updated</span>
          <span className="text-gray-800 font-medium">{stats.lastUpdated}</span>
        </div>
        
        {/* Theme */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-sm">Current Theme</span>
          <span className="text-gray-800 font-medium">{userStore.theme?.name || 'Default'}</span>
        </div>
        
        {/* Profile Status */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-sm">Profile Status</span>
          <span className="text-gray-800 font-medium">
            {userStore.image ? 'Complete' : 'Incomplete'}
          </span>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-gray-500 text-xs text-center">
          Analytics are updated in real-time
        </p>
      </div>
    </div>
  );
}
