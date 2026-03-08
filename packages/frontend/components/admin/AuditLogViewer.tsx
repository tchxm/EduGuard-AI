'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userName: string;
  resourceType: string;
  resourceId: string;
  status: 'success' | 'failure';
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failure'>('all');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/admin/audit-logs?limit=50');
        setLogs(res.data || []);
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filteredLogs = filter === 'all' ? logs : logs.filter(log => log.status === filter);

  if (loading) {
    return <div className="text-muted-foreground">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-sm rounded-lg ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          All ({logs.length})
        </button>
        <button
          onClick={() => setFilter('success')}
          className={`px-3 py-1 text-sm rounded-lg ${
            filter === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Success ({logs.filter(l => l.status === 'success').length})
        </button>
        <button
          onClick={() => setFilter('failure')}
          className={`px-3 py-1 text-sm rounded-lg ${
            filter === 'failure'
              ? 'bg-red-600 text-white'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Failed ({logs.filter(l => l.status === 'failure').length})
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left p-3 font-semibold text-foreground">Timestamp</th>
              <th className="text-left p-3 font-semibold text-foreground">User</th>
              <th className="text-left p-3 font-semibold text-foreground">Action</th>
              <th className="text-left p-3 font-semibold text-foreground">Resource</th>
              <th className="text-left p-3 font-semibold text-foreground">Status</th>
              <th className="text-left p-3 font-semibold text-foreground">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map(log => (
                <tr key={log.id} className="border-b border-border hover:bg-muted/50">
                  <td className="p-3 text-muted-foreground text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3 font-medium text-foreground">{log.userName}</td>
                  <td className="p-3">
                    <code className="px-2 py-1 bg-muted rounded text-xs text-foreground">
                      {log.action}
                    </code>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {log.resourceType}: {log.resourceId}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        log.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {log.status === 'success' ? '✓' : '✗'} {log.status}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{log.ipAddress}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No audit logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
