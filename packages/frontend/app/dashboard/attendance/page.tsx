'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { classesAPI, attendanceAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { AttendanceSessionCard } from '@/components/attendance/AttendanceSessionCard';

export default function AttendancePage() {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const { data: classes = [] } = useSWR('/classes', async () => {
    const response = await classesAPI.getAll();
    return response.data;
  });

  useEffect(() => {
    if (classes.length > 0) {
      setSelectedClass(classes[0].id);
      setIsLoading(false);
    }
  }, [classes]);

  const handleStartSession = async () => {
    if (!selectedClass) return;
    
    try {
      const response = await attendanceAPI.startSession(selectedClass, true);
      // Navigate to face detection page
      window.location.href = `/dashboard/attendance/session/${response.data.id}`;
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
        <p className="text-muted mt-1">Mark attendance using face recognition or manual entry</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Selection and Start */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Start Attendance Session</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                >
                  <option value="">Select a class...</option>
                  {classes.map((cls: any) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  ℹ️ Face recognition requires camera access. Please ensure your camera is connected and enabled.
                </p>
              </div>

              <Button
                variant="primary"
                fullWidth
                onClick={handleStartSession}
                disabled={!selectedClass || isLoading}
              >
                Start Face Recognition Session
              </Button>

              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  // TODO: Navigate to manual attendance
                }}
              >
                Manual Attendance Entry
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">Active Classes</span>
                <span className="text-lg font-bold text-primary">{classes.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">Sessions Today</span>
                <span className="text-lg font-bold text-primary">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">Attendance Rate</span>
                <span className="text-lg font-bold text-primary">92%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Detected Faces</h3>
            <p className="text-sm text-muted">No active session</p>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Sessions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AttendanceSessionCard
            session={{
              id: '1',
              classId: 'cls1',
              className: 'Math 101',
              date: new Date().toLocaleDateString(),
              status: 'COMPLETED',
              recordCount: 45,
            }}
          />
        </div>
      </div>
    </div>
  );
}
