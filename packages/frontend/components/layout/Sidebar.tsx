'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

interface SidebarProps {
  open: boolean;
  onToggle: (open: boolean) => void;
}

export function Sidebar({ open, onToggle }: SidebarProps) {
  const { user } = useAuthStore();
  const pathname = usePathname();

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    { href: '/dashboard/classes', label: 'Classes', icon: '📚', roles: ['ADMIN', 'TEACHER'] },
    { href: '/dashboard/students', label: 'Students', icon: '👥', roles: ['ADMIN', 'TEACHER'] },
    { href: '/dashboard/attendance', label: 'Attendance', icon: '✓', roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    { href: '/dashboard/reports', label: 'Reports', icon: '📈', roles: ['ADMIN', 'TEACHER'] },
    { href: '/dashboard/settings', label: 'Settings', icon: '⚙️', roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
  ];

  const visibleItems = menuItems.filter((item) =>
    item.roles.includes(user?.role || 'STUDENT')
  );

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={() => onToggle(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-0 h-screen bg-white border-r border-border flex flex-col transition-transform lg:relative lg:translate-x-0 z-40',
          open ? 'translate-x-0' : '-translate-x-full',
          'w-64'
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-primary">EduGuard</h1>
          <p className="text-xs text-muted mt-1">Attendance System</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                pathname === item.href
                  ? 'bg-primary text-white'
                  : 'text-foreground hover:bg-background'
              )}
              onClick={() => window.innerWidth < 1024 && onToggle(false)}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-border">
          <div className="text-sm">
            <p className="font-medium text-foreground">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted">{user?.role}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
