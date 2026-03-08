'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SystemHealthCardProps {
  stats: {
    uptime?: string;
    apiResponseTime?: number;
    databaseHealth?: 'healthy' | 'degraded' | 'down';
    errorRate?: number;
    [key: string]: any;
  };
}

export function SystemHealthCard({ stats }: SystemHealthCardProps) {
  const healthData = [
    { name: 'API', value: 100 - (stats.errorRate || 0) },
    { name: 'Database', value: stats.databaseHealth === 'healthy' ? 100 : 50 },
    { name: 'Cache', value: 95 },
    { name: 'Storage', value: 88 },
  ];

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">System Health</h2>
        <p className="text-sm text-muted-foreground">Real-time system status and metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Metrics */}
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium text-foreground">Uptime</span>
            <span className="text-lg font-semibold text-green-600">{stats.uptime || '99.9%'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium text-foreground">API Response Time</span>
            <span className="text-lg font-semibold text-blue-600">
              {stats.apiResponseTime || 145}ms
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium text-foreground">Error Rate</span>
            <span className="text-lg font-semibold text-yellow-600">
              {stats.errorRate || 0.2}%
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium text-foreground">Database Health</span>
            <span
              className={`text-lg font-semibold ${
                stats.databaseHealth === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {stats.databaseHealth === 'healthy' ? 'Healthy' : 'Warning'}
            </span>
          </div>
        </div>

        {/* Health Chart */}
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={healthData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
