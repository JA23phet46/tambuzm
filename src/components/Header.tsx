import React from 'react';
import { Menu, ArrowLeft, LogIn, User } from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  currentPage: string;
  isLoggedIn: boolean;
  userRole: UserRole;
  userName: string;
  onBack: () => void;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  isAdmin?: boolean;
  adminModeActive?: boolean;
  chatsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  isLoggedIn,
  userRole,
  userName,
  onBack,
  onNavigate,
  onLogout,
  isAdmin = false,
  adminModeActive = false,
  chatsCount = 0,
}) => {
  const showBackButton = ['details', 'checkout', 'payment-waiting', 'payment-airtel', 'filters', 'select-photos', 'add-property'].includes(currentPage);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-[#fbf9f8]/95 backdrop-blur-md border-b border-[#e4e2e2] flex items-center justify-between px-4 md:px-10">
      <div className="flex items-center gap-3">
        {showBackButton ? (
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-[#f0eded] active:scale-95 transition-all text-[#b52330]"
            id="back-button"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <button 
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-[#f0eded] text-[#5a403f]"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        
        <span 
          onClick={() => onNavigate('discovery')}
          className="font-bold text-2xl text-[#b52330] lowercase tracking-tight cursor-pointer select-none"
        >
          tambu
        </span>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-6">
        <button
          onClick={() => onNavigate('discovery')}
          className={`font-semibold text-sm transition-colors py-2 px-3 rounded-lg ${
            currentPage === 'discovery' ? 'text-[#b52330] font-bold' : 'text-[#5a403f] hover:bg-[#f0eded]'
          }`}
        >
          Discovery
        </button>
        <button
          onClick={() => onNavigate('saved')}
          className={`font-semibold text-sm transition-colors py-2 px-3 rounded-lg ${
            currentPage === 'saved' ? 'text-[#b52330] font-bold' : 'text-[#5a403f] hover:bg-[#f0eded]'
          }`}
        >
          Saved
        </button>
        <button
          onClick={() => onNavigate(isLoggedIn ? 'seeker-dashboard' : 'login')}
          className={`font-semibold text-sm transition-colors py-2 px-3 rounded-lg ${
            currentPage === 'seeker-dashboard' ? 'text-[#b52330] font-bold' : 'text-[#5a403f] hover:bg-[#f0eded]'
          }`}
        >
          Dashboard
        </button>

        <button
          onClick={() => onNavigate('contact-us')}
          className={`font-semibold text-sm transition-colors py-2 px-3 rounded-lg ${
            currentPage === 'contact-us' ? 'text-[#b52330] font-bold' : 'text-[#5a403f] hover:bg-[#f0eded]'
          }`}
        >
          Contact Us
        </button>
      </nav>

      {/* Auth & Profile actions */}
      <div className="flex items-center gap-3">
        {isLoggedIn ? (
          <>
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-xs font-semibold text-[#1b1c1c]">
                {userName.split(' ')[0]}
              </span>
              <button
                onClick={onLogout}
                className="text-xs text-[#b52330] hover:underline font-semibold"
              >
                Log Out
              </button>
              <div 
                onClick={() => onNavigate('seeker-dashboard')}
                className="w-9 h-9 rounded-full bg-[#ffdad8] flex items-center justify-center border border-[#e4e2e2] cursor-pointer hover:border-[#b52330] transition-colors"
                title="View Dashboard"
              >
                <span className="text-xs font-bold text-[#b52330] uppercase">
                  {userName ? userName.charAt(0) : 'U'}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => onNavigate('login')}
              className="text-xs font-semibold text-[#1b1c1c] px-3 py-2 rounded-lg hover:bg-[#f0eded] transition-all flex items-center gap-1"
            >
              <LogIn className="w-3.5 h-3.5" /> Log In
            </button>
            <button 
              onClick={() => onNavigate('register')}
              className="bg-[#b52330] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#9a1c26] transition-all shadow-sm"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
