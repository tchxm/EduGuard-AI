'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { User } from '@/lib/api';

interface UserManagementTableProps {
  users: User[];
}

export function UserManagementTable({ users }: UserManagementTableProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const toggleUserSelect = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) return;

    try {
      // API call would go here
      console.log(`Performing ${action} on users:`, selectedUsers);
      alert(`${action} action performed on ${selectedUsers.length} users`);
      setSelectedUsers([]);
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    }
  };

  return (
    <div className="space-y-4">
      {selectedUsers.length > 0 && (
        <div className="flex gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm text-blue-900">
            {selectedUsers.length} user(s) selected
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('Disable')}
            >
              Disable
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('Reset Password')}
            >
              Reset Password
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkAction('Delete')}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left p-3">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={(e) =>
                    setSelectedUsers(e.target.checked ? users.map(u => u.id) : [])
                  }
                  className="rounded"
                />
              </th>
              <th className="text-left p-3 font-semibold text-foreground">User</th>
              <th className="text-left p-3 font-semibold text-foreground">Email</th>
              <th className="text-left p-3 font-semibold text-foreground">Role</th>
              <th className="text-left p-3 font-semibold text-foreground">Status</th>
              <th className="text-left p-3 font-semibold text-foreground">Last Login</th>
              <th className="text-left p-3 font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelect(user.id)}
                    className="rounded"
                  />
                </td>
                <td className="p-3 font-medium text-foreground">{user.name}</td>
                <td className="p-3 text-muted-foreground">{user.email}</td>
                <td className="p-3">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {user.role || 'User'}
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                </td>
                <td className="p-3">
                  <Button size="sm" variant="ghost">
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
