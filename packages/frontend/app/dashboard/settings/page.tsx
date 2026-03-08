'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { usersAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await usersAPI.update(user?.id || '', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      });

      setUser(response.data);
      setMessage('Profile updated successfully!');
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Settings */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">Profile Information</h2>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg ${
            message.includes('successfully')
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email (Read-only)
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="w-full px-4 py-2 border border-border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>

          <Button type="submit" variant="primary" isLoading={isLoading}>
            Save Changes
          </Button>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Account Information</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Role</span>
            <span className="font-medium text-foreground">{user?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Status</span>
            <span className={`font-medium ${user?.isActive ? 'text-green-600' : 'text-red-600'}`}>
              {user?.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Member Since</span>
            <span className="font-medium text-foreground">
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Preferences</h2>
        <div className="space-y-4">
          <label className="flex items-center">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded" />
            <span className="ml-3 text-sm text-foreground">Receive email notifications</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded" />
            <span className="ml-3 text-sm text-foreground">Receive absence alerts</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="w-4 h-4 text-primary rounded" />
            <span className="ml-3 text-sm text-foreground">Receive weekly reports</span>
          </label>
        </div>
      </div>
    </div>
  );
}
