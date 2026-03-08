import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface QuickActionsProps {
  role?: string;
}

export function QuickActions({ role }: QuickActionsProps) {
  const actions = [
    {
      label: 'Start Attendance',
      href: '/dashboard/attendance/start',
      icon: '▶️',
      color: 'primary',
      roles: ['TEACHER', 'ADMIN'],
    },
    {
      label: 'Add New Student',
      href: '/dashboard/students/new',
      icon: '➕',
      color: 'secondary',
      roles: ['TEACHER', 'ADMIN'],
    },
    {
      label: 'Create Class',
      href: '/dashboard/classes/new',
      icon: '📚',
      color: 'primary',
      roles: ['TEACHER', 'ADMIN'],
    },
    {
      label: 'View Reports',
      href: '/dashboard/reports',
      icon: '📊',
      color: 'secondary',
      roles: ['TEACHER', 'ADMIN'],
    },
  ];

  const visibleActions = actions.filter((action) =>
    action.roles.includes(role || 'STUDENT')
  );

  return (
    <div className="bg-white rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {visibleActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Button variant="outline" fullWidth className="text-left">
              <span className="mr-2">{action.icon}</span>
              {action.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
