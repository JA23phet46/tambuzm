import React from 'react';
import { Search, Heart, LayoutDashboard, MessageSquare, Mail } from 'lucide-react';
import { UserRole } from '../types';

interface BottomNavProps {
  currentPage: string;
  isLoggedIn: boolean;
  userRole: UserRole;
  isAdmin?: boolean;
  onNavigate: (page: string) => void;
  chatsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentPage,
  isLoggedIn,
  userRole,
  isAdmin = false,
  onNavigate,
  chatsCount = 0,
}) => {
  // Suppress navigation shell for transactional or login-onboarding states as per instructions
  const isTransactional = ['checkout', 'payment-waiting', 'payment-airtel', 'select-photos', 'login', 'register', 'filters'].includes(currentPage);
  if (isTransactional) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#fbf9f8] border-t border-[#e4e2e2] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex justify-around items-center z-40 pb-safe">
      <button
        onClick={() => onNavigate('discovery')}
        className={`flex flex-col items-center justify-center w-16 h-12 transition-all ${
          currentPage === 'discovery' ? 'text-[#b52330]' : 'text-[#5a403f] hover:text-[#b52330]'
        }`}
      >
        <Search className={`w-5 h-5 ${currentPage === 'discovery' ? 'stroke-[2.5px]' : ''}`} />
        <span className="text-[10px] mt-1 font-semibold">Discovery</span>
      </button>

      <button
        onClick={() => onNavigate('saved')}
        className={`flex flex-col items-center justify-center w-16 h-12 transition-all ${
          currentPage === 'saved' ? 'text-[#b52330]' : 'text-[#5a403f] hover:text-[#b52330]'
        }`}
      >
        <Heart className={`w-5 h-5 ${currentPage === 'saved' ? 'fill-current stroke-[2.5px]' : ''}`} />
        <span className="text-[10px] mt-1 font-semibold">Saved</span>
      </button>

      <button
        onClick={() => {
          if (!isLoggedIn) {
            onNavigate('login');
          } else {
            onNavigate(isAdmin || userRole === UserRole.OWNER ? 'owner-dashboard' : 'seeker-dashboard');
          }
        }}
        className={`flex flex-col items-center justify-center w-16 h-12 transition-all ${
          currentPage === 'seeker-dashboard' || currentPage === 'owner-dashboard' ? 'text-[#b52330]' : 'text-[#5a403f] hover:text-[#b52330]'
        }`}
      >
        <LayoutDashboard className={`w-5 h-5 ${currentPage === 'seeker-dashboard' || currentPage === 'owner-dashboard' ? 'stroke-[2.5px]' : ''}`} />
        <span className="text-[10px] mt-1 font-semibold">Dashboard</span>
      </button>

      <button
        onClick={() => onNavigate('contact-us')}
        className={`flex flex-col items-center justify-center w-16 h-12 transition-all ${
          currentPage === 'contact-us' ? 'text-[#b52330]' : 'text-[#5a403f] hover:text-[#b52330]'
        }`}
      >
        <Mail className={`w-5 h-5 ${currentPage === 'contact-us' ? 'stroke-[2.5px]' : ''}`} />
        <span className="text-[10px] mt-1 font-semibold">Contact</span>
      </button>
    </nav>
  );
};
