'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { authAPI } from '@/lib/api';

interface HeaderProps {
  onSidebarToggle: (open: boolean) => void;
  sidebarOpen: boolean;
}

export function Header({ onSidebarToggle, sidebarOpen }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      localStorage.removeItem('auth_token');
      router.push('/login');
    }
  };

  return (
    <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={() => onSidebarToggle(!sidebarOpen)}
          className="lg:hidden p-2 hover:bg-background rounded-lg transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Search */}
        <div className="hidden md:flex items-center">
          <input
            type="text"
            placeholder="Search classes, students..."
            className="px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary w-64"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="p-2 hover:bg-background rounded-lg transition-colors relative">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 p-2 hover:bg-background rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <span className="hidden sm:block text-sm font-medium">{user?.firstName}</span>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-border py-2 z-50">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-sm font-medium">{user?.email}</p>
              </div>
              <a
                href="/dashboard/settings"
                className="block px-4 py-2 text-sm hover:bg-background transition-colors"
              >
                Settings
              </a>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
