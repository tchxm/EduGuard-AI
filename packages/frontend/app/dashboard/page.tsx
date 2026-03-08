'use client';

import { useAuthStore } from '@/lib/store';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ActivityChart } from '@/components/dashboard/ActivityChart';

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-muted">Here's what's happening with your attendance system</p>
      </div>

      {/* Quick Actions */}
      {user?.role !== 'STUDENT' && <QuickActions role={user?.role} />}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Classes"
          value="12"
          icon="📚"
          trend="+2 this month"
        />
        <StatsCard
          title="Total Students"
          value="284"
          icon="👥"
          trend="+15 this week"
        />
        <StatsCard
          title="Attendance Rate"
          value="92.5%"
          icon="✓"
          trend="+2.3% from last week"
        />
        <StatsCard
          title="Pending Actions"
          value="5"
          icon="⚡"
          trend="Requires attention"
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityChart />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
