import { Metadata } from 'next';
import { api } from '@/lib/api';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { UserManagementTable } from '@/components/admin/UserManagementTable';
import { SystemHealthCard } from '@/components/admin/SystemHealthCard';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';

export const metadata: Metadata = {
  title: 'Admin Dashboard | EduGuard AI',
  description: 'System administration and monitoring dashboard',
};

export default async function AdminDashboard() {
  try {
    const [usersRes, statsRes] = await Promise.all([
      api.get('/users'),
      api.get('/admin/stats'),
    ]);

    const users = usersRes.data || [];
    const stats = statsRes.data || {};

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            System monitoring, user management, and audit logs
          </p>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Users"
            value={stats.totalUsers || 0}
            icon="👥"
            change={stats.usersChange}
          />
          <StatsCard
            title="Active Sessions"
            value={stats.activeSessions || 0}
            icon="🔑"
            change={stats.sessionsChange}
          />
          <StatsCard
            title="System Uptime"
            value={stats.uptime || '99.9%'}
            icon="✓"
            trend="up"
          />
          <StatsCard
            title="Disk Usage"
            value={stats.diskUsage || '45%'}
            icon="💾"
            trend={stats.diskTrend}
          />
        </div>

        {/* System Health */}
        <SystemHealthCard stats={stats} />

        {/* User Management */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-foreground">User Management</h2>
            <p className="text-sm text-muted-foreground">Manage system users and permissions</p>
          </div>
          <UserManagementTable users={users} />
        </div>

        {/* Audit Logs */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-foreground">Audit Logs</h2>
            <p className="text-sm text-muted-foreground">System activity and access logs</p>
          </div>
          <AuditLogViewer />
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
        <p className="text-destructive">
          Failed to load admin dashboard. Please try again later.
        </p>
      </div>
    );
  }
}
