import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { Video, Search, MessageSquare, User, Shield } from 'lucide-react';

export function Navbar() {
  const { user, profile, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Explore', path: '/', icon: Search },
    { label: 'Chat', path: '/chat', icon: MessageSquare, hideOnLoggedOut: true },
    { label: 'Profile', path: '/profile', icon: User, hideOnLoggedOut: true },
    { label: 'Admin', path: '/admin', icon: Shield, hideOnLoggedOut: true, showIfStaff: true },
  ];

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 px-6 py-4 flex justify-between items-center glass-navbar md:bg-black/80 md:backdrop-blur-xl">
        <Link to="/" className="flex items-center space-x-2 text-white">
          <Video className="w-8 h-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          <span className="font-semibold text-lg tracking-tight hidden sm:block">Liquid Glass</span>
        </Link>
        
        <div className="flex items-center space-x-2">
          <div className="hidden md:flex glass-pill p-1 space-x-1 mr-4">
            {navItems.map((item) => {
              if (item.hideOnLoggedOut && !user) return null;
              if (item.showIfStaff && (!profile || !['admin', 'vice_admin', 'moderator'].includes(profile.role))) return null;
              
              const isProfileLabel = item.label === 'Profile';
              const navPath = isProfileLabel && profile ? `/profile/${profile.handle}` : item.path;
              const isActive = item.path === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(item.path);
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.label}
                  to={navPath}
                  className={cn(
                    "px-4 py-2 text-[15px] font-medium transition-all rounded-[14px] flex items-center space-x-2 text-white/70 hover:text-white",
                    isActive && "bg-white/10 text-white shadow-inner"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {!user ? (
            <Link to="/auth">
              <Button variant="primary" size="sm">Sign In</Button>
            </Link>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="hidden md:block">
                <Button variant="ghost" size="sm" onClick={logout}>Sign Out</Button>
              </div>
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-9 h-9 rounded-2xl border border-white/20 object-cover shadow-inner" />
              ) : (
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-gray-800 to-gray-600 flex items-center justify-center text-sm font-bold border border-white/20 shadow-inner">
                  {profile?.name?.substring(0, 1).toUpperCase() || profile?.handle?.substring(0, 2).toUpperCase() || "..."}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Tab Bar */}
      <nav className="fixed bottom-0 w-full z-50 md:hidden bg-[#050A1A]/90 backdrop-blur-[40px] border-t border-white/10 px-6 py-4 pb-safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            if (item.hideOnLoggedOut && !user) return null;
            if (item.showIfStaff && (!profile || !['admin', 'vice_admin', 'moderator'].includes(profile.role))) return null;

            const isProfileLabel = item.label === 'Profile';
            const navPath = isProfileLabel && profile ? `/profile/${profile.handle}` : item.path;
            const isActive = item.path === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(item.path);
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                to={navPath}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all",
                  isActive ? "text-white" : "text-white/40"
                )}
              >
                <div className={cn("p-2 rounded-xl transition-all", isActive && "bg-white/10")}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
