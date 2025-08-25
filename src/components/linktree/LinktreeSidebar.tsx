import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface LinktreeSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export default function LinktreeSidebar({ isCollapsed = false, onToggleCollapse }: LinktreeSidebarProps) {
  // Collapsed state - exact copy of main app sidebar
  if (isCollapsed) {
    return (
      <div className="w-16 bg-black min-h-screen flex flex-col items-center py-4 border-r border-gray-800">
        <div className="mb-8">
          <img src="/iryshare_logo.svg" alt="Logo" className="w-8 h-8" />
        </div>
        <button
          onClick={() => onToggleCollapse?.(false)}
          className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-800 rounded-full p-1 text-white hover:bg-gray-700 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  // Full sidebar - exact copy of main app sidebar
  return (
    <div className="fixed left-0 top-0 w-[280px] bg-black min-h-screen flex flex-col border-r border-gray-800 z-40">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-1">
          <img 
            src="/iryshare_logo.svg" 
            alt="Iryshare Logo" 
            className="h-20 w-auto logo-svg"
          />
          <span className="text-white font-semibold" style={{ fontFamily: 'IrysItalic', letterSpacing: '0.1em' }}>
            LINKTREE
          </span>
        </div>
        <button
          onClick={() => onToggleCollapse?.(true)}
          className="text-gray-400 hover:text-white transition-colors p-2 rounded-md hover:bg-gray-800 bg-gray-800/70 border border-gray-700/50"
          title="Collapse to bottom toolbar"
        >
          <ChevronRight size={20} />
        </button>
      </div>

        <div className="py-2 px-3 flex flex-col gap-1 flex-1">
          <NavLink 
            to="/linktree/admin"
            end
            className={({ isActive }) =>
              `w-full flex items-center gap-3 p-3 rounded-md transition-colors relative ${
                isActive 
                  ? 'bg-[#67FFD4]/20 text-[#67FFD4]' 
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-sm font-medium flex-1 text-left" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
              DASHBOARD
            </span>
          </NavLink>

          <NavLink 
            to="/linktree/admin/apperance"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 p-3 rounded-md transition-colors relative ${
                isActive 
                  ? 'bg-[#67FFD4]/20 text-[#67FFD4]' 
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
            <span className="text-sm font-medium flex-1 text-left" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
              APPEARANCE
            </span>
          </NavLink>
        </div>

        {/* Back to App */}
        <div className="p-4 border-t border-gray-800">
          <NavLink 
            to="/"
            className="w-full flex items-center gap-3 p-3 rounded-md transition-colors text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm font-medium flex-1 text-left" style={{ fontFamily: 'Irys1', letterSpacing: '0.1em' }}>
              BACK TO APP
            </span>
          </NavLink>
        </div>
      </div>
    );
  }
